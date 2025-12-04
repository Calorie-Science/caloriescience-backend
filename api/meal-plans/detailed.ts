import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealPlanDraftService } from '../../lib/mealPlanDraftService';
import { RecipeCacheService } from '../../lib/recipeCacheService';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
import { simpleIngredientService } from '../../lib/simpleIngredientService';

const draftService = new MealPlanDraftService();
const cacheService = new RecipeCacheService();
const multiProviderService = new MultiProviderRecipeSearchService();

/**
 * GET /api/meal-plans/detailed
 *
 * Returns a complete meal plan with all recipe details (ingredients, instructions, nutrition)
 * merged directly into the meal plan structure. No need for separate /recipes/customized calls.
 *
 * Query Parameters:
 * - draftId (required): The meal plan draft ID
 *
 * Response includes:
 * - Complete meal plan structure with all recipe details embedded
 * - Full ingredients, instructions, and nutrition for each recipe
 * - Applied customizations (portion sizes, ingredient modifications, etc.)
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { draftId } = req.query;

    if (!draftId || typeof draftId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid draftId parameter',
        message: 'draftId is required'
      });
    }

    console.log(`📋 Fetching detailed meal plan for draft: ${draftId}`);

    // Step 1: Get the meal plan draft
    const draft = await draftService.getDraft(draftId);
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified meal plan draft does not exist or has expired'
      });
    }

    // Verify user has access to this draft
    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this meal plan'
      });
    }

    // Check if this is an AI-generated draft
    const isAIDraft = draftId.startsWith('ai-');

    // Step 2: Enrich each recipe with full details
    const enrichedSuggestions = await Promise.all(
      draft.suggestions.map(async (dayPlan: any) => {
        const enrichedMeals: any = {};

        for (const [mealName, meal] of Object.entries(dayPlan.meals)) {
          const enrichedRecipes = await Promise.all(
            (meal as any).recipes.map(async (recipe: any) => {
              try {
                console.log(`  🔍 Enriching recipe: ${recipe.id} (${recipe.title})`);

                // Get full recipe details based on source
                const fullRecipe = await getFullRecipeDetails(
                  recipe.id,
                  recipe,
                  meal as any,
                  isAIDraft,
                  draftId
                );

                return {
                  ...recipe,
                  ...fullRecipe,
                  // Keep original fields that might not be in fullRecipe
                  originalTitle: recipe.title,
                  originalCalories: recipe.calories
                };
              } catch (error) {
                console.error(`❌ Error enriching recipe ${recipe.id}:`, error);
                // Return original recipe if enrichment fails
                return recipe;
              }
            })
          );

          enrichedMeals[mealName] = {
            ...(meal as any),
            mealName: mealName, // Add meal slot name to the meal object
            recipes: enrichedRecipes
          };
        }

        // Sort meals by mealTime
        const sortedMeals: any = {};
        const mealEntries = Object.entries(enrichedMeals).sort((a, b) => {
          const timeA = (a[1] as any).mealTime || '00:00';
          const timeB = (b[1] as any).mealTime || '00:00';
          return timeA.localeCompare(timeB);
        });

        for (const [mealName, meal] of mealEntries) {
          sortedMeals[mealName] = meal;
        }

        return {
          ...dayPlan,
          meals: sortedMeals
        };
      })
    );

    // Step 3: Return the enriched meal plan
    const enrichedDraft = {
      ...draft,
      suggestions: enrichedSuggestions
    };

    console.log(`✅ Successfully enriched meal plan with ${enrichedSuggestions.length} days`);

    return res.status(200).json({
      success: true,
      data: enrichedDraft,
      message: 'Meal plan with full recipe details retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching detailed meal plan:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Normalize ingredient format to consistent structure with id, name, amount, unit
 */
