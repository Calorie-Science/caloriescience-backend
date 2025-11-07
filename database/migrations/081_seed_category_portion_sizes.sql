-- Migration: Seed category-specific portion sizes
-- Description: Populate portion sizes for different food categories
-- Created: 2025-02-01

-- Insert category-specific portion sizes

-- Beverages - Water
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Glass (Water)', '200 mL', 'glass', 'beverage_water', 200, NULL, 0.8, FALSE),
  ('Medium Glass (Water)', '300 mL', 'glass', 'beverage_water', 300, NULL, 1.0, TRUE),
  ('Large Glass (Water)', '400 mL', 'glass', 'beverage_water', 400, NULL, 1.33, FALSE),
  ('Cup (Water)', '240 mL', 'cup', 'beverage_water', 240, NULL, 0.8, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Beverages - Juice
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Glass (Juice)', '150 mL', 'glass', 'beverage_juice', 150, NULL, 0.6, FALSE),
  ('Medium Glass (Juice)', '200 mL', 'glass', 'beverage_juice', 200, NULL, 1.0, TRUE),
  ('Large Glass (Juice)', '250 mL', 'glass', 'beverage_juice', 250, NULL, 1.25, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Beverages - Smoothie
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Cup (Smoothie)', '200 mL', 'cup', 'beverage_smoothie', 200, NULL, 0.67, FALSE),
  ('Medium Cup (Smoothie)', '300 mL', 'cup', 'beverage_smoothie', 300, NULL, 1.0, TRUE),
  ('Large Cup (Smoothie)', '450 mL', 'cup', 'beverage_smoothie', 450, NULL, 1.5, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Beverages - Coffee/Tea
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Cup (Coffee/Tea)', '150 mL', 'cup', 'beverage_coffee_tea', 150, NULL, 0.625, FALSE),
  ('Medium Cup (Coffee/Tea)', '240 mL', 'cup', 'beverage_coffee_tea', 240, NULL, 1.0, TRUE),
  ('Large Mug (Coffee/Tea)', '350 mL', 'cup', 'beverage_coffee_tea', 350, NULL, 1.458, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Beverages - Milk
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Glass (Milk)', '200 mL', 'glass', 'milk_dairy', 200, NULL, 0.833, FALSE),
  ('Cup (Milk)', '240 mL', 'cup', 'milk_dairy', 240, NULL, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Soups - Thin
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Bowl (Thin Soup)', '200 mL', 'bowl', 'soup_thin', 200, NULL, 0.667, FALSE),
  ('Medium Bowl (Thin Soup)', '300 mL', 'bowl', 'soup_thin', 300, NULL, 1.0, TRUE),
  ('Large Bowl (Thin Soup)', '400 mL', 'bowl', 'soup_thin', 400, NULL, 1.333, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Soups - Thick
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Bowl (Thick Soup)', '250 g', 'bowl', 'soup_thick', NULL, 250, 0.714, FALSE),
  ('Medium Bowl (Thick Soup)', '350 g', 'bowl', 'soup_thick', NULL, 350, 1.0, TRUE),
  ('Large Bowl (Thick Soup)', '450 g', 'bowl', 'soup_thick', NULL, 450, 1.286, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Stews
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Bowl (Stew)', '250 g', 'bowl', 'stew', NULL, 250, 0.714, FALSE),
  ('Medium Bowl (Stew)', '350 g', 'bowl', 'stew', NULL, 350, 1.0, TRUE),
  ('Large Bowl (Stew)', '450 g', 'bowl', 'stew', NULL, 450, 1.286, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Grains - Rice
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Rice)', '75 g', 'cup', 'rice_cooked', NULL, 75, 0.5, FALSE),
  ('¾ Cup (Rice)', '110 g', 'cup', 'rice_cooked', NULL, 110, 0.733, FALSE),
  ('1 Cup (Rice)', '150 g', 'cup', 'rice_cooked', NULL, 150, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Grains - Pasta
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Pasta)', '70 g', 'cup', 'pasta_cooked', NULL, 70, 0.5, FALSE),
  ('¾ Cup (Pasta)', '105 g', 'cup', 'pasta_cooked', NULL, 105, 0.75, FALSE),
  ('1 Cup (Pasta)', '140 g', 'cup', 'pasta_cooked', NULL, 140, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Grains - Quinoa
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Quinoa)', '90 g', 'cup', 'quinoa_cooked', NULL, 90, 0.5, FALSE),
  ('¾ Cup (Quinoa)', '135 g', 'cup', 'quinoa_cooked', NULL, 135, 0.75, FALSE),
  ('1 Cup (Quinoa)', '180 g', 'cup', 'quinoa_cooked', NULL, 180, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Cereal - Dry
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Bowl (Dry Cereal)', '30 g', 'bowl', 'cereal_dry', NULL, 30, 0.6, FALSE),
  ('Medium Bowl (Dry Cereal)', '50 g', 'bowl', 'cereal_dry', NULL, 50, 1.0, TRUE),
  ('Large Bowl (Dry Cereal)', '60 g', 'bowl', 'cereal_dry', NULL, 60, 1.2, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Cereal - Cooked (Oatmeal)
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Bowl (Oatmeal)', '150 g', 'bowl', 'cereal_cooked', NULL, 150, 0.75, FALSE),
  ('Medium Bowl (Oatmeal)', '200 g', 'bowl', 'cereal_cooked', NULL, 200, 1.0, TRUE),
  ('Large Bowl (Oatmeal)', '250 g', 'bowl', 'cereal_cooked', NULL, 250, 1.25, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Bread
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Slice (Bread)', '15-20 g', 'slice', 'bread', NULL, 17.5, 0.5, FALSE),
  ('1 Slice (Bread)', '30-40 g', 'slice', 'bread', NULL, 35, 1.0, TRUE),
  ('2 Slices (Bread)', '60-80 g', 'slice', 'bread', NULL, 70, 2.0, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Protein - Meat
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small (Meat)', '70 g (2.5 oz)', 'serving', 'meat_cooked', NULL, 70, 0.7, FALSE),
  ('Medium (Meat)', '100 g (3.5 oz)', 'serving', 'meat_cooked', NULL, 100, 1.0, TRUE),
  ('Large (Meat)', '140 g (5 oz)', 'serving', 'meat_cooked', NULL, 140, 1.4, FALSE),
  ('Palm-size (Meat)', '~100 g', 'serving', 'meat_cooked', NULL, 100, 1.0, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Protein - Poultry
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small (Poultry)', '85 g (3 oz)', 'serving', 'poultry_cooked', NULL, 85, 0.739, FALSE),
  ('Medium (Poultry)', '115 g (4 oz)', 'serving', 'poultry_cooked', NULL, 115, 1.0, TRUE),
  ('Large (Poultry)', '140 g (5 oz)', 'serving', 'poultry_cooked', NULL, 140, 1.217, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Protein - Fish
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small (Fish)', '85 g (3 oz)', 'serving', 'fish_seafood', NULL, 85, 0.739, FALSE),
  ('Medium (Fish)', '115 g (4 oz)', 'serving', 'fish_seafood', NULL, 115, 1.0, TRUE),
  ('Large (Fish)', '170 g (6 oz)', 'serving', 'fish_seafood', NULL, 170, 1.478, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Protein - Eggs
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('1 Medium Egg', '44 g', 'piece', 'eggs', NULL, 44, 0.88, FALSE),
  ('1 Large Egg', '50 g', 'piece', 'eggs', NULL, 50, 1.0, TRUE),
  ('1 Extra Large Egg', '56 g', 'piece', 'eggs', NULL, 56, 1.12, FALSE),
  ('2 Large Eggs', '100 g', 'piece', 'eggs', NULL, 100, 2.0, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Protein - Beans/Legumes
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Beans)', '85 g', 'cup', 'beans_legumes', NULL, 85, 0.5, FALSE),
  ('¾ Cup (Beans)', '130 g', 'cup', 'beans_legumes', NULL, 130, 0.765, FALSE),
  ('1 Cup (Beans)', '170 g', 'cup', 'beans_legumes', NULL, 170, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Protein - Nuts/Seeds
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Handful (Nuts)', '15 g', 'handful', 'nuts_seeds', NULL, 15, 0.5, FALSE),
  ('Handful (Nuts)', '30 g', 'handful', 'nuts_seeds', NULL, 30, 1.0, TRUE),
  ('Large Handful (Nuts)', '45 g', 'handful', 'nuts_seeds', NULL, 45, 1.5, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Dairy - Yogurt
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Container (Yogurt)', '150 g', 'serving', 'yogurt', NULL, 150, 0.625, FALSE),
  ('Large Container (Yogurt)', '200 g', 'serving', 'yogurt', NULL, 200, 0.833, FALSE),
  ('Cup (Yogurt)', '240 g', 'cup', 'yogurt', NULL, 240, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Dairy - Cheese (Hard)
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Slice (Hard Cheese)', '20 g', 'slice', 'cheese_hard', NULL, 20, 0.667, FALSE),
  ('Matchbox (Hard Cheese)', '30 g', 'serving', 'cheese_hard', NULL, 30, 1.0, TRUE),
  ('½ Cup Shredded (Hard Cheese)', '60 g', 'cup', 'cheese_hard', NULL, 60, 2.0, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Dairy - Cheese (Soft)
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Soft Cheese)', '120 g', 'cup', 'cheese_soft', NULL, 120, 0.5, FALSE),
  ('1 Cup (Soft Cheese)', '240 g', 'cup', 'cheese_soft', NULL, 240, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Dairy - Ice Cream
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Ice Cream)', '70 g', 'cup', 'ice_cream', NULL, 70, 0.7, FALSE),
  ('Scoop (Ice Cream)', '85 g', 'scoop', 'ice_cream', NULL, 85, 0.85, FALSE),
  ('1 Cup (Ice Cream)', '100 g', 'cup', 'ice_cream', NULL, 100, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Fruits - Whole
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('1 Small (Fruit)', '100 g', 'piece', 'fruit_whole', NULL, 100, 0.667, FALSE),
  ('1 Medium (Fruit)', '150 g', 'piece', 'fruit_whole', NULL, 150, 1.0, TRUE),
  ('1 Large (Fruit)', '200 g', 'piece', 'fruit_whole', NULL, 200, 1.333, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Fruits - Berries
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Berries)', '75 g', 'cup', 'fruit_berries', NULL, 75, 0.5, FALSE),
  ('¾ Cup (Berries)', '110 g', 'cup', 'fruit_berries', NULL, 110, 0.733, FALSE),
  ('1 Cup (Berries)', '150 g', 'cup', 'fruit_berries', NULL, 150, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Fruits - Chopped
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Chopped Fruit)', '80 g', 'cup', 'fruit_chopped', NULL, 80, 0.5, FALSE),
  ('¾ Cup (Chopped Fruit)', '120 g', 'cup', 'fruit_chopped', NULL, 120, 0.75, FALSE),
  ('1 Cup (Chopped Fruit)', '160 g', 'cup', 'fruit_chopped', NULL, 160, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Vegetables - Raw Leafy
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Cup Loose (Leafy Greens)', '30 g', 'cup', 'vegetable_raw_leafy', NULL, 30, 0.6, FALSE),
  ('Handful (Leafy Greens)', '50 g', 'handful', 'vegetable_raw_leafy', NULL, 50, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Vegetables - Cooked
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Cooked Vegetables)', '75 g', 'cup', 'vegetable_cooked', NULL, 75, 0.5, FALSE),
  ('¾ Cup (Cooked Vegetables)', '110 g', 'cup', 'vegetable_cooked', NULL, 110, 0.733, FALSE),
  ('1 Cup (Cooked Vegetables)', '150 g', 'cup', 'vegetable_cooked', NULL, 150, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Vegetables - Potato
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Potato', '100 g', 'piece', 'potato', NULL, 100, 0.667, FALSE),
  ('Medium Potato', '150 g', 'piece', 'potato', NULL, 150, 1.0, TRUE),
  ('Large Potato', '200 g', 'piece', 'potato', NULL, 200, 1.333, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Fats - Oil
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Teaspoon (Oil)', '5 mL (~4.6 g)', 'serving', 'oil_liquid', 5, NULL, 0.333, FALSE),
  ('Tablespoon (Oil)', '15 mL (~14 g)', 'serving', 'oil_liquid', 15, NULL, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Fats - Butter
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Teaspoon (Butter)', '5 g', 'serving', 'butter_spread', NULL, 5, 0.5, FALSE),
  ('Tablespoon (Butter)', '10 g', 'serving', 'butter_spread', NULL, 10, 1.0, TRUE),
  ('Pat (Butter)', '5 g', 'serving', 'butter_spread', NULL, 5, 0.5, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Sauces - Pasta Sauce
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup (Pasta Sauce)', '120 g', 'cup', 'sauce_pasta', NULL, 120, 0.5, FALSE),
  ('¾ Cup (Pasta Sauce)', '180 g', 'cup', 'sauce_pasta', NULL, 180, 0.75, FALSE),
  ('1 Cup (Pasta Sauce)', '240 g', 'cup', 'sauce_pasta', NULL, 240, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

-- Mixed Dishes - Curry
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Bowl (Curry)', '250 g', 'bowl', 'curry_sauced_dish', NULL, 250, 0.714, FALSE),
  ('Medium Bowl (Curry)', '350 g', 'bowl', 'curry_sauced_dish', NULL, 350, 1.0, TRUE),
  ('Large Bowl (Curry)', '450 g', 'bowl', 'curry_sauced_dish', NULL, 450, 1.286, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Desserts - Pudding
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Cup (Pudding)', '100 g', 'cup', 'pudding', NULL, 100, 0.667, FALSE),
  ('Medium Cup (Pudding)', '150 g', 'cup', 'pudding', NULL, 150, 1.0, TRUE),
  ('Large Cup (Pudding)', '200 g', 'cup', 'pudding', NULL, 200, 1.333, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Mixed Dishes - General
INSERT INTO portion_sizes (name, description, category, food_category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Plate (Mixed Dish)', '200 g', 'plate', 'mixed_dish', NULL, 200, 0.8, FALSE),
  ('Medium Plate (Mixed Dish)', '250 g', 'plate', 'mixed_dish', NULL, 250, 1.0, TRUE),
  ('Large Plate (Mixed Dish)', '350 g', 'plate', 'mixed_dish', NULL, 350, 1.4, FALSE)
ON CONFLICT (name) DO NOTHING;

-- Add comments
COMMENT ON COLUMN portion_sizes.food_category IS 'Links portion size to specific food category for intelligent recommendations';
