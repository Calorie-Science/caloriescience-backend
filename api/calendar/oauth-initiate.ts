/**
 * GET /api/calendar/oauth-initiate
 *
 * Initiate Google Calendar OAuth flow
 *
 * This endpoint generates a secure state token and redirects the user to Google's OAuth consent screen
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { googleCalendarService } from '../../lib/googleCalendarService';
import { supabase } from '../../lib/supabase';
import crypto from 'crypto';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    // Determine user type
    const userType = user.role === 'nutritionist' ? 'nutritionist' : 'client';

    // Generate secure random state for CSRF protection
    const state = crypto.randomBytes(32).toString('hex');

    // Store state in database with expiration
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

    const { error: stateError } = await supabase
      .from('google_oauth_states')
      .insert({
        state: state,
        user_id: user.id,
        user_type: userType,
        redirect_uri: req.query.redirect_uri as string || null,
        expires_at: expiresAt.toISOString()
      });

    if (stateError) {
      console.error('❌ Error storing OAuth state:', stateError);
      return res.status(500).json({
        error: 'Failed to initiate OAuth',
        message: stateError.message
      });
    }

    // Clean up expired states (optional, can also be done via cron)
    await supabase
      .from('google_oauth_states')
      .delete()
      .lt('expires_at', new Date().toISOString());

    // Generate Google OAuth URL
    const authUrl = googleCalendarService.generateAuthUrl(state);

    console.log(`🔐 OAuth initiated for ${userType}: ${user.id}`);

    // Return auth URL for client to redirect
    return res.status(200).json({
      authUrl: authUrl,
      state: state,
      message: 'Redirect user to authUrl to complete OAuth'
    });
  } catch (error) {
    console.error('❌ Error initiating OAuth:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
