import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

/**
 * Export Tester Feedback as CSV
 *
 * GET /api/feedback/export
 *
 * Query params (optional):
 * - clientId: Filter by client
 * - feedbackType: Filter by feedback type
 * - startDate: Filter feedback created after this date (ISO format)
 * - endDate: Filter feedback created before this date (ISO format)
 */

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can export feedback
  if (user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can access feedback system'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId, feedbackType, startDate, endDate } = req.query;

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
      .eq('nutritionist_id', user.id)
      .order('created_at', { ascending: false });

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

    // Get nutritionist details
    const { data: nutritionist } = await supabase
      .from('users')
      .select('first_name, last_name, email')
      .eq('id', user.id)
      .single();

    const testerName = nutritionist
      ? `${nutritionist.first_name} ${nutritionist.last_name}`.trim() || nutritionist.email
      : 'Unknown';

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
    const filename = `feedback-export-${new Date().toISOString().split('T')[0]}.csv`;
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
    'global': 'Global / Overall Product',
    'client_details': 'Client Details',
    'nutritional_analysis_overall': 'Nutritional Analysis - Overall',
    'nutritional_analysis_macro': 'Nutritional Analysis - Macros',
    'nutritional_analysis_micro': 'Nutritional Analysis - Micros',
    'meal_planning_manual': 'Meal Planning - Manual',
    'meal_planning_automated': 'Meal Planning - Automated',
    'meal_planning_ai': 'Meal Planning - AI',
    'meal_plan_quality': 'Meal Plan - Quality Rating',
    'meal_plan_nutrition': 'Meal Plan - Nutritional Analysis'
  };

  return labels[feedbackType] || feedbackType;
}

export default requireAuth(handler);
