/**
 * Client Goals to Meal Planning Integration
 * Converts client goal allergies and preferences to Edamam API format
 */

import { ClientGoal, Allergy, Preference, CuisineType } from '../types/clientGoals';

/**
 * Maps client goal allergies and preferences to Edamam health labels
 * Allergies are safety-critical and must be included
 * Preferences are lifestyle choices and should be included
 */
export function mergeAllergiesAndPreferencesForEdamam(
  allergies?: Allergy[], 
  preferences?: Preference[]
): string[] {
  const healthLabels: string[] = [];
  
  // Add allergies (safety-critical) - convert to uppercase for Edamam API
  if (allergies && allergies.length > 0) {
    healthLabels.push(...allergies.map(allergy => allergy.toUpperCase().replace('-', '_')));
  }
  
  // Add preferences (lifestyle choices) - convert to uppercase for Edamam API  
  if (preferences && preferences.length > 0) {
    healthLabels.push(...preferences.map(preference => preference.toUpperCase().replace('-', '_')));
  }
  
  return healthLabels;
}

/**
 * Maps client goal cuisine types to Edamam cuisine format
 */
export function mapCuisineTypesForEdamam(cuisineTypes?: CuisineType[]): string[] {
  if (!cuisineTypes || cuisineTypes.length === 0) {
    return [];
  }
  
  // Convert to title case for Edamam API (e.g., 'italian' -> 'Italian')
  return cuisineTypes.map(cuisine => 
    cuisine.split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ')
  );
}

/**
 * Creates Edamam Meal Planner request with client goals integration
 */
export function createMealPlannerRequestFromClientGoals(
  clientGoal: ClientGoal,
  mealCount: number = 10,
  excludedRecipes: string[] = []
) {
  const healthLabels = mergeAllergiesAndPreferencesForEdamam(
    clientGoal.allergies,
    clientGoal.preferences
  );
  
  const cuisineTypes = mapCuisineTypesForEdamam(clientGoal.cuisineTypes);
  
  return {
    size: mealCount,
    plan: {
      accept: {
        all: [
          {
            // Merge allergies and preferences into health filters
            ...(healthLabels.length > 0 && { health: healthLabels }),
            // Cuisine types applied at plan level for all meals
            ...(cuisineTypes.length > 0 && { cuisine: cuisineTypes })
          }
        ]
      },
      fit: {
        ENERC_KCAL: {
          min: Math.floor(clientGoal.eerGoalCalories * 0.8), // 20% tolerance
          max: Math.ceil(clientGoal.eerGoalCalories * 1.2)
        },
        PROCNT: {
          min: clientGoal.proteinGoalMin,
          max: clientGoal.proteinGoalMax
        },
        CHOCDF: {
          min: clientGoal.carbsGoalMin,
          max: clientGoal.carbsGoalMax
        },
        FAT: {
          min: clientGoal.fatGoalMin,
          max: clientGoal.fatGoalMax
        },
        ...(clientGoal.fiberGoalGrams && {
          FIBTG: {
            min: clientGoal.fiberGoalGrams * 0.8,
            max: clientGoal.fiberGoalGrams * 1.2
          }
        })
      },
      // Exclude previously used recipes
      ...(excludedRecipes.length > 0 && {
        reject: {
          any: [
            {
              recipe: excludedRecipes
            }
          ]
        }
      })
    }
  };
}

/**
 * Example usage for individual meal search (Recipe Search API)
 */
export function createRecipeSearchParamsFromClientGoals(
  clientGoal: ClientGoal,
  mealType?: string,
  query?: string
) {
  const healthLabels = mergeAllergiesAndPreferencesForEdamam(
    clientGoal.allergies,
    clientGoal.preferences
  );
  
  const cuisineTypes = mapCuisineTypesForEdamam(clientGoal.cuisineTypes);
  
  return {
    query: query || '',
    health: healthLabels,
    cuisineType: cuisineTypes,
    ...(mealType && { mealType: [mealType] }),
    calories: `${Math.floor(clientGoal.eerGoalCalories * 0.2)}-${Math.ceil(clientGoal.eerGoalCalories * 0.4)}` // Per meal estimate
  };
}

/**
 * Validation helper to ensure health labels are supported by Edamam
 */
export const EDAMAM_SUPPORTED_HEALTH_LABELS = [
  'ALCOHOL_COCKTAIL',
  'ALCOHOL_FREE', 
  'CELERY_FREE',
  'CRUSTACEAN_FREE',
  'DAIRY_FREE',
  'DASH',
  'EGG_FREE',
  'FISH_FREE',
  'FODMAP_FREE',
  'GLUTEN_FREE',
  'IMMUNO_SUPPORTIVE',
  'KETO_FRIENDLY',
  'KIDNEY_FRIENDLY',
  'KOSHER',
  'LOW_POTASSIUM',
  'LOW_SUGAR',
  'LUPINE_FREE',
  'MEDITERRANEAN',
  'MOLLUSK_FREE',
  'MUSTARD_FREE',
  'NO_OIL_ADDED',
  'PALEO',
  'PEANUT_FREE',
  'PECATARIAN',
  'PORK_FREE',
  'RED_MEAT_FREE',
  'SESAME_FREE',
  'SHELLFISH_FREE',
  'SOY_FREE',
  'SUGAR_CONSCIOUS',
  'SULFITE_FREE',
  'TREE_NUT_FREE',
  'VEGAN',
  'VEGETARIAN',
  'WHEAT_FREE'
];

export const EDAMAM_SUPPORTED_CUISINE_TYPES = [
  'American',
  'Asian',
  'British',
  'Caribbean',
  'Central Europe',
  'Chinese',
  'Eastern Europe',
  'French',
  'Greek',
  'Indian',
  'Italian',
  'Japanese',
  'Korean',
  'Kosher',
  'Mediterranean',
  'Mexican',
  'Middle Eastern',
  'Nordic',
  'South American',
  'South East Asian',
  'World'
];
