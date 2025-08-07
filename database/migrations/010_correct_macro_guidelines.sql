-- Migration 010: Correct macro guidelines to match official standards
-- Based on official nutritional guidelines comparison

-- First, delete incorrect EU guidelines
DELETE FROM macro_guidelines WHERE country = 'EU';

-- Insert corrected EU macro guidelines (EFSA DRV) - Updated ranges
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
-- Adult women (19-50 years) - CORRECTED
('EU', 'female', 19, 50, 10, 20, 0.83, 2.0, 'PRI: 0.83 g/kg body weight', 45, 60, 'EFSA: 45-60% of total energy', 20, 35, 'EFSA: 20-35% of total energy', NULL, 'EFSA: 25-30 g/day', 10, 'EFSA: Less than 10% of energy', NULL, NULL, 'EPA+DHA: 0.50% of energy', NULL, 'No UL established'),
-- Adult men (19-50 years) - CORRECTED
('EU', 'male', 19, 50, 10, 20, 0.83, 2.0, 'PRI: 0.83 g/kg body weight', 45, 60, 'EFSA: 45-60% of total energy', 20, 35, 'EFSA: 20-35% of total energy', NULL, 'EFSA: 25-30 g/day', 10, 'EFSA: Less than 10% of energy', NULL, NULL, 'EPA+DHA: 0.50% of energy', NULL, 'No UL established');

-- Delete incorrect UK guidelines
DELETE FROM macro_guidelines WHERE country = 'UK';

-- Insert corrected UK macro guidelines (SACN/COMA) - Updated ranges
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
-- Adult women (19-50 years) - CORRECTED
('UK', 'female', 19, 50, NULL, NULL, 0.75, 2.0, 'RNI: ~15% of energy, 0.75 g/kg body weight', NULL, NULL, 'SACN: ~50% of energy (no defined range)', NULL, NULL, 'No specific target', NULL, 'SACN: 30 g/day (non-starch polysaccharides)', 11, 'SACN: As low as possible', NULL, NULL, 'Encourage oily fish intake', NULL, 'Minimize intake'),
-- Adult men (19-50 years) - CORRECTED
('UK', 'male', 19, 50, NULL, NULL, 0.75, 2.0, 'RNI: ~15% of energy, 0.75 g/kg body weight', NULL, NULL, 'SACN: ~50% of energy (no defined range)', NULL, NULL, 'No specific target', NULL, 'SACN: 30 g/day (non-starch polysaccharides)', 11, 'SACN: As low as possible', NULL, NULL, 'Encourage oily fish intake', NULL, 'Minimize intake');

-- Delete incorrect AU/NZ fiber guidelines and update
DELETE FROM macro_guidelines WHERE country = 'AU/NZ';

-- Insert corrected AU/NZ macro guidelines (NHMRC) - Corrected fiber
INSERT INTO macro_guidelines (country, gender, age_min, age_max, protein_min_percent, protein_max_percent, protein_min_grams_per_kg, protein_max_grams_per_kg, protein_note, carbs_min_percent, carbs_max_percent, carbs_note, fat_min_percent, fat_max_percent, fat_note, fiber_per_1000_kcal, fiber_note, saturated_fat_max_percent, saturated_fat_note, omega3_min_grams, omega3_max_grams, omega3_note, cholesterol_max_mg, cholesterol_note) VALUES
-- Adult women (19-50 years) - CORRECTED FIBER
('AU/NZ', 'female', 19, 50, 15, 25, 0.75, 2.0, 'RDI: 0.75 g/kg body weight', 45, 65, 'NHMRC: 45-65% of total energy', 20, 35, 'NHMRC: 20-35% of total energy', NULL, 'NHMRC: 30 g/day', 10, 'Less than 10% of energy', NULL, NULL, 'Long-chain omega-3: ~0.4-1% of energy', 300, 'Less than 300 mg/day'),
-- Adult men (19-50 years) - CORRECTED FIBER
('AU/NZ', 'male', 19, 50, 15, 25, 0.84, 2.0, 'RDI: 0.84 g/kg body weight', 45, 65, 'NHMRC: 45-65% of total energy', 20, 35, 'NHMRC: 20-35% of total energy', NULL, 'NHMRC: 30 g/day', 10, 'Less than 10% of energy', NULL, NULL, 'Long-chain omega-3: ~0.4-1% of energy', 300, 'Less than 300 mg/day');

-- Update USA guidelines for correct cholesterol and omega-3 representation
UPDATE macro_guidelines 
SET 
  omega3_note = 'ALA: 0.6-1.2% of energy',
  cholesterol_note = 'As low as possible'
WHERE country = 'USA'; 