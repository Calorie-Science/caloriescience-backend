-- Migration: Add ALL cooking methods for remaining ingredients
-- This completes the cooked variants for ALL appropriate ingredients in the database
-- 
-- Cooking Methods: steamed, sautéed, stir-fry, grilled, baked
-- Applied to: All vegetables, proteins, and appropriate grains

-- ================================================================================
-- REMAINING VEGETABLES - Add all 5 cooking methods
-- ================================================================================

-- TOMATO variants (all 5 methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed tomato', 'vegetable', 1, 'medium', 24, 1.2, 5.2, 0.2, 1.6, 3.5, 7, 18, 1080, 13, 0.35, 305, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/tomato.png'),
('sauteed tomato', 'vegetable', 1, 'medium', 62, 1.2, 5.3, 4.7, 1.6, 3.4, 8, 17.5, 1070, 13, 0.35, 302, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/tomato.png'),
('stir-fry tomato', 'vegetable', 1, 'medium', 52, 1.2, 5.2, 3.4, 1.55, 3.3, 9, 17.8, 1065, 12, 0.32, 298, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/tomato.png'),
('grilled tomato', 'vegetable', 1, 'medium', 26, 1.3, 5.4, 0.2, 1.7, 3.6, 7, 18.5, 1100, 14, 0.35, 310, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/tomato.png'),
('baked tomato', 'vegetable', 1, 'medium', 50, 1.2, 5.3, 3.2, 1.6, 3.5, 8, 18, 1095, 13, 0.34, 308, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/tomato.png')
ON CONFLICT (name) DO NOTHING;

-- CUCUMBER variants (mainly sautéed and stir-fry, as steaming/baking is uncommon)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('sauteed cucumber', 'vegetable', 1, 'medium', 85, 2.1, 11.5, 4.8, 1.6, 5.3, 8, 9, 330, 52, 0.35, 455, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/cucumber.jpg'),
('stir-fry cucumber', 'vegetable', 1, 'medium', 75, 2.1, 11.3, 3.6, 1.6, 5.2, 9, 9.2, 325, 51, 0.34, 450, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/cucumber.jpg')
ON CONFLICT (name) DO NOTHING;

-- SWEET POTATO variants (all 5 methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed sweet potato', 'vegetable', 1, 'medium', 105, 2.4, 24.5, 0.2, 3.9, 7.6, 42, 23, 19200, 45, 0.85, 555, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/sweet-potato.png'),
('sauteed sweet potato', 'vegetable', 1, 'medium', 143, 2.4, 24.6, 4.7, 3.9, 7.7, 44, 23, 19300, 46, 0.88, 560, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/sweet-potato.png'),
('stir-fry sweet potato', 'vegetable', 1, 'medium', 133, 2.4, 24.5, 3.5, 3.85, 7.6, 45, 23.2, 19250, 45, 0.86, 555, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/sweet-potato.png'),
('grilled sweet potato', 'vegetable', 1, 'medium', 110, 2.5, 25, 0.2, 4.1, 8, 43, 24, 19500, 47, 0.9, 570, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/sweet-potato.png'),
('baked sweet potato', 'vegetable', 1, 'medium', 130, 2.4, 24.8, 3.2, 4, 7.8, 45, 23.5, 19400, 46, 0.88, 565, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/sweet-potato.png')
ON CONFLICT (name) DO NOTHING;

-- POTATO (RUSSET) variants (all 5 methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed russet potato', 'vegetable', 1, 'medium', 170, 4.6, 38.5, 0.2, 2.8, 1.4, 12, 20, 3, 32, 1.95, 970, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/russet-or-Idaho-potatoes.png'),
('sauteed russet potato', 'vegetable', 1, 'medium', 208, 4.6, 38.8, 4.7, 2.8, 1.4, 14, 20, 4, 33, 2, 980, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/russet-or-Idaho-potatoes.png'),
('stir-fry russet potato', 'vegetable', 1, 'medium', 198, 4.6, 38.6, 3.5, 2.75, 1.35, 15, 20.2, 4, 32, 1.98, 975, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/russet-or-Idaho-potatoes.png'),
('grilled russet potato', 'vegetable', 1, 'medium', 175, 4.7, 39, 0.2, 2.9, 1.5, 12, 21, 4, 33, 2.05, 990, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/russet-or-Idaho-potatoes.png'),
('baked russet potato', 'vegetable', 1, 'medium', 195, 4.6, 38.9, 3.2, 2.85, 1.45, 14, 20.5, 4, 33, 2, 985, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/russet-or-Idaho-potatoes.png')
ON CONFLICT (name) DO NOTHING;

-- BEETROOT variants (all 5 methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed beetroot', 'vegetable', 100, 'g', 44, 1.7, 10, 0.2, 2.9, 7, 80, 5.2, 35, 17, 0.85, 335, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/beets.jpg'),
('sauteed beetroot', 'vegetable', 100, 'g', 83, 1.7, 10.2, 4.7, 2.9, 7.1, 82, 5, 36, 18, 0.88, 340, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/beets.jpg'),
('stir-fry beetroot', 'vegetable', 100, 'g', 73, 1.7, 10.1, 3.4, 2.85, 7, 83, 5.1, 35, 17, 0.86, 338, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/beets.jpg'),
('grilled beetroot', 'vegetable', 100, 'g', 47, 1.8, 10.5, 0.2, 3, 7.3, 81, 5.5, 38, 18, 0.9, 345, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/beets.jpg'),
('baked beetroot', 'vegetable', 100, 'g', 70, 1.7, 10.3, 3, 2.95, 7.2, 82, 5.3, 37, 18, 0.88, 342, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/beets.jpg')
ON CONFLICT (name) DO NOTHING;

-- RADISH variants (mainly sautéed and stir-fry)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed radish', 'vegetable', 1, 'cup', 20, 0.9, 4.2, 0.1, 2, 2.3, 47, 18, 8, 31, 0.4, 280, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/radishes.jpg'),
('sauteed radish', 'vegetable', 1, 'cup', 59, 0.9, 4.4, 4.6, 2, 2.4, 49, 17.8, 8, 31, 0.42, 285, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/radishes.jpg'),
('stir-fry radish', 'vegetable', 1, 'cup', 49, 0.9, 4.3, 3.3, 1.95, 2.3, 50, 18, 8, 30, 0.41, 282, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/radishes.jpg')
ON CONFLICT (name) DO NOTHING;

-- PORTOBELLO MUSHROOM variants (all 5 methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed portobello mushroom', 'vegetable', 1, 'cup', 37, 3.5, 5.6, 0.6, 2.2, 3.7, 16, 0, 0, 5, 0.85, 450, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/portobello-mushrooms.png'),
('sauteed portobello mushroom', 'vegetable', 1, 'cup', 75, 3.5, 5.8, 5.1, 2.2, 3.8, 18, 0, 0, 6, 0.88, 455, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/portobello-mushrooms.png'),
('stir-fry portobello mushroom', 'vegetable', 1, 'cup', 65, 3.5, 5.7, 3.8, 2.15, 3.7, 19, 0, 0, 6, 0.86, 452, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/portobello-mushrooms.png'),
('grilled portobello mushroom', 'vegetable', 1, 'cup', 40, 3.7, 6, 0.7, 2.4, 4, 16, 0, 0, 6, 0.9, 460, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/portobello-mushrooms.png'),
('baked portobello mushroom', 'vegetable', 1, 'cup', 63, 3.6, 5.8, 3.5, 2.2, 3.9, 18, 0, 0, 6, 0.88, 457, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/portobello-mushrooms.png')
ON CONFLICT (name) DO NOTHING;

-- SHIITAKE MUSHROOM variants (all 5 methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed shiitake mushroom', 'vegetable', 1, 'cup', 84, 2.4, 21.5, 0.3, 3.1, 3.9, 7, 0.6, 0, 2, 0.45, 175, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/shiitake-mushrooms.png'),
('sauteed shiitake mushroom', 'vegetable', 1, 'cup', 121, 2.4, 21.8, 4.8, 3.1, 4, 9, 0.5, 0, 2, 0.48, 180, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/shiitake-mushrooms.png'),
('stir-fry shiitake mushroom', 'vegetable', 1, 'cup', 111, 2.4, 21.6, 3.6, 3.05, 3.9, 10, 0.55, 0, 2, 0.46, 177, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/shiitake-mushrooms.png'),
('grilled shiitake mushroom', 'vegetable', 1, 'cup', 88, 2.5, 22, 0.3, 3.2, 4.1, 7, 0.7, 0, 3, 0.48, 182, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/shiitake-mushrooms.png'),
('baked shiitake mushroom', 'vegetable', 1, 'cup', 108, 2.4, 21.7, 3.3, 3.1, 4, 9, 0.6, 0, 2, 0.47, 179, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/shiitake-mushrooms.png')
ON CONFLICT (name) DO NOTHING;

-- BUTTON MUSHROOM variants (all 5 methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed button mushroom', 'vegetable', 1, 'cup', 22, 3.2, 3.2, 0.3, 1.05, 2, 6, 2.2, 0, 3, 0.55, 330, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/mushrooms-white.jpg'),
('sauteed button mushroom', 'vegetable', 1, 'cup', 61, 3.2, 3.4, 4.8, 1.05, 2.1, 8, 2.2, 0, 3, 0.58, 335, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/mushrooms-white.jpg'),
('stir-fry button mushroom', 'vegetable', 1, 'cup', 51, 3.2, 3.3, 3.5, 1, 2, 9, 2.3, 0, 3, 0.56, 332, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/mushrooms-white.jpg'),
('grilled button mushroom', 'vegetable', 1, 'cup', 25, 3.4, 3.5, 0.3, 1.1, 2.2, 6, 2.4, 0, 4, 0.58, 340, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/mushrooms-white.jpg'),
('baked button mushroom', 'vegetable', 1, 'cup', 48, 3.3, 3.4, 3.2, 1.05, 2.1, 8, 2.3, 0, 3, 0.57, 337, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/mushrooms-white.jpg')
ON CONFLICT (name) DO NOTHING;

-- OYSTER MUSHROOM variants (all 5 methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed oyster mushroom', 'vegetable', 1, 'cup', 57, 5.4, 9.5, 0.6, 2.4, 1.6, 28, 0, 0, 3, 2.1, 375, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/oyster-mushrooms.png'),
('sauteed oyster mushroom', 'vegetable', 1, 'cup', 95, 5.4, 9.7, 5.1, 2.4, 1.6, 30, 0, 0, 3, 2.15, 380, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/oyster-mushrooms.png'),
('stir-fry oyster mushroom', 'vegetable', 1, 'cup', 85, 5.4, 9.6, 3.8, 2.35, 1.55, 31, 0, 0, 3, 2.12, 377, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/oyster-mushrooms.png'),
('grilled oyster mushroom', 'vegetable', 1, 'cup', 60, 5.6, 10, 0.7, 2.5, 1.7, 29, 0, 0, 4, 2.2, 385, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/oyster-mushrooms.png'),
('baked oyster mushroom', 'vegetable', 1, 'cup', 83, 5.5, 9.7, 3.5, 2.4, 1.6, 30, 0, 0, 3, 2.15, 382, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/oyster-mushrooms.png')
ON CONFLICT (name) DO NOTHING;

-- ================================================================================
-- PROTEINS - Add all cooking methods
-- ================================================================================

-- SALMON variants (all methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed salmon', 'protein', 100, 'g', 210, 20.5, 0, 13.2, 0, 0, 60, 152, 13, 0.85, 370, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/salmon.png'),
('grilled salmon', 'protein', 100, 'g', 215, 21, 0, 13.8, 0, 0, 61, 155, 14, 0.9, 380, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/salmon.png'),
('baked salmon', 'protein', 100, 'g', 220, 21.5, 0, 14.2, 0, 0, 62, 158, 14, 0.92, 385, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/salmon.png'),
('sauteed salmon', 'protein', 100, 'g', 248, 20.5, 0, 17.5, 0, 0, 64, 152, 13, 0.88, 375, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/salmon.png'),
('stir-fry salmon', 'protein', 100, 'g', 238, 20.8, 0, 16.3, 0, 0, 63, 154, 13, 0.9, 378, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/salmon.png')
ON CONFLICT (name) DO NOTHING;

-- EGG variants (all methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('boiled egg', 'protein', 1, 'large', 78, 6.3, 0.6, 5.3, 0, 0.6, 62, 293, 25, 0.6, 63, ARRAY['vegetarian','gluten-free','dairy-free'], ARRAY['vegetarian'], ARRAY['eggs'], 'https://spoonacular.com/cdn/ingredients_100x100/egg.png'),
('scrambled egg', 'protein', 1, 'large', 102, 6.7, 1.3, 7.5, 0, 1.1, 95, 405, 43, 1.1, 77, ARRAY['vegetarian','gluten-free','dairy-free'], ARRAY['vegetarian'], ARRAY['eggs'], 'https://spoonacular.com/cdn/ingredients_100x100/scrambled-eggs.png'),
('fried egg', 'protein', 1, 'large', 90, 6.3, 0.4, 7, 0, 0.2, 94, 335, 28, 0.9, 67, ARRAY['vegetarian','gluten-free','dairy-free'], ARRAY['vegetarian'], ARRAY['eggs'], 'https://spoonacular.com/cdn/ingredients_100x100/fried-egg.png'),
('poached egg', 'protein', 1, 'large', 71, 6.3, 0.4, 4.7, 0, 0.2, 147, 244, 25, 0.7, 60, ARRAY['vegetarian','gluten-free','dairy-free'], ARRAY['vegetarian'], ARRAY['eggs'], 'https://spoonacular.com/cdn/ingredients_100x100/poached-egg.png')
ON CONFLICT (name) DO NOTHING;

-- TUNA variants (all methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled tuna', 'protein', 100, 'g', 184, 29.9, 0, 6.3, 0, 0, 47, 655, 4, 1.2, 407, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/tuna.jpg'),
('baked tuna', 'protein', 100, 'g', 190, 30.2, 0, 6.8, 0, 0, 49, 670, 5, 1.25, 415, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/tuna.jpg'),
('sauteed tuna', 'protein', 100, 'g', 218, 29.5, 0, 10.2, 0, 0, 51, 650, 4, 1.2, 410, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/tuna.jpg')
ON CONFLICT (name) DO NOTHING;

-- COD variants (all methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed cod', 'protein', 100, 'g', 88, 19.4, 0, 0.7, 0, 0, 56, 38, 16, 0.4, 413, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/cod-fillet.jpg'),
('grilled cod', 'protein', 100, 'g', 92, 20, 0, 0.8, 0, 0, 58, 40, 17, 0.42, 420, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/cod-fillet.jpg'),
('baked cod', 'protein', 100, 'g', 105, 20.5, 0, 2.2, 0, 0, 60, 42, 18, 0.45, 425, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/cod-fillet.jpg'),
('sauteed cod', 'protein', 100, 'g', 128, 19.5, 0, 5.3, 0, 0, 62, 39, 17, 0.42, 418, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/cod-fillet.jpg')
ON CONFLICT (name) DO NOTHING;

-- BEEF (SIRLOIN) variants (all methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled beef sirloin', 'protein', 100, 'g', 200, 29, 0, 8.2, 0, 0, 63, 0, 18, 2.6, 344, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/beef-sirloin.jpg'),
('baked beef sirloin', 'protein', 100, 'g', 205, 29.5, 0, 8.5, 0, 0, 65, 0, 19, 2.65, 350, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/beef-sirloin.jpg'),
('sauteed beef sirloin', 'protein', 100, 'g', 235, 28.5, 0, 12.5, 0, 0, 68, 0, 18, 2.58, 342, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/beef-sirloin.jpg'),
('stir-fry beef sirloin', 'protein', 100, 'g', 225, 28.8, 0, 11.3, 0, 0, 66, 0, 18, 2.6, 345, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/beef-sirloin.jpg')
ON CONFLICT (name) DO NOTHING;

-- PORK CHOP variants (all methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled pork chop', 'protein', 100, 'g', 213, 28.5, 0, 10, 0, 0, 62, 2, 6, 0.9, 403, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/pork-chops.png'),
('baked pork chop', 'protein', 100, 'g', 218, 29, 0, 10.5, 0, 0, 64, 2, 6, 0.92, 408, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/pork-chops.png'),
('sauteed pork chop', 'protein', 100, 'g', 248, 28, 0, 14.5, 0, 0, 67, 2, 6, 0.9, 405, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/pork-chops.png')
ON CONFLICT (name) DO NOTHING;

-- LAMB CHOP variants (all methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled lamb chop', 'protein', 100, 'g', 258, 25.6, 0, 17, 0, 0, 72, 0, 17, 1.9, 310, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/lamb-chops.jpg'),
('baked lamb chop', 'protein', 100, 'g', 265, 26, 0, 17.5, 0, 0, 74, 0, 18, 1.95, 315, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/lamb-chops.jpg'),
('sauteed lamb chop', 'protein', 100, 'g', 295, 25.5, 0, 21.5, 0, 0, 77, 0, 17, 1.88, 312, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/lamb-chops.jpg')
ON CONFLICT (name) DO NOTHING;

-- DUCK BREAST variants (all methods)  
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled duck breast', 'protein', 100, 'g', 130, 20.5, 0, 5, 0, 0, 68, 44, 12, 2.6, 280, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/duck.png'),
('baked duck breast', 'protein', 100, 'g', 135, 21, 0, 5.3, 0, 0, 70, 46, 12, 2.65, 285, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/duck.png'),
('sauteed duck breast', 'protein', 100, 'g', 163, 20.2, 0, 8.8, 0, 0, 73, 43, 11, 2.58, 278, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/duck.png')
ON CONFLICT (name) DO NOTHING;

-- TURKEY BREAST variants (all methods)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled turkey breast', 'protein', 100, 'g', 135, 30, 0, 1.5, 0, 0, 60, 0, 10, 1.4, 305, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/turkey-breasts.png'),
('baked turkey breast', 'protein', 100, 'g', 140, 30.5, 0, 1.7, 0, 0, 62, 0, 11, 1.45, 310, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/turkey-breasts.png'),
('sauteed turkey breast', 'protein', 100, 'g', 170, 29.8, 0, 5.2, 0, 0, 65, 0, 10, 1.42, 308, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/turkey-breasts.png')
ON CONFLICT (name) DO NOTHING;

-- CRAB variants (steamed, grilled)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed crab', 'protein', 100, 'g', 87, 18.5, 0, 1.1, 0, 0, 300, 8, 92, 0.52, 335, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['shellfish'], 'https://spoonacular.com/cdn/ingredients_100x100/crabmeat.jpg'),
('grilled crab', 'protein', 100, 'g', 90, 19, 0, 1.2, 0, 0, 305, 9, 95, 0.55, 342, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['shellfish'], 'https://spoonacular.com/cdn/ingredients_100x100/crabmeat.jpg')
ON CONFLICT (name) DO NOTHING;

-- SCALLOPS variants (grilled, sauteed, baked)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled scallops', 'protein', 100, 'g', 112, 21, 3, 1.4, 0, 0, 392, 7, 24, 0.7, 314, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['shellfish'], 'https://spoonacular.com/cdn/ingredients_100x100/scallops.jpg'),
('sauteed scallops', 'protein', 100, 'g', 142, 20.5, 3.1, 6.2, 0, 0, 398, 7, 24, 0.68, 312, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['shellfish'], 'https://spoonacular.com/cdn/ingredients_100x100/scallops.jpg'),
('baked scallops', 'protein', 100, 'g', 120, 21.2, 3.2, 2.3, 0, 0, 395, 8, 25, 0.72, 318, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['shellfish'], 'https://spoonacular.com/cdn/ingredients_100x100/scallops.jpg')
ON CONFLICT (name) DO NOTHING;

-- TEMPEH variants (steamed, grilled, baked, sauteed, stir-fry)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed tempeh', 'protein', 100, 'g', 195, 20, 7.6, 11, 0, 0, 10, 0, 111, 2.7, 412, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tempeh.jpg'),
('grilled tempeh', 'protein', 100, 'g', 200, 20.5, 7.8, 11.3, 0, 0, 11, 0, 115, 2.8, 420, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tempeh.jpg'),
('baked tempeh', 'protein', 100, 'g', 218, 20.3, 7.8, 14.2, 0, 0, 12, 0, 113, 2.75, 418, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tempeh.jpg'),
('sauteed tempeh', 'protein', 100, 'g', 235, 19.8, 7.7, 16.8, 0, 0, 13, 0, 110, 2.72, 415, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tempeh.jpg'),
('stir-fry tempeh', 'protein', 100, 'g', 225, 20, 7.7, 15.3, 0, 0, 12, 0, 112, 2.75, 417, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tempeh.jpg')
ON CONFLICT (name) DO NOTHING;

-- SEITAN variants (grilled, baked, sauteed, stir-fry)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled seitan', 'protein', 100, 'g', 130, 25, 4, 1.9, 0.6, 0.5, 380, 0, 25, 3.6, 120, ARRAY['vegan','vegetarian','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['gluten'], 'https://spoonacular.com/cdn/ingredients_100x100/seitan.jpg'),
('baked seitan', 'protein', 100, 'g', 138, 25.5, 4.2, 2.5, 0.6, 0.5, 385, 0, 26, 3.7, 125, ARRAY['vegan','vegetarian','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['gluten'], 'https://spoonacular.com/cdn/ingredients_100x100/seitan.jpg'),
('sauteed seitan', 'protein', 100, 'g', 168, 24.8, 4.3, 6.8, 0.6, 0.5, 390, 0, 25, 3.65, 122, ARRAY['vegan','vegetarian','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['gluten'], 'https://spoonacular.com/cdn/ingredients_100x100/seitan.jpg'),
('stir-fry seitan', 'protein', 100, 'g', 158, 25, 4.2, 5.3, 0.6, 0.5, 387, 0, 25, 3.68, 123, ARRAY['vegan','vegetarian','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['gluten'], 'https://spoonacular.com/cdn/ingredients_100x100/seitan.jpg')
ON CONFLICT (name) DO NOTHING;

-- ================================================================================
-- ADDITIONAL VEGETABLES
-- ================================================================================

-- ONION variants (sauteed, grilled, baked)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('sauteed onion', 'vegetable', 1, 'medium', 84, 1.2, 10.5, 4.7, 2, 5, 6, 8.2, 2, 27, 0.25, 165, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/brown-onion.png'),
('grilled onion', 'vegetable', 1, 'medium', 48, 1.3, 11, 0.1, 2.1, 5.2, 5, 8.5, 2, 28, 0.25, 170, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/brown-onion.png'),
('baked onion', 'vegetable', 1, 'medium', 72, 1.2, 10.7, 3.2, 2, 5.1, 6, 8.3, 2, 27, 0.25, 168, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/brown-onion.png')
ON CONFLICT (name) DO NOTHING;

-- RED ONION variants (sauteed, grilled, baked)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('sauteed red onion', 'vegetable', 1, 'medium', 82, 1.3, 10.5, 4.6, 2, 4.8, 5, 8.3, 2, 27, 0.22, 165, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/red-onion.png'),
('grilled red onion', 'vegetable', 1, 'medium', 47, 1.3, 10.8, 0.1, 2.1, 5, 4, 8.5, 2, 28, 0.22, 168, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/red-onion.png'),
('baked red onion', 'vegetable', 1, 'medium', 70, 1.3, 10.6, 3.2, 2, 4.9, 5, 8.4, 2, 27, 0.22, 167, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/red-onion.png')
ON CONFLICT (name) DO NOTHING;

-- GARLIC variants (sauteed, baked)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('sauteed garlic', 'vegetable', 3, 'cloves', 21, 0.6, 3.3, 0.8, 0.2, 0.1, 2, 3.1, 0, 18, 0.17, 38, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/garlic.png'),
('baked garlic', 'vegetable', 3, 'cloves', 18, 0.6, 3.2, 0.5, 0.2, 0.1, 2, 3.2, 0, 19, 0.18, 40, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/garlic.png')
ON CONFLICT (name) DO NOTHING;

-- GINGER variants (sauteed, stir-fry)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('sauteed ginger', 'vegetable', 1, 'tbsp', 14, 0.2, 1.8, 0.6, 0.2, 0.2, 1, 0.5, 0, 2, 0.06, 42, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/ginger.png'),
('stir-fry ginger', 'vegetable', 1, 'tbsp', 12, 0.2, 1.7, 0.4, 0.2, 0.2, 1, 0.5, 0, 2, 0.06, 41, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/ginger.png')
ON CONFLICT (name) DO NOTHING;

-- LEEK variants (steamed, sauteed, grilled)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed leek', 'vegetable', 1, 'medium', 56, 1.4, 13, 0.3, 1.7, 3.7, 19, 11.2, 87, 56, 2, 168, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/leeks.jpg'),
('sauteed leek', 'vegetable', 1, 'medium', 93, 1.4, 13.2, 4.7, 1.7, 3.8, 21, 11, 86, 55, 2, 165, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/leeks.jpg'),
('grilled leek', 'vegetable', 1, 'medium', 58, 1.5, 13.5, 0.3, 1.8, 3.9, 19, 11.5, 90, 58, 2.05, 172, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/leeks.jpg')
ON CONFLICT (name) DO NOTHING;

-- SCALLION variants (sauteed, stir-fry)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('sauteed scallion', 'vegetable', 1, 'medium', 10, 0.3, 1.2, 0.5, 0.4, 0.4, 3, 2.8, 52, 11, 0.22, 44, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/spring-onions.jpg'),
('stir-fry scallion', 'vegetable', 1, 'medium', 9, 0.3, 1.2, 0.4, 0.4, 0.4, 3, 2.8, 51, 10, 0.21, 43, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/spring-onions.jpg')
ON CONFLICT (name) DO NOTHING;

-- BITTER GOURD variants (steamed, sauteed, stir-fry)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed bitter gourd', 'vegetable', 100, 'g', 19, 1.1, 4, 0.2, 2.9, 2, 6, 88, 490, 20, 0.42, 305, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/bitter-melon.jpg'),
('sauteed bitter gourd', 'vegetable', 100, 'g', 58, 1.1, 4.2, 4.7, 2.95, 2.1, 7, 87, 485, 21, 0.44, 310, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/bitter-melon.jpg'),
('stir-fry bitter gourd', 'vegetable', 100, 'g', 48, 1.1, 4.1, 3.4, 2.9, 2, 8, 87.5, 483, 20, 0.43, 307, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/bitter-melon.jpg')
ON CONFLICT (name) DO NOTHING;

-- TURAI (Ridge Gourd) variants (steamed, sauteed, stir-fry)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed turai', 'vegetable', 100, 'g', 22, 1.3, 4.6, 0.2, 1.2, 2.6, 4, 5.8, 198, 19, 0.42, 145, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/ridge-gourd.jpg'),
('sauteed turai', 'vegetable', 100, 'g', 60, 1.3, 4.8, 4.7, 1.2, 2.7, 5, 5.7, 195, 20, 0.44, 148, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/ridge-gourd.jpg'),
('stir-fry turai', 'vegetable', 100, 'g', 50, 1.3, 4.7, 3.4, 1.15, 2.6, 6, 5.8, 193, 19, 0.43, 146, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/ridge-gourd.jpg')
ON CONFLICT (name) DO NOTHING;

-- Add comment
COMMENT ON TABLE simple_ingredients IS 'Comprehensive simple ingredients database with raw and multiple cooking methods (steamed, sautéed, stir-fry, grilled, baked) for all appropriate ingredients';

