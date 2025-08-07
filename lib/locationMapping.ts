// Utility to map client locations to EER calculation guidelines

/**
 * Map of countries/regions to their corresponding EER guidelines
 */
const COUNTRY_TO_EER_GUIDELINE: Record<string, string> = {
  // USA
  'united states': 'USA',
  'usa': 'USA',
  'us': 'USA',
  'america': 'USA',
  
  // Canada
  'canada': 'Canada',
  'canadian': 'Canada',
  
  // EU Countries
  'france': 'EU',
  'germany': 'EU',
  'spain': 'EU',
  'italy': 'EU',
  'netherlands': 'EU',
  'belgium': 'EU',
  'austria': 'EU',
  'portugal': 'EU',
  'greece': 'EU',
  'ireland': 'EU',
  'finland': 'EU',
  'sweden': 'EU',
  'denmark': 'EU',
  'poland': 'EU',
  'czech republic': 'EU',
  'hungary': 'EU',
  'romania': 'EU',
  'bulgaria': 'EU',
  'croatia': 'EU',
  'slovakia': 'EU',
  'slovenia': 'EU',
  'estonia': 'EU',
  'latvia': 'EU',
  'lithuania': 'EU',
  'luxembourg': 'EU',
  'malta': 'EU',
  'cyprus': 'EU',
  'european union': 'EU',
  'eu': 'EU',
  
  // Australia/New Zealand
  'australia': 'AU/NZ',
  'new zealand': 'AU/NZ',
  'nz': 'AU/NZ',
  'aus': 'AU/NZ',
  
  // United Kingdom
  'united kingdom': 'UK',
  'uk': 'UK',
  'england': 'UK',
  'scotland': 'UK',
  'wales': 'UK',
  'northern ireland': 'UK',
  'britain': 'UK',
  'great britain': 'UK',
  
  // Singapore
  'singapore': 'Singapore',
  
  // UAE
  'uae': 'UAE',
  'united arab emirates': 'UAE',
  'dubai': 'UAE',
  'abu dhabi': 'UAE',
  
  // India
  'india': 'India',
  'indian': 'India',
  
  // Japan
  'japan': 'Japan',
  'japanese': 'Japan',
  
  // South Africa
  'south africa': 'ZA',
  'za': 'ZA',
  
  // Brazil
  'brazil': 'Brazil',
  'brazilian': 'Brazil'
};

/**
 * Extract country from location string and map to EER guideline
 * @param location - Client's location string (e.g., "Paris, France", "New York, NY", "Mumbai, India")
 * @returns EER guideline code (USA, EU, etc.) or 'USA' as default
 */
export function getEERGuidelineFromLocation(location: string): string {
  if (!location || typeof location !== 'string') {
    return 'USA'; // Default fallback
  }

  // Convert to lowercase for case-insensitive matching
  const locationLower = location.toLowerCase().trim();
  
  // Try to match against known countries/regions
  for (const [country, guideline] of Object.entries(COUNTRY_TO_EER_GUIDELINE)) {
    if (locationLower.includes(country)) {
      return guideline;
    }
  }
  
  // If no match found, default to USA
  return 'USA';
}

/**
 * Get all available EER guidelines
 */
export function getAvailableEERGuidelines(): string[] {
  return ['USA', 'Canada', 'EU', 'AU/NZ', 'UK', 'Singapore', 'UAE', 'India', 'Japan', 'WHO', 'ZA', 'Brazil'];
}

/**
 * Validate if a guideline is supported
 */
export function isValidEERGuideline(guideline: string): boolean {
  return getAvailableEERGuidelines().includes(guideline);
} 