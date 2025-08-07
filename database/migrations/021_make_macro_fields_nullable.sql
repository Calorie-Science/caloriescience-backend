-- Migration 021: Make macro fields nullable in client_nutrition_requirements
-- This allows creating nutrition records with only EER data, without requiring macro values

-- Make protein_grams nullable
ALTER TABLE client_nutrition_requirements 
ALTER COLUMN protein_grams DROP NOT NULL;

-- Make carbs_grams nullable  
ALTER TABLE client_nutrition_requirements 
ALTER COLUMN carbs_grams DROP NOT NULL;

-- Make fat_grams nullable
ALTER TABLE client_nutrition_requirements 
ALTER COLUMN fat_grams DROP NOT NULL;

-- Update comments to reflect the change
COMMENT ON COLUMN client_nutrition_requirements.protein_grams IS 'Target protein amount (optional - can be null if only EER is provided)';
COMMENT ON COLUMN client_nutrition_requirements.carbs_grams IS 'Target carbohydrate amount (optional - can be null if only EER is provided)';
COMMENT ON COLUMN client_nutrition_requirements.fat_grams IS 'Target fat amount (optional - can be null if only EER is provided)'; 