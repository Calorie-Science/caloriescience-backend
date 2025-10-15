-- Migration: Add creation_method to meal_plan_drafts
-- This allows us to distinguish between auto-generated (via recipe APIs) and manually created meal plans

-- Add creation_method column
ALTER TABLE meal_plan_drafts 
ADD COLUMN creation_method VARCHAR(20) DEFAULT 'auto_generated' 
CHECK (creation_method IN ('auto_generated', 'manual'));

-- Add index for filtering by creation method
CREATE INDEX idx_meal_plan_drafts_creation_method 
ON meal_plan_drafts(creation_method);

-- Add helpful comment
COMMENT ON COLUMN meal_plan_drafts.creation_method IS 
'How the plan was created: auto_generated (via recipe APIs like Edamam/Spoonacular) or manual (nutritionist selected recipes)';

-- Note: We do NOT add meal_program_id as a foreign key
-- The meal program is used as a template at creation time only
-- Its structure is copied into the suggestions JSONB
-- This allows nutritionists to freely modify the meal structure

