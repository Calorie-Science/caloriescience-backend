import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { calculateEER, calculateMacros } from '../../lib/calculations';
import { calculateMicronutrients } from '../../lib/micronutrientCalculations';
import { categorizeMicronutrients } from '../../lib/micronutrientCategorization';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId, weightKg, heightCm, eerCalories } = req.body;

    // Validate required fields
    if (!clientId) {
      return res.status(400).json({
        error: 'Missing required field',
        message: 'clientId is required'
      });
    }

    // Get the client's current data
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .eq('nutritionist_id', req.user.id)
      .single();

    if (clientError || !client) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'The requested client does not exist or you do not have access to it'
      });
    }

    // Prepare calculation inputs
    const calculationInput = {
      country: client.location || 'uk',
      age: calculateAge(client.date_of_birth),
      gender: client.gender,
      height_cm: heightCm || client.height_cm,
      weight_kg: weightKg || client.weight_kg,
      activity_level: client.activity_level,
      pregnancy_status: client.pregnancy_status,
      lactation_status: client.lactation_status
    };

    // Calculate new values based on what changed
    const results: any = {};

    // If weight or height changed, recalculate EER
    if (weightKg !== undefined || heightCm !== undefined) {
      try {
        const eerResult = await calculateEER(calculationInput);
        results.eer = {
          calories: eerResult.eer,
          bmr: eerResult.bmr,
          pal: eerResult.pal,
          formula_used: eerResult.formula_used,
          guideline_country: eerResult.guideline_country
        };

        // If EER changed, recalculate macros
        if (eerResult.eer !== client.eer_calories) {
          try {
            const macrosResult = await calculateMacros({
              eer: eerResult.eer,
              country: calculationInput.country,
              age: calculationInput.age,
              gender: calculationInput.gender,
              weight_kg: calculationInput.weight_kg
            });

            results.macros = {
              ranges: {
                protein: {
                  min: macrosResult.Protein.min,
                  max: macrosResult.Protein.max,
                  unit: macrosResult.Protein.unit,
                  note: macrosResult.Protein.note
                },
                carbs: {
                  min: macrosResult.Carbohydrates.min,
                  max: macrosResult.Carbohydrates.max,
                  unit: macrosResult.Carbohydrates.unit,
                  note: macrosResult.Carbohydrates.note
                },
                fat: {
                  min: macrosResult['Total Fat'].min,
                  max: macrosResult['Total Fat'].max,
                  unit: macrosResult['Total Fat'].unit,
                  note: macrosResult['Total Fat'].note
                },
                fiber: {
                  min: macrosResult.Fiber.min,
                  max: macrosResult.Fiber.max,
                  unit: macrosResult.Fiber.unit,
                  note: macrosResult.Fiber.note
                },
                saturatedFat: {
                  min: macrosResult['Saturated Fat'].min,
                  max: macrosResult['Saturated Fat'].max,
                  unit: macrosResult['Saturated Fat'].unit,
                  note: macrosResult['Saturated Fat'].note
                },
                monounsaturatedFat: {
                  min: macrosResult['Monounsaturated Fat'].min,
                  max: macrosResult['Monounsaturated Fat'].max,
                  unit: macrosResult['Monounsaturated Fat'].unit,
                  note: macrosResult['Monounsaturated Fat'].note
                },
                polyunsaturatedFat: {
                  min: macrosResult['Polyunsaturated Fat'].min,
                  max: macrosResult['Polyunsaturated Fat'].max,
                  unit: macrosResult['Polyunsaturated Fat'].unit,
                  note: macrosResult['Polyunsaturated Fat'].note
                },
                omega3: {
                  min: macrosResult['Omega-3 Fatty Acids'].min,
                  max: macrosResult['Omega-3 Fatty Acids'].max,
                  unit: macrosResult['Omega-3 Fatty Acids'].unit,
                  note: macrosResult['Omega-3 Fatty Acids'].note
                },
                cholesterol: {
                  min: macrosResult.Cholesterol.min,
                  max: macrosResult.Cholesterol.max,
                  unit: macrosResult.Cholesterol.unit,
                  note: macrosResult.Cholesterol.note
                }
              },
              guideline_country: macrosResult.guideline_country,
              guideline_notes: macrosResult.guideline_notes
            };
          } catch (macrosError) {
            console.error('Error calculating macros:', macrosError);
            results.macros_error = 'Failed to calculate macros';
          }
        }

        // If weight changed, recalculate micronutrients
        if (weightKg !== undefined && weightKg !== client.weight_kg) {
          try {
            const microResult = await calculateMicronutrients({
              location: client.location || 'UK',
              age: calculationInput.age,
              gender: client.gender
            });

            results.micronutrients = categorizeMicronutrients(microResult.micronutrients);
            results.micronutrient_guideline = {
              guideline_used: microResult.guideline_used,
              source: microResult.source,
              notes: microResult.notes,
              age_group: microResult.age_group
            };
          } catch (microError) {
            console.error('Error calculating micronutrients:', microError);
            results.micronutrients_error = 'Failed to calculate micronutrients';
          }
        }
      } catch (eerError) {
        console.error('Error calculating EER:', eerError);
        results.eer_error = 'Failed to calculate EER';
      }
    }

    // If only EER calories changed manually (not through weight/height change)
    if (eerCalories !== undefined && weightKg === undefined && heightCm === undefined) {
      try {
        const macrosResult = await calculateMacros({
          eer: eerCalories,
          country: calculationInput.country,
          age: calculationInput.age,
          gender: calculationInput.gender,
          weight_kg: calculationInput.weight_kg
        });

        results.macros = {
          ranges: {
            protein: {
              min: macrosResult.Protein.min,
              max: macrosResult.Protein.max,
              unit: macrosResult.Protein.unit,
              note: macrosResult.Protein.note
            },
            carbs: {
              min: macrosResult.Carbohydrates.min,
              max: macrosResult.Carbohydrates.max,
              unit: macrosResult.Carbohydrates.unit,
              note: macrosResult.Carbohydrates.note
            },
            fat: {
              min: macrosResult['Total Fat'].min,
              max: macrosResult['Total Fat'].max,
              unit: macrosResult['Total Fat'].unit,
              note: macrosResult['Total Fat'].note
            },
            fiber: {
              min: macrosResult.Fiber.min,
              max: macrosResult.Fiber.max,
              unit: macrosResult.Fiber.unit,
              note: macrosResult.Fiber.note
            },
            saturatedFat: {
              min: macrosResult['Saturated Fat'].min,
              max: macrosResult['Saturated Fat'].max,
              unit: macrosResult['Saturated Fat'].unit,
              note: macrosResult['Saturated Fat'].note
            },
            monounsaturatedFat: {
              min: macrosResult['Monounsaturated Fat'].min,
              max: macrosResult['Monounsaturated Fat'].max,
              unit: macrosResult['Monounsaturated Fat'].unit,
              note: macrosResult['Monounsaturated Fat'].note
            },
            polyunsaturatedFat: {
              min: macrosResult['Polyunsaturated Fat'].min,
              max: macrosResult['Polyunsaturated Fat'].max,
              unit: macrosResult['Polyunsaturated Fat'].unit,
              note: macrosResult['Polyunsaturated Fat'].note
            },
            omega3: {
              min: macrosResult['Omega-3 Fatty Acids'].min,
              max: macrosResult['Omega-3 Fatty Acids'].max,
              unit: macrosResult['Omega-3 Fatty Acids'].unit,
              note: macrosResult['Omega-3 Fatty Acids'].note
            },
            cholesterol: {
              min: macrosResult.Cholesterol.min,
              max: macrosResult.Cholesterol.max,
              unit: macrosResult.Cholesterol.unit,
              note: macrosResult.Cholesterol.note
            }
          },
          guideline_country: macrosResult.guideline_country,
          guideline_notes: macrosResult.guideline_notes
        };
      } catch (macrosError) {
        console.error('Error calculating macros:', macrosError);
        results.macros_error = 'Failed to calculate macros';
      }
    }

    // Add summary of what was recalculated
    results.summary = {
      weight_changed: weightKg !== undefined && weightKg !== client.weight_kg,
      height_changed: heightCm !== undefined && heightCm !== client.height_cm,
      eer_changed: eerCalories !== undefined && eerCalories !== client.eer_calories,
      original_weight: client.weight_kg,
      original_height: client.height_cm,
      original_eer: client.eer_calories
    };

    res.status(200).json({
      message: 'Recalculation completed successfully',
      client_id: clientId,
      recalculated_values: results
    });

  } catch (error) {
    console.error('Recalculation error:', error);
    res.status(500).json({
      error: 'Failed to recalculate values',
      message: 'An error occurred during recalculation'
    });
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
