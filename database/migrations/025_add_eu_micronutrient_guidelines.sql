-- Migration 025: Add EU (EFSA) Micronutrient Guidelines
-- This migration adds European Food Safety Authority (EFSA) micronutrient guidelines
-- EU uses: PRI (Population Reference Intake), AR (Average Requirement), AI (Adequate Intake), UL (Tolerable Upper Level)
-- PRI is conceptually equivalent to RNI/RDA, AR is equivalent to EAR

-- EU Guidelines - Adult Male (18-24 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'EU', 'male', 18, 24, 'EFSA_DRV',
  '{
    "vitamin_a": {"unit": "mcg", "ar": 570, "pri": 750, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "ar": null, "pri": null, "ai": 15, "ul": 100},
    "vitamin_e": {"unit": "mg", "ar": null, "pri": null, "ai": 13, "ul": 300},
    "vitamin_k": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": null},
    "vitamin_c": {"unit": "mg", "ar": 90, "pri": 110, "ai": null, "ul": null},
    "thiamin": {"unit": "mg", "ar": 0.072, "pri": 0.1, "ai": null, "ul": null, "notes": "per MJ"},
    "riboflavin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": 10, "notes": "per MJ; UL for nicotinic acid"},
    "vitamin_b6": {"unit": "mg", "ar": 1.5, "pri": 1.7, "ai": null, "ul": 12},
    "folate": {"unit": "mcg", "ar": 250, "pri": 330, "ai": null, "ul": 1000},
    "vitamin_b12": {"unit": "mcg", "ar": null, "pri": null, "ai": 4, "ul": null},
    "biotin": {"unit": "mcg", "ar": null, "pri": null, "ai": 40, "ul": null},
    "pantothenic_acid": {"unit": "mg", "ar": null, "pri": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "ar": 860, "pri": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "ar": null, "pri": null, "ai": 550, "ul": null},
    "magnesium": {"unit": "mg", "ar": null, "pri": null, "ai": 350, "ul": 250, "notes": "UL for supplements only"},
    "iron": {"unit": "mg", "ar": 6, "pri": 11, "ai": null, "ul": null},
    "zinc": {"unit": "mg", "ar": 7.5, "pri": 9.4, "ai": null, "ul": 25, "notes": "LPI 300mg/day"},
    "copper": {"unit": "mg", "ar": null, "pri": null, "ai": 1.6, "ul": 5},
    "manganese": {"unit": "mg", "ar": null, "pri": null, "ai": 3, "ul": null},
    "selenium": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": 255},
    "iodine": {"unit": "mcg", "ar": null, "pri": null, "ai": 150, "ul": 600},
    "sodium": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 2},
    "chloride": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 3.1},
    "potassium": {"unit": "mg", "ar": null, "pri": null, "ai": 3500, "ul": null},
    "fluoride": {"unit": "mg", "ar": null, "pri": null, "ai": 3.4, "ul": 7},
    "molybdenum": {"unit": "mcg", "ar": null, "pri": null, "ai": 65, "ul": 600},
    "choline": {"unit": "mg", "ar": null, "pri": null, "ai": 400, "ul": null}
  }',
  'EFSA Dietary Reference Values', 2023,
  NULL
);

