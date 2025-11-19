import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import Joi from 'joi';

/**
 * Tester Feedback API
 *
 * Endpoints:
 * POST /api/feedback - Submit feedback
 * GET /api/feedback - Get feedback (with filters)
 * PUT /api/feedback/:id - Update feedback
 * DELETE /api/feedback/:id - Delete feedback
 * GET /api/feedback/export - Export feedback as CSV
 */

// Validation schemas
const submitFeedbackSchema = Joi.object({
  feedbackType: Joi.string().valid(
    'overall_application',
    'client_onboarding',
    'client_details_dietary_goals',
    'target_nutritional_analysis',
    'ai_meal_planning_overall',
    'automated_meal_planning_overall',
    'manual_meal_planning_overall',
    'ai_meal_recipe_quality',
    'ai_meal_nutritional_analysis',
    'auto_meal_nutrition_analysis',
    'manual_meal_nutrition_analysis'
  ).required(),
  clientId: Joi.string().uuid().optional().allow(null),
  mealPlanId: Joi.string().optional().allow(null),
  title: Joi.string().max(255).optional().allow('', null),
  feedbackText: Joi.string().max(10000).optional().allow('', null),
  rating: Joi.number().integer().min(1).max(5).optional().allow(null),
  passFail: Joi.string().valid('pass', 'fail').optional().allow(null),
  feedbackDate: Joi.date().iso().optional().allow(null)
});

const getFeedbackSchema = Joi.object({
  feedbackType: Joi.string().valid(
    'overall_application',
    'client_onboarding',
    'client_details_dietary_goals',
    'target_nutritional_analysis',
    'ai_meal_planning_overall',
    'automated_meal_planning_overall',
    'manual_meal_planning_overall',
    'ai_meal_recipe_quality',
    'ai_meal_nutritional_analysis',
    'auto_meal_nutrition_analysis',
    'manual_meal_nutrition_analysis'
  ).optional(),
  clientId: Joi.string().uuid().optional(),
  mealPlanId: Joi.string().optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(50)
});

const updateFeedbackSchema = Joi.object({
  title: Joi.string().max(255).optional().allow('', null),
  feedbackText: Joi.string().max(10000).optional().allow('', null),
  rating: Joi.number().integer().min(1).max(5).optional().allow(null),
  passFail: Joi.string().valid('pass', 'fail').optional().allow(null),
  feedbackDate: Joi.date().iso().optional().allow(null)
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can submit feedback
  if (user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can access feedback system'
    });
  }

  try {
    switch (req.method) {
      case 'POST':
        return await handleSubmitFeedback(req, res, user);
      case 'GET':
        return await handleGetFeedback(req, res, user);
      case 'PUT':
        return await handleUpdateFeedback(req, res, user);
      case 'DELETE':
        return await handleDeleteFeedback(req, res, user);
      default:
        return res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('❌ Feedback API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Submit new feedback
 */
async function handleSubmitFeedback(
  req: VercelRequest,
  res: VercelResponse,
  user: any
): Promise<VercelResponse> {
  const { error: validationError, value } = submitFeedbackSchema.validate(req.body);

  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  const { feedbackType, clientId, mealPlanId, title, feedbackText, rating, passFail, feedbackDate } = value;

  // Validate rating is only provided for recipe quality feedback
  if (rating && feedbackType !== 'ai_meal_recipe_quality') {
    return res.status(400).json({
      error: 'Invalid data',
      message: 'Rating can only be provided for ai_meal_recipe_quality feedback'
    });
  }

  // Validate client-specific feedback has clientId
  if ((feedbackType === 'client_onboarding' || feedbackType === 'client_details_dietary_goals') && !clientId) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'clientId is required for client-specific feedback'
    });
  }

  // Validate meal-specific feedback has mealPlanId
  if ((feedbackType === 'ai_meal_recipe_quality' ||
       feedbackType === 'ai_meal_nutritional_analysis' ||
       feedbackType === 'auto_meal_nutrition_analysis' ||
       feedbackType === 'manual_meal_nutrition_analysis') && !mealPlanId) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'mealPlanId is required for meal-specific feedback'
    });
  }

  // Get tester (nutritionist) info for denormalization
  const { data: tester } = await supabase
    .from('users')
    .select('first_name, last_name, email')
    .eq('id', user.id)
    .single();

  const testerName = tester
    ? `${tester.first_name || ''} ${tester.last_name || ''}`.trim() || tester.email
    : '';
  const testerEmail = tester?.email || '';

  // Insert feedback
  const { data: feedback, error: insertError } = await supabase
    .from('tester_feedback')
    .insert({
      nutritionist_id: user.id,
      feedback_type: feedbackType,
      client_id: clientId || null,
      meal_plan_id: mealPlanId || null,
      title: title || null,
      feedback_text: feedbackText || null,
      rating: rating || null,
      pass_fail: passFail || null,
      feedback_date: feedbackDate || new Date().toISOString().split('T')[0],
      tester_name: testerName,
      tester_email: testerEmail
    })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error inserting feedback:', insertError);
    throw new Error(`Failed to submit feedback: ${insertError.message}`);
  }

  return res.status(201).json({
    success: true,
    message: 'Feedback submitted successfully',
    data: {
      id: feedback.id,
      feedbackType: feedback.feedback_type,
      clientId: feedback.client_id,
      mealPlanId: feedback.meal_plan_id,
      title: feedback.title,
      feedbackText: feedback.feedback_text,
      rating: feedback.rating,
      passFail: feedback.pass_fail,
      feedbackDate: feedback.feedback_date,
      testerName: feedback.tester_name,
      testerEmail: feedback.tester_email,
      createdAt: feedback.created_at
    }
  });
}

