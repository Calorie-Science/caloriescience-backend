-- Migration: Allow zero values for macro goals to support dietary-only client goals
-- Date: 2025-01-20
-- Description: Modify constraints to allow 0 values for macros when only dietary preferences are set

-- Drop the existing positive value constraints
ALTER TABLE client_goals 
DROP CONSTRAINT IF EXISTS check_protein_positive,
DROP CONSTRAINT IF EXISTS check_carbs_positive,
DROP CONSTRAINT IF EXISTS check_fat_positive;

-- Drop the range constraints that require min < max
ALTER TABLE client_goals 
DROP CONSTRAINT IF EXISTS check_protein_range,
DROP CONSTRAINT IF EXISTS check_carbs_range,
DROP CONSTRAINT IF EXISTS check_fat_range;

-- Add new constraints that allow 0 values but ensure proper ranges when values are provided
ALTER TABLE client_goals 
ADD CONSTRAINT check_protein_values CHECK (
  (protein_goal_min = 0 AND protein_goal_max = 0) OR 
  (protein_goal_min > 0 AND protein_goal_max > 0 AND protein_goal_min < protein_goal_max)
),
ADD CONSTRAINT check_carbs_values CHECK (
  (carbs_goal_min = 0 AND carbs_goal_max = 0) OR 
  (carbs_goal_min > 0 AND carbs_goal_max > 0 AND carbs_goal_min < carbs_goal_max)
),
ADD CONSTRAINT check_fat_values CHECK (
  (fat_goal_min = 0 AND fat_goal_max = 0) OR 
  (fat_goal_min > 0 AND fat_goal_max > 0 AND fat_goal_min < fat_goal_max)
);

-- Also allow 0 for EER calories when only dietary preferences are set
-- Drop the original constraint that requires EER > 0
ALTER TABLE client_goals 
DROP CONSTRAINT IF EXISTS check_eer_positive,
DROP CONSTRAINT IF EXISTS client_goals_eer_goal_calories_check;

ALTER TABLE client_goals 
ADD CONSTRAINT check_eer_non_negative CHECK (eer_goal_calories >= 0);
