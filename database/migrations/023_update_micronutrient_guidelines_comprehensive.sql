-- Migration 023: Update Micronutrient Guidelines with Comprehensive Data
-- This migration updates micronutrient guidelines for US and UK based on latest official guidelines
-- UK uses: RNI (Reference Nutrient Intake), LRNI (Lower Reference Nutrient Intake), SUI (Safe Upper Intake)
-- US uses: RDA (Recommended Dietary Allowance), AI (Adequate Intake), UL (Tolerable Upper Intake Level)

-- First, delete existing guidelines to avoid duplicates
DELETE FROM micronutrient_guidelines_flexible WHERE country IN ('US', 'UK', 'India');

-- US Guidelines - Adult Male (19-30 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'US', 'male', 19, 30, 'US_DRI',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 900, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 15, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 15, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 120, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 90, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.2, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.3, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 16, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.3, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.4, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 400, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 700, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 400, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 8, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 11, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 0.9, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 55, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 150, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 1500, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3400, "ul": null},
    "choline": {"unit": "mg", "rda": null, "ai": 550, "ul": 3500}
  }',
  'DRI Essential Guide (US DRIs)', 2023
);

-- US Guidelines - Adult Female (19-30 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'US', 'female', 19, 30, 'US_DRI',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 700, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 15, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 15, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 90, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 75, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.1, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.1, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 14, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.3, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.4, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 400, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 700, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 310, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 18, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 8, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 0.9, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 55, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 150, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 1500, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 2600, "ul": null},
    "choline": {"unit": "mg", "rda": null, "ai": 425, "ul": 3500}
  }',
  'DRI Essential Guide (US DRIs)', 2023
);

-- US Guidelines - Adult Male (31-50 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'US', 'male', 31, 50, 'US_DRI',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 900, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 15, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 15, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 120, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 90, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.2, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.3, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 16, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.3, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.4, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 400, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 700, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 420, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 8, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 11, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 0.9, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 55, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 150, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 1500, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3400, "ul": null},
    "choline": {"unit": "mg", "rda": null, "ai": 550, "ul": 3500}
  }',
  'DRI Essential Guide (US DRIs)', 2023
);

-- US Guidelines - Adult Female (31-50 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'US', 'female', 31, 50, 'US_DRI',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 700, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 15, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 15, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 90, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 75, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.1, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.1, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 14, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.3, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.4, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 400, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 700, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 320, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 18, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 8, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 0.9, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 55, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 150, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 1500, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 2600, "ul": null},
    "choline": {"unit": "mg", "rda": null, "ai": 425, "ul": 3500}
  }',
  'DRI Essential Guide (US DRIs)', 2023
);

-- US Guidelines - Adult Male (51-70 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'US', 'male', 51, 70, 'US_DRI',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 900, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 15, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 15, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 120, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 90, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.2, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.3, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 16, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.7, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.4, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 400, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2000},
    "phosphorus": {"unit": "mg", "rda": 700, "ai": null, "ul": 3000},
    "magnesium": {"unit": "mg", "rda": 420, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 8, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 11, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 0.9, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 55, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 150, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 1300, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3400, "ul": null},
    "choline": {"unit": "mg", "rda": null, "ai": 550, "ul": 3500}
  }',
  'DRI Essential Guide (US DRIs)', 2023
);

-- US Guidelines - Adult Female (51-70 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'US', 'female', 51, 70, 'US_DRI',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 700, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 15, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 15, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 90, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 75, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.1, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.1, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 14, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.5, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.4, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 400, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1200, "ai": null, "ul": 2000},
    "phosphorus": {"unit": "mg", "rda": 700, "ai": null, "ul": 3000},
    "magnesium": {"unit": "mg", "rda": 320, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 8, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 8, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 0.9, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 55, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 150, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 1300, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 2600, "ul": null},
    "choline": {"unit": "mg", "rda": null, "ai": 425, "ul": 3500}
  }',
  'DRI Essential Guide (US DRIs)', 2023
);

