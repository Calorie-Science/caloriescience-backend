import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { manualMealPlanService } from '../../../lib/manualMealPlanService';
import Joi from 'joi';

const finalizeSchema = Joi.object({
  draftId: Joi.string().required(),
  planName: Joi.string().min(1).max(255).required()
});

/**
 * POST /api/meal-plans/manual/finalize
 * 
 * Finalize a manual meal plan draft.
 * This validates that all meal slots have recipes and marks the plan as finalized.
 * Finalized plans no longer expire and cannot be edited (but ingredients can still be modified).
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can finalize meal plans'
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
    const { error, value } = finalizeSchema.validate(req.body);
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

    console.log('✅ Finalizing manual meal plan:', {
      nutritionist: user.email,
      draftId,
      planName
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

    // Finalize the plan
    await manualMealPlanService.finalize(draftId, planName);

    // Fetch updated draft with complete nutrition (same structure as GET endpoint)
    const finalizedPlan = await manualMealPlanService.getDraft(draftId);
    const formattedDraft = await manualMealPlanService.formatDraftResponse(finalizedPlan);

    return res.status(200).json({
      success: true,
      data: formattedDraft,
      message: 'Meal plan finalized successfully'
    });

  } catch (error) {
    console.error('❌ Error finalizing meal plan:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to finalize meal plan'
    });
  }
}

export default requireAuth(handler);

