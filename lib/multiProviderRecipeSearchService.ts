import { EdamamService, RecipeSearchParams as EdamamSearchParams, EdamamRecipe } from './edamamService';

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
  source: 'edamam' | 'spoonacular';
  readyInMinutes?: number;
  servings?: number;
  // Nutrition data (per serving)
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
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
  provider?: 'edamam' | 'spoonacular' | 'both';
}

export interface UnifiedSearchResponse {
  recipes: UnifiedRecipeSummary[];
  totalResults: number;
  provider: string;
  searchParams: UnifiedSearchParams;
}

export class MultiProviderRecipeSearchService {
  private edamamService: EdamamService;
  private spoonacularApiKey: string;

  constructor() {
    this.edamamService = new EdamamService();
    this.spoonacularApiKey = process.env.SPOONACULAR_API_KEY || '0c6f2e35fab0436eafec876a66fd2c51';
    
    if (!this.spoonacularApiKey) {
      console.warn('⚠️ Spoonacular API key not found. Spoonacular searches will be disabled.');
    }
  }

  /**
   * Search recipes across multiple providers
   */
  async searchRecipes(params: UnifiedSearchParams, userId?: string): Promise<UnifiedSearchResponse> {
    const { provider = 'both', maxResults = 20 } = params;
    
    console.log('🔍 MultiProvider searchRecipes called with:', { provider, maxResults, params });
    
    if (provider === 'edamam') {
      return await this.searchEdamam(params, userId);
    } else if (provider === 'spoonacular') {
      console.log('🍽️ Routing to Spoonacular search');
      return await this.searchSpoonacular(params);
    } else {
      // Search both providers and combine results
      console.log('🔄 Searching both providers');
      const [edamamResults, spoonacularResults] = await Promise.allSettled([
        this.searchEdamam({ ...params, maxResults: Math.ceil(maxResults / 2) }, userId),
        this.searchSpoonacular({ ...params, maxResults: Math.ceil(maxResults / 2) })
      ]);

      const recipes: UnifiedRecipe[] = [];
      let totalResults = 0;

      if (edamamResults.status === 'fulfilled') {
        recipes.push(...edamamResults.value.recipes);
        totalResults += edamamResults.value.totalResults;
      }

      if (spoonacularResults.status === 'fulfilled') {
        recipes.push(...spoonacularResults.value.recipes);
        totalResults += spoonacularResults.value.totalResults;
      }

      // Shuffle and limit results
      const shuffledRecipes = this.shuffleArray(recipes).slice(0, maxResults);

      return {
        recipes: shuffledRecipes,
        totalResults,
        provider: 'both',
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
      
      // Convert to lightweight summaries (no detailed fetching)
      const recipes: UnifiedRecipeSummary[] = response.results
        .slice(0, params.maxResults || 20)
        .map(recipe => this.convertSpoonacularToSummary(recipe));

      console.log(`✅ Spoonacular search completed: ${recipes.length} recipes found`);
      return {
        recipes,
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
    
    const spoonacularParams: SpoonacularSearchParams = {
      query: params.query,
      cuisine: mappedCuisines,
      diet: params.diet,
      intolerances: params.health, // Map health labels to intolerances
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
      fiber: fiberPerServing
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
        unit: ing.measure,
        image: ing.image,
        original: ing.text
      })) || [],
      healthLabels: recipe.healthLabels || [],
      dietLabels: recipe.dietLabels || [],
      cuisineType: recipe.cuisineType || [],
      dishType: recipe.dishType || [],
      mealType: recipe.mealType || []
    };
  }