-- UK Guidelines - Adult Male (19-30 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'UK', 'male', 19, 30, 'UK_COMA',
  '{
    "vitamin_a": {"unit": "mcg", "rni": 700, "lrni": 250, "sui": 1500},
    "vitamin_d": {"unit": "mcg", "rni": 10, "lrni": null, "sui": null},
    "vitamin_e": {"unit": "mg", "rni": 10, "lrni": 3, "sui": 540},
    "vitamin_k": {"unit": "mcg", "rni": 108, "lrni": null, "sui": 1000},
    "vitamin_c": {"unit": "mg", "rni": 40, "lrni": 10, "sui": 1000},
    "thiamin": {"unit": "mg", "rni": 1.0, "lrni": 0.23, "sui": 100},
    "riboflavin": {"unit": "mg", "rni": 1.3, "lrni": 0.8, "sui": 40},
    "niacin": {"unit": "mg", "rni": 17, "lrni": 7.2, "sui": 500},
    "vitamin_b6": {"unit": "mg", "rni": 1.4, "lrni": 0.68, "sui": 10},
    "vitamin_b12": {"unit": "mcg", "rni": 1.5, "lrni": 1.0, "sui": 2000},
    "folate": {"unit": "mcg", "rni": 200, "lrni": 100, "sui": 1000},
    "biotin": {"unit": "mcg", "rni": null, "lrni": null, "sui": 900},
    "pantothenic_acid": {"unit": "mg", "rni": null, "lrni": null, "sui": 200},
    "calcium": {"unit": "mg", "rni": 700, "lrni": null, "sui": null},
    "phosphorus": {"unit": "mg", "rni": 550, "lrni": null, "sui": null},
    "magnesium": {"unit": "mg", "rni": 300, "lrni": null, "sui": null},
    "iron": {"unit": "mg", "rni": 8.7, "lrni": null, "sui": null},
    "zinc": {"unit": "mg", "rni": 9.5, "lrni": null, "sui": 25},
    "copper": {"unit": "mg", "rni": 1.2, "lrni": null, "sui": 10},
    "selenium": {"unit": "mcg", "rni": 75, "lrni": null, "sui": 400},
    "iodine": {"unit": "mcg", "rni": 140, "lrni": null, "sui": null},
    "sodium": {"unit": "mg", "rni": 1600, "lrni": null, "sui": null},
    "potassium": {"unit": "mg", "rni": 3500, "lrni": null, "sui": null}
  }',
  'BNF Nutrition Requirements; EVM 2003', 2023
);

-- UK Guidelines - Adult Female (19-30 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'UK', 'female', 19, 30, 'UK_COMA',
  '{
    "vitamin_a": {"unit": "mcg", "rni": 600, "lrni": 250, "sui": 1500},
    "vitamin_d": {"unit": "mcg", "rni": 10, "lrni": null, "sui": null},
    "vitamin_e": {"unit": "mg", "rni": 10, "lrni": 3, "sui": 540},
    "vitamin_k": {"unit": "mcg", "rni": 90, "lrni": null, "sui": 1000},
    "vitamin_c": {"unit": "mg", "rni": 40, "lrni": 10, "sui": 1000},
    "thiamin": {"unit": "mg", "rni": 0.8, "lrni": 0.23, "sui": 100},
    "riboflavin": {"unit": "mg", "rni": 1.1, "lrni": 0.8, "sui": 40},
    "niacin": {"unit": "mg", "rni": 13, "lrni": 7.2, "sui": 500},
    "vitamin_b6": {"unit": "mg", "rni": 1.2, "lrni": 0.68, "sui": 10},
    "vitamin_b12": {"unit": "mcg", "rni": 1.5, "lrni": 1.0, "sui": 2000},
    "folate": {"unit": "mcg", "rni": 200, "lrni": 100, "sui": 1000},
    "biotin": {"unit": "mcg", "rni": null, "lrni": null, "sui": 900},
    "pantothenic_acid": {"unit": "mg", "rni": null, "lrni": null, "sui": 200},
    "calcium": {"unit": "mg", "rni": 700, "lrni": null, "sui": null},
    "phosphorus": {"unit": "mg", "rni": 550, "lrni": null, "sui": null},
    "magnesium": {"unit": "mg", "rni": 270, "lrni": null, "sui": null},
    "iron": {"unit": "mg", "rni": 14.8, "lrni": null, "sui": null},
    "zinc": {"unit": "mg", "rni": 7.0, "lrni": null, "sui": 25},
    "copper": {"unit": "mg", "rni": 1.2, "lrni": null, "sui": 10},
    "selenium": {"unit": "mcg", "rni": 60, "lrni": null, "sui": 400},
    "iodine": {"unit": "mcg", "rni": 140, "lrni": null, "sui": null},
    "sodium": {"unit": "mg", "rni": 1600, "lrni": null, "sui": null},
    "potassium": {"unit": "mg", "rni": 3500, "lrni": null, "sui": null}
  }',
  'BNF Nutrition Requirements; EVM 2003', 2023
);

