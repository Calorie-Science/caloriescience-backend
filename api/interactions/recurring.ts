import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { RecurringAppointmentService } from '../../lib/recurringAppointmentService';

const service = new RecurringAppointmentService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method === 'POST') {
    try {
      const {
        clientId,
        interactionType,
        title,
        description,
        scheduledAt,
        durationMinutes,
        recurrencePattern,
        recurrenceEndDate
      } = req.body;

      // Validation
      if (!clientId) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'clientId is required'
        });
      }

      if (!interactionType) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'interactionType is required'
        });
      }

      if (!title) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'title is required'
        });
      }

      if (!scheduledAt) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'scheduledAt is required'
        });
      }

      if (!recurrencePattern) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'recurrencePattern is required'
        });
      }

      // Verify client belongs to nutritionist
      const { supabase } = await import('../../lib/supabase');
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', clientId)
        .eq('nutritionist_id', req.user.id)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The specified client does not exist or you do not have access to it'
        });
      }

      // Calculate endTime from startTime and duration
      const startTime = new Date(scheduledAt);
      const durationMs = (durationMinutes || 60) * 60 * 1000;
      const endTime = new Date(startTime.getTime() + durationMs);

      // Create recurring appointment
      const result = await service.createRecurringAppointment({
        nutritionistId: req.user.id,
        clientId,
        title,
        description,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        timezone: 'UTC',
        recurrencePattern,
        createdByUserId: req.user.id,
        createdByUserType: 'nutritionist'
      });

      res.status(201).json({
        success: true,
        message: 'Recurring appointment created successfully',
        data: {
          parent: result.parent,
          children: result.children,
          totalInstances: result.children.length + 1, // +1 for parent
          googleCalendarSynced: result.googleCalendarSynced,
          googleCalendarEventId: result.googleCalendarEventId,
          googleCalendarSyncStatus: result.googleCalendarSyncStatus,
          googleCalendarSyncError: result.googleCalendarSyncError
        }
      });
    } catch (error: any) {
      console.error('Create recurring appointment error:', error);
      res.status(500).json({
        error: 'Failed to create recurring appointment',
        message: error.message || 'An error occurred while creating the recurring appointment'
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler);

