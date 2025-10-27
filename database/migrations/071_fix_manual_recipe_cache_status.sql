-- Migration: Fix cache_status for Manual Recipes
-- Description: Set cache_status to 'active' for manual recipes that have NULL
-- Date: 2025-10-27
-- Issue: Custom recipes with NULL cache_status were being filtered out of search results

-- Fix existing manual recipes with NULL cache_status
UPDATE cached_recipes
SET cache_status = 'active',
    updated_at = NOW()
WHERE provider = 'manual'
  AND cache_status IS NULL;

-- Add default value for cache_status column (if not already set)
-- This ensures new manual recipes automatically get 'active' status
ALTER TABLE cached_recipes
ALTER COLUMN cache_status SET DEFAULT 'active';

-- Verify the fix
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM cached_recipes
  WHERE provider = 'manual' AND cache_status = 'active';
  
  RAISE NOTICE 'Migration complete: % manual recipes now have cache_status = active', updated_count;
END $$;