  /**
   * Convert Spoonacular recipe to light summary for search results
   */
  private convertSpoonacularToSummary(recipe: SpoonacularRecipe): UnifiedRecipeSummary {
    // Extract nutrition data from Spoonacular recipe (now available with addRecipeNutrition=true)
    const nutrition = this.extractNutritionFromSpoonacular(recipe);
    
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
      fiber: nutrition.fiber
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
      mealType: recipe.occasions || []
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
   * Get recipe details by ID (supports both providers)
   */
  async getRecipeDetails(recipeId: string): Promise<UnifiedRecipe | null> {
    if (recipeId.startsWith('edamam_')) {
      // Handle Edamam recipe details
      const edamamId = recipeId.replace('edamam_', '');
      // Implementation would call Edamam's recipe details API
      return null;
    } else if (recipeId.startsWith('spoonacular_')) {
      // Handle Spoonacular recipe details
      const spoonacularId = recipeId.replace('spoonacular_', '');
      // Implementation would call Spoonacular's recipe details API
      return null;
    }
    
    return null;
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
        unit: ing.measure,
        image: ing.image
      })),
      instructions: recipe.ingredientLines.join('\n'), // Fallback to ingredient lines
      summary: `${recipe.label} - ${recipe.calories.toFixed(0)} calories`,
      healthLabels: recipe.healthLabels || [],
      dietLabels: recipe.dietLabels || [],
      cuisineType: recipe.cuisineType || [],
      dishType: recipe.dishType || [],
      mealType: recipe.mealType || []
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
      // Determine provider from recipe ID
      const provider = recipeId.startsWith('recipe_') ? 'edamam' : 'spoonacular';
      
      if (provider === 'edamam') {
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

      return {
        id: recipeId,
        title: recipe.label,
        image: recipe.image,
        sourceUrl: recipe.url,
        source: 'edamam',
        servings: recipe.yield || 1,
        readyInMinutes: recipe.totalTime,
        nutrition: this.transformEdamamNutrition(recipe.totalNutrients, recipe.totalDaily),
        ingredients: recipe.ingredients.map((ing: any) => ({
          name: ing.food,
          amount: ing.quantity,
          unit: ing.measure,
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
        healthLabels: recipe.healthLabels || [],
        cautions: recipe.cautions || [],
        tags: recipe.tags || []
      };
    } catch (error) {
      console.error('❌ Error fetching Spoonacular recipe details:', error);
      throw error;
    }
  }

  /**
   * Transform Edamam nutrition data to standard format
   */
  private transformEdamamNutrition(totalNutrients: any, totalDaily: any): any {
    const nutrition: any = {
      calories: null,
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };
    
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
        const value = Math.round(totalNutrients[edamamKey].quantity * 100) / 100;
        const unit = totalNutrients[edamamKey].unit || 'g';
        
        if (mapping.category === 'calories') {
          nutrition.calories = { quantity: value, unit: unit };
        } else if (mapping.category === 'macros') {
          nutrition.macros[mapping.key] = { quantity: value, unit: unit };
        } else if (mapping.category === 'vitamins') {
          nutrition.micros.vitamins[mapping.key] = { quantity: value, unit: unit };
        } else if (mapping.category === 'minerals') {
          nutrition.micros.minerals[mapping.key] = { quantity: value, unit: unit };
        }
      }
    }

    return nutrition;
  }

  /**
   * Transform Spoonacular nutrition data to standard format
   */
  private transformSpoonacularNutrition(nutrition: any): any {
    if (!nutrition || !nutrition.nutrients) {
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
      console.log('🔍 SPOONACULAR INGREDIENT SUGGESTIONS - START');
      console.log('query:', query, 'mode:', mode);

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
      console.log('🔍 SPOONACULAR INGREDIENT CURL COMMAND');
      console.log(`curl -X GET '${fullUrl}'`);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      console.log('🔍 SPOONACULAR INGREDIENT RESPONSE STATUS:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ SPOONACULAR INGREDIENT ERROR RESPONSE:', errorText);
        return mode === 'units_only' ? { units: [], suggestions: [], unitSuggestions: {} } : { suggestions: [], unitSuggestions: {} };
      }

      const data = await response.json();
      console.log('✅ SPOONACULAR INGREDIENT SUCCESS - Results count:', data?.length || 0);

      // Extract ingredient names from the response
      const suggestions = Array.isArray(data) 
        ? data.map((item: any) => item.name || item.title || item).filter(Boolean)
        : [];

      console.log('✅ SPOONACULAR INGREDIENT SUGGESTIONS:', suggestions);

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
      console.log('🤖 OPENAI UNIT SUGGESTIONS (for Spoonacular) - START');
      console.log('ingredients:', ingredients);

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
      
      console.log('✅ UNIT SUGGESTIONS SUCCESS:', unitSuggestions);
      return unitSuggestions;

    } catch (error) {
      console.log('❌ UNIT SUGGESTIONS ERROR:', error);
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
      console.log('🔍 SPOONACULAR INGREDIENT NUTRITION - START');
      console.log('ingredientText:', ingredientText);

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
      console.log('🔍 SPOONACULAR NUTRITION CURL COMMAND');
      console.log(`curl -X POST '${fullUrl}'`);

      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      console.log('🔍 SPOONACULAR NUTRITION RESPONSE STATUS:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ SPOONACULAR NUTRITION ERROR RESPONSE:', errorText);
        throw new Error(`Spoonacular nutrition API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ SPOONACULAR NUTRITION SUCCESS');

      // Return first ingredient's nutrition data
      if (Array.isArray(data) && data.length > 0) {
        const ingredient = data[0];
        const nutrition = ingredient.nutrition;

        return {
          calories: nutrition?.nutrients?.find((n: any) => n.name === 'Calories')?.amount || 0,
          protein: nutrition?.nutrients?.find((n: any) => n.name === 'Protein')?.amount || 0,
          carbs: nutrition?.nutrients?.find((n: any) => n.name === 'Carbohydrates')?.amount || 0,
          fat: nutrition?.nutrients?.find((n: any) => n.name === 'Fat')?.amount || 0,
          fiber: nutrition?.nutrients?.find((n: any) => n.name === 'Fiber')?.amount || 0,
          rawData: ingredient
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
      console.log('🔄 SPOONACULAR INGREDIENT SUBSTITUTES - START');
      console.log('recipeId:', recipeId, 'ingredientId:', ingredientId);

      const url = `https://api.spoonacular.com/recipes/${recipeId}/substitutes/${ingredientId}`;
      const params = new URLSearchParams({
        apiKey: this.spoonacularApiKey
      });

      const fullUrl = `${url}?${params.toString()}`;
      console.log('🔄 SPOONACULAR SUBSTITUTES CURL COMMAND');
      console.log(`curl -X GET '${fullUrl}'`);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      console.log('🔄 SPOONACULAR SUBSTITUTES RESPONSE STATUS:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ SPOONACULAR SUBSTITUTES ERROR RESPONSE:', errorText);
        throw new Error(`Spoonacular substitutes API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ SPOONACULAR SUBSTITUTES SUCCESS');

      // Return substitutes with additional metadata
      return Array.isArray(data) ? data : [];

    } catch (error) {
      console.error('❌ SPOONACULAR INGREDIENT SUBSTITUTES ERROR:', error);
      return [];
    }
  }
}
