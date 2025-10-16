import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { manualMealPlanService } from '../../../lib/manualMealPlanService';
import Joi from 'joi';

const createMealSlotSchema = Joi.object({
  action: Joi.string().valid('create').required(),
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  mealTime: Joi.string().optional(), // HH:MM format
  targetCalories: Joi.number().min(0).optional()
});

const updateMealSlotSchema = Joi.object({
  action: Joi.string().valid('update').required(),
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required(),
  mealTime: Joi.string().optional(),
  targetCalories: Joi.number().min(0).optional()
});

const deleteMealSlotSchema = Joi.object({
  action: Joi.string().valid('delete').required(),
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required()
});

/**
 * POST /api/meal-plans/manual/meal-slot
 * 
 * Manage meal slots in a manual meal plan draft.
 * Actions: create, update, delete
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can manage meal slots'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only POST method is allowed'
    });
  }

  try {
    const { action } = req.body;

    switch (action) {
      case 'create':
        return await handleCreateMealSlot(req, res, user);
      case 'update':
        return await handleUpdateMealSlot(req, res, user);
      case 'delete':
        return await handleDeleteMealSlot(req, res, user);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be one of: create, update, delete'
        });
    }
  } catch (error) {
    console.error('❌ Error managing meal slot:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to manage meal slot'
    });
  }
}

async function handleCreateMealSlot(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = createMealSlotSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { draftId, day, mealName, mealTime, targetCalories } = value;

  // Verify draft access
  const draft = await manualMealPlanService.getDraft(draftId);
  if (!draft || draft.nutritionist_id !== user.id) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Draft not found or access denied'
    });
  }

  await manualMealPlanService.createMealSlot({
    draftId,
    day,
    mealName,
    mealTime,
    targetCalories
  });

  // Return updated draft
  const updatedDraft = await manualMealPlanService.getDraft(draftId);
  const formattedDraft = await manualMealPlanService.formatDraftResponse(updatedDraft);

  return res.status(200).json({
    success: true,
    data: formattedDraft,
    message: 'Meal slot created successfully'
  });
}

async function handleUpdateMealSlot(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = updateMealSlotSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { draftId, day, mealName, mealTime, targetCalories } = value;

  // Verify draft access
  const draft = await manualMealPlanService.getDraft(draftId);
  if (!draft || draft.nutritionist_id !== user.id) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Draft not found or access denied'
    });
  }

  await manualMealPlanService.updateMealSlot({
    draftId,
    day,
    mealName,
    mealTime,
    targetCalories
  });

  // Return updated draft
  const updatedDraft = await manualMealPlanService.getDraft(draftId);
  const formattedDraft = await manualMealPlanService.formatDraftResponse(updatedDraft);

  return res.status(200).json({
    success: true,
    data: formattedDraft,
    message: 'Meal slot updated successfully'
  });
}

async function handleDeleteMealSlot(req: VercelRequest, res: VercelResponse, user: any): Promise<VercelResponse> {
  const { error, value } = deleteMealSlotSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { draftId, day, mealName } = value;

  // Verify draft access
  const draft = await manualMealPlanService.getDraft(draftId);
  if (!draft || draft.nutritionist_id !== user.id) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Draft not found or access denied'
    });
  }

  await manualMealPlanService.deleteMealSlot({
    draftId,
    day,
    mealName
  });

  // Return updated draft
  const updatedDraft = await manualMealPlanService.getDraft(draftId);
  const formattedDraft = await manualMealPlanService.formatDraftResponse(updatedDraft);

  return res.status(200).json({
    success: true,
    data: formattedDraft,
    message: 'Meal slot deleted successfully'
  });
}

export default requireAuth(handler);

