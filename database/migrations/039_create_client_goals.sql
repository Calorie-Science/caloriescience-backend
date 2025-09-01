-- Migration: Create client goals table for storing EER, BMR, and macro goals
-- This allows nutritionists to set specific targets for clients

-- Create client_goals table
CREATE TABLE IF NOT EXISTS client_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Energy Goals
    eer_goal_calories INTEGER NOT NULL, -- Estimated Energy Requirement target
    bmr_goal_calories INTEGER NOT NULL, -- Basal Metabolic Rate target
    
    -- Macro Goals (grams)
    protein_goal_grams DECIMAL(6,2) NOT NULL,
    carbs_goal_grams DECIMAL(6,2) NOT NULL,
    fat_goal_grams DECIMAL(6,2) NOT NULL,
    
    -- Macro Percentages
    protein_goal_percentage DECIMAL(5,2) NOT NULL,
    carbs_goal_percentage DECIMAL(5,2) NOT NULL,
    fat_goal_percentage DECIMAL(5,2) NOT NULL,
    
    -- Additional Goals
    fiber_goal_grams DECIMAL(6,2),
    water_goal_liters DECIMAL(4,2),
    
    -- Goal Status
    is_active BOOLEAN DEFAULT true,
    goal_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    goal_end_date DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(client_id, is_active), -- Only one active goal per client
    CHECK (eer_goal_calories > 0),
    CHECK (bmr_goal_calories > 0),
    CHECK (protein_goal_grams > 0),
    CHECK (carbs_goal_grams > 0),
    CHECK (fat_goal_grams > 0),
    CHECK (protein_goal_percentage + carbs_goal_percentage + fat_goal_percentage = 100),
    CHECK (goal_end_date IS NULL OR goal_end_date > goal_start_date)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_client_goals_client_id ON client_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_nutritionist_id ON client_goals(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_active ON client_goals(is_active);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER update_client_goals_updated_at 
    BEFORE UPDATE ON client_goals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