-- UK Guidelines - Adult Male (31-50 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'UK', 'male', 31, 50, 'UK_COMA',
  '{
    "vitamin_a": {"unit": "mcg", "rni": 700, "lrni": 250, "sui": 1500},
    "vitamin_d": {"unit": "mcg", "rni": 10, "lrni": null, "sui": null},
    "vitamin_e": {"unit": "mg", "rni": 10, "lrni": 3, "sui": 540},
    "vitamin_k": {"unit": "mcg", "rni": 108, "lrni": null, "sui": 1000},
    "vitamin_c": {"unit": "mg", "rni": 40, "lrni": 10, "sui": 1000},
    "thiamin": {"unit": "mg", "rni": 1.0, "lrni": 0.23, "sui": 100},
    "riboflavin": {"unit": "mg", "rni": 1.3, "lrni": 0.8, "sui": 40},
    "niacin": {"unit": "mg", "rni": 16.5, "lrni": 7.2, "sui": 500},
    "vitamin_b6": {"unit": "mg", "rni": 1.4, "lrni": 0.68, "sui": 10},
    "vitamin_b12": {"unit": "mcg", "rni": 1.5, "lrni": 1.0, "sui": 2000},
    "folate": {"unit": "mcg", "rni": 200, "lrni": 100, "sui": 1000},
    "biotin": {"unit": "mcg", "rni": null, "lrni": null, "sui": 900},
    "pantothenic_acid": {"unit": "mg", "rni": null, "lrni": null, "sui": 200},
    "calcium": {"unit": "mg", "rni": 700, "lrni": null, "sui": null},
    "phosphorus": {"unit": "mg", "rni": 550, "lrni": null, "sui": null},
    "magnesium": {"unit": "mg", "rni": 300, "lrni": null, "sui": null},
    "iron": {"unit": "mg", "rni": 8.7, "lrni": null, "sui": null},
    "zinc": {"unit": "mg", "rni": 9.5, "lrni": null, "sui": 25},
    "copper": {"unit": "mg", "rni": 1.2, "lrni": null, "sui": 10},
    "selenium": {"unit": "mcg", "rni": 75, "lrni": null, "sui": 400},
    "iodine": {"unit": "mcg", "rni": 140, "lrni": null, "sui": null},
    "sodium": {"unit": "mg", "rni": 1600, "lrni": null, "sui": null},
    "potassium": {"unit": "mg", "rni": 3500, "lrni": null, "sui": null}
  }',
  'BNF Nutrition Requirements; EVM 2003', 2023
);

-- UK Guidelines - Adult Female (31-50 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'UK', 'female', 31, 50, 'UK_COMA',
  '{
    "vitamin_a": {"unit": "mcg", "rni": 600, "lrni": 250, "sui": 1500},
    "vitamin_d": {"unit": "mcg", "rni": 10, "lrni": null, "sui": null},
    "vitamin_e": {"unit": "mg", "rni": 10, "lrni": 3, "sui": 540},
    "vitamin_k": {"unit": "mcg", "rni": 90, "lrni": null, "sui": 1000},
    "vitamin_c": {"unit": "mg", "rni": 40, "lrni": 10, "sui": 1000},
    "thiamin": {"unit": "mg", "rni": 0.8, "lrni": 0.23, "sui": 100},
    "riboflavin": {"unit": "mg", "rni": 1.1, "lrni": 0.8, "sui": 40},
    "niacin": {"unit": "mg", "rni": 13, "lrni": 7.2, "sui": 500},
    "vitamin_b6": {"unit": "mg", "rni": 1.2, "lrni": 0.68, "sui": 10},
    "vitamin_b12": {"unit": "mcg", "rni": 1.5, "lrni": 1.0, "sui": 2000},
    "folate": {"unit": "mcg", "rni": 200, "lrni": 100, "sui": 1000},
    "biotin": {"unit": "mcg", "rni": null, "lrni": null, "sui": 900},
    "pantothenic_acid": {"unit": "mg", "rni": null, "lrni": null, "sui": 200},
    "calcium": {"unit": "mg", "rni": 700, "lrni": null, "sui": null},
    "phosphorus": {"unit": "mg", "rni": 550, "lrni": null, "sui": null},
    "magnesium": {"unit": "mg", "rni": 270, "lrni": null, "sui": null},
    "iron": {"unit": "mg", "rni": 14.8, "lrni": null, "sui": null},
    "zinc": {"unit": "mg", "rni": 7.0, "lrni": null, "sui": 25},
    "copper": {"unit": "mg", "rni": 1.2, "lrni": null, "sui": 10},
    "selenium": {"unit": "mcg", "rni": 60, "lrni": null, "sui": 400},
    "iodine": {"unit": "mcg", "rni": 140, "lrni": null, "sui": null},
    "sodium": {"unit": "mg", "rni": 1600, "lrni": null, "sui": null},
    "potassium": {"unit": "mg", "rni": 3500, "lrni": null, "sui": null}
  }',
  'BNF Nutrition Requirements; EVM 2003', 2023
);

