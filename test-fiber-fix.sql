-- Test query to verify fiber fix for recipe 652033
-- Run this BEFORE applying the migration to see the issue

SELECT 
  'BEFORE FIX' as status,
  external_recipe_id,
  recipe_name,
  fiber_per_serving_g as fiber,
  carbs_per_serving_g as carbs,
  nutrition_details->'macros'->'carbs'->>'quantity' as nutrition_carbs,
  nutrition_details->'macros'->'netCarbs'->>'quantity' as nutrition_net_carbs,
  nutrition_details->'macros'->'fiber'->>'quantity' as nutrition_fiber
FROM cached_recipes 
WHERE external_recipe_id = '652033';

-- Apply the migration
-- \i database/migrations/066_fix_null_nutrition_values.sql

-- Run this AFTER applying the migration to verify the fix
SELECT 
  'AFTER FIX' as status,
  external_recipe_id,
  recipe_name,
  fiber_per_serving_g as fiber,
  carbs_per_serving_g as carbs,
  nutrition_details->'macros'->'fiber'->>'quantity' as nutrition_fiber,
  CASE 
    WHEN fiber_per_serving_g > 0 THEN '✓ Fixed'
    ELSE '✗ Still NULL/0'
  END as fix_status
FROM cached_recipes 
WHERE external_recipe_id = '652033';

