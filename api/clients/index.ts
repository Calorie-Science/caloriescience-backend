import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { validateAndTransformClient } from '../../lib/validation';
import { transformWithMapping, FIELD_MAPPINGS } from '../../lib/caseTransform';
import { calculateHealthMetrics } from '../../lib/healthMetrics';
import { getEERGuidelineFromLocation } from '../../lib/locationMapping';
import { calculateEER, calculateMacros } from '../../lib/calculations';
import { calculateMicronutrients } from '../../lib/micronutrientCalculations';
import { FlexibleMicronutrientService } from '../../lib/micronutrients-flexible';
import { getGuidelineFromLocation } from '../../lib/clientMicronutrientHelpers';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method === 'GET') {
    // Get all clients for nutritionist
    try {
      const { status, page = 1, limit = 20, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('clients')
        .select(`
          *,
          client_nutrition_requirements(
            id,
            eer_calories,
            created_at,
            is_active
          )
        `, { count: 'exact' })
        .eq('nutritionist_id', req.user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + Number(limit) - 1);

      const { data: clients, error, count } = await query;

      if (error) {
        console.error('Get clients error:', error);
        throw error;
      }

      // Transform database response to camelCase
      const transformedClients = transformWithMapping(clients || [], FIELD_MAPPINGS.snakeToCamel);

      res.status(200).json({
        clients: transformedClients,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({
        error: 'Failed to fetch clients',
        message: 'An error occurred while retrieving client data'
      });
    }
  }

  else if (req.method === 'POST') {
    // POST - Create new client
    try {
      console.log('Creating new client with data:', req.body);
      
      // Extract EER and macros data before validation
      const { eerCalories, proteinGrams, carbsGrams, fatGrams, fiberGrams, status, ...extractedClientData } = req.body;
      const macrosData = req.body.macrosData;
      const micronutrientsData = req.body.micronutrientsData;
      
      // Remove macrosData from client data if present
      delete extractedClientData.macrosData;
      delete extractedClientData.micronutrientsData;
      
      const validation = validateAndTransformClient(extractedClientData);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }

      const createData = {
        ...validation.value,
        nutritionist_id: req.user.id,
        email: validation.value.email?.toLowerCase(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Construct full_name from firstName and lastName if not provided
      if (!createData.fullName && (createData.firstName || createData.lastName)) {
        createData.fullName = `${createData.firstName || ''} ${createData.lastName || ''}`.trim();
      }

      // Ensure dates_of_birth is null if empty
      if (!createData.date_of_birth) {
        createData.date_of_birth = null;
      }

      // Add EER and macros data back to createData if provided
      if (eerCalories) {
        createData.eer_calories = eerCalories;
      }
      if (proteinGrams) createData.protein_grams = proteinGrams;
      if (carbsGrams) createData.carbs_grams = carbsGrams;
      if (fatGrams) createData.fat_grams = fatGrams;
      if (fiberGrams) createData.fiber_grams = fiberGrams;
      if (status) createData.status = status;

      // Always use snake_case for database fields  
      const transformedData = transformWithMapping(createData, FIELD_MAPPINGS.camelToSnake);
      const clientData = transformedData;
      
      // Ensure full_name is set (required field in database)
      if (!clientData.full_name && (clientData.first_name || clientData.last_name)) {
        clientData.full_name = `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim();
      }
      
      // If still no full_name, use email or a default
      if (!clientData.full_name) {
        clientData.full_name = clientData.email || 'Unknown Client';
      }
      
      // Remove macro fields from client data as they belong to nutrition requirements
      delete clientData.eer_calories;
      delete clientData.protein_grams;
      delete clientData.carbs_grams;
      delete clientData.fat_grams;
      delete clientData.fiber_grams;

      delete clientData.micronutrients_data;

      // Calculate BMI if height and weight are provided AND BMI is not already provided
      if (validation.value.height_cm && validation.value.weight_kg && !validation.value.bmi) {
        const healthMetrics = calculateHealthMetrics(
          validation.value.height_cm,
          validation.value.weight_kg,
          validation.value.bmr // Pass BMR if provided from EER calculation
        );
        
        // Transform health metrics to snake_case for database
        const transformedHealthMetrics = transformWithMapping(healthMetrics, FIELD_MAPPINGS.camelToSnake);
        Object.assign(clientData, transformedHealthMetrics);
      } else if (validation.value.bmi || validation.value.bmr) {
        // If BMI/BMR are provided from EER calculation, set the last calculated timestamps
        const now = new Date().toISOString();
        if (validation.value.bmi) {
          clientData.bmi_last_calculated = now;
        }
        if (validation.value.bmr) {
          clientData.bmr_last_calculated = now;
        }
      }

      const { data: client, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) {
        console.error('Create client error:', error);
        console.error('Client data that failed:', JSON.stringify(clientData, null, 2));
        
        // Handle specific database errors
        if (error.code === '23505' && error.message.includes('clients_email_unique')) {
          return res.status(409).json({
            error: 'Email already exists',
            message: 'A client with this email address already exists',
            code: 'DUPLICATE_EMAIL'
          });
        }
        
        // Return specific error details for debugging
        return res.status(500).json({
          error: 'Failed to create client',
          message: 'An error occurred while creating the client',
          details: error.message,
          code: error.code,
          hint: error.hint
        });
      }

      // Auto-calculate nutrition requirements if we have the necessary data
      let nutritionRequirements = null;
      let micronutrientRequirements: any = null;

      // Check if we have required data for calculations
      const hasRequiredDataForCalculations = 
        validation.value.height_cm && 
        validation.value.weight_kg && 
        validation.value.date_of_birth &&
        validation.value.gender &&
        validation.value.activity_level &&
        validation.value.location;

      if (hasRequiredDataForCalculations && !eerCalories) {
        // Calculate age from date of birth with decimal precision for infants/children
        const birthDate = new Date(validation.value.date_of_birth);
        const today = new Date();
        
        // Calculate precise age in years with decimal places for accurate database queries
        const ageInMilliseconds = today.getTime() - birthDate.getTime();
        const ageInDays = ageInMilliseconds / (1000 * 60 * 60 * 24);
        const age = ageInDays / 365.25; // Use 365.25 to account for leap years
        
        console.log(`📅 Age calculation: Birth date: ${birthDate.toISOString()}, Today: ${today.toISOString()}, Age: ${age} years (${ageInDays} days)`);

        // Determine EER guideline from location
        const eerGuideline = getEERGuidelineFromLocation(validation.value.location);

        try {
          // 1. Calculate EER
          const eerData = {
            country: eerGuideline,
            age,
            gender: validation.value.gender,
            height_cm: validation.value.height_cm,
            weight_kg: validation.value.weight_kg,
            activity_level: validation.value.activity_level,
            pregnancy_status: validation.value.pregnancy_status,
            lactation_status: validation.value.lactation_status
          };

          const eerResult = await calculateEER(eerData);
          
          // 2. Calculate Macros
          const macrosData = {
            eer: eerResult.eer,
            country: eerGuideline,
            age,
            gender: validation.value.gender,
            weight_kg: validation.value.weight_kg
          };

          const macrosResult = await calculateMacros(macrosData);

          // 3. Calculate Micronutrients using flexible system
          const flexibleMicroService = new FlexibleMicronutrientService(supabase);
          
          // Determine country for micronutrients based on location
          const locationGuideline = getGuidelineFromLocation(validation.value.location);
          const micronutrientCountry = locationGuideline.country;
          
          // Prepare adjustment factors based on client data
          const adjustmentFactors = {
            pregnancy: validation.value.pregnancy_status !== 'not_pregnant',
            lactation: validation.value.lactation_status !== 'not_lactating',
            activityLevel: validation.value.activity_level,
            healthConditions: validation.value.medical_conditions
          };

          micronutrientRequirements = await flexibleMicroService.calculateClientRequirements(
            client.id,
            micronutrientCountry,
            validation.value.gender,
            age,
            adjustmentFactors
          );

          // Save nutrition requirements
          const nutritionData = {
            client_id: client.id,
            eer_calories: Math.round(eerResult.eer),
            calculation_method: 'formula_based',
            is_ai_generated: false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            // Add guideline tracking
            eer_guideline_country: eerResult.guideline_country,
            macro_guideline_country: macrosResult.guideline_country,
            guideline_notes: macrosResult.guideline_notes || null,
            // Add macro ranges
            protein_min_grams: macrosResult.Protein?.min_grams || null,
            protein_max_grams: macrosResult.Protein?.max_grams || null,
            protein_note: macrosResult.Protein?.note || null,
            carbs_min_grams: macrosResult.Carbohydrates?.min_grams || null,
            carbs_max_grams: macrosResult.Carbohydrates?.max_grams || null,
            carbs_note: macrosResult.Carbohydrates?.note || null,
            fat_min_grams: macrosResult['Total Fat']?.min_grams || null,
            fat_max_grams: macrosResult['Total Fat']?.max_grams || null,
            fat_note: macrosResult['Total Fat']?.note || null,
            fiber_min_grams: macrosResult.Fiber?.min_grams || null,
            fiber_max_grams: macrosResult.Fiber?.max_grams || null,
            fiber_note: macrosResult.Fiber?.note || null,
            saturated_fat_min_grams: macrosResult['Saturated Fat']?.min_grams || null,
            saturated_fat_max_grams: macrosResult['Saturated Fat']?.max_grams || null,
            saturated_fat_note: macrosResult['Saturated Fat']?.note || null,
            monounsaturated_fat_min_grams: null,
            monounsaturated_fat_max_grams: null,
            monounsaturated_fat_note: null,
            polyunsaturated_fat_min_grams: null,
            polyunsaturated_fat_max_grams: null,
            polyunsaturated_fat_note: null,
            omega3_min_grams: null,
            omega3_max_grams: null,
            omega3_note: null,
            cholesterol_min_grams: null,
            cholesterol_max_grams: null,
            cholesterol_note: null
          };

          const { data: nutritionReq, error: nutritionError } = await supabase
            .from('client_nutrition_requirements')
            .insert(nutritionData)
            .select()
            .single();

          if (!nutritionError) {
            nutritionRequirements = nutritionReq;
          }

          // Save flexible micronutrient requirements
          if (micronutrientRequirements) {
            const savedMicroReq = await flexibleMicroService.saveClientRequirements(micronutrientRequirements);
            
            if (savedMicroReq) {
              micronutrientRequirements = savedMicroReq;
              console.log(`Flexible micronutrient requirements saved for client ${client.id}`);
            } else {
              console.error(`Failed to save flexible micronutrient requirements for client ${client.id}`);
            }
          }

          // Update BMI if calculated
          if (eerResult.bmr) {
            const healthMetrics = calculateHealthMetrics(
              validation.value.height_cm,
              validation.value.weight_kg,
              eerResult.bmr
            );

            await supabase
              .from('clients')
              .update({
                bmi: healthMetrics.bmi,
                bmi_category: healthMetrics.bmiCategory,
                bmr: eerResult.bmr,
                bmi_last_calculated: new Date().toISOString(),
                bmr_last_calculated: new Date().toISOString()
              })
              .eq('id', client.id);

            // Update client object with calculated values
            client.bmi = healthMetrics.bmi;
            client.bmi_category = healthMetrics.bmiCategory;
            client.bmr = eerResult.bmr;
          }

        } catch (calcError) {
          console.error('Auto-calculation error:', calcError);
          // Don't fail client creation if calculations fail
        }
      } else if (validation.value.eer_calories) {
        // If EER data is provided manually, create nutrition requirements record
        const nutritionData = {
          client_id: client.id,
          eer_calories: validation.value.eer_calories,
          calculation_method: 'formula_based',
          is_ai_generated: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: nutritionError } = await supabase
          .from('client_nutrition_requirements')
          .insert(nutritionData);

        if (nutritionError) {
          console.warn('Failed to create nutrition requirements:', nutritionError);
          // Don't fail the client creation, just log the warning
        }
      }

      // If macros data is provided, update the nutrition requirements record with macros
      if (macrosData && validation.value.eer_calories) {
        // Extract macros from the provided data
        const macros = macrosData;
        
        const macroUpdateData = {
          // Protein
          protein_min_grams: macros.Protein?.min_grams || null,
          protein_max_grams: macros.Protein?.max_grams || null,
          protein_note: macros.Protein?.note || null,
          
          // Carbohydrates
          carbs_min_grams: macros.Carbohydrates?.min_grams || null,
          carbs_max_grams: macros.Carbohydrates?.max_grams || null,
          carbs_note: macros.Carbohydrates?.note || null,
          
          // Total Fat
          fat_min_grams: macros['Total Fat']?.min_grams || null,
          fat_max_grams: macros['Total Fat']?.max_grams || null,
          fat_note: macros['Total Fat']?.note || null,
          
          // Fiber
          fiber_min_grams: macros.Fiber?.min_grams || null,
          fiber_max_grams: macros.Fiber?.max_grams || null,
          fiber_note: macros.Fiber?.note || null,
          
          // Saturated Fat
          saturated_fat_min_grams: macros['Saturated Fat']?.min_grams || null,
          saturated_fat_max_grams: macros['Saturated Fat']?.max_grams || null,
          saturated_fat_note: macros['Saturated Fat']?.note || null,
          
          // Monounsaturated Fat
          monounsaturated_fat_min_grams: null,
          monounsaturated_fat_max_grams: null,
          monounsaturated_fat_note: null,
          
          // Polyunsaturated Fat
          polyunsaturated_fat_min_grams: null,
          polyunsaturated_fat_max_grams: null,
          polyunsaturated_fat_note: null,
          
          // Omega-3 Fatty Acids
          omega3_min_grams: null,
          omega3_max_grams: null,
          omega3_note: null,
          
          // Cholesterol
          cholesterol_min_grams: null,
          cholesterol_max_grams: null,
          cholesterol_note: null,
          
          calculation_method: 'formula_based',
          is_ai_generated: false,
          updated_at: new Date().toISOString()
        };

        const { error: macroError } = await supabase
          .from('client_nutrition_requirements')
          .update(macroUpdateData)
          .eq('client_id', client.id)
          .eq('is_active', true);

        if (macroError) {
          console.warn('Failed to update nutrition requirements with macros:', macroError);
        }
      }

      // If micronutrient data is provided, create micronutrient requirements record
      if (micronutrientsData && micronutrientsData.micronutrients) {
        // Use flexible micronutrient service for manual micronutrient data
        const flexibleMicroService = new FlexibleMicronutrientService(supabase);
        
        // Determine country based on location using proper mapping
        const locationGuideline = getGuidelineFromLocation(validation.value.location);
        const country = locationGuideline.country;
        
        // Calculate age if not already calculated
        let age = 30; // Default age if date of birth not provided
        if (validation.value.date_of_birth) {
          const birthDate = new Date(validation.value.date_of_birth);
          const today = new Date();
          age = today.getFullYear() - birthDate.getFullYear() - 
            (today.getMonth() < birthDate.getMonth() || 
            (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
        }
        
        // Prepare adjustment factors
        const adjustmentFactors = {
          pregnancy: validation.value.pregnancy_status !== 'not_pregnant',
          lactation: validation.value.lactation_status !== 'not_lactating',
          activityLevel: validation.value.activity_level,
          healthConditions: validation.value.medical_conditions
        };
        
        const flexibleMicroReq = await flexibleMicroService.calculateClientRequirements(
          client.id,
          country as 'UK' | 'US' | 'India',
          validation.value.gender || 'male',
          age,
          adjustmentFactors
        );
        
        if (flexibleMicroReq) {
          const savedMicroReq = await flexibleMicroService.saveClientRequirements(flexibleMicroReq);
          if (!savedMicroReq) {
            console.warn('Failed to save flexible micronutrient requirements');
          }
        }
      }

      // Get the created client
      const { data: createdClient, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', client.id)
        .single();

      if (fetchError) {
        console.error('Fetch created client error:', fetchError);
        return res.status(500).json({
          error: 'Client created but failed to fetch details',
          message: 'The client was created successfully but there was an issue retrieving the details'
        });
      }

      // Remove system fields that shouldn't be in response
      const { eer_guideline, ...clientWithoutSystemFields } = createdClient;

      // Transform to camelCase for response
      const transformedClient = transformWithMapping(clientWithoutSystemFields, FIELD_MAPPINGS.snakeToCamel);

      // Return response immediately
      res.status(201).json({
        message: 'Client created successfully',
        client: transformedClient
      });

      // Perform calculations in the background after response is sent
      if (hasRequiredDataForCalculations && !eerCalories) {
        // Run calculations asynchronously without blocking the response
        (async () => {
          try {
            // Calculate age from date of birth with decimal precision for infants/children
            const birthDate = new Date(validation.value.date_of_birth);
            const today = new Date();
            
            // Calculate precise age in years with decimal places for accurate database queries
            const ageInMilliseconds = today.getTime() - birthDate.getTime();
            const ageInDays = ageInMilliseconds / (1000 * 60 * 60 * 24);
            const age = ageInDays / 365.25; // Use 365.25 to account for leap years
            
            console.log(`📅 Background age calculation: Birth date: ${birthDate.toISOString()}, Today: ${today.toISOString()}, Age: ${age} years (${ageInDays} days)`);

            // Determine EER guideline from location
            const eerGuideline = getEERGuidelineFromLocation(validation.value.location);

            console.log(`Background: Starting calculations for client ${client.id}`);

            // 1. Calculate EER
            const eerData = {
              country: eerGuideline,
              age,
              gender: validation.value.gender,
              height_cm: validation.value.height_cm,
              weight_kg: validation.value.weight_kg,
              activity_level: validation.value.activity_level,
              pregnancy_status: validation.value.pregnancy_status,
              lactation_status: validation.value.lactation_status
            };

            const eerResult = await calculateEER(eerData);
            
            // 2. Calculate Macros
            const macrosData = {
              eer: eerResult.eer,
              country: eerGuideline,
              age,
              gender: validation.value.gender,
              weight_kg: validation.value.weight_kg
            };

            const macrosResult = await calculateMacros(macrosData);

            // 3. Calculate Micronutrients using flexible system
            const flexibleMicroService = new FlexibleMicronutrientService(supabase);
            
            // Determine country for micronutrients based on location
            const locationGuideline = getGuidelineFromLocation(validation.value.location);
            const micronutrientCountry = locationGuideline.country;
            
            // Prepare adjustment factors based on client data
            const adjustmentFactors = {
              pregnancy: validation.value.pregnancy_status !== 'not_pregnant',
              lactation: validation.value.lactation_status !== 'not_lactating',
              activityLevel: validation.value.activity_level,
              healthConditions: validation.value.medical_conditions
            };

            micronutrientRequirements = await flexibleMicroService.calculateClientRequirements(
              client.id,
              micronutrientCountry,
              validation.value.gender,
              age,
              adjustmentFactors
            );

            // Save nutrition requirements
            const nutritionData = {
              client_id: client.id,
              eer_calories: Math.round(eerResult.eer),
              calculation_method: 'formula_based',
              is_ai_generated: false,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              // Add guideline tracking
              eer_guideline_country: eerResult.guideline_country,
              macro_guideline_country: macrosResult.guideline_country,
              guideline_notes: macrosResult.guideline_notes || null,
              // Add macro ranges
              protein_min_grams: macrosResult.Protein?.min_grams || null,
              protein_max_grams: macrosResult.Protein?.max_grams || null,
              protein_note: macrosResult.Protein?.note || null,
              carbs_min_grams: macrosResult.Carbohydrates?.min_grams || null,
              carbs_max_grams: macrosResult.Carbohydrates?.max_grams || null,
              carbs_note: macrosResult.Carbohydrates?.note || null,
              fat_min_grams: macrosResult['Total Fat']?.min_grams || null,
              fat_max_grams: macrosResult['Total Fat']?.max_grams || null,
              fat_note: macrosResult['Total Fat']?.note || null,
              fiber_min_grams: macrosResult.Fiber?.min_grams || null,
              fiber_max_grams: macrosResult.Fiber?.max_grams || null,
              fiber_note: macrosResult.Fiber?.note || null,
              saturated_fat_min_grams: macrosResult['Saturated Fat']?.min_grams || null,
              saturated_fat_max_grams: macrosResult['Saturated Fat']?.max_grams || null,
              saturated_fat_note: macrosResult['Saturated Fat']?.note || null,
              monounsaturated_fat_min_grams: null,
              monounsaturated_fat_max_grams: null,
              monounsaturated_fat_note: null,
              polyunsaturated_fat_min_grams: null,
              polyunsaturated_fat_max_grams: null,
              polyunsaturated_fat_note: null,
              omega3_min_grams: null,
              omega3_max_grams: null,
              omega3_note: null,
              cholesterol_min_grams: null,
              cholesterol_max_grams: null,
              cholesterol_note: null
            };

            const { error: nutritionError } = await supabase
              .from('client_nutrition_requirements')
              .insert(nutritionData);

            if (nutritionError) {
              console.error(`Background: Failed to save nutrition requirements for client ${client.id}:`, nutritionError);
            } else {
              console.log(`Background: Nutrition requirements saved for client ${client.id}`);
            }

            // Save flexible micronutrient requirements
            if (micronutrientRequirements) {
              const savedMicroReq = await flexibleMicroService.saveClientRequirements(micronutrientRequirements);
              
              if (savedMicroReq) {
                micronutrientRequirements = savedMicroReq;
                console.log(`Background: Flexible micronutrient requirements saved for client ${client.id}`);
              } else {
                console.error(`Background: Failed to save flexible micronutrient requirements for client ${client.id}`);
              }
            }

            // Update BMI if calculated
            if (eerResult.bmr) {
              const healthMetrics = calculateHealthMetrics(
                validation.value.height_cm,
                validation.value.weight_kg,
                eerResult.bmr
              );

              await supabase
                .from('clients')
                .update({
                  bmi: healthMetrics.bmi,
                  bmi_category: healthMetrics.bmiCategory,
                  bmr: eerResult.bmr,
                  bmi_last_calculated: new Date().toISOString(),
                  bmr_last_calculated: new Date().toISOString()
                })
                .eq('id', client.id);

              console.log(`Background: BMI/BMR updated for client ${client.id}`);
            }

            console.log(`Background: All calculations completed for client ${client.id}`);

          } catch (calcError) {
            console.error(`Background: Auto-calculation error for client ${client.id}:`, calcError);
          }
        })();
      }

    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        error: 'Failed to create client',
        message: 'An error occurred while creating the client'
      });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler); 