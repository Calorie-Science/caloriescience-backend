import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { validateAndTransformClient } from '../../lib/validation';
import { transformWithMapping, FIELD_MAPPINGS, objectToCamelCase } from '../../lib/caseTransform';
import { calculateHealthMetrics, calculateBMI } from '../../lib/healthMetrics';
import { categorizeMicronutrients } from '../../lib/micronutrientCategorization';
import { calculateEER, calculateMacros } from '../../lib/calculations';
import { normalizeCountry, getEERGuidelineFromLocation } from '../../lib/locationMapping';

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

      // Fetch client goal data
      const { data: clientGoalData } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .single();

      // Format response to include EER and Macros data at top level
      const nutritionReq = nutritionRequirements?.[0] || null;
      const micronutrientReq = micronutrientRequirements?.[0] || null;
      
      // Remove system fields that shouldn't be in response
      const { eer_guideline, ...clientWithoutSystemFields } = client;
      
      const response = {
        ...clientWithoutSystemFields,
        // Ensure measurement system is included
        preferredMeasurementSystem: client.preferred_measurement_system || 'metric',
        // EER data
        eerCalories: nutritionReq?.eer_calories ?? null,
        nutritionistNotes: nutritionReq?.nutritionist_notes || null,
        eerLastUpdated: nutritionReq?.updated_at || null,

        // Guideline tracking
        eerGuidelineCountry: nutritionReq?.eer_guideline_country || null,
        macroGuidelineCountry: nutritionReq?.macro_guideline_country || null,
        guidelineNotes: nutritionReq?.guideline_notes || null,
        formulaUsed: nutritionReq?.formula_used || null,
        formulaId: nutritionReq?.formula_id || null,
        
        // Target Macros data
        proteinGrams: nutritionReq?.protein_grams ?? null,
        carbsGrams: nutritionReq?.carbs_grams ?? null,
        fatGrams: nutritionReq?.fat_grams ?? null,
        fiberGrams: nutritionReq?.fiber_grams ?? null,
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
        micronutrients: micronutrientReq ? categorizeMicronutrients(micronutrientReq?.micronutrient_recommendations || {}, true) : {
          vitamins: {},
          minerals: {},
          miscellaneous: {}
        },
        guidelineUsed: micronutrientReq?.country_guideline || null,
        micronutrientNotes: micronutrientReq?.nutritionist_notes || null,
        micronutrientGuidelineType: micronutrientReq?.guideline_type || null,
        micronutrientCalculationFactors: micronutrientReq?.calculation_factors || null,
        
        // AI calculation metadata
        calculationMethod: nutritionReq?.calculation_method || null,
        clientNutritionRequirements: nutritionRequirements,
        clientMicronutrientRequirements: micronutrientRequirements,
        clientGoal: clientGoalData ?? null,
        eerGuideline: eer_guideline,
        healthMetrics: calculateHealthMetrics(client.height_cm, client.weight_kg),
        categorizedMicronutrients: categorizeMicronutrients(micronutrientReq?.micronutrient_recommendations || {}, true)
      };

      // Remove the nested nutrition_requirements array
      delete response.nutrition_requirements;
      delete response.micronutrient_requirements;

      // Transform response to camelCase using general conversion
      const transformedResponse = objectToCamelCase(response);

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
      // Store auto-calculated values for use in nutrition requirements
      let autoCalculatedEER: number | undefined;
      let autoCalculatedMacros: any | undefined;
      let autoCalculatedLocation: string | undefined;

      // Helper function to normalize macro keys (support both camelCase and lowercase)
      const normalizeMacroKey = (key: string): string => {
        const keyMap: { [key: string]: string } = {
          // camelCase to normalized
          'Protein': 'protein',
          'Carbohydrates': 'carbs',
          'Total Fat': 'fat',
          'Fiber': 'fiber',
          'Saturated Fat': 'saturated_fat',
          'Monounsaturated Fat': 'monounsaturated_fat',
          'Polyunsaturated Fat': 'polyunsaturated_fat',
          'Omega-3 Fatty Acids': 'omega3',
          'Cholesterol': 'cholesterol',
          // lowercase to normalized
          'protein': 'protein',
          'carbs': 'carbs',
          'carbohydrates': 'carbs',
          'fat': 'fat',
          'fiber': 'fiber',
          'saturated_fat': 'saturated_fat',
          'saturatedfat': 'saturated_fat',
          'monounsaturated_fat': 'monounsaturated_fat',
          'monounsaturatedfat': 'monounsaturated_fat',
          'polyunsaturated_fat': 'polyunsaturated_fat',
          'polyunsaturatedfat': 'polyunsaturated_fat',
          'omega3': 'omega3',
          'omega-3': 'omega3',
          'omega_3': 'omega3',
          'cholesterol': 'cholesterol'
        };
        
        return keyMap[key] || key.toLowerCase();
      };

      // Helper function to get macro value with case-insensitive support
      const getMacroValue = (macros: any, key: string) => {
        // Try exact match first
        if (macros[key] !== undefined) return macros[key];
        
        // Try normalized key
        const normalizedKey = normalizeMacroKey(key);
        if (macros[normalizedKey] !== undefined) return macros[normalizedKey];
        
        // Try common variations
        const variations = [
          key,
          key.toLowerCase(),
          key.replace(/\s+/g, ''),
          key.replace(/\s+/g, '_'),
          key.replace(/\s+/g, '-')
        ];
        
        for (const variation of variations) {
          if (macros[variation] !== undefined) return macros[variation];
        }
        
        return undefined;
      };

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
        formulaId,
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
            console.log('🔍 Weight/Height change detected in validation:', {
              height_cm: validation.value.height_cm,
              weight_kg: validation.value.weight_kg
            });
            
            // Get current client data to check for changes
            const { data: currentClient } = await supabase
              .from('clients')
              .select('height_cm, weight_kg, bmi, bmi_category, location, gender, activity_level, date_of_birth, pregnancy_status, lactation_status')
              .eq('id', id)
              .eq('nutritionist_id', req.user.id)
              .single();

            console.log('📊 Current client data fetched:', currentClient);

            // Also get current EER from nutrition requirements
            const { data: currentNutrition } = await supabase
              .from('client_nutrition_requirements')
              .select('eer_calories')
              .eq('client_id', id)
              .eq('is_active', true)
              .single();

            console.log('🍽️ Current nutrition data fetched:', currentNutrition);

            if (currentClient) {
              const finalHeight = validation.value.height_cm || currentClient.height_cm;
              const finalWeight = validation.value.weight_kg || currentClient.weight_kg;
              
              console.log('📏 Final dimensions calculated:', {
                finalHeight,
                finalWeight,
                originalHeight: currentClient.height_cm,
                originalWeight: currentClient.weight_kg
              });
              
              if (finalHeight && finalWeight) {
                const healthMetrics = calculateHealthMetrics(finalHeight, finalWeight);
                const transformedHealthMetrics = transformWithMapping(healthMetrics, FIELD_MAPPINGS.camelToSnake);
                Object.assign(updateData, transformedHealthMetrics);

                console.log('🏥 Health metrics calculated and added to updateData:', transformedHealthMetrics);

                // Auto-recalculate EER, macros, and micronutrients if weight or height changed
                // Fix: Allow recalculation when only one value is provided
                const weightChanged = validation.value.weight_kg !== undefined && validation.value.weight_kg !== currentClient.weight_kg;
                const heightChanged = validation.value.height_cm !== undefined && validation.value.height_cm !== currentClient.height_cm;
                
                // If either weight or height is provided and changed, recalculate
                const shouldRecalculate = (validation.value.weight_kg !== undefined && weightChanged) || 
                                        (validation.value.height_cm !== undefined && heightChanged);

                console.log('🔄 Change detection results:', {
                  weightChanged,
                  heightChanged,
                  shouldRecalculate,
                  weightComparison: {
                    provided: validation.value.weight_kg,
                    current: currentClient.weight_kg,
                    isEqual: validation.value.weight_kg === currentClient.weight_kg
                  },
                  heightComparison: {
                    provided: validation.value.height_cm,
                    current: currentClient.height_cm,
                    isEqual: validation.value.height_cm === currentClient.height_cm
                  }
                });

                if (shouldRecalculate) {
                  console.log('🚀 Weight or height changed, starting auto-recalculation process');
                  console.log(`📊 Weight change: ${currentClient.weight_kg} → ${finalWeight} kg`);
                  console.log(`📏 Height change: ${currentClient.height_cm} → ${finalHeight} cm`);
                  
                  // Store location for later use (normalize to lowercase)
                  autoCalculatedLocation = getEERGuidelineFromLocation(currentClient.location || 'uk');
                  console.log('🌍 Auto-calculation location set:', autoCalculatedLocation);
                  
                  try {
                    // Calculate new BMI and BMR
                    const age = calculateAge(currentClient.date_of_birth);
                    console.log('🎂 Age calculated:', age);
                    
                    const bmiResult = calculateBMI(finalHeight, finalWeight);
                    console.log('📊 BMI calculation result:', bmiResult);
                    
                    console.log('🧮 Starting EER calculation with params:', {
                      country: currentClient.location,
                      age: age,
                      gender: currentClient.gender,
                      height_cm: finalHeight,
                      weight_kg: finalWeight,
                      activity_level: currentClient.activity_level,
                      pregnancy_status: currentClient.pregnancy_status,
                      lactation_status: currentClient.lactation_status
                    });
                    
                    // Calculate new EER (which includes BMR) - use normalized location
                    const eerResult = await calculateEER({
                      country: autoCalculatedLocation,
                      age: age,
                      gender: currentClient.gender,
                      height_cm: finalHeight,
                      weight_kg: finalWeight,
                      activity_level: currentClient.activity_level,
                      pregnancy_status: currentClient.pregnancy_status,
                      lactation_status: currentClient.lactation_status
                    });
                    
                    console.log('✅ EER calculation successful:', eerResult);
                    
                    // Add BMI and BMR to client update data
                    updateData.bmi = bmiResult.bmi;
                    updateData.bmi_category = bmiResult.category;
                    updateData.bmi_last_calculated = new Date().toISOString();
                    updateData.bmr = eerResult.bmr;
                    updateData.bmr_last_calculated = new Date().toISOString();
                    
                    console.log('📝 Client update data updated with health metrics:', {
                      bmi: updateData.bmi,
                      bmi_category: updateData.bmi_category,
                      bmr: updateData.bmr,
                      bmi_last_calculated: updateData.bmi_last_calculated,
                      bmr_last_calculated: updateData.bmr_last_calculated
                    });
                    
                    console.log(`📊 BMI auto-recalculated: ${bmiResult.bmi} (${bmiResult.category})`);
                    console.log(`🔥 BMR auto-recalculated: ${eerResult.bmr} kcal`);
                    
                    // Always store EER for weight/height changes (don't compare with current)
                    console.log(`⚡ EER auto-recalculated: ${currentNutrition?.eer_calories || 'N/A'} → ${eerResult.eer} kcal`);
                    autoCalculatedEER = eerResult.eer;
                    console.log('💾 Auto-calculated EER stored:', autoCalculatedEER);
                    
                    // Auto-recalculate macros based on new EER
                    console.log('🍽️ Starting macro recalculation...');
                    try {
                      const macrosResult = await calculateMacros({
                        eer: eerResult.eer,
                        country: autoCalculatedLocation,
                        age: age,
                        gender: currentClient.gender,
                        weight_kg: finalWeight
                      });

                      // Store auto-calculated macros for later use
                      autoCalculatedMacros = macrosResult;
                      console.log('✅ Macros auto-recalculated successfully:', {
                        eer: eerResult.eer,
                        macroCount: Object.keys(macrosResult).length,
                        hasGuideline: !!macrosResult.guideline_country
                      });
                      console.log('🔍 Macro calculation details:', {
                        guideline_country: macrosResult.guideline_country,
                        guideline_notes: macrosResult.guideline_notes,
                        protein_range: macrosResult.Protein,
                        carbs_range: macrosResult['Carbohydrates'],
                        fat_range: macrosResult['Total Fat'],
                        fiber_range: macrosResult.Fiber
                      });
                    } catch (macrosError) {
                      console.error('❌ Error auto-calculating macros:', macrosError);
                      console.error('📋 Macro error details:', {
                        message: macrosError instanceof Error ? macrosError.message : String(macrosError),
                        stack: macrosError instanceof Error ? macrosError.stack : 'No stack trace'
                      });
                      // Continue without macros, don't break the whole process
                    }

                    // Micronutrients are only calculated during client creation, not updates
                    
                    console.log('🎉 Auto-calculation process completed successfully!');
                    console.log('📋 Summary of calculated values:', {
                      bmi: bmiResult.bmi,
                      bmr: eerResult.bmr,
                      eer: eerResult.eer,
                      hasMacros: !!autoCalculatedMacros,
                      hasMicronutrients: false // Always false for updates
                    });
                    
                  } catch (eerError) {
                    console.error('❌ CRITICAL ERROR in auto-calculation process:', eerError);
                    console.error('📋 Error details:', {
                      message: eerError instanceof Error ? eerError.message : String(eerError),
                      stack: eerError instanceof Error ? eerError.stack : 'No stack trace',
                      name: eerError instanceof Error ? eerError.name : 'Unknown'
                    });
                    console.error('🔍 Error context:', {
                      clientId: id,
                      weightChanged,
                      heightChanged,
                      finalHeight,
                      finalWeight,
                      currentClient: {
                        location: currentClient.location,
                        gender: currentClient.gender,
                        activity_level: currentClient.activity_level
                      }
                    });
                  }
                } else {
                  console.log('⏭️ No weight/height changes detected, skipping auto-calculation');
                }
              } else {
                console.log('⚠️ Missing height or weight data, skipping health calculations');
              }
            } else {
              console.log('❌ Current client data not found, skipping auto-calculation');
            }
          } else {
            console.log('⏭️ No height or weight changes in validation, skipping health calculations');
          }

          // Handle status conversion to active
          if (validation.value.status === 'active') {
            // Get current client status to check if this is a conversion
            const { data: currentClientStatus } = await supabase
              .from('clients')
              .select('status')
              .eq('id', id)
              .eq('nutritionist_id', req.user.id)
              .single();

            // If converting from non-active to active, set the conversion timestamp
            if (currentClientStatus && currentClientStatus.status !== 'active') {
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

      // Handle formula change - recalculate EER if formulaId is provided
      if (formulaId !== undefined && !autoCalculatedEER) {
        console.log('🔄 Formula change detected, recalculating EER with new formula:', formulaId);

        // Get current client data for calculations
        const { data: currentClient } = await supabase
          .from('clients')
          .select('height_cm, weight_kg, location, gender, activity_level, date_of_birth, pregnancy_status, lactation_status')
          .eq('id', id)
          .eq('nutritionist_id', req.user.id)
          .single();

        if (currentClient && currentClient.height_cm && currentClient.weight_kg && currentClient.date_of_birth) {
          const age = calculateAge(currentClient.date_of_birth);
          const normalizedLocation = getEERGuidelineFromLocation(currentClient.location || 'uk');

          try {
            // Calculate EER with new formula
            const eerResult = await calculateEER({
              country: normalizedLocation,
              age: age,
              gender: currentClient.gender,
              height_cm: currentClient.height_cm,
              weight_kg: currentClient.weight_kg,
              activity_level: currentClient.activity_level,
              pregnancy_status: currentClient.pregnancy_status,
              lactation_status: currentClient.lactation_status,
              formula_id: formulaId // Use the new formula ID
            });

            console.log('✅ EER recalculated with new formula:', {
              formulaId: formulaId,
              formula_used: eerResult.formula_used,
              eer: eerResult.eer,
              bmr: eerResult.bmr
            });

            // Store the recalculated values
            autoCalculatedEER = eerResult.eer;
            autoCalculatedLocation = normalizedLocation;

            // Store formula_used for later
            if (!autoCalculatedMacros) {
              autoCalculatedMacros = {};
            }
            (autoCalculatedMacros as any).formula_used = eerResult.formula_used;
            (autoCalculatedMacros as any).formula_id = eerResult.formula_id;

            // Update BMR in client record
            await supabase
              .from('clients')
              .update({
                bmr: eerResult.bmr,
                bmr_last_calculated: new Date().toISOString()
              })
              .eq('id', id);

            // Calculate macros based on new EER
            const macrosResult = await calculateMacros({
              eer: eerResult.eer,
              country: normalizedLocation,
              age: age,
              gender: currentClient.gender,
              weight_kg: currentClient.weight_kg
            });

            autoCalculatedMacros = macrosResult;
            console.log('✅ Macros recalculated with new EER');

          } catch (error) {
            console.error('❌ Error recalculating with new formula:', error);
            return res.status(500).json({
              error: 'Failed to recalculate with new formula',
              message: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      // Handle EER and Macros data if provided or auto-calculated
      if (eerCalories !== undefined || macrosData !== undefined || autoCalculatedEER !== undefined || autoCalculatedMacros !== undefined || formulaId !== undefined) {
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
          eer_calories: eerCalories !== undefined ? eerCalories : (autoCalculatedEER || currentNutrition?.eer_calories || 2000),
          nutritionist_notes: nutritionistNotes || currentNutrition?.nutritionist_notes || null,
          calculation_method: (macrosData || autoCalculatedMacros) ? 'auto_calculated' : 'nutritionist_approved',
          is_edited_by_nutritionist: !(macrosData || autoCalculatedMacros),
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: req.user.id
        };

        console.log('🍽️ Nutrition data preparation started:', {
          client_id: id,
          eerCalories_provided: eerCalories,
          autoCalculatedEER,
          currentNutrition_eer: currentNutrition?.eer_calories,
          final_eer_calories: nutritionData.eer_calories,
          calculation_method: nutritionData.calculation_method,
          is_edited_by_nutritionist: nutritionData.is_edited_by_nutritionist
        });

        // Add EER guideline tracking if auto-calculated
        if (autoCalculatedEER && !eerCalories) {
          nutritionData.eer_guideline_country = autoCalculatedLocation || 'uk';
          console.log('🌍 EER guideline tracking added:', nutritionData.eer_guideline_country);
        }

        // Add formula_id and formula_used if we recalculated with a new formula
        if (formulaId !== undefined && autoCalculatedMacros && (autoCalculatedMacros as any).formula_used) {
          nutritionData.formula_id = formulaId;
          nutritionData.formula_used = (autoCalculatedMacros as any).formula_used;
          console.log('📝 Formula ID and formula_used added to nutrition data:', {
            formula_id: formulaId,
            formula_used: nutritionData.formula_used
          });
        } else if (formulaId !== undefined) {
          // Just update formula_id without formula_used (manual update case)
          nutritionData.formula_id = formulaId;
          console.log('📝 Formula ID added to nutrition data:', formulaId);
        }

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
          const proteinGrams = getMacroValue(macros, 'Protein') ? calculateAverage(getMacroValue(macros, 'Protein').min, getMacroValue(macros, 'Protein').max) : 
            (currentNutrition?.protein_grams || 0);
          const carbsGrams = getMacroValue(macros, 'Carbohydrates') ? calculateAverage(getMacroValue(macros, 'Carbohydrates').min, getMacroValue(macros, 'Carbohydrates').max) : 
            (currentNutrition?.carbs_grams || 0);
          const fatGrams = getMacroValue(macros, 'Total Fat') ? calculateAverage(getMacroValue(macros, 'Total Fat').min, getMacroValue(macros, 'Total Fat').max) : 
            (currentNutrition?.fat_grams || 0);
          const fiberGrams = getMacroValue(macros, 'Fiber') ? calculateAverage(getMacroValue(macros, 'Fiber').min, getMacroValue(macros, 'Fiber').max) : 
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
            protein_min_grams: getMacroValue(macros, 'Protein')?.min !== undefined ? getMacroValue(macros, 'Protein').min : (currentNutrition?.protein_min_grams || null),
            protein_max_grams: getMacroValue(macros, 'Protein')?.max !== undefined ? getMacroValue(macros, 'Protein').max : (currentNutrition?.protein_max_grams || null),
            protein_note: getMacroValue(macros, 'Protein')?.note !== undefined ? getMacroValue(macros, 'Protein').note : (currentNutrition?.protein_note || null),

            // Carbohydrates  
            carbs_min_grams: getMacroValue(macros, 'Carbohydrates')?.min !== undefined ? getMacroValue(macros, 'Carbohydrates').min : (currentNutrition?.carbs_min_grams || null),
            carbs_max_grams: getMacroValue(macros, 'Carbohydrates')?.max !== undefined ? getMacroValue(macros, 'Carbohydrates').max : (currentNutrition?.carbs_max_grams || null),
            carbs_note: getMacroValue(macros, 'Carbohydrates')?.note !== undefined ? getMacroValue(macros, 'Carbohydrates').note : (currentNutrition?.carbs_note || null),

            // Total Fat
            fat_min_grams: getMacroValue(macros, 'Total Fat')?.min !== undefined ? getMacroValue(macros, 'Total Fat').min : (currentNutrition?.fat_min_grams || null),
            fat_max_grams: getMacroValue(macros, 'Total Fat')?.max !== undefined ? getMacroValue(macros, 'Total Fat').max : (currentNutrition?.fat_max_grams || null),
            fat_note: getMacroValue(macros, 'Total Fat')?.note !== undefined ? getMacroValue(macros, 'Total Fat').note : (currentNutrition?.fat_note || null),

            // Fiber
            fiber_min_grams: getMacroValue(macros, 'Fiber')?.min !== undefined ? getMacroValue(macros, 'Fiber').min : (currentNutrition?.fiber_min_grams || null),
            fiber_max_grams: getMacroValue(macros, 'Fiber')?.max !== undefined ? getMacroValue(macros, 'Fiber').max : (currentNutrition?.fiber_max_grams || null),
            fiber_note: getMacroValue(macros, 'Fiber')?.note !== undefined ? getMacroValue(macros, 'Fiber').note : (currentNutrition?.fiber_note || null),

            // Saturated Fat
            saturated_fat_min_grams: getMacroValue(macros, 'Saturated Fat')?.min !== undefined ? getMacroValue(macros, 'Saturated Fat').min : (currentNutrition?.saturated_fat_min_grams || null),
            saturated_fat_max_grams: getMacroValue(macros, 'Saturated Fat')?.max !== undefined ? getMacroValue(macros, 'Saturated Fat').max : (currentNutrition?.saturated_fat_max_grams || null),
            saturated_fat_note: getMacroValue(macros, 'Saturated Fat')?.note !== undefined ? getMacroValue(macros, 'Saturated Fat').note : (currentNutrition?.saturated_fat_note || null),

            // Monounsaturated Fat
            monounsaturated_fat_min_grams: getMacroValue(macros, 'Monounsaturated Fat')?.min !== undefined ? getMacroValue(macros, 'Monounsaturated Fat').min : (currentNutrition?.monounsaturated_fat_min_grams || null),
            monounsaturated_fat_max_grams: getMacroValue(macros, 'Monounsaturated Fat')?.max !== undefined ? getMacroValue(macros, 'Monounsaturated Fat').max : (currentNutrition?.monounsaturated_fat_max_grams || null),
            monounsaturated_fat_note: getMacroValue(macros, 'Monounsaturated Fat')?.note !== undefined ? getMacroValue(macros, 'Monounsaturated Fat').note : (currentNutrition?.monounsaturated_fat_note || null),

            // Polyunsaturated Fat
            polyunsaturated_fat_min_grams: getMacroValue(macros, 'Polyunsaturated Fat')?.min !== undefined ? getMacroValue(macros, 'Polyunsaturated Fat').min : (currentNutrition?.polyunsaturated_fat_min_grams || null),
            polyunsaturated_fat_max_grams: getMacroValue(macros, 'Polyunsaturated Fat')?.max !== undefined ? getMacroValue(macros, 'Polyunsaturated Fat').max : (currentNutrition?.polyunsaturated_fat_max_grams || null),
            polyunsaturated_fat_note: getMacroValue(macros, 'Polyunsaturated Fat')?.note !== undefined ? getMacroValue(macros, 'Polyunsaturated Fat').note : (currentNutrition?.polyunsaturated_fat_note || null),

            // Omega-3 Fatty Acids
            omega3_min_grams: getMacroValue(macros, 'Omega-3 Fatty Acids')?.min !== undefined ? getMacroValue(macros, 'Omega-3 Fatty Acids').min : (currentNutrition?.omega3_min_grams || null),
            omega3_max_grams: getMacroValue(macros, 'Omega-3 Fatty Acids')?.max !== undefined ? getMacroValue(macros, 'Omega-3 Fatty Acids').max : (currentNutrition?.omega3_max_grams || null),
            omega3_note: getMacroValue(macros, 'Omega-3 Fatty Acids')?.note !== undefined ? getMacroValue(macros, 'Omega-3 Fatty Acids').note : (currentNutrition?.omega3_note || null),

            // Cholesterol
            cholesterol_min_grams: getMacroValue(macros, 'Cholesterol')?.min !== undefined ? getMacroValue(macros, 'Cholesterol').min : (currentNutrition?.cholesterol_min_grams || null),
            cholesterol_max_grams: getMacroValue(macros, 'Cholesterol')?.max !== undefined ? getMacroValue(macros, 'Cholesterol').max : (currentNutrition?.cholesterol_max_grams || null),
            cholesterol_note: getMacroValue(macros, 'Cholesterol')?.note !== undefined ? getMacroValue(macros, 'Cholesterol').note : (currentNutrition?.cholesterol_note || null)
          };

          console.log('Macro update data (preserving existing values):', {
            provided: Object.keys(macros).filter(key => macros[key] !== undefined),
            preserved: currentNutrition ? 'existing values preserved' : 'new record created'
          });
        } else if (autoCalculatedMacros) {
          // Use auto-calculated macros from weight/height change
          console.log('🚀 Using auto-calculated macros from weight/height change');
          console.log('📊 Auto-calculated macros data:', {
            hasMacros: !!autoCalculatedMacros,
            macroCount: Object.keys(autoCalculatedMacros).length,
            guideline_country: autoCalculatedMacros.guideline_country,
            guideline_notes: autoCalculatedMacros.guideline_notes
          });
          
          // Add guideline tracking for auto-calculated macros
          if (autoCalculatedMacros.guideline_country) {
            nutritionData.macro_guideline_country = autoCalculatedMacros.guideline_country;
            nutritionData.guideline_notes = autoCalculatedMacros.guideline_notes || null;
            console.log('🏷️ Macro guideline tracking added:', {
              country: nutritionData.macro_guideline_country,
              notes: nutritionData.guideline_notes
            });
          }
          
          // Calculate average values for macros with ranges
          const calculateAverage = (min: number | null, max: number | null): number => {
            if (min !== null && max !== null) return (min + max) / 2;
            if (min !== null) return min;
            if (max !== null) return max;
            return 0;
          };

          console.log('🧮 Starting macro calculations...');
          
          const proteinGrams = calculateAverage(autoCalculatedMacros.Protein.min, autoCalculatedMacros.Protein.max);
          const carbsGrams = calculateAverage(autoCalculatedMacros.Carbohydrates.min, autoCalculatedMacros.Carbohydrates.max);
          const fatGrams = calculateAverage(autoCalculatedMacros['Total Fat'].min, autoCalculatedMacros['Total Fat'].max);
          const fiberGrams = calculateAverage(autoCalculatedMacros.Fiber.min, autoCalculatedMacros.Fiber.max);

          console.log('📊 Macro grams calculated:', {
            protein: proteinGrams,
            carbs: carbsGrams,
            fat: fatGrams,
            fiber: fiberGrams
          });

          // Calculate percentages
          const finalEER = autoCalculatedEER || currentNutrition?.eer_calories || 2000;
          const proteinPercentage = finalEER > 0 ? (proteinGrams * 4 / finalEER) * 100 : 0;
          const carbsPercentage = finalEER > 0 ? (carbsGrams * 4 / finalEER) * 100 : 0;
          const fatPercentage = finalEER > 0 ? (fatGrams * 9 / finalEER) * 100 : 0;

          console.log('📈 Macro percentages calculated:', {
            finalEER,
            protein: `${proteinGrams}g (${proteinPercentage.toFixed(1)}%)`,
            carbs: `${carbsGrams}g (${carbsPercentage.toFixed(1)}%)`,
            fat: `${fatGrams}g (${fatPercentage.toFixed(1)}%)`
          });

          nutritionData = {
            ...nutritionData,
            // Target values
            protein_grams: Math.round(proteinGrams * 100) / 100,
            carbs_grams: Math.round(carbsGrams * 100) / 100,
            fat_grams: Math.round(fatGrams * 100) / 100,
            fiber_grams: Math.round(fiberGrams * 100) / 100,
            protein_percentage: Math.round(proteinPercentage * 100) / 100,
            carbs_percentage: Math.round(carbsPercentage * 100) / 100,
            fat_percentage: Math.round(fatPercentage * 100) / 100,

            // Min/Max ranges from auto-calculation
            protein_min_grams: autoCalculatedMacros.Protein.min,
            protein_max_grams: autoCalculatedMacros.Protein.max,
            protein_note: autoCalculatedMacros.Protein.note,

            carbs_min_grams: autoCalculatedMacros.Carbohydrates.min,
            carbs_max_grams: autoCalculatedMacros.Carbohydrates.max,
            carbs_note: autoCalculatedMacros.Carbohydrates.note,

            fat_min_grams: autoCalculatedMacros['Total Fat'].min,
            fat_max_grams: autoCalculatedMacros['Total Fat'].max,
            fat_note: autoCalculatedMacros['Total Fat'].note,

            fiber_min_grams: autoCalculatedMacros.Fiber.min,
            fiber_max_grams: autoCalculatedMacros.Fiber.max,
            fiber_note: autoCalculatedMacros.Fiber.note,

            saturated_fat_min_grams: autoCalculatedMacros['Saturated Fat'].min,
            saturated_fat_max_grams: autoCalculatedMacros['Saturated Fat'].max,
            saturated_fat_note: autoCalculatedMacros['Saturated Fat'].note,

            monounsaturated_fat_min_grams: autoCalculatedMacros['Monounsaturated Fat'].min,
            monounsaturated_fat_max_grams: autoCalculatedMacros['Monounsaturated Fat'].max,
            monounsaturated_fat_note: autoCalculatedMacros['Monounsaturated Fat'].note,

            polyunsaturated_fat_min_grams: autoCalculatedMacros['Polyunsaturated Fat'].min,
            polyunsaturated_fat_max_grams: autoCalculatedMacros['Polyunsaturated Fat'].max,
            polyunsaturated_fat_note: autoCalculatedMacros['Polyunsaturated Fat'].note,

            omega3_min_grams: autoCalculatedMacros['Omega-3 Fatty Acids'].min,
            omega3_max_grams: autoCalculatedMacros['Omega-3 Fatty Acids'].max,
            omega3_note: autoCalculatedMacros['Omega-3 Fatty Acids'].note,

            cholesterol_min_grams: autoCalculatedMacros.Cholesterol.min,
            cholesterol_max_grams: autoCalculatedMacros.Cholesterol.max,
            cholesterol_note: autoCalculatedMacros.Cholesterol.note
          };

          console.log('Auto-calculated macros applied:', {
            eer: finalEER,
            protein: `${proteinGrams}g (${proteinPercentage.toFixed(1)}%)`,
            carbs: `${carbsGrams}g (${carbsPercentage.toFixed(1)}%)`,
            fat: `${fatGrams}g (${fatPercentage.toFixed(1)}%)`
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
          console.log('🔄 Updating existing nutrition record:', {
            recordId: currentNutrition.id,
            currentEER: currentNutrition.eer_calories,
            newEER: nutritionData.eer_calories,
            hasChanges: currentNutrition.eer_calories !== nutritionData.eer_calories
          });
          
          const { error } = await supabase
            .from('client_nutrition_requirements')
            .update(nutritionData)
            .eq('id', currentNutrition.id);
          nutritionError = error;
          
          if (error) {
            console.error('❌ Error updating nutrition record:', error);
          } else {
            console.log('✅ Nutrition record updated successfully');
          }
        } else {
          // Insert new record
          console.log('🆕 Creating new nutrition record:', {
            client_id: id,
            eer_calories: nutritionData.eer_calories,
            calculation_method: nutritionData.calculation_method
          });
          
          const { error } = await supabase
            .from('client_nutrition_requirements')
            .insert(nutritionData);
          nutritionError = error;
          
          if (error) {
            console.error('❌ Error creating nutrition record:', error);
          } else {
            console.log('✅ Nutrition record created successfully');
          }
        }

        if (nutritionError) {
          console.error('❌ Nutrition data save failed:', nutritionError);
          console.error('📋 Nutrition error details:', {
            code: nutritionError.code,
            message: nutritionError.message,
            details: nutritionError.details
          });
        } else {
          console.log('🎉 Nutrition data saved successfully!');
          console.log('📊 Final nutrition data summary:', {
            eer_calories: nutritionData.eer_calories,
            calculation_method: nutritionData.calculation_method,
            guideline_country: nutritionData.eer_guideline_country,
            macro_guideline_country: nutritionData.macro_guideline_country
          });
        }

        // Handle manual micronutrient updates if provided
        if (micronutrientsData && micronutrientsData.micronutrients) {
          console.log('Handling manual micronutrient updates');
          
          // Get current micronutrient requirements
          const { data: currentMicroReq } = await supabase
            .from('client_micronutrient_requirements_flexible')
            .select('*')
            .eq('client_id', id)
            .eq('is_active', true)
            .single();

          // Helper function to get micronutrient value with case-insensitive support
          const getMicroValue = (micros: any, key: string) => {
            // Try exact match first
            if (micros[key] !== undefined) return micros[key];
            
            // Try lowercase
            if (micros[key.toLowerCase()] !== undefined) return micros[key.toLowerCase()];
            
            // Try underscore format (e.g., vitaminA -> vitamin_a)
            const underscoreKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (micros[underscoreKey] !== undefined) return micros[underscoreKey];
            
            // Try camelCase format (e.g., vitamin_a -> vitaminA)
            const camelCaseKey = key.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
            if (micros[camelCaseKey] !== undefined) return micros[camelCaseKey];
            
            // Try common variations
            const variations = [
              key,
              key.toLowerCase(),
              key.replace(/\s+/g, ''),
              key.replace(/\s+/g, '_'),
              key.replace(/\s+/g, '-'),
              underscoreKey,
              camelCaseKey
            ];
            
            for (const variation of variations) {
              if (micros[variation] !== undefined) return micros[variation];
            }
            
            return undefined;
          };

          // Prepare micronutrient update data
          const micronutrientUpdateData: any = {};
          
          // Only update micronutrients that are actually provided in the request
          const micros = micronutrientsData.micronutrients;
          
          console.log('Received micronutrients data:', JSON.stringify(micros, null, 2));
          console.log('Available keys in request:', Object.keys(micros));
          
          const vitaminAValue = getMicroValue(micros, 'vitaminA');
          if (vitaminAValue) {
            micronutrientUpdateData.vitamin_a_mcg = vitaminAValue.amount;
            console.log('Updating Vitamin A:', vitaminAValue);
          } else {
            console.log('Vitamin A not found in request. Available keys:', Object.keys(micros));
          }
          
          if (getMicroValue(micros, 'thiamin')) {
            micronutrientUpdateData.thiamin_mg = getMicroValue(micros, 'thiamin').amount;
            console.log('Updating Thiamin:', getMicroValue(micros, 'thiamin'));
          }
          
          if (getMicroValue(micros, 'riboflavin')) {
            micronutrientUpdateData.riboflavin_mg = getMicroValue(micros, 'riboflavin').amount;
            console.log('Updating Riboflavin:', getMicroValue(micros, 'riboflavin'));
          }
          
          if (getMicroValue(micros, 'niacinEquivalent')) {
            micronutrientUpdateData.niacin_equivalent_mg = getMicroValue(micros, 'niacinEquivalent').amount;
            console.log('Updating Niacin Equivalent:', getMicroValue(micros, 'niacinEquivalent'));
          }
          
          if (getMicroValue(micros, 'pantothenicAcid')) {
            micronutrientUpdateData.pantothenic_acid_mg = getMicroValue(micros, 'pantothenicAcid').amount;
            console.log('Updating Pantothenic Acid:', getMicroValue(micros, 'pantothenicAcid'));
          }
          
          if (getMicroValue(micros, 'vitaminB6')) {
            micronutrientUpdateData.vitamin_b6_mg = getMicroValue(micros, 'vitaminB6').amount;
            console.log('Updating Vitamin B6:', getMicroValue(micros, 'vitaminB6'));
          }
          
          if (getMicroValue(micros, 'biotin')) {
            micronutrientUpdateData.biotin_mcg = getMicroValue(micros, 'biotin').amount;
            console.log('Updating Biotin:', getMicroValue(micros, 'biotin'));
          }
          
          if (getMicroValue(micros, 'vitaminB12')) {
            micronutrientUpdateData.vitamin_b12_mcg = getMicroValue(micros, 'vitaminB12').amount;
            console.log('Updating Vitamin B12:', getMicroValue(micros, 'vitaminB12'));
          }
          
          if (getMicroValue(micros, 'folate')) {
            micronutrientUpdateData.folate_mcg = getMicroValue(micros, 'folate').amount;
            console.log('Updating Folate:', getMicroValue(micros, 'folate'));
          }
          
          if (getMicroValue(micros, 'vitaminC')) {
            micronutrientUpdateData.vitamin_c_mg = getMicroValue(micros, 'vitaminC').amount;
            console.log('Updating Vitamin C:', getMicroValue(micros, 'vitaminC'));
          }
          
          if (getMicroValue(micros, 'vitaminD')) {
            micronutrientUpdateData.vitamin_d_mcg = getMicroValue(micros, 'vitaminD').amount;
            console.log('Updating Vitamin D:', getMicroValue(micros, 'vitaminD'));
          }
          
          if (getMicroValue(micros, 'iron')) {
            micronutrientUpdateData.iron_mg = getMicroValue(micros, 'iron').amount;
            console.log('Updating Iron:', getMicroValue(micros, 'iron'));
          }
          
          if (getMicroValue(micros, 'calcium')) {
            micronutrientUpdateData.calcium_mg = getMicroValue(micros, 'calcium').amount;
            console.log('Updating Calcium:', getMicroValue(micros, 'calcium'));
          }
          
          if (getMicroValue(micros, 'magnesium')) {
            micronutrientUpdateData.magnesium_mg = getMicroValue(micros, 'magnesium').amount;
            console.log('Updating Magnesium:', getMicroValue(micros, 'magnesium'));
          }
          
          if (getMicroValue(micros, 'potassium')) {
            micronutrientUpdateData.potassium_mg = getMicroValue(micros, 'potassium').amount;
            console.log('Updating Potassium:', getMicroValue(micros, 'potassium'));
          }
          
          if (getMicroValue(micros, 'zinc')) {
            micronutrientUpdateData.zinc_mg = getMicroValue(micros, 'zinc').amount;
            console.log('Updating Zinc:', getMicroValue(micros, 'zinc'));
          }
          
          if (getMicroValue(micros, 'copper')) {
            micronutrientUpdateData.copper_mg = getMicroValue(micros, 'copper').amount;
            console.log('Updating Copper:', getMicroValue(micros, 'copper'));
          }
          
          if (getMicroValue(micros, 'iodine')) {
            micronutrientUpdateData.iodine_mcg = getMicroValue(micros, 'iodine').amount;
            console.log('Updating Iodine:', getMicroValue(micros, 'iodine'));
          }
          
          if (getMicroValue(micros, 'selenium')) {
            micronutrientUpdateData.selenium_mcg = getMicroValue(micros, 'selenium').amount;
            console.log('Updating Selenium:', getMicroValue(micros, 'selenium'));
          }
          
          if (getMicroValue(micros, 'phosphorus')) {
            micronutrientUpdateData.phosphorus_mg = getMicroValue(micros, 'phosphorus').amount;
            console.log('Updating Phosphorus:', getMicroValue(micros, 'phosphorus'));
          }
          
          if (getMicroValue(micros, 'chloride')) {
            micronutrientUpdateData.chloride_mg = getMicroValue(micros, 'chloride').amount;
            console.log('Updating Chloride:', getMicroValue(micros, 'chloride'));
          }
          
          if (getMicroValue(micros, 'sodium')) {
            micronutrientUpdateData.sodium_g = getMicroValue(micros, 'sodium').amount;
            console.log('Updating Sodium:', getMicroValue(micros, 'sodium'));
          }

          // If we have micronutrients to update and there's an existing record, update it
          if (Object.keys(micronutrientUpdateData).length > 0 && currentMicroReq) {
            console.log('Updating existing micronutrient record with manual values');
            console.log('Micronutrient update data:', micronutrientUpdateData);
            
            // Convert the update data to the proper format for micronutrient_recommendations
            const updatedRecommendations = {
              ...currentMicroReq.micronutrient_recommendations
            };
            
            // Update only the specific micronutrients provided
            if (micronutrientUpdateData.vitamin_a_mcg !== undefined) {
              updatedRecommendations.vitamin_a_mcg = micronutrientUpdateData.vitamin_a_mcg;
            }
            if (micronutrientUpdateData.thiamin_mg !== undefined) {
              updatedRecommendations.thiamin_mg = micronutrientUpdateData.thiamin_mg;
            }
            if (micronutrientUpdateData.riboflavin_mg !== undefined) {
              updatedRecommendations.riboflavin_mg = micronutrientUpdateData.riboflavin_mg;
            }
            if (micronutrientUpdateData.niacin_equivalent_mg !== undefined) {
              updatedRecommendations.niacin_equivalent_mg = micronutrientUpdateData.niacin_equivalent_mg;
            }
            if (micronutrientUpdateData.pantothenic_acid_mg !== undefined) {
              updatedRecommendations.pantothenic_acid_mg = micronutrientUpdateData.pantothenic_acid_mg;
            }
            if (micronutrientUpdateData.vitamin_b6_mg !== undefined) {
              updatedRecommendations.vitamin_b6_mg = micronutrientUpdateData.vitamin_b6_mg;
            }
            if (micronutrientUpdateData.biotin_mcg !== undefined) {
              updatedRecommendations.biotin_mcg = micronutrientUpdateData.biotin_mcg;
            }
            if (micronutrientUpdateData.vitamin_b12_mcg !== undefined) {
              updatedRecommendations.vitamin_b12_mcg = micronutrientUpdateData.vitamin_b12_mcg;
            }
            if (micronutrientUpdateData.folate_mcg !== undefined) {
              updatedRecommendations.folate_mcg = micronutrientUpdateData.folate_mcg;
            }
            if (micronutrientUpdateData.vitamin_c_mg !== undefined) {
              updatedRecommendations.vitamin_c_mg = micronutrientUpdateData.vitamin_c_mg;
            }
            if (micronutrientUpdateData.vitamin_d_mcg !== undefined) {
              updatedRecommendations.vitamin_d_mcg = micronutrientUpdateData.vitamin_d_mcg;
            }
            if (micronutrientUpdateData.iron_mg !== undefined) {
              updatedRecommendations.iron_mg = micronutrientUpdateData.iron_mg;
            }
            if (micronutrientUpdateData.calcium_mg !== undefined) {
              updatedRecommendations.calcium_mg = micronutrientUpdateData.calcium_mg;
            }
            if (micronutrientUpdateData.magnesium_mg !== undefined) {
              updatedRecommendations.magnesium_mg = micronutrientUpdateData.magnesium_mg;
            }
            if (micronutrientUpdateData.potassium_mg !== undefined) {
              updatedRecommendations.potassium_mg = micronutrientUpdateData.potassium_mg;
            }
            if (micronutrientUpdateData.zinc_mg !== undefined) {
              updatedRecommendations.zinc_mg = micronutrientUpdateData.zinc_mg;
            }
            if (micronutrientUpdateData.copper_mg !== undefined) {
              updatedRecommendations.copper_mg = micronutrientUpdateData.copper_mg;
            }
            if (micronutrientUpdateData.iodine_mcg !== undefined) {
              updatedRecommendations.iodine_mcg = micronutrientUpdateData.iodine_mcg;
            }
            if (micronutrientUpdateData.selenium_mcg !== undefined) {
              updatedRecommendations.selenium_mcg = micronutrientUpdateData.selenium_mcg;
            }
            if (micronutrientUpdateData.phosphorus_mg !== undefined) {
              updatedRecommendations.phosphorus_mg = micronutrientUpdateData.phosphorus_mg;
            }
            if (micronutrientUpdateData.chloride_mg !== undefined) {
              updatedRecommendations.chloride_mg = micronutrientUpdateData.chloride_mg;
            }
            if (micronutrientUpdateData.sodium_g !== undefined) {
              updatedRecommendations.sodium_g = micronutrientUpdateData.sodium_g;
            }
            
            console.log('Updated micronutrient recommendations:', updatedRecommendations);
            
            // Update the existing record with new micronutrient values
            const { error: microUpdateError } = await supabase
              .from('client_micronutrient_requirements_flexible')
              .update({
                micronutrient_recommendations: updatedRecommendations,
                updated_at: new Date().toISOString(),
                calculation_method: 'manual',
                is_edited_by_nutritionist: true
              })
              .eq('id', currentMicroReq.id);

            if (microUpdateError) {
              console.error('Update micronutrient error:', microUpdateError);
              return res.status(500).json({
                error: 'Failed to update micronutrients',
                message: 'An error occurred while updating micronutrient information'
              });
            }
            
            console.log('Successfully updated micronutrient record');
          } else if (Object.keys(micronutrientUpdateData).length > 0) {
            // If no existing record, create a new one with the provided micronutrients
            console.log('Creating new micronutrient record with manual values');
            
            // Create a proper micronutrient recommendations structure with only provided values
            const micronutrientRecommendations: any = {};
            
            if (micronutrientUpdateData.vitamin_a_mcg !== undefined) {
              micronutrientRecommendations.vitamin_a_mcg = micronutrientUpdateData.vitamin_a_mcg;
            }
            if (micronutrientUpdateData.thiamin_mg !== undefined) {
              micronutrientRecommendations.thiamin_mg = micronutrientUpdateData.thiamin_mg;
            }
            if (micronutrientUpdateData.riboflavin_mg !== undefined) {
              micronutrientRecommendations.riboflavin_mg = micronutrientUpdateData.riboflavin_mg;
            }
            if (micronutrientUpdateData.niacin_equivalent_mg !== undefined) {
              micronutrientRecommendations.niacin_equivalent_mg = micronutrientUpdateData.niacin_equivalent_mg;
            }
            if (micronutrientUpdateData.pantothenic_acid_mg !== undefined) {
              micronutrientRecommendations.pantothenic_acid_mg = micronutrientUpdateData.pantothenic_acid_mg;
            }
            if (micronutrientUpdateData.vitamin_b6_mg !== undefined) {
              micronutrientRecommendations.vitamin_b6_mg = micronutrientUpdateData.vitamin_b6_mg;
            }
            if (micronutrientUpdateData.biotin_mcg !== undefined) {
              micronutrientRecommendations.biotin_mcg = micronutrientUpdateData.biotin_mcg;
            }
            if (micronutrientUpdateData.vitamin_b12_mcg !== undefined) {
              micronutrientRecommendations.vitamin_b12_mcg = micronutrientUpdateData.vitamin_b12_mcg;
            }
            if (micronutrientUpdateData.folate_mcg !== undefined) {
              micronutrientRecommendations.folate_mcg = micronutrientUpdateData.folate_mcg;
            }
            if (micronutrientUpdateData.vitamin_c_mg !== undefined) {
              micronutrientRecommendations.vitamin_c_mg = micronutrientUpdateData.vitamin_c_mg;
            }
            if (micronutrientUpdateData.vitamin_d_mcg !== undefined) {
              micronutrientRecommendations.vitamin_d_mcg = micronutrientUpdateData.vitamin_d_mcg;
            }
            if (micronutrientUpdateData.iron_mg !== undefined) {
              micronutrientRecommendations.iron_mg = micronutrientUpdateData.iron_mg;
            }
            if (micronutrientUpdateData.calcium_mg !== undefined) {
              micronutrientRecommendations.calcium_mg = micronutrientUpdateData.calcium_mg;
            }
            if (micronutrientUpdateData.magnesium_mg !== undefined) {
              micronutrientRecommendations.magnesium_mg = micronutrientUpdateData.magnesium_mg;
            }
            if (micronutrientUpdateData.potassium_mg !== undefined) {
              micronutrientRecommendations.potassium_mg = micronutrientUpdateData.potassium_mg;
            }
            if (micronutrientUpdateData.zinc_mg !== undefined) {
              micronutrientRecommendations.zinc_mg = micronutrientUpdateData.zinc_mg;
            }
            if (micronutrientUpdateData.copper_mg !== undefined) {
              micronutrientRecommendations.copper_mg = micronutrientUpdateData.copper_mg;
            }
            if (micronutrientUpdateData.iodine_mcg !== undefined) {
              micronutrientRecommendations.iodine_mcg = micronutrientUpdateData.iodine_mcg;
            }
            if (micronutrientUpdateData.selenium_mcg !== undefined) {
              micronutrientRecommendations.selenium_mcg = micronutrientUpdateData.selenium_mcg;
            }
            if (micronutrientUpdateData.phosphorus_mg !== undefined) {
              micronutrientRecommendations.phosphorus_mg = micronutrientUpdateData.phosphorus_mg;
            }
            if (micronutrientUpdateData.chloride_mg !== undefined) {
              micronutrientRecommendations.chloride_mg = micronutrientUpdateData.chloride_mg;
            }
            if (micronutrientUpdateData.sodium_g !== undefined) {
              micronutrientRecommendations.sodium_g = micronutrientUpdateData.sodium_g;
            }
            
            console.log('New micronutrient recommendations:', micronutrientRecommendations);
            
            const { error: microInsertError } = await supabase
              .from('client_micronutrient_requirements_flexible')
              .insert({
                client_id: id,
                micronutrient_recommendations: micronutrientRecommendations,
                country_guideline: 'manual',
                guideline_type: 'manual',
                calculation_method: 'manual',
                is_ai_generated: false,
                is_professionally_reviewed: false,
                nutritionist_notes: null,
                custom_adjustments: null,
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (microInsertError) {
              console.error('Insert micronutrient error:', microInsertError);
              return res.status(500).json({
                error: 'Failed to create micronutrients',
                message: 'An error occurred while creating micronutrient information'
              });
            }
            
            console.log('Successfully created new micronutrient record');
          }
        }

        // Micronutrients are not auto-calculated in client updates
        // They can only be manually updated if provided in the request
      }

      // Handle micronutrient data if provided
      if (micronutrientsData && (micronutrientsData.vitamins || micronutrientsData.minerals || micronutrientsData.micronutrients)) {
        // Get current micronutrient requirements to preserve existing values
        const { data: currentMicroReq } = await supabase
          .from('client_micronutrient_requirements_flexible')
          .select('*')
          .eq('client_id', id)
          .eq('is_active', true)
          .single();

        // Prepare micronutrient data, preserving existing values for fields not provided
        const vitamins = micronutrientsData.vitamins || {};
        const minerals = micronutrientsData.minerals || {};
        const micronutrients = micronutrientsData.micronutrients || {}; // Fallback for old format
        
        // Get existing micronutrients data or start with empty object
        let existingMicronutrients: Record<string, any> = {};
        if (currentMicroReq?.micronutrient_recommendations) {
          try {
            existingMicronutrients = typeof currentMicroReq.micronutrient_recommendations === 'string' 
              ? JSON.parse(currentMicroReq.micronutrient_recommendations) 
              : currentMicroReq.micronutrient_recommendations;
          } catch (e) {
            console.log('Error parsing existing micronutrients, starting fresh');
            existingMicronutrients = {};
          }
        }

        // Update only the micronutrients that are provided in the request
        const updatedMicronutrients: Record<string, any> = { ...existingMicronutrients };
        
        // Process vitamins category
        console.log('Processing vitamins category:', vitamins);
        
        // Process any vitamin fields dynamically
        Object.entries(vitamins).forEach(([vitaminName, vitaminData]) => {
          if (vitaminData && typeof vitaminData === 'object') {
            // Map frontend vitamin name to database field name
            const dbFieldName = vitaminName.replace(/([A-Z])/g, '_$1').toLowerCase();
            
            // Get existing micronutrient data or create empty object
            if (!updatedMicronutrients[dbFieldName]) {
              updatedMicronutrients[dbFieldName] = {};
            }
            
            // Update any fields provided in the vitamin data
            Object.entries(vitaminData).forEach(([fieldName, fieldValue]) => {
              if (fieldValue !== undefined) {
                updatedMicronutrients[dbFieldName][fieldName] = fieldValue;
                console.log(`Updating ${dbFieldName}.${fieldName}:`, fieldValue);
              }
            });
          }
        });
        
        // Process minerals category
        console.log('Processing minerals category:', minerals);
        
        // Process any mineral fields dynamically
        Object.entries(minerals).forEach(([mineralName, mineralData]) => {
          if (mineralData && typeof mineralData === 'object') {
            // Map frontend mineral name to database field name
            const dbFieldName = mineralName.replace(/([A-Z])/g, '_$1').toLowerCase();
            
            // Get existing micronutrient data or create empty object
            if (!updatedMicronutrients[dbFieldName]) {
              updatedMicronutrients[dbFieldName] = {};
            }
            
            // Update any fields provided in the mineral data
            Object.entries(mineralData).forEach(([fieldName, fieldValue]) => {
              if (fieldValue !== undefined) {
                updatedMicronutrients[dbFieldName][fieldName] = fieldValue;
                console.log(`Updating ${dbFieldName}.${fieldName}:`, fieldValue);
              }
            });
          }
        });

        // Fallback: Process old format for backward compatibility
        console.log('Processing old micronutrients format (fallback):', micronutrients);
        
        // Process any micronutrient fields dynamically from old format
        Object.entries(micronutrients).forEach(([micronutrientName, micronutrientData]) => {
          if (micronutrientData && typeof micronutrientData === 'object') {
            // Map frontend micronutrient name to database field name
            const dbFieldName = micronutrientName.replace(/([A-Z])/g, '_$1').toLowerCase();
            
            // Get existing micronutrient data or create empty object
            if (!updatedMicronutrients[dbFieldName]) {
              updatedMicronutrients[dbFieldName] = {};
            }
            
            // Update any fields provided in the micronutrient data
            Object.entries(micronutrientData).forEach(([fieldName, fieldValue]) => {
              if (fieldValue !== undefined) {
                updatedMicronutrients[dbFieldName][fieldName] = fieldValue;
                console.log(`Updating ${dbFieldName}.${fieldName} (fallback):`, fieldValue);
              }
            });
          }
        });

        const micronutrientUpdateData: any = {
          client_id: id,
          micronutrient_recommendations: updatedMicronutrients,
          updated_at: new Date().toISOString()
        };

        console.log('Final micronutrient update data:', micronutrientUpdateData);
        console.log('Updated micronutrients structure:', updatedMicronutrients);

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
            micronutrient_recommendations: updatedMicronutrients,
            country_guideline: micronutrientsData.guidelineUsed || 'UK',
            guideline_type: 'manual',
            calculation_method: 'manual',
            calculation_factors: JSON.stringify({
              lactation: false,
              pregnancy: false,
              activityLevel: 'moderately_active'
            }),
            is_ai_generated: false,
            is_professionally_reviewed: false,
            nutritionist_notes: null,
            custom_adjustments: null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
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

      // Fetch client goal data
      const { data: clientGoalData } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .single();

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
        formulaUsed: nutritionReq?.formula_used || null,
        formulaId: nutritionReq?.formula_id || null,

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
        micronutrients: micronutrientReq ? categorizeMicronutrients(micronutrientReq?.micronutrient_recommendations || {}, true) : {
          vitamins: {},
          minerals: {},
          miscellaneous: {}
        },
        guidelineUsed: micronutrientReq?.country_guideline || null,
        micronutrientNotes: micronutrientReq?.nutritionist_notes || null,
        micronutrientGuidelineType: micronutrientReq?.guideline_type || null,
        micronutrientCalculationFactors: micronutrientReq?.calculation_factors || null,
        
        // AI calculation metadata
        calculationMethod: nutritionReq?.calculation_method || null,
        clientNutritionRequirements: nutritionRequirements,
        clientMicronutrientRequirements: micronutrientRequirements,
        clientGoal: clientGoalData ?? null,
        eerGuideline: eer_guideline,
        healthMetrics: calculateHealthMetrics(updatedClient.height_cm, updatedClient.weight_kg),
        categorizedMicronutrients: categorizeMicronutrients(micronutrientReq?.micronutrient_recommendations || {}, true)
      };

      // Remove nested arrays
      delete response.nutrition_requirements;
      delete response.micronutrient_requirements;

      // Transform response to camelCase using general conversion
      const transformedResponse = objectToCamelCase(response);

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

// Helper function to calculate age from date of birth
function calculateAge(dateOfBirth: string): number {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

export default requireAuth(handler);