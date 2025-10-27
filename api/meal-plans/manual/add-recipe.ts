import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { manualMealPlanService } from '../../../lib/manualMealPlanService';
import { checkAllergenConflicts } from '../../../lib/allergenChecker';
import { supabase } from '../../../lib/supabase';
import Joi from 'joi';

const addRecipeSchema = Joi.object({
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  recipe: Joi.object({
    id: Joi.string().required(),
    provider: Joi.string().valid('edamam', 'spoonacular', 'bonhappetee', 'manual').required(),
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

    // Fetch client's allergen preferences
    const { data: clientGoal } = await supabase
      .from('client_goals')
      .select('allergies')
      .eq('client_id', draft.client_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Add the recipe
    const addedRecipeInfo = await manualMealPlanService.addRecipeWithAllergenCheck({
      draftId,
      day,
      mealName,
      recipeId: recipe.id,
      provider: recipe.provider,
      source: recipe.source,
      servings,
      clientAllergens: clientGoal?.allergies || []
    });

    // Fetch updated draft with complete nutrition (same structure as GET endpoint)
    const updatedDraft = await manualMealPlanService.getDraft(draftId);
    const formattedDraft = await manualMealPlanService.formatDraftResponse(updatedDraft);

    // Prepare response with allergen warning if present
    const response: any = {
      success: true,
      data: formattedDraft,
      message: 'Recipe added successfully'
    };

    // Add allergen conflict information if present
    if (addedRecipeInfo.allergenConflict && addedRecipeInfo.allergenConflict.hasConflict) {
      response.allergenWarning = {
        hasConflict: true,
        conflictingAllergens: addedRecipeInfo.allergenConflict.conflictingAllergens,
        message: `⚠️ Warning: This recipe contains allergen(s) that conflict with client preferences: ${addedRecipeInfo.allergenConflict.conflictingAllergens.join(', ')}`
      };
      response.message = 'Recipe added successfully (with allergen warning)';
    }

    return res.status(200).json(response);

  } catch (error) {
    console.error('❌ Error adding recipe:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to add recipe'
    });
  }
}

export default requireAuth(handler);

