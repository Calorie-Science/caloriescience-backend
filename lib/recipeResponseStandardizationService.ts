/**
 * Service for standardizing recipe responses from different providers (Edamam, Spoonacular)
 * to ensure uniform structure in meal suggestions
 */

export interface StandardizedRecipeResponse {
  // Core identification
  id: string;
  provider: 'edamam' | 'spoonacular';
  externalRecipeId: string;
  externalRecipeUri: string;
  
  // Basic recipe info
  recipeName: string;
  recipeSource: string;
  recipeUrl: string;
  recipeImageUrl: string;
  
  // Categorization (standardized arrays)
  cuisineTypes: string[];
  mealTypes: string[];
  dishTypes: string[];
  
  // Health and dietary info (standardized)
  healthLabels: string[];
  dietLabels: string[];
  
  // Serving and timing info
  servings: number;
  nutritionServings?: number; // Portion size multiplier for nutrition (default: 1)
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  totalTimeMinutes: number | null;
  
  // Nutrition (per serving)
  caloriesPerServing: string;
  proteinPerServingG: string;
  carbsPerServingG: string;
  fatPerServingG: string;
  fiberPerServingG: string;
  sugarPerServingG: string | null;
  sodiumPerServingMg: string | null;
  
  // Total nutrition (for entire recipe)
  totalCalories: string | null;
  totalProteinG: string | null;
  totalCarbsG: string | null;
  totalFatG: string | null;
  totalFiberG: string | null;
  totalSugarG: string | null;
  totalSodiumMg: string | null;
  totalWeightG: string | null;
  
  // Recipe content
  ingredients: StandardizedIngredient[];
  ingredientLines: string[];
  cookingInstructions: string[];
  
  // Detailed nutrition
  nutritionDetails: StandardizedNutritionDetails;
  
  // Metadata
  originalApiResponse: any;
  cacheStatus: string;
  apiFetchCount: number;
  lastApiFetchAt: string;
  lastAccessedAt: string;
  hasCompleteNutrition: boolean;
  hasDetailedIngredients: boolean;
  hasCookingInstructions: boolean;
  dataQualityScore: number;
  createdAt: string;
  updatedAt: string;
}

export interface StandardizedIngredient {
  id?: string;
  name: string;
  unit: string;
  amount: number;
  image?: string;
  originalString: string;
  aisle?: string;
  meta?: string[];
  measures?: {
    us: { amount: number; unitLong: string; unitShort: string };
    metric: { amount: number; unitLong: string; unitShort: string };
  };
}

export interface StandardizedNutritionDetails {
  macros: {
    fat: { unit: string; quantity: number };
    carbs: { unit: string; quantity: number };
    fiber: { unit: string; quantity: number };
    sugar: { unit: string; quantity: number };
    sodium: { unit: string; quantity: number };
    protein: { unit: string; quantity: number };
    transFat?: { unit: string; quantity: number };
    cholesterol?: { unit: string; quantity: number };
    saturatedFat?: { unit: string; quantity: number };
    monounsaturatedFat?: { unit: string; quantity: number };
    polyunsaturatedFat?: { unit: string; quantity: number };
  };
  micros: {
    minerals: {
      iron?: { unit: string; quantity: number };
      zinc?: { unit: string; quantity: number };
      copper?: { unit: string; quantity: number };
      calcium?: { unit: string; quantity: number };
      selenium?: { unit: string; quantity: number };
      magnesium?: { unit: string; quantity: number };
      manganese?: { unit: string; quantity: number };
      potassium?: { unit: string; quantity: number };
      phosphorus?: { unit: string; quantity: number };
    };
    vitamins: {
      folate?: { unit: string; quantity: number };
      niacin?: { unit: string; quantity: number };
      thiamin?: { unit: string; quantity: number };
      vitaminA?: { unit: string; quantity: number };
      vitaminC?: { unit: string; quantity: number };
      vitaminD?: { unit: string; quantity: number };
      vitaminE?: { unit: string; quantity: number };
      vitaminK?: { unit: string; quantity: number };
      vitaminB6?: { unit: string; quantity: number };
      riboflavin?: { unit: string; quantity: number };
      vitaminB12?: { unit: string; quantity: number };
    };
  };
  calories: { unit: string; quantity: number };
}

