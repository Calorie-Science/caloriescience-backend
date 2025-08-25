-- Migration: Fix EER Formulas - Add Missing EER and Fix BMR Formulas
-- Date: 2025-08-25
-- Description: Fixes missing EER formulas for UK/EU/Australia/India and corrects Japan BMR formula

BEGIN;

-- 0. Add unique constraint to prevent duplicate entries
-- This will allow ON CONFLICT clauses to work properly
ALTER TABLE eer_formulas 
ADD CONSTRAINT unique_country_gender_age 
UNIQUE (country, gender, age_category, age_min, age_max);

-- 1. Fix UK/EU/Australia EER formulas (Schofield-based)
-- UK/EU/Australia use: (0.063×wt + 2.896)×239 for men, (0.062×wt + 2.036)×239 for women

-- UK Male Adult 18-30
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'uk' AND gender = 'male' AND age_category = 'adult' AND age_min = 18 AND age_max = 30;

-- UK Male Adult 30-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'uk' AND gender = 'male' AND age_category = 'adult' AND age_min = 30 AND age_max = 60;

-- UK Female Adult 18-30
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'uk' AND gender = 'female' AND age_category = 'adult' AND age_min = 18 AND age_max = 30;

-- UK Female Adult 30-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'uk' AND gender = 'female' AND age_category = 'adult' AND age_min = 30 AND age_max = 60;

-- EU Male Adult 18-30
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'eu' AND gender = 'male' AND age_category = 'adult' AND age_min = 18 AND age_max = 30;

-- EU Male Adult 30-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'eu' AND gender = 'male' AND age_category = 'adult' AND age_min = 30 AND age_max = 60;

-- EU Female Adult 18-30
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'eu' AND gender = 'female' AND age_category = 'adult' AND age_min = 18 AND age_max = 30;

-- EU Female Adult 30-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'eu' AND gender = 'female' AND age_category = 'adult' AND age_min = 30 AND age_max = 60;

-- Australia Male Adult 18-30
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'australia' AND gender = 'male' AND age_category = 'adult' AND age_min = 18 AND age_max = 30;

-- Australia Male Adult 30-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'australia' AND gender = 'male' AND age_category = 'adult' AND age_min = 30 AND age_max = 60;

-- Australia Female Adult 18-30
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'australia' AND gender = 'female' AND age_category = 'adult' AND age_min = 18 AND age_max = 30;

-- Australia Female Adult 30-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'australia' AND gender = 'female' AND age_category = 'adult' AND age_min = 30 AND age_max = 60;

-- 2. Fix Singapore/UAE EER formulas (WHO/FAO-based)
-- Singapore/UAE use same formulas as UK/EU/Australia

-- Singapore Male Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'singapore' AND gender = 'male' AND age_category = 'adult';

-- Singapore Female Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'singapore' AND gender = 'female' AND age_category = 'adult';

-- UAE Male Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'uae' AND gender = 'male' AND age_category = 'adult';

-- UAE Female Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'uae' AND gender = 'female' AND age_category = 'adult';

-- 3. Fix India EER formulas (ICMR-NIN)
-- India uses: (14.5×wt + 645)×PAL for men, (11.0×wt + 833)×PAL for women

-- India Male Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 645,
  eer_weight_coefficient = 14.5,
  eer_height_coefficient = 0,
  eer_age_coefficient = 0
WHERE country = 'india' AND gender = 'male' AND age_category = 'adult';

-- India Female Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 833,
  eer_weight_coefficient = 11.0,
  eer_height_coefficient = 0,
  eer_age_coefficient = 0
WHERE country = 'india' AND gender = 'female' AND age_category = 'adult';

-- 4. Fix Japan BMR formula
-- Japan uses: (0.0481×wt + 0.0234×ht − 0.0138×age + 0.9708)×239
-- Current values are missing the ×239 multiplier

-- Japan Male Adult 18-60
UPDATE eer_formulas 
SET 
  bmr_constant = 232.0,             -- 0.9708 × 239
  bmr_weight_coefficient = 11.5,    -- 0.0481 × 239
  bmr_height_coefficient = 5.6,     -- 0.0234 × 239
  bmr_age_coefficient = -3.3        -- -0.0138 × 239
WHERE country = 'japan' AND gender = 'male' AND age_category = 'adult';

-- Japan Female Adult 18-60
UPDATE eer_formulas 
SET 
  bmr_constant = 232.0,             -- 0.9708 × 239
  bmr_weight_coefficient = 11.5,    -- 0.0481 × 239
  bmr_height_coefficient = 5.6,     -- 0.0234 × 239
  bmr_age_coefficient = -3.3        -- -0.0138 × 239
