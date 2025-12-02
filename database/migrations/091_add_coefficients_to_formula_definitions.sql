-- Migration: Add calculation coefficients to formula_definitions table
-- This allows formula_definitions to be used directly for calculations

-- Add coefficient columns for BMR calculations
ALTER TABLE formula_definitions
  ADD COLUMN IF NOT EXISTS bmr_constant_male DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS bmr_weight_coefficient_male DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS bmr_height_coefficient_male DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS bmr_age_coefficient_male DECIMAL(10, 3),

  ADD COLUMN IF NOT EXISTS bmr_constant_female DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS bmr_weight_coefficient_female DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS bmr_height_coefficient_female DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS bmr_age_coefficient_female DECIMAL(10, 3);

-- Add coefficient columns for EER calculations
ALTER TABLE formula_definitions
  ADD COLUMN IF NOT EXISTS eer_base_male DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS eer_age_coefficient_male DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS eer_weight_coefficient_male DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS eer_height_coefficient_male DECIMAL(10, 3),

  ADD COLUMN IF NOT EXISTS eer_base_female DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS eer_age_coefficient_female DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS eer_weight_coefficient_female DECIMAL(10, 3),
  ADD COLUMN IF NOT EXISTS eer_height_coefficient_female DECIMAL(10, 3);

-- Add PAL coefficient columns (for formulas that use different PA coefficients)
ALTER TABLE formula_definitions
  ADD COLUMN IF NOT EXISTS pa_coefficients JSONB; -- Store PA coefficients as JSON for flexibility

-- Update existing formulas with coefficient data

-- 1. Harris-Benedict (Revised 1984)
-- Male: BMR = 88.362 + (13.397 × Weight) + (4.799 × Height) - (5.677 × Age)
-- Female: BMR = 447.593 + (9.247 × Weight) + (3.098 × Height) - (4.330 × Age)
UPDATE formula_definitions
SET
  bmr_constant_male = 88.362,
  bmr_weight_coefficient_male = 13.397,
  bmr_height_coefficient_male = 4.799,
  bmr_age_coefficient_male = -5.677,

  bmr_constant_female = 447.593,
  bmr_weight_coefficient_female = 9.247,
  bmr_height_coefficient_female = 3.098,
  bmr_age_coefficient_female = -4.330
WHERE formula_name = 'Harris-Benedict (revised)';

-- 2. Mifflin-St Jeor (1990)
-- Male: BMR = (10 × Weight) + (6.25 × Height) - (5 × Age) + 5
-- Female: BMR = (10 × Weight) + (6.25 × Height) - (5 × Age) - 161
UPDATE formula_definitions
SET
  bmr_constant_male = 5,
  bmr_weight_coefficient_male = 10,
  bmr_height_coefficient_male = 6.25,
  bmr_age_coefficient_male = -5,

  bmr_constant_female = -161,
  bmr_weight_coefficient_female = 10,
  bmr_height_coefficient_female = 6.25,
  bmr_age_coefficient_female = -5
WHERE formula_name = 'Mifflin-St Jeor';

-- 3. Schofield (1985) - Multiple age ranges, we'll use 18-30 as default
-- Male 18-30: BMR = (0.063 × Weight + 2.896) × 1000 / 4.184 = 15.057 × Weight + 692.0
-- Female 18-30: BMR = (0.062 × Weight + 2.036) × 1000 / 4.184 = 14.818 × Weight + 486.0
UPDATE formula_definitions
SET
  bmr_constant_male = 679.0,
  bmr_weight_coefficient_male = 15.057,
  bmr_height_coefficient_male = 0,
  bmr_age_coefficient_male = 0,

  bmr_constant_female = 486.0,
  bmr_weight_coefficient_female = 14.818,
  bmr_height_coefficient_female = 0,
  bmr_age_coefficient_female = 0
WHERE formula_name = 'Schofield';

-- 4. Henry Oxford (2005) - Using 18-30 age range
-- Male 18-30: BMR = (0.0630 × Weight + 2.8957) × 1000 / 4.184 = 15.057 × Weight + 692.0
-- Female 18-30: BMR = (0.0621 × Weight + 2.0357) × 1000 / 4.184 = 14.846 × Weight + 487.0
UPDATE formula_definitions
SET
  bmr_constant_male = 692.0,
  bmr_weight_coefficient_male = 15.057,
  bmr_height_coefficient_male = 0,
  bmr_age_coefficient_male = 0,

  bmr_constant_female = 487.0,
  bmr_weight_coefficient_female = 14.846,
  bmr_height_coefficient_female = 0,
  bmr_age_coefficient_female = 0
