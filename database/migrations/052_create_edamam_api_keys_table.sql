-- Migration: Create Edamam API keys management table
-- This table manages API keys for Edamam services with usage tracking and automatic rotation

-- Create edamam_api_keys table
CREATE TABLE IF NOT EXISTS edamam_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id VARCHAR(50) NOT NULL,
    app_key VARCHAR(100) NOT NULL,
    api_type VARCHAR(20) NOT NULL CHECK (api_type IN ('meal_planner', 'nutrition', 'recipe', 'autocomplete')),
    is_active BOOLEAN DEFAULT true,
    usage_count INTEGER DEFAULT 0,
    max_usage_limit INTEGER DEFAULT 100,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_edamam_api_keys_type_active ON edamam_api_keys (api_type, is_active);
CREATE INDEX IF NOT EXISTS idx_edamam_api_keys_usage ON edamam_api_keys (usage_count, max_usage_limit);
CREATE INDEX IF NOT EXISTS idx_edamam_api_keys_app_id ON edamam_api_keys (app_id);

-- Create unique constraint to prevent duplicate app_id/app_key combinations
CREATE UNIQUE INDEX IF NOT EXISTS idx_edamam_api_keys_unique ON edamam_api_keys (app_id, app_key, api_type);

-- Add comments to document the table
COMMENT ON TABLE edamam_api_keys IS 'Manages Edamam API keys with usage tracking and automatic rotation support';
COMMENT ON COLUMN edamam_api_keys.app_id IS 'Edamam application ID';
COMMENT ON COLUMN edamam_api_keys.app_key IS 'Edamam application key';
COMMENT ON COLUMN edamam_api_keys.api_type IS 'Type of Edamam API (meal_planner, nutrition, recipe, autocomplete)';
COMMENT ON COLUMN edamam_api_keys.is_active IS 'Whether this API key is currently active';
COMMENT ON COLUMN edamam_api_keys.usage_count IS 'Number of API calls made with this key';
COMMENT ON COLUMN edamam_api_keys.max_usage_limit IS 'Maximum usage limit before rotation (default 100)';
COMMENT ON COLUMN edamam_api_keys.last_used_at IS 'Timestamp of last API call';

-- Insert initial API keys from the current hardcoded values
-- Meal Planner API key
INSERT INTO edamam_api_keys (app_id, app_key, api_type, usage_count, max_usage_limit, notes) VALUES
('858bc297', '7b2f0ca26ac245692d8d180302246bd2', 'meal_planner', 0, 100, 'Meal planner API key')
ON CONFLICT (app_id, app_key, api_type) DO NOTHING;

-- Nutrition API key
INSERT INTO edamam_api_keys (app_id, app_key, api_type, usage_count, max_usage_limit, notes) VALUES
('86a78566', '0938eb1f14ffeb73a5ba2414fd4198d5', 'nutrition', 0, 100, 'Nutrition API key')
ON CONFLICT (app_id, app_key, api_type) DO NOTHING;

-- Recipe API key
INSERT INTO edamam_api_keys (app_id, app_key, api_type, usage_count, max_usage_limit, notes) VALUES
('5bce8081', 'c80ecbf8968d48dfe51d395f6f19279a', 'recipe', 0, 100, 'Recipe API key')
ON CONFLICT (app_id, app_key, api_type) DO NOTHING;

-- Note: Autocomplete API uses the same keys as nutrition API, so no separate insert needed
