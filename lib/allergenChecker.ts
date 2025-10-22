/**
 * Allergen Conflict Detection Utility
 * Checks if recipes contain allergens that conflict with client dietary preferences
 */

import { VALID_ALLERGENS, normalizeAllergen, ValidAllergen as ImportedValidAllergen } from './allergenPreferenceValidation';

// Re-export ValidAllergen type for convenience
export type ValidAllergen = ImportedValidAllergen;

/**
 * Map health labels to allergens
 * Inverse mapping from the mapAllergensToHealthLabels function
 */
const HEALTH_LABEL_TO_ALLERGEN_MAP: Record<string, ImportedValidAllergen> = {
  'peanut-free': 'peanuts',
  'tree-nut-free': 'tree nuts',
  'dairy-free': 'dairy',
  'egg-free': 'eggs',
  'soy-free': 'soy',
  'wheat-free': 'wheat',
  'gluten-free': 'gluten',
  'fish-free': 'fish',
  'shellfish-free': 'shellfish',
  'sesame-free': 'sesame',
  'sulfite-free': 'sulfites'
};

/**
 * Extract allergens from recipe health labels
 * If a recipe does NOT have a "-free" label, it means it CONTAINS that allergen
 */
export function extractAllergensFromHealthLabels(healthLabels: string[]): ImportedValidAllergen[] {
  const allergens: Set<ImportedValidAllergen> = new Set();
  const healthLabelsLower = healthLabels.map(label => label.toLowerCase());
  
  // Check each possible allergen
  // If the recipe doesn't have the "-free" label, it may contain that allergen
  // However, we can only be certain if the recipe explicitly has it marked
  // For now, we'll use explicit allergen arrays when available
  
  return Array.from(allergens);
}

/**
 * Ingredient keywords that indicate specific allergens
 */
const ALLERGEN_INGREDIENT_KEYWORDS: Record<ImportedValidAllergen, string[]> = {
  'dairy': ['milk', 'cheese', 'paneer', 'butter', 'cream', 'yogurt', 'ghee', 'curd', 'whey', 'casein', 'lactose'],
  'eggs': ['egg', 'eggs', 'mayonnaise'],
  'peanuts': ['peanut', 'peanuts'],
  'tree nuts': ['almond', 'almonds', 'cashew', 'cashews', 'walnut', 'walnuts', 'pecan', 'pecans', 'hazelnut', 'macadamia', 'pistachio'],
  'soy': ['soy', 'tofu', 'edamame', 'miso', 'tempeh'],
  'wheat': ['wheat', 'flour', 'bread', 'pasta'],
  'gluten': ['wheat', 'barley', 'rye', 'flour', 'bread'],
  'fish': ['fish', 'salmon', 'tuna', 'cod', 'tilapia'],
  'shellfish': ['shrimp', 'crab', 'lobster', 'oyster', 'clam', 'mussel'],
  'sesame': ['sesame', 'tahini'],
  'sulfites': ['sulfite', 'sulfites']
};

/**
 * Check if recipe ingredients contain allergen keywords
 */
function checkIngredientsForAllergens(
  ingredients: Array<{ name?: string; food?: string; [key: string]: any }> | null | undefined,
  clientAllergens: Set<ImportedValidAllergen>
): Set<ImportedValidAllergen> {
  const foundAllergens = new Set<ImportedValidAllergen>();
  
  if (!ingredients || ingredients.length === 0) {
    return foundAllergens;
  }
  
  // Get all ingredient names
  const ingredientNames = ingredients
    .map(ing => (ing.name || ing.food || '').toLowerCase())
    .filter(name => name.length > 0);
  
  // Check each client allergen
  for (const allergen of clientAllergens) {
    const keywords = ALLERGEN_INGREDIENT_KEYWORDS[allergen] || [];
    
    // Check if any keyword appears in any ingredient
    for (const keyword of keywords) {
      if (ingredientNames.some(name => name.includes(keyword))) {
        foundAllergens.add(allergen);
        break; // Found this allergen, no need to check other keywords
      }
    }
  }
  
  return foundAllergens;
}

/**
 * Normalize client allergen input - handles both "dairy" and "dairy-free" formats
 * Converts "-free" format to base allergen name
 */
export function normalizeClientAllergen(input: string): ImportedValidAllergen | null {
  const trimmed = input.toLowerCase().trim();
  
  // Remove "-free" suffix if present to get the base allergen
  // e.g., "dairy-free" → "dairy"
  const withoutFreeSuffix = trimmed.replace(/-free$/i, '');
  
  // Try normalizing the processed string
  const normalized = normalizeAllergen(withoutFreeSuffix);
  if (normalized) {
    return normalized;
  }
  
  // If that didn't work, try the original string
  return normalizeAllergen(trimmed);
}

/**
 * Normalize recipe allergens to match our standard allergen list
 */
export function normalizeRecipeAllergens(recipeAllergens: string[]): ImportedValidAllergen[] {
  const normalized: Set<ImportedValidAllergen> = new Set();
  
  for (const allergen of recipeAllergens) {
    const normalizedAllergen = normalizeClientAllergen(allergen);
    if (normalizedAllergen) {
      normalized.add(normalizedAllergen);
    }
  }
  
  return Array.from(normalized);
}

/**
 * Check if a recipe contains any allergens that conflict with client preferences
 * @param recipeAllergens - Array of allergens present in the recipe
 * @param recipeHealthLabels - Health labels from the recipe (e.g., "peanut-free", "dairy-free")
 * @param clientAllergens - Array of allergens the client is allergic to
 * @param recipeIngredients - Optional array of recipe ingredients to scan for allergen keywords
 * @returns Object with hasConflict flag and array of conflicting allergens
 */
