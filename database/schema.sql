-- CalorieScience Database Schema - COMPLETE VERSION
-- Last Updated: 2025-10-14
-- This schema reflects the ACTUAL current state of the production database
-- Generated from live Supabase database introspection

-- ========================================
-- EXTENSIONS
-- ========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ========================================
-- CUSTOM ENUM TYPES
-- ========================================
CREATE TYPE client_status AS ENUM ('prospective', 'active', 'inactive', 'archived');
CREATE TYPE activity_level AS ENUM ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active');
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');
CREATE TYPE pregnancy_status AS ENUM ('not_pregnant', 'first_trimester', 'second_trimester', 'third_trimester');
CREATE TYPE lactation_status AS ENUM ('not_lactating', 'lactating_0_6_months', 'lactating_7_12_months');
CREATE TYPE bmi_category AS ENUM ('underweight', 'normal', 'overweight', 'obese_class_1', 'obese_class_2', 'obese_class_3');
CREATE TYPE document_type AS ENUM ('blood_report', 'medical_history', 'photo', 'diet_log', 'prescription', 'other');
CREATE TYPE recipe_provider AS ENUM ('edamam', 'spoonacular', 'usda', 'nutritionix', 'manual', 'bonhappetee');

-- ========================================
-- CORE TABLES
-- ========================================

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
  
  -- Preferences
  preferred_measurement_system VARCHAR(20) DEFAULT 'metric',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT chk_users_phone_format CHECK (phone IS NULL OR (phone ~ '^[0-9+\-\s\(\)\.]+$' AND LENGTH(phone) >= 7 AND LENGTH(phone) <= 20)),
  CONSTRAINT chk_users_phone_country_code CHECK (phone_country_code ~ '^\+[1-9][0-9]{0,3}$'),
  CONSTRAINT chk_users_first_name_length CHECK (LENGTH(first_name) >= 1 AND LENGTH(first_name) <= 100),
  CONSTRAINT chk_users_last_name_length CHECK (LENGTH(last_name) <= 100),
  CONSTRAINT users_preferred_measurement_system_check CHECK (preferred_measurement_system IN ('metric', 'imperial'))
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
  waist_circumference_cm NUMERIC(5,2),
  hip_circumference_cm NUMERIC(5,2),
  body_fat_percentage NUMERIC(5,2),
  
  -- Health Information
  medical_conditions TEXT[],
  allergies TEXT[],
  medications TEXT[],
  dietary_preferences TEXT[],
  
  -- Goals
  health_goals TEXT[],
  target_weight_kg NUMERIC(5,2),
  
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
  
  -- Preferences
  preferred_measurement_system VARCHAR(20) DEFAULT 'metric',
  
  -- Constraints
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  CONSTRAINT chk_phone_format CHECK (phone IS NULL OR (phone ~ '^[0-9+\-\s\(\)\.]+$' AND LENGTH(phone) >= 7 AND LENGTH(phone) <= 20)),
  CONSTRAINT chk_phone_country_code CHECK (phone_country_code ~ '^\+[1-9][0-9]{0,3}$'),
  CONSTRAINT chk_first_name_length CHECK (LENGTH(first_name) >= 1 AND LENGTH(first_name) <= 100),
  CONSTRAINT chk_last_name_length CHECK (LENGTH(last_name) <= 100),
  CONSTRAINT clients_preferred_measurement_system_check CHECK (preferred_measurement_system IN ('metric', 'imperial')),
  CONSTRAINT chk_waist_circumference CHECK (waist_circumference_cm IS NULL OR (waist_circumference_cm > 0 AND waist_circumference_cm < 500)),
  CONSTRAINT chk_hip_circumference CHECK (hip_circumference_cm IS NULL OR (hip_circumference_cm > 0 AND hip_circumference_cm < 500)),
  CONSTRAINT chk_body_fat_percentage CHECK (body_fat_percentage IS NULL OR (body_fat_percentage >= 0 AND body_fat_percentage <= 100))
);

