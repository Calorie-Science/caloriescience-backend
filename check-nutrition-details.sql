-- Check what's actually in nutrition_details for recipe 652033
SELECT 
  external_recipe_id,
  recipe_name,
  calories_per_serving,
  carbs_per_serving_g,
  fiber_per_serving_g,
  nutrition_details,
  jsonb_pretty(original_api_response->'nutrition'->'nutrients') as raw_nutrients
FROM cached_recipes 
WHERE external_recipe_id = '652033';
