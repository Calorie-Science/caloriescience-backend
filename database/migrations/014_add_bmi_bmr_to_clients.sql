-- Migration: Add BMI and BMR fields to clients table
-- Description: Adds calculated health metrics for better client health monitoring

-- Add BMI and BMR columns to clients table
ALTER TABLE clients 
ADD COLUMN IF NOT EXISTS bmi DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS bmi_category VARCHAR(20),
ADD COLUMN IF NOT EXISTS bmr DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS bmi_last_calculated TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bmr_last_calculated TIMESTAMP WITH TIME ZONE;

-- Add comments for documentation
COMMENT ON COLUMN clients.bmi IS 'Body Mass Index calculated from height and weight';
COMMENT ON COLUMN clients.bmi_category IS 'BMI classification (underweight, normal, overweight, obese_class_1, obese_class_2, obese_class_3)';
COMMENT ON COLUMN clients.bmr IS 'Basal Metabolic Rate in kcal/day calculated from latest EER calculation';
COMMENT ON COLUMN clients.bmi_last_calculated IS 'Timestamp when BMI was last calculated';
COMMENT ON COLUMN clients.bmr_last_calculated IS 'Timestamp when BMR was last calculated';

-- Create enum for BMI categories
DO $$ BEGIN
    CREATE TYPE bmi_category AS ENUM (
        'underweight',
        'normal', 
        'overweight',
        'obese_class_1',
        'obese_class_2', 
        'obese_class_3'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update the column to use the enum type
ALTER TABLE clients ALTER COLUMN bmi_category TYPE bmi_category USING bmi_category::bmi_category; 