export class RecipeResponseStandardizationService {
  
  /**
   * Standardize Edamam recipe response
   */
  standardizeEdamamResponse(edamamRecipe: any): StandardizedRecipeResponse {
    const nutritionDetails = this.parseNutritionDetails(edamamRecipe.nutrition_details);
    const ingredients = this.parseIngredients(edamamRecipe.ingredients, 'edamam');
    
    return {
      // Core identification
      id: edamamRecipe.id,
      provider: 'edamam',
      externalRecipeId: edamamRecipe.external_recipe_id,
      externalRecipeUri: edamamRecipe.external_recipe_uri,
      
      // Basic recipe info
      recipeName: edamamRecipe.recipe_name,
      recipeSource: edamamRecipe.recipe_source,
      recipeUrl: edamamRecipe.recipe_url,
      recipeImageUrl: edamamRecipe.recipe_image_url,
      
      // Categorization (ensure arrays)
      cuisineTypes: Array.isArray(edamamRecipe.cuisine_types) ? edamamRecipe.cuisine_types : [],
      mealTypes: Array.isArray(edamamRecipe.meal_types) ? edamamRecipe.meal_types : [],
      dishTypes: Array.isArray(edamamRecipe.dish_types) ? edamamRecipe.dish_types : [],
      
      // Health and dietary info (standardize format)
      healthLabels: Array.isArray(edamamRecipe.health_labels) ? edamamRecipe.health_labels : [],
      dietLabels: Array.isArray(edamamRecipe.diet_labels) ? edamamRecipe.diet_labels : [],
      
      // Serving and timing info
      servings: edamamRecipe.servings || 1,
      nutritionServings: 1, // Default to 1, can be changed via edit servings API
      prepTimeMinutes: edamamRecipe.prep_time_minutes,
      cookTimeMinutes: edamamRecipe.cook_time_minutes,
      totalTimeMinutes: edamamRecipe.total_time_minutes,
      
      // Nutrition (per serving) - ensure string format
      caloriesPerServing: edamamRecipe.calories_per_serving?.toString() || '0',
      proteinPerServingG: edamamRecipe.protein_per_serving_g?.toString() || '0',
      carbsPerServingG: edamamRecipe.carbs_per_serving_g?.toString() || '0',
      fatPerServingG: edamamRecipe.fat_per_serving_g?.toString() || '0',
      fiberPerServingG: edamamRecipe.fiber_per_serving_g?.toString() || '0',
      sugarPerServingG: edamamRecipe.sugar_per_serving_g?.toString() || null,
      sodiumPerServingMg: edamamRecipe.sodium_per_serving_mg?.toString() || null,
      
      // Total nutrition
      totalCalories: edamamRecipe.total_calories?.toString() || null,
      totalProteinG: edamamRecipe.total_protein_g?.toString() || null,
      totalCarbsG: edamamRecipe.total_carbs_g?.toString() || null,
      totalFatG: edamamRecipe.total_fat_g?.toString() || null,
      totalFiberG: edamamRecipe.total_fiber_g?.toString() || null,
      totalSugarG: edamamRecipe.total_sugar_g?.toString() || null,
      totalSodiumMg: edamamRecipe.total_sodium_mg?.toString() || null,
      totalWeightG: edamamRecipe.total_weight_g?.toString() || null,
      
      // Recipe content
      ingredients: ingredients,
      ingredientLines: Array.isArray(edamamRecipe.ingredient_lines) ? edamamRecipe.ingredient_lines : [],
      cookingInstructions: Array.isArray(edamamRecipe.cooking_instructions) ? edamamRecipe.cooking_instructions : [],
      
      // Detailed nutrition
      nutritionDetails: nutritionDetails,
      
      // Metadata
      originalApiResponse: edamamRecipe.original_api_response,
      cacheStatus: edamamRecipe.cache_status || 'unknown',
      apiFetchCount: edamamRecipe.api_fetch_count || 0,
      lastApiFetchAt: edamamRecipe.last_api_fetch_at,
      lastAccessedAt: edamamRecipe.last_accessed_at,
      hasCompleteNutrition: edamamRecipe.has_complete_nutrition || false,
      hasDetailedIngredients: edamamRecipe.has_detailed_ingredients || false,
      hasCookingInstructions: edamamRecipe.has_cooking_instructions || false,
      dataQualityScore: edamamRecipe.data_quality_score || 0,
      createdAt: edamamRecipe.created_at,
      updatedAt: edamamRecipe.updated_at
    };
  }
  
