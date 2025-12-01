-- Migration: Add formula_used field to client_nutrition_requirements
-- This stores the actual BMR/EER formula that was used for calculation

ALTER TABLE client_nutrition_requirements
ADD COLUMN IF NOT EXISTS formula_used VARCHAR(255);

-- Add comment
COMMENT ON COLUMN client_nutrition_requirements.formula_used IS 'The actual BMR/EER formula used for calculation (e.g., "ICMR-NIN (IOM)", "Harris-Benedict (revised) (IOM)")';

-- Add index for filtering/searching by formula
CREATE INDEX IF NOT EXISTS idx_nutrition_requirements_formula_used ON client_nutrition_requirements(formula_used);
