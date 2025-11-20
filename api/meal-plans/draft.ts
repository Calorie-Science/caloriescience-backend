import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealPlanDraftService } from '../../lib/mealPlanDraftService';
import { EdamamService } from '../../lib/edamamService';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
import { supabase } from '../../lib/supabase';
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
    source: Joi.string().valid('edamam', 'spoonacular', 'manual', 'bonhappetee', 'claude', 'grok', 'openai', 'gpt', 'chatgpt', 'gpt-4', 'gpt-3.5', 'gpt-4-turbo', 'gpt-3.5-turbo').required(),
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
    servings: Joi.number().min(0.1).max(20).optional(), // Deprecated: use nutritionServings
    nutritionServings: Joi.number().min(0.1).max(20).default(1), // Portion size multiplier for nutrition
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
    source: Joi.string().valid('edamam', 'spoonacular', 'manual', 'bonhappetee', 'claude', 'grok', 'openai', 'gpt', 'chatgpt', 'gpt-4', 'gpt-3.5', 'gpt-4-turbo', 'gpt-3.5-turbo').required(),
    modifications: Joi.array().items(
      Joi.object({
        type: Joi.string().valid('replace', 'omit', 'add').required(),
        // UNIFORM STRUCTURE: all operations use these fields
        originalIngredient: Joi.string().when('type', {
          is: Joi.string().valid('replace', 'omit'),
          then: Joi.required(),
          otherwise: Joi.forbidden()
        }),
        // Original ingredient data from recipe - REQUIRED for replace/omit to ensure correct nutrition calculation
        originalIngredientName: Joi.string().when('type', {
          is: Joi.string().valid('replace', 'omit'),
          then: Joi.optional(), // Optional but highly recommended
          otherwise: Joi.forbidden()
        }),
        originalAmount: Joi.number().min(0).when('type', {
          is: Joi.string().valid('replace', 'omit'),
          then: Joi.required(), // Required for accurate nutrition subtraction
          otherwise: Joi.forbidden()
        }),
        originalUnit: Joi.string().allow('').when('type', {
          is: Joi.string().valid('replace', 'omit'),
          then: Joi.required(), // Required (can be empty string if no unit in recipe)
          otherwise: Joi.forbidden()
        }),
        // New ingredient data - only for add/replace
        newIngredient: Joi.string().when('type', {
          is: Joi.string().valid('replace', 'add'),
          then: Joi.required(),
          otherwise: Joi.forbidden()
        }),
        amount: Joi.number().min(0).when('type', {
          is: Joi.string().valid('replace', 'add'),
          then: Joi.required(), // Required for add/replace
          otherwise: Joi.forbidden()
        }),
        unit: Joi.string().allow('').when('type', {
          is: Joi.string().valid('replace', 'add'),
          then: Joi.required(), // Required (can be empty string)
          otherwise: Joi.forbidden()
        }),
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
    servings: Joi.number().min(0.1).max(20).optional(), // Deprecated: use nutritionServings
    nutritionServings: Joi.number().min(0.1).max(20).default(1), // Portion size multiplier for nutrition
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
  source: Joi.string().valid('edamam', 'spoonacular', 'manual', 'bonhappetee', 'claude', 'grok', 'openai', 'gpt', 'chatgpt', 'gpt-4', 'gpt-3.5', 'gpt-4-turbo', 'gpt-3.5-turbo').required()
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

const changePageSchema = Joi.object({
  action: Joi.string().valid('change-page').required(),
  planId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  direction: Joi.string().valid('next', 'prev', 'specific').required(),
  pageNumber: Joi.number().integer().min(1).optional() // Required only when direction is 'specific'
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
      
      case 'change-page':
        return await handleChangePage(req, res, user);
      
      case 'update-notes':
        return await handleUpdateNotes(req, res, user);

      case 'get-alternate-recipes':
        return await handleGetAlternateRecipes(req, res, user);

      case 'swap-recipe':
        return await handleSwapRecipe(req, res, user);

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
                  
                  // DE-DUPLICATE modifications for ingredient display (keep only FIRST = most recent)
                  let modificationsForIngredients = modifications;
                  if (modifications.length > 1) {
                    const dedupedMods: any[] = [];
                    const processedIngs = new Map<string, boolean>();
                    
                    for (const mod of modifications) {
                      const ingKey = (mod.originalIngredient || mod.newIngredient)?.toLowerCase().trim();
                      if (ingKey && !processedIngs.has(ingKey)) {
                        dedupedMods.push(mod);
                        processedIngs.set(ingKey, true);
                      }
                    }
                    
                    if (dedupedMods.length < modifications.length) {
                      console.log(`  ⚠️ Deduped ingredient mods: ${modifications.length} → ${dedupedMods.length}`);
                      modificationsForIngredients = dedupedMods;
                    }
                  }
                  
                  for (const mod of modificationsForIngredients) {
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
                  
                  // NUTRITION CALCULATION STRATEGY:
                  // 1. If customNutrition exists with proper structure (has micros), TRUST IT - don't recalculate
                  // 2. Only recalculate if customNutrition is missing or incomplete
                  let finalNutrition = recipe.nutrition;
                  let finalMicronutrients = recipe.micronutrients;
                  
                  // Use the same deduplicated modifications for nutrition calculation
                  let modificationsToUse = modificationsForIngredients;
                  
                  // Check if we have valid stored customNutrition
                  const hasValidCustomNutrition = recipeCustomizations.customNutrition && 
                                                   recipeCustomizations.customNutrition.calories &&
                                                   recipeCustomizations.customNutrition.calories.quantity > 0;
                  
                  if (hasValidCustomNutrition && recipeCustomizations.customNutrition.micros) {
                    // Use stored customNutrition (already calculated correctly)
                    console.log(`  ✅ Using STORED customNutrition WITH micronutrients: ${recipeCustomizations.customNutrition.calories.quantity} kcal`);
                    finalNutrition = recipeCustomizations.customNutrition;
                    finalMicronutrients = recipeCustomizations.customNutrition.micros;
                  } else if (modificationsToUse.length > 0) {
                    // Only recalculate if customNutrition is missing or incomplete
                    console.log(`  🔄 Stored customNutrition missing/incomplete, RECALCULATING for ${modificationsToUse.length} modifications`);
                    
                    // FETCH ORIGINAL BASE RECIPE from cache/API (same as update-customizations)
                    let originalRecipe: any = null;
                    let originalNutritionWithMicros: any = null;
                    
                    // Try cache first to get full nutrition
                    const cachedRecipe = await cacheService.getRecipeByExternalId(recipe.source || 'edamam', recipe.id);
                    if (cachedRecipe) {
                      console.log('  ✅ Found original recipe in cache with micronutrients');
                      const standardized = standardizationService.standardizeDatabaseRecipeResponse(cachedRecipe);
                      originalRecipe = {
                        id: recipe.id,
                        ingredients: standardized.ingredients || []
                      };
                      
                      // Look up original amounts from cached recipe ingredients
                      for (const mod of modificationsToUse) {
                        if ((mod.type === 'replace' || mod.type === 'omit') && mod.originalIngredient && !(mod as any).originalAmount) {
                          console.log(`  🔍 Looking up original amount for: ${mod.originalIngredient} (${mod.type})`);
                          
                          const targetName = mod.originalIngredient.toLowerCase();
                          const originalIng = originalRecipe.ingredients.find((ing: any) => {
                            const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
                            return ingName.includes(targetName) || targetName.includes(ingName);
                          });
                          
                          if (originalIng) {
                            (mod as any).originalAmount = originalIng.amount || 1;
                            (mod as any).originalUnit = originalIng.unit || '';
                            console.log(`    ✅ Found original: ${originalIng.amount} ${originalIng.unit} ${originalIng.name}`);
                          } else {
                            console.warn(`    ⚠️ Could not find "${mod.originalIngredient}" in cached recipe ingredients`);
                            if (mod.type === 'replace') {
                              (mod as any).originalAmount = (mod as any).amount || 1;
                              (mod as any).originalUnit = (mod as any).unit || '';
                            } else {
                              (mod as any).originalAmount = 1;
                              (mod as any).originalUnit = '';
                            }
                          }
                        }
                      }
                      
                      // Use the FULL nutrition details with micronutrients
                      const hasNutritionData = standardized.nutritionDetails && 
                                                (standardized.nutritionDetails.calories?.quantity > 0 || 
                                                 Object.keys(standardized.nutritionDetails.macros || {}).length > 0);
                      
                      if (hasNutritionData) {
                        originalNutritionWithMicros = standardized.nutritionDetails;
                      } else {
                        // Fallback to basic nutrition
                        originalNutritionWithMicros = {
                          calories: { quantity: parseFloat(cachedRecipe.calories_per_serving || cachedRecipe.caloriesPerServing || 0), unit: 'kcal' },
                          macros: {
                            protein: { quantity: parseFloat(cachedRecipe.protein_per_serving_g || cachedRecipe.proteinPerServingG || 0), unit: 'g' },
                            carbs: { quantity: parseFloat(cachedRecipe.carbs_per_serving_g || cachedRecipe.carbsPerServingG || 0), unit: 'g' },
                            fat: { quantity: parseFloat(cachedRecipe.fat_per_serving_g || cachedRecipe.fatPerServingG || 0), unit: 'g' },
                            fiber: { quantity: parseFloat(cachedRecipe.fiber_per_serving_g || cachedRecipe.fiberPerServingG || 0), unit: 'g' }
                          },
                          micros: { vitamins: {}, minerals: {} }
                        };
                      }
                      console.log('  📊 Original recipe nutrition from cache:', {
                        calories: originalNutritionWithMicros.calories?.quantity,
                        protein: originalNutritionWithMicros.macros?.protein?.quantity,
                        vitamins: Object.keys(originalNutritionWithMicros.micros?.vitamins || {}).length,
                        minerals: Object.keys(originalNutritionWithMicros.micros?.minerals || {}).length
                      });
                    } else {
                      // If not in cache, use recipe data (might be less accurate)
                      console.warn('  ⚠️ Could not fetch original recipe from cache, using recipe data from draft');
                      originalRecipe = recipe;
                      
                      // Look up original amounts from draft recipe ingredients
                      for (const mod of modificationsToUse) {
                        if ((mod.type === 'replace' || mod.type === 'omit') && mod.originalIngredient && !(mod as any).originalAmount) {
                          console.log(`  🔍 Looking up original amount from draft for: ${mod.originalIngredient}`);
                          
                          const targetName = mod.originalIngredient.toLowerCase();
                          const recipeIngredients = recipe.ingredients || [];
                          const originalIng = recipeIngredients.find((ing: any) => {
                            const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
                            return ingName.includes(targetName) || targetName.includes(ingName);
                          });
                          
                          if (originalIng) {
                            (mod as any).originalAmount = originalIng.amount || 1;
                            (mod as any).originalUnit = originalIng.unit || '';
                            console.log(`    ✅ Found: ${originalIng.amount} ${originalIng.unit}`);
                          }
                        }
                      }
                      
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
                    
                    // Verify original nutrition has values
                    const originalHasValues = originalNutritionWithMicros.calories?.quantity > 0 || 
                                               originalNutritionWithMicros.macros?.protein?.quantity > 0;
                    
                    if (!originalHasValues) {
                      console.warn('  ⚠️ Original nutrition is empty! This will cause incorrect calculations');
                    }
                    
                    console.log('  📋 Final modifications to apply:');
                    for (const mod of modificationsToUse) {
                      if (mod.type === 'replace') {
                        console.log(`    🔄 Replace: ${(mod as any).originalAmount || '?'} ${(mod as any).originalUnit || ''} ${mod.originalIngredient} → ${(mod as any).amount || '?'} ${(mod as any).unit || ''} ${mod.newIngredient}`);
                      } else if (mod.type === 'omit') {
                        console.log(`    🚫 Omit: ${(mod as any).originalAmount || '?'} ${(mod as any).originalUnit || ''} ${mod.originalIngredient}`);
                      } else if (mod.type === 'add') {
                        console.log(`    ➕ Add: ${(mod as any).amount || '?'} ${(mod as any).unit || ''} ${mod.newIngredient}`);
                      }
                    }
                    
                    // Recalculate with IngredientCustomizationService using ORIGINAL BASE NUTRITION
                    try {
                      const recalculated = await ingredientCustomizationService.applyModifications(
                        recipe.id,
                        recipe.source || 'edamam',
                        originalNutritionWithMicros,  // Use ORIGINAL BASE nutrition!
                        modificationsToUse,  // Use deduplicated mods!
                        1
                      );
                      
                      finalNutrition = recalculated.modifiedNutrition;
                      finalMicronutrients = recalculated.modifiedNutrition.micros;
                      console.log(`  ✅ Recalculated: ${originalNutritionWithMicros.calories.quantity} → ${finalNutrition.calories.quantity} cal`);
                    } catch (error) {
                      console.error(`  ❌ Recalculation failed:`, error);
                      // Fallback to saved customNutrition if recalculation fails
                      if (recipeCustomizations.customNutrition) {
                        if (recipeCustomizations.customNutrition.micros) {
                          finalNutrition = recipeCustomizations.customNutrition;
                          finalMicronutrients = recipeCustomizations.customNutrition.micros;
                          console.log(`  ⚠️ Using saved customNutrition as fallback`);
                        }
                      }
                    }
                  } else if (hasValidCustomNutrition) {
                    // Has customNutrition but no micros (old format)
                    console.log(`  ⚠️ Using stored customNutrition (old format, macros only)`);
                      finalNutrition = {
                        ...recipe.nutrition,
                        macros: {
                        protein: { quantity: recipeCustomizations.customNutrition.macros?.protein?.quantity || recipeCustomizations.customNutrition.protein || 0, unit: 'g' },
                        carbs: { quantity: recipeCustomizations.customNutrition.macros?.carbs?.quantity || recipeCustomizations.customNutrition.carbs || 0, unit: 'g' },
                        fat: { quantity: recipeCustomizations.customNutrition.macros?.fat?.quantity || recipeCustomizations.customNutrition.fat || 0, unit: 'g' },
                        fiber: { quantity: recipeCustomizations.customNutrition.macros?.fiber?.quantity || recipeCustomizations.customNutrition.fiber || 0, unit: 'g' }
                      },
                      calories: { quantity: recipeCustomizations.customNutrition.calories?.quantity || recipeCustomizations.customNutrition.calories || 0, unit: 'kcal' }
                    };
                  }

                  // Get nutritionServings for multiplication
                  const nutritionServings = recipeCustomizations.nutritionServings || recipeCustomizations.servings || 1;

                  // Multiply finalNutrition by nutritionServings if !== 1
                  if (nutritionServings !== 1 && finalNutrition) {
                    console.log(`  🔢 Multiplying nutrition by nutritionServings: ${nutritionServings}x`);
                    finalNutrition = JSON.parse(JSON.stringify(finalNutrition)); // Deep clone

                    // Multiply calories
                    if (finalNutrition.calories) {
                      finalNutrition.calories.quantity *= nutritionServings;
                    }

                    // Multiply macros
                    if (finalNutrition.macros) {
                      for (const [key, value] of Object.entries(finalNutrition.macros)) {
                        const val = value as any;
                        if (val && typeof val.quantity === 'number') {
                          val.quantity *= nutritionServings;
                        }
                      }
                    }

                    // Multiply micros
                    if (finalNutrition.micros) {
                      if (finalNutrition.micros.vitamins) {
                        for (const [key, value] of Object.entries(finalNutrition.micros.vitamins)) {
                          const val = value as any;
                          if (val && typeof val.quantity === 'number') {
                            val.quantity *= nutritionServings;
                          }
                        }
                      }
                      if (finalNutrition.micros.minerals) {
                        for (const [key, value] of Object.entries(finalNutrition.micros.minerals)) {
                          const val = value as any;
                          if (val && typeof val.quantity === 'number') {
                            val.quantity *= nutritionServings;
                          }
                        }
                      }
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
                    nutritionServings: nutritionServings, // Use the calculated value
                    customizationsSummary: {
                      modificationsCount: modificationsToUse.length,  // Use deduplicated count
                      modifications: modificationsToUse.map((m: any) => ({  // Use deduplicated mods
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
            
            // Initialize pagination if not exists and allRecipes are available
            let pagination = meal.pagination;
            if (!pagination && meal.allRecipes) {
              const allRecipesCombined = [
                ...(meal.allRecipes.edamam || []),
                ...(meal.allRecipes.spoonacular || [])
              ];
              const recipesPerPage = 6;
              const totalRecipes = allRecipesCombined.length;
              const totalPages = Math.ceil(totalRecipes / recipesPerPage);
              
              pagination = {
                currentPage: 1,
                totalPages: totalPages,
                recipesPerPage: recipesPerPage
              };
            }

            enrichedMeals[mealName] = {
              ...meal,
              recipes: finalRecipes,
              hasCustomizations: Object.values(mealCustomizations).some((c: any) => c?.customizationsApplied),
              pagination: pagination || undefined
            };
          })
        );

        return {
          ...day,
          meals: enrichedMeals
        };
      })
    );

    // Get the nutrition status for this draft
    const status = await draftService.getDraftStatus(draftId);

    return res.status(200).json({
      success: true,
      data: {
        ...draft,
        suggestions: enrichedSuggestions,
        totalNutrition: status?.totalNutrition || null,
        dayWiseNutrition: status?.dayWiseNutrition || null,
        mealSummary: status?.mealSummary || null,
        completionStatus: status?.completionStatus || null
      },
      message: 'Draft retrieved with nutrition data'
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
 * @param recipeServings - Number of servings in the recipe (ingredients are for ALL servings, nutrition is PER SERVING)
 */
async function calculateNutritionForModifications(
  originalRecipeNutrition: any,
  modifications: any[],
  source: 'edamam' | 'spoonacular' | 'manual' | 'bonhappetee',
  originalRecipe?: any,
  recipeServings: number = 1
): Promise<any> {
  console.log('🧮 Auto-calculating nutrition with MICRONUTRIENT TRACKING...');
  console.log(`📊 Original recipe nutrition (PER SERVING):`, originalRecipeNutrition);
  console.log(`📝 Modifications count:`, modifications.length);
  console.log(`🍽️ Recipe servings:`, recipeServings);

  try {
    // Use the new IngredientCustomizationService for complete nutrition tracking
    // Pass recipeServings so it can divide ingredient nutrition correctly
    const result = await ingredientCustomizationService.applyModifications(
      originalRecipe?.id || 'recipe',
      source,
      originalRecipeNutrition,
      modifications,
      recipeServings // Pass servings so ingredient changes are divided by servings
    );

    console.log(`✅ Micronutrients included:`, result.micronutrientsIncluded);
    console.log(`✅ Modified nutrition:`, {
      calories: result.modifiedNutrition.calories.quantity,
      protein: result.modifiedNutrition.macros.protein?.quantity,
      vitamins: Object.keys(result.modifiedNutrition.micros.vitamins || {}).length,
      minerals: Object.keys(result.modifiedNutrition.micros.minerals || {}).length
    });

    // Return the full standardized nutrition object (includes micros!) AND debug steps
    return {
      ...result.modifiedNutrition,
      _calculationDebug: result.debugSteps || []
    };
    
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
 * Tries Spoonacular first, then Edamam as fallback (works for all recipe sources)
 */
async function getIngredientNutrition(
  ingredient: string,
  source: 'edamam' | 'spoonacular' | 'manual' | 'bonhappetee',
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

  // Normalize servings to nutritionServings (backward compatibility)
  if (customizations && customizations.servings !== undefined && customizations.nutritionServings === undefined) {
    customizations.nutritionServings = customizations.servings;
    console.log(`🔄 Normalized servings=${customizations.servings} to nutritionServings`);
  }

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
    
    // Block ingredient modifications for Bon Appetit recipes (but allow servings changes)
    const recipeSource = customizations.source || recipe.source;
    if (recipeSource === 'bonhappetee' && customizations.modifications && customizations.modifications.length > 0) {
      return res.status(400).json({
        error: 'Ingredient modifications not supported',
        message: 'Ingredient modifications are not available for Bon Appetit recipes. However, you can still change the serving size (nutritionServings).',
        recipe: {
          id: recipeId,
          title: recipe.title,
          source: 'bonhappetee'
        }
      });
    }
    
    // Initialize recipeServings early so it's available throughout the function
    let recipeServings: number = recipe.servings || 1;
    
    // Initialize nutrition variables at function level
    let originalNutritionWithMicros: any = null;
    
    // Initialize debug object at function level so it's always available
    const debugCacheLookup: any = {
      lookupKey: { source: customizations.source, recipeId: recipeId }
    };
    
    const debugSmartMerge: any = {
      enabled: false,
      existingCount: 0,
      newCount: 0,
      mergedCount: 0,
      deletedDueToNoChange: false,
      operations: []
    };

    // MERGE with existing modifications (frontend sends one at a time)
    // SMART MERGE: If modifying the same ingredient, replace the old modification instead of appending
    if (meal && meal.customizations) {
      const existingCustomizations = meal.customizations[recipeId];
      if (existingCustomizations?.modifications && customizations.modifications) {
        debugSmartMerge.enabled = true;
        
        const existingMods = existingCustomizations.modifications;
        const newMods = customizations.modifications;
        
        debugSmartMerge.existingCount = existingMods.length;
        debugSmartMerge.newCount = newMods.length;
        
        console.log(`🔗 SMART MERGE - Merging modifications: ${existingMods.length} existing + ${newMods.length} new`);
        console.log(`   Existing:`, JSON.stringify(existingMods, null, 2));
        console.log(`   New:`, JSON.stringify(newMods, null, 2));
        
        // For each new modification, check if we're modifying the same ingredient
        const mergedMods = [...existingMods];
        
        for (const newMod of newMods) {
          // Find if there's an existing modification for the same ingredient
          const targetIngredient = (newMod.originalIngredient || newMod.newIngredient)?.toLowerCase()?.trim();
          
          const existingModIndex = mergedMods.findIndex((existing: any, idx: number) => {
            const existingTarget = (existing.originalIngredient || existing.newIngredient)?.toLowerCase()?.trim();
            const existingNew = existing.newIngredient?.toLowerCase()?.trim();
            
            console.log(`   🔍 [${idx}] Checking match: "${targetIngredient}" vs existing "${existingTarget}"`);
            console.log(`      newMod.type: "${newMod.type}", existing.type: "${existing.type}"`);
            
            // For REPLACE modifications, check if modifying the same ingredient
            if (newMod.type === 'replace' && existing.type === 'replace') {
              const newOriginal = (newMod.originalIngredient || '').toLowerCase().trim();
              const newResult = (newMod.newIngredient || '').toLowerCase().trim();
              const existingOriginal = (existing.originalIngredient || '').toLowerCase().trim();
              const existingResult = (existing.newIngredient || '').toLowerCase().trim();
              
              console.log(`      Raw values - New: "${newMod.originalIngredient}" → "${newMod.newIngredient}"`);
              console.log(`      Raw values - Existing: "${existing.originalIngredient}" → "${existing.newIngredient}"`);
              console.log(`      Normalized - New: "${newOriginal}" → "${newResult}"`);
              console.log(`      Normalized - Existing: "${existingOriginal}" → "${existingResult}"`);
              
              // IMPROVED LOGIC: Check if both modifications target the SAME INGREDIENT
              // This works for both quantity changes (jam→jam) and replacements (butter→oil)
              const isSameIngredientChange = newOriginal === newResult && existingOriginal === existingResult && newOriginal === existingOriginal;
              console.log(`      isSameIngredientChange: ${isSameIngredientChange}`);
              
              if (isSameIngredientChange) {
                // Both are quantity changes on the same ingredient - definitely match!
                console.log(`      ✅ QUANTITY CHANGE MATCH: ${newOriginal}`);
                return true;
              }
              
              // Check if modifying the RESULT of a previous replacement (chaining)
              // Example: butter→oil (existing), then oil→coconut oil (new)
              if (newOriginal === existingResult) {
                console.log(`      ✅ CHAINED REPLACEMENT MATCH: ${existingOriginal} → ${existingResult} → ${newResult}`);
                return true;
              }
              
              // Check if both are modifying the same base ingredient
              // Example: butter→oil (existing), then butter→margarine (new)
              if (newOriginal === existingOriginal) {
                console.log(`      ✅ SAME BASE INGREDIENT MATCH: ${newOriginal}`);
                return true;
              }
            }
            
            // For OMIT modifications, match if targeting the same ingredient
            if (newMod.type === 'omit' && existing.type === 'omit' && newMod.originalIngredient && existing.originalIngredient) {
              const match = targetIngredient === existingTarget;
              console.log(`      OMIT vs OMIT match: ${match}`);
                return match;
              }
              
            // NEW: OMIT on existing REPLACE (user wants to delete an ingredient they previously modified)
            if (newMod.type === 'omit' && existing.type === 'replace' && newMod.originalIngredient && existing.originalIngredient) {
              const newOmitTarget = newMod.originalIngredient.toLowerCase().trim();
              const existingReplaceOriginal = existing.originalIngredient.toLowerCase().trim();
              const existingReplaceResult = existing.newIngredient.toLowerCase().trim();
              
              // Match if OMIT targets either the original ingredient OR the result of the REPLACE
              // Example: eggs→eggs (replace 2→3), then omit eggs should match
              const matchesOriginal = newOmitTarget === existingReplaceOriginal;
              const matchesResult = newOmitTarget === existingReplaceResult;
              const match = matchesOriginal || matchesResult;
              
              console.log(`      OMIT vs REPLACE match: ${match} (omit "${newOmitTarget}" vs replace "${existingReplaceOriginal}"→"${existingReplaceResult}")`);
              return match;
            }
            
            // For ADD modifications, match if adding the same ingredient
            if (newMod.type === 'add' && existing.type === 'add' && newMod.newIngredient && existing.newIngredient) {
              const newIngredientName = newMod.newIngredient.toLowerCase().trim();
              const existingIngredientName = existing.newIngredient.toLowerCase().trim();
              const match = newIngredientName === existingIngredientName;
              console.log(`      ADD vs ADD match: ${match}`);
              return match;
            }
            
            // Mixed types: New REPLACE/OMIT on previous ADD's result
            if ((newMod.type === 'replace' || newMod.type === 'omit') && existing.type === 'add' && newMod.originalIngredient && existing.newIngredient) {
              const match = existingNew === targetIngredient;
              console.log(`      Mixed (new REPLACE/OMIT on prev ADD) match: ${match}`);
              return match;
            }
            
            return false;
          });
          
          if (existingModIndex >= 0) {
            console.log(`  🔄 Replacing existing modification for "${targetIngredient}"`);
            const oldMod = mergedMods[existingModIndex] as any;
            
            // SPECIAL CASE: OMIT on previous ADD = complete cancellation (back to base recipe)
            if (newMod.type === 'omit' && oldMod.type === 'add') {
              console.log(`  🎯 OMIT on ADD detected - cancelling both modifications (back to base recipe)`);
              debugSmartMerge.deletedDueToNoChange = true;
              debugSmartMerge.operations.push({
                action: 'CANCEL_OUT',
                reason: 'OMIT_CANCELS_ADD',
                ingredient: targetIngredient,
                details: `ADD ${oldMod.newIngredient} then OMIT ${newMod.originalIngredient} = no net change`
              });
              mergedMods.splice(existingModIndex, 1);
              continue; // Skip to next modification
            }
            
            // Update the modification to reflect cumulative change from BASE recipe
            const updatedMod = {
              ...newMod,
              // Keep the ORIGINAL ingredient from the first modification (base recipe)
              originalIngredient: oldMod.originalIngredient || oldMod.newIngredient,
              originalAmount: oldMod.originalAmount,
              originalUnit: oldMod.originalUnit
            } as any;
            
            console.log(`    Old: ${oldMod.originalIngredient} → ${oldMod.newIngredient} (${oldMod.amount} ${oldMod.unit})`);
            console.log(`    New: ${updatedMod.originalIngredient} → ${updatedMod.newIngredient} (${updatedMod.amount} ${updatedMod.unit})`);
            
            // Check if this results in NO NET CHANGE from base recipe
            // Use Number() to ensure type-safe comparison (handles both number and string)
            const originalAmountNum = Number(updatedMod.originalAmount);
            const amountNum = Number(updatedMod.amount);
            const amountMatches = !isNaN(originalAmountNum) && !isNaN(amountNum) && originalAmountNum === amountNum;
            
            const isNoChange = updatedMod.type === 'replace' && 
                               amountMatches && 
                               updatedMod.originalUnit === updatedMod.unit &&
                               updatedMod.originalIngredient?.toLowerCase() === updatedMod.newIngredient?.toLowerCase();
            
            console.log(`  🔍 Checking for no net change:`);
            console.log(`     type: ${updatedMod.type} === 'replace' ? ${updatedMod.type === 'replace'}`);
            console.log(`     originalAmount: ${updatedMod.originalAmount} (${typeof updatedMod.originalAmount}) vs amount: ${updatedMod.amount} (${typeof updatedMod.amount})`);
            console.log(`     originalAmountNum: ${originalAmountNum} === amountNum: ${amountNum} ? ${amountMatches}`);
            console.log(`     originalUnit: "${updatedMod.originalUnit}" === unit: "${updatedMod.unit}" ? ${updatedMod.originalUnit === updatedMod.unit}`);
            console.log(`     originalIng: "${updatedMod.originalIngredient}" === newIng: "${updatedMod.newIngredient}" ? ${updatedMod.originalIngredient?.toLowerCase() === updatedMod.newIngredient?.toLowerCase()}`);
            console.log(`     isNoChange: ${isNoChange}`);
            
            if (isNoChange) {
              console.log(`  🗑️ Modification results in no net change - REMOVING it`);
              debugSmartMerge.deletedDueToNoChange = true;
              debugSmartMerge.operations.push({
                action: 'DELETE',
                reason: 'NO_NET_CHANGE',
                ingredient: targetIngredient,
                details: `${updatedMod.originalAmount} ${updatedMod.originalUnit} → ${updatedMod.amount} ${updatedMod.unit}`
              });
              mergedMods.splice(existingModIndex, 1);
            } else {
              debugSmartMerge.operations.push({
                action: 'REPLACE',
                ingredient: targetIngredient,
                oldMod: `${oldMod.originalAmount} ${oldMod.originalUnit} → ${oldMod.amount} ${oldMod.unit}`,
                newMod: `${updatedMod.originalAmount} ${updatedMod.originalUnit} → ${updatedMod.amount} ${updatedMod.unit}`
              });
            mergedMods[existingModIndex] = updatedMod;
            }
          } else {
            console.log(`  ➕ Adding new modification for "${targetIngredient}"`);
            
            // Check if this new modification results in NO NET CHANGE
            // Use Number() to ensure type-safe comparison
            const newOriginalAmountNum = Number((newMod as any).originalAmount);
            const newAmountNum = Number((newMod as any).amount);
            const newAmountMatches = !isNaN(newOriginalAmountNum) && !isNaN(newAmountNum) && newOriginalAmountNum === newAmountNum;
            
            const isNoChange = newMod.type === 'replace' && 
                               newAmountMatches && 
                               (newMod as any).originalUnit === (newMod as any).unit &&
                               newMod.originalIngredient?.toLowerCase() === newMod.newIngredient?.toLowerCase();
            
            if (isNoChange) {
              console.log(`  🗑️ New modification results in no net change - NOT adding it`);
              debugSmartMerge.deletedDueToNoChange = true;
              debugSmartMerge.operations.push({
                action: 'SKIP_ADD',
                reason: 'NO_NET_CHANGE',
                ingredient: targetIngredient,
                details: `${(newMod as any).originalAmount} ${(newMod as any).originalUnit} → ${(newMod as any).amount} ${(newMod as any).unit}`
              });
            } else {
              debugSmartMerge.operations.push({
                action: 'ADD',
                ingredient: targetIngredient,
                details: `${(newMod as any).originalAmount || '?'} ${(newMod as any).originalUnit || ''} → ${(newMod as any).amount} ${(newMod as any).unit}`
              });
            mergedMods.push(newMod);
            }
          }
        }
        
        debugSmartMerge.mergedCount = mergedMods.length;
        customizations.modifications = mergedMods;
        console.log(`  📝 Total modifications after merge: ${customizations.modifications.length}`);
        console.log(`  📋 Full list:`, customizations.modifications.map((m: any) => `${m.type}: ${m.originalIngredient || m.newIngredient} (${m.amount || '?'} ${m.unit || ''})`));
      }
    }

    // If auto-calculation is enabled and customNutrition is not provided, calculate it
    const hadStoredCustomNutrition = !!customizations.customNutrition;

    if (autoCalculateNutrition && !customizations.customNutrition) {
      console.log('🤖 Auto-calculating nutrition WITH MICRONUTRIENTS...');

      // Check if this is a simple ingredient (from simpleIngredientService)
      // Simple ingredients can have:
      // 1. 'ingredient_' prefix in ID
      // 2. isSimpleIngredient or isIngredient flags set to true
      // 3. UUID format ID (new simple ingredients stored in simple_ingredients table)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipeId);
      const isSimpleIngredient = (recipe as any).isSimpleIngredient === true ||
                                  (recipe as any).isIngredient === true ||
                                  recipeId.startsWith('ingredient_') ||
                                  (isUUID && recipe.ingredients?.length === 1); // UUID with single ingredient = simple ingredient

      console.log(`🔍 Recipe type check: isSimpleIngredient=${isSimpleIngredient}, isUUID=${isUUID}, recipeId=${recipeId}`);

      // Get the ORIGINAL unmodified recipe from cache/API with FULL NUTRITION DATA
      console.log('🔍 Getting original recipe with complete nutrition from cache/API...');
      const cacheService = new (await import('../../lib/recipeCacheService')).RecipeCacheService();
      const multiProviderService = new (await import('../../lib/multiProviderRecipeSearchService')).MultiProviderRecipeSearchService();
      const standardizationService = new (await import('../../lib/recipeResponseStandardizationService')).RecipeResponseStandardizationService();
      
      let originalRecipe: any = null;
      let cachedRecipe: any = null; // Declare here for use in debug logging later
      
      // For simple ingredients, skip cache/API lookup and fetch fresh from simple_ingredients table
      if (isSimpleIngredient) {
        console.log('✅ Simple ingredient detected - fetching fresh nutrition from simple_ingredients table');
        originalRecipe = recipe;

        // Update recipe servings for simple ingredients (always 1)
        recipeServings = recipe.servings || 1;

        // Fetch fresh nutrition from simple_ingredients table if UUID
        let freshNutrition: any = null;
        if (isUUID) {
          try {
            const { supabase } = require('../../lib/supabase');
            const { data: simpleIngredient, error } = await supabase
              .from('simple_ingredients')
              .select('*')
              .eq('id', recipeId)
              .single();

            if (simpleIngredient && !error) {
              console.log(`✅ Fetched fresh nutrition from simple_ingredients: ${simpleIngredient.name}`);
              freshNutrition = {
                calories: { quantity: parseFloat(simpleIngredient.calories) || 0, unit: 'kcal' },
                macros: {
                  protein: { quantity: parseFloat(simpleIngredient.protein_g) || 0, unit: 'g' },
                  carbs: { quantity: parseFloat(simpleIngredient.carbs_g) || 0, unit: 'g' },
                  fat: { quantity: parseFloat(simpleIngredient.fat_g) || 0, unit: 'g' },
                  fiber: { quantity: parseFloat(simpleIngredient.fiber_g) || 0, unit: 'g' },
                  sugar: { quantity: parseFloat(simpleIngredient.sugar_g) || 0, unit: 'g' },
                  sodium: { quantity: parseFloat(simpleIngredient.sodium_mg) || 0, unit: 'mg' },
                  saturatedFat: { quantity: parseFloat(simpleIngredient.saturated_fat_g) || 0, unit: 'g' },
                  cholesterol: { quantity: parseFloat(simpleIngredient.cholesterol_mg) || 0, unit: 'mg' }
                },
                micros: { vitamins: {}, minerals: {} } // TODO: Add micronutrients from simple_ingredients if needed
              };
            }
          } catch (error) {
            console.warn('⚠️ Could not fetch from simple_ingredients table:', error);
          }
        }

        // Look up original amounts from recipe ingredients
        for (const mod of customizations.modifications) {
          if ((mod.type === 'replace' || mod.type === 'omit') && mod.originalIngredient && !(mod as any).originalAmount) {
            console.log(`🔍 Looking up original amount for simple ingredient: ${mod.originalIngredient} (${mod.type})`);

            const targetName = mod.originalIngredient.toLowerCase();
            const recipeIngredients = recipe.ingredients || [];
            const originalIng = recipeIngredients.find((ing: any) => {
              const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
              return ingName.includes(targetName) || targetName.includes(ingName);
            });

            if (originalIng) {
              (mod as any).originalAmount = originalIng.amount || 1;
              (mod as any).originalUnit = originalIng.unit || '';
              console.log(`  ✅ Found original: ${originalIng.amount} ${originalIng.unit} ${originalIng.name}`);
            } else {
              console.warn(`  ⚠️ Could not find "${mod.originalIngredient}" in simple ingredient recipe`);
              // Use defaults
              if (mod.type === 'replace') {
                (mod as any).originalAmount = (mod as any).amount || 1;
                (mod as any).originalUnit = (mod as any).unit || '';
              } else {
                (mod as any).originalAmount = 1;
                (mod as any).originalUnit = '';
              }
            }
          }
        }

        // Use fresh nutrition from database if available, otherwise fall back to recipe data
        if (freshNutrition) {
          originalNutritionWithMicros = freshNutrition;
        } else {
          // Get nutrition from recipe data (fallback)
          const extractNumber = (value: any) => {
            if (typeof value === 'number') return value;
            if (value?.quantity !== undefined) return value.quantity;
            return 0;
          };

          // Check if recipe has nutrition object or flat values
          const recipeAny = recipe as any;
          if (recipeAny.nutrition && typeof recipeAny.nutrition === 'object') {
            originalNutritionWithMicros = recipeAny.nutrition;
          } else {
            // Build nutrition object from flat values
            originalNutritionWithMicros = {
              calories: { quantity: extractNumber(recipe.calories), unit: 'kcal' },
              macros: {
                protein: { quantity: extractNumber(recipe.protein), unit: 'g' },
                carbs: { quantity: extractNumber(recipe.carbs), unit: 'g' },
                fat: { quantity: extractNumber(recipe.fat), unit: 'g' },
                fiber: { quantity: extractNumber(recipe.fiber), unit: 'g' },
                sugar: { quantity: extractNumber(recipeAny.sugar || recipeAny.nutrition?.macros?.sugar), unit: 'g' },
                sodium: { quantity: extractNumber(recipeAny.sodium || recipeAny.nutrition?.macros?.sodium), unit: 'mg' }
              },
              micros: recipeAny.nutrition?.micros || { vitamins: {}, minerals: {} }
            };
          }
        }
        
        console.log('✅ Using nutrition from simple ingredient:', {
          calories: originalNutritionWithMicros.calories?.quantity,
          protein: originalNutritionWithMicros.macros?.protein?.quantity,
          vitaminsCount: Object.keys(originalNutritionWithMicros.micros?.vitamins || {}).length,
          mineralsCount: Object.keys(originalNutritionWithMicros.micros?.minerals || {}).length
        });
        
        // For simple ingredients: if nutritionServings parameter is provided and no modifications,
        // just use the original nutrition (multiplication happens later)
        const requestedServings = customizations.nutritionServings || customizations.servings || 1;
        if (requestedServings !== 1 && (!customizations.modifications || customizations.modifications.length === 0)) {
          console.log(`🔢 Simple ingredient with nutritionServings (no modifications) - using original nutrition`);

          // Set customNutrition to original per-serving values
          // The multiplication by nutritionServings happens in calculateMealTotalNutrition
          customizations.customNutrition = JSON.parse(JSON.stringify(originalNutritionWithMicros));
          customizations.customizationsApplied = requestedServings !== 1; // Mark as applied so calc uses customNutrition

          console.log('✅ Set customNutrition to original per-serving values:', {
            servings: requestedServings,
            originalCalories: originalNutritionWithMicros.calories?.quantity,
            customizationsApplied: customizations.customizationsApplied
          });

          // Skip the normal modification calculation below since we already have customNutrition
        }
      } else {
        // Normalize GPT variants to 'openai' first
        let normalizedSource = customizations.source;
        if (['gpt', 'chatgpt', 'gpt-4', 'gpt-3.5', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(customizations.source.toLowerCase())) {
          console.log(`🔄 Normalizing source "${customizations.source}" to "openai"`);
          normalizedSource = 'openai';
          customizations.source = 'openai'; // Update the customizations object
        }

        // Check if this is an AI-generated recipe (claude, grok, openai)
        // AI-generated recipes should NOT be fetched from cache/API
        const isAIGeneratedRecipe = ['claude', 'grok', 'openai'].includes(normalizedSource);

        // Normal recipe - try cache first to get full nutrition (skip for AI-generated)
        if (!isAIGeneratedRecipe) {
          cachedRecipe = await cacheService.getRecipeByExternalId(customizations.source, recipeId);
          debugCacheLookup.found = !!cachedRecipe;
          debugCacheLookup.cachedRecipeServings = cachedRecipe?.servings;
          debugCacheLookup.cachedRecipeServingsType = typeof cachedRecipe?.servings;
        } else {
          console.log(`🤖 AI-generated recipe detected (${customizations.source}) - skipping cache lookup`);
          debugCacheLookup.isAIGenerated = true;
          debugCacheLookup.found = false;
        }
      
      if (cachedRecipe) {
        const standardized = standardizationService.standardizeDatabaseRecipeResponse(cachedRecipe);
        originalRecipe = {
          id: recipeId,
          ingredients: standardized.ingredients || []
        };
        
        // Update servings from cached recipe
        const cachedServings = cachedRecipe.servings;
        recipeServings = cachedServings || 4;
        debugCacheLookup.recipeServingsUsed = recipeServings;
        debugCacheLookup.defaultedTo4 = !cachedServings;
        
        // NOW look up original amounts from cached recipe ingredients BEFORE calculating nutrition
        for (const mod of customizations.modifications) {
          if ((mod.type === 'replace' || mod.type === 'omit') && mod.originalIngredient && !(mod as any).originalAmount) {
            console.log(`🔍 Looking up original amount for: ${mod.originalIngredient} (${mod.type})`);
            
            const targetName = mod.originalIngredient.toLowerCase();
            const originalIng = originalRecipe.ingredients.find((ing: any) => {
              const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
              return ingName.includes(targetName) || targetName.includes(ingName);
            });
            
            if (originalIng) {
              (mod as any).originalAmount = originalIng.amount || 1;
              (mod as any).originalUnit = originalIng.unit || '';
              console.log(`  ✅ Found original: ${originalIng.amount} ${originalIng.unit} ${originalIng.name}`);
            } else {
              console.warn(`  ⚠️ Could not find "${mod.originalIngredient}" in cached recipe ingredients`);
              // For REPLACE, use new amount as fallback; for OMIT, default to 1
              if (mod.type === 'replace') {
                (mod as any).originalAmount = (mod as any).amount || 1;
                (mod as any).originalUnit = (mod as any).unit || '';
              } else {
                (mod as any).originalAmount = 1;
                (mod as any).originalUnit = '';
              }
            }
          }
        }
        // Use the FULL nutrition details with micronutrients
        // Check if nutritionDetails has actual data (not just empty object)
        debugCacheLookup.nutritionDetails = {
          exists: !!standardized.nutritionDetails,
          calories: standardized.nutritionDetails?.calories,
          macrosKeys: Object.keys(standardized.nutritionDetails?.macros || {})
        };
        
        const hasNutritionData = standardized.nutritionDetails && 
                                  (standardized.nutritionDetails.calories?.quantity > 0 || 
                                   Object.keys(standardized.nutritionDetails.macros || {}).length > 0);
        
        debugCacheLookup.hasNutritionData = hasNutritionData;
        
        if (hasNutritionData) {
          originalNutritionWithMicros = standardized.nutritionDetails;
          debugCacheLookup.nutritionSource = 'standardized.nutritionDetails';
        } else {
          // Fallback to recipe data from draft
          // Handle both number format (automated) and object format (manual meal plans)
          debugCacheLookup.nutritionSource = 'draft recipe fallback';
          const extractNumber = (value: any) => {
            if (typeof value === 'number') return value;
            if (value?.quantity) return value.quantity;
            return 0;
          };
          
          originalNutritionWithMicros = {
            calories: { quantity: extractNumber(recipe.calories), unit: 'kcal' },
            macros: {
              protein: { quantity: extractNumber(recipe.protein), unit: 'g' },
              carbs: { quantity: extractNumber(recipe.carbs), unit: 'g' },
              fat: { quantity: extractNumber(recipe.fat), unit: 'g' },
              fiber: { quantity: extractNumber(recipe.fiber), unit: 'g' }
            },
            micros: { vitamins: {}, minerals: {} }
          };
        }
        debugCacheLookup.finalNutrition = {
          calories: originalNutritionWithMicros.calories?.quantity,
          protein: originalNutritionWithMicros.macros?.protein?.quantity,
          vitaminsCount: Object.keys(originalNutritionWithMicros.micros?.vitamins || {}).length,
          mineralsCount: Object.keys(originalNutritionWithMicros.micros?.minerals || {}).length
        };
      } else {
        // Cache lookup failed - check if AI-generated or fetch from API
        // (normalizedSource and isAIGeneratedRecipe already computed above)
        if (isAIGeneratedRecipe) {
          // AI-generated recipes don't exist in external APIs - use nutrition from draft
          console.log(`🤖 AI-generated recipe detected (${customizations.source}) - using nutrition from draft`);
          debugCacheLookup.isAIGenerated = true;

          // Helper function to extract nutrition value (handles both 'value' and 'quantity' for backward compatibility)
          const getNutritionValue = (nutrient: any): number => {
            if (!nutrient) return 0;
            if (typeof nutrient === 'number') return nutrient;
            return nutrient.quantity || nutrient.value || 0;
          };

          // Build nutrition from recipe data in draft
          const recipeAny = recipe as any;

          // CRITICAL FIX: For AI recipes, use baseNutrition if it exists (true original before any modifications)
          // Otherwise use recipe.nutrition (which might already be modified)
          const nutritionSource = recipeAny.baseNutrition || recipeAny.nutrition;

          if (recipeAny.baseNutrition) {
            console.log('  ✅ Using baseNutrition for AI recipe (true original, not modified)');
            originalNutritionWithMicros = recipeAny.baseNutrition;
          } else if (nutritionSource && typeof nutritionSource === 'object') {
            console.log('  ⚠️ Using recipe.nutrition (may already be modified if no baseNutrition)');
            originalNutritionWithMicros = nutritionSource;
          } else {
            // Build nutrition object from flat values
            console.log('  ⚠️ Building nutrition from flat values');
            originalNutritionWithMicros = {
              calories: { quantity: getNutritionValue(recipe.calories), unit: 'kcal' },
              macros: {
                protein: { quantity: getNutritionValue(recipe.protein), unit: 'g' },
                carbs: { quantity: getNutritionValue(recipe.carbs), unit: 'g' },
                fat: { quantity: getNutritionValue(recipe.fat), unit: 'g' },
                fiber: { quantity: getNutritionValue(recipe.fiber), unit: 'g' },
                sugar: { quantity: getNutritionValue(recipeAny.sugar || recipeAny.nutrition?.macros?.sugar), unit: 'g' },
                sodium: { quantity: getNutritionValue(recipeAny.sodium || recipeAny.nutrition?.macros?.sodium), unit: 'mg' }
              },
              micros: recipeAny.nutrition?.micros || { vitamins: {}, minerals: {} }
            };
          }

          // Set recipe servings
          recipeServings = recipe.servings || 1;

          // Set originalRecipe with ingredients from draft
          originalRecipe = {
            id: recipeId,
            ingredients: recipe.ingredients || [],
            servings: recipeServings
          };

          // Look up original amounts from recipe ingredients
          for (const mod of customizations.modifications) {
            if ((mod.type === 'replace' || mod.type === 'omit') && mod.originalIngredient && !(mod as any).originalAmount) {
              console.log(`🔍 Looking up original amount for AI recipe: ${mod.originalIngredient} (${mod.type})`);

              const targetName = mod.originalIngredient.toLowerCase();
              const recipeIngredients = recipe.ingredients || [];
              const originalIng = recipeIngredients.find((ing: any) => {
                const ingName = (ing.name || ing.food || ing.text || ing.original || '').toLowerCase();
                return ingName.includes(targetName) || targetName.includes(ingName);
              });

              if (originalIng) {
                (mod as any).originalAmount = originalIng.amount || 1;
                (mod as any).originalUnit = originalIng.unit || '';
                console.log(`  ✅ Found original: ${(mod as any).originalAmount} ${(mod as any).originalUnit} ${originalIng.name}`);
              } else {
                console.warn(`  ⚠️ Could not find "${mod.originalIngredient}" in AI recipe ingredients`);
                // Use defaults
                if (mod.type === 'replace') {
                  (mod as any).originalAmount = (mod as any).amount || 1;
                  (mod as any).originalUnit = (mod as any).unit || '';
                } else {
                  (mod as any).originalAmount = 1;
                  (mod as any).originalUnit = '';
                }
              }
            }
          }

          console.log('✅ Using nutrition from AI recipe:', {
            calories: originalNutritionWithMicros.calories?.quantity,
            protein: originalNutritionWithMicros.macros?.protein?.quantity,
            servings: recipeServings
          });

          debugCacheLookup.finalNutrition = {
            calories: originalNutritionWithMicros.calories?.quantity,
            protein: originalNutritionWithMicros.macros?.protein?.quantity,
            vitaminsCount: Object.keys(originalNutritionWithMicros.micros?.vitamins || {}).length,
            mineralsCount: Object.keys(originalNutritionWithMicros.micros?.minerals || {}).length
          };
        } else {
          // Fetch from API if not in cache (for non-AI recipes)
          debugCacheLookup.fetchedFromAPI = true;
          let recipeDetails: any = null;
          try {
            // Pass the provider/source to avoid auto-detection issues with UUIDs
            const provider = customizations.source as 'edamam' | 'spoonacular' | 'bonhappetee' | 'manual' | undefined;
            recipeDetails = await multiProviderService.getRecipeDetails(recipeId, provider);
          } catch (error) {
            console.warn(`⚠️ Could not fetch recipe from API: ${error instanceof Error ? error.message : 'Unknown error'}`);
            debugCacheLookup.apiFetchError = error instanceof Error ? error.message : 'Unknown error';
          }

        if (recipeDetails) {
          debugCacheLookup.apiRecipeServings = recipeDetails.servings;
          originalRecipe = {
            id: recipeId,
            ingredients: recipeDetails.ingredients || [],
            servings: recipeDetails.servings || 4 // CRITICAL: Store servings from API!
          };
          
          // Update servings from API response
          recipeServings = recipeDetails.servings || 4;
          debugCacheLookup.recipeServingsUsed = recipeServings;
          debugCacheLookup.defaultedTo4 = !recipeDetails.servings;
          
          // CACHE THE RECIPE for future use!
          try {
            // NOTE: multiProviderService.getRecipeDetails() already returns transformed nutrition
            // So we just use it directly, no need to transform again!
            let nutritionDetails: any = null;
            
            if ((recipeDetails as any).nutrition) {
              nutritionDetails = (recipeDetails as any).nutrition;
              console.log(`  💾 Using pre-transformed nutrition for caching: protein=${nutritionDetails?.macros?.protein?.quantity || 0}g`);
            } else {
              console.warn(`  ⚠️ No nutrition data in API response for recipe ${recipeId}`);
            }
            
            // Only cache if we have complete nutrition with detailed macros
            const hasCompleteNutrition = !!(nutritionDetails?.macros?.protein?.quantity);
            
            if (!hasCompleteNutrition) {
              console.log('⚠️ Skipping cache - incomplete nutrition data. Recipe will be fetched fresh when needed.');
            } else {
            const recipeToCache: any = {
              provider: customizations.source,
              externalRecipeId: recipeId,
              externalRecipeUri: (recipeDetails as any).sourceUrl || (recipeDetails as any).uri,
              recipeName: recipeDetails.title,
              recipeSource: customizations.source,
              recipeUrl: (recipeDetails as any).sourceUrl,
              recipeImageUrl: recipeDetails.image,
              cuisineTypes: (recipeDetails as any).cuisines || (recipeDetails as any).cuisineType || [],
              mealTypes: (recipeDetails as any).mealTypes || (recipeDetails as any).mealType || [],
              dishTypes: (recipeDetails as any).dishTypes || (recipeDetails as any).dishType || [],
              healthLabels: (recipeDetails as any).healthLabels || [],
              dietLabels: (recipeDetails as any).diets || (recipeDetails as any).dietLabels || [],
              servings: recipeDetails.servings,
              prepTimeMinutes: (recipeDetails as any).prepTimeMinutes || null,
              cookTimeMinutes: (recipeDetails as any).cookTimeMinutes || null,
              totalTimeMinutes: (recipeDetails as any).readyInMinutes || (recipeDetails as any).totalTimeMinutes,
              caloriesPerServing: (recipeDetails as any).calories?.toString() || recipeDetails.calories?.toString(),
              proteinPerServingG: (recipeDetails as any).protein?.toString() || recipeDetails.protein?.toString(),
              carbsPerServingG: (recipeDetails as any).carbs?.toString() || recipeDetails.carbs?.toString(),
              fatPerServingG: (recipeDetails as any).fat?.toString() || recipeDetails.fat?.toString(),
              fiberPerServingG: (recipeDetails as any).fiber?.toString() || recipeDetails.fiber?.toString(),
              ingredients: recipeDetails.ingredients,
              ingredientLines: (recipeDetails as any).ingredientLines || [],
              cookingInstructions: (recipeDetails as any).instructions || [],
              nutritionDetails: nutritionDetails, // Use properly transformed nutrition
              originalApiResponse: recipeDetails,
              hasCompleteNutrition: !!(nutritionDetails?.macros?.protein?.quantity),
              hasDetailedIngredients: !!(recipeDetails.ingredients && recipeDetails.ingredients.length > 0),
              hasCookingInstructions: !!((recipeDetails as any).instructions && (recipeDetails as any).instructions.length > 0),
              dataQualityScore: 85
            };
            await cacheService.storeRecipe(recipeToCache);
            console.log('  ✅ Recipe cached successfully with complete nutrition');
            }
          } catch (cacheError) {
            console.error('  ⚠️ Failed to cache recipe:', cacheError);
            // Don't fail the request if caching fails
          }
          
          // Look up original amounts from API recipe ingredients
          for (const mod of customizations.modifications) {
            if ((mod.type === 'replace' || mod.type === 'omit') && mod.originalIngredient && !(mod as any).originalAmount) {
              console.log(`🔍 Looking up original amount for: ${mod.originalIngredient} (${mod.type})`);
              
              const targetName = mod.originalIngredient.toLowerCase();
              const originalIng = originalRecipe.ingredients.find((ing: any) => {
                const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
                return ingName.includes(targetName) || targetName.includes(ingName);
              });
              
              if (originalIng) {
                (mod as any).originalAmount = originalIng.amount || 1;
                (mod as any).originalUnit = originalIng.unit || '';
                console.log(`  ✅ Found original: ${originalIng.amount} ${originalIng.unit} ${originalIng.name}`);
              }
            }
          }
          
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
        } // Close else block for non-AI recipes (API fetch)
      } // Close else block for when not in cache
      } // End of else block for normal recipes (not simple ingredients)

      if (!originalRecipe || !originalNutritionWithMicros) {
        console.warn('⚠️ Could not get original recipe, using simplified nutrition from draft');
        originalRecipe = recipe;
        
        // Look up original amounts from draft recipe ingredients as last resort
        for (const mod of customizations.modifications) {
          if ((mod.type === 'replace' || mod.type === 'omit') && mod.originalIngredient && !(mod as any).originalAmount) {
            console.log(`🔍 Looking up original amount from draft recipe for: ${mod.originalIngredient} (${mod.type})`);
            
            const targetName = mod.originalIngredient.toLowerCase();
            const recipeIngredients = recipe.ingredients || [];
            const originalIng = recipeIngredients.find((ing: any) => {
              const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
              return ingName.includes(targetName) || targetName.includes(ingName);
            });
            
            if (originalIng) {
              (mod as any).originalAmount = originalIng.amount || 1;
              (mod as any).originalUnit = originalIng.unit || '';
              console.log(`  ✅ Found original: ${originalIng.amount} ${originalIng.unit} ${originalIng.name}`);
            }
          }
        }
        
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
      
      // DE-DUPLICATE modifications for nutrition calculation (keep only LAST = most recent)
      // Iterate BACKWARDS to keep the most recent modification for each ingredient
      const dedupedForNutrition: any[] = [];
      const processedForNutrition = new Map<string, boolean>();
      
      for (let i = customizations.modifications.length - 1; i >= 0; i--) {
        const mod = customizations.modifications[i];
        const ingredientKey = (mod.originalIngredient || mod.newIngredient)?.toLowerCase().trim();
        
        if (ingredientKey && !processedForNutrition.has(ingredientKey)) {
          dedupedForNutrition.unshift(mod); // Add to beginning to maintain order
          processedForNutrition.set(ingredientKey, true);
        }
      }
      
      if (dedupedForNutrition.length < customizations.modifications.length) {
        console.log(`⚠️ Found duplicate modifications! Deduplicating for nutrition calculation:`);
        console.log(`   Original count: ${customizations.modifications.length}`);
        console.log(`   After dedup: ${dedupedForNutrition.length}`);
        customizations.modifications = dedupedForNutrition;
      }
      
      // Log final modification details after all lookups
      console.log('📋 Final modifications with amounts:');
      for (const mod of customizations.modifications) {
        if (mod.type === 'replace') {
          console.log(`  🔄 Replace: ${(mod as any).originalAmount || '?'} ${(mod as any).originalUnit || ''} ${mod.originalIngredient} → ${(mod as any).amount || '?'} ${(mod as any).unit || ''} ${mod.newIngredient}`);
        } else if (mod.type === 'omit') {
          console.log(`  🚫 Omit: ${(mod as any).originalAmount || '?'} ${(mod as any).originalUnit || ''} ${mod.originalIngredient}`);
        } else if (mod.type === 'add') {
          console.log(`  ➕ Add: ${(mod as any).amount || '?'} ${(mod as any).unit || ''} ${mod.newIngredient}`);
        }
      }
      
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

      // Handle nutritionServings changes when there are NO modifications (for ALL recipes)
      const hasModifications = customizations.modifications && customizations.modifications.length > 0;
      if (!hasModifications && !customizations.customNutrition) {
        console.log(`🔢 No modifications - using original nutrition (will be multiplied later by nutritionServings)`);

        // Set customNutrition to original (per-serving) values
        // The multiplication by nutritionServings happens in calculateMealTotalNutrition
        customizations.customNutrition = JSON.parse(JSON.stringify(originalNutritionWithMicros));

        // Mark as applied if nutritionServings != 1, so calculateMealTotalNutrition uses customNutrition
        const nutritionServings = customizations.nutritionServings || customizations.servings || 1;
        customizations.customizationsApplied = nutritionServings !== 1;

        console.log('✅ Set customNutrition to original per-serving values:', {
          calories: originalNutritionWithMicros.calories?.quantity,
          protein: originalNutritionWithMicros.macros?.protein?.quantity,
          nutritionServings,
          customizationsApplied: customizations.customizationsApplied
        });
      }

      // Calculate new nutrition using the NEW micronutrient-aware service
      // Pass recipe servings so ingredient changes are correctly divided
      // SKIP if customNutrition was already calculated (e.g., for simple ingredients with servings only)
      if (!customizations.customNutrition) {
        console.log(`🚨🚨🚨 CRITICAL DEBUG 🚨🚨🚨`);
        console.log(`Recipe servings breakdown:`);
        console.log(`  - recipe.servings (from draft): ${recipe.servings}`);
        console.log(`  - cachedRecipe?.servings: ${cachedRecipe?.servings}`);
        console.log(`  - originalRecipe.servings: ${(originalRecipe as any)?.servings}`);
        console.log(`  - FINAL recipeServings being passed: ${recipeServings}`);
        console.log(`🚨🚨🚨 END DEBUG 🚨🚨🚨`);
        
        customizations.customNutrition = await calculateNutritionForModifications(
          originalNutritionWithMicros, // Now passing FULL nutrition with micros!
          customizations.modifications,
          customizations.source,
          originalRecipe,
          recipeServings // Pass servings so ingredient changes are divided by servings
        );
        customizations.customizationsApplied = true;
      } else {
        console.log('⏭️  Skipping nutrition calculation - already calculated via servings multiplier');
      }
      
      console.log('✅ Calculated nutrition:', {
        hasMicros: !!customizations.customNutrition.micros,
        calories: customizations.customNutrition.calories?.quantity,
        protein: customizations.customNutrition.macros?.protein?.quantity
      });
    }

    await draftService.updateRecipeCustomizations(draftId, day, mealName, recipeId, customizations);

    console.log('🎯 Preparing customized recipe response (same format as /api/recipes/customized)...');

    // Check if this is an AI-generated recipe (skip cache/API for these)
    const responseIsAIGenerated = ['claude', 'grok', 'openai', 'gpt', 'chatgpt', 'gpt-4', 'gpt-3.5', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(customizations.source.toLowerCase());

    // Fetch the complete recipe from cache to build the response (skip for AI-generated)
    const cachedRecipeForResponse = responseIsAIGenerated ? null : await cacheService.getRecipeByExternalId(customizations.source, recipeId);
    let baseRecipe: any;

    if (cachedRecipeForResponse) {
      const standardized = standardizationService.standardizeDatabaseRecipeResponse(cachedRecipeForResponse);
      baseRecipe = standardized;
    } else if (responseIsAIGenerated) {
      // AI-generated recipes: use the recipe data from draft
      console.log('🤖 AI-generated recipe - using data from draft');

      // Transform AI recipe ingredients from Edamam format (food/quantity/measure) to Spoonacular format (name/amount/unit)
      const transformedIngredients = (recipe.ingredients || []).map((ing: any) => {
        // AI recipes can use either format: {food, quantity, measure} or {name, amount, unit}
        const ingredientName = ing.name || ing.food || ing.text || '';
        const ingredientAmount = ing.amount !== undefined ? ing.amount : (ing.quantity || 0);
        const ingredientUnit = ing.unit || ing.measure || '';

        return {
          name: ingredientName,
          amount: ingredientAmount,
          unit: ingredientUnit,
          image: ing.image || '',
          originalString: ing.text || ing.original || `${ingredientAmount} ${ingredientUnit} ${ingredientName}`.trim(),
          aisle: ing.aisle || '',
          meta: ing.meta || [],
          measures: {
            us: {
              amount: ingredientAmount,
              unitLong: ingredientUnit,
              unitShort: ingredientUnit
            },
            metric: {
              amount: ingredientAmount,
              unitLong: ingredientUnit,
              unitShort: ingredientUnit
            }
          }
        };
      });

      baseRecipe = {
        recipeName: recipe.title,
        ingredients: transformedIngredients,
        ingredientLines: (recipe as any).ingredientLines || [],
        cookingInstructions: recipe.instructions || [],
        nutritionDetails: (recipe as any).nutrition || originalNutritionWithMicros,
        caloriesPerServing: (typeof recipe.calories === 'object' ? (recipe.calories as any).quantity : recipe.calories)?.toString(),
        proteinPerServingG: (typeof recipe.protein === 'object' ? (recipe.protein as any).quantity : recipe.protein)?.toString(),
        carbsPerServingG: (typeof recipe.carbs === 'object' ? (recipe.carbs as any).quantity : recipe.carbs)?.toString(),
        fatPerServingG: (typeof recipe.fat === 'object' ? (recipe.fat as any).quantity : recipe.fat)?.toString(),
        fiberPerServingG: (typeof recipe.fiber === 'object' ? (recipe.fiber as any).quantity : recipe.fiber)?.toString(),
        servings: recipe.servings || 1,
        recipeImageUrl: recipe.image,
        sourceUrl: recipe.sourceUrl
      };
    } else {
      // Fetch from API to get full recipe details including ingredients
      console.log('🔄 Recipe not in cache, fetching full details from API...');
      const recipeDetails = await multiProviderService.getRecipeDetails(recipeId, customizations.source as any);
      
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
        
        // CACHE THE RECIPE for future use!
        try {
          // NOTE: multiProviderService.getRecipeDetails() already returns transformed nutrition
          // So we just use it directly, no need to transform again!
          let nutritionDetails: any = null;
          
          if ((recipeDetails as any).nutrition) {
            nutritionDetails = (recipeDetails as any).nutrition;
            console.log(`  💾 Using pre-transformed nutrition for caching: protein=${nutritionDetails?.macros?.protein?.quantity || 0}g`);
          } else {
            console.warn(`  ⚠️ No nutrition data in API response for recipe ${recipeId}`);
          }
          
          // Only cache if we have complete nutrition with detailed macros
          const hasCompleteNutrition = !!(nutritionDetails?.macros?.protein?.quantity);
          
          if (!hasCompleteNutrition) {
            console.log('⚠️ Skipping cache - incomplete nutrition data. Recipe will be fetched fresh when needed.');
          } else {
          const recipeToCache: any = {
            provider: customizations.source,
            externalRecipeId: recipeId,
            externalRecipeUri: (recipeDetails as any).sourceUrl || (recipeDetails as any).uri,
            recipeName: recipeDetails.title,
            recipeSource: customizations.source,
            recipeUrl: (recipeDetails as any).sourceUrl,
            recipeImageUrl: recipeDetails.image,
            cuisineTypes: (recipeDetails as any).cuisines || (recipeDetails as any).cuisineType || [],
            mealTypes: (recipeDetails as any).mealTypes || (recipeDetails as any).mealType || [],
            dishTypes: (recipeDetails as any).dishTypes || (recipeDetails as any).dishType || [],
            healthLabels: (recipeDetails as any).healthLabels || [],
            dietLabels: (recipeDetails as any).diets || (recipeDetails as any).dietLabels || [],
            servings: recipeDetails.servings,
            prepTimeMinutes: (recipeDetails as any).prepTimeMinutes || null,
            cookTimeMinutes: (recipeDetails as any).cookTimeMinutes || null,
            totalTimeMinutes: (recipeDetails as any).readyInMinutes || (recipeDetails as any).totalTimeMinutes,
            caloriesPerServing: (recipeDetails as any).calories?.toString() || recipeDetails.calories?.toString(),
            proteinPerServingG: (recipeDetails as any).protein?.toString() || recipeDetails.protein?.toString(),
            carbsPerServingG: (recipeDetails as any).carbs?.toString() || recipeDetails.carbs?.toString(),
            fatPerServingG: (recipeDetails as any).fat?.toString() || recipeDetails.fat?.toString(),
            fiberPerServingG: (recipeDetails as any).fiber?.toString() || recipeDetails.fiber?.toString(),
            ingredients: recipeDetails.ingredients,
            ingredientLines: (recipeDetails as any).ingredientLines || [],
            cookingInstructions: (recipeDetails as any).instructions || [],
            nutritionDetails: nutritionDetails, // Use properly transformed nutrition
            originalApiResponse: recipeDetails,
            hasCompleteNutrition: !!(nutritionDetails?.macros?.protein?.quantity),
            hasDetailedIngredients: !!(recipeDetails.ingredients && recipeDetails.ingredients.length > 0),
            hasCookingInstructions: !!((recipeDetails as any).instructions && (recipeDetails as any).instructions.length > 0),
            dataQualityScore: 85
          };
          await cacheService.storeRecipe(recipeToCache);
          console.log('  ✅ Recipe cached successfully with complete nutrition');
          }
        } catch (cacheError) {
          console.error('  ⚠️ Failed to cache recipe:', cacheError);
          // Don't fail the request if caching fails
        }
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
      console.log(`  Modifications:`, customizations.modifications.map((m: any) => `${m.type}: ${m.originalIngredient || m.newIngredient} (${(m as any).amount} ${(m as any).unit})`));
      
      // DE-DUPLICATE: If multiple mods for same ingredient, keep only the FIRST one (most recent is at index 0)
      const dedupedModifications: any[] = [];
      const processedIngredients = new Map<string, boolean>();
      
      for (let i = 0; i < customizations.modifications.length; i++) {
        const mod = customizations.modifications[i];
        const ingredientKey = (mod.originalIngredient || mod.newIngredient)?.toLowerCase().trim();
        
        if (ingredientKey && !processedIngredients.has(ingredientKey)) {
          dedupedModifications.push(mod);
          processedIngredients.set(ingredientKey, true);
          console.log(`  ✅ [${i}] Keeping modification: ${mod.type} ${ingredientKey} (amount: ${(mod as any).amount})`);
        } else if (ingredientKey) {
          console.log(`  ⚠️ [${i}] Skipping duplicate modification: ${mod.type} ${ingredientKey} (amount: ${(mod as any).amount})`);
        } else {
          dedupedModifications.push(mod);
        }
      }
      
      console.log(`  📝 After deduplication: ${dedupedModifications.length} modifications (was ${customizations.modifications.length})`);
      
      // Use deduplicated modifications for ingredient display
      const modsToApply = dedupedModifications;
      
      // PASS 1: Process ADD and REPLACE first
      for (const mod of modsToApply) {
        // For REPLACE operations, look up original amount from baseRecipe ingredients if not provided
        if (mod.type === 'replace' && mod.originalIngredient && !(mod as any).originalAmount) {
          const targetName = mod.originalIngredient.toLowerCase();
          const originalIng = baseRecipe.ingredients?.find((ing: any) => {
            const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
            return ingName.includes(targetName) || targetName.includes(ingName);
          });
          
          if (originalIng) {
            (mod as any).originalAmount = originalIng.amount || 1;
            (mod as any).originalUnit = originalIng.unit || '';
            console.log(`  🔍 Found original ingredient: ${originalIng.amount} ${originalIng.unit} ${originalIng.name}`);
          }
        }
        
        if (mod.type === 'add' && mod.newIngredient) {
          // Check if this ingredient already exists in the list (to prevent duplicates)
          const existingIngredient = customizedRecipe.ingredients.find((ing: any) => {
            const ingName = (ing.name || ing.food || '').toLowerCase();
            return ingName === mod.newIngredient.toLowerCase();
          });
          
          if (existingIngredient) {
            console.log(`  ⚠️ Ingredient "${mod.newIngredient}" already exists in list - skipping duplicate ADD`);
          } else {
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
      for (const mod of modsToApply) {
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
        // If it's already an object with step, check if step is double-encoded JSON
        if (typeof instruction === 'object' && instruction.step) {
          let stepText = instruction.step;
          
          // Check if step is a stringified JSON object (double-encoded)
          if (typeof stepText === 'string' && stepText.startsWith('{')) {
            try {
              const parsed = JSON.parse(stepText);
              // If it parsed successfully and has a step property, use that
              if (parsed && typeof parsed === 'object' && parsed.step) {
                stepText = parsed.step;
              }
            } catch (e) {
              // If parsing fails, keep the original string
            }
          }
          
          return {
            number: instruction.number || index + 1,
            step: stepText
          };
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
    // Note: Custom/manual recipes store as 'quantity', but API should return as 'amount' for consistency
    customizedRecipe.ingredients = customizedRecipe.ingredients.map((ing: any) => {
      const ingredientAmount = ing.amount || ing.quantity || 0;
      return {
        id: ing.id,
        name: ing.name || ing.food,
        unit: ing.unit || '',
        amount: ingredientAmount,
        image: ing.image ? (ing.image.startsWith('http') ? ing.image : `https://spoonacular.com/cdn/ingredients_100x100/${ing.image}`) : '',
        originalString: ing.original || ing.originalString || '',
        aisle: ing.aisle || '',
        meta: ing.meta || [],
        measures: {
          us: { amount: ingredientAmount, unitLong: ing.unit || '', unitShort: ing.unit || '' },
          metric: { amount: ingredientAmount, unitLong: ing.unit || '', unitShort: ing.unit || '' }
        }
      };
    });

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

    // Apply nutritionServings multiplier to response
    const nutritionServings = customizations.nutritionServings || 1;

    // Set nutritionServings on customizedRecipe (always, not just when !== 1)
    customizedRecipe.nutritionServings = nutritionServings;

    if (nutritionServings !== 1) {
      // Multiply top-level fields
      if (customizedRecipe.caloriesPerServing) {
        customizedRecipe.caloriesPerServing = (parseFloat(customizedRecipe.caloriesPerServing) * nutritionServings).toString();
      }
      if (customizedRecipe.proteinPerServingG) {
        customizedRecipe.proteinPerServingG = (parseFloat(customizedRecipe.proteinPerServingG) * nutritionServings).toString();
      }
      if (customizedRecipe.carbsPerServingG) {
        customizedRecipe.carbsPerServingG = (parseFloat(customizedRecipe.carbsPerServingG) * nutritionServings).toString();
      }
      if (customizedRecipe.fatPerServingG) {
        customizedRecipe.fatPerServingG = (parseFloat(customizedRecipe.fatPerServingG) * nutritionServings).toString();
      }
      if (customizedRecipe.fiberPerServingG) {
        customizedRecipe.fiberPerServingG = (parseFloat(customizedRecipe.fiberPerServingG) * nutritionServings).toString();
      }
      if (customizedRecipe.sugarPerServingG) {
        customizedRecipe.sugarPerServingG = (parseFloat(customizedRecipe.sugarPerServingG || 0) * nutritionServings).toString();
      }
      if (customizedRecipe.sodiumPerServingMg) {
        customizedRecipe.sodiumPerServingMg = (parseFloat(customizedRecipe.sodiumPerServingMg || 0) * nutritionServings).toString();
      }

      // Update "total" fields to match the multiplied "PerServing" fields
      customizedRecipe.totalCalories = customizedRecipe.caloriesPerServing;
      customizedRecipe.totalProteinG = customizedRecipe.proteinPerServingG;
      customizedRecipe.totalCarbsG = customizedRecipe.carbsPerServingG;
      customizedRecipe.totalFatG = customizedRecipe.fatPerServingG;
      customizedRecipe.totalFiberG = customizedRecipe.fiberPerServingG;
      customizedRecipe.totalSugarG = customizedRecipe.sugarPerServingG;
      customizedRecipe.totalSodiumMg = customizedRecipe.sodiumPerServingMg;

      // Multiply nutritionDetails
      if (customizedRecipe.nutritionDetails) {
        if (customizedRecipe.nutritionDetails.calories) {
          customizedRecipe.nutritionDetails.calories.quantity *= nutritionServings;
        }
        if (customizedRecipe.nutritionDetails.macros) {
          Object.keys(customizedRecipe.nutritionDetails.macros).forEach(key => {
            const macro = customizedRecipe.nutritionDetails.macros[key];
            if (macro && typeof macro.quantity === 'number') {
              macro.quantity *= nutritionServings;
            }
          });
        }
        if (customizedRecipe.nutritionDetails.micros) {
          if (customizedRecipe.nutritionDetails.micros.vitamins) {
            Object.keys(customizedRecipe.nutritionDetails.micros.vitamins).forEach(key => {
              const vitamin = customizedRecipe.nutritionDetails.micros.vitamins[key];
              if (vitamin && typeof vitamin.quantity === 'number') {
                vitamin.quantity *= nutritionServings;
              }
            });
          }
          if (customizedRecipe.nutritionDetails.micros.minerals) {
            Object.keys(customizedRecipe.nutritionDetails.micros.minerals).forEach(key => {
              const mineral = customizedRecipe.nutritionDetails.micros.minerals[key];
              if (mineral && typeof mineral.quantity === 'number') {
                mineral.quantity *= nutritionServings;
              }
            });
          }
        }
      }

      // Don't multiply customizations.customNutrition - it stays as per-serving for storage
      // The multiplied version is already in customizedRecipe.nutritionDetails
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

    // Final safety check: ensure recipeServings is correct (use baseRecipe.servings as final source of truth)
    const finalServings = baseRecipe.servings || recipeServings || recipe.servings || 2;
    console.log(`📊 Final servings used in response: ${finalServings} (baseRecipe: ${baseRecipe.servings}, recipeServings: ${recipeServings}, recipe: ${recipe.servings})`);

    // Return exact same structure as GET /api/recipes/customized
    return res.status(200).json({
      success: true,
      data: {
        ...customizedRecipe,
        modifiedNutrition: customizedRecipe.nutritionDetails || null, // Already multiplied by nutritionServings
        originalNutrition: originalNutritionWithMicros || null
      },
      hasCustomizations: true,
      customizations: {
        modifications: customizations.modifications || [],
        customizationSummary: customizationSummary,
        appliedServings: finalServings, // Recipe servings (for ingredients)
        nutritionServings: customizations.nutritionServings || customizations.servings || 1, // Portion size multiplier
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
      autoCalculated: autoCalculateNutrition && !req.body.customizations.customNutrition
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
 * Change recipe page (pagination instead of shuffle)
 */
async function handleChangePage(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = changePageSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { planId, day, mealName, direction, pageNumber } = value;

  // Validate that pageNumber is provided when direction is 'specific'
  if (direction === 'specific' && !pageNumber) {
    return res.status(400).json({
      error: 'Validation error',
      message: 'pageNumber is required when direction is "specific"'
    });
  }

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

    // Change the page
    const result = await draftService.changePage(planId, day, mealName, direction, pageNumber);

    return res.status(200).json({
      success: true,
      message: `Changed to ${direction === 'next' ? 'next' : direction === 'prev' ? 'previous' : 'page ' + pageNumber} for ${mealName} on day ${day}`,
      data: {
        day,
        mealName,
        displayedRecipes: result.displayedRecipes,
        recipesCount: result.displayedRecipes.length,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      }
    });

  } catch (error) {
    console.error('❌ Error changing page:', error);
    
    // Check if it's a "no more pages" error
    if (error instanceof Error && (error.message.includes('No more pages') || error.message.includes('Invalid page'))) {
      return res.status(400).json({
        success: false,
        error: 'Invalid page',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to change page',
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

/**
 * Get alternate recipe suggestions using AI
 */
async function handleGetAlternateRecipes(
  req: VercelRequest,
  res: VercelResponse,
  user: any
): Promise<VercelResponse> {
  try {
    const { draftId, day, mealName, recipeId, count = 3 } = req.body;

    if (!draftId || !day || !mealName || !recipeId) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'draftId, day, mealName, and recipeId are required'
      });
    }

    console.log(`🔄 Generating up to 3 alternate recipes for ${mealName} on day ${day} using 3 parallel AI calls`);

    // Get the draft
    const draft = await draftService.getDraft(draftId);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Verify ownership
    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get the current recipe to understand context
    const daySuggestion = draft.suggestions?.[day - 1];
    if (!daySuggestion) {
      return res.status(404).json({ error: 'Day not found' });
    }

    const meal = daySuggestion.meals?.[mealName];
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const currentRecipe = meal.recipes?.find((r: any) => r.id === recipeId);
    if (!currentRecipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Extract client goals and meal requirements
    const clientGoals = draft.searchParams?.clientGoals || {};
    const mealProgram = draft.searchParams?.mealProgram;
    const mealInfo = mealProgram?.meals?.find((m: any) => m.mealName === mealName);

    // Create a properly formatted meal object with required fields
    const formattedMealInfo = mealInfo ? {
      mealOrder: mealInfo.mealOrder || 1,
      mealName: mealInfo.mealName || mealName,
      mealTime: mealInfo.mealTime || '08:00',
      mealType: mealInfo.mealType || mealName.toLowerCase(),
      targetCalories: mealInfo.targetCalories || currentRecipe.calories
    } : {
      mealOrder: 1,
      mealName: mealName,
      mealTime: '08:00',
      mealType: mealName.toLowerCase(),
      targetCalories: currentRecipe.calories
    };

    // Determine which AI service to use (based on original draft creation)
    const aiService = draft.creationMethod === 'ai_generated' && draft.searchParams?.aiProvider
      ? draft.searchParams.aiProvider
      : 'grok';

    console.log(`🚀 Making 3 parallel calls to ${aiService} for alternative recipes`);

    // Build a focused request for just this meal with ONE alternative
    const excludeTitles = meal.recipes.map((r: any) => r.title).join(', ');

    // Build allergen and preference constraints
    let constraints = '';
    if (clientGoals.allergies && clientGoals.allergies.length > 0) {
      constraints += ` EXCLUDE ALLERGENS: ${clientGoals.allergies.join(', ')}.`;
    }
    if (clientGoals.preferences && clientGoals.preferences.length > 0) {
      constraints += ` Preferences: ${clientGoals.preferences.join(', ')}.`;
    }
    if (clientGoals.cuisineTypes && clientGoals.cuisineTypes.length > 0) {
      constraints += ` Cuisine: ${clientGoals.cuisineTypes.join(', ')}.`;
    }

    // Create 3 DIFFERENT prompts to ensure variety in responses
    // Use "skip first N ideas" technique to force diversity
    const variations = [
      `Generate 1 ${mealName} recipe (use your FIRST idea)`,
      `Generate 1 ${mealName} recipe (SKIP your first idea, use your SECOND idea)`,
      `Generate 1 ${mealName} recipe (SKIP your first 2 ideas, use your THIRD idea)`
    ];

    const additionalTexts = variations.map((variation) =>
      `${variation} (~${currentRecipe.calories}cal, ~${currentRecipe.protein}g protein). Skip: ${excludeTitles}.${constraints}`
    );

    // Import the appropriate AI service
    let serviceModule: any;
    if (aiService === 'claude' || aiService === 'anthropic') {
      serviceModule = await import('../../lib/claudeService');
    } else if (aiService === 'grok') {
      serviceModule = await import('../../lib/grokService');
    } else {
      serviceModule = await import('../../lib/openaiService');
    }

    const ServiceClass = aiService === 'claude' || aiService === 'anthropic'
      ? serviceModule.ClaudeService
      : aiService === 'grok'
        ? serviceModule.GrokService
        : serviceModule.OpenAIService;

    // Create 3 service instances for parallel calls
    const service1 = new ServiceClass();
    const service2 = new ServiceClass();
    const service3 = new ServiceClass();

    // Prepare 3 DIFFERENT requests with variations to ensure diverse results
    const request1 = {
      clientId: draft.clientId,
      nutritionistId: draft.nutritionistId,
      clientGoals,
      mealProgram: {
        meals: [formattedMealInfo]
      },
      days: 1,
      additionalText: additionalTexts[0],
      recipesPerMeal: 1
    };

    const request2 = {
      clientId: draft.clientId,
      nutritionistId: draft.nutritionistId,
      clientGoals,
      mealProgram: {
        meals: [formattedMealInfo]
      },
      days: 1,
      additionalText: additionalTexts[1],
      recipesPerMeal: 1
    };

    const request3 = {
      clientId: draft.clientId,
      nutritionistId: draft.nutritionistId,
      clientGoals,
      mealProgram: {
        meals: [formattedMealInfo]
      },
      days: 1,
      additionalText: additionalTexts[2],
      recipesPerMeal: 1
    };

    // Make 3 parallel calls to the SAME AI service with DIFFERENT prompts
    const startTime = Date.now();
    const methodName = (aiService === 'claude' || aiService === 'anthropic') ? 'generateMealPlan' : 'generateMealPlanSync';

    const [result1, result2, result3] = await Promise.allSettled([
      service1[methodName](request1).catch((err: Error) => {
        console.warn(`⚠️ ${aiService} API call 1 failed:`, err.message);
        return { status: 'failed' as const, error: err.message };
      }),
      service2[methodName](request2).catch((err: Error) => {
        console.warn(`⚠️ ${aiService} API call 2 failed:`, err.message);
        return { status: 'failed' as const, error: err.message };
      }),
      service3[methodName](request3).catch((err: Error) => {
        console.warn(`⚠️ ${aiService} API call 3 failed:`, err.message);
        return { status: 'failed' as const, error: err.message };
      })
    ]);
    const parallelTime = Date.now() - startTime;

    console.log(`⚡ 3 parallel ${aiService} calls completed in ${parallelTime}ms`);

    // Extract recipes from all successful responses
    const allRecipes: any[] = [];
    let successfulCalls = 0;

    // Extract from call 1
    if (result1.status === 'fulfilled' && result1.value.status === 'completed') {
      const recipes = result1.value.data?.suggestions?.[0]?.meals?.[mealName]?.recipes || [];
      allRecipes.push(...recipes);
      successfulCalls++;
      console.log(`✅ ${aiService} call 1 returned ${recipes.length} recipe(s)`);
    }

    // Extract from call 2
    if (result2.status === 'fulfilled' && result2.value.status === 'completed') {
      const recipes = result2.value.data?.suggestions?.[0]?.meals?.[mealName]?.recipes || [];
      allRecipes.push(...recipes);
      successfulCalls++;
      console.log(`✅ ${aiService} call 2 returned ${recipes.length} recipe(s)`);
    }

    // Extract from call 3
    if (result3.status === 'fulfilled' && result3.value.status === 'completed') {
      const recipes = result3.value.data?.suggestions?.[0]?.meals?.[mealName]?.recipes || [];
      allRecipes.push(...recipes);
      successfulCalls++;
      console.log(`✅ ${aiService} call 3 returned ${recipes.length} recipe(s)`);
    }

    console.log(`📦 Total recipes collected from ${successfulCalls} successful calls: ${allRecipes.length}`);

    // Deduplicate recipes based on similar titles (case-insensitive, normalize whitespace)
    const deduplicatedRecipes: any[] = [];
    const seenTitles = new Set<string>();

    for (const recipe of allRecipes) {
      // Normalize title for comparison: lowercase, remove extra spaces, remove special chars
      const normalizedTitle = recipe.title
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        deduplicatedRecipes.push(recipe);
      } else {
        console.log(`🔄 Deduplicated: "${recipe.title}"`);
      }
    }

    console.log(`✨ After deduplication: ${deduplicatedRecipes.length} unique recipes (max 3 will be returned)`);

    // Take up to 3 unique recipes
    const alternateRecipes = deduplicatedRecipes.slice(0, 3);

    // Warn if we didn't get at least 1 alternative
    if (alternateRecipes.length < 1) {
      console.warn(`⚠️ No alternative recipes generated`);
    }

    return res.status(200).json({
      success: true,
      data: {
        alternateRecipes,
        originalRecipe: {
          id: currentRecipe.id,
          title: currentRecipe.title,
          calories: currentRecipe.calories,
          protein: currentRecipe.protein
        },
        metadata: {
          aiProvider: aiService,
          parallelCalls: 3,
          successfulCalls: successfulCalls,
          totalCollected: allRecipes.length,
          afterDeduplication: deduplicatedRecipes.length,
          finalCount: alternateRecipes.length,
          generatedAt: new Date().toISOString(),
          parallelTimeMs: parallelTime
        }
      }
    });

  } catch (error) {
    console.error('❌ Error generating alternate recipes:', error);
    return res.status(500).json({
      error: 'Failed to generate alternate recipes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Swap a recipe with an alternate recipe
 */
async function handleSwapRecipe(
  req: VercelRequest,
  res: VercelResponse,
  user: any
): Promise<VercelResponse> {
  try {
    const { draftId, day, mealName, oldRecipeId, newRecipe } = req.body;

    if (!draftId || !day || !mealName || !oldRecipeId || !newRecipe) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'draftId, day, mealName, oldRecipeId, and newRecipe are required'
      });
    }

    console.log(`🔄 Swapping recipe ${oldRecipeId} with ${newRecipe.title} in ${mealName} on day ${day}`);

    // Get the draft
    const draft = await draftService.getDraft(draftId);
    if (!draft) {
      return res.status(404).json({ error: 'Draft not found' });
    }

    // Verify ownership
    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Get the meal plan data
    if (!draft.suggestions?.[day - 1]) {
      return res.status(404).json({ error: 'Day not found' });
    }

    const daySuggestion = draft.suggestions[day - 1];
    const meal = daySuggestion.meals?.[mealName];
    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    // Find and replace the recipe
    const recipeIndex = meal.recipes?.findIndex((r: any) => r.id === oldRecipeId);
    if (recipeIndex === -1 || recipeIndex === undefined) {
      return res.status(404).json({ error: 'Recipe to swap not found' });
    }

    // Store the old recipe for reference
    const oldRecipe = meal.recipes[recipeIndex];

    // Generate a new unique ID for the swapped recipe
    const newRecipeId = `recipe-${day}-${mealName.toLowerCase()}-${Date.now()}`;

    // Update the recipe with new ID and ensure it has all required fields
    const recipeToInsert = {
      ...newRecipe,
      id: newRecipeId,
      source: newRecipe.source || 'openai', // Use the AI provider that generated it
      selected: true, // Mark as selected since we're swapping it in
      swappedFrom: oldRecipeId, // Track what it was swapped from
      swappedAt: new Date().toISOString()
    };

    // Replace the recipe
    meal.recipes[recipeIndex] = recipeToInsert;

    // Update selectedRecipeId to point to the new recipe
    meal.selectedRecipeId = newRecipeId;

    // Recalculate meal totals
    const mealTotals = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };

    meal.recipes.forEach((recipe: any) => {
      const getNumericValue = (value: any) => {
        if (typeof value === 'number') return value;
        if (value?.quantity !== undefined) return value.quantity;
        return 0;
      };

      mealTotals.calories += getNumericValue(recipe.calories);
      mealTotals.protein += getNumericValue(recipe.protein);
      mealTotals.carbs += getNumericValue(recipe.carbs);
      mealTotals.fat += getNumericValue(recipe.fat);
      mealTotals.fiber += getNumericValue(recipe.fiber);
    });

    // Save the updated draft directly to database
    const { error: updateError } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: draft.suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId);

    if (updateError) {
      throw new Error(`Failed to update draft: ${updateError.message}`);
    }

    console.log(`✅ Recipe swapped successfully: ${oldRecipe.title} → ${newRecipe.title}`);

    return res.status(200).json({
      success: true,
      message: 'Recipe swapped successfully',
      data: {
        swappedRecipe: recipeToInsert,
        oldRecipe: {
          id: oldRecipe.id,
          title: oldRecipe.title
        },
        updatedMeal: {
          mealName,
          calories: mealTotals.calories,
          protein: mealTotals.protein,
          carbs: mealTotals.carbs,
          fat: mealTotals.fat,
          fiber: mealTotals.fiber
        }
      }
    });

  } catch (error) {
    console.error('❌ Error swapping recipe:', error);
    return res.status(500).json({
      error: 'Failed to swap recipe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