  /**
   * Standardize Spoonacular recipe response
   */
  standardizeSpoonacularResponse(spoonacularRecipe: any): StandardizedRecipeResponse {
    const nutritionDetails = this.parseNutritionDetails(spoonacularRecipe.nutrition_details);
    const ingredients = this.parseIngredients(spoonacularRecipe.ingredients, 'spoonacular');
    
    // Convert Spoonacular diet labels to Edamam format for consistency
    const standardizedDietLabels = this.standardizeDietLabels(spoonacularRecipe.diet_labels);
    
    return {
      // Core identification
      id: spoonacularRecipe.id,
      provider: 'spoonacular',
      externalRecipeId: spoonacularRecipe.external_recipe_id,
      externalRecipeUri: spoonacularRecipe.external_recipe_uri,
      
      // Basic recipe info
      recipeName: spoonacularRecipe.recipe_name,
      recipeSource: spoonacularRecipe.recipe_source,
      recipeUrl: spoonacularRecipe.recipe_url,
      recipeImageUrl: spoonacularRecipe.recipe_image_url,
      
      // Categorization (ensure arrays)
      cuisineTypes: Array.isArray(spoonacularRecipe.cuisine_types) ? spoonacularRecipe.cuisine_types : [],
      mealTypes: Array.isArray(spoonacularRecipe.meal_types) ? spoonacularRecipe.meal_types : [],
      dishTypes: Array.isArray(spoonacularRecipe.dish_types) ? spoonacularRecipe.dish_types : [],
      
      // Health and dietary info (standardize format)
      healthLabels: Array.isArray(spoonacularRecipe.health_labels) ? spoonacularRecipe.health_labels : [],
      dietLabels: standardizedDietLabels,
      
      // Serving and timing info
      servings: spoonacularRecipe.servings || 1,
      nutritionServings: 1, // Default to 1, can be changed via edit servings API
      prepTimeMinutes: spoonacularRecipe.prep_time_minutes,
      cookTimeMinutes: spoonacularRecipe.cook_time_minutes,
      totalTimeMinutes: spoonacularRecipe.total_time_minutes,
      
      // Nutrition (per serving) - ensure string format
      caloriesPerServing: spoonacularRecipe.calories_per_serving?.toString() || '0',
      proteinPerServingG: spoonacularRecipe.protein_per_serving_g?.toString() || '0',
      carbsPerServingG: spoonacularRecipe.carbs_per_serving_g?.toString() || '0',
      fatPerServingG: spoonacularRecipe.fat_per_serving_g?.toString() || '0',
      fiberPerServingG: spoonacularRecipe.fiber_per_serving_g?.toString() || '0',
      sugarPerServingG: spoonacularRecipe.sugar_per_serving_g?.toString() || null,
      sodiumPerServingMg: spoonacularRecipe.sodium_per_serving_mg?.toString() || null,
      
      // Total nutrition
      totalCalories: spoonacularRecipe.total_calories?.toString() || null,
      totalProteinG: spoonacularRecipe.total_protein_g?.toString() || null,
      totalCarbsG: spoonacularRecipe.total_carbs_g?.toString() || null,
      totalFatG: spoonacularRecipe.total_fat_g?.toString() || null,
      totalFiberG: spoonacularRecipe.total_fiber_g?.toString() || null,
      totalSugarG: spoonacularRecipe.total_sugar_g?.toString() || null,
      totalSodiumMg: spoonacularRecipe.total_sodium_mg?.toString() || null,
      totalWeightG: spoonacularRecipe.total_weight_g?.toString() || null,
      
      // Recipe content
      ingredients: ingredients,
      ingredientLines: Array.isArray(spoonacularRecipe.ingredient_lines) ? spoonacularRecipe.ingredient_lines : [],
      cookingInstructions: Array.isArray(spoonacularRecipe.cooking_instructions) ? spoonacularRecipe.cooking_instructions : [],
      
      // Detailed nutrition
      nutritionDetails: nutritionDetails,
      
      // Metadata
      originalApiResponse: spoonacularRecipe.original_api_response,
      cacheStatus: spoonacularRecipe.cache_status || 'unknown',
      apiFetchCount: spoonacularRecipe.api_fetch_count || 0,
      lastApiFetchAt: spoonacularRecipe.last_api_fetch_at,
      lastAccessedAt: spoonacularRecipe.last_accessed_at,
      hasCompleteNutrition: spoonacularRecipe.has_complete_nutrition || false,
      hasDetailedIngredients: spoonacularRecipe.has_detailed_ingredients || false,
      hasCookingInstructions: spoonacularRecipe.has_cooking_instructions || false,
      dataQualityScore: spoonacularRecipe.data_quality_score || 0,
      createdAt: spoonacularRecipe.created_at,
      updatedAt: spoonacularRecipe.updated_at
    };
  }
  
