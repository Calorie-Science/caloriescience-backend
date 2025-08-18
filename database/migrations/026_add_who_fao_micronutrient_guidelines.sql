-- Migration 026: Add WHO/FAO Micronutrient Guidelines
-- This migration adds World Health Organization (WHO) and Food and Agriculture Organization (FAO) micronutrient guidelines
-- WHO/FAO uses: RNI (Recommended Nutrient Intake), EAR (Estimated Average Requirement), UL (Upper Level), LRNI (Lower Reference Nutrient Intake)
-- Source: WHO/FAO 2004 Human Vitamin and Mineral Requirements Report

-- WHO/FAO Guidelines - Adult Male (19-50 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'male', 19, 50, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 600, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 5, "ai": null, "ul": 50, "lrni": null},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 10, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 65, "ai": null, "ul": null, "lrni": null},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 1.2, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 1.3, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 16, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 1.3, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 400, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 2.4, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 30, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 5, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 1000, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 580, "ai": null, "ul": null, "lrni": null},
    "magnesium": {"unit": "mg", "ear": null, "rni": 260, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 9.1, "ai": null, "ul": null, "lrni": null, "notes": "15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 7, "ai": null, "ul": null, "lrni": null, "notes": "moderate bioavailability"},
    "copper": {"unit": "mg", "ear": null, "rni": 1.2, "ai": null, "ul": null, "lrni": null},
    "selenium": {"unit": "mcg", "ear": null, "rni": 34, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 150, "ai": null, "ul": null, "lrni": null},
    "sodium": {"unit": "mg", "ear": null, "rni": 1500, "ai": null, "ul": null, "lrni": null},
    "potassium": {"unit": "mg", "ear": null, "rni": 4700, "ai": null, "ul": null, "lrni": null},
    "manganese": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null},
    "chromium": {"unit": "mcg", "ear": null, "rni": 35, "ai": null, "ul": null, "lrni": null},
    "fluoride": {"unit": "mg", "ear": null, "rni": 4, "ai": null, "ul": null, "lrni": null},
    "choline": {"unit": "mg", "ear": null, "rni": 550, "ai": null, "ul": null, "lrni": null}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  NULL
);

-- WHO/FAO Guidelines - Adult Female (19-50 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'female', 19, 50, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 500, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 5, "ai": null, "ul": 50, "lrni": null},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 7.5, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 55, "ai": null, "ul": null, "lrni": null},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 1.1, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 1.1, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 14, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 1.3, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 400, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 2.4, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 30, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 5, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 1000, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 580, "ai": null, "ul": null, "lrni": null},
    "magnesium": {"unit": "mg", "ear": null, "rni": 220, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 19.6, "ai": null, "ul": null, "lrni": null, "notes": "15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 4.9, "ai": null, "ul": null, "lrni": null, "notes": "moderate bioavailability"},
    "copper": {"unit": "mg", "ear": null, "rni": 1.2, "ai": null, "ul": null, "lrni": null},
    "selenium": {"unit": "mcg", "ear": null, "rni": 26, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 150, "ai": null, "ul": null, "lrni": null},
    "sodium": {"unit": "mg", "ear": null, "rni": 1500, "ai": null, "ul": null, "lrni": null},
    "potassium": {"unit": "mg", "ear": null, "rni": 4700, "ai": null, "ul": null, "lrni": null},
    "manganese": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null},
    "chromium": {"unit": "mcg", "ear": null, "rni": 35, "ai": null, "ul": null, "lrni": null},
    "fluoride": {"unit": "mg", "ear": null, "rni": 4, "ai": null, "ul": null, "lrni": null},
    "choline": {"unit": "mg", "ear": null, "rni": 425, "ai": null, "ul": null, "lrni": null}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  NULL
);

