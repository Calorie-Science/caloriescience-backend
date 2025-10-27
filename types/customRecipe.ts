/**
 * Type definitions for custom recipe creation feature
 */

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
  instructions?: string[];
  customNotes?: string;
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

export interface CustomRecipeOutput {
  id: string;
  provider: 'manual';
  externalRecipeId: string;
  recipeName: string;
  recipeDescription?: string;
  recipeImageUrl?: string;
  
  // Classification
  cuisineTypes?: string[];
  mealTypes?: string[];
  dishTypes?: string[];
  healthLabels?: string[];
  dietLabels?: string[];
  allergens?: string[];
  
  // Servings & Time
  servings: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  
  // Nutrition
  totalCalories?: number;
  totalProteinG?: number;
  totalCarbsG?: number;
  totalFatG?: number;
  totalFiberG?: number;
  totalSugarG?: number;
  totalSodiumMg?: number;
  
  caloriesPerServing?: number;
  proteinPerServingG?: number;
  carbsPerServingG?: number;
  fatPerServingG?: number;
  fiberPerServingG?: number;
  
  // Recipe details
  ingredients: any[];
  ingredientLines?: string[];
  cookingInstructions?: string[];
  nutritionDetails?: any;
  
  // Custom recipe specific
  createdByNutritionistId: string;
  isPublic: boolean;
  customNotes?: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
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

