-- Migration 013: Add pregnancy and lactation adjustments to eer_formulas table

-- Add pregnancy and lactation adjustment columns to eer_formulas
ALTER TABLE eer_formulas
ADD COLUMN IF NOT EXISTS pregnancy_second_trimester_kcal INTEGER DEFAULT 340,
ADD COLUMN IF NOT EXISTS pregnancy_third_trimester_kcal INTEGER DEFAULT 452,
ADD COLUMN IF NOT EXISTS lactation_0_6_months_kcal INTEGER DEFAULT 500,
ADD COLUMN IF NOT EXISTS lactation_7_12_months_kcal INTEGER DEFAULT 400;

-- Add comments for documentation
COMMENT ON COLUMN eer_formulas.pregnancy_second_trimester_kcal IS 'Additional kcal/day for second trimester pregnancy';
COMMENT ON COLUMN eer_formulas.pregnancy_third_trimester_kcal IS 'Additional kcal/day for third trimester pregnancy';
COMMENT ON COLUMN eer_formulas.lactation_0_6_months_kcal IS 'Additional kcal/day for lactation 0-6 months';
COMMENT ON COLUMN eer_formulas.lactation_7_12_months_kcal IS 'Additional kcal/day for lactation 7-12 months';

-- Update existing formulas with country-specific values from CSV
-- Most countries follow the same pattern, but this allows for variations

-- USA - From CSV: +340 kcal (2nd trimester), +452 kcal (3rd trimester), +500 kcal (0-6 months), +400 kcal (7-12 months)
UPDATE eer_formulas SET 
  pregnancy_second_trimester_kcal = 340,
  pregnancy_third_trimester_kcal = 452,
  lactation_0_6_months_kcal = 500,
  lactation_7_12_months_kcal = 400
WHERE country = 'USA';

-- Canada - Same as USA per CSV
UPDATE eer_formulas SET 
  pregnancy_second_trimester_kcal = 340,
  pregnancy_third_trimester_kcal = 452,
  lactation_0_6_months_kcal = 500,
  lactation_7_12_months_kcal = 400
WHERE country = 'Canada';

-- UK - From CSV: +340 kcal (2nd trimester), +452 kcal (3rd trimester), +500 kcal (0-6 months), +400 kcal (7-12 months)
UPDATE eer_formulas SET 
  pregnancy_second_trimester_kcal = 340,
  pregnancy_third_trimester_kcal = 452,
  lactation_0_6_months_kcal = 500,
  lactation_7_12_months_kcal = 400
WHERE country = 'UK';

-- EU - From CSV: +340 kcal (2nd trimester), +452 kcal (3rd trimester), +500 kcal (0-6 months), +400 kcal (7-12 months)
UPDATE eer_formulas SET 
  pregnancy_second_trimester_kcal = 340,
  pregnancy_third_trimester_kcal = 452,
  lactation_0_6_months_kcal = 500,
  lactation_7_12_months_kcal = 400
WHERE country = 'EU';

-- All other countries follow the same pattern from CSV
UPDATE eer_formulas SET 
  pregnancy_second_trimester_kcal = 340,
  pregnancy_third_trimester_kcal = 452,
  lactation_0_6_months_kcal = 500,
  lactation_7_12_months_kcal = 400
WHERE country IN ('AU/NZ', 'Singapore', 'UAE', 'India', 'Japan', 'WHO', 'ZA', 'Brazil'); 