-- Migration 015: Add missing countries macro guidelines
-- India and other countries were missing from migration 011

-- India (ICMR-NIN) - Based on the official table
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_per_1000_kcal, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  omega3_note, cholesterol_note) VALUES
-- Based on common ICMR-NIN guidelines, but simplified to match the format
('India', 'female', 19, 120, 10, 20, 'ICMR-NIN: Adequate protein intake', 50, 70, 'ICMR-NIN: 50-70% of total energy', 15, 30, 'ICMR-NIN: 15-30% of total energy', 15, 'ICMR-NIN: 15 g/1000 kcal', 10, 'ICMR-NIN: <10% of energy', 'ICMR-NIN: Adequate omega-3 intake', 'ICMR-NIN: Minimal cholesterol intake'),
('India', 'male', 19, 120, 10, 20, 'ICMR-NIN: Adequate protein intake', 50, 70, 'ICMR-NIN: 50-70% of total energy', 15, 30, 'ICMR-NIN: 15-30% of total energy', 15, 'ICMR-NIN: 15 g/1000 kcal', 10, 'ICMR-NIN: <10% of energy', 'ICMR-NIN: Adequate omega-3 intake', 'ICMR-NIN: Minimal cholesterol intake');

-- Canada (follows DRI - same as USA)
INSERT INTO macro_guidelines (country, gender, age_min, age_max, 
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_per_1000_kcal, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  monounsaturated_fat_min_percent, monounsaturated_fat_max_percent, monounsaturated_fat_note,
  polyunsaturated_fat_min_percent, polyunsaturated_fat_max_percent, polyunsaturated_fat_note,
  omega3_min_percent, omega3_max_percent, omega3_note,
  cholesterol_note) VALUES
('Canada', 'female', 19, 120, 10, 35, 'Health Canada: 10-35%', 45, 65, 'Health Canada: 45-65%', 20, 35, 'Health Canada: 20-35%', 14, 'Health Canada: 14 g/1000 kcal', 10, 'Health Canada: <10%', 15, 20, 'Health Canada: 15-20% (suggested)', 5, 10, 'Health Canada: 5-10% (suggested)', 0.6, 1.2, 'Health Canada: 0.6-1.2%', 'As low as possible'),
('Canada', 'male', 19, 120, 10, 35, 'Health Canada: 10-35%', 45, 65, 'Health Canada: 45-65%', 20, 35, 'Health Canada: 20-35%', 14, 'Health Canada: 14 g/1000 kcal', 10, 'Health Canada: <10%', 15, 20, 'Health Canada: 15-20% (suggested)', 5, 10, 'Health Canada: 5-10% (suggested)', 0.6, 1.2, 'Health Canada: 0.6-1.2%', 'As low as possible');

-- Japan (MHLW) - Based on Japanese dietary guidelines
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_per_1000_kcal, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  omega3_note, cholesterol_note) VALUES
('Japan', 'female', 19, 120, 13, 20, 'MHLW: 13-20% of total energy', 50, 65, 'MHLW: 50-65% of total energy', 20, 30, 'MHLW: 20-30% of total energy', 10, 'MHLW: 10 g/1000 kcal', 7, 'MHLW: <7% of energy', 'MHLW: Adequate omega-3 intake', 'MHLW: Moderate cholesterol intake'),
('Japan', 'male', 19, 120, 13, 20, 'MHLW: 13-20% of total energy', 50, 65, 'MHLW: 50-65% of total energy', 20, 30, 'MHLW: 20-30% of total energy', 10, 'MHLW: 10 g/1000 kcal', 7, 'MHLW: <7% of energy', 'MHLW: Adequate omega-3 intake', 'MHLW: Moderate cholesterol intake');

-- Singapore (follows WHO with local adaptations)
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_per_1000_kcal, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  omega3_note, cholesterol_note) VALUES
('Singapore', 'female', 19, 120, 10, 15, 'HPB: 10-15% of total energy', 45, 65, 'HPB: 45-65% of total energy', 20, 35, 'HPB: 20-35% of total energy', 12, 'HPB: 12 g/1000 kcal', 10, 'HPB: <10% of energy', 'HPB: Adequate omega-3 intake', 'HPB: <300 mg/day'),
('Singapore', 'male', 19, 120, 10, 15, 'HPB: 10-15% of total energy', 45, 65, 'HPB: 45-65% of total energy', 20, 35, 'HPB: 20-35% of total energy', 12, 'HPB: 12 g/1000 kcal', 10, 'HPB: <10% of energy', 'HPB: Adequate omega-3 intake', 'HPB: <300 mg/day');

