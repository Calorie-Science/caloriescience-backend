-- Delete all custom/manual recipes from cached_recipes
-- This will clean up all test recipes so we can test the new nutrition format

-- First, check how many recipes will be deleted
SELECT 
    COUNT(*) as total_manual_recipes,
    COUNT(CASE WHEN is_public = true THEN 1 END) as public_recipes,
    COUNT(CASE WHEN is_public = false THEN 1 END) as private_recipes
FROM cached_recipes
WHERE provider = 'manual';

-- Show the recipes that will be deleted
SELECT 
    id,
    recipe_name,
    created_by_nutritionist_id,
    is_public,
    created_at
FROM cached_recipes
WHERE provider = 'manual'
ORDER BY created_at DESC;

-- Uncomment the line below to actually delete them
-- DELETE FROM cached_recipes WHERE provider = 'manual';

-- After deleting, verify
-- SELECT COUNT(*) as remaining_manual_recipes FROM cached_recipes WHERE provider = 'manual';

