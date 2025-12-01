-- Migration: Add body measurement fields to clients table
-- Date: 2025-12-01
-- Description: Add waist_circumference_cm, hip_circumference_cm, and body_fat_percentage fields

ALTER TABLE clients
ADD COLUMN IF NOT EXISTS waist_circumference_cm NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS hip_circumference_cm NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS body_fat_percentage NUMERIC(5,2);

-- Add constraints to ensure valid values
ALTER TABLE clients
ADD CONSTRAINT IF NOT EXISTS chk_waist_circumference CHECK (waist_circumference_cm IS NULL OR (waist_circumference_cm > 0 AND waist_circumference_cm < 500)),
ADD CONSTRAINT IF NOT EXISTS chk_hip_circumference CHECK (hip_circumference_cm IS NULL OR (hip_circumference_cm > 0 AND hip_circumference_cm < 500)),
ADD CONSTRAINT IF NOT EXISTS chk_body_fat_percentage CHECK (body_fat_percentage IS NULL OR (body_fat_percentage >= 0 AND body_fat_percentage <= 100));

-- Add comments for documentation
COMMENT ON COLUMN clients.waist_circumference_cm IS 'Client waist circumference in centimeters';
COMMENT ON COLUMN clients.hip_circumference_cm IS 'Client hip circumference in centimeters';
COMMENT ON COLUMN clients.body_fat_percentage IS 'Client body fat percentage (0-100)';
