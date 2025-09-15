-- Migration: Split health_labels into allergies and preferences
-- This allows better categorization for meal planning and Edamam API integration

-- Drop the existing health_labels column
ALTER TABLE client_goals 
DROP COLUMN IF EXISTS health_labels;

-- Add new allergies column (things to avoid - safety critical)
ALTER TABLE client_goals 
ADD COLUMN allergies TEXT[];

-- Add new preferences column (dietary choices - lifestyle preferences)
ALTER TABLE client_goals 
ADD COLUMN preferences TEXT[];

-- Add comments to document the new columns
COMMENT ON COLUMN client_goals.allergies IS 'Array of allergy/intolerance restrictions that must be avoided (e.g., gluten-free, dairy-free, nut-free). These are safety-critical filters.';
COMMENT ON COLUMN client_goals.preferences IS 'Array of dietary lifestyle preferences (e.g., vegan, keto-friendly, Mediterranean). These are preference-based filters.';

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_client_goals_allergies ON client_goals USING GIN (allergies);
CREATE INDEX IF NOT EXISTS idx_client_goals_preferences ON client_goals USING GIN (preferences);

-- Drop the old health_labels index if it exists
DROP INDEX IF EXISTS idx_client_goals_health_labels;
