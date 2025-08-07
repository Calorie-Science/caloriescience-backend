-- Migration 018: Add Pantothenic Acid (Vitamin B5) and Biotin (Vitamin B7) support
-- This adds support for two additional B vitamins with comprehensive guideline data

-- Add Pantothenic Acid and Biotin columns to micronutrient_guidelines table
ALTER TABLE micronutrient_guidelines 
ADD COLUMN IF NOT EXISTS pantothenic_acid_mg DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS biotin_mcg DECIMAL(8,2);

-- Add Pantothenic Acid and Biotin columns to client_micronutrient_requirements table  
ALTER TABLE client_micronutrient_requirements
ADD COLUMN IF NOT EXISTS pantothenic_acid_mg DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS biotin_mcg DECIMAL(8,2);

-- Add comments to explain the new fields
COMMENT ON COLUMN micronutrient_guidelines.pantothenic_acid_mg IS 'Pantothenic Acid (Vitamin B5) daily recommendation in mg';
COMMENT ON COLUMN micronutrient_guidelines.biotin_mcg IS 'Biotin (Vitamin B7) daily recommendation in mcg';
COMMENT ON COLUMN client_micronutrient_requirements.pantothenic_acid_mg IS 'Client Pantothenic Acid (Vitamin B5) recommendation in mg';
COMMENT ON COLUMN client_micronutrient_requirements.biotin_mcg IS 'Client Biotin (Vitamin B7) recommendation in mcg';

-- ========================================
-- PANTOTHENIC ACID (VITAMIN B5) GUIDELINES - USA (Default for all countries)
-- ========================================

-- USA Guidelines (using as default for all countries as requested)
-- 0-6 months: 1.7 mg (AI)
INSERT INTO micronutrient_guidelines (
  country, gender, age_min, age_max, 
  pantothenic_acid_mg,
  notes
) VALUES 
('USA', 'male', 0, 0.5, 1.7, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),
('USA', 'female', 0, 0.5, 1.7, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),

-- 7-12 months: 1.8 mg (AI)
('USA', 'male', 0.5, 1, 1.8, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),
('USA', 'female', 0.5, 1, 1.8, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),

-- 1-3 years: 2 mg (AI)
('USA', 'male', 1, 4, 2.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),
('USA', 'female', 1, 4, 2.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),

-- 4-8 years: 3 mg (AI)
('USA', 'male', 4, 9, 3.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),
('USA', 'female', 4, 9, 3.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),

-- 9-13 years: 4 mg (AI)
('USA', 'male', 9, 14, 4.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),
('USA', 'female', 9, 14, 4.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),

-- 14-18 years: 5 mg (AI)
('USA', 'male', 14, 19, 5.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),
('USA', 'female', 14, 19, 5.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),

-- Adults ≥19 years: 5 mg (AI)
('USA', 'male', 19, 120, 5.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)'),
('USA', 'female', 19, 120, 5.0, 'Pantothenic Acid (Vitamin B5) - Adequate Intake (AI)');

-- Pregnancy and Lactation adjustments
UPDATE micronutrient_guidelines 
SET pantothenic_acid_mg = 6.0, notes = COALESCE(notes, '') || ' | Pregnancy: 6 mg (AI)'
WHERE country = 'USA' AND gender = 'female' AND age_min >= 14 AND age_max <= 50;

-- ========================================
-- BIOTIN (VITAMIN B7) GUIDELINES - USA (Default for all countries)
-- ========================================

-- USA Guidelines (using as default for all countries as requested)
-- 0-6 months: 5 mcg (AI)
UPDATE micronutrient_guidelines 
SET biotin_mcg = 5.0, notes = COALESCE(notes, '') || ' | Biotin (Vitamin B7): 5 mcg (AI)'
WHERE country = 'USA' AND age_min = 0 AND age_max = 0.5;

-- 7-12 months: 6 mcg (AI)
UPDATE micronutrient_guidelines 
SET biotin_mcg = 6.0, notes = COALESCE(notes, '') || ' | Biotin (Vitamin B7): 6 mcg (AI)'
WHERE country = 'USA' AND age_min = 0.5 AND age_max = 1;

-- 1-3 years: 8 mcg (AI)
UPDATE micronutrient_guidelines 
SET biotin_mcg = 8.0, notes = COALESCE(notes, '') || ' | Biotin (Vitamin B7): 8 mcg (AI)'
WHERE country = 'USA' AND age_min = 1 AND age_max = 4;

-- 4-8 years: 12 mcg (AI)
UPDATE micronutrient_guidelines 
SET biotin_mcg = 12.0, notes = COALESCE(notes, '') || ' | Biotin (Vitamin B7): 12 mcg (AI)'
WHERE country = 'USA' AND age_min = 4 AND age_max = 9;

-- 9-13 years: 20 mcg (AI)
UPDATE micronutrient_guidelines 
SET biotin_mcg = 20.0, notes = COALESCE(notes, '') || ' | Biotin (Vitamin B7): 20 mcg (AI)'
WHERE country = 'USA' AND age_min = 9 AND age_max = 14;

-- 14-18 years: 20 mcg (AI)
UPDATE micronutrient_guidelines 
SET biotin_mcg = 20.0, notes = COALESCE(notes, '') || ' | Biotin (Vitamin B7): 20 mcg (AI)'
WHERE country = 'USA' AND age_min = 14 AND age_max = 19;

-- Adults ≥18 years: 30 mcg (AI)
UPDATE micronutrient_guidelines 
SET biotin_mcg = 30.0, notes = COALESCE(notes, '') || ' | Biotin (Vitamin B7): 30 mcg (AI)'
WHERE country = 'USA' AND age_min = 19 AND age_max = 120;

-- Pregnancy: 30 mcg (AI) - same as adults
-- Lactation: 35 mcg (AI)
-- Note: Lactation adjustments would need specific handling in the calculation logic

-- ========================================
-- COPY USA GUIDELINES TO OTHER COUNTRIES (as requested)
-- ========================================

-- Copy Pantothenic Acid and Biotin guidelines from USA to all other countries
DO $$
DECLARE
    country_code TEXT;
    country_codes TEXT[] := ARRAY['EU', 'UK', 'Canada', 'AU/NZ', 'Singapore', 'UAE', 'India', 'Japan', 'ZA', 'Brazil'];
BEGIN
    FOREACH country_code IN ARRAY country_codes
    LOOP
        -- Insert Pantothenic Acid guidelines for each country (copying from USA)
        INSERT INTO micronutrient_guidelines (
            country, gender, age_min, age_max, pantothenic_acid_mg, biotin_mcg, notes
        )
        SELECT 
            country_code,
            gender,
            age_min, 
            age_max,
            pantothenic_acid_mg,
            biotin_mcg,
            REPLACE(notes, 'USA', country_code) || ' (Default to USA guidelines)'
        FROM micronutrient_guidelines 
        WHERE country = 'USA' 
        AND pantothenic_acid_mg IS NOT NULL
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$; 