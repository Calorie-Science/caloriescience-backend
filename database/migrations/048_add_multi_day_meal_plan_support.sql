-- Migration 048: Add multi-day meal plan support
-- This adds support for multi-day meal plans with recipe exclusion and day-wise organization

-- Add columns to meal_plans table to support multi-day planning
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS plan_duration_days INTEGER DEFAULT 1 CHECK (plan_duration_days >= 1 AND plan_duration_days <= 30),
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS excluded_recipes TEXT[] DEFAULT '{}', -- Array of recipe URIs to exclude
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}'; -- Store generation metadata like API calls made

-- Update the plan_date constraint to work with end_date
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS valid_plan_date;
ALTER TABLE meal_plans ADD CONSTRAINT valid_plan_date_range 
  CHECK (
    plan_date >= CURRENT_DATE - INTERVAL '30 days' AND
    (end_date IS NULL OR end_date >= plan_date) AND
    (end_date IS NULL OR end_date <= plan_date + INTERVAL '30 days')
  );

-- Add a computed end_date trigger to automatically set end_date based on plan_duration_days
CREATE OR REPLACE FUNCTION set_meal_plan_end_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.plan_duration_days IS NOT NULL AND NEW.plan_duration_days > 1 THEN
    NEW.end_date = NEW.plan_date + (NEW.plan_duration_days - 1) * INTERVAL '1 day';
  ELSE
    NEW.end_date = NEW.plan_date; -- Single day plan
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_meal_plan_end_date_trigger
  BEFORE INSERT OR UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION set_meal_plan_end_date();

-- Add day_number column to meal_plan_meals to support multi-day organization
ALTER TABLE meal_plan_meals 
ADD COLUMN IF NOT EXISTS day_number INTEGER DEFAULT 1 CHECK (day_number >= 1),
ADD COLUMN IF NOT EXISTS meal_date DATE;

-- Create a trigger to automatically set meal_date based on day_number
CREATE OR REPLACE FUNCTION set_meal_date()
RETURNS TRIGGER AS $$
DECLARE
  plan_start_date DATE;
BEGIN
  -- Get the start date of the meal plan
  SELECT plan_date INTO plan_start_date 
  FROM meal_plans 
  WHERE id = NEW.meal_plan_id;
  
  -- Set meal_date based on plan start date and day_number
  NEW.meal_date = plan_start_date + (NEW.day_number - 1) * INTERVAL '1 day';
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_meal_date_trigger
  BEFORE INSERT OR UPDATE ON meal_plan_meals
  FOR EACH ROW
  EXECUTE FUNCTION set_meal_date();

-- Update constraints to include day_number
ALTER TABLE meal_plan_meals DROP CONSTRAINT IF EXISTS valid_meal_order;
ALTER TABLE meal_plan_meals ADD CONSTRAINT valid_meal_order_per_day 
  CHECK (meal_order > 0 AND meal_order <= 10); -- Max 10 meals per day

-- Add unique constraint to prevent duplicate meal orders on the same day
ALTER TABLE meal_plan_meals 
ADD CONSTRAINT unique_meal_order_per_day 
UNIQUE (meal_plan_id, day_number, meal_order);

-- Create new indexes for multi-day support
CREATE INDEX IF NOT EXISTS idx_meal_plans_duration ON meal_plans(plan_duration_days);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date_range ON meal_plans(plan_date, end_date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_day_number ON meal_plan_meals(meal_plan_id, day_number);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_date ON meal_plan_meals(meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_day_order ON meal_plan_meals(meal_plan_id, day_number, meal_order);

-- Update existing records to have day_number = 1 and set meal_date
UPDATE meal_plan_meals 
SET day_number = 1 
WHERE day_number IS NULL;

UPDATE meal_plan_meals 
SET meal_date = (
  SELECT plan_date 
  FROM meal_plans 
  WHERE meal_plans.id = meal_plan_meals.meal_plan_id
)
WHERE meal_date IS NULL;

-- Update existing meal plans to have plan_duration_days = 1 and end_date
UPDATE meal_plans 
SET plan_duration_days = 1,
    end_date = plan_date
WHERE plan_duration_days IS NULL;

-- Add comments for the new columns
COMMENT ON COLUMN meal_plans.plan_duration_days IS 'Number of days this meal plan covers (1-30)';
COMMENT ON COLUMN meal_plans.end_date IS 'End date of the meal plan (auto-calculated from plan_date + duration)';
COMMENT ON COLUMN meal_plans.excluded_recipes IS 'Array of recipe URIs to exclude when generating subsequent days';
COMMENT ON COLUMN meal_plans.generation_metadata IS 'Metadata about meal plan generation (API calls, excluded recipes per day, etc.)';
COMMENT ON COLUMN meal_plan_meals.day_number IS 'Day number within the meal plan (1 = first day, 2 = second day, etc.)';
COMMENT ON COLUMN meal_plan_meals.meal_date IS 'Specific date for this meal (auto-calculated from plan start date + day number)';

-- Create a view for easy querying of multi-day meal plans
CREATE OR REPLACE VIEW meal_plan_summary AS
SELECT 
  mp.id,
  mp.client_id,
  mp.nutritionist_id,
  mp.plan_name,
  mp.plan_date,
  mp.end_date,
  mp.plan_duration_days,
  mp.plan_type,
  mp.status,
  mp.target_calories,
  mp.dietary_restrictions,
  mp.cuisine_preferences,
  COUNT(mpm.id) as total_meals,
  COUNT(DISTINCT mpm.day_number) as days_with_meals,
  mp.created_at,
  mp.updated_at
FROM meal_plans mp
LEFT JOIN meal_plan_meals mpm ON mp.id = mpm.meal_plan_id
GROUP BY mp.id, mp.client_id, mp.nutritionist_id, mp.plan_name, 
         mp.plan_date, mp.end_date, mp.plan_duration_days, mp.plan_type, 
         mp.status, mp.target_calories, mp.dietary_restrictions, 
         mp.cuisine_preferences, mp.created_at, mp.updated_at;

-- Create a view for day-wise meal organization
CREATE OR REPLACE VIEW meal_plan_by_day AS
SELECT 
  mp.id as meal_plan_id,
  mp.client_id,
  mp.nutritionist_id,
  mp.plan_name,
  mpm.day_number,
  mpm.meal_date,
  mpm.meal_type,
  mpm.meal_order,
  mpm.recipe_name,
  mpm.calories_per_serving,
  mpm.total_calories,
  mpm.protein_grams,
  mpm.carbs_grams,
  mpm.fat_grams,
  mpm.ingredients,
  mp.status,
  mp.created_at
FROM meal_plans mp
JOIN meal_plan_meals mpm ON mp.id = mpm.meal_plan_id
ORDER BY mp.id, mpm.day_number, mpm.meal_order;

COMMENT ON VIEW meal_plan_summary IS 'Summary view of meal plans with aggregate statistics';
COMMENT ON VIEW meal_plan_by_day IS 'Day-wise organization of meals within meal plans';
