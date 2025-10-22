import { supabase } from './supabase';
import { RecipeResponseStandardizationService, StandardizedRecipeResponse } from './recipeResponseStandardizationService';

export interface CachedRecipe {
  id: string;
  provider: 'edamam' | 'spoonacular';
  externalRecipeId: string;
  externalRecipeUri?: string;
  recipeName: string;
  recipeSource?: string;
  recipeUrl?: string;
  recipeImageUrl?: string;
  cuisineTypes?: string[];
  mealTypes?: string[];
  dishTypes?: string[];
  healthLabels?: string[];
  dietLabels?: string[];
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  totalCalories?: number;
  totalProteinG?: number;
  totalCarbsG?: number;
  totalFatG?: number;
  totalFiberG?: number;
  totalSugarG?: number;
  totalSodiumMg?: number;
  totalWeightG?: number;
  caloriesPerServing?: number;
  proteinPerServingG?: number;
  carbsPerServingG?: number;
  fatPerServingG?: number;
  fiberPerServingG?: number;
  ingredients?: any[];
  ingredientLines?: string[];
  cookingInstructions?: string[];
  nutritionDetails?: any;
  originalApiResponse?: any;
  cacheStatus?: string;
  apiFetchCount?: number;
  lastApiFetchAt?: string;
  lastAccessedAt?: string;
  hasCompleteNutrition?: boolean;
  hasDetailedIngredients?: boolean;
  hasCookingInstructions?: boolean;
  dataQualityScore?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecipeSearchCacheParams {
  query?: string;
  cuisineType?: string;
  mealType?: string;
  dishType?: string;
  health?: string[];
  diet?: string[];
  calories?: string;
  time?: string;
  excluded?: string[];
  maxResults?: number;
  provider?: 'edamam' | 'spoonacular' | 'both';
}

export interface CacheSearchResult {
  recipes: StandardizedRecipeResponse[];
  totalResults: number;
  fromCache: boolean;
  cacheHitRate: number;
}

export class RecipeCacheService {
  private standardizationService: RecipeResponseStandardizationService;
  
  constructor() {
    this.standardizationService = new RecipeResponseStandardizationService();
  }
  
  /**
   * Search recipes in cache with full-text search and filters
   */
  async searchRecipes(params: RecipeSearchCacheParams): Promise<CacheSearchResult> {
    try {
      const {
        query,
        cuisineType,
        mealType,
        dishType,
        health = [],
        diet = [],
        calories,
        time,
        excluded = [],
        maxResults = 20,
        provider = 'both'
      } = params;

      let supabaseQuery = supabase
        .from('cached_recipes')
        .select('*', { count: 'exact' })
        .eq('cache_status', 'active')
        .order('last_accessed_at', { ascending: false });

      // Provider filter
      if (provider !== 'both') {
        supabaseQuery = supabaseQuery.eq('provider', provider);
      }

      // Full-text search on recipe name
      if (query && query.trim()) {
        supabaseQuery = supabaseQuery.textSearch('recipe_name', query.trim());
      }

      // Cuisine type filter
      if (cuisineType) {
        supabaseQuery = supabaseQuery.contains('cuisine_types', [cuisineType]);
      }

      // Meal type filter
      if (mealType) {
        supabaseQuery = supabaseQuery.contains('meal_types', [mealType]);
      }

      // Dish type filter
      if (dishType) {
        supabaseQuery = supabaseQuery.contains('dish_types', [dishType]);
      }

      // Health labels filter (any of the provided health labels)
      if (health.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('health_labels', health);
      }

      // Diet labels filter (any of the provided diet labels)
      if (diet.length > 0) {
        supabaseQuery = supabaseQuery.overlaps('diet_labels', diet);
      }

      // Calories range filter
      if (calories) {
        const [minCal, maxCal] = this.parseCalorieRange(calories);
        if (minCal !== null) {
          supabaseQuery = supabaseQuery.gte('calories_per_serving', minCal);
        }
        if (maxCal !== null) {
          supabaseQuery = supabaseQuery.lte('calories_per_serving', maxCal);
        }
      }

      // Time filter
      if (time) {
        const maxTime = this.parseTimeFilter(time);
        if (maxTime !== null) {
          supabaseQuery = supabaseQuery.lte('total_time_minutes', maxTime);
        }
      }

      // Excluded ingredients filter
      if (excluded.length > 0) {
        // Use NOT operator with ingredient_lines array
        for (const ingredient of excluded) {
          supabaseQuery = supabaseQuery.not('ingredient_lines', 'cs', [ingredient.toLowerCase()]);
        }
      }

      // Limit results
      supabaseQuery = supabaseQuery.limit(maxResults);

      const { data: recipes, error, count } = await supabaseQuery;

      if (error) {
        console.error('Cache search error:', error);
        throw error;
      }

      // Update last_accessed_at for found recipes
      if (recipes && recipes.length > 0) {
        await this.updateLastAccessed(recipes.map(r => r.id));
      }

      // Fix nutrition data for any recipes with empty nutritionDetails before converting
      const fixedRecipes = recipes ? await Promise.all(
        recipes.map(recipe => this.ensureNutritionDetails(recipe))
      ) : [];

      // Convert cached recipes to standardized format
      const standardizedRecipes = this.convertCachedRecipesToUnified(fixedRecipes);

      return {
        recipes: standardizedRecipes,
        totalResults: count || 0,
        fromCache: true,
        cacheHitRate: recipes ? recipes.length / maxResults : 0
      };

    } catch (error) {
      console.error('Recipe cache search error:', error);
      return {
        recipes: [],
        totalResults: 0,
        fromCache: false,
        cacheHitRate: 0
      };
    }
  }

