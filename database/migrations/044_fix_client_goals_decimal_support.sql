-- Migration: Fix client_goals table to support decimal values
-- Date: 2025-01-20
-- Description: Change macro range fields from INTEGER to NUMERIC to support decimal values

-- Change macro range columns from INTEGER to NUMERIC to support decimal values
ALTER TABLE client_goals 
ALTER COLUMN protein_goal_min TYPE NUMERIC,
ALTER COLUMN protein_goal_max TYPE NUMERIC,
ALTER COLUMN carbs_goal_min TYPE NUMERIC,
ALTER COLUMN carbs_goal_max TYPE NUMERIC,
ALTER COLUMN fat_goal_min TYPE NUMERIC,
ALTER COLUMN fat_goal_max TYPE NUMERIC;
