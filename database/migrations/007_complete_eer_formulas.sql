-- Migration 007: Complete EER formulas from CSV data
-- Add all missing countries and correct formulas

-- First, delete existing data to avoid conflicts
DELETE FROM macro_guidelines WHERE country IN ('USA', 'UK', 'EU', 'AU/NZ');
DELETE FROM pal_values WHERE country IN ('USA', 'UK', 'EU', 'AU/NZ');  
DELETE FROM eer_formulas WHERE country IN ('USA', 'UK', 'EU', 'AU/NZ');

-- ========================================
-- CORRECTED USA FORMULAS (IOM 2005)
-- ========================================

-- USA EER formulas - corrected from CSV
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
-- Adult women (19+ years): 354 − (6.91×age) + PA×(9.36×wt + 726×ht)
('USA', 'female', 'adult', 19, 120, 'Harris-Benedict (revised)', 447.593, 9.247, 3.098, -4.330, 354, -6.91, 9.36, 726),
-- Adult men (19+ years): 662 − (9.53×age) + PAL×(15.91×wt + 539.6×ht)
('USA', 'male', 'adult', 19, 120, 'Harris-Benedict (revised)', 88.362, 13.397, 4.799, -5.677, 662, -9.53, 15.91, 539.6);

-- ========================================  
-- CANADA (SAME AS USA)
-- ========================================
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('Canada', 'female', 'adult', 19, 120, 'Harris-Benedict (revised)', 447.593, 9.247, 3.098, -4.330, 354, -6.91, 9.36, 726),
('Canada', 'male', 'adult', 19, 120, 'Harris-Benedict (revised)', 88.362, 13.397, 4.799, -5.677, 662, -9.53, 15.91, 539.6);

-- ========================================
-- UK - SCHOFIELD EQUATIONS (WHO/FAO)
-- ========================================
-- Using actual Schofield coefficients for adults (18-30 and 30-60 years)
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
-- Men 18-30: BMR = 15.057×wt + 679.0 (Schofield weight-only)
('UK', 'male', 'adult', 18, 30, 'Schofield (SACN)', 679.0, 15.057, 0, 0, NULL, NULL, NULL, NULL),
-- Men 30-60: BMR = 11.472×wt + 873.0 (Schofield weight-only)  
('UK', 'male', 'adult', 30, 60, 'Schofield (SACN)', 873.0, 11.472, 0, 0, NULL, NULL, NULL, NULL),
-- Women 18-30: BMR = 14.818×wt + 486.0 (Schofield weight-only)
('UK', 'female', 'adult', 18, 30, 'Schofield (SACN)', 486.0, 14.818, 0, 0, NULL, NULL, NULL, NULL),
-- Women 30-60: BMR = 8.126×wt + 845.0 (Schofield weight-only)
('UK', 'female', 'adult', 30, 60, 'Schofield (SACN)', 845.0, 8.126, 0, 0, NULL, NULL, NULL, NULL);

-- ========================================
-- EU - EFSA (SAME AS UK SCHOFIELD)
-- ========================================
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('EU', 'male', 'adult', 18, 30, 'Schofield (EFSA)', 679.0, 15.057, 0, 0, NULL, NULL, NULL, NULL),
('EU', 'male', 'adult', 30, 60, 'Schofield (EFSA)', 873.0, 11.472, 0, 0, NULL, NULL, NULL, NULL),
('EU', 'female', 'adult', 18, 30, 'Schofield (EFSA)', 486.0, 14.818, 0, 0, NULL, NULL, NULL, NULL),
('EU', 'female', 'adult', 30, 60, 'Schofield (EFSA)', 845.0, 8.126, 0, 0, NULL, NULL, NULL, NULL);

