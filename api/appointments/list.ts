/**
 * GET /api/appointments/list
 *
 * List appointments for the authenticated user
 *
 * Query parameters:
 * - status: filter by status (scheduled, completed, cancelled, etc.)
 * - from: start date (ISO 8601)
 * - to: end date (ISO 8601)
 * - limit: number of results (default: 50)
 * - offset: pagination offset (default: 0)
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    const {
      status,
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
        nutritionist:nutritionists!appointments_nutritionist_id_fkey(
          id,
          first_name,
          last_name,
          email
        ),
        client:clients!appointments_client_id_fkey(
          id,
          first_name,
          last_name,
          email
        )
      `);

    // Filter by user
    if (user.role === 'nutritionist') {
      query = query.eq('nutritionist_id', user.id);
    } else {
      query = query.eq('client_id', user.id);
    }

    // Filter by status
    if (status && typeof status === 'string') {
      query = query.eq('status', status);
    }

    // Filter by date range
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
