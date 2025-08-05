-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (Nutritionists)
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  role VARCHAR(50) DEFAULT 'nutritionist',
  is_email_verified BOOLEAN DEFAULT false,
  email_verification_token VARCHAR(255),
  password_reset_token VARCHAR(255),
  password_reset_expires TIMESTAMP WITH TIME ZONE,
  profile_image_url TEXT,
  qualification VARCHAR(500),
  experience_years INTEGER,
  specialization TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- Client statuses enum
CREATE TYPE client_status AS ENUM ('prospective', 'active', 'inactive', 'archived');

-- Activity levels enum  
CREATE TYPE activity_level AS ENUM ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active');

-- Gender enum
CREATE TYPE gender_type AS ENUM ('male', 'female', 'other');

-- Clients table
CREATE TABLE clients (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nutritionist_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Basic Info
  email VARCHAR(255),
  phone VARCHAR(20),
  full_name VARCHAR(255) NOT NULL,
  date_of_birth DATE,
  gender gender_type,
  
  -- Physical Stats
  height_cm DECIMAL(5,2),
  weight_kg DECIMAL(5,2),
  activity_level activity_level,
  
  -- Health Information
  medical_conditions TEXT[],
  allergies TEXT[],
  medications TEXT[],
  dietary_preferences TEXT[], -- vegetarian, vegan, etc.
  
  -- Goals
  health_goals TEXT[],
  target_weight_kg DECIMAL(5,2),
  
  -- Status & Management
  status client_status DEFAULT 'prospective',
  source VARCHAR(100), -- How they found you (referral, website, etc.)
  notes TEXT,
  
  -- Contact preferences
  preferred_contact_method VARCHAR(20) DEFAULT 'email',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  converted_to_active_at TIMESTAMP WITH TIME ZONE,
  last_interaction_at TIMESTAMP WITH TIME ZONE,
  
  -- Search optimization
  CONSTRAINT valid_email CHECK (email IS NULL OR email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- EER and Macros calculations
CREATE TABLE client_nutrition_requirements (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  
  -- AI Generated Data
  eer_calories INTEGER NOT NULL, -- Estimated Energy Requirement
  protein_grams DECIMAL(6,2) NOT NULL,
  carbs_grams DECIMAL(6,2) NOT NULL,
  fat_grams DECIMAL(6,2) NOT NULL,
  fiber_grams DECIMAL(6,2),
  
  -- Macronutrient percentages
  protein_percentage DECIMAL(5,2),
  carbs_percentage DECIMAL(5,2),
  fat_percentage DECIMAL(5,2),
  
  -- Key micronutrients (RDA based)
  vitamin_d_mcg DECIMAL(8,2),
  vitamin_b12_mcg DECIMAL(8,2),
  vitamin_c_mg DECIMAL(8,2),
  iron_mg DECIMAL(8,2),
  calcium_mg DECIMAL(8,2),
  magnesium_mg DECIMAL(8,2),
  zinc_mg DECIMAL(8,2),
  folate_mcg DECIMAL(8,2),
  
  -- Hydration
  water_ml INTEGER,
  
  -- Metadata
  ai_calculation_data JSONB, -- Store raw AI response
  calculation_method VARCHAR(100) DEFAULT 'mifflin_st_jeor',
  is_ai_generated BOOLEAN DEFAULT true,
  is_edited_by_nutritionist BOOLEAN DEFAULT false,
  
  -- Nutritionist edits
  nutritionist_notes TEXT,
  custom_adjustments JSONB,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES users(id),
  
  -- Ensure only one active requirement per client
  is_active BOOLEAN DEFAULT true
);

-- Client interactions/notes
CREATE TABLE client_interactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  nutritionist_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  interaction_type VARCHAR(50) NOT NULL, -- 'consultation', 'follow_up', 'note', 'phone_call', 'email', 'check_in'
  title VARCHAR(255),
  description TEXT,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  duration_minutes INTEGER,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Follow-up
  follow_up_required BOOLEAN DEFAULT false,
  follow_up_date DATE,
  
  -- Metadata
  interaction_data JSONB, -- Store additional structured data
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document types enum
CREATE TYPE document_type AS ENUM ('blood_report', 'medical_history', 'photo', 'diet_log', 'prescription', 'other');

-- Client documents (blood reports, etc.)
CREATE TABLE client_documents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id),
  
  document_type document_type NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT, -- Supabase storage URL
  file_size INTEGER,
  mime_type VARCHAR(100),
  
  -- AI Analysis
  ai_summary TEXT,
  ai_analysis_data JSONB,
  key_findings TEXT[],
  
  -- Document metadata
  document_date DATE, -- When the document was created (e.g., blood test date)
  description TEXT,
  tags TEXT[],
  
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  analyzed_at TIMESTAMP WITH TIME ZONE
);

