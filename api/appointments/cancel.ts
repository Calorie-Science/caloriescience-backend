/**
 * POST /api/appointments/cancel
 *
 * Cancel an appointment and remove from Google Calendar
 *
 * Request body:
 * {
 *   appointmentId: string (required)
 * }
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { googleCalendarService } from '../../lib/googleCalendarService';
import { supabase } from '../../lib/supabase';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    const { appointmentId } = req.body;

    if (!appointmentId) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'appointmentId is required'
      });
    }

    // Get existing appointment
    const { data: appointment, error: fetchError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
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

    // Update appointment status
    const { error: updateError } = await supabase
      .from('appointments')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        sync_status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', appointmentId);

    if (updateError) {
      console.error('❌ Error cancelling appointment:', updateError);
      return res.status(500).json({
        error: 'Failed to cancel appointment',
        message: updateError.message
      });
    }

    console.log(`✅ Appointment cancelled: ${appointmentId}`);

    // Try to remove from Google Calendar if event ID exists
    if (appointment.google_event_id && appointment.nutritionist_id) {
      try {
        console.log('📅 Removing from Google Calendar...');

        await googleCalendarService.cancelEvent(
          appointment.nutritionist_id,
          'nutritionist',
          appointment.google_event_id
        );

        console.log(`✅ Removed from Google Calendar`);
      } catch (error) {
        console.error('⚠️ Error removing from Google Calendar:', error);
        // Don't fail the request if calendar deletion fails
      }
    }

    return res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully'
    });
  } catch (error) {
    console.error('❌ Error cancelling appointment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
