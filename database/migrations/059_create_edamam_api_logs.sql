-- Migration: Create Edamam API logs table
-- This table stores all Edamam API requests and responses for debugging, analytics, and caching

-- Create edamam_api_logs table
CREATE TABLE IF NOT EXISTS edamam_api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Request identification
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  session_id VARCHAR(255), -- For tracking related requests
  
  -- API details
  api_type VARCHAR(50) NOT NULL, -- 'recipe_search', 'nutrition_analysis', 'meal_planner', 'autocomplete', 'ingredient_details'
  endpoint VARCHAR(255) NOT NULL, -- Full API endpoint URL
  http_method VARCHAR(10) NOT NULL DEFAULT 'GET',
  
  -- Request data
  request_payload JSONB, -- Complete request payload
  request_params JSONB, -- Query parameters
  request_headers JSONB, -- Important headers (excluding sensitive data)
  
  -- Response data
  response_status INTEGER, -- HTTP status code
  response_payload JSONB, -- Complete response payload
  response_headers JSONB, -- Response headers
  response_size_bytes INTEGER, -- Size of response in bytes
  
  -- Performance metrics
  response_time_ms INTEGER, -- Response time in milliseconds
  api_key_used VARCHAR(50), -- Which API key was used (masked)
  rate_limit_remaining INTEGER, -- Rate limit info from response headers
  
  -- Error tracking
  error_occurred BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Usage context
  feature_context VARCHAR(100), -- 'meal_planning', 'ingredient_search', 'nutrition_lookup', etc.
  user_agent TEXT,
  ip_address INET,
  
  -- Cost tracking
  estimated_cost_usd DECIMAL(10, 6), -- Estimated API call cost
  credits_used INTEGER, -- If using credit-based system
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE, -- When response was received
  
  -- Metadata
  notes TEXT,
  tags TEXT[] -- For categorizing logs
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_edamam_logs_api_type ON edamam_api_logs(api_type);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_user_id ON edamam_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_client_id ON edamam_api_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_created_at ON edamam_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_response_status ON edamam_api_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_error_occurred ON edamam_api_logs(error_occurred);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_feature_context ON edamam_api_logs(feature_context);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_session_id ON edamam_api_logs(session_id);

-- Create GIN index for JSONB columns for better JSON queries
CREATE INDEX IF NOT EXISTS idx_edamam_logs_request_payload_gin ON edamam_api_logs USING GIN (request_payload);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_response_payload_gin ON edamam_api_logs USING GIN (response_payload);

-- Add comments to document the table
COMMENT ON TABLE edamam_api_logs IS 'Stores all Edamam API requests and responses for debugging, analytics, caching, and cost tracking';
COMMENT ON COLUMN edamam_api_logs.api_type IS 'Type of Edamam API call (recipe_search, nutrition_analysis, meal_planner, autocomplete, ingredient_details)';
COMMENT ON COLUMN edamam_api_logs.feature_context IS 'What feature triggered this API call (meal_planning, ingredient_search, nutrition_lookup, etc.)';
COMMENT ON COLUMN edamam_api_logs.response_payload IS 'Complete JSON response from Edamam API';
COMMENT ON COLUMN edamam_api_logs.estimated_cost_usd IS 'Estimated cost of this API call in USD';
COMMENT ON COLUMN edamam_api_logs.session_id IS 'Groups related API calls from the same user session';