-- EU Guidelines - Adult Male (≥25 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'EU', 'male', 25, 120, 'EFSA_DRV',
  '{
    "vitamin_a": {"unit": "mcg", "ar": 570, "pri": 750, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "ar": null, "pri": null, "ai": 15, "ul": 100},
    "vitamin_e": {"unit": "mg", "ar": null, "pri": null, "ai": 13, "ul": 300},
    "vitamin_k": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": null},
    "vitamin_c": {"unit": "mg", "ar": 90, "pri": 110, "ai": null, "ul": null},
    "thiamin": {"unit": "mg", "ar": 0.072, "pri": 0.1, "ai": null, "ul": null, "notes": "per MJ"},
    "riboflavin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": 10, "notes": "per MJ; UL for nicotinic acid"},
    "vitamin_b6": {"unit": "mg", "ar": 1.5, "pri": 1.7, "ai": null, "ul": 12},
    "folate": {"unit": "mcg", "ar": 250, "pri": 330, "ai": null, "ul": 1000},
    "vitamin_b12": {"unit": "mcg", "ar": null, "pri": null, "ai": 4, "ul": null},
    "biotin": {"unit": "mcg", "ar": null, "pri": null, "ai": 40, "ul": null},
    "pantothenic_acid": {"unit": "mg", "ar": null, "pri": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "ar": 750, "pri": 950, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "ar": null, "pri": null, "ai": 550, "ul": null},
    "magnesium": {"unit": "mg", "ar": null, "pri": null, "ai": 350, "ul": 250, "notes": "UL for supplements only"},
    "iron": {"unit": "mg", "ar": 6, "pri": 11, "ai": null, "ul": null},
    "zinc": {"unit": "mg", "ar": 7.5, "pri": 9.4, "ai": null, "ul": 25, "notes": "LPI 300mg/day"},
    "copper": {"unit": "mg", "ar": null, "pri": null, "ai": 1.6, "ul": 5},
    "manganese": {"unit": "mg", "ar": null, "pri": null, "ai": 3, "ul": null},
    "selenium": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": 255},
    "iodine": {"unit": "mcg", "ar": null, "pri": null, "ai": 150, "ul": 600},
    "sodium": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 2},
    "chloride": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 3.1},
    "potassium": {"unit": "mg", "ar": null, "pri": null, "ai": 3500, "ul": null},
    "fluoride": {"unit": "mg", "ar": null, "pri": null, "ai": 3.4, "ul": 7},
    "molybdenum": {"unit": "mcg", "ar": null, "pri": null, "ai": 65, "ul": 600},
    "choline": {"unit": "mg", "ar": null, "pri": null, "ai": 400, "ul": null}
  }',
  'EFSA Dietary Reference Values', 2023,
  NULL
);

-- EU Guidelines - Adult Female (18-24 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'EU', 'female', 18, 24, 'EFSA_DRV',
  '{
    "vitamin_a": {"unit": "mcg", "ar": 490, "pri": 650, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "ar": null, "pri": null, "ai": 15, "ul": 100},
    "vitamin_e": {"unit": "mg", "ar": null, "pri": null, "ai": 11, "ul": 300},
    "vitamin_k": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": null},
    "vitamin_c": {"unit": "mg", "ar": 80, "pri": 95, "ai": null, "ul": null},
    "thiamin": {"unit": "mg", "ar": 0.072, "pri": 0.1, "ai": null, "ul": null, "notes": "per MJ"},
    "riboflavin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": 10, "notes": "per MJ; UL for nicotinic acid"},
    "vitamin_b6": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": 12},
    "folate": {"unit": "mcg", "ar": 250, "pri": 330, "ai": null, "ul": 1000},
    "vitamin_b12": {"unit": "mcg", "ar": null, "pri": null, "ai": 4, "ul": null},
    "biotin": {"unit": "mcg", "ar": null, "pri": null, "ai": 40, "ul": null},
    "pantothenic_acid": {"unit": "mg", "ar": null, "pri": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "ar": 860, "pri": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "ar": null, "pri": null, "ai": 550, "ul": null},
    "magnesium": {"unit": "mg", "ar": null, "pri": null, "ai": 300, "ul": 250, "notes": "UL for supplements only"},
    "iron": {"unit": "mg", "ar": 7, "pri": 16, "ai": null, "ul": null, "notes": "Premenopausal"},
    "zinc": {"unit": "mg", "ar": 6.2, "pri": 7.5, "ai": null, "ul": 25, "notes": "LPI 300mg/day"},
    "copper": {"unit": "mg", "ar": null, "pri": null, "ai": 1.3, "ul": 5},
    "manganese": {"unit": "mg", "ar": null, "pri": null, "ai": 3, "ul": null},
    "selenium": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": 255},
    "iodine": {"unit": "mcg", "ar": null, "pri": null, "ai": 150, "ul": 600},
    "sodium": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 2},
    "chloride": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 3.1},
    "potassium": {"unit": "mg", "ar": null, "pri": null, "ai": 3500, "ul": null},
    "fluoride": {"unit": "mg", "ar": null, "pri": null, "ai": 2.9, "ul": 7},
    "molybdenum": {"unit": "mcg", "ar": null, "pri": null, "ai": 65, "ul": 600},
    "choline": {"unit": "mg", "ar": null, "pri": null, "ai": 400, "ul": null}
  }',
  'EFSA Dietary Reference Values', 2023,
  NULL
);

