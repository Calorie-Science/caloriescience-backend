-- Migration: Fix client_goals unique constraint to only apply to active goals
-- Date: 2025-01-20
-- Description: Remove the current unique constraint and add a partial unique constraint only for active goals

-- Drop the current unique constraint that applies to all is_active values
ALTER TABLE client_goals 
DROP CONSTRAINT IF EXISTS client_goals_client_id_is_active_key;

-- Add a partial unique constraint that only applies when is_active = true
-- This allows multiple inactive goals but only one active goal per client
CREATE UNIQUE INDEX client_goals_client_id_active_unique 
ON client_goals (client_id) 
WHERE is_active = true;
