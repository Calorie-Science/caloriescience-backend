-- Migration 021: Add guideline tracking to nutrition requirements
-- This migration adds fields to track which country guidelines were used for EER and macro calculations

-- Add columns to track which guidelines were used
ALTER TABLE client_nutrition_requirements
ADD COLUMN IF NOT EXISTS eer_guideline_country VARCHAR(20),
ADD COLUMN IF NOT EXISTS macro_guideline_country VARCHAR(20),
ADD COLUMN IF NOT EXISTS guideline_notes TEXT;

-- Add comments
COMMENT ON COLUMN client_nutrition_requirements.eer_guideline_country IS 'Country guideline used for EER calculation (e.g., USA, UK, India)';
COMMENT ON COLUMN client_nutrition_requirements.macro_guideline_country IS 'Country guideline used for macro calculation (e.g., USA, UK, India)';
COMMENT ON COLUMN client_nutrition_requirements.guideline_notes IS 'Notes about guideline selection or fallback logic applied';

-- Create indexes for reporting
CREATE INDEX IF NOT EXISTS idx_nutrition_requirements_eer_guideline 
ON client_nutrition_requirements(eer_guideline_country);

CREATE INDEX IF NOT EXISTS idx_nutrition_requirements_macro_guideline 
ON client_nutrition_requirements(macro_guideline_country);

-- Update existing records to set guideline countries based on client location
-- This is a one-time update to backfill data
UPDATE client_nutrition_requirements nr
SET 
  eer_guideline_country = CASE 
    WHEN c.location LIKE '%UK%' OR c.location LIKE '%United Kingdom%' THEN 'UK'
    WHEN c.location LIKE '%India%' THEN 'India'
    ELSE 'USA'  -- Default to USA for all other locations
  END,
  macro_guideline_country = 'USA',  -- Macros default to USA as per current logic
  guideline_notes = 'Retroactively applied based on client location'
FROM clients c
WHERE nr.client_id = c.id
  AND nr.eer_guideline_country IS NULL; 