  /**
   * Parse ingredients from JSON string or array
   */
  private parseIngredients(ingredients: string | any[], provider: 'edamam' | 'spoonacular'): StandardizedIngredient[] {
    if (!ingredients) return [];
    
    let parsedIngredients: any[] = [];
    
    if (typeof ingredients === 'string') {
      try {
        parsedIngredients = JSON.parse(ingredients);
      } catch (error) {
        console.warn('Failed to parse ingredients JSON:', error);
        return [];
      }
    } else if (Array.isArray(ingredients)) {
      parsedIngredients = ingredients;
    }
    
    return parsedIngredients.map(ing => {
      // Construct full image URL based on provider
      let imageUrl = ing.image;
      if (imageUrl && provider === 'spoonacular' && !imageUrl.startsWith('http')) {
        // Spoonacular ingredient images need base URL prefix (only if not already a full URL)
        imageUrl = `https://spoonacular.com/cdn/ingredients_100x100/${imageUrl}`;
      }
      
      // Handle Edamam's <unit> placeholder
      const unit = ing.unit || '';
      const normalizedUnit = unit === '<unit>' ? '' : unit;
      
      return {
        id: ing.id?.toString(),
        name: ing.name || '',
        unit: normalizedUnit,
        amount: ing.amount || 0,
        image: imageUrl,
        originalString: ing.originalString || ing.original || '',
        aisle: ing.aisle,
        meta: ing.meta,
        measures: ing.measures
      };
    });
  }
  
  /**
   * Parse nutrition details from JSON string or object
   */
  private parseNutritionDetails(nutritionDetails: string | any): StandardizedNutritionDetails {
    if (!nutritionDetails) {
      return this.getEmptyNutritionDetails();
    }
    
    let parsed: any = {};
    
    if (typeof nutritionDetails === 'string') {
      try {
        parsed = JSON.parse(nutritionDetails);
      } catch (error) {
        console.warn('Failed to parse nutrition details JSON:', error);
        return this.getEmptyNutritionDetails();
      }
    } else {
      parsed = nutritionDetails;
    }
    
    return {
      macros: {
        fat: parsed.macros?.fat || { unit: 'g', quantity: 0 },
        carbs: parsed.macros?.carbs || { unit: 'g', quantity: 0 },
        fiber: parsed.macros?.fiber || { unit: 'g', quantity: 0 },
        sugar: parsed.macros?.sugar || { unit: 'g', quantity: 0 },
        sodium: parsed.macros?.sodium || { unit: 'mg', quantity: 0 },
        protein: parsed.macros?.protein || { unit: 'g', quantity: 0 },
        transFat: parsed.macros?.transFat,
        cholesterol: parsed.macros?.cholesterol,
        saturatedFat: parsed.macros?.saturatedFat,
        monounsaturatedFat: parsed.macros?.monounsaturatedFat,
        polyunsaturatedFat: parsed.macros?.polyunsaturatedFat
      },
      micros: {
        minerals: parsed.micros?.minerals || {},
        vitamins: parsed.micros?.vitamins || {}
      },
      calories: parsed.calories || { unit: 'kcal', quantity: 0 }
    };
  }
  
