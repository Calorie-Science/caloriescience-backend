/**
 * Type definitions for custom recipe creation feature
 */

import { FoodCategory } from './foodCategory';

/**
 * Portion Size - represents standard serving sizes
 */
export interface PortionSize {
  id: string;
  name: string; // e.g., "Small Cup", "Large Cup", "Medium Plate", "Small Bowl"
  description?: string;
  category: 'cup' | 'plate' | 'bowl' | 'glass' | 'serving' | 'piece' | 'handful' | 'scoop' | 'slice' | 'other';
  foodCategory?: FoodCategory; // Specific food category this portion size is designed for
  volumeMl?: number; // Volume in milliliters (for liquids)
  weightG?: number; // Weight in grams (for solids)
  multiplier: number; // Multiplier for nutrition values (base serving = 1.0)
  isDefault?: boolean; // Whether this is a default portion size
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePortionSizeInput {
  name: string;
  description?: string;
  category: 'cup' | 'plate' | 'bowl' | 'glass' | 'serving' | 'piece' | 'handful' | 'scoop' | 'slice' | 'other';
  foodCategory?: FoodCategory;
  volumeMl?: number;
  weightG?: number;
  multiplier: number;
  isDefault?: boolean;
}

export interface UpdatePortionSizeInput extends Partial<CreatePortionSizeInput> {
  id: string;
}

export interface CustomRecipeIngredient {
  name: string;
  quantity: number;
  unit: string;
  nutritionData?: IngredientNutrition;
}

export interface IngredientNutrition {
  calories: number;
  
  macros: {
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sugar: number;
    sodium: number;
    cholesterol?: number;
    saturatedFat?: number;
    transFat?: number;
    monounsaturatedFat?: number;
    polyunsaturatedFat?: number;
  };
  
  micros: {
    vitamins: {
      vitaminA?: number;
      vitaminC?: number;
      vitaminD?: number;
      vitaminE?: number;
      vitaminK?: number;
      thiamin?: number;
      riboflavin?: number;
      niacin?: number;
      vitaminB6?: number;
      folate?: number;
      vitaminB12?: number;
      biotin?: number;
      pantothenicAcid?: number;
    };
    minerals: {
      calcium?: number;
      iron?: number;
      magnesium?: number;
      phosphorus?: number;
      potassium?: number;
      zinc?: number;
      copper?: number;
      manganese?: number;
      selenium?: number;
      iodine?: number;
      chromium?: number;
      molybdenum?: number;
    };
  };
  
  weight?: number; // Optional weight in grams
}

export interface CreateCustomRecipeInput {
  recipeName: string;
  description?: string;
  ingredients: CustomRecipeIngredient[];
  servings: number;
  foodCategory?: FoodCategory; // Food category for portion size recommendations
  portionSizeId?: string; // Reference to default portion size
  instructions?: string[];
  customNotes?: string;
  cookingTips?: string; // Helpful cooking tips for this recipe
  imageUrl?: string;
  healthLabels?: string[];
  allergens?: string[];
  dietLabels?: string[];
  cuisineTypes?: string[];
  mealTypes?: string[];
  dishTypes?: string[];
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  isPublic: boolean;
}

export interface UpdateCustomRecipeInput extends Partial<CreateCustomRecipeInput> {
  id: string;
}

export interface EditCustomRecipeBasicDetailsInput {
  recipeName?: string;
  description?: string;
  imageUrl?: string;
  servings?: number;
  foodCategory?: FoodCategory; // Food category for portion size recommendations
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  instructions?: string[];
  customNotes?: string;
  cookingTips?: string; // Helpful cooking tips for this recipe
  isPublic?: boolean;
  cuisineTypes?: string[];
  mealTypes?: string[];
  dishTypes?: string[];
  healthLabels?: string[];
  dietLabels?: string[];
  allergens?: string[];
  portionSizeId?: string; // Default portion size for this recipe
}

/**
 * Custom Recipe Output format - matches UnifiedRecipeSummary for consistency
 * across all recipe APIs
 */
export interface CustomRecipeOutput {
  // Standard UnifiedRecipeSummary fields
  id: string;
  title: string;
  image: string;
  sourceUrl: string;
  source: 'manual';
  readyInMinutes?: number;
  servings?: number;
  nutritionServings?: number; // Portion size multiplier for nutrition (default: 1)
  portionSize?: PortionSize; // Current portion size
  defaultPortionSizeId?: string; // Reference to default portion size
  foodCategory?: FoodCategory; // Food category for portion size recommendations

  // Nutrition data (per serving) - standard format
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;

  // Metadata for filtering - standard format
  healthLabels?: string[];
  dietLabels?: string[];
  cuisineType?: string[];
  dishType?: string[];
  mealType?: string[];
  allergens?: string[];

  // Ingredients for allergen checking
  ingredients?: Array<{
    name?: string;
    food?: string;
    quantity?: number;
    unit?: string;
    original?: string;
    nutrition?: any;
    [key: string]: any;
  }>;

  // Custom recipe metadata
  isCustom?: boolean;
  createdBy?: string;
  isPublic?: boolean;

  // Additional fields for detailed view (backward compatible)
  description?: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  ingredientLines?: string[];
  instructions?: string[];
  customNotes?: string;
  cookingTips?: string; // Helpful cooking tips for this recipe
  nutritionDetails?: any;

  // Total nutrition (for detailed calculations)
  totalCalories?: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFat?: number;
  totalFiber?: number;
  totalSugar?: number;
  totalSodium?: number;
  totalWeight?: number;

  // Timestamps
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomRecipeFilter {
  search?: string;
  healthLabels?: string[];
  cuisineTypes?: string[];
  mealTypes?: string[];
  dishTypes?: string[];
  caloriesMin?: number;
  caloriesMax?: number;
  includePublic?: boolean;
  page?: number;
  limit?: number;
}

export interface NutritionCalculationResult {
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  totalSugarG: number;
  totalSodiumMg: number;
  totalWeightG: number;
  
  caloriesPerServing: number;
  proteinPerServingG: number;
  carbsPerServingG: number;
  fatPerServingG: number;
  fiberPerServingG: number;
  
  detailedNutrition: any;
}

