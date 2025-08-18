// Country to Micronutrient Guideline Mapping
// This file maps countries to their appropriate micronutrient guideline sources

export interface CountryGuidelineMapping {
  country: string;
  guidelineSource: 'US' | 'EU' | 'UK' | 'India' | 'WHO';
  guidelineType: 'US_DRI' | 'EFSA_DRV' | 'UK_COMA' | 'INDIA_ICMR' | 'WHO_FAO';
  notes?: string;
}

// Complete mapping based on the provided list
export const COUNTRY_MICRONUTRIENT_MAPPINGS: CountryGuidelineMapping[] = [
  // North America
  { country: 'United States', guidelineSource: 'US', guidelineType: 'US_DRI', notes: 'US IOM/NASEM DRIs' },
  { country: 'USA', guidelineSource: 'US', guidelineType: 'US_DRI', notes: 'US IOM/NASEM DRIs' },
  { country: 'US', guidelineSource: 'US', guidelineType: 'US_DRI', notes: 'US IOM/NASEM DRIs' },
  { country: 'Canada', guidelineSource: 'US', guidelineType: 'US_DRI', notes: 'US IOM/NASEM DRIs' },
  
  // European Union Countries (EFSA)
  { country: 'Austria', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Belgium', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Bulgaria', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Croatia', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Cyprus', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Czechia', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Czech Republic', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Denmark', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'Nordic EU - NNR 2023' },
  { country: 'Estonia', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Finland', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'Nordic EU - NNR 2023' },
  { country: 'France', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Germany', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Greece', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Hungary', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Ireland', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Italy', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Latvia', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Lithuania', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Luxembourg', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Malta', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Netherlands', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Poland', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Portugal', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Romania', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Slovakia', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Slovenia', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Spain', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'EFSA DRVs' },
  { country: 'Sweden', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'Nordic EU - NNR 2023' },
  
  // UK (Special case - not EU)
  { country: 'United Kingdom', guidelineSource: 'UK', guidelineType: 'UK_COMA', notes: 'SACN DRVs' },
  { country: 'UK', guidelineSource: 'UK', guidelineType: 'UK_COMA', notes: 'SACN DRVs' },
  { country: 'Great Britain', guidelineSource: 'UK', guidelineType: 'UK_COMA', notes: 'SACN DRVs' },
  { country: 'England', guidelineSource: 'UK', guidelineType: 'UK_COMA', notes: 'SACN DRVs' },
  { country: 'Scotland', guidelineSource: 'UK', guidelineType: 'UK_COMA', notes: 'SACN DRVs' },
  { country: 'Wales', guidelineSource: 'UK', guidelineType: 'UK_COMA', notes: 'SACN DRVs' },
  { country: 'Northern Ireland', guidelineSource: 'UK', guidelineType: 'UK_COMA', notes: 'SACN DRVs' },
  
  // Other European Countries
  { country: 'Norway', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'NNR 2023' },
  { country: 'Iceland', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'NNR 2023' },
  { country: 'Switzerland', guidelineSource: 'EU', guidelineType: 'EFSA_DRV', notes: 'D-A-CH Reference Values' },
  
  // Asia - India
  { country: 'India', guidelineSource: 'India', guidelineType: 'INDIA_ICMR', notes: 'ICMR/NIN RDAs' },
  
  // Asia - WHO/FAO
  { country: 'Singapore', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'Singapore RDA (HPB)' },
  { country: 'Japan', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'Japan DRIs (MHLW)' },
  { country: 'China', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'China DRIs (CNS)' },
  { country: 'Korea', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'KDRIs' },
  { country: 'South Korea', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'KDRIs' },
  { country: 'Malaysia', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'RNI Malaysia' },
  { country: 'Thailand', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'Thailand DRIs' },
  { country: 'Philippines', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'PDRI' },
  { country: 'Vietnam', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'Vietnam RDA' },
  { country: 'Indonesia', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'AKG (MOH)' },
  
  // Middle East - WHO/FAO
  { country: 'UAE', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs' },
  { country: 'United Arab Emirates', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs' },
  { country: 'Saudi Arabia', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs' },
  { country: 'Qatar', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs' },
  { country: 'Kuwait', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs' },
  { country: 'Bahrain', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs' },
  
  // South America - WHO/FAO
  { country: 'Brazil', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs / local ANVISA' },
  { country: 'Mexico', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs / local NOM' },
  { country: 'Chile', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs / local' },
  { country: 'Argentina', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'WHO/FAO NRVs / local' },
  
  // Africa - WHO/FAO
  { country: 'South Africa', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'NRVs for labelling (SADRI)' },
  
  // Oceania
  { country: 'Australia', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'NHMRC NRVs' },
  { country: 'New Zealand', guidelineSource: 'WHO', guidelineType: 'WHO_FAO', notes: 'NHMRC NRVs' },
];

/**
 * Get the appropriate micronutrient guideline for a given country
 * @param country The country name
 * @returns The guideline mapping or undefined if not found
 */
export function getCountryGuideline(country: string): CountryGuidelineMapping | undefined {
  if (!country) return undefined;
  
  // Normalize country name for comparison
  const normalizedCountry = country.trim().toLowerCase();
  
  return COUNTRY_MICRONUTRIENT_MAPPINGS.find(
    mapping => mapping.country.toLowerCase() === normalizedCountry
  );
}

/**
 * Get the guideline source for a country (returns default if not found)
 * @param country The country name
 * @param defaultSource The default source to return if country not found
 * @returns The guideline source
 */
export function getCountryGuidelineSource(
  country: string,
  defaultSource: 'US' | 'EU' | 'UK' | 'India' | 'WHO' = 'WHO'
): 'US' | 'EU' | 'UK' | 'India' | 'WHO' {
  const mapping = getCountryGuideline(country);
  return mapping?.guidelineSource || defaultSource;
}

/**
 * Get the guideline type for a country (returns default if not found)
 * @param country The country name
 * @param defaultType The default type to return if country not found
 * @returns The guideline type
 */
export function getCountryGuidelineType(
  country: string,
  defaultType: 'US_DRI' | 'EFSA_DRV' | 'UK_COMA' | 'INDIA_ICMR' | 'WHO_FAO' = 'WHO_FAO'
): 'US_DRI' | 'EFSA_DRV' | 'UK_COMA' | 'INDIA_ICMR' | 'WHO_FAO' {
  const mapping = getCountryGuideline(country);
  return mapping?.guidelineType || defaultType;
}

/**
 * Check if a country uses WHO guidelines
 * @param country The country name
 * @returns true if the country uses WHO guidelines
 */
export function usesWHOGuidelines(country: string): boolean {
  const mapping = getCountryGuideline(country);
  return mapping?.guidelineSource === 'WHO';
}

/**
 * Get all countries that use a specific guideline source
 * @param guidelineSource The guideline source
 * @returns Array of country names
 */
export function getCountriesByGuidelineSource(
  guidelineSource: 'US' | 'EU' | 'UK' | 'India' | 'WHO'
): string[] {
  return COUNTRY_MICRONUTRIENT_MAPPINGS
    .filter(mapping => mapping.guidelineSource === guidelineSource)
    .map(mapping => mapping.country);
}