-- ========================================
-- CLIENT GOALS & NUTRITION
-- ========================================

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
  
  -- Dietary Preferences
  cuisine_types TEXT[],
  allergies TEXT[],
  preferences TEXT[],
  
  -- Goal Status
  is_active BOOLEAN DEFAULT true,
  goal_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  goal_end_date DATE,
  
  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (eer_goal_calories >= 0),
  CHECK (protein_goal_min = 0 AND protein_goal_max = 0 OR (protein_goal_min > 0 AND protein_goal_max > 0 AND protein_goal_min < protein_goal_max)),
  CHECK (carbs_goal_min = 0 AND carbs_goal_max = 0 OR (carbs_goal_min > 0 AND carbs_goal_max > 0 AND carbs_goal_min < carbs_goal_max)),
  CHECK (fat_goal_min = 0 AND fat_goal_max = 0 OR (fat_goal_min > 0 AND fat_goal_max > 0 AND fat_goal_min < fat_goal_max)),
  CHECK (goal_end_date IS NULL OR goal_end_date > goal_start_date)
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
  
  -- AI and Professional Review
  ai_calculation_data JSONB,
  calculation_method VARCHAR(100) DEFAULT 'mifflin_st_jeor',
  is_ai_generated BOOLEAN DEFAULT true,
  is_edited_by_nutritionist BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  
  -- Professional Notes
  nutritionist_notes TEXT,
  custom_adjustments JSONB,
  
  -- Macro Ranges
  protein_min_grams NUMERIC(6,2),
  protein_max_grams NUMERIC(6,2),
  carbs_min_grams NUMERIC(6,2),
  carbs_max_grams NUMERIC(6,2),
  fat_min_grams NUMERIC(6,2),
  fat_max_grams NUMERIC(6,2),
  fiber_min_grams NUMERIC(6,2),
  fiber_max_grams NUMERIC(6,2),
  
  -- Fat Types Ranges
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
  
  -- Guidelines Used
  eer_guideline_country VARCHAR(20),
  macro_guideline_country VARCHAR(20),
  guideline_notes TEXT,
  
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

-- ========================================
-- CLIENT DOCUMENTS & INTERACTIONS
-- ========================================

-- Client Documents table
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

-- Client Interactions table
CREATE TABLE client_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID REFERENCES users(id),
  
  -- Interaction Details
  interaction_type VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Additional Data
  interaction_data JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MEAL PROGRAMS & TIMING
-- ========================================

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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (meal_order > 0 AND meal_order <= 10),
  CHECK (target_calories IS NULL OR target_calories > 0),
  UNIQUE (meal_program_id, meal_order)
);

-- ========================================
-- MEAL PLANNING TABLES
-- ========================================

-- Meal Plans table (legacy structure - kept for backward compatibility)
CREATE TABLE meal_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID REFERENCES users(id),
  
  -- Plan Details
  plan_name VARCHAR(255) NOT NULL DEFAULT 'Daily Meal Plan',
  plan_date DATE NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'daily',
  end_date DATE,
  plan_duration_days INTEGER DEFAULT 1,
  
  -- Nutrition Targets
  target_calories INTEGER NOT NULL,
  target_protein_grams NUMERIC(6,2) NOT NULL,
  target_carbs_grams NUMERIC(6,2) NOT NULL,
  target_fat_grams NUMERIC(6,2) NOT NULL,
  target_fiber_grams NUMERIC(6,2),
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft',
  
  -- Preferences
  dietary_restrictions TEXT[],
  cuisine_preferences TEXT[],
  meal_preferences JSONB,
  excluded_recipes TEXT[] DEFAULT '{}',
  
  -- Generated Content
  generated_meals JSONB,
  nutrition_summary JSONB,
  generation_metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  generated_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CHECK (plan_date >= CURRENT_DATE - INTERVAL '30 days'),
  CHECK (end_date IS NULL OR end_date >= plan_date),
  CHECK (end_date IS NULL OR end_date <= plan_date + INTERVAL '30 days'),
  CHECK (plan_duration_days >= 1 AND plan_duration_days <= 30)
);

