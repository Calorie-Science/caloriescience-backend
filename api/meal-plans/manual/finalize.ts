import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { manualMealPlanService } from '../../../lib/manualMealPlanService';
import Joi from 'joi';

const finalizeSchema = Joi.object({
  draftId: Joi.string().required(),
  planName: Joi.string().min(1).max(255).optional()
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

    let { draftId, planName } = value;

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

    // Generate unique plan name if not provided
    if (!planName) {
      // Get client name for the plan name
      const { supabase } = require('../../../lib/supabase');
      const { data: client } = await supabase
        .from('clients')
        .select('first_name, last_name')
        .eq('id', draft.client_id)
        .single();

      const clientName = client
        ? `${client.first_name} ${client.last_name}`.trim()
        : 'Client';

      // Format: "ClientName - Manual Plan - YYYY-MM-DD HH:MM:SS"
      const planDate = new Date(draft.plan_date);
      const now = new Date();
      const dateStr = planDate.toISOString().split('T')[0];
      const timeStr = now.toISOString().split('T')[1].substring(0, 8); // HH:MM:SS
      planName = `${clientName} - Manual Plan - ${dateStr} ${timeStr}`;

      console.log(`📝 Generated unique plan name: ${planName}`);
    }

    console.log('✅ Finalizing manual meal plan:', {
      nutritionist: user.email,
      draftId,
      planName
    });

    // Check if plan name is already in use by this nutritionist
    // If it is, auto-rename by appending a number
    const { supabase } = require('../../../lib/supabase');
    const { data: existingPlan } = await supabase
      .from('meal_plan_drafts')
      .select('id, plan_name')
      .eq('nutritionist_id', user.id)
      .eq('plan_name', planName)
      .neq('id', draftId)
      .single();

    if (existingPlan) {
      console.log(`⚠️ Plan name "${planName}" already exists, auto-renaming...`);

      // Find all plans with similar names to get the next number
      const { data: similarPlans } = await supabase
        .from('meal_plan_drafts')
        .select('plan_name')
        .eq('nutritionist_id', user.id)
        .like('plan_name', `${planName}%`)
        .neq('id', draftId);

      // Extract numbers from existing plan names (e.g., "Plan Name (2)")
      const numbers: number[] = [0];
      if (similarPlans) {
        for (const plan of similarPlans) {
          const match = plan.plan_name.match(/\((\d+)\)$/);
          if (match) {
            numbers.push(parseInt(match[1]));
          }
        }
      }

      // Get the next available number
      const nextNumber = Math.max(...numbers) + 1;
      planName = `${planName} (${nextNumber})`;

      console.log(`✅ Auto-renamed to: ${planName}`);
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

