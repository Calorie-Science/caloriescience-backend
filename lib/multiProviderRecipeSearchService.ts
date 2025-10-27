import { EdamamService, RecipeSearchParams as EdamamSearchParams, EdamamRecipe } from './edamamService';
import { supabase } from './supabase';

// Spoonacular API interfaces
export interface SpoonacularSearchParams {
  query?: string;
  cuisine?: string[];
  diet?: string[];
  intolerances?: string[];
  type?: string[];
  maxReadyTime?: number;
  minCalories?: number;
  maxCalories?: number;
  minProtein?: number;
  maxProtein?: number;
  minCarbs?: number;
  maxCarbs?: number;
  minFat?: number;
  maxFat?: number;
  number?: number;
  offset?: number;
  sort?: 'popularity' | 'healthiness' | 'price' | 'time' | 'random';
  sortDirection?: 'asc' | 'desc';
  addRecipeNutrition?: boolean;
}

export interface SpoonacularRecipe {
  id: number;
  title: string;
  image: string;
  imageType: string;
  servings: number;
  readyInMinutes: number;
  sourceUrl: string;
  spoonacularSourceUrl: string;
  healthScore: number;
  spoonacularScore: number;
  pricePerServing: number;
  analyzedInstructions: any[];
  cheap: boolean;
  creditsText: string;
  cuisines: string[];
  dairyFree: boolean;
  diets: string[];
  gaps: string;
  glutenFree: boolean;
  instructions: string;
  ketogenic: boolean;
  lowFodmap: boolean;
  occasions: string[];
  sustainable: boolean;
  vegan: boolean;
  vegetarian: boolean;
  veryHealthy: boolean;
  veryPopular: boolean;
  whole30: boolean;
  weightWatcherSmartPoints: number;
  dishTypes: string[];
  extendedIngredients: SpoonacularIngredient[];
  summary: string;
  winePairing?: any;
  nutrition?: {
    nutrients: Array<{
      name: string;
      amount: number;
      unit: string;
      percentOfDailyNeeds?: number;
    }>;
  };
}

export interface SpoonacularIngredient {
  id: number;
  aisle: string;
  image: string;
  consistency: string;
  name: string;
  nameClean: string;
  original: string;
  originalName: string;
  amount: number;
  unit: string;
  meta: string[];
  measures: {
    us: { amount: number; unitShort: string; unitLong: string };
    metric: { amount: number; unitShort: string; unitLong: string };
  };
}

export interface SpoonacularSearchResponse {
  results: SpoonacularRecipe[];
  offset: number;
  number: number;
  totalResults: number;
}

// Unified recipe summary interface for search results
export interface UnifiedRecipeSummary {
  id: string;
  title: string;
  image: string;
  sourceUrl: string;
  source: 'edamam' | 'spoonacular' | 'bonhappetee' | 'manual';
  readyInMinutes?: number;
  servings?: number;
  // Nutrition data (per serving)
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  // Metadata for filtering
  healthLabels?: string[];
  dietLabels?: string[];
  cuisineType?: string[];
  dishType?: string[];
  mealType?: string[];
  allergens?: string[];
  // Ingredients for allergen checking
  ingredients?: Array<{ name?: string; food?: string; [key: string]: any }>;
  // Filter compatibility warnings
  filterWarnings?: {
    unsupportedFilters: string[]; // Filters not supported by this recipe's provider
    message?: string;
  };
  // Custom recipe metadata
  isCustom?: boolean;
  createdBy?: string;
  isPublic?: boolean;
}

// Unified recipe interface for detailed view
export interface UnifiedRecipe extends UnifiedRecipeSummary {
  servings: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  ingredients: UnifiedIngredient[];
  instructions?: string;
  summary?: string;
  healthLabels: string[];
  dietLabels: string[];
  cuisineType: string[];
  dishType: string[];
  mealType: string[];
  tags: string[]; // Computed field combining all categorizations
}

export interface UnifiedIngredient {
  id?: string;
  name: string;
  amount: number;
  unit: string;
  image?: string;
  original: string;
}

export interface UnifiedSearchParams {
  query?: string;
  diet?: string[];
  health?: string[];
  cuisineType?: string[];
  mealType?: string[];
  dishType?: string[];
  calories?: string;
  time?: string;
  excluded?: string[];
  maxResults?: number;
  provider?: 'edamam' | 'spoonacular' | 'bonhappetee' | 'both' | 'all' | 'manual';
  includeCustom?: boolean; // Include custom recipes in search (default: true)
}

export interface UnifiedSearchResponse {
  recipes: UnifiedRecipeSummary[];
  totalResults: number;
  provider: string;
  searchParams: UnifiedSearchParams;
}

export interface ClientAwareSearchParams extends UnifiedSearchParams {
  clientId: string;
  searchType?: 'broad' | 'name' | 'ingredient'; // Type of search
  ingredients?: string[]; // For ingredient search (can be multiple)
  // Note: diet and cuisineType from UnifiedSearchParams are what UX sends
  // Backend will compare with client profile to detect removed items
}

export interface ClientAwareSearchResponse extends UnifiedSearchResponse {
  clientProfile: {
    id: string;
    name: string;
    allergies: string[];
    preferences: string[];
    cuisineTypes?: string[];
  };
  appliedFilters: {
    allergenFilters: string[]; // Always applied from client (cannot be overridden)
    uxPreferences: string[]; // What UX sent (no longer used as filter)
    uxCuisineTypes: string[]; // What UX sent
    removedPreferences: string[]; // Client preferences NOT in UX request
    removedCuisineTypes: string[]; // Client cuisine types NOT in UX request
    ingredientLevelFiltering?: boolean; // Flag indicating ingredient-level allergen checking was performed
  };
}

export class MultiProviderRecipeSearchService {
  private edamamService: EdamamService;
  private spoonacularApiKey: string;
  private bonHappeteeService: any; // Lazy loaded

  constructor() {
    this.edamamService = new EdamamService();
    this.spoonacularApiKey = process.env.SPOONACULAR_API_KEY || '';
    
    if (!this.spoonacularApiKey) {
      throw new Error('SPOONACULAR_API_KEY environment variable is required');
    }
    
    // Lazy load Bon Happetee service (optional dependency)
    if (process.env.BON_HAPPETEE_API_KEY) {
      const { BonHappeteeService } = require('./bonHappeteeService');
      this.bonHappeteeService = new BonHappeteeService();
    }
  }

