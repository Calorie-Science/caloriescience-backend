-- Migration: Add formula_definitions table to store detailed information about BMR/EER formulas
-- This table stores human-readable definitions, equations, and metadata for each formula type

CREATE TABLE IF NOT EXISTS formula_definitions (
  id SERIAL PRIMARY KEY,
  formula_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL, -- 'adult', 'adolescent', 'child', 'infant'
  description TEXT,

  -- Formula equations (stored as text for display)
  bmr_equation_male TEXT,
  bmr_equation_female TEXT,
  eer_equation_male TEXT,
  eer_equation_female TEXT,

  -- Age range applicability
  age_group VARCHAR(100),
  age_min INTEGER,
  age_max INTEGER,

  -- Additional metadata
  year_published INTEGER,
  source VARCHAR(200),
  notes TEXT,

  -- Commonly used in which countries
  primary_countries TEXT[], -- Array of country codes

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert formula definitions based on the provided specifications

-- ADULT FORMULAS (18+ years)

-- 1. Harris-Benedict (Revised 1984)
INSERT INTO formula_definitions (
  formula_name, display_name, category, description,
  bmr_equation_male, bmr_equation_female,
  age_group, age_min, age_max,
  year_published, source, primary_countries
) VALUES (
  'Harris-Benedict (revised)',
  'Harris-Benedict (Revised 1984)',
  'adult',
  'Classic BMR formula revised in 1984, widely used for adults',
  'BMR = 88.362 + (13.397 × Weight) + (4.799 × Height) - (5.677 × Age)',
  'BMR = 447.593 + (9.247 × Weight) + (3.098 × Height) - (4.330 × Age)',
  'Adults',
  18,
  120,
  1984,
  'Harris JA, Benedict FG. A Biometric Study of Human Basal Metabolism. Proc Natl Acad Sci USA. 1918;4(12):370-373.',
  ARRAY['usa', 'uk', 'canada', 'australia']
);

-- 2. Mifflin-St Jeor (1990)
INSERT INTO formula_definitions (
  formula_name, display_name, category, description,
  bmr_equation_male, bmr_equation_female,
  age_group, age_min, age_max,
  year_published, source, primary_countries
) VALUES (
  'Mifflin-St Jeor',
  'Mifflin-St Jeor (1990)',
  'adult',
  'Modern BMR formula (1990), considered more accurate for contemporary populations',
  'BMR = (10 × Weight) + (6.25 × Height) - (5 × Age) + 5',
  'BMR = (10 × Weight) + (6.25 × Height) - (5 × Age) - 161',
  'Adults',
  18,
  120,
  1990,
  'Mifflin MD, St Jeor ST, Hill LA, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-247.',
  ARRAY['usa', 'uk', 'canada']
);

-- 3. Schofield (1985)
INSERT INTO formula_definitions (
  formula_name, display_name, category, description,
  bmr_equation_male, bmr_equation_female,
  age_group, age_min, age_max,
  year_published, source, primary_countries, notes
) VALUES (
  'Schofield',
  'Schofield (1985)',
  'adult',
  'WHO-recommended formula (1985), used internationally',
  '18-30 years: BMR = (0.063 × Weight + 2.896) × 1000 / 4.184
30-60 years: BMR = (0.048 × Weight + 3.653) × 1000 / 4.184
60+ years: BMR = (0.049 × Weight + 2.459) × 1000 / 4.184',
  '18-30 years: BMR = (0.062 × Weight + 2.036) × 1000 / 4.184
30-60 years: BMR = (0.034 × Weight + 3.538) × 1000 / 4.184
60+ years: BMR = (0.038 × Weight + 2.755) × 1000 / 4.184',
  'Adults (Age-specific ranges)',
  18,
  120,
  1985,
  'Schofield WN. Predicting basal metabolic rate, new standards and review of previous work. Hum Nutr Clin Nutr. 1985;39 Suppl 1:5-41.',
  ARRAY['who', 'uk', 'eu'],
  'Weight in kg, Result in kcal/day. Different equations for different age ranges.'
);

-- 4. Henry Oxford (2005)
INSERT INTO formula_definitions (
  formula_name, display_name, category, description,
  bmr_equation_male, bmr_equation_female,
  age_group, age_min, age_max,
  year_published, source, primary_countries, notes
) VALUES (
  'Henry Oxford',
  'Henry Oxford (2005)',
  'adult',
  'Updated formula (2005) based on Oxford database, more accurate for diverse populations',
  '18-30 years: BMR = (0.0630 × Weight + 2.8957) × 1000 / 4.184
30-60 years: BMR = (0.0484 × Weight + 3.6534) × 1000 / 4.184
60+ years: BMR = (0.0491 × Weight + 2.4587) × 1000 / 4.184',
  '18-30 years: BMR = (0.0621 × Weight + 2.0357) × 1000 / 4.184
30-60 years: BMR = (0.0342 × Weight + 3.5377) × 1000 / 4.184
60+ years: BMR = (0.0377 × Weight + 2.7545) × 1000 / 4.184',
  'Adults (Age-specific ranges)',
  18,
  120,
  2005,
  'Henry CJ. Basal metabolic rate studies in humans: measurement and development of new equations. Public Health Nutr. 2005;8(7A):1133-1152.',
  ARRAY['uk', 'who', 'eu'],
  'Weight in kg, Result in kcal/day. More accurate for ethnically diverse populations.'
);

-- 5. IOM EER (Adults 19+ years)
INSERT INTO formula_definitions (
  formula_name, display_name, category, description,
  bmr_equation_male, bmr_equation_female,
  eer_equation_male, eer_equation_female,
  age_group, age_min, age_max,
  year_published, source, primary_countries, notes
) VALUES (
  'IOM',
  'IOM EER (Institute of Medicine)',
  'adult',
  'Institute of Medicine EER equation, accounts for age, activity level, and growth needs',
  NULL, -- IOM uses EER directly, not BMR
  NULL,
  'EER = 662 - (9.53 × Age) + PA × [(15.91 × Weight) + (539.6 × Height/100)]',
  'EER = 354 - (6.91 × Age) + PA × [(9.36 × Weight) + (726 × Height/100)]',
  'Adults',
  19,
  120,
  2005,
  'Institute of Medicine. Dietary Reference Intakes for Energy, Carbohydrate, Fiber, Fat, Fatty Acids, Cholesterol, Protein, and Amino Acids. Washington, DC: The National Academies Press; 2005.',
  ARRAY['usa', 'canada'],
  'PA Coefficients - Sedentary: 1.00, Low Active: M 1.11 F 1.12, Active: M 1.25 F 1.27, Very Active: M 1.48 F 1.45'
);

-- ADOLESCENT FORMULAS (9-18 years)

INSERT INTO formula_definitions (
  formula_name, display_name, category, description,
  eer_equation_male, eer_equation_female,
  age_group, age_min, age_max,
  year_published, source, primary_countries, notes
) VALUES (
  'IOM Adolescent',
  'IOM EER (Adolescents 9-18 years)',
  'adolescent',
  'IOM equation for adolescents with growth energy allowance',
  'EER = 88.5 - (61.9 × Age) + PA × [(26.7 × Weight) + (903 × Height/100)] + 25',
  'EER = 135.3 - (30.8 × Age) + PA × [(10.0 × Weight) + (934 × Height/100)] + 25',
  'Adolescents',
  9,
  18,
  2005,
  'Institute of Medicine. Dietary Reference Intakes for Energy (2005).',
  ARRAY['usa', 'canada'],
  'PA Coefficients - Sedentary: 1.00, Low Active: Boys 1.13 Girls 1.16, Active: Boys 1.26 Girls 1.31, Very Active: Boys 1.42 Girls 1.56. +25 kcal for growth.'
);

-- CHILD FORMULAS (3-8 years)

INSERT INTO formula_definitions (
  formula_name, display_name, category, description,
  eer_equation_male, eer_equation_female,
  age_group, age_min, age_max,
  year_published, source, primary_countries, notes
) VALUES (
  'IOM Child',
  'IOM EER (Children 3-8 years)',
  'child',
  'IOM equation for children with growth energy allowance',
  'EER = 88.5 - (61.9 × Age) + PA × [(26.7 × Weight) + (903 × Height/100)] + 20',
  'EER = 135.3 - (30.8 × Age) + PA × [(10.0 × Weight) + (934 × Height/100)] + 20',
  'Children',
  3,
  8,
  2005,
  'Institute of Medicine. Dietary Reference Intakes for Energy (2005).',
  ARRAY['usa', 'canada'],
  'PA Coefficients - Sedentary: 1.00, Low Active: Boys 1.13 Girls 1.16, Active: Boys 1.26 Girls 1.31, Very Active: Boys 1.42 Girls 1.56. +20 kcal for growth.'
);

-- INFANT FORMULAS (0-35 months)

INSERT INTO formula_definitions (
  formula_name, display_name, category, description,
  eer_equation_male, eer_equation_female,
  age_group, age_min, age_max,
  year_published, source, primary_countries, notes
) VALUES (
  'IOM Infant',
  'IOM EER (Infants 0-35 months)',
  'infant',
  'IOM equation for infants with age-specific growth energy',
  'EER = (89 × Weight - 100) + Energy for Growth',
  'EER = (89 × Weight - 100) + Energy for Growth',
  'Infants',
  0,
  2,
  2005,
  'Institute of Medicine. Dietary Reference Intakes for Energy (2005).',
  ARRAY['usa', 'canada'],
  'Energy for Growth: 0-3 months: 175 kcal/day, 4-6 months: 56 kcal/day, 7-12 months: 22 kcal/day, 13-35 months: 20 kcal/day'
);

-- Create index for faster lookups
CREATE INDEX idx_formula_definitions_category ON formula_definitions(category);
CREATE INDEX idx_formula_definitions_age_range ON formula_definitions(age_min, age_max);
CREATE INDEX idx_formula_definitions_countries ON formula_definitions USING GIN(primary_countries);

-- Add comment
COMMENT ON TABLE formula_definitions IS 'Stores detailed human-readable information about BMR/EER formulas including equations, sources, and applicability';
