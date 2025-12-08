-- Migration: Make client_id nullable in appointments table
-- Description: Allow appointments without clients (e.g., with only additionalAttendees)
-- Created: 2025-12-08

-- Make client_id nullable
ALTER TABLE appointments
ALTER COLUMN client_id DROP NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN appointments.client_id IS 'Client ID (nullable if appointment has only additionalAttendees)';
