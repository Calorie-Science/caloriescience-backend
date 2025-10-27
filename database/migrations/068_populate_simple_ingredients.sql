-- Migration: Populate simple_ingredients table with initial common ingredients
-- This provides a base set of 69 common Western and Indian ingredients

-- Helper function to generate ingredient ID for consistency
-- Format: ingredient_{name_with_underscores}

-- ===== FRUITS =====
-- Common Western Fruits
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('banana', 'fruit', 1, 'medium', 105, 1.3, 27, 0.4, 3.1, 14.4, 1, 10.3, 76, 422, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/banana.jpg'),
('apple', 'fruit', 1, 'medium', 95, 0.5, 25, 0.3, 4.4, 19, 2, 8.4, 98, 195, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/apple.jpg'),
('orange', 'fruit', 1, 'medium', 62, 1.2, 15, 0.2, 3.1, 12, 0, 69.7, 295, 237, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/orange.jpg'),
('avocado', 'fruit', 1, 'medium', 234, 2.9, 12.8, 21.4, 10, 1, 10, 17.4, 219, 689, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'low-carb', 'high-fiber', 'keto'], ARRAY['vegan', 'vegetarian', 'keto'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/avocado.jpg'),
('strawberry', 'fruit', 1, 'cup', 49, 1, 12, 0.5, 3, 7.4, 2, 89.4, 18, 233, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/strawberries.jpg'),
('blueberry', 'fruit', 1, 'cup', 84, 1.1, 21, 0.5, 3.6, 15, 1, 14.4, 80, 114, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/blueberries.jpg'),
('raspberry', 'fruit', 1, 'cup', 64, 1.5, 15, 0.8, 8, 5.4, 1, 32.2, 41, 186, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-fiber'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/raspberries.jpg'),
('mango', 'fruit', 1, 'cup', 99, 1.4, 25, 0.6, 2.6, 22.5, 2, 60.1, 1262, 277, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/mango.jpg'),
('watermelon', 'fruit', 1, 'cup', 46, 0.9, 11.5, 0.2, 0.6, 9.4, 2, 12.3, 865, 170, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/watermelon.png'),
('pineapple', 'fruit', 1, 'cup', 82, 0.9, 22, 0.2, 2.3, 16, 2, 78.9, 96, 180, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/pineapple.jpg'),
('grape', 'fruit', 1, 'cup', 104, 1.1, 27, 0.2, 1.4, 23, 3, 16.3, 100, 288, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/red-grapes.jpg');

-- Indian Fruits
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('guava', 'fruit', 1, 'medium', 37, 1.4, 7.9, 0.5, 3, 5, 1, 125.6, 311, 229, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/guava.jpg'),
('papaya', 'fruit', 1, 'cup', 62, 0.7, 16, 0.4, 2.5, 11, 12, 86.5, 1531, 360, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/papaya.jpg'),
('pomegranate', 'fruit', 1, 'medium', 234, 4.7, 52, 3.3, 11.3, 38, 8, 28.8, 0, 666, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-fiber'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/pomegranate.jpg');

-- ===== VEGETABLES =====
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('broccoli', 'vegetable', 100, 'g', 34, 2.8, 7, 0.4, 2.6, 1.7, 33, 89.2, 623, 47, 0.7, 316, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/broccoli.jpg'),
('spinach', 'vegetable', 1, 'cup', 7, 0.9, 1.1, 0.1, 0.7, 0.1, 24, 8.4, 2813, 30, 0.8, 167, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/spinach.jpg'),
('carrot', 'vegetable', 1, 'medium', 25, 0.6, 6, 0.1, 1.7, 3, 42, 3.6, 5096, 20, 0.2, 195, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/sliced-carrot.png'),
('tomato', 'vegetable', 1, 'medium', 22, 1.1, 4.8, 0.2, 1.5, 3.2, 6, 16.9, 1025, 12, 0.3, 292, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/tomato.png'),
('cucumber', 'vegetable', 1, 'medium', 45, 2, 11, 0.3, 1.5, 5, 6, 8.4, 316, 48, 0.3, 442, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/cucumber.jpg'),
('kale', 'vegetable', 1, 'cup', 33, 2.9, 6, 0.6, 2.6, 1.6, 29, 80.4, 10302, 90, 1.1, 299, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/kale.jpg'),
('sweet potato', 'vegetable', 1, 'medium', 103, 2.3, 24, 0.2, 3.8, 7.4, 41, 22.3, 18869, 43, 0.8, 542, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/sweet-potato.png');

-- Indian Vegetables
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('okra', 'vegetable', 100, 'g', 33, 1.9, 7.5, 0.2, 3.2, 1.5, 7, 23, 375, 82, 0.6, 299, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),
('bhindi', 'vegetable', 100, 'g', 33, 1.9, 7.5, 0.2, 3.2, 1.5, 7, 23, 375, 82, 0.6, 299, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/okra.png'),
('paneer', 'protein', 100, 'g', 265, 18.3, 1.2, 20.8, 0, 1.2, 18, 0, 790, 208, 0.2, 104, ARRAY['vegetarian', 'gluten-free', 'high-protein'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/paneer.jpg');

-- ===== PROTEINS =====
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('chicken breast', 'protein', 100, 'g', 165, 31, 0, 3.6, 0, 0, 74, 21, 15, 1, 256, ARRAY['gluten-free', 'dairy-free', 'high-protein'], ARRAY[]::TEXT[], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chicken-breasts.png'),
('salmon', 'protein', 100, 'g', 208, 20, 0, 13, 0, 0, 59, 149, 12, 0.8, 363, ARRAY['gluten-free', 'dairy-free', 'high-protein'], ARRAY[]::TEXT[], ARRAY['fish'], 'https://spoonacular.com/cdn/ingredients_100x100/salmon.png'),
('egg', 'protein', 1, 'large', 72, 6.3, 0.4, 5, 0, 0.2, 71, 270, 28, 0.9, 69, ARRAY['vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegetarian'], ARRAY['eggs'], 'https://spoonacular.com/cdn/ingredients_100x100/egg.png'),
('tofu', 'protein', 100, 'g', 76, 8, 1.9, 4.8, 0.3, 0.7, 7, 85, 350, 5.4, 121, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein'], ARRAY['vegan', 'vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/tofu.png');

-- ===== LEGUMES =====
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('lentil', 'legume', 1, 'cup', 230, 17.9, 39.9, 0.8, 15.6, 3.6, 4, 3, 16, 38, 6.6, 731, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/lentils-brown.jpg'),
('chickpea', 'legume', 1, 'cup', 269, 14.5, 45, 4.2, 12.5, 7.9, 11, 4, 67, 80, 4.7, 477, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chickpeas.png'),
('dal', 'legume', 1, 'cup', 198, 14.5, 35, 0.7, 11.5, 2.5, 8, 3.5, 12, 50, 4.8, 495, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/lentils.png'),
('moong dal', 'legume', 1, 'cup', 212, 14.2, 38.7, 0.8, 15.4, 2, 4, 1, 24, 54, 2.8, 537, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/mung-beans.jpg'),
('rajma', 'legume', 1, 'cup', 225, 15.3, 40.4, 0.9, 11.3, 0.3, 2, 2.3, 0, 127, 5.2, 717, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/kidney-beans.jpg'),
('chana', 'legume', 1, 'cup', 269, 14.5, 45, 4.2, 12.5, 7.9, 11, 4, 67, 80, 4.7, 477, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein', 'high-fiber'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/chickpeas.png');

-- ===== GRAINS =====
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('rice', 'grain', 1, 'cup', 206, 4.2, 45, 0.4, 0.6, 0.1, 2, 16, 2.8, 55, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/white-rice.png'),
('brown rice', 'grain', 1, 'cup', 218, 4.5, 45.8, 1.6, 3.5, 0.7, 2, 19, 0.8, 154, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/brown-rice.png'),
('quinoa', 'grain', 1, 'cup', 222, 8.1, 39.4, 3.6, 5.2, 1.6, 13, 31, 2.8, 318, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/quinoa.png'),
('oats', 'grain', 1, 'cup', 307, 10.7, 54.8, 5.3, 8.2, 0.8, 3, 42, 3.4, 293, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-fiber'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/rolled-oats.jpg');

-- Indian Grains
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('roti', 'grain', 1, 'piece', 71, 3, 15, 0.4, 2.7, 0.4, 119, 10, 0.7, 58, ARRAY['vegan', 'vegetarian', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/flour-tortilla.jpg'),
('chapati', 'grain', 1, 'piece', 71, 3, 15, 0.4, 2.7, 0.4, 119, 10, 0.7, 58, ARRAY['vegan', 'vegetarian', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/flour-tortilla.jpg'),
('naan', 'grain', 1, 'piece', 262, 7.3, 45, 5.6, 2, 3.5, 419, 58, 2.6, 115, ARRAY['vegetarian', 'dairy-free'], ARRAY['vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/naan.png'),
('basmati rice', 'grain', 1, 'cup', 191, 4, 41.6, 0.5, 0.7, 0.2, 2, 19, 1.2, 52, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/basmati-rice.png');

-- ===== DAIRY =====
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('milk', 'dairy', 1, 'cup', 149, 7.7, 11.7, 7.9, 0, 12.3, 105, 395, 276, 0.1, 322, ARRAY['vegetarian', 'gluten-free'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/milk.png'),
('yogurt', 'dairy', 1, 'cup', 149, 8.5, 11.4, 8, 0, 11.4, 113, 243, 296, 0.1, 380, ARRAY['vegetarian', 'gluten-free'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/plain-yogurt.jpg'),
('greek yogurt', 'dairy', 1, 'cup', 100, 17, 6, 0.7, 0, 6, 65, 0, 200, 0.1, 240, ARRAY['vegetarian', 'gluten-free', 'high-protein'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/greek-yogurt.png'),
('cheese', 'dairy', 28, 'g', 113, 7, 0.9, 9, 0, 0.5, 177, 284, 202, 0.2, 23, ARRAY['vegetarian', 'gluten-free'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/cheddar-cheese.png'),
('butter', 'dairy', 1, 'tbsp', 102, 0.1, 0, 11.5, 0, 0, 2, 355, 3, 0, 3, ARRAY['vegetarian', 'gluten-free'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/butter-sliced.jpg'),
('ghee', 'dairy', 1, 'tbsp', 112, 0, 0, 12.7, 0, 0, 0, 438, 0, 0, 0, ARRAY['vegetarian', 'gluten-free'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/ghee.jpg'),
('curd', 'dairy', 1, 'cup', 98, 11, 4.7, 4.3, 0, 4.7, 364, 157, 275, 0.1, 352, ARRAY['vegetarian', 'gluten-free'], ARRAY['vegetarian'], ARRAY['dairy'], 'https://spoonacular.com/cdn/ingredients_100x100/plain-yogurt.jpg');

-- Plant-based Alternatives (dairy category but dairy-free)
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('almond milk', 'dairy', 1, 'cup', 40, 1, 2, 2.5, 0, 0, 150, 500, 450, 0.4, 180, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY['tree-nuts'], 'https://spoonacular.com/cdn/ingredients_100x100/almond-milk.png'),
('soy milk', 'dairy', 1, 'cup', 105, 6.3, 12, 3.6, 0.5, 8.9, 115, 503, 301, 1.1, 298, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY['soy'], 'https://spoonacular.com/cdn/ingredients_100x100/soy-milk.jpg'),
('coconut milk', 'dairy', 1, 'cup', 552, 5.5, 13.3, 57.2, 5.3, 7.8, 29, 0, 38, 7.5, 631, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY[]::TEXT[], 'https://spoonacular.com/cdn/ingredients_100x100/coconut-milk.png');

-- ===== NUTS =====
INSERT INTO simple_ingredients (name, category, serving_quantity, serving_unit, calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg, calcium_mg, iron_mg, potassium_mg, health_labels, diet_labels, allergens, image_url) VALUES
('almond', 'nuts', 28, 'g', 164, 6, 6, 14, 3.5, 1.2, 0, 76, 1, 208, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY['tree-nuts'], 'https://spoonacular.com/cdn/ingredients_100x100/almonds.jpg'),
('walnut', 'nuts', 28, 'g', 185, 4.3, 3.9, 18.5, 1.9, 0.7, 1, 28, 0.8, 125, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY['tree-nuts'], 'https://spoonacular.com/cdn/ingredients_100x100/walnuts.jpg'),
('cashew', 'nuts', 28, 'g', 157, 5.2, 8.6, 12.4, 0.9, 1.7, 3, 10, 1.9, 187, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY['tree-nuts'], 'https://spoonacular.com/cdn/ingredients_100x100/cashews.jpg'),
('peanut butter', 'nuts', 2, 'tbsp', 188, 8, 7, 16, 2, 3, 147, 17, 0.6, 208, ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'], ARRAY['vegan', 'vegetarian'], ARRAY['peanuts'], 'https://spoonacular.com/cdn/ingredients_100x100/peanut-butter.png');

COMMENT ON TABLE simple_ingredients IS 'Database-backed simple ingredients for meal planning - can be easily extended with new ingredients';