-- WHO/FAO Guidelines - Pregnant Women
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'female', 19, 50, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 800, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 5, "ai": null, "ul": 50, "lrni": null},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 7.5, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 55, "ai": null, "ul": null, "lrni": null},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 55, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 1.4, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 1.4, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 18, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 1.9, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 600, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 2.6, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 30, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 6, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 1300, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 580, "ai": null, "ul": null, "lrni": null},
    "magnesium": {"unit": "mg", "ear": null, "rni": 355, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": null, "ai": null, "ul": null, "lrni": null, "notes": "Iron supplementation recommended"},
    "zinc": {"unit": "mg", "ear": null, "rni": 11, "ai": null, "ul": null, "lrni": null},
    "copper": {"unit": "mg", "ear": null, "rni": 1.3, "ai": null, "ul": null, "lrni": null},
    "selenium": {"unit": "mcg", "ear": null, "rni": 60, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 200, "ai": null, "ul": null, "lrni": null},
    "sodium": {"unit": "mg", "ear": null, "rni": 1500, "ai": null, "ul": null, "lrni": null},
    "potassium": {"unit": "mg", "ear": null, "rni": 4700, "ai": null, "ul": null, "lrni": null},
    "manganese": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 50, "ai": null, "ul": null, "lrni": null},
    "chromium": {"unit": "mcg", "ear": null, "rni": 35, "ai": null, "ul": null, "lrni": null},
    "fluoride": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "choline": {"unit": "mg", "ear": null, "rni": 450, "ai": null, "ul": null, "lrni": null}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  'Pregnancy'
);

-- WHO/FAO Guidelines - Lactating Women
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'female', 19, 50, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 850, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 5, "ai": null, "ul": 50, "lrni": null},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 7.5, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 55, "ai": null, "ul": null, "lrni": null},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 70, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 1.5, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 1.6, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 17, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 2.0, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 500, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 2.8, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 35, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 7, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 1000, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 580, "ai": null, "ul": null, "lrni": null},
    "magnesium": {"unit": "mg", "ear": null, "rni": 270, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 10, "ai": null, "ul": null, "lrni": null, "notes": "15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 9.5, "ai": null, "ul": null, "lrni": null, "notes": "moderate bioavailability"},
    "copper": {"unit": "mg", "ear": null, "rni": 1.3, "ai": null, "ul": null, "lrni": null},
    "selenium": {"unit": "mcg", "ear": null, "rni": 35, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 200, "ai": null, "ul": null, "lrni": null},
    "sodium": {"unit": "mg", "ear": null, "rni": 1500, "ai": null, "ul": null, "lrni": null},
    "potassium": {"unit": "mg", "ear": null, "rni": 4700, "ai": null, "ul": null, "lrni": null},
    "manganese": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 50, "ai": null, "ul": null, "lrni": null},
    "chromium": {"unit": "mcg", "ear": null, "rni": 35, "ai": null, "ul": null, "lrni": null},
    "fluoride": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "choline": {"unit": "mg", "ear": null, "rni": 550, "ai": null, "ul": null, "lrni": null}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  'Lactation'
);

-- WHO/FAO Guidelines - Children (1-3 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'male', 1, 3, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 400, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 5, "ai": null, "ul": 50, "lrni": null},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 5, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 15, "ai": null, "ul": null, "lrni": null},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 30, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 0.5, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 0.5, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 6, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 0.5, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 150, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 0.9, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 8, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 2, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 500, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 460, "ai": null, "ul": null, "lrni": null},
    "magnesium": {"unit": "mg", "ear": null, "rni": 60, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 3.9, "ai": null, "ul": null, "lrni": null, "notes": "15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 4, "ai": null, "ul": null, "lrni": null},
    "copper": {"unit": "mg", "ear": null, "rni": 0.4, "ai": null, "ul": null, "lrni": null},
    "selenium": {"unit": "mcg", "ear": null, "rni": 17, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 90, "ai": null, "ul": null, "lrni": null},
    "sodium": {"unit": "mg", "ear": null, "rni": 1000, "ai": null, "ul": null, "lrni": null},
    "potassium": {"unit": "mg", "ear": null, "rni": 3000, "ai": null, "ul": null, "lrni": null},
    "manganese": {"unit": "mg", "ear": null, "rni": 0.5, "ai": null, "ul": null, "lrni": null},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 17, "ai": null, "ul": null, "lrni": null},
    "chromium": {"unit": "mcg", "ear": null, "rni": 11, "ai": null, "ul": null, "lrni": null},
    "fluoride": {"unit": "mg", "ear": null, "rni": 0.7, "ai": null, "ul": null, "lrni": null},
    "choline": {"unit": "mg", "ear": null, "rni": 200, "ai": null, "ul": null, "lrni": null}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  'Both genders; use same values for male and female'
);

