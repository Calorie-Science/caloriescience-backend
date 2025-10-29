// Valid allergies (safety-critical restrictions that must be avoided)
export const VALID_ALLERGIES = [
  'celery-free',
  'crustacean-free',
  'dairy-free',
  'egg-free',
  'fish-free',
  'fodmap-free',
  'gluten-free',
  'lupine-free',
  'mollusk-free',
  'mustard-free',
  'peanut-free',
  'pork-free',
  'sesame-free',
  'shellfish-free',
  'soy-free',
  'sulfite-free',
  'tree-nut-free',
  'wheat-free'
] as const;

// Valid dietary preferences (lifestyle choices)
// Note: All allergy values are also valid as preferences since people may choose to avoid them for non-allergy reasons
export const VALID_PREFERENCES = [
  // Lifestyle preferences
  'alcohol-cocktail',
  'alcohol-free',
  'DASH',
  'immuno-supportive',
  'keto-friendly',
  'kidney-friendly',
  'kosher',
  'low-potassium',
  'low-sugar',
  'Mediterranean',
  'No-oil-added',
  'paleo',
  'pecatarian',
  'red-meat-free',
  'sugar-conscious',
  'vegan',
  'vegetarian',
  // All allergen-free options (can be used as preferences too)
  'celery-free',
  'crustacean-free',
  'dairy-free',
  'egg-free',
  'fish-free',
  'fodmap-free',
  'gluten-free',
  'lupine-free',
  'mollusk-free',
  'mustard-free',
  'peanut-free',
  'pork-free',
  'sesame-free',
  'shellfish-free',
  'soy-free',
  'sulfite-free',
  'tree-nut-free',
  'wheat-free'
] as const;

// Valid cuisine types for meal planning
export const VALID_CUISINE_TYPES = [
  'american',
  'asian',
  'british',
  'caribbean',
  'central europe',
  'chinese',
  'eastern europe',
  'french',
  'greek',
  'indian',
  'italian',
  'japanese',
  'korean',
  'kosher',
  'mediterranean',
  'mexican',
  'middle eastern',
  'nordic',
  'south american',
  'south east asian',
  'world'
] as const;

export type Allergy = typeof VALID_ALLERGIES[number];
export type Preference = typeof VALID_PREFERENCES[number];
export type CuisineType = typeof VALID_CUISINE_TYPES[number];

export interface ClientGoal {
  id: string;
  clientId: string;
  nutritionistId: string;
  
  // Energy Goals
  eerGoalCalories: number;
  
  // Macro Goals (min/max ranges in grams)
  proteinGoalMin: number;
  proteinGoalMax: number;
  carbsGoalMin: number;
  carbsGoalMax: number;
  fatGoalMin: number;
  fatGoalMax: number;
  
  // Additional Goals
  fiberGoalGrams?: number;
  waterGoalLiters?: number;
  
  // Dietary Restrictions & Preferences (optional)
  allergies?: Allergy[];
  preferences?: Preference[];
  cuisineTypes?: CuisineType[];
  
  // Goal Status
  isActive: boolean;
  goalStartDate: string;
  goalEndDate?: string;
  
  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientGoalRequest {
  clientId: string;
  eerGoalCalories?: number;
  proteinGoalMin?: number;
  proteinGoalMax?: number;
  carbsGoalMin?: number;
  carbsGoalMax?: number;
  fatGoalMin?: number;
  fatGoalMax?: number;
  fiberGoalGrams?: number;
  waterGoalLiters?: number;
  allergies?: Allergy[];
  preferences?: Preference[];
  cuisineTypes?: CuisineType[];
  goalStartDate?: string;
  goalEndDate?: string;
  notes?: string;
}

export interface UpdateClientGoalRequest {
  eerGoalCalories?: number;
  proteinGoalMin?: number;
  proteinGoalMax?: number;
  carbsGoalMin?: number;
  carbsGoalMax?: number;
  fatGoalMin?: number;
  fatGoalMax?: number;
  fiberGoalGrams?: number;
  waterGoalLiters?: number;
  allergies?: Allergy[];
  preferences?: Preference[];
  cuisineTypes?: CuisineType[];
  goalStartDate?: string;
  goalEndDate?: string;
  notes?: string;
}

export interface ClientGoalResponse {
  success: boolean;
  data?: ClientGoal;
  error?: string;
  message?: string;
}

export interface ClientGoalsResponse {
  success: boolean;
  data?: ClientGoal[];
  error?: string;
  message?: string;
}

// Validation helpers
export const validateMacroRanges = (
  proteinMin: number, proteinMax: number,
  carbsMin: number, carbsMax: number,
  fatMin: number, fatMax: number
): boolean => {
  // Check that min values are less than max values
  if (proteinMin >= proteinMax || carbsMin >= carbsMax || fatMin >= fatMax) {
    return false;
  }
  
  // Check that all values are positive
  if (proteinMin <= 0 || proteinMax <= 0 || carbsMin <= 0 || carbsMax <= 0 || fatMin <= 0 || fatMax <= 0) {
    return false;
  }
  
  return true;
};

export const calculateMacroCaloriesFromGrams = (
  proteinGrams: number,
  carbsGrams: number,
  fatGrams: number
): { protein: number; carbs: number; fat: number; total: number } => {
  const proteinCalories = proteinGrams * 4; // 4 cal per gram
  const carbsCalories = carbsGrams * 4;     // 4 cal per gram
  const fatCalories = fatGrams * 9;         // 9 cal per gram
  const totalCalories = proteinCalories + carbsCalories + fatCalories;
  
  return {
    protein: proteinCalories,
    carbs: carbsCalories,
    fat: fatCalories,
    total: totalCalories
  };
};

export const calculateMacroGramsFromCalories = (
  proteinCalories: number,
  carbsCalories: number,
  fatCalories: number
): { protein: number; carbs: number; fat: number } => {
  return {
    protein: Math.round(proteinCalories / 4), // 4 cal per gram
    carbs: Math.round(carbsCalories / 4),     // 4 cal per gram
    fat: Math.round(fatCalories / 9)          // 9 cal per gram
  };
};

// Validation helpers for allergies, preferences, and cuisine types
export const validateAllergies = (allergies: string[]): boolean => {
  if (!Array.isArray(allergies)) return false;
  return allergies.every(allergy => VALID_ALLERGIES.includes(allergy as Allergy));
};

export const validatePreferences = (preferences: string[]): boolean => {
  if (!Array.isArray(preferences)) return false;
  return preferences.every(preference => VALID_PREFERENCES.includes(preference as Preference));
};

export const validateCuisineTypes = (cuisineTypes: string[]): boolean => {
  if (!Array.isArray(cuisineTypes)) return false;
  return cuisineTypes.every(cuisine => VALID_CUISINE_TYPES.includes(cuisine as CuisineType));
};
