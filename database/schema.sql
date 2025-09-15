-- CalorieScience Database Schema
-- Updated to reflect actual current database structure
-- Generated from live database schema analysis

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create custom ENUM types
CREATE TYPE client_status AS ENUM ('prospective', 'active', 'inactive', 'archived');
CREATE TYPE activity_level AS ENUM ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE pregnancy_status AS ENUM ('not_pregnant', 'first_trimester', 'second_trimester', 'third_trimester');
CREATE TYPE lactation_status AS ENUM ('not_lactating', 'lactating_0_6_months', 'lactating_7_12_months');
CREATE TYPE bmi_category AS ENUM ('underweight', 'normal', 'overweight', 'obese_class_1', 'obese_class_2', 'obese_class_3');
CREATE TYPE document_type AS ENUM ('lab_report', 'medical_report', 'diet_log', 'progress_photo', 'other');

-- Users table (Nutritionists and system users)
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  phone VARCHAR(20),
  phone_country_code VARCHAR(5) DEFAULT '+1',
  role VARCHAR(50) DEFAULT 'nutritionist',
  
  -- Email verification
  is_email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  
  -- Password reset
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  
  -- Profile
  profile_image_url TEXT,
  qualification VARCHAR(500),
  experience_years INTEGER,
  specialization TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Clients table
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nutritionist_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  phone_country_code VARCHAR(5) DEFAULT '+1',
  full_name VARCHAR(255) NOT NULL,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100),
  date_of_birth DATE,
  gender gender_type,
  
  -- Physical Stats
  height_cm NUMERIC(5,2),
  weight_kg NUMERIC(5,2),
  activity_level activity_level,
  
  -- Health Information
  medical_conditions TEXT[],
  allergies TEXT[],
  medications TEXT[],
  dietary_preferences TEXT[],
  
  -- Goals
  health_goals TEXT[],
  target_weight_kg NUMERIC(5,2),
  
  -- Location and Special Conditions
  location VARCHAR(255),
  pregnancy_status pregnancy_status DEFAULT 'not_pregnant',
  lactation_status lactation_status DEFAULT 'not_lactating',
  
  -- Calculated Health Metrics
  bmi NUMERIC(5,2),
  bmi_category bmi_category,
  bmr NUMERIC(8,2),
  bmi_last_calculated TIMESTAMP WITH TIME ZONE,
  bmr_last_calculated TIMESTAMP WITH TIME ZONE,
  eer_guideline VARCHAR(20),
  
  -- Status & Management
  status client_status DEFAULT 'prospective',
  source VARCHAR(100),
  notes TEXT,
  preferred_contact_method VARCHAR(20) DEFAULT 'email',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_to_active_at TIMESTAMP WITH TIME ZONE,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- Client Goals table - stores nutritionist-set targets for clients
CREATE TABLE client_goals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Energy Goals
  eer_goal_calories INTEGER NOT NULL,
  
  -- Macro Goals (min/max ranges in grams)
  protein_goal_min NUMERIC NOT NULL,
  protein_goal_max NUMERIC NOT NULL,
  carbs_goal_min NUMERIC NOT NULL,
  carbs_goal_max NUMERIC NOT NULL,
  fat_goal_min NUMERIC NOT NULL,
  fat_goal_max NUMERIC NOT NULL,
  
  -- Additional Goals
  fiber_goal_grams NUMERIC(6,2),
  water_goal_liters NUMERIC(4,2),
  
  -- Dietary Preferences (NEW - added for meal planning)
  health_labels TEXT[], -- Health labels like gluten-free, vegan, keto-friendly
  cuisine_types TEXT[], -- Preferred cuisine types like italian, mediterranean, asian
  
  -- Goal Status
  is_active BOOLEAN DEFAULT true,
  goal_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  goal_end_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (eer_goal_calories > 0),
  CHECK (protein_goal_min < protein_goal_max),
  CHECK (carbs_goal_min < carbs_goal_max),
  CHECK (fat_goal_min < fat_goal_max),
  CHECK (protein_goal_min > 0 AND protein_goal_max > 0),
  CHECK (carbs_goal_min > 0 AND carbs_goal_max > 0),
  CHECK (fat_goal_min > 0 AND fat_goal_max > 0),
  CHECK (goal_end_date IS NULL OR goal_end_date > goal_start_date)
);

