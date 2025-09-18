-- Migration: Add AI model support to async meal plans table
-- This allows us to track which AI model was used for meal plan generation

-- Add ai_model column to async_meal_plans table
ALTER TABLE async_meal_plans 
ADD COLUMN IF NOT EXISTS ai_model TEXT NOT NULL DEFAULT 'openai' 
CHECK (ai_model IN ('openai', 'claude'));

-- Create index for ai_model for better performance
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_ai_model ON async_meal_plans(ai_model);

-- Update the unique constraint to include ai_model
ALTER TABLE async_meal_plans 
DROP CONSTRAINT IF EXISTS async_meal_plans_thread_id_run_id_key;

ALTER TABLE async_meal_plans 
ADD CONSTRAINT async_meal_plans_thread_id_run_id_ai_model_key 
UNIQUE(thread_id, run_id, ai_model);
