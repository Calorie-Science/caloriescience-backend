/**
 * Google Calendar Service
 * Handles OAuth2.0 authentication and calendar event management
 */

import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { supabase } from './supabase';

export interface CalendarConnection {
  id: string;
  userId: string;
  userType: 'nutritionist' | 'client';
  accessToken: string;
  refreshToken: string;
  tokenExpiry: string;
  scope: string;
  googleEmail: string;
  googleAccountId?: string;
  primaryCalendarId: string;
  timezone: string;
  isActive: boolean;
  lastSyncAt?: string;
  syncError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventParams {
  summary: string;
  description?: string;
  startTime: string; // ISO 8601 format
  endTime: string; // ISO 8601 format
  timezone?: string;
  location?: string;
  attendees?: string[]; // Email addresses
  meetLink?: boolean; // Whether to create a Google Meet link
}

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
  location?: string;
  hangoutLink?: string;
  htmlLink: string;
  status: string;
}

export class GoogleCalendarService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI ||
                       `${process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || ''}/api/calendar/oauth-callback`;

    if (!this.clientId || !this.clientSecret || !this.redirectUri) {
      console.warn('⚠️ Google Calendar OAuth credentials not configured');
      console.warn(`   GOOGLE_CLIENT_ID: ${this.clientId ? 'SET' : 'MISSING'}`);
      console.warn(`   GOOGLE_CLIENT_SECRET: ${this.clientSecret ? 'SET' : 'MISSING'}`);
      console.warn(`   GOOGLE_REDIRECT_URI: ${this.redirectUri || 'MISSING'}`);
    }
  }

  /**
   * Create OAuth2 client
   */
  private createOAuth2Client(): OAuth2Client {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri
    );
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state: string): string {
    const oauth2Client = this.createOAuth2Client();

    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/userinfo.email'
    ];

    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request refresh token
      scope: scopes,
      state: state, // CSRF protection
      prompt: 'consent' // Force consent screen to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<{
    accessToken: string;
    refreshToken: string;
    expiryDate: number;
    scope: string;
  }> {
    const oauth2Client = this.createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain tokens from Google');
    }

    oauth2Client.setCredentials(tokens);

    // Get user email
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date || Date.now() + 3600 * 1000,
      scope: tokens.scope || ''
    };
  }

  /**
   * Check if connection exists and is valid
   */
  async getConnection(
    userId: string,
    userType: 'nutritionist' | 'client'
  ): Promise<CalendarConnection | null> {
    const { data, error } = await supabase
      .from('google_calendar_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('user_type', userType)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return null;
    }

    return this.mapConnectionFromDb(data);
  }

  /**
   * Check if access token is valid, refresh if needed
   */
  async ensureValidToken(connection: CalendarConnection): Promise<string> {
    const now = new Date();
    const expiry = new Date(connection.tokenExpiry);

    // If token expires in less than 5 minutes, refresh it
    if (expiry.getTime() - now.getTime() < 5 * 60 * 1000) {
      console.log('🔄 Refreshing expired access token...');
      return await this.refreshAccessToken(connection);
    }

    return connection.accessToken;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(connection: CalendarConnection): Promise<string> {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({
      refresh_token: connection.refreshToken
    });

    try {
      const { credentials } = await oauth2Client.refreshAccessToken();

      if (!credentials.access_token || !credentials.expiry_date) {
        throw new Error('Failed to refresh access token');
      }

      // Update database with new access token
      await supabase
        .from('google_calendar_connections')
        .update({
          access_token: credentials.access_token,
          token_expiry: new Date(credentials.expiry_date).toISOString(),
          sync_error: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      console.log('✅ Access token refreshed successfully');
      return credentials.access_token;
    } catch (error) {
      console.error('❌ Error refreshing access token:', error);

      // Mark connection as inactive if refresh fails
      await supabase
        .from('google_calendar_connections')
        .update({
          is_active: false,
          sync_error: error instanceof Error ? error.message : 'Token refresh failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      throw new Error('Failed to refresh access token. Please reconnect your Google Calendar.');
    }
  }

  /**
   * Save OAuth connection to database
   */
  async saveConnection(
    userId: string,
    userType: 'nutritionist' | 'client',
    tokens: {
      accessToken: string;
      refreshToken: string;
      expiryDate: number;
      scope: string;
    },
    googleEmail: string,
    googleAccountId?: string
  ): Promise<CalendarConnection> {
    // Deactivate any existing connections for this user
    await supabase
      .from('google_calendar_connections')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('user_type', userType);

    // Insert new connection
    const { data, error } = await supabase
      .from('google_calendar_connections')
      .insert({
        user_id: userId,
        user_type: userType,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expiry: new Date(tokens.expiryDate).toISOString(),
        scope: tokens.scope,
        google_email: googleEmail,
        google_account_id: googleAccountId,
        is_active: true
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to save calendar connection: ${error?.message}`);
    }

    console.log(`✅ Google Calendar connected for ${userType}: ${userId}`);
    return this.mapConnectionFromDb(data);
  }

  /**
   * Disconnect Google Calendar
   */
  async disconnect(userId: string, userType: 'nutritionist' | 'client'): Promise<void> {
    const { error } = await supabase
      .from('google_calendar_connections')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('user_type', userType);

    if (error) {
      throw new Error(`Failed to disconnect calendar: ${error.message}`);
    }

    console.log(`✅ Google Calendar disconnected for ${userType}: ${userId}`);
  }

  /**
   * Create a calendar event
   */
  async createEvent(
    userId: string,
    userType: 'nutritionist' | 'client',
    eventParams: CreateEventParams
  ): Promise<CalendarEvent> {
    // Get connection
    const connection = await this.getConnection(userId, userType);
    if (!connection) {
      throw new Error('Google Calendar not connected');
    }

    // Ensure valid token
    const accessToken = await this.ensureValidToken(connection);

    // Create OAuth client with token
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    // Create calendar API client
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Prepare event
    const event: any = {
      summary: eventParams.summary,
      description: eventParams.description,
      start: {
        dateTime: eventParams.startTime,
        timeZone: eventParams.timezone || connection.timezone || 'UTC'
      },
      end: {
        dateTime: eventParams.endTime,
        timeZone: eventParams.timezone || connection.timezone || 'UTC'
      }
    };

    if (eventParams.location) {
      event.location = eventParams.location;
    }

    if (eventParams.attendees && eventParams.attendees.length > 0) {
      event.attendees = eventParams.attendees.map(email => ({ email }));
    }

    if (eventParams.meetLink) {
      event.conferenceData = {
        createRequest: {
          requestId: `meet-${Date.now()}`,
          conferenceSolutionKey: { type: 'hangoutsMeet' }
        }
      };
    }

    try {
      const response = await calendar.events.insert({
        calendarId: connection.primaryCalendarId,
        requestBody: event,
        conferenceDataVersion: eventParams.meetLink ? 1 : 0,
        sendUpdates: 'all' // Send email notifications to attendees
      });

      console.log(`✅ Calendar event created: ${response.data.id}`);

      return {
        id: response.data.id!,
        summary: response.data.summary!,
        description: response.data.description,
        start: response.data.start!,
        end: response.data.end!,
        location: response.data.location,
        hangoutLink: response.data.hangoutLink,
        htmlLink: response.data.htmlLink!,
        status: response.data.status!
      };
    } catch (error) {
      console.error('❌ Error creating calendar event:', error);

      // Update sync error
      await supabase
        .from('google_calendar_connections')
        .update({
          sync_error: error instanceof Error ? error.message : 'Failed to create event',
          updated_at: new Date().toISOString()
        })
        .eq('id', connection.id);

      throw new Error(`Failed to create calendar event: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a calendar event
   */
  async updateEvent(
    userId: string,
    userType: 'nutritionist' | 'client',
    eventId: string,
    updates: Partial<CreateEventParams>
  ): Promise<CalendarEvent> {
    const connection = await this.getConnection(userId, userType);
    if (!connection) {
      throw new Error('Google Calendar not connected');
    }

    const accessToken = await this.ensureValidToken(connection);
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Get existing event
    const existingEvent = await calendar.events.get({
      calendarId: connection.primaryCalendarId,
      eventId: eventId
    });

    // Prepare updates
    const event: any = { ...existingEvent.data };

    if (updates.summary) event.summary = updates.summary;
    if (updates.description) event.description = updates.description;
    if (updates.location) event.location = updates.location;
    if (updates.startTime) {
      event.start = {
        dateTime: updates.startTime,
        timeZone: updates.timezone || connection.timezone || 'UTC'
      };
    }
    if (updates.endTime) {
      event.end = {
        dateTime: updates.endTime,
        timeZone: updates.timezone || connection.timezone || 'UTC'
      };
    }

    const response = await calendar.events.update({
      calendarId: connection.primaryCalendarId,
      eventId: eventId,
      requestBody: event,
      sendUpdates: 'all'
    });

    console.log(`✅ Calendar event updated: ${eventId}`);

    return {
      id: response.data.id!,
      summary: response.data.summary!,
      description: response.data.description,
      start: response.data.start!,
      end: response.data.end!,
      location: response.data.location,
      hangoutLink: response.data.hangoutLink,
      htmlLink: response.data.htmlLink!,
      status: response.data.status!
    };
  }

  /**
   * Cancel/delete a calendar event
   */
  async cancelEvent(
    userId: string,
    userType: 'nutritionist' | 'client',
    eventId: string
  ): Promise<void> {
    const connection = await this.getConnection(userId, userType);
    if (!connection) {
      throw new Error('Google Calendar not connected');
    }

    const accessToken = await this.ensureValidToken(connection);
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.events.delete({
      calendarId: connection.primaryCalendarId,
      eventId: eventId,
      sendUpdates: 'all' // Notify attendees
    });

    console.log(`✅ Calendar event cancelled: ${eventId}`);
  }

  /**
   * Map database row to CalendarConnection object
   */
  private mapConnectionFromDb(data: any): CalendarConnection {
    return {
      id: data.id,
      userId: data.user_id,
      userType: data.user_type,
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      tokenExpiry: data.token_expiry,
      scope: data.scope,
      googleEmail: data.google_email,
      googleAccountId: data.google_account_id,
      primaryCalendarId: data.primary_calendar_id,
      timezone: data.timezone,
      isActive: data.is_active,
      lastSyncAt: data.last_sync_at,
      syncError: data.sync_error,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

export const googleCalendarService = new GoogleCalendarService();
