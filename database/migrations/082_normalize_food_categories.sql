-- Migration: Normalize food categories
-- Description: Create food_categories table and migrate string references to foreign keys
-- Created: 2025-02-05

-- Create food_categories table
CREATE TABLE IF NOT EXISTS food_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code VARCHAR(100) UNIQUE NOT NULL, -- e.g., 'beverage_water', 'soup_thin', etc.
  name VARCHAR(255) NOT NULL, -- Human-readable name
  description TEXT,
  category_group VARCHAR(100), -- e.g., 'Beverages', 'Soups & Stews', etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on code for faster lookups
CREATE INDEX IF NOT EXISTS idx_food_categories_code ON food_categories(code);
CREATE INDEX IF NOT EXISTS idx_food_categories_group ON food_categories(category_group);

-- Insert all food categories from FoodCategory enum
INSERT INTO food_categories (code, name, category_group, description) VALUES
  -- Beverages
  ('beverage_water', 'Water & Unsweetened Beverages', 'Beverages', 'Water and unsweetened drinks'),
  ('beverage_juice', 'Fruit & Vegetable Juices', 'Beverages', 'Fruit and vegetable juices'),
  ('beverage_milk', 'Milk & Dairy Drinks', 'Beverages', 'Milk and dairy-based beverages'),
  ('beverage_smoothie', 'Smoothies & Shakes', 'Beverages', 'Blended smoothies and shakes'),
  ('beverage_coffee_tea', 'Coffee & Tea', 'Beverages', 'Coffee, tea, and related beverages'),
  ('beverage_soft_drink', 'Soft Drinks & Sweetened Beverages', 'Beverages', 'Carbonated and sweetened drinks'),

  -- Soups & Stews
  ('soup_thin', 'Thin Soups (Broth-based)', 'Soups & Stews', 'Thin, broth-based soups'),
  ('soup_thick', 'Thick Soups (Cream/Pureed)', 'Soups & Stews', 'Thick, creamy or pureed soups'),
  ('stew', 'Stews & Chunky Dishes', 'Soups & Stews', 'Stews with chunky ingredients'),
  ('broth', 'Broths & Consommé', 'Soups & Stews', 'Clear broths and consommé'),

  -- Grains & Starches
  ('cereal_dry', 'Dry Breakfast Cereal', 'Grains & Starches', 'Dry breakfast cereals'),
  ('cereal_cooked', 'Cooked Oatmeal/Porridge', 'Grains & Starches', 'Cooked cereals like oatmeal'),
  ('rice_cooked', 'Cooked Rice', 'Grains & Starches', 'Cooked rice (all varieties)'),
  ('pasta_cooked', 'Cooked Pasta', 'Grains & Starches', 'Cooked pasta (all shapes)'),
  ('quinoa_cooked', 'Cooked Quinoa/Ancient Grains', 'Grains & Starches', 'Cooked quinoa and other ancient grains'),
  ('bread', 'Bread', 'Grains & Starches', 'Sliced bread'),
  ('rolls_bagels', 'Rolls, Bagels, Buns', 'Grains & Starches', 'Rolls, bagels, and buns'),

  -- Protein Foods
  ('meat_cooked', 'Cooked Meat (Beef, Pork, Lamb)', 'Protein Foods', 'Cooked red meat'),
  ('poultry_cooked', 'Cooked Poultry (Chicken, Turkey)', 'Protein Foods', 'Cooked poultry'),
  ('fish_seafood', 'Fish & Seafood', 'Protein Foods', 'Fish and seafood'),
  ('eggs', 'Eggs', 'Protein Foods', 'Eggs (all preparations)'),
  ('tofu_soy', 'Tofu & Soy Products', 'Protein Foods', 'Tofu and soy-based proteins'),
  ('beans_legumes', 'Beans & Legumes (Cooked)', 'Protein Foods', 'Cooked beans and legumes'),
  ('nuts_seeds', 'Nuts & Seeds', 'Protein Foods', 'Nuts and seeds'),

  -- Dairy Products
  ('milk_dairy', 'Milk (All Types)', 'Dairy Products', 'Milk of all types'),
  ('yogurt', 'Yogurt', 'Dairy Products', 'Yogurt (all varieties)'),
  ('cheese_hard', 'Hard Cheese (Cheddar, Swiss)', 'Dairy Products', 'Hard cheeses'),
  ('cheese_soft', 'Soft Cheese (Ricotta, Cottage)', 'Dairy Products', 'Soft cheeses'),
  ('ice_cream', 'Ice Cream', 'Dairy Products', 'Ice cream and frozen desserts'),

  -- Fruits & Vegetables
  ('fruit_whole', 'Fresh Fruit (Whole)', 'Fruits & Vegetables', 'Whole fresh fruits'),
  ('fruit_berries', 'Berries', 'Fruits & Vegetables', 'Berries of all types'),
  ('fruit_chopped', 'Cut/Chopped Fruit', 'Fruits & Vegetables', 'Cut or chopped fruit'),
  ('fruit_dried', 'Dried Fruit', 'Fruits & Vegetables', 'Dried fruits'),
  ('vegetable_raw_leafy', 'Raw Leafy Greens', 'Fruits & Vegetables', 'Raw leafy vegetables'),
  ('vegetable_cooked', 'Cooked Vegetables', 'Fruits & Vegetables', 'Cooked vegetables'),
  ('potato', 'Potatoes', 'Fruits & Vegetables', 'Potatoes (all preparations)'),

  -- Fats & Oils
  ('oil_liquid', 'Liquid Cooking Oils', 'Fats & Oils', 'Liquid cooking oils'),
  ('butter_spread', 'Butter/Margarine Spreads', 'Fats & Oils', 'Butter and margarine spreads'),

  -- Desserts
  ('pudding', 'Pudding', 'Desserts', 'Pudding and custards'),
  ('mousse', 'Mousse', 'Desserts', 'Mousse and aerated desserts'),

  -- Sauces & Mixed Dishes
  ('sauce_pasta', 'Pasta Sauce', 'Sauces & Mixed Dishes', 'Pasta sauces'),
  ('curry_sauced_dish', 'Curry & Sauced Dishes', 'Sauces & Mixed Dishes', 'Curries and sauced dishes'),

  -- Mixed/Other
  ('mixed_dish', 'Mixed Dish', 'Other', 'Mixed dishes'),
  ('other', 'Other', 'Other', 'Uncategorized foods')
