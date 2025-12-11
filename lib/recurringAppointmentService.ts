/**
 * Recurring Appointment Service
 * Manages recurring appointment lifecycle
 */

import { supabase } from './supabase';
import { RecurrencePatternService, RecurrencePattern } from './recurrencePatternService';
import { googleCalendarService } from './googleCalendarService';

export interface CreateRecurringAppointmentData {
  nutritionistId: string;
  clientId: string;
  title: string;
  description?: string;
  startTime: string; // ISO 8601
  endTime: string; // ISO 8601
  timezone?: string;
  location?: string;
  meetingLink?: string;
  notes?: string;
  appointmentType?: 'online' | 'offline';
  additionalAttendees?: string[];
  recurrencePattern: RecurrencePattern;
  createdByUserId: string;
  createdByUserType: 'nutritionist' | 'client';
}

export interface RecurringAppointmentResult {
  parent: any;
  children: any[];
  googleCalendarSynced: boolean;
  googleCalendarEventId: string | null;
  googleCalendarSyncStatus: string;
  googleCalendarSyncError: string | null;
}

export class RecurringAppointmentService {
  private patternService: RecurrencePatternService;

  constructor() {
    this.patternService = new RecurrencePatternService();
  }

  /**
   * Create a recurring appointment
   */
  async createRecurringAppointment(
    data: CreateRecurringAppointmentData
  ): Promise<RecurringAppointmentResult> {
    // Validate recurrence pattern
    const validation = this.patternService.validatePattern(data.recurrencePattern);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Create parent appointment
    const parent = await this.createParent(data);

    // Generate first month of instances
    const children = await this.generateFirstMonth(data, parent);

    // Sync to Google Calendar
    let googleEventId: string | null = null;
    let googleSyncStatus = 'pending';
    let googleSyncError: string | null = null;

    try {
      const connection = await googleCalendarService.getConnection(
        data.nutritionistId,
        'nutritionist'
      );

      if (connection) {
        try {
          // Get nutritionist and client emails for attendees
          const { data: nutritionist } = await supabase
            .from('users')
            .select('email, first_name, last_name')
            .eq('id', data.nutritionistId)
            .single();

          const { data: client } = await supabase
            .from('clients')
            .select('email, first_name, last_name')
            .eq('id', data.clientId)
            .single();

          const attendees: string[] = [];
          if (nutritionist?.email) attendees.push(nutritionist.email);
          if (client?.email) attendees.push(client.email);
          if (data.additionalAttendees) {
            attendees.push(...data.additionalAttendees);
          }

          // Create recurring event in Google Calendar
          const calendarEvent = await googleCalendarService.createRecurringEvent(
            data.nutritionistId,
            'nutritionist',
            {
              summary: data.title,
              description: data.description || '',
              startTime: data.startTime,
              endTime: data.endTime,
              timezone: data.timezone || 'UTC',
              location: data.location,
              attendees: attendees,
              meetLink: data.appointmentType === 'online'
            },
            data.recurrencePattern
          );

          googleEventId = calendarEvent.id;
          googleSyncStatus = 'synced';

          // Update parent with Google Calendar event ID
          await supabase
            .from('appointments')
            .update({
              google_event_id: googleEventId,
              synced_to_calendar: true,
              sync_status: 'synced',
              last_synced_at: new Date().toISOString()
            })
            .eq('id', parent.id);

          // Update children with Google Calendar event ID
          if (children.length > 0 && googleEventId) {
            await supabase
              .from('appointments')
              .update({
                google_event_id: googleEventId,
                synced_to_calendar: true,
                sync_status: 'synced'
              })
              .in('id', children.map(c => c.id));
          }
        } catch (syncError: any) {
          console.error('Google Calendar sync failed:', syncError);
          googleSyncStatus = 'failed';
          googleSyncError = syncError.message;

          await supabase
            .from('appointments')
            .update({
              sync_status: 'failed',
              sync_error: googleSyncError
            })
            .eq('id', parent.id);
        }
      } else {
        googleSyncStatus = 'not_connected';
      }
    } catch (error: any) {
      console.error('Error checking Google Calendar status:', error);
      googleSyncStatus = 'failed';
      googleSyncError = error.message;
    }

    return {
      parent,
      children,
      googleCalendarSynced: !!googleEventId,
      googleCalendarEventId: googleEventId,
      googleCalendarSyncStatus: googleSyncStatus,
      googleCalendarSyncError: googleSyncError
    };
  }