-- EU Guidelines - Adult Female (≥25 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'EU', 'female', 25, 120, 'EFSA_DRV',
  '{
    "vitamin_a": {"unit": "mcg", "ar": 490, "pri": 650, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "ar": null, "pri": null, "ai": 15, "ul": 100},
    "vitamin_e": {"unit": "mg", "ar": null, "pri": null, "ai": 11, "ul": 300},
    "vitamin_k": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": null},
    "vitamin_c": {"unit": "mg", "ar": 80, "pri": 95, "ai": null, "ul": null},
    "thiamin": {"unit": "mg", "ar": 0.072, "pri": 0.1, "ai": null, "ul": null, "notes": "per MJ"},
    "riboflavin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": 10, "notes": "per MJ; UL for nicotinic acid"},
    "vitamin_b6": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": 12},
    "folate": {"unit": "mcg", "ar": 250, "pri": 330, "ai": null, "ul": 1000},
    "vitamin_b12": {"unit": "mcg", "ar": null, "pri": null, "ai": 4, "ul": null},
    "biotin": {"unit": "mcg", "ar": null, "pri": null, "ai": 40, "ul": null},
    "pantothenic_acid": {"unit": "mg", "ar": null, "pri": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "ar": 750, "pri": 950, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "ar": null, "pri": null, "ai": 550, "ul": null},
    "magnesium": {"unit": "mg", "ar": null, "pri": null, "ai": 300, "ul": 250, "notes": "UL for supplements only"},
    "iron": {"unit": "mg", "ar": 7, "pri": 16, "ai": null, "ul": null, "notes": "Premenopausal"},
    "zinc": {"unit": "mg", "ar": 6.2, "pri": 7.5, "ai": null, "ul": 25, "notes": "LPI 300mg/day"},
    "copper": {"unit": "mg", "ar": null, "pri": null, "ai": 1.3, "ul": 5},
    "manganese": {"unit": "mg", "ar": null, "pri": null, "ai": 3, "ul": null},
    "selenium": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": 255},
    "iodine": {"unit": "mcg", "ar": null, "pri": null, "ai": 150, "ul": 600},
    "sodium": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 2},
    "chloride": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 3.1},
    "potassium": {"unit": "mg", "ar": null, "pri": null, "ai": 3500, "ul": null},
    "fluoride": {"unit": "mg", "ar": null, "pri": null, "ai": 2.9, "ul": 7},
    "molybdenum": {"unit": "mcg", "ar": null, "pri": null, "ai": 65, "ul": 600},
    "choline": {"unit": "mg", "ar": null, "pri": null, "ai": 400, "ul": null}
  }',
  'EFSA Dietary Reference Values', 2023,
  NULL
);

