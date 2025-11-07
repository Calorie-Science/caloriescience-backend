-- Migration: Add food categories to custom recipes and portion sizes
-- Description: Adds food category field for storing recipe category and portion size category
-- Created: 2025-02-01

-- Add food_category column to cached_recipes table
ALTER TABLE cached_recipes
ADD COLUMN IF NOT EXISTS food_category VARCHAR(100);

-- Add comment explaining food categories
COMMENT ON COLUMN cached_recipes.food_category IS 'Food category for portion size recommendations (e.g., soup_thin, rice_cooked, meat_cooked)';

-- Create index for faster category-based queries
CREATE INDEX IF NOT EXISTS idx_cached_recipes_food_category ON cached_recipes(food_category);

-- Add food_category column to portion_sizes table
ALTER TABLE portion_sizes
ADD COLUMN IF NOT EXISTS food_category VARCHAR(100);

-- Add comment
COMMENT ON COLUMN portion_sizes.food_category IS 'Specific food category this portion size is designed for';

-- Create index for category-specific portion lookups
CREATE INDEX IF NOT EXISTS idx_portion_sizes_food_category ON portion_sizes(food_category);

-- Update portion_sizes category constraint to allow more measurement types
-- First, drop the existing constraint
ALTER TABLE portion_sizes DROP CONSTRAINT IF EXISTS portion_sizes_category_check;

-- Add updated constraint with additional measurement types
ALTER TABLE portion_sizes
ADD CONSTRAINT portion_sizes_category_check
CHECK (category IN ('cup', 'plate', 'bowl', 'glass', 'serving', 'piece', 'handful', 'scoop', 'slice', 'other'));