export function checkAllergenConflicts(
  recipeAllergens: string[] | null | undefined,
  recipeHealthLabels: string[] | null | undefined,
  clientAllergens: string[] | null | undefined,
  recipeIngredients?: Array<{ name?: string; food?: string; [key: string]: any }> | null
): {
  hasConflict: boolean;
  conflictingAllergens: ImportedValidAllergen[];
  warning?: string;
} {
  // If client has no allergens, no conflict
  if (!clientAllergens || clientAllergens.length === 0) {
    return {
      hasConflict: false,
      conflictingAllergens: []
    };
  }

  // Normalize client allergens (handles both "dairy" and "dairy-free" formats)
  const normalizedClientAllergens = new Set<ImportedValidAllergen>();
  for (const allergen of clientAllergens) {
    const normalized = normalizeClientAllergen(allergen);
    if (normalized) {
      normalizedClientAllergens.add(normalized);
    }
  }

  // If no valid client allergens after normalization, no conflict
  if (normalizedClientAllergens.size === 0) {
    return {
      hasConflict: false,
      conflictingAllergens: []
    };
  }

  const conflictingAllergens = new Set<ImportedValidAllergen>();

  // Check explicit recipe allergens first (most reliable)
  if (recipeAllergens && recipeAllergens.length > 0) {
    const normalizedRecipeAllergens = normalizeRecipeAllergens(recipeAllergens);
    
    for (const recipeAllergen of normalizedRecipeAllergens) {
      if (normalizedClientAllergens.has(recipeAllergen)) {
        conflictingAllergens.add(recipeAllergen);
      }
    }
  }

  // Also check health labels for additional allergen information
  // If recipe has health labels (showing it's been labeled) but is missing the "-free" label, flag it
  if (recipeHealthLabels && recipeHealthLabels.length > 0) {
    const healthLabelsLower = recipeHealthLabels.map(label => label.toLowerCase());
    
    // Count how many "-free" labels this recipe has (indicates it's been properly labeled)
    const freeLabelsCount = healthLabelsLower.filter(label => label.endsWith('-free')).length;
    
    // Only check health labels if recipe has been properly labeled (has at least 2 "-free" labels)
    // This avoids false positives on recipes with incomplete labeling
    if (freeLabelsCount >= 2) {
      // Check each client allergen
      for (const clientAllergen of Array.from(normalizedClientAllergens)) {
        // Map client allergen to the expected "-free" health label
        const expectedFreeLabel = getFreeLabelForAllergen(clientAllergen);
        
        // If the recipe does NOT have the "-free" label, it contains the allergen
        // This catches cases like paneer (dairy) where recipe doesn't explicitly list "dairy" 
        // in allergens array but also doesn't have "Dairy-Free" in healthLabels
        if (expectedFreeLabel && !healthLabelsLower.includes(expectedFreeLabel.toLowerCase())) {
          conflictingAllergens.add(clientAllergen);
        }
      }
    }
  }

  // NEW: Also check recipe ingredients for allergen keywords (e.g., "paneer" for dairy)
  // This catches recipes that don't have proper healthLabels but clearly contain allergens
  if (recipeIngredients && recipeIngredients.length > 0) {
    const ingredientAllergens = checkIngredientsForAllergens(recipeIngredients, normalizedClientAllergens);
    for (const allergen of ingredientAllergens) {
      conflictingAllergens.add(allergen);
    }
  }

  return {
    hasConflict: conflictingAllergens.size > 0,
    conflictingAllergens: Array.from(conflictingAllergens),
    warning: conflictingAllergens.size > 0 
      ? `Recipe contains allergen(s): ${Array.from(conflictingAllergens).join(', ')}` 
      : undefined
  };
}

/**
 * Get the "-free" health label for an allergen
 */
function getFreeLabelForAllergen(allergen: ImportedValidAllergen): string {
  const mapping: Record<ImportedValidAllergen, string> = {
    'peanuts': 'peanut-free',
    'tree nuts': 'tree-nut-free',
    'dairy': 'dairy-free',
    'eggs': 'egg-free',
    'soy': 'soy-free',
    'wheat': 'wheat-free',
    'gluten': 'gluten-free',
    'fish': 'fish-free',
    'shellfish': 'shellfish-free',
    'sesame': 'sesame-free',
    'sulfites': 'sulfite-free'
  };
  
  return mapping[allergen] || '';
}

/**
 * Check multiple recipes for allergen conflicts
 * Useful for recipe search results
 */
export function checkMultipleRecipesForConflicts(
  recipes: Array<{
    id: string;
    allergens?: string[] | null;
    healthLabels?: string[] | null;
    [key: string]: any;
  }>,
  clientAllergens: string[] | null | undefined
): Array<{
  recipeId: string;
  hasConflict: boolean;
  conflictingAllergens: ImportedValidAllergen[];
  warning?: string;
}> {
  return recipes.map(recipe => ({
    recipeId: recipe.id,
    ...checkAllergenConflicts(recipe.allergens, recipe.healthLabels, clientAllergens)
  }));
}

/**
 * Add allergen conflict information to recipe objects
 */
export function enrichRecipesWithAllergenInfo<T extends {
  id: string;
  allergens?: string[] | null;
  healthLabels?: string[] | null;
  [key: string]: any;
}>(
  recipes: T[],
  clientAllergens: string[] | null | undefined
): Array<T & {
  allergenConflict?: {
    hasConflict: boolean;
    conflictingAllergens: ImportedValidAllergen[];
    warning?: string;
  };
}> {
  return recipes.map(recipe => {
    const conflictInfo = checkAllergenConflicts(
      recipe.allergens,
      recipe.healthLabels,
      clientAllergens
    );
    
    return {
      ...recipe,
      allergenConflict: conflictInfo.hasConflict ? conflictInfo : undefined
    };
  });
}