  /**
   * Create parent appointment
   */
  private async createParent(
    data: CreateRecurringAppointmentData
  ): Promise<any> {
    const parentData = {
      nutritionist_id: data.nutritionistId,
      client_id: data.clientId,
      title: data.title,
      description: data.description || null,
      start_time: data.startTime,
      end_time: data.endTime,
      timezone: data.timezone || 'UTC',
      location: data.location || null,
      meeting_link: data.meetingLink || null,
      notes: data.notes || null,
      appointment_type: data.appointmentType || 'online',
      additional_attendees: data.additionalAttendees || [],
      status: 'scheduled',
      created_by_user_id: data.createdByUserId,
      created_by_user_type: data.createdByUserType,
      is_recurring: true,
      recurrence_pattern: data.recurrencePattern,
      recurrence_end_date: data.recurrencePattern.endDate || null,
      recurrence_occurrence_count: data.recurrencePattern.occurrenceCount || null,
      recurrence_status: 'active',
      parent_appointment_id: null,
      recurrence_sequence_number: 0,
      sync_status: 'pending'
    };

    const { data: parent, error } = await supabase
      .from('appointments')
      .insert(parentData)
      .select()
      .single();

    if (error) {
      console.error('Error creating parent appointment:', error);
      throw new Error(`Failed to create parent appointment: ${error.message}`);
    }

    return parent;
  }

  /**
   * Generate first month of instances
   */
  private async generateFirstMonth(
    data: CreateRecurringAppointmentData,
    parent: any
  ): Promise<any[]> {
    const startDate = new Date(data.startTime);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1); // One month ahead

    // Generate dates for first month
    const dates = this.patternService.generateDates(
      data.recurrencePattern,
      startDate,
      endDate
    );

    // Skip the first date (it's the parent)
    const instanceDates = dates.slice(1);

    if (instanceDates.length === 0) {
      return [];
    }

    // Calculate duration
    const durationMs = new Date(data.endTime).getTime() - startDate.getTime();

    // Create instances
    const instances = instanceDates.map((date, index) => {
      const instanceStart = new Date(date);
      const instanceEnd = new Date(instanceStart.getTime() + durationMs);

      return {
        nutritionist_id: data.nutritionistId,
        client_id: data.clientId,
        title: data.title,
        description: data.description || null,
        start_time: instanceStart.toISOString(),
        end_time: instanceEnd.toISOString(),
        timezone: data.timezone || 'UTC',
        location: data.location || null,
        meeting_link: data.meetingLink || null,
        notes: data.notes || null,
        appointment_type: data.appointmentType || 'online',
        additional_attendees: data.additionalAttendees || [],
        status: 'scheduled',
        created_by_user_id: data.createdByUserId,
        created_by_user_type: data.createdByUserType,
        is_recurring: true,
        recurrence_pattern: null, // Children don't store pattern
        recurrence_status: 'active',
        parent_appointment_id: parent.id,
        recurrence_sequence_number: index + 1,
        sync_status: 'pending'
      };
    });

    const { data: inserted, error } = await supabase
      .from('appointments')
      .insert(instances)
      .select();

    if (error) {
      console.error('Error creating child appointments:', error);
      throw new Error(`Failed to create child appointments: ${error.message}`);
    }