  /**
   * Get a specific recipe by provider and external ID
   */
  async getRecipeByExternalId(provider: 'edamam' | 'spoonacular', externalId: string): Promise<CachedRecipe | null> {
    try {
      const { data: recipe, error } = await supabase
        .from('cached_recipes')
        .select('*')
        .eq('provider', provider)
        .eq('external_recipe_id', externalId)
        .eq('cache_status', 'active')
        .single();

      if (error || !recipe) {
        return null;
      }

      // Update last accessed
      await this.updateLastAccessed([recipe.id]);

      // Fix nutrition data if it's empty but originalApiResponse has data
      const fixedRecipe = await this.ensureNutritionDetails(recipe);

      return fixedRecipe;
    } catch (error) {
      console.error('Get cached recipe error:', error);
      return null;
    }
  }

  /**
   * Get a specific recipe by ID (for API compatibility)
   */
  async getRecipeById(recipeId: string): Promise<CachedRecipe | null> {
    try {
      // Determine provider from recipe ID
      const provider = recipeId.startsWith('recipe_') ? 'edamam' : 'spoonacular';
      
      // Extract external ID from recipe ID
      let externalId = recipeId;
      if (provider === 'edamam' && recipeId.startsWith('recipe_')) {
        externalId = recipeId.replace('recipe_', '');
      }
      
      return await this.getRecipeByExternalId(provider, externalId);
    } catch (error) {
      console.error('Get recipe by ID error:', error);
      return null;
    }
  }

