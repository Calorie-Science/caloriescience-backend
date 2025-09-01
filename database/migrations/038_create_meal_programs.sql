-- Migration: Create meal programs system for clients
-- This allows nutritionists to customize meal structure for each client

-- Create meal_programs table
CREATE TABLE IF NOT EXISTS meal_programs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL DEFAULT 'Default Meal Program',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(client_id, is_active) -- Only one active program per client
);

-- Note: We cannot use a check constraint with subqueries in PostgreSQL
-- The role validation will be handled at the application level in the MealProgramService

-- Create meal_program_meals table for individual meals
CREATE TABLE IF NOT EXISTS meal_program_meals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    meal_program_id UUID NOT NULL REFERENCES meal_programs(id) ON DELETE CASCADE,
    meal_order INTEGER NOT NULL, -- Order of the meal (1, 2, 3, etc.)
    meal_name VARCHAR(255) NOT NULL, -- Custom name like "Pre-Breakfast", "Morning Snack", etc.
    meal_time TIME NOT NULL, -- 24-hour format (08:00, 12:30, 18:00, etc.)
    target_calories INTEGER, -- Optional target calories for this meal
    meal_type VARCHAR(50), -- breakfast, lunch, dinner, snack (for Edamam compatibility)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(meal_program_id, meal_order), -- No duplicate meal orders within a program
    CHECK (meal_order > 0 AND meal_order <= 10), -- Max 10 meals
    CHECK (target_calories IS NULL OR target_calories > 0) -- Positive calories if specified
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_meal_programs_client_id ON meal_programs(client_id);
CREATE INDEX IF NOT EXISTS idx_meal_programs_nutritionist_id ON meal_programs(nutritionist_id);
CREATE INDEX IF NOT EXISTS idx_meal_program_meals_program_id ON meal_program_meals(meal_program_id);
CREATE INDEX IF NOT EXISTS idx_meal_program_meals_order ON meal_program_meals(meal_order);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_meal_programs_updated_at 
    BEFORE UPDATE ON meal_programs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meal_program_meals_updated_at 
    BEFORE UPDATE ON meal_program_meals 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data for existing clients (optional)
-- This can be run manually if needed
/*
INSERT INTO meal_programs (client_id, nutritionist_id, name, description)
SELECT 
    c.id as client_id,
    c.nutritionist_id,
    'Default Meal Program',
    'Default meal structure with 4 meals per day'
FROM clients c
WHERE NOT EXISTS (
    SELECT 1 FROM meal_programs mp WHERE mp.client_id = c.id
)
AND c.nutritionist_id IS NOT NULL; -- Only for clients with assigned nutritionists

INSERT INTO meal_program_meals (meal_program_id, meal_order, meal_name, meal_time, target_calories, meal_type)
SELECT 
    mp.id,
    m.meal_order,
    m.meal_name,
    m.meal_time,
    m.target_calories,
    m.meal_type
FROM (
    VALUES 
        (1, 'Breakfast', '08:00', 600, 'breakfast'),
        (2, 'Lunch', '12:30', 800, 'lunch'),
        (3, 'Dinner', '18:00', 700, 'dinner'),
        (4, 'Evening Snack', '21:00', 200, 'snack')
) AS m(meal_order, meal_name, meal_time, target_calories, meal_type)
CROSS JOIN meal_programs mp;
*/