-- Meal Plan Meals table - individual meals within meal plans
CREATE TABLE meal_plan_meals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  meal_plan_id UUID REFERENCES meal_plans(id) ON DELETE CASCADE,
  
  -- Meal Details
  meal_type VARCHAR(50) NOT NULL,
  meal_order INTEGER NOT NULL,
  edamam_recipe_id VARCHAR(255),
  recipe_name VARCHAR(500) NOT NULL,
  recipe_url TEXT,
  recipe_image_url TEXT,
  
  -- Nutrition per Serving
  calories_per_serving NUMERIC(8,2),
  protein_grams NUMERIC(6,2),
  carbs_grams NUMERIC(6,2),
  fat_grams NUMERIC(6,2),
  fiber_grams NUMERIC(6,2),
  
  -- Serving Information
  servings_per_meal NUMERIC(4,2) DEFAULT 1.0,
  
  -- Total Nutrition (servings_per_meal * per_serving)
  total_calories INTEGER,
  total_protein_grams NUMERIC(6,2),
  total_carbs_grams NUMERIC(6,2),
  total_fat_grams NUMERIC(6,2),
  total_fiber_grams NUMERIC(6,2),
  
  -- Recipe Data
  ingredients JSONB,
  cooking_instructions TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Multi-day support
  day_number INTEGER DEFAULT 1,
  meal_date DATE,
  
  -- Constraints
  CHECK (meal_order > 0 AND meal_order <= 10),
  CHECK (day_number >= 1),
  UNIQUE (meal_plan_id, day_number, meal_order)
);

-- Meal Plan Drafts table - unified meal planning with ingredient customization
CREATE TABLE meal_plan_drafts (
  id VARCHAR(255) PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft',
  
  -- Search Parameters (original request)
  search_params JSONB NOT NULL,
  
  -- Recipe Suggestions (contains recipe alternatives)
  suggestions JSONB NOT NULL,
  
  -- Plan Metadata (for finalized plans)
  plan_name VARCHAR(255) DEFAULT 'Meal Plan',
  plan_date DATE,
  end_date DATE,
  plan_duration_days INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days'),
  finalized_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CHECK (status IN ('draft', 'completed', 'finalized', 'active', 'archived'))
);

-- Recipe Customizations table - tracks ingredient modifications
CREATE TABLE recipe_customizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  draft_id VARCHAR(255) NOT NULL REFERENCES meal_plan_drafts(id) ON DELETE CASCADE,
  recipe_id VARCHAR(255) NOT NULL,
  recipe_source VARCHAR(50) NOT NULL,
  
  -- Context
  day_number INTEGER NOT NULL,
  meal_type VARCHAR(50) NOT NULL,
  
  -- Customization Data
  customizations JSONB NOT NULL,
  custom_nutrition JSONB,
  servings INTEGER DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (recipe_source IN ('edamam', 'spoonacular')),
  UNIQUE (draft_id, recipe_id, day_number, meal_type)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (overall_rating >= 1 AND overall_rating <= 5),
  CHECK (taste_rating >= 1 AND taste_rating <= 5),
  CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5)
);

-- ========================================
-- ASYNC MEAL PLAN GENERATION
-- ========================================

-- Async Meal Plans table - tracks AI-generated meal plans (OpenAI, Claude, Gemini)
CREATE TABLE async_meal_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- AI Tracking
  thread_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  ai_model TEXT NOT NULL DEFAULT 'openai',
  
  -- Request data
  client_goals JSONB NOT NULL,
  additional_text TEXT,
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending',
  
  -- Results
  generated_meal_plan JSONB,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CHECK (status IN ('pending', 'completed', 'failed')),
  CHECK (ai_model IN ('openai', 'claude', 'gemini', 'grok')),
  UNIQUE (thread_id, run_id, ai_model)
);

