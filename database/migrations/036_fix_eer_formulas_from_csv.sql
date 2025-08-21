-- Migration 036: Fix EER formulas based on actual guidelines from CSV
-- This migration corrects all the incorrect EER formulas and adds missing ones
-- Based on the comprehensive CSV data provided

-- First, clear all existing data to avoid conflicts
DELETE FROM eer_formulas;

-- ========================================
-- USA EER FORMULAS (IOM 2005) - CORRECT
-- ========================================
-- Men: 662 − (9.53×age) + PAL×(15.91×wt + 539.6×ht)
-- Women: 354 − (6.91×age) + PA×(9.36×wt + 726×ht)
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('USA', 'male', 'adult', 19, 120, 'Harris-Benedict (revised)', 88.362, 13.397, 4.799, -5.677, 662, -9.53, 15.91, 539.6, 340, 452, 500, 400),
('USA', 'female', 'adult', 19, 120, 'Harris-Benedict (revised)', 447.593, 9.247, 3.098, -4.330, 354, -6.91, 9.36, 726, 340, 452, 500, 400);

-- ========================================
-- CANADA (SAME AS USA) - CORRECT
-- ========================================
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('Canada', 'male', 'adult', 19, 120, 'Harris-Benedict (revised)', 88.362, 13.397, 4.799, -5.677, 662, -9.53, 15.91, 539.6, 340, 452, 500, 400),
('Canada', 'female', 'adult', 19, 120, 'Harris-Benedict (revised)', 447.593, 9.247, 3.098, -4.330, 354, -6.91, 9.36, 726, 340, 452, 500, 400);