function normalizeIngredients(ingredients: any[]): any[] {
  return ingredients.map((ing: any) => ({
    id: ing.id || ing.food || ing.name,
    name: ing.name || ing.food || ing.text,
    unit: ing.unit || ing.measure || '',
    amount: ing.amount !== undefined ? ing.amount : (ing.quantity || 0),
    image: ing.image || '',
    originalString: ing.original || ing.originalString || ing.text || `${ing.amount || ing.quantity || ''} ${ing.unit || ing.measure || ''} ${ing.name || ing.food || ''}`.trim(),
    aisle: ing.aisle || '',
    meta: ing.meta || [],
    measures: ing.measures || {
      us: { amount: ing.amount || ing.quantity || 0, unitLong: ing.unit || ing.measure || '', unitShort: ing.unit || ing.measure || '' },
      metric: { amount: ing.amount || ing.quantity || 0, unitLong: ing.unit || ing.measure || '', unitShort: ing.unit || ing.measure || '' }
    }
  }));
}

/**
 * Get full recipe details including ingredients, instructions, and nutrition
 */
async function getFullRecipeDetails(
  recipeId: string,
  recipe: any,
  meal: any,
  isAIDraft: boolean,
  draftId: string
): Promise<any> {
  // Handle AI-generated recipes
  if (isAIDraft) {
    return await handleAIGeneratedRecipe(recipe, meal);
  }

  // Handle simple ingredient recipes
  let isSimpleIngredient = recipeId.startsWith('ingredient_') || recipe.isSimpleIngredient;

  if (!isSimpleIngredient) {
    const isUUID = recipeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    if (isUUID) {
      try {
        const { supabase } = await import('../../lib/supabase');
        const { data: ingredient } = await supabase
          .from('simple_ingredients')
          .select('id, name')
          .eq('id', recipeId)
          .single();

        if (ingredient) {
          isSimpleIngredient = true;
        }
      } catch (error) {
        // Not a simple ingredient
      }
    }
  }

  if (isSimpleIngredient) {
    return await handleIngredientRecipe(recipeId, recipe, meal);
  }

  // Handle manual/custom recipes
  const isManualRecipe = recipe.source === 'manual' || recipeId.startsWith('manual_');
  if (isManualRecipe) {
    return await handleManualRecipe(recipeId, recipe, meal);
  }

  // Handle regular API recipes (Edamam, Spoonacular)
  return await handleRegularRecipe(recipeId, recipe, meal);
}

/**
 * Handle AI-generated recipes
 */