-- ========================================
-- RECIPE CACHING & MANAGEMENT
-- ========================================

-- Cached Recipes table - stores recipes from multiple providers
CREATE TABLE cached_recipes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider recipe_provider NOT NULL,
  external_recipe_id VARCHAR(500) NOT NULL,
  external_recipe_uri VARCHAR(500),
  
  -- Basic Info
  recipe_name VARCHAR(500) NOT NULL,
  recipe_source VARCHAR(255),
  recipe_url TEXT,
  recipe_image_url TEXT,
  
  -- Classification
  cuisine_types TEXT[] DEFAULT '{}',
  meal_types TEXT[] DEFAULT '{}',
  dish_types TEXT[] DEFAULT '{}',
  health_labels TEXT[] DEFAULT '{}',
  diet_labels TEXT[] DEFAULT '{}',
  allergens TEXT[] DEFAULT '{}',
  
  -- Servings & Time
  servings INTEGER,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  total_time_minutes INTEGER,
  
  -- Total Nutrition (for entire recipe)
  total_calories NUMERIC(8,2),
  total_protein_g NUMERIC(6,2),
  total_carbs_g NUMERIC(6,2),
  total_fat_g NUMERIC(6,2),
  total_fiber_g NUMERIC(6,2),
  total_sugar_g NUMERIC(6,2),
  total_sodium_mg NUMERIC(8,2),
  total_weight_g NUMERIC(8,2),
  
  -- Per Serving Nutrition
  calories_per_serving NUMERIC(8,2),
  protein_per_serving_g NUMERIC(6,2),
  carbs_per_serving_g NUMERIC(6,2),
  fat_per_serving_g NUMERIC(6,2),
  fiber_per_serving_g NUMERIC(6,2),
  
  -- Recipe Details
  ingredients JSONB,
  ingredient_lines TEXT[],
  cooking_instructions TEXT[],
  nutrition_details JSONB,
  
  -- Raw Data
  original_api_response JSONB,
  
  -- Cache Management
  cache_status VARCHAR(20) DEFAULT 'active',
  api_fetch_count INTEGER DEFAULT 1,
  last_api_fetch_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Data Quality Indicators
  has_complete_nutrition BOOLEAN DEFAULT false,
  has_detailed_ingredients BOOLEAN DEFAULT false,
  has_cooking_instructions BOOLEAN DEFAULT false,
  data_quality_score INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (servings > 0),
  CHECK (total_calories >= 0),
  CHECK (cache_status IN ('active', 'stale', 'expired', 'error')),
  CHECK (data_quality_score >= 0 AND data_quality_score <= 100),
  UNIQUE (provider, external_recipe_id)
);

-- Recipe Usage Stats table - tracks recipe usage analytics
CREATE TABLE recipe_usage_stats (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  cached_recipe_id UUID NOT NULL REFERENCES cached_recipes(id) ON DELETE CASCADE,
  used_in_meal_plan_id UUID,
  used_by_nutritionist_id UUID REFERENCES users(id),
  used_for_client_id UUID REFERENCES clients(id),
  
  -- Usage Context
  usage_context VARCHAR(100),
  meal_type VARCHAR(50),
  used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CHECK (usage_context IN ('meal_plan_generation', 'preview', 'manual_selection', 'search'))
);

-- Recipe Cache Performance table - tracks cache performance metrics
CREATE TABLE recipe_cache_performance (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  provider recipe_provider NOT NULL,
  
  -- Metrics
  total_requests INTEGER DEFAULT 0,
  cache_hits INTEGER DEFAULT 0,
  cache_misses INTEGER DEFAULT 0,
  api_calls_saved INTEGER DEFAULT 0,
  avg_cache_response_time_ms NUMERIC(10,2),
  avg_api_response_time_ms NUMERIC(10,2),
  
  -- Data Quality
  recipes_with_complete_nutrition INTEGER DEFAULT 0,
  recipes_with_ingredients INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE (date, provider)
);

