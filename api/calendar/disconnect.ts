/**
 * POST /api/calendar/disconnect
 *
 * Disconnect Google Calendar for the authenticated user
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { googleCalendarService } from '../../lib/googleCalendarService';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    const userType = user.role === 'nutritionist' ? 'nutritionist' : 'client';

    await googleCalendarService.disconnect(user.id, userType);

    return res.status(200).json({
      success: true,
      message: 'Google Calendar disconnected successfully'
    });
  } catch (error) {
    console.error('❌ Error disconnecting calendar:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