-- ========================================
-- UK EER FORMULAS (SACN - Schofield based)
-- ========================================
-- Men: (0.063×wt + 2.896)×239
-- Women: (0.062×wt + 2.036)×239
-- Converting to standard format: base + weight_coeff×wt + height_coeff×ht + age_coeff×age
-- Men: 0.063×239×wt + 2.896×239 = 15.057×wt + 679.0
-- Women: 0.062×239×wt + 2.036×239 = 14.818×wt + 486.0
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('UK', 'male', 'adult', 18, 30, 'Schofield (SACN)', 679.0, 15.057, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('UK', 'male', 'adult', 30, 60, 'Schofield (SACN)', 873.0, 11.472, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('UK', 'female', 'adult', 18, 30, 'Schofield (SACN)', 486.0, 14.818, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('UK', 'female', 'adult', 30, 60, 'Schofield (SACN)', 845.0, 8.126, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- EU EER FORMULAS (EFSA - Same as UK)
-- ========================================
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('EU', 'male', 'adult', 18, 30, 'Schofield (EFSA)', 679.0, 15.057, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('EU', 'male', 'adult', 30, 60, 'Schofield (EFSA)', 873.0, 11.472, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('EU', 'female', 'adult', 18, 30, 'Schofield (EFSA)', 486.0, 14.818, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('EU', 'female', 'adult', 30, 60, 'Schofield (EFSA)', 845.0, 8.126, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- AUSTRALIA/NEW ZEALAND (NHMRC - Same as UK)
-- ========================================
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('AU/NZ', 'male', 'adult', 18, 30, 'Schofield (NHMRC)', 679.0, 15.057, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('AU/NZ', 'male', 'adult', 30, 60, 'Schofield (NHMRC)', 873.0, 11.472, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('AU/NZ', 'female', 'adult', 18, 30, 'Schofield (NHMRC)', 486.0, 14.818, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('AU/NZ', 'female', 'adult', 30, 60, 'Schofield (NHMRC)', 845.0, 8.126, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- SINGAPORE (WHO/FAO or IOM adopted)
-- ========================================
-- Uses same Schofield equations as WHO/FAO
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('Singapore', 'male', 'adult', 18, 60, 'Schofield (WHO/FAO)', 873.0, 11.472, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('Singapore', 'female', 'adult', 18, 60, 'Schofield (WHO/FAO)', 845.0, 8.126, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- UAE (WHO/FAO - Same as Singapore)
-- ========================================
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('UAE', 'male', 'adult', 18, 60, 'Schofield (WHO/FAO)', 873.0, 11.472, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('UAE', 'female', 'adult', 18, 60, 'Schofield (WHO/FAO)', 845.0, 8.126, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- INDIA EER FORMULAS (ICMR-NIN)
-- ========================================
-- Men: (14.5×wt + 645)×PAL
-- Women: (11.0×wt + 833)×PAL
-- Converting to standard format: base + weight_coeff×wt + height_coeff×ht + age_coeff×age
-- Men: 645 + 14.5×wt + 0×ht + 0×age
-- Women: 833 + 11.0×wt + 0×ht + 0×age
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('India', 'male', 'adult', 18, 60, 'ICMR-NIN', 645.0, 14.5, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('India', 'female', 'adult', 18, 60, 'ICMR-NIN', 833.0, 11.0, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- JAPAN EER FORMULAS (MHLW)
-- ========================================
-- Men: (0.0481×wt + 0.0234×ht − 0.0138×age + 0.9708)×239
-- Converting to standard format: base + weight_coeff×wt + height_coeff×ht + age_coeff×age
-- Base: 0.9708×239 = 232.0
-- Weight coeff: 0.0481×239 = 11.5
-- Height coeff: 0.0234×239 = 5.6
-- Age coeff: -0.0138×239 = -3.3
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('Japan', 'male', 'adult', 18, 60, 'MHLW (Japan)', 232.0, 11.5, 5.6, -3.3, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('Japan', 'female', 'adult', 18, 60, 'MHLW (Japan)', 232.0, 11.5, 5.6, -3.3, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- GLOBAL/WHO/FAO EER FORMULAS
-- ========================================
-- Men: (0.063×wt + 2.896)×239
-- Women: (0.062×wt + 2.036)×239
-- Converting to standard format: base + weight_coeff×wt + height_coeff×ht + age_coeff×age
-- Men: 2.896×239 + 0.063×239×wt + 0×ht + 0×age = 692.0 + 15.1×wt
-- Women: 2.036×239 + 0.062×239×wt + 0×ht + 0×age = 487.0 + 14.8×wt
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('WHO', 'male', 'adult', 18, 60, 'WHO/FAO/UNU', 692.0, 15.1, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('WHO', 'female', 'adult', 18, 60, 'WHO/FAO/UNU', 487.0, 14.8, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- SOUTH AFRICA (ZA) - Same as WHO/FAO
-- ========================================
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('ZA', 'male', 'adult', 18, 60, 'WHO/FAO', 692.0, 15.1, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('ZA', 'female', 'adult', 18, 60, 'WHO/FAO', 487.0, 14.8, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- BRAZIL - Same as WHO/FAO
-- ========================================
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('Brazil', 'male', 'adult', 18, 60, 'WHO/FAO', 692.0, 15.1, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400),
('Brazil', 'female', 'adult', 18, 60, 'WHO/FAO', 487.0, 14.8, 0.0, 0.0, NULL, NULL, NULL, NULL, 340, 452, 500, 400);

-- ========================================
-- ADD CHILDREN FORMULAS (9-18 years)
-- ========================================
-- All countries use the same child formulas from CSV:
-- Boys: EER = 88.5 − (61.9 × age) + PAL × ((26.7 × wt) + (903 × ht)) + 25
-- Girls: EER = 135.3 − (30.8 × age) + PAL × ((10.0 × wt) + (934 × ht)) + 25

-- USA Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('USA', 'male', 'child', 9, 18, 'IOM Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('USA', 'female', 'child', 9, 18, 'IOM Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- Canada Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('Canada', 'male', 'child', 9, 18, 'IOM Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('Canada', 'female', 'child', 9, 18, 'IOM Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- UK Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('UK', 'male', 'child', 9, 18, 'SACN Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('UK', 'female', 'child', 9, 18, 'SACN Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- EU Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('EU', 'male', 'child', 9, 18, 'EFSA Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('EU', 'female', 'child', 9, 18, 'EFSA Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- AU/NZ Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('AU/NZ', 'male', 'child', 9, 18, 'NHMRC Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('AU/NZ', 'female', 'child', 9, 18, 'NHMRC Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- Singapore Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('Singapore', 'male', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('Singapore', 'female', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- UAE Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('UAE', 'male', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('UAE', 'female', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- India Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('India', 'male', 'child', 9, 18, 'ICMR-NIN Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('India', 'female', 'child', 9, 18, 'ICMR-NIN Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- Japan Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('Japan', 'male', 'child', 9, 18, 'MHLW Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('Japan', 'female', 'child', 9, 18, 'MHLW Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- WHO Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('WHO', 'male', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('WHO', 'female', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- ZA Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('ZA', 'male', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('ZA', 'female', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- Brazil Children
INSERT INTO eer_formulas (
  country, gender, age_category, age_min, age_max, 
  bmr_formula, bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
  eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
  pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, lactation_0_6_months_kcal, lactation_7_12_months_kcal
) VALUES
('Brazil', 'male', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 88.5, -61.9, 26.7, 903, 0, 0, 0, 0),
('Brazil', 'female', 'child', 9, 18, 'WHO/FAO Child', 0.0, 0.0, 0.0, 0.0, 135.3, -30.8, 10.0, 934, 0, 0, 0, 0);

-- ========================================
-- VERIFICATION QUERY
-- ========================================
-- Run this to verify the data was inserted correctly:
-- SELECT country, gender, age_category, age_min, age_max, bmr_formula, 
--        bmr_constant, bmr_weight_coefficient, bmr_height_coefficient, bmr_age_coefficient,
--        eer_base, eer_age_coefficient, eer_weight_coefficient, eer_height_coefficient,
--        pregnancy_second_trimester_kcal, pregnancy_third_trimester_kcal, 
--        lactation_0_6_months_kcal, lactation_7_12_months_kcal
-- FROM eer_formulas 
-- ORDER BY country, gender, age_category, age_min;

-- ========================================
-- COMMENTS
-- ========================================
COMMENT ON TABLE eer_formulas IS 'EER calculation formulas by country, gender, and age - CORRECTED from actual guidelines';
COMMENT ON COLUMN eer_formulas.eer_base IS 'Base constant for EER calculation (NULL if using BMR × PAL)';
COMMENT ON COLUMN eer_formulas.eer_age_coefficient IS 'Age coefficient for EER calculation (NULL if using BMR × PAL)';
COMMENT ON COLUMN eer_formulas.eer_weight_coefficient IS 'Weight coefficient for EER calculation (NULL if using BMR × PAL)';
COMMENT ON COLUMN eer_formulas.eer_height_coefficient IS 'Height coefficient for EER calculation (NULL if using BMR × PAL)';