-- ========================================
-- API KEY MANAGEMENT & LOGGING
-- ========================================

-- Edamam API Keys table - manages multiple API keys with rotation
CREATE TABLE edamam_api_keys (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id VARCHAR(50) NOT NULL,
  app_key VARCHAR(100) NOT NULL,
  api_type VARCHAR(20) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  max_usage_limit INTEGER DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  
  -- Constraints
  CHECK (api_type IN ('meal_planner', 'nutrition', 'recipe', 'autocomplete')),
  UNIQUE (app_id, app_key, api_type)
);

-- Edamam API Logs table - comprehensive API logging
CREATE TABLE edamam_api_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Request identification
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  session_id VARCHAR(255),
  
  -- API details
  api_type VARCHAR(50) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  http_method VARCHAR(10) NOT NULL DEFAULT 'GET',
  
  -- Request data
  request_payload JSONB,
  request_params JSONB,
  request_headers JSONB,
  
  -- Response data
  response_status INTEGER,
  response_payload JSONB,
  response_headers JSONB,
  response_size_bytes INTEGER,
  
  -- Performance metrics
  response_time_ms INTEGER,
  api_key_used VARCHAR(50),
  rate_limit_remaining INTEGER,
  
  -- Error tracking
  error_occurred BOOLEAN DEFAULT FALSE,
  error_message TEXT,
  error_code VARCHAR(50),
  
  -- Usage context
  feature_context VARCHAR(100),
  user_agent TEXT,
  ip_address INET,
  
  -- Cost tracking
  estimated_cost_usd NUMERIC(10, 6),
  credits_used INTEGER,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  notes TEXT,
  tags TEXT[]
);

-- ========================================
-- HEALTH LABELS & PROVIDER MAPPING
-- ========================================

-- Food Database Providers table
CREATE TABLE food_database_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  api_base_url VARCHAR(500),
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health Labels Categories table
CREATE TABLE health_labels_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  priority INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health Labels Standard table - standardized internal labels
CREATE TABLE health_labels_standard (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL REFERENCES health_labels_categories(id) ON DELETE CASCADE,
  label_key VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT,
  severity_level VARCHAR(20) DEFAULT 'preference',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Health Labels Provider Mapping table - maps standard labels to provider-specific labels
CREATE TABLE health_labels_provider_mapping (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  standard_label_id UUID NOT NULL REFERENCES health_labels_standard(id) ON DELETE CASCADE,
  provider_id UUID NOT NULL REFERENCES food_database_providers(id) ON DELETE CASCADE,
  provider_label_key VARCHAR(200) NOT NULL,
  provider_label_value VARCHAR(200),
  is_supported BOOLEAN DEFAULT true,
  mapping_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE (standard_label_id, provider_id)
);

-- ========================================
-- NUTRITION GUIDELINES REFERENCE TABLES
-- ========================================

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
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  UNIQUE (country, gender, age_category, age_min, age_max)
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
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraints
  CHECK (guideline_source IN ('US', 'EU', 'UK', 'India', 'WHO')),
  CHECK (guideline_type IN ('US_DRI', 'EFSA_DRV', 'UK_COMA', 'INDIA_ICMR', 'WHO_FAO'))
);

-- ========================================
-- MIGRATIONS TABLE
-- ========================================

-- Migrations table - track database migrations
CREATE TABLE migrations (
  id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL UNIQUE,
  hash VARCHAR(40) NOT NULL,
  executed_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64),
  execution_time_ms INTEGER
);

