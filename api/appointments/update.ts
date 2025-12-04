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
 *   status?: string
 * }
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { googleCalendarService } from '../../lib/googleCalendarService';
import { supabase } from '../../lib/supabase';
import Joi from 'joi';

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
  status: Joi.string().valid('scheduled', 'completed', 'cancelled', 'no_show', 'rescheduled').optional()
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

    // Prepare updates
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
    if (value.status) {
      updates.status = value.status;
      if (value.status === 'cancelled') {
        updates.cancelled_at = new Date().toISOString();
      }
    }

    // Update in database
    const { data: updatedAppointment, error: updateError } = await supabase
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

    console.log(`✅ Appointment updated: ${value.appointmentId}`);

    // Try to sync to Google Calendar if event ID exists
    let syncStatus = appointment.sync_status;
    let syncError: string | null = null;

    if (appointment.google_event_id && appointment.nutritionist_id) {
      try {
        console.log('📅 Syncing update to Google Calendar...');

        const connection = await googleCalendarService.getConnection(
          appointment.nutritionist_id,
          'nutritionist'
        );

        if (connection) {
          // If status is cancelled, delete from calendar
          if (value.status === 'cancelled') {
            await googleCalendarService.cancelEvent(
              appointment.nutritionist_id,
              'nutritionist',
              appointment.google_event_id
            );
            syncStatus = 'cancelled';
          } else {
            // Update calendar event
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

          console.log(`✅ Synced update to Google Calendar`);
        }
      } catch (error) {
        console.error('⚠️ Error syncing update to Google Calendar:', error);
        syncStatus = 'failed';
        syncError = error instanceof Error ? error.message : 'Unknown error';
      }

      // Update sync status
      await supabase
        .from('appointments')
        .update({
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
