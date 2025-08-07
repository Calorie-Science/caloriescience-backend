-- Migration 022: Add Pantothenic Acid and Biotin to UK guidelines
-- Since we default all micronutrients to UK, add these values to UK to prevent nulls

-- Add Pantothenic Acid and Biotin values to all UK guidelines based on USA values
-- Adults (19+ years): Pantothenic Acid 5mg, Biotin 30mcg

UPDATE micronutrient_guidelines 
SET 
  pantothenic_acid_mg = 5.0,
  biotin_mcg = 30.0,
  notes = COALESCE(notes, '') || ' | Pantothenic Acid: 5mg, Biotin: 30mcg (USA reference values)'
WHERE country = 'UK' 
  AND age_min >= 19 
  AND age_max >= 19;

-- For younger age groups in UK, use age-appropriate USA values
-- 14-18 years: Pantothenic Acid 5mg, Biotin 25mcg
UPDATE micronutrient_guidelines 
SET 
  pantothenic_acid_mg = 5.0,
  biotin_mcg = 25.0,
  notes = COALESCE(notes, '') || ' | Pantothenic Acid: 5mg, Biotin: 25mcg (USA reference values)'
WHERE country = 'UK' 
  AND age_min >= 14 
  AND age_max < 19;

-- 9-13 years: Pantothenic Acid 4mg, Biotin 20mcg
UPDATE micronutrient_guidelines 
SET 
  pantothenic_acid_mg = 4.0,
  biotin_mcg = 20.0,
  notes = COALESCE(notes, '') || ' | Pantothenic Acid: 4mg, Biotin: 20mcg (USA reference values)'
WHERE country = 'UK' 
  AND age_min >= 9 
  AND age_max < 14;

-- 4-8 years: Pantothenic Acid 3mg, Biotin 12mcg
UPDATE micronutrient_guidelines 
SET 
  pantothenic_acid_mg = 3.0,
  biotin_mcg = 12.0,
  notes = COALESCE(notes, '') || ' | Pantothenic Acid: 3mg, Biotin: 12mcg (USA reference values)'
WHERE country = 'UK' 
  AND age_min >= 4 
  AND age_max < 9;

-- 1-3 years: Pantothenic Acid 2mg, Biotin 8mcg
UPDATE micronutrient_guidelines 
SET 
  pantothenic_acid_mg = 2.0,
  biotin_mcg = 8.0,
  notes = COALESCE(notes, '') || ' | Pantothenic Acid: 2mg, Biotin: 8mcg (USA reference values)'
WHERE country = 'UK' 
  AND age_min >= 1 
  AND age_max < 4; 