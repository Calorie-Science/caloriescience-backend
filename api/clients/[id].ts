import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { validateAndTransformClient } from '../../lib/validation';
import { transformWithMapping, FIELD_MAPPINGS } from '../../lib/caseTransform';
import { calculateHealthMetrics } from '../../lib/healthMetrics';

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
            minGrams: nutritionReq.protein_min_grams,
            maxGrams: nutritionReq.protein_max_grams,
            note: nutritionReq.protein_note
          },
          carbs: {
            minGrams: nutritionReq.carbs_min_grams,
            maxGrams: nutritionReq.carbs_max_grams,
            note: nutritionReq.carbs_note
          },
          fat: {
            minGrams: nutritionReq.fat_min_grams,
            maxGrams: nutritionReq.fat_max_grams,
            note: nutritionReq.fat_note
          },
          fiber: {
            minGrams: nutritionReq.fiber_min_grams,
            maxGrams: nutritionReq.fiber_max_grams,
            note: nutritionReq.fiber_note
          },
          saturatedFat: {
            minGrams: nutritionReq.saturated_fat_min_grams,
            maxGrams: nutritionReq.saturated_fat_max_grams,
            note: nutritionReq.saturated_fat_note
          },
          monounsaturatedFat: {
            minGrams: nutritionReq.monounsaturated_fat_min_grams,
            maxGrams: nutritionReq.monounsaturated_fat_max_grams,
            note: nutritionReq.monounsaturated_fat_note
          },
          polyunsaturatedFat: {
            minGrams: nutritionReq.polyunsaturated_fat_min_grams,
            maxGrams: nutritionReq.polyunsaturated_fat_max_grams,
            note: nutritionReq.polyunsaturated_fat_note
          },
          omega3: {
            minGrams: nutritionReq.omega3_min_grams,
            maxGrams: nutritionReq.omega3_max_grams,
            note: nutritionReq.omega3_note
          },
          cholesterol: {
            minGrams: nutritionReq.cholesterol_min_grams,
            maxGrams: nutritionReq.cholesterol_max_grams,
            note: nutritionReq.cholesterol_note
          }
        } : null,
        
        // Micronutrient data
        micronutrients: micronutrientReq ? micronutrientReq.micronutrient_recommendations : {},
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

        // Deactivate existing nutrition requirements
        await supabase
          .from('client_nutrition_requirements')
          .update({ is_active: false })
          .eq('client_id', id);

        // Prepare nutrition data for insertion
        let nutritionData: any = {
          client_id: id,
          eer_calories: eerCalories || 2000, // Default if not provided
          nutritionist_notes: nutritionistNotes || null,
          calculation_method: macrosData ? 'ai_macros_assistant' : 'nutritionist_approved',
          is_edited_by_nutritionist: !macrosData,
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: req.user.id
        };

        // If macros_data is provided (from macros-calculate API), extract and calculate macros
        if (macrosData) {
          const macros = macrosData; // Changed: Use macrosData directly instead of macrosData.macros
          const eerValue = eerCalories || 2000; // Simplified: removed macrosData.input?.eer fallback

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

          // Extract macro values and ranges
          const proteinGrams = macros.Protein ? calculateAverage(macros.Protein.min_grams, macros.Protein.max_grams) : 0;
          const carbsGrams = macros.Carbohydrates ? calculateAverage(macros.Carbohydrates.min_grams, macros.Carbohydrates.max_grams) : 0;
          const fatGrams = macros['Total Fat'] ? calculateAverage(macros['Total Fat'].min_grams, macros['Total Fat'].max_grams) : 0;
          const fiberGrams = macros.Fiber ? calculateAverage(macros.Fiber.min_grams, macros.Fiber.max_grams) : 0;

          // Calculate percentages
          const proteinPercentage = eerValue > 0 ? (proteinGrams * 4 / eerValue) * 100 : 0;
          const carbsPercentage = eerValue > 0 ? (carbsGrams * 4 / eerValue) * 100 : 0;
          const fatPercentage = eerValue > 0 ? (fatGrams * 9 / eerValue) * 100 : 0;

          // Add calculated macros to nutrition data with all ranges and notes
          nutritionData = {
            ...nutritionData,
            // Target values (calculated averages or specific values)
            protein_grams: Math.round(proteinGrams * 100) / 100,
            carbs_grams: Math.round(carbsGrams * 100) / 100,
            fat_grams: Math.round(fatGrams * 100) / 100,
            fiber_grams: Math.round(fiberGrams * 100) / 100,
            protein_percentage: Math.round(proteinPercentage * 100) / 100,
            carbs_percentage: Math.round(carbsPercentage * 100) / 100,
            fat_percentage: Math.round(fatPercentage * 100) / 100,

            // Min/Max ranges from AI recommendations
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
            monounsaturated_fat_min_grams: macros['Monounsaturated Fat']?.min_grams || null,
            monounsaturated_fat_max_grams: macros['Monounsaturated Fat']?.max_grams || null,
            monounsaturated_fat_note: macros['Monounsaturated Fat']?.note || null,

            // Polyunsaturated Fat
            polyunsaturated_fat_min_grams: macros['Polyunsaturated Fat']?.min_grams || null,
            polyunsaturated_fat_max_grams: macros['Polyunsaturated Fat']?.max_grams || null,
            polyunsaturated_fat_note: macros['Polyunsaturated Fat']?.note || null,

            // Omega-3 Fatty Acids
            omega3_min_grams: macros['Omega-3 Fatty Acids']?.min_grams || null,
            omega3_max_grams: macros['Omega-3 Fatty Acids']?.max_grams || null,
            omega3_note: macros['Omega-3 Fatty Acids']?.note || null,

            // Cholesterol
            cholesterol_min_grams: macros.Cholesterol?.min_grams || null,
            cholesterol_max_grams: macros.Cholesterol?.max_grams || null,
            cholesterol_note: macros.Cholesterol?.note || null
          };
        } else {
          // Use provided individual macro values or defaults
          nutritionData = {
            ...nutritionData,
            protein_grams: proteinGrams || 0,
            carbs_grams: carbsGrams || 0,
            fat_grams: fatGrams || 0,
            fiber_grams: fiberGrams || 0,
            protein_percentage: 0,
            carbs_percentage: 0,
            fat_percentage: 0
          };
        }

        // Save new nutrition data
        const { error: nutritionError } = await supabase
          .from('client_nutrition_requirements')
          .insert(nutritionData);

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
        // Deactivate any existing micronutrient records
        await supabase
          .from('client_micronutrient_requirements')
          .update({ is_active: false })
          .eq('client_id', id);

        // Prepare micronutrient data for insertion
        const micronutrients = micronutrientsData.micronutrients;
        const micronutrientInsertData = {
          client_id: id,
          vitamin_a_mcg: micronutrients.vitaminA?.amount || null,
          thiamin_mg: micronutrients.thiamin?.amount || null,
          riboflavin_mg: micronutrients.riboflavin?.amount || null,
          niacin_equivalent_mg: micronutrients.niacinEquivalent?.amount || null,
          pantothenic_acid_mg: micronutrients.pantothenicAcid?.amount || null,
          vitamin_b6_mg: micronutrients.vitaminB6?.amount || null,
          biotin_mcg: micronutrients.biotin?.amount || null,
          vitamin_b12_mcg: micronutrients.vitaminB12?.amount || null,
          folate_mcg: micronutrients.folate?.amount || null,
          vitamin_c_mg: micronutrients.vitaminC?.amount || null,
          vitamin_d_mcg: micronutrients.vitaminD?.amount || null,
          iron_mg: micronutrients.iron?.amount || null,
          calcium_mg: micronutrients.calcium?.amount || null,
          magnesium_mg: micronutrients.magnesium?.amount || null,
          potassium_mg: micronutrients.potassium?.amount || null,
          zinc_mg: micronutrients.zinc?.amount || null,
          copper_mg: micronutrients.copper?.amount || null,
          iodine_mcg: micronutrients.iodine?.amount || null,
          selenium_mcg: micronutrients.selenium?.amount || null,
          phosphorus_mg: micronutrients.phosphorus?.amount || null,
          chloride_mg: micronutrients.chloride?.amount || null,
          sodium_g: micronutrients.sodium?.amount || null,
          guideline_used: micronutrientsData.guidelineUsed || 'UK',
          calculation_method: 'formula_based',
          is_ai_generated: false,
          nutritionist_notes: nutritionistNotes || null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        // Insert new micronutrient record
        const { error: micronutrientError } = await supabase
          .from('client_micronutrient_requirements')
          .insert(micronutrientInsertData);

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
            minGrams: nutritionReq.protein_min_grams,
            maxGrams: nutritionReq.protein_max_grams,
            note: nutritionReq.protein_note
          },
          carbs: {
            minGrams: nutritionReq.carbs_min_grams,
            maxGrams: nutritionReq.carbs_max_grams,
            note: nutritionReq.carbs_note
          },
          fat: {
            minGrams: nutritionReq.fat_min_grams,
            maxGrams: nutritionReq.fat_max_grams,
            note: nutritionReq.fat_note
          },
          fiber: {
            minGrams: nutritionReq.fiber_min_grams,
            maxGrams: nutritionReq.fiber_max_grams,
            note: nutritionReq.fiber_note
          },
          saturatedFat: {
            minGrams: nutritionReq.saturated_fat_min_grams,
            maxGrams: nutritionReq.saturated_fat_max_grams,
            note: nutritionReq.saturated_fat_note
          },
          monounsaturatedFat: {
            minGrams: nutritionReq.monounsaturated_fat_min_grams,
            maxGrams: nutritionReq.monounsaturated_fat_max_grams,
            note: nutritionReq.monounsaturated_fat_note
          },
          polyunsaturatedFat: {
            minGrams: nutritionReq.polyunsaturated_fat_min_grams,
            maxGrams: nutritionReq.polyunsaturated_fat_max_grams,
            note: nutritionReq.polyunsaturated_fat_note
          },
          omega3: {
            minGrams: nutritionReq.omega3_min_grams,
            maxGrams: nutritionReq.omega3_max_grams,
            note: nutritionReq.omega3_note
          },
          cholesterol: {
            minGrams: nutritionReq.cholesterol_min_grams,
            maxGrams: nutritionReq.cholesterol_max_grams,
            note: nutritionReq.cholesterol_note
          }
        } : null,
        
        // Micronutrient data
        micronutrients: micronutrientReq ? micronutrientReq.micronutrient_recommendations : {},
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