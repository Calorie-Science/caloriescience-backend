-- Migration: Create async meal plans table for tracking OpenAI Assistant meal plan generation
-- This allows us to track long-running meal plan generation tasks

-- Create async_meal_plans table
CREATE TABLE IF NOT EXISTS async_meal_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- OpenAI Assistant tracking
    thread_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    
    -- Request data
    client_goals JSONB NOT NULL,
    additional_text TEXT,
    
    -- Status tracking
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
    
    -- Results
    generated_meal_plan JSONB,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    UNIQUE(thread_id, run_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_client_id ON async_meal_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_nutritionist_id ON async_meal_plans(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_status ON async_meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_created_at ON async_meal_plans(created_at);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_async_meal_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_async_meal_plans_updated_at
    BEFORE UPDATE ON async_meal_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_async_meal_plans_updated_at();
