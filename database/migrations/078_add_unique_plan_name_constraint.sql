-- Migration 078: Add Unique Constraint on Plan Names
-- Ensures nutritionists cannot create duplicate meal plan names

-- Step 0: Temporarily drop check constraints that might interfere with updates
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS valid_plan_date_range;

-- Step 1: Rename duplicate plan names in meal_plan_drafts
-- This ensures we can add the unique constraint without conflicts
DO $$
DECLARE
  duplicate_record RECORD;
  rec RECORD;
  counter INTEGER;
BEGIN
  -- Find and rename duplicates
  FOR duplicate_record IN
    SELECT nutritionist_id, plan_name
    FROM meal_plan_drafts
    GROUP BY nutritionist_id, plan_name
    HAVING COUNT(*) > 1
  LOOP
    counter := 1;
    -- Update all but the first occurrence (keeping the oldest)
    FOR rec IN
      SELECT id
      FROM meal_plan_drafts
      WHERE nutritionist_id = duplicate_record.nutritionist_id
        AND plan_name = duplicate_record.plan_name
      ORDER BY created_at ASC
      OFFSET 1
    LOOP
      UPDATE meal_plan_drafts
      SET plan_name = duplicate_record.plan_name || ' (' || counter || ')'
      WHERE id = rec.id;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Step 2: Rename duplicate plan names in meal_plans (legacy table)
DO $$
DECLARE
  duplicate_record RECORD;
  rec RECORD;
  counter INTEGER;
BEGIN
  -- Find and rename duplicates
  FOR duplicate_record IN
    SELECT nutritionist_id, plan_name
    FROM meal_plans
    GROUP BY nutritionist_id, plan_name
    HAVING COUNT(*) > 1
  LOOP
    counter := 1;
    -- Update all but the first occurrence (keeping the oldest)
    FOR rec IN
      SELECT id
      FROM meal_plans
      WHERE nutritionist_id = duplicate_record.nutritionist_id
        AND plan_name = duplicate_record.plan_name
      ORDER BY created_at ASC
      OFFSET 1
    LOOP
      UPDATE meal_plans
      SET plan_name = duplicate_record.plan_name || ' (' || counter || ')'
      WHERE id = rec.id;
      counter := counter + 1;
    END LOOP;
  END LOOP;
END $$;

-- Step 2.5: Recreate the check constraint for meal_plans
ALTER TABLE meal_plans ADD CONSTRAINT valid_plan_date_range
  CHECK (end_date IS NULL OR end_date >= start_date);

-- Step 3: Make plan_name NOT NULL in meal_plan_drafts (already has DEFAULT)
ALTER TABLE meal_plan_drafts
  ALTER COLUMN plan_name SET NOT NULL;

-- Step 4: Add unique constraint for (nutritionist_id, plan_name) in meal_plan_drafts
-- This ensures each nutritionist can only have one meal plan with a given name
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plan_drafts_unique_name
  ON meal_plan_drafts(nutritionist_id, plan_name);

-- Step 5: Make plan_name NOT NULL in meal_plans (legacy table)
ALTER TABLE meal_plans
  ALTER COLUMN plan_name SET NOT NULL;

-- Step 6: Add unique constraint for (nutritionist_id, plan_name) in meal_plans
CREATE UNIQUE INDEX IF NOT EXISTS idx_meal_plans_unique_name
  ON meal_plans(nutritionist_id, plan_name);

-- Step 7: Add comments explaining the constraint
COMMENT ON INDEX idx_meal_plan_drafts_unique_name IS
  'Ensures each nutritionist has unique meal plan names. Prevents duplicate plan names per nutritionist.';

COMMENT ON INDEX idx_meal_plans_unique_name IS
  'Ensures each nutritionist has unique meal plan names in legacy table. Prevents duplicate plan names per nutritionist.';

-- Step 8: Add helper function to check if plan name is available
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
