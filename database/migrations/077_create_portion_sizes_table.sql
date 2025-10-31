-- Migration: Create portion_sizes table
-- Description: Add support for standardized portion sizes (cups, plates, bowls, etc.)
-- Created: 2025-01-31

-- Create portion_sizes table
CREATE TABLE IF NOT EXISTS portion_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL, -- e.g., "Small Cup", "Large Cup", "Medium Plate"
  description TEXT,
  category VARCHAR(50) NOT NULL CHECK (category IN ('cup', 'plate', 'bowl', 'glass', 'serving', 'other')),
  volume_ml DECIMAL(10, 2), -- Volume in milliliters (for liquids)
  weight_g DECIMAL(10, 2), -- Weight in grams (for solids)
  multiplier DECIMAL(10, 4) NOT NULL DEFAULT 1.0, -- Nutrition multiplier (base = 1.0)
  is_default BOOLEAN DEFAULT FALSE, -- Whether this is a default portion size
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on category for faster lookups
CREATE INDEX idx_portion_sizes_category ON portion_sizes(category);
CREATE INDEX idx_portion_sizes_is_default ON portion_sizes(is_default);

-- Add unique constraint on name
CREATE UNIQUE INDEX idx_portion_sizes_name ON portion_sizes(name);

-- Insert default portion sizes
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  -- Cups
  ('Small Cup (150ml)', 'Small serving cup, about 2/3 standard cup', 'cup', 150, NULL, 0.625, FALSE),
  ('Medium Cup (240ml)', 'Standard 1 cup serving', 'cup', 240, NULL, 1.0, TRUE),
  ('Large Cup (350ml)', 'Large cup, about 1.5 standard cups', 'cup', 350, NULL, 1.458, FALSE),

  -- Bowls
  ('Small Bowl (200g)', 'Small serving bowl', 'bowl', NULL, 200, 0.8, FALSE),
  ('Medium Bowl (250g)', 'Standard serving bowl', 'bowl', NULL, 250, 1.0, TRUE),
  ('Large Bowl (400g)', 'Large serving bowl', 'bowl', NULL, 400, 1.6, FALSE),

  -- Plates
  ('Small Plate (150g)', 'Side plate portion', 'plate', NULL, 150, 0.75, FALSE),
  ('Medium Plate (200g)', 'Standard dinner plate', 'plate', NULL, 200, 1.0, TRUE),
  ('Large Plate (300g)', 'Large dinner plate', 'plate', NULL, 300, 1.5, FALSE),

  -- Glasses
  ('Small Glass (150ml)', 'Small glass serving', 'glass', 150, NULL, 0.6, FALSE),
  ('Medium Glass (250ml)', 'Standard glass serving', 'glass', 250, NULL, 1.0, TRUE),
  ('Large Glass (400ml)', 'Large glass serving', 'glass', 400, NULL, 1.6, FALSE),

  -- General servings
  ('1 Serving', 'Standard single serving', 'serving', NULL, NULL, 1.0, TRUE),
  ('Half Serving', 'Half of standard serving', 'serving', NULL, NULL, 0.5, FALSE),
  ('Double Serving', 'Two standard servings', 'serving', NULL, NULL, 2.0, FALSE);

-- Add portion_size_id to cached_recipes table
ALTER TABLE cached_recipes
ADD COLUMN IF NOT EXISTS default_portion_size_id UUID REFERENCES portion_sizes(id) ON DELETE SET NULL;

-- Create index on default_portion_size_id
CREATE INDEX IF NOT EXISTS idx_cached_recipes_portion_size ON cached_recipes(default_portion_size_id);

-- Add comment to table
COMMENT ON TABLE portion_sizes IS 'Standard portion sizes for recipes (cups, plates, bowls, etc.)';
COMMENT ON COLUMN portion_sizes.multiplier IS 'Nutrition multiplier relative to base serving (1.0)';
COMMENT ON COLUMN portion_sizes.is_default IS 'Whether this is a default option for its category';
COMMENT ON COLUMN cached_recipes.default_portion_size_id IS 'Reference to the default portion size for this recipe';
