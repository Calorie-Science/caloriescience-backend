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
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  weight?: number;
  // Extended nutrition
  saturatedFat?: number;
  cholesterol?: number;
  vitaminA?: number;
  vitaminC?: number;
  calcium?: number;
  iron?: number;
  potassium?: number;
  [key: string]: any; // Allow additional nutrition fields
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

