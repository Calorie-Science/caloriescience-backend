/**
 * GET /api/calendar/oauth-status
 *
 * Check Google Calendar OAuth connection status for the authenticated user
 *
 * Returns:
 * - connected: true/false
 * - googleEmail: email if connected
 * - lastSyncAt: last sync timestamp
 * - syncError: any sync errors
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { googleCalendarService } from '../../lib/googleCalendarService';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    // Determine user type (nutritionist or client based on role)
    const userType = user.role === 'nutritionist' ? 'nutritionist' : 'client';

    // Check if connection exists
    const connection = await googleCalendarService.getConnection(user.id, userType);

    if (!connection) {
      return res.status(200).json({
        connected: false,
        message: 'Google Calendar not connected'
      });
    }

    // Check if token is still valid
    const now = new Date();
    const expiry = new Date(connection.tokenExpiry);
    const isExpired = expiry.getTime() <= now.getTime();

    // Try to refresh if expired
    if (isExpired) {
      try {
        await googleCalendarService.ensureValidToken(connection);
      } catch (error) {
        return res.status(200).json({
          connected: false,
          expired: true,
          message: 'Access token expired and refresh failed. Please reconnect.',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return res.status(200).json({
      connected: true,
      googleEmail: connection.googleEmail,
      primaryCalendarId: connection.primaryCalendarId,
      timezone: connection.timezone,
      lastSyncAt: connection.lastSyncAt,
      syncError: connection.syncError,
      tokenExpiry: connection.tokenExpiry,
      scope: connection.scope
    });
  } catch (error) {
    console.error('❌ Error checking OAuth status:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