-- Client Documents table - for storing uploaded documents and AI analysis
CREATE TABLE client_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  
  -- Document Info
  document_type document_type NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT,
  file_size INTEGER,
  mime_type VARCHAR(100),
  document_date DATE,
  description TEXT,
  tags TEXT[],
  
  -- AI Analysis
  ai_summary TEXT,
  ai_analysis_data JSONB,
  key_findings TEXT[],
  
  -- Timestamps
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analyzed_at TIMESTAMP WITH TIME ZONE
);

-- Client Interactions table - for tracking consultations and interactions
CREATE TABLE client_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID REFERENCES users(id),
  
  -- Interaction Details
  interaction_type VARCHAR(50) NOT NULL, -- consultation, follow_up, check_in, etc.
  title VARCHAR(255),
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Additional Data
  interaction_data JSONB, -- Flexible storage for interaction-specific data
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Client Nutrition Requirements table - AI-generated and nutritionist-reviewed requirements
CREATE TABLE client_nutrition_requirements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Basic Macros
  eer_calories INTEGER NOT NULL,
  protein_grams NUMERIC(6,2),
  carbs_grams NUMERIC(6,2),
  fat_grams NUMERIC(6,2),
  fiber_grams NUMERIC(6,2),
  
  -- Macro Percentages
  protein_percentage NUMERIC(5,2),
  carbs_percentage NUMERIC(5,2),
  fat_percentage NUMERIC(5,2),
  
  -- Macro Ranges
  protein_min_grams NUMERIC(6,2),
  protein_max_grams NUMERIC(6,2),
  carbs_min_grams NUMERIC(6,2),
  carbs_max_grams NUMERIC(6,2),
  fat_min_grams NUMERIC(6,2),
  fat_max_grams NUMERIC(6,2),
  fiber_min_grams NUMERIC(6,2),
  fiber_max_grams NUMERIC(6,2),
  
  -- Fat Types
  saturated_fat_min_grams NUMERIC(6,2),
  saturated_fat_max_grams NUMERIC(6,2),
  monounsaturated_fat_min_grams NUMERIC(6,2),
  monounsaturated_fat_max_grams NUMERIC(6,2),
  polyunsaturated_fat_min_grams NUMERIC(6,2),
  polyunsaturated_fat_max_grams NUMERIC(6,2),
  omega3_min_grams NUMERIC(6,2),
  omega3_max_grams NUMERIC(6,2),
  cholesterol_min_grams NUMERIC(6,2),
  cholesterol_max_grams NUMERIC(6,2),
  
  -- Key Micronutrients
  vitamin_d_mcg NUMERIC(8,2),
  vitamin_b12_mcg NUMERIC(8,2),
  vitamin_c_mg NUMERIC(8,2),
  iron_mg NUMERIC(8,2),
  calcium_mg NUMERIC(8,2),
  magnesium_mg NUMERIC(8,2),
  zinc_mg NUMERIC(8,2),
  folate_mcg NUMERIC(8,2),
  
  -- Hydration
  water_ml INTEGER,
  
  -- Guidelines Used
  eer_guideline_country VARCHAR(20),
  macro_guideline_country VARCHAR(20),
  
  -- AI and Professional Review
  ai_calculation_data JSONB,
  calculation_method VARCHAR(100) DEFAULT 'mifflin_st_jeor',
  is_ai_generated BOOLEAN DEFAULT true,
  is_edited_by_nutritionist BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Professional Notes
  nutritionist_notes TEXT,
  custom_adjustments JSONB,
  guideline_notes TEXT,
  
  -- Individual Nutrient Notes
  protein_note TEXT,
  carbs_note TEXT,
  fat_note TEXT,
  fiber_note TEXT,
  saturated_fat_note TEXT,
  monounsaturated_fat_note TEXT,
  polyunsaturated_fat_note TEXT,
  omega3_note TEXT,
  cholesterol_note TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id)
);

-- Flexible Micronutrient Requirements table
CREATE TABLE client_micronutrient_requirements_flexible (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  
  -- Flexible JSONB storage for all micronutrients
  micronutrient_recommendations JSONB NOT NULL,
  
  -- Guideline Information
  country_guideline VARCHAR(20) NOT NULL,
  guideline_type VARCHAR(50) NOT NULL,
  calculation_method VARCHAR(50) DEFAULT 'standard',
  calculation_factors JSONB,
  
  -- Professional Review
  is_ai_generated BOOLEAN DEFAULT false,
  is_professionally_reviewed BOOLEAN DEFAULT false,
  nutritionist_notes TEXT,
  custom_adjustments JSONB,
  is_active BOOLEAN DEFAULT true,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES users(id)
);