-- EU Guidelines - Pregnant Women (18-24 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'EU', 'female', 18, 24, 'EFSA_DRV',
  '{
    "vitamin_a": {"unit": "mcg", "ar": 540, "pri": 700, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "ar": null, "pri": null, "ai": 15, "ul": 100},
    "vitamin_e": {"unit": "mg", "ar": null, "pri": null, "ai": 11, "ul": 300},
    "vitamin_k": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": null},
    "vitamin_c": {"unit": "mg", "ar": null, "pri": 105, "ai": null, "ul": null},
    "thiamin": {"unit": "mg", "ar": 0.072, "pri": 0.1, "ai": null, "ul": null, "notes": "per MJ"},
    "riboflavin": {"unit": "mg", "ar": 1.5, "pri": 1.9, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": null, "notes": "per MJ"},
    "vitamin_b6": {"unit": "mg", "ar": 1.5, "pri": 1.8, "ai": null, "ul": 12},
    "folate": {"unit": "mcg", "ar": null, "pri": null, "ai": 600, "ul": 1000},
    "vitamin_b12": {"unit": "mcg", "ar": null, "pri": null, "ai": 4.5, "ul": null},
    "biotin": {"unit": "mcg", "ar": null, "pri": null, "ai": 40, "ul": null},
    "pantothenic_acid": {"unit": "mg", "ar": null, "pri": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "ar": 860, "pri": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "ar": null, "pri": null, "ai": 550, "ul": null},
    "magnesium": {"unit": "mg", "ar": null, "pri": null, "ai": 300, "ul": 250, "notes": "UL for supplements only"},
    "iron": {"unit": "mg", "ar": 7, "pri": 16, "ai": null, "ul": null},
    "zinc": {"unit": "mg", "ar": 7.5, "pri": 9.1, "ai": null, "ul": 25, "notes": "+1.6 mg/day"},
    "copper": {"unit": "mg", "ar": null, "pri": null, "ai": 1.5, "ul": null},
    "manganese": {"unit": "mg", "ar": null, "pri": null, "ai": 3, "ul": null},
    "selenium": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": 255},
    "iodine": {"unit": "mcg", "ar": null, "pri": null, "ai": 200, "ul": 600},
    "sodium": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 2},
    "chloride": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 3.1},
    "potassium": {"unit": "mg", "ar": null, "pri": null, "ai": 3500, "ul": null},
    "fluoride": {"unit": "mg", "ar": null, "pri": null, "ai": 2.9, "ul": 7},
    "molybdenum": {"unit": "mcg", "ar": null, "pri": null, "ai": 65, "ul": 600},
    "choline": {"unit": "mg", "ar": null, "pri": null, "ai": 480, "ul": null}
  }',
  'EFSA Dietary Reference Values', 2023,
  'Pregnancy'
);

-- EU Guidelines - Pregnant Women (≥25 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'EU', 'female', 25, 120, 'EFSA_DRV',
  '{
    "vitamin_a": {"unit": "mcg", "ar": 540, "pri": 700, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "ar": null, "pri": null, "ai": 15, "ul": 100},
    "vitamin_e": {"unit": "mg", "ar": null, "pri": null, "ai": 11, "ul": 300},
    "vitamin_k": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": null},
    "vitamin_c": {"unit": "mg", "ar": null, "pri": 105, "ai": null, "ul": null},
    "thiamin": {"unit": "mg", "ar": 0.072, "pri": 0.1, "ai": null, "ul": null, "notes": "per MJ"},
    "riboflavin": {"unit": "mg", "ar": 1.5, "pri": 1.9, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": null, "notes": "per MJ"},
    "vitamin_b6": {"unit": "mg", "ar": 1.5, "pri": 1.8, "ai": null, "ul": 12},
    "folate": {"unit": "mcg", "ar": null, "pri": null, "ai": 600, "ul": 1000},
    "vitamin_b12": {"unit": "mcg", "ar": null, "pri": null, "ai": 4.5, "ul": null},
    "biotin": {"unit": "mcg", "ar": null, "pri": null, "ai": 40, "ul": null},
    "pantothenic_acid": {"unit": "mg", "ar": null, "pri": null, "ai": 5, "ul": null},
    "calcium": {"unit": "mg", "ar": 750, "pri": 950, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "ar": null, "pri": null, "ai": 550, "ul": null},
    "magnesium": {"unit": "mg", "ar": null, "pri": null, "ai": 300, "ul": 250, "notes": "UL for supplements only"},
    "iron": {"unit": "mg", "ar": 7, "pri": 16, "ai": null, "ul": null},
    "zinc": {"unit": "mg", "ar": 7.5, "pri": 9.1, "ai": null, "ul": 25, "notes": "+1.6 mg/day"},
    "copper": {"unit": "mg", "ar": null, "pri": null, "ai": 1.5, "ul": null},
    "manganese": {"unit": "mg", "ar": null, "pri": null, "ai": 3, "ul": null},
    "selenium": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": 255},
    "iodine": {"unit": "mcg", "ar": null, "pri": null, "ai": 200, "ul": 600},
    "sodium": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 2},
    "chloride": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 3.1},
    "potassium": {"unit": "mg", "ar": null, "pri": null, "ai": 3500, "ul": null},
    "fluoride": {"unit": "mg", "ar": null, "pri": null, "ai": 2.9, "ul": 7},
    "molybdenum": {"unit": "mcg", "ar": null, "pri": null, "ai": 65, "ul": 600},
    "choline": {"unit": "mg", "ar": null, "pri": null, "ai": 480, "ul": null}
  }',
  'EFSA Dietary Reference Values', 2023,
  'Pregnancy'
);

