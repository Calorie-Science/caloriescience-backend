-- Migration: Add measurement system preferences to users and clients
-- This allows nutritionists to set their default measurement system
-- and clients to have their preferred measurement system

-- Add measurement system preference to users (nutritionists)
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS preferred_measurement_system VARCHAR(10) DEFAULT 'metric' CHECK (preferred_measurement_system IN ('metric', 'imperial'));

-- Add measurement system preference to clients
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS preferred_measurement_system VARCHAR(10) DEFAULT 'metric' CHECK (preferred_measurement_system IN ('metric', 'imperial'));

-- Create index for better performance on measurement system queries
CREATE INDEX IF NOT EXISTS idx_users_measurement_system ON users(preferred_measurement_system);
CREATE INDEX IF NOT EXISTS idx_clients_measurement_system ON clients(preferred_measurement_system);

-- Add comments for documentation
COMMENT ON COLUMN users.preferred_measurement_system IS 'Nutritionist default measurement system preference (metric/imperial)';
COMMENT ON COLUMN clients.preferred_measurement_system IS 'Client preferred measurement system (metric/imperial)';
