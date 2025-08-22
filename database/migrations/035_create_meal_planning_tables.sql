-- Migration 035: Create meal planning tables
-- This adds support for generating and storing meal plans using Edamam APIs

-- Meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Plan metadata
  plan_name VARCHAR(255) NOT NULL DEFAULT 'Daily Meal Plan',
  plan_date DATE NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'daily', -- daily, weekly, custom
  
  -- Nutrition targets (from client's EER requirements)
  target_calories INTEGER NOT NULL,
  target_protein_grams DECIMAL(6,2) NOT NULL,
  target_carbs_grams DECIMAL(6,2) NOT NULL,
  target_fat_grams DECIMAL(6,2) NOT NULL,
  target_fiber_grams DECIMAL(6,2),
  
  -- Plan status and preferences
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, completed, archived
  dietary_restrictions TEXT[], -- gluten-free, dairy-free, etc.
  cuisine_preferences TEXT[], -- italian, indian, etc.
  meal_preferences JSONB, -- specific meal type preferences
  
  -- Generated plan data
  generated_meals JSONB, -- Edamam API response data
  nutrition_summary JSONB, -- calculated nutrition totals
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_plan_date CHECK (plan_date >= CURRENT_DATE - INTERVAL '30 days'),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'active', 'completed', 'archived'))
);

-- Individual meals within a plan
CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  
  -- Meal details
  meal_type VARCHAR(50) NOT NULL, -- breakfast, lunch, dinner, snack
  meal_order INTEGER NOT NULL, -- order within the day
  
  -- Edamam recipe data
  edamam_recipe_id VARCHAR(255),
  recipe_name VARCHAR(500) NOT NULL,
  recipe_url TEXT,
  recipe_image_url TEXT,
  
  -- Nutrition per serving
  calories_per_serving INTEGER,
  protein_grams DECIMAL(6,2),
  carbs_grams DECIMAL(6,2),
  fat_grams DECIMAL(6,2),
  fiber_grams DECIMAL(6,2),
  
  -- Serving information
  servings_per_meal DECIMAL(4,2) DEFAULT 1.0,
  total_calories INTEGER,
  total_protein_grams DECIMAL(6,2),
  total_carbs_grams DECIMAL(6,2),
  total_fat_grams DECIMAL(6,2),
  total_fiber_grams DECIMAL(6,2),
  
  -- Ingredients and instructions
  ingredients JSONB,
  cooking_instructions TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_meal_type CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
  CONSTRAINT valid_meal_order CHECK (meal_order > 0),
  CONSTRAINT valid_servings CHECK (servings_per_meal > 0)
);

-- Meal plan feedback and ratings
CREATE TABLE IF NOT EXISTS meal_plan_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Feedback data
  overall_rating INTEGER CHECK (overall_rating >= 1 AND overall_rating <= 5),
  taste_rating INTEGER CHECK (taste_rating >= 1 AND taste_rating <= 5),
  satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5),
  
  -- Comments and notes
  feedback_notes TEXT,
  favorite_meals TEXT[],
  disliked_meals TEXT[],
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_client_date ON meal_plans(client_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutritionist ON meal_plans(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_plan_id ON meal_plan_meals(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_type_order ON meal_plan_meals(meal_plan_id, meal_type, meal_order);
CREATE INDEX IF NOT EXISTS idx_meal_plan_feedback_plan_id ON meal_plan_feedback(meal_plan_id);

-- Add comments
COMMENT ON TABLE meal_plans IS 'Stores generated meal plans for clients based on their EER requirements';
COMMENT ON TABLE meal_plan_meals IS 'Individual meals within a meal plan with nutrition and recipe data';
COMMENT ON TABLE meal_plan_feedback IS 'Client feedback and ratings for generated meal plans';
