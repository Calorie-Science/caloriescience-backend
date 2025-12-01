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
import { categorizeMicronutrients } from '../../lib/micronutrientCategorization';

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
      const { eerCalories, proteinGrams, carbsGrams, fatGrams, fiberGrams, status, formulaId, ...extractedClientData } = req.body;
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
      
      // Add measurement system preference if provided
      if (validation.value.preferredMeasurementSystem) {
        createData.preferred_measurement_system = validation.value.preferredMeasurementSystem;
      }

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

        // Normalize location and determine EER guideline from location
        const normalizedLocation = validation.value.location?.trim();
        const eerGuideline = getEERGuidelineFromLocation(normalizedLocation);

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
            lactation_status: validation.value.lactation_status,
            formula_id: formulaId // Use selected formula if provided
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
          const locationGuideline = getGuidelineFromLocation(normalizedLocation);
          const micronutrientCountry = locationGuideline.country;
          
          console.log('🔍 Micronutrient calculation debug:', {
            originalLocation: validation.value.location,
            locationGuideline: locationGuideline,
            micronutrientCountry: micronutrientCountry,
            countryType: typeof micronutrientCountry
          });
          
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
            formula_used: eerResult.formula_used, // Store the actual formula used
            // Add macro ranges
            protein_min_grams: macrosResult.Protein?.min || null,
            protein_max_grams: macrosResult.Protein?.max || null,
            protein_note: macrosResult.Protein?.note || null,
            carbs_min_grams: macrosResult.Carbohydrates?.min || null,
            carbs_max_grams: macrosResult.Carbohydrates?.max || null,
            carbs_note: macrosResult.Carbohydrates?.note || null,
            fat_min_grams: macrosResult['Total Fat']?.min || null,
            fat_max_grams: macrosResult['Total Fat']?.max || null,
            fat_note: macrosResult['Total Fat']?.note || null,
            fiber_min_grams: macrosResult.Fiber?.min || null,
            fiber_max_grams: macrosResult.Fiber?.max || null,
            fiber_note: macrosResult.Fiber?.note || null,
            saturated_fat_min_grams: macrosResult['Saturated Fat']?.min || null,
            saturated_fat_max_grams: macrosResult['Saturated Fat']?.max || null,
            saturated_fat_note: macrosResult['Saturated Fat']?.note || null,
            monounsaturated_fat_min_grams: macrosResult['Monounsaturated Fat']?.min || null,
            monounsaturated_fat_max_grams: macrosResult['Monounsaturated Fat']?.max || null,
            monounsaturated_fat_note: macrosResult['Monounsaturated Fat']?.note || null,
            polyunsaturated_fat_min_grams: macrosResult['Polyunsaturated Fat']?.min || null,
            polyunsaturated_fat_max_grams: macrosResult['Polyunsaturated Fat']?.max || null,
            polyunsaturated_fat_note: macrosResult['Polyunsaturated Fat']?.note || null,
            omega3_min_grams: macrosResult['Omega-3 Fatty Acids']?.min || null,
            omega3_max_grams: macrosResult['Omega-3 Fatty Acids']?.max || null,
            omega3_note: macrosResult['Omega-3 Fatty Acids']?.note || null,
            cholesterol_min_grams: macrosResult.Cholesterol?.min || null,
            cholesterol_max_grams: macrosResult.Cholesterol?.max || null,
            cholesterol_note: macrosResult.Cholesterol?.note || null
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
        
        // First, get the current nutrition requirements to preserve existing values
        const { data: currentNutrition } = await supabase
          .from('client_nutrition_requirements')
          .select('*')
          .eq('client_id', client.id)
          .eq('is_active', true)
          .single();
        
        // Create update data that only includes provided macros, preserving existing values
        const macroUpdateData: any = {
          updated_at: new Date().toISOString()
        };
        
        // Only update macros that are actually provided in the request
        if (macros.Protein) {
          macroUpdateData.protein_min_grams = macros.Protein.min;
          macroUpdateData.protein_max_grams = macros.Protein.max;
          macroUpdateData.protein_note = macros.Protein.note;
          console.log('Updating Protein macros:', macros.Protein);
        }
        
        if (macros.Carbohydrates) {
          macroUpdateData.carbs_min_grams = macros.Carbohydrates.min;
          macroUpdateData.carbs_max_grams = macros.Carbohydrates.max;
          macroUpdateData.carbs_note = macros.Carbohydrates.note;
          console.log('Updating Carbohydrates macros:', macros.Carbohydrates);
        }
        
        if (macros['Total Fat']) {
          macroUpdateData.fat_min_grams = macros['Total Fat'].min;
          macroUpdateData.fat_max_grams = macros['Total Fat'].max;
          macroUpdateData.fat_note = macros['Total Fat'].note;
          console.log('Updating Total Fat macros:', macros['Total Fat']);
        }
        
        if (macros.Fiber) {
          macroUpdateData.fiber_min_grams = macros.Fiber.min;
          macroUpdateData.fiber_max_grams = macros.Fiber.max;
          macroUpdateData.fiber_note = macros.Fiber.note;
          console.log('Updating Fiber macros:', macros.Fiber);
        }
        
        if (macros['Saturated Fat']) {
          macroUpdateData.saturated_fat_min_grams = macros['Saturated Fat'].min;
          macroUpdateData.saturated_fat_max_grams = macros['Saturated Fat'].max;
          macroUpdateData.saturated_fat_note = macros['Saturated Fat'].note;
          console.log('Updating Saturated Fat macros:', macros['Saturated Fat']);
        }
        
        if (macros['Monounsaturated Fat']) {
          macroUpdateData.monounsaturated_fat_min_grams = macros['Monounsaturated Fat'].min;
          macroUpdateData.monounsaturated_fat_max_grams = macros['Monounsaturated Fat'].max;
          macroUpdateData.monounsaturated_fat_note = macros['Monounsaturated Fat'].note;
          console.log('Updating Monounsaturated Fat macros:', macros['Monounsaturated Fat']);
        }
        
        if (macros['Polyunsaturated Fat']) {
          macroUpdateData.polyunsaturated_fat_min_grams = macros['Polyunsaturated Fat'].min;
          macroUpdateData.polyunsaturated_fat_max_grams = macros['Polyunsaturated Fat'].max;
          macroUpdateData.polyunsaturated_fat_note = macros['Polyunsaturated Fat'].note;
          console.log('Updating Polyunsaturated Fat macros:', macros['Polyunsaturated Fat']);
        }
        
        if (macros['Omega-3 Fatty Acids']) {
          macroUpdateData.omega3_min_grams = macros['Omega-3 Fatty Acids'].min;
          macroUpdateData.omega3_max_grams = macros['Omega-3 Fatty Acids'].max;
          macroUpdateData.omega3_note = macros['Omega-3 Fatty Acids'].note;
          console.log('Updating Omega-3 Fatty Acids macros:', macros['Omega-3 Fatty Acids']);
        }
        
        if (macros.Cholesterol) {
          macroUpdateData.cholesterol_min_grams = macros.Cholesterol.min;
          macroUpdateData.cholesterol_max_grams = macros.Cholesterol.max;
          macroUpdateData.cholesterol_note = macros.Cholesterol.note;
          console.log('Updating Cholesterol macros:', macros.Cholesterol);
        }
        
        console.log('Macro update data (only provided fields):', macroUpdateData);

        const { error: macroError } = await supabase
          .from('client_nutrition_requirements')
          .update(macroUpdateData)
          .eq('client_id', client.id)
          .eq('is_active', true);

        if (macroError) {
          console.warn('Failed to update nutrition requirements with macros:', macroError);
        }
      }

      // If micronutrient data is provided, update micronutrient requirements record
      if (micronutrientsData && micronutrientsData.micronutrients) {
        const micronutrients = micronutrientsData.micronutrients;
        
        // First, get the current micronutrient requirements to preserve existing values
        const { data: currentMicroReq } = await supabase
          .from('client_micronutrient_requirements_flexible')
          .select('*')
          .eq('client_id', client.id)
          .eq('is_active', true)
          .single();
        
        // Create update data that only includes provided micronutrients, preserving existing values
        const microUpdateData: any = {
          updated_at: new Date().toISOString()
        };
        
        // Only update micronutrients that are actually provided in the request
        if (micronutrients.vitaminA) {
          microUpdateData.vitamin_a_mcg = micronutrients.vitaminA.amount;
          console.log('Updating Vitamin A:', micronutrients.vitaminA);
        }
        
        if (micronutrients.thiamin) {
          microUpdateData.thiamin_mg = micronutrients.thiamin.amount;
          console.log('Updating Thiamin:', micronutrients.thiamin);
        }
        
        if (micronutrients.riboflavin) {
          microUpdateData.riboflavin_mg = micronutrients.riboflavin.amount;
          console.log('Updating Riboflavin:', micronutrients.riboflavin);
        }
        
        if (micronutrients.niacinEquivalent) {
          microUpdateData.niacin_equivalent_mg = micronutrients.niacinEquivalent.amount;
          console.log('Updating Niacin Equivalent:', micronutrients.niacinEquivalent);
        }
        
        if (micronutrients.pantothenicAcid) {
          microUpdateData.pantothenic_acid_mg = micronutrients.pantothenicAcid.amount;
          console.log('Updating Pantothenic Acid:', micronutrients.pantothenicAcid);
        }
        
        if (micronutrients.vitaminB6) {
          microUpdateData.vitamin_b6_mg = micronutrients.vitaminB6.amount;
          console.log('Updating Vitamin B6:', micronutrients.vitaminB6);
        }
        
        if (micronutrients.biotin) {
          microUpdateData.biotin_mcg = micronutrients.biotin.amount;
          console.log('Updating Biotin:', micronutrients.biotin);
        }
        
        if (micronutrients.vitaminB12) {
          microUpdateData.vitamin_b12_mcg = micronutrients.vitaminB12.amount;
          console.log('Updating Vitamin B12:', micronutrients.vitaminB12);
        }
        
        if (micronutrients.folate) {
          microUpdateData.folate_mcg = micronutrients.folate.amount;
          console.log('Updating Folate:', micronutrients.folate);
        }
        
        if (micronutrients.vitaminC) {
          microUpdateData.vitamin_c_mg = micronutrients.vitaminC.amount;
          console.log('Updating Vitamin C:', micronutrients.vitaminC);
        }
        
        if (micronutrients.vitaminD) {
          microUpdateData.vitamin_d_mcg = micronutrients.vitaminD.amount;
          console.log('Updating Vitamin D:', micronutrients.vitaminD);
        }
        
        if (micronutrients.iron) {
          microUpdateData.iron_mg = micronutrients.iron.amount;
          console.log('Updating Iron:', micronutrients.iron);
        }
        
        if (micronutrients.calcium) {
          microUpdateData.calcium_mg = micronutrients.calcium.amount;
          console.log('Updating Calcium:', micronutrients.calcium);
        }
        
        if (micronutrients.magnesium) {
          microUpdateData.magnesium_mg = micronutrients.magnesium.amount;
          console.log('Updating Magnesium:', micronutrients.magnesium);
        }
        
        if (micronutrients.potassium) {
          microUpdateData.potassium_mg = micronutrients.potassium.amount;
          console.log('Updating Potassium:', micronutrients.potassium);
        }
        
        if (micronutrients.zinc) {
          microUpdateData.zinc_mg = micronutrients.zinc.amount;
          console.log('Updating Zinc:', micronutrients.zinc);
        }
        
        if (micronutrients.copper) {
          microUpdateData.copper_mg = micronutrients.copper.amount;
          console.log('Updating Copper:', micronutrients.copper);
        }
        
        if (micronutrients.iodine) {
          microUpdateData.iodine_mcg = micronutrients.iodine.amount;
          console.log('Updating Iodine:', micronutrients.iodine);
        }
        
        if (micronutrients.selenium) {
          microUpdateData.selenium_mcg = micronutrients.selenium.amount;
          console.log('Updating Selenium:', micronutrients.selenium);
        }
        
        if (micronutrients.phosphorus) {
          microUpdateData.phosphorus_mg = micronutrients.phosphorus.amount;
          console.log('Updating Phosphorus:', micronutrients.phosphorus);
        }
        
        if (micronutrients.chloride) {
          microUpdateData.chloride_mg = micronutrients.chloride.amount;
          console.log('Updating Chloride:', micronutrients.chloride);
        }
        
        if (micronutrients.sodium) {
          microUpdateData.sodium_g = micronutrients.sodium.amount;
          console.log('Updating Sodium:', micronutrients.sodium);
        }
        
        console.log('Micronutrient update data (only provided fields):', microUpdateData);
        
        // If we have micronutrients to update and there's an existing record, update it
        if (Object.keys(microUpdateData).length > 1 && currentMicroReq) { // > 1 because updated_at is always included
          const { error: microUpdateError } = await supabase
            .from('client_micronutrient_requirements_flexible')
            .update(microUpdateData)
            .eq('id', currentMicroReq.id);
          
          if (microUpdateError) {
            console.warn('Failed to update micronutrient requirements:', microUpdateError);
          } else {
            console.log('Successfully updated micronutrient requirements');
          }
        } else if (Object.keys(microUpdateData).length > 1) {
          // If no existing record, create a new one with the provided micronutrients
          const newMicroData = {
            client_id: client.id,
            country_guideline: micronutrientsData.guidelineUsed || 'UK',
            guideline_type: 'manual',
            calculation_method: 'manual',
            is_ai_generated: false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...microUpdateData
          };
          
          const { error: microInsertError } = await supabase
            .from('client_micronutrient_requirements_flexible')
            .insert(newMicroData);
          
          if (microInsertError) {
            console.warn('Failed to create micronutrient requirements:', microInsertError);
          } else {
            console.log('Successfully created micronutrient requirements');
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

      // Build response with nutrition data if available
      const responseData: any = { ...clientWithoutSystemFields };

      // Add formula_used if nutrition requirements were calculated
      if (nutritionRequirements) {
        responseData.formulaUsed = nutritionRequirements.formula_used;
        responseData.eerCalories = nutritionRequirements.eer_calories;
      }

      // Transform to camelCase for response
      const transformedClient = transformWithMapping(responseData, FIELD_MAPPINGS.snakeToCamel);

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

            // Normalize location and determine EER guideline from location
            const normalizedLocationBg = validation.value.location?.trim();
            const eerGuideline = getEERGuidelineFromLocation(normalizedLocationBg);

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
              lactation_status: validation.value.lactation_status,
              formula_id: formulaId // Use selected formula if provided
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
            const locationGuideline = getGuidelineFromLocation(normalizedLocationBg);
            const micronutrientCountry = locationGuideline.country;
            
            console.log('🔍 Micronutrient calculation debug:', {
              originalLocation: validation.value.location,
              locationGuideline: locationGuideline,
              micronutrientCountry: micronutrientCountry,
              countryType: typeof micronutrientCountry
            });
            
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
              formula_used: eerResult.formula_used, // Store the actual formula used
              // Add macro ranges
              protein_min_grams: macrosResult.Protein?.min || null,
              protein_max_grams: macrosResult.Protein?.max || null,
              protein_note: macrosResult.Protein?.note || null,
              carbs_min_grams: macrosResult.Carbohydrates?.min || null,
              carbs_max_grams: macrosResult.Carbohydrates?.max || null,
              carbs_note: macrosResult.Carbohydrates?.note || null,
              fat_min_grams: macrosResult['Total Fat']?.min || null,
              fat_max_grams: macrosResult['Total Fat']?.max || null,
              fat_note: macrosResult['Total Fat']?.note || null,
              fiber_min_grams: macrosResult.Fiber?.min || null,
              fiber_max_grams: macrosResult.Fiber?.max || null,
              fiber_note: macrosResult.Fiber?.note || null,
              saturated_fat_min_grams: macrosResult['Saturated Fat']?.min || null,
              saturated_fat_max_grams: macrosResult['Saturated Fat']?.max || null,
              saturated_fat_note: macrosResult['Saturated Fat']?.note || null,
              monounsaturated_fat_min_grams: macrosResult['Monounsaturated Fat']?.min || null,
              monounsaturated_fat_max_grams: macrosResult['Monounsaturated Fat']?.max || null,
              monounsaturated_fat_note: macrosResult['Monounsaturated Fat']?.note || null,
              polyunsaturated_fat_min_grams: macrosResult['Polyunsaturated Fat']?.min || null,
              polyunsaturated_fat_max_grams: macrosResult['Polyunsaturated Fat']?.max || null,
              polyunsaturated_fat_note: macrosResult['Polyunsaturated Fat']?.note || null,
              omega3_min_grams: macrosResult['Omega-3 Fatty Acids']?.min || null,
              omega3_max_grams: macrosResult['Omega-3 Fatty Acids']?.max || null,
              omega3_note: macrosResult['Omega-3 Fatty Acids']?.note || null,
              cholesterol_min_grams: macrosResult.Cholesterol?.min || null,
              cholesterol_max_grams: macrosResult.Cholesterol?.max || null,
              cholesterol_note: macrosResult.Cholesterol?.note || null
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