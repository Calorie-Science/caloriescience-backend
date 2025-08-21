import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { validateAndTransformClient } from '../../lib/validation';
import { transformWithMapping, FIELD_MAPPINGS } from '../../lib/caseTransform';
import { calculateHealthMetrics } from '../../lib/healthMetrics';
import { categorizeMicronutrients } from '../../lib/micronutrientCategorization';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid client ID',
      message: 'Client ID is required and must be a valid UUID' 
    });
  }

  // GET - Fetch individual client
  if (req.method === 'GET') {
    try {
      let query = supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('nutritionist_id', req.user.id)
        .single();

      const { data: client, error } = await query;

      if (error || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The requested client does not exist or you do not have access to it'
        });
      }

      // Fetch nutrition requirements separately
      const { data: nutritionRequirements } = await supabase
        .from('client_nutrition_requirements')
        .select('*')
        .eq('client_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      // Fetch micronutrient requirements separately
      const { data: micronutrientRequirements } = await supabase
        .from('client_micronutrient_requirements_flexible')
        .select('*')
        .eq('client_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      // Format response to include EER and Macros data at top level
      const nutritionReq = nutritionRequirements?.[0] || null;
      const micronutrientReq = micronutrientRequirements?.[0] || null;
      
      // Remove system fields that shouldn't be in response
      const { eer_guideline, ...clientWithoutSystemFields } = client;
      
      const response = {
        ...clientWithoutSystemFields,
        // EER data
        eerCalories: nutritionReq?.eer_calories || null,
        nutritionistNotes: nutritionReq?.nutritionist_notes || null,
        eerLastUpdated: nutritionReq?.updated_at || null,
        
        // Guideline tracking
        eerGuidelineCountry: nutritionReq?.eer_guideline_country || null,
        macroGuidelineCountry: nutritionReq?.macro_guideline_country || null,
        guidelineNotes: nutritionReq?.guideline_notes || null,
        
        // Target Macros data
        proteinGrams: nutritionReq?.protein_grams || null,
        carbsGrams: nutritionReq?.carbs_grams || null,
        fatGrams: nutritionReq?.fat_grams || null,
        fiberGrams: nutritionReq?.fiber_grams || null,
        proteinPercentage: nutritionReq?.protein_percentage || null,
        carbsPercentage: nutritionReq?.carbs_percentage || null,
        fatPercentage: nutritionReq?.fat_percentage || null,
        
        // Macros Ranges
        macrosRanges: nutritionReq ? {
          protein: {
            min: nutritionReq.protein_min_grams,
            max: nutritionReq.protein_max_grams,
            unit: 'g',
            note: nutritionReq.protein_note
          },
          carbs: {
            min: nutritionReq.carbs_min_grams,
            max: nutritionReq.carbs_max_grams,
            unit: 'g',
            note: nutritionReq.carbs_note
          },
          fat: {
            min: nutritionReq.fat_min_grams,
            max: nutritionReq.fat_max_grams,
            unit: 'g',
            note: nutritionReq.fat_note
          },
          fiber: {
            min: nutritionReq.fiber_min_grams,
            max: nutritionReq.fiber_max_grams,
            unit: 'g',
            note: nutritionReq.fiber_note
          },
          saturatedFat: {
            min: nutritionReq.saturated_fat_min_grams,
            max: nutritionReq.saturated_fat_max_grams,
            unit: 'g',
            note: nutritionReq.saturated_fat_note
          },
          monounsaturatedFat: {
            min: nutritionReq.monounsaturated_fat_min_grams,
            max: nutritionReq.monounsaturated_fat_max_grams,
            unit: 'g',
            note: nutritionReq.monounsaturated_fat_note
          },
          polyunsaturatedFat: {
            min: nutritionReq.polyunsaturated_fat_min_grams,
            max: nutritionReq.polyunsaturated_fat_max_grams,
            unit: 'g',
            note: nutritionReq.polyunsaturated_fat_note
          },
          omega3: {
            min: nutritionReq.omega3_min_grams,
            max: nutritionReq.omega3_max_grams,
            unit: 'g',
            note: nutritionReq.omega3_note
          },
          cholesterol: {
            min: nutritionReq.cholesterol_min_grams,
            max: nutritionReq.cholesterol_max_grams,
            unit: 'mg',
            note: nutritionReq.cholesterol_note
          }
        } : null,
        
        // Micronutrient data - categorized into vitamins, minerals, and miscellaneous
        micronutrients: micronutrientReq ? categorizeMicronutrients(micronutrientReq.micronutrient_recommendations) : {
          vitamins: {},
          minerals: {},
          miscellaneous: {}
        },
        guidelineUsed: micronutrientReq?.country_guideline || null,
        micronutrientNotes: micronutrientReq?.nutritionist_notes || null,
        micronutrientGuidelineType: micronutrientReq?.guideline_type || null,
        micronutrientCalculationFactors: micronutrientReq?.calculation_factors || null,
        
        // AI calculation metadata
        calculationMethod: nutritionReq?.calculation_method || null
      };

      // Remove the nested nutrition_requirements array
      delete response.nutrition_requirements;
      delete response.micronutrient_requirements;

      // Transform response to camelCase
      const transformedResponse = transformWithMapping(response, FIELD_MAPPINGS.snakeToCamel);

      res.status(200).json({ client: transformedResponse });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        error: 'Failed to fetch client',
        message: 'An error occurred while retrieving client data'
      });
    }
  }

  // PUT - Update client (including EER and Macros data)
  else if (req.method === 'PUT') {
    try {
      // Handle camelCase transformation for update
      const {
        eerCalories,
        nutritionistNotes,
        macrosData,
        micronutrientsData,
        proteinGrams,
        carbsGrams,
        fatGrams,
        fiberGrams,
        status,
        ...clientUpdateData
      } = req.body;

      // Update client data if provided
      if (Object.keys(clientUpdateData).length > 0) {
        // Only validate if we actually have client data (not just empty object from destructuring)
        const hasClientData = Object.keys(clientUpdateData).some(key => 
          !['eerCalories', 'nutritionistNotes', 'originalAiCalculation', 'macrosData', 
            'proteinGrams', 'carbsGrams', 'fatGrams', 'fiberGrams', 'status'].includes(key)
        );
        
        if (hasClientData) {
          const validation = validateAndTransformClient(clientUpdateData);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }

      const updateData = {
        ...validation.value,
        email: validation.value.email?.toLowerCase(),
        updated_at: new Date().toISOString()
      };

          // Calculate BMI if height or weight changed
          if (validation.value.height_cm || validation.value.weight_kg) {
            // Get current client data to check for changes
            const { data: currentClient } = await supabase
              .from('clients')
              .select('height_cm, weight_kg, bmi, bmi_category')
              .eq('id', id)
              .eq('nutritionist_id', req.user.id)
              .single();

            if (currentClient) {
              const finalHeight = validation.value.height_cm || currentClient.height_cm;
              const finalWeight = validation.value.weight_kg || currentClient.weight_kg;
              
              if (finalHeight && finalWeight) {
                const healthMetrics = calculateHealthMetrics(finalHeight, finalWeight);
                const transformedHealthMetrics = transformWithMapping(healthMetrics, FIELD_MAPPINGS.camelToSnake);
                Object.assign(updateData, transformedHealthMetrics);
              }
            }
          }

          // Handle status conversion to active
          if (validation.value.status === 'active') {
            // Get current client status to check if this is a conversion
            const { data: currentClient } = await supabase
              .from('clients')
              .select('status')
              .eq('id', id)
              .eq('nutritionist_id', req.user.id)
              .single();

            // If converting from non-active to active, set the conversion timestamp
            if (currentClient && currentClient.status !== 'active') {
              updateData.converted_to_active_at = new Date().toISOString();
            }
          }

          const { error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
            .eq('nutritionist_id', req.user.id);

      if (error) {
        console.error('Update client error:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Client not found',
            message: 'The requested client does not exist or you do not have access to it'
          });
        }
        
        // Handle unique constraint violation for email
        if (error.code === '23505' && error.message.includes('clients_email_unique')) {
          return res.status(409).json({
            error: 'Email already exists',
            message: 'A client with this email address already exists',
            code: 'DUPLICATE_EMAIL'
          });
        }
        
        throw error;
          }
        }
      }

      // Handle EER and Macros data if provided
      if (eerCalories !== undefined || macrosData !== undefined) {
        // Validate EER data if provided
        if (eerCalories !== undefined && (eerCalories < 500 || eerCalories > 8000)) {
          return res.status(400).json({
            error: 'Invalid EER calories',
            message: 'EER calories must be between 500 and 8000'
          });
        }

        // Get current nutrition requirements to preserve existing values
        const { data: currentNutrition } = await supabase
          .from('client_nutrition_requirements')
          .select('*')
          .eq('client_id', id)
          .eq('is_active', true)
          .single();

        // Prepare nutrition data for insertion/update
        let nutritionData: any = {
          client_id: id,
          eer_calories: eerCalories !== undefined ? eerCalories : (currentNutrition?.eer_calories || 2000),
          nutritionist_notes: nutritionistNotes || currentNutrition?.nutritionist_notes || null,
          calculation_method: macrosData ? 'ai_macros_assistant' : 'nutritionist_approved',
          is_edited_by_nutritionist: !macrosData,
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: req.user.id
        };

        // If macros_data is provided, handle individual macro updates
        if (macrosData) {
          const macros = macrosData;
          const eerValue = eerCalories !== undefined ? eerCalories : (currentNutrition?.eer_calories || 2000);

          // Add guideline tracking if available
          if (macros.guideline_country) {
            nutritionData.macro_guideline_country = macros.guideline_country;
            nutritionData.guideline_notes = macros.guideline_notes || null;
          }

          // Calculate average values for macros with ranges (for target values)
          const calculateAverage = (min: number | null, max: number | null): number => {
            if (min !== null && max !== null) return (min + max) / 2;
            if (min !== null) return min;
            if (max !== null) return max;
            return 0;
          };

          // Extract macro values and ranges, preserving existing values if not provided
          const proteinGrams = macros.Protein ? calculateAverage(macros.Protein.min, macros.Protein.max) : 
            (currentNutrition?.protein_grams || 0);
          const carbsGrams = macros.Carbohydrates ? calculateAverage(macros.Carbohydrates.min, macros.Carbohydrates.max) : 
            (currentNutrition?.carbs_grams || 0);
          const fatGrams = macros['Total Fat'] ? calculateAverage(macros['Total Fat'].min, macros['Total Fat'].max) : 
            (currentNutrition?.fat_grams || 0);
          const fiberGrams = macros.Fiber ? calculateAverage(macros.Fiber.min, macros.Fiber.max) : 
            (currentNutrition?.fiber_grams || 0);

          // Calculate percentages
          const proteinPercentage = eerValue > 0 ? (proteinGrams * 4 / eerValue) * 100 : 0;
          const carbsPercentage = eerValue > 0 ? (carbsGrams * 4 / eerValue) * 100 : 0;
          const fatPercentage = eerValue > 0 ? (fatGrams * 9 / eerValue) * 100 : 0;

          // Add calculated macros to nutrition data, preserving existing values for fields not provided
          nutritionData = {
            ...nutritionData,
            // Target values (calculated averages or preserved existing values)
            protein_grams: Math.round(proteinGrams * 100) / 100,
            carbs_grams: Math.round(carbsGrams * 100) / 100,
            fat_grams: Math.round(fatGrams * 100) / 100,
            fiber_grams: Math.round(fiberGrams * 100) / 100,
            protein_percentage: Math.round(proteinPercentage * 100) / 100,
            carbs_percentage: Math.round(carbsPercentage * 100) / 100,
            fat_percentage: Math.round(fatPercentage * 100) / 100,

            // Min/Max ranges - only update provided macros, preserve existing for others
            // Protein
            protein_min_grams: macros.Protein?.min !== undefined ? macros.Protein.min : (currentNutrition?.protein_min_grams || null),
            protein_max_grams: macros.Protein?.max !== undefined ? macros.Protein.max : (currentNutrition?.protein_max_grams || null),
            protein_note: macros.Protein?.note !== undefined ? macros.Protein.note : (currentNutrition?.protein_note || null),

            // Carbohydrates  
            carbs_min_grams: macros.Carbohydrates?.min !== undefined ? macros.Carbohydrates.min : (currentNutrition?.carbs_min_grams || null),
            carbs_max_grams: macros.Carbohydrates?.max !== undefined ? macros.Carbohydrates.max : (currentNutrition?.carbs_max_grams || null),
            carbs_note: macros.Carbohydrates?.note !== undefined ? macros.Carbohydrates.note : (currentNutrition?.carbs_note || null),

            // Total Fat
            fat_min_grams: macros['Total Fat']?.min !== undefined ? macros['Total Fat'].min : (currentNutrition?.fat_min_grams || null),
            fat_max_grams: macros['Total Fat']?.max !== undefined ? macros['Total Fat'].max : (currentNutrition?.fat_max_grams || null),
            fat_note: macros['Total Fat']?.note !== undefined ? macros['Total Fat'].note : (currentNutrition?.fat_note || null),

            // Fiber
            fiber_min_grams: macros.Fiber?.min !== undefined ? macros.Fiber.min : (currentNutrition?.fiber_min_grams || null),
            fiber_max_grams: macros.Fiber?.max !== undefined ? macros.Fiber.max : (currentNutrition?.fiber_max_grams || null),
            fiber_note: macros.Fiber?.note !== undefined ? macros.Fiber.note : (currentNutrition?.fiber_note || null),

            // Saturated Fat
            saturated_fat_min_grams: macros['Saturated Fat']?.min !== undefined ? macros['Saturated Fat'].min : (currentNutrition?.saturated_fat_min_grams || null),
            saturated_fat_max_grams: macros['Saturated Fat']?.max !== undefined ? macros['Saturated Fat'].max : (currentNutrition?.saturated_fat_max_grams || null),
            saturated_fat_note: macros['Saturated Fat']?.note !== undefined ? macros['Saturated Fat'].note : (currentNutrition?.saturated_fat_note || null),

            // Monounsaturated Fat
            monounsaturated_fat_min_grams: macros['Monounsaturated Fat']?.min !== undefined ? macros['Monounsaturated Fat'].min : (currentNutrition?.monounsaturated_fat_min_grams || null),
            monounsaturated_fat_max_grams: macros['Monounsaturated Fat']?.max !== undefined ? macros['Monounsaturated Fat'].max : (currentNutrition?.monounsaturated_fat_max_grams || null),
            monounsaturated_fat_note: macros['Monounsaturated Fat']?.note !== undefined ? macros['Monounsaturated Fat'].note : (currentNutrition?.monounsaturated_fat_note || null),

            // Polyunsaturated Fat
            polyunsaturated_fat_min_grams: macros['Polyunsaturated Fat']?.min !== undefined ? macros['Polyunsaturated Fat'].min : (currentNutrition?.polyunsaturated_fat_min_grams || null),
            polyunsaturated_fat_max_grams: macros['Polyunsaturated Fat']?.max !== undefined ? macros['Polyunsaturated Fat'].max : (currentNutrition?.polyunsaturated_fat_max_grams || null),
            polyunsaturated_fat_note: macros['Polyunsaturated Fat']?.note !== undefined ? macros['Polyunsaturated Fat'].note : (currentNutrition?.polyunsaturated_fat_note || null),

            // Omega-3 Fatty Acids
            omega3_min_grams: macros['Omega-3 Fatty Acids']?.min !== undefined ? macros['Omega-3 Fatty Acids'].min : (currentNutrition?.omega3_min_grams || null),
            omega3_max_grams: macros['Omega-3 Fatty Acids']?.max !== undefined ? macros['Omega-3 Fatty Acids'].max : (currentNutrition?.omega3_max_grams || null),
            omega3_note: macros['Omega-3 Fatty Acids']?.note !== undefined ? macros['Omega-3 Fatty Acids'].note : (currentNutrition?.omega3_note || null),

            // Cholesterol
            cholesterol_min_grams: macros.Cholesterol?.min !== undefined ? macros.Cholesterol.min : (currentNutrition?.cholesterol_min_grams || null),
            cholesterol_max_grams: macros.Cholesterol?.max !== undefined ? macros.Cholesterol.max : (currentNutrition?.cholesterol_max_grams || null),
            cholesterol_note: macros.Cholesterol?.note !== undefined ? macros.Cholesterol.note : (currentNutrition?.cholesterol_note || null)
          };

          console.log('Macro update data (preserving existing values):', {
            provided: Object.keys(macros).filter(key => macros[key] !== undefined),
            preserved: currentNutrition ? 'existing values preserved' : 'new record created'
          });
        } else {
          // Use provided individual macro values or preserve existing
          nutritionData = {
            ...nutritionData,
            protein_grams: proteinGrams !== undefined ? proteinGrams : (currentNutrition?.protein_grams || 0),
            carbs_grams: carbsGrams !== undefined ? carbsGrams : (currentNutrition?.carbs_grams || 0),
            fat_grams: fatGrams !== undefined ? fatGrams : (currentNutrition?.fat_grams || 0),
            fiber_grams: fiberGrams !== undefined ? fiberGrams : (currentNutrition?.fiber_grams || 0),
            protein_percentage: currentNutrition?.protein_percentage || 0,
            carbs_percentage: currentNutrition?.carbs_percentage || 0,
            fat_percentage: currentNutrition?.fat_percentage || 0
          };
        }

        // Save nutrition data - update existing or insert new
        let nutritionError;
        if (currentNutrition) {
          // Update existing record
          const { error } = await supabase
            .from('client_nutrition_requirements')
            .update(nutritionData)
            .eq('id', currentNutrition.id);
          nutritionError = error;
          console.log('Updated existing nutrition record:', currentNutrition.id);
        } else {
          // Insert new record
          const { error } = await supabase
            .from('client_nutrition_requirements')
            .insert(nutritionData);
          nutritionError = error;
          console.log('Created new nutrition record');
        }

        if (nutritionError) {
          console.error('Save nutrition error:', nutritionError);
          console.error('Nutrition data:', JSON.stringify(nutritionData, null, 2));
          console.error('User ID:', req.user?.id);
          return res.status(500).json({
            error: 'Failed to save nutrition data',
            message: 'An error occurred while saving nutrition information',
            details: nutritionError.message
          });
        }
      }

      // Handle micronutrient data if provided
      if (micronutrientsData && micronutrientsData.micronutrients) {
        // Get current micronutrient requirements to preserve existing values
        const { data: currentMicroReq } = await supabase
          .from('client_micronutrient_requirements_flexible')
          .select('*')
          .eq('client_id', id)
          .eq('is_active', true)
          .single();

        // Prepare micronutrient data, preserving existing values for fields not provided
        const micronutrients = micronutrientsData.micronutrients;
        const micronutrientUpdateData: any = {
          client_id: id,
          updated_at: new Date().toISOString()
        };

        // Only update micronutrients that are actually provided in the request
        if (micronutrients.vitaminA?.amount !== undefined) {
          micronutrientUpdateData.vitamin_a_mcg = micronutrients.vitaminA.amount;
          console.log('Updating Vitamin A:', micronutrients.vitaminA.amount);
        }
        
        if (micronutrients.thiamin?.amount !== undefined) {
          micronutrientUpdateData.thiamin_mg = micronutrients.thiamin.amount;
          console.log('Updating Thiamin:', micronutrients.thiamin.amount);
        }
        
        if (micronutrients.riboflavin?.amount !== undefined) {
          micronutrientUpdateData.riboflavin_mg = micronutrients.riboflavin.amount;
          console.log('Updating Riboflavin:', micronutrients.riboflavin.amount);
        }
        
        if (micronutrients.niacinEquivalent?.amount !== undefined) {
          micronutrientUpdateData.niacin_equivalent_mg = micronutrients.niacinEquivalent.amount;
          console.log('Updating Niacin Equivalent:', micronutrients.niacinEquivalent.amount);
        }
        
        if (micronutrients.pantothenicAcid?.amount !== undefined) {
          micronutrientUpdateData.pantothenic_acid_mg = micronutrients.pantothenicAcid.amount;
          console.log('Updating Pantothenic Acid:', micronutrients.pantothenicAcid.amount);
        }
        
        if (micronutrients.vitaminB6?.amount !== undefined) {
          micronutrientUpdateData.vitamin_b6_mg = micronutrients.vitaminB6.amount;
          console.log('Updating Vitamin B6:', micronutrients.vitaminB6.amount);
        }
        
        if (micronutrients.biotin?.amount !== undefined) {
          micronutrientUpdateData.biotin_mcg = micronutrients.biotin.amount;
          console.log('Updating Biotin:', micronutrients.biotin.amount);
        }
        
        if (micronutrients.vitaminB12?.amount !== undefined) {
          micronutrientUpdateData.vitamin_b12_mcg = micronutrients.vitaminB12.amount;
          console.log('Updating Vitamin B12:', micronutrients.vitaminB12.amount);
        }
        
        if (micronutrients.folate?.amount !== undefined) {
          micronutrientUpdateData.folate_mcg = micronutrients.folate.amount;
          console.log('Updating Folate:', micronutrients.folate.amount);
        }
        
        if (micronutrients.vitaminC?.amount !== undefined) {
          micronutrientUpdateData.vitamin_c_mg = micronutrients.vitaminC.amount;
          console.log('Updating Vitamin C:', micronutrients.vitaminC.amount);
        }
        
        if (micronutrients.vitaminD?.amount !== undefined) {
          micronutrientUpdateData.vitamin_d_mcg = micronutrients.vitaminD.amount;
          console.log('Updating Vitamin D:', micronutrients.vitaminD.amount);
        }
        
        if (micronutrients.iron?.amount !== undefined) {
          micronutrientUpdateData.iron_mg = micronutrients.iron.amount;
          console.log('Updating Iron:', micronutrients.iron.amount);
        }
        
        if (micronutrients.calcium?.amount !== undefined) {
          micronutrientUpdateData.calcium_mg = micronutrients.calcium.amount;
          console.log('Updating Calcium:', micronutrients.calcium.amount);
        }
        
        if (micronutrients.magnesium?.amount !== undefined) {
          micronutrientUpdateData.magnesium_mg = micronutrients.magnesium.amount;
          console.log('Updating Magnesium:', micronutrients.magnesium.amount);
        }
        
        if (micronutrients.potassium?.amount !== undefined) {
          micronutrientUpdateData.potassium_mg = micronutrients.potassium.amount;
          console.log('Updating Potassium:', micronutrients.potassium.amount);
        }
        
        if (micronutrients.zinc?.amount !== undefined) {
          micronutrientUpdateData.zinc_mg = micronutrients.zinc.amount;
          console.log('Updating Zinc:', micronutrients.zinc.amount);
        }
        
        if (micronutrients.copper?.amount !== undefined) {
          micronutrientUpdateData.copper_mg = micronutrients.copper.amount;
          console.log('Updating Copper:', micronutrients.copper.amount);
        }
        
        if (micronutrients.iodine?.amount !== undefined) {
          micronutrientUpdateData.iodine_mcg = micronutrients.iodine.amount;
          console.log('Updating Iodine:', micronutrients.iodine.amount);
        }
        
        if (micronutrients.selenium?.amount !== undefined) {
          micronutrientUpdateData.selenium_mcg = micronutrients.selenium.amount;
          console.log('Updating Selenium:', micronutrients.selenium.amount);
        }
        
        if (micronutrients.phosphorus?.amount !== undefined) {
          micronutrientUpdateData.phosphorus_mg = micronutrients.phosphorus.amount;
          console.log('Updating Phosphorus:', micronutrients.phosphorus.amount);
        }
        
        if (micronutrients.chloride?.amount !== undefined) {
          micronutrientUpdateData.chloride_mg = micronutrients.chloride.amount;
          console.log('Updating Chloride:', micronutrients.chloride.amount);
        }
        
        if (micronutrients.sodium?.amount !== undefined) {
          micronutrientUpdateData.sodium_g = micronutrients.sodium.amount;
          console.log('Updating Sodium:', micronutrients.sodium.amount);
        }

        console.log('Micronutrient update data (only provided fields):', micronutrientUpdateData);

        // Save micronutrient data - update existing or insert new
        let micronutrientError;
        if (currentMicroReq) {
          // Update existing record
          const { error } = await supabase
            .from('client_micronutrient_requirements_flexible')
            .update(micronutrientUpdateData)
            .eq('id', currentMicroReq.id);
          micronutrientError = error;
          console.log('Updated existing micronutrient record:', currentMicroReq.id);
        } else {
          // Insert new record with default values for missing fields
          const newMicroData = {
            client_id: id,
            country_guideline: micronutrientsData.guidelineUsed || 'UK',
            guideline_type: 'manual',
            calculation_method: 'manual',
            is_ai_generated: false,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            ...micronutrientUpdateData
          };
          
          const { error } = await supabase
            .from('client_micronutrient_requirements_flexible')
            .insert(newMicroData);
          micronutrientError = error;
          console.log('Created new micronutrient record');
        }

        if (micronutrientError) {
          console.error('Error saving micronutrient data:', micronutrientError);
          throw new Error('Failed to save micronutrient recommendations');
        }
      }

      // Handle status change (convert prospective to active)
      if (status && status !== 'prospective') {
        const updateData: any = {
          status: status,
          updated_at: new Date().toISOString()
        };

        if (status === 'active') {
          updateData.converted_to_active_at = new Date().toISOString();
        }

        await supabase
          .from('clients')
          .update(updateData)
          .eq('id', id)
          .eq('nutritionist_id', req.user.id);
      }

      // Get updated client data with all nutrition and micronutrient information
      const { data: updatedClient, error: fetchError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', id)
        .eq('nutritionist_id', req.user.id)
        .single();

      if (fetchError) {
        console.error('Fetch updated client error:', fetchError);
        return res.status(200).json({
          message: 'Client updated successfully but unable to fetch updated data'
        });
      }

      // Fetch nutrition requirements separately
      const { data: nutritionRequirements } = await supabase
        .from('client_nutrition_requirements')
        .select('*')
        .eq('client_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      // Fetch micronutrient requirements separately
      const { data: micronutrientRequirements } = await supabase
        .from('client_micronutrient_requirements_flexible')
        .select('*')
        .eq('client_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      // Format response to include all nutrition data at top level
      const nutritionReq = nutritionRequirements?.[0] || null;
      const micronutrientReq = micronutrientRequirements?.[0] || null;
      
      // Remove system fields that shouldn't be in response
      const { eer_guideline, ...clientWithoutSystemFields } = updatedClient;
      
      const response = {
        ...clientWithoutSystemFields,
        // EER data
        eerCalories: nutritionReq?.eer_calories || null,
        nutritionistNotes: nutritionReq?.nutritionist_notes || null,
        eerLastUpdated: nutritionReq?.updated_at || null,
        
        // Guideline tracking
        eerGuidelineCountry: nutritionReq?.eer_guideline_country || null,
        macroGuidelineCountry: nutritionReq?.macro_guideline_country || null,
        guidelineNotes: nutritionReq?.guideline_notes || null,
        
        // Target Macros data
        proteinGrams: nutritionReq?.protein_grams || null,
        carbsGrams: nutritionReq?.carbs_grams || null,
        fatGrams: nutritionReq?.fat_grams || null,
        fiberGrams: nutritionReq?.fiber_grams || null,
        proteinPercentage: nutritionReq?.protein_percentage || null,
        carbsPercentage: nutritionReq?.carbs_percentage || null,
        fatPercentage: nutritionReq?.fat_percentage || null,
        
        // Macros Ranges
        macrosRanges: nutritionReq ? {
          protein: {
            min: nutritionReq.protein_min_grams,
            max: nutritionReq.protein_max_grams,
            unit: 'g',
            note: nutritionReq.protein_note
          },
          carbs: {
            min: nutritionReq.carbs_min_grams,
            max: nutritionReq.carbs_max_grams,
            unit: 'g',
            note: nutritionReq.carbs_note
          },
          fat: {
            min: nutritionReq.fat_min_grams,
            max: nutritionReq.fat_max_grams,
            unit: 'g',
            note: nutritionReq.fat_note
          },
          fiber: {
            min: nutritionReq.fiber_min_grams,
            max: nutritionReq.fiber_max_grams,
            unit: 'g',
            note: nutritionReq.fiber_note
          },
          saturatedFat: {
            min: nutritionReq.saturated_fat_min_grams,
            max: nutritionReq.saturated_fat_max_grams,
            unit: 'g',
            note: nutritionReq.saturated_fat_note
          },
          monounsaturatedFat: {
            min: nutritionReq.monounsaturated_fat_min_grams,
            max: nutritionReq.monounsaturated_fat_max_grams,
            unit: 'g',
            note: nutritionReq.monounsaturated_fat_note
          },
          polyunsaturatedFat: {
            min: nutritionReq.polyunsaturated_fat_min_grams,
            max: nutritionReq.polyunsaturated_fat_max_grams,
            unit: 'g',
            note: nutritionReq.polyunsaturated_fat_note
          },
          omega3: {
            min: nutritionReq.omega3_min_grams,
            max: nutritionReq.omega3_max_grams,
            unit: 'g',
            note: nutritionReq.omega3_note
          },
          cholesterol: {
            min: nutritionReq.cholesterol_min_grams,
            max: nutritionReq.cholesterol_max_grams,
            unit: 'mg',
            note: nutritionReq.cholesterol_note
          }
        } : null,
        
        // Micronutrient data - categorized into vitamins, minerals, and miscellaneous
        micronutrients: micronutrientReq ? categorizeMicronutrients(micronutrientReq.micronutrient_recommendations) : {
          vitamins: {},
          minerals: {},
          miscellaneous: {}
        },
        guidelineUsed: micronutrientReq?.country_guideline || null,
        micronutrientNotes: micronutrientReq?.nutritionist_notes || null,
        micronutrientGuidelineType: micronutrientReq?.guideline_type || null,
        micronutrientCalculationFactors: micronutrientReq?.calculation_factors || null,
        
        // AI calculation metadata
        calculationMethod: nutritionReq?.calculation_method || null
      };

      // Remove nested arrays
      delete response.nutrition_requirements;
      delete response.micronutrient_requirements;

      // Transform response to camelCase
      const transformedResponse = transformWithMapping(response, FIELD_MAPPINGS.snakeToCamel);

      res.status(200).json({
        message: 'Client updated successfully',
        client: transformedResponse
      });

    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({
        error: 'Failed to update client',
        message: 'An error occurred while updating the client'
      });
    }
  }

  // DELETE - Delete client
  else if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('nutritionist_id', req.user.id);

      if (error) {
        console.error('Delete client error:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Client not found',
            message: 'The requested client does not exist or you do not have access to it'
          });
        }
        throw error;
      }

      res.status(200).json({
        message: 'Client deleted successfully'
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({
        error: 'Failed to delete client',
        message: 'An error occurred while deleting the client'
      });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler);