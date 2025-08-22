import { getCountryGuidelineSource, getCountryGuidelineType } from './countryMicronutrientMapping';

/**
 * Extract country from a location string
 * Handles formats like "Buenos Aires, Argentina", "Argentina", "London, UK", etc.
 * @param location The location string
 * @returns The extracted country name or null
 */
export function extractCountryFromLocation(location: string | null | undefined): string | null {
  if (!location) return null;
  
  // Remove extra whitespace and trim
  const cleanLocation = location.trim();
  
  // If location contains comma, assume last part is country
  if (cleanLocation.includes(',')) {
    const parts = cleanLocation.split(',');
    const lastPart = parts[parts.length - 1].trim();
    return lastPart;
  }
  
  // Otherwise, assume the whole string is the country
  return cleanLocation;
}

/**
 * Get micronutrient guideline info from client location
 * @param location Client's location string
 * @returns Object with guideline source and type
 */
export function getGuidelineFromLocation(location: string | null | undefined): {
  country: 'us' | 'eu' | 'uk' | 'india' | 'who';
  guidelineType: 'US_DRI' | 'EFSA_DRV' | 'UK_COMA' | 'INDIA_ICMR' | 'WHO_FAO';
  extractedCountry: string | null;
} {
  const extractedCountry = extractCountryFromLocation(location);
  
  if (!extractedCountry) {
    // Default to WHO if no country can be extracted
    return {
      country: 'who',
      guidelineType: 'WHO_FAO',
      extractedCountry: null
    };
  }
  
  const guidelineSource = getCountryGuidelineSource(extractedCountry);
  const guidelineType = getCountryGuidelineType(extractedCountry);
  
  return {
    country: guidelineSource,
    guidelineType: guidelineType,
    extractedCountry: extractedCountry
  };
}

/**
 * Format location with guideline info for display
 * @param location Client's location
 * @returns Formatted string with guideline info
 */
export function formatLocationWithGuideline(location: string | null | undefined): string {
  const guideline = getGuidelineFromLocation(location);
  
  if (!location) {
    return `Using ${guideline.country} guidelines (default)`;
  }
  
  const guidelineNames = {
    'us': 'US DRI',
    'eu': 'EFSA',
    'uk': 'UK SACN',
    'india': 'India ICMR',
    'who': 'WHO/FAO'
  };
  
  return `${location} - Using ${guidelineNames[guideline.country]} guidelines`;
}

export interface MicronutrientCalculationInput {
  country: 'us' | 'eu' | 'uk' | 'india' | 'who';
}