    return inserted || [];
  }

  /**
   * Get appointments for calendar view (with on-demand generation)
   */
  async getAppointmentsForCalendarView(
    nutritionistId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // Fetch existing appointments in range
    const { data: existingAppointments, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('nutritionist_id', nutritionistId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching appointments:', error);
      throw new Error(`Failed to fetch appointments: ${error.message}`);
    }

    // Find recurring parents that might need instances generated
    const recurringParents = existingAppointments?.filter(
      apt => apt.is_recurring && apt.parent_appointment_id === null
    ) || [];

    // Generate missing instances for each parent
    for (const parent of recurringParents) {
      await this.generateAndStoreMissingInstances(
        parent.id,
        startDate,
        endDate
      );
    }

    // Fetch again to get newly generated instances
    const { data: allAppointments } = await supabase
      .from('appointments')
      .select('*')
      .eq('nutritionist_id', nutritionistId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString())
      .order('start_time', { ascending: true });

    return allAppointments || [];
  }

  /**
   * Generate and store missing instances for a date range
   */
  async generateAndStoreMissingInstances(
    parentId: string,
    startDate: Date,
    endDate: Date
  ): Promise<any[]> {
    // Get parent
    const { data: parent, error: parentError } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', parentId)
      .single();

    if (parentError || !parent) {
      throw new Error('Parent appointment not found');
    }

    if (!parent.is_recurring || parent.recurrence_status !== 'active') {
      return [];
    }

    // Check what's already stored in this range
    const { data: existing } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('parent_appointment_id', parentId)
      .gte('start_time', startDate.toISOString())
      .lte('start_time', endDate.toISOString());

    const existingDates = new Set(
      existing?.map(apt => new Date(apt.start_time).toISOString().split('T')[0]) || []
    );

    // Generate dates for range
    const dates = this.patternService.generateDates(
      parent.recurrence_pattern,
      startDate,
      endDate
    );

    // Filter out existing dates and parent date
    const newDates = dates.filter(date => {
      const dateStr = date.toISOString().split('T')[0];
      const parentDateStr = new Date(parent.start_time).toISOString().split('T')[0];
      return !existingDates.has(dateStr) && dateStr !== parentDateStr;
    });

    if (newDates.length === 0) {
      return [];
    }

    // Calculate duration
    const durationMs = new Date(parent.end_time).getTime() - new Date(parent.start_time).getTime();

    // Get current max sequence number
    const { data: maxSeq } = await supabase
      .from('appointments')
      .select('recurrence_sequence_number')
      .eq('parent_appointment_id', parentId)
      .order('recurrence_sequence_number', { ascending: false })
      .limit(1)
      .single();

    const startSequence = (maxSeq?.recurrence_sequence_number || 0) + 1;

    // Create instances
    const instances = newDates.map((date, index) => {
      const instanceStart = new Date(date);
      const instanceEnd = new Date(instanceStart.getTime() + durationMs);

      return {
        nutritionist_id: parent.nutritionist_id,
        client_id: parent.client_id,
        title: parent.title,
        description: parent.description,
        start_time: instanceStart.toISOString(),
        end_time: instanceEnd.toISOString(),
        timezone: parent.timezone,
        location: parent.location,
        meeting_link: parent.meeting_link,
        notes: parent.notes,
        appointment_type: parent.appointment_type,
        additional_attendees: parent.additional_attendees || [],
        status: 'scheduled',
        created_by_user_id: parent.created_by_user_id,
        created_by_user_type: parent.created_by_user_type,
        is_recurring: true,
        recurrence_pattern: null,
        recurrence_status: 'active',
        parent_appointment_id: parent.id,
        recurrence_sequence_number: startSequence + index,
        google_event_id: parent.google_event_id,
        synced_to_calendar: parent.synced_to_calendar,
        sync_status: parent.sync_status
      };
    });

    const { data: inserted, error } = await supabase
      .from('appointments')
      .insert(instances)
      .select();

    if (error) {
      console.error('Error generating instances:', error);
      throw new Error(`Failed to generate instances: ${error.message}`);
    }

    return inserted || [];
  }
}
