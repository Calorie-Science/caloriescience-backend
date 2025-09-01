-- Migration: Remove percentage fields from meal_program_meals table
-- We'll use client goals for daily macro requirements instead of meal-specific percentages

-- Remove the percentage columns
ALTER TABLE meal_program_meals DROP COLUMN IF EXISTS calorie_percentage;
ALTER TABLE meal_program_meals DROP COLUMN IF EXISTS protein_percentage;
ALTER TABLE meal_program_meals DROP COLUMN IF EXISTS carbs_percentage;
ALTER TABLE meal_program_meals DROP COLUMN IF EXISTS fat_percentage;

-- Remove the percentage constraints
ALTER TABLE meal_program_meals DROP CONSTRAINT IF EXISTS check_calorie_percentage_range;
ALTER TABLE meal_program_meals DROP CONSTRAINT IF EXISTS check_protein_percentage_range;
ALTER TABLE meal_program_meals DROP CONSTRAINT IF EXISTS check_carbs_percentage_range;
ALTER TABLE meal_program_meals DROP CONSTRAINT IF EXISTS check_fat_percentage_range;

-- The meal_program_meals table now contains only:
-- - id, meal_program_id, meal_order, meal_name, meal_time
-- - target_calories, meal_type, created_at, updated_at
-- 
-- Daily macro requirements will come from client_goals table
-- Per-meal calorie filters will use target_calories from meal_program_meals