-- UK Guidelines - Adult Male (51-70 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'UK', 'male', 51, 70, 'UK_COMA',
  '{
    "vitamin_a": {"unit": "mcg", "rni": 700, "lrni": 250, "sui": 1500},
    "vitamin_d": {"unit": "mcg", "rni": 10, "lrni": null, "sui": null},
    "vitamin_e": {"unit": "mg", "rni": 10, "lrni": 3, "sui": 540},
    "vitamin_k": {"unit": "mcg", "rni": 108, "lrni": null, "sui": 1000},
    "vitamin_c": {"unit": "mg", "rni": 40, "lrni": 10, "sui": 1000},
    "thiamin": {"unit": "mg", "rni": 0.9, "lrni": 0.23, "sui": 100},
    "riboflavin": {"unit": "mg", "rni": 1.3, "lrni": 0.8, "sui": 40},
    "niacin": {"unit": "mg", "rni": 16, "lrni": 7.2, "sui": 500},
    "vitamin_b6": {"unit": "mg", "rni": 1.4, "lrni": 0.68, "sui": 10},
    "vitamin_b12": {"unit": "mcg", "rni": 1.5, "lrni": 1.0, "sui": 2000},
    "folate": {"unit": "mcg", "rni": 200, "lrni": 100, "sui": 1000},
    "biotin": {"unit": "mcg", "rni": null, "lrni": null, "sui": 900},
    "pantothenic_acid": {"unit": "mg", "rni": null, "lrni": null, "sui": 200},
    "calcium": {"unit": "mg", "rni": 700, "lrni": null, "sui": null},
    "phosphorus": {"unit": "mg", "rni": 550, "lrni": null, "sui": null},
    "magnesium": {"unit": "mg", "rni": 300, "lrni": null, "sui": null},
    "iron": {"unit": "mg", "rni": 8.7, "lrni": null, "sui": null},
    "zinc": {"unit": "mg", "rni": 9.5, "lrni": null, "sui": 25},
    "copper": {"unit": "mg", "rni": 1.2, "lrni": null, "sui": 10},
    "selenium": {"unit": "mcg", "rni": 75, "lrni": null, "sui": 400},
    "iodine": {"unit": "mcg", "rni": 140, "lrni": null, "sui": null},
    "sodium": {"unit": "mg", "rni": 1600, "lrni": null, "sui": null},
    "potassium": {"unit": "mg", "rni": 3500, "lrni": null, "sui": null}
  }',
  'BNF Nutrition Requirements; EVM 2003', 2023
);

