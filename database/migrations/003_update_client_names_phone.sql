-- Migration 003: Update client names and phone number structure
-- Split full_name into first_name and last_name
-- Update phone to support country codes

-- Add new name columns
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);

-- Update phone column to support longer international numbers
DO $$ 
BEGIN
    -- Only alter if the column exists and is not already the right type
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'clients' AND column_name = 'phone' 
               AND character_maximum_length != 20) THEN
        ALTER TABLE clients ALTER COLUMN phone TYPE VARCHAR(20);
    END IF;
END $$;

-- Add country code column for phone numbers
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS phone_country_code VARCHAR(5) DEFAULT '+1';

-- Migrate existing full_name data to first_name and last_name (only if first_name is null)
UPDATE clients 
SET 
  first_name = TRIM(SPLIT_PART(full_name, ' ', 1)),
  last_name = CASE 
    WHEN ARRAY_LENGTH(STRING_TO_ARRAY(full_name, ' '), 1) > 1 
    THEN TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1))
    ELSE ''
  END
WHERE full_name IS NOT NULL AND first_name IS NULL;

-- Make first_name required (NOT NULL) - but only if we have data
DO $$ 
BEGIN
    -- Only set NOT NULL if all rows have first_name
    IF NOT EXISTS (SELECT 1 FROM clients WHERE first_name IS NULL OR first_name = '') THEN
        ALTER TABLE clients ALTER COLUMN first_name SET NOT NULL;
    END IF;
END $$;

-- Add constraints (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'chk_first_name_length') THEN
        ALTER TABLE clients 
        ADD CONSTRAINT chk_first_name_length CHECK (LENGTH(first_name) >= 1 AND LENGTH(first_name) <= 100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'chk_last_name_length') THEN
        ALTER TABLE clients 
        ADD CONSTRAINT chk_last_name_length CHECK (LENGTH(last_name) <= 100);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'chk_phone_format') THEN
        ALTER TABLE clients 
        ADD CONSTRAINT chk_phone_format CHECK (
          phone IS NULL OR 
          (phone ~ '^[0-9+\-\s\(\)\.]+$' AND LENGTH(phone) >= 7 AND LENGTH(phone) <= 20)
        );
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'chk_phone_country_code') THEN
        ALTER TABLE clients 
        ADD CONSTRAINT chk_phone_country_code CHECK (
          phone_country_code ~ '^\+[1-9][0-9]{0,3}$'
        );
    END IF;
END $$;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_first_name ON clients(first_name);
CREATE INDEX IF NOT EXISTS idx_clients_last_name ON clients(last_name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- Add comments for documentation
COMMENT ON COLUMN clients.first_name IS 'Client first name (required)';
COMMENT ON COLUMN clients.last_name IS 'Client last name (optional)';
COMMENT ON COLUMN clients.phone IS 'Phone number without country code';
COMMENT ON COLUMN clients.phone_country_code IS 'International country code (e.g., +1, +44, +91)';
COMMENT ON COLUMN clients.full_name IS 'DEPRECATED: Use first_name and last_name instead'; 