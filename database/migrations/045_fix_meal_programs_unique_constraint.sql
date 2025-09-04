-- Migration: Fix meal_programs unique constraint to only apply to active programs
-- Date: 2025-01-20
-- Description: Remove the current unique constraint and add a partial unique constraint only for active programs

-- Drop the current unique constraint that applies to all is_active values
ALTER TABLE meal_programs 
DROP CONSTRAINT IF EXISTS meal_programs_client_id_is_active_key;

-- Add a partial unique constraint that only applies when is_active = true
-- This allows multiple inactive programs but only one active program per client
CREATE UNIQUE INDEX meal_programs_client_id_active_unique 
ON meal_programs (client_id) 
WHERE is_active = true;
