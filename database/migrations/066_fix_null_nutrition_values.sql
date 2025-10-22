-- Migration: Fix NULL nutrition values in cached recipes
-- Description: Set NULL macro and micro nutrition values to 0 for better data consistency
-- Also copies values from nutrition_details JSONB when columns are NULL but JSONB has data
-- Date: 2025-10-22

-- FIRST: Copy values from nutrition_details JSONB to columns when columns are NULL but JSONB has data
-- This handles cases where nutrition_details was populated but columns weren't
UPDATE cached_recipes
SET 
  calories_per_serving = COALESCE(
    calories_per_serving,
    (nutrition_details->'calories'->>'quantity')::numeric,
    0
  ),
  protein_per_serving_g = COALESCE(
    protein_per_serving_g,
    (nutrition_details->'macros'->'protein'->>'quantity')::numeric,
    0
  ),
  carbs_per_serving_g = COALESCE(
    carbs_per_serving_g,
    (nutrition_details->'macros'->'carbs'->>'quantity')::numeric,
    0
  ),
  fat_per_serving_g = COALESCE(
    fat_per_serving_g,
    (nutrition_details->'macros'->'fat'->>'quantity')::numeric,
    0
  ),
  fiber_per_serving_g = COALESCE(
    fiber_per_serving_g,
    (nutrition_details->'macros'->'fiber'->>'quantity')::numeric,
    0
  ),
  total_calories = COALESCE(
    total_calories,
    (nutrition_details->'calories'->>'quantity')::numeric * COALESCE(servings, 1),
    0
  ),
  total_protein_g = COALESCE(
    total_protein_g,
    (nutrition_details->'macros'->'protein'->>'quantity')::numeric * COALESCE(servings, 1),
    0
  ),
  total_carbs_g = COALESCE(
    total_carbs_g,
    (nutrition_details->'macros'->'carbs'->>'quantity')::numeric * COALESCE(servings, 1),
    0
  ),
  total_fat_g = COALESCE(
    total_fat_g,
    (nutrition_details->'macros'->'fat'->>'quantity')::numeric * COALESCE(servings, 1),
    0
  ),
  total_fiber_g = COALESCE(
    total_fiber_g,
    (nutrition_details->'macros'->'fiber'->>'quantity')::numeric * COALESCE(servings, 1),
    0
  ),
  total_sugar_g = COALESCE(
    total_sugar_g,
    (nutrition_details->'macros'->'sugar'->>'quantity')::numeric * COALESCE(servings, 1),
    0
  ),
  total_sodium_mg = COALESCE(
    total_sodium_mg,
    (nutrition_details->'macros'->'sodium'->>'quantity')::numeric * COALESCE(servings, 1),
    0
  )
WHERE 
  nutrition_details IS NOT NULL
  AND (
    calories_per_serving IS NULL 
    OR protein_per_serving_g IS NULL 
    OR carbs_per_serving_g IS NULL 
    OR fat_per_serving_g IS NULL
    OR fiber_per_serving_g IS NULL
    OR total_calories IS NULL
    OR total_protein_g IS NULL
    OR total_carbs_g IS NULL
    OR total_fat_g IS NULL
    OR total_fiber_g IS NULL
  );

-- SECOND: Update remaining NULL values to 0 (for recipes without nutrition_details)
UPDATE cached_recipes
SET 
  calories_per_serving = COALESCE(calories_per_serving, 0),
  protein_per_serving_g = COALESCE(protein_per_serving_g, 0),
  carbs_per_serving_g = COALESCE(carbs_per_serving_g, 0),
  fat_per_serving_g = COALESCE(fat_per_serving_g, 0),
  fiber_per_serving_g = COALESCE(fiber_per_serving_g, 0),
  total_calories = COALESCE(total_calories, 0),
  total_protein_g = COALESCE(total_protein_g, 0),
  total_carbs_g = COALESCE(total_carbs_g, 0),
  total_fat_g = COALESCE(total_fat_g, 0),
  total_fiber_g = COALESCE(total_fiber_g, 0),
  total_sugar_g = COALESCE(total_sugar_g, 0),
  total_sodium_mg = COALESCE(total_sodium_mg, 0)
