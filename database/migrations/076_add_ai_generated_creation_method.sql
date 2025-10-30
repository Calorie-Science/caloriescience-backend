-- Migration: Add ai_generated as a third creation_method value
-- This allows distinguishing between automated (filter-based), manual, and AI-generated meal plans

-- Drop the existing check constraint
ALTER TABLE meal_plan_drafts 
DROP CONSTRAINT IF EXISTS meal_plan_drafts_creation_method_check;

-- Add updated check constraint with three values
ALTER TABLE meal_plan_drafts 
ADD CONSTRAINT meal_plan_drafts_creation_method_check 
CHECK (creation_method IN ('auto_generated', 'manual', 'ai_generated'));

-- Update comment to reflect all three types
COMMENT ON COLUMN meal_plan_drafts.creation_method IS 
'How the plan was created: auto_generated (filter-based via Edamam/Spoonacular), manual (nutritionist selected recipes), or ai_generated (Claude AI generated)';

