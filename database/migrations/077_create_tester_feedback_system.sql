-- Migration: Create Tester Feedback System
-- Description: Tables for in-app tester feedback collection during POC testing
-- Date: 2025-11-18

-- Main feedback table that stores all types of feedback
CREATE TABLE IF NOT EXISTS tester_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User information
    nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Feedback categorization
    feedback_type VARCHAR(50) NOT NULL CHECK (feedback_type IN (
        'global',                      -- Overall product feedback
        'client_details',              -- Client details section feedback
        'nutritional_analysis_overall', -- Overall nutritional analysis feedback
        'nutritional_analysis_macro',   -- Macro-specific feedback
        'nutritional_analysis_micro',   -- Micro-specific feedback
        'meal_planning_manual',        -- Manual meal planning feedback
        'meal_planning_automated',     -- Automated meal planning feedback
        'meal_planning_ai',            -- AI meal planning feedback
        'meal_plan_quality',           -- Individual meal plan quality rating
        'meal_plan_nutrition'          -- Individual meal plan nutritional analysis
    )),

    -- Optional references
    client_id UUID REFERENCES clients(id) ON DELETE CASCADE, -- For client-specific feedback
    meal_plan_id VARCHAR(255),                              -- For meal plan-specific feedback (can be draft ID or finalized plan ID)

    -- Feedback content
    feedback_text TEXT,                -- Free-text feedback
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5 rating (for quality ratings)

    -- User-specified feedback date (for historical entries)
    feedback_date DATE,

    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX idx_tester_feedback_nutritionist ON tester_feedback(nutritionist_id);
CREATE INDEX idx_tester_feedback_client ON tester_feedback(client_id);
CREATE INDEX idx_tester_feedback_type ON tester_feedback(feedback_type);
CREATE INDEX idx_tester_feedback_meal_plan ON tester_feedback(meal_plan_id);
CREATE INDEX idx_tester_feedback_created ON tester_feedback(created_at DESC);

-- RLS Policies
ALTER TABLE tester_feedback ENABLE ROW LEVEL SECURITY;

-- Nutritionists can only view and manage their own feedback
CREATE POLICY tester_feedback_nutritionist_select ON tester_feedback
    FOR SELECT
    TO authenticated
    USING (nutritionist_id = auth.uid());

CREATE POLICY tester_feedback_nutritionist_insert ON tester_feedback
    FOR INSERT
    TO authenticated
    WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY tester_feedback_nutritionist_update ON tester_feedback
    FOR UPDATE
    TO authenticated
    USING (nutritionist_id = auth.uid())
    WITH CHECK (nutritionist_id = auth.uid());

CREATE POLICY tester_feedback_nutritionist_delete ON tester_feedback
    FOR DELETE
    TO authenticated
    USING (nutritionist_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_tester_feedback_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER tester_feedback_updated_at
    BEFORE UPDATE ON tester_feedback
    FOR EACH ROW
    EXECUTE FUNCTION update_tester_feedback_updated_at();

-- Comments
COMMENT ON TABLE tester_feedback IS 'Stores all types of tester feedback during POC testing phase';
COMMENT ON COLUMN tester_feedback.feedback_type IS 'Type of feedback: global, client_details, nutritional_analysis_*, meal_planning_*, meal_plan_*';
COMMENT ON COLUMN tester_feedback.rating IS 'Optional 1-5 rating for meal plan quality';
COMMENT ON COLUMN tester_feedback.feedback_date IS 'User-specified date for the feedback entry';