async function handleAIGeneratedRecipe(recipe: any, meal: any): Promise<any> {
  const getNutritionValue = (nutrient: any): number => {
    if (!nutrient) return 0;
    if (typeof nutrient === 'number') return nutrient;
    return nutrient.quantity || nutrient.value || 0;
  };

  const normalizeNutrition = (nutrition: any): any => {
    if (!nutrition) return {};

    const normalized: any = {};

    if (nutrition.calories) {
      normalized.calories = {
        quantity: getNutritionValue(nutrition.calories),
        unit: nutrition.calories.unit || 'kcal'
      };
    }

    if (nutrition.macros) {
      normalized.macros = {};
      Object.keys(nutrition.macros).forEach(key => {
        const macro = nutrition.macros[key];
        normalized.macros[key] = {
          quantity: getNutritionValue(macro),
          unit: macro?.unit || 'g'
        };
      });
    }

    if (nutrition.micros) {
      normalized.micros = { vitamins: {}, minerals: {} };

      if (nutrition.micros.vitamins) {
        Object.keys(nutrition.micros.vitamins).forEach(key => {
          const vitamin = nutrition.micros.vitamins[key];
          normalized.micros.vitamins[key] = {
            quantity: getNutritionValue(vitamin),
            unit: vitamin?.unit || 'mg'
          };
        });
      }

      if (nutrition.micros.minerals) {
        Object.keys(nutrition.micros.minerals).forEach(key => {
          const mineral = nutrition.micros.minerals[key];
          normalized.micros.minerals[key] = {
            quantity: getNutritionValue(mineral),
            unit: mineral?.unit || 'mg'
          };
        });
      }
    }

    return normalized;
  };

  const normalizedNutrition = normalizeNutrition(recipe.nutrition);

  const customizations = meal.customizations?.[recipe.id];
  const servings = customizations?.nutritionServings || customizations?.servings || 1;

  const enrichedRecipe = {
    ingredients: (recipe.ingredients || []).map((ing: any) => ({
      id: ing.id || ing.name,
      name: ing.name || ing.food,
      unit: ing.unit || '',
      amount: ing.amount || ing.quantity || 0,
      image: ing.image || '',
      originalString: ing.original || ing.originalString || `${ing.amount || ''} ${ing.unit || ''} ${ing.name || ''}`.trim(),
      aisle: ing.aisle || '',
      meta: ing.meta || [],
      measures: ing.measures || {
        us: { amount: ing.amount || 0, unitLong: ing.unit || '', unitShort: ing.unit || '' },
        metric: { amount: ing.amount || 0, unitLong: ing.unit || '', unitShort: ing.unit || '' }
      }
    })),
    ingredientLines: recipe.ingredientLines || [],
    cookingInstructions: (recipe.instructions || []).map((instruction: any, index: number) => {
      if (typeof instruction === 'string') {
        return { number: index + 1, step: instruction };
      }
      return {
        number: instruction.number || index + 1,
        step: instruction.step || instruction
      };
    }),
    nutritionDetails: normalizedNutrition,
    nutritionServings: servings,
    servings: recipe.servings || 1,
    prepTimeMinutes: recipe.prepTimeMinutes || null,
    cookTimeMinutes: recipe.cookTimeMinutes || null,
    totalTimeMinutes: recipe.readyInMinutes || recipe.totalTimeMinutes || null,
    healthLabels: recipe.healthLabels || [],
    dietLabels: recipe.dietLabels || [],
    cuisineTypes: recipe.cuisineTypes || [],
    dishTypes: recipe.dishTypes || [],
    mealTypes: recipe.mealTypes || [],
    hasCustomizations: !!customizations?.customizationsApplied,
    customizations: customizations || null
  };

  // Apply servings multiplier if needed
  if (servings !== 1 && enrichedRecipe.nutritionDetails) {
    if (enrichedRecipe.nutritionDetails.calories) {
      enrichedRecipe.nutritionDetails.calories.quantity *= servings;
    }
    if (enrichedRecipe.nutritionDetails.macros) {
      Object.keys(enrichedRecipe.nutritionDetails.macros).forEach(key => {
        const macro = enrichedRecipe.nutritionDetails.macros[key];
        if (macro && typeof macro.quantity === 'number') {
          macro.quantity *= servings;
        }
      });
    }
    if (enrichedRecipe.nutritionDetails.micros) {
      if (enrichedRecipe.nutritionDetails.micros.vitamins) {
        Object.keys(enrichedRecipe.nutritionDetails.micros.vitamins).forEach(key => {
          const vitamin = enrichedRecipe.nutritionDetails.micros.vitamins[key];
          if (vitamin && typeof vitamin.quantity === 'number') {
            vitamin.quantity *= servings;
          }
        });
      }
      if (enrichedRecipe.nutritionDetails.micros.minerals) {
        Object.keys(enrichedRecipe.nutritionDetails.micros.minerals).forEach(key => {
          const mineral = enrichedRecipe.nutritionDetails.micros.minerals[key];
          if (mineral && typeof mineral.quantity === 'number') {
            mineral.quantity *= servings;
          }
        });
      }
    }
  }

  return enrichedRecipe;
}

/**
 * Handle simple ingredient recipes
 */
async function handleIngredientRecipe(recipeId: string, recipe: any, meal: any): Promise<any> {
  let ingredientRecipe: any;

  const isUUID = recipeId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

  if (isUUID) {
    const { supabase } = await import('../../lib/supabase');
    const { data: ingredient } = await supabase
      .from('simple_ingredients')
      .select('*')
      .eq('id', recipeId)
      .single();

    if (ingredient) {
      ingredientRecipe = {
        ingredients: [{
          name: ingredient.name,
          amount: ingredient.serving_quantity,
          unit: ingredient.serving_unit,
          original: `${ingredient.serving_quantity} ${ingredient.serving_unit} ${ingredient.name}`
        }],
        cookingInstructions: [{ number: 1, step: `Use ${ingredient.serving_quantity} ${ingredient.serving_unit} of ${ingredient.name}` }],
        nutritionDetails: {
          calories: { quantity: parseFloat(ingredient.calories || 0), unit: 'kcal' },
          macros: {
            protein: { quantity: parseFloat(ingredient.protein_g || 0), unit: 'g' },
            carbs: { quantity: parseFloat(ingredient.carbs_g || 0), unit: 'g' },
            fat: { quantity: parseFloat(ingredient.fat_g || 0), unit: 'g' },
            fiber: { quantity: parseFloat(ingredient.fiber_g || 0), unit: 'g' }
          }
        },
        servings: 1,
        healthLabels: ingredient.health_labels || [],
        dietLabels: ingredient.diet_labels || []
      };
    }
  } else {
    const ingredientName = recipeId.replace(/^ingredient_/, '').replace(/_/g, ' ');
    const ingredients = await simpleIngredientService.searchIngredientsAsRecipes(ingredientName, 1);
    if (ingredients.length > 0) {
      ingredientRecipe = ingredients[0];
    }
  }

  const customizations = meal.customizations?.[recipeId];
  const servings = customizations?.nutritionServings || customizations?.servings || 1;

  return {
    ...ingredientRecipe,
    nutritionServings: servings,
    hasCustomizations: !!customizations?.customizationsApplied,
    customizations: customizations || null
  };
}