WHERE country = 'japan' AND gender = 'female' AND age_category = 'adult';

-- 5. Fix WHO/FAO/Brazil/South Africa EER formulas
-- These countries use same formulas as UK/EU/Australia

-- WHO Male Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'who' AND gender = 'male' AND age_category = 'adult';

-- WHO Female Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'who' AND gender = 'female' AND age_category = 'adult';

-- Brazil Male Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'brazil' AND gender = 'male' AND age_category = 'adult';

-- Brazil Female Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'brazil' AND gender = 'female' AND age_category = 'adult';

-- South Africa Male Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 15.057,  -- 0.063 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 692.144,           -- 2.896 × 239
  bmr_weight_coefficient = 15.057,  -- 0.063 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'za' AND gender = 'male' AND age_category = 'adult';

-- South Africa Female Adult 18-60
UPDATE eer_formulas 
SET 
  eer_base = 239,
  eer_weight_coefficient = 14.818,  -- 0.062 × 239
  eer_height_coefficient = 0,
  eer_age_coefficient = 0,
  bmr_constant = 486.604,           -- 2.036 × 239
  bmr_weight_coefficient = 14.818,  -- 0.062 × 239
  bmr_height_coefficient = 0,
  bmr_age_coefficient = 0
WHERE country = 'za' AND gender = 'female' AND age_category = 'adult';

-- 6. Add missing age ranges for UK/EU/Australia (60+ age group)
-- Note: You may need to add these records if they don't exist

-- UK Male Adult 60+
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max,
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_weight_coefficient, eer_height_coefficient, eer_age_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal,
  lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES (
  'uk', 'male', 'adult', 60, 120,
  'Schofield (SACN)', 692.144, 15.057, 0, 0,
  239, 15.057, 0, 0,
  340, 452, 500, 400
) ON CONFLICT (country, gender, age_category, age_min, age_max) DO NOTHING;

-- UK Female Adult 60+
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max,
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_weight_coefficient, eer_height_coefficient, eer_age_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal,
  lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES (
  'uk', 'female', 'adult', 60, 120,
  'Schofield (SACN)', 486.604, 14.818, 0, 0,
  239, 14.818, 0, 0,
  340, 452, 500, 400
) ON CONFLICT (country, gender, age_category, age_min, age_max) DO NOTHING;

-- EU Male Adult 60+
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max,
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_weight_coefficient, eer_height_coefficient, eer_age_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal,
  lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES (
  'eu', 'male', 'adult', 60, 120,
  'Schofield (EFSA)', 692.144, 15.057, 0, 0,
  239, 15.057, 0, 0,
  340, 452, 500, 400
) ON CONFLICT (country, gender, age_category, age_min, age_max) DO NOTHING;

-- EU Female Adult 60+
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max,
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_weight_coefficient, eer_height_coefficient, eer_age_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal,
  lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES (
  'eu', 'female', 'adult', 60, 120,
  'Schofield (EFSA)', 486.604, 14.818, 0, 0,
  239, 14.818, 0, 0,
  340, 452, 500, 400
) ON CONFLICT (country, gender, age_category, age_min, age_max) DO NOTHING;

-- Australia Male Adult 60+
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max,
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_weight_coefficient, eer_height_coefficient, eer_age_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal,
  lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES (
  'australia', 'male', 'adult', 60, 120,
  'Schofield (NHMRC)', 692.144, 15.057, 0, 0,
  239, 15.057, 0, 0,
  340, 452, 500, 400
) ON CONFLICT (country, gender, age_category, age_min, age_max) DO NOTHING;

-- Australia Female Adult 60+
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max,
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_weight_coefficient, eer_height_coefficient, eer_age_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal,
  lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES (
  'australia', 'female', 'adult', 60, 120,
  'Schofield (NHMRC)', 486.604, 14.818, 0, 0,
  239, 14.818, 0, 0,
  340, 452, 500, 400
) ON CONFLICT (country, gender, age_category, age_min, age_max) DO NOTHING;

COMMIT;

-- Verification query to check the results
SELECT 
  country, 
  gender, 
  age_category, 
  age_min, 
  age_max,
  bmr_formula,
  eer_base,
  eer_weight_coefficient,
  eer_height_coefficient,
  eer_age_coefficient
FROM eer_formulas 
WHERE age_category = 'adult'
ORDER BY country, gender, age_min;
