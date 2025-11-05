import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { manualMealPlanService } from '../../../lib/manualMealPlanService';
import Joi from 'joi';

const createDraftSchema = Joi.object({
  clientId: Joi.string().uuid().required(),
  mealProgramId: Joi.string().uuid().optional(),
  planDate: Joi.string().isoDate().required(),
  durationDays: Joi.number().integer().min(1).max(30).required(),
  // Optional meal structure configuration
  mealsPerDay: Joi.number().integer().min(1).max(10).optional(),
  customMealSlots: Joi.array().items(
    Joi.object({
      mealName: Joi.string().required(),
      mealTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
      targetCalories: Joi.number().min(0).optional()
    })
  ).optional(),
  // Optional defaults
  defaultNutritionServings: Joi.number().min(0.1).max(10).optional()
});

/**
 * POST /api/meal-plans/manual/create
 * 
 * Create a new manual meal plan draft.
 * The nutritionist can optionally provide a meal program ID to use as a template.
 * The meal program structure is copied into the draft (not stored as a reference).
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can create manual meal plans'
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
    const { error, value } = createDraftSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { clientId, mealProgramId, planDate, durationDays, mealsPerDay, customMealSlots, defaultNutritionServings } = value;

    console.log('📝 Creating manual meal plan draft:', {
      nutritionist: user.email,
      clientId,
      mealProgramId,
      planDate,
      durationDays,
      mealsPerDay,
      hasCustomMealSlots: !!customMealSlots,
      defaultNutritionServings
    });

    // Create the draft
    const draftId = await manualMealPlanService.createDraft({
      clientId,
      nutritionistId: user.id,
      mealProgramId,
      planDate,
      durationDays,
      mealsPerDay,
      customMealSlots,
      defaultNutritionServings
    });

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return res.status(201).json({
      success: true,
      data: {
        draftId,
        status: 'draft',
        creationMethod: 'manual',
        planDate,
        durationDays,
        expiresAt: expiresAt.toISOString()
      },
      message: 'Manual meal plan draft created successfully'
    });

  } catch (error) {
    console.error('❌ Error creating manual meal plan draft:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to create draft'
    });
  }
}

export default requireAuth(handler);

