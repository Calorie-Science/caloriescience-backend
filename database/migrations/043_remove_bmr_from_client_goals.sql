-- Migration: Remove BMR field from client_goals table
-- Date: 2025-01-20
-- Description: Remove bmr_goal_calories field as it's not needed

-- Drop the BMR column
ALTER TABLE client_goals 
DROP COLUMN bmr_goal_calories;