-- WHO/FAO Guidelines - Children (4-6 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'male', 4, 6, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 450, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 5, "ai": null, "ul": 50, "lrni": null},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 5, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 20, "ai": null, "ul": null, "lrni": null},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 30, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 0.6, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 0.6, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 8, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 0.6, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 200, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 1.2, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 12, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 600, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 500, "ai": null, "ul": null, "lrni": null},
    "magnesium": {"unit": "mg", "ear": null, "rni": 76, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 4.2, "ai": null, "ul": null, "lrni": null, "notes": "15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 5, "ai": null, "ul": null, "lrni": null},
    "copper": {"unit": "mg", "ear": null, "rni": 0.6, "ai": null, "ul": null, "lrni": null},
    "selenium": {"unit": "mcg", "ear": null, "rni": 22, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 90, "ai": null, "ul": null, "lrni": null},
    "sodium": {"unit": "mg", "ear": null, "rni": 1200, "ai": null, "ul": null, "lrni": null},
    "potassium": {"unit": "mg", "ear": null, "rni": 3800, "ai": null, "ul": null, "lrni": null},
    "manganese": {"unit": "mg", "ear": null, "rni": 1, "ai": null, "ul": null, "lrni": null},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 22, "ai": null, "ul": null, "lrni": null},
    "chromium": {"unit": "mcg", "ear": null, "rni": 15, "ai": null, "ul": null, "lrni": null},
    "fluoride": {"unit": "mg", "ear": null, "rni": 1, "ai": null, "ul": null, "lrni": null},
    "choline": {"unit": "mg", "ear": null, "rni": 250, "ai": null, "ul": null, "lrni": null}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  'Both genders; use same values for male and female'
);

-- WHO/FAO Guidelines - Children (7-9 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'male', 7, 9, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 500, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 5, "ai": null, "ul": 50, "lrni": null},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 7, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 25, "ai": null, "ul": null, "lrni": null},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 35, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 0.9, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 0.9, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 12, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 1, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 300, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 1.8, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 20, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 4, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 700, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 800, "ai": null, "ul": null, "lrni": null},
    "magnesium": {"unit": "mg", "ear": null, "rni": 100, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 5.9, "ai": null, "ul": null, "lrni": null, "notes": "15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 7, "ai": null, "ul": null, "lrni": null},
    "copper": {"unit": "mg", "ear": null, "rni": 0.7, "ai": null, "ul": null, "lrni": null},
    "selenium": {"unit": "mcg", "ear": null, "rni": 21, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 120, "ai": null, "ul": null, "lrni": null},
    "sodium": {"unit": "mg", "ear": null, "rni": 1500, "ai": null, "ul": null, "lrni": null},
    "potassium": {"unit": "mg", "ear": null, "rni": 4500, "ai": null, "ul": null, "lrni": null},
    "manganese": {"unit": "mg", "ear": null, "rni": 1.5, "ai": null, "ul": null, "lrni": null},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 28, "ai": null, "ul": null, "lrni": null},
    "chromium": {"unit": "mcg", "ear": null, "rni": 20, "ai": null, "ul": null, "lrni": null},
    "fluoride": {"unit": "mg", "ear": null, "rni": 1.3, "ai": null, "ul": null, "lrni": null},
    "choline": {"unit": "mg", "ear": null, "rni": 375, "ai": null, "ul": null, "lrni": null}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  'Both genders; use same values for male and female'
);

