import type { VercelRequest, VercelResponse } from '@vercel/node';
import Joi from 'joi';
import { requireAuth } from '../../../lib/auth';
import { ManualMealPlanService } from '../../../lib/manualMealPlanService';

const copyDaySchema = Joi.object({
  draftId: Joi.string().required(),
  sourceDay: Joi.number().integer().min(1).required(),
  targetDay: Joi.number().integer().min(1).optional(),
  targetDays: Joi.array().items(Joi.number().integer().min(1)).min(1).optional()
}).or('targetDay', 'targetDays');

/**
 * Copy entire day's meal plan to another day or multiple days
 * 
 * Supports both single target (targetDay) and multiple targets (targetDays array)
 * 
 * POST /api/meal-plans/manual/copy-day
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  // Only nutritionists can copy days in manual meal plans
  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      success: false,
      message: 'Only nutritionists can copy days in manual meal plans'
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {

    // Validate request body
    const { error, value } = copyDaySchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const { draftId, sourceDay, targetDay, targetDays } = value;

    // Normalize targetDays to array
    const targetDaysArray = targetDays || (targetDay ? [targetDay] : []);

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

    // Remove duplicates and validate no target day matches source day
    const uniqueTargetDays = [...new Set(targetDaysArray)];
    const invalidTargets = uniqueTargetDays.filter(day => day === sourceDay);
    
    if (invalidTargets.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Source day and target days must be different'
      });
    }

    // Copy to all target days
    const service = new ManualMealPlanService();
    const copiedDays: number[] = [];
    let maxExtendedDuration = draft.plan_duration_days;
    let lastError: Error | null = null;

    // Sort target days to handle extension properly (copy to smaller days first)
    const sortedTargetDays = [...uniqueTargetDays].sort((a, b) => a - b);

    for (const target of sortedTargetDays) {
      try {
        await service.copyDayToDay({
          draftId,
          sourceDay,
          targetDay: target,
          extendIfNeeded: true
        });

        copiedDays.push(target);

        // Update max extended duration
        const { data: updatedDraft } = await supabase
          .from('meal_plan_drafts')
          .select('plan_duration_days')
          .eq('id', draftId)
          .single();
        
        if (updatedDraft && updatedDraft.plan_duration_days > maxExtendedDuration) {
          maxExtendedDuration = updatedDraft.plan_duration_days;
        }
      } catch (error: any) {
        console.error(`Error copying to day ${target}:`, error);
        lastError = error;
        // Continue with other targets even if one fails
      }
    }

    // If no days were copied, return error
    if (copiedDays.length === 0) {
      return res.status(500).json({
        success: false,
        message: 'Failed to copy day to any target',
        error: lastError?.message || 'Unknown error'
      });
    }

    // Fetch the updated draft
    const { data: updatedDraft } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    // Get formatted draft with nutrition
    const draftData = await service.getDraft(draftId);
    const formattedDraft = await service.formatDraftResponse(draftData);

    // Build success message
    const extensionMessage = maxExtendedDuration > draft.plan_duration_days 
      ? ` (extended plan to ${maxExtendedDuration} days)` 
      : '';
    
    const targetMessage = copiedDays.length === 1
      ? `day ${copiedDays[0]}`
      : `days ${copiedDays.sort((a, b) => a - b).join(', ')}`;
    
    const partialCopyMessage = copiedDays.length < uniqueTargetDays.length
      ? ` (${copiedDays.length} of ${uniqueTargetDays.length} targets copied successfully)`
      : '';

    return res.status(200).json({
      success: true,
      data: formattedDraft,
      message: `Successfully copied day ${sourceDay} to ${targetMessage}${extensionMessage}${partialCopyMessage}`
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

    return res.status(500).json({
      success: false,
      message: 'Failed to copy day',
      error: error.message
    });
  }
}

export default requireAuth(handler);

