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
    
    // Calculate end date: use pattern endDate if provided, otherwise one month ahead
    let endDate: Date;
    if (data.recurrencePattern.endDate) {
      endDate = new Date(data.recurrencePattern.endDate);
      // Set to end of day
      endDate.setHours(23, 59, 59, 999);
    } else {
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1); // One month ahead
    }

    // Generate dates up to end date (or one month, whichever comes first)
    const dates = this.patternService.generateDates(
      data.recurrencePattern,
      startDate,
      endDate,
      data.timezone
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
    // Find ALL active recurring parents for this nutritionist (not just those in date range)
    // This ensures we generate instances even if parent is outside the requested range
    const { data: allRecurringParents, error: parentsError } = await supabase
      .from('appointments')
      .select('*')
      .eq('nutritionist_id', nutritionistId)
      .eq('is_recurring', true)
      .is('parent_appointment_id', null)
      .eq('recurrence_status', 'active');

    if (parentsError) {
      console.error('Error fetching recurring parents:', parentsError);
      throw new Error(`Failed to fetch recurring parents: ${parentsError.message}`);
    }

    // Generate missing instances for each parent that should have instances in the date range
    for (const parent of allRecurringParents || []) {
      // Check if parent's pattern should generate instances in the requested range
      const parentStartDate = new Date(parent.start_time);
      const parentEndDate = parent.recurrence_end_date 
        ? new Date(parent.recurrence_end_date)
        : null;

      // Skip if parent ends before the requested start date
      if (parentEndDate && parentEndDate < startDate) {
        continue;
      }

      // Skip if parent starts after the requested end date
      if (parentStartDate > endDate) {
        continue;
      }

      // Clamp generation end to the parent's recurrence end date (inclusive)
      let effectiveEndDate = endDate;
      if (parentEndDate) {
        const parentEndOfDay = new Date(parentEndDate);
        parentEndOfDay.setUTCHours(23, 59, 59, 999);
        if (parentEndOfDay < effectiveEndDate) {
          effectiveEndDate = parentEndOfDay;
        }
      }

      // Generate instances for this parent in the requested range
      try {
        // Never generate before the parent starts
        const effectiveStartDate = parentStartDate > startDate ? parentStartDate : startDate;
        await this.generateAndStoreMissingInstances(
          parent.id,
          effectiveStartDate,
          effectiveEndDate
        );
      } catch (error) {
        console.error(`Error generating instances for parent ${parent.id}:`, error);
        // Continue with other parents even if one fails
      }
    }

    // Fetch all appointments in the date range (including newly generated ones)
    const { data: allAppointments, error } = await supabase
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

    // Clamp generation start so we never generate before the parent starts
    const parentStart = new Date(parent.start_time);
    const generationStart = parentStart > startDate ? parentStart : startDate;

    // Use the parent's time-of-day as the anchor to avoid midnight shifts
    const parentStartTime = new Date(parent.start_time);
    const generationStartWithTime = new Date(generationStart);
    generationStartWithTime.setUTCHours(
      parentStartTime.getUTCHours(),
      parentStartTime.getUTCMinutes(),
      parentStartTime.getUTCSeconds(),
      parentStartTime.getUTCMilliseconds()
    );

    // Check what's already stored in this range
    const { data: existing } = await supabase
      .from('appointments')
      .select('start_time')
      .eq('parent_appointment_id', parentId)
      .gte('start_time', generationStartWithTime.toISOString())
      .lte('start_time', endDate.toISOString());

    const existingDates = new Set(
      existing?.map(apt => new Date(apt.start_time).toISOString().split('T')[0]) || []
    );

    // Generate dates for range using the anchored time
    const dates = this.patternService.generateDates(
      parent.recurrence_pattern,
      generationStartWithTime,
      endDate,
      parent.timezone
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

  /**
   * Update a recurring appointment (parent or child)
   */
  async updateRecurringAppointment(
    appointmentId: string,
    updates: any,
    updateScope: 'this_only' | 'this_and_following' | 'all' = 'this_only'
  ): Promise<any> {
    // Get the appointment
    const { data: appointment, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (error || !appointment) {
      throw new Error('Appointment not found');
    }

    if (!appointment.is_recurring) {
      throw new Error('Appointment is not a recurring appointment');
    }

    const isParent = appointment.parent_appointment_id === null;
    const parentId = isParent ? appointment.id : appointment.parent_appointment_id;

    // SCOPE: ALL
    // Update parent and all children
    if (updateScope === 'all') {
      
      // Determine what fields to update on Parent
      // CRITICAL: If 'startTime' is updated from a child instance (e.g. Jan 14),
      // we must NOT simply overwrite Parent's startTime (Dec 16) with Jan 14,
      // as that would move the entire series start to Jan 14.
      // Instead, we only want to update the TIME component of the Parent's start_time.
      
      const parentUpdates = { ...updates };
      
      if (parentUpdates.start_time && parentUpdates.end_time) {
        // Fetch current parent to get its original date
        const { data: currentParent } = await supabase
          .from('appointments')
          .select('start_time, end_time, timezone')
          .eq('id', parentId)
          .single();
          
        if (currentParent) {
          const newStart = new Date(parentUpdates.start_time);
          const newEnd = new Date(parentUpdates.end_time);
          const originalStart = new Date(currentParent.start_time);
          const originalEnd = new Date(currentParent.end_time);
          
          // Construct new Parent start_time: Original Date + New Time
          // We use the timezone to ensure we are setting the correct wall-clock time
          // Or we can just use UTC hours if we assume the payload is already correct UTC for the target day.
          // Best way: Use setHours/Minutes/Seconds in UTC.
          
          const updatedParentStart = new Date(originalStart);
          updatedParentStart.setUTCHours(
            newStart.getUTCHours(),
            newStart.getUTCMinutes(),
            newStart.getUTCSeconds(),
            newStart.getUTCMilliseconds()
          );
          
          const duration = newEnd.getTime() - newStart.getTime();
          const updatedParentEnd = new Date(updatedParentStart.getTime() + duration);
          
          parentUpdates.start_time = updatedParentStart.toISOString();
          parentUpdates.end_time = updatedParentEnd.toISOString();
        }
      }

      // 1. Update Parent
      const { data: updatedParent, error: updateError } = await supabase
        .from('appointments')
        .update({
          ...parentUpdates, // Use the adjusted updates
          updated_at: new Date().toISOString()
        })
        .eq('id', parentId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update parent: ${updateError.message}`);
      }

      // 2. Update ALL existing child instances (past and future) linked to this parent
      
      const childUpdates: any = {
        updated_at: new Date().toISOString()
      };
      
      // Map fields (excluding time for now)
      if (updates.title) childUpdates.title = updates.title;
      if (updates.description !== undefined) childUpdates.description = updates.description;
      if (updates.location !== undefined) childUpdates.location = updates.location;
      if (updates.meeting_link !== undefined) childUpdates.meeting_link = updates.meeting_link;
      if (updates.appointment_type) childUpdates.appointment_type = updates.appointment_type;
      if (updates.notes !== undefined) childUpdates.notes = updates.notes;
      if (updates.additional_attendees !== undefined) childUpdates.additional_attendees = updates.additional_attendees;

      if (updates.start_time && updates.end_time) {
        // Update Time for all children
        const { data: children } = await supabase
          .from('appointments')
          .select('*')
          .eq('parent_appointment_id', parentId);
          
        if (children && children.length > 0) {
          const newStartTime = new Date(updates.start_time);
          const newEndTime = new Date(updates.end_time);
          const durationMs = newEndTime.getTime() - newStartTime.getTime();
          
          // Batch update might be inefficient if we do one by one, 
          // but we need to preserve each child's specific date.
          for (const child of children) {
            const childDate = new Date(child.start_time); 
            const childStart = new Date(childDate);
            
            // Apply new time to child's date
            childStart.setUTCHours(
              newStartTime.getUTCHours(), 
              newStartTime.getUTCMinutes(), 
              newStartTime.getUTCSeconds(), 
              newStartTime.getUTCMilliseconds()
            );
            
            const childEnd = new Date(childStart.getTime() + durationMs);
            
            await supabase
              .from('appointments')
              .update({
                ...childUpdates,
                start_time: childStart.toISOString(),
                end_time: childEnd.toISOString()
              })
              .eq('id', child.id);
          }
        }
      } else {
        // Bulk update non-time fields
        await supabase
          .from('appointments')
          .update(childUpdates)
          .eq('parent_appointment_id', parentId);
      }

      return isParent ? updatedParent : await supabase.from('appointments').select('*').eq('id', appointmentId).single().then(r => r.data);
    } 
    
    // SCOPE: THIS_AND_FOLLOWING
    // Split the series
    else if (updateScope === 'this_and_following') {
      // 1. Determine split point
      const splitDate = new Date(appointment.start_time);
      const splitSequence = appointment.recurrence_sequence_number;
      
      // 2. Identify the original parent
      const { data: originalParent } = await supabase
        .from('appointments')
        .select('*')
        .eq('id', parentId)
        .single();
        
      if (!originalParent) throw new Error('Original parent not found');

      // 3. Stop the old series: Set recurrence_end_date on original parent
      // The old series should end the day BEFORE this instance.
      const dayBefore = new Date(splitDate);
      dayBefore.setDate(dayBefore.getDate() - 1);
      
      await supabase
        .from('appointments')
        .update({
          recurrence_end_date: dayBefore.toISOString().split('T')[0],
          updated_at: new Date().toISOString()
        })
        .eq('id', parentId);

      // 4. Create NEW Parent starting from this instance
      // Use the 'updates' to define the new parent's properties (new time, new title, etc.)
      // Use original parent's pattern, but check if we need to adjust start date logic?
      // No, createParent handles it.
      
      const newParentData: CreateRecurringAppointmentData = {
        nutritionistId: originalParent.nutritionist_id,
        clientId: originalParent.client_id,
        title: updates.title || originalParent.title,
        description: updates.description !== undefined ? updates.description : originalParent.description,
        startTime: updates.start_time || appointment.start_time, // Use new time or existing instance time
        endTime: updates.end_time || appointment.end_time,
        timezone: updates.timezone || originalParent.timezone,
        location: updates.location !== undefined ? updates.location : originalParent.location,
        meetingLink: updates.meeting_link !== undefined ? updates.meeting_link : originalParent.meeting_link,
        notes: updates.notes !== undefined ? updates.notes : originalParent.notes,
        appointmentType: updates.appointment_type || originalParent.appointment_type,
        additionalAttendees: updates.additional_attendees !== undefined ? updates.additional_attendees : originalParent.additional_attendees,
        recurrencePattern: originalParent.recurrence_pattern, // Keep same pattern
        createdByUserId: originalParent.created_by_user_id,
        createdByUserType: originalParent.created_by_user_type
      };
      
      // If original pattern had an end date, preserve it? Yes.
      // If original pattern had occurrence count, we need to calculate remaining?
      // For simplicity/robustness: stick to endDate if possible. 
      // If count, might reset count. Let's keep it simple: copy pattern.
      
      // Create new parent (this instance becomes the new parent)
      // BUT: If "this" instance already exists in DB (as a child), we should DELETE it and replace with new Parent?
      // OR promote it? Promoting is hard because ID changes or schema changes.
      // Easier: Delete "this and following" existing instances, then Create New Series.
      
      // Delete existing future instances (including this one)
      await supabase
        .from('appointments')
        .delete()
        .or(`id.eq.${parentId},parent_appointment_id.eq.${parentId}`) // Check parent match
        .gte('start_time', splitDate.toISOString()); // Future only
        
      // Wait, if we delete 'this' instance by ID, we are good.
      // If we delete by parent_id + date, we catch all future generated ones.
      
      // Actually, safest is:
      // A. Truncate old series (update end date) -> Prevents regeneration of old series in future.
      // B. Delete existing concrete instances >= splitDate.
      // C. Create new series.
      
      // A. Update Old Parent End Date
      // (Done above)
      
      // B. Delete existing instances >= splitDate linked to old parent
      await supabase
        .from('appointments')
        .delete()
        .eq('parent_appointment_id', parentId)
        .gte('start_time', splitDate.toISOString());
        
      // Also, if 'appointmentId' IS the parent (sequence 0) and we are doing "this and following" (which is "all"),
      // we essentially just did 'all' logic.
      // But if we are at sequence 5, we delete 5, 6, 7...
      
      // C. Create New Series
      const result = await this.createRecurringAppointment(newParentData);
      
      return result.parent;
    }

    // SCOPE: THIS_ONLY
    else {
      // Update single instance (child or parent)
      const updateData: any = {
        ...updates,
        updated_at: new Date().toISOString()
      };

      // If updating a child instance, mark as modified
      if (!isParent && !appointment.is_modified) {
        updateData.is_modified = true;
        updateData.original_template_data = {
          title: appointment.title,
          description: appointment.description,
          start_time: appointment.start_time,
          end_time: appointment.end_time,
          location: appointment.location,
          meeting_link: appointment.meeting_link,
          appointment_type: appointment.appointment_type
        };
      }

      const { data: updated, error: updateError } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update appointment: ${updateError.message}`);
      }

      return updated;
    }
  }

  /**
   * Update recurrence pattern of a parent appointment
   */
  async updateRecurrencePattern(
    parentId: string,
    newPattern: RecurrencePattern
  ): Promise<any> {
    // Validate pattern
    const validation = this.patternService.validatePattern(newPattern);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    // Get parent
    const { data: parent, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', parentId)
      .single();

    if (error || !parent) {
      throw new Error('Parent appointment not found');
    }

    if (!parent.is_recurring || parent.parent_appointment_id !== null) {
      throw new Error('Appointment is not a recurring parent');
    }

    // Update parent with new pattern
    const { data: updatedParent, error: updateError } = await supabase
      .from('appointments')
      .update({
        recurrence_pattern: newPattern,
        recurrence_end_date: newPattern.endDate || null,
        recurrence_occurrence_count: newPattern.occurrenceCount || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', parentId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update recurrence pattern: ${updateError.message}`);
    }

    return updatedParent;
  }
}