WHERE formula_name = 'Henry Oxford';

-- 5. IOM EER (Adults 19+ years)
-- Male: EER = 662 - (9.53 × Age) + PA × [(15.91 × Weight) + (539.6 × Height/100)]
-- Female: EER = 354 - (6.91 × Age) + PA × [(9.36 × Weight) + (726 × Height/100)]
-- For BMR, we use Harris-Benedict (revised) as the underlying formula
UPDATE formula_definitions
SET
  bmr_constant_male = 88.362,
  bmr_weight_coefficient_male = 13.397,
  bmr_height_coefficient_male = 4.799,
  bmr_age_coefficient_male = -5.677,

  bmr_constant_female = 447.593,
  bmr_weight_coefficient_female = 9.247,
  bmr_height_coefficient_female = 3.098,
  bmr_age_coefficient_female = -4.330,

  eer_base_male = 662,
  eer_age_coefficient_male = -9.53,
  eer_weight_coefficient_male = 15.91,
  eer_height_coefficient_male = 539.6,

  eer_base_female = 354,
  eer_age_coefficient_female = -6.91,
  eer_weight_coefficient_female = 9.36,
  eer_height_coefficient_female = 726,

  pa_coefficients = '{
    "sedentary": {"male": 1.00, "female": 1.00},
    "lightly_active": {"male": 1.11, "female": 1.12},
    "moderately_active": {"male": 1.25, "female": 1.27},
    "very_active": {"male": 1.48, "female": 1.45},
    "extra_active": {"male": 1.48, "female": 1.45}
  }'::jsonb
WHERE formula_name = 'IOM';

-- 6. IOM Adolescent (9-18 years)
-- Male: EER = 88.5 - (61.9 × Age) + PA × [(26.7 × Weight) + (903 × Height/100)] + 25
-- Female: EER = 135.3 - (30.8 × Age) + PA × [(10.0 × Weight) + (934 × Height/100)] + 25
UPDATE formula_definitions
SET
  eer_base_male = 88.5,
  eer_age_coefficient_male = -61.9,
  eer_weight_coefficient_male = 26.7,
  eer_height_coefficient_male = 903,

  eer_base_female = 135.3,
  eer_age_coefficient_female = -30.8,
  eer_weight_coefficient_female = 10.0,
  eer_height_coefficient_female = 934,

  pa_coefficients = '{
    "sedentary": {"male": 1.00, "female": 1.00},
    "lightly_active": {"male": 1.13, "female": 1.16},
    "moderately_active": {"male": 1.26, "female": 1.31},
    "very_active": {"male": 1.42, "female": 1.56},
    "extra_active": {"male": 1.42, "female": 1.56}
  }'::jsonb
WHERE formula_name = 'IOM Adolescent';

-- 7. IOM Child (3-8 years)
-- Male: EER = 88.5 - (61.9 × Age) + PA × [(26.7 × Weight) + (903 × Height/100)] + 20
-- Female: EER = 135.3 - (30.8 × Age) + PA × [(10.0 × Weight) + (934 × Height/100)] + 20
UPDATE formula_definitions
SET
  eer_base_male = 88.5,
  eer_age_coefficient_male = -61.9,
  eer_weight_coefficient_male = 26.7,
  eer_height_coefficient_male = 903,

  eer_base_female = 135.3,
  eer_age_coefficient_female = -30.8,
  eer_weight_coefficient_female = 10.0,
  eer_height_coefficient_female = 934,

  pa_coefficients = '{
    "sedentary": {"male": 1.00, "female": 1.00},
    "lightly_active": {"male": 1.13, "female": 1.16},
    "moderately_active": {"male": 1.26, "female": 1.31},
    "very_active": {"male": 1.42, "female": 1.56},
    "extra_active": {"male": 1.42, "female": 1.56}
  }'::jsonb
WHERE formula_name = 'IOM Child';

-- Add comments
COMMENT ON COLUMN formula_definitions.bmr_constant_male IS 'Constant term in BMR equation for males';
COMMENT ON COLUMN formula_definitions.bmr_weight_coefficient_male IS 'Weight coefficient in BMR equation for males (kg)';
COMMENT ON COLUMN formula_definitions.bmr_height_coefficient_male IS 'Height coefficient in BMR equation for males (cm)';
COMMENT ON COLUMN formula_definitions.bmr_age_coefficient_male IS 'Age coefficient in BMR equation for males (years)';
COMMENT ON COLUMN formula_definitions.pa_coefficients IS 'Physical activity coefficients by activity level and gender';