  /**
   * Store recipe in cache
   */
  async storeRecipe(recipe: Partial<CachedRecipe>): Promise<CachedRecipe | null> {
    try {
      // Validate that nutritionDetails is properly populated before caching
      const hasValidNutrition = recipe.nutritionDetails && 
        recipe.nutritionDetails.macros && 
        (recipe.nutritionDetails.macros.protein?.quantity > 0 || 
         recipe.nutritionDetails.macros.carbs?.quantity > 0 ||
         recipe.nutritionDetails.macros.fat?.quantity > 0);

      if (!hasValidNutrition) {
        console.warn(`⚠️ Attempting to cache recipe ${recipe.externalRecipeId} with empty nutritionDetails!`);
        console.warn(`   This should not happen - nutritionDetails should be populated before caching.`);
        console.warn(`   Recipe will still be cached, but may need repair later.`);
      }

      const { data: storedRecipe, error } = await supabase
        .from('cached_recipes')
        .insert({
          provider: recipe.provider,
          external_recipe_id: recipe.externalRecipeId,
          external_recipe_uri: recipe.externalRecipeUri,
          recipe_name: recipe.recipeName,
          recipe_source: recipe.recipeSource,
          recipe_url: recipe.recipeUrl,
          recipe_image_url: recipe.recipeImageUrl,
          cuisine_types: recipe.cuisineTypes || [],
          meal_types: recipe.mealTypes || [],
          dish_types: recipe.dishTypes || [],
          health_labels: recipe.healthLabels || [],
          diet_labels: recipe.dietLabels || [],
          servings: recipe.servings,
          prep_time_minutes: recipe.prepTimeMinutes,
          cook_time_minutes: recipe.cookTimeMinutes,
          total_time_minutes: recipe.totalTimeMinutes,
          // Ensure NULL/undefined nutrition values default to 0
          total_calories: recipe.totalCalories ?? 0,
          total_protein_g: recipe.totalProteinG ?? 0,
          total_carbs_g: recipe.totalCarbsG ?? 0,
          total_fat_g: recipe.totalFatG ?? 0,
          total_fiber_g: recipe.totalFiberG ?? 0,
          total_sugar_g: recipe.totalSugarG ?? 0,
          total_sodium_mg: recipe.totalSodiumMg ?? 0,
          total_weight_g: recipe.totalWeightG ?? 0,
          calories_per_serving: recipe.caloriesPerServing ?? 0,
          protein_per_serving_g: recipe.proteinPerServingG ?? 0,
          carbs_per_serving_g: recipe.carbsPerServingG ?? 0,
          fat_per_serving_g: recipe.fatPerServingG ?? 0,
          fiber_per_serving_g: recipe.fiberPerServingG ?? 0,
          ingredients: recipe.ingredients,
          ingredient_lines: recipe.ingredientLines || [],
          cooking_instructions: recipe.cookingInstructions || [],
          nutrition_details: recipe.nutritionDetails,
          original_api_response: recipe.originalApiResponse,
          has_complete_nutrition: recipe.hasCompleteNutrition || false,
          has_detailed_ingredients: recipe.hasDetailedIngredients || false,
          has_cooking_instructions: recipe.hasCookingInstructions || false,
          data_quality_score: recipe.dataQualityScore || 0
        })
        .select('*')
        .single();

      if (error) {
        console.error('Store recipe cache error:', error);
        return null;
      }

      return storedRecipe;
    } catch (error) {
      console.error('Store recipe error:', error);
      return null;
    }
  }