-- UK Guidelines - Adult Female (51-70 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'UK', 'female', 51, 70, 'UK_COMA',
  '{
    "vitamin_a": {"unit": "mcg", "rni": 600, "lrni": 250, "sui": 1500},
    "vitamin_d": {"unit": "mcg", "rni": 10, "lrni": null, "sui": null},
    "vitamin_e": {"unit": "mg", "rni": 10, "lrni": 3, "sui": 540},
    "vitamin_k": {"unit": "mcg", "rni": 90, "lrni": null, "sui": 1000},
    "vitamin_c": {"unit": "mg", "rni": 40, "lrni": 10, "sui": 1000},
    "thiamin": {"unit": "mg", "rni": 0.8, "lrni": 0.23, "sui": 100},
    "riboflavin": {"unit": "mg", "rni": 1.1, "lrni": 0.8, "sui": 40},
    "niacin": {"unit": "mg", "rni": 12, "lrni": 7.2, "sui": 500},
    "vitamin_b6": {"unit": "mg", "rni": 1.2, "lrni": 0.68, "sui": 10},
    "vitamin_b12": {"unit": "mcg", "rni": 1.5, "lrni": 1.0, "sui": 2000},
    "folate": {"unit": "mcg", "rni": 200, "lrni": 100, "sui": 1000},
    "biotin": {"unit": "mcg", "rni": null, "lrni": null, "sui": 900},
    "pantothenic_acid": {"unit": "mg", "rni": null, "lrni": null, "sui": 200},
    "calcium": {"unit": "mg", "rni": 700, "lrni": null, "sui": null},
    "phosphorus": {"unit": "mg", "rni": 550, "lrni": null, "sui": null},
    "magnesium": {"unit": "mg", "rni": 270, "lrni": null, "sui": null},
    "iron": {"unit": "mg", "rni": 8.7, "lrni": null, "sui": null},
    "zinc": {"unit": "mg", "rni": 7.0, "lrni": null, "sui": 25},
    "copper": {"unit": "mg", "rni": 1.2, "lrni": null, "sui": 10},
    "selenium": {"unit": "mcg", "rni": 60, "lrni": null, "sui": 400},
    "iodine": {"unit": "mcg", "rni": 140, "lrni": null, "sui": null},
    "sodium": {"unit": "mg", "rni": 1600, "lrni": null, "sui": null},
    "potassium": {"unit": "mg", "rni": 3500, "lrni": null, "sui": null}
  }',
  'BNF Nutrition Requirements; EVM 2003', 2023
);

-- Add pregnancy guidelines for US
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'US', 'female', 19, 50, 'US_DRI',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 770, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 15, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 15, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 90, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 85, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.4, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.4, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 18, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.9, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.6, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 600, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 6, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 700, "ai": null, "ul": 3500},
    "magnesium": {"unit": "mg", "rda": 360, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 27, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 11, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 1.0, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 60, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 220, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 1500, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 2900, "ul": null},
    "choline": {"unit": "mg", "rda": null, "ai": 450, "ul": 3500}
  }',
  'DRI Essential Guide (US DRIs)', 2023,
  'Pregnancy guidelines'
);

-- Add lactation guidelines for US
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'US', 'female', 19, 50, 'US_DRI',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 1300, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 15, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 19, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 90, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 120, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.4, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.6, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 17, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 2.0, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.8, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 500, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 35, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 7, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 700, "ai": null, "ul": 3500},
    "magnesium": {"unit": "mg", "rda": 320, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 9, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 12, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 1.3, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 70, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 290, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 1500, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 2800, "ul": null},
    "choline": {"unit": "mg", "rda": null, "ai": 550, "ul": 3500}
  }',
  'DRI Essential Guide (US DRIs)', 2023,
  'Lactation guidelines'
);

-- India Guidelines - Pregnancy
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'India', 'female', 19, 50, 'INDIA_ICMR',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 900, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 10, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 8, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 55, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 55, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.4, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.6, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 16, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 2.1, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.2, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 570, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 6, "ul": null},
    "calcium": {"unit": "mg", "rda": 1200, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 800, "ai": null, "ul": 3500},
    "magnesium": {"unit": "mg", "rda": 350, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 35, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 12, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 2.5, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 40, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 200, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 2000, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3500, "ul": null}
  }',
  'ICMR-NIN Expert Group on Nutrient Requirements', 2023,
  'Pregnancy guidelines'
);

-- India Guidelines - Lactation
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'India', 'female', 19, 50, 'INDIA_ICMR',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 1350, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 10, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 10, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 55, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 75, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.7, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.9, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 20, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 2.1, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.5, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 500, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 35, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 7, "ul": null},
    "calcium": {"unit": "mg", "rda": 1200, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 800, "ai": null, "ul": 3500},
    "magnesium": {"unit": "mg", "rda": 350, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 25, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 13, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 2.8, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 70, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 280, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 2000, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3800, "ul": null}
  }',
  'ICMR-NIN Expert Group on Nutrient Requirements', 2023,
  'Lactation guidelines'
);

-- India Guidelines - Adult Male (19-30 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'India', 'male', 19, 30, 'INDIA_ICMR',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 900, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 10, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 10, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 55, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 40, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.2, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.6, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 16, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.6, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.2, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 300, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 800, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 340, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 19, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 13, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 2.0, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 40, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 140, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 2000, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3500, "ul": null}
  }',
  'ICMR-NIN Expert Group on Nutrient Requirements', 2023
);

