-- Migration: Add formula_id to client_nutrition_requirements table
-- Description: Adds a formula_id column to track which formula was used for calculations
-- This allows us to store the actual formula ID from formula_definitions/eer_formulas tables

-- Add formula_id column to client_nutrition_requirements
ALTER TABLE client_nutrition_requirements
ADD COLUMN IF NOT EXISTS formula_id INTEGER;

-- Add comment to the column for documentation
COMMENT ON COLUMN client_nutrition_requirements.formula_id IS 'ID of the formula used from formula_definitions or eer_formulas table';

-- Optional: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_client_nutrition_requirements_formula_id
ON client_nutrition_requirements(formula_id);