/**
 * Handle manual/custom recipes
 */
async function handleManualRecipe(recipeId: string, recipe: any, meal: any): Promise<any> {
  let baseRecipe: any;

  try {
    const cachedRecipe = await cacheService.getRecipeById(recipeId);
    if (cachedRecipe) {
      const cached = cachedRecipe as any;
      baseRecipe = {
        ingredients: normalizeIngredients(cached.ingredients || []),
        ingredientLines: cached.ingredient_lines || cached.ingredientLines || [],
        cookingInstructions: cached.cooking_instructions || cached.cookingInstructions || [],
        nutritionDetails: cached.nutrition_details || cached.nutritionDetails || {},
        servings: cached.servings,
        prepTimeMinutes: cached.prep_time_minutes || cached.prepTimeMinutes,
        cookTimeMinutes: cached.cook_time_minutes || cached.cookTimeMinutes,
        totalTimeMinutes: cached.total_time_minutes || cached.totalTimeMinutes,
        healthLabels: cached.health_labels || cached.healthLabels || [],
        dietLabels: cached.diet_labels || cached.dietLabels || []
      };
    }
  } catch (error) {
    // Fall back to recipe from draft
  }

  if (!baseRecipe) {
    baseRecipe = {
      ingredients: normalizeIngredients(recipe.ingredients || []),
      cookingInstructions: recipe.instructions || [],
      nutritionDetails: recipe.nutrition || {},
      servings: recipe.servings || 1
    };
  }

  const customizations = meal.customizations?.[recipeId];
  const servings = customizations?.nutritionServings || customizations?.servings || 1;

  return {
    ...baseRecipe,
    nutritionServings: servings,
    hasCustomizations: !!customizations?.customizationsApplied,
    customizations: customizations || null
  };
}

/**
 * Handle regular API recipes (Edamam, Spoonacular)
 */