  /**
   * Standardize diet labels to consistent format
   */
  private standardizeDietLabels(dietLabels: string[]): string[] {
    if (!Array.isArray(dietLabels)) return [];
    
    return dietLabels.map(label => {
      const lowerLabel = label.toLowerCase();
      
      // Convert Spoonacular format to Edamam format
      switch (lowerLabel) {
        case 'gluten free':
          return 'Gluten-Free';
        case 'ketogenic':
          return 'Keto-Friendly';
        case 'vegetarian':
          return 'Vegetarian';
        case 'vegan':
          return 'Vegan';
        case 'paleo':
          return 'Paleo';
        case 'whole30':
          return 'Whole30';
        case 'dairy free':
          return 'Dairy-Free';
        case 'low carb':
          return 'Low-Carb';
        case 'low fat':
          return 'Low-Fat';
        case 'low sodium':
          return 'Low-Sodium';
        case 'high fiber':
          return 'High-Fiber';
        case 'high protein':
          return 'High-Protein';
        default:
          // Capitalize first letter of each word
          return label.split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join('-');
      }
    });
  }
  
  /**
   * Extract nutrition details from original API response
   */
  private extractNutritionFromOriginalApiResponse(originalApiResponse: any): any {
    if (!originalApiResponse || !originalApiResponse.nutrition) {
      return {};
    }

    const nutrition = originalApiResponse.nutrition;
    
    return {
      macros: nutrition.macros || {},
      micros: nutrition.micros || {},
      calories: nutrition.calories || { unit: 'kcal', quantity: 0 }
    };
  }

  /**
   * Merge nutrition details, prioritizing existing data but filling in missing micronutrients
   */
  private mergeNutritionDetails(existing: any, fromOriginal: any): any {
    const merged = { ...existing };
    
    // Merge macros
    if (fromOriginal.macros) {
      merged.macros = { ...merged.macros, ...fromOriginal.macros };
    }
    
    // Always use micronutrients from original API response if available
    if (fromOriginal.micros) {
      merged.micros = fromOriginal.micros;
    }
    
    // Merge calories
    if (fromOriginal.calories) {
      merged.calories = fromOriginal.calories;
    }
    
    return merged;
  }

  /**
   * Get empty nutrition details structure
   */
  private getEmptyNutritionDetails(): StandardizedNutritionDetails {
    return {
      macros: {
        fat: { unit: 'g', quantity: 0 },
        carbs: { unit: 'g', quantity: 0 },
        fiber: { unit: 'g', quantity: 0 },
        sugar: { unit: 'g', quantity: 0 },
        sodium: { unit: 'mg', quantity: 0 },
        protein: { unit: 'g', quantity: 0 }
      },
      micros: {
        minerals: {},
        vitamins: {}
      },
      calories: { unit: 'kcal', quantity: 0 }
    };
  }
  
