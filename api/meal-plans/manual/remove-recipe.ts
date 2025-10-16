import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { manualMealPlanService } from '../../../lib/manualMealPlanService';
import Joi from 'joi';

const removeRecipeSchema = Joi.object({
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipeId: Joi.string().optional(), // If provided, removes specific recipe; if not, removes all recipes
  removeMealSlot: Joi.boolean().optional().default(false) // If true, removes entire meal slot; if false, just clears recipe(s)
});

/**
 * DELETE /api/meal-plans/manual/remove-recipe
 * 
 * Remove a recipe from a specific meal slot in a manual meal plan draft.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can remove recipes from meal plans'
    });
  }

  if (req.method !== 'DELETE') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only DELETE method is allowed'
    });
  }

  try {
    // For DELETE requests, parse query params or body
    const requestData = req.method === 'DELETE' ? req.body : req.query;

    // Validate request
    const { error, value } = removeRecipeSchema.validate(requestData);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { draftId, day, mealName, recipeId, removeMealSlot } = value;

    console.log('🗑️ Removing recipe from manual meal plan:', {
      nutritionist: user.email,
      draftId,
      day,
      mealName,
      recipeId,
      removeMealSlot
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

    // Remove the recipe
    await manualMealPlanService.removeRecipe({
      draftId,
      day,
      mealName,
      recipeId,
      removeMealSlot
    });

    // Fetch updated draft with complete nutrition (same structure as GET endpoint)
    const updatedDraft = await manualMealPlanService.getDraft(draftId);
    const formattedDraft = await manualMealPlanService.formatDraftResponse(updatedDraft);

    return res.status(200).json({
      success: true,
      data: formattedDraft,
      message: 'Recipe removed successfully'
    });

  } catch (error) {
    console.error('❌ Error removing recipe:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to remove recipe'
    });
  }
}

export default requireAuth(handler);

