-- Migration 048: Add multi-day meal plan support
-- IMPORTANT: Run this on your database to enable multi-day meal plans

BEGIN;

-- Add columns to meal_plans table to support multi-day planning
ALTER TABLE meal_plans 
ADD COLUMN IF NOT EXISTS plan_duration_days INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS end_date DATE,
ADD COLUMN IF NOT EXISTS excluded_recipes TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS generation_metadata JSONB DEFAULT '{}';

-- Add check constraint for plan_duration_days
ALTER TABLE meal_plans 
ADD CONSTRAINT check_plan_duration_days 
CHECK (plan_duration_days >= 1 AND plan_duration_days <= 30);

-- Update the plan_date constraint to work with end_date
ALTER TABLE meal_plans DROP CONSTRAINT IF EXISTS valid_plan_date;
ALTER TABLE meal_plans ADD CONSTRAINT valid_plan_date_range 
  CHECK (
    plan_date >= CURRENT_DATE - INTERVAL '30 days' AND
    (end_date IS NULL OR end_date >= plan_date) AND
    (end_date IS NULL OR end_date <= plan_date + INTERVAL '30 days')
  );

-- Add day_number column to meal_plan_meals to support multi-day organization
ALTER TABLE meal_plan_meals 
ADD COLUMN IF NOT EXISTS day_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS meal_date DATE;

-- Add check constraint for day_number
ALTER TABLE meal_plan_meals 
ADD CONSTRAINT check_day_number 
CHECK (day_number >= 1);

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

-- Create new indexes for multi-day support
CREATE INDEX IF NOT EXISTS idx_meal_plans_duration ON meal_plans(plan_duration_days);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date_range ON meal_plans(plan_date, end_date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_day_number ON meal_plan_meals(meal_plan_id, day_number);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_date ON meal_plan_meals(meal_date);

COMMIT;

-- Verify the migration
SELECT 'Migration completed successfully' as status;
