-- Migration: Add pass/fail status and title to tester feedback
-- Description: Adds pass_fail status, title field, and tester name fields for better feedback tracking
-- Date: 2025-11-18

-- Add new columns to tester_feedback table
ALTER TABLE tester_feedback
ADD COLUMN IF NOT EXISTS title VARCHAR(255),
ADD COLUMN IF NOT EXISTS pass_fail VARCHAR(10) CHECK (pass_fail IN ('pass', 'fail', NULL)),
ADD COLUMN IF NOT EXISTS tester_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS tester_email VARCHAR(255);

-- Create index for pass/fail filtering
CREATE INDEX IF NOT EXISTS idx_tester_feedback_pass_fail ON tester_feedback(pass_fail);

-- Update comments
COMMENT ON COLUMN tester_feedback.title IS 'Optional title/summary for the feedback entry';
COMMENT ON COLUMN tester_feedback.pass_fail IS 'Pass/Fail status for the feature being tested';
COMMENT ON COLUMN tester_feedback.tester_name IS 'Name of the tester (cached from users table)';
COMMENT ON COLUMN tester_feedback.tester_email IS 'Email of the tester (cached from users table)';

-- Note: The nutritionist_id already links to the tester (nutritionist) who provided feedback
-- The tester_name and tester_email fields are denormalized for easier export and reporting