-- ========================================
-- AUSTRALIA/NEW ZEALAND - NHMRC (SCHOFIELD)
-- ========================================
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('AU/NZ', 'male', 'adult', 18, 30, 'Schofield (NHMRC)', 679.0, 15.057, 0, 0, NULL, NULL, NULL, NULL),
('AU/NZ', 'male', 'adult', 30, 60, 'Schofield (NHMRC)', 873.0, 11.472, 0, 0, NULL, NULL, NULL, NULL),
('AU/NZ', 'female', 'adult', 18, 30, 'Schofield (NHMRC)', 486.0, 14.818, 0, 0, NULL, NULL, NULL, NULL),
('AU/NZ', 'female', 'adult', 30, 60, 'Schofield (NHMRC)', 845.0, 8.126, 0, 0, NULL, NULL, NULL, NULL);

-- ========================================
-- NEW COUNTRIES FROM CSV
-- ========================================

-- SINGAPORE (WHO/FAO OR IOM)
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('Singapore', 'male', 'adult', 18, 60, 'Schofield (WHO/FAO)', 873.0, 11.472, 0, 0, NULL, NULL, NULL, NULL),
('Singapore', 'female', 'adult', 18, 60, 'Schofield (WHO/FAO)', 845.0, 8.126, 0, 0, NULL, NULL, NULL, NULL);

-- UAE (WHO SCHOFIELD)
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('UAE', 'male', 'adult', 18, 60, 'Schofield (WHO/FAO)', 873.0, 11.472, 0, 0, NULL, NULL, NULL, NULL),
('UAE', 'female', 'adult', 18, 60, 'Schofield (WHO/FAO)', 845.0, 8.126, 0, 0, NULL, NULL, NULL, NULL);

-- INDIA (ICMR-NIN): Men: (14.5×wt + 645)×PAL, Women: (11.0×wt + 833)×PAL
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('India', 'male', 'adult', 18, 60, 'ICMR-NIN', 645.0, 14.5, 0, 0, NULL, NULL, NULL, NULL),
('India', 'female', 'adult', 18, 60, 'ICMR-NIN', 833.0, 11.0, 0, 0, NULL, NULL, NULL, NULL);

-- JAPAN (MHLW): Men: (0.0481×wt + 0.0234×ht − 0.0138×age + 0.9708)×239
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('Japan', 'male', 'adult', 18, 60, 'MHLW (Japan)', 232.0, 11.5, 5.6, -3.3, NULL, NULL, NULL, NULL),
('Japan', 'female', 'adult', 18, 60, 'MHLW (Japan)', 232.0, 11.5, 5.6, -3.3, NULL, NULL, NULL, NULL);

-- GLOBAL/WHO/FAO: Men: (0.063×wt + 2.896)×239, Women: (0.062×wt + 2.036)×239
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('WHO', 'male', 'adult', 18, 60, 'WHO/FAO/UNU', 692.0, 15.1, 0, 0, NULL, NULL, NULL, NULL),
('WHO', 'female', 'adult', 18, 60, 'WHO/FAO/UNU', 487.0, 14.8, 0, 0, NULL, NULL, NULL, NULL);

-- SOUTH AFRICA (WHO/FAO) - Using shorter code 'ZA'
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('ZA', 'male', 'adult', 18, 60, 'WHO/FAO', 692.0, 15.1, 0, 0, NULL, NULL, NULL, NULL),
('ZA', 'female', 'adult', 18, 60, 'WHO/FAO', 487.0, 14.8, 0, 0, NULL, NULL, NULL, NULL);

-- BRAZIL (WHO/FAO)
INSERT INTO eer_formulas (country, gender, age_category, age_min, age_max, bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient, eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient) VALUES
('Brazil', 'male', 'adult', 18, 60, 'WHO/FAO', 692.0, 15.1, 0, 0, NULL, NULL, NULL, NULL),
('Brazil', 'female', 'adult', 18, 60, 'WHO/FAO', 487.0, 14.8, 0, 0, NULL, NULL, NULL, NULL);

-- ========================================
-- PAL VALUES FROM CSV
-- ========================================