-- EU Guidelines - Lactating Women (18-24 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'EU', 'female', 18, 24, 'EFSA_DRV',
  '{
    "vitamin_a": {"unit": "mcg", "ar": 1020, "pri": 1300, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "ar": null, "pri": null, "ai": 15, "ul": 100},
    "vitamin_e": {"unit": "mg", "ar": null, "pri": null, "ai": 11, "ul": 300},
    "vitamin_k": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": null},
    "vitamin_c": {"unit": "mg", "ar": 140, "pri": 155, "ai": null, "ul": null},
    "thiamin": {"unit": "mg", "ar": 0.072, "pri": 0.1, "ai": null, "ul": null, "notes": "per MJ"},
    "riboflavin": {"unit": "mg", "ar": 1.7, "pri": 2.0, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": null, "notes": "per MJ"},
    "vitamin_b6": {"unit": "mg", "ar": 1.4, "pri": 1.7, "ai": null, "ul": 12},
    "folate": {"unit": "mcg", "ar": 380, "pri": 500, "ai": null, "ul": 1000},
    "vitamin_b12": {"unit": "mcg", "ar": null, "pri": null, "ai": 5, "ul": null},
    "biotin": {"unit": "mcg", "ar": null, "pri": null, "ai": 45, "ul": null},
    "pantothenic_acid": {"unit": "mg", "ar": null, "pri": null, "ai": 7, "ul": null},
    "calcium": {"unit": "mg", "ar": 860, "pri": 1000, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "ar": null, "pri": null, "ai": 550, "ul": null},
    "magnesium": {"unit": "mg", "ar": null, "pri": null, "ai": 300, "ul": 250, "notes": "UL for supplements only"},
    "iron": {"unit": "mg", "ar": 7, "pri": 16, "ai": null, "ul": null},
    "zinc": {"unit": "mg", "ar": 8.6, "pri": 10.4, "ai": null, "ul": 25, "notes": "+2.9 mg/day"},
    "copper": {"unit": "mg", "ar": null, "pri": null, "ai": 1.5, "ul": null},
    "manganese": {"unit": "mg", "ar": null, "pri": null, "ai": 3, "ul": null},
    "selenium": {"unit": "mcg", "ar": null, "pri": null, "ai": 85, "ul": 255},
    "iodine": {"unit": "mcg", "ar": null, "pri": null, "ai": 200, "ul": 600},
    "sodium": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 2},
    "chloride": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 3.1},
    "potassium": {"unit": "mg", "ar": null, "pri": null, "ai": 4000, "ul": null},
    "fluoride": {"unit": "mg", "ar": null, "pri": null, "ai": 2.9, "ul": 7},
    "molybdenum": {"unit": "mcg", "ar": null, "pri": null, "ai": 65, "ul": 600},
    "choline": {"unit": "mg", "ar": null, "pri": null, "ai": 520, "ul": null}
  }',
  'EFSA Dietary Reference Values', 2023,
  'Lactation'
);

