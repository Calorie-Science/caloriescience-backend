-- Migration: Create health labels mapping system
-- This enables standardized health labels that can map to different food database providers
-- Created: 2025-09-25

-- Create health_labels_categories table (allergies, preferences, cuisines)
CREATE TABLE IF NOT EXISTS health_labels_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    priority INTEGER DEFAULT 0, -- For ordering/importance
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create our standardized health labels table
CREATE TABLE IF NOT EXISTS health_labels_standard (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id UUID NOT NULL REFERENCES health_labels_categories(id) ON DELETE CASCADE,
    label_key VARCHAR(100) NOT NULL UNIQUE, -- Our internal key (e.g., 'dairy-free')
    display_name VARCHAR(200) NOT NULL, -- Human readable name (e.g., 'Dairy Free')
    description TEXT, -- Detailed description
    severity_level VARCHAR(20) DEFAULT 'preference', -- 'critical', 'high', 'medium', 'preference'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create food database providers table
CREATE TABLE IF NOT EXISTS food_database_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(100) NOT NULL UNIQUE, -- 'edamam', 'spoonacular', 'usda', etc.
    display_name VARCHAR(200) NOT NULL,
    api_base_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- For fallback ordering
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create the mapping table between our labels and provider-specific labels
CREATE TABLE IF NOT EXISTS health_labels_provider_mapping (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    standard_label_id UUID NOT NULL REFERENCES health_labels_standard(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES food_database_providers(id) ON DELETE CASCADE,
    provider_label_key VARCHAR(200) NOT NULL, -- Provider's label key (e.g., 'dairy-free', 'DAIRY_FREE')
    provider_label_value VARCHAR(200), -- Provider's label value if different from key
    is_supported BOOLEAN DEFAULT true, -- Some providers may not support certain labels
    mapping_notes TEXT, -- Any special notes about this mapping
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique mapping per provider
    UNIQUE(standard_label_id, provider_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_health_labels_standard_category ON health_labels_standard(category_id);
CREATE INDEX IF NOT EXISTS idx_health_labels_standard_active ON health_labels_standard(is_active);
CREATE INDEX IF NOT EXISTS idx_health_labels_standard_key ON health_labels_standard(label_key);
CREATE INDEX IF NOT EXISTS idx_health_labels_mapping_standard ON health_labels_provider_mapping(standard_label_id);
CREATE INDEX IF NOT EXISTS idx_health_labels_mapping_provider ON health_labels_provider_mapping(provider_id);
CREATE INDEX IF NOT EXISTS idx_health_labels_mapping_supported ON health_labels_provider_mapping(is_supported);
CREATE INDEX IF NOT EXISTS idx_food_providers_active ON food_database_providers(is_active);

-- Insert categories
INSERT INTO health_labels_categories (name, description, priority) VALUES
    ('allergy', 'Safety-critical allergies that must be completely avoided', 1),
    ('dietary_preference', 'Lifestyle-based dietary choices and restrictions', 2),
    ('cuisine_type', 'Geographic and cultural cuisine preferences', 3),
    ('nutrition_focus', 'Nutrition-focused dietary patterns (low-carb, high-protein, etc.)', 4)
ON CONFLICT (name) DO NOTHING;

-- Insert food database providers
INSERT INTO food_database_providers (provider_name, display_name, api_base_url, is_active, priority) VALUES
    ('edamam', 'Edamam Recipe Search API', 'https://api.edamam.com', true, 1),
    ('spoonacular', 'Spoonacular Food API', 'https://api.spoonacular.com', true, 2),
    ('usda', 'USDA FoodData Central', 'https://api.nal.usda.gov/fdc', true, 3),
    ('nutritionix', 'Nutritionix API', 'https://api.nutritionix.com', true, 4)
ON CONFLICT (provider_name) DO NOTHING;

-- Add updated_at trigger for health_labels_standard
CREATE OR REPLACE FUNCTION update_health_labels_standard_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_health_labels_standard_updated_at
    BEFORE UPDATE ON health_labels_standard
    FOR EACH ROW
    EXECUTE FUNCTION update_health_labels_standard_updated_at();

-- Add updated_at trigger for health_labels_provider_mapping
CREATE OR REPLACE FUNCTION update_health_labels_mapping_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_health_labels_mapping_updated_at
    BEFORE UPDATE ON health_labels_provider_mapping
    FOR EACH ROW
    EXECUTE FUNCTION update_health_labels_mapping_updated_at();

-- Add updated_at trigger for food_database_providers
CREATE OR REPLACE FUNCTION update_food_providers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_food_providers_updated_at
    BEFORE UPDATE ON food_database_providers
    FOR EACH ROW
    EXECUTE FUNCTION update_food_providers_updated_at();
