import type { VercelRequest, VercelResponse } from '@vercel/node';
import Joi from 'joi';
import { getUserFromToken } from '../../../lib/auth';
import { ManualMealPlanService } from '../../../lib/manualMealPlanService';

const copyDaySchema = Joi.object({
  draftId: Joi.string().required(),
  sourceDay: Joi.number().integer().min(1).required(),
  targetDay: Joi.number().integer().min(1).required(),
  extendIfNeeded: Joi.boolean().default(false)
});

/**
 * Copy entire day's meal plan to another day
 * 
 * POST /api/meal-plans/manual/copy-day
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    // Authenticate user
    const user = await getUserFromToken(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Only nutritionists can copy days in manual meal plans
    if (user.role !== 'nutritionist') {
      return res.status(403).json({
        success: false,
        message: 'Only nutritionists can copy days in manual meal plans'
      });
    }

    // Validate request body
    const { error, value } = copyDaySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { draftId, sourceDay, targetDay, extendIfNeeded } = value;

    // Validate draft belongs to nutritionist
    const { supabase } = await import('../../../lib/supabase');
    const { data: draft, error: draftError } = await supabase
      .from('meal_plan_drafts')
      .select('nutritionist_id, creation_method, plan_duration_days')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      return res.status(404).json({
        success: false,
        message: 'Draft not found'
      });
    }

    if (draft.nutritionist_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (draft.creation_method !== 'manual') {
      return res.status(400).json({
        success: false,
        message: 'This endpoint only works with manual meal plans'
      });
    }

    // Validate sourceDay and targetDay are different
    if (sourceDay === targetDay) {
      return res.status(400).json({
        success: false,
        message: 'Source day and target day must be different'
      });
    }

    // Copy the day
    const service = new ManualMealPlanService();
    await service.copyDayToDay({
      draftId,
      sourceDay,
      targetDay,
      extendIfNeeded
    });

    // Fetch the updated draft
    const { data: updatedDraft } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    // Calculate nutrition
    const updatedDraftWithNutrition = await service.getDraftWithNutrition(draftId);

    return res.status(200).json({
      success: true,
      data: updatedDraftWithNutrition,
      message: `Successfully copied day ${sourceDay} to day ${targetDay}${updatedDraft.plan_duration_days > draft.plan_duration_days ? ` (extended plan to ${updatedDraft.plan_duration_days} days)` : ''}`
    });

  } catch (error: any) {
    console.error('❌ Error copying day:', error);
    
    // Handle specific error messages
    if (error.message.includes('not found') || error.message.includes('Draft not found')) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    if (error.message.includes('beyond plan duration')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to copy day',
      error: error.message
    });
  }
}

export default handler;

