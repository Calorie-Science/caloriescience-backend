/**
 * GET /api/calendar/oauth-callback
 *
 * OAuth callback endpoint - Google redirects here after user grants/denies access
 *
 * Query params:
 * - code: Authorization code from Google
 * - state: State parameter for CSRF validation
 * - error: Error if user denied access
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { googleCalendarService } from '../../lib/googleCalendarService';
import { supabase } from '../../lib/supabase';
import { google } from 'googleapis';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { code, state, error: oauthError } = req.query;

  try {
    // Check if user denied access
    if (oauthError) {
      console.log('⚠️ User denied OAuth access');
      return res.status(400).json({
        error: 'Access denied',
        message: 'User denied Google Calendar access'
      });
    }

    // Validate required parameters
    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      return res.status(400).json({
        error: 'Invalid request',
        message: 'Missing code or state parameter'
      });
    }

    // Verify state and get user info
    const { data: stateData, error: stateError } = await supabase
      .from('google_oauth_states')
      .select('*')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (stateError || !stateData) {
      console.error('❌ Invalid or expired OAuth state');
      return res.status(400).json({
        error: 'Invalid state',
        message: 'OAuth state is invalid or expired. Please try again.'
      });
    }

    // Delete used state
    await supabase
      .from('google_oauth_states')
      .delete()
      .eq('state', state);

    // Exchange code for tokens
    console.log('🔄 Exchanging authorization code for tokens...');
    const tokens = await googleCalendarService.exchangeCodeForTokens(code);

    // Get user's Google email
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    oauth2Client.setCredentials({
      access_token: tokens.accessToken
    });

    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data: userInfo } = await oauth2.userinfo.get();

    if (!userInfo.email) {
      throw new Error('Failed to get user email from Google');
    }

    // Fetch the logged-in user's email from the database
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('email')
      .eq('id', stateData.user_id)
      .single();

    if (userError || !userData) {
      console.error('❌ Failed to fetch user data:', userError);
      throw new Error('Failed to verify user identity');
    }

    // Validate that Google email matches the logged-in user's email
    if (userInfo.email.toLowerCase() !== userData.email.toLowerCase()) {
      console.error(`❌ Email mismatch: Google=${userInfo.email}, CalorieScience=${userData.email}`);
      throw new Error(
        `Email mismatch: You must connect the same Google account (${userData.email}) that you use to log in to CalorieScience`
      );
    }

    console.log(`✅ Email validation passed: ${userInfo.email}`);

    // Save connection to database
    const connection = await googleCalendarService.saveConnection(
      stateData.user_id,
      stateData.user_type,
      tokens,
      userInfo.email,
      userInfo.id
    );

    console.log(`✅ OAuth completed successfully for ${stateData.user_type}: ${stateData.user_id}`);

    // Redirect back to app with success
    const redirectUri = stateData.redirect_uri || `${process.env.FRONTEND_URL}/settings/calendar?success=true`;

    return res.redirect(redirectUri);
  } catch (error) {
    console.error('❌ Error in OAuth callback:', error);

    // Redirect to app with error
    const errorRedirect = `${process.env.FRONTEND_URL}/settings/calendar?error=${encodeURIComponent(
      error instanceof Error ? error.message : 'OAuth failed'
    )}`;

    return res.redirect(errorRedirect);
  }
}

export default handler;
