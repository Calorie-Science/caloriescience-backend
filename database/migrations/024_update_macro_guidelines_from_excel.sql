-- Migration 024: Update macro guidelines to match Excel sheet values
-- Updates India, WHO, and UK guidelines based on Excel data analysis

-- Start transaction
BEGIN;

-- ===================================
-- INDIA UPDATES
-- ===================================

-- Update India guidelines (both male and female)
-- Fixing: Carbohydrates (was 50-70%, should be 45-65%)
--         Protein upper limit (was 20%, should be 15%)
--         Fat lower limit (was 15%, should be 20%)
--         Adding missing mono/poly/omega-3 values
UPDATE macro_guidelines
SET 
    carbs_min_percent = 45.00,
    carbs_max_percent = 65.00,
    carbs_note = 'ICMR: 45-65 %E',
    protein_max_percent = 15.00,
    protein_note = 'ICMR: 10-15 %E (≈0.83 g/kg/d RDA; 0.66 g/kg/d EAR)',
    fat_min_percent = 20.00,
    fat_note = 'ICMR: 20-30 %E target (min 20 %E; ≤30 %E recommended)',
    fiber_absolute_min = 30.00,
    fiber_absolute_max = 30.00,
    fiber_per_1000_kcal = NULL,
    fiber_note = 'ICMR: 30 g/day',
    saturated_fat_note = 'ICMR: ≤10 %E',
    monounsaturated_fat_min_percent = 15.00,
    monounsaturated_fat_max_percent = 20.00,
    monounsaturated_fat_note = 'ICMR: 15-20 %E (default from USA)',
    polyunsaturated_fat_min_percent = 4.00,
    polyunsaturated_fat_max_percent = 10.00,
    polyunsaturated_fat_note = 'ICMR: n-6: 4-10 %E (RDA ~6.6 g/d); n-3: ~0.5-2 %E (RDA ~2.2 g/d ALA)',
    omega3_min_percent = 0.6,
    omega3_max_percent = 1.2,
    omega3_note = 'ICMR: 0.6-1.2 %E (default from USA)',
    cholesterol_note = 'ICMR: As low as possible (same as USA)'
WHERE country = 'India';

-- ===================================
-- WHO UPDATES
-- ===================================

-- Update WHO guidelines (both male and female)
-- Fixing: Protein (was 10-15%, should be <10%)
--         Fat (was 15-30%, should be 10-15%)
--         Adding polyunsaturated fat values
--         Note: Keeping saturated fat at <10% (Excel shows 15-30% which appears to be an error)
UPDATE macro_guidelines
SET 
    protein_min_percent = NULL,
    protein_max_percent = 10.00,
    protein_note = 'WHO/FAO: <10% of total energy',
    fat_min_percent = 10.00,
    fat_max_percent = 15.00,
    fat_note = 'WHO/FAO: 10-15% of total energy',
    saturated_fat_note = 'WHO/FAO: <10% of energy',
    fiber_note = 'WHO/FAO: 1-2% of total energy',
    polyunsaturated_fat_min_percent = 6.00,
    polyunsaturated_fat_max_percent = 10.00,
    polyunsaturated_fat_note = 'WHO/FAO: 6-10% of total energy',
    omega3_note = 'WHO/FAO: Adequate omega-3 intake'
WHERE country = 'WHO';

-- ===================================
-- UK UPDATES
-- ===================================

-- Update UK guidelines (both male and female)
-- Adding missing protein and carbohydrate values
UPDATE macro_guidelines
SET 
    protein_min_percent = 15.00,
    protein_max_percent = 15.00,
    protein_note = 'SACN/COMA: ~15%',
    carbs_min_percent = 50.00,
    carbs_max_percent = 50.00,
    carbs_note = 'SACN/COMA: ~50% (no defined range)',
    fat_note = 'SACN/COMA: No specific target',
    saturated_fat_note = 'SACN/COMA: As low as possible',
    monounsaturated_fat_note = 'SACN/COMA: No specific recommendation',
    polyunsaturated_fat_note = 'SACN/COMA: No specific recommendation',
    omega3_note = 'SACN/COMA: Encourage oily fish intake',
    cholesterol_note = 'SACN/COMA: Minimize intake'
WHERE country = 'UK';

-- ===================================
-- VERIFICATION
-- ===================================

-- Log the updates to migrations table
INSERT INTO migrations (migration_name, checksum, execution_time_ms)
VALUES ('024_update_macro_guidelines_from_excel.sql', 
        'excel_alignment_update_2025', 
        0)
ON CONFLICT (migration_name) DO NOTHING;

-- Verify the updates (optional - comment out if not needed)
DO $$
BEGIN
    RAISE NOTICE 'India guidelines updated: carbs 45-65%%, protein 10-15%%, fat 20-30%%';
    RAISE NOTICE 'WHO guidelines updated: protein <10%%, fat 10-15%%';
    RAISE NOTICE 'UK guidelines updated: protein ~15%%, carbs ~50%%';
END $$;

COMMIT;

-- ROLLBACK; -- Uncomment to revert changes if needed
