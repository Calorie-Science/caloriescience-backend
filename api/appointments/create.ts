/**
 * POST /api/appointments/create
 *
 * Create an appointment between nutritionist and client
 * Automatically syncs to Google Calendar if connected
 *
 * Request body:
 * {
 *   clientId: string (required if user is nutritionist),
 *   nutritionistId: string (required if user is client),
 *   title: string,
 *   description?: string,
 *   startTime: string (ISO 8601),
 *   endTime: string (ISO 8601),
 *   timezone?: string,
 *   location?: string,
 *   meetingLink?: string,
 *   notes?: string,
 *   createMeetLink?: boolean
 * }
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { googleCalendarService } from '../../lib/googleCalendarService';
import { supabase } from '../../lib/supabase';
import Joi from 'joi';

const createAppointmentSchema = Joi.object({
  clientId: Joi.string().uuid().optional(),
  nutritionistId: Joi.string().uuid().optional(),
  title: Joi.string().required().max(255),
  description: Joi.string().optional().max(2000),
  startTime: Joi.string().isoDate().required(),
  endTime: Joi.string().isoDate().required(),
  timezone: Joi.string().optional().default('UTC'),
  location: Joi.string().optional().max(500),
  meetingLink: Joi.string().uri().optional().max(500),
  notes: Joi.string().optional(),
  createMeetLink: Joi.boolean().optional().default(false)
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    // Validate request
    const { error: validationError, value } = createAppointmentSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Validation error',
        message: validationError.details[0].message
      });
    }

    // Determine participants
    let nutritionistId: string;
    let clientId: string;

    if (user.role === 'nutritionist') {
      nutritionistId = user.id;
      if (!value.clientId) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'clientId is required when nutritionist creates appointment'
        });
      }
      clientId = value.clientId;

      // Verify client belongs to nutritionist
      const { data: client } = await supabase
        .from('clients')
        .select('id, nutritionist_id')
        .eq('id', clientId)
        .single();

      if (!client || client.nutritionist_id !== nutritionistId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'Client does not belong to this nutritionist'
        });
      }
    } else {
      // User is a client
      clientId = user.id;
      if (!value.nutritionistId) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'nutritionistId is required when client creates appointment'
        });
      }
      nutritionistId = value.nutritionistId;

      // Verify client belongs to nutritionist
      const { data: client } = await supabase
        .from('clients')
        .select('id, nutritionist_id')
        .eq('id', clientId)
        .single();

      if (!client || client.nutritionist_id !== nutritionistId) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not belong to this nutritionist'
        });
      }
    }

    // Validate times
    const startTime = new Date(value.startTime);
    const endTime = new Date(value.endTime);

    if (endTime <= startTime) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'End time must be after start time'
      });
    }

    // Get nutritionist and client emails for calendar invite
    const { data: nutritionist } = await supabase
      .from('nutritionists')
      .select('email, first_name, last_name')
      .eq('id', nutritionistId)
      .single();

    const { data: client } = await supabase
      .from('clients')
      .select('email, first_name, last_name')
      .eq('id', clientId)
      .single();

    if (!nutritionist || !client) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Nutritionist or client not found'
      });
    }

    // Create appointment in database
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .insert({
        nutritionist_id: nutritionistId,
        client_id: clientId,
        title: value.title,
        description: value.description,
        start_time: value.startTime,
        end_time: value.endTime,
        timezone: value.timezone,
        location: value.location,
        meeting_link: value.meetingLink,
        notes: value.notes,
        created_by_user_id: user.id,
        created_by_user_type: user.role,
        status: 'scheduled',
        sync_status: 'pending'
      })
      .select()
      .single();

    if (appointmentError || !appointment) {
      console.error('❌ Error creating appointment:', appointmentError);
      return res.status(500).json({
        error: 'Failed to create appointment',
        message: appointmentError?.message
      });
    }

    console.log(`✅ Appointment created: ${appointment.id}`);

    // Try to sync to Google Calendar
    let googleEventId: string | null = null;
    let syncStatus = 'pending';
    let syncError: string | null = null;
    let meetLink: string | null = value.meetingLink || null;

    try {
      // Check if nutritionist has Google Calendar connected
      const connection = await googleCalendarService.getConnection(
        nutritionistId,
        'nutritionist'
      );

      if (connection) {
        console.log('📅 Syncing appointment to Google Calendar...');

        // Create calendar event
        const calendarEvent = await googleCalendarService.createEvent(
          nutritionistId,
          'nutritionist',
          {
            summary: value.title,
            description: `${value.description || ''}\n\nWith: ${client.first_name} ${client.last_name} (${client.email})`,
            startTime: value.startTime,
            endTime: value.endTime,
            timezone: value.timezone,
            location: value.location,
            attendees: [client.email, nutritionist.email],
            meetLink: value.createMeetLink
          }
        );

        googleEventId = calendarEvent.id;
        syncStatus = 'synced';

        // If Meet link was created, store it
        if (calendarEvent.hangoutLink) {
          meetLink = calendarEvent.hangoutLink;
        }

        console.log(`✅ Synced to Google Calendar: ${googleEventId}`);
      } else {
        console.log('ℹ️ Google Calendar not connected, skipping sync');
        syncStatus = 'not_connected';
      }
    } catch (error) {
      console.error('⚠️ Error syncing to Google Calendar:', error);
      syncStatus = 'failed';
      syncError = error instanceof Error ? error.message : 'Unknown error';
    }

    // Update appointment with sync status
    await supabase
      .from('appointments')
      .update({
        google_event_id: googleEventId,
        synced_to_calendar: syncStatus === 'synced',
        sync_status: syncStatus,
        sync_error: syncError,
        last_synced_at: syncStatus === 'synced' ? new Date().toISOString() : null,
        meeting_link: meetLink
      })
      .eq('id', appointment.id);

    return res.status(201).json({
      success: true,
      data: {
        ...appointment,
        google_event_id: googleEventId,
        synced_to_calendar: syncStatus === 'synced',
        sync_status: syncStatus,
        sync_error: syncError,
        meeting_link: meetLink,
        nutritionist: {
          id: nutritionist.id,
          name: `${nutritionist.first_name} ${nutritionist.last_name}`,
          email: nutritionist.email
        },
        client: {
          id: client.id,
          name: `${client.first_name} ${client.last_name}`,
          email: client.email
        }
      },
      message: syncStatus === 'synced'
        ? 'Appointment created and synced to Google Calendar'
        : syncStatus === 'not_connected'
        ? 'Appointment created (Google Calendar not connected)'
        : 'Appointment created but sync failed'
    });
  } catch (error) {
    console.error('❌ Error creating appointment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
