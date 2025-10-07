-- Meal Plan Draft System Database Schema

-- Table to store meal plan drafts
CREATE TABLE IF NOT EXISTS meal_plan_drafts (
  id VARCHAR(255) PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'finalized')),
  search_params JSONB NOT NULL, -- Original search parameters
  suggestions JSONB NOT NULL, -- Meal suggestions with customizations
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '7 days')
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_client_id ON meal_plan_drafts(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_nutritionist_id ON meal_plan_drafts(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_status ON meal_plan_drafts(status);
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_expires_at ON meal_plan_drafts(expires_at);

-- Table to store recipe customizations (optional - for detailed tracking)
CREATE TABLE IF NOT EXISTS recipe_customizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draft_id VARCHAR(255) NOT NULL REFERENCES meal_plan_drafts(id) ON DELETE CASCADE,
  recipe_id VARCHAR(255) NOT NULL,
  recipe_source VARCHAR(50) NOT NULL CHECK (recipe_source IN ('edamam', 'spoonacular')),
  day_number INTEGER NOT NULL,
  meal_type VARCHAR(50) NOT NULL,
  customizations JSONB NOT NULL, -- Modification details
  custom_nutrition JSONB, -- Calculated custom nutrition
  servings INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(draft_id, recipe_id, day_number, meal_type)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_recipe_customizations_draft_id ON recipe_customizations(draft_id);
CREATE INDEX IF NOT EXISTS idx_recipe_customizations_recipe_id ON recipe_customizations(recipe_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_meal_plan_drafts_updated_at 
    BEFORE UPDATE ON meal_plan_drafts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_recipe_customizations_updated_at 
    BEFORE UPDATE ON recipe_customizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to cleanup expired drafts (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_drafts()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM meal_plan_drafts 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Example of how to call cleanup function
-- SELECT cleanup_expired_drafts();
