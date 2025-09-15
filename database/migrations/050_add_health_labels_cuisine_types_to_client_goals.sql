-- Migration: Add health_labels and cuisine_types to client_goals table
-- These fields allow nutritionists to specify dietary preferences and restrictions for meal planning

-- Add health_labels column to store array of health label preferences
-- Health labels describe commonly used ingredient level aspects (e.g., gluten-free, vegan, keto-friendly)
ALTER TABLE client_goals 
ADD COLUMN health_labels TEXT[];

-- Add cuisine_types column to store array of preferred cuisine types
-- Cuisine types refer to the cuisine that recipes would fall under (e.g., italian, mediterranean, asian)
ALTER TABLE client_goals 
ADD COLUMN cuisine_types TEXT[];

-- Add comments to document the new columns
COMMENT ON COLUMN client_goals.health_labels IS 'Optional array of health labels for meal planning (e.g., gluten-free, vegan, keto-friendly). These describe ingredient-level dietary aspects.';
COMMENT ON COLUMN client_goals.cuisine_types IS 'Optional array of preferred cuisine types for meal planning (e.g., italian, mediterranean, asian). These refer to the cuisine style of recipes.';

-- Create indexes for better query performance when filtering by health labels or cuisine types
CREATE INDEX IF NOT EXISTS idx_client_goals_health_labels ON client_goals USING GIN (health_labels);
CREATE INDEX IF NOT EXISTS idx_client_goals_cuisine_types ON client_goals USING GIN (cuisine_types);