  /**
   * Update existing recipe in cache
   */
  async updateRecipe(id: string, updates: Partial<CachedRecipe>): Promise<CachedRecipe | null> {
    try {
      const { data: updatedRecipe, error } = await supabase
        .from('cached_recipes')
        .update({
          recipe_name: updates.recipeName,
          recipe_source: updates.recipeSource,
          recipe_url: updates.recipeUrl,
          recipe_image_url: updates.recipeImageUrl,
          cuisine_types: updates.cuisineTypes,
          meal_types: updates.mealTypes,
          dish_types: updates.dishTypes,
          health_labels: updates.healthLabels,
          diet_labels: updates.dietLabels,
          servings: updates.servings,
          prep_time_minutes: updates.prepTimeMinutes,
          cook_time_minutes: updates.cookTimeMinutes,
          total_time_minutes: updates.totalTimeMinutes,
          total_calories: updates.totalCalories,
          total_protein_g: updates.totalProteinG,
          total_carbs_g: updates.totalCarbsG,
          total_fat_g: updates.totalFatG,
          total_fiber_g: updates.totalFiberG,
          total_sugar_g: updates.totalSugarG,
          total_sodium_mg: updates.totalSodiumMg,
          total_weight_g: updates.totalWeightG,
          calories_per_serving: updates.caloriesPerServing,
          protein_per_serving_g: updates.proteinPerServingG,
          carbs_per_serving_g: updates.carbsPerServingG,
          fat_per_serving_g: updates.fatPerServingG,
          fiber_per_serving_g: updates.fiberPerServingG,
          ingredients: updates.ingredients,
          ingredient_lines: updates.ingredientLines,
          cooking_instructions: updates.cookingInstructions,
          nutrition_details: updates.nutritionDetails,
          original_api_response: updates.originalApiResponse,
          has_complete_nutrition: updates.hasCompleteNutrition,
          has_detailed_ingredients: updates.hasDetailedIngredients,
          has_cooking_instructions: updates.hasCookingInstructions,
          data_quality_score: updates.dataQualityScore,
          api_fetch_count: supabase.raw('api_fetch_count + 1'),
          last_api_fetch_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        console.error('Update recipe cache error:', error);
        return null;
      }

      return updatedRecipe;
    } catch (error) {
      console.error('Update recipe error:', error);
      return null;
    }
  }

  /**
   * Ensure nutritionDetails is populated, reconstructing from originalApiResponse if needed
   */
  private async ensureNutritionDetails(recipe: any): Promise<CachedRecipe> {
    try {
      // Check if nutritionDetails is missing or empty
      const hasNutritionDetails = recipe.nutrition_details && 
        recipe.nutrition_details.macros && 
        (recipe.nutrition_details.macros.protein?.quantity > 0 || 
         recipe.nutrition_details.macros.carbs?.quantity > 0 ||
         recipe.nutrition_details.macros.fat?.quantity > 0);

      if (!hasNutritionDetails && recipe.original_api_response?.nutrition) {
        console.log(`🔧 Fixing empty nutritionDetails for recipe ${recipe.external_recipe_id} from originalApiResponse`);
        
        // Dynamically import NutritionMappingService to avoid circular dependencies
        const { NutritionMappingService } = await import('./nutritionMappingService');
        
        let nutritionDetails: any = {};
        
        if (recipe.provider === 'spoonacular') {
          nutritionDetails = NutritionMappingService.transformSpoonacularNutrition(recipe.original_api_response.nutrition);
        } else if (recipe.provider === 'edamam') {
          const servings = recipe.servings || recipe.original_api_response.yield || 1;
          nutritionDetails = NutritionMappingService.transformEdamamNutrition(recipe.original_api_response.nutrition, servings);
        }
        
        console.log(`✅ Reconstructed nutritionDetails:`, {
          recipeId: recipe.external_recipe_id,
          hasVitamins: Object.keys(nutritionDetails.micros?.vitamins || {}).length,
          hasMinerals: Object.keys(nutritionDetails.micros?.minerals || {}).length,
          protein: nutritionDetails.macros?.protein?.quantity,
          calories: nutritionDetails.calories?.quantity
        });
        
        // Update the cache with the fixed nutrition data
        await supabase
          .from('cached_recipes')
          .update({
            nutrition_details: nutritionDetails,
            updated_at: new Date().toISOString()
          })
          .eq('id', recipe.id);
        
        // Return the fixed recipe
        return {
          ...recipe,
          nutritionDetails: nutritionDetails
        };
      }
      
      return recipe;
    } catch (error) {
      console.error('Error ensuring nutrition details:', error);
      // Return original recipe if fix fails
      return recipe;
    }
  }

  /**
   * Update last accessed timestamp for recipes
   */
  private async updateLastAccessed(recipeIds: string[]): Promise<void> {
    try {
      await supabase
        .from('cached_recipes')
        .update({ last_accessed_at: new Date().toISOString() })
        .in('id', recipeIds);
    } catch (error) {
      console.error('Update last accessed error:', error);
    }
  }

  /**
   * Parse calorie range from API format (e.g., "100-300", "300+", "100")
   */
  private parseCalorieRange(calories: string): [number | null, number | null] {
    if (calories.includes('+')) {
      const min = parseInt(calories.replace('+', ''));
      return [min, null];
    } else if (calories.includes('-')) {
      const [min, max] = calories.split('-').map(c => parseInt(c));
      return [min || null, max || null];
    } else {
      const exact = parseInt(calories);
      return [exact - 50, exact + 50]; // Allow some variance
    }
  }

  /**
   * Parse time filter from API format (e.g., "30", "30+")
   */
  private parseTimeFilter(time: string): number | null {
    if (time.includes('+')) {
      return parseInt(time.replace('+', ''));
    } else {
      return parseInt(time);
    }
  }

  /**
   * Convert cached recipe to unified format with standardization
   */
  convertCachedToUnified(cachedRecipe: CachedRecipe): StandardizedRecipeResponse {
    // Convert the cached recipe to the format expected by the standardization service
    const recipeForStandardization = {
      id: cachedRecipe.id,
      provider: cachedRecipe.provider,
      external_recipe_id: cachedRecipe.externalRecipeId,
      external_recipe_uri: cachedRecipe.externalRecipeUri || '',
      recipe_name: cachedRecipe.recipeName,
      recipe_source: cachedRecipe.recipeSource || '',
      recipe_url: cachedRecipe.recipeUrl || '',
      recipe_image_url: cachedRecipe.recipeImageUrl || '',
      cuisine_types: cachedRecipe.cuisineTypes || [],
      meal_types: cachedRecipe.mealTypes || [],
      dish_types: cachedRecipe.dishTypes || [],
      health_labels: cachedRecipe.healthLabels || [],
      diet_labels: cachedRecipe.dietLabels || [],
      servings: cachedRecipe.servings || 1,
      prep_time_minutes: cachedRecipe.prepTimeMinutes || null,
      cook_time_minutes: cachedRecipe.cookTimeMinutes || null,
      total_time_minutes: cachedRecipe.totalTimeMinutes || null,
      total_calories: cachedRecipe.totalCalories?.toString() || null,
      total_protein_g: cachedRecipe.totalProteinG?.toString() || null,
      total_carbs_g: cachedRecipe.totalCarbsG?.toString() || null,
      total_fat_g: cachedRecipe.totalFatG?.toString() || null,
      total_fiber_g: cachedRecipe.totalFiberG?.toString() || null,
      total_sugar_g: cachedRecipe.totalSugarG?.toString() || null,
      total_sodium_mg: cachedRecipe.totalSodiumMg?.toString() || null,
      total_weight_g: cachedRecipe.totalWeightG?.toString() || null,
      calories_per_serving: cachedRecipe.caloriesPerServing?.toString() || '0',
      protein_per_serving_g: cachedRecipe.proteinPerServingG?.toString() || '0',
      carbs_per_serving_g: cachedRecipe.carbsPerServingG?.toString() || '0',
      fat_per_serving_g: cachedRecipe.fatPerServingG?.toString() || '0',
      fiber_per_serving_g: cachedRecipe.fiberPerServingG?.toString() || '0',
      ingredients: cachedRecipe.ingredients || [],
      ingredient_lines: cachedRecipe.ingredientLines || [],
      cooking_instructions: cachedRecipe.cookingInstructions || [],
      nutrition_details: cachedRecipe.nutritionDetails || {},
      original_api_response: cachedRecipe.originalApiResponse || {},
      cache_status: cachedRecipe.cacheStatus || 'active',
      api_fetch_count: cachedRecipe.apiFetchCount || 0,
      last_api_fetch_at: cachedRecipe.lastApiFetchAt || '',
      last_accessed_at: cachedRecipe.lastAccessedAt || '',
      has_complete_nutrition: cachedRecipe.hasCompleteNutrition || false,
      has_detailed_ingredients: cachedRecipe.hasDetailedIngredients || false,
      has_cooking_instructions: cachedRecipe.hasCookingInstructions || false,
      data_quality_score: cachedRecipe.dataQualityScore || 0,
      created_at: cachedRecipe.createdAt || '',
      updated_at: cachedRecipe.updatedAt || ''
    };
    
    // Use the standardization service to ensure uniform structure
    return this.standardizationService.standardizeRecipeResponse(recipeForStandardization);
  }

  /**
   * Convert multiple cached recipes to unified format with standardization
   */
  convertCachedRecipesToUnified(cachedRecipes: CachedRecipe[]): StandardizedRecipeResponse[] {
    return cachedRecipes.map(recipe => this.convertCachedToUnified(recipe));
  }
  
  /**
   * Update nutrition details for a cached recipe
   */
  async updateRecipeNutrition(recipeId: string, nutritionDetails: any): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('cached_recipes')
        .update({
          nutrition_details: nutritionDetails,
          has_complete_nutrition: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipeId);

      if (error) {
        console.error('Update recipe nutrition error:', error);
        return false;
      }

      console.log(`✅ Updated nutrition for recipe ${recipeId}`);
      return true;
    } catch (error) {
      console.error('Update recipe nutrition error:', error);
      return false;
    }
  }
  
  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      const { data: stats, error } = await supabase
        .from('cached_recipes')
        .select('provider, cache_status, count(*)')
        .group('provider, cache_status');

      if (error) {
        console.error('Get cache stats error:', error);
        return null;
      }

      return stats;
    } catch (error) {
      console.error('Get cache stats error:', error);
      return null;
    }
  }
}
