/**
 * Enhanced Client Goals and Meal Planning Integration using Standardized Health Labels
 * This replaces the hardcoded mappings in clientGoalsMealPlanningIntegration.ts
 */

import { healthLabelsTransformService, HealthLabelsForProvider } from './healthLabelsTransformService';
import { healthLabelsService } from './healthLabelsService';

export interface ClientGoalsHealthLabels {
  allergies: string[];
  preferences: string[];
  cuisineTypes: string[];
}

export interface MealPlanningConstraints {
  provider: string;
  healthLabels: string[];
  cuisineTypes: string[];
  dietaryRestrictions: string[]; // For backward compatibility
  cuisinePreferences: string[];  // For backward compatibility
}

/**
 * Merge client allergies and preferences for meal planning with provider-specific formatting
 */
export async function mergeAllergiesAndPreferencesForProvider(
  allergies: string[] = [],
  preferences: string[] = [],
  providerName: string = 'edamam'
): Promise<HealthLabelsForProvider> {
  console.log('🎯 Client Goals Integration V2 - Input:', {
    allergies,
    preferences,
    provider: providerName
  });

  const result = await healthLabelsTransformService.mergeAllergiesAndPreferencesForProvider(
    allergies,
    preferences,
    providerName
  );

  console.log('🎯 Client Goals Integration V2 - Output:', result);
  return result;
}

/**
 * Convert client goals to meal planning constraints for a specific provider
 */
export async function convertClientGoalsToMealPlanningConstraints(
  clientGoals: ClientGoalsHealthLabels,
  providerName: string = 'edamam'
): Promise<MealPlanningConstraints> {
  const providerLabels = await healthLabelsTransformService.convertMixedLabelsForProvider(
    clientGoals.allergies,
    clientGoals.preferences,
    clientGoals.cuisineTypes,
    providerName
  );

  return {
    provider: providerName,
    healthLabels: providerLabels.healthLabels,
    cuisineTypes: providerLabels.cuisineTypes,
    // Backward compatibility fields
    dietaryRestrictions: providerLabels.healthLabels,
    cuisinePreferences: providerLabels.cuisineTypes
  };
}

/**
 * Validate client goals against provider capabilities
 */
export async function validateClientGoalsForProvider(
  clientGoals: ClientGoalsHealthLabels,
  providerName: string
): Promise<{
  valid: boolean;
  unsupportedAllergies: string[];
  unsupportedPreferences: string[];
  unsupportedCuisines: string[];
  warnings: string[];
}> {
  const allLabels = [
    ...clientGoals.allergies,
    ...clientGoals.preferences,
    ...clientGoals.cuisineTypes
  ];

  const validation = await healthLabelsTransformService.validateLabelsForProvider(
    allLabels,
    providerName
  );

  // Separate unsupported labels by category
  const allergies = await healthLabelsService.getAllergies();
  const preferences = await healthLabelsService.getDietaryPreferences();
  const cuisines = await healthLabelsService.getCuisineTypes();

  const allergyKeys = allergies.map(a => a.labelKey);
  const preferenceKeys = preferences.map(p => p.labelKey);
  const cuisineKeys = cuisines.map(c => c.labelKey);

  const unsupportedAllergies = validation.unsupportedLabels.filter(label => 
    allergyKeys.includes(label)
  );
  const unsupportedPreferences = validation.unsupportedLabels.filter(label => 
    preferenceKeys.includes(label)
  );
  const unsupportedCuisines = validation.unsupportedLabels.filter(label => 
    cuisineKeys.includes(label)
  );

  const warnings: string[] = [];
  
  if (unsupportedAllergies.length > 0) {
    warnings.push(`Critical allergies not supported by ${providerName}: ${unsupportedAllergies.join(', ')}`);
  }
  
  if (unsupportedPreferences.length > 0) {
    warnings.push(`Dietary preferences not supported by ${providerName}: ${unsupportedPreferences.join(', ')}`);
  }
  
  if (unsupportedCuisines.length > 0) {
    warnings.push(`Cuisine types not supported by ${providerName}: ${unsupportedCuisines.join(', ')}`);
  }

  return {
    valid: validation.valid,
    unsupportedAllergies,
    unsupportedPreferences,
    unsupportedCuisines,
    warnings
  };
}

/**
 * Get meal planning parameters for multiple providers (useful for fallback scenarios)
 */
export async function getMultiProviderMealPlanningConstraints(
  clientGoals: ClientGoalsHealthLabels,
  providerNames: string[] = ['edamam', 'spoonacular']
): Promise<Record<string, MealPlanningConstraints>> {
  const results: Record<string, MealPlanningConstraints> = {};
  
  await Promise.all(
    providerNames.map(async (provider) => {
      results[provider] = await convertClientGoalsToMealPlanningConstraints(
        clientGoals,
        provider
      );
    })
  );
  
  return results;
}

/**
 * Get supported capabilities for a provider (useful for UI)
 */
