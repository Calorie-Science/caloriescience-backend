-- Migration: Fix calories_per_serving column type to support decimal values
-- Issue: calories_per_serving was defined as INTEGER but recipe calories are decimal values

-- First, we need to drop the view that depends on this column
DROP VIEW IF EXISTS meal_plan_by_day CASCADE;

-- Change calories_per_serving from INTEGER to DECIMAL to support decimal values
ALTER TABLE meal_plan_meals 
ALTER COLUMN calories_per_serving TYPE DECIMAL(8,2);

-- Also ensure all nutrition columns are DECIMAL for consistency
ALTER TABLE meal_plan_meals 
ALTER COLUMN protein_grams TYPE DECIMAL(6,2),
ALTER COLUMN carbs_grams TYPE DECIMAL(6,2),
ALTER COLUMN fat_grams TYPE DECIMAL(6,2),
ALTER COLUMN fiber_grams TYPE DECIMAL(6,2);

-- Now recreate the meal_plan_by_day view with the exact definition from migration 048
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

-- Restore the comment on the view
COMMENT ON VIEW meal_plan_by_day IS 'Day-wise organization of meals within meal plans';
