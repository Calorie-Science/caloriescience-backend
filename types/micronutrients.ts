// Micronutrient Types for Flexible Country-Specific Guidelines

// UK specific nutrient value structure
export interface UKNutrientValue {
  unit: string;
  rni?: number | null;  // Reference Nutrient Intake
  lrni?: number | null; // Lower Reference Nutrient Intake  
  sui?: number | null;  // Safe Upper Intake (equivalent to UL)
}

// US specific nutrient value structure
export interface USNutrientValue {
  unit: string;
  rda?: number | null;  // Recommended Dietary Allowance
  ai?: number | null;   // Adequate Intake
  ul?: number | null;   // Tolerable Upper Intake Level
}

// India specific nutrient value structure (same as US)
export interface IndiaNutrientValue {
  unit: string;
  rda?: number | null;  // Recommended Dietary Allowance
  ai?: number | null;   // Adequate Intake
  ul?: number | null;   // Upper Limit
}

// Generic nutrient value that can accommodate any country
export type NutrientValue = UKNutrientValue | USNutrientValue | IndiaNutrientValue;

// Type guard functions
export function isUKNutrient(value: NutrientValue): value is UKNutrientValue {
  return 'rni' in value || 'lrni' in value || 'sui' in value;
}

export function isUSNutrient(value: NutrientValue): value is USNutrientValue {
  return 'rda' in value || 'ai' in value || 'ul' in value;
}

export function isIndiaNutrient(value: NutrientValue): value is IndiaNutrientValue {
  return 'rda' in value || 'ai' in value || 'ul' in value;
}

// Micronutrient guidelines structure from database
export interface MicronutrientGuidelines {
  id?: number;
  country: 'UK' | 'US' | 'India';
  gender: 'male' | 'female';
  age_min: number;
  age_max: number;
  micronutrients: Record<string, NutrientValue>;
  guideline_type: 'UK_COMA' | 'US_DRI' | 'INDIA_ICMR';
  source?: string;
  source_year?: number;
  version?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// Client micronutrient requirements
export interface ClientMicronutrientRequirements {
  id?: string;
  client_id: string;
  micronutrient_recommendations: Record<string, NutrientValue>;
  country_guideline: 'UK' | 'US' | 'India';
  guideline_type: 'UK_COMA' | 'US_DRI' | 'INDIA_ICMR';
  calculation_method?: string;
  calculation_factors?: Record<string, any>;
  is_ai_generated?: boolean;
  is_professionally_reviewed?: boolean;
  nutritionist_notes?: string;
  custom_adjustments?: Record<string, any>;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

// Helper type for primary value with all values
export interface NutrientWithPrimaryValue {
  unit: string;
  primary_value: number | null;
  all_values: NutrientValue;
}

// Utility functions

/**
 * Get the primary recommended value based on country and preference order
 */
export function getPrimaryValue(
  nutrient: NutrientValue,
  country: 'UK' | 'US' | 'India',
  preferenceOrder?: string[]
): number | null {
  if (country === 'UK' && isUKNutrient(nutrient)) {
    // Default UK preference: RNI > SUI > LRNI
    const order = preferenceOrder || ['rni', 'sui', 'lrni'];
    for (const field of order) {
      const value = nutrient[field as keyof UKNutrientValue];
      if (value !== null && value !== undefined) {
        return value as number;
      }
    }
  } else if ((country === 'US' || country === 'India') && (isUSNutrient(nutrient) || isIndiaNutrient(nutrient))) {
    // Default US/India preference: RDA > AI
    const order = preferenceOrder || ['rda', 'ai'];
    for (const field of order) {
      const value = nutrient[field as keyof USNutrientValue];
      if (value !== null && value !== undefined) {
        return value as number;
      }
    }
  }
  
  return null;
}

/**
 * Get the upper limit value based on country
 */
export function getUpperLimit(nutrient: NutrientValue, country: 'UK' | 'US' | 'India'): number | null {
  if (country === 'UK' && isUKNutrient(nutrient)) {
    return nutrient.sui || null;
  } else if ((country === 'US' || country === 'India') && (isUSNutrient(nutrient) || isIndiaNutrient(nutrient))) {
    return (nutrient as USNutrientValue | IndiaNutrientValue).ul || null;
  }
  return null;
}

/**
 * Get the lower safe limit (only for UK)
 */
export function getLowerLimit(nutrient: NutrientValue, country: 'UK' | 'US' | 'India'): number | null {
  if (country === 'UK' && isUKNutrient(nutrient)) {
    return nutrient.lrni || null;
  }
  // US and India don't have a lower limit concept
  return null;
}

/**
 * Format nutrient value with unit
 */
export function formatNutrientValue(value: number | null, unit: string): string {
  if (value === null || value === undefined) return 'N/A';
  return `${value} ${unit}`;
}

/**
 * Get all available values for a nutrient
 */
export function getAllValues(nutrient: NutrientValue, country: 'UK' | 'US' | 'India'): Record<string, string> {
  const result: Record<string, string> = {};
  
  if (country === 'UK' && isUKNutrient(nutrient)) {
    if (nutrient.rni !== null && nutrient.rni !== undefined) result['RNI'] = formatNutrientValue(nutrient.rni, nutrient.unit);
    if (nutrient.lrni !== null && nutrient.lrni !== undefined) result['LRNI'] = formatNutrientValue(nutrient.lrni, nutrient.unit);
    if (nutrient.sui !== null && nutrient.sui !== undefined) result['Safe Upper Intake'] = formatNutrientValue(nutrient.sui, nutrient.unit);
  } else if ((country === 'US' || country === 'India')) {
    const usIndiaValue = nutrient as USNutrientValue | IndiaNutrientValue;
    if (usIndiaValue.rda !== null && usIndiaValue.rda !== undefined) result['RDA'] = formatNutrientValue(usIndiaValue.rda, usIndiaValue.unit);
    if (usIndiaValue.ai !== null && usIndiaValue.ai !== undefined) result['AI'] = formatNutrientValue(usIndiaValue.ai, usIndiaValue.unit);
    if (usIndiaValue.ul !== null && usIndiaValue.ul !== undefined) result['UL'] = formatNutrientValue(usIndiaValue.ul, usIndiaValue.unit);
  }
  
  return result;
}

// Common micronutrient keys for reference
export const MICRONUTRIENT_KEYS = {
  // Vitamins
  VITAMIN_A: 'vitamin_a',
  VITAMIN_D: 'vitamin_d',
  VITAMIN_E: 'vitamin_e',
  VITAMIN_K: 'vitamin_k',
  THIAMIN: 'thiamin',
  RIBOFLAVIN: 'riboflavin',
  NIACIN: 'niacin',
  VITAMIN_B6: 'vitamin_b6',
  VITAMIN_B12: 'vitamin_b12',
  FOLATE: 'folate',
  VITAMIN_C: 'vitamin_c',
  
  // Minerals
  CALCIUM: 'calcium',
  PHOSPHORUS: 'phosphorus',
  MAGNESIUM: 'magnesium',
  SODIUM: 'sodium',
  POTASSIUM: 'potassium',
  CHLORIDE: 'chloride',
  IRON: 'iron',
  ZINC: 'zinc',
  COPPER: 'copper',
  SELENIUM: 'selenium',
  IODINE: 'iodine'
} as const;

// Type for micronutrient key
export type MicronutrientKey = typeof MICRONUTRIENT_KEYS[keyof typeof MICRONUTRIENT_KEYS]; 