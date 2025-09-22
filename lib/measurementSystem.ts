/**
 * Measurement System Utilities
 * 
 * Handles conversion between metric and imperial measurement systems
 * for nutritional values, weights, volumes, and serving sizes.
 */

export type MeasurementSystem = 'metric' | 'imperial';

export interface ConversionResult {
  value: number;
  unit: string;
  originalValue: number;
  originalUnit: string;
  system: MeasurementSystem;
}

// Weight conversions
export const WEIGHT_CONVERSIONS = {
  // kg to lbs
  kg_to_lbs: 2.20462,
  // g to oz
  g_to_oz: 0.035274,
  // lbs to kg
  lbs_to_kg: 0.453592,
  // oz to g
  oz_to_g: 28.3495
} as const;

// Volume conversions
export const VOLUME_CONVERSIONS = {
  // ml to fl oz
  ml_to_fl_oz: 0.033814,
  // L to fl oz
  l_to_fl_oz: 33.814,
  // ml to cups (US)
  ml_to_cups: 0.004227,
  // L to cups (US)
  l_to_cups: 4.227,
  // fl oz to ml
  fl_oz_to_ml: 29.5735,
  // cups to ml
  cups_to_ml: 236.588
} as const;

// Length conversions (for height)
export const LENGTH_CONVERSIONS = {
  // cm to inches
  cm_to_inches: 0.393701,
  // inches to cm
  inches_to_cm: 2.54,
  // m to feet
  m_to_feet: 3.28084,
  // feet to m
  feet_to_m: 0.3048
} as const;

/**
 * Convert weight values between metric and imperial systems
 */
export function convertWeight(value: number, fromUnit: string, toSystem: MeasurementSystem): ConversionResult {
  const normalizedFromUnit = fromUnit.toLowerCase();
  let convertedValue: number;
  let targetUnit: string;

  if (toSystem === 'imperial') {
    // Convert to imperial
    switch (normalizedFromUnit) {
      case 'kg':
      case 'kilogram':
      case 'kilograms':
        convertedValue = value * WEIGHT_CONVERSIONS.kg_to_lbs;
        targetUnit = value === 1 ? 'lb' : 'lbs';
        break;
      case 'g':
      case 'gram':
      case 'grams':
        convertedValue = value * WEIGHT_CONVERSIONS.g_to_oz;
        targetUnit = convertedValue === 1 ? 'oz' : 'oz';
        break;
      default:
        // Already imperial or unknown
        convertedValue = value;
        targetUnit = fromUnit;
    }
  } else {
    // Convert to metric
    switch (normalizedFromUnit) {
      case 'lb':
      case 'lbs':
      case 'pound':
      case 'pounds':
        convertedValue = value * WEIGHT_CONVERSIONS.lbs_to_kg;
        targetUnit = 'kg';
        break;
      case 'oz':
      case 'ounce':
      case 'ounces':
        convertedValue = value * WEIGHT_CONVERSIONS.oz_to_g;
        targetUnit = 'g';
        break;
      default:
        // Already metric or unknown
        convertedValue = value;
        targetUnit = fromUnit;
    }
  }

  return {
    value: Math.round(convertedValue * 10) / 10, // Round to 1 decimal place
    unit: targetUnit,
    originalValue: value,
    originalUnit: fromUnit,
    system: toSystem
  };
}

/**
 * Convert volume values between metric and imperial systems
 */
