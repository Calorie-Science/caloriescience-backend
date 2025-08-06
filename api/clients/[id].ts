import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { validateBody, clientSchema } from '../../lib/validation';

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
      const { data: client, error } = await supabase
        .from('clients')
        .select(`
          *,
          nutrition_requirements:client_nutrition_requirements!inner(
            id,
            eer_calories,
            protein_grams,
            carbs_grams,
            fat_grams,
            fiber_grams,
            protein_percentage,
            carbs_percentage,
            fat_percentage,
            protein_min_grams,
            protein_max_grams,
            protein_note,
            carbs_min_grams,
            carbs_max_grams,
            carbs_note,
            fat_min_grams,
            fat_max_grams,
            fat_note,
            fiber_min_grams,
            fiber_max_grams,
            fiber_note,
            saturated_fat_min_grams,
            saturated_fat_max_grams,
            saturated_fat_note,
            monounsaturated_fat_min_grams,
            monounsaturated_fat_max_grams,
            monounsaturated_fat_note,
            polyunsaturated_fat_min_grams,
            polyunsaturated_fat_max_grams,
            polyunsaturated_fat_note,
            omega3_min_grams,
            omega3_max_grams,
            omega3_note,
            cholesterol_min_grams,
            cholesterol_max_grams,
            cholesterol_note,
            ai_calculation_data,
            calculation_method,
            is_ai_generated,
            nutritionist_notes,
            created_at,
            updated_at,
            is_active
          )
        `)
        .eq('id', id)
        .eq('nutritionist_id', req.user.id)
        .eq('client_nutrition_requirements.is_active', true)
        .single();

      if (error || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The requested client does not exist or you do not have access to it'
        });
      }

      // Format response to include EER and Macros data at top level
      const nutritionReq = client.nutrition_requirements?.[0];
      const response = {
        ...client,
        // EER data
        eer_calories: nutritionReq?.eer_calories || null,
        nutritionist_notes: nutritionReq?.nutritionist_notes || null,
        eer_last_updated: nutritionReq?.updated_at || null,
        
        // Target Macros data (calculated values)
        protein_grams: nutritionReq?.protein_grams || null,
        carbs_grams: nutritionReq?.carbs_grams || null,
        fat_grams: nutritionReq?.fat_grams || null,
        fiber_grams: nutritionReq?.fiber_grams || null,
        protein_percentage: nutritionReq?.protein_percentage || null,
        carbs_percentage: nutritionReq?.carbs_percentage || null,
        fat_percentage: nutritionReq?.fat_percentage || null,
        
        // Macros Ranges (from AI recommendations)
        macros_ranges: {
          protein: {
            min_grams: nutritionReq?.protein_min_grams || null,
            max_grams: nutritionReq?.protein_max_grams || null,
            note: nutritionReq?.protein_note || null
          },
          carbohydrates: {
            min_grams: nutritionReq?.carbs_min_grams || null,
            max_grams: nutritionReq?.carbs_max_grams || null,
            note: nutritionReq?.carbs_note || null
          },
          total_fat: {
            min_grams: nutritionReq?.fat_min_grams || null,
            max_grams: nutritionReq?.fat_max_grams || null,
            note: nutritionReq?.fat_note || null
          },
          fiber: {
            min_grams: nutritionReq?.fiber_min_grams || null,
            max_grams: nutritionReq?.fiber_max_grams || null,
            note: nutritionReq?.fiber_note || null
          },
          saturated_fat: {
            min_grams: nutritionReq?.saturated_fat_min_grams || null,
            max_grams: nutritionReq?.saturated_fat_max_grams || null,
            note: nutritionReq?.saturated_fat_note || null
          },
          monounsaturated_fat: {
            min_grams: nutritionReq?.monounsaturated_fat_min_grams || null,
            max_grams: nutritionReq?.monounsaturated_fat_max_grams || null,
            note: nutritionReq?.monounsaturated_fat_note || null
          },
          polyunsaturated_fat: {
            min_grams: nutritionReq?.polyunsaturated_fat_min_grams || null,
            max_grams: nutritionReq?.polyunsaturated_fat_max_grams || null,
            note: nutritionReq?.polyunsaturated_fat_note || null
          },
          omega3_fatty_acids: {
            min_grams: nutritionReq?.omega3_min_grams || null,
            max_grams: nutritionReq?.omega3_max_grams || null,
            note: nutritionReq?.omega3_note || null
          },
          cholesterol: {
            min_grams: nutritionReq?.cholesterol_min_grams || null,
            max_grams: nutritionReq?.cholesterol_max_grams || null,
            note: nutritionReq?.cholesterol_note || null
          }
        },
        
        // AI calculation metadata
        calculation_method: nutritionReq?.calculation_method || null,
        is_ai_generated: nutritionReq?.is_ai_generated || false,
        original_ai_calculation: nutritionReq?.ai_calculation_data || null
      };

      // Remove the nested nutrition_requirements array
      delete response.nutrition_requirements;

      res.status(200).json({ client: response });
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
      const { 
        eer_calories, 
        nutritionist_notes, 
        original_ai_calculation,
        macros_data, // New field for macros from macros-calculate API
        protein_grams,
        carbs_grams,
        fat_grams,
        fiber_grams,
        ...clientData 
      } = req.body;

      // Update client data if provided
      if (Object.keys(clientData).length > 0) {
        const validation = validateBody(clientSchema, clientData);
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
          throw error;
        }
      }

      // Handle EER and Macros data if provided
      if (eer_calories !== undefined || macros_data !== undefined) {
        // Validate EER data if provided
        if (eer_calories !== undefined && (eer_calories < 500 || eer_calories > 8000)) {
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
          eer_calories: eer_calories || 2000, // Default if not provided
          nutritionist_notes: nutritionist_notes || null,
          ai_calculation_data: original_ai_calculation || macros_data || null,
          calculation_method: macros_data ? 'ai_macros_assistant' : 'nutritionist_approved',
          is_ai_generated: !!macros_data,
          is_edited_by_nutritionist: !macros_data,
          is_active: true,
          approved_at: new Date().toISOString(),
          approved_by: req.user.id
        };

        // If macros_data is provided (from macros-calculate API), extract and calculate macros
        if (macros_data && macros_data.macros) {
          const macros = macros_data.macros;
          const eerValue = eer_calories || macros_data.input?.eer || 2000;

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
            protein_grams: protein_grams || 0,
            carbs_grams: carbs_grams || 0,
            fat_grams: fat_grams || 0,
            fiber_grams: fiber_grams || 0,
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
          return res.status(500).json({
            error: 'Failed to save nutrition data',
            message: 'An error occurred while saving nutrition information'
          });
        }
      }

      // Get updated client data
      const { data: updatedClient, error: fetchError } = await supabase
        .from('clients')
        .select(`
          *,
          nutrition_requirements:client_nutrition_requirements!inner(
            eer_calories,
            protein_grams,
            carbs_grams,
            fat_grams,
            fiber_grams,
            protein_percentage,
            carbs_percentage,
            fat_percentage,
            protein_min_grams,
            protein_max_grams,
            protein_note,
            carbs_min_grams,
            carbs_max_grams,
            carbs_note,
            fat_min_grams,
            fat_max_grams,
            fat_note,
            fiber_min_grams,
            fiber_max_grams,
            fiber_note,
            saturated_fat_min_grams,
            saturated_fat_max_grams,
            saturated_fat_note,
            monounsaturated_fat_min_grams,
            monounsaturated_fat_max_grams,
            monounsaturated_fat_note,
            polyunsaturated_fat_min_grams,
            polyunsaturated_fat_max_grams,
            polyunsaturated_fat_note,
            omega3_min_grams,
            omega3_max_grams,
            omega3_note,
            cholesterol_min_grams,
            cholesterol_max_grams,
            cholesterol_note,
            calculation_method,
            is_ai_generated,
            nutritionist_notes,
            updated_at
          )
        `)
        .eq('id', id)
        .eq('nutritionist_id', req.user.id)
        .eq('client_nutrition_requirements.is_active', true)
        .single();

      if (fetchError) {
        console.error('Fetch updated client error:', fetchError);
        // Still return success even if we can't fetch updated data
        return res.status(200).json({
          message: 'Client updated successfully'
        });
      }

      const updatedNutritionReq = updatedClient.nutrition_requirements?.[0];
      res.status(200).json({
        message: 'Client updated successfully',
        client: {
          ...updatedClient,
          // EER data
          eer_calories: updatedNutritionReq?.eer_calories || null,
          nutritionist_notes: updatedNutritionReq?.nutritionist_notes || null,
          eer_last_updated: updatedNutritionReq?.updated_at || null,
          
          // Target Macros data
          protein_grams: updatedNutritionReq?.protein_grams || null,
          carbs_grams: updatedNutritionReq?.carbs_grams || null,
          fat_grams: updatedNutritionReq?.fat_grams || null,
          fiber_grams: updatedNutritionReq?.fiber_grams || null,
          protein_percentage: updatedNutritionReq?.protein_percentage || null,
          carbs_percentage: updatedNutritionReq?.carbs_percentage || null,
          fat_percentage: updatedNutritionReq?.fat_percentage || null,
          
          // Macros Ranges (from AI recommendations)
          macros_ranges: {
            protein: {
              min_grams: updatedNutritionReq?.protein_min_grams || null,
              max_grams: updatedNutritionReq?.protein_max_grams || null,
              note: updatedNutritionReq?.protein_note || null
            },
            carbohydrates: {
              min_grams: updatedNutritionReq?.carbs_min_grams || null,
              max_grams: updatedNutritionReq?.carbs_max_grams || null,
              note: updatedNutritionReq?.carbs_note || null
            },
            total_fat: {
              min_grams: updatedNutritionReq?.fat_min_grams || null,
              max_grams: updatedNutritionReq?.fat_max_grams || null,
              note: updatedNutritionReq?.fat_note || null
            },
            fiber: {
              min_grams: updatedNutritionReq?.fiber_min_grams || null,
              max_grams: updatedNutritionReq?.fiber_max_grams || null,
              note: updatedNutritionReq?.fiber_note || null
            },
            saturated_fat: {
              min_grams: updatedNutritionReq?.saturated_fat_min_grams || null,
              max_grams: updatedNutritionReq?.saturated_fat_max_grams || null,
              note: updatedNutritionReq?.saturated_fat_note || null
            },
            monounsaturated_fat: {
              min_grams: updatedNutritionReq?.monounsaturated_fat_min_grams || null,
              max_grams: updatedNutritionReq?.monounsaturated_fat_max_grams || null,
              note: updatedNutritionReq?.monounsaturated_fat_note || null
            },
            polyunsaturated_fat: {
              min_grams: updatedNutritionReq?.polyunsaturated_fat_min_grams || null,
              max_grams: updatedNutritionReq?.polyunsaturated_fat_max_grams || null,
              note: updatedNutritionReq?.polyunsaturated_fat_note || null
            },
            omega3_fatty_acids: {
              min_grams: updatedNutritionReq?.omega3_min_grams || null,
              max_grams: updatedNutritionReq?.omega3_max_grams || null,
              note: updatedNutritionReq?.omega3_note || null
            },
            cholesterol: {
              min_grams: updatedNutritionReq?.cholesterol_min_grams || null,
              max_grams: updatedNutritionReq?.cholesterol_max_grams || null,
              note: updatedNutritionReq?.cholesterol_note || null
            }
          },
          
          // AI calculation metadata
          calculation_method: updatedNutritionReq?.calculation_method || null,
          is_ai_generated: updatedNutritionReq?.is_ai_generated || false
        }
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