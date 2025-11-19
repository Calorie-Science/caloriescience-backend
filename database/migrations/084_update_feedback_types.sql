-- Migration: Update Tester Feedback Types
-- Description: Update feedback_type check constraint to use new categorization system
-- Date: 2025-11-19

-- Step 1: Drop the old check constraint
ALTER TABLE tester_feedback DROP CONSTRAINT IF EXISTS tester_feedback_feedback_type_check;

-- Step 2: Migrate existing data to new feedback types
UPDATE tester_feedback SET feedback_type = 'overall_application' WHERE feedback_type = 'global';
UPDATE tester_feedback SET feedback_type = 'client_details_dietary_goals' WHERE feedback_type = 'client_details';
UPDATE tester_feedback SET feedback_type = 'target_nutritional_analysis' WHERE feedback_type = 'nutritional_analysis_overall';
UPDATE tester_feedback SET feedback_type = 'target_nutritional_analysis' WHERE feedback_type = 'nutritional_analysis_macro';
UPDATE tester_feedback SET feedback_type = 'target_nutritional_analysis' WHERE feedback_type = 'nutritional_analysis_micro';
UPDATE tester_feedback SET feedback_type = 'manual_meal_planning_overall' WHERE feedback_type = 'meal_planning_manual';
UPDATE tester_feedback SET feedback_type = 'automated_meal_planning_overall' WHERE feedback_type = 'meal_planning_automated';
UPDATE tester_feedback SET feedback_type = 'ai_meal_planning_overall' WHERE feedback_type = 'meal_planning_ai';
UPDATE tester_feedback SET feedback_type = 'ai_meal_recipe_quality' WHERE feedback_type = 'meal_plan_quality';
UPDATE tester_feedback SET feedback_type = 'ai_meal_nutritional_analysis' WHERE feedback_type = 'meal_plan_nutrition';

-- Step 3: Add new check constraint with updated feedback types
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
    'manual_meal_nutrition_analysis'    -- Manual Meal - Nutrition Analysis
));

-- Step 4: Update comments
COMMENT ON COLUMN tester_feedback.feedback_type IS 'Type of feedback: overall_application, client_onboarding, client_details_dietary_goals, target_nutritional_analysis, ai/automated/manual meal planning/nutrition analysis';
COMMENT ON COLUMN tester_feedback.rating IS 'Optional 1-5 rating (can be used for any feedback type)';