-- India Guidelines - Adult Female (19-30 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'India', 'female', 19, 30, 'INDIA_ICMR',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 840, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 10, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 8, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 55, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 40, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.0, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.3, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 13, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.6, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.2, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 300, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 800, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 290, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 29, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 11, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 2.0, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 40, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 140, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 2000, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3500, "ul": null}
  }',
  'ICMR-NIN Expert Group on Nutrient Requirements', 2023
);

-- India Guidelines - Adult Male (31-50 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'India', 'male', 31, 50, 'INDIA_ICMR',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 900, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 10, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 10, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 55, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 40, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.2, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.6, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 16, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.6, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.2, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 300, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 800, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 340, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 19, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 13, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 2.0, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 40, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 140, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 2000, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3500, "ul": null}
  }',
  'ICMR-NIN Expert Group on Nutrient Requirements', 2023
);

-- India Guidelines - Adult Female (31-50 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'India', 'female', 31, 50, 'INDIA_ICMR',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 840, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 10, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 8, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 55, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 40, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.0, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.3, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 13, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.6, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.2, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 300, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 800, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 290, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 29, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 11, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 2.0, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 40, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 140, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 2000, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3500, "ul": null}
  }',
  'ICMR-NIN Expert Group on Nutrient Requirements', 2023
);

-- India Guidelines - Adult Male (51-70 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'India', 'male', 51, 70, 'INDIA_ICMR',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 900, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 10, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 10, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 55, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 40, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 1.1, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.5, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 15, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.6, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.2, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 300, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 800, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 320, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 19, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 12, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 2.0, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 40, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 140, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 2000, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3500, "ul": null}
  }',
  'ICMR-NIN Expert Group on Nutrient Requirements', 2023
);

-- India Guidelines - Adult Female (51-70 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year
) VALUES (
  'India', 'female', 51, 70, 'INDIA_ICMR',
  '{
    "vitamin_a": {"unit": "mcg", "rda": 840, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "rda": 10, "ai": null, "ul": 100},
    "vitamin_e": {"unit": "mg", "rda": 8, "ai": null, "ul": 1000},
    "vitamin_k": {"unit": "mcg", "rda": null, "ai": 55, "ul": null},
    "vitamin_c": {"unit": "mg", "rda": 40, "ai": null, "ul": 2000},
    "thiamin": {"unit": "mg", "rda": 0.9, "ai": null, "ul": null},
    "riboflavin": {"unit": "mg", "rda": 1.2, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "rda": 12, "ai": null, "ul": 35},
    "vitamin_b6": {"unit": "mg", "rda": 1.6, "ai": null, "ul": 100},
    "vitamin_b12": {"unit": "mcg", "rda": 2.2, "ai": null, "ul": null},
    "folate": {"unit": "mcg", "rda": 300, "ai": null, "ul": 1000},
    "biotin": {"unit": "mcg", "rda": null, "ai": 30, "ul": null},
    "pantothenic_acid": {"unit": "mg", "rda": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "rda": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "rda": 800, "ai": null, "ul": 4000},
    "magnesium": {"unit": "mg", "rda": 270, "ai": null, "ul": 350},
    "iron": {"unit": "mg", "rda": 19, "ai": null, "ul": 45},
    "zinc": {"unit": "mg", "rda": 10, "ai": null, "ul": 40},
    "copper": {"unit": "mg", "rda": 2.0, "ai": null, "ul": 10},
    "selenium": {"unit": "mcg", "rda": 40, "ai": null, "ul": 400},
    "iodine": {"unit": "mcg", "rda": 140, "ai": null, "ul": 1100},
    "sodium": {"unit": "mg", "rda": null, "ai": 2000, "ul": 2300},
    "potassium": {"unit": "mg", "rda": null, "ai": 3500, "ul": null}
  }',
  'ICMR-NIN Expert Group on Nutrient Requirements', 2023
);

-- Add update trigger
CREATE OR REPLACE FUNCTION update_micronutrient_guidelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_micronutrient_guidelines_flexible_updated ON micronutrient_guidelines_flexible;
CREATE TRIGGER update_micronutrient_guidelines_flexible_updated
BEFORE UPDATE ON micronutrient_guidelines_flexible
FOR EACH ROW
EXECUTE FUNCTION update_micronutrient_guidelines_updated_at(); 