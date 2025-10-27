-- Check the nutrition_details structure for the Healthy Protein Bowl recipe
SELECT 
  id,
  recipe_name,
  provider,
  nutrition_details
FROM cached_recipes
WHERE id = '53a93ca9-dd3c-424c-a91d-4a7549a3a4a8';

