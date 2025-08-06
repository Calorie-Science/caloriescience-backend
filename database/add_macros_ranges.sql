-- Migration: Add min/max ranges for macronutrients
-- This allows storing both target values and AI-recommended ranges

-- Add min/max columns for protein
ALTER TABLE client_nutrition_requirements 
ADD COLUMN protein_min_grams DECIMAL(6,2),
ADD COLUMN protein_max_grams DECIMAL(6,2);

-- Add min/max columns for carbohydrates  
ALTER TABLE client_nutrition_requirements 
ADD COLUMN carbs_min_grams DECIMAL(6,2),
ADD COLUMN carbs_max_grams DECIMAL(6,2);

-- Add min/max columns for fats
ALTER TABLE client_nutrition_requirements 
ADD COLUMN fat_min_grams DECIMAL(6,2),
ADD COLUMN fat_max_grams DECIMAL(6,2);

-- Add min/max columns for fiber
ALTER TABLE client_nutrition_requirements 
ADD COLUMN fiber_min_grams DECIMAL(6,2),
ADD COLUMN fiber_max_grams DECIMAL(6,2);

-- Add min/max columns for saturated fat
ALTER TABLE client_nutrition_requirements 
ADD COLUMN saturated_fat_min_grams DECIMAL(6,2),
ADD COLUMN saturated_fat_max_grams DECIMAL(6,2);

-- Add min/max columns for monounsaturated fat
ALTER TABLE client_nutrition_requirements 
ADD COLUMN monounsaturated_fat_min_grams DECIMAL(6,2),
ADD COLUMN monounsaturated_fat_max_grams DECIMAL(6,2);

-- Add min/max columns for polyunsaturated fat
ALTER TABLE client_nutrition_requirements 
ADD COLUMN polyunsaturated_fat_min_grams DECIMAL(6,2),
ADD COLUMN polyunsaturated_fat_max_grams DECIMAL(6,2);

-- Add min/max columns for omega-3 fatty acids
ALTER TABLE client_nutrition_requirements 
ADD COLUMN omega3_min_grams DECIMAL(6,2),
ADD COLUMN omega3_max_grams DECIMAL(6,2);

-- Add columns for cholesterol (often has notes rather than ranges)
ALTER TABLE client_nutrition_requirements 
ADD COLUMN cholesterol_min_grams DECIMAL(6,2),
ADD COLUMN cholesterol_max_grams DECIMAL(6,2),
ADD COLUMN cholesterol_note TEXT;

-- Add columns for additional macro notes
ALTER TABLE client_nutrition_requirements 
ADD COLUMN protein_note TEXT,
ADD COLUMN carbs_note TEXT,
ADD COLUMN fat_note TEXT,
ADD COLUMN fiber_note TEXT,
ADD COLUMN saturated_fat_note TEXT,
ADD COLUMN monounsaturated_fat_note TEXT,
ADD COLUMN polyunsaturated_fat_note TEXT,
ADD COLUMN omega3_note TEXT;

-- Add an index for better performance on queries
CREATE INDEX idx_client_nutrition_macros_active ON client_nutrition_requirements(client_id, is_active);

-- Comments for documentation
COMMENT ON COLUMN client_nutrition_requirements.protein_grams IS 'Target protein amount (calculated from min/max or set by nutritionist)';
COMMENT ON COLUMN client_nutrition_requirements.protein_min_grams IS 'AI-recommended minimum protein from country guidelines';
COMMENT ON COLUMN client_nutrition_requirements.protein_max_grams IS 'AI-recommended maximum protein from country guidelines';
COMMENT ON COLUMN client_nutrition_requirements.protein_note IS 'Notes about protein recommendation from AI or nutritionist';

COMMENT ON COLUMN client_nutrition_requirements.carbs_grams IS 'Target carbohydrate amount (calculated from min/max or set by nutritionist)';
COMMENT ON COLUMN client_nutrition_requirements.carbs_min_grams IS 'AI-recommended minimum carbohydrates from country guidelines';
COMMENT ON COLUMN client_nutrition_requirements.carbs_max_grams IS 'AI-recommended maximum carbohydrates from country guidelines';

COMMENT ON COLUMN client_nutrition_requirements.fat_grams IS 'Target total fat amount (calculated from min/max or set by nutritionist)';
COMMENT ON COLUMN client_nutrition_requirements.fat_min_grams IS 'AI-recommended minimum total fat from country guidelines';
COMMENT ON COLUMN client_nutrition_requirements.fat_max_grams IS 'AI-recommended maximum total fat from country guidelines'; 