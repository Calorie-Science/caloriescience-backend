-- Migration: Add percentage fields to meal_program_meals table
-- This adds calorie and macro percentage distribution fields to existing meal programs

-- Add percentage fields to meal_program_meals table
ALTER TABLE meal_program_meals 
ADD COLUMN calorie_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN protein_percentage DECIMAL(5,2),
ADD COLUMN carbs_percentage DECIMAL(5,2),
ADD COLUMN fat_percentage DECIMAL(5,2);

-- Add constraints for the new percentage fields
ALTER TABLE meal_program_meals 
ADD CONSTRAINT check_calorie_percentage_range 
CHECK (calorie_percentage >= 0 AND calorie_percentage <= 100);

ALTER TABLE meal_program_meals 
ADD CONSTRAINT check_protein_percentage_range 
CHECK (protein_percentage IS NULL OR (protein_percentage >= 0 AND protein_percentage <= 100));

ALTER TABLE meal_program_meals 
ADD CONSTRAINT check_carbs_percentage_range 
CHECK (carbs_percentage IS NULL OR (carbs_percentage >= 0 AND carbs_percentage <= 100));

ALTER TABLE meal_program_meals 
ADD CONSTRAINT check_fat_percentage_range 
CHECK (fat_percentage IS NULL OR (fat_percentage >= 0 AND fat_percentage <= 100));

-- Update existing meals to have default calorie percentages
-- This distributes calories evenly across existing meals
UPDATE meal_program_meals 
SET calorie_percentage = (
  SELECT ROUND(100.0 / COUNT(*), 2)
  FROM meal_program_meals mpm2 
  WHERE mpm2.meal_program_id = meal_program_meals.meal_program_id
);

-- Remove the default constraint after setting values
ALTER TABLE meal_program_meals 
ALTER COLUMN calorie_percentage DROP DEFAULT;

-- Add comment to document the new fields
COMMENT ON COLUMN meal_program_meals.calorie_percentage IS 'Percentage of daily calories for this meal (e.g., 25.00 for 25%)';
COMMENT ON COLUMN meal_program_meals.protein_percentage IS 'Percentage of daily protein for this meal';
COMMENT ON COLUMN meal_program_meals.carbs_percentage IS 'Percentage of daily carbs for this meal';
COMMENT ON COLUMN meal_program_meals.fat_percentage IS 'Percentage of daily fat for this meal';