-- WHO/FAO Guidelines - Adolescent Male (10-18 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'male', 10, 18, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 600, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 5, "ai": null, "ul": 50, "lrni": null},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 10, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 40, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 1.2, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 1.3, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 16, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 1.3, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 400, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 2.4, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 25, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 5, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 1300, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 1150, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "magnesium": {"unit": "mg", "ear": null, "rni": 230, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 9.7, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years; 15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 9, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "copper": {"unit": "mg", "ear": null, "rni": 0.9, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "selenium": {"unit": "mcg", "ear": null, "rni": 32, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 120, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "sodium": {"unit": "mg", "ear": null, "rni": 1500, "ai": null, "ul": null, "lrni": null},
    "potassium": {"unit": "mg", "ear": null, "rni": 4500, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "manganese": {"unit": "mg", "ear": null, "rni": 2, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 34, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "chromium": {"unit": "mcg", "ear": null, "rni": 25, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "fluoride": {"unit": "mg", "ear": null, "rni": 2, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "choline": {"unit": "mg", "ear": null, "rni": 425, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  'Values vary by age within range'
);

-- WHO/FAO Guidelines - Adolescent Female (10-18 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'female', 10, 18, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 600, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 5, "ai": null, "ul": 50, "lrni": null},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 7.5, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 40, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 1.1, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 1, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 16, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 1.2, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 400, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 2.4, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 25, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 5, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 1300, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 1150, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "magnesium": {"unit": "mg", "ear": null, "rni": 220, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 9.3, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years; 15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 8, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "copper": {"unit": "mg", "ear": null, "rni": 0.9, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "selenium": {"unit": "mcg", "ear": null, "rni": 26, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 120, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "sodium": {"unit": "mg", "ear": null, "rni": 1500, "ai": null, "ul": null, "lrni": null},
    "potassium": {"unit": "mg", "ear": null, "rni": 4500, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "manganese": {"unit": "mg", "ear": null, "rni": 2, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 34, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "chromium": {"unit": "mcg", "ear": null, "rni": 25, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "fluoride": {"unit": "mg", "ear": null, "rni": 2, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"},
    "choline": {"unit": "mg", "ear": null, "rni": 425, "ai": null, "ul": null, "lrni": null, "notes": "10-12 years"}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  'Values vary by age within range'
);

-- WHO/FAO Guidelines - Elderly (51+ years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'male', 51, 120, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 600, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 10, "ai": null, "ul": 50, "lrni": null, "notes": "51-65 years"},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 10, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 65, "ai": null, "ul": null, "lrni": null},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 1.2, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 1.3, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 16, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 1.7, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 400, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 2.4, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 30, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 5, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 1300, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 580, "ai": null, "ul": null, "lrni": null},
    "magnesium": {"unit": "mg", "ear": null, "rni": 260, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 9.1, "ai": null, "ul": null, "lrni": null, "notes": "15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 7, "ai": null, "ul": null, "lrni": null, "notes": "moderate bioavailability"},
    "copper": {"unit": "mg", "ear": null, "rni": 1.2, "ai": null, "ul": null, "lrni": null},
    "selenium": {"unit": "mcg", "ear": null, "rni": 34, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 150, "ai": null, "ul": null, "lrni": null},
    "sodium": {"unit": "mg", "ear": null, "rni": 1300, "ai": null, "ul": null, "lrni": null, "notes": "51-70 years"},
    "potassium": {"unit": "mg", "ear": null, "rni": 4700, "ai": null, "ul": null, "lrni": null},
    "manganese": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null},
    "chromium": {"unit": "mcg", "ear": null, "rni": 30, "ai": null, "ul": null, "lrni": null, "notes": "51+ years"},
    "fluoride": {"unit": "mg", "ear": null, "rni": 4, "ai": null, "ul": null, "lrni": null},
    "choline": {"unit": "mg", "ear": null, "rni": 550, "ai": null, "ul": null, "lrni": null}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  'Elderly Male (51+ years)'
);

INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'WHO', 'female', 51, 120, 'WHO_FAO',
  '{
    "vitamin_a": {"unit": "mcg", "ear": null, "rni": 500, "ai": null, "ul": null, "lrni": null},
    "vitamin_d": {"unit": "mcg", "ear": null, "rni": 10, "ai": null, "ul": 50, "lrni": null, "notes": "51-65 years"},
    "vitamin_e": {"unit": "mg", "ear": null, "rni": 7.5, "ai": null, "ul": null, "lrni": null},
    "vitamin_k": {"unit": "mcg", "ear": null, "rni": 55, "ai": null, "ul": null, "lrni": null},
    "vitamin_c": {"unit": "mg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null},
    "thiamin": {"unit": "mg", "ear": null, "rni": 1.1, "ai": null, "ul": null, "lrni": null},
    "riboflavin": {"unit": "mg", "ear": null, "rni": 1.1, "ai": null, "ul": null, "lrni": null},
    "niacin": {"unit": "mg", "ear": null, "rni": 14, "ai": null, "ul": null, "lrni": null},
    "vitamin_b6": {"unit": "mg", "ear": null, "rni": 1.5, "ai": null, "ul": null, "lrni": null},
    "folate": {"unit": "mcg", "ear": null, "rni": 400, "ai": null, "ul": null, "lrni": null},
    "vitamin_b12": {"unit": "mcg", "ear": null, "rni": 2.4, "ai": null, "ul": null, "lrni": null},
    "biotin": {"unit": "mcg", "ear": null, "rni": 30, "ai": null, "ul": null, "lrni": null},
    "pantothenic_acid": {"unit": "mg", "ear": null, "rni": 5, "ai": null, "ul": null, "lrni": null},
    "calcium": {"unit": "mg", "ear": null, "rni": 1300, "ai": null, "ul": null, "lrni": null},
    "phosphorus": {"unit": "mg", "ear": null, "rni": 580, "ai": null, "ul": null, "lrni": null},
    "magnesium": {"unit": "mg", "ear": null, "rni": 220, "ai": null, "ul": null, "lrni": null},
    "iron": {"unit": "mg", "ear": null, "rni": 9.1, "ai": null, "ul": null, "lrni": null, "notes": "Postmenopausal; 15% bioavailability"},
    "zinc": {"unit": "mg", "ear": null, "rni": 4.9, "ai": null, "ul": null, "lrni": null, "notes": "moderate bioavailability"},
    "copper": {"unit": "mg", "ear": null, "rni": 1.2, "ai": null, "ul": null, "lrni": null},
    "selenium": {"unit": "mcg", "ear": null, "rni": 26, "ai": null, "ul": null, "lrni": null},
    "iodine": {"unit": "mcg", "ear": null, "rni": 150, "ai": null, "ul": null, "lrni": null},
    "sodium": {"unit": "mg", "ear": null, "rni": 1300, "ai": null, "ul": null, "lrni": null, "notes": "51-70 years"},
    "potassium": {"unit": "mg", "ear": null, "rni": 4700, "ai": null, "ul": null, "lrni": null},
    "manganese": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "molybdenum": {"unit": "mcg", "ear": null, "rni": 45, "ai": null, "ul": null, "lrni": null},
    "chromium": {"unit": "mcg", "ear": null, "rni": 20, "ai": null, "ul": null, "lrni": null, "notes": "51+ years"},
    "fluoride": {"unit": "mg", "ear": null, "rni": 3, "ai": null, "ul": null, "lrni": null},
    "choline": {"unit": "mg", "ear": null, "rni": 425, "ai": null, "ul": null, "lrni": null}
  }',
  'WHO/FAO 2004 Human Vitamin and Mineral Requirements', 2004,
  'Elderly Female (51+ years)'
);
