-- Migration: Add New Feedback Categories
-- Description: Add custom_recipe, nutritionist_profile, and meal plan generation feedback types
-- Date: 2025-11-20

-- Step 1: Drop the existing check constraint
ALTER TABLE tester_feedback DROP CONSTRAINT IF EXISTS tester_feedback_feedback_type_check;

-- Step 2: Add new check constraint with additional feedback types
ALTER TABLE tester_feedback ADD CONSTRAINT tester_feedback_feedback_type_check
CHECK (feedback_type IN (
    'overall_application',              -- Overall Application
    'client_onboarding',                -- Client Onboarding
    'client_details_dietary_goals',     -- Client Details - Dietary Goals
    'target_nutritional_analysis',      -- Target Nutritional Analysis
    'ai_meal_planning_overall',         -- AI Meal Planning Overall
    'automated_meal_planning_overall',  -- Automated Meal Planning Overall
    'manual_meal_planning_overall',     -- Manual Meal Planning Overall
    'ai_meal_recipe_quality',           -- AI Meal - Recipe Quality
    'ai_meal_nutritional_analysis',     -- AI Meal - Nutritional Analysis
    'auto_meal_nutrition_analysis',     -- Auto Meal - Nutrition Analysis
    'manual_meal_nutrition_analysis',   -- Manual Meal - Nutrition Analysis
    'custom_recipe',                    -- Custom Recipe
    'nutritionist_profile',             -- Nutritionist Profile
    'manual_meal_plan_generation',      -- Manual Meal Plan Generation
    'ai_meal_plan_generation',          -- AI Meal Plan Generation
    'auto_meal_plan_generation'         -- Auto Meal Plan Generation
));

-- Step 3: Update comments
COMMENT ON COLUMN tester_feedback.feedback_type IS 'Type of feedback: overall_application, client_onboarding, client_details_dietary_goals, target_nutritional_analysis, custom_recipe, nutritionist_profile, ai/automated/manual meal planning/nutrition/generation';