-- EU Guidelines - Lactating Women (≥25 years)
INSERT INTO micronutrient_guidelines_flexible (
  country, gender, age_min, age_max, guideline_type, micronutrients, source, source_year, notes
) VALUES (
  'EU', 'female', 25, 120, 'EFSA_DRV',
  '{
    "vitamin_a": {"unit": "mcg", "ar": 1020, "pri": 1300, "ai": null, "ul": 3000},
    "vitamin_d": {"unit": "mcg", "ar": null, "pri": null, "ai": 15, "ul": 100},
    "vitamin_e": {"unit": "mg", "ar": null, "pri": null, "ai": 11, "ul": 300},
    "vitamin_k": {"unit": "mcg", "ar": null, "pri": null, "ai": 70, "ul": null},
    "vitamin_c": {"unit": "mg", "ar": 140, "pri": 155, "ai": null, "ul": null},
    "thiamin": {"unit": "mg", "ar": 0.072, "pri": 0.1, "ai": null, "ul": null, "notes": "per MJ"},
    "riboflavin": {"unit": "mg", "ar": 1.7, "pri": 2.0, "ai": null, "ul": null},
    "niacin": {"unit": "mg", "ar": 1.3, "pri": 1.6, "ai": null, "ul": null, "notes": "per MJ"},
    "vitamin_b6": {"unit": "mg", "ar": 1.4, "pri": 1.7, "ai": null, "ul": 12},
    "folate": {"unit": "mcg", "ar": 380, "pri": 500, "ai": null, "ul": 1000},
    "vitamin_b12": {"unit": "mcg", "ar": null, "pri": null, "ai": 5, "ul": null},
    "biotin": {"unit": "mcg", "ar": null, "pri": null, "ai": 45, "ul": null},
    "pantothenic_acid": {"unit": "mg", "ar": null, "pri": null, "ai": 7, "ul": null},
    "calcium": {"unit": "mg", "ar": 750, "pri": 950, "ai": null, "ul": 2500},
    "phosphorus": {"unit": "mg", "ar": null, "pri": null, "ai": 550, "ul": null},
    "magnesium": {"unit": "mg", "ar": null, "pri": null, "ai": 300, "ul": 250, "notes": "UL for supplements only"},
    "iron": {"unit": "mg", "ar": 7, "pri": 16, "ai": null, "ul": null},
    "zinc": {"unit": "mg", "ar": 8.6, "pri": 10.4, "ai": null, "ul": 25, "notes": "+2.9 mg/day"},
    "copper": {"unit": "mg", "ar": null, "pri": null, "ai": 1.5, "ul": null},
    "manganese": {"unit": "mg", "ar": null, "pri": null, "ai": 3, "ul": null},
    "selenium": {"unit": "mcg", "ar": null, "pri": null, "ai": 85, "ul": 255},
    "iodine": {"unit": "mcg", "ar": null, "pri": null, "ai": 200, "ul": 600},
    "sodium": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 2},
    "chloride": {"unit": "g", "ar": null, "pri": null, "ai": null, "ul": null, "safe_adequate": 3.1},
    "potassium": {"unit": "mg", "ar": null, "pri": null, "ai": 4000, "ul": null},
    "fluoride": {"unit": "mg", "ar": null, "pri": null, "ai": 2.9, "ul": 7},
    "molybdenum": {"unit": "mcg", "ar": null, "pri": null, "ai": 65, "ul": 600},
    "choline": {"unit": "mg", "ar": null, "pri": null, "ai": 520, "ul": null}
  }',
  'EFSA Dietary Reference Values', 2023,
  'Lactation'
);

-- Additional age groups for EU guidelines will be added in a separate migration if needed
