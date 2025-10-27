-- Check who owns the recipes
SELECT 
  id,
  recipe_name,
  provider,
  created_by_nutritionist_id,
  is_public
FROM cached_recipes
WHERE id IN ('53a93ca9-dd3c-424c-a91d-4a7549a3a4a8', '2903c486-cd1e-4b89-971b-b0db669cb0aa');

