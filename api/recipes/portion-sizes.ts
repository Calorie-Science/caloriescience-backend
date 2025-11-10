import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { PortionSizeService } from '../../lib/portionSizeService';
import Joi from 'joi';

const portionSizeService = new PortionSizeService();

const requestSchema = Joi.object({
  recipeId: Joi.string().required(),
  provider: Joi.string().valid('edamam', 'spoonacular', 'bonhappetee', 'manual', 'claude', 'grok', 'openai', 'gpt', 'chatgpt', 'gpt-4', 'gpt-3.5', 'gpt-4-turbo', 'gpt-3.5-turbo').required()
});

/**
 * GET /api/recipes/portion-sizes?recipeId=xxx&provider=manual
 *
 * Get available portion sizes for a recipe, along with calculated nutrition for each portion size.
 * This is used to populate the portion size dropdown when adding custom recipes to meal plans.
 *
 * For custom recipes (provider='manual'):
 * - Returns the recipe's default portion size
 * - Returns all available portion sizes
 * - Calculates nutrition for each portion size relative to the default
 *
 * Formula: nutrition_for_portion = base_nutrition × (selected_multiplier / default_multiplier)
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can access recipe portion sizes'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    // Validate query parameters
    const { error, value } = requestSchema.validate({
      recipeId: req.query.recipeId,
      provider: req.query.provider
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { recipeId, provider } = value;

    // Only support custom recipes for now
    if (provider !== 'manual') {
      return res.status(400).json({
        error: 'Invalid provider',
        message: 'Portion size calculation is only supported for custom recipes (provider="manual")'
      });
    }

    // Fetch the custom recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('cached_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('provider', 'manual')
      .single();

    if (recipeError || !recipe) {
      return res.status(404).json({
        error: 'Recipe not found',
        message: 'The specified custom recipe does not exist'
      });
    }

    // Get all available portion sizes
    const allPortionSizes = await portionSizeService.getAllPortionSizes();

    // Get the recipe's default portion size
    let defaultPortionSize = null;
    if (recipe.default_portion_size_id) {
      defaultPortionSize = await portionSizeService.getPortionSizeById(recipe.default_portion_size_id);
    }

    // Base nutrition values (per serving as stored in database)
    const baseNutrition = {
      calories: parseFloat(recipe.calories_per_serving) || 0,
      protein: parseFloat(recipe.protein_per_serving_g) || 0,
      carbs: parseFloat(recipe.carbs_per_serving_g) || 0,
      fat: parseFloat(recipe.fat_per_serving_g) || 0,
      fiber: parseFloat(recipe.fiber_per_serving_g) || 0
    };

    // Calculate nutrition for each portion size
    const portionSizesWithNutrition = allPortionSizes.map(portionSize => {
      let multiplier = 1;

      if (defaultPortionSize) {
        // Calculate relative multiplier: selected / default
        multiplier = portionSize.multiplier / defaultPortionSize.multiplier;
      } else {
        // No default portion size, use absolute multiplier
        multiplier = portionSize.multiplier;
      }

      // Calculate nutrition for this portion size
      const nutrition = {
        calories: Math.round(baseNutrition.calories * multiplier * 10) / 10,
        protein: Math.round(baseNutrition.protein * multiplier * 10) / 10,
        carbs: Math.round(baseNutrition.carbs * multiplier * 10) / 10,
        fat: Math.round(baseNutrition.fat * multiplier * 10) / 10,
        fiber: Math.round(baseNutrition.fiber * multiplier * 10) / 10
      };

      return {
        id: portionSize.id,
        name: portionSize.name,
        description: portionSize.description,
        category: portionSize.category,
        multiplier: portionSize.multiplier,
        relativeMultiplier: Math.round(multiplier * 1000) / 1000, // 3 decimal places
        isDefault: portionSize.id === recipe.default_portion_size_id,
        nutrition
      };
    });

    // Sort by category and then by multiplier
    portionSizesWithNutrition.sort((a, b) => {
      if (a.category !== b.category) {
        return a.category.localeCompare(b.category);
      }
      return a.multiplier - b.multiplier;
    });

    return res.status(200).json({
      success: true,
      data: {
        recipe: {
          id: recipe.id,
          name: recipe.recipe_name,
          servings: recipe.servings,
          defaultPortionSize: defaultPortionSize ? {
            id: defaultPortionSize.id,
            name: defaultPortionSize.name,
            multiplier: defaultPortionSize.multiplier
          } : null,
          baseNutrition // Nutrition per serving (at default portion size if set, otherwise standard serving)
        },
        portionSizes: portionSizesWithNutrition
      }
    });

  } catch (error) {
    console.error('❌ Error fetching recipe portion sizes:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch recipe portion sizes'
    });
  }
}

export default requireAuth(handler);
