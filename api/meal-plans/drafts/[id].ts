import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { MealPlanDraftService } from '../../../lib/mealPlanDraftService';
import { RecipeCacheService } from '../../../lib/recipeCacheService';
import { RecipeResponseStandardizationService } from '../../../lib/recipeResponseStandardizationService';
import { supabase } from '../../../lib/supabase';

const draftService = new MealPlanDraftService();
const cacheService = new RecipeCacheService();
const standardizationService = new RecipeResponseStandardizationService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access meal plan drafts
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Only nutritionists can access meal plan drafts' 
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'Draft ID is required'
    });
  }

  try {
    // Get the draft
    const draft = await draftService.getDraft(id);
    
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified meal plan draft does not exist'
      });
    }

    // Verify user has access
    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this meal plan draft'
      });
    }

    console.log(`📋 Fetching detailed nutrition for draft: ${id}`);

    // For manual meal plans, enrich searchParams with clientGoals and dietaryPreferences
    if (draft.searchParams && (draft.searchParams as any).creation_method === 'manual') {
      console.log(`🔧 Enriching searchParams for manual meal plan`);
      
      // Fetch client nutrition requirements
      const { data: nutritionReq } = await supabase
        .from('client_nutrition_requirements')
        .select('*')
        .eq('client_id', draft.clientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Fetch client goals (dietary preferences, allergies, and macro goals)
      const { data: clientGoal } = await supabase
        .from('client_goals')
        .select('allergies, preferences, cuisine_types, eer_goal_calories, protein_goal_min, protein_goal_max, carbs_goal_min, carbs_goal_max, fat_goal_min, fat_goal_max, fiber_goal_grams')
        .eq('client_id', draft.clientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      // Always populate clientGoals and dietaryPreferences from database
      draft.searchParams = {
        ...draft.searchParams,
        clientGoals: {
          calories: clientGoal?.eer_goal_calories || nutritionReq?.eer_calories || 0,
          protein: clientGoal?.protein_goal_min || nutritionReq?.protein_grams || 0,
          carbs: clientGoal?.carbs_goal_min || nutritionReq?.carbs_grams || 0,
          fat: clientGoal?.fat_goal_min || nutritionReq?.fat_grams || 0,
          fiber: clientGoal?.fiber_goal_grams || nutritionReq?.fiber_grams || 0
        },
        dietaryPreferences: {
          allergies: clientGoal?.allergies || [],
          cuisineTypes: clientGoal?.cuisine_types || [],
          dietaryPreferences: clientGoal?.preferences || []
        }
      };
      
      console.log(`✅ Enriched searchParams with clientGoals:`, draft.searchParams.clientGoals);
    }

    // Process each day with detailed nutrition
    const detailedSuggestions = await Promise.all(
      (draft.suggestions || []).map(async (day: any) => {
        const detailedMeals: any = {};

        // Process each meal
        await Promise.all(
          Object.entries(day.meals || {}).map(async ([mealName, meal]: [string, any]) => {
            // Find selected recipe in all available recipes (not just current page)
            let selectedRecipe = null;
            if (meal.selectedRecipeId) {
              // First try current page recipes
              selectedRecipe = meal.recipes.find((r: any) => r.id === meal.selectedRecipeId);
              
              // If not found in current page, search in allRecipes (pagination storage)
              if (!selectedRecipe && meal.allRecipes) {
                const allRecipesCombined = [
                  ...(meal.allRecipes.edamam || []),
                  ...(meal.allRecipes.spoonacular || [])
                ];
                selectedRecipe = allRecipesCombined.find((r: any) => r.id === meal.selectedRecipeId);
              }
            }

            if (!selectedRecipe) {
              detailedMeals[mealName] = {
                recipeName: null,
                recipeId: null,
                isSelected: false,
                nutrition: null,
                micronutrients: null
              };
              return;
            }

            // Get customizations for this recipe
            const customizations = meal.customizations?.[selectedRecipe.id];

            // Fetch micronutrient data from cache (the draft has customized ingredients, cache has micronutrients)
            let standardizedRecipe: any = null;

            console.log(`🔍 Fetching micronutrient details for recipe: ${selectedRecipe.id}`);

            try {
              const cachedRecipe = await cacheService.getRecipeById(selectedRecipe.id);
              
              if (cachedRecipe) {
                console.log(`✅ Found in cache: ${selectedRecipe.id}`);
                standardizedRecipe = standardizationService.standardizeDatabaseRecipeResponse(cachedRecipe);
              } else {
                console.log(`⚠️ Recipe not found in cache: ${selectedRecipe.id}`);
              }
            } catch (error) {
              console.error(`❌ Error fetching recipe details for ${selectedRecipe.id}:`, error);
            }

            // Start with nutrition from draft (which may be customized)
            let detailedNutrition: any = {
              macros: {
                calories: 0,
                protein: 0,
                carbs: 0,
                fat: 0,
                fiber: 0,
                sugar: null,
                sodium: null,
                saturatedFat: null,
                cholesterol: null
              },
              micronutrients: null
            };

            // NUTRITION STRATEGY (same as draft.ts and recipes/customized):
            // 1. If customNutrition exists with proper structure (has micros), TRUST IT - it was calculated correctly
            // 2. If customNutrition is old format or missing, use base nutrition from cache
            
            // Check if we have valid stored customNutrition
            const hasValidCustomNutrition = customizations?.customNutrition && 
                                             customizations.customNutrition.calories &&
                                             (customizations.customNutrition.calories.quantity > 0 || customizations.customNutrition.calories > 0);
            
            if (hasValidCustomNutrition && customizations.customNutrition.micros) {
              // Use stored customNutrition with micronutrients (already calculated correctly)
              console.log(`✅ Using STORED customNutrition WITH micronutrients: ${customizations.customNutrition.calories.quantity} kcal`);
              
              detailedNutrition.macros = {
                calories: customizations.customNutrition.calories?.quantity || 0,
                protein: customizations.customNutrition.macros?.protein?.quantity || 0,
                carbs: customizations.customNutrition.macros?.carbs?.quantity || 0,
                fat: customizations.customNutrition.macros?.fat?.quantity || 0,
                fiber: customizations.customNutrition.macros?.fiber?.quantity || 0,
                sugar: customizations.customNutrition.macros?.sugar?.quantity || null,
                sodium: customizations.customNutrition.macros?.sodium?.quantity || null,
                saturatedFat: customizations.customNutrition.macros?.saturatedFat?.quantity || null,
                cholesterol: customizations.customNutrition.macros?.cholesterol?.quantity || null
              };
              
              // Use customized micronutrients (includes changes from added/removed ingredients!)
              detailedNutrition.micronutrients = {
                vitamins: customizations.customNutrition.micros?.vitamins || {},
                minerals: customizations.customNutrition.micros?.minerals || {}
              };
            } else if (hasValidCustomNutrition) {
              // Has customNutrition but no micros (old format)
              console.log(`⚠️ Using stored customNutrition (old format, macros only)`);
              
              detailedNutrition.macros = {
                calories: customizations.customNutrition.calories?.quantity || customizations.customNutrition.calories || 0,
                protein: customizations.customNutrition.macros?.protein?.quantity || customizations.customNutrition.protein || 0,
                carbs: customizations.customNutrition.macros?.carbs?.quantity || customizations.customNutrition.carbs || 0,
                fat: customizations.customNutrition.macros?.fat?.quantity || customizations.customNutrition.fat || 0,
                fiber: customizations.customNutrition.macros?.fiber?.quantity || customizations.customNutrition.fiber || 0,
                sugar: standardizedRecipe?.sugarPerServingG ? parseFloat(standardizedRecipe.sugarPerServingG) : null,
                sodium: standardizedRecipe?.sodiumPerServingMg ? parseFloat(standardizedRecipe.sodiumPerServingMg) : null,
                saturatedFat: standardizedRecipe?.nutritionDetails?.macros?.saturatedFat?.quantity || null,
                cholesterol: standardizedRecipe?.nutritionDetails?.macros?.cholesterol?.quantity || null
              };
              
              // Fallback to base recipe micros if no custom micros
              if (standardizedRecipe?.nutritionDetails?.micros) {
                detailedNutrition.micronutrients = {
                  vitamins: standardizedRecipe.nutritionDetails.micros.vitamins || {},
                  minerals: standardizedRecipe.nutritionDetails.micros.minerals || {}
                };
              }
            } else {
              // Use base nutrition from recipe (no customizations)
              console.log(`📊 Using base nutrition from recipe`);
              
              // Check if cached recipe has 0 values and needs updating
              const cachedHasZeroValues = standardizedRecipe && (
                parseFloat(standardizedRecipe.caloriesPerServing || '0') === 0 ||
                parseFloat(standardizedRecipe.proteinPerServingG || '0') === 0
              );
              
              const draftHasValidNutrition = 
                (selectedRecipe.calories && selectedRecipe.calories > 0) ||
                (selectedRecipe.nutrition?.calories?.quantity && selectedRecipe.nutrition.calories.quantity > 0) ||
                (selectedRecipe.nutrition?.macros?.protein?.quantity && selectedRecipe.nutrition.macros.protein.quantity > 0);
              
              if (cachedHasZeroValues && draftHasValidNutrition && standardizedRecipe.id) {
                console.log(`⚠️ Cached recipe ${standardizedRecipe.id} has 0 values but draft has valid nutrition. Updating cache...`);
                
                // Extract nutrition from draft recipe
                const calories = selectedRecipe.calories || selectedRecipe.nutrition?.calories?.quantity || 0;
                const protein = selectedRecipe.protein || selectedRecipe.nutrition?.macros?.protein?.quantity || 0;
                const carbs = selectedRecipe.carbs || selectedRecipe.nutrition?.macros?.carbs?.quantity || 0;
                const fat = selectedRecipe.fat || selectedRecipe.nutrition?.macros?.fat?.quantity || 0;
                const fiber = selectedRecipe.fiber || selectedRecipe.nutrition?.macros?.fiber?.quantity || 0;
                
                // Update cache with correct values
                try {
                  await cacheService.updateRecipe(standardizedRecipe.id, {
                    caloriesPerServing: calories,
                    proteinPerServingG: protein,
                    carbsPerServingG: carbs,
                    fatPerServingG: fat,
                    fiberPerServingG: fiber
                  } as any);
                  console.log(`✅ Cache updated successfully for recipe ${standardizedRecipe.id}`);
                  
                  // Update standardizedRecipe in memory so we use correct values
                  standardizedRecipe.caloriesPerServing = calories.toString();
                  standardizedRecipe.proteinPerServingG = protein.toString();
                  standardizedRecipe.carbsPerServingG = carbs.toString();
                  standardizedRecipe.fatPerServingG = fat.toString();
                  standardizedRecipe.fiberPerServingG = fiber.toString();
                } catch (error) {
                  console.error(`❌ Failed to update cache for recipe ${standardizedRecipe.id}:`, error);
                }
              }
              
              // Helper function to safely get numeric value
              const getNumericValue = (...values: any[]): number => {
                for (const val of values) {
                  if (val !== null && val !== undefined && val !== '') {
                    const num = typeof val === 'number' ? val : parseFloat(val);
                    // Skip if it's 0 and we have more values to check (cached bad data)
                    if (!isNaN(num) && num > 0) {
                      return num;
                    }
                  }
                }
                // If all values are 0 or invalid, return 0 as last resort
                return 0;
              };
              
              detailedNutrition.macros = {
                calories: getNumericValue(
                  standardizedRecipe?.caloriesPerServing,
                  selectedRecipe.calories,
                  selectedRecipe.nutrition?.calories?.quantity,
                  selectedRecipe.nutrition?.macros?.calories?.quantity
                ),
                protein: getNumericValue(
                  standardizedRecipe?.proteinPerServingG,
                  selectedRecipe.protein,
                  selectedRecipe.nutrition?.macros?.protein?.quantity
                ),
                carbs: getNumericValue(
                  standardizedRecipe?.carbsPerServingG,
                  selectedRecipe.carbs,
                  selectedRecipe.nutrition?.macros?.carbs?.quantity
                ),
                fat: getNumericValue(
                  standardizedRecipe?.fatPerServingG,
                  selectedRecipe.fat,
                  selectedRecipe.nutrition?.macros?.fat?.quantity
                ),
                fiber: getNumericValue(
                  standardizedRecipe?.fiberPerServingG,
                  selectedRecipe.fiber,
                  selectedRecipe.nutrition?.macros?.fiber?.quantity
                ),
                sugar: standardizedRecipe?.sugarPerServingG ? parseFloat(standardizedRecipe.sugarPerServingG) : (selectedRecipe.nutrition?.macros?.sugar?.quantity || null),
                sodium: standardizedRecipe?.sodiumPerServingMg ? parseFloat(standardizedRecipe.sodiumPerServingMg) : (selectedRecipe.nutrition?.macros?.sodium?.quantity || null),
                saturatedFat: standardizedRecipe?.nutritionDetails?.macros?.saturatedFat?.quantity || selectedRecipe.nutrition?.macros?.saturatedFat?.quantity || null,
                cholesterol: standardizedRecipe?.nutritionDetails?.macros?.cholesterol?.quantity || selectedRecipe.nutrition?.macros?.cholesterol?.quantity || null
              };
              
              // Extract micronutrients from cache
              if (standardizedRecipe?.nutritionDetails?.micros) {
                console.log(`📊 Extracting micronutrients from cache`);
                detailedNutrition.micronutrients = {
                  vitamins: standardizedRecipe.nutritionDetails.micros.vitamins || {},
                  minerals: standardizedRecipe.nutritionDetails.micros.minerals || {}
                };
                console.log(`✅ Micronutrients extracted successfully`);
              } else {
                console.log(`⚠️ No micronutrients found in cache for ${selectedRecipe.id}`);
              }
            }

            detailedMeals[mealName] = {
              recipeName: selectedRecipe.title,
              recipeId: selectedRecipe.id,
              recipeImage: selectedRecipe.image,
              recipeSource: selectedRecipe.source,
              servings: selectedRecipe.servings || 1,
              isSelected: true,
              hasCustomizations: !!(customizations?.customizationsApplied),
              customNotes: selectedRecipe.customNotes || null,
              modifications: customizations?.modifications || [],
              // Ingredients from draft (already customized with omissions/additions/replacements)
              ingredients: selectedRecipe.ingredients || [],
              nutrition: detailedNutrition
            };
          })
        );

        // Calculate day totals
        const dayTotals = {
          macros: {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            saturatedFat: 0,
            cholesterol: 0
          },
          micronutrients: {
            vitamins: {} as any,
            minerals: {} as any
          }
        };

        // Sum up nutrition from all meals
        Object.values(detailedMeals).forEach((meal: any) => {
          if (meal.nutrition) {
            // Add macros (handle both number and {quantity, unit} formats)
            Object.keys(dayTotals.macros).forEach(macro => {
              const value = meal.nutrition.macros[macro];
              // Extract numeric value (handle both formats)
              const numericValue = typeof value === 'object' && value?.quantity !== undefined 
                ? value.quantity 
                : (typeof value === 'number' ? value : 0);
              
              dayTotals.macros[macro as keyof typeof dayTotals.macros] += numericValue || 0;
            });

            // Add micronutrients
            if (meal.nutrition.micronutrients) {
              Object.keys(meal.nutrition.micronutrients.vitamins).forEach(vitamin => {
                const vitaminData = meal.nutrition.micronutrients.vitamins[vitamin];
                if (vitaminData && vitaminData.quantity) {
                  if (!dayTotals.micronutrients.vitamins[vitamin]) {
                    dayTotals.micronutrients.vitamins[vitamin] = { quantity: 0, unit: vitaminData.unit };
                  }
                  dayTotals.micronutrients.vitamins[vitamin].quantity += vitaminData.quantity;
                }
              });

              Object.keys(meal.nutrition.micronutrients.minerals).forEach(mineral => {
                const mineralData = meal.nutrition.micronutrients.minerals[mineral];
                if (mineralData && mineralData.quantity) {
                  if (!dayTotals.micronutrients.minerals[mineral]) {
                    dayTotals.micronutrients.minerals[mineral] = { quantity: 0, unit: mineralData.unit };
                  }
                  dayTotals.micronutrients.minerals[mineral].quantity += mineralData.quantity;
                }
              });
            }
          }
        });

        return {
          day: day.day,
          date: day.date,
          meals: detailedMeals,
          dayTotals: dayTotals
        };
      })
    );

    // Calculate overall totals and averages
    const overallTotals = {
      macros: {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
        sugar: 0,
        sodium: 0,
        saturatedFat: 0,
        cholesterol: 0
      },
      micronutrients: {
        vitamins: {} as any,
        minerals: {} as any
      }
    };

    detailedSuggestions.forEach(day => {
      // Add macros
      Object.keys(overallTotals.macros).forEach(macro => {
        overallTotals.macros[macro as keyof typeof overallTotals.macros] += 
          day.dayTotals.macros[macro] || 0;
      });

      // Add micronutrients
      Object.keys(day.dayTotals.micronutrients.vitamins).forEach(vitamin => {
        const vitaminData = day.dayTotals.micronutrients.vitamins[vitamin];
        if (vitaminData && vitaminData.quantity) {
          if (!overallTotals.micronutrients.vitamins[vitamin]) {
            overallTotals.micronutrients.vitamins[vitamin] = { quantity: 0, unit: vitaminData.unit };
          }
          overallTotals.micronutrients.vitamins[vitamin].quantity += vitaminData.quantity;
        }
      });

      Object.keys(day.dayTotals.micronutrients.minerals).forEach(mineral => {
        const mineralData = day.dayTotals.micronutrients.minerals[mineral];
        if (mineralData && mineralData.quantity) {
          if (!overallTotals.micronutrients.minerals[mineral]) {
            overallTotals.micronutrients.minerals[mineral] = { quantity: 0, unit: mineralData.unit };
          }
          overallTotals.micronutrients.minerals[mineral].quantity += mineralData.quantity;
        }
      });
    });

    const totalDays = detailedSuggestions.length;
    const dailyAverages = totalDays > 0 ? {
      macros: Object.keys(overallTotals.macros).reduce((acc, key) => {
        acc[key] = parseFloat((overallTotals.macros[key as keyof typeof overallTotals.macros] / totalDays).toFixed(2));
        return acc;
      }, {} as any),
      micronutrients: {
        vitamins: Object.keys(overallTotals.micronutrients.vitamins).reduce((acc, key) => {
          const vitaminData = overallTotals.micronutrients.vitamins[key];
          if (vitaminData && vitaminData.quantity) {
            acc[key] = {
              quantity: parseFloat((vitaminData.quantity / totalDays).toFixed(2)),
              unit: vitaminData.unit
            };
          }
          return acc;
        }, {} as any),
        minerals: Object.keys(overallTotals.micronutrients.minerals).reduce((acc, key) => {
          const mineralData = overallTotals.micronutrients.minerals[key];
          if (mineralData && mineralData.quantity) {
            acc[key] = {
              quantity: parseFloat((mineralData.quantity / totalDays).toFixed(2)),
              unit: mineralData.unit
            };
          }
          return acc;
        }, {} as any)
      }
    } : null;

    // Get standardized nutrition using getDraftStatus
    const status = await draftService.getDraftStatus(id);

    return res.status(200).json({
      success: true,
      data: {
        id: draft.id,
        clientId: draft.clientId,
        nutritionistId: draft.nutritionistId,
        status: draft.status,
        searchParams: draft.searchParams,
        createdAt: draft.createdAt,
        updatedAt: draft.updatedAt,
        expiresAt: draft.expiresAt,
        days: detailedSuggestions,
        nutritionSummary: {
          overall: overallTotals,
          dailyAverages: dailyAverages
        },
        // Add standardized nutrition data (same format as other endpoints)
        totalNutrition: status?.totalNutrition || null,
        dayWiseNutrition: status?.dayWiseNutrition || null,
        mealSummary: status?.mealSummary || null,
        completionStatus: status?.completionStatus || null
      },
      message: 'Meal plan draft retrieved with detailed nutrition'
    });

  } catch (error) {
    console.error('❌ Error fetching meal plan draft details:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch meal plan draft details'
    });
  }
}

export default requireAuth(handler);

