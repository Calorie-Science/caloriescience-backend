-- Migration: Create simple_ingredients table for basic foods (fruits, vegetables, proteins, etc.)
-- This replaces hardcoded ingredients in simpleIngredientService.ts

-- Create simple_ingredients table
CREATE TABLE IF NOT EXISTS simple_ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic Info
  name VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(255), -- Optional formatted name (e.g., "Banana (1 medium)")
  category VARCHAR(100) NOT NULL, -- fruit, vegetable, protein, grain, dairy, legume, nuts, fat, sweetener
  
  -- Serving Size
  serving_quantity DECIMAL(10, 2) NOT NULL,
  serving_unit VARCHAR(50) NOT NULL, -- medium, cup, g, tbsp, etc.
  
  -- Macronutrients (per serving)
  calories DECIMAL(10, 2) NOT NULL,
  protein_g DECIMAL(10, 2) NOT NULL DEFAULT 0,
  carbs_g DECIMAL(10, 2) NOT NULL DEFAULT 0,
  fat_g DECIMAL(10, 2) NOT NULL DEFAULT 0,
  fiber_g DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sugar_g DECIMAL(10, 2) DEFAULT 0,
  saturated_fat_g DECIMAL(10, 2) DEFAULT 0,
  trans_fat_g DECIMAL(10, 2) DEFAULT 0,
  cholesterol_mg DECIMAL(10, 2) DEFAULT 0,
  
  -- Vitamins (per serving)
  vitamin_a_mcg DECIMAL(10, 2), -- Vitamin A (mcg)
  vitamin_d_mcg DECIMAL(10, 2), -- Vitamin D (mcg)
  vitamin_e_mg DECIMAL(10, 2), -- Vitamin E (mg)
  vitamin_k_mcg DECIMAL(10, 2), -- Vitamin K (mcg)
  vitamin_c_mg DECIMAL(10, 2), -- Vitamin C (mg)
  thiamin_mg DECIMAL(10, 2), -- Vitamin B1 (mg)
  riboflavin_mg DECIMAL(10, 2), -- Vitamin B2 (mg)
  niacin_mg DECIMAL(10, 2), -- Vitamin B3 (mg)
  vitamin_b6_mg DECIMAL(10, 2), -- Vitamin B6 (mg)
  vitamin_b12_mcg DECIMAL(10, 2), -- Vitamin B12 (mcg)
  folate_mcg DECIMAL(10, 2), -- Folate/Folic Acid (mcg)
  biotin_mcg DECIMAL(10, 2), -- Biotin (mcg)
  pantothenic_acid_mg DECIMAL(10, 2), -- Pantothenic Acid/B5 (mg)
  choline_mg DECIMAL(10, 2), -- Choline (mg)
  
  -- Minerals (per serving)
  calcium_mg DECIMAL(10, 2), -- Calcium (mg)
  phosphorus_mg DECIMAL(10, 2), -- Phosphorus (mg)
  magnesium_mg DECIMAL(10, 2), -- Magnesium (mg)
  sodium_mg DECIMAL(10, 2), -- Sodium (mg)
  potassium_mg DECIMAL(10, 2), -- Potassium (mg)
  chloride_mg DECIMAL(10, 2), -- Chloride (mg)
  iron_mg DECIMAL(10, 2), -- Iron (mg)
  zinc_mg DECIMAL(10, 2), -- Zinc (mg)
  copper_mg DECIMAL(10, 2), -- Copper (mg)
  selenium_mcg DECIMAL(10, 2), -- Selenium (mcg)
  iodine_mcg DECIMAL(10, 2), -- Iodine (mcg)
  manganese_mg DECIMAL(10, 2), -- Manganese (mg)
  molybdenum_mcg DECIMAL(10, 2), -- Molybdenum (mcg)
  chromium_mcg DECIMAL(10, 2), -- Chromium (mcg)
  
  -- Labels & Tags
  health_labels TEXT[] DEFAULT ARRAY[]::TEXT[], -- vegan, vegetarian, gluten-free, dairy-free, high-protein, etc.
  diet_labels TEXT[] DEFAULT ARRAY[]::TEXT[], -- vegan, vegetarian, keto, paleo, etc.
  allergens TEXT[] DEFAULT ARRAY[]::TEXT[], -- dairy, eggs, tree-nuts, soy, fish, shellfish, gluten, peanuts
  
  -- Image
  image_url TEXT, -- URL to ingredient image
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_simple_ingredients_name ON simple_ingredients(name);
CREATE INDEX idx_simple_ingredients_category ON simple_ingredients(category);
CREATE INDEX idx_simple_ingredients_health_labels ON simple_ingredients USING GIN(health_labels);
CREATE INDEX idx_simple_ingredients_allergens ON simple_ingredients USING GIN(allergens);
CREATE INDEX idx_simple_ingredients_active ON simple_ingredients(is_active) WHERE is_active = TRUE;

-- Add comments
COMMENT ON TABLE simple_ingredients IS 'Pre-defined common ingredients (fruits, vegetables, proteins, etc.) that can be added as simple recipes to meal plans';
COMMENT ON COLUMN simple_ingredients.name IS 'Ingredient name (lowercase, used for search matching)';
COMMENT ON COLUMN simple_ingredients.category IS 'Ingredient category: fruit, vegetable, protein, grain, dairy, legume, nuts, fat, sweetener';
COMMENT ON COLUMN simple_ingredients.health_labels IS 'Health labels like vegan, vegetarian, gluten-free, dairy-free';
COMMENT ON COLUMN simple_ingredients.allergens IS 'Known allergens: dairy, eggs, tree-nuts, soy, fish, shellfish, gluten, peanuts';

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_simple_ingredients_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_simple_ingredients_updated_at
  BEFORE UPDATE ON simple_ingredients
  FOR EACH ROW
  EXECUTE FUNCTION update_simple_ingredients_updated_at();