export function convertVolume(value: number, fromUnit: string, toSystem: MeasurementSystem): ConversionResult {
  const normalizedFromUnit = fromUnit.toLowerCase();
  let convertedValue: number;
  let targetUnit: string;

  if (toSystem === 'imperial') {
    // Convert to imperial
    switch (normalizedFromUnit) {
      case 'ml':
      case 'milliliter':
      case 'milliliters':
        // Prefer cups for larger volumes, fl oz for smaller
        if (value >= 237) { // ~1 cup
          convertedValue = value * VOLUME_CONVERSIONS.ml_to_cups;
          targetUnit = convertedValue === 1 ? 'cup' : 'cups';
          // Round to common fractions
          convertedValue = roundToCommonFraction(convertedValue);
        } else {
          convertedValue = value * VOLUME_CONVERSIONS.ml_to_fl_oz;
          targetUnit = 'fl oz';
        }
        break;
      case 'l':
      case 'liter':
      case 'liters':
        convertedValue = value * VOLUME_CONVERSIONS.l_to_cups;
        targetUnit = convertedValue === 1 ? 'cup' : 'cups';
        convertedValue = roundToCommonFraction(convertedValue);
        break;
      default:
        // Already imperial or unknown
        convertedValue = value;
        targetUnit = fromUnit;
    }
  } else {
    // Convert to metric
    switch (normalizedFromUnit) {
      case 'cup':
      case 'cups':
        convertedValue = value * VOLUME_CONVERSIONS.cups_to_ml;
        targetUnit = 'ml';
        break;
      case 'fl oz':
      case 'fluid ounce':
      case 'fluid ounces':
        convertedValue = value * VOLUME_CONVERSIONS.fl_oz_to_ml;
        targetUnit = 'ml';
        break;
      default:
        // Already metric or unknown
        convertedValue = value;
        targetUnit = fromUnit;
    }
  }

  return {
    value: Math.round(convertedValue * 10) / 10, // Round to 1 decimal place
    unit: targetUnit,
    originalValue: value,
    originalUnit: fromUnit,
    system: toSystem
  };
}

/**
 * Convert height values between metric and imperial systems
 */
