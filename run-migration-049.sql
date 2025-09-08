-- Run this migration to fix the calories_per_serving column type

-- First, let's check the current column type
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'meal_plan_meals' 
AND column_name = 'calories_per_serving';

-- Run the migration
\i database/migrations/049_fix_calories_decimal_type.sql

-- Verify the change
SELECT column_name, data_type, numeric_precision, numeric_scale 
FROM information_schema.columns 
WHERE table_name = 'meal_plan_meals' 
AND column_name IN ('calories_per_serving', 'protein_grams', 'carbs_grams', 'fat_grams', 'fiber_grams');
