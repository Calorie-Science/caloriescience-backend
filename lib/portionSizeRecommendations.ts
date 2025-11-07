/**
 * Portion Size Recommendations based on Food Categories
 *
 * This module provides intelligent portion size recommendations for custom recipes
 * based on USDA FNDDS data and food science research.
 */

import {
  FoodCategory,
  CATEGORY_PORTION_SIZES,
  DENSITY_REFERENCES,
  MEASUREMENT_PRIORITIES,
  getPortionSizesForCategory,
  getDensityForCategory,
  getMeasurementPriorityForCategory,
  convertVolumeToWeight,
  convertWeightToVolume,
  type CategoryPortionSizes,
  type DensityReference,
  type CategoryMeasurementPriority
} from '@/types/foodCategory';
import { PortionSize } from '@/types/customRecipe';

/**
 * Get recommended portion sizes for a specific food category
 */
export function getRecommendedPortionSizes(foodCategory: FoodCategory): CategoryPortionSizes | null {
  const categoryPortions = getPortionSizesForCategory(foodCategory);
  if (!categoryPortions) {
    return null;
  }
  return categoryPortions;
}

/**
 * Get the default portion size for a food category
 */
export function getDefaultPortionForCategory(foodCategory: FoodCategory): CategoryPortionSizes['allowedPortions'][0] | null {
  const categoryPortions = getPortionSizesForCategory(foodCategory);
  if (!categoryPortions) {
    return null;
  }

  const defaultPortion = categoryPortions.allowedPortions.find(p => p.isDefault);
  return defaultPortion || categoryPortions.allowedPortions[0] || null;
}

/**
 * Get measurement priority for a food category
 * Returns whether the category should primarily use weight, volume, or count
 */
export function getMeasurementPriority(foodCategory: FoodCategory): CategoryMeasurementPriority | null {
  return getMeasurementPriorityForCategory(foodCategory);
}

/**
 * Convert between volume and weight for a specific food category
 */
export function convertMeasurement(
  value: number,
  fromUnit: 'volume' | 'weight',
  toUnit: 'volume' | 'weight',
  foodCategory: FoodCategory
): number | null {
  if (fromUnit === toUnit) {
    return value;
  }

  if (fromUnit === 'volume' && toUnit === 'weight') {
    return convertVolumeToWeight(value, foodCategory);
  }

  if (fromUnit === 'weight' && toUnit === 'volume') {
    return convertWeightToVolume(value, foodCategory);
  }

  return null;
}

/**
 * Get density information for a food category
 */
export function getDensityInfo(foodCategory: FoodCategory): DensityReference | null {
  return getDensityForCategory(foodCategory);
}

/**
 * Validate if a portion size is appropriate for a food category
 */
export function isPortionSizeValidForCategory(
  portionSize: PortionSize,
  foodCategory: FoodCategory
): boolean {
  // If the portion size has a specific food category, check if it matches
  if (portionSize.foodCategory) {
    return portionSize.foodCategory === foodCategory;
  }

  // If no specific food category, check if it's a general portion size
  // that can be used for any category (like 'serving')
  if (portionSize.category === 'serving' || portionSize.category === 'other') {
    return true;
  }

  // Check if the portion measurement type aligns with category requirements
  const priority = getMeasurementPriorityForCategory(foodCategory);
  if (!priority) {
    return true; // No specific requirements, allow it
  }

  // Volume-based portions (cup, glass, bowl) should only be used for volume-primary categories
  const volumeCategories = ['cup', 'glass', 'bowl'];
  if (volumeCategories.includes(portionSize.category)) {
    if (priority.primaryUnit === 'volume' || priority.secondaryUnit === 'volume') {
      return portionSize.volumeMl !== undefined;
    }
  }

  // Weight-based portions (plate) should have weight defined
  const weightCategories = ['plate'];
  if (weightCategories.includes(portionSize.category)) {
    if (priority.primaryUnit === 'weight' || priority.secondaryUnit === 'weight') {
      return portionSize.weightG !== undefined;
    }
  }

  return true;
}

/**
 * Get all portion sizes that are valid for a food category from a list
 */
export function filterPortionSizesByCategory(
  portionSizes: PortionSize[],
  foodCategory: FoodCategory
): PortionSize[] {
  return portionSizes.filter(ps => isPortionSizeValidForCategory(ps, foodCategory));
}

/**
 * Suggest the best portion size category (cup, bowl, plate, etc.) for a food category
 */
