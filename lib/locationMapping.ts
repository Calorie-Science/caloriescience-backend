// Utility to map client locations to EER calculation guidelines

/**
 * Map of countries/regions to their corresponding EER guidelines
 * All country keys are lowercase for consistent matching
 */
const COUNTRY_TO_EER_GUIDELINE: Record<string, string> = {
  // USA
  'united states': 'usa',
  'usa': 'usa',
  'us': 'usa',
  'america': 'usa',
  
  // Canada
  'canada': 'canada',
  'canadian': 'canada',
  
  // EU Countries
  'france': 'eu',
  'germany': 'eu',
  'spain': 'eu',
  'italy': 'eu',
  'netherlands': 'eu',
  'belgium': 'eu',
  'austria': 'eu',
  'portugal': 'eu',
  'greece': 'eu',
  'ireland': 'eu',
  'finland': 'eu',
  'sweden': 'eu',
  'denmark': 'eu',
  'poland': 'eu',
  'czech republic': 'eu',
  'hungary': 'eu',
  'romania': 'eu',
  'bulgaria': 'eu',
  'croatia': 'eu',
  'slovakia': 'eu',
  'slovenia': 'eu',
  'estonia': 'eu',
  'latvia': 'eu',
  'lithuania': 'eu',
  'luxembourg': 'eu',
  'malta': 'eu',
  'cyprus': 'eu',
  'european union': 'eu',
  'eu': 'eu',
  
  // Australia/New Zealand
  'australia': 'au/nz',
  'new zealand': 'au/nz',
  'nz': 'au/nz',
  'aus': 'au/nz',
  
  // United Kingdom
  'united kingdom': 'uk',
  'uk': 'uk',
  'england': 'uk',
  'scotland': 'uk',
  'wales': 'uk',
  'northern ireland': 'uk',
  'britain': 'uk',
  'great britain': 'uk',
  
  // Singapore
  'singapore': 'singapore',
  
  // UAE
  'uae': 'uae',
  'united arab emirates': 'uae',
  'dubai': 'uae',
  'abu dhabi': 'uae',
  
  // India
  'india': 'india',
  'indian': 'india',
  
  // Japan
  'japan': 'japan',
  'japanese': 'japan',
  
  // South Africa
  'south africa': 'za',
  'za': 'za',
  
  // Brazil
  'brazil': 'brazil',
  'brazilian': 'brazil'
};

/**
 * Extract country from location string and map to EER guideline
 * @param location - Client's location string (e.g., "Paris, France", "New York, NY", "Mumbai, India")
 * @returns EER guideline code in lowercase (usa, eu, etc.) or 'usa' as default
 */
export function getEERGuidelineFromLocation(location: string): string {
  if (!location || typeof location !== 'string') {
    return 'usa'; // Default fallback in lowercase
  }

  // Convert to lowercase for case-insensitive matching
  const locationLower = location.toLowerCase().trim();
  
  // Try to match against known countries/regions
  for (const [country, guideline] of Object.entries(COUNTRY_TO_EER_GUIDELINE)) {
    if (locationLower.includes(country)) {
      return guideline; // Return lowercase guideline
    }
  }
  
  // If no match found, default to usa (lowercase)
  return 'usa';
}

/**
 * Get all available EER guidelines (all lowercase)
 */
export function getAvailableEERGuidelines(): string[] {
  return ['usa', 'canada', 'eu', 'au/nz', 'uk', 'singapore', 'uae', 'india', 'japan', 'who', 'za', 'brazil'];
}

/**
 * Validate if a guideline is supported (case-insensitive)
 */
export function isValidEERGuideline(guideline: string): boolean {
  if (!guideline) return false;
  return getAvailableEERGuidelines().includes(guideline.toLowerCase());
}

/**
 * Normalize country value to lowercase
 * @param country - Country value to normalize
 * @returns Lowercase country value
 */
export function normalizeCountry(country: string): string {
  if (!country || typeof country !== 'string') {
    return 'usa'; // Default fallback
  }
  return country.toLowerCase().trim();
}

/**
 * Get country mapping for a given country name
 * @param countryName - Country name to look up
 * @returns Mapped country code or the original name in lowercase
 */
export function getCountryMapping(countryName: string): string {
  const normalized = normalizeCountry(countryName);
  
  // Check if we have a direct mapping
  if (COUNTRY_TO_EER_GUIDELINE[normalized]) {
    return COUNTRY_TO_EER_GUIDELINE[normalized];
  }
  
  // Check if any key contains the country name
  for (const [key, value] of Object.entries(COUNTRY_TO_EER_GUIDELINE)) {
    if (key.includes(normalized) || normalized.includes(key)) {
      return value;
    }
  }
  
  // Return normalized name if no mapping found
  return normalized;
} 