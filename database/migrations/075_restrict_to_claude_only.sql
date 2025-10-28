-- Migration: Restrict AI meal plans to Claude only
-- This removes support for OpenAI, Gemini, and ChatGPT, keeping only Claude

-- Drop the existing check constraint
ALTER TABLE async_meal_plans 
DROP CONSTRAINT IF EXISTS async_meal_plans_ai_model_check;

-- Add new check constraint that only allows 'claude'
ALTER TABLE async_meal_plans 
ADD CONSTRAINT async_meal_plans_ai_model_check 
CHECK (ai_model = 'claude');

-- Update any existing records to use 'claude' (if needed)
UPDATE async_meal_plans 
SET ai_model = 'claude' 
WHERE ai_model IN ('openai', 'gemini', 'chatgpt');

