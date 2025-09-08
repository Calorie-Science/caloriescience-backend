-- Test script to verify migration 049 was successful

-- 1. Check the data type of calories_per_serving and other nutrition columns
SELECT 
    column_name, 
    data_type, 
    numeric_precision, 
    numeric_scale,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'meal_plan_meals' 
AND column_name IN ('calories_per_serving', 'protein_grams', 'carbs_grams', 'fat_grams', 'fiber_grams')
ORDER BY column_name;

-- Expected result:
-- calories_per_serving should be: numeric (or decimal) with precision 8, scale 2
-- Other columns should be: numeric (or decimal) with precision 6, scale 2

-- 2. First, get an existing meal_plan_id or create a test meal plan
-- Option A: Use an existing meal plan (uncomment if you have meal plans)
-- SELECT id FROM meal_plans LIMIT 1;

-- Option B: Create a temporary meal plan for testing
INSERT INTO meal_plans (
    id,
    client_id,
    nutritionist_id,
    plan_name,
    plan_date,
    status
) VALUES (
    '12345678-1234-1234-1234-123456789012'::uuid,
    (SELECT id FROM clients LIMIT 1),  -- Use an existing client
    (SELECT id FROM nutritionists LIMIT 1),  -- Use an existing nutritionist
    'Test Plan for Migration Verification',
    CURRENT_DATE,
    'draft'
);

-- Now test inserting decimal values
-- This should succeed if migration was applied
INSERT INTO meal_plan_meals (
    id,
    meal_plan_id,
    day_number,
    meal_type,
    meal_order,
    recipe_name,
    calories_per_serving,
    protein_grams,
    carbs_grams,
    fat_grams,
    fiber_grams
) VALUES (
    gen_random_uuid(),
    '12345678-1234-1234-1234-123456789012'::uuid,
    1,
    'test',
    1,
    'Test Recipe with Decimals',
    500.07,  -- This is the decimal value that was causing the error
    23.45,
    67.89,
    12.34,
    5.67
);

-- 3. Verify the insert worked and decimals are preserved
SELECT 
    recipe_name,
    calories_per_serving,
    protein_grams,
    carbs_grams,
    fat_grams,
    fiber_grams
FROM meal_plan_meals 
WHERE recipe_name = 'Test Recipe with Decimals';

-- 4. Clean up the test data
DELETE FROM meal_plan_meals WHERE recipe_name = 'Test Recipe with Decimals';
DELETE FROM meal_plans WHERE id = '12345678-1234-1234-1234-123456789012'::uuid;

-- 5. Check if the view was recreated successfully
SELECT 
    table_name,
    view_definition IS NOT NULL as has_definition
FROM information_schema.views 
WHERE table_name = 'meal_plan_by_day';

-- 6. Verify the view can query the decimal columns
SELECT 
    meal_plan_id,
    day_number,
    meal_type,
    calories_per_serving,
    protein_grams
FROM meal_plan_by_day 
LIMIT 1;
