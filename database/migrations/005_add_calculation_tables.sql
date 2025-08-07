-- Migration 005: Add calculation formula tables
-- Replace AI calculations with database-driven formula lookups

-- EER calculation formulas by country/gender/age category
CREATE TABLE IF NOT EXISTS eer_formulas (
  id SERIAL PRIMARY KEY,
  country VARCHAR(10) NOT NULL, -- USA, EU, UK, AU/NZ
  gender VARCHAR(10) NOT NULL, -- male, female
  age_category VARCHAR(20) NOT NULL, -- child, adolescent, adult
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  bmr_formula VARCHAR(200) NOT NULL, -- Formula description
  bmr_constant DECIMAL(8,3) NOT NULL,
  bmr_weight_coefficient DECIMAL(8,3) NOT NULL,
  bmr_height_coefficient DECIMAL(8,3) NOT NULL,
  bmr_age_coefficient DECIMAL(8,3) NOT NULL,
  eer_base DECIMAL(8,3), -- Base for EER calculation
  eer_age_coefficient DECIMAL(8,3), -- Age coefficient for EER
  eer_weight_coefficient DECIMAL(8,3), -- Weight coefficient for EER
  eer_height_coefficient DECIMAL(8,3), -- Height coefficient for EER
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAL (Physical Activity Level) values by country and activity level
CREATE TABLE IF NOT EXISTS pal_values (
  id SERIAL PRIMARY KEY,
  country VARCHAR(10) NOT NULL,
  activity_level VARCHAR(20) NOT NULL, -- sedentary, lightly_active, moderately_active, very_active, extra_active
  pal_value DECIMAL(4,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Macronutrient guidelines by country/gender/age
CREATE TABLE IF NOT EXISTS macro_guidelines (
  id SERIAL PRIMARY KEY,
  country VARCHAR(10) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  
  -- Protein (g/kg body weight or percentage)
  protein_min_percent DECIMAL(5,2),
  protein_max_percent DECIMAL(5,2),
  protein_min_grams_per_kg DECIMAL(5,2),
  protein_max_grams_per_kg DECIMAL(5,2),
  protein_note TEXT,
  
  -- Carbohydrates (percentage of total calories)
  carbs_min_percent DECIMAL(5,2),
  carbs_max_percent DECIMAL(5,2),
  carbs_note TEXT,
  
  -- Total Fat (percentage of total calories)
  fat_min_percent DECIMAL(5,2),
  fat_max_percent DECIMAL(5,2),
  fat_note TEXT,
  
  -- Fiber (g per 1000 kcal)
  fiber_per_1000_kcal DECIMAL(5,2),
  fiber_note TEXT,
  
  -- Saturated Fat (percentage of total calories)
  saturated_fat_max_percent DECIMAL(5,2),
  saturated_fat_note TEXT,
  
  -- Additional guidelines
  monounsaturated_fat_note TEXT,
  polyunsaturated_fat_note TEXT,
  omega3_min_grams DECIMAL(5,2),
  omega3_max_grams DECIMAL(5,2),
  omega3_note TEXT,
  cholesterol_max_mg DECIMAL(8,2),
  cholesterol_note TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_eer_formulas_lookup ON eer_formulas(country, gender, age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_pal_values_lookup ON pal_values(country, activity_level);
CREATE INDEX IF NOT EXISTS idx_macro_guidelines_lookup ON macro_guidelines(country, gender, age_min, age_max);

-- ========================================
-- INSERT ALL COUNTRY FORMULAS
-- ========================================

-- USA EER formulas (IOM 2005)
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
-- Adult women (19+ years)
('USA', 'female', 'adult', 19, 120, 'Harris-Benedict (revised)', 447.593, 9.247, 3.098, -4.330, 354, -6.91, 9.36, 726),
-- Adult men (19+ years)  
('USA', 'male', 'adult', 19, 120, 'Harris-Benedict (revised)', 447.593, 13.397, 4.799, -5.677, 662, -9.53, 15.91, 539.6);

-- UK EER formulas (SACN/EFSA guidelines using Schofield equations)
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
-- Adult women (19-60 years) - Schofield equations
('UK', 'female', 'adult', 19, 60, 'Schofield (SACN/EFSA)', 447.593, 9.247, 3.098, -4.330, NULL, NULL, NULL, NULL),
-- Adult men (19-60 years) - Schofield equations  
('UK', 'male', 'adult', 19, 60, 'Schofield (SACN/EFSA)', 88.362, 13.397, 4.799, -5.677, NULL, NULL, NULL, NULL);

-- EU EER formulas (EFSA guidelines using Schofield equations)
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
-- Adult women (19-60 years) - EFSA uses same Schofield as UK
('EU', 'female', 'adult', 19, 60, 'Schofield (EFSA)', 447.593, 9.247, 3.098, -4.330, NULL, NULL, NULL, NULL),
-- Adult men (19-60 years) - EFSA uses same Schofield as UK
('EU', 'male', 'adult', 19, 60, 'Schofield (EFSA)', 88.362, 13.397, 4.799, -5.677, NULL, NULL, NULL, NULL);

-- AU/NZ EER formulas (NHMRC guidelines using Schofield equations)
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
-- Adult women (19-60 years) - NHMRC uses Schofield
('AU/NZ', 'female', 'adult', 19, 60, 'Schofield (NHMRC)', 447.593, 9.247, 3.098, -4.330, NULL, NULL, NULL, NULL),
-- Adult men (19-60 years) - NHMRC uses Schofield
('AU/NZ', 'male', 'adult', 19, 60, 'Schofield (NHMRC)', 88.362, 13.397, 4.799, -5.677, NULL, NULL, NULL, NULL);

-- ========================================
-- INSERT ALL PAL VALUES
-- ========================================

-- USA PAL values (IOM guidelines)
INSERT INTO pal_values (country, activity_level, pal_value, description) VALUES
('USA', 'sedentary', 1.00, 'Sedentary lifestyle'),
('USA', 'lightly_active', 1.12, 'Low active'),
('USA', 'moderately_active', 1.27, 'Active'),
('USA', 'very_active', 1.45, 'Very active'),
('USA', 'extra_active', 1.45, 'Very active');

-- UK PAL values (SACN/EFSA guidelines)
INSERT INTO pal_values (country, activity_level, pal_value, description) VALUES
('UK', 'sedentary', 1.4, 'Sedentary lifestyle'),
('UK', 'lightly_active', 1.6, 'Light activity'),
('UK', 'moderately_active', 1.7, 'Moderate activity'),
('UK', 'very_active', 2.0, 'High activity'),
('UK', 'extra_active', 2.4, 'Very high activity');

-- EU PAL values (EFSA guidelines - same as UK)
INSERT INTO pal_values (country, activity_level, pal_value, description) VALUES
('EU', 'sedentary', 1.4, 'Sedentary lifestyle'),
('EU', 'lightly_active', 1.6, 'Light activity'),
('EU', 'moderately_active', 1.7, 'Moderate activity'),
('EU', 'very_active', 2.0, 'High activity'),
('EU', 'extra_active', 2.4, 'Very high activity');

-- AU/NZ PAL values (NHMRC guidelines)
INSERT INTO pal_values (country, activity_level, pal_value, description) VALUES
('AU/NZ', 'sedentary', 1.4, 'Sedentary lifestyle'),
('AU/NZ', 'lightly_active', 1.6, 'Light activity'),
('AU/NZ', 'moderately_active', 1.7, 'Moderate activity'),
('AU/NZ', 'very_active', 2.0, 'High activity'),
('AU/NZ', 'extra_active', 2.4, 'Very high activity');

-- ========================================
-- INSERT ALL MACRO GUIDELINES
-- ========================================

-- USA macro guidelines (DRI 2005)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
-- Adult women (19-50 years)
('USA', 'female', 19, 50, 10, 35, 0.8, 2.0, 'RDA: 0.8 g/kg body weight minimum', 45, 65, 'AMDR: 45-65% of total calories', 20, 35, 'AMDR: 20-35% of total calories', 14, 'AI: 14 g per 1000 kcal', 10, 'Less than 10% of calories', 1.1, 2.0, 'ALA: 1.1 g/day minimum', 300, 'Less than 300 mg/day'),
-- Adult men (19-50 years)
('USA', 'male', 19, 50, 10, 35, 0.8, 2.0, 'RDA: 0.8 g/kg body weight minimum', 45, 65, 'AMDR: 45-65% of total calories', 20, 35, 'AMDR: 20-35% of total calories', 14, 'AI: 14 g per 1000 kcal', 10, 'Less than 10% of calories', 1.6, 2.5, 'ALA: 1.6 g/day minimum', 300, 'Less than 300 mg/day');

-- UK macro guidelines (SACN)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
-- Adult women (19-50 years)
('UK', 'female', 19, 50, 10, 35, 0.75, 2.0, 'RNI: 0.75 g/kg body weight', 45, 65, 'SACN: 45-65% of total energy', 20, 35, 'SACN: 20-35% of total energy', 12, 'AOAC: 12 g per 1000 kcal', 11, 'SACN: Less than 11% of energy', 1.4, 2.5, 'Long-chain omega-3: 450 mg/day', 300, 'No specific limit set'),
-- Adult men (19-50 years)
('UK', 'male', 19, 50, 10, 35, 0.75, 2.0, 'RNI: 0.75 g/kg body weight', 45, 65, 'SACN: 45-65% of total energy', 20, 35, 'SACN: 20-35% of total energy', 12, 'AOAC: 12 g per 1000 kcal', 11, 'SACN: Less than 11% of energy', 1.4, 2.5, 'Long-chain omega-3: 450 mg/day', 300, 'No specific limit set');

-- EU macro guidelines (EFSA DRV)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
-- Adult women (19-50 years)
('EU', 'female', 19, 50, 10, 35, 0.83, 2.0, 'PRI: 0.83 g/kg body weight', 45, 65, 'EFSA: 45-65% of total energy', 20, 35, 'EFSA: 20-35% of total energy', 12, 'EFSA: 12 g per 1000 kcal', 10, 'EFSA: Less than 10% of energy', 2.0, 3.0, 'EPA+DHA: 250 mg/day', 300, 'No UL established'),
-- Adult men (19-50 years)
('EU', 'male', 19, 50, 10, 35, 0.83, 2.0, 'PRI: 0.83 g/kg body weight', 45, 65, 'EFSA: 45-65% of total energy', 20, 35, 'EFSA: 20-35% of total energy', 12, 'EFSA: 12 g per 1000 kcal', 10, 'EFSA: Less than 10% of energy', 2.0, 3.0, 'EPA+DHA: 250 mg/day', 300, 'No UL established');

-- AU/NZ macro guidelines (NHMRC)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
-- Adult women (19-50 years)
('AU/NZ', 'female', 19, 50, 15, 25, 0.75, 2.0, 'RDI: 0.75 g/kg body weight', 45, 65, 'NHMRC: 45-65% of total energy', 20, 35, 'NHMRC: 20-35% of total energy', 12, 'AI: 12 g per 1000 kcal', 10, 'Less than 10% of energy', 1.0, 2.0, 'Long-chain omega-3: 430 mg/day', 300, 'No UL established'),
-- Adult men (19-50 years)
('AU/NZ', 'male', 19, 50, 15, 25, 0.84, 2.0, 'RDI: 0.84 g/kg body weight', 45, 65, 'NHMRC: 45-65% of total energy', 20, 35, 'NHMRC: 20-35% of total energy', 12, 'AI: 12 g per 1000 kcal', 10, 'Less than 10% of energy', 1.3, 2.5, 'Long-chain omega-3: 610 mg/day', 300, 'No UL established');

-- Comments
COMMENT ON TABLE eer_formulas IS 'EER calculation formulas by country, gender, and age';
COMMENT ON TABLE pal_values IS 'Physical Activity Level values by country and activity level';
COMMENT ON TABLE macro_guidelines IS 'Macronutrient guidelines by country, gender, and age'; 