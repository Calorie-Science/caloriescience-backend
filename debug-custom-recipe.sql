-- Debug queries for custom recipe search issue
-- Run these and send me the results

-- Query 1: Check TestRecipe999 details
SELECT 
  id,
  recipe_name,
  provider,
  cache_status,
  is_public,
  created_by_nutritionist_id,
  health_labels,
  allergens,
  cuisine_types,
  meal_types,
  ingredients,
  created_at
FROM cached_recipes
WHERE recipe_name = 'TestRecipe999';

-- Query 2: Check azdd recipe details  
SELECT 
  id,
  recipe_name,
  provider,
  cache_status,
  is_public,
  created_by_nutritionist_id,
  health_labels,
  allergens,
  cuisine_types,
  created_at
FROM cached_recipes
WHERE recipe_name ILIKE '%azd%';

-- Query 3: Count all manual recipes by cache_status
SELECT 
  cache_status,
  COUNT(*) as count
FROM cached_recipes
WHERE provider = 'manual'
GROUP BY cache_status;

-- Query 4: List all manual recipes for this nutritionist
SELECT 
  id,
  recipe_name,
  cache_status,
  is_public,
  created_at
FROM cached_recipes
WHERE provider = 'manual'
  AND created_by_nutritionist_id = 'fcf88e44-db97-494d-9a49-8cc91e716734'
ORDER BY created_at DESC
LIMIT 10;

-- Query 5: Check what the search query would return
SELECT 
  id,
  recipe_name,
  cache_status,
  is_public
FROM cached_recipes
WHERE provider = 'manual'
  AND recipe_name ILIKE '%TestRecipe999%'
  AND (cache_status = 'active' OR cache_status IS NULL);

