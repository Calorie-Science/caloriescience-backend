import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { manualMealPlanService } from '../../../lib/manualMealPlanService';

/**
 * GET /api/meal-plans/manual/{id}
 * 
 * Get a manual meal plan draft by ID.
 * Returns the complete draft structure with all recipes and customizations.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can view meal plans'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    // Get draft ID from URL path
    const draftId = req.query.id as string;

    if (!draftId) {
      return res.status(400).json({
        error: 'Missing parameter',
        message: 'Draft ID is required'
      });
    }

    console.log('📖 Fetching manual meal plan:', {
      nutritionist: user.email,
      draftId
    });

    // Fetch the draft
    const draft = await manualMealPlanService.getDraft(draftId);
    
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified meal plan draft does not exist or has expired'
      });
    }

    // Verify access
    if (draft.nutritionist_id !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this meal plan draft'
      });
    }

    // Return the complete draft
    return res.status(200).json({
      success: true,
      data: {
        id: draft.id,
        clientId: draft.client_id,
        nutritionistId: draft.nutritionist_id,
        status: draft.status,
        creationMethod: draft.creation_method,
        planName: draft.plan_name,
        planDate: draft.plan_date,
        endDate: draft.end_date,
        durationDays: draft.plan_duration_days,
        searchParams: draft.search_params,
        suggestions: draft.suggestions,
        createdAt: draft.created_at,
        updatedAt: draft.updated_at,
        expiresAt: draft.expires_at,
        finalizedAt: draft.finalized_at
      },
      message: 'Meal plan draft retrieved successfully'
    });

  } catch (error) {
    console.error('❌ Error fetching meal plan draft:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch meal plan draft'
    });
  }
}

export default requireAuth(handler);

