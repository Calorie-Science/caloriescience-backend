-- Migration 017: Add micronutrient guidelines and client micronutrient storage
-- This adds comprehensive micronutrient recommendation system

-- Micronutrient guidelines by country/gender/age
CREATE TABLE IF NOT EXISTS micronutrient_guidelines (
  id SERIAL PRIMARY KEY,
  country VARCHAR(20) NOT NULL,
  gender VARCHAR(10) NOT NULL, -- male, female
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  
  -- Vitamins (daily amounts)
  vitamin_a_mcg DECIMAL(8,2), -- μg/day
  thiamin_mg DECIMAL(8,2), -- mg/day
  riboflavin_mg DECIMAL(8,2), -- mg/day
  niacin_equivalent_mg DECIMAL(8,2), -- mg/day
  vitamin_b6_mg DECIMAL(8,2), -- mg/day
  vitamin_b12_mcg DECIMAL(8,2), -- μg/day
  folate_mcg DECIMAL(8,2), -- μg/day
  vitamin_c_mg DECIMAL(8,2), -- mg/day
  vitamin_d_mcg DECIMAL(8,2), -- μg/day
  
  -- Minerals (daily amounts)
  iron_mg DECIMAL(8,2), -- mg/day
  calcium_mg DECIMAL(8,2), -- mg/day
  magnesium_mg DECIMAL(8,2), -- mg/day
  potassium_mg DECIMAL(8,2), -- mg/day
  zinc_mg DECIMAL(8,2), -- mg/day
  copper_mg DECIMAL(8,2), -- mg/day
  iodine_mcg DECIMAL(8,2), -- μg/day
  selenium_mcg DECIMAL(8,2), -- μg/day
  phosphorus_mg DECIMAL(8,2), -- mg/day
  chloride_mg DECIMAL(8,2), -- mg/day
  sodium_g DECIMAL(8,2), -- g/day
  
  -- Metadata
  source VARCHAR(100), -- e.g., "UK Government", "EFSA", etc.
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_micronutrient_guidelines_lookup 
ON micronutrient_guidelines(country, gender, age_min, age_max);

-- Client micronutrient requirements (calculated recommendations)
CREATE TABLE IF NOT EXISTS client_micronutrient_requirements (
  id SERIAL PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Vitamins (daily recommendations)
  vitamin_a_mcg DECIMAL(8,2),
  thiamin_mg DECIMAL(8,2),
  riboflavin_mg DECIMAL(8,2),
  niacin_equivalent_mg DECIMAL(8,2),
  vitamin_b6_mg DECIMAL(8,2),
  vitamin_b12_mcg DECIMAL(8,2),
  folate_mcg DECIMAL(8,2),
  vitamin_c_mg DECIMAL(8,2),
  vitamin_d_mcg DECIMAL(8,2),
  
  -- Minerals (daily recommendations)
  iron_mg DECIMAL(8,2),
  calcium_mg DECIMAL(8,2),
  magnesium_mg DECIMAL(8,2),
  potassium_mg DECIMAL(8,2),
  zinc_mg DECIMAL(8,2),
  copper_mg DECIMAL(8,2),
  iodine_mcg DECIMAL(8,2),
  selenium_mcg DECIMAL(8,2),
  phosphorus_mg DECIMAL(8,2),
  chloride_mg DECIMAL(8,2),
  sodium_g DECIMAL(8,2),
  
  -- Metadata
  guideline_used VARCHAR(20), -- Country/guideline used for calculation
  calculation_method VARCHAR(50) DEFAULT 'formula_based',
  is_ai_generated BOOLEAN DEFAULT FALSE,
  nutritionist_notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient client lookups
CREATE INDEX IF NOT EXISTS idx_client_micronutrient_requirements_client_id 
ON client_micronutrient_requirements(client_id);

CREATE INDEX IF NOT EXISTS idx_client_micronutrient_requirements_active 
ON client_micronutrient_requirements(client_id, is_active);

-- ========================================
-- UK MICRONUTRIENT GUIDELINES
-- ========================================

-- Insert UK guidelines for children and adolescents
INSERT INTO micronutrient_guidelines (
  country, gender, age_min, age_max,
  vitamin_a_mcg, thiamin_mg, riboflavin_mg, niacin_equivalent_mg, vitamin_b6_mg, 
  vitamin_b12_mcg, folate_mcg, vitamin_c_mg, vitamin_d_mcg,
  iron_mg, calcium_mg, magnesium_mg, potassium_mg, zinc_mg, copper_mg, 
  iodine_mcg, selenium_mcg, phosphorus_mg, chloride_mg, sodium_g,
  source, notes
) VALUES
-- Age 1 year
('UK', 'male', 1, 1, 400, 0.3, 0.6, 5.0, 0.7, 0.5, 70, 30, 10, 6.9, 350, 85, 800, 5.0, 0.4, 70, 15, 270, 800, 0.8, 'UK Government', 'UK dietary reference values for energy and nutrients'),
('UK', 'female', 1, 1, 400, 0.3, 0.6, 4.7, 0.7, 0.5, 70, 30, 10, 6.9, 350, 85, 800, 5.0, 0.4, 70, 15, 270, 800, 0.8, 'UK Government', 'UK dietary reference values for energy and nutrients'),

-- Age 2-3 years
('UK', 'male', 2, 3, 400, 0.4, 0.6, 7.2, 0.7, 0.5, 70, 30, 10, 6.9, 350, 85, 800, 5.0, 0.4, 70, 15, 270, 800, 0.8, 'UK Government', 'UK dietary reference values for energy and nutrients'),
('UK', 'female', 2, 3, 400, 0.4, 0.6, 6.6, 0.7, 0.5, 70, 30, 10, 6.9, 350, 85, 800, 5.0, 0.4, 70, 15, 270, 800, 0.8, 'UK Government', 'UK dietary reference values for energy and nutrients'),

-- Age 4-6 years
('UK', 'male', 4, 6, 400, 0.6, 0.8, 9.8, 0.9, 0.8, 100, 30, 10, 6.1, 450, 120, 1100, 6.5, 0.6, 100, 20, 350, 1100, 1.2, 'UK Government', 'UK dietary reference values for energy and nutrients'),
('UK', 'female', 4, 6, 400, 0.6, 0.8, 9.1, 0.9, 0.8, 100, 30, 10, 6.1, 450, 120, 1100, 6.5, 0.6, 100, 20, 350, 1100, 1.2, 'UK Government', 'UK dietary reference values for energy and nutrients'),

-- Age 7-10 years
('UK', 'male', 7, 10, 500, 0.7, 1.0, 12.0, 1.0, 1.0, 150, 30, 10, 8.7, 550, 200, 2000, 7.0, 0.7, 110, 30, 450, 1800, 2.0, 'UK Government', 'UK dietary reference values for energy and nutrients'),
('UK', 'female', 7, 10, 500, 0.7, 1.0, 11.2, 1.0, 1.0, 150, 30, 10, 8.7, 550, 200, 2000, 7.0, 0.7, 110, 30, 450, 1800, 2.0, 'UK Government', 'UK dietary reference values for energy and nutrients'),

-- Age 11-14 years
('UK', 'male', 11, 14, 600, 1.0, 1.2, 16.5, 1.2, 1.2, 200, 35, 10, 11.3, 1000, 280, 3100, 9.0, 0.8, 130, 45, 775, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients'),
('UK', 'female', 11, 14, 600, 0.8, 1.1, 13.2, 1.0, 1.2, 200, 35, 10, 14.8, 800, 280, 3100, 9.0, 0.8, 130, 45, 625, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients'),

-- Age 15-18 years
('UK', 'male', 15, 18, 700, 1.0, 1.3, 16.5, 1.5, 1.5, 200, 40, 10, 11.3, 1000, 300, 3500, 9.5, 1.0, 140, 70, 775, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients'),
('UK', 'female', 15, 18, 600, 0.8, 1.1, 13.2, 1.2, 1.5, 200, 40, 10, 14.8, 800, 300, 3500, 7.0, 1.0, 140, 60, 625, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients'),

-- Age 19-64 years (Adults)
('UK', 'male', 19, 64, 700, 1.0, 1.3, 16.5, 1.4, 1.5, 200, 40, 10, 8.7, 700, 300, 3500, 9.5, 1.2, 140, 75, 550, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients'),
('UK', 'female', 19, 50, 600, 0.8, 1.1, 13.2, 1.2, 1.5, 200, 40, 10, 14.8, 700, 270, 3500, 7.0, 1.2, 140, 60, 550, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients - reproductive age'),
('UK', 'female', 50, 64, 600, 0.8, 1.1, 13.2, 1.2, 1.5, 200, 40, 10, 8.7, 700, 270, 3500, 7.0, 1.2, 140, 60, 550, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients - post-menopausal'),

-- Age 65-74 years
('UK', 'male', 65, 74, 700, 0.9, 1.3, 15.5, 1.4, 1.5, 200, 40, 10, 8.7, 700, 300, 3500, 9.5, 1.2, 140, 75, 550, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients'),
('UK', 'female', 65, 74, 600, 0.8, 1.1, 12.6, 1.2, 1.5, 200, 40, 10, 8.7, 700, 270, 3500, 7.0, 1.2, 140, 60, 550, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients'),

-- Age 75+ years
('UK', 'male', 75, 120, 700, 0.9, 1.3, 15.1, 1.4, 1.5, 200, 40, 10, 8.7, 700, 300, 3500, 9.5, 1.2, 140, 75, 550, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients'),
('UK', 'female', 75, 120, 600, 0.7, 1.1, 12.1, 1.2, 1.5, 200, 40, 10, 8.7, 700, 270, 3500, 7.0, 1.2, 140, 60, 550, 2500, 2.4, 'UK Government', 'UK dietary reference values for energy and nutrients');

-- Add comment to explain the table structure
COMMENT ON TABLE micronutrient_guidelines IS 'Government micronutrient recommendations by country, gender, and age group';
COMMENT ON TABLE client_micronutrient_requirements IS 'Calculated micronutrient recommendations for individual clients'; 