-- Migration 008: Expand country field size to accommodate longer country names
-- Fix VARCHAR(10) limitation for countries like 'South Africa'

-- Expand country field in all calculation tables
ALTER TABLE eer_formulas ALTER COLUMN country TYPE VARCHAR(20);
ALTER TABLE pal_values ALTER COLUMN country TYPE VARCHAR(20);
ALTER TABLE macro_guidelines ALTER COLUMN country TYPE VARCHAR(20); 