export function convertHeight(value: number, fromUnit: string, toSystem: MeasurementSystem): ConversionResult {
  const normalizedFromUnit = fromUnit.toLowerCase();
  let convertedValue: number;
  let targetUnit: string;

  if (toSystem === 'imperial') {
    // Convert to imperial
    switch (normalizedFromUnit) {
      case 'cm':
      case 'centimeter':
      case 'centimeters':
        // Convert to feet and inches
        const totalInches = value * LENGTH_CONVERSIONS.cm_to_inches;
        const feet = Math.floor(totalInches / 12);
        const inches = totalInches % 12;
        convertedValue = totalInches;
        targetUnit = `${feet}'${Math.round(inches * 10) / 10}"`;
        break;
      case 'm':
      case 'meter':
      case 'meters':
        const totalInchesFromM = value * LENGTH_CONVERSIONS.m_to_feet * 12;
        const feetFromM = Math.floor(totalInchesFromM / 12);
        const inchesFromM = totalInchesFromM % 12;
        convertedValue = totalInchesFromM;
        targetUnit = `${feetFromM}'${Math.round(inchesFromM * 10) / 10}"`;
        break;
      default:
        // Already imperial or unknown
        convertedValue = value;
        targetUnit = fromUnit;
    }
  } else {
    // Convert to metric
    switch (normalizedFromUnit) {
      case 'in':
      case 'inch':
      case 'inches':
        convertedValue = value * LENGTH_CONVERSIONS.inches_to_cm;
        targetUnit = 'cm';
        break;
      case 'ft':
      case 'feet':
        convertedValue = value * LENGTH_CONVERSIONS.feet_to_m * 100; // Convert to cm
        targetUnit = 'cm';
        break;
      default:
        // Parse feet'inches" format
        const feetInchesMatch = fromUnit.match(/(\d+)'(\d+(?:\.\d+)?)"/);
        if (feetInchesMatch) {
          const feet = parseInt(feetInchesMatch[1]);
          const inches = parseFloat(feetInchesMatch[2]);
          const totalInches = feet * 12 + inches;
          convertedValue = totalInches * LENGTH_CONVERSIONS.inches_to_cm;
          targetUnit = 'cm';
        } else {
          // Already metric or unknown
          convertedValue = value;
          targetUnit = fromUnit;
        }
    }
  }

  return {
    value: Math.round(convertedValue * 10) / 10, // Round to 1 decimal place
    unit: targetUnit,
    originalValue: value,
    originalUnit: fromUnit,
    system: toSystem
  };
}

/**
 * Round volume measurements to common fractions for better UX
 */
function roundToCommonFraction(value: number): number {
  const commonFractions = [
    { decimal: 0.125, fraction: 1/8 },
    { decimal: 0.25, fraction: 1/4 },
    { decimal: 0.333, fraction: 1/3 },
    { decimal: 0.5, fraction: 1/2 },
    { decimal: 0.667, fraction: 2/3 },
    { decimal: 0.75, fraction: 3/4 },
    { decimal: 0.875, fraction: 7/8 }
  ];

  const wholeNumber = Math.floor(value);
  const fractionalPart = value - wholeNumber;

  // Find closest common fraction
  let closestFraction = fractionalPart;
  let minDifference = Infinity;

  for (const { fraction } of commonFractions) {
    const difference = Math.abs(fractionalPart - fraction);
    if (difference < minDifference) {
      minDifference = difference;
      closestFraction = fraction;
    }
  }

  // Only use common fraction if it's close enough (within 0.05)
  if (minDifference <= 0.05) {
    return wholeNumber + closestFraction;
  }

  // Otherwise round to 1 decimal place
  return Math.round(value * 10) / 10;
}

/**
 * Convert serving size descriptions
 */
export function convertServingSize(servingText: string, toSystem: MeasurementSystem): string {
  if (!servingText) return servingText;

  // Extract numeric value and unit from serving text
  const patterns = [
    /(\d+(?:\.\d+)?)\s*(g|gram|grams|kg|kilogram|kilograms)/gi,
    /(\d+(?:\.\d+)?)\s*(ml|milliliter|milliliters|l|liter|liters)/gi,
    /(\d+(?:\.\d+)?)\s*(oz|ounce|ounces|lb|lbs|pound|pounds)/gi,
    /(\d+(?:\.\d+)?)\s*(cup|cups|fl\s*oz|fluid\s*ounce|fluid\s*ounces)/gi
  ];

  let convertedText = servingText;

  for (const pattern of patterns) {
    convertedText = convertedText.replace(pattern, (match, value, unit) => {
      const numericValue = parseFloat(value);
      
      // Determine if this is weight or volume
      const weightUnits = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms', 'oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds'];
      const volumeUnits = ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters', 'cup', 'cups', 'fl oz', 'fluid ounce', 'fluid ounces'];
      
      let converted: ConversionResult;
      
      if (weightUnits.includes(unit.toLowerCase())) {
        converted = convertWeight(numericValue, unit, toSystem);
      } else if (volumeUnits.includes(unit.toLowerCase())) {
        converted = convertVolume(numericValue, unit, toSystem);
      } else {
        return match; // No conversion needed
      }
      
      return `${converted.value} ${converted.unit}`;
    });
  }

  return convertedText;
}

/**
 * Format nutritional values according to measurement system
 */
export interface NutritionalValue {
  value: number;
  unit: string;
  name: string;
}

export function formatNutritionalValue(
  nutritionalValue: NutritionalValue,
  measurementSystem: MeasurementSystem
): string {
  const { value, unit, name } = nutritionalValue;
  
  // Most nutritional values stay in their original units regardless of system
  // Exception: larger weight measurements might be converted
  if (measurementSystem === 'imperial' && unit === 'g' && value >= 28) {
    const converted = convertWeight(value, unit, measurementSystem);
    return `${converted.value} ${converted.unit}`;
  }
  
  // For very small amounts, keep original precision
  if (value < 1) {
    return `${Math.round(value * 100) / 100} ${unit}`;
  }
  
  // Round to 1 decimal place for display
  return `${Math.round(value * 10) / 10} ${unit}`;
}

/**
 * Get system label for UI display
 */
export function getSystemLabel(system: MeasurementSystem): string {
  return system === 'metric' ? 'Metric' : 'Imperial';
}

/**
 * Get measurement system from country/locale
 */
export function getDefaultMeasurementSystem(country: string): MeasurementSystem {
  const imperialCountries = ['us', 'usa', 'united states', 'myanmar', 'liberia'];
  const normalizedCountry = country.toLowerCase().trim();
  
  return imperialCountries.includes(normalizedCountry) ? 'imperial' : 'metric';
}

/**
 * Format date to DD-MON-YYYY format as required
 */
export function formatDateDDMonYYYY(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }
  
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];
  
  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  
  return `${day}-${month}-${year}`;
}

/**
 * Parse DD-MON-YYYY format back to Date object
 */
export function parseDateDDMonYYYY(dateString: string): Date | null {
  const months = [
    'JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'
  ];
  
  const match = dateString.match(/^(\d{2})-([A-Z]{3})-(\d{4})$/);
  if (!match) return null;
  
  const [, day, monthStr, year] = match;
  const monthIndex = months.indexOf(monthStr.toUpperCase());
  
  if (monthIndex === -1) return null;
  
  return new Date(parseInt(year), monthIndex, parseInt(day));
}
