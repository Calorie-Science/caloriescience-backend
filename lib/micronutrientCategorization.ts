// Micronutrient categorization utility
// This file provides functions to categorize micronutrients into logical groups

export interface CategorizedMicronutrients {
  vitamins: Record<string, any>;
  minerals: Record<string, any>;
  miscellaneous: Record<string, any>;
}

// Define which micronutrients belong to which category
const VITAMIN_KEYS = [
  'vitamin_a', 'vitamin_d', 'vitamin_e', 'vitamin_k',
  'thiamin', 'riboflavin', 'niacin', 'vitamin_b6', 'vitamin_b12',
  'folate', 'vitamin_c', 'biotin', 'pantothenic_acid'
];

const MINERAL_KEYS = [
  'calcium', 'phosphorus', 'magnesium', 'sodium', 'potassium',
  'chloride', 'iron', 'zinc', 'copper', 'selenium', 'iodine',
  'manganese', 'molybdenum', 'chromium', 'fluoride'
];

/**
 * Categorize micronutrients into vitamins, minerals, and miscellaneous
 * @param micronutrients - Raw micronutrient data from database
 * @param convertToCamelCase - Whether to convert keys to camelCase for API responses
 * @returns Categorized micronutrients object
 */
export function categorizeMicronutrients(micronutrients: Record<string, any>, convertToCamelCase: boolean = false): CategorizedMicronutrients {
  const categorized: CategorizedMicronutrients = {
    vitamins: {},
    minerals: {},
    miscellaneous: {}
  };

  // Helper function to convert snake_case to camelCase
  const toCamelCase = (str: string): string => {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  };

  // Process each micronutrient
  Object.entries(micronutrients).forEach(([key, value]) => {
    const normalizedKey = key.toLowerCase();
    const outputKey = convertToCamelCase ? toCamelCase(key) : key;
    
    if (VITAMIN_KEYS.includes(normalizedKey)) {
      categorized.vitamins[outputKey] = value;
    } else if (MINERAL_KEYS.includes(normalizedKey)) {
      categorized.minerals[outputKey] = value;
    } else {
      // Any other micronutrients go to miscellaneous
      categorized.miscellaneous[outputKey] = value;
    }
  });

  return categorized;
}

/**
 * Get a summary of micronutrient categories with counts
 * @param categorized - Categorized micronutrients
 * @returns Summary object with counts
 */
export function getMicronutrientSummary(categorized: CategorizedMicronutrients) {
  return {
    vitamins: {
      count: Object.keys(categorized.vitamins).length,
      nutrients: Object.keys(categorized.vitamins)
    },
    minerals: {
      count: Object.keys(categorized.minerals).length,
      nutrients: Object.keys(categorized.minerals)
    },
    miscellaneous: {
      count: Object.keys(categorized.miscellaneous).length,
      nutrients: Object.keys(categorized.miscellaneous)
    }
  };
}
