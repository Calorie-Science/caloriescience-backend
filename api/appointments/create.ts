

import { DateTime } from 'luxon';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { googleCalendarService } from '../../lib/googleCalendarService';
import { RecurringAppointmentService } from '../../lib/recurringAppointmentService';
import { supabase } from '../../lib/supabase';
import Joi from 'joi';

const recurrencePatternSchema = Joi.object({
  type: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
  interval: Joi.number().integer().min(1).required(),
  daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).optional(),
  daysOfMonth: Joi.array().items(Joi.number().integer().min(1).max(31)).optional(),
  endDate: Joi.string().isoDate().optional(),
  occurrenceCount: Joi.number().integer().min(1).optional()
}).custom((value, helpers) => {
  if (value.endDate && value.occurrenceCount) {
    return helpers.error('any.invalid', { message: 'Cannot specify both endDate and occurrenceCount' });
  }
  return value;
});

const createAppointmentSchema = Joi.object({
  clientId: Joi.string().uuid().optional(),
  nutritionistId: Joi.string().uuid().optional(),
  title: Joi.string().required().max(255),
  description: Joi.string().optional().max(2000),
  date: Joi.string().isoDate().optional(),
  startTime: Joi.string().required(),
  endTime: Joi.string().required(),
  timezone: Joi.string().optional().default('UTC'),
  location: Joi.string().optional().max(500),
  meetingLink: Joi.string().uri().optional().max(500),
  notes: Joi.string().optional(),
  additionalAttendees: Joi.array().items(Joi.string().email()).optional(),
  appointmentType: Joi.string().valid('online', 'offline').optional().default('online'),
  recurrencePattern: recurrencePatternSchema.optional()
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
    let clientId: string | null = null;

    if (user.role === 'nutritionist') {
      nutritionistId = user.id;

      // clientId is optional if additionalAttendees are provided
      if (value.clientId) {
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
      } else if (!value.additionalAttendees || value.additionalAttendees.length === 0) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'Either clientId or additionalAttendees is required when nutritionist creates appointment'
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
    let startTime: Date;
    let endTime: Date;

    if (value.date) {
      // Logic for separate date and time (HH:mm or h:mm a)
      const timezone = value.timezone || 'UTC';
      const dateStr = value.date.split('T')[0]; // Ensure YYYY-MM-DD

      // Helper to parse time string
      const parseTime = (timeStr: string) => {
        // Try 24-hour format (HH:mm)
        let dt = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-MM-dd HH:mm', { zone: timezone });
        if (dt.isValid) return dt;
        
        // Try 12-hour format (h:mm a or hh:mm a)
        dt = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-MM-dd h:mm a', { zone: timezone });
        if (dt.isValid) return dt;

        dt = DateTime.fromFormat(`${dateStr} ${timeStr}`, 'yyyy-MM-dd hh:mm a', { zone: timezone });
        if (dt.isValid) return dt;

        return null;
      };

      const startDt = parseTime(value.startTime);
      const endDt = parseTime(value.endTime);

      if (!startDt || !startDt.isValid) {
         return res.status(400).json({
          error: 'Validation error',
          message: `Invalid startTime format: '${value.startTime}'. Use 'HH:mm' (24h) or 'h:mm a' (12h).`
        });
      }

      if (!endDt || !endDt.isValid) {
         return res.status(400).json({
          error: 'Validation error',
          message: `Invalid endTime format: '${value.endTime}'. Use 'HH:mm' (24h) or 'h:mm a' (12h).`
        });
      }

      // Convert to UTC JS Dates for internal usage (services expect ISO strings or Dates)
      // Actually, services might expect ISO strings in value object, but here we construct Dates.
      startTime = startDt.toJSDate();
      endTime = endDt.toJSDate();
      
      // Update value object with ISO strings so services downstream (which read value.startTime) work correctly
      value.startTime = startDt.toUTC().toISO();
      value.endTime = endDt.toUTC().toISO();

    } else {
      // Legacy/Standard ISO logic
      // We removed .isoDate() from Joi, so we must check it here if date is missing
      const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
      // Basic ISO check (simplistic) or try parsing with Date
      if (isNaN(Date.parse(value.startTime))) {
         return res.status(400).json({
          error: 'Validation error',
          message: 'startTime must be a valid ISO date string when date field is not provided'
        });
      }
      if (isNaN(Date.parse(value.endTime))) {
         return res.status(400).json({
          error: 'Validation error',
          message: 'endTime must be a valid ISO date string when date field is not provided'
        });
      }
      
      startTime = new Date(value.startTime);
      endTime = new Date(value.endTime);
    }

    if (endTime <= startTime) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'End time must be after start time'
      });
    }

    // Get nutritionist email for calendar invite
    const { data: nutritionist } = await supabase
      .from('users')
      .select('email, first_name, last_name')
      .eq('id', nutritionistId)
      .eq('role', 'nutritionist')
      .single();

    if (!nutritionist) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Nutritionist not found'
      });
    }

    // Get client email if clientId is provided
    let client: any = null;
    if (clientId) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('id, email, first_name, last_name')
        .eq('id', clientId)
        .single();

      if (!clientData) {
        return res.status(404).json({
          error: 'Not found',
          message: 'Client not found'
        });
      }
      client = clientData;
    }

    // If recurrencePattern provided, route to recurring service
    if (value.recurrencePattern) {
      if (!clientId) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'clientId is required for recurring appointments'
        });
      }

      const recurringService = new RecurringAppointmentService();

      const result = await recurringService.createRecurringAppointment({
        nutritionistId,
        clientId: clientId as string, // ensured above when required
        title: value.title,
        description: value.description,
        startTime: value.startTime,
        endTime: value.endTime,
        timezone: value.timezone,
        location: value.location,
        meetingLink: value.meetingLink,
        notes: value.notes,
        appointmentType: value.appointmentType,
        additionalAttendees: value.additionalAttendees,
        recurrencePattern: value.recurrencePattern,
        createdByUserId: user.id,
        createdByUserType: user.role
      });

      return res.status(201).json({
        success: true,
        data: {
          parent: result.parent,
          children: result.children,
          googleCalendarSynced: result.googleCalendarSynced,
          googleCalendarEventId: result.googleCalendarEventId,
          googleCalendarSyncStatus: result.googleCalendarSyncStatus,
          googleCalendarSyncError: result.googleCalendarSyncError
        },
        message: result.googleCalendarSynced
          ? 'Recurring appointment created and synced to Google Calendar'
          : result.googleCalendarSyncStatus === 'not_connected'
          ? 'Recurring appointment created (Google Calendar not connected)'
          : 'Recurring appointment created but sync failed'
      });
    }

    // Create single appointment in database
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
        sync_status: 'pending',
        appointment_type: value.appointmentType,
        additional_attendees: value.additionalAttendees || []
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

        // Prepare attendees list
        const attendees = [nutritionist.email];
        if (client && client.email) {
          attendees.push(client.email);
        }
        if (value.additionalAttendees && value.additionalAttendees.length > 0) {
          attendees.push(...value.additionalAttendees);
        }

        // Automatically create Meet link for online appointments only
        const shouldCreateMeetLink = value.appointmentType === 'online';

        // Create calendar event
        const calendarEvent = await googleCalendarService.createEvent(
          nutritionistId,
          'nutritionist',
          {
            summary: value.title,
            description: value.description || '',
            startTime: value.startTime,
            endTime: value.endTime,
            timezone: value.timezone,
            location: value.location,
            attendees: attendees,
            meetLink: shouldCreateMeetLink
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
          id: nutritionistId,
          name: `${nutritionist.first_name} ${nutritionist.last_name}`,
          email: nutritionist.email
        },
        client: client ? {
          id: client.id,
          name: `${client.first_name} ${client.last_name}`,
          email: client.email
        } : null
      },
      message: syncStatus === 'synced'
        ? `Appointment created and synced to Google Calendar${value.appointmentType === 'offline' ? ' (in-person meeting)' : ''}`
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