  /**
   * Standardize recipe responses from database queries
   * This method handles raw database responses that may have different field names
   */
  standardizeDatabaseRecipeResponse(dbRecipe: any): StandardizedRecipeResponse {
    // Handle database field name variations
    const recipeForStandardization = {
      id: dbRecipe.id || dbRecipe.recipe_id,
      provider: dbRecipe.provider,
      external_recipe_id: dbRecipe.external_recipe_id || dbRecipe.externalRecipeId,
      external_recipe_uri: dbRecipe.external_recipe_uri || dbRecipe.externalRecipeUri || '',
      recipe_name: dbRecipe.recipe_name || dbRecipe.recipeName || dbRecipe.title,
      recipe_source: dbRecipe.recipe_source || dbRecipe.recipeSource || '',
      recipe_url: dbRecipe.recipe_url || dbRecipe.recipeUrl || '',
      recipe_image_url: dbRecipe.recipe_image_url || dbRecipe.recipeImageUrl || '',
      cuisine_types: dbRecipe.cuisine_types || dbRecipe.cuisineTypes || [],
      meal_types: dbRecipe.meal_types || dbRecipe.mealTypes || [],
      dish_types: dbRecipe.dish_types || dbRecipe.dishTypes || [],
      health_labels: dbRecipe.health_labels || dbRecipe.healthLabels || [],
      diet_labels: dbRecipe.diet_labels || dbRecipe.dietLabels || [],
      servings: dbRecipe.servings || 1,
      prep_time_minutes: dbRecipe.prep_time_minutes || dbRecipe.prepTimeMinutes || null,
      cook_time_minutes: dbRecipe.cook_time_minutes || dbRecipe.cookTimeMinutes || null,
      total_time_minutes: dbRecipe.total_time_minutes || dbRecipe.totalTimeMinutes || null,
      total_calories: dbRecipe.total_calories || dbRecipe.totalCalories || null,
      total_protein_g: dbRecipe.total_protein_g || dbRecipe.totalProteinG || null,
      total_carbs_g: dbRecipe.total_carbs_g || dbRecipe.totalCarbsG || null,
      total_fat_g: dbRecipe.total_fat_g || dbRecipe.totalFatG || null,
      total_fiber_g: dbRecipe.total_fiber_g || dbRecipe.totalFiberG || null,
      total_sugar_g: dbRecipe.total_sugar_g || dbRecipe.totalSugarG || null,
      total_sodium_mg: dbRecipe.total_sodium_mg || dbRecipe.totalSodiumMg || null,
      total_weight_g: dbRecipe.total_weight_g || dbRecipe.totalWeightG || null,
      calories_per_serving: dbRecipe.calories_per_serving || dbRecipe.caloriesPerServing || '0',
      protein_per_serving_g: dbRecipe.protein_per_serving_g || dbRecipe.proteinPerServingG || '0',
      carbs_per_serving_g: dbRecipe.carbs_per_serving_g || dbRecipe.carbsPerServingG || '0',
      fat_per_serving_g: dbRecipe.fat_per_serving_g || dbRecipe.fatPerServingG || '0',
      fiber_per_serving_g: dbRecipe.fiber_per_serving_g || dbRecipe.fiberPerServingG || '0',
      ingredients: dbRecipe.ingredients || [],
      ingredient_lines: dbRecipe.ingredient_lines || dbRecipe.ingredientLines || [],
      cooking_instructions: dbRecipe.cooking_instructions || dbRecipe.cookingInstructions || [],
      nutrition_details: this.mergeNutritionDetails(
        dbRecipe.nutrition_details || dbRecipe.nutritionDetails || {},
        this.extractNutritionFromOriginalApiResponse(dbRecipe.original_api_response || dbRecipe.originalApiResponse)
      ),
      original_api_response: dbRecipe.original_api_response || dbRecipe.originalApiResponse || {},
      cache_status: dbRecipe.cache_status || dbRecipe.cacheStatus || 'active',
      api_fetch_count: dbRecipe.api_fetch_count || dbRecipe.apiFetchCount || 0,
      last_api_fetch_at: dbRecipe.last_api_fetch_at || dbRecipe.lastApiFetchAt || '',
      last_accessed_at: dbRecipe.last_accessed_at || dbRecipe.lastAccessedAt || '',
      has_complete_nutrition: dbRecipe.has_complete_nutrition || dbRecipe.hasCompleteNutrition || false,
      has_detailed_ingredients: dbRecipe.has_detailed_ingredients || dbRecipe.hasDetailedIngredients || false,
      has_cooking_instructions: dbRecipe.has_cooking_instructions || dbRecipe.hasCookingInstructions || false,
      data_quality_score: dbRecipe.data_quality_score || dbRecipe.dataQualityScore || 0,
      created_at: dbRecipe.created_at || dbRecipe.createdAt || '',
      updated_at: dbRecipe.updated_at || dbRecipe.updatedAt || ''
    };
    
    // For manual provider, return directly to avoid recursion
    // For other providers, use their specific standardization
    if (recipeForStandardization.provider === 'manual') {
      return this.buildStandardizedResponse(recipeForStandardization);
    }
    
    return this.standardizeRecipeResponse(recipeForStandardization);
  }

