import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';

/**
 * Export Tester Feedback as CSV (Public Endpoint)
 *
 * GET /api/feedback/export
 *
 * Query params:
 * - testerId: (Optional) Filter by specific nutritionist/tester ID
 * - nutritionistId: (Optional) Alias for testerId
 * - clientId: (Optional) Filter by client
 * - feedbackType: (Optional) Filter by feedback type
 * - startDate: (Optional) Filter feedback created after this date (ISO format)
 * - endDate: (Optional) Filter feedback created before this date (ISO format)
 */

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId, feedbackType, startDate, endDate, nutritionistId, testerId } = req.query;

    // Use testerId or nutritionistId (both are accepted, testerId takes precedence)
    const targetNutritionistId = (testerId || nutritionistId) as string | undefined;

    // Build query to get all feedback with related data
    let query = supabase
      .from('tester_feedback')
      .select(`
        *,
        client:client_id (
          id,
          first_name,
          last_name
        )
      `)
      .order('created_at', { ascending: false });

    // Filter by nutritionist/tester ID if provided
    if (targetNutritionistId) {
      query = query.eq('nutritionist_id', targetNutritionistId);
    }

    // Apply filters
    if (clientId && typeof clientId === 'string') {
      query = query.eq('client_id', clientId);
    }

    if (feedbackType && typeof feedbackType === 'string') {
      query = query.eq('feedback_type', feedbackType);
    }

    if (startDate && typeof startDate === 'string') {
      query = query.gte('created_at', startDate);
    }

    if (endDate && typeof endDate === 'string') {
      query = query.lte('created_at', endDate);
    }

    const { data: feedback, error: queryError } = await query;

    if (queryError) {
      console.error('❌ Error fetching feedback for export:', queryError);
      throw new Error(`Failed to fetch feedback: ${queryError.message}`);
    }

    // Get nutritionist details if testerId is provided
    let nutritionist: { first_name: string; last_name: string; email: string } | null = null;
    if (targetNutritionistId) {
      const { data } = await supabase
        .from('users')
        .select('first_name, last_name, email')
        .eq('id', targetNutritionistId)
        .single();
      nutritionist = data;
    }

    const testerName = nutritionist
      ? `${nutritionist.first_name} ${nutritionist.last_name}`.trim() || nutritionist.email
      : 'All Testers';

    // Generate CSV
    const csvRows: string[] = [];

    // CSV Headers
    csvRows.push([
      'Feedback ID',
      'Tester Name',
      'Tester Email',
      'Client Name',
      'Client ID',
      'Feedback Type',
      'Meal Plan ID',
      'Title',
      'Pass/Fail',
      'Rating',
      'Feedback Text',
      'Feedback Date',
      'Created At',
      'Updated At'
    ].map(escapeCSV).join(','));

    // CSV Data Rows
    for (const item of feedback || []) {
      const clientName = item.client
        ? `${item.client.first_name} ${item.client.last_name}`.trim()
        : '';

      csvRows.push([
        item.id || '',
        item.tester_name || testerName,
        item.tester_email || nutritionist?.email || '',
        clientName,
        item.client_id || '',
        getFeedbackTypeLabel(item.feedback_type),
        item.meal_plan_id || '',
        item.title || '',
        item.pass_fail ? item.pass_fail.toUpperCase() : '',
        item.rating?.toString() || '',
        item.feedback_text || '',
        item.feedback_date || '',
        item.created_at || '',
        item.updated_at || ''
      ].map(escapeCSV).join(','));
    }

    const csvContent = csvRows.join('\n');

    // Set headers for CSV download
    const nutritionistSlug = nutritionist
      ? `${nutritionist.first_name || ''}-${nutritionist.last_name || ''}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : 'all-testers';
    const filename = `feedback-${nutritionistSlug}-${new Date().toISOString().split('T')[0]}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    return res.status(200).send(csvContent);

  } catch (error) {
    console.error('❌ Feedback export error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Escape CSV field (handle commas, quotes, newlines)
 */
function escapeCSV(field: string): string {
  if (field === null || field === undefined) {
    return '';
  }

  const stringField = String(field);

  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
    return `"${stringField.replace(/"/g, '""')}"`;
  }

  return stringField;
}

/**
 * Convert feedback type enum to readable label
 */
function getFeedbackTypeLabel(feedbackType: string): string {
  const labels: { [key: string]: string } = {
    'overall_application': 'Overall Application',
    'client_onboarding': 'Client Onboarding',
    'client_details_dietary_goals': 'Client Details - Dietary Goals',
    'target_nutritional_analysis': 'Target Nutritional Analysis',
    'ai_meal_planning_overall': 'AI Meal Planning Overall',
    'automated_meal_planning_overall': 'Automated Meal Planning Overall',
    'manual_meal_planning_overall': 'Manual Meal Planning Overall',
    'ai_meal_recipe_quality': 'AI Meal - Recipe Quality',
    'ai_meal_nutritional_analysis': 'AI Meal - Nutritional Analysis',
    'auto_meal_nutrition_analysis': 'Auto Meal - Nutrition Analysis',
    'manual_meal_nutrition_analysis': 'Manual Meal - Nutrition Analysis'
  };

  return labels[feedbackType] || feedbackType;
}
