-- Migration 016: Add eer_guideline field to clients table
-- This allows clients to specify which EER guideline to use, separate from their location

-- Add eer_guideline column to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS eer_guideline VARCHAR(20);

-- Add comment to explain the field
COMMENT ON COLUMN clients.eer_guideline IS 'EER calculation guideline preference (e.g., USA, EU, India). Can be different from client location.'; 