import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealPlanDraftService } from '../../lib/mealPlanDraftService';
import { EdamamService } from '../../lib/edamamService';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
import Joi from 'joi';

const draftService = new MealPlanDraftService();
const edamamService = new EdamamService();
const multiProviderService = new MultiProviderRecipeSearchService();
const RecipeCacheService = require('../../lib/recipeCacheService').RecipeCacheService;
const RecipeResponseStandardizationService = require('../../lib/recipeResponseStandardizationService').RecipeResponseStandardizationService;
const IngredientCustomizationService = require('../../lib/ingredientCustomizationService').IngredientCustomizationService;
const cacheService = new RecipeCacheService();
const standardizationService = new RecipeResponseStandardizationService();
const ingredientCustomizationService = new IngredientCustomizationService();

// Validation schemas
const selectRecipeSchema = Joi.object({
  action: Joi.string().valid('select-recipe').required(),
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipeId: Joi.string().required(),
  customizations: Joi.object({
    recipeId: Joi.string().required(),
    source: Joi.string().valid('edamam', 'spoonacular').required(),
    modifications: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('replace', 'omit', 'reduce', 'add').required(),
        ingredient: Joi.string().optional(),
        newIngredient: Joi.string().optional(),
        reductionPercent: Joi.number().min(0).max(100).optional(),
        notes: Joi.string().optional()
      })
    ).required(),
    customNutrition: Joi.object({
      calories: Joi.number().min(0).required(),
      protein: Joi.number().min(0).required(),
      carbs: Joi.number().min(0).required(),
      fat: Joi.number().min(0).required(),
      fiber: Joi.number().min(0).required()
    }).optional(),
    servings: Joi.number().min(0.1).max(20).default(1),
    customizationsApplied: Joi.boolean().default(false)
  }).optional()
});

const deselectRecipeSchema = Joi.object({
  action: Joi.string().valid('deselect-recipe').required(),
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required()
});

const updateCustomizationsSchema = Joi.object({
  action: Joi.string().valid('update-customizations').required(),
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipeId: Joi.string().required(),
  autoCalculateNutrition: Joi.boolean().default(true).optional(), // Enable auto-calculation by default
  customizations: Joi.object({
    recipeId: Joi.string().required(),
    source: Joi.string().valid('edamam', 'spoonacular').required(),
    modifications: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('replace', 'omit', 'add').required(),
        // UNIFORM STRUCTURE: all operations use these fields
        originalIngredient: Joi.string().when('type', {
          is: Joi.string().valid('replace', 'omit'),
          then: Joi.required(),
          otherwise: Joi.forbidden()
        }),
        newIngredient: Joi.string().when('type', {
          is: Joi.string().valid('replace', 'add'),
          then: Joi.required(),
          otherwise: Joi.forbidden()
        }),
        amount: Joi.number().min(0).optional(), // Quantity for newIngredient
        unit: Joi.string().optional(), // Unit for newIngredient
        notes: Joi.string().optional()
      })
    ).required(),
    customNutrition: Joi.object({
      calories: Joi.number().min(0).required(),
      protein: Joi.number().min(0).required(),
      carbs: Joi.number().min(0).required(),
      fat: Joi.number().min(0).required(),
      fiber: Joi.number().min(0).required()
    }).optional(), // Now optional - will be auto-calculated if not provided
    customizationsApplied: Joi.boolean().default(false)
  }).required()
});

const finalizeDraftSchema = Joi.object({
  action: Joi.string().valid('finalize-draft').required(),
  draftId: Joi.string().required(),
  planName: Joi.string().optional()
});

const replaceIngredientInPlanSchema = Joi.object({
  action: Joi.string().valid('replace-ingredient-in-plan').required(),
  planId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipeId: Joi.string().required(),
  originalIngredient: Joi.string().required(),
  newIngredient: Joi.string().required(),
  source: Joi.string().valid('edamam', 'spoonacular').required()
});

const updateInstructionsSchema = Joi.object({
  action: Joi.string().valid('update-instructions').required(),
  planId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipeId: Joi.string().required(),
  instructions: Joi.alternatives().try(
    Joi.string().min(1),
    Joi.array().items(Joi.string().min(1)).min(1)
  ).required()
});

const shuffleRecipesSchema = Joi.object({
  action: Joi.string().valid('shuffle-recipes').required(),
  planId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required()
});

