-- Helper script to check for duplicate emails in clients table
-- Run this before applying migration 034 to ensure it will succeed

-- Check for duplicate emails
SELECT 
    email,
    COUNT(*) as duplicate_count,
    array_agg(id) as client_ids,
    array_agg(full_name) as client_names
FROM clients 
WHERE email IS NOT NULL
GROUP BY email 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC;

-- Summary of duplicate count
SELECT 
    COUNT(*) as total_duplicate_emails,
    COUNT(DISTINCT email) as unique_duplicate_emails
FROM (
    SELECT email
    FROM clients 
    WHERE email IS NOT NULL
    GROUP BY email 
    HAVING COUNT(*) > 1
) duplicates;

-- If duplicates exist, you'll need to resolve them before running the migration
-- Common approaches:
-- 1. Update duplicate emails to be unique (e.g., add numbers or prefixes)
-- 2. Merge duplicate client records if they represent the same person
-- 3. Delete duplicate records if they're truly redundant
