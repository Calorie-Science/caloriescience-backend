-- Add Bon Happetee provider and allergens support
-- Migration: 064_add_bonhappetee_and_allergens

-- Add bonhappetee to recipe_provider enum
ALTER TYPE recipe_provider ADD VALUE IF NOT EXISTS 'bonhappetee';

-- Add allergens column to cached_recipes table
ALTER TABLE cached_recipes 
ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';

COMMENT ON COLUMN cached_recipes.allergens IS 'List of allergens in the recipe (from Bon Happetee or extracted from health labels)';

