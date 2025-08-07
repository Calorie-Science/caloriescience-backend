-- Migration 009: Restore macro guidelines that were deleted in migration 007
-- These are essential for macronutrient calculations

-- USA macro guidelines (DRI 2005)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
-- Adult women (19-50 years)
('USA', 'female', 19, 50, 10, 35, 0.8, 2.0, 'RDA: 0.8 g/kg body weight minimum', 45, 65, 'AMDR: 45-65% of total calories', 20, 35, 'AMDR: 20-35% of total calories', 14, 'AI: 14 g per 1000 kcal', 10, 'Less than 10% of calories', 1.1, 2.0, 'ALA: 1.1 g/day minimum', 300, 'Less than 300 mg/day'),
-- Adult men (19-50 years)
('USA', 'male', 19, 50, 10, 35, 0.8, 2.0, 'RDA: 0.8 g/kg body weight minimum', 45, 65, 'AMDR: 45-65% of total calories', 20, 35, 'AMDR: 20-35% of total calories', 14, 'AI: 14 g per 1000 kcal', 10, 'Less than 10% of calories', 1.6, 2.5, 'ALA: 1.6 g/day minimum', 300, 'Less than 300 mg/day');

-- CANADA macro guidelines (Same as USA - Health Canada follows DRI)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
('Canada', 'female', 19, 50, 10, 35, 0.8, 2.0, 'RDA: 0.8 g/kg body weight minimum', 45, 65, 'AMDR: 45-65% of total calories', 20, 35, 'AMDR: 20-35% of total calories', 14, 'AI: 14 g per 1000 kcal', 10, 'Less than 10% of calories', 1.1, 2.0, 'ALA: 1.1 g/day minimum', 300, 'Less than 300 mg/day'),
('Canada', 'male', 19, 50, 10, 35, 0.8, 2.0, 'RDA: 0.8 g/kg body weight minimum', 45, 65, 'AMDR: 45-65% of total calories', 20, 35, 'AMDR: 20-35% of total calories', 14, 'AI: 14 g per 1000 kcal', 10, 'Less than 10% of calories', 1.6, 2.5, 'ALA: 1.6 g/day minimum', 300, 'Less than 300 mg/day');

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

-- SINGAPORE macro guidelines (Based on WHO/FAO + local adaptations)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
('Singapore', 'female', 19, 60, 10, 35, 0.83, 2.0, 'WHO recommendation: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.0, 2.0, 'Long-chain omega-3: 300 mg/day', 300, 'Less than 300 mg/day'),
('Singapore', 'male', 19, 60, 10, 35, 0.83, 2.0, 'WHO recommendation: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.3, 2.5, 'Long-chain omega-3: 400 mg/day', 300, 'Less than 300 mg/day');

-- UAE macro guidelines (WHO/FAO based)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
('UAE', 'female', 19, 60, 10, 35, 0.83, 2.0, 'WHO recommendation: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.0, 2.0, 'Long-chain omega-3: 300 mg/day', 300, 'Less than 300 mg/day'),
('UAE', 'male', 19, 60, 10, 35, 0.83, 2.0, 'WHO recommendation: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.3, 2.5, 'Long-chain omega-3: 400 mg/day', 300, 'Less than 300 mg/day');

-- INDIA macro guidelines (ICMR-NIN)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
('India', 'female', 19, 60, 10, 35, 0.8, 2.0, 'ICMR: 0.8 g/kg body weight', 45, 70, 'ICMR: 45-70% of total energy', 15, 30, 'ICMR: 15-30% of total energy', 15, 'ICMR: 15 g per 1000 kcal', 10, 'ICMR: Less than 10% of energy', 1.0, 2.0, 'ICMR: Adequate omega-3 intake', 300, 'Less than 300 mg/day'),
('India', 'male', 19, 60, 10, 35, 0.8, 2.0, 'ICMR: 0.8 g/kg body weight', 45, 70, 'ICMR: 45-70% of total energy', 15, 30, 'ICMR: 15-30% of total energy', 15, 'ICMR: 15 g per 1000 kcal', 10, 'ICMR: Less than 10% of energy', 1.3, 2.5, 'ICMR: Adequate omega-3 intake', 300, 'Less than 300 mg/day');

-- JAPAN macro guidelines (MHLW)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
('Japan', 'female', 19, 60, 13, 20, 0.8, 2.0, 'MHLW: 0.8 g/kg body weight', 50, 65, 'MHLW: 50-65% of total energy', 20, 30, 'MHLW: 20-30% of total energy', 14, 'MHLW: 14 g per 1000 kcal', 7, 'MHLW: Less than 7% of energy', 1.6, 2.0, 'MHLW: EPA+DHA 1.6 g/day', 300, 'Less than 300 mg/day'),
('Japan', 'male', 19, 60, 13, 20, 0.8, 2.0, 'MHLW: 0.8 g/kg body weight', 50, 65, 'MHLW: 50-65% of total energy', 20, 30, 'MHLW: 20-30% of total energy', 14, 'MHLW: 14 g per 1000 kcal', 7, 'MHLW: Less than 7% of energy', 2.0, 2.5, 'MHLW: EPA+DHA 2.0 g/day', 300, 'Less than 300 mg/day');

-- WHO macro guidelines (Global)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
('WHO', 'female', 19, 60, 10, 35, 0.83, 2.0, 'WHO: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.0, 2.0, 'WHO: Adequate omega-3', 300, 'WHO: Less than 300 mg/day'),
('WHO', 'male', 19, 60, 10, 35, 0.83, 2.0, 'WHO: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.3, 2.5, 'WHO: Adequate omega-3', 300, 'WHO: Less than 300 mg/day');

-- ZA (South Africa) macro guidelines (WHO/FAO based)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
('ZA', 'female', 19, 60, 10, 35, 0.83, 2.0, 'WHO recommendation: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.0, 2.0, 'Long-chain omega-3: 300 mg/day', 300, 'Less than 300 mg/day'),
('ZA', 'male', 19, 60, 10, 35, 0.83, 2.0, 'WHO recommendation: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.3, 2.5, 'Long-chain omega-3: 400 mg/day', 300, 'Less than 300 mg/day');

-- BRAZIL macro guidelines (WHO/FAO based)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
('Brazil', 'female', 19, 60, 10, 35, 0.83, 2.0, 'WHO recommendation: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.0, 2.0, 'Long-chain omega-3: 300 mg/day', 300, 'Less than 300 mg/day'),
('Brazil', 'male', 19, 60, 10, 35, 0.83, 2.0, 'WHO recommendation: 0.83 g/kg body weight', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g per 1000 kcal', 10, 'WHO: Less than 10% of energy', 1.3, 2.5, 'Long-chain omega-3: 400 mg/day', 300, 'Less than 300 mg/day'); 