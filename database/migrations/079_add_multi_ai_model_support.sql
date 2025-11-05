-- Migration: Add support for multiple AI models (Claude, Grok, Gemini, OpenAI)
-- This expands the ai_model constraint to support multiple AI providers

-- Drop the existing check constraint that only allows 'claude'
ALTER TABLE async_meal_plans
DROP CONSTRAINT IF EXISTS async_meal_plans_ai_model_check;

-- Add new check constraint that allows multiple AI models
ALTER TABLE async_meal_plans
ADD CONSTRAINT async_meal_plans_ai_model_check
CHECK (ai_model IN ('claude', 'grok', 'gemini', 'openai'));

-- Add comment to document the supported AI models
COMMENT ON COLUMN async_meal_plans.ai_model IS 'AI model used for meal plan generation. Supported values: claude, grok, gemini, openai';