ON CONFLICT (code) DO NOTHING;

-- Add food_category_id column to cached_recipes
ALTER TABLE cached_recipes
ADD COLUMN IF NOT EXISTS food_category_id UUID REFERENCES food_categories(id) ON DELETE SET NULL;

-- Create index for food_category_id
CREATE INDEX IF NOT EXISTS idx_cached_recipes_food_category_id ON cached_recipes(food_category_id);

-- Migrate existing food_category string values to food_category_id
UPDATE cached_recipes cr
SET food_category_id = fc.id
FROM food_categories fc
WHERE cr.food_category = fc.code
  AND cr.food_category IS NOT NULL;

-- Add food_category_id column to portion_sizes
ALTER TABLE portion_sizes
ADD COLUMN IF NOT EXISTS food_category_id UUID REFERENCES food_categories(id) ON DELETE SET NULL;

-- Create index for food_category_id
CREATE INDEX IF NOT EXISTS idx_portion_sizes_food_category_id ON portion_sizes(food_category_id);

-- Migrate existing food_category string values to food_category_id
UPDATE portion_sizes ps
SET food_category_id = fc.id
FROM food_categories fc
WHERE ps.food_category = fc.code
  AND ps.food_category IS NOT NULL;

-- Add comments
COMMENT ON TABLE food_categories IS 'Master table of food categories for portion size recommendations';
COMMENT ON COLUMN food_categories.code IS 'Unique code identifier (e.g., beverage_water, soup_thin)';
COMMENT ON COLUMN food_categories.name IS 'Human-readable category name';
COMMENT ON COLUMN food_categories.category_group IS 'Grouping for UI organization (e.g., Beverages, Soups & Stews)';
COMMENT ON COLUMN cached_recipes.food_category_id IS 'Reference to food category for portion size recommendations';
COMMENT ON COLUMN portion_sizes.food_category_id IS 'Reference to specific food category this portion size is designed for';

-- Note: We keep the old food_category VARCHAR columns for now to maintain backward compatibility
-- They can be removed in a future migration after all code has been updated