-- Meal plans (for future enhancement)
CREATE TABLE meal_plans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id),
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  start_date DATE,
  end_date DATE,
  
  -- AI generated meal plan data
  ai_generated_plan JSONB,
  custom_modifications JSONB,
  
  is_active BOOLEAN DEFAULT false,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_email_verification ON users(email_verification_token);
CREATE INDEX idx_users_password_reset ON users(password_reset_token);

CREATE INDEX idx_clients_nutritionist_id ON clients(nutritionist_id);
CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_created_at ON clients(created_at);
CREATE INDEX idx_clients_email ON clients(email);

CREATE INDEX idx_nutrition_requirements_client_id ON client_nutrition_requirements(client_id);
CREATE INDEX idx_nutrition_requirements_active ON client_nutrition_requirements(client_id, is_active) WHERE is_active = true;

CREATE INDEX idx_interactions_client_id ON client_interactions(client_id);
CREATE INDEX idx_interactions_nutritionist_id ON client_interactions(nutritionist_id);
CREATE INDEX idx_interactions_scheduled ON client_interactions(scheduled_at);

CREATE INDEX idx_documents_client_id ON client_documents(client_id);
CREATE INDEX idx_documents_type ON client_documents(document_type);

CREATE INDEX idx_meal_plans_client_id ON meal_plans(client_id);
CREATE INDEX idx_meal_plans_active ON meal_plans(client_id, is_active) WHERE is_active = true;

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nutrition_requirements_updated_at BEFORE UPDATE ON client_nutrition_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_plans_updated_at BEFORE UPDATE ON meal_plans
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_nutrition_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can access their own data
CREATE POLICY "Users can view own profile" ON users
  FOR ALL USING (id = auth.uid());

-- Nutritionists can view their own clients
CREATE POLICY "Nutritionists can view their own clients" ON clients
  FOR ALL USING (nutritionist_id = auth.uid());

-- Nutritionists can manage their clients' nutrition requirements
CREATE POLICY "Nutritionists can manage their clients' nutrition requirements" ON client_nutrition_requirements
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE nutritionist_id = auth.uid()
    )
  );

-- Nutritionists can manage their clients' interactions
CREATE POLICY "Nutritionists can manage their clients' interactions" ON client_interactions
  FOR ALL USING (nutritionist_id = auth.uid());

-- Nutritionists can manage their clients' documents
CREATE POLICY "Nutritionists can manage their clients' documents" ON client_documents
  FOR ALL USING (
    client_id IN (
      SELECT id FROM clients WHERE nutritionist_id = auth.uid()
    )
  );

-- Nutritionists can manage their clients' meal plans
CREATE POLICY "Nutritionists can manage their clients' meal plans" ON meal_plans
  FOR ALL USING (created_by = auth.uid());

-- Insert some sample data (optional)
INSERT INTO users (email, password_hash, full_name, qualification, experience_years) VALUES 
('demo@caloriescience.com', '$2b$10$example', 'Demo Nutritionist', 'MSc Clinical Nutrition', 5); 