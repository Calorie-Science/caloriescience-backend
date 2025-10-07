import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealPlanDraftService } from '../../lib/mealPlanDraftService';
import { EdamamService } from '../../lib/edamamService';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
import Joi from 'joi';

const draftService = new MealPlanDraftService();
const edamamService = new EdamamService();
const multiProviderService = new MultiProviderRecipeSearchService();

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

    return res.status(200).json({
      success: true,
      data: draft
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
 */
async function calculateNutritionForModifications(
  originalRecipeNutrition: any,
  modifications: any[],
  source: 'edamam' | 'spoonacular'
): Promise<any> {
  console.log('🧮 Auto-calculating nutrition for modifications...');
  console.log(`📊 Original recipe nutrition:`, originalRecipeNutrition);
  console.log(`📝 Modifications:`, modifications);

  // Start with original recipe nutrition
  let totalNutrition = {
    calories: originalRecipeNutrition.calories || 0,
    protein: originalRecipeNutrition.protein || 0,
    carbs: originalRecipeNutrition.carbs || 0,
    fat: originalRecipeNutrition.fat || 0,
    fiber: originalRecipeNutrition.fiber || 0
  };

  // Process each modification using UNIFORM field names
  for (const mod of modifications) {
    if (mod.type === 'omit' && mod.originalIngredient) {
      // Get nutrition for the ingredient being removed
      console.log(`🚫 Omitting: ${mod.originalIngredient}`);
      const ingredientNutrition = await getIngredientNutrition(mod.originalIngredient, source);
      if (ingredientNutrition) {
        totalNutrition.calories = Math.max(0, totalNutrition.calories - ingredientNutrition.calories);
        totalNutrition.protein = Math.max(0, totalNutrition.protein - ingredientNutrition.protein);
        totalNutrition.carbs = Math.max(0, totalNutrition.carbs - ingredientNutrition.carbs);
        totalNutrition.fat = Math.max(0, totalNutrition.fat - ingredientNutrition.fat);
        totalNutrition.fiber = Math.max(0, totalNutrition.fiber - ingredientNutrition.fiber);
        console.log(`  ➖ Subtracted:`, ingredientNutrition);
      }
    } else if (mod.type === 'add' && mod.newIngredient) {
      // Get nutrition for the ingredient being added
      console.log(`➕ Adding: ${mod.newIngredient}`);
      const ingredientNutrition = await getIngredientNutrition(mod.newIngredient, source, mod.amount, mod.unit);
      if (ingredientNutrition) {
        totalNutrition.calories += ingredientNutrition.calories;
        totalNutrition.protein += ingredientNutrition.protein;
        totalNutrition.carbs += ingredientNutrition.carbs;
        totalNutrition.fat += ingredientNutrition.fat;
        totalNutrition.fiber += ingredientNutrition.fiber;
        console.log(`  ➕ Added:`, ingredientNutrition);
      }
    } else if (mod.type === 'replace' && mod.originalIngredient && mod.newIngredient) {
      // Get nutrition for both old and new ingredients
      console.log(`🔄 Replacing: ${mod.originalIngredient} with ${mod.newIngredient}`);
      const oldNutrition = await getIngredientNutrition(mod.originalIngredient, source);
      const newNutrition = await getIngredientNutrition(mod.newIngredient, source, mod.amount, mod.unit);
      
      if (oldNutrition && newNutrition) {
        totalNutrition.calories = Math.max(0, totalNutrition.calories - oldNutrition.calories + newNutrition.calories);
        totalNutrition.protein = Math.max(0, totalNutrition.protein - oldNutrition.protein + newNutrition.protein);
        totalNutrition.carbs = Math.max(0, totalNutrition.carbs - oldNutrition.carbs + newNutrition.carbs);
        totalNutrition.fat = Math.max(0, totalNutrition.fat - oldNutrition.fat + newNutrition.fat);
        totalNutrition.fiber = Math.max(0, totalNutrition.fiber - oldNutrition.fiber + newNutrition.fiber);
        console.log(`  ➖ Subtracted old:`, oldNutrition);
        console.log(`  ➕ Added new:`, newNutrition);
      }
    }
  }

  // Round final nutrition values
  const finalNutrition = {
    calories: Math.round(totalNutrition.calories),
    protein: parseFloat(totalNutrition.protein.toFixed(1)),
    carbs: parseFloat(totalNutrition.carbs.toFixed(1)),
    fat: parseFloat(totalNutrition.fat.toFixed(1)),
    fiber: parseFloat(totalNutrition.fiber.toFixed(1))
  };

  console.log(`✅ Final calculated nutrition:`, finalNutrition);
  return finalNutrition;
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

    // Always use Spoonacular for ingredient nutrition (more accurate)
    const nutritionData = await multiProviderService.getIngredientNutrition(ingredientText);

    if (!nutritionData) {
      console.warn(`⚠️ Could not get nutrition for: ${ingredientText}`);
      return null;
    }

    // Extract nutrition from Spoonacular format
    const extractNutrition = (data: any) => {
      // Spoonacular format (direct properties)
      if (data.calories !== undefined) {
        return {
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0,
          fiber: data.fiber || 0
        };
      }

      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    };

    return extractNutrition(nutritionData);
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

    // If auto-calculation is enabled and customNutrition is not provided, calculate it
    if (autoCalculateNutrition && !customizations.customNutrition) {
      console.log('🤖 Auto-calculating nutrition for customizations...');
      
      // Find the recipe in the draft
      const dayPlan = draft.suggestions.find((d: any) => d.day === day);
      const meal = dayPlan?.meals[mealName];
      const recipe = meal?.recipes?.find((r: any) => r.id === recipeId);

      if (!recipe) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: `Recipe ${recipeId} not found in ${mealName} for day ${day}`
        });
      }

      // Get original recipe nutrition
      const originalNutrition = {
        calories: recipe.calories || recipe.nutrition?.calories || 0,
        protein: recipe.protein || recipe.nutrition?.protein || 0,
        carbs: recipe.carbs || recipe.nutrition?.carbs || 0,
        fat: recipe.fat || recipe.nutrition?.fat || 0,
        fiber: recipe.fiber || recipe.nutrition?.fiber || 0
      };

      // Calculate new nutrition
      customizations.customNutrition = await calculateNutritionForModifications(
        originalNutrition,
        customizations.modifications,
        customizations.source
      );
      customizations.customizationsApplied = true;
    }

    await draftService.updateRecipeCustomizations(draftId, day, mealName, recipeId, customizations);

    // Get updated draft status
    const status = await draftService.getDraftStatus(draftId);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Customizations updated successfully',
        autoCalculated: autoCalculateNutrition && !req.body.customizations.customNutrition,
        status
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
