-- Migration: Add Gemini support to async meal plans table
-- This allows the ai_model column to accept 'gemini' as a valid value

-- Drop the existing check constraint
ALTER TABLE async_meal_plans 
DROP CONSTRAINT IF EXISTS async_meal_plans_ai_model_check;

-- Add new check constraint that includes 'gemini'
ALTER TABLE async_meal_plans 
ADD CONSTRAINT async_meal_plans_ai_model_check 
CHECK (ai_model IN ('openai', 'claude', 'gemini'));
