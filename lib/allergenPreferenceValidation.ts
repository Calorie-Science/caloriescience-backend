/**
 * Validation schema for client allergens and dietary preferences
 * Ensures data stored in client_goals is compatible with recipe search APIs
 */

// Valid allergens (canonical forms)
export const VALID_ALLERGENS = [
  'peanuts',
  'tree nuts',
  'dairy',
  'eggs',
  'soy',
  'wheat',
  'gluten',
  'fish',
  'shellfish',
  'sesame',
  'sulfites'
] as const;

export type ValidAllergen = typeof VALID_ALLERGENS[number];

// Valid preferences
export const VALID_PREFERENCES = [
  // Universal (both Edamam and Spoonacular)
  'vegetarian',
  'vegan',
  'pescatarian',
  'paleo',
  'ketogenic',
  'keto',
  'low-carb',
  'low-fat',
  'low-sodium',
  'high-protein',
  // Edamam only
  'balanced',
  'high-fiber',
  'alcohol-free',
  'kosher',
  // Spoonacular only
  'whole30'
] as const;

export type ValidPreference = typeof VALID_PREFERENCES[number];

// Allergen aliases (normalize to canonical forms)
export const ALLERGEN_ALIASES: Record<string, ValidAllergen> = {
  'peanut': 'peanuts',
  'nuts': 'tree nuts',
  'almond': 'tree nuts',
  'almonds': 'tree nuts',
  'cashew': 'tree nuts',
  'cashews': 'tree nuts',
  'walnut': 'tree nuts',
  'walnuts': 'tree nuts',
  'pecan': 'tree nuts',
  'pecans': 'tree nuts',
  'milk': 'dairy',
  'lactose': 'dairy',
  'cheese': 'dairy',
  'butter': 'dairy',
  'cream': 'dairy',
  'yogurt': 'dairy',
  'egg': 'eggs',
  'soya': 'soy',
  'soybeans': 'soy',
  'shrimp': 'shellfish',
  'crab': 'shellfish',
  'lobster': 'shellfish',
  'oyster': 'shellfish',
  'oysters': 'shellfish',
  'clam': 'shellfish',
  'clams': 'shellfish',
  'mussel': 'shellfish',
  'mussels': 'shellfish',
  'sulfite': 'sulfites'
};

// Provider-specific preferences
export const EDAMAM_ONLY_PREFERENCES = ['balanced', 'high-fiber', 'alcohol-free', 'kosher'];
export const SPOONACULAR_ONLY_PREFERENCES = ['whole30'];
export const UNSUPPORTED_PREFERENCES = ['halal']; // Not supported by either API

/**
 * Normalize and validate a single allergen
 * @param input Raw allergen string
 * @returns Normalized allergen or null if invalid
 */
export function normalizeAllergen(input: string): ValidAllergen | null {
  const normalized = input.toLowerCase().trim();
  
  // Check if it's already a valid canonical form
  if (VALID_ALLERGENS.includes(normalized as ValidAllergen)) {
    return normalized as ValidAllergen;
  }
  
  // Check if it's an alias
  if (normalized in ALLERGEN_ALIASES) {
    return ALLERGEN_ALIASES[normalized];
  }
  
  // Unknown allergen
  return null;
}

/**
 * Validate and normalize an array of allergens
 * @param allergens Array of allergen strings
 * @returns Validation result with normalized valid allergens, invalid ones, and warnings
 */
export function validateAllergens(allergens: string[]): { 
  valid: ValidAllergen[]; 
  invalid: string[]; 
  warnings: string[] 
} {
  const valid: ValidAllergen[] = [];
  const invalid: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<ValidAllergen>();
  
  for (const allergen of allergens) {
    const normalized = normalizeAllergen(allergen);
    
    if (normalized) {
      // Add only if not already in the list (deduplicate)
      if (!seen.has(normalized)) {
        valid.push(normalized);
        seen.add(normalized);
      }
      
      // Warn if using alias instead of canonical form
      if (normalized !== allergen.toLowerCase().trim()) {
        warnings.push(`"${allergen}" was normalized to "${normalized}"`);
      }
    } else {
      invalid.push(allergen);
    }
  }
  
  return { valid, invalid, warnings };
}

/**
 * Validate dietary preferences
 * @param preferences Array of preference strings
 * @returns Validation result with valid preferences, invalid ones, and provider-specific warnings
 */
export function validatePreferences(preferences: string[]): {
  valid: ValidPreference[];
  invalid: string[];
  providerSpecific: { preference: string; provider: string }[];
} {
  const valid: ValidPreference[] = [];
  const invalid: string[] = [];
  const providerSpecific: { preference: string; provider: string }[] = [];
  const seen = new Set<ValidPreference>();
  
  for (const pref of preferences) {
    const normalized = pref.toLowerCase().trim();
    
    if (VALID_PREFERENCES.includes(normalized as ValidPreference)) {
      // Add only if not already in the list (deduplicate)
      if (!seen.has(normalized as ValidPreference)) {
        valid.push(normalized as ValidPreference);
        seen.add(normalized as ValidPreference);
      }
      
      // Flag provider-specific preferences
      if (EDAMAM_ONLY_PREFERENCES.includes(normalized)) {
        providerSpecific.push({ 
          preference: normalized, 
          provider: 'edamam' 
        });
      } else if (SPOONACULAR_ONLY_PREFERENCES.includes(normalized)) {
        providerSpecific.push({ 
          preference: normalized, 
          provider: 'spoonacular' 
        });
      }
    } else if (UNSUPPORTED_PREFERENCES.includes(normalized)) {
      invalid.push(pref);
    } else {
      invalid.push(pref);
    }
  }
  
  return { valid, invalid, providerSpecific };
}

/**
 * Check if all preferences are universally supported by both APIs
 * @param preferences Array of preferences
 * @returns True if all preferences work with provider=both
 */
export function arePreferencesUniversal(preferences: string[]): boolean {
  const normalized = preferences.map(p => p.toLowerCase().trim());
  
  return !normalized.some(pref => 
    EDAMAM_ONLY_PREFERENCES.includes(pref) || 
    SPOONACULAR_ONLY_PREFERENCES.includes(pref)
  );
}

/**
 * Get recommended provider based on preferences
 * @param preferences Array of preferences
 * @returns Recommended provider or 'both' if all are universal
 */
export function getRecommendedProvider(preferences: string[]): 'edamam' | 'spoonacular' | 'both' {
  const normalized = preferences.map(p => p.toLowerCase().trim());
  
  const hasEdamamOnly = normalized.some(pref => EDAMAM_ONLY_PREFERENCES.includes(pref));
  const hasSpoonacularOnly = normalized.some(pref => SPOONACULAR_ONLY_PREFERENCES.includes(pref));
  
  if (hasEdamamOnly && hasSpoonacularOnly) {
    // Conflicting preferences - cannot satisfy both
    console.warn('⚠️ Preferences contain conflicts:', { edamamOnly: hasEdamamOnly, spoonacularOnly: hasSpoonacularOnly });
    return 'both'; // Let the API handle it with warnings
  }
  
  if (hasEdamamOnly) return 'edamam';
  if (hasSpoonacularOnly) return 'spoonacular';
  
  return 'both'; // All preferences are universal
}

