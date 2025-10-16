import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { manualMealPlanService } from '../../../lib/manualMealPlanService';
import Joi from 'joi';

const addRecipeSchema = Joi.object({
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipe: Joi.object({
    id: Joi.string().required(),
    provider: Joi.string().valid('edamam', 'spoonacular', 'bonhappetee').required(),
    source: Joi.string().valid('api', 'cached').required()
  }).required(),
  servings: Joi.number().min(0.1).max(20).optional()
});

/**
 * POST /api/meal-plans/manual/add-recipe
 * 
 * Add a recipe to a specific meal slot in a manual meal plan draft.
 * The recipe can be fetched from the API or retrieved from cache.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can add recipes to meal plans'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    // Validate request body
    const { error, value } = addRecipeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { draftId, day, mealName, recipe, servings } = value;

    console.log('🍽️ Adding recipe to manual meal plan:', {
      nutritionist: user.email,
      draftId,
      day,
      mealName,
      recipeId: recipe.id,
      provider: recipe.provider,
      source: recipe.source
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

    // Add the recipe
    await manualMealPlanService.addRecipe({
      draftId,
      day,
      mealName,
      recipeId: recipe.id,
      provider: recipe.provider,
      source: recipe.source,
      servings
    });

    // Fetch updated draft with complete nutrition (same structure as GET endpoint)
    const updatedDraft = await manualMealPlanService.getDraft(draftId);
    const nutritionSummary = await manualMealPlanService.calculateDraftNutrition(draftId);

    return res.status(200).json({
      success: true,
      data: {
        id: updatedDraft.id,
        clientId: updatedDraft.client_id,
        nutritionistId: updatedDraft.nutritionist_id,
        status: updatedDraft.status,
        creationMethod: updatedDraft.creation_method,
        planName: updatedDraft.plan_name,
        planDate: updatedDraft.plan_date,
        endDate: updatedDraft.end_date,
        durationDays: updatedDraft.plan_duration_days,
        searchParams: updatedDraft.search_params,
        suggestions: updatedDraft.suggestions,
        nutrition: nutritionSummary,
        createdAt: updatedDraft.created_at,
        updatedAt: updatedDraft.updated_at,
        expiresAt: updatedDraft.expires_at,
        finalizedAt: updatedDraft.finalized_at
      },
      message: 'Recipe added successfully'
    });

  } catch (error) {
    console.error('❌ Error adding recipe:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to add recipe'
    });
  }
}

export default requireAuth(handler);

