import { VercelRequest, VercelResponse } from '@vercel/node';
import { MealPlanDraftService } from '../../lib/mealPlanDraftService';
import { EdamamService } from '../../lib/edamamService';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
import { NutritionMappingService } from '../../lib/nutritionMappingService';
import { requireAuth } from '../../lib/auth';
import Joi from 'joi';

const draftService = new MealPlanDraftService();
const edamamService = new EdamamService();
const multiProviderService = new MultiProviderRecipeSearchService();

// Validation schema for ingredient replacement
const replaceIngredientSchema = Joi.object({
  action: Joi.string().valid('replace-ingredient').required(),
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipeId: Joi.string().required(),
  originalIngredient: Joi.string().required(),
  newIngredient: Joi.string().required(),
  amount: Joi.number().min(0).optional(),
  unit: Joi.string().optional(),
  servings: Joi.number().min(0.1).max(20).default(1).optional(), // Portion size adjustment
  source: Joi.string().valid('edamam', 'spoonacular', 'manual', 'auto').default('auto').optional() // 'auto' tries both providers
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can replace ingredients
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can replace ingredients.' });
  }

  // Only POST method allowed
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    const { error, value } = replaceIngredientSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { 
      draftId, 
      day, 
      mealName, 
      recipeId, 
      originalIngredient, 
      newIngredient, 
      amount, 
      unit, 
      servings = 1,
      source 
    } = value;

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

    // Find the specific meal and recipe in the draft
    const dayPlan = draft.suggestions.find((d: any) => d.day === day);
    if (!dayPlan) {
      return res.status(404).json({
        error: 'Day not found',
        message: `Day ${day} not found in draft`
      });
    }

    const meal = dayPlan.meals[mealName];
    if (!meal) {
      return res.status(404).json({
        error: 'Meal not found',
        message: `Meal '${mealName}' not found for day ${day}`
      });
    }

    const recipe = meal.recipes.find((r: any) => r.id === recipeId);
    if (!recipe) {
      return res.status(404).json({
        error: 'Recipe not found',
        message: `Recipe '${recipeId}' not found in meal '${mealName}'`
      });
    }

    if (!recipe.isSelected) {
      return res.status(400).json({
        error: 'Recipe not selected',
        message: 'You can only replace ingredients in a selected recipe'
      });
    }

    // Get the original recipe's total nutrition (per serving)
    const originalRecipeNutrition = {
      calories: recipe.calories || recipe.nutrition?.calories || 0,
      protein: recipe.protein || recipe.nutrition?.protein || 0,
      carbs: recipe.carbs || recipe.nutrition?.carbs || 0,
      fat: recipe.fat || recipe.nutrition?.fat || 0,
      fiber: recipe.fiber || recipe.nutrition?.fiber || 0
    };

    const recipeServings = recipe.servings || 1;

    // Get nutrition for the original ingredient
    let originalIngredientNutrition: any = null;
    if (source === 'edamam') {
      originalIngredientNutrition = await edamamService.getIngredientNutrition(originalIngredient);
    } else if (source === 'spoonacular') {
      originalIngredientNutrition = await multiProviderService.getIngredientNutrition(originalIngredient);
    }

    if (!originalIngredientNutrition) {
      return res.status(404).json({
        error: 'Original ingredient nutrition not found',
        message: `Could not get nutrition for original ingredient "${originalIngredient}"`
      });
    }

    // Build ingredient text with amount and unit for new ingredient
    let newIngredientText = newIngredient;
    if (amount && unit) {
      newIngredientText = `${amount} ${unit} ${newIngredient}`;
    }

    // Get nutrition data for the new ingredient
    let newIngredientNutrition: any = null;
    if (source === 'edamam') {
      newIngredientNutrition = await edamamService.getIngredientNutrition(newIngredientText);
    } else if (source === 'spoonacular') {
      newIngredientNutrition = await multiProviderService.getIngredientNutrition(newIngredientText);
    }

    if (!newIngredientNutrition) {
      return res.status(404).json({
        error: 'New ingredient nutrition not found',
        message: `No nutrition information available for "${newIngredientText}"`
      });
    }

    // Extract nutrition values using NutritionMappingService
    const oldNutritionStd = source === 'edamam' 
      ? NutritionMappingService.transformEdamamNutrition(originalIngredientNutrition)
      : NutritionMappingService.transformSpoonacularIngredientNutrition(originalIngredientNutrition);
    
    const newNutritionStd = source === 'edamam'
      ? NutritionMappingService.transformEdamamNutrition(newIngredientNutrition)
      : NutritionMappingService.transformSpoonacularIngredientNutrition(newIngredientNutrition);

    // Convert to simplified format for calculations
    const oldNutrition = NutritionMappingService.toSimplifiedFormat(oldNutritionStd);
    const newNutrition = NutritionMappingService.toSimplifiedFormat(newNutritionStd);

    // Calculate the total recipe nutrition (all servings)
    const totalRecipeNutrition = {
      calories: originalRecipeNutrition.calories * recipeServings,
      protein: originalRecipeNutrition.protein * recipeServings,
      carbs: originalRecipeNutrition.carbs * recipeServings,
      fat: originalRecipeNutrition.fat * recipeServings,
      fiber: originalRecipeNutrition.fiber * recipeServings
    };

    // Calculate new total nutrition: (Total Recipe) - (Old Ingredient) + (New Ingredient)
    const newTotalRecipeNutrition = {
      calories: Math.max(0, totalRecipeNutrition.calories - oldNutrition.calories + newNutrition.calories),
      protein: Math.max(0, totalRecipeNutrition.protein - oldNutrition.protein + newNutrition.protein),
      carbs: Math.max(0, totalRecipeNutrition.carbs - oldNutrition.carbs + newNutrition.carbs),
      fat: Math.max(0, totalRecipeNutrition.fat - oldNutrition.fat + newNutrition.fat),
      fiber: Math.max(0, totalRecipeNutrition.fiber - oldNutrition.fiber + newNutrition.fiber)
    };

    // Convert back to per-serving
    const newPerServingNutrition = {
      calories: Math.round(newTotalRecipeNutrition.calories / recipeServings),
      protein: parseFloat((newTotalRecipeNutrition.protein / recipeServings).toFixed(1)),
      carbs: parseFloat((newTotalRecipeNutrition.carbs / recipeServings).toFixed(1)),
      fat: parseFloat((newTotalRecipeNutrition.fat / recipeServings).toFixed(1)),
      fiber: parseFloat((newTotalRecipeNutrition.fiber / recipeServings).toFixed(1))
    };

    // Apply portion size (servings) adjustment
    const finalNutrition = {
      calories: Math.round(newPerServingNutrition.calories * servings),
      protein: parseFloat((newPerServingNutrition.protein * servings).toFixed(1)),
      carbs: parseFloat((newPerServingNutrition.carbs * servings).toFixed(1)),
      fat: parseFloat((newPerServingNutrition.fat * servings).toFixed(1)),
      fiber: parseFloat((newPerServingNutrition.fiber * servings).toFixed(1))
    };

    // Get existing customizations or create new
    const existingCustomization = meal.customizations[recipeId] || {
      recipeId,
      source,
      modifications: [],
      servings: servings, // Use the requested servings
      customizationsApplied: false
    };

    // Add this modification to the list
    existingCustomization.modifications.push({
      type: 'replace',
      ingredient: originalIngredient,
      newIngredient: newIngredientText,
      notes: `Replaced ${originalIngredient} with ${newIngredientText}`
    });

    // Update with the final nutrition (includes portion size adjustment)
    existingCustomization.customNutrition = finalNutrition;
    existingCustomization.servings = servings; // Store the portion size
    existingCustomization.customizationsApplied = true;

    // Update the draft with the ingredient replacement
    await draftService.updateRecipeCustomizations(
      draftId,
      day,
      mealName,
      recipeId,
      existingCustomization
    );

    // Get updated draft status
    const status = await draftService.getDraftStatus(draftId);

    return res.status(200).json({
      success: true,
      data: {
        message: 'Ingredient replaced successfully',
        replacement: {
          originalIngredient,
          newIngredient: newIngredientText,
          source,
          nutritionImpact: {
            originalIngredient: oldNutrition,
            newIngredient: newNutrition,
            difference: {
              calories: newNutrition.calories - oldNutrition.calories,
              protein: parseFloat((newNutrition.protein - oldNutrition.protein).toFixed(1)),
              carbs: parseFloat((newNutrition.carbs - oldNutrition.carbs).toFixed(1)),
              fat: parseFloat((newNutrition.fat - oldNutrition.fat).toFixed(1)),
              fiber: parseFloat((newNutrition.fiber - oldNutrition.fiber).toFixed(1))
            }
          },
          recipeNutrition: {
            beforeReplacement: originalRecipeNutrition,
            afterReplacement: newPerServingNutrition,
            finalWithPortionSize: finalNutrition,
            portionSize: servings,
            recipeServings: recipeServings
          }
        },
        updatedStatus: status
      }
    });

  } catch (error) {
    console.error('❌ Error replacing ingredient:', error);
    return res.status(500).json({
      error: 'Failed to replace ingredient',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