-- Meal Plans table
CREATE TABLE meal_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID REFERENCES users(id),
  
  -- Plan Details
  plan_name VARCHAR(255) NOT NULL DEFAULT 'Daily Meal Plan',
  plan_date DATE NOT NULL,
  end_date DATE,
  plan_type VARCHAR(50) DEFAULT 'daily',
  plan_duration_days INTEGER DEFAULT 1,
  
  -- Nutrition Targets
  target_calories INTEGER NOT NULL,
  target_protein_grams NUMERIC(6,2) NOT NULL,
  target_carbs_grams NUMERIC(6,2) NOT NULL,
  target_fat_grams NUMERIC(6,2) NOT NULL,
  target_fiber_grams NUMERIC(6,2),
  
  -- Preferences
  dietary_restrictions TEXT[],
  cuisine_preferences TEXT[],
  meal_preferences JSONB,
  excluded_recipes TEXT[] DEFAULT '{}',
  
  -- Generated Content
  generated_meals JSONB,
  nutrition_summary JSONB,
  generation_metadata JSONB DEFAULT '{}',
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_at TIMESTAMP WITH TIME ZONE
);

-- Meal Plan Meals table - individual meals within meal plans
CREATE TABLE meal_plan_meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  
  -- Meal Details
  day_number INTEGER DEFAULT 1,
  meal_date DATE,
  meal_type VARCHAR(50) NOT NULL,
  meal_order INTEGER NOT NULL,
  
  -- Recipe Information
  edamam_recipe_id VARCHAR(255),
  recipe_name VARCHAR(500) NOT NULL,
  recipe_url TEXT,
  recipe_image_url TEXT,
  ingredients JSONB,
  cooking_instructions TEXT,
  
  -- Serving Information
  servings_per_meal NUMERIC(4,2) DEFAULT 1.0,
  
  -- Nutrition per Serving
  calories_per_serving NUMERIC(8,2),
  protein_grams NUMERIC(6,2),
  carbs_grams NUMERIC(6,2),
  fat_grams NUMERIC(6,2),
  fiber_grams NUMERIC(6,2),
  
  -- Total Nutrition (servings_per_meal * per_serving)
  total_calories INTEGER,
  total_protein_grams NUMERIC(6,2),
  total_carbs_grams NUMERIC(6,2),
  total_fat_grams NUMERIC(6,2),
  total_fiber_grams NUMERIC(6,2),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal Plan Feedback table
