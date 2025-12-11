
import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { RecurringAppointmentService } from '../../lib/recurringAppointmentService';
import { supabase } from '../../lib/supabase';
import Joi from 'joi';

const recurrencePatternSchema = Joi.object({
  type: Joi.string().valid('daily', 'weekly', 'monthly', 'yearly').required(),
  interval: Joi.number().integer().min(1).required(),
  daysOfWeek: Joi.array().items(Joi.number().integer().min(0).max(6)).optional(),
  dayOfMonth: Joi.number().integer().min(1).max(31).optional(),
  endDate: Joi.string().isoDate().optional(),
  occurrenceCount: Joi.number().integer().min(1).optional()
}).custom((value, helpers) => {
  // Validate that endDate and occurrenceCount are not both provided
  if (value.endDate && value.occurrenceCount) {
    return helpers.error('any.invalid', { message: 'Cannot specify both endDate and occurrenceCount' });
  }
  return value;
});

const createRecurringAppointmentSchema = Joi.object({
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
  additionalAttendees: Joi.array().items(Joi.string().email()).optional(),
  appointmentType: Joi.string().valid('online', 'offline').optional().default('online'),
  recurrencePattern: recurrencePatternSchema.required()
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    // Validate request
    const { error: validationError, value } = createRecurringAppointmentSchema.validate(req.body);
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

    // Create recurring appointment
    const service = new RecurringAppointmentService();
    const result = await service.createRecurringAppointment({
      nutritionistId,
      clientId,
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
  } catch (error) {
    console.error('❌ Error creating recurring appointment:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);

