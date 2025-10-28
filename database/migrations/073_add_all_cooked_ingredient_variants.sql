-- Migration: Add steamed, sautéed, stir-fry, grilled, and baked variants for all appropriate ingredients
-- 
-- Cooking Method Adjustments:
-- - Steamed: No added fat, slightly concentrated nutrients, preserves vitamins
-- - Sautéed: +40-50 cal from oil, concentrated nutrients
-- - Stir-fry: +30-40 cal from oil, quick cooking preserves nutrients
-- - Grilled: +0-5 cal, concentrated from moisture loss, charred flavor
-- - Baked/Roasted: +20-30 cal if oiled, concentrated nutrients

-- ================================================================================
-- VEGETABLES - Complete all missing cooking methods
-- ================================================================================

-- BROCCOLI variants (add missing: steamed, baked)
-- Already exists: raw (072), sauteed (072), grilled (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed broccoli', 'vegetable', 100, 'g', 35, 2.9, 7.2, 0.4, 2.8, 1.8, 34, 90, 640, 49, 0.75, 325, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/broccoli.jpg'),
('baked broccoli', 'vegetable', 100, 'g', 62, 3, 7.5, 3, 2.9, 1.9, 36, 88, 660, 51, 0.78, 332, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/broccoli.jpg')
ON CONFLICT (name) DO NOTHING;

-- MUSHROOM variants (add missing: steamed, baked)
-- Already exists: raw (072), sauteed (072), grilled (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed mushroom', 'vegetable', 1, 'cup', 22, 3.2, 3.2, 0.3, 1.1, 2, 6, 2.2, 0, 3, 0.55, 330, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/mushrooms.png'),
('baked mushroom', 'vegetable', 1, 'cup', 50, 3.3, 3.4, 3.2, 1.15, 2.1, 7, 2.3, 0, 4, 0.58, 335, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/mushrooms.png')
ON CONFLICT (name) DO NOTHING;

-- SPINACH variants (add missing: steamed, grilled, baked)
-- Already exists: raw (072), sauteed (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed spinach', 'vegetable', 1, 'cup', 8, 1, 1.2, 0.1, 0.8, 0.1, 25, 9, 2900, 32, 0.85, 175, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/spinach.jpg'),
('grilled spinach', 'vegetable', 1, 'cup', 10, 1.2, 1.3, 0.1, 0.8, 0.1, 25, 9, 3200, 32, 0.9, 180, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/spinach.jpg'),
('baked spinach', 'vegetable', 1, 'cup', 35, 1, 1.4, 2.8, 0.85, 0.15, 26, 9.2, 3050, 33, 0.88, 178, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/spinach.jpg')
ON CONFLICT (name) DO NOTHING;

-- ZUCCHINI variants (add missing: steamed, sauteed, stir-fry, baked)
-- Already exists: raw (072), grilled (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed zucchini', 'vegetable', 1, 'medium', 35, 2.5, 6.2, 0.6, 2.1, 5.2, 17, 36, 410, 33, 0.5, 525, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/zucchini.png'),
('sauteed zucchini', 'vegetable', 1, 'medium', 73, 2.6, 6.4, 5.1, 2.2, 5.3, 18, 36, 410, 34, 0.5, 530, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/zucchini.png'),
('stir-fry zucchini', 'vegetable', 1, 'medium', 63, 2.5, 6.3, 3.8, 2.1, 5.2, 19, 37, 405, 33, 0.5, 520, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/zucchini.png'),
('baked zucchini', 'vegetable', 1, 'medium', 61, 2.6, 6.4, 3.5, 2.2, 5.3, 18, 36.5, 412, 34, 0.52, 527, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/zucchini.png')
ON CONFLICT (name) DO NOTHING;

-- ASPARAGUS variants (add missing: steamed, baked)
-- Already exists: raw (072), sauteed (072), grilled (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed asparagus', 'vegetable', 100, 'g', 22, 2.4, 4, 0.1, 2.2, 2, 3, 6.2, 780, 26, 2.2, 215, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/asparagus.png'),
('baked asparagus', 'vegetable', 100, 'g', 48, 2.5, 4.3, 3, 2.3, 2.1, 5, 6.3, 810, 27, 2.35, 218, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/asparagus.png')
ON CONFLICT (name) DO NOTHING;

-- CAULIFLOWER variants (add missing: steamed, baked)
-- Already exists: raw (072), sauteed (072), grilled (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed cauliflower', 'vegetable', 1, 'cup', 27, 2.1, 5.2, 0.3, 2.2, 2.1, 31, 48, 18, 24, 0.52, 315, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/cauliflower.jpg'),
('baked cauliflower', 'vegetable', 1, 'cup', 53, 2.2, 5.4, 3, 2.3, 2.2, 33, 49, 20, 25, 0.55, 318, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/cauliflower.jpg');

-- KALE variants (add missing: steamed, baked)
-- Already exists: raw (072), sauteed (072), grilled (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed kale', 'vegetable', 1, 'cup', 36, 3.1, 6.2, 0.6, 2.7, 1.7, 30, 84, 10500, 96, 1.15, 315, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/kale.jpg'),
('baked kale', 'vegetable', 1, 'cup', 61, 3.2, 6.4, 3.5, 2.8, 1.8, 32, 85, 10700, 98, 1.2, 318, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/kale.jpg');

-- GREEN BEANS variants (add missing: steamed, baked)
-- Already exists: raw (072), sauteed (072), grilled (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed green beans', 'vegetable', 1, 'cup', 34, 2, 7.2, 0.2, 2.8, 3.4, 7, 13, 710, 40, 1.08, 220, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/green-beans.png'),
('baked green beans', 'vegetable', 1, 'cup', 59, 2, 7.4, 3.2, 2.9, 3.5, 9, 13.5, 730, 41, 1.12, 228, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/green-beans.png');

-- EGGPLANT variants (add missing: steamed, sauteed, baked)
-- Already exists: raw (072), grilled (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed eggplant', 'vegetable', 1, 'cup', 22, 1, 5, 0.1, 2.6, 3.1, 3, 2.1, 25, 9, 0.42, 200, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/eggplant.png'),
('sauteed eggplant', 'vegetable', 1, 'cup', 60, 1, 5.2, 4.6, 2.7, 3.1, 4, 2, 25, 9, 0.4, 200, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/eggplant.png'),
('baked eggplant', 'vegetable', 1, 'cup', 48, 1.1, 5.3, 3, 2.75, 3.2, 5, 2.2, 27, 10, 0.45, 208, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/eggplant.png');

-- OKRA/BHINDI variants (add missing: steamed, grilled, baked)
-- Already exists: raw (072), sauteed (072 & okra/bhindi), stir-fry (072 & okra/bhindi)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed okra', 'vegetable', 100, 'g', 35, 2, 7.8, 0.2, 3.3, 1.6, 8, 24, 385, 85, 0.65, 305, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),
('grilled okra', 'vegetable', 100, 'g', 38, 2.2, 8.2, 0.3, 3.6, 1.7, 8, 25, 410, 90, 0.7, 320, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),
('baked okra', 'vegetable', 100, 'g', 61, 2.1, 8, 3.2, 3.5, 1.6, 10, 24.5, 395, 88, 0.68, 315, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),
('steamed bhindi', 'vegetable', 100, 'g', 35, 2, 7.8, 0.2, 3.3, 1.6, 8, 24, 385, 85, 0.65, 305, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),
('grilled bhindi', 'vegetable', 100, 'g', 38, 2.2, 8.2, 0.3, 3.6, 1.7, 8, 25, 410, 90, 0.7, 320, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),
('baked bhindi', 'vegetable', 100, 'g', 61, 2.1, 8, 3.2, 3.5, 1.6, 10, 24.5, 395, 88, 0.68, 315, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/okra.png');

-- BRUSSELS SPROUTS variants (add missing: steamed, sauteed, baked)
-- Already exists: raw (072), grilled (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed brussels sprouts', 'vegetable', 1, 'cup', 40, 3.2, 8.2, 0.3, 3.4, 2.1, 23, 78, 800, 40, 1.35, 360, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/brussels-sprouts.jpg'),
('sauteed brussels sprouts', 'vegetable', 1, 'cup', 78, 3.2, 8.5, 4.8, 3.5, 2, 24, 76, 790, 40, 1.3, 355, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/brussels-sprouts.jpg'),
('baked brussels sprouts', 'vegetable', 1, 'cup', 66, 3.3, 8.6, 3.2, 3.5, 2.15, 25, 78, 810, 41, 1.38, 365, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/brussels-sprouts.jpg');

-- CARROT variants (continue from existing grilled carrot)
-- Already exists: raw (072), grilled (072), sauteed (072), stir-fry (072)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed carrot', 'vegetable', 1, 'medium', 27, 0.7, 6.2, 0.1, 1.9, 3.3, 43, 4, 5400, 22, 0.2, 200, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/sliced-carrot.png'),
('baked carrot', 'vegetable', 1, 'medium', 55, 0.7, 6.4, 3, 1.9, 3.3, 44, 4.3, 5350, 22, 0.25, 205, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/sliced-carrot.png');

-- CELERY variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed celery', 'vegetable', 1, 'cup', 18, 0.8, 3.2, 0.2, 1.8, 1.5, 82, 3.3, 470, 42, 0.25, 270, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/celery.jpg'),
('sauteed celery', 'vegetable', 1, 'cup', 56, 0.8, 3.3, 4.7, 1.7, 1.5, 83, 3.2, 460, 43, 0.25, 275, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/celery.jpg'),
('stir-fry celery', 'vegetable', 1, 'cup', 46, 0.8, 3.2, 3.5, 1.7, 1.4, 84, 3.3, 465, 42, 0.25, 268, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/celery.jpg');

-- CABBAGE variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed cabbage', 'vegetable', 1, 'cup', 24, 1.1, 5.4, 0.1, 2.4, 3.1, 17, 34, 92, 38, 0.45, 160, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/cabbage.jpg'),
('sauteed cabbage', 'vegetable', 1, 'cup', 62, 1.1, 5.5, 4.6, 2.3, 3, 18, 33, 90, 38, 0.45, 158, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/cabbage.jpg'),
('stir-fry cabbage', 'vegetable', 1, 'cup', 52, 1.1, 5.4, 3.3, 2.3, 3, 19, 34, 91, 37, 0.45, 156, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/cabbage.jpg'),
('grilled cabbage', 'vegetable', 1, 'cup', 26, 1.2, 5.5, 0.1, 2.5, 3.2, 17, 35, 95, 39, 0.5, 162, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/cabbage.jpg');

-- BOK CHOY variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed bok choy', 'vegetable', 1, 'cup', 10, 1.3, 1.6, 0.1, 0.8, 0.9, 48, 33, 2800, 80, 0.7, 185, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/bok-choy.jpg'),
('sauteed bok choy', 'vegetable', 1, 'cup', 49, 1.2, 1.7, 4.6, 0.8, 0.9, 49, 32, 2750, 78, 0.65, 182, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/bok-choy.jpg'),
('stir-fry bok choy', 'vegetable', 1, 'cup', 39, 1.2, 1.6, 3.3, 0.75, 0.85, 50, 33, 2780, 76, 0.65, 180, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/bok-choy.jpg'),
('grilled bok choy', 'vegetable', 1, 'cup', 11, 1.3, 1.7, 0.1, 0.85, 0.95, 48, 34, 2900, 82, 0.7, 188, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/bok-choy.jpg');

-- BELL PEPPER variants (continue from existing)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed bell pepper', 'vegetable', 1, 'medium', 40, 1.3, 9.2, 0.3, 3.2, 6.2, 5, 155, 3850, 11, 0.5, 260, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/red-bell-pepper.png'),
('baked bell pepper', 'vegetable', 1, 'medium', 65, 1.3, 9.5, 3.2, 3.3, 6.5, 6, 150, 4000, 12, 0.5, 268, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/red-bell-pepper.png');

-- YELLOW SQUASH variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed yellow squash', 'vegetable', 1, 'cup', 38, 2, 8.2, 0.4, 2.7, 4.5, 5, 36, 410, 32, 0.75, 485, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/yellow-squash.jpg'),
('sauteed yellow squash', 'vegetable', 1, 'cup', 76, 2, 8.3, 4.9, 2.6, 4.5, 6, 35, 405, 31, 0.75, 480, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/yellow-squash.jpg'),
('stir-fry yellow squash', 'vegetable', 1, 'cup', 66, 2, 8.2, 3.6, 2.6, 4.4, 7, 36, 408, 31, 0.75, 478, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/yellow-squash.jpg'),
('grilled yellow squash', 'vegetable', 1, 'cup', 41, 2.1, 8.5, 0.5, 2.8, 4.7, 5, 37, 420, 33, 0.8, 490, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/yellow-squash.jpg'),
('baked yellow squash', 'vegetable', 1, 'cup', 64, 2, 8.3, 3.3, 2.7, 4.6, 6, 36, 412, 32, 0.78, 482, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/yellow-squash.jpg');

-- ARUGULA variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('sauteed arugula', 'vegetable', 1, 'cup', 45, 0.6, 0.8, 4.5, 0.35, 0.4, 7, 3.2, 490, 35, 0.35, 78, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/arugula-or-rocket-salad.jpg');

-- EDAMAME variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed edamame', 'vegetable', 1, 'cup', 190, 18.8, 14, 8.1, 8.2, 3.5, 10, 10, 24, 100, 3.6, 690, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein','high-fiber'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/edamame.jpg'),
('sauteed edamame', 'vegetable', 1, 'cup', 228, 19, 14.2, 12.5, 8.1, 3.5, 11, 9.8, 25, 102, 3.7, 695, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein','high-fiber'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/edamame.jpg');

-- NAPA CABBAGE variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed napa cabbage', 'vegetable', 1, 'cup', 14, 1.3, 2.6, 0.2, 1.8, 1.3, 13, 28, 65, 82, 0.25, 235, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chinese-cabbage.jpg'),
('sauteed napa cabbage', 'vegetable', 1, 'cup', 53, 1.3, 2.7, 4.7, 1.8, 1.3, 14, 27.5, 63, 80, 0.25, 232, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chinese-cabbage.jpg'),
('stir-fry napa cabbage', 'vegetable', 1, 'cup', 43, 1.3, 2.6, 3.4, 1.75, 1.25, 15, 28, 64, 79, 0.25, 230, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chinese-cabbage.jpg');

-- RED CABBAGE variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed red cabbage', 'vegetable', 1, 'cup', 30, 1.4, 7, 0.1, 2, 4, 25, 53, 35, 43, 0.65, 225, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/red-cabbage.jpg'),
('sauteed red cabbage', 'vegetable', 1, 'cup', 68, 1.4, 7.2, 4.6, 2, 4, 26, 52, 34, 42, 0.65, 223, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/red-cabbage.jpg'),
('stir-fry red cabbage', 'vegetable', 1, 'cup', 58, 1.4, 7, 3.3, 1.95, 3.9, 27, 53, 34, 41, 0.65, 220, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/red-cabbage.jpg');

-- FENNEL variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed fennel', 'vegetable', 1, 'cup', 29, 1.2, 6.8, 0.2, 2.9, 3.6, 47, 11, 140, 46, 0.65, 375, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/fennel.png'),
('sauteed fennel', 'vegetable', 1, 'cup', 67, 1.2, 6.9, 4.7, 2.8, 3.6, 48, 10.8, 138, 45, 0.65, 372, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/fennel.png'),
('grilled fennel', 'vegetable', 1, 'cup', 31, 1.3, 7, 0.2, 3, 3.8, 47, 11.5, 145, 48, 0.7, 380, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/fennel.png'),
('baked fennel', 'vegetable', 1, 'cup', 55, 1.2, 6.8, 3.2, 2.85, 3.7, 48, 11, 142, 46, 0.68, 375, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/fennel.png');

-- TURNIP variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed turnip', 'vegetable', 1, 'cup', 38, 1.3, 8.8, 0.1, 2.5, 5.2, 90, 28, 0, 42, 0.45, 260, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/turnips.png'),
('baked turnip', 'vegetable', 1, 'cup', 64, 1.3, 9, 3.2, 2.5, 5.3, 92, 29, 0, 43, 0.48, 265, ARRAY['vegan','vegetarian','gluten-free','dairy-free'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/turnips.png'),
('grilled turnip', 'vegetable', 1, 'cup', 40, 1.4, 9.2, 0.1, 2.6, 5.5, 91, 30, 0, 44, 0.48, 268, ARRAY['vegan','vegetarian','gluten-free','dairy-free','low-carb'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/turnips.png');

-- ACORN SQUASH variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('baked acorn squash', 'vegetable', 1, 'cup', 85, 1.2, 15.5, 3, 4.7, 0, 5, 12, 455, 48, 0.95, 500, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-fiber'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/acorn-squash.jpg'),
('steamed acorn squash', 'vegetable', 1, 'cup', 58, 1.2, 15.2, 0.1, 4.6, 0, 4, 11.5, 450, 47, 0.92, 495, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-fiber'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/acorn-squash.jpg');

-- ARTICHOKE variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('steamed artichoke', 'vegetable', 1, 'medium', 64, 4.5, 14.5, 0.4, 7.5, 1.4, 125, 13, 20, 58, 1.8, 490, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-fiber'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/artichokes.png'),
('grilled artichoke', 'vegetable', 1, 'medium', 88, 4.5, 14.8, 3.5, 7.6, 1.5, 128, 13.5, 22, 60, 1.85, 500, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-fiber'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/artichokes.png'),
('baked artichoke', 'vegetable', 1, 'medium', 90, 4.5, 15, 3.8, 7.7, 1.5, 130, 13.8, 23, 62, 1.9, 510, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-fiber'], ARRAY['vegan','vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/artichokes.png');

-- ================================================================================
-- PROTEINS - Grilled, Baked, Sautéed
-- ================================================================================

-- CHICKEN BREAST variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled chicken breast', 'protein', 100, 'g', 165, 31, 0, 3.6, 0, 0, 74, 21, 15, 1, 256, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chicken-breasts.png'),
('baked chicken breast', 'protein', 100, 'g', 165, 31, 0, 3.6, 0, 0, 74, 21, 15, 1, 256, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chicken-breasts.png'),
('sauteed chicken breast', 'protein', 100, 'g', 205, 31, 0, 8.1, 0, 0, 76, 21, 15, 1, 258, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chicken-breasts.png');

-- CHICKEN THIGH variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled chicken thigh', 'protein', 100, 'g', 209, 26, 0, 11, 0, 0, 88, 51, 11, 1.3, 229, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chicken-thighs.png'),
('baked chicken thigh', 'protein', 100, 'g', 209, 26, 0, 11, 0, 0, 88, 51, 11, 1.3, 229, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chicken-thighs.png'),
('sauteed chicken thigh', 'protein', 100, 'g', 249, 26, 0, 15.5, 0, 0, 90, 51, 11, 1.3, 231, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chicken-thighs.png');

-- TOFU variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled tofu', 'protein', 100, 'g', 80, 8.5, 2, 5, 0.3, 0.7, 8, 88, 365, 5.6, 125, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tofu.png'),
('baked tofu', 'protein', 100, 'g', 95, 9, 2.2, 5.8, 0.4, 0.8, 9, 90, 375, 5.8, 130, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tofu.png'),
('sauteed tofu', 'protein', 100, 'g', 116, 8.5, 2.1, 9.3, 0.35, 0.75, 10, 88, 360, 5.6, 127, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tofu.png'),
('stir-fry tofu', 'protein', 100, 'g', 106, 8.5, 2, 7.8, 0.35, 0.7, 10, 87, 358, 5.5, 125, ARRAY['vegan','vegetarian','gluten-free','dairy-free','high-protein'], ARRAY['vegan','vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tofu.png');

-- PANEER variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled paneer', 'protein', 100, 'g', 280, 19, 1.3, 22, 0, 1.3, 20, 820, 215, 0.25, 108, ARRAY['vegetarian','gluten-free','high-protein'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/paneer.jpg'),
('baked paneer', 'protein', 100, 'g', 285, 19.5, 1.4, 22.5, 0, 1.4, 22, 840, 220, 0.28, 112, ARRAY['vegetarian','gluten-free','high-protein'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/paneer.jpg'),
('sauteed paneer', 'protein', 100, 'g', 305, 18.8, 1.4, 25.3, 0, 1.3, 23, 810, 212, 0.25, 107, ARRAY['vegetarian','gluten-free','high-protein'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/paneer.jpg');

-- PRAWNS/SHRIMP variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled prawns', 'protein', 100, 'g', 105, 24.5, 0.2, 0.8, 0, 0, 115, 185, 72, 0.55, 265, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['shellfish'], 'https://spoonacular.com/cdn/ingredients_100x100/shrimp.png'),
('baked prawns', 'protein', 100, 'g', 110, 24.8, 0.3, 1.2, 0, 0, 118, 188, 74, 0.58, 270, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['shellfish'], 'https://spoonacular.com/cdn/ingredients_100x100/shrimp.png'),
('sauteed prawns', 'protein', 100, 'g', 139, 24.5, 0.3, 4.8, 0, 0, 120, 185, 73, 0.55, 267, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['shellfish'], 'https://spoonacular.com/cdn/ingredients_100x100/shrimp.png'),
('stir-fry prawns', 'protein', 100, 'g', 129, 24.5, 0.3, 3.8, 0, 0, 118, 183, 72, 0.54, 264, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['shellfish'], 'https://spoonacular.com/cdn/ingredients_100x100/shrimp.png');

-- TILAPIA variants
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('grilled tilapia', 'protein', 100, 'g', 100, 20.8, 0, 2, 0, 0, 54, 0, 15, 0.65, 310, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/tilapia-fillet.jpg'),
('baked tilapia', 'protein', 100, 'g', 105, 21, 0, 2.4, 0, 0, 56, 0, 16, 0.68, 315, ARRAY['gluten-free','dairy-free','high-protein','low-fat'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/tilapia-fillet.jpg'),
('sauteed tilapia', 'protein', 100, 'g', 136, 20.5, 0, 5.7, 0, 0, 58, 0, 15, 0.65, 308, ARRAY['gluten-free','dairy-free','high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/tilapia-fillet.jpg');

-- Add comment
COMMENT ON TABLE simple_ingredients IS 'Comprehensive simple ingredients database with RAW and multiple COOKED variants (steamed, sautéed, stir-fry, grilled, baked) for flexible meal planning';

