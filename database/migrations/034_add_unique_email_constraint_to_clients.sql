-- Migration: Add unique constraint on clients email field
-- Date: 2024-12-19
-- Description: Ensures that each client has a unique email address

-- First, check if there are any duplicate emails that would prevent the constraint
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Count duplicate emails (excluding NULL emails)
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT email, COUNT(*) as cnt
        FROM clients
        WHERE email IS NOT NULL
        GROUP BY email
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- If duplicates exist, raise an error with helpful information
    IF duplicate_count > 0 THEN
        RAISE EXCEPTION 'Cannot add unique constraint: Found % duplicate email(s) in clients table. Please resolve duplicates before running this migration.', duplicate_count;
    END IF;
END $$;

-- Add unique constraint on clients email field
ALTER TABLE clients ADD CONSTRAINT clients_email_unique UNIQUE (email);

-- Add comment to document the constraint
COMMENT ON CONSTRAINT clients_email_unique ON clients IS 'Ensures each client has a unique email address';

-- Log successful migration
DO $$
BEGIN
    RAISE NOTICE 'Successfully added unique constraint on clients email field';
END $$;
