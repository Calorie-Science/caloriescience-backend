-- Migration: Add missing Pantothenic Acid and Biotin values
-- This migration updates existing micronutrient guidelines to include proper values for:
-- 1. Pantothenic Acid (Vitamin B5) - AI values based on IOM/EFSA guidelines
-- 2. Biotin (Vitamin B7) - AI values based on IOM/EFSA guidelines
-- Source: IOM DRI, EFSA, Australia/NZ guidelines

-- Update India guidelines with proper Pantothenic Acid and Biotin values

-- Infants (0-6 months) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 1.7, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 5, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'common' AND age_min = 0 AND age_max = 0.5;

-- Infants (6-12 months) - Common  
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 1.8, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 6, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'common' AND age_min = 0.5 AND age_max = 1;

-- Children (1-3 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 2, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 8, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'common' AND age_min = 1 AND age_max = 3;

-- Children (4-6 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 3, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 12, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'common' AND age_min = 4 AND age_max = 6;

-- Children (7-9 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 4, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 20, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'common' AND age_min = 7 AND age_max = 9.99;

-- Boys (10-12 years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 4, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 20, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'male' AND age_min = 10 AND age_max = 12;

-- Girls (10-12 years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 4, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 20, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'female' AND age_min = 10 AND age_max = 12;

-- Boys (13-15 years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 25, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'male' AND age_min = 13 AND age_max = 15;

-- Girls (13-15 years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 25, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'female' AND age_min = 13 AND age_max = 15;

-- Boys (16-18 years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'male' AND age_min = 16 AND age_max = 18.99;

-- Girls (16-18 years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'female' AND age_min = 16 AND age_max = 18.99;

-- Men (19-59 years) - All activity levels
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'male' AND age_min = 19 AND age_max = 59.99;

-- Women (19-59 years) - All activity levels
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'female' AND age_min = 19 AND age_max = 59.99;

-- Men (60+ years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'male' AND age_min = 60 AND age_max = 120;

-- Women (60+ years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'female' AND age_min = 60 AND age_max = 120;

-- Pregnant women (19-50 years) - All trimesters
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 6, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'female' AND age_min = 19 AND age_max = 50 
  AND notes LIKE '%Pregnant%';

-- Lactating women (19-50 years) - All periods
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 7, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 35, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'India' AND gender = 'female' AND age_min = 19 AND age_max = 50 
  AND notes LIKE '%Lactating%';

-- Update USA guidelines with proper Pantothenic Acid and Biotin values

-- Infants (0-6 months) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 1.7, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 5, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'USA' AND gender = 'common' AND age_min = 0 AND age_max = 0.5;

-- Infants (6-12 months) - Common  
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 1.8, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 6, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'USA' AND gender = 'common' AND age_min = 0.5 AND age_max = 1;

-- Children (1-3 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 2, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 8, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'USA' AND gender = 'common' AND age_min = 1 AND age_max = 3;

-- Children (4-8 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 3, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 12, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'USA' AND gender = 'common' AND age_min = 4 AND age_max = 8;

-- Children (9-13 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 4, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 20, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'USA' AND gender = 'common' AND age_min = 9 AND age_max = 13;

-- Adolescents (14-18 years) - All genders
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 25, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'USA' AND age_min = 14 AND age_max = 18;

-- Adults (19+ years) - All genders
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'USA' AND age_min >= 19;

-- Pregnant women (19+ years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 6, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'USA' AND gender = 'female' AND age_min >= 19 
  AND notes LIKE '%Pregnant%';

-- Lactating women (19+ years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 7, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 35, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'USA' AND gender = 'female' AND age_min >= 19 
  AND notes LIKE '%Lactating%';

-- Update EU guidelines with proper Pantothenic Acid and Biotin values

-- Infants (0-6 months) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 1.7, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 5, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'EU' AND gender = 'common' AND age_min = 0 AND age_max = 0.5;

-- Infants (6-12 months) - Common  
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 1.8, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 6, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'EU' AND gender = 'common' AND age_min = 0.5 AND age_max = 1;

-- Children (1-3 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 2, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 20, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'EU' AND gender = 'common' AND age_min = 1 AND age_max = 3;

-- Children (4-10 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 4, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 25, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'EU' AND gender = 'common' AND age_min = 4 AND age_max = 10;

-- Children (11-17 years) - All genders
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 35, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'EU' AND age_min = 11 AND age_max = 17;

-- Adults (18+ years) - All genders
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 40, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'EU' AND age_min >= 18;

-- Pregnant women (18+ years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 40, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'EU' AND gender = 'female' AND age_min >= 18 
  AND notes LIKE '%Pregnant%';

-- Lactating women (18+ years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 7, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 45, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'EU' AND gender = 'female' AND age_min >= 18 
  AND notes LIKE '%Lactating%';

-- Update WHO guidelines with proper Pantothenic Acid and Biotin values

-- Infants (0-6 months) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 1.7, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 5, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'WHO' AND gender = 'common' AND age_min = 0 AND age_max = 0.5;

-- Infants (6-12 months) - Common  
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 1.8, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 6, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'WHO' AND gender = 'common' AND age_min = 0.5 AND age_max = 1;

-- Children (1-3 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 2, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 8, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'WHO' AND gender = 'common' AND age_min = 1 AND age_max = 3;

-- Children (4-8 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 3, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 12, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'WHO' AND gender = 'common' AND age_min = 4 AND age_max = 8;

-- Children (9-13 years) - Common
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 4, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 20, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'WHO' AND gender = 'common' AND age_min = 9 AND age_max = 13;

-- Adolescents (14-18 years) - All genders
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 25, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'WHO' AND age_min = 14 AND age_max = 18;

-- Adults (19+ years) - All genders
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 5, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'WHO' AND age_min >= 19;

-- Pregnant women (19+ years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 6, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 30, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'WHO' AND gender = 'female' AND age_min >= 19 
  AND notes LIKE '%Pregnant%';

-- Lactating women (19+ years)
UPDATE micronutrient_guidelines_flexible 
SET micronutrients = jsonb_set(
  jsonb_set(
    micronutrients, 
    '{pantothenic_acid}', 
    '{"ai": 7, "ul": null, "rda": null, "unit": "mg"}'
  ),
  '{biotin}',
  '{"ai": 35, "ul": null, "rda": null, "unit": "mcg"}'
)
WHERE country = 'WHO' AND gender = 'female' AND age_min >= 19 
  AND notes LIKE '%Lactating%';
