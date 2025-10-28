-- Migration: Add cooked variants of common vegetables
-- Includes sautéed, grilled, and stir-fry preparations
-- 
-- Nutritional adjustments for cooked variants:
-- - Sautéed: +40-50 calories from 1 tsp oil, slightly concentrated nutrients
-- - Grilled: No added fat, slightly concentrated nutrients from moisture loss
-- - Stir-fry: +30-40 calories from oil, quick cooking preserves more nutrients

-- ===== MUSHROOM VARIANTS =====
-- Base mushroom (already exists): 1 cup = 21 cal, 3g protein, 3.1g carbs, 0.3g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed mushroom (with 1 tsp olive oil)
('sauteed mushroom', 'vegetable', 1, 'cup', 61, 3.2, 3.3, 4.8, 1.1, 2, 7, 2.2, 0, 3, 0.5, 330, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/mushrooms.png'),

-- Grilled mushroom (no added fat)
('grilled mushroom', 'vegetable', 1, 'cup', 25, 3.5, 3.5, 0.3, 1.2, 2.1, 6, 2, 0, 4, 0.6, 350, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/mushrooms-grilled.jpg'),

-- Stir-fry mushroom (with minimal oil)
('stir-fry mushroom', 'vegetable', 1, 'cup', 51, 3.3, 3.4, 3.5, 1.1, 2, 8, 2.3, 0, 3, 0.5, 340, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/mushrooms.png');

-- ===== BROCCOLI VARIANTS =====
-- Base broccoli (already exists): 100g = 34 cal, 2.8g protein, 7g carbs, 0.4g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed broccoli (with 1 tsp olive oil per 100g)
('sauteed broccoli', 'vegetable', 100, 'g', 74, 3, 7.4, 5, 2.8, 1.8, 35, 85, 650, 50, 0.8, 330, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/broccoli.jpg'),

-- Grilled broccoli (no added fat, caramelized edges)
('grilled broccoli', 'vegetable', 100, 'g', 38, 3.2, 7.5, 0.5, 3, 1.9, 35, 80, 680, 52, 0.8, 340, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/broccoli.jpg'),

-- Stir-fry broccoli (quick cook with minimal oil)
('stir-fry broccoli', 'vegetable', 100, 'g', 64, 3, 7.3, 3.5, 2.7, 1.8, 36, 87, 640, 49, 0.7, 325, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/broccoli.jpg');

-- ===== SPINACH VARIANTS =====
-- Base spinach (already exists): 1 cup = 7 cal, 0.9g protein, 1.1g carbs, 0.1g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed spinach (wilted, with garlic and oil)
('sauteed spinach', 'vegetable', 1, 'cup', 47, 1, 1.5, 4.2, 0.9, 0.2, 26, 9, 3100, 35, 1, 185, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/spinach.jpg'),

-- Grilled spinach (not common, but included)
('grilled spinach', 'vegetable', 1, 'cup', 10, 1.2, 1.3, 0.1, 0.8, 0.1, 25, 9, 3200, 32, 0.9, 180, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/spinach.jpg'),

-- Stir-fry spinach
('stir-fry spinach', 'vegetable', 1, 'cup', 37, 1, 1.4, 3, 0.8, 0.1, 27, 9.5, 3000, 33, 0.95, 175, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/spinach.jpg');

-- ===== BELL PEPPER VARIANTS =====
-- Base bell pepper: 1 medium = 37 cal, 1.2g protein, 9g carbs, 0.3g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed bell pepper
('sauteed bell pepper', 'vegetable', 1, 'medium', 77, 1.3, 9.5, 4.8, 3.2, 6.3, 6, 145, 3900, 12, 0.5, 265, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/red-bell-pepper.png'),

-- Grilled bell pepper (charred, sweet)
('grilled bell pepper', 'vegetable', 1, 'medium', 42, 1.4, 9.8, 0.4, 3.4, 6.8, 5, 140, 4100, 13, 0.5, 275, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/red-bell-pepper.png'),

-- Stir-fry bell pepper
('stir-fry bell pepper', 'vegetable', 1, 'medium', 67, 1.3, 9.3, 3.5, 3.2, 6.2, 7, 148, 3850, 11, 0.5, 260, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/red-bell-pepper.png');

-- ===== ZUCCHINI VARIANTS =====
-- Base zucchini: 1 medium = 33 cal, 2.4g protein, 6g carbs, 0.6g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed zucchini
('sauteed zucchini', 'vegetable', 1, 'medium', 73, 2.6, 6.4, 5.1, 2.2, 5.3, 18, 36, 410, 34, 0.5, 530, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/zucchini.png'),

-- Grilled zucchini (perfect for summer)
('grilled zucchini', 'vegetable', 1, 'medium', 38, 2.7, 6.5, 0.7, 2.3, 5.5, 17, 35, 420, 35, 0.5, 545, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/zucchini.png'),

-- Stir-fry zucchini
('stir-fry zucchini', 'vegetable', 1, 'medium', 63, 2.5, 6.3, 3.8, 2.1, 5.2, 19, 37, 405, 33, 0.5, 520, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/zucchini.png');

-- ===== ASPARAGUS VARIANTS =====
-- Base asparagus: 100g = 20 cal, 2.2g protein, 3.9g carbs, 0.1g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed asparagus (with garlic)
('sauteed asparagus', 'vegetable', 100, 'g', 60, 2.4, 4.2, 4.6, 2.3, 2, 4, 6, 800, 26, 2.3, 215, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/asparagus.png'),

-- Grilled asparagus (charred, delicious)
('grilled asparagus', 'vegetable', 100, 'g', 24, 2.5, 4.2, 0.2, 2.4, 2.1, 3, 6.5, 820, 28, 2.4, 220, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/asparagus.png'),

-- Stir-fry asparagus
('stir-fry asparagus', 'vegetable', 100, 'g', 50, 2.4, 4.1, 3.3, 2.2, 2, 5, 6.2, 790, 26, 2.3, 210, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/asparagus.png');

-- ===== CAULIFLOWER VARIANTS =====
-- Base cauliflower: 1 cup = 25 cal, 2g protein, 5g carbs, 0.3g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed cauliflower
('sauteed cauliflower', 'vegetable', 1, 'cup', 65, 2.2, 5.4, 4.8, 2.3, 2.1, 32, 48, 18, 24, 0.5, 315, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/cauliflower.jpg'),

-- Grilled cauliflower (roasted, crispy)
('grilled cauliflower', 'vegetable', 1, 'cup', 29, 2.3, 5.5, 0.4, 2.4, 2.2, 31, 50, 20, 25, 0.5, 325, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/cauliflower.jpg'),

-- Stir-fry cauliflower
('stir-fry cauliflower', 'vegetable', 1, 'cup', 55, 2.2, 5.3, 3.5, 2.2, 2.1, 33, 49, 19, 24, 0.5, 310, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/cauliflower.jpg');

-- ===== KALE VARIANTS =====
-- Base kale: 1 cup = 33 cal, 2.9g protein, 6g carbs, 0.6g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed kale (wilted with garlic)
('sauteed kale', 'vegetable', 1, 'cup', 73, 3.1, 6.4, 5.1, 2.8, 1.7, 31, 82, 10800, 95, 1.2, 310, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/kale.jpg'),

-- Grilled kale (crispy chips)
('grilled kale', 'vegetable', 1, 'cup', 38, 3.2, 6.5, 0.7, 2.9, 1.8, 30, 85, 11000, 98, 1.2, 320, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/kale.jpg'),

-- Stir-fry kale
('stir-fry kale', 'vegetable', 1, 'cup', 63, 3.1, 6.3, 3.8, 2.7, 1.7, 32, 83, 10600, 93, 1.15, 305, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/kale.jpg');

-- ===== GREEN BEANS VARIANTS =====
-- Base green beans: 1 cup = 31 cal, 1.8g protein, 7g carbs, 0.2g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed green beans
('sauteed green beans', 'vegetable', 1, 'cup', 71, 2, 7.4, 4.7, 2.9, 3.5, 8, 13, 720, 40, 1.1, 225, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/green-beans.png'),

-- Grilled green beans
('grilled green beans', 'vegetable', 1, 'cup', 36, 2.1, 7.5, 0.3, 3, 3.6, 7, 13.5, 750, 42, 1.15, 230, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/green-beans.png'),

-- Stir-fry green beans
('stir-fry green beans', 'vegetable', 1, 'cup', 61, 2, 7.3, 3.5, 2.8, 3.4, 9, 13.2, 710, 39, 1.05, 220, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/green-beans.png');

-- ===== EGGPLANT VARIANTS =====
-- Base eggplant: 1 cup = 20 cal, 0.8g protein, 4.8g carbs, 0.1g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed eggplant
('sauteed eggplant', 'vegetable', 1, 'cup', 60, 1, 5.2, 4.6, 2.7, 3.1, 4, 2, 25, 9, 0.4, 200, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/eggplant.png'),

-- Grilled eggplant (smoky flavor)
('grilled eggplant', 'vegetable', 1, 'cup', 24, 1.1, 5.2, 0.2, 2.8, 3.2, 3, 2.2, 27, 10, 0.4, 205, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/eggplant.png'),

-- Stir-fry eggplant
('stir-fry eggplant', 'vegetable', 1, 'cup', 50, 1, 5.1, 3.3, 2.6, 3, 5, 2.1, 26, 9, 0.4, 195, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/eggplant.png');

-- ===== OKRA/BHINDI VARIANTS =====
-- Base okra: 100g = 33 cal, 1.9g protein, 7.5g carbs, 0.2g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed okra
('sauteed okra', 'vegetable', 100, 'g', 73, 2.1, 8, 4.7, 3.4, 1.6, 9, 24, 390, 86, 0.7, 310, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),

-- Grilled okra
('grilled okra', 'vegetable', 100, 'g', 38, 2.2, 8.2, 0.3, 3.6, 1.7, 8, 25, 410, 90, 0.7, 320, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),

-- Stir-fry okra (bhindi fry)
('stir-fry okra', 'vegetable', 100, 'g', 63, 2.1, 7.9, 3.5, 3.5, 1.6, 10, 24.5, 395, 88, 0.7, 315, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),

-- Sautéed bhindi (same as sautéed okra, Indian name)
('sauteed bhindi', 'vegetable', 100, 'g', 73, 2.1, 8, 4.7, 3.4, 1.6, 9, 24, 390, 86, 0.7, 310, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),

-- Stir-fry bhindi
('stir-fry bhindi', 'vegetable', 100, 'g', 63, 2.1, 7.9, 3.5, 3.5, 1.6, 10, 24.5, 395, 88, 0.7, 315, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/okra.png');

-- ===== CARROT VARIANTS =====
-- Base carrot: 1 medium = 25 cal, 0.6g protein, 6g carbs, 0.1g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed carrot
('sauteed carrot', 'vegetable', 1, 'medium', 65, 0.7, 6.4, 4.6, 1.9, 3.2, 44, 4, 5300, 22, 0.25, 205, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/sliced-carrot.png'),

-- Grilled carrot (caramelized)
('grilled carrot', 'vegetable', 1, 'medium', 29, 0.8, 6.5, 0.2, 2, 3.4, 43, 4.2, 5500, 23, 0.25, 210, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/sliced-carrot.png'),

-- Stir-fry carrot
('stir-fry carrot', 'vegetable', 1, 'medium', 55, 0.7, 6.3, 3.3, 1.8, 3.1, 45, 4.1, 5200, 21, 0.25, 200, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/sliced-carrot.png');

-- ===== BRUSSELS SPROUTS VARIANTS =====
-- Base brussels sprouts: 1 cup = 38 cal, 3g protein, 8g carbs, 0.3g fat

INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
-- Sautéed brussels sprouts
('sauteed brussels sprouts', 'vegetable', 1, 'cup', 78, 3.2, 8.5, 4.8, 3.5, 2, 24, 76, 790, 40, 1.3, 355, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/brussels-sprouts.jpg'),

-- Grilled brussels sprouts (crispy, charred)
('grilled brussels sprouts', 'vegetable', 1, 'cup', 44, 3.5, 8.8, 0.4, 3.7, 2.2, 23, 80, 820, 42, 1.4, 370, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/brussels-sprouts.jpg'),

-- Stir-fry brussels sprouts
('stir-fry brussels sprouts', 'vegetable', 1, 'cup', 68, 3.2, 8.4, 3.5, 3.4, 2.1, 25, 77, 780, 39, 1.3, 350, 
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], 
  ARRAY['vegan', 'vegetarian'], 
  ARRAY[]::TEXT[], 
  'https://spoonacular.com/cdn/ingredients_100x100/brussels-sprouts.jpg');

-- Add comment
COMMENT ON TABLE simple_ingredients IS 'Simple ingredients database including raw and cooked variants for flexible meal planning';

