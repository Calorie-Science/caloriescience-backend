/**
 * PUT /api/appointments/update
 *
 * Update an appointment and sync changes to Google Calendar
 *
 * Request body:
 * {
 *   appointmentId: string (required),
 *   title?: string,
 *   description?: string,
 *   startTime?: string (ISO 8601),
 *   endTime?: string (ISO 8601),
 *   timezone?: string,
 *   location?: string,
 *   meetingLink?: string,
 *   notes?: string,
 *   status?: string,
 *   appointmentType?: 'online' | 'offline',
 *   additionalAttendees?: string[] (email addresses)
 * }
 */

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

const updateAppointmentSchema = Joi.object({
  appointmentId: Joi.string().uuid().required(),
  title: Joi.string().optional().max(255),
  description: Joi.string().optional().max(2000),
  startTime: Joi.string().isoDate().optional(),
  endTime: Joi.string().isoDate().optional(),
  timezone: Joi.string().optional(),
  location: Joi.string().optional().max(500),
  meetingLink: Joi.string().uri().optional().max(500),
  notes: Joi.string().optional(),
  status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled').optional(),
  appointmentType: Joi.string().valid('online', 'offline').optional(),
  additionalAttendees: Joi.array().items(Joi.string().email()).optional(),
  recurrencePattern: recurrencePatternSchema.optional(),
  updateAllInstances: Joi.boolean().optional().default(false)
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    // Validate request
    const { error: validationError, value } = updateAppointmentSchema.validate(req.body);
    if (validationError) {
      return res.status(400).json({
        error: 'Validation error',
        message: validationError.details[0].message
      });
    }

    // Get existing appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', value.appointmentId)
      .single();

    if (fetchError || !appointment) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Appointment not found'
      });
    }

    // Verify user has access
    const hasAccess =
      (user.role === 'nutritionist' && appointment.nutritionist_id === user.id) ||
      (user.role === 'client' && appointment.client_id === user.id);

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this appointment'
      });
    }

    // Validate times if both provided
    if (value.startTime && value.endTime) {
      const startTime = new Date(value.startTime);
      const endTime = new Date(value.endTime);

      if (endTime <= startTime) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'End time must be after start time'
        });
      }
    }

    // Handle recurring appointments
    const isRecurring = appointment.is_recurring;
    const isParent = appointment.parent_appointment_id === null;
    const updateAllInstances = value.updateAllInstances || false;

    let updatedAppointment: any;

    if (isRecurring) {
      // Use RecurringAppointmentService for recurring appointments
      const recurringService = new RecurringAppointmentService();

      // Prepare updates
      const updates: any = {};
      if (value.title) updates.title = value.title;
      if (value.description !== undefined) updates.description = value.description;
      if (value.startTime) updates.start_time = value.startTime;
      if (value.endTime) updates.end_time = value.endTime;
      if (value.timezone) updates.timezone = value.timezone;
      if (value.location !== undefined) updates.location = value.location;
      if (value.meetingLink !== undefined) updates.meeting_link = value.meetingLink;
      if (value.notes !== undefined) updates.notes = value.notes;
      if (value.appointmentType) updates.appointment_type = value.appointmentType;
      if (value.additionalAttendees !== undefined) updates.additional_attendees = value.additionalAttendees;
      if (value.status) {
        updates.status = value.status;
        if (value.status === 'cancelled') {
          updates.cancelled_at = new Date().toISOString();
        }
      }

      // Update recurrence pattern if provided (only for parent)
      if (value.recurrencePattern && isParent) {
        await recurringService.updateRecurrencePattern(
          value.appointmentId,
          value.recurrencePattern
        );
      }

      // Update the appointment
      updatedAppointment = await recurringService.updateRecurringAppointment(
        value.appointmentId,
        updates,
        updateAllInstances && isParent
      );
    } else {
      // Regular appointment update
      const updates: any = {
        updated_at: new Date().toISOString()
      };

      if (value.title) updates.title = value.title;
      if (value.description !== undefined) updates.description = value.description;
      if (value.startTime) updates.start_time = value.startTime;
      if (value.endTime) updates.end_time = value.endTime;
      if (value.timezone) updates.timezone = value.timezone;
      if (value.location !== undefined) updates.location = value.location;
      if (value.meetingLink !== undefined) updates.meeting_link = value.meetingLink;
      if (value.notes !== undefined) updates.notes = value.notes;
      if (value.appointmentType) updates.appointment_type = value.appointmentType;
      if (value.additionalAttendees !== undefined) updates.additional_attendees = value.additionalAttendees;
      if (value.status) {
        updates.status = value.status;
        if (value.status === 'cancelled') {
          updates.cancelled_at = new Date().toISOString();
        }
      }

      const { data, error: updateError } = await supabase
        .from('appointments')
        .update(updates)
        .eq('id', value.appointmentId)
        .select()
        .single();

      if (updateError) {
        console.error('❌ Error updating appointment:', updateError);
        return res.status(500).json({
          error: 'Failed to update appointment',
          message: updateError.message
        });
      }

      updatedAppointment = data;
    }

    console.log(`✅ Appointment updated: ${value.appointmentId}`);

    // Try to sync to Google Calendar if event ID exists
    let syncStatus = appointment.sync_status;
    let syncError: string | null = null;
    let newGoogleEventId = appointment.google_event_id;
    let newMeetingLink = updatedAppointment.meeting_link;

    if (appointment.google_event_id && appointment.nutritionist_id) {
      try {
        console.log('📅 Syncing update to Google Calendar...');

        const connection = await googleCalendarService.getConnection(
          appointment.nutritionist_id,
          'nutritionist'
        );

        if (connection) {
          // Handle recurring appointments
          if (isRecurring && isParent) {
            // Update recurring event in Google Calendar
            if (value.status === 'cancelled') {
              await googleCalendarService.cancelEvent(
                appointment.nutritionist_id,
                'nutritionist',
                appointment.google_event_id
              );
              syncStatus = 'cancelled';
            } else if (value.recurrencePattern) {
              // Recurrence pattern changed - need to recreate recurring event
              const { data: nutritionist } = await supabase
                .from('users')
                .select('email, first_name, last_name')
                .eq('id', appointment.nutritionist_id)
                .single();

              let attendees = [nutritionist?.email];
              if (appointment.client_id) {
                const { data: client } = await supabase
                  .from('clients')
                  .select('email')
                  .eq('id', appointment.client_id)
                  .single();
                if (client?.email) attendees.push(client.email);
              }
              if (updatedAppointment.additional_attendees && updatedAppointment.additional_attendees.length > 0) {
                attendees.push(...updatedAppointment.additional_attendees);
              }

              // Delete old recurring event
              await googleCalendarService.cancelEvent(
                appointment.nutritionist_id,
                'nutritionist',
                appointment.google_event_id
              );

              // Create new recurring event
              const newEvent = await googleCalendarService.createRecurringEvent(
                appointment.nutritionist_id,
                'nutritionist',
                {
                  summary: updatedAppointment.title || appointment.title,
                  description: updatedAppointment.description || appointment.description || '',
                  startTime: updatedAppointment.start_time || appointment.start_time,
                  endTime: updatedAppointment.end_time || appointment.end_time,
                  timezone: updatedAppointment.timezone || appointment.timezone,
                  location: updatedAppointment.location || appointment.location,
                  attendees: attendees,
                  meetLink: (updatedAppointment.appointment_type || appointment.appointment_type) === 'online'
                },
                value.recurrencePattern
              );

              newGoogleEventId = newEvent.id;
              newMeetingLink = newEvent.hangoutLink || null;
              syncStatus = 'synced';

              // Update parent and all children with new event ID
              await supabase
                .from('appointments')
                .update({
                  google_event_id: newGoogleEventId,
                  meeting_link: newMeetingLink
                })
                .or(`id.eq.${appointment.id},parent_appointment_id.eq.${appointment.id}`);

              console.log(`✅ Recurring event updated in Google Calendar`);
            } else {
              // Regular update to recurring event (no pattern change)
              const eventUpdates: any = {};
              if (value.title) eventUpdates.summary = value.title;
              if (value.description !== undefined) eventUpdates.description = value.description;
              if (value.startTime) eventUpdates.startTime = value.startTime;
              if (value.endTime) eventUpdates.endTime = value.endTime;
              if (value.timezone) eventUpdates.timezone = value.timezone;
              if (value.location !== undefined) eventUpdates.location = value.location;

              // For recurring events, we need to update the parent event
              // Note: Google Calendar doesn't support partial updates to recurring events easily
              // This is a simplified approach - in production you might want to handle this differently
              await googleCalendarService.updateRecurringEvent(
                appointment.nutritionist_id,
                'nutritionist',
                appointment.google_event_id,
                eventUpdates,
                updatedAppointment.recurrence_pattern || appointment.recurrence_pattern
              );

              syncStatus = 'synced';
            }
          } else {
            // Non-recurring or child instance update
            // If status is cancelled, delete from calendar
            if (value.status === 'cancelled') {
              await googleCalendarService.cancelEvent(
                appointment.nutritionist_id,
                'nutritionist',
                appointment.google_event_id
              );
              syncStatus = 'cancelled';
            }
            // If appointment type changed, we need to recreate the event
            else if (value.appointmentType && value.appointmentType !== appointment.appointment_type) {
              console.log(`🔄 Appointment type changed from ${appointment.appointment_type} to ${value.appointmentType}, recreating event...`);

              // Delete old event
              await googleCalendarService.cancelEvent(
                appointment.nutritionist_id,
                'nutritionist',
                appointment.google_event_id
              );

              // Get nutritionist and client info
              const { data: nutritionist } = await supabase
                .from('users')
                .select('email, first_name, last_name')
                .eq('id', appointment.nutritionist_id)
                .single();

              let attendees = [nutritionist?.email];
              if (appointment.client_id) {
                const { data: client } = await supabase
                  .from('clients')
                  .select('email')
                  .eq('id', appointment.client_id)
                  .single();
                if (client?.email) attendees.push(client.email);
              }
              if (updatedAppointment.additional_attendees && updatedAppointment.additional_attendees.length > 0) {
                attendees.push(...updatedAppointment.additional_attendees);
              }

              // Create new event with correct type
              const newEvent = await googleCalendarService.createEvent(
                appointment.nutritionist_id,
                'nutritionist',
                {
                  summary: updatedAppointment.title,
                  description: updatedAppointment.description || '',
                  startTime: updatedAppointment.start_time,
                  endTime: updatedAppointment.end_time,
                  timezone: updatedAppointment.timezone,
                  location: updatedAppointment.location,
                  attendees: attendees,
                  meetLink: value.appointmentType === 'online' // Create Meet link only for online
                }
              );

              newGoogleEventId = newEvent.id;
              newMeetingLink = newEvent.hangoutLink || null;
              syncStatus = 'synced';
              console.log(`✅ Event recreated with new type: ${value.appointmentType}`);
            }
            else {
              // Regular update - no type change
              const eventUpdates: any = {};
              if (value.title) eventUpdates.summary = value.title;
              if (value.description !== undefined) eventUpdates.description = value.description;
              if (value.startTime) eventUpdates.startTime = value.startTime;
              if (value.endTime) eventUpdates.endTime = value.endTime;
              if (value.timezone) eventUpdates.timezone = value.timezone;
              if (value.location !== undefined) eventUpdates.location = value.location;

              await googleCalendarService.updateEvent(
                appointment.nutritionist_id,
                'nutritionist',
                appointment.google_event_id,
                eventUpdates
              );

              syncStatus = 'synced';
            }
          }

          console.log(`✅ Synced update to Google Calendar`);
        }
      } catch (error) {
        console.error('⚠️ Error syncing update to Google Calendar:', error);
        syncStatus = 'failed';
        syncError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Update sync status and event ID if changed
      await supabase
        .from('appointments')
        .update({
          google_event_id: newGoogleEventId,
          meeting_link: newMeetingLink,
          sync_status: syncStatus,
          sync_error: syncError,
          last_synced_at: syncStatus === 'synced' ? new Date().toISOString() : appointment.last_synced_at
        })
        .eq('id', value.appointmentId);
    }

    return res.status(200).json({
      success: true,
      data: {
        ...updatedAppointment,
        google_event_id: newGoogleEventId,
        meeting_link: newMeetingLink,
        sync_status: syncStatus,
        sync_error: syncError
      },
      message: 'Appointment updated successfully'
    });
  } catch (error) {
    console.error('❌ Error updating appointment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