/**
 * Get feedback with filters
 */
async function handleGetFeedback(
  req: VercelRequest,
  res: VercelResponse,
  user: any
): Promise<VercelResponse> {
  const { error: validationError, value } = getFeedbackSchema.validate(req.query);

  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  const { feedbackType, clientId, mealPlanId, page, pageSize } = value;

  // Build query
  let query = supabase
    .from('tester_feedback')
    .select('*', { count: 'exact' })
    .eq('nutritionist_id', user.id)
    .order('created_at', { ascending: false });

  // Apply filters
  if (feedbackType) {
    query = query.eq('feedback_type', feedbackType);
  }

  if (clientId) {
    query = query.eq('client_id', clientId);
  }

  if (mealPlanId) {
    query = query.eq('meal_plan_id', mealPlanId);
  }

  // Apply pagination
  const offset = (page - 1) * pageSize;
  query = query.range(offset, offset + pageSize - 1);

  const { data: feedback, error: queryError, count } = await query;

  if (queryError) {
    console.error('❌ Error fetching feedback:', queryError);
    throw new Error(`Failed to fetch feedback: ${queryError.message}`);
  }

  // Transform data
  const transformedFeedback = (feedback || []).map((f: any) => ({
    id: f.id,
    feedbackType: f.feedback_type,
    clientId: f.client_id,
    mealPlanId: f.meal_plan_id,
    title: f.title,
    feedbackText: f.feedback_text,
    rating: f.rating,
    passFail: f.pass_fail,
    feedbackDate: f.feedback_date,
    testerName: f.tester_name,
    testerEmail: f.tester_email,
    createdAt: f.created_at,
    updatedAt: f.updated_at
  }));

  return res.status(200).json({
    success: true,
    data: {
      feedback: transformedFeedback,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    }
  });
}

/**
 * Update existing feedback
 */
async function handleUpdateFeedback(
  req: VercelRequest,
  res: VercelResponse,
  user: any
): Promise<VercelResponse> {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'Feedback ID is required'
    });
  }

  const { error: validationError, value } = updateFeedbackSchema.validate(req.body);

  if (validationError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: validationError.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  const { title, feedbackText, rating, passFail, feedbackDate } = value;

  // Check if feedback exists and belongs to user
  const { data: existing, error: fetchError } = await supabase
    .from('tester_feedback')
    .select('id, nutritionist_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Feedback not found'
    });
  }

  if (existing.nutritionist_id !== user.id) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You do not have access to this feedback'
    });
  }

  // Update feedback
  const updateData: any = {};
  if (title !== undefined) updateData.title = title;
  if (feedbackText !== undefined) updateData.feedback_text = feedbackText;
  if (rating !== undefined) updateData.rating = rating;
  if (passFail !== undefined) updateData.pass_fail = passFail;
  if (feedbackDate !== undefined) updateData.feedback_date = feedbackDate;

  const { data: updated, error: updateError } = await supabase
    .from('tester_feedback')
    .update(updateData)
    .eq('id', id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating feedback:', updateError);
    throw new Error(`Failed to update feedback: ${updateError.message}`);
  }

  return res.status(200).json({
    success: true,
    message: 'Feedback updated successfully',
    data: {
      id: updated.id,
      feedbackType: updated.feedback_type,
      clientId: updated.client_id,
      mealPlanId: updated.meal_plan_id,
      title: updated.title,
      feedbackText: updated.feedback_text,
      rating: updated.rating,
      passFail: updated.pass_fail,
      feedbackDate: updated.feedback_date,
      testerName: updated.tester_name,
      testerEmail: updated.tester_email,
      updatedAt: updated.updated_at
    }
  });
}

/**
 * Delete feedback
 */
async function handleDeleteFeedback(
  req: VercelRequest,
  res: VercelResponse,
  user: any
): Promise<VercelResponse> {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Missing parameter',
      message: 'Feedback ID is required'
    });
  }

  // Check if feedback exists and belongs to user
  const { data: existing, error: fetchError } = await supabase
    .from('tester_feedback')
    .select('id, nutritionist_id')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return res.status(404).json({
      error: 'Not found',
      message: 'Feedback not found'
    });
  }

  if (existing.nutritionist_id !== user.id) {
    return res.status(403).json({
      error: 'Access denied',
      message: 'You do not have access to this feedback'
    });
  }

  // Delete feedback
  const { error: deleteError } = await supabase
    .from('tester_feedback')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('❌ Error deleting feedback:', deleteError);
    throw new Error(`Failed to delete feedback: ${deleteError.message}`);
  }

  return res.status(200).json({
    success: true,
    message: 'Feedback deleted successfully'
  });
}

export default requireAuth(handler);
