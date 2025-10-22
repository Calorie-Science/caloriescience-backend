-- Migration: Add Custom Recipe Fields to cached_recipes
-- Description: Extend cached_recipes table to support nutritionist-created custom recipes
-- Date: 2025-10-22

-- Add custom recipe fields
ALTER TABLE cached_recipes
ADD COLUMN IF NOT EXISTS created_by_nutritionist_id UUID REFERENCES users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS custom_notes TEXT,
ADD COLUMN IF NOT EXISTS recipe_description TEXT;

-- Add indexes for custom recipe queries
CREATE INDEX IF NOT EXISTS idx_cached_recipes_creator ON cached_recipes(created_by_nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_public ON cached_recipes(is_public);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_manual_provider ON cached_recipes(provider) WHERE provider = 'manual';

-- Add combined index for efficient custom recipe searches
CREATE INDEX IF NOT EXISTS idx_cached_recipes_custom_search 
ON cached_recipes(provider, is_public, created_by_nutritionist_id) 
WHERE provider = 'manual';

-- Add comment to clarify usage
COMMENT ON COLUMN cached_recipes.created_by_nutritionist_id IS 'For manual recipes: ID of nutritionist who created the recipe. NULL for external API recipes.';
COMMENT ON COLUMN cached_recipes.is_public IS 'For manual recipes: Whether recipe is publicly searchable (true) or private to creator (false). Always NULL for external API recipes.';
COMMENT ON COLUMN cached_recipes.custom_notes IS 'For manual recipes: Nutritionist notes about the recipe. NULL for external API recipes.';
COMMENT ON COLUMN cached_recipes.recipe_description IS 'For manual recipes: Detailed recipe description. Can also be used for external API recipes.';