const updateNotesSchema = Joi.object({
  action: Joi.string().valid('update-notes').required(),
  planId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipeId: Joi.string().required(),
  notes: Joi.string().allow('', null).max(2000).optional()
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    switch (action) {
      case 'get-draft':
        return await handleGetDraft(req, res, user);
      
      case 'get-draft-status':
        return await handleGetDraftStatus(req, res, user);
      
      case 'select-recipe':
        return await handleSelectRecipe(req, res, user);
      
      case 'deselect-recipe':
        return await handleDeselectRecipe(req, res, user);
      
      case 'update-customizations':
        return await handleUpdateCustomizations(req, res, user);
      
      case 'finalize-draft':
        return await handleFinalizeDraft(req, res, user);
      
      case 'replace-ingredient-in-plan':
        return await handleReplaceIngredientInPlan(req, res, user);
      
      case 'update-instructions':
        return await handleUpdateInstructions(req, res, user);
      
      case 'shuffle-recipes':
        return await handleShuffleRecipes(req, res, user);
      
      case 'update-notes':
        return await handleUpdateNotes(req, res, user);
      
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('❌ Draft management error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get a meal plan draft
 */
async function handleGetDraft(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const schema = Joi.object({
    action: Joi.string().valid('get-draft').required(),
    draftId: Joi.string().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { draftId } = value;

  try {
    const draft = await draftService.getDraft(draftId);
    
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified draft does not exist or has expired'
      });
    }

    // Verify user has access to this draft
    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this draft'
      });
    }

    console.log(`📋 Enriching draft with micronutrients: ${draftId}`);

    // Enrich draft with micronutrient data from cache
    const enrichedSuggestions = await Promise.all(
      (draft.suggestions || []).map(async (day: any) => {
        const enrichedMeals: any = {};

        // Process each meal
        await Promise.all(
          Object.entries(day.meals || {}).map(async ([mealName, meal]: [string, any]) => {
            // Enrich each recipe with micronutrients from cache
            const enrichedRecipes = await Promise.all(
              (meal.recipes || []).map(async (recipe: any) => {
                try {
                  // Fetch from cache to get full nutrition including micros
                  const cachedRecipe = await cacheService.getRecipeByExternalId(
                    recipe.source || 'edamam',
                    recipe.id
                  );

                  if (cachedRecipe) {
                    const standardized = standardizationService.standardizeDatabaseRecipeResponse(cachedRecipe);
                    
                    // Merge cached nutrition (with micros) into recipe
                    return {
                      ...recipe,
                      nutrition: standardized.nutritionDetails || recipe.nutrition || {},
                      micronutrients: standardized.nutritionDetails?.micros || null
                    };
                  }
                  
                  return recipe; // Return as-is if not in cache
                } catch (err) {
                  console.warn(`⚠️ Could not enrich recipe ${recipe.id}:`, err);
                  return recipe;
                }
              })
            );

            // Apply customizations to ALL recipes that have them (not just selected)
            const mealCustomizations = meal.customizations || {};
            
            // Apply customizations to any recipe that has them
            let finalRecipes = await Promise.all(enrichedRecipes.map(async (recipe) => {
              const recipeCustomizations = mealCustomizations[recipe.id];
              
              if (recipeCustomizations?.customizationsApplied) {
                  console.log(`🔧 Applying customizations to recipe: ${recipe.id}`);
                  
                  // Apply ingredient modifications
                  let customizedIngredients = [...(recipe.ingredients || [])];
                  const modifications = recipeCustomizations.modifications || [];
                  
                  for (const mod of modifications) {
                    if (mod.type === 'omit' && mod.originalIngredient) {
                      // Remove ingredient
                      const targetName = mod.originalIngredient.toLowerCase();
                      customizedIngredients = customizedIngredients.filter((ing: any) => {
                        const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
                        return !ingName.includes(targetName) && !targetName.includes(ingName);
                      });
                      console.log(`  🚫 Omitted: ${mod.originalIngredient}`);
                    }
                    else if (mod.type === 'add' && mod.newIngredient) {
                      // Add new ingredient
                      customizedIngredients.push({
                        name: mod.newIngredient,
                        amount: (mod as any).amount || null,
                        unit: (mod as any).unit || null,
                        original: `${(mod as any).amount || ''} ${(mod as any).unit || ''} ${mod.newIngredient}`.trim()
                      });
                      console.log(`  ➕ Added: ${mod.newIngredient}`);
                    }
                    else if (mod.type === 'replace' && mod.originalIngredient && mod.newIngredient) {
                      // Replace ingredient
                      const targetName = mod.originalIngredient.toLowerCase();
                      let replaced = false;
                      customizedIngredients = customizedIngredients.map((ing: any) => {
                        const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
                        if ((ingName.includes(targetName) || targetName.includes(ingName)) && !replaced) {
                          replaced = true;
                          console.log(`  🔄 Replaced: ${ing.name || ing.food} → ${mod.newIngredient}`);
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
                  
                  // RECALCULATE nutrition to ensure accuracy (don't trust saved customNutrition)
                  let finalNutrition = recipe.nutrition;
                  let finalMicronutrients = recipe.micronutrients;
                  
                  // Always recalculate if there are modifications to ensure math is correct
                  if (modifications.length > 0) {
                    console.log(`  🔄 RECALCULATING nutrition for ${modifications.length} modifications`);
                    
                    // Get original nutrition
                    let originalNutrition = {
                      calories: { quantity: recipe.calories || 0, unit: 'kcal' },
                      macros: {
                        protein: { quantity: recipe.protein || 0, unit: 'g' },
                        carbs: { quantity: recipe.carbs || 0, unit: 'g' },
                        fat: { quantity: recipe.fat || 0, unit: 'g' },
                        fiber: { quantity: recipe.fiber || 0, unit: 'g' }
                      },
                      micros: { vitamins: {}, minerals: {} }
                    };
                    
                    // If recipe.nutrition has micros, use that instead
                    if (recipe.nutrition?.micros) {
                      originalNutrition = recipe.nutrition;
                    }
                    
                    // Recalculate with IngredientCustomizationService
                    try {
                      const recalculated = await ingredientCustomizationService.applyModifications(
                        recipe.id,
                        recipe.source || 'edamam',
                        originalNutrition,
                        modifications,
                        1
                      );
                      
                      finalNutrition = recalculated.modifiedNutrition;
                      finalMicronutrients = recalculated.modifiedNutrition.micros;
                      console.log(`  ✅ Recalculated: ${originalNutrition.calories.quantity} → ${finalNutrition.calories.quantity} cal`);
                    } catch (error) {
                      console.error(`  ❌ Recalculation failed, using saved customNutrition:`, error);
                      // Fallback to saved customNutrition if recalculation fails
                      if (recipeCustomizations.customNutrition) {
                        if (recipeCustomizations.customNutrition.micros) {
                          finalNutrition = recipeCustomizations.customNutrition;
                          finalMicronutrients = recipeCustomizations.customNutrition.micros;
                        }
                      }
                    }
                  } else if (recipeCustomizations.customNutrition) {
                    // No modifications, use saved customNutrition
                    if (recipeCustomizations.customNutrition.micros) {
                      console.log(`  ✅ Using customized nutrition WITH micronutrients`);
                      finalNutrition = recipeCustomizations.customNutrition;
                      finalMicronutrients = recipeCustomizations.customNutrition.micros;
                    } else {
                      // Old format - just macros
                      console.log(`  ⚠️ Using customized nutrition (macros only)`);
                      finalNutrition = {
                        ...recipe.nutrition,
                        macros: {
                          protein: { quantity: recipeCustomizations.customNutrition.protein, unit: 'g' },
                          carbs: { quantity: recipeCustomizations.customNutrition.carbs, unit: 'g' },
                          fat: { quantity: recipeCustomizations.customNutrition.fat, unit: 'g' },
                          fiber: { quantity: recipeCustomizations.customNutrition.fiber, unit: 'g' }
                        },
                        calories: { quantity: recipeCustomizations.customNutrition.calories, unit: 'kcal' }
                      };
                    }
                  }
                  
                  // Extract top-level nutrition fields from finalNutrition for UI display
                  const customizedTopLevel = {
                    calories: finalNutrition?.calories?.quantity || recipe.calories || 0,
                    protein: finalNutrition?.macros?.protein?.quantity || recipe.protein || 0,
                    carbs: finalNutrition?.macros?.carbs?.quantity || recipe.carbs || 0,
                    fat: finalNutrition?.macros?.fat?.quantity || recipe.fat || 0,
                    fiber: finalNutrition?.macros?.fiber?.quantity || recipe.fiber || 0
                  };
                  
                  return {
                    ...recipe,
                    // Update top-level fields with customized values
                    calories: customizedTopLevel.calories,
                    protein: customizedTopLevel.protein,
                    carbs: customizedTopLevel.carbs,
                    fat: customizedTopLevel.fat,
                    fiber: customizedTopLevel.fiber,
                    // Keep detailed nutrition objects
                    ingredients: customizedIngredients,
                    nutrition: finalNutrition,
                    micronutrients: finalMicronutrients,
                    hasCustomizations: true,
                    customizationsSummary: {
                      modificationsCount: modifications.length,
                      modifications: modifications.map((m: any) => ({
                        type: m.type,
                        ingredient: m.type === 'omit' ? m.originalIngredient :
                                   m.type === 'add' ? m.newIngredient :
                                   `${m.originalIngredient} → ${m.newIngredient}`
                      }))
                    }
                  };
                }
                return recipe;
              }));
            
            enrichedMeals[mealName] = {
              ...meal,
              recipes: finalRecipes,
              hasCustomizations: Object.values(mealCustomizations).some((c: any) => c?.customizationsApplied)
            };
          })
        );

        return {
          ...day,
          meals: enrichedMeals
        };
      })
    );

    return res.status(200).json({
      success: true,
      data: {
        ...draft,
        suggestions: enrichedSuggestions
      },
      message: 'Draft retrieved with micronutrient data'
    });
  } catch (error) {
    console.error('❌ Error getting draft:', error);
    return res.status(500).json({
      error: 'Failed to get draft',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get draft status with nutrition summary
 */
async function handleGetDraftStatus(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const schema = Joi.object({
    action: Joi.string().valid('get-draft-status').required(),
    draftId: Joi.string().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { draftId } = value;

  try {
    const status = await draftService.getDraftStatus(draftId);
    
    if (!status) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified draft does not exist or has expired'
      });
    }

    // Verify user has access to this draft
    if (status.clientId && status.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this draft'
      });
    }

    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('❌ Error getting draft status:', error);
    return res.status(500).json({
      error: 'Failed to get draft status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Select a recipe for a meal
 */
async function handleSelectRecipe(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = selectRecipeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { draftId, day, mealName, recipeId, customizations } = value;

  try {
    // Verify user has access to this draft
    const draft = await draftService.getDraft(draftId);
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified draft does not exist or has expired'
      });
    }

    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this draft'
      });
    }

    await draftService.selectRecipe(draftId, day, mealName, recipeId, customizations);

    // Get updated draft status
    const status = await draftService.getDraftStatus(draftId);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Recipe selected successfully',
        status
      }
    });
  } catch (error) {
    console.error('❌ Error selecting recipe:', error);
    return res.status(500).json({
      error: 'Failed to select recipe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Deselect recipe in draft
 */
async function handleDeselectRecipe(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = deselectRecipeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { draftId, day, mealName } = value;

  try {
    // Verify user has access to this draft
    const draft = await draftService.getDraft(draftId);
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified draft does not exist or has expired'
      });
    }

    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this draft'
      });
    }

    await draftService.deselectRecipe(draftId, day, mealName);

    // Get updated draft status
    const status = await draftService.getDraftStatus(draftId);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Recipe deselected successfully',
        status
      }
    });
  } catch (error) {
    console.error('❌ Error deselecting recipe:', error);
    return res.status(500).json({
      error: 'Failed to deselect recipe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Helper function to auto-calculate nutrition for modifications
 * NOW WITH MICRONUTRIENT TRACKING!
 */
async function calculateNutritionForModifications(
  originalRecipeNutrition: any,
  modifications: any[],
  source: 'edamam' | 'spoonacular',
  originalRecipe?: any
): Promise<any> {
  console.log('🧮 Auto-calculating nutrition with MICRONUTRIENT TRACKING...');
  console.log(`📊 Original recipe nutrition:`, originalRecipeNutrition);
  console.log(`📝 Modifications count:`, modifications.length);

  try {
    // Use the new IngredientCustomizationService for complete nutrition tracking
    const result = await ingredientCustomizationService.applyModifications(
      originalRecipe?.id || 'recipe',
      source,
      originalRecipeNutrition,
      modifications,
      1 // servings
    );

    console.log(`✅ Micronutrients included:`, result.micronutrientsIncluded);
    console.log(`✅ Modified nutrition:`, {
      calories: result.modifiedNutrition.calories.quantity,
      protein: result.modifiedNutrition.macros.protein?.quantity,
      vitamins: Object.keys(result.modifiedNutrition.micros.vitamins || {}).length,
      minerals: Object.keys(result.modifiedNutrition.micros.minerals || {}).length
    });

    // Return the full standardized nutrition object (includes micros!)
    return result.modifiedNutrition;
    
  } catch (error) {
    console.error('❌ Error calculating nutrition with micros:', error);
    
    // Fallback to simple calculation (macros only) if something goes wrong
    console.warn('⚠️ Falling back to simple macro-only calculation');
    
  let totalNutrition = {
    calories: originalRecipeNutrition.calories || 0,
    protein: originalRecipeNutrition.protein || 0,
    carbs: originalRecipeNutrition.carbs || 0,
    fat: originalRecipeNutrition.fat || 0,
    fiber: originalRecipeNutrition.fiber || 0
  };

    // Simple processing for fallback
  for (const mod of modifications) {
      if (mod.type === 'add' && mod.newIngredient) {
      const ingredientNutrition = await getIngredientNutrition(mod.newIngredient, source, mod.amount, mod.unit);
      if (ingredientNutrition) {
        totalNutrition.calories += ingredientNutrition.calories;
        totalNutrition.protein += ingredientNutrition.protein;
        totalNutrition.carbs += ingredientNutrition.carbs;
        totalNutrition.fat += ingredientNutrition.fat;
        totalNutrition.fiber += ingredientNutrition.fiber;
        }
      }
    }

    // Return in old simple format
    return {
    calories: Math.round(totalNutrition.calories),
    protein: parseFloat(totalNutrition.protein.toFixed(1)),
    carbs: parseFloat(totalNutrition.carbs.toFixed(1)),
    fat: parseFloat(totalNutrition.fat.toFixed(1)),
    fiber: parseFloat(totalNutrition.fiber.toFixed(1))
  };
  }
}

/**
 * Helper function to get ingredient nutrition
 * Always uses Spoonacular for accuracy, regardless of recipe source
 */
async function getIngredientNutrition(
  ingredient: string,
  source: 'edamam' | 'spoonacular',
  amount?: number,
  unit?: string
): Promise<any> {
  try {
    let ingredientText = ingredient;
    if (amount && unit) {
      ingredientText = `${amount} ${unit} ${ingredient}`;
    }

    console.log(`🔍 Getting nutrition for: "${ingredientText}" using Spoonacular (accurate)`);

    // Try both APIs with intelligent fallback
    let nutritionData = null;
    let apiUsed = 'none';

    // Helper function to check if nutrition data is valid (not all zeros)
    const hasValidNutrition = (data: any) => {
      if (!data) return false;
      
      // Check Spoonacular format
      if (data.calories !== undefined) {
        return data.calories > 0 || data.protein > 0 || data.fat > 0;
      }
      
      // Check Edamam format
      if (data.ingredients?.[0]?.parsed?.[0]?.nutrients) {
        const nutrients = data.ingredients[0].parsed[0].nutrients;
        return (nutrients.ENERC_KCAL?.quantity || 0) > 0 || 
               (nutrients.PROCNT?.quantity || 0) > 0 || 
               (nutrients.FAT?.quantity || 0) > 0;
      }
      
      return false;
    };

    // Try Spoonacular first
    try {
      console.log(`🔍 Trying Spoonacular for: ${ingredientText}`);
      nutritionData = await multiProviderService.getIngredientNutrition(ingredientText);
      console.log(`🔍 Raw nutrition data received from Spoonacular:`, nutritionData);
      
      if (hasValidNutrition(nutritionData)) {
        apiUsed = 'spoonacular';
        console.log(`✅ Spoonacular provided valid nutrition data`);
      } else {
        console.log(`⚠️ Spoonacular returned invalid/empty nutrition data`);
        nutritionData = null;
      }
    } catch (error) {
      console.log(`⚠️ Spoonacular API call failed:`, error);
      nutritionData = null;
    }

    // If Spoonacular didn't provide valid data, try Edamam
    if (!nutritionData || !hasValidNutrition(nutritionData)) {
      try {
        console.log(`🔄 Trying Edamam fallback for: ${ingredientText}`);
        const edamamService = new (await import('../../lib/edamamService')).EdamamService();
        nutritionData = await edamamService.getIngredientNutrition(ingredientText);
        console.log(`🔍 Raw nutrition data received from Edamam:`, nutritionData);
        
        if (hasValidNutrition(nutritionData)) {
          apiUsed = 'edamam';
          console.log(`✅ Edamam provided valid nutrition data`);
        } else {
          console.log(`⚠️ Edamam also returned invalid/empty nutrition data`);
          nutritionData = null;
        }
      } catch (error) {
        console.log(`⚠️ Edamam API call also failed:`, error);
        nutritionData = null;
      }
    }

    if (!nutritionData) {
      console.warn(`⚠️ Could not get nutrition for: ${ingredientText} from either API`);
      return null;
    }

    // Extract nutrition from both Spoonacular and Edamam formats
    const extractNutrition = (data: any) => {
      console.log(`🔍 Extracting nutrition from data:`, data);
      
      // Spoonacular format (direct properties)
      if (data.calories !== undefined) {
        const result = {
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0,
          fiber: data.fiber || 0
        };
        console.log(`✅ Extracted Spoonacular nutrition:`, result);
        return result;
      }
      
      // Edamam format (nested in ingredients array)
      if (data.ingredients?.[0]?.parsed?.[0]?.nutrients) {
        const nutrients = data.ingredients[0].parsed[0].nutrients;
        const result = {
          calories: nutrients.ENERC_KCAL?.quantity || 0,
          protein: nutrients.PROCNT?.quantity || 0,
          carbs: nutrients.CHOCDF?.quantity || 0,
          fat: nutrients.FAT?.quantity || 0,
          fiber: nutrients.FIBTG?.quantity || 0
        };
        console.log(`✅ Extracted Edamam nutrition:`, result);
        return result;
      }

      console.log(`❌ No recognizable nutrition format found, returning zeros`);
      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    };

    const result = extractNutrition(nutritionData);
    console.log(`🔍 Final nutrition result from ${apiUsed}:`, result);
    console.log(`✅ Successfully got nutrition for "${ingredientText}" using ${apiUsed}`);
    return result;
  } catch (error) {
    console.error(`❌ Error getting nutrition for ${ingredient}:`, error);
    return null;
  }
}

/**
 * Update recipe customizations
 */
async function handleUpdateCustomizations(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = updateCustomizationsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { draftId, day, mealName, recipeId, customizations, autoCalculateNutrition = true } = value;

  try {
    // Verify user has access to this draft
    const draft = await draftService.getDraft(draftId);
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified draft does not exist or has expired'
      });
    }

    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this draft'
      });
    }

    // Find the recipe in the draft (needed for debug info)
    const dayPlan = draft.suggestions.find((d: any) => d.day === day);
    const meal = dayPlan?.meals[mealName];
    const recipe = meal?.recipes?.find((r: any) => r.id === recipeId);

    if (!recipe) {
      return res.status(404).json({
        error: 'Recipe not found',
        message: `Recipe ${recipeId} not found in ${mealName} for day ${day}`
      });
    }

    // If auto-calculation is enabled and customNutrition is not provided, calculate it
    if (autoCalculateNutrition && !customizations.customNutrition) {
      console.log('🤖 Auto-calculating nutrition WITH MICRONUTRIENTS...');

      // Get the ORIGINAL unmodified recipe from cache/API with FULL NUTRITION DATA
      console.log('🔍 Getting original recipe with complete nutrition from cache/API...');
      const cacheService = new (await import('../../lib/recipeCacheService')).RecipeCacheService();
      const multiProviderService = new (await import('../../lib/multiProviderRecipeSearchService')).MultiProviderRecipeSearchService();
      const standardizationService = new (await import('../../lib/recipeResponseStandardizationService')).RecipeResponseStandardizationService();
      
      let originalRecipe: any = null;
      let originalNutritionWithMicros: any = null;
      
      // Try cache first to get full nutrition
      const cachedRecipe = await cacheService.getRecipeByExternalId(customizations.source, recipeId);
      if (cachedRecipe) {
        console.log('✅ Found original recipe in cache with micronutrients');
        const standardized = standardizationService.standardizeDatabaseRecipeResponse(cachedRecipe);
        originalRecipe = {
          id: recipeId,
          ingredients: standardized.ingredients || []
        };
        // Use the FULL nutrition details with micronutrients
        // Check if nutritionDetails has actual data (not just empty object)
        const hasNutritionData = standardized.nutritionDetails && 
                                  (standardized.nutritionDetails.calories?.quantity > 0 || 
                                   Object.keys(standardized.nutritionDetails.macros || {}).length > 0);
        
        if (hasNutritionData) {
          originalNutritionWithMicros = standardized.nutritionDetails;
        } else {
          // Fallback to recipe data from draft
          originalNutritionWithMicros = {
            calories: { quantity: recipe.calories || 0, unit: 'kcal' },
            macros: {
              protein: { quantity: recipe.protein || 0, unit: 'g' },
              carbs: { quantity: recipe.carbs || 0, unit: 'g' },
              fat: { quantity: recipe.fat || 0, unit: 'g' },
              fiber: { quantity: recipe.fiber || 0, unit: 'g' }
            },
            micros: { vitamins: {}, minerals: {} }
          };
        }
        console.log('📊 Original recipe nutrition:', {
          calories: originalNutritionWithMicros.calories?.quantity,
          protein: originalNutritionWithMicros.macros?.protein?.quantity,
          vitamins: Object.keys(originalNutritionWithMicros.micros?.vitamins || {}).length,
          minerals: Object.keys(originalNutritionWithMicros.micros?.minerals || {}).length
        });
      } else {
        // Fetch from API if not in cache
        console.log('🔄 Fetching original recipe from API');
        const recipeDetails = await multiProviderService.getRecipeDetails(recipeId);
        if (recipeDetails) {
          originalRecipe = {
            id: recipeId,
            ingredients: recipeDetails.ingredients || []
          };
          // For API responses, create simple nutrition
          originalNutritionWithMicros = {
            calories: { quantity: recipeDetails.calories || 0, unit: 'kcal' },
            macros: {
              protein: { quantity: recipeDetails.protein || 0, unit: 'g' },
              carbs: { quantity: recipeDetails.carbs || 0, unit: 'g' },
              fat: { quantity: recipeDetails.fat || 0, unit: 'g' },
              fiber: { quantity: recipeDetails.fiber || 0, unit: 'g' }
            },
            micros: { vitamins: {}, minerals: {} }
          };
        }
      }

      if (!originalRecipe || !originalNutritionWithMicros) {
        console.warn('⚠️ Could not get original recipe, using simplified nutrition from draft');
        originalRecipe = recipe;
        originalNutritionWithMicros = {
          calories: { quantity: recipe.calories || 0, unit: 'kcal' },
          macros: {
            protein: { quantity: recipe.protein || 0, unit: 'g' },
            carbs: { quantity: recipe.carbs || 0, unit: 'g' },
            fat: { quantity: recipe.fat || 0, unit: 'g' },
            fiber: { quantity: recipe.fiber || 0, unit: 'g' }
          },
          micros: { vitamins: {}, minerals: {} }
        };
      }

      console.log('🔍 Original recipe ingredients:', originalRecipe?.ingredients?.slice(0, 3).map((ing: any) => ing.name));
      
      // Store for debug
      var debugOriginalNutritionBeforeCheck = JSON.parse(JSON.stringify(originalNutritionWithMicros));
      
      // Verify original nutrition has values before calculating
      const originalHasValues = originalNutritionWithMicros.calories?.quantity > 0 || 
                                 originalNutritionWithMicros.macros?.protein?.quantity > 0;
      
      // If no values, force fallback to recipe data
      if (!originalHasValues) {
        console.warn('⚠️ Original nutrition is empty! Using recipe data as last resort');
        originalNutritionWithMicros = {
          calories: { quantity: recipe.calories || 0, unit: 'kcal' },
          macros: {
            protein: { quantity: recipe.protein || 0, unit: 'g' },
            carbs: { quantity: recipe.carbs || 0, unit: 'g' },
            fat: { quantity: recipe.fat || 0, unit: 'g' },
            fiber: { quantity: recipe.fiber || 0, unit: 'g' }
          },
          micros: { vitamins: {}, minerals: {} }
        };
      }
      
      // Store for debug
      var debugOriginalNutritionAfterCheck = JSON.parse(JSON.stringify(originalNutritionWithMicros));
      
      console.log('🔍 Original nutrition validation:', {
        hasCalories: originalNutritionWithMicros.calories?.quantity,
        hasProtein: originalNutritionWithMicros.macros?.protein?.quantity,
        isValid: originalHasValues
      });

      // Calculate new nutrition using the NEW micronutrient-aware service
      customizations.customNutrition = await calculateNutritionForModifications(
        originalNutritionWithMicros, // Now passing FULL nutrition with micros!
        customizations.modifications,
        customizations.source,
        originalRecipe
      );
      customizations.customizationsApplied = true;
      
      console.log('✅ Calculated nutrition:', {
        hasMicros: !!customizations.customNutrition.micros,
        calories: customizations.customNutrition.calories?.quantity,
        protein: customizations.customNutrition.macros?.protein?.quantity
      });
    }

    await draftService.updateRecipeCustomizations(draftId, day, mealName, recipeId, customizations);

    console.log('🎯 Preparing customized recipe response (same format as /api/recipes/customized)...');

    // Fetch the complete recipe from cache to build the response
    const cachedRecipe = await cacheService.getRecipeByExternalId(customizations.source, recipeId);
    let baseRecipe: any;
    
    if (cachedRecipe) {
      const standardized = standardizationService.standardizeDatabaseRecipeResponse(cachedRecipe);
      baseRecipe = standardized;
    } else {
      // Fetch from API to get full recipe details including ingredients
      console.log('🔄 Recipe not in cache, fetching full details from API...');
      const recipeDetails = await multiProviderService.getRecipeDetails(recipeId);
      
      if (recipeDetails) {
        baseRecipe = {
          recipeName: recipeDetails.title || recipe.title,
          ingredients: recipeDetails.ingredients || [],
          ingredientLines: (recipeDetails as any).ingredientLines || [],
          cookingInstructions: recipeDetails.instructions || [],
          nutritionDetails: (recipeDetails as any).nutrition || {},
          caloriesPerServing: recipe.calories?.toString(),
          proteinPerServingG: recipe.protein?.toString(),
          carbsPerServingG: recipe.carbs?.toString(),
          fatPerServingG: recipe.fat?.toString(),
          fiberPerServingG: recipe.fiber?.toString(),
          servings: recipeDetails.servings || 1,
          recipeImageUrl: recipeDetails.image,
          sourceUrl: recipeDetails.sourceUrl
        };
        console.log(`✅ Fetched recipe with ${baseRecipe.ingredients.length} ingredients from API`);
      } else {
        // Last resort fallback
        baseRecipe = {
          recipeName: recipe.title,
          ingredients: recipe.ingredients || [],
          nutritionDetails: recipe.nutrition || {},
          caloriesPerServing: recipe.calories?.toString(),
          proteinPerServingG: recipe.protein?.toString(),
          carbsPerServingG: recipe.carbs?.toString(),
          fatPerServingG: recipe.fat?.toString(),
          fiberPerServingG: recipe.fiber?.toString()
        };
      }
    }

    // Helper function to get ingredient image URL from Spoonacular
    const getIngredientImage = async (ingredientName: string): Promise<string> => {
      try {
        const multiProviderService = new (await import('../../lib/multiProviderRecipeSearchService')).MultiProviderRecipeSearchService();
        const ingredientData = await multiProviderService.getIngredientNutrition(`1 ${ingredientName}`);
        if (ingredientData?.rawData?.image) {
          const image = ingredientData.rawData.image;
          // Spoonacular returns just the filename, need to add CDN URL
          if (image && !image.startsWith('http')) {
            return `https://spoonacular.com/cdn/ingredients_100x100/${image}`;
          }
          return image;
        }
      } catch (error) {
        console.log(`  ⚠️ Could not fetch image for ${ingredientName}`);
      }
      // Return empty string - frontend can show a placeholder
      return '';
    };
    
    // Create customized recipe by applying ingredient modifications
    const customizedRecipe = JSON.parse(JSON.stringify(baseRecipe));
    
    console.log(`🔍 BASE RECIPE INGREDIENTS COUNT: ${customizedRecipe.ingredients?.length || 0}`);
    if (customizedRecipe.ingredients?.length > 0) {
      console.log(`  Sample: ${customizedRecipe.ingredients.slice(0, 2).map((i: any) => i.name || i.food).join(', ')}`);
    }
    
    // Apply ingredient modifications in TWO PASSES
    // Pass 1: ADD and REPLACE to build the full ingredient list
    // Pass 2: OMIT using the full list with amounts
    if (customizations.modifications && customizations.modifications.length > 0) {
      console.log(`📝 Processing ${customizations.modifications.length} modifications`);
      console.log(`  Modifications:`, customizations.modifications.map((m: any) => `${m.type}: ${m.originalIngredient || m.newIngredient}`));
      // PASS 1: Process ADD and REPLACE first
      for (const mod of customizations.modifications) {
        if (mod.type === 'add' && mod.newIngredient) {
          // Fetch ingredient image if not provided
          const ingredientImage = (mod as any).image || await getIngredientImage(mod.newIngredient);
          
          customizedRecipe.ingredients.push({
            name: mod.newIngredient,
            amount: (mod as any).amount || null,
            unit: (mod as any).unit || null,
            image: ingredientImage,
            original: `${(mod as any).amount || ''} ${(mod as any).unit || ''} ${mod.newIngredient}`.trim()
          });
          console.log(`  ➕ Added "${mod.newIngredient}" with image: ${ingredientImage ? '✅' : '❌'}`);
        }
        else if (mod.type === 'replace' && mod.originalIngredient && mod.newIngredient) {
          let replaced = false;
          customizedRecipe.ingredients = await Promise.all(customizedRecipe.ingredients.map(async (ing: any) => {
            const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
            const targetName = mod.originalIngredient.toLowerCase();
            
            if ((ingName.includes(targetName) || targetName.includes(ingName)) && !replaced) {
              replaced = true;
              // Fetch new ingredient image if not provided
              const newImage = (mod as any).image || ing.image || await getIngredientImage(mod.newIngredient);
              
              console.log(`  🔄 Replaced "${ing.name || ing.food}" with "${mod.newIngredient}"`);
              return {
                ...ing,
                name: mod.newIngredient,
                amount: (mod as any).amount || ing.amount,
                unit: (mod as any).unit || ing.unit,
                image: newImage,
                original: `${(mod as any).amount || ing.amount || ''} ${(mod as any).unit || ing.unit || ''} ${mod.newIngredient}`.trim()
              };
            }
            return ing;
          }));
        }
      }
      
      // PASS 2: Process OMIT with full ingredient list including added items
      for (const mod of customizations.modifications) {
        if (mod.type === 'omit' && mod.originalIngredient) {
          // Find the ingredient to get its amount
          const targetName = mod.originalIngredient.toLowerCase();
          const ingredientToRemove = customizedRecipe.ingredients.find((ing: any) => {
            const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
            return ingName.includes(targetName) || targetName.includes(ingName);
          });
          
          if (ingredientToRemove) {
            console.log(`  🚫 Found ingredient to omit in customized list:`, {
              name: ingredientToRemove.name,
              amount: ingredientToRemove.amount,
              unit: ingredientToRemove.unit
            });
            
            // Store the amount for nutrition calculation
            (mod as any).amount = ingredientToRemove.amount || 1;
            (mod as any).unit = ingredientToRemove.unit || '';
            
            // Remove from ingredients list
            const originalCount = customizedRecipe.ingredients.length;
            customizedRecipe.ingredients = customizedRecipe.ingredients.filter((ing: any) => {
              const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
              return !ingName.includes(targetName) && !targetName.includes(ingName);
            });
            console.log(`  🚫 Omitted "${mod.originalIngredient}" (${originalCount} → ${customizedRecipe.ingredients.length})`);
          } else {
            console.warn(`  ⚠️ Ingredient "${mod.originalIngredient}" not found in ingredients list - cannot omit`);
            console.warn(`  ⚠️ Available ingredients:`, customizedRecipe.ingredients.map((i: any) => i.name || i.food));
          }
        }
      }
    }
    
    // Normalize cookingInstructions to array of objects with number and step
    if (customizedRecipe.cookingInstructions && Array.isArray(customizedRecipe.cookingInstructions)) {
      customizedRecipe.cookingInstructions = customizedRecipe.cookingInstructions.map((instruction: any, index: number) => {
        // If it's already an object with step, return as is
        if (typeof instruction === 'object' && instruction.step) {
          return instruction;
        }
        // If it's a string, convert to object format
        if (typeof instruction === 'string') {
          return {
            number: index + 1,
            step: instruction
          };
        }
        return instruction;
      });
    }
    
    // Format ingredients with proper image URLs (Spoonacular needs base URL prefix)
    customizedRecipe.ingredients = customizedRecipe.ingredients.map((ing: any) => ({
      id: ing.id,
      name: ing.name || ing.food,
      unit: ing.unit || '',
      amount: ing.amount || 0,
      image: ing.image ? (ing.image.startsWith('http') ? ing.image : `https://spoonacular.com/cdn/ingredients_100x100/${ing.image}`) : '',
      originalString: ing.original || ing.originalString || '',
      aisle: ing.aisle || '',
      meta: ing.meta || [],
      measures: ing.measures || {
        us: { amount: ing.amount || 0, unitLong: ing.unit || '', unitShort: ing.unit || '' },
        metric: { amount: ing.amount || 0, unitLong: ing.unit || '', unitShort: ing.unit || '' }
      }
    }));

    // Apply custom nutrition (includes micronutrients!)
    if (customizations.customNutrition) {
      const customNutrition = customizations.customNutrition;
      const hasStandardizedFormat = customNutrition.micros !== undefined;
      
      if (hasStandardizedFormat) {
        // Update nutrition details with micronutrients
        if (!customizedRecipe.nutritionDetails) {
          customizedRecipe.nutritionDetails = { macros: {}, micros: { vitamins: {}, minerals: {} }, calories: {} };
        }
        
        customizedRecipe.nutritionDetails.calories = customNutrition.calories;
        customizedRecipe.nutritionDetails.macros = customNutrition.macros;
        customizedRecipe.nutritionDetails.micros = customNutrition.micros;
        
        // Update per-serving fields
        customizedRecipe.caloriesPerServing = customNutrition.calories?.quantity?.toString();
        customizedRecipe.proteinPerServingG = customNutrition.macros?.protein?.quantity?.toString();
        customizedRecipe.carbsPerServingG = customNutrition.macros?.carbs?.quantity?.toString();
        customizedRecipe.fatPerServingG = customNutrition.macros?.fat?.quantity?.toString();
        customizedRecipe.fiberPerServingG = customNutrition.macros?.fiber?.quantity?.toString();
      }
    }

    // Prepare nutrition comparison
    const nutritionComparison: any = {
      macros: {
        original: {
          caloriesPerServing: baseRecipe.caloriesPerServing,
          proteinPerServingG: baseRecipe.proteinPerServingG,
          carbsPerServingG: baseRecipe.carbsPerServingG,
          fatPerServingG: baseRecipe.fatPerServingG,
          fiberPerServingG: baseRecipe.fiberPerServingG
        },
        customized: {
          caloriesPerServing: customizedRecipe.caloriesPerServing,
          proteinPerServingG: customizedRecipe.proteinPerServingG,
          carbsPerServingG: customizedRecipe.carbsPerServingG,
          fatPerServingG: customizedRecipe.fatPerServingG,
          fiberPerServingG: customizedRecipe.fiberPerServingG
        }
      }
    };

    if (baseRecipe.nutritionDetails?.micros && customizedRecipe.nutritionDetails?.micros) {
      nutritionComparison.micros = {
        original: {
          vitamins: baseRecipe.nutritionDetails.micros.vitamins || {},
          minerals: baseRecipe.nutritionDetails.micros.minerals || {}
        },
        customized: {
          vitamins: customizedRecipe.nutritionDetails.micros.vitamins || {},
          minerals: customizedRecipe.nutritionDetails.micros.minerals || {}
        }
      };
    }

    const customizationSummary = customizations.modifications?.map((mod: any) => ({
      type: mod.type,
      action: mod.type === 'omit' ? 'Removed' : mod.type === 'add' ? 'Added' : 'Replaced',
      ingredient: mod.type === 'omit' ? mod.originalIngredient : 
                  mod.type === 'add' ? mod.newIngredient : 
                  `${mod.originalIngredient} → ${mod.newIngredient}`,
      notes: mod.notes || null
    })) || [];

    // Return exact same structure as GET /api/recipes/customized
    return res.status(200).json({
      success: true,
      data: customizedRecipe,
      hasCustomizations: true,
      customizations: {
        modifications: customizations.modifications || [],
        customizationSummary: customizationSummary,
        appliedServings: 1,
        micronutrientsIncluded: !!(customizations.customNutrition?.micros),
        nutritionComparison: nutritionComparison,
        originalNutrition: {
          caloriesPerServing: baseRecipe.caloriesPerServing,
          proteinPerServingG: baseRecipe.proteinPerServingG,
          carbsPerServingG: baseRecipe.carbsPerServingG,
          fatPerServingG: baseRecipe.fatPerServingG,
          fiberPerServingG: baseRecipe.fiberPerServingG
        },
        customizedNutrition: {
          caloriesPerServing: customizedRecipe.caloriesPerServing,
          proteinPerServingG: customizedRecipe.proteinPerServingG,
          carbsPerServingG: customizedRecipe.carbsPerServingG,
          fatPerServingG: customizedRecipe.fatPerServingG,
          fiberPerServingG: customizedRecipe.fiberPerServingG
        }
      },
      message: 'Customizations updated successfully',
      autoCalculated: autoCalculateNutrition && !req.body.customizations.customNutrition,
      // TEMPORARY DEBUG INFO - Remove after debugging
      _debug: {
        step1_originalNutritionBeforeCheck: debugOriginalNutritionBeforeCheck,
        step2_originalNutritionAfterCheck: debugOriginalNutritionAfterCheck,
        step3_calculatedCustomNutrition: customizations.customNutrition,
        step4_baseRecipeNutrition: {
          calories: baseRecipe.caloriesPerServing,
          protein: baseRecipe.proteinPerServingG,
          carbs: baseRecipe.carbsPerServingG,
          fat: baseRecipe.fatPerServingG,
          fiber: baseRecipe.fiberPerServingG
        },
        step5_recipeFromDraft: {
          calories: recipe.calories,
          protein: recipe.protein,
          carbs: recipe.carbs,
          fat: recipe.fat,
          fiber: recipe.fiber
        },
        step6_baseRecipeIngredients: {
          count: baseRecipe.ingredients?.length || 0,
          sample: baseRecipe.ingredients?.slice(0, 3).map((i: any) => i.name || i.food) || []
        },
        step7_customizedRecipeIngredients: {
          count: customizedRecipe.ingredients?.length || 0,
          sample: customizedRecipe.ingredients?.slice(0, 3).map((i: any) => i.name || i.food) || []
        },
        cachedRecipeFound: !!cachedRecipe,
        modificationsApplied: customizations.modifications,
        source: customizations.source,
        expectedResult: `${recipe.calories} + ~2756 = ${(recipe.calories || 0) + 2756}`
      }
    });
  } catch (error) {
    console.error('❌ Error updating customizations:', error);
    return res.status(500).json({
      error: 'Failed to update customizations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Finalize draft (placeholder for future implementation)
 */
async function handleFinalizeDraft(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = finalizeDraftSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { draftId, planName } = value;

  try {
    // Verify user has access to this draft
    const draft = await draftService.getDraft(draftId);
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified draft does not exist or has expired'
      });
    }

    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this draft'
      });
    }

    // Finalize the draft (removes unselected recipes, keeps only selected ones)
    // Uses existing searchParams.startDate, no need for separate planDate
    const result = await draftService.finalizeDraft(draftId, planName);
    
    // Get the finalized plan
    const finalizedPlan = await draftService.getDraft(result.finalizedPlanId);
    
    return res.status(200).json({
      success: true,
      message: 'Draft finalized successfully',
      data: {
        planId: result.finalizedPlanId,
        status: 'finalized',
        plan: finalizedPlan
      }
    });
  } catch (error) {
    console.error('❌ Error finalizing draft:', error);
    return res.status(500).json({
      error: 'Failed to finalize draft',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Replace ingredient in finalized meal plan
 */
async function handleReplaceIngredientInPlan(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = replaceIngredientInPlanSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { planId, day, mealName, recipeId, originalIngredient, newIngredient, source } = value;

  try {
    // Verify user has access to this plan
    const plan = await draftService.getDraft(planId);
    if (!plan) {
      return res.status(404).json({
        error: 'Meal plan not found',
        message: 'The specified meal plan does not exist'
      });
    }

    if (plan.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this meal plan'
      });
    }

    // Replace ingredient using the same logic as drafts
    await draftService.replaceIngredientInFinalizedPlan(
      planId,
      day,
      mealName,
      recipeId,
      originalIngredient,
      newIngredient,
      source
    );

    // Get updated plan status
    const updatedStatus = await draftService.getDraftStatus(planId);

    return res.status(200).json({
      success: true,
      message: 'Ingredient replaced successfully in finalized meal plan',
      data: {
        replacement: {
          originalIngredient,
          newIngredient,
          day,
          mealName,
          recipeId
        },
        updatedStatus
      }
    });
  } catch (error) {
    console.error('❌ Error replacing ingredient in plan:', error);
    return res.status(500).json({
      error: 'Failed to replace ingredient',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update cooking instructions for a recipe
 */
async function handleUpdateInstructions(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = updateInstructionsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { planId, day, mealName, recipeId, instructions } = value;

  try {
    // Verify user has access to this plan
    const plan = await draftService.getDraft(planId);
    if (!plan) {
      return res.status(404).json({
        error: 'Meal plan not found',
        message: 'The specified meal plan does not exist'
      });
    }

    if (plan.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this meal plan'
      });
    }

    // Update the recipe instructions
    await draftService.updateRecipeInstructions(
      planId,
      day,
      mealName,
      recipeId,
      instructions
    );

    // Get updated plan to return the new instructions
    const updatedPlan = await draftService.getDraft(planId);
    const dayPlan = updatedPlan?.suggestions.find((d: any) => d.day === day);
    const meal = dayPlan?.meals[mealName];
    const recipe = meal?.recipes.find((r: any) => r.id === recipeId);

    return res.status(200).json({
      success: true,
      message: 'Instructions updated successfully',
      data: {
        day,
        mealName,
        recipeId,
        recipeTitle: recipe?.title,
        instructions: recipe?.instructions,
        instructionsCount: recipe?.instructions?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Error updating instructions:', error);
    return res.status(500).json({
      error: 'Failed to update instructions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Shuffle recipe suggestions - show next batch
 */
async function handleShuffleRecipes(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = shuffleRecipesSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { planId, day, mealName } = value;

  try {
    // Verify user has access to this plan
    const plan = await draftService.getDraft(planId);
    if (!plan) {
      return res.status(404).json({
        error: 'Meal plan not found',
        message: 'The specified meal plan does not exist'
      });
    }

    if (plan.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this meal plan'
      });
    }

    // Shuffle the recipes
    const result = await draftService.shuffleRecipes(planId, day, mealName);

    return res.status(200).json({
      success: true,
      message: `Shuffled ${mealName} recipes for day ${day}`,
      data: {
        day,
        mealName,
        displayedRecipes: result.displayedRecipes,
        recipesCount: result.displayedRecipes.length,
        hasMore: result.hasMore,
        canShuffleAgain: result.hasMore.edamam || result.hasMore.spoonacular
      }
    });

  } catch (error) {
    console.error('❌ Error shuffling recipes:', error);
    
    // Check if it's a "no more recipes" error
    if (error instanceof Error && error.message.includes('No more recipes available')) {
      return res.status(200).json({
        success: false,
        error: 'No more recipes available',
        message: error.message,
        data: {
          day,
          mealName,
          hasMore: { edamam: false, spoonacular: false },
          canShuffleAgain: false
        }
      });
    }

    return res.status(500).json({
      error: 'Failed to shuffle recipes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update custom notes for a recipe
 */
async function handleUpdateNotes(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = updateNotesSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { planId, day, mealName, recipeId, notes } = value;

  try {
    // Verify user has access to this plan
    const plan = await draftService.getDraft(planId);
    if (!plan) {
      return res.status(404).json({
        error: 'Meal plan not found',
        message: 'The specified meal plan does not exist'
      });
    }

    if (plan.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this meal plan'
      });
    }

    // Update the recipe notes
    await draftService.updateRecipeNotes(planId, day, mealName, recipeId, notes || null);

    // Get updated plan to return the recipe with new notes
    const updatedPlan = await draftService.getDraft(planId);
    const dayPlan = updatedPlan?.suggestions.find((d: any) => d.day === day);
    const meal = dayPlan?.meals[mealName];
    const recipe = meal?.recipes.find((r: any) => r.id === recipeId);

    return res.status(200).json({
      success: true,
      message: notes ? 'Notes updated successfully' : 'Notes cleared successfully',
      data: {
        day,
        mealName,
        recipeId,
        recipeTitle: recipe?.title,
        customNotes: recipe?.customNotes || null,
        notesLength: recipe?.customNotes?.length || 0
      }
    });

  } catch (error) {
    console.error('❌ Error updating notes:', error);
    return res.status(500).json({
      error: 'Failed to update notes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
