-- Migration 037: Convert all country column values to lowercase for better matching
-- This ensures consistent country matching in queries and application code

-- Convert country values in eer_formulas table
UPDATE eer_formulas 
SET country = LOWER(country) 
WHERE country != LOWER(country);

-- Convert country values in pal_values table
UPDATE pal_values 
SET country = LOWER(country) 
WHERE country != LOWER(country);

-- Convert country values in macro_guidelines table
UPDATE macro_guidelines 
SET country = LOWER(country) 
WHERE country != LOWER(country);

-- Convert country values in micronutrient_guidelines_flexible table
UPDATE micronutrient_guidelines_flexible 
SET country = LOWER(country) 
WHERE country != LOWER(country);

-- Convert country_name values in country_micronutrient_mappings table
UPDATE country_micronutrient_mappings 
SET country_name = LOWER(country_name) 
WHERE country_name != LOWER(country_name);

-- Convert guideline country values in client_nutrition_requirements table
UPDATE client_nutrition_requirements 
SET eer_guideline_country = LOWER(eer_guideline_country) 
WHERE eer_guideline_country IS NOT NULL AND eer_guideline_country != LOWER(eer_guideline_country);

UPDATE client_nutrition_requirements 
SET macro_guideline_country = LOWER(macro_guideline_country) 
WHERE macro_guideline_country IS NOT NULL AND macro_guideline_country != LOWER(macro_guideline_country);

-- Convert country values in client_micronutrient_requirements_flexible table
UPDATE client_micronutrient_requirements_flexible 
SET country_guideline = LOWER(country_guideline) 
WHERE country_guideline IS NOT NULL AND country_guideline != LOWER(country_guideline);

-- Add comments to document the lowercase requirement
COMMENT ON COLUMN eer_formulas.country IS 'Country code in lowercase (usa, uk, eu, india, etc.)';
COMMENT ON COLUMN pal_values.country IS 'Country code in lowercase (usa, uk, eu, india, etc.)';
COMMENT ON COLUMN macro_guidelines.country IS 'Country code in lowercase (usa, uk, eu, india, etc.)';
COMMENT ON COLUMN micronutrient_guidelines_flexible.country IS 'Country code in lowercase (usa, uk, eu, india, etc.)';
COMMENT ON COLUMN country_micronutrient_mappings.country_name IS 'Country name in lowercase (usa, uk, eu, india, etc.)';
COMMENT ON COLUMN client_nutrition_requirements.eer_guideline_country IS 'EER guideline country in lowercase (usa, uk, eu, india, etc.)';
COMMENT ON COLUMN client_nutrition_requirements.macro_guideline_country IS 'Macro guideline country in lowercase (usa, uk, eu, india, etc.)';
COMMENT ON COLUMN client_micronutrient_requirements_flexible.country_guideline IS 'Micronutrient guideline country in lowercase (usa, uk, eu, india, etc.)';

-- Create indexes with lowercase functions for better performance
CREATE INDEX IF NOT EXISTS idx_eer_formulas_country_lower ON eer_formulas(LOWER(country));
CREATE INDEX IF NOT EXISTS idx_pal_values_country_lower ON pal_values(LOWER(country));
CREATE INDEX IF NOT EXISTS idx_macro_guidelines_country_lower ON macro_guidelines(LOWER(country));
CREATE INDEX IF NOT EXISTS idx_micronutrient_guidelines_country_lower ON micronutrient_guidelines_flexible(LOWER(country));
CREATE INDEX IF NOT EXISTS idx_country_mappings_country_name_lower ON country_micronutrient_mappings(LOWER(country_name));
CREATE INDEX IF NOT EXISTS idx_client_nutrition_eer_country_lower ON client_nutrition_requirements(LOWER(eer_guideline_country));
CREATE INDEX IF NOT EXISTS idx_client_nutrition_macro_country_lower ON client_nutrition_requirements(LOWER(macro_guideline_country));
CREATE INDEX IF NOT EXISTS idx_client_micro_country_lower ON client_micronutrient_requirements_flexible(LOWER(country_guideline));
