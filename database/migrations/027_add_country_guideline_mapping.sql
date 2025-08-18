-- Migration 027: Add country to micronutrient guideline mapping
-- This migration creates a mapping table and function to automatically select
-- the appropriate micronutrient guidelines based on country

-- Create country to guideline mapping table
CREATE TABLE IF NOT EXISTS country_micronutrient_mappings (
  id SERIAL PRIMARY KEY,
  country_name VARCHAR(100) NOT NULL,
  country_code VARCHAR(3),
  guideline_source VARCHAR(10) NOT NULL CHECK (guideline_source IN ('US', 'EU', 'UK', 'India', 'WHO')),
  guideline_type VARCHAR(20) NOT NULL CHECK (guideline_type IN ('US_DRI', 'EFSA_DRV', 'UK_COMA', 'INDIA_ICMR', 'WHO_FAO')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create index for fast lookups
CREATE INDEX idx_country_micronutrient_mappings_country_name 
ON country_micronutrient_mappings(LOWER(country_name));

-- Insert all country mappings
INSERT INTO country_micronutrient_mappings (country_name, country_code, guideline_source, guideline_type, notes) VALUES
-- North America
('United States', 'US', 'US', 'US_DRI', 'US IOM/NASEM DRIs'),
('USA', 'US', 'US', 'US_DRI', 'US IOM/NASEM DRIs'),
('US', 'US', 'US', 'US_DRI', 'US IOM/NASEM DRIs'),
('Canada', 'CA', 'US', 'US_DRI', 'US IOM/NASEM DRIs'),

-- European Union Countries (EFSA)
('Austria', 'AT', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Belgium', 'BE', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Bulgaria', 'BG', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Croatia', 'HR', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Cyprus', 'CY', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Czechia', 'CZ', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Czech Republic', 'CZ', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Denmark', 'DK', 'EU', 'EFSA_DRV', 'Nordic EU - NNR 2023'),
('Estonia', 'EE', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Finland', 'FI', 'EU', 'EFSA_DRV', 'Nordic EU - NNR 2023'),
('France', 'FR', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Germany', 'DE', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Greece', 'GR', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Hungary', 'HU', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Ireland', 'IE', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Italy', 'IT', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Latvia', 'LV', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Lithuania', 'LT', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Luxembourg', 'LU', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Malta', 'MT', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Netherlands', 'NL', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Poland', 'PL', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Portugal', 'PT', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Romania', 'RO', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Slovakia', 'SK', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Slovenia', 'SI', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Spain', 'ES', 'EU', 'EFSA_DRV', 'EFSA DRVs'),
('Sweden', 'SE', 'EU', 'EFSA_DRV', 'Nordic EU - NNR 2023'),

-- UK (Special case - not EU)
('United Kingdom', 'GB', 'UK', 'UK_COMA', 'SACN DRVs'),
('UK', 'GB', 'UK', 'UK_COMA', 'SACN DRVs'),
('Great Britain', 'GB', 'UK', 'UK_COMA', 'SACN DRVs'),
('England', 'GB', 'UK', 'UK_COMA', 'SACN DRVs'),
('Scotland', 'GB', 'UK', 'UK_COMA', 'SACN DRVs'),
('Wales', 'GB', 'UK', 'UK_COMA', 'SACN DRVs'),
('Northern Ireland', 'GB', 'UK', 'UK_COMA', 'SACN DRVs'),

-- Other European Countries
('Norway', 'NO', 'EU', 'EFSA_DRV', 'NNR 2023'),
('Iceland', 'IS', 'EU', 'EFSA_DRV', 'NNR 2023'),
('Switzerland', 'CH', 'EU', 'EFSA_DRV', 'D-A-CH Reference Values'),

-- Asia - India
('India', 'IN', 'India', 'INDIA_ICMR', 'ICMR/NIN RDAs'),

-- Asia - WHO/FAO
('Singapore', 'SG', 'WHO', 'WHO_FAO', 'Singapore RDA (HPB)'),
('Japan', 'JP', 'WHO', 'WHO_FAO', 'Japan DRIs (MHLW)'),
('China', 'CN', 'WHO', 'WHO_FAO', 'China DRIs (CNS)'),
('Korea', 'KR', 'WHO', 'WHO_FAO', 'KDRIs'),
('South Korea', 'KR', 'WHO', 'WHO_FAO', 'KDRIs'),
('Malaysia', 'MY', 'WHO', 'WHO_FAO', 'RNI Malaysia'),
('Thailand', 'TH', 'WHO', 'WHO_FAO', 'Thailand DRIs'),
('Philippines', 'PH', 'WHO', 'WHO_FAO', 'PDRI'),
('Vietnam', 'VN', 'WHO', 'WHO_FAO', 'Vietnam RDA'),
('Indonesia', 'ID', 'WHO', 'WHO_FAO', 'AKG (MOH)'),

-- Middle East - WHO/FAO
('UAE', 'AE', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('United Arab Emirates', 'AE', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Saudi Arabia', 'SA', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Qatar', 'QA', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Kuwait', 'KW', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Bahrain', 'BH', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),

-- South America - WHO/FAO
('Brazil', 'BR', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs / local ANVISA'),
('Mexico', 'MX', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs / local NOM'),
('Chile', 'CL', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs / local'),
('Argentina', 'AR', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs / local'),

-- Africa - WHO/FAO
('South Africa', 'ZA', 'WHO', 'WHO_FAO', 'NRVs for labelling (SADRI)'),

-- Oceania
('Australia', 'AU', 'WHO', 'WHO_FAO', 'NHMRC NRVs'),
('New Zealand', 'NZ', 'WHO', 'WHO_FAO', 'NHMRC NRVs'),

-- Common additional countries that should use WHO
('Egypt', 'EG', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Nigeria', 'NG', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Kenya', 'KE', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Morocco', 'MA', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Turkey', 'TR', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Pakistan', 'PK', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Bangladesh', 'BD', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Russia', 'RU', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Colombia', 'CO', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Peru', 'PE', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Venezuela', 'VE', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs'),
('Ecuador', 'EC', 'WHO', 'WHO_FAO', 'WHO/FAO NRVs');

-- Create a function to get guideline source for a country
CREATE OR REPLACE FUNCTION get_country_guideline_source(p_country_name TEXT)
RETURNS TABLE (
  guideline_source VARCHAR(10),
  guideline_type VARCHAR(20),
  notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cmm.guideline_source,
    cmm.guideline_type,
    cmm.notes
  FROM country_micronutrient_mappings cmm
  WHERE LOWER(cmm.country_name) = LOWER(TRIM(p_country_name))
  LIMIT 1;
  
  -- If no match found, return WHO as default
  IF NOT FOUND THEN
    RETURN QUERY
    SELECT 
      'WHO'::VARCHAR(10) as guideline_source,
      'WHO_FAO'::VARCHAR(20) as guideline_type,
      'Default WHO/FAO guidelines for unmapped country'::TEXT as notes;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Create a view that shows countries and their guideline mappings
CREATE OR REPLACE VIEW v_country_guideline_mappings AS
SELECT 
  country_name,
  country_code,
  guideline_source,
  guideline_type,
  notes,
  CASE guideline_source
    WHEN 'US' THEN 'United States DRIs'
    WHEN 'EU' THEN 'European EFSA DRVs'
    WHEN 'UK' THEN 'United Kingdom SACN DRVs'
    WHEN 'India' THEN 'India ICMR RDAs'
    WHEN 'WHO' THEN 'WHO/FAO Guidelines'
  END as guideline_description
FROM country_micronutrient_mappings
ORDER BY country_name;

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_country_micronutrient_mappings_updated_at 
BEFORE UPDATE ON country_micronutrient_mappings
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();