CREATE TABLE meal_plan_feedback (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  client_id UUID REFERENCES clients(id),
  
  -- Ratings (1-5 scale)
  overall_rating INTEGER,
  taste_rating INTEGER,
  satisfaction_rating INTEGER,
  
  -- Feedback
  feedback_notes TEXT,
  favorite_meals TEXT[],
  disliked_meals TEXT[],
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal Programs table - client-specific meal timing and structure
CREATE TABLE meal_programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Meal Program Meals table - individual meals within a client's program
CREATE TABLE meal_program_meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_program_id UUID NOT NULL REFERENCES meal_programs(id) ON DELETE CASCADE,
  
  -- Meal Configuration
  meal_order INTEGER NOT NULL,
  meal_name VARCHAR(255) NOT NULL,
  meal_time TIME NOT NULL,
  target_calories INTEGER,
  meal_type VARCHAR(50),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- EER Formulas table - country-specific energy requirement formulas
CREATE TABLE eer_formulas (
  id SERIAL PRIMARY KEY,
  country VARCHAR(20) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  age_category VARCHAR(20) NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  
  -- BMR Formula Coefficients
  bmr_formula VARCHAR(200) NOT NULL,
  bmr_constant NUMERIC(8,3) NOT NULL,
  bmr_weight_coefficient NUMERIC(8,3) NOT NULL,
  bmr_height_coefficient NUMERIC(8,3) NOT NULL,
  bmr_age_coefficient NUMERIC(8,3) NOT NULL,
  
  -- EER Formula Coefficients
  eer_base NUMERIC(8,3),
  eer_age_coefficient NUMERIC(8,3),
  eer_weight_coefficient NUMERIC(8,3),
  eer_height_coefficient NUMERIC(8,3),
  
  -- Pregnancy and Lactation Adjustments
  pregnancy_second_trimester_kcal INTEGER DEFAULT 340,
  pregnancy_third_trimester_kcal INTEGER DEFAULT 452,
  lactation_0_6_months_kcal INTEGER DEFAULT 500,
  lactation_7_12_months_kcal INTEGER DEFAULT 400,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- PAL Values table - Physical Activity Level multipliers
CREATE TABLE pal_values (
  id SERIAL PRIMARY KEY,
  country VARCHAR(20) NOT NULL,
  activity_level VARCHAR(20) NOT NULL,
  pal_value NUMERIC(4,2) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Macro Guidelines table - country-specific macronutrient recommendations
CREATE TABLE macro_guidelines (
  id SERIAL PRIMARY KEY,
  country VARCHAR(20) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  age_min INTEGER NOT NULL,
  age_max INTEGER NOT NULL,
  
  -- Protein Guidelines
  protein_min_percent NUMERIC(5,2),
  protein_max_percent NUMERIC(5,2),
  protein_note TEXT,
  
  -- Carbohydrate Guidelines
  carbs_min_percent NUMERIC(5,2),
  carbs_max_percent NUMERIC(5,2),
  carbs_note TEXT,
  
  -- Fat Guidelines
  fat_min_percent NUMERIC(5,2),
  fat_max_percent NUMERIC(5,2),
  fat_note TEXT,
  
  -- Fiber Guidelines
  fiber_per_1000_kcal NUMERIC(5,2),
  fiber_absolute_min NUMERIC(5,2),
  fiber_absolute_max NUMERIC(5,2),
  fiber_note TEXT,
  
  -- Specific Fat Types
  saturated_fat_max_percent NUMERIC(5,2),
  saturated_fat_note TEXT,
  monounsaturated_fat_min_percent NUMERIC(5,2),
  monounsaturated_fat_max_percent NUMERIC(5,2),
  monounsaturated_fat_note TEXT,
  polyunsaturated_fat_min_percent NUMERIC(5,2),
  polyunsaturated_fat_max_percent NUMERIC(5,2),
  polyunsaturated_fat_note TEXT,
  omega3_min_percent NUMERIC(5,3),
  omega3_max_percent NUMERIC(5,3),
  omega3_note TEXT,
  
  -- Cholesterol
  cholesterol_max_mg NUMERIC(8,2),
  cholesterol_note TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Micronutrient Guidelines table - flexible JSONB storage
CREATE TABLE micronutrient_guidelines_flexible (
  id SERIAL PRIMARY KEY,
  country VARCHAR(20) NOT NULL,
  gender VARCHAR(10) NOT NULL,
  age_min REAL NOT NULL,
  age_max REAL NOT NULL,
  
  -- Flexible JSONB storage for all micronutrients
  micronutrients JSONB NOT NULL,
  
  -- Guideline Metadata
  guideline_type VARCHAR(50) NOT NULL,
  source VARCHAR(200),
  source_year INTEGER,
  version VARCHAR(20),
  notes TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Country Micronutrient Mappings table
CREATE TABLE country_micronutrient_mappings (
  id SERIAL PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL,
  country_code VARCHAR(3),
  guideline_source VARCHAR(10) NOT NULL,
  guideline_type VARCHAR(20) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Migrations table - track database migrations
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  hash VARCHAR(40) NOT NULL,
  executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);

-- Create indexes for better performance

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_nutritionist_id ON clients(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);

-- Client Goals indexes
CREATE INDEX IF NOT EXISTS idx_client_goals_client_id ON client_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_nutritionist_id ON client_goals(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_active ON client_goals(is_active);
CREATE INDEX IF NOT EXISTS idx_client_goals_health_labels ON client_goals USING GIN (health_labels);
CREATE INDEX IF NOT EXISTS idx_client_goals_cuisine_types ON client_goals USING GIN (cuisine_types);

-- Client Documents indexes
CREATE INDEX IF NOT EXISTS idx_client_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_client_documents_type ON client_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_client_documents_uploaded_at ON client_documents(uploaded_at);

-- Meal Plans indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_client_id ON meal_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutritionist_id ON meal_plans(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(plan_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);

-- Meal Plan Meals indexes
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_plan_id ON meal_plan_meals(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_date ON meal_plan_meals(meal_date);

-- Nutrition Requirements indexes
CREATE INDEX IF NOT EXISTS idx_client_nutrition_requirements_client_id ON client_nutrition_requirements(client_id);
CREATE INDEX IF NOT EXISTS idx_client_nutrition_requirements_active ON client_nutrition_requirements(is_active);

-- Unique constraints

-- Only one active goal per client
CREATE UNIQUE INDEX client_goals_client_id_active_unique 
ON client_goals (client_id) 
WHERE is_active = true;

-- Only one meal program per client
CREATE UNIQUE INDEX meal_programs_client_id_unique 
ON meal_programs (client_id);