async function handleRegularRecipe(recipeId: string, recipe: any, meal: any): Promise<any> {
  let baseRecipe: any;
  const source = recipe.source as 'edamam' | 'spoonacular';

  // Try cache first
  const cachedRecipe = await cacheService.getRecipeByExternalId(source, recipeId);
  if (cachedRecipe) {
    const cached = cachedRecipe as any;
    baseRecipe = {
      ingredients: normalizeIngredients(cached.ingredients || []),
      ingredientLines: cached.ingredient_lines || cached.ingredientLines || [],
      cookingInstructions: cached.cooking_instructions || cached.cookingInstructions || [],
      nutritionDetails: cached.nutrition_details || cached.nutritionDetails || {},
      servings: cached.servings,
      prepTimeMinutes: cached.prep_time_minutes || cached.prepTimeMinutes,
      cookTimeMinutes: cached.cook_time_minutes || cached.cookTimeMinutes,
      totalTimeMinutes: cached.total_time_minutes || cached.totalTimeMinutes,
      healthLabels: cached.health_labels || cached.healthLabels || [],
      dietLabels: cached.diet_labels || cached.dietLabels || [],
      cuisineTypes: cached.cuisine_types || cached.cuisineTypes || [],
      dishTypes: cached.dish_types || cached.dishTypes || [],
      mealTypes: cached.meal_types || cached.mealTypes || []
    };
  } else {
    // Fetch from API
    const recipeDetails = await multiProviderService.getRecipeDetails(recipeId);
    if (recipeDetails) {
      baseRecipe = {
        ingredients: normalizeIngredients(recipeDetails.ingredients || []),
        ingredientLines: recipeDetails.ingredientLines || [],
        cookingInstructions: recipeDetails.instructions || [],
        nutritionDetails: recipeDetails.nutrition || {},
        servings: recipeDetails.servings,
        prepTimeMinutes: recipeDetails.prepTimeMinutes || null,
        cookTimeMinutes: recipeDetails.cookTimeMinutes || null,
        totalTimeMinutes: recipeDetails.readyInMinutes || recipeDetails.totalTimeMinutes,
        healthLabels: recipeDetails.healthLabels || [],
        dietLabels: recipeDetails.dietLabels || [],
        cuisineTypes: recipeDetails.cuisineTypes || recipeDetails.cuisineType || [],
        dishTypes: recipeDetails.dishTypes || recipeDetails.dishType || [],
        mealTypes: recipeDetails.mealTypes || recipeDetails.mealType || []
      };
    }
  }

  const customizations = meal.customizations?.[recipeId];
  const servings = customizations?.nutritionServings || customizations?.servings || 1;

  // Apply customizations if present
  if (customizations && baseRecipe) {
    // Apply ingredient modifications
    if (customizations.modifications && customizations.modifications.length > 0) {
      for (const mod of customizations.modifications) {
        if (mod.type === 'omit' && mod.ingredient) {
          baseRecipe.ingredients = baseRecipe.ingredients.filter((ing: any) => {
            const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
            return !ingName.includes(mod.ingredient!.toLowerCase());
          });
        } else if (mod.type === 'add' && mod.newIngredient) {
          baseRecipe.ingredients.push({
            name: mod.newIngredient,
            amount: (mod as any).amount || null,
            unit: (mod as any).unit || null,
            original: `${(mod as any).amount || ''} ${(mod as any).unit || ''} ${mod.newIngredient}`.trim()
          });
        } else if (mod.type === 'replace' && mod.ingredient && mod.newIngredient) {
          baseRecipe.ingredients = baseRecipe.ingredients.map((ing: any) => {
            const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
            if (ingName.includes(mod.ingredient!.toLowerCase())) {
              return {
                ...ing,
                name: mod.newIngredient,
                amount: (mod as any).amount || ing.amount,
                unit: (mod as any).unit || ing.unit,
                original: `${(mod as any).amount || ing.amount || ''} ${(mod as any).unit || ing.unit || ''} ${mod.newIngredient}`.trim()
              };
            }
            return ing;
          });
        }
      }
    }

    // Apply custom nutrition
    if (customizations.customNutrition) {
      baseRecipe.nutritionDetails = customizations.customNutrition;
    }
  }

  // Apply servings multiplier
  if (servings !== 1 && baseRecipe?.nutritionDetails) {
    if (baseRecipe.nutritionDetails.calories) {
      baseRecipe.nutritionDetails.calories.quantity *= servings;
    }
    if (baseRecipe.nutritionDetails.macros) {
      Object.keys(baseRecipe.nutritionDetails.macros).forEach(key => {
        const macro = baseRecipe.nutritionDetails.macros[key];
        if (macro && typeof macro.quantity === 'number') {
          macro.quantity *= servings;
        }
      });
    }
    if (baseRecipe.nutritionDetails.micros) {
      if (baseRecipe.nutritionDetails.micros.vitamins) {
        Object.keys(baseRecipe.nutritionDetails.micros.vitamins).forEach(key => {
          const vitamin = baseRecipe.nutritionDetails.micros.vitamins[key];
          if (vitamin && typeof vitamin.quantity === 'number') {
            vitamin.quantity *= servings;
          }
        });
      }
      if (baseRecipe.nutritionDetails.micros.minerals) {
        Object.keys(baseRecipe.nutritionDetails.micros.minerals).forEach(key => {
          const mineral = baseRecipe.nutritionDetails.micros.minerals[key];
          if (mineral && typeof mineral.quantity === 'number') {
            mineral.quantity *= servings;
          }
        });
      }
    }
  }

  return {
    ...baseRecipe,
    nutritionServings: servings,
    hasCustomizations: !!customizations?.customizationsApplied,
    customizations: customizations || null
  };
}

export default requireAuth(handler);
