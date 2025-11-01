import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { manualMealPlanService } from '../../../lib/manualMealPlanService';
import Joi from 'joi';

const updateServingsSchema = Joi.object({
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipeId: Joi.string().required(),
  nutritionServings: Joi.number().min(0.1).max(20).required(), // How many servings person is consuming
  portionSizeMultiplier: Joi.number().min(0.1).max(20).optional() // Optional: update portion size multiplier too
});

/**
 * PUT /api/meal-plans/manual/update-servings
 *
 * Update nutritionServings (and optionally portionSizeMultiplier) for an existing recipe in a meal plan draft.
 * This will automatically recalculate the nutrition without removing and re-adding the recipe.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = (req as any).user;

  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can update recipe servings'
    });
  }

  if (req.method !== 'PUT') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only PUT method is allowed'
    });
  }

  try {
    // Validate request body
    const { error, value } = updateServingsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { draftId, day, mealName, recipeId, nutritionServings, portionSizeMultiplier } = value;

    console.log('🔄 Updating recipe servings in meal plan:', {
      nutritionist: user.email,
      draftId,
      day,
      mealName,
      recipeId,
      nutritionServings,
      portionSizeMultiplier
    });

    // Verify draft exists and belongs to this nutritionist
    const draft = await manualMealPlanService.getDraft(draftId);
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified meal plan draft does not exist'
      });
    }

    if (draft.nutritionist_id !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this meal plan draft'
      });
    }

    // Update the recipe servings
    await manualMealPlanService.updateRecipeServings({
      draftId,
      day,
      mealName,
      recipeId,
      nutritionServings,
      portionSizeMultiplier
    });

    // Fetch updated draft with complete nutrition
    const updatedDraft = await manualMealPlanService.getDraft(draftId);
    const formattedDraft = await manualMealPlanService.formatDraftResponse(updatedDraft);

    return res.status(200).json({
      success: true,
      data: formattedDraft,
      message: 'Recipe servings updated successfully'
    });

  } catch (error) {
    console.error('❌ Error updating recipe servings:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to update recipe servings'
    });
  }
}

export default requireAuth(handler);