-- USA/CANADA PAL VALUES
INSERT INTO pal_values (country, activity_level, pal_value, description) VALUES
('USA', 'sedentary', 1.00, 'Sedentary'),
('USA', 'lightly_active', 1.12, 'Low Active'),
('USA', 'moderately_active', 1.27, 'Active'),
('USA', 'very_active', 1.45, 'Very Active'),
('USA', 'extra_active', 1.48, 'Very Active'),
('Canada', 'sedentary', 1.00, 'Sedentary'),
('Canada', 'lightly_active', 1.12, 'Low Active'),
('Canada', 'moderately_active', 1.27, 'Active'),
('Canada', 'very_active', 1.45, 'Very Active'),
('Canada', 'extra_active', 1.48, 'Very Active');

-- UK PAL VALUES
INSERT INTO pal_values (country, activity_level, pal_value, description) VALUES
('UK', 'sedentary', 1.4, 'Sedentary'),
('UK', 'lightly_active', 1.6, 'Light'),
('UK', 'moderately_active', 1.7, 'Moderate'),
('UK', 'very_active', 1.9, 'Very Active'),
('UK', 'extra_active', 2.0, 'Very Active');

-- EU PAL VALUES  
INSERT INTO pal_values (country, activity_level, pal_value, description) VALUES
('EU', 'sedentary', 1.4, 'Sedentary'),
('EU', 'lightly_active', 1.6, 'Light'),
('EU', 'moderately_active', 1.7, 'Moderate'),
('EU', 'very_active', 1.8, 'High'),
('EU', 'extra_active', 2.0, 'High');

-- AU/NZ PAL VALUES
INSERT INTO pal_values (country, activity_level, pal_value, description) VALUES
('AU/NZ', 'sedentary', 1.3, 'Sedentary'),
('AU/NZ', 'lightly_active', 1.5, 'Light'),
('AU/NZ', 'moderately_active', 1.7, 'Moderate'),
('AU/NZ', 'very_active', 1.8, 'High'),
('AU/NZ', 'extra_active', 2.0, 'High');

-- OTHER COUNTRIES PAL VALUES
INSERT INTO pal_values (country, activity_level, pal_value, description) VALUES
('Singapore', 'sedentary', 1.2, 'Sedentary'),
('Singapore', 'lightly_active', 1.4, 'Light'),
('Singapore', 'moderately_active', 1.55, 'Moderate'),
('Singapore', 'very_active', 1.725, 'Active'),
('Singapore', 'extra_active', 1.8, 'Active'),
('UAE', 'sedentary', 1.2, 'Sedentary'),
('UAE', 'lightly_active', 1.4, 'Light'),
('UAE', 'moderately_active', 1.55, 'Moderate'),
('UAE', 'very_active', 1.725, 'Active'),
('UAE', 'extra_active', 1.8, 'Active'),
('India', 'sedentary', 1.53, 'Sedentary'),
('India', 'lightly_active', 1.6, 'Light'),
('India', 'moderately_active', 1.78, 'Moderate'),
('India', 'very_active', 2.1, 'Heavy'),
('India', 'extra_active', 2.1, 'Heavy'),
('Japan', 'sedentary', 1.3, 'Sedentary'),
('Japan', 'lightly_active', 1.4, 'Light'),
('Japan', 'moderately_active', 1.6, 'Moderate'),
('Japan', 'very_active', 1.9, 'High'),
('Japan', 'extra_active', 1.9, 'High'),
('WHO', 'sedentary', 1.2, 'Sedentary'),
('WHO', 'lightly_active', 1.4, 'Light'),
('WHO', 'moderately_active', 1.55, 'Moderate'),
('WHO', 'very_active', 1.725, 'Active'),
('WHO', 'extra_active', 1.8, 'Active'),
('ZA', 'sedentary', 1.2, 'Sedentary'),
('ZA', 'lightly_active', 1.4, 'Light'),
('ZA', 'moderately_active', 1.55, 'Moderate'),
('ZA', 'very_active', 1.725, 'Active'),
('ZA', 'extra_active', 1.8, 'Active'),
('Brazil', 'sedentary', 1.2, 'Sedentary'),
('Brazil', 'lightly_active', 1.4, 'Light'),
('Brazil', 'moderately_active', 1.55, 'Moderate'),
('Brazil', 'very_active', 1.725, 'Active'),
('Brazil', 'extra_active', 1.8, 'Active'); 