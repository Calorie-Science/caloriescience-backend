-- Complete fix for recipe 652033
-- Issue: nutrition_details has data but column values are NULL

-- Step 1: Update columns from nutrition_details JSONB
UPDATE cached_recipes
SET 
  calories_per_serving = COALESCE(
    (nutrition_details->'calories'->>'quantity')::numeric,
    0
  ),
  protein_per_serving_g = COALESCE(
    (nutrition_details->'macros'->'protein'->>'quantity')::numeric,
    0
  ),
  carbs_per_serving_g = COALESCE(
    (nutrition_details->'macros'->'carbs'->>'quantity')::numeric,
    0
  ),
  fat_per_serving_g = COALESCE(
    (nutrition_details->'macros'->'fat'->>'quantity')::numeric,
    0
  ),
  fiber_per_serving_g = COALESCE(
    (nutrition_details->'macros'->'fiber'->>'quantity')::numeric,
    0  -- Default to 0 if not present
  ),
  -- Also update total values (multiply by servings)
  total_calories = COALESCE(
    (nutrition_details->'calories'->>'quantity')::numeric * servings,
    0
  ),
  total_protein_g = COALESCE(
    (nutrition_details->'macros'->'protein'->>'quantity')::numeric * servings,
    0
  ),
  total_carbs_g = COALESCE(
    (nutrition_details->'macros'->'carbs'->>'quantity')::numeric * servings,
    0
  ),
  total_fat_g = COALESCE(
    (nutrition_details->'macros'->'fat'->>'quantity')::numeric * servings,
    0
  ),
  total_fiber_g = COALESCE(
    (nutrition_details->'macros'->'fiber'->>'quantity')::numeric * servings,
    0
  ),
  updated_at = NOW()
WHERE external_recipe_id = '652033';

-- Step 2: Add fiber to nutrition_details if missing (set to 0)
UPDATE cached_recipes
SET 
  nutrition_details = jsonb_set(
    nutrition_details,
    '{macros,fiber}',
    jsonb_build_object('quantity', 0, 'unit', 'g'),
    true  -- create if doesn't exist
  )
WHERE 
  external_recipe_id = '652033'
  AND nutrition_details->'macros'->'fiber' IS NULL;

-- Step 3: Verify the fix
SELECT 
  'AFTER COMPLETE FIX' as status,
  external_recipe_id,
  recipe_name,
  servings,
  calories_per_serving,
  protein_per_serving_g,
  carbs_per_serving_g,
  fat_per_serving_g,
  fiber_per_serving_g,
  nutrition_details->'macros'->'fiber' as nutrition_fiber,
  CASE 
    WHEN calories_per_serving > 0 THEN '✓ Fixed'
    ELSE '✗ Still NULL/0'
  END as fix_status
FROM cached_recipes 
WHERE external_recipe_id = '652033';

