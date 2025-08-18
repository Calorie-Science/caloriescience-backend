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

// EU specific nutrient value structure
export interface EUNutrientValue {
  unit: string;
  ar?: number | null;   // Average Requirement
  pri?: number | null;  // Population Reference Intake
  ai?: number | null;   // Adequate Intake
  ul?: number | null;   // Tolerable Upper Level
  safe_adequate?: number | null; // Safe and adequate intake
  notes?: string | null; // Additional notes (e.g., "per MJ", "UL for supplements only")
}

// WHO specific nutrient value structure
export interface WHONutrientValue {
  unit: string;
  ear?: number | null;  // Estimated Average Requirement
  rni?: number | null;  // Recommended Nutrient Intake
  ai?: number | null;   // Adequate Intake
  ul?: number | null;   // Upper Level
  lrni?: number | null; // Lower Reference Nutrient Intake
  notes?: string | null; // Additional notes (e.g., bioavailability)
}

// Generic nutrient value that can accommodate any country
export type NutrientValue = UKNutrientValue | USNutrientValue | IndiaNutrientValue | EUNutrientValue | WHONutrientValue;

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

export function isEUNutrient(value: NutrientValue): value is EUNutrientValue {
  return 'ar' in value || 'pri' in value || 'safe_adequate' in value;
}

export function isWHONutrient(value: NutrientValue): value is WHONutrientValue {
  return 'rni' in value && 'ear' in value;
}

// Micronutrient guidelines structure from database
export interface MicronutrientGuidelines {
  id?: number;
  country: 'UK' | 'US' | 'India' | 'EU' | 'WHO';
  gender: 'male' | 'female';
  age_min: number;
  age_max: number;
  micronutrients: Record<string, NutrientValue>;
  guideline_type: 'UK_COMA' | 'US_DRI' | 'INDIA_ICMR' | 'EFSA_DRV' | 'WHO_FAO';
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
  country_guideline: 'UK' | 'US' | 'India' | 'EU' | 'WHO';
  guideline_type: 'UK_COMA' | 'US_DRI' | 'INDIA_ICMR' | 'EFSA_DRV' | 'WHO_FAO';
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
  country: 'UK' | 'US' | 'India' | 'EU' | 'WHO',
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
  } else if (country === 'EU' && isEUNutrient(nutrient)) {
    // Default EU preference: PRI > AI > AR > Safe Adequate
    const order = preferenceOrder || ['pri', 'ai', 'ar', 'safe_adequate'];
    for (const field of order) {
      const value = nutrient[field as keyof EUNutrientValue];
      if (value !== null && value !== undefined && typeof value === 'number') {
        return value;
      }
    }
  } else if (country === 'WHO' && isWHONutrient(nutrient)) {
    // Default WHO preference: RNI > AI > EAR > LRNI
    const order = preferenceOrder || ['rni', 'ai', 'ear', 'lrni'];
    for (const field of order) {
      const value = nutrient[field as keyof WHONutrientValue];
      if (value !== null && value !== undefined && typeof value === 'number') {
        return value;
      }
    }
  }
  
  return null;
}

/**
 * Get the upper limit value based on country
 */
export function getUpperLimit(nutrient: NutrientValue, country: 'UK' | 'US' | 'India' | 'EU' | 'WHO'): number | null {
  if (country === 'UK' && isUKNutrient(nutrient)) {
    return nutrient.sui || null;
  } else if ((country === 'US' || country === 'India') && (isUSNutrient(nutrient) || isIndiaNutrient(nutrient))) {
    return (nutrient as USNutrientValue | IndiaNutrientValue).ul || null;
  } else if (country === 'EU' && isEUNutrient(nutrient)) {
    return nutrient.ul || null;
  } else if (country === 'WHO' && isWHONutrient(nutrient)) {
    return nutrient.ul || null;
  }
  return null;
}

/**
 * Get the lower safe limit (only for UK)
 */
export function getLowerLimit(nutrient: NutrientValue, country: 'UK' | 'US' | 'India' | 'EU' | 'WHO'): number | null {
  if (country === 'UK' && isUKNutrient(nutrient)) {
    return nutrient.lrni || null;
  } else if (country === 'EU' && isEUNutrient(nutrient)) {
    // EU uses AR (Average Requirement) as a lower reference point
    return nutrient.ar || null;
  } else if (country === 'WHO' && isWHONutrient(nutrient)) {
    // WHO has LRNI (Lower Reference Nutrient Intake) or EAR
    return nutrient.lrni || nutrient.ear || null;
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
export function getAllValues(nutrient: NutrientValue, country: 'UK' | 'US' | 'India' | 'EU' | 'WHO'): Record<string, string> {
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
  } else if (country === 'EU' && isEUNutrient(nutrient)) {
    if (nutrient.ar !== null && nutrient.ar !== undefined) result['AR'] = formatNutrientValue(nutrient.ar, nutrient.unit);
    if (nutrient.pri !== null && nutrient.pri !== undefined) result['PRI'] = formatNutrientValue(nutrient.pri, nutrient.unit);
    if (nutrient.ai !== null && nutrient.ai !== undefined) result['AI'] = formatNutrientValue(nutrient.ai, nutrient.unit);
    if (nutrient.ul !== null && nutrient.ul !== undefined) result['UL'] = formatNutrientValue(nutrient.ul, nutrient.unit);
    if (nutrient.safe_adequate !== null && nutrient.safe_adequate !== undefined) result['Safe & Adequate'] = formatNutrientValue(nutrient.safe_adequate, nutrient.unit);
  } else if (country === 'WHO' && isWHONutrient(nutrient)) {
    if (nutrient.ear !== null && nutrient.ear !== undefined) result['EAR'] = formatNutrientValue(nutrient.ear, nutrient.unit);
    if (nutrient.rni !== null && nutrient.rni !== undefined) result['RNI'] = formatNutrientValue(nutrient.rni, nutrient.unit);
    if (nutrient.ai !== null && nutrient.ai !== undefined) result['AI'] = formatNutrientValue(nutrient.ai, nutrient.unit);
    if (nutrient.ul !== null && nutrient.ul !== undefined) result['UL'] = formatNutrientValue(nutrient.ul, nutrient.unit);
    if (nutrient.lrni !== null && nutrient.lrni !== undefined) result['LRNI'] = formatNutrientValue(nutrient.lrni, nutrient.unit);
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