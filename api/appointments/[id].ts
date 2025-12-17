/**
 * GET /api/appointments/[id]
 *
 * Get a single appointment by ID
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { supabase } from '../../lib/supabase';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Appointment ID is required' });
  }

  const user = (req as any).user;

  try {
    // Determine user role and filter
    const isNutritionist = user.role === 'nutritionist';
    
    // Base query
    let query = supabase
      .from('appointments')
      .select(`
        *,
        parent_appointment:appointments!parent_appointment_id(*)
      `)
      .eq('id', id)
      .single();

    const { data: appointment, error } = await query;

    if (error || !appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Verify access
    if (isNutritionist) {
      if (appointment.nutritionist_id !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    } else {
      if (appointment.client_id !== user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Enhance response with recurring event details (same structure as list.ts)
    const enhancedData = {
      ...appointment,
      recurringDetails: appointment.is_recurring ? {
        isRecurring: appointment.is_recurring,
        isParent: appointment.parent_appointment_id === null,
        isChild: appointment.parent_appointment_id !== null,
        parentAppointmentId: appointment.parent_appointment_id,
        sequenceNumber: appointment.recurrence_sequence_number,
        recurrencePattern: appointment.recurrence_pattern || (appointment.parent_appointment?.recurrence_pattern),
        recurrenceStatus: appointment.recurrence_status,
        recurrenceEndDate: appointment.recurrence_end_date || appointment.parent_appointment?.recurrence_end_date,
        recurrenceOccurrenceCount: appointment.recurrence_occurrence_count || appointment.parent_appointment?.recurrence_occurrence_count,
        isModified: appointment.is_modified || false,
        originalTemplateData: appointment.original_template_data,
        parentAppointment: appointment.parent_appointment || null
      } : null
    };

    // Fetch client and nutritionist details if needed (optional, typically list api fetches separate or joins)
    // The list API in list.ts doesn't explicitly join user/client tables in the main query shown,
    // but often frontend needs them. Let's add basic info if available.
    
    // Actually, looking at list.ts, it returns the appointment object directly.
    // If the frontend expects client/nutritionist expanded objects, we should fetch them.
    // For consistency with typical "Get One" endpoints, expanded details are good.
    
    let clientData = null;
    let nutritionistData = null;

    if (appointment.client_id) {
      const { data: c } = await supabase.from('clients').select('*').eq('id', appointment.client_id).single();
      clientData = c;
    }
    
    if (appointment.nutritionist_id) {
      const { data: n } = await supabase.from('users').select('id, first_name, last_name, email').eq('id', appointment.nutritionist_id).single();
      nutritionistData = n;
    }

    return res.status(200).json({
      success: true,
      data: {
        ...enhancedData,
        client: clientData,
        nutritionist: nutritionistData
      }
    });

  } catch (error) {
    console.error('Error fetching appointment:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export default requireAuth(handler);

