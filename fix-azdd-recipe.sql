-- Quick fix for recipe "azdd" to make it searchable
-- This sets cache_status to 'active' so it appears in search results

UPDATE cached_recipes
SET cache_status = 'active',
    updated_at = NOW()
WHERE id = 'd47f2b79-ccc9-406d-aaa9-3afbda14941c'  -- Recipe: azdd
  AND provider = 'manual';

-- Verify the update
SELECT 
  id,
  recipe_name,
  provider,
  cache_status,
  is_public,
  created_by_nutritionist_id
FROM cached_recipes
WHERE id = 'd47f2b79-ccc9-406d-aaa9-3afbda14941c';

