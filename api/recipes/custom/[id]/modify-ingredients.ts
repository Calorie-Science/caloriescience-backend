import type { VercelRequest, VercelResponse } from '@vercel/node';
import Joi from 'joi';
import { requireAuth } from '../../../../lib/auth';
import { CustomRecipeService } from '../../../../lib/customRecipeService';

const customRecipeService = new CustomRecipeService();

// Validation schema for ingredient modifications
const modifyIngredientsSchema = Joi.object({
  modifications: Joi.array().items(
    Joi.object({
      type: Joi.string().valid('replace', 'omit', 'add').required(),
      // For 'replace' modifications
      originalIngredient: Joi.string().when('type', {
        is: Joi.string().valid('replace', 'omit'),
        then: Joi.required()
      }),
      newIngredient: Joi.string().when('type', {
        is: Joi.string().valid('replace', 'add'),
        then: Joi.required()
      }),
      // Amounts
      originalAmount: Joi.number().when('type', {
        is: Joi.string().valid('replace', 'omit'),
        then: Joi.required()
      }),
      originalUnit: Joi.string().when('type', {
        is: Joi.string().valid('replace', 'omit'),
        then: Joi.required()
      }),
      amount: Joi.number().when('type', {
        is: Joi.string().valid('replace', 'add'),
        then: Joi.required()
      }),
      unit: Joi.string().when('type', {
        is: Joi.string().valid('replace', 'add'),
        then: Joi.required()
      })
    })
  ).min(1).required(),
  servings: Joi.number().min(1).max(100).optional(),
  autoCalculateNutrition: Joi.boolean().default(true)
});

/**
 * PUT /api/recipes/custom/[id]/modify-ingredients
 *
 * Modify ingredients in a custom recipe (replace, omit, add) and update the base recipe.
 * Similar to meal plan customizations but updates the recipe itself.
 *
 * Request body:
 * {
 *   "modifications": [
 *     {
 *       "type": "replace",
 *       "originalIngredient": "butter",
 *       "originalAmount": 2,
 *       "originalUnit": "tablespoons",
 *       "newIngredient": "olive oil",
 *       "amount": 2,
 *       "unit": "tablespoons"
 *     },
 *     {
 *       "type": "omit",
 *       "originalIngredient": "sugar",
 *       "originalAmount": 0.5,
 *       "originalUnit": "cup"
 *     },
 *     {
 *       "type": "add",
 *       "newIngredient": "honey",
 *       "amount": 2,
 *       "unit": "tablespoons"
 *     }
 *   ],
 *   "servings": 4,
 *   "autoCalculateNutrition": true
 * }
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  // Only nutritionists can modify custom recipes
  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      success: false,
      message: 'Only nutritionists can modify custom recipes'
    });
  }

  // Only allow PUT
  if (req.method !== 'PUT') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const recipeId = req.query.id as string;

    if (!recipeId) {
      return res.status(400).json({
        success: false,
        message: 'Recipe ID is required'
      });
    }

    console.log('🔧 Modifying custom recipe ingredients:', {
      recipeId,
      nutritionist: user.email,
      modificationsCount: req.body.modifications?.length
    });

    // Validate request body
    const { error, value } = modifyIngredientsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { modifications, servings, autoCalculateNutrition } = value;

    // Apply modifications to the recipe
    const result = await customRecipeService.modifyIngredients(
      recipeId,
      modifications,
      user.id,
      servings,
      autoCalculateNutrition
    );

    return res.status(200).json({
      success: true,
      message: 'Recipe ingredients modified successfully',
      data: {
        recipe: result.recipe,
        modificationSummary: {
          modificationsApplied: modifications.length,
          nutritionRecalculated: autoCalculateNutrition,
          servings: result.recipe.servings
        }
      }
    });

  } catch (error: any) {
    console.error('❌ Error modifying custom recipe ingredients:', error);

    // Handle access denied errors
    if (error.message && error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    // Handle not found errors
    if (error.message && (error.message.includes('not found') || error.message.includes('Recipe not found'))) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    // Handle validation errors
    if (error.message && (
      error.message.includes('required') ||
      error.message.includes('must be') ||
      error.message.includes('Validation') ||
      error.message.includes('not found in recipe')
    )) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to modify recipe ingredients',
      error: error.message
    });
  }
}

export default requireAuth(handler);
