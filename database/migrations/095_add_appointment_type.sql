-- Migration: Add appointment_type column to appointments table
-- Description: Add support for offline appointments that don't sync to Google Calendar
-- Created: 2025-12-08

-- Add appointment_type column
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS appointment_type VARCHAR(20) DEFAULT 'online' CHECK (appointment_type IN ('online', 'offline'));

-- Add index for appointment_type
CREATE INDEX IF NOT EXISTS idx_appointments_type
  ON appointments(appointment_type);

-- Update sync_status for offline appointments
UPDATE appointments
SET sync_status = 'offline'
WHERE appointment_type = 'offline' AND sync_status = 'pending';

-- Comments for documentation
COMMENT ON COLUMN appointments.appointment_type IS 'Type of appointment: online (syncs to Google Calendar) or offline (no sync)';
