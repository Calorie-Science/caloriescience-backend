/**
 * GET /api/appointments/list
 *
 * List appointments for the authenticated user
 *
 * Query parameters:
 * - status: filter by status (scheduled, completed, cancelled, etc.)
 * - clientId: filter by client ID (nutritionists only)
 * - from: start date (ISO 8601)
 * - to: end date (ISO 8601)
 * - limit: number of results (default: 50)
 * - offset: pagination offset (default: 0)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';
import { RecurringAppointmentService } from '../../lib/recurringAppointmentService';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    const {
      status,
      clientId,
      from,
      to,
      limit = '50',
      offset = '0'
    } = req.query;

    // Build query
    let query = supabase
      .from('appointments')
      .select(`
        *,
        nutritionist:users!appointments_nutritionist_id_fkey(
          id,
          email,
          full_name
        ),
        client:clients!appointments_client_id_fkey(
          id,
          email,
          full_name
        )
      `);

    // Filter by user
    if (user.role === 'nutritionist') {
      query = query.eq('nutritionist_id', user.id);
    } else {
      query = query.eq('client_id', user.id);
    }

    // Filter by client ID (nutritionists only)
    if (clientId && typeof clientId === 'string' && user.role === 'nutritionist') {
      query = query.eq('client_id', clientId);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    // Filter by date range
    const startDate = from && typeof from === 'string' ? new Date(from) : new Date();
    const endDate = to && typeof to === 'string' ? new Date(to) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // Default: 30 days ahead

    if (from && typeof from === 'string') {
      query = query.gte('start_time', from);
    }
    if (to && typeof to === 'string') {
      query = query.lte('start_time', to);
    }

    // Order by start time
    query = query.order('start_time', { ascending: true });

    // Pagination
    const limitNum = parseInt(limit as string);
    const offsetNum = parseInt(offset as string);
    query = query.range(offsetNum, offsetNum + limitNum - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Error fetching appointments:', error);
      return res.status(500).json({
        error: 'Failed to fetch appointments',
        message: error.message
      });
    }

    // Generate missing recurring appointment instances if date range is provided
    if ((from || to) && user.role === 'nutritionist') {
      try {
        const recurringService = new RecurringAppointmentService();
        await recurringService.getAppointmentsForCalendarView(
          user.id,
          startDate,
          endDate
        );

        // Fetch again to get newly generated instances
        let updatedQuery = supabase
          .from('appointments')
          .select(`
            *,
            nutritionist:users!appointments_nutritionist_id_fkey(
              id,
              email,
              full_name
            ),
            client:clients!appointments_client_id_fkey(
              id,
              email,
              full_name
            )
          `)
          .eq('nutritionist_id', user.id);

        if (from && typeof from === 'string') {
          updatedQuery = updatedQuery.gte('start_time', from);
        }
        if (to && typeof to === 'string') {
          updatedQuery = updatedQuery.lte('start_time', to);
        }
        if (clientId && typeof clientId === 'string') {
          updatedQuery = updatedQuery.eq('client_id', clientId);
        }
        if (status && typeof status === 'string') {
          updatedQuery = updatedQuery.eq('status', status);
        }

        updatedQuery = updatedQuery
          .order('start_time', { ascending: true })
          .range(offsetNum, offsetNum + limitNum - 1);

        const { data: updatedData } = await updatedQuery;
        return res.status(200).json({
          success: true,
          data: updatedData || [],
          pagination: {
            limit: limitNum,
            offset: offsetNum,
            total: updatedData?.length || 0
          }
        });
      } catch (recurringError) {
        console.error('⚠️ Error generating recurring instances:', recurringError);
        // Continue with original data if generation fails
      }
    }

    return res.status(200).json({
      success: true,
      data: data || [],
      pagination: {
        limit: limitNum,
        offset: offsetNum,
        total: count || data?.length || 0
      }
    });
  } catch (error) {
    console.error('❌ Error listing appointments:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
