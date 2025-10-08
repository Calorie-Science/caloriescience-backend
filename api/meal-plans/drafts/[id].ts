import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { MealPlanDraftService } from '../../../lib/mealPlanDraftService';
import { RecipeCacheService } from '../../../lib/recipeCacheService';
import { RecipeResponseStandardizationService } from '../../../lib/recipeResponseStandardizationService';

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

    // Process each day with detailed nutrition
    const detailedSuggestions = await Promise.all(
      (draft.suggestions || []).map(async (day: any) => {
        const detailedMeals: any = {};

        // Process each meal
        await Promise.all(
          Object.entries(day.meals || {}).map(async ([mealName, meal]: [string, any]) => {
            const selectedRecipe = meal.selectedRecipeId 
              ? meal.recipes.find((r: any) => r.id === meal.selectedRecipeId)
              : null;

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

            // If there are custom nutrition values (from modifications), use those
            if (customizations?.customNutrition) {
              console.log(`📊 Using custom nutrition from modifications`);
              detailedNutrition.macros = {
                calories: customizations.customNutrition.calories || 0,
                protein: customizations.customNutrition.protein || 0,
                carbs: customizations.customNutrition.carbs || 0,
                fat: customizations.customNutrition.fat || 0,
                fiber: customizations.customNutrition.fiber || 0,
                sugar: standardizedRecipe?.sugarPerServingG ? parseFloat(standardizedRecipe.sugarPerServingG) : null,
                sodium: standardizedRecipe?.sodiumPerServingMg ? parseFloat(standardizedRecipe.sodiumPerServingMg) : null,
                saturatedFat: standardizedRecipe?.nutritionDetails?.macros?.saturatedFat?.quantity || null,
                cholesterol: standardizedRecipe?.nutritionDetails?.macros?.cholesterol?.quantity || null
              };
            } else {
              // Use base nutrition from recipe
              console.log(`📊 Using base nutrition from recipe`);
              detailedNutrition.macros = {
                calories: parseFloat(standardizedRecipe?.caloriesPerServing || selectedRecipe.calories || selectedRecipe.nutrition?.calories || '0'),
                protein: parseFloat(standardizedRecipe?.proteinPerServingG || selectedRecipe.protein || selectedRecipe.nutrition?.protein || '0'),
                carbs: parseFloat(standardizedRecipe?.carbsPerServingG || selectedRecipe.carbs || selectedRecipe.nutrition?.carbs || '0'),
                fat: parseFloat(standardizedRecipe?.fatPerServingG || selectedRecipe.fat || selectedRecipe.nutrition?.fat || '0'),
                fiber: parseFloat(standardizedRecipe?.fiberPerServingG || selectedRecipe.fiber || selectedRecipe.nutrition?.fiber || '0'),
                sugar: standardizedRecipe?.sugarPerServingG ? parseFloat(standardizedRecipe.sugarPerServingG) : null,
                sodium: standardizedRecipe?.sodiumPerServingMg ? parseFloat(standardizedRecipe.sodiumPerServingMg) : null,
                saturatedFat: standardizedRecipe?.nutritionDetails?.macros?.saturatedFat?.quantity || null,
                cholesterol: standardizedRecipe?.nutritionDetails?.macros?.cholesterol?.quantity || null
              };
            }

            // Extract micronutrients from cache (these don't change with ingredient modifications)
            if (standardizedRecipe?.nutritionDetails?.micros) {
              console.log(`📊 Extracting micronutrients from cache`);
              const vitamins = standardizedRecipe.nutritionDetails.micros.vitamins || {};
              const minerals = standardizedRecipe.nutritionDetails.micros.minerals || {};

              detailedNutrition.micronutrients = {
                vitamins: {
                  vitaminA: vitamins.vitaminA ? { quantity: vitamins.vitaminA.quantity, unit: vitamins.vitaminA.unit } : null,
                  vitaminC: vitamins.vitaminC ? { quantity: vitamins.vitaminC.quantity, unit: vitamins.vitaminC.unit } : null,
                  vitaminD: vitamins.vitaminD ? { quantity: vitamins.vitaminD.quantity, unit: vitamins.vitaminD.unit } : null,
                  vitaminE: vitamins.vitaminE ? { quantity: vitamins.vitaminE.quantity, unit: vitamins.vitaminE.unit } : null,
                  vitaminK: vitamins.vitaminK ? { quantity: vitamins.vitaminK.quantity, unit: vitamins.vitaminK.unit } : null,
                  vitaminB6: vitamins.vitaminB6 ? { quantity: vitamins.vitaminB6.quantity, unit: vitamins.vitaminB6.unit } : null,
                  vitaminB12: vitamins.vitaminB12 ? { quantity: vitamins.vitaminB12.quantity, unit: vitamins.vitaminB12.unit } : null,
                  folate: vitamins.folate ? { quantity: vitamins.folate.quantity, unit: vitamins.folate.unit } : null,
                  thiamin: vitamins.thiamin ? { quantity: vitamins.thiamin.quantity, unit: vitamins.thiamin.unit } : null,
                  riboflavin: vitamins.riboflavin ? { quantity: vitamins.riboflavin.quantity, unit: vitamins.riboflavin.unit } : null,
                  niacin: vitamins.niacin ? { quantity: vitamins.niacin.quantity, unit: vitamins.niacin.unit } : null
                },
                minerals: {
                  calcium: minerals.calcium ? { quantity: minerals.calcium.quantity, unit: minerals.calcium.unit } : null,
                  iron: minerals.iron ? { quantity: minerals.iron.quantity, unit: minerals.iron.unit } : null,
                  magnesium: minerals.magnesium ? { quantity: minerals.magnesium.quantity, unit: minerals.magnesium.unit } : null,
                  phosphorus: minerals.phosphorus ? { quantity: minerals.phosphorus.quantity, unit: minerals.phosphorus.unit } : null,
                  potassium: minerals.potassium ? { quantity: minerals.potassium.quantity, unit: minerals.potassium.unit } : null,
                  zinc: minerals.zinc ? { quantity: minerals.zinc.quantity, unit: minerals.zinc.unit } : null,
                  copper: minerals.copper ? { quantity: minerals.copper.quantity, unit: minerals.copper.unit } : null,
                  manganese: minerals.manganese ? { quantity: minerals.manganese.quantity, unit: minerals.manganese.unit } : null,
                  selenium: minerals.selenium ? { quantity: minerals.selenium.quantity, unit: minerals.selenium.unit } : null
                }
              };
              console.log(`✅ Micronutrients extracted successfully`);
            } else {
              console.log(`⚠️ No micronutrients found in cache for ${selectedRecipe.id}`);
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
            // Add macros
            Object.keys(dayTotals.macros).forEach(macro => {
              dayTotals.macros[macro as keyof typeof dayTotals.macros] += 
                meal.nutrition.macros[macro] || 0;
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
        }
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

