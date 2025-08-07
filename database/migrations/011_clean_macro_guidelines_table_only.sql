-- Migration 011: Clean macro guidelines to match ONLY the official table data
-- Remove all g/kg values and use only percentages and absolute values from the table

-- First, drop and recreate the macro_guidelines table with only the fields from the table
DROP TABLE IF EXISTS macro_guidelines;

CREATE TABLE macro_guidelines (
  id SERIAL PRIMARY KEY,
  country VARCHAR(20) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  
  -- Protein (percentage only - from table)
  protein_min_percent DECIMAL(5,2),
  protein_max_percent DECIMAL(5,2),
  protein_note TEXT,
  
  -- Carbohydrates (percentage only - from table)
  carbs_min_percent DECIMAL(5,2),
  carbs_max_percent DECIMAL(5,2),
  carbs_note TEXT,
  
  -- Total Fat (percentage only - from table)
  fat_min_percent DECIMAL(5,2),
  fat_max_percent DECIMAL(5,2),
  fat_note TEXT,
  
  -- Fiber (absolute values only - from table)
  fiber_per_1000_kcal DECIMAL(5,2), -- For USA (14 g/1000 kcal)
  fiber_absolute_min DECIMAL(5,2),  -- For EU (25-30 g/day)
  fiber_absolute_max DECIMAL(5,2),  -- For EU (25-30 g/day)
  fiber_note TEXT,
  
  -- Saturated Fat (percentage only - from table)
  saturated_fat_max_percent DECIMAL(5,2),
  saturated_fat_note TEXT,
  
  -- Monounsaturated Fat (percentage - from table)
  monounsaturated_fat_min_percent DECIMAL(5,2), -- USA: 15-20%
  monounsaturated_fat_max_percent DECIMAL(5,2),
  monounsaturated_fat_note TEXT,
  
  -- Polyunsaturated Fat (percentage - from table)
  polyunsaturated_fat_min_percent DECIMAL(5,2), -- USA: 5-10%, EU: 6-11%
  polyunsaturated_fat_max_percent DECIMAL(5,2),
  polyunsaturated_fat_note TEXT,
  
  -- Omega-3 (percentage only - from table)
  omega3_min_percent DECIMAL(5,3), -- USA: 0.6-1.2%, EU: 0.50%
  omega3_max_percent DECIMAL(5,3),
  omega3_note TEXT,
  
  -- Cholesterol (absolute values - from table)
  cholesterol_max_mg DECIMAL(8,2), -- AU/NZ: <300 mg/day
  cholesterol_note TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert data EXACTLY from the table provided
-- USA (IOM)
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
('USA', 'female', 19, 120, 10, 35, 'IOM: 10-35%', 45, 65, 'IOM: 45-65%', 20, 35, 'IOM: 20-35%', 14, 'IOM: 14 g/1000 kcal', 10, 'IOM: <10%', 15, 20, 'IOM: 15-20% (suggested)', 5, 10, 'IOM: 5-10% (suggested)', 0.6, 1.2, 'IOM: 0.6-1.2%', 'As low as possible'),
('USA', 'male', 19, 120, 10, 35, 'IOM: 10-35%', 45, 65, 'IOM: 45-65%', 20, 35, 'IOM: 20-35%', 14, 'IOM: 14 g/1000 kcal', 10, 'IOM: <10%', 15, 20, 'IOM: 15-20% (suggested)', 5, 10, 'IOM: 5-10% (suggested)', 0.6, 1.2, 'IOM: 0.6-1.2%', 'As low as possible');

-- EU (EFSA) 
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_absolute_min, fiber_absolute_max, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  polyunsaturated_fat_min_percent, polyunsaturated_fat_max_percent, polyunsaturated_fat_note,
  omega3_min_percent, omega3_max_percent, omega3_note,
  cholesterol_note) VALUES
('EU', 'female', 19, 120, 10, 20, 'EFSA: 10-20% (adults)', 45, 60, 'EFSA: 45-60%', 20, 35, 'EFSA: 20-35%', 25, 30, 'EFSA: 25-30 g/day', 10, 'EFSA: <10%', 6, 11, 'EFSA: 6-11% (omega-6)', 0.50, 0.50, 'EFSA: 0.50%', 'No specific limit'),
('EU', 'male', 19, 120, 10, 20, 'EFSA: 10-20% (adults)', 45, 60, 'EFSA: 45-60%', 20, 35, 'EFSA: 20-35%', 25, 30, 'EFSA: 25-30 g/day', 10, 'EFSA: <10%', 6, 11, 'EFSA: 6-11% (omega-6)', 0.50, 0.50, 'EFSA: 0.50%', 'No specific limit');

-- AU/NZ (NHMRC)
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_min_percent, protein_max_percent, protein_note,
  carbs_min_percent, carbs_max_percent, carbs_note,
  fat_min_percent, fat_max_percent, fat_note,
  fiber_absolute_min, fiber_absolute_max, fiber_note,
  saturated_fat_max_percent, saturated_fat_note,
  polyunsaturated_fat_min_percent, polyunsaturated_fat_max_percent, polyunsaturated_fat_note,
  omega3_min_percent, omega3_max_percent, omega3_note,
  cholesterol_max_mg, cholesterol_note) VALUES
('AU/NZ', 'female', 19, 120, 15, 25, 'NHMRC: 15-25%', 45, 65, 'NHMRC: 45-65%', 20, 35, 'NHMRC: 20-35%', 30, 30, 'NHMRC: 30 g/day', 10, 'NHMRC: <10%', 6, 10, 'NHMRC: 6-10% (combined)', 0.4, 1.0, 'NHMRC: ~0.4-1%', 300, 'NHMRC: <300 mg/day'),
('AU/NZ', 'male', 19, 120, 15, 25, 'NHMRC: 15-25%', 45, 65, 'NHMRC: 45-65%', 20, 35, 'NHMRC: 20-35%', 30, 30, 'NHMRC: 30 g/day', 10, 'NHMRC: <10%', 6, 10, 'NHMRC: 6-10% (combined)', 0.4, 1.0, 'NHMRC: ~0.4-1%', 300, 'NHMRC: <300 mg/day');

-- UK (SACN/COMA)
INSERT INTO macro_guidelines (country, gender, age_min, age_max,
  protein_note, carbs_note, fat_note,
  fiber_absolute_min, fiber_absolute_max, fiber_note,
  saturated_fat_note, omega3_note, cholesterol_note) VALUES
('UK', 'female', 19, 120, 'SACN: ~15%', 'SACN: ~50% (no defined range)', 'No specific target', 30, 30, 'SACN: 30 g/day (non-starch polysaccharides)', 'As low as possible', 'Encourage oily fish intake', 'Minimize intake'),
('UK', 'male', 19, 120, 'SACN: ~15%', 'SACN: ~50% (no defined range)', 'No specific target', 30, 30, 'SACN: 30 g/day (non-starch polysaccharides)', 'As low as possible', 'Encourage oily fish intake', 'Minimize intake');

-- Create index for performance
CREATE INDEX idx_macro_guidelines_lookup ON macro_guidelines(country, gender, age_min, age_max); 