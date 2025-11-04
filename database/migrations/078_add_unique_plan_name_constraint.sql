-- Migration 078: Add Unique Constraint on Plan Names
-- Ensures nutritionists cannot create duplicate meal plan names

-- Step 1: Make plan_name NOT NULL in meal_plan_drafts (already has DEFAULT)
ALTER TABLE meal_plan_drafts
  ALTER COLUMN plan_name SET NOT NULL;

-- Step 2: Add unique constraint for (nutritionist_id, plan_name) in meal_plan_drafts
-- This ensures each nutritionist can only have one meal plan with a given name
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plan_drafts_unique_name
  ON meal_plan_drafts(nutritionist_id, plan_name);

-- Step 3: Make plan_name NOT NULL in meal_plans (legacy table)
ALTER TABLE meal_plans
  ALTER COLUMN plan_name SET NOT NULL;

-- Step 4: Add unique constraint for (nutritionist_id, plan_name) in meal_plans
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_unique_name
  ON meal_plans(nutritionist_id, plan_name);

-- Step 5: Add comments explaining the constraint
COMMENT ON INDEX idx_meal_plan_drafts_unique_name IS
  'Ensures each nutritionist has unique meal plan names. Prevents duplicate plan names per nutritionist.';

COMMENT ON INDEX idx_meal_plans_unique_name IS
  'Ensures each nutritionist has unique meal plan names in legacy table. Prevents duplicate plan names per nutritionist.';

-- Step 6: Add helper function to check if plan name is available
CREATE OR REPLACE FUNCTION is_plan_name_available(
  nutritionist_id_param UUID,
  plan_name_param VARCHAR(255),
  exclude_plan_id_param VARCHAR(255) DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
  name_exists BOOLEAN;
BEGIN
  -- Check in meal_plan_drafts
  SELECT EXISTS(
    SELECT 1
    FROM meal_plan_drafts
    WHERE nutritionist_id = nutritionist_id_param
      AND plan_name = plan_name_param
      AND (exclude_plan_id_param IS NULL OR id != exclude_plan_id_param)
  ) INTO name_exists;

  IF name_exists THEN
    RETURN FALSE;
  END IF;

  -- Check in legacy meal_plans table
  SELECT EXISTS(
    SELECT 1
    FROM meal_plans
    WHERE nutritionist_id = nutritionist_id_param
      AND plan_name = plan_name_param
  ) INTO name_exists;

  RETURN NOT name_exists;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_plan_name_available IS
  'Checks if a plan name is available for a nutritionist across both meal_plan_drafts and meal_plans tables. Optionally exclude a specific plan ID when updating.';