export async function getProviderCapabilities(providerName: string): Promise<{
  supportedAllergies: string[];
  supportedPreferences: string[];
  supportedCuisines: string[];
  totalSupported: number;
}> {
  const [allergies, preferences, cuisines] = await Promise.all([
    healthLabelsService.getAllergies(),
    healthLabelsService.getDietaryPreferences(),
    healthLabelsService.getCuisineTypes()
  ]);

  const allLabels = [
    ...allergies.map(a => a.labelKey),
    ...preferences.map(p => p.labelKey),
    ...cuisines.map(c => c.labelKey)
  ];

  const supportedLabels = await healthLabelsTransformService.getSupportedLabelsForProvider(providerName);

  const supportedAllergies = allergies
    .filter(a => supportedLabels.includes(a.labelKey))
    .map(a => a.labelKey);
    
  const supportedPreferences = preferences
    .filter(p => supportedLabels.includes(p.labelKey))
    .map(p => p.labelKey);
    
  const supportedCuisines = cuisines
    .filter(c => supportedLabels.includes(c.labelKey))
    .map(c => c.labelKey);

  return {
    supportedAllergies,
    supportedPreferences,
    supportedCuisines,
    totalSupported: supportedLabels.length
  };
}

/**
 * Convert legacy health labels format to new standardized format
 */
export function convertLegacyHealthLabels(
  legacyHealthLabels: string[]
): ClientGoalsHealthLabels {
  // This function helps migrate from the old mixed array format
  // to the new categorized format
  
  const allergies: string[] = [];
  const preferences: string[] = [];
  const cuisineTypes: string[] = [];

  // Map common legacy labels to new categories
  const allergyPatterns = [
    'dairy-free', 'gluten-free', 'egg-free', 'fish-free', 'shellfish-free',
    'peanut-free', 'tree-nut-free', 'soy-free', 'wheat-free', 'celery-free',
    'mustard-free', 'sesame-free', 'lupine-free', 'mollusk-free', 'sulfite-free'
  ];

  const preferencePatterns = [
    'vegan', 'vegetarian', 'keto-friendly', 'paleo', 'alcohol-free',
    'kosher', 'mediterranean', 'dash', 'sugar-conscious', 'low-sugar'
  ];

  const cuisinePatterns = [
    'american', 'asian', 'chinese', 'indian', 'italian', 'mexican',
    'french', 'japanese', 'korean', 'mediterranean-cuisine', 'middle-eastern'
  ];

  for (const label of legacyHealthLabels) {
    const lowerLabel = label.toLowerCase().replace(/[_\s]/g, '-');
    
    if (allergyPatterns.includes(lowerLabel)) {
      allergies.push(lowerLabel);
    } else if (preferencePatterns.includes(lowerLabel)) {
      preferences.push(lowerLabel);
    } else if (cuisinePatterns.includes(lowerLabel)) {
      cuisineTypes.push(lowerLabel);
    } else {
      // Default to preference for unknown labels
      preferences.push(lowerLabel);
    }
  }

  return {
    allergies: [...new Set(allergies)],
    preferences: [...new Set(preferences)],
    cuisineTypes: [...new Set(cuisineTypes)]
  };
}

/**
 * Create meal planning search parameters for Edamam (backward compatibility)
 */
export async function createEdamamSearchParams(
  clientGoals: ClientGoalsHealthLabels,
  additionalParams: Record<string, any> = {}
): Promise<Record<string, any>> {
  const constraints = await convertClientGoalsToMealPlanningConstraints(
    clientGoals,
    'edamam'
  );

  return {
    ...additionalParams,
    ...(constraints.healthLabels.length > 0 && { health: constraints.healthLabels }),
    ...(constraints.cuisineTypes.length > 0 && { cuisineType: constraints.cuisineTypes })
  };
}

// Export legacy function names for backward compatibility
export const mergeAllergiesAndPreferencesForEdamam = (
  allergies: string[] = [],
  preferences: string[] = []
) => mergeAllergiesAndPreferencesForProvider(allergies, preferences, 'edamam');

// Export constants for backward compatibility (these will be loaded from database)
export async function getEdamamSupportedHealthLabels(): Promise<string[]> {
  return healthLabelsTransformService.getSupportedLabelsForProvider('edamam');
}

export async function getEdamamSupportedCuisineTypes(): Promise<string[]> {
  const result = await healthLabelsTransformService.convertHealthLabelsForProvider(
    [], // Empty health labels, just get cuisine types
    'edamam'
  );
  
  // Get all cuisine types from database
  const cuisines = await healthLabelsService.getCuisineTypes();
  const allCuisineKeys = cuisines.map(c => c.labelKey);
  
  // Convert them to Edamam format
  const edamamResult = await healthLabelsTransformService.convertHealthLabelsForProvider(
    allCuisineKeys,
    'edamam'
  );
  
  return edamamResult.cuisineTypes;
}