export function suggestPortionCategory(
  foodCategory: FoodCategory
): 'cup' | 'plate' | 'bowl' | 'glass' | 'serving' | 'piece' | 'handful' | 'scoop' | 'slice' | 'other' {
  const priority = getMeasurementPriorityForCategory(foodCategory);

  // Check category-specific patterns
  if (foodCategory.startsWith('beverage_')) {
    return 'glass';
  }

  if (foodCategory.startsWith('soup_') || foodCategory === 'stew' || foodCategory === 'broth') {
    return 'bowl';
  }

  if (foodCategory.includes('cooked') || foodCategory.includes('rice') || foodCategory.includes('pasta')) {
    return 'cup';
  }

  if (foodCategory.startsWith('meat_') || foodCategory.startsWith('poultry_') || foodCategory.startsWith('fish_')) {
    return 'serving';
  }

  if (foodCategory === 'eggs' || foodCategory === 'bread' || foodCategory.startsWith('fruit_whole')) {
    return 'piece';
  }

  if (foodCategory === 'nuts_seeds' || foodCategory === 'vegetable_raw_leafy') {
    return 'handful';
  }

  if (foodCategory === 'ice_cream') {
    return 'scoop';
  }

  if (foodCategory === 'bread') {
    return 'slice';
  }

  // Default based on measurement priority
  if (priority) {
    if (priority.primaryUnit === 'volume') {
      return 'cup';
    }
    if (priority.primaryUnit === 'weight') {
      return 'plate';
    }
    if (priority.primaryUnit === 'count') {
      return 'piece';
    }
  }

  return 'serving';
}

/**
 * Get a user-friendly explanation of why a particular portion size is recommended
 */
export function getPortionSizeRationale(
  foodCategory: FoodCategory
): string {
  const priority = getMeasurementPriorityForCategory(foodCategory);

  if (priority) {
    return priority.rationale;
  }

  return 'Standard serving size based on nutritional guidelines';
}

/**
 * Get implementation guidance for displaying portion sizes
 */
export function getImplementationGuidance(
  foodCategory: FoodCategory
): string {
  const priority = getMeasurementPriorityForCategory(foodCategory);

  if (priority) {
    return priority.implementationGuidance;
  }

  return 'Display standard serving size options';
}

/**
 * Calculate nutrition scaling factor based on portion size
 * This takes into account the density and measurement type
 */
export function calculateNutritionScaling(
  baseWeight: number, // Base recipe weight in grams
  portionWeight: number, // Selected portion weight in grams
  foodCategory: FoodCategory
): number {
  // Simple ratio calculation
  if (baseWeight <= 0) {
    return 1.0;
  }

  return portionWeight / baseWeight;
}

/**
 * Get estimated accuracy of portion size measurement
 */
export function getPortionAccuracy(
  foodCategory: FoodCategory
): { accuracyPercent: number; note: string } {
  const density = getDensityForCategory(foodCategory);

  if (density) {
    let note = `Typical measurement variance: ±${density.accuracyPercent}%`;

    if (density.densityRange) {
      note += ` (density varies between ${density.densityRange.min}-${density.densityRange.max} g/mL)`;
    }

    return {
      accuracyPercent: density.accuracyPercent,
      note
    };
  }

  return {
    accuracyPercent: 5,
    note: 'Standard measurement accuracy'
  };
}

/**
 * Recommend alternative portion sizes if the selected one seems unusual
 */
export function getAlternativePortions(
  currentMultiplier: number,
  foodCategory: FoodCategory
): Array<{ name: string; multiplier: number; reason: string }> {
  const categoryPortions = getPortionSizesForCategory(foodCategory);
  if (!categoryPortions) {
    return [];
  }

  const alternatives: Array<{ name: string; multiplier: number; reason: string }> = [];

  // Find portions with multipliers close to current one
  categoryPortions.allowedPortions.forEach(portion => {
    const diff = Math.abs(portion.multiplier - currentMultiplier);

    if (diff > 0.1 && diff < 0.5) {
      alternatives.push({
        name: portion.name,
        multiplier: portion.multiplier,
        reason: `Similar size (${Math.round(portion.multiplier * 100)}% of standard)`
      });
    }
  });

  // Add default portion if not already included
  const defaultPortion = getDefaultPortionForCategory(foodCategory);
  if (defaultPortion && Math.abs(defaultPortion.multiplier - currentMultiplier) > 0.1) {
    alternatives.push({
      name: defaultPortion.name,
      multiplier: defaultPortion.multiplier,
      reason: 'Recommended standard serving'
    });
  }

  return alternatives.slice(0, 3); // Return top 3 alternatives
}

/**
 * Format portion size for display with appropriate units
 */
export function formatPortionSize(
  portion: CategoryPortionSizes['allowedPortions'][0]
): string {
  let formatted = portion.name;

  if (portion.description) {
    formatted += ` (${portion.description})`;
  }

  if (portion.weightG) {
    formatted += ` - ${portion.weightG}g`;
  } else if (portion.volumeMl) {
    formatted += ` - ${portion.volumeMl}mL`;
  }

  return formatted;
}

/**
 * Export all category data for use in UI components
 */
export {
  CATEGORY_PORTION_SIZES,
  DENSITY_REFERENCES,
  MEASUREMENT_PRIORITIES,
  FoodCategory
};
