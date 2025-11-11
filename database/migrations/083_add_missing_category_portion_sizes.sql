-- Migration: Create junction table and link portion sizes to missing food categories
-- Description: Enable many-to-many relationship between portion_sizes and food_categories
-- Based on: USDA FNDDS 2019-2020 standards and Food Measurements Reference Document
-- Created: 2025-02-05

-- Problem: food_category_id on portion_sizes creates 1:many relationship
-- Solution: Create food_category_portion_sizes junction table for many:many relationship

BEGIN;

-- ============================================
-- Create junction table for many-to-many relationship
-- ============================================
CREATE TABLE IF NOT EXISTS food_category_portion_sizes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  food_category_id UUID NOT NULL REFERENCES food_categories(id) ON DELETE CASCADE,
  portion_size_id UUID NOT NULL REFERENCES portion_sizes(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(food_category_id, portion_size_id)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_fc_ps_food_category ON food_category_portion_sizes(food_category_id);
CREATE INDEX IF NOT EXISTS idx_fc_ps_portion_size ON food_category_portion_sizes(portion_size_id);

COMMENT ON TABLE food_category_portion_sizes IS 'Junction table linking portion sizes to food categories (many-to-many)';

-- ============================================
-- Migrate existing data from food_category_id to junction table
-- ============================================
INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT DISTINCT food_category_id, id
FROM portion_sizes
WHERE food_category_id IS NOT NULL
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- ============================================
-- Link shared portion sizes to missing categories
-- ============================================

-- 1. BEVERAGE_MILK - Link to existing glass/cup sizes
INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'beverage_milk'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Glass (150ml)',
  'Medium Glass (250ml)',
  'Large Glass (400ml)',
  'Medium Cup (240ml)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- 2. BEVERAGE_SOFT_DRINK - Link to existing glass sizes
INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'beverage_soft_drink'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Glass (150ml)',
  'Medium Glass (250ml)',
  'Large Glass (400ml)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- Add soft drink specific sizes (can, bottle)
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Can (330ml)', 'Standard can size', 'serving', 330, 343.2, 1.32, FALSE),
  ('Bottle (500ml)', 'Standard bottle size', 'serving', 500, 520, 2.0, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'beverage_soft_drink'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN ('Can (330ml)', 'Bottle (500ml)')
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- 3. BROTH - Link to existing bowl sizes
INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'broth'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Bowl (200g)',
  'Medium Bowl (250g)',
  'Large Bowl (400g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- 4. MOUSSE - Create and link dessert portions
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Dessert (100ml/90g)', 'Small mousse or dessert portion', 'serving', 100, 90, 0.667, FALSE),
  ('Medium Dessert (150ml/135g)', 'Standard dessert portion', 'serving', 150, 135, 1.0, TRUE),
  ('Large Dessert (200ml/180g)', 'Large dessert portion', 'serving', 200, 180, 1.333, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'mousse'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Dessert (100ml/90g)',
  'Medium Dessert (150ml/135g)',
  'Large Dessert (200ml/180g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- 5. TOFU_SOY - Create and link tofu portions
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup Tofu (85g)', 'Half cup of tofu cubes', 'serving', NULL, 85, 0.68, FALSE),
  ('¾ Cup Tofu (125g)', 'Three-quarter cup tofu', 'serving', NULL, 125, 1.0, TRUE),
  ('1 Cup Tofu (165g)', 'Full cup of tofu', 'serving', NULL, 165, 1.32, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'tofu_soy'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  '½ Cup Tofu (85g)',
  '¾ Cup Tofu (125g)',
  '1 Cup Tofu (165g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- 6. DRIED_FRUIT - Create and link dried fruit portions
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Handful (30g)', 'Small portion (dried fruit, nuts)', 'serving', NULL, 30, 0.75, FALSE),
  ('Handful (40g)', 'Standard handful serving', 'serving', NULL, 40, 1.0, TRUE),
  ('¼ Cup Dried (40g)', 'Quarter cup dried fruit', 'cup', NULL, 40, 1.0, FALSE),
  ('Large Handful (60g)', 'Large portion handful', 'serving', NULL, 60, 1.5, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'fruit_dried'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Handful (30g)',
  'Handful (40g)',
  '¼ Cup Dried (40g)',
  'Large Handful (60g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- 7. ROLLS_BAGELS - Create and link bread product portions
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Roll (50g)', 'Small dinner roll or slider', 'serving', NULL, 50, 0.625, FALSE),
  ('Medium Roll (80g)', 'Standard roll or bun', 'serving', NULL, 80, 1.0, TRUE),
  ('Large Roll/Bagel (100g)', 'Large roll or standard bagel', 'serving', NULL, 100, 1.25, FALSE),
  ('Half Bagel (50g)', 'Half of standard bagel', 'serving', NULL, 50, 0.625, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'rolls_bagels'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Roll (50g)',
  'Medium Roll (80g)',
  'Large Roll/Bagel (100g)',
  'Half Bagel (50g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- 8. OTHER - Link to existing generic servings
INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'other'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  '1 Serving',
  'Half Serving',
  'Double Serving'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- ============================================
-- Additional categories from PDF section 6
-- ============================================

-- BEVERAGE_JUICE - Create juice-specific portions (smaller due to sugar content)
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Glass Juice (150ml)', 'Small juice serving', 'glass', 150, 156, 0.75, FALSE),
  ('Medium Glass Juice (200ml)', 'Standard juice serving', 'glass', 200, 208, 1.0, TRUE),
  ('Large Glass Juice (250ml)', 'Large juice serving', 'glass', 250, 260, 1.25, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'beverage_juice'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Glass Juice (150ml)',
  'Medium Glass Juice (200ml)',
  'Large Glass Juice (250ml)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- BEVERAGE_SMOOTHIE - Smoothie/shake portions (meal replacement sizing)
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Smoothie (200ml)', 'Small smoothie serving', 'cup', 200, 210, 0.667, FALSE),
  ('Medium Smoothie (300ml)', 'Standard smoothie serving', 'cup', 300, 315, 1.0, TRUE),
  ('Large Smoothie (450ml)', 'Large smoothie serving', 'cup', 450, 473, 1.5, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'beverage_smoothie'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Smoothie (200ml)',
  'Medium Smoothie (300ml)',
  'Large Smoothie (450ml)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- BEVERAGE_COFFEE_TEA - Coffee/tea portions (caffeine-containing)
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Cup Coffee/Tea (150ml)', 'Small cup serving', 'cup', 150, 150, 0.625, FALSE),
  ('Medium Cup Coffee/Tea (240ml)', 'Standard cup serving', 'cup', 240, 240, 1.0, TRUE),
  ('Large Mug Coffee/Tea (350ml)', 'Large mug serving', 'cup', 350, 350, 1.458, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'beverage_coffee_tea'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Cup Coffee/Tea (150ml)',
  'Medium Cup Coffee/Tea (240ml)',
  'Large Mug Coffee/Tea (350ml)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- MILK_DAIRY - Similar to beverage_milk
INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'milk_dairy'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Glass (150ml)',
  'Medium Glass (250ml)',
  'Medium Cup (240ml)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- SOUP_THIN - Thin broth-based soups (volume measurement)
INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'soup_thin'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Bowl (200g)',
  'Medium Bowl (250g)',
  'Large Bowl (400g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- SOUP_THICK - Thick cream/pureed soups (weight preferred)
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Bowl Thick Soup (250g)', 'Small bowl cream soup', 'bowl', NULL, 250, 0.714, FALSE),
  ('Medium Bowl Thick Soup (350g)', 'Standard bowl cream soup', 'bowl', NULL, 350, 1.0, TRUE),
  ('Large Bowl Thick Soup (450g)', 'Large bowl cream soup', 'bowl', NULL, 450, 1.286, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'soup_thick'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Bowl Thick Soup (250g)',
  'Medium Bowl Thick Soup (350g)',
  'Large Bowl Thick Soup (450g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- STEW - Chunky stews (weight essential)
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Bowl Stew (250g)', 'Small bowl stew', 'bowl', NULL, 250, 0.714, FALSE),
  ('Medium Bowl Stew (350g)', 'Standard bowl stew', 'bowl', NULL, 350, 1.0, TRUE),
  ('Large Bowl Stew (450g)', 'Large bowl stew', 'bowl', NULL, 450, 1.286, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'stew'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Bowl Stew (250g)',
  'Medium Bowl Stew (350g)',
  'Large Bowl Stew (450g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- SAUCE_PASTA - Pasta sauces
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('½ Cup Sauce (120g)', 'Half cup pasta sauce', 'cup', NULL, 120, 0.5, FALSE),
  ('¾ Cup Sauce (180g)', 'Three-quarter cup sauce', 'cup', NULL, 180, 0.75, FALSE),
  ('1 Cup Sauce (240g)', 'Full cup pasta sauce', 'cup', NULL, 240, 1.0, TRUE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'sauce_pasta'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  '½ Cup Sauce (120g)',
  '¾ Cup Sauce (180g)',
  '1 Cup Sauce (240g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- CURRY_SAUCED_DISH - Curries and sauced dishes
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Bowl Curry (250g)', 'Small bowl curry', 'bowl', NULL, 250, 0.714, FALSE),
  ('Medium Bowl Curry (350g)', 'Standard bowl curry', 'bowl', NULL, 350, 1.0, TRUE),
  ('Large Bowl Curry (450g)', 'Large bowl curry', 'bowl', NULL, 450, 1.286, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'curry_sauced_dish'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Bowl Curry (250g)',
  'Medium Bowl Curry (350g)',
  'Large Bowl Curry (450g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- PUDDING - Pudding and custards
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Cup Pudding (100g)', 'Small pudding serving', 'cup', NULL, 100, 0.667, FALSE),
  ('Medium Cup Pudding (150g)', 'Standard pudding serving', 'cup', NULL, 150, 1.0, TRUE),
  ('Large Cup Pudding (200g)', 'Large pudding serving', 'cup', NULL, 200, 1.333, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'pudding'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Cup Pudding (100g)',
  'Medium Cup Pudding (150g)',
  'Large Cup Pudding (200g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

-- MIXED_DISH - General mixed dishes
INSERT INTO portion_sizes (name, description, category, volume_ml, weight_g, multiplier, is_default) VALUES
  ('Small Plate Mixed (200g)', 'Small plate mixed dish', 'plate', NULL, 200, 0.8, FALSE),
  ('Medium Plate Mixed (250g)', 'Standard plate mixed dish', 'plate', NULL, 250, 1.0, TRUE),
  ('Large Plate Mixed (350g)', 'Large plate mixed dish', 'plate', NULL, 350, 1.4, FALSE)
ON CONFLICT (name) DO NOTHING;

INSERT INTO food_category_portion_sizes (food_category_id, portion_size_id)
SELECT
  (SELECT id FROM food_categories WHERE code = 'mixed_dish'),
  ps.id
FROM portion_sizes ps
WHERE ps.name IN (
  'Small Plate Mixed (200g)',
  'Medium Plate Mixed (250g)',
  'Large Plate Mixed (350g)'
)
ON CONFLICT (food_category_id, portion_size_id) DO NOTHING;

COMMIT;

-- ============================================
-- Verification Queries
-- ============================================
-- Uncomment to verify the migration results:

-- Check portion sizes per category via junction table
-- SELECT
--     fc.code,
--     fc.name as category_name,
--     COUNT(fcps.id) as portion_count,
--     STRING_AGG(ps.name, ', ' ORDER BY ps.multiplier) as portion_sizes
-- FROM food_categories fc
-- LEFT JOIN food_category_portion_sizes fcps ON fcps.food_category_id = fc.id
-- LEFT JOIN portion_sizes ps ON ps.id = fcps.portion_size_id
-- WHERE fc.code IN (
--     'beverage_milk',
--     'beverage_soft_drink',
--     'broth',
--     'mousse',
--     'tofu_soy',
--     'fruit_dried',
--     'rolls_bagels',
--     'other'
-- )
-- GROUP BY fc.id, fc.code, fc.name
-- ORDER BY fc.code;

-- Check how many categories each portion size is linked to
-- SELECT
--     ps.name,
--     COUNT(fcps.id) as category_count,
--     STRING_AGG(fc.code, ', ') as categories
-- FROM portion_sizes ps
-- LEFT JOIN food_category_portion_sizes fcps ON fcps.portion_size_id = ps.id
-- LEFT JOIN food_categories fc ON fc.id = fcps.food_category_id
-- GROUP BY ps.id, ps.name
-- HAVING COUNT(fcps.id) > 1
-- ORDER BY category_count DESC;
