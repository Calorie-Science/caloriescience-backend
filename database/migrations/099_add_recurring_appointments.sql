-- Migration: Add Recurring Appointments Support
-- Description: Add recurrence fields to appointments table for recurring appointment functionality
-- Created: 2025-01-XX

ALTER TABLE appointments
  -- Recurrence pattern (stored on parent only)
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS recurrence_pattern JSONB, -- Stores pattern: { type: 'daily'|'weekly'|'monthly'|'yearly', interval: number, daysOfWeek?: number[], endDate?: string, occurrenceCount?: number }
  ADD COLUMN IF NOT EXISTS recurrence_end_date DATE, -- Optional end date
  ADD COLUMN IF NOT EXISTS recurrence_occurrence_count INTEGER, -- Optional max occurrences
  
  -- Parent/Child relationship
  ADD COLUMN IF NOT EXISTS parent_appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE, -- NULL for parent, points to parent for children
  ADD COLUMN IF NOT EXISTS recurrence_sequence_number INTEGER DEFAULT 0, -- 0 = parent, 1+ = child instance number
  
  -- Recurrence status
  ADD COLUMN IF NOT EXISTS recurrence_status VARCHAR(20) DEFAULT 'active', -- 'active', 'cancelled', 'paused'
  
  -- Instance modifications
  ADD COLUMN IF NOT EXISTS is_modified BOOLEAN DEFAULT false, -- True if this instance was modified from template
  ADD COLUMN IF NOT EXISTS original_template_data JSONB; -- Stores original data if instance was modified

-- Add check constraint for recurrence_status
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_recurrence_status_check;
ALTER TABLE appointments ADD CONSTRAINT appointments_recurrence_status_check
  CHECK (recurrence_status IS NULL OR recurrence_status IN ('active', 'cancelled', 'paused'));

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_appointments_parent_id 
  ON appointments(parent_appointment_id);
CREATE INDEX IF NOT EXISTS idx_appointments_is_recurring_status 
  ON appointments(is_recurring, recurrence_status);
CREATE INDEX IF NOT EXISTS idx_appointments_recurrence_sequence 
  ON appointments(parent_appointment_id, recurrence_sequence_number);

-- Comments for documentation
COMMENT ON COLUMN appointments.is_recurring IS 'True if this is a recurring appointment parent or child';
COMMENT ON COLUMN appointments.recurrence_pattern IS 'JSON pattern defining recurrence: type, interval, daysOfWeek, etc.';
COMMENT ON COLUMN appointments.parent_appointment_id IS 'Reference to parent appointment (NULL for parent, UUID for children)';
COMMENT ON COLUMN appointments.recurrence_sequence_number IS '0 for parent, 1+ for child instances';
COMMENT ON COLUMN appointments.recurrence_status IS 'Status of recurrence: active, cancelled, paused';
COMMENT ON COLUMN appointments.is_modified IS 'True if this instance was modified from the template';
COMMENT ON COLUMN appointments.original_template_data IS 'Stores original template data if instance was modified';