  /**
   * Search recipes across multiple providers
   */
  async searchRecipes(params: UnifiedSearchParams, userId?: string): Promise<UnifiedSearchResponse> {
    const { provider = 'all', maxResults = 20, includeCustom = true } = params;
    
    console.log('🔍 MultiProvider searchRecipes called with:', { provider, maxResults, params });
    
    if (provider === 'manual') {
      // Search only custom recipes
      return await this.searchCustomRecipes(params, userId);
    } else if (provider === 'edamam') {
      const results = await this.searchEdamam(params, userId);
      // Add custom recipes if requested
      if (includeCustom && userId) {
        const customResults = await this.searchCustomRecipes(params, userId);
        results.recipes = [...customResults.recipes, ...results.recipes].slice(0, maxResults);
        results.totalResults += customResults.totalResults;
      }
      return results;
    } else if (provider === 'spoonacular') {
      console.log('🍽️ Routing to Spoonacular search');
      const results = await this.searchSpoonacular(params);
      // Add custom recipes if requested
      if (includeCustom && userId) {
        const customResults = await this.searchCustomRecipes(params, userId);
        results.recipes = [...customResults.recipes, ...results.recipes].slice(0, maxResults);
        results.totalResults += customResults.totalResults;
      }
      return results;
    } else if (provider === 'bonhappetee') {
      console.log('🍛 Routing to Bon Happetee search');
      const results = await this.searchBonHappetee(params);
      // Add custom recipes if requested
      if (includeCustom && userId) {
        const customResults = await this.searchCustomRecipes(params, userId);
        results.recipes = [...customResults.recipes, ...results.recipes].slice(0, maxResults);
        results.totalResults += customResults.totalResults;
      }
      return results;
    } else if (provider === 'both') {
      // Search Edamam and Spoonacular (legacy compatibility)
      console.log('🔄 Searching both providers (Edamam + Spoonacular)');
      const resultsPerProvider = includeCustom && userId ? Math.ceil(maxResults / 3) : Math.ceil(maxResults / 2);
      
      const promises: Promise<UnifiedSearchResponse>[] = [
        this.searchEdamam({ ...params, maxResults: resultsPerProvider }, userId),
        this.searchSpoonacular({ ...params, maxResults: resultsPerProvider })
      ];

      // Include custom recipes if requested
      if (includeCustom && userId) {
        promises.push(this.searchCustomRecipes({ ...params, maxResults: resultsPerProvider }, userId));
      }

      const results = await Promise.allSettled(promises);

      const recipes: UnifiedRecipeSummary[] = [];
      let totalResults = 0;

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          recipes.push(...result.value.recipes);
          totalResults += result.value.totalResults;
        }
      });

      // Shuffle and limit results
      const shuffledRecipes = this.shuffleArray(recipes).slice(0, maxResults);

      return {
        recipes: shuffledRecipes,
        totalResults,
        provider: includeCustom && userId ? 'both+custom' : 'both',
        searchParams: params
      };
    } else {
      // Search ALL providers (Edamam + Spoonacular + Bon Happetee)
      console.log('🌍 Searching all providers (Edamam + Spoonacular + Bon Happetee)');
      const resultsPerProvider = includeCustom && userId ? Math.ceil(maxResults / 4) : Math.ceil(maxResults / 3);
      
      const promises: Promise<UnifiedSearchResponse>[] = [
        this.searchEdamam({ ...params, maxResults: resultsPerProvider }, userId),
        this.searchSpoonacular({ ...params, maxResults: resultsPerProvider }),
        this.searchBonHappetee({ ...params, maxResults: resultsPerProvider })
      ];

      // Include custom recipes if requested
      if (includeCustom && userId) {
        promises.push(this.searchCustomRecipes({ ...params, maxResults: resultsPerProvider }, userId));
      }

      const results = await Promise.allSettled(promises);

      const recipes: UnifiedRecipeSummary[] = [];
      let totalResults = 0;

      results.forEach(result => {
        if (result.status === 'fulfilled') {
          recipes.push(...result.value.recipes);
          totalResults += result.value.totalResults;
        }
      });

      // Shuffle and limit results
      const shuffledRecipes = this.shuffleArray(recipes).slice(0, maxResults);

      return {
        recipes: shuffledRecipes,
        totalResults,
        provider: includeCustom && userId ? 'all+custom' : 'all',
        searchParams: params
      };
    }
  }

  /**
   * Search recipes using Edamam
   */
  private async searchEdamam(params: UnifiedSearchParams, userId?: string): Promise<UnifiedSearchResponse> {
    try {
      const edamamParams: EdamamSearchParams = this.convertToEdamamParams(params);
      const response = await this.edamamService.searchRecipes(edamamParams, userId);
      
      const recipes: UnifiedRecipeSummary[] = (response.hits || []).map(hit => 
        this.convertEdamamToSummary(hit.recipe)
      );

      return {
        recipes,
        totalResults: response.count || 0,
        provider: 'edamam',
        searchParams: params
      };
    } catch (error) {
      console.error('❌ Edamam search error:', error);
      return {
        recipes: [],
        totalResults: 0,
        provider: 'edamam',
        searchParams: params
      };
    }
  }

  /**
   * Search recipes using Spoonacular
   */
  private async searchSpoonacular(params: UnifiedSearchParams): Promise<UnifiedSearchResponse> {
    console.log('🍽️ Starting Spoonacular search with params:', params);
    
    if (!this.spoonacularApiKey) {
      console.warn('⚠️ Spoonacular API key not available');
      return {
        recipes: [],
        totalResults: 0,
        provider: 'spoonacular',
        searchParams: params
      };
    }

    try {
      const spoonacularParams: SpoonacularSearchParams = this.convertToSpoonacularParams(params);
      const response = await this.searchSpoonacularAPI(spoonacularParams);
      
      // Convert to summaries
      const recipes: UnifiedRecipeSummary[] = response.results
        .slice(0, params.maxResults || 20)
        .map(recipe => this.convertSpoonacularToSummary(recipe));

      console.log(`✅ Spoonacular search completed: ${recipes.length} recipes found`);
      
      // Enrich with ingredients for allergen filtering
      console.log(`🔍 Fetching ingredients for ${recipes.length} Spoonacular recipes...`);
      const enrichedRecipes = await this.enrichSpoonacularWithIngredients(recipes);
      console.log(`✅ Enriched ${enrichedRecipes.length} recipes with ingredient data`);

      return {
        recipes: enrichedRecipes,
        totalResults: response.totalResults,
        provider: 'spoonacular',
        searchParams: params
      };
    } catch (error) {
      console.error('❌ Spoonacular search error:', error);
      return {
        recipes: [],
        totalResults: 0,
        provider: 'spoonacular',
        searchParams: params
      };
    }
  }

  /**
   * Enrich Spoonacular search results with ingredients from details API
   * This is needed for ingredient-level allergen filtering
   */
  private async enrichSpoonacularWithIngredients(recipes: UnifiedRecipeSummary[]): Promise<UnifiedRecipeSummary[]> {
    try {
      // Fetch details for all recipes in parallel (with rate limiting)
      const enrichPromises = recipes.map(async (recipe) => {
        try {
          // Try to get from cache first
          const { data: cached } = await supabase
            .from('cached_recipes')
            .select('ingredients, health_labels, allergens')
            .eq('provider', 'spoonacular')
            .eq('external_recipe_id', recipe.id)
            .eq('cache_status', 'active')
            .single();
          
          if (cached && cached.ingredients && cached.ingredients.length > 0) {
            console.log(`  📦 Using cached ingredients for ${recipe.title}`);
            return {
              ...recipe,
              ingredients: cached.ingredients,
              healthLabels: cached.health_labels || recipe.healthLabels,
              allergens: cached.allergens || recipe.allergens
            };
          }
          
          // Fetch from API if not in cache
          console.log(`  🌐 Fetching ingredients from API for ${recipe.title}`);
          const detailsUrl = `https://api.spoonacular.com/recipes/${recipe.id}/information?apiKey=${this.spoonacularApiKey}`;
          const detailsResponse = await fetch(detailsUrl);
          
          if (!detailsResponse.ok) {
            console.warn(`  ⚠️ Failed to fetch details for recipe ${recipe.id}`);
            return recipe; // Return original without ingredients
          }
          
          const details = await detailsResponse.json();
          
          // Extract ingredients
          const ingredients = details.extendedIngredients?.map((ing: any) => ({
            name: ing.name,
            food: ing.name,
            amount: ing.amount,
            unit: ing.unit,
            original: ing.original
          })) || [];
          
          return {
            ...recipe,
            ingredients
          };
          
        } catch (error) {
          console.error(`  ❌ Error enriching recipe ${recipe.id}:`, error);
          return recipe; // Return original on error
        }
      });
      
      // Wait for all enrichments (with timeout)
      const enriched = await Promise.all(enrichPromises);
      return enriched;
      
    } catch (error) {
      console.error('❌ Error enriching Spoonacular recipes:', error);
      return recipes; // Return original recipes on error
    }
  }

  /**
   * Search Bon Happetee (Indian food database)
   */
  private async searchBonHappetee(params: UnifiedSearchParams): Promise<UnifiedSearchResponse> {
    console.log('🍛 Starting Bon Happetee search with params:', params);
    
    if (!this.bonHappeteeService) {
      console.warn('⚠️ Bon Happetee service not available');
      return {
        recipes: [],
        totalResults: 0,
        provider: 'bonhappetee',
        searchParams: params
      };
    }

    try {
      // Bon Happetee only supports simple text search
      const query = params.query || '';
      if (!query) {
        return {
          recipes: [],
          totalResults: 0,
          provider: 'bonhappetee',
          searchParams: params
        };
      }

      const results = await this.bonHappeteeService.searchRecipes(query);
      
      // Convert to unified format
      const recipes: UnifiedRecipeSummary[] = results
        .slice(0, params.maxResults || 20)
        .map(result => this.convertBonHappeteeToUnified(result) as UnifiedRecipeSummary);

      console.log(`✅ Bon Happetee search completed: ${recipes.length} recipes found`);
      
      // Enrich with ingredients and allergen data for filtering
      console.log(`🔍 Fetching ingredients & allergens for ${recipes.length} Bon Happetee recipes...`);
      const enrichedRecipes = await this.enrichBonHappeteeWithIngredientsAndAllergens(recipes);
      console.log(`✅ Enriched ${enrichedRecipes.length} recipes with ingredient & allergen data`);
      
      return {
        recipes: enrichedRecipes,
        totalResults: results.length,
        provider: 'bonhappetee',
        searchParams: params
      };
    } catch (error) {
      console.error('❌ Bon Happetee search error:', error);
      return {
        recipes: [],
        totalResults: 0,
        provider: 'bonhappetee',
        searchParams: params
      };
    }
  }

  /**
   * Enrich Bon Appetit search results with ingredients and allergen data
   * Uses /ingredients and /disorder endpoints
   */
  private async enrichBonHappeteeWithIngredientsAndAllergens(recipes: UnifiedRecipeSummary[]): Promise<UnifiedRecipeSummary[]> {
    try {
      const enrichPromises = recipes.map(async (recipe) => {
        try {
          // Try to get from cache first
          const { data: cached } = await supabase
            .from('cached_recipes')
            .select('ingredients, allergens, health_labels')
            .eq('provider', 'bonhappetee')
            .eq('external_recipe_id', recipe.id)
            .eq('cache_status', 'active')
            .single();
          
          if (cached && cached.ingredients && cached.ingredients.length > 0) {
            console.log(`  📦 Using cached data for ${recipe.title}`);
            return {
              ...recipe,
              ingredients: cached.ingredients,
              allergens: cached.allergens || [],
              healthLabels: cached.health_labels || recipe.healthLabels
            };
          }
          
          // Fetch ingredients and allergens from API
          console.log(`  🌐 Fetching ingredients & allergens from API for ${recipe.title}`);
          const [ingredientsData, disorderData] = await Promise.all([
            this.bonHappeteeService.getIngredients(recipe.id),
            this.bonHappeteeService.getRecipeDetails(recipe.id)
          ]);
          
          // Transform ingredients to our format
          const ingredients = (ingredientsData || []).map((ing: any) => ({
            name: ing.ingredient_name || ing.food_name || '',
            food: ing.ingredient_name || ing.food_name || '',
            amount: ing.quantity || 0,
            unit: ing.unit || ''
          }));
          
          // Extract allergens from disorder data
          const allergens = disorderData?.allergens || [];
          const healthLabels = disorderData?.healthLabels || [];
          
          return {
            ...recipe,
            ingredients,
            allergens,
            healthLabels
          };
          
        } catch (error) {
          console.error(`  ❌ Error enriching Bon Happetee recipe ${recipe.id}:`, error);
          return recipe; // Return original on error
        }
      });
      
      const enriched = await Promise.all(enrichPromises);
      return enriched;
      
    } catch (error) {
      console.error('❌ Error enriching Bon Happetee recipes:', error);
      return recipes;
    }
  }

  /**
   * Search custom recipes created by nutritionists
   */
  private async searchCustomRecipes(params: UnifiedSearchParams, userId?: string): Promise<UnifiedSearchResponse> {
    if (!userId) {
      return {
        recipes: [],
        totalResults: 0,
        provider: 'manual',
        searchParams: params
      };
    }

    try {
      const maxResults = params.maxResults || 20;

      // Build query for custom recipes
      let query = supabase
        .from('cached_recipes')
        .select('*', { count: 'exact' })
        .eq('provider', 'manual')
        .eq('cache_status', 'active');

      // Access filter: own private recipes + public recipes
      query = query.or(`created_by_nutritionist_id.eq.${userId},is_public.eq.true`);

      // Search filter
      if (params.query) {
        query = query.ilike('recipe_name', `%${params.query}%`);
      }

      // Health labels filter
      if (params.health && params.health.length > 0) {
        query = query.contains('health_labels', params.health);
      }

      // Cuisine types filter
      if (params.cuisineType && params.cuisineType.length > 0) {
        query = query.overlaps('cuisine_types', params.cuisineType);
      }

      // Meal types filter
      if (params.mealType && params.mealType.length > 0) {
        query = query.overlaps('meal_types', params.mealType);
      }

      // Dish types filter
      if (params.dishType && params.dishType.length > 0) {
        query = query.overlaps('dish_types', params.dishType);
      }

      // Calories filter
      if (params.calories) {
        const caloriesMatch = params.calories.match(/(\d+)-(\d+)/);
        if (caloriesMatch) {
          const [, min, max] = caloriesMatch;
          query = query.gte('calories_per_serving', parseInt(min));
          query = query.lte('calories_per_serving', parseInt(max));
        }
      }

      // Limit results
      query = query.limit(maxResults);

      // Order by creation date (newest first)
      query = query.order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error searching custom recipes:', error);
        return {
          recipes: [],
          totalResults: 0,
          provider: 'manual',
          searchParams: params
        };
      }

      const recipes: UnifiedRecipeSummary[] = (data || []).map(recipe => ({
        id: recipe.id,
        title: recipe.recipe_name,
        image: recipe.recipe_image_url || '',
        sourceUrl: '',
        source: 'manual' as const,
        readyInMinutes: recipe.total_time_minutes || undefined,
        servings: recipe.servings || undefined,
        calories: recipe.calories_per_serving || undefined,
        protein: recipe.protein_per_serving_g || undefined,
        carbs: recipe.carbs_per_serving_g || undefined,
        fat: recipe.fat_per_serving_g || undefined,
        fiber: recipe.fiber_per_serving_g || undefined,
        // Add complete metadata for filtering
        healthLabels: recipe.health_labels || [],
        dietLabels: recipe.diet_labels || [],
        cuisineType: recipe.cuisine_types || [],
        dishType: recipe.dish_types || [],
        mealType: recipe.meal_types || [],
        allergens: recipe.allergens || [],
        // Add ingredients for allergen checking
        ingredients: recipe.ingredients || [],
        isCustom: true,
        createdBy: recipe.created_by_nutritionist_id,
        isPublic: recipe.is_public
      }));

      return {
        recipes,
        totalResults: count || 0,
        provider: 'manual',
        searchParams: params
      };
    } catch (error) {
      console.error('❌ Error searching custom recipes:', error);
      return {
        recipes: [],
        totalResults: 0,
        provider: 'manual',
        searchParams: params
      };
    }
  }

  /**
   * Get detailed recipe information from Spoonacular
   */
  private async getSpoonacularRecipeDetails(recipeId: number): Promise<SpoonacularRecipe | null> {
    try {
      const response = await fetch(
        `https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${this.spoonacularApiKey}&includeNutrition=true`
      );
      
      if (!response.ok) {
        throw new Error(`Spoonacular recipe details API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`❌ Error fetching Spoonacular recipe details for ${recipeId}:`, error);
      return null;
    }
  }

  /**
   * Make API call to Spoonacular
   */
  private async searchSpoonacularAPI(params: SpoonacularSearchParams): Promise<SpoonacularSearchResponse> {
    const searchParams = new URLSearchParams();
    
    // Add API key
    searchParams.append('apiKey', this.spoonacularApiKey);
    
    // Add search parameters
    if (params.query) searchParams.append('query', params.query);
    if (params.cuisine && params.cuisine.length > 0) {
      // Spoonacular expects comma-separated cuisine values
      searchParams.append('cuisine', params.cuisine.join(','));
    }
    if (params.diet && params.diet.length > 0) {
      searchParams.append('diet', params.diet.join(','));
    }
    if (params.intolerances && params.intolerances.length > 0) {
      searchParams.append('intolerances', params.intolerances.join(','));
    }
    if (params.type && params.type.length > 0) {
      searchParams.append('type', params.type.join(','));
    }
    if (params.maxReadyTime) searchParams.append('maxReadyTime', params.maxReadyTime.toString());
    if (params.minCalories) searchParams.append('minCalories', params.minCalories.toString());
    if (params.maxCalories) searchParams.append('maxCalories', params.maxCalories.toString());
    if (params.minProtein) searchParams.append('minProtein', params.minProtein.toString());
    if (params.maxProtein) searchParams.append('maxProtein', params.maxProtein.toString());
    if (params.minCarbs) searchParams.append('minCarbs', params.minCarbs.toString());
    if (params.maxCarbs) searchParams.append('maxCarbs', params.maxCarbs.toString());
    if (params.minFat) searchParams.append('minFat', params.minFat.toString());
    if (params.maxFat) searchParams.append('maxFat', params.maxFat.toString());
    if (params.number) searchParams.append('number', params.number.toString());
    if (params.offset) searchParams.append('offset', params.offset.toString());
    if (params.sort) searchParams.append('sort', params.sort);
    if (params.sortDirection) searchParams.append('sortDirection', params.sortDirection);
    if (params.addRecipeNutrition) searchParams.append('addRecipeNutrition', 'true');

    const url = `https://api.spoonacular.com/recipes/complexSearch?${searchParams}`;
    console.log('🍽️ Spoonacular API URL:', url);
    console.log('🍽️ Spoonacular params:', params);
    console.log('🍽️ CURL COMMAND:');
    console.log(`curl -X GET "${url}"`);

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Spoonacular API error:', response.status, response.statusText, errorText);
      throw new Error(`Spoonacular API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Spoonacular API response:', result);
    console.log('📊 Spoonacular results count:', result.results?.length || 0);
    console.log('📊 Spoonacular total results:', result.totalResults || 0);
    return result;
  }

  /**
   * Convert unified params to Edamam format
   */
  private convertToEdamamParams(params: UnifiedSearchParams): EdamamSearchParams {
    return {
      query: params.query,
      diet: params.diet,
      health: params.health,
      cuisineType: params.cuisineType,
      mealType: params.mealType,
      dishType: params.dishType,
      calories: params.calories,
      time: params.time,
      excluded: params.excluded,
      random: true,
      type: ['public'] // Only get public recipes, exclude user-generated content
    };
  }

  /**
   * Convert unified params to Spoonacular format
   */
  private convertToSpoonacularParams(params: UnifiedSearchParams): SpoonacularSearchParams {
    console.log('🔄 Converting to Spoonacular params:', params);
    console.log('🍽️ Original cuisine types:', params.cuisineType);
    
    // Map cuisine types to Spoonacular's expected format (title case)
    const validSpoonacularCuisines = ['African', 'Asian', 'American', 'British', 'Cajun', 'Caribbean', 'Chinese', 'Eastern European', 'European', 'French', 'German', 'Greek', 'Indian', 'Irish', 'Italian', 'Japanese', 'Jewish', 'Korean', 'Latin American', 'Mediterranean', 'Mexican', 'Middle Eastern', 'Nordic', 'Southern', 'Spanish', 'Thai', 'Vietnamese'];
    
    const mappedCuisines = params.cuisineType?.map(cuisine => {
      const lowerCuisine = cuisine.toLowerCase();
      // Map common variations to Spoonacular's exact format
      switch (lowerCuisine) {
        case 'indian': return 'Indian';
        case 'chinese': return 'Chinese';
        case 'italian': return 'Italian';
        case 'mexican': return 'Mexican';
        case 'french': return 'French';
        case 'japanese': return 'Japanese';
        case 'thai': return 'Thai';
        case 'korean': return 'Korean';
        case 'greek': return 'Greek';
        case 'spanish': return 'Spanish';
        case 'american': return 'American';
        case 'british': return 'British';
        case 'german': return 'German';
        case 'irish': return 'Irish';
        case 'jewish': return 'Jewish';
        case 'asian': return 'Asian';
        case 'mediterranean': return 'Mediterranean';
        case 'middle eastern': return 'Middle Eastern';
        case 'latin american': return 'Latin American';
        case 'eastern european': return 'Eastern European';
        case 'european': return 'European';
        case 'caribbean': return 'Caribbean';
        case 'cajun': return 'Cajun';
        case 'african': return 'African';
        case 'nordic': return 'Nordic';
        case 'southern': return 'Southern';
        case 'vietnamese': return 'Vietnamese';
        default: return null;
      }
    }).filter(Boolean) || [];
    
    console.log('🍽️ Mapped cuisine types for Spoonacular:', mappedCuisines);
    
    // Map Edamam health labels to Spoonacular intolerances
    const spoonacularIntolerances = this.mapHealthLabelsToSpoonacularIntolerances(params.health || []);
    
    const spoonacularParams: SpoonacularSearchParams = {
      query: params.query,
      cuisine: mappedCuisines,
      diet: params.diet,
      intolerances: spoonacularIntolerances,
      number: params.maxResults || 20,
      sort: 'random',
      addRecipeNutrition: true
    };

    // Map meal types to Spoonacular's expected values
    if (params.mealType && params.mealType.length > 0) {
      const mappedTypes = params.mealType.map(mealType => {
        switch (mealType.toLowerCase()) {
          case 'breakfast':
            return 'breakfast';
          case 'lunch':
          case 'dinner':
            return 'main course';
          case 'snack':
            return 'snack';
          case 'dessert':
            return 'dessert';
          case 'appetizer':
            return 'appetizer';
          case 'salad':
            return 'salad';
          case 'soup':
            return 'soup';
          case 'side dish':
            return 'side dish';
          case 'beverage':
            return 'beverage';
          case 'drink':
            return 'drink';
          default:
            return 'main course'; // Default to main course for unknown types
        }
      });
      spoonacularParams.type = mappedTypes;
      console.log('🍽️ Mapped meal types:', params.mealType, '->', mappedTypes);
    }

    // Parse calorie range with wider range for better results
    if (params.calories) {
      const [min, max] = params.calories.split('-').map(Number);
      if (!isNaN(min)) {
        // Expand range by 30% on both sides for better results
        spoonacularParams.minCalories = Math.max(0, Math.round(min * 0.7));
      }
      if (!isNaN(max)) {
        spoonacularParams.maxCalories = Math.round(max * 1.3);
      }
      console.log('🍽️ Calorie range (expanded):', params.calories, '->', spoonacularParams.minCalories, '-', spoonacularParams.maxCalories);
    }

    // Parse time range
    if (params.time) {
      const [min, max] = params.time.split('-').map(Number);
      if (!isNaN(max)) spoonacularParams.maxReadyTime = max;
    }

    console.log('✅ Final Spoonacular params:', spoonacularParams);
    console.log('🔍 Spoonacular URLSearchParams being built:');
    const debugParams = new URLSearchParams();
    if (spoonacularParams.query) debugParams.append('query', spoonacularParams.query);
    if (spoonacularParams.cuisine && spoonacularParams.cuisine.length > 0) {
      debugParams.append('cuisine', spoonacularParams.cuisine.join(','));
    }
    if (spoonacularParams.diet && spoonacularParams.diet.length > 0) {
      debugParams.append('diet', spoonacularParams.diet.join(','));
    }
    if (spoonacularParams.intolerances && spoonacularParams.intolerances.length > 0) {
      debugParams.append('intolerances', spoonacularParams.intolerances.join(','));
    }
    if (spoonacularParams.type && spoonacularParams.type.length > 0) {
      debugParams.append('type', spoonacularParams.type.join(','));
    }
    if (spoonacularParams.minCalories) debugParams.append('minCalories', spoonacularParams.minCalories.toString());
    if (spoonacularParams.maxCalories) debugParams.append('maxCalories', spoonacularParams.maxCalories.toString());
    if (spoonacularParams.number) debugParams.append('number', spoonacularParams.number.toString());
    if (spoonacularParams.sort) debugParams.append('sort', spoonacularParams.sort);
    console.log('🔍 URLSearchParams:', debugParams.toString());
    console.log('🔍 TEST CURL:');
    console.log(`curl -X GET "https://api.spoonacular.com/recipes/complexSearch?apiKey=${this.spoonacularApiKey}&${debugParams.toString()}"`);
    return spoonacularParams;
  }

  /**
   * Convert Edamam recipe to light summary for search results
   */
  private convertEdamamToSummary(recipe: EdamamRecipe): UnifiedRecipeSummary {
    // Extract the ID part from URI and ensure it has the recipe_ prefix
    const uriParts = recipe.uri.split('#');
    let recipeId = uriParts[1] || uriParts[0];
    
    // Ensure the ID starts with 'recipe_' for consistency with recipe details API
    if (!recipeId.startsWith('recipe_')) {
      recipeId = `recipe_${recipeId}`;
    }
    
    // Calculate per-serving nutrition
    const servings = recipe.yield || 1;
    const caloriesPerServing = Math.round(recipe.calories / servings);
    const proteinPerServing = Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / servings * 10) / 10;
    const carbsPerServing = Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / servings * 10) / 10;
    const fatPerServing = Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / servings * 10) / 10;
    const fiberPerServing = Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / servings * 10) / 10;
    
    return {
      id: recipeId,
      title: recipe.label,
      image: recipe.image,
      sourceUrl: recipe.url,
      source: 'edamam',
      readyInMinutes: recipe.totalTime > 0 ? recipe.totalTime : undefined,
      servings: servings,
      calories: caloriesPerServing,
      protein: proteinPerServing,
      carbs: carbsPerServing,
      fat: fatPerServing,
      fiber: fiberPerServing,
      // Add complete metadata for filtering
      healthLabels: recipe.healthLabels || [],
      dietLabels: recipe.dietLabels || [],
      cuisineType: recipe.cuisineType || [],
      dishType: recipe.dishType || [],
      mealType: recipe.mealType || [],
      allergens: null, // Edamam doesn't provide explicit allergens
      // Add ingredients for allergen checking
      ingredients: recipe.ingredients?.map(ing => ({
        name: ing.food,
        food: ing.food,
        quantity: ing.quantity,
        measure: ing.measure,
        weight: ing.weight
      })) || []
    };
  }

  /**
   * Convert Edamam recipe to unified format (for detailed view)
   */
  private convertEdamamToUnified(recipe: EdamamRecipe): UnifiedRecipe {
    return {
      id: `edamam_${recipe.uri.split('_').pop()}`,
      title: recipe.label,
      image: recipe.image,
      servings: recipe.yield || 1,
      calories: Math.round(recipe.calories / (recipe.yield || 1)),
      protein: Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / (recipe.yield || 1)),
      carbs: Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / (recipe.yield || 1)),
      fat: Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / (recipe.yield || 1)),
      fiber: Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / (recipe.yield || 1)),
      sourceUrl: recipe.url,
      source: 'edamam',
      ingredients: recipe.ingredients?.map(ing => ({
        name: ing.food,
        amount: ing.quantity,
        unit: ing.measure === '<unit>' ? '' : (ing.measure || ''),
        image: ing.image,
        original: ing.text
      })) || [],
      healthLabels: recipe.healthLabels || [],
      dietLabels: recipe.dietLabels || [],
      cuisineType: recipe.cuisineType || [],
      dishType: recipe.dishType || [],
      mealType: recipe.mealType || [],
      tags: [
        ...(recipe.cuisineType || []),
        ...(recipe.dishType || []),
        ...(recipe.mealType || []),
        ...(recipe.healthLabels || []),
        ...(recipe.dietLabels || [])
      ]
    };
  }

  /**
   * Convert Spoonacular recipe to light summary for search results
   */
  private convertSpoonacularToSummary(recipe: SpoonacularRecipe): UnifiedRecipeSummary {
    // Extract nutrition data from Spoonacular recipe (now available with addRecipeNutrition=true)
    const nutrition = this.extractNutritionFromSpoonacular(recipe);
    
    // Extract health labels from boolean flags
    const healthLabels: string[] = [];
    if (recipe.glutenFree) healthLabels.push('gluten-free');
    if (recipe.dairyFree) healthLabels.push('dairy-free');
    if (recipe.vegan) healthLabels.push('vegan');
    if (recipe.vegetarian) healthLabels.push('vegetarian');
    if (recipe.ketogenic) healthLabels.push('ketogenic');
    if (recipe.lowFodmap) healthLabels.push('low-fodmap');
    if (recipe.whole30) healthLabels.push('whole30');
    
    return {
      id: recipe.id.toString(),
      title: recipe.title,
      image: recipe.image,
      sourceUrl: recipe.sourceUrl || '',
      source: 'spoonacular',
      readyInMinutes: recipe.readyInMinutes || undefined,
      servings: recipe.servings ? recipe.servings : undefined,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      // Add complete metadata for filtering
      healthLabels: healthLabels,
      dietLabels: recipe.diets || [],
      cuisineType: recipe.cuisines || [],
      dishType: recipe.dishTypes || [],
      mealType: recipe.dishTypes || [], // Spoonacular uses dishTypes for meal types too
      allergens: null, // Spoonacular doesn't provide explicit allergens
      // Add ingredients for allergen checking
      ingredients: recipe.extendedIngredients?.map(ing => ({
        name: ing.name,
        food: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        original: ing.original
      })) || []
    };
  }

  /**
   * Convert Spoonacular recipe to unified format (for detailed view)
   */
  private convertSpoonacularToUnified(recipe: SpoonacularRecipe): UnifiedRecipe {
    // Extract nutrition information
    const nutrition = this.extractNutritionFromSpoonacular(recipe);
    
    return {
      id: `spoonacular_${recipe.id}`,
      title: recipe.title,
      image: recipe.image,
      servings: recipe.servings,
      readyInMinutes: recipe.readyInMinutes,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fat: nutrition.fat,
      fiber: nutrition.fiber,
      sourceUrl: recipe.sourceUrl,
      source: 'spoonacular',
      ingredients: recipe.extendedIngredients?.map(ing => ({
        id: ing.id.toString(),
        name: ing.name,
        amount: ing.amount,
        unit: ing.unit,
        image: ing.image,
        original: ing.original
      })) || [],
      healthLabels: this.extractHealthLabels(recipe),
      dietLabels: recipe.diets || [],
      cuisineType: recipe.cuisines || [],
      dishType: recipe.dishTypes || [],
      mealType: recipe.occasions || [],
      tags: [
        ...(recipe.cuisines || []),
        ...(recipe.dishTypes || []),
        ...(recipe.occasions || []),
        ...this.extractHealthLabels(recipe),
        ...(recipe.diets || [])
      ]
    };
  }

  /**
   * Convert Bon Happetee search result to unified format
   */
  private convertBonHappeteeToUnified(result: any): UnifiedRecipe {
    return {
      id: result.food_unique_id,
      title: result.common_names || result.food_name,
      image: null, // Bon Happetee doesn't provide images in search
      servings: 1,
      readyInMinutes: 0,
      calories: result.nutrients?.calories || 0,
      protein: result.nutrients?.protein || 0,
      carbs: result.nutrients?.carbs || 0,
      fat: result.nutrients?.fats || 0,
      fiber: 0, // Not available in search results
      sourceUrl: null,
      source: 'bonhappetee',
      ingredients: [],
      healthLabels: [], // Not available in search, only in details
      dietLabels: [],
      cuisineType: [],
      dishType: [],
      mealType: [],
      tags: [result.food_name, result.serving_type]
    };
  }

  /**
   * Extract nutrition information from Spoonacular recipe
   */
  private extractNutritionFromSpoonacular(recipe: SpoonacularRecipe): {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  } {
    const nutrition = {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      fiber: 0
    };

    if (recipe.nutrition?.nutrients) {
      recipe.nutrition.nutrients.forEach(nutrient => {
        switch (nutrient.name.toLowerCase()) {
          case 'calories':
            nutrition.calories = Math.round(nutrient.amount);
            break;
          case 'protein':
            nutrition.protein = Math.round(nutrient.amount);
            break;
          case 'carbohydrates':
          case 'carbs':
            nutrition.carbs = Math.round(nutrient.amount);
            break;
          case 'fat':
            nutrition.fat = Math.round(nutrient.amount);
            break;
          case 'fiber':
            nutrition.fiber = Math.round(nutrient.amount);
            break;
        }
      });
    }

    return nutrition;
  }

  /**
   * Extract health labels from Spoonacular recipe
   */
  private extractHealthLabels(recipe: SpoonacularRecipe): string[] {
    const labels: string[] = [];
    
    if (recipe.glutenFree) labels.push('gluten-free');
    if (recipe.dairyFree) labels.push('dairy-free');
    if (recipe.vegetarian) labels.push('vegetarian');
    if (recipe.vegan) labels.push('vegan');
    if (recipe.ketogenic) labels.push('ketogenic');
    if (recipe.lowFodmap) labels.push('low-fodmap');
    if (recipe.whole30) labels.push('whole30');
    
    return labels;
  }

  /**
   * Shuffle array randomly
   */
  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }


  /**
   * Get available providers
   */
  getAvailableProviders(): string[] {
    const providers = ['edamam'];
    if (this.spoonacularApiKey) {
      providers.push('spoonacular');
    }
    return providers;
  }

  /**
   * Convert Edamam recipe to unified format (public method for detailed view)
   */
  convertEdamamToUnified(recipe: EdamamRecipe): UnifiedRecipe {
    return {
      id: `edamam_${recipe.uri.split('_').pop()}`,
      title: recipe.label,
      image: recipe.image,
      servings: recipe.yield || 1,
      calories: Math.round(recipe.calories / (recipe.yield || 1)),
      protein: Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / (recipe.yield || 1) * 10) / 10,
      carbs: Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / (recipe.yield || 1) * 10) / 10,
      fat: Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / (recipe.yield || 1) * 10) / 10,
      fiber: Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / (recipe.yield || 1) * 10) / 10,
      sourceUrl: recipe.url,
      source: 'edamam',
      ingredients: recipe.ingredients.map(ing => ({
        id: ing.foodId,
        name: ing.food,
        amount: ing.quantity,
        unit: ing.measure === '<unit>' ? '' : (ing.measure || ''),
        image: ing.image
      })),
      instructions: recipe.ingredientLines.join('\n'), // Fallback to ingredient lines
      summary: `${recipe.label} - ${recipe.calories.toFixed(0)} calories`,
      healthLabels: recipe.healthLabels || [],
      dietLabels: recipe.dietLabels || [],
      cuisineType: recipe.cuisineType || [],
      dishType: recipe.dishType || [],
      mealType: recipe.mealType || [],
      tags: [
        ...(recipe.cuisineType || []),
        ...(recipe.dishType || []),
        ...(recipe.mealType || []),
        ...(recipe.healthLabels || []),
        ...(recipe.dietLabels || [])
      ]
    };
  }

  /**
   * Get Spoonacular recipe details by ID
   */
  async getSpoonacularRecipeDetails(recipeId: number): Promise<UnifiedRecipe | null> {
    try {
      const response = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${this.spoonacularApiKey}&includeNutrition=true`);
      
      if (!response.ok) {
        throw new Error(`Spoonacular API error: ${response.status} ${response.statusText}`);
      }

      const recipe = await response.json() as SpoonacularRecipe;
      return this.convertSpoonacularToUnified(recipe);
    } catch (error) {
      console.error('❌ Error fetching Spoonacular recipe details:', error);
      return null;
    }
  }

  /**
   * Get detailed recipe information by ID
   */
  async getRecipeDetails(recipeId: string): Promise<any> {
    try {
      // Determine provider from recipe ID format
      // Edamam: starts with 'recipe_'
      // Spoonacular: numeric string
      // Bon Happetee: UUID format (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recipeId);
      const isEdamam = recipeId.startsWith('recipe_');
      
      if (isUUID) {
        return await this.getBonHappeteeRecipeDetails(recipeId);
      } else if (isEdamam) {
        return await this.getEdamamRecipeDetails(recipeId);
      } else {
        return await this.getSpoonacularRecipeDetails(recipeId);
      }
    } catch (error) {
      console.error('❌ Error getting recipe details:', error);
      throw error;
    }
  }

  /**
   * Get detailed recipe from Edamam
   */
  private async getEdamamRecipeDetails(recipeId: string): Promise<any> {
    try {
      // Extract the actual recipe ID from the prefixed ID
      const actualRecipeId = recipeId.startsWith('recipe_') ? recipeId.replace('recipe_', '') : recipeId;
      
      // Use the same working credentials as EdamamService
      const workingAppId = 'fb9b0e62';
      const workingAppKey = '8a58a60fd0235f1bc39d3defab42922e';
      
      const response = await fetch(`https://api.edamam.com/api/recipes/v2/${actualRecipeId}?type=public&app_id=${workingAppId}&app_key=${workingAppKey}`, {
        headers: {
          'Edamam-Account-User': 'test3' // Use same user as EdamamService
        }
      });

      if (!response.ok) {
        throw new Error(`Edamam API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const recipe = data.recipe;

      const servings = recipe.yield || 1;
      
      return {
        id: recipeId,
        title: recipe.label,
        image: recipe.image,
        sourceUrl: recipe.url,
        source: 'edamam',
        servings: servings,
        readyInMinutes: recipe.totalTime,
        nutrition: this.transformEdamamNutrition(recipe.totalNutrients, recipe.totalDaily, servings),
        ingredients: recipe.ingredients.map((ing: any) => ({
          name: ing.food,
          amount: ing.quantity,
          unit: ing.measure === '<unit>' ? '' : (ing.measure || ''),
          originalString: ing.text,
          image: ing.image
        })),
        instructions: recipe.instructions?.map((instruction: any, index: number) => ({
          number: index + 1,
          step: instruction.text || instruction
        })) || [],
        summary: recipe.summary,
        cuisines: recipe.cuisineType || [],
        dishTypes: recipe.dishType || [],
        diets: recipe.dietLabels || [],
        healthLabels: recipe.healthLabels || [],
        cautions: recipe.cautions || [],
        tags: recipe.tags || []
      };
    } catch (error) {
      console.error('❌ Error fetching Edamam recipe details:', error);
      throw error;
    }
  }

  /**
   * Get detailed recipe from Spoonacular
   */
  private async getSpoonacularRecipeDetails(recipeId: string): Promise<any> {
    try {
      const response = await fetch(`https://api.spoonacular.com/recipes/${recipeId}/information?apiKey=${this.spoonacularApiKey}&includeNutrition=true`);

      if (!response.ok) {
        throw new Error(`Spoonacular API error: ${response.status} ${response.statusText}`);
      }

      const recipe = await response.json();

      // Extract health labels from Spoonacular boolean flags
      const healthLabels = this.extractHealthLabels(recipe);

      return {
        id: recipeId,
        title: recipe.title,
        image: recipe.image,
        sourceUrl: recipe.sourceUrl,
        source: 'spoonacular',
        servings: recipe.servings || 1,
        readyInMinutes: recipe.readyInMinutes,
        nutrition: this.transformSpoonacularNutrition(recipe.nutrition),
        ingredients: recipe.extendedIngredients?.map((ing: any) => ({
          id: ing.id,
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit,
          originalString: ing.originalString,
          image: ing.image,
          aisle: ing.aisle,
          meta: ing.meta,
          measures: ing.measures
        })) || [],
        instructions: recipe.analyzedInstructions?.[0]?.steps?.map((step: any) => ({
          number: step.number,
          step: step.step
        })) || [],
        summary: recipe.summary,
        cuisines: recipe.cuisines || [],
        dishTypes: recipe.dishTypes || [],
        diets: recipe.diets || [],
        healthLabels: healthLabels,
        cautions: recipe.cautions || [],
        tags: recipe.tags || []
      };
    } catch (error) {
      console.error('❌ Error fetching Spoonacular recipe details:', error);
      throw error;
    }
  }

  /**
   * Get detailed recipe from Bon Happetee
   */
  private async getBonHappeteeRecipeDetails(foodItemId: string): Promise<any> {
    try {
      if (!this.bonHappeteeService) {
        throw new Error('Bon Happetee service not initialized - API key missing');
      }

      const recipeData = await this.bonHappeteeService.getRecipeDetails(foodItemId);
      const { NutritionMappingService } = require('./nutritionMappingService');
      
      // Transform Bon Happetee nutrition to standardized format
      const nutrition = NutritionMappingService.transformBonHappeteeNutrition(recipeData.nutrients);

      return {
        id: foodItemId,
        title: recipeData.title,
        image: null, // Bon Happetee doesn't provide images
        sourceUrl: null,
        source: 'bonhappetee',
        servings: 1, // Bon Happetee provides per-serving nutrition
        readyInMinutes: (recipeData.prepTime || 0) + (recipeData.cookTime || 0),
        nutrition: nutrition,
        ingredients: [], // Bon Happetee doesn't provide ingredient breakdown
        instructions: [],
        cuisineType: recipeData.cuisineType,
        mealType: recipeData.mealType,
        healthLabels: recipeData.healthLabels,
        allergens: recipeData.allergens,
        servingType: recipeData.servingType,
        measures: recipeData.measures,
        basicUnitMeasure: recipeData.basicUnitMeasure,
        caloriesCalculatedFor: recipeData.caloriesCalculatedFor,
        foodGroup: recipeData.foodGroup,
        disorderRisks: recipeData.disorderRisks
      };
    } catch (error) {
      console.error('❌ Error fetching Bon Happetee recipe details:', error);
      throw error;
    }
  }

  /**
   * Transform Edamam nutrition data to standard format
   * @param totalNutrients - Edamam's totalNutrients object (TOTAL nutrition for all servings)
   * @param totalDaily - Edamam's totalDaily object
   * @param servings - Number of servings to divide by (to get PER-SERVING nutrition)
   */
  private transformEdamamNutrition(totalNutrients: any, totalDaily: any, servings: number = 1): any {
    const nutrition: any = {
      calories: null,
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };
    
    console.log(`📊 transformEdamamNutrition: dividing by ${servings} servings to get PER-SERVING nutrition`);
    
    // Map Edamam nutrients to standard format
    const nutrientMap: { [key: string]: { key: string; category: 'calories' | 'macros' | 'vitamins' | 'minerals' } } = {
      'ENERC_KCAL': { key: 'calories', category: 'calories' },
      'PROCNT': { key: 'protein', category: 'macros' },
      'CHOCDF': { key: 'carbs', category: 'macros' },
      'FAT': { key: 'fat', category: 'macros' },
      'FIBTG': { key: 'fiber', category: 'macros' },
      'SUGAR': { key: 'sugar', category: 'macros' },
      'NA': { key: 'sodium', category: 'macros' },
      'CHOLE': { key: 'cholesterol', category: 'macros' },
      'FASAT': { key: 'saturatedFat', category: 'macros' },
      'FATRN': { key: 'transFat', category: 'macros' },
      'FAMS': { key: 'monounsaturatedFat', category: 'macros' },
      'FAPU': { key: 'polyunsaturatedFat', category: 'macros' },
      'K': { key: 'potassium', category: 'minerals' },
      'CA': { key: 'calcium', category: 'minerals' },
      'FE': { key: 'iron', category: 'minerals' },
      'VITA_RAE': { key: 'vitaminA', category: 'vitamins' },
      'VITC': { key: 'vitaminC', category: 'vitamins' },
      'VITD': { key: 'vitaminD', category: 'vitamins' },
      'TOCPHA': { key: 'vitaminE', category: 'vitamins' },
      'VITK1': { key: 'vitaminK', category: 'vitamins' },
      'THIA': { key: 'thiamin', category: 'vitamins' },
      'RIBF': { key: 'riboflavin', category: 'vitamins' },
      'NIA': { key: 'niacin', category: 'vitamins' },
      'VITB6A': { key: 'vitaminB6', category: 'vitamins' },
      'FOLDFE': { key: 'folate', category: 'vitamins' },
      'VITB12': { key: 'vitaminB12', category: 'vitamins' },
      'BIOT': { key: 'biotin', category: 'vitamins' },
      'PANTAC': { key: 'pantothenicAcid', category: 'vitamins' },
      'P': { key: 'phosphorus', category: 'minerals' },
      'ID': { key: 'iodine', category: 'minerals' },
      'MG': { key: 'magnesium', category: 'minerals' },
      'ZN': { key: 'zinc', category: 'minerals' },
      'SE': { key: 'selenium', category: 'minerals' },
      'CU': { key: 'copper', category: 'minerals' },
      'MN': { key: 'manganese', category: 'minerals' },
      'CR': { key: 'chromium', category: 'minerals' },
      'MO': { key: 'molybdenum', category: 'minerals' }
    };

    for (const [edamamKey, mapping] of Object.entries(nutrientMap)) {
      if (totalNutrients[edamamKey]) {
        // Divide by servings to get PER-SERVING value (Edamam returns TOTAL for all servings)
        const totalValue = totalNutrients[edamamKey].quantity;
        const perServingValue = Math.round((totalValue / servings) * 100) / 100;
        const unit = totalNutrients[edamamKey].unit || 'g';
        
        if (mapping.category === 'calories') {
          nutrition.calories = { quantity: perServingValue, unit: unit };
        } else if (mapping.category === 'macros') {
          nutrition.macros[mapping.key] = { quantity: perServingValue, unit: unit };
        } else if (mapping.category === 'vitamins') {
          nutrition.micros.vitamins[mapping.key] = { quantity: perServingValue, unit: unit };
        } else if (mapping.category === 'minerals') {
          nutrition.micros.minerals[mapping.key] = { quantity: perServingValue, unit: unit };
        }
      }
    }

    console.log(`✅ Transformed nutrition (per serving): ${nutrition.calories?.quantity || 0} kcal`);

    return nutrition;
  }

  /**
   * Transform Spoonacular nutrition data to standard format
   */
  private transformSpoonacularNutrition(nutrition: any): any {
    if (!nutrition) {
      return {
        calories: null,
        macros: {},
        micros: {
          vitamins: {},
          minerals: {}
        }
      };
    }

    // Check if data is already in standardized format (has macros/micros structure)
    if (nutrition.macros && nutrition.calories) {
      console.log('📊 Spoonacular nutrition is already in standardized format');
      return nutrition;
    }

    // Check if data has nutrients array (raw Spoonacular format)
    if (!nutrition.nutrients) {
      console.warn('⚠️ Spoonacular nutrition data has no nutrients array and is not in standardized format');
      return {
        calories: null,
        macros: {},
        micros: {
          vitamins: {},
          minerals: {}
        }
      };
    }

    const nutritionData: any = {
      calories: null,
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };
    
    // Map Spoonacular nutrients to standard format with categories
    const nutrientMap: { [key: string]: { key: string; category: 'calories' | 'macros' | 'vitamins' | 'minerals' } } = {
      'Calories': { key: 'calories', category: 'calories' },
      'Protein': { key: 'protein', category: 'macros' },
      'Carbohydrates': { key: 'carbs', category: 'macros' },
      'Fat': { key: 'fat', category: 'macros' },
      'Fiber': { key: 'fiber', category: 'macros' },
      'Sugar': { key: 'sugar', category: 'macros' },
      'Sodium': { key: 'sodium', category: 'macros' },
      'Cholesterol': { key: 'cholesterol', category: 'macros' },
      'Saturated Fat': { key: 'saturatedFat', category: 'macros' },
      'Trans Fat': { key: 'transFat', category: 'macros' },
      'Monounsaturated Fat': { key: 'monounsaturatedFat', category: 'macros' },
      'Polyunsaturated Fat': { key: 'polyunsaturatedFat', category: 'macros' },
      'Potassium': { key: 'potassium', category: 'minerals' },
      'Calcium': { key: 'calcium', category: 'minerals' },
      'Iron': { key: 'iron', category: 'minerals' },
      'Vitamin A': { key: 'vitaminA', category: 'vitamins' },
      'Vitamin C': { key: 'vitaminC', category: 'vitamins' },
      'Vitamin D': { key: 'vitaminD', category: 'vitamins' },
      'Vitamin E': { key: 'vitaminE', category: 'vitamins' },
      'Vitamin K': { key: 'vitaminK', category: 'vitamins' },
      'Thiamin': { key: 'thiamin', category: 'vitamins' },
      'Riboflavin': { key: 'riboflavin', category: 'vitamins' },
      'Niacin': { key: 'niacin', category: 'vitamins' },
      'Vitamin B6': { key: 'vitaminB6', category: 'vitamins' },
      'Folate': { key: 'folate', category: 'vitamins' },
      'Vitamin B12': { key: 'vitaminB12', category: 'vitamins' },
      'Biotin': { key: 'biotin', category: 'vitamins' },
      'Pantothenic Acid': { key: 'pantothenicAcid', category: 'vitamins' },
      'Phosphorus': { key: 'phosphorus', category: 'minerals' },
      'Iodine': { key: 'iodine', category: 'minerals' },
      'Magnesium': { key: 'magnesium', category: 'minerals' },
      'Zinc': { key: 'zinc', category: 'minerals' },
      'Selenium': { key: 'selenium', category: 'minerals' },
      'Copper': { key: 'copper', category: 'minerals' },
      'Manganese': { key: 'manganese', category: 'minerals' },
      'Chromium': { key: 'chromium', category: 'minerals' },
      'Molybdenum': { key: 'molybdenum', category: 'minerals' }
    };

    for (const nutrient of nutrition.nutrients) {
      const mapping = nutrientMap[nutrient.name];
      if (mapping) {
        const value = Math.round(nutrient.amount * 100) / 100;
        const unit = nutrient.unit || 'g';
        
        if (mapping.category === 'calories') {
          nutritionData.calories = { quantity: value, unit: unit };
        } else if (mapping.category === 'macros') {
          nutritionData.macros[mapping.key] = { quantity: value, unit: unit };
        } else if (mapping.category === 'vitamins') {
          nutritionData.micros.vitamins[mapping.key] = { quantity: value, unit: unit };
        } else if (mapping.category === 'minerals') {
          nutritionData.micros.minerals[mapping.key] = { quantity: value, unit: unit };
        }
      }
    }

    return nutritionData;
  }

  /**
   * Get ingredient suggestions from Spoonacular with optional unit suggestions
   */
  async getIngredientSuggestions(query: string, mode: 'basic' | 'with_units' | 'units_only' = 'basic'): Promise<{suggestions: string[], unitSuggestions: Record<string, string[]>, units?: string[]}> {
    try {
      if (!query || query.trim().length === 0) {
        return mode === 'units_only' ? { units: [], suggestions: [], unitSuggestions: {} } : { suggestions: [], unitSuggestions: {} };
      }

      const url = 'https://api.spoonacular.com/food/ingredients/autocomplete';
      const params = new URLSearchParams({
        query: query.trim(),
        number: '10',
        apiKey: this.spoonacularApiKey
      });

      const fullUrl = `${url}?${params.toString()}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Spoonacular ingredient suggestions error:', response.status, errorText);
        return mode === 'units_only' ? { units: [], suggestions: [], unitSuggestions: {} } : { suggestions: [], unitSuggestions: {} };
      }

      const data = await response.json();

      // Extract ingredient names from the response
      const suggestions = Array.isArray(data) 
        ? data.map((item: any) => item.name || item.title || item).filter(Boolean)
        : [];

      // Handle different modes
      if (mode === 'basic') {
        return {
          suggestions,
          unitSuggestions: {}
        };
      } else if (mode === 'units_only') {
        // For units_only mode, get units for the first (most relevant) suggestion
        let units: string[] = [];
        if (suggestions.length > 0) {
          const unitSuggestions = await this.getIngredientUnitSuggestions([suggestions[0]]);
          units = unitSuggestions[suggestions[0]] || [];
        }
        return {
          units,
          suggestions: [],
          unitSuggestions: {}
        };
      } else {
        // mode === 'with_units' - return both suggestions and unit suggestions
        let unitSuggestions = {};
        if (suggestions.length > 0) {
          unitSuggestions = await this.getIngredientUnitSuggestions(suggestions);
        }
        return {
          suggestions,
          unitSuggestions
        };
      }

    } catch (error) {
      console.error('❌ SPOONACULAR INGREDIENT SUGGESTIONS ERROR:', error);
      return mode === 'units_only' ? { units: [], suggestions: [], unitSuggestions: {} } : { suggestions: [], unitSuggestions: {} };
    }
  }

  /**
   * Get unit suggestions for ingredients using OpenAI (same logic as Edamam)
   */
  async getIngredientUnitSuggestions(ingredients: string[]): Promise<Record<string, string[]>> {
    try {
      if (!ingredients || ingredients.length === 0) {
        return {};
      }

      const systemPrompt = `You are a nutrition expert. For each ingredient provided, suggest the most common and practical units of measurement for cooking and food logging.

IMPORTANT: Return units that are commonly used in recipes and food databases.

Common unit categories:
- Weight: gram, kilogram, ounce, pound
- Volume: milliliter, liter, cup, tablespoon, teaspoon, fluid ounce
- Count: piece, slice, serving, whole, unit
- Special: handful, pinch, dash (for spices/herbs)

Return a JSON object where each key is an ingredient name and the value is an array of 5-8 most relevant unit suggestions, ordered by commonality.`;

      const userPrompt = `Suggest appropriate units for these ingredients:\n${ingredients.join('\n')}`;

      const openAIKey = process.env.OPENAI_API_KEY;
      if (!openAIKey) {
        console.warn('⚠️ OPENAI_API_KEY not configured, returning default units');
        // Return default units for common ingredients
        const defaultUnits: Record<string, string[]> = {};
        ingredients.forEach(ingredient => {
          defaultUnits[ingredient] = ['gram', 'ounce', 'cup', 'tablespoon', 'teaspoon', 'piece', 'serving'];
        });
        return defaultUnits;
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openAIKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorText);
        // Return default units on error
        const defaultUnits: Record<string, string[]> = {};
        ingredients.forEach(ingredient => {
          defaultUnits[ingredient] = ['gram', 'ounce', 'cup', 'tablespoon', 'teaspoon', 'piece', 'serving'];
        });
        return defaultUnits;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('No response from OpenAI');
      }

      // Parse JSON response
      let jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in OpenAI response');
      }

      const unitSuggestions = JSON.parse(jsonMatch[0]);
      return unitSuggestions;

    } catch (error) {
      console.error('Unit suggestions error:', error);
      // Return default units on error
      const defaultUnits: Record<string, string[]> = {};
      ingredients.forEach(ingredient => {
        defaultUnits[ingredient] = ['gram', 'ounce', 'cup', 'tablespoon', 'teaspoon', 'piece', 'serving'];
      });
      return defaultUnits;
    }
  }

  /**
   * Get ingredient nutrition from Spoonacular
   */
  async getIngredientNutrition(ingredientText: string): Promise<any> {
    try {
      if (!ingredientText || ingredientText.trim().length === 0) {
        return null;
      }

      const url = 'https://api.spoonacular.com/recipes/parseIngredients';
      const params = new URLSearchParams({
        ingredientList: ingredientText,
        servings: '1',
        includeNutrition: 'true',
        apiKey: this.spoonacularApiKey
      });

      const fullUrl = `${url}?${params.toString()}`;

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Spoonacular nutrition API error:', response.status, errorText);
        throw new Error(`Spoonacular nutrition API error: ${response.status}`);
      }

      const data = await response.json();

      // Return first ingredient's nutrition data WITH FULL RAW DATA for micronutrients
      if (Array.isArray(data) && data.length > 0) {
        const ingredient = data[0];
        const nutrition = ingredient.nutrition;

        return {
          calories: nutrition?.nutrients?.find((n: any) => n.name === 'Calories')?.amount || 0,
          protein: nutrition?.nutrients?.find((n: any) => n.name === 'Protein')?.amount || 0,
          carbs: nutrition?.nutrients?.find((n: any) => n.name === 'Carbohydrates')?.amount || 0,
          fat: nutrition?.nutrients?.find((n: any) => n.name === 'Fat')?.amount || 0,
          fiber: nutrition?.nutrients?.find((n: any) => n.name === 'Fiber')?.amount || 0,
          rawData: ingredient // CRITICAL: Include full data so transformSpoonacularIngredientNutrition can access nutrition.nutrients
        };
      }

      return null;

    } catch (error) {
      console.error('❌ SPOONACULAR INGREDIENT NUTRITION ERROR:', error);
      return null;
    }
  }

  /**
   * Get ingredient substitutes from Spoonacular
   */
  async getIngredientSubstitutes(recipeId: string, ingredientId: string): Promise<any[]> {
    try {
      const url = `https://api.spoonacular.com/recipes/${recipeId}/substitutes/${ingredientId}`;
      const params = new URLSearchParams({
        apiKey: this.spoonacularApiKey
      });

      const fullUrl = `${url}?${params.toString()}`;

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Spoonacular substitutes API error:', response.status, errorText);
        throw new Error(`Spoonacular substitutes API error: ${response.status}`);
      }

      const data = await response.json();

      // Return substitutes with additional metadata
      return Array.isArray(data) ? data : [];

    } catch (error) {
      console.error('❌ SPOONACULAR INGREDIENT SUBSTITUTES ERROR:', error);
      return [];
    }
  }

  /**
   * Search recipes with client allergen filtering
   * Maps client allergies to API health labels automatically
   * Allows nutritionist to override/exclude specific filters
   */
  async searchRecipesForClient(
    params: ClientAwareSearchParams,
    userId: string
  ): Promise<ClientAwareSearchResponse> {
    console.log('🔍 searchRecipesForClient called with params:', params);

    // 1. Get client profile with active goals
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select(`
        id, 
        first_name, 
        last_name,
        client_goals!inner(
          id,
          allergies,
          preferences,
          cuisine_types,
          is_active
        )
      `)
      .eq('id', params.clientId)
      .eq('client_goals.is_active', true)
      .single();

    if (clientError || !client) {
      console.error('❌ Client not found or no active goals:', clientError);
      throw new Error('Client not found or no active goals');
    }

    const clientFullName = `${client.first_name} ${client.last_name || ''}`.trim();
    
    // Get allergies, preferences, and cuisine types from active client_goals
    const activeGoal = Array.isArray(client.client_goals) 
      ? client.client_goals[0] 
      : client.client_goals;
    
    const clientAllergies = activeGoal?.allergies || [];
    const clientPreferences = activeGoal?.preferences || [];
    const clientCuisineTypes = activeGoal?.cuisine_types || [];

    console.log(`👤 Client: ${clientFullName}`);
    console.log(`⚠️ Client allergies:`, clientAllergies);
    console.log(`🥗 Client preferences:`, clientPreferences);
    console.log(`🍽️ Client cuisine types:`, clientCuisineTypes);

    // 2. Map client allergies to health labels (ALWAYS applied - cannot be overridden)
    const allergenFiltersFromClient = this.mapAllergensToHealthLabels(clientAllergies);
    console.log(`🏷️ Mapped allergen filters (always applied):`, allergenFiltersFromClient);

    // 3. Get UX-provided preferences and cuisine types (what the frontend sent)
    const uxPreferences = params.diet || [];
    const uxCuisineTypes = params.cuisineType || [];

    console.log(`📥 UX-provided preferences:`, uxPreferences);
    console.log(`📥 UX-provided cuisine types:`, uxCuisineTypes);

    // 4. Compare with client profile to identify what was removed by UX
    const removedPreferences = clientPreferences.filter(pref => 
      !uxPreferences.includes(pref)
    );

    const removedCuisineTypes = clientCuisineTypes.filter(cuisine => 
      !uxCuisineTypes.includes(cuisine)
    );

    console.log(`❌ Removed preferences (not in UX request):`, removedPreferences);
    console.log(`❌ Removed cuisine types (not in UX request):`, removedCuisineTypes);

    // 4. Handle different search types
    const searchType = params.searchType || 'broad';
    let searchQuery = params.query || '';

    if (searchType === 'ingredient' && params.ingredients && params.ingredients.length > 0) {
      // For ingredient search, join ingredients with commas
      searchQuery = params.ingredients.join(', ');
      console.log(`🔍 Ingredient search mode: ${searchQuery}`);
    } else if (searchType === 'name') {
      console.log(`📝 Name search mode: ${searchQuery}`);
    } else {
      console.log(`🔍 Broad search mode: ${searchQuery}`);
    }

    // 5. Build enhanced search params - ONLY allergens and cuisine types as filters
    const enhancedParams: UnifiedSearchParams = {
      ...params,
      query: searchQuery,
      // Only add allergen filters to health filters (NO dietary preferences)
      health: [
        ...(params.health || []),
        ...allergenFiltersFromClient
      ],
      // DO NOT apply dietary preferences as filters
      diet: undefined,
      // Only use cuisine types as filter
      cuisineType: uxCuisineTypes
    };

    console.log(`🔍 Final search params (allergens + cuisine only):`, enhancedParams);
    console.log(`❌ Dietary preferences NOT used as filters:`, uxPreferences);

    // 6. Perform standard search (APIs will filter out allergens at metadata level)
    let results = await this.searchRecipes(enhancedParams, userId);

    // 7. Post-filter for name-only search
    if (searchType === 'name' && searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase();
      const originalCount = results.recipes.length;
      
      results.recipes = results.recipes.filter(recipe =>
        recipe.title.toLowerCase().includes(normalizedQuery)
      );
      
      console.log(`📝 Name filter: ${originalCount} → ${results.recipes.length} recipes`);
      results.totalResults = results.recipes.length;
    }

    // 8. INGREDIENT-LEVEL ALLERGEN CHECKING - Double-check all ingredients
    console.log(`🔍 Performing ingredient-level allergen checking...`);
    const { checkAllergenConflicts } = await import('./allergenChecker');
    
    const recipesBeforeIngredientFilter = results.recipes.length;
    
    // Filter out recipes where ingredients contain allergens
    const filteredRecipes = results.recipes.filter(recipe => {
      // Check allergens in actual ingredients
      const conflictCheck = checkAllergenConflicts(
        recipe.allergens || [],
        recipe.healthLabels || [],
        clientAllergies,
        recipe.ingredients // Pass ingredients for keyword checking
      );
      
      if (conflictCheck.hasConflict) {
        console.log(`❌ Filtered out "${recipe.title}" - ingredient conflicts:`, conflictCheck.conflictingAllergens);
      }
      
      return !conflictCheck.hasConflict; // Keep only recipes without conflicts
    });
    
    console.log(`🧹 Ingredient-level filter: ${recipesBeforeIngredientFilter} → ${filteredRecipes.length} recipes`);
    results.recipes = filteredRecipes;
    results.totalResults = filteredRecipes.length;

    // 9. Return with metadata
    return {
      ...results,
      recipes: filteredRecipes, // Use ingredient-filtered recipes
      clientProfile: {
        id: client.id,
        name: clientFullName,
        allergies: clientAllergies,
        preferences: clientPreferences, // Still return for reference, just not used as filter
        cuisineTypes: clientCuisineTypes
      },
      appliedFilters: {
        allergenFilters: allergenFiltersFromClient,
        uxPreferences: [], // No longer applying dietary preferences
        uxCuisineTypes: uxCuisineTypes,
        removedPreferences: [], // No longer relevant
        removedCuisineTypes: removedCuisineTypes,
        ingredientLevelFiltering: true // Flag to indicate ingredient checking was done
      }
    };
  }

  /**
   * Analyze recipe to determine if it contains overridden allergens
   * Returns warning metadata for the recipe
   */
  private analyzeRecipeForAllergenWarnings(
    recipe: UnifiedRecipeSummary,
    removedAllergens: string[],
    removedPreferences: string[]
  ): {
    containsOverriddenAllergens: boolean;
    overriddenAllergensPresent: string[];
    overriddenPreferencesViolated: string[];
  } {
    // If no overrides, no warnings needed
    if (removedAllergens.length === 0 && removedPreferences.length === 0) {
      return {
        containsOverriddenAllergens: false,
        overriddenAllergensPresent: [],
        overriddenPreferencesViolated: []
      };
    }

    // Since the recipe passed API filtering WITHOUT the removed filters,
    // it likely contains those allergens/violates those preferences
    // We'll flag ALL removed items as potential warnings
    // The frontend should show these as "May contain" tags

    const overriddenAllergensPresent = [...removedAllergens];
    const overriddenPreferencesViolated = [...removedPreferences];

    const hasWarnings = 
      overriddenAllergensPresent.length > 0 || 
      overriddenPreferencesViolated.length > 0;

    if (hasWarnings) {
      console.log(
        `⚠️ Recipe "${recipe.title}" may contain overridden items:`,
        { allergens: overriddenAllergensPresent, preferences: overriddenPreferencesViolated }
      );
    }

    return {
      containsOverriddenAllergens: hasWarnings,
      overriddenAllergensPresent,
      overriddenPreferencesViolated
    };
  }

  /**
   * Check which dietary preferences are supported by each provider
   */
  private getUnsupportedPreferences(preferences: string[], provider: 'edamam' | 'spoonacular'): string[] {
    const edamamOnly = ['balanced', 'high-fiber', 'alcohol-free', 'kosher'];
    const spoonacularOnly = ['whole30'];
    const notSupported = ['halal'];

    if (provider === 'edamam') {
      return [...spoonacularOnly, ...notSupported].filter(p => 
        preferences.some(pref => pref.toLowerCase().includes(p.toLowerCase()))
      );
    } else {
      return [...edamamOnly, ...notSupported].filter(p => 
        preferences.some(pref => pref.toLowerCase().includes(p.toLowerCase()))
      );
    }
  }

  /**
   * Map Edamam health labels to Spoonacular intolerances
   * Edamam uses: "peanut-free", "dairy-free", etc.
   * Spoonacular uses: "Peanut", "Dairy", etc.
   */
  private mapHealthLabelsToSpoonacularIntolerances(healthLabels: string[]): string[] {
    const mapping: Record<string, string> = {
      'peanut-free': 'Peanut',
      'tree-nut-free': 'Tree Nut',
      'dairy-free': 'Dairy',
      'egg-free': 'Egg',
      'soy-free': 'Soy',
      'wheat-free': 'Wheat',
      'gluten-free': 'Gluten',
      'fish-free': 'Seafood',
      'shellfish-free': 'Shellfish',
      'sesame-free': 'Sesame',
      'sulfite-free': 'Sulfite'
    };

    const intolerances: string[] = [];
    const uniqueIntolerances = new Set<string>();

    for (const healthLabel of healthLabels) {
      const normalized = healthLabel.toLowerCase().trim();
      const intolerance = mapping[normalized];

      if (intolerance && !uniqueIntolerances.has(intolerance)) {
        intolerances.push(intolerance);
        uniqueIntolerances.add(intolerance);
        console.log(`✅ Mapped health label "${healthLabel}" → Spoonacular intolerance "${intolerance}"`);
      }
    }

    return intolerances;
  }

  /**
   * Map common allergens to API health label filters
   * Supports both Edamam and Spoonacular formats
   */
  private mapAllergensToHealthLabels(allergies: string[]): string[] {
    const mapping: Record<string, string> = {
      // Nuts
      'peanuts': 'peanut-free',
      'peanut': 'peanut-free',
      'tree nuts': 'tree-nut-free',
      'tree nut': 'tree-nut-free',
      'nuts': 'tree-nut-free',
      'almond': 'tree-nut-free',
      'almonds': 'tree-nut-free',
      'cashew': 'tree-nut-free',
      'cashews': 'tree-nut-free',
      'walnut': 'tree-nut-free',
      'walnuts': 'tree-nut-free',
      'pecan': 'tree-nut-free',
      'pecans': 'tree-nut-free',
      
      // Dairy
      'dairy': 'dairy-free',
      'milk': 'dairy-free',
      'lactose': 'dairy-free',
      'cheese': 'dairy-free',
      'butter': 'dairy-free',
      'cream': 'dairy-free',
      'yogurt': 'dairy-free',
      
      // Eggs
      'eggs': 'egg-free',
      'egg': 'egg-free',
      
      // Soy
      'soy': 'soy-free',
      'soya': 'soy-free',
      'soybeans': 'soy-free',
      
      // Wheat/Gluten
      'wheat': 'wheat-free',
      'gluten': 'gluten-free',
      
      // Seafood
      'fish': 'fish-free',
      'shellfish': 'shellfish-free',
      'shrimp': 'shellfish-free',
      'crab': 'shellfish-free',
      'lobster': 'shellfish-free',
      'oyster': 'shellfish-free',
      'oysters': 'shellfish-free',
      'clam': 'shellfish-free',
      'clams': 'shellfish-free',
      'mussel': 'shellfish-free',
      'mussels': 'shellfish-free',
      
      // Seeds
      'sesame': 'sesame-free',
      
      // Other
      'sulfites': 'sulfite-free',
      'sulfite': 'sulfite-free'
    };

    const filters: string[] = [];
    const uniqueFilters = new Set<string>();

    for (const allergen of allergies) {
      let normalized = allergen.toLowerCase().trim();
      
      // If allergen already ends with "-free", it's the health label itself
      if (normalized.endsWith('-free')) {
        if (!uniqueFilters.has(normalized)) {
          filters.push(normalized);
          uniqueFilters.add(normalized);
          console.log(`✅ Using health label directly: "${allergen}"`);
        }
        continue;
      }
      
      // Otherwise map the base allergen to health label
      const filter = mapping[normalized];

      if (filter && !uniqueFilters.has(filter)) {
        filters.push(filter);
        uniqueFilters.add(filter);
        console.log(`✅ Mapped allergen "${allergen}" → "${filter}"`);
      } else if (!filter) {
        console.warn(`⚠️ Unknown allergen: "${allergen}" - no API filter available (nutritionist should manually review)`);
        // Still continue - we'll show visual warning in UI
      }
    }

    return filters;
  }
}
