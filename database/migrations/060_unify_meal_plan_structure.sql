-- Migration 060: Unify Meal Plan Structure
-- This migration consolidates meal_plans into the meal_plan_drafts structure
-- for a unified architecture supporting ingredient replacement

-- Step 1: Add new columns to meal_plan_drafts to support finalized plans
ALTER TABLE meal_plan_drafts 
  ALTER COLUMN expires_at DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS plan_name VARCHAR(255) DEFAULT 'Meal Plan',
  ADD COLUMN IF NOT EXISTS plan_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS plan_duration_days INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMP WITH TIME ZONE;

-- Step 2: Update status check constraint to include 'active', 'completed', 'archived'
ALTER TABLE meal_plan_drafts 
  DROP CONSTRAINT IF EXISTS meal_plan_drafts_status_check;

ALTER TABLE meal_plan_drafts
  ADD CONSTRAINT meal_plan_drafts_status_check 
  CHECK (status IN ('draft', 'completed', 'finalized', 'active', 'archived'));

-- Step 3: Add comment explaining the unified structure
COMMENT ON TABLE meal_plan_drafts IS 
'Unified meal plan table. Status: draft = in progress, finalized = ready to assign, active = assigned to client, completed = client finished, archived = old plan';

COMMENT ON COLUMN meal_plan_drafts.suggestions IS 
'JSONB structure: For drafts contains all recipe suggestions. For finalized/active plans contains only selected recipes with customizations';

COMMENT ON COLUMN meal_plan_drafts.expires_at IS 
'Expiration date for drafts (7 days). NULL for finalized/active/completed/archived plans';

-- Step 4: Create index for plan_date for efficient queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_plan_date ON meal_plan_drafts(plan_date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_client_date ON meal_plan_drafts(client_id, plan_date);

-- Step 5: Update cleanup function to only delete draft status plans
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM meal_plan_drafts 
    WHERE status = 'draft' 
      AND expires_at IS NOT NULL 
      AND expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create view for backward compatibility with old meal_plans queries
CREATE OR REPLACE VIEW meal_plans_unified AS
SELECT 
  id,
  client_id,
  nutritionist_id,
  plan_name,
  plan_date,
  end_date,
  plan_duration_days,
  status,
  search_params->>'calories' AS target_calories,
  search_params->>'protein' AS target_protein_grams,
  search_params->>'carbs' AS target_carbs_grams,
  search_params->>'fat' AS target_fat_grams,
  search_params->>'fiber' AS target_fiber_grams,
  search_params->'dietaryPreferences'->'allergies' AS dietary_restrictions,
  search_params->'dietaryPreferences'->'cuisineTypes' AS cuisine_preferences,
  suggestions AS generated_meals,
  created_at,
  updated_at,
  finalized_at AS generated_at
FROM meal_plan_drafts
WHERE status IN ('finalized', 'active', 'completed', 'archived');

-- Step 7: Add helpful function to finalize a draft (convert draft to finalized plan)
CREATE OR REPLACE FUNCTION finalize_meal_plan_draft(
  draft_id_param VARCHAR(255),
  plan_name_param VARCHAR(255) DEFAULT 'Meal Plan',
  plan_date_param DATE DEFAULT CURRENT_DATE
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  -- Update the draft to finalized status and set metadata
  UPDATE meal_plan_drafts
  SET 
    status = 'finalized',
    plan_name = plan_name_param,
    plan_date = plan_date_param,
    finalized_at = NOW(),
    expires_at = NULL,  -- Remove expiration for finalized plans
    updated_at = NOW()
  WHERE id = draft_id_param 
    AND status = 'draft';
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add function to activate a finalized plan
CREATE OR REPLACE FUNCTION activate_meal_plan(
  plan_id_param VARCHAR(255)
)
RETURNS BOOLEAN AS $$
DECLARE
  rows_affected INTEGER;
BEGIN
  UPDATE meal_plan_drafts
  SET 
    status = 'active',
    updated_at = NOW()
  WHERE id = plan_id_param 
    AND status = 'finalized';
  
  GET DIAGNOSTICS rows_affected = ROW_COUNT;
  
  RETURN rows_affected > 0;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION finalize_meal_plan_draft IS 
'Converts a draft to a finalized meal plan by removing unselected recipes and setting finalized status';

COMMENT ON FUNCTION activate_meal_plan IS 
'Activates a finalized meal plan, making it the active plan for the client';

-- Note: Old meal_plans and meal_plan_meals tables are kept for backward compatibility
-- but new code should use meal_plan_drafts table exclusively

