-- Migration: Create Google Calendar OAuth and Appointments tables
-- Description: Add support for Google Calendar integration with OAuth2.0 for nutritionists and clients
-- Created: 2025-12-04

-- Table to store Google OAuth tokens for nutritionists and clients
CREATE TABLE IF NOT EXISTS google_calendar_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL, -- Can be nutritionist_id or client_id
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('nutritionist', 'client')),

  -- OAuth credentials
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expiry TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT NOT NULL, -- Space-separated scopes (e.g., 'https://www.googleapis.com/auth/calendar')

  -- Google account info
  google_email VARCHAR(255) NOT NULL,
  google_account_id VARCHAR(255), -- Google's unique identifier for the account

  -- Calendar settings
  primary_calendar_id VARCHAR(255) DEFAULT 'primary', -- Which calendar to use for appointments
  timezone VARCHAR(100) DEFAULT 'UTC',

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_error TEXT, -- Store last error if any

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Ensure one active connection per user
  UNIQUE(user_id, user_type)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_user
  ON google_calendar_connections(user_id, user_type);
CREATE INDEX IF NOT EXISTS idx_google_calendar_connections_active
  ON google_calendar_connections(is_active) WHERE is_active = true;

-- Table to store appointments between nutritionists and clients
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Participants
  nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,

  -- Appointment details
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  timezone VARCHAR(100) DEFAULT 'UTC',

  -- Location (can be physical or virtual)
  location VARCHAR(500),
  meeting_link VARCHAR(500), -- For video calls (Zoom, Google Meet, etc.)

  -- Google Calendar sync
  google_event_id VARCHAR(255), -- Google Calendar event ID
  synced_to_calendar BOOLEAN DEFAULT false,
  sync_status VARCHAR(50) DEFAULT 'pending', -- pending, synced, failed, cancelled
  sync_error TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,

  -- Appointment status
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled',    -- Appointment is scheduled
    'completed',    -- Appointment was completed
    'cancelled',    -- Appointment was cancelled
    'no_show',      -- Client didn't show up
    'rescheduled'   -- Appointment was rescheduled (link to new appointment)
  )),

  -- If rescheduled, link to new appointment
  rescheduled_to_id UUID REFERENCES appointments(id),

  -- Notes and metadata
  notes TEXT, -- Internal notes (not synced to calendar)
  created_by_user_id UUID NOT NULL, -- Who created the appointment
  created_by_user_type VARCHAR(20) NOT NULL CHECK (created_by_user_type IN ('nutritionist', 'client')),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  cancelled_at TIMESTAMP WITH TIME ZONE,

  -- Validation: end_time must be after start_time
  CONSTRAINT valid_appointment_time CHECK (end_time > start_time)
);

-- Indexes for appointments
CREATE INDEX IF NOT EXISTS idx_appointments_nutritionist
  ON appointments(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client
  ON appointments(client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_time
  ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_status
  ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_appointments_google_event
  ON appointments(google_event_id) WHERE google_event_id IS NOT NULL;

-- Table to track OAuth state for security (prevents CSRF attacks)
CREATE TABLE IF NOT EXISTS google_oauth_states (
  state VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('nutritionist', 'client')),
  redirect_uri TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '10 minutes'
);

-- Index for cleanup of expired states
CREATE INDEX IF NOT EXISTS idx_google_oauth_states_expires
  ON google_oauth_states(expires_at);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to auto-update updated_at
CREATE TRIGGER update_google_calendar_connections_updated_at
  BEFORE UPDATE ON google_calendar_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE google_calendar_connections IS 'Stores Google Calendar OAuth tokens for nutritionists and clients';
COMMENT ON TABLE appointments IS 'Stores appointments between nutritionists and clients, synced to Google Calendar';
COMMENT ON TABLE google_oauth_states IS 'Temporary storage for OAuth state parameter to prevent CSRF attacks';

COMMENT ON COLUMN google_calendar_connections.user_type IS 'Type of user: nutritionist or client';
COMMENT ON COLUMN google_calendar_connections.access_token IS 'Google OAuth access token (short-lived)';
COMMENT ON COLUMN google_calendar_connections.refresh_token IS 'Google OAuth refresh token (long-lived, used to get new access tokens)';
COMMENT ON COLUMN google_calendar_connections.token_expiry IS 'When the access token expires';
COMMENT ON COLUMN google_calendar_connections.primary_calendar_id IS 'Which Google Calendar to use (default: primary)';

COMMENT ON COLUMN appointments.google_event_id IS 'Google Calendar event ID for one-way sync';
COMMENT ON COLUMN appointments.synced_to_calendar IS 'Whether this appointment has been synced to Google Calendar';
COMMENT ON COLUMN appointments.sync_status IS 'Current sync status: pending, synced, failed, cancelled';
