import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import Joi from 'joi';

const getRecentMealPlansSchema = Joi.object({
  clientId: Joi.string().uuid().optional(),
  type: Joi.string().valid('auto_generated', 'manual', 'ai_generated').optional(),
  status: Joi.string().valid('draft', 'finalized', 'active', 'completed', 'cancelled').optional(),
  includeDrafts: Joi.boolean().default(true),
  includeFinalized: Joi.boolean().default(true),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(20),
  sortBy: Joi.string().valid('created_at', 'updated_at', 'plan_date').default('updated_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

/**
 * GET /api/meal-plans/recent
 *
 * Get recent meal plans (both drafts and finalized) with filters.
 *
 * Query parameters:
 * - clientId: Filter by client ID
 * - type: Filter by creation method (auto_generated, manual, ai_generated)
 * - status: Filter by status (draft, finalized, active, completed, cancelled)
 * - includeDrafts: Include draft meal plans (default: true)
 * - includeFinalized: Include finalized meal plans (default: true)
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - sortBy: Sort field (created_at, updated_at, plan_date)
 * - sortOrder: Sort order (asc, desc)
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access meal plans
  if (user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can access meal plans'
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate query parameters
    const { error, value } = getRecentMealPlansSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const {
      clientId,
      type,
      status,
      includeDrafts,
      includeFinalized,
      page,
      pageSize,
      sortBy,
      sortOrder
    } = value;

    // Build query for meal_plan_drafts (which contains both drafts and finalized plans)
    let query = supabase
      .from('meal_plan_drafts')
      .select('*', { count: 'exact' })
      .eq('nutritionist_id', user.id);

    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (type) {
      query = query.eq('creation_method', type);
    }

    // Apply status filters based on includeDrafts and includeFinalized
    const statusFilters: string[] = [];
    if (includeDrafts) {
      statusFilters.push('draft');
    }
    if (includeFinalized) {
      statusFilters.push('finalized');
    }

    if (status) {
      // If specific status is requested, use it
      query = query.eq('status', status);
    } else if (statusFilters.length > 0 && statusFilters.length < 2) {
      // If only one of includeDrafts/includeFinalized is true, filter by that status
      query = query.eq('status', statusFilters[0]);
    }
    // If both are true or both are false, don't filter by status

    const { data: plans, error: plansError, count: totalCount } = await query;

    if (plansError) {
      console.error('❌ Error fetching meal plans:', plansError);
      throw new Error(`Failed to fetch meal plans: ${plansError.message}`);
    }

    // Enrich plans with plan_type based on status
    const allPlans = (plans || []).map(plan => ({
      ...plan,
      plan_type: plan.status === 'draft' ? 'draft' : 'finalized',
      // Standardize field names
      plan_date: plan.plan_date,
      plan_name: plan.plan_name,
      creation_method: plan.creation_method,
      duration_days: plan.plan_duration_days
    }));

    // Sort all plans
    const sortField = sortBy === 'plan_date' ? 'plan_date' : sortBy;
    allPlans.sort((a, b) => {
      const aValue = a[sortField] || a.created_at;
      const bValue = b[sortField] || b.created_at;

      if (sortOrder === 'asc') {
        return new Date(aValue).getTime() - new Date(bValue).getTime();
      } else {
        return new Date(bValue).getTime() - new Date(aValue).getTime();
      }
    });

    // Apply pagination
    const offset = (page - 1) * pageSize;
    const paginatedPlans = allPlans.slice(offset, offset + pageSize);

    // Enrich with additional info
    const enrichedPlans = await Promise.all(
      paginatedPlans.map(async (plan) => {
        // Fetch client info
        const { data: client } = await supabase
          .from('clients')
          .select('id, first_name, last_name, email')
          .eq('id', plan.client_id)
          .single();

        // Calculate summary based on plan type
        let summary: any = {
          totalDays: plan.duration_days || 0,
          totalMeals: 0,
          selectedMeals: 0,
          completionPercentage: 0
        };

        // Calculate from suggestions (same for both draft and finalized in meal_plan_drafts)
        const suggestions = plan.suggestions || [];
        summary.totalMeals = suggestions.reduce((sum: number, day: any) =>
          sum + Object.keys(day.meals || {}).length, 0
        );
        summary.selectedMeals = suggestions.reduce((sum: number, day: any) =>
          sum + Object.values(day.meals || {}).filter((meal: any) => meal.selectedRecipeId).length, 0
        );
        summary.completionPercentage = summary.totalMeals > 0
          ? Math.round((summary.selectedMeals / summary.totalMeals) * 100)
          : 0;

        return {
          id: plan.id,
          planType: plan.plan_type,
          clientId: plan.client_id,
          client: client ? {
            id: client.id,
            name: `${client.first_name} ${client.last_name}`,
            email: client.email
          } : null,
          planName: plan.plan_name,
          planDate: plan.plan_date,
          status: plan.status,
          creationMethod: plan.creation_method,
          durationDays: plan.duration_days,
          summary,
          createdAt: plan.created_at,
          updatedAt: plan.updated_at,
          finalizedAt: plan.finalized_at || null,
          expiresAt: plan.expires_at || null
        };
      })
    );

    // Prepare response
    const totalPages = Math.ceil(totalCount / pageSize);

    return res.status(200).json({
      success: true,
      data: {
        plans: enrichedPlans,
        pagination: {
          page,
          pageSize,
          totalCount,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          clientId: clientId || null,
          type: type || null,
          status: status || null,
          includeDrafts,
          includeFinalized
        },
        summary: {
          totalPlans: totalCount,
          draftsCount: includeDrafts ? allPlans.filter(p => p.plan_type === 'draft').length : 0,
          finalizedCount: includeFinalized ? allPlans.filter(p => p.plan_type === 'finalized').length : 0
        }
      },
      message: `Retrieved ${enrichedPlans.length} meal plan(s)`
    });

  } catch (error) {
    console.error('❌ Error fetching recent meal plans:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch meal plans'
    });
  }
}

export default requireAuth(handler);
