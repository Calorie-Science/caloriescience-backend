-- Migration: Add additional_attendees column to appointments table
-- Description: Store additional email addresses for appointment attendees (beyond nutritionist and client)
-- Created: 2025-12-10

-- Add additional_attendees column as a JSON array
ALTER TABLE appointments
ADD COLUMN IF NOT EXISTS additional_attendees TEXT[]; -- Array of email addresses

-- Add index for querying appointments by attendee
CREATE INDEX IF NOT EXISTS idx_appointments_additional_attendees
  ON appointments USING GIN (additional_attendees);

-- Comments for documentation
COMMENT ON COLUMN appointments.additional_attendees IS 'Additional email addresses of attendees (beyond nutritionist and client)';