WHERE 
  calories_per_serving IS NULL 
  OR protein_per_serving_g IS NULL 
  OR carbs_per_serving_g IS NULL 
  OR fat_per_serving_g IS NULL
  OR fiber_per_serving_g IS NULL
  OR total_calories IS NULL
  OR total_protein_g IS NULL
  OR total_carbs_g IS NULL
  OR total_fat_g IS NULL
  OR total_fiber_g IS NULL
  OR total_sugar_g IS NULL
  OR total_sodium_mg IS NULL;

-- THIRD: Add fiber to nutrition_details JSONB if missing (set to 0)
UPDATE cached_recipes
SET 
  nutrition_details = jsonb_set(
    COALESCE(nutrition_details, '{}'::jsonb),
    '{macros,fiber}',
    jsonb_build_object('quantity', 0, 'unit', 'g'),
    true
  )
WHERE 
  nutrition_details IS NOT NULL
  AND nutrition_details->'macros'->'fiber' IS NULL;

-- FOURTH: For Spoonacular recipes where fiber is missing but we have Carbs and Net Carbs,
-- calculate fiber as: Fiber = Carbs - Net Carbs
-- This is stored in the nutrition_details JSONB
UPDATE cached_recipes
SET 
  fiber_per_serving_g = GREATEST(
    (COALESCE((nutrition_details->'macros'->'carbs'->>'quantity')::numeric, 0) - 
     COALESCE((nutrition_details->'macros'->'netCarbs'->>'quantity')::numeric, 0)),
    0
  ),
  total_fiber_g = GREATEST(
    (COALESCE((nutrition_details->'macros'->'carbs'->>'quantity')::numeric, 0) - 
     COALESCE((nutrition_details->'macros'->'netCarbs'->>'quantity')::numeric, 0)) * COALESCE(servings, 1),
    0
  ),
  nutrition_details = jsonb_set(
    COALESCE(nutrition_details, '{}'::jsonb),
    '{macros,fiber}',
    jsonb_build_object(
      'quantity', GREATEST(
        (COALESCE((nutrition_details->'macros'->'carbs'->>'quantity')::numeric, 0) - 
         COALESCE((nutrition_details->'macros'->'netCarbs'->>'quantity')::numeric, 0)),
        0
      ),
      'unit', 'g'
    )
  )
WHERE 
  provider = 'spoonacular'
  AND (fiber_per_serving_g IS NULL OR fiber_per_serving_g = 0)
  AND nutrition_details->'macros'->'carbs' IS NOT NULL
  AND nutrition_details->'macros'->'netCarbs' IS NOT NULL
  AND (nutrition_details->'macros'->'carbs'->>'quantity')::numeric > (nutrition_details->'macros'->'netCarbs'->>'quantity')::numeric;

-- Report how many recipes were updated
DO $$
DECLARE
  fiber_updated_count INTEGER;
  macro_updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fiber_updated_count
  FROM cached_recipes
  WHERE fiber_per_serving_g = 0;
  
  SELECT COUNT(*) INTO macro_updated_count
  FROM cached_recipes
  WHERE calories_per_serving = 0 OR protein_per_serving_g = 0;
  
  RAISE NOTICE 'Migration complete:';
  RAISE NOTICE '  - Recipes with fiber set to 0: %', fiber_updated_count;
  RAISE NOTICE '  - Recipes with other macros checked: %', macro_updated_count;
END $$;

-- Add comment
COMMENT ON COLUMN cached_recipes.fiber_per_serving_g IS 'Fiber per serving in grams. 0 if not available from provider.';
COMMENT ON COLUMN cached_recipes.total_fiber_g IS 'Total fiber for entire recipe in grams. 0 if not available from provider.';

