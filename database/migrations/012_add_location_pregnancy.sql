-- Migration 012: Add location, pregnancy and lactation status to clients table

-- Add pregnancy status enum
DO $$ BEGIN
  CREATE TYPE pregnancy_status AS ENUM ('not_pregnant', 'first_trimester', 'second_trimester', 'third_trimester');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add lactation status enum
DO $$ BEGIN
  CREATE TYPE lactation_status AS ENUM ('not_lactating', 'lactating_0_6_months', 'lactating_7_12_months');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add new columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS location VARCHAR(255),
ADD COLUMN IF NOT EXISTS pregnancy_status pregnancy_status DEFAULT 'not_pregnant',
ADD COLUMN IF NOT EXISTS lactation_status lactation_status DEFAULT 'not_lactating';

-- Add comments for documentation
COMMENT ON COLUMN clients.location IS 'Client location (city, state, country, etc.)';
COMMENT ON COLUMN clients.pregnancy_status IS 'Pregnancy status for female clients - affects EER calculations';
COMMENT ON COLUMN clients.lactation_status IS 'Lactation status for female clients - affects EER calculations'; 