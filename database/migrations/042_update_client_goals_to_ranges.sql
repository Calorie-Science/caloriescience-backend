-- Migration: Update client_goals table to use min/max ranges instead of percentages
-- Date: 2025-01-20
-- Description: Remove percentage fields and add min/max range fields for macros

-- Add new min/max range columns
ALTER TABLE client_goals 
ADD COLUMN protein_goal_min INTEGER,
ADD COLUMN protein_goal_max INTEGER,
ADD COLUMN carbs_goal_min INTEGER,
ADD COLUMN carbs_goal_max INTEGER,
ADD COLUMN fat_goal_min INTEGER,
ADD COLUMN fat_goal_max INTEGER;

-- Migrate existing data: convert single values to ranges
-- For existing records, set min = current value * 0.8 and max = current value * 1.2
UPDATE client_goals 
SET 
  protein_goal_min = ROUND(protein_goal_grams * 0.8),
  protein_goal_max = ROUND(protein_goal_grams * 1.2),
  carbs_goal_min = ROUND(carbs_goal_grams * 0.8),
  carbs_goal_max = ROUND(carbs_goal_grams * 1.2),
  fat_goal_min = ROUND(fat_goal_grams * 0.8),
  fat_goal_max = ROUND(fat_goal_grams * 1.2);

-- Make the new columns NOT NULL
ALTER TABLE client_goals 
ALTER COLUMN protein_goal_min SET NOT NULL,
ALTER COLUMN protein_goal_max SET NOT NULL,
ALTER COLUMN carbs_goal_min SET NOT NULL,
ALTER COLUMN carbs_goal_max SET NOT NULL,
ALTER COLUMN fat_goal_min SET NOT NULL,
ALTER COLUMN fat_goal_max SET NOT NULL;

-- Drop the old single value columns
ALTER TABLE client_goals 
DROP COLUMN protein_goal_grams,
DROP COLUMN carbs_goal_grams,
DROP COLUMN fat_goal_grams;

-- Drop the percentage columns
ALTER TABLE client_goals 
DROP COLUMN protein_goal_percentage,
DROP COLUMN carbs_goal_percentage,
DROP COLUMN fat_goal_percentage;

-- Add constraints to ensure min < max for each macro
ALTER TABLE client_goals 
ADD CONSTRAINT check_protein_range CHECK (protein_goal_min < protein_goal_max),
ADD CONSTRAINT check_carbs_range CHECK (carbs_goal_min < carbs_goal_max),
ADD CONSTRAINT check_fat_range CHECK (fat_goal_min < fat_goal_max);

-- Add constraints to ensure positive values
ALTER TABLE client_goals 
ADD CONSTRAINT check_protein_positive CHECK (protein_goal_min > 0 AND protein_goal_max > 0),
ADD CONSTRAINT check_carbs_positive CHECK (carbs_goal_min > 0 AND carbs_goal_max > 0),
ADD CONSTRAINT check_fat_positive CHECK (fat_goal_min > 0 AND fat_goal_max > 0);
