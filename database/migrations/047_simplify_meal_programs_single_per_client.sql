-- Migration 047: Simplify meal programs to single program per client
-- Remove is_active field and allow only one meal program per client

-- Step 1: Drop the unique constraint on (client_id, is_active)
ALTER TABLE meal_programs DROP CONSTRAINT IF EXISTS meal_programs_client_id_is_active_key;

-- Step 2: Remove is_active, name, and description columns
ALTER TABLE meal_programs DROP COLUMN IF EXISTS is_active;
ALTER TABLE meal_programs DROP COLUMN IF EXISTS name;
ALTER TABLE meal_programs DROP COLUMN IF EXISTS description;

-- Step 3: Clean up duplicate programs BEFORE adding unique constraint
-- Delete older duplicate programs for the same client, keep the most recent one
DELETE FROM meal_programs mp1
WHERE EXISTS (
    SELECT 1 FROM meal_programs mp2 
    WHERE mp2.client_id = mp1.client_id 
    AND mp2.created_at > mp1.created_at
);

-- Step 4: Add unique constraint on client_id only (one program per client)
ALTER TABLE meal_programs ADD CONSTRAINT unique_client_meal_program UNIQUE(client_id);

-- Step 5: Update indexes
DROP INDEX IF EXISTS idx_meal_programs_client_id;
CREATE INDEX IF NOT EXISTS idx_meal_programs_client_id ON meal_programs(client_id);

-- Comments
COMMENT ON TABLE meal_programs IS 'Stores single meal program per client defining meal structure and timing';
COMMENT ON CONSTRAINT unique_client_meal_program ON meal_programs IS 'Ensures only one meal program per client';