-- ========================================
-- INDEXES
-- ========================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_first_name ON users(first_name);
CREATE INDEX IF NOT EXISTS idx_users_last_name ON users(last_name);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_email_verification ON users(email_verification_token);
CREATE INDEX IF NOT EXISTS idx_users_password_reset ON users(password_reset_token);
CREATE INDEX IF NOT EXISTS idx_users_measurement_system ON users(preferred_measurement_system);

-- Clients indexes
CREATE INDEX IF NOT EXISTS idx_clients_nutritionist_id ON clients(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);
CREATE INDEX IF NOT EXISTS idx_clients_status ON clients(status);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at);
CREATE INDEX IF NOT EXISTS idx_clients_first_name ON clients(first_name);
CREATE INDEX IF NOT EXISTS idx_clients_last_name ON clients(last_name);
CREATE INDEX IF NOT EXISTS idx_clients_measurement_system ON clients(preferred_measurement_system);

-- Client Goals indexes
CREATE INDEX IF NOT EXISTS idx_client_goals_client_id ON client_goals(client_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_nutritionist_id ON client_goals(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_client_goals_active ON client_goals(is_active);
CREATE INDEX IF NOT EXISTS idx_client_goals_cuisine_types ON client_goals USING GIN (cuisine_types);
CREATE INDEX IF NOT EXISTS idx_client_goals_allergies ON client_goals USING GIN (allergies);
CREATE INDEX IF NOT EXISTS idx_client_goals_preferences ON client_goals USING GIN (preferences);
CREATE UNIQUE INDEX IF NOT EXISTS client_goals_client_id_active_unique ON client_goals (client_id) WHERE is_active = true;

-- Client Nutrition Requirements indexes
CREATE INDEX IF NOT EXISTS idx_nutrition_requirements_client_id ON client_nutrition_requirements(client_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_requirements_active ON client_nutrition_requirements(client_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_nutrition_requirements_eer_guideline ON client_nutrition_requirements(eer_guideline_country);
CREATE INDEX IF NOT EXISTS idx_nutrition_requirements_macro_guideline ON client_nutrition_requirements(macro_guideline_country);
CREATE INDEX IF NOT EXISTS idx_client_nutrition_macros_active ON client_nutrition_requirements(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_client_nutrition_eer_country_lower ON client_nutrition_requirements(LOWER(eer_guideline_country));
CREATE INDEX IF NOT EXISTS idx_client_nutrition_macro_country_lower ON client_nutrition_requirements(LOWER(macro_guideline_country));

-- Client Micronutrient Requirements indexes
CREATE INDEX IF NOT EXISTS idx_client_micronutrient_flex_client ON client_micronutrient_requirements_flexible(client_id);
CREATE INDEX IF NOT EXISTS idx_client_micronutrient_flex_country ON client_micronutrient_requirements_flexible(country_guideline);
CREATE INDEX IF NOT EXISTS idx_client_micronutrient_flex_active ON client_micronutrient_requirements_flexible(client_id, is_active);
CREATE INDEX IF NOT EXISTS idx_client_micro_country_lower ON client_micronutrient_requirements_flexible(LOWER(country_guideline));

-- Client Documents indexes
CREATE INDEX IF NOT EXISTS idx_documents_client_id ON client_documents(client_id);
CREATE INDEX IF NOT EXISTS idx_documents_type ON client_documents(document_type);

-- Client Interactions indexes
CREATE INDEX IF NOT EXISTS idx_interactions_client_id ON client_interactions(client_id);
CREATE INDEX IF NOT EXISTS idx_interactions_nutritionist_id ON client_interactions(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_interactions_scheduled ON client_interactions(scheduled_at);

-- Meal Programs indexes
CREATE INDEX IF NOT EXISTS idx_meal_programs_client_id ON meal_programs(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_programs_nutritionist_id ON meal_programs(nutritionist_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_client_meal_program ON meal_programs(client_id);

-- Meal Program Meals indexes
CREATE INDEX IF NOT EXISTS idx_meal_program_meals_program_id ON meal_program_meals(meal_program_id);
CREATE INDEX IF NOT EXISTS idx_meal_program_meals_order ON meal_program_meals(meal_order);

-- Meal Plans indexes
CREATE INDEX IF NOT EXISTS idx_meal_plans_nutritionist ON meal_plans(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_status ON meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_meal_plans_client_date ON meal_plans(client_id, plan_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date_range ON meal_plans(plan_date, end_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_duration ON meal_plans(plan_duration_days);

-- Meal Plan Meals indexes
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_plan_id ON meal_plan_meals(meal_plan_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_date ON meal_plan_meals(meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_day_number ON meal_plan_meals(meal_plan_id, day_number);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_day_order ON meal_plan_meals(meal_plan_id, day_number, meal_order);
CREATE INDEX IF NOT EXISTS idx_meal_plan_meals_type_order ON meal_plan_meals(meal_plan_id, meal_type, meal_order);

-- Meal Plan Drafts indexes
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_client_id ON meal_plan_drafts(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_nutritionist_id ON meal_plan_drafts(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_status ON meal_plan_drafts(status);
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_expires_at ON meal_plan_drafts(expires_at);
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_plan_date ON meal_plan_drafts(plan_date);
CREATE INDEX IF NOT EXISTS idx_meal_plan_drafts_client_date ON meal_plan_drafts(client_id, plan_date);

-- Recipe Customizations indexes
CREATE INDEX IF NOT EXISTS idx_recipe_customizations_draft_id ON recipe_customizations(draft_id);
CREATE INDEX IF NOT EXISTS idx_recipe_customizations_recipe_id ON recipe_customizations(recipe_id);

-- Meal Plan Feedback indexes
CREATE INDEX IF NOT EXISTS idx_meal_plan_feedback_plan_id ON meal_plan_feedback(meal_plan_id);

-- Async Meal Plans indexes
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_client_id ON async_meal_plans(client_id);
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_nutritionist_id ON async_meal_plans(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_status ON async_meal_plans(status);
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_created_at ON async_meal_plans(created_at);
CREATE INDEX IF NOT EXISTS idx_async_meal_plans_ai_model ON async_meal_plans(ai_model);

-- Cached Recipes indexes
CREATE INDEX IF NOT EXISTS idx_cached_recipes_provider ON cached_recipes(provider);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_provider_id ON cached_recipes(provider, external_recipe_id);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_name ON cached_recipes(recipe_name);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_status ON cached_recipes(cache_status);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_last_accessed ON cached_recipes(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_nutrition ON cached_recipes(calories_per_serving, protein_per_serving_g);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_health_labels ON cached_recipes USING GIN(health_labels);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_cuisine ON cached_recipes USING GIN(cuisine_types);
CREATE INDEX IF NOT EXISTS idx_cached_recipes_name_fts ON cached_recipes USING GIN(to_tsvector('english', recipe_name));

-- Recipe Usage Stats indexes
CREATE INDEX IF NOT EXISTS idx_recipe_usage_recipe_id ON recipe_usage_stats(cached_recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_usage_nutritionist ON recipe_usage_stats(used_by_nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_recipe_usage_date ON recipe_usage_stats(used_at);
CREATE INDEX IF NOT EXISTS idx_recipe_usage_context ON recipe_usage_stats(usage_context);

-- Recipe Cache Performance indexes
CREATE INDEX IF NOT EXISTS idx_recipe_performance_date_provider ON recipe_cache_performance(date, provider);

-- Edamam API Keys indexes
CREATE INDEX IF NOT EXISTS idx_edamam_api_keys_type_active ON edamam_api_keys(api_type, is_active);
CREATE INDEX IF NOT EXISTS idx_edamam_api_keys_usage ON edamam_api_keys(usage_count, max_usage_limit);
CREATE INDEX IF NOT EXISTS idx_edamam_api_keys_app_id ON edamam_api_keys(app_id);

-- Edamam API Logs indexes
CREATE INDEX IF NOT EXISTS idx_edamam_logs_api_type ON edamam_api_logs(api_type);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_user_id ON edamam_api_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_client_id ON edamam_api_logs(client_id);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_created_at ON edamam_api_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_response_status ON edamam_api_logs(response_status);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_error_occurred ON edamam_api_logs(error_occurred);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_feature_context ON edamam_api_logs(feature_context);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_session_id ON edamam_api_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_request_payload_gin ON edamam_api_logs USING GIN(request_payload);
CREATE INDEX IF NOT EXISTS idx_edamam_logs_response_payload_gin ON edamam_api_logs USING GIN(response_payload);

-- Food Database Providers indexes
CREATE INDEX IF NOT EXISTS idx_food_providers_active ON food_database_providers(is_active);

-- Health Labels indexes
CREATE INDEX IF NOT EXISTS idx_health_labels_standard_category ON health_labels_standard(category_id);
CREATE INDEX IF NOT EXISTS idx_health_labels_standard_active ON health_labels_standard(is_active);
CREATE INDEX IF NOT EXISTS idx_health_labels_standard_key ON health_labels_standard(label_key);
CREATE INDEX IF NOT EXISTS idx_health_labels_mapping_standard ON health_labels_provider_mapping(standard_label_id);
CREATE INDEX IF NOT EXISTS idx_health_labels_mapping_provider ON health_labels_provider_mapping(provider_id);
CREATE INDEX IF NOT EXISTS idx_health_labels_mapping_supported ON health_labels_provider_mapping(is_supported);

-- Guidelines indexes
CREATE INDEX IF NOT EXISTS idx_eer_formulas_lookup ON eer_formulas(country, gender, age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_eer_formulas_country_lower ON eer_formulas(LOWER(country));
CREATE INDEX IF NOT EXISTS idx_pal_values_lookup ON pal_values(country, activity_level);
CREATE INDEX IF NOT EXISTS idx_pal_values_country_lower ON pal_values(LOWER(country));
CREATE INDEX IF NOT EXISTS idx_macro_guidelines_lookup ON macro_guidelines(country, gender, age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_macro_guidelines_country_lower ON macro_guidelines(LOWER(country));
CREATE INDEX IF NOT EXISTS idx_micronutrient_guidelines_flex_lookup ON micronutrient_guidelines_flexible(country, gender, age_min, age_max);
CREATE INDEX IF NOT EXISTS idx_micronutrient_guidelines_flex_country ON micronutrient_guidelines_flexible(country);
CREATE INDEX IF NOT EXISTS idx_micronutrient_guidelines_flex_jsonb ON micronutrient_guidelines_flexible USING GIN(micronutrients);
CREATE INDEX IF NOT EXISTS idx_micronutrient_guidelines_country_lower ON micronutrient_guidelines_flexible(LOWER(country));
CREATE INDEX IF NOT EXISTS idx_country_micronutrient_mappings_country_name ON country_micronutrient_mappings(LOWER(country_name));
CREATE INDEX IF NOT EXISTS idx_country_mappings_country_name_lower ON country_micronutrient_mappings(LOWER(country_name));

-- Migrations indexes
CREATE INDEX IF NOT EXISTS idx_migrations_name ON migrations(migration_name);

-- ========================================
-- COMMENTS
-- ========================================

COMMENT ON TABLE meal_plan_drafts IS 'Unified meal plan table. Status: draft = in progress, finalized = ready to assign, active = assigned to client, completed = client finished, archived = old plan';
COMMENT ON COLUMN meal_plan_drafts.suggestions IS 'JSONB structure: For drafts contains all recipe suggestions. For finalized/active plans contains only selected recipes with customizations';
COMMENT ON COLUMN meal_plan_drafts.expires_at IS 'Expiration date for drafts (7 days). NULL for finalized/active/completed/archived plans';