  /**
   * Build standardized response from normalized data
   */
  private buildStandardizedResponse(recipe: any): StandardizedRecipeResponse {
    return {
      id: recipe.id,
      provider: recipe.provider,
      externalRecipeId: recipe.external_recipe_id,
      externalRecipeUri: recipe.external_recipe_uri,
      recipeName: recipe.recipe_name,
      recipeSource: recipe.recipe_source,
      recipeUrl: recipe.recipe_url,
      recipeImageUrl: recipe.recipe_image_url,
      cuisineTypes: recipe.cuisine_types,
      mealTypes: recipe.meal_types,
      dishTypes: recipe.dish_types,
      healthLabels: recipe.health_labels,
      dietLabels: recipe.diet_labels,
      servings: recipe.servings,
      nutritionServings: 1, // Default to 1, can be changed via edit servings API
      prepTimeMinutes: recipe.prep_time_minutes,
      cookTimeMinutes: recipe.cook_time_minutes,
      totalTimeMinutes: recipe.total_time_minutes,
      caloriesPerServing: recipe.calories_per_serving?.toString() || '0',
      proteinPerServingG: recipe.protein_per_serving_g?.toString() || '0',
      carbsPerServingG: recipe.carbs_per_serving_g?.toString() || '0',
      fatPerServingG: recipe.fat_per_serving_g?.toString() || '0',
      fiberPerServingG: recipe.fiber_per_serving_g?.toString() || '0',
      sugarPerServingG: recipe.total_sugar_g?.toString() || null,
      sodiumPerServingMg: recipe.total_sodium_mg?.toString() || null,
      totalCalories: recipe.total_calories?.toString() || null,
      totalProteinG: recipe.total_protein_g?.toString() || null,
      totalCarbsG: recipe.total_carbs_g?.toString() || null,
      totalFatG: recipe.total_fat_g?.toString() || null,
      totalFiberG: recipe.total_fiber_g?.toString() || null,
      totalSugarG: recipe.total_sugar_g?.toString() || null,
      totalSodiumMg: recipe.total_sodium_mg?.toString() || null,
      totalWeightG: recipe.total_weight_g?.toString() || null,
      ingredients: recipe.ingredients || [],
      ingredientLines: recipe.ingredient_lines || [],
      cookingInstructions: recipe.cooking_instructions || [],
      nutritionDetails: this.parseNutritionDetails(recipe.nutrition_details),
      originalApiResponse: recipe.original_api_response,
      cacheStatus: recipe.cache_status,
      apiFetchCount: recipe.api_fetch_count,
      lastApiFetchAt: recipe.last_api_fetch_at,
      lastAccessedAt: recipe.last_accessed_at,
      hasCompleteNutrition: recipe.has_complete_nutrition,
      hasDetailedIngredients: recipe.has_detailed_ingredients,
      hasCookingInstructions: recipe.has_cooking_instructions,
      dataQualityScore: recipe.data_quality_score,
      createdAt: recipe.created_at,
      updatedAt: recipe.updated_at
    };
  }
  
  /**
   * Standardize multiple database recipe responses
   */
  standardizeDatabaseRecipeResponses(dbRecipes: any[]): StandardizedRecipeResponse[] {
    return dbRecipes.map(recipe => this.standardizeDatabaseRecipeResponse(recipe));
  }
  
  /**
   * Standardize a recipe response regardless of provider
   */
  standardizeRecipeResponse(recipe: any): StandardizedRecipeResponse {
    if (recipe.provider === 'edamam') {
      return this.standardizeEdamamResponse(recipe);
    } else if (recipe.provider === 'spoonacular') {
      return this.standardizeSpoonacularResponse(recipe);
    } else if (recipe.provider === 'manual') {
      // Manual recipes are already in database format, return directly without recursion
      return this.buildStandardizedResponse(recipe);
    } else {
      throw new Error(`Unknown provider: ${recipe.provider}`);
    }
  }
  
  /**
   * Standardize an array of recipe responses
   */
  standardizeRecipeResponses(recipes: any[]): StandardizedRecipeResponse[] {
    return recipes.map(recipe => this.standardizeRecipeResponse(recipe));
  }
}