-- UAE (follows WHO guidelines)
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_per_1000_kcal, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  omega3_note, cholesterol_note) VALUES
('UAE', 'female', 19, 120, 10, 35, 'WHO: 10-35% of total energy', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g/1000 kcal', 10, 'WHO: <10% of energy', 'WHO: Adequate omega-3 intake', 'WHO: <300 mg/day'),
('UAE', 'male', 19, 120, 10, 35, 'WHO: 10-35% of total energy', 45, 65, 'WHO: 45-65% of total energy', 20, 35, 'WHO: 20-35% of total energy', 12, 'WHO: 12 g/1000 kcal', 10, 'WHO: <10% of energy', 'WHO: Adequate omega-3 intake', 'WHO: <300 mg/day');

-- WHO (World Health Organization) - Generic international guidelines
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_per_1000_kcal, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  omega3_note, cholesterol_note) VALUES
('WHO', 'female', 19, 120, 10, 15, 'WHO: 10-15% of total energy', 55, 75, 'WHO: 55-75% of total energy', 15, 30, 'WHO: 15-30% of total energy', 12, 'WHO: 12 g/1000 kcal', 10, 'WHO: <10% of energy', 'WHO: Adequate omega-3 intake', 'WHO: <300 mg/day'),
('WHO', 'male', 19, 120, 10, 15, 'WHO: 10-15% of total energy', 55, 75, 'WHO: 55-75% of total energy', 15, 30, 'WHO: 15-30% of total energy', 12, 'WHO: 12 g/1000 kcal', 10, 'WHO: <10% of energy', 'WHO: Adequate omega-3 intake', 'WHO: <300 mg/day');

-- ZA (South Africa) - Based on local dietary guidelines
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_per_1000_kcal, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  omega3_note, cholesterol_note) VALUES
('ZA', 'female', 19, 120, 10, 15, 'SA DoH: 10-15% of total energy', 55, 75, 'SA DoH: 55-75% of total energy', 15, 30, 'SA DoH: 15-30% of total energy', 12, 'SA DoH: 12 g/1000 kcal', 10, 'SA DoH: <10% of energy', 'SA DoH: Adequate omega-3 intake', 'SA DoH: <300 mg/day'),
('ZA', 'male', 19, 120, 10, 15, 'SA DoH: 10-15% of total energy', 55, 75, 'SA DoH: 55-75% of total energy', 15, 30, 'SA DoH: 15-30% of total energy', 12, 'SA DoH: 12 g/1000 kcal', 10, 'SA DoH: <10% of energy', 'SA DoH: Adequate omega-3 intake', 'SA DoH: <300 mg/day');

-- Brazil (based on Brazilian dietary guidelines)
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_per_1000_kcal, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  omega3_note, cholesterol_note) VALUES
('Brazil', 'female', 19, 120, 10, 15, 'Brazilian MoH: 10-15% of total energy', 45, 65, 'Brazilian MoH: 45-65% of total energy', 20, 35, 'Brazilian MoH: 20-35% of total energy', 14, 'Brazilian MoH: 14 g/1000 kcal', 10, 'Brazilian MoH: <10% of energy', 'Brazilian MoH: Adequate omega-3 intake', 'Brazilian MoH: <300 mg/day'),
('Brazil', 'male', 19, 120, 10, 15, 'Brazilian MoH: 10-15% of total energy', 45, 65, 'Brazilian MoH: 45-65% of total energy', 20, 35, 'Brazilian MoH: 20-35% of total energy', 14, 'Brazilian MoH: 14 g/1000 kcal', 10, 'Brazilian MoH: <10% of energy', 'Brazilian MoH: Adequate omega-3 intake', 'Brazilian MoH: <300 mg/day'); 