import { config } from './config';

export interface EdamamRecipe {
  uri: string;
  label: string;
  image: string;
  source: string;
  url: string;
  shareAs: string;
  yield: number;
  dietLabels: string[];
  healthLabels: string[];
  cautions: string[];
  ingredientLines: string[];
  ingredients: EdamamIngredient[];
  calories: number;
  totalWeight: number;
  totalTime: number;
  cuisineType: string[];
  mealType: string[];
  dishType: string[];
  totalNutrients: Record<string, EdamamNutrient>;
  totalDaily: Record<string, EdamamNutrient>;
  digest: EdamamDigest[];
}

export interface EdamamIngredient {
  text: string;
  quantity: number;
  measure: string;
  food: string;
  weight: number;
  foodId: string;
  foodCategory: string;
  foodCategoryLabel: string;
  image: string;
}

export interface EdamamNutrient {
  label: string;
  quantity: number;
  unit: string;
}

export interface EdamamDigest {
  label: string;
  tag: string;
  schemaOrgTag: string;
  total: number;
  hasRDI: boolean;
  daily: number;
  unit: string;
  sub?: EdamamDigest[];
}

export interface RecipeSearchParams {
  query?: string;
  diet?: string[];
  health?: string[];
  cuisineType?: string[];
  mealType?: string[];
  dishType?: string[];
  calories?: string; // e.g., "0-100", "100-300"
  time?: string; // e.g., "0-30", "30-60"
  excluded?: string[];
  imageSize?: 'THUMBNAIL' | 'SMALL' | 'REGULAR' | 'LARGE';
  random?: boolean;
  beta?: boolean;
  co2EmissionsClass?: string;
}

export interface MealPlanRequest {
  targetCalories: number;
  diet?: string[];
  exclude?: string[];
  timeFrame?: 'day' | 'week';
}

export interface MealPlanResponse {
  _links: {
    next?: { href: string; title: string };
  };
  hits: Array<{recipe: EdamamRecipe}>;
  from: number;
  to: number;
  count: number;
  q: string;
}

// New interfaces for Meal Planner API
export interface MealPlannerRequest {
  size: number;
  plan: {
    accept?: {
      all?: Array<{
        health?: string[];
        diet?: string[];
        dish?: string[];
        meal?: string[];
      }>;
    };
    fit?: {
      ENERC_KCAL?: {
        min: number;
        max: number;
      };
      [key: string]: any;
    };
    sections: {
      [sectionName: string]: {
        accept?: {
          all?: Array<{
            health?: string[];
            diet?: string[];
            dish?: string[];
            meal?: string[];
          }>;
        };
        fit?: {
          ENERC_KCAL?: {
            min: number;
            max: number;
          };
          [key: string]: any;
        };
      };
    };
  };
}

export interface MealPlannerResponse {
  status: string;
  selection?: Array<{
    sections: {
      [sectionName: string]: {
        assigned: string;
        _links?: {
          self: {
            href: string;
            title: string;
          };
        };
      };
    };
  }>;
  plan?: {
    [date: string]: {
      [sectionName: string]: {
        [slotName: string]: {
          uri: string;
          label: string;
          image: string;
          calories: number;
          totalNutrients: {
            [key: string]: {
              quantity: number;
              unit: string;
            };
          };
        };
      };
    };
  };
}

export class EdamamService {
  private appId: string;
  private appKey: string;
  private recipeApiUrl: string;
  private mealPlannerApiUrl: string;
  private nutritionApiUrl: string;

  constructor() {
    this.appId = config.edamam.appId;
    this.appKey = config.edamam.appKey;
    this.recipeApiUrl = config.edamam.recipeApiUrl;
    this.mealPlannerApiUrl = config.edamam.mealPlannerApiUrl;
    this.nutritionApiUrl = config.edamam.nutritionApiUrl;
  }

  /**
   * Search for recipes using the Recipe Search API
   */
  async searchRecipes(params: RecipeSearchParams, userId?: string): Promise<MealPlanResponse> {
    const searchParams = new URLSearchParams();
    
    // Add authentication
    searchParams.append('app_id', this.appId);
    searchParams.append('app_key', this.appKey);
    searchParams.append('type', 'public');
    
    // Add search parameters
    if (params.query) searchParams.append('q', params.query);
    if (params.diet) params.diet.forEach(diet => searchParams.append('diet', diet));
    if (params.health) params.health.forEach(health => searchParams.append('health', health));
    if (params.cuisineType) params.cuisineType.forEach(cuisine => searchParams.append('cuisineType', cuisine));
    if (params.mealType) params.mealType.forEach(meal => searchParams.append('mealType', meal));
    if (params.dishType) params.dishType.forEach(dish => searchParams.append('dishType', dish));
    if (params.calories) searchParams.append('calories', params.calories);
    if (params.time) searchParams.append('time', params.time);
    if (params.excluded) params.excluded.forEach(exclude => searchParams.append('excluded', exclude));
    if (params.imageSize) searchParams.append('imageSize', params.imageSize);
    if (params.random) searchParams.append('random', 'true');
    if (params.beta) searchParams.append('beta', 'true');
    if (params.co2EmissionsClass) searchParams.append('co2EmissionsClass', params.co2EmissionsClass);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add user ID header if provided (required for Active User Tracking)
      if (userId) {
        headers['Edamam-Account-User'] = userId;
      }

      const response = await fetch(`${this.recipeApiUrl}?${searchParams.toString()}`, {
        headers
      });
      
      console.log('🔍 Edamam API Debug - Response Status:', response.status);
      console.log('🔍 Edamam API Debug - Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Edamam API Error Response:', errorText);
        throw new Error(`Edamam API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Edamam API Success - Hits count:', data.hits?.length || 0);
      if (data.hits && data.hits.length > 0) {
        console.log('✅ Edamam API Success - First recipe:', data.hits[0].recipe.label);
      }
      return data;
    } catch (error) {
      console.error('Error searching Edamam recipes:', error);
      throw new Error(`Failed to search recipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get a specific recipe by URI
   */
  async getRecipe(uri: string, userId?: string): Promise<EdamamRecipe> {
    const searchParams = new URLSearchParams();
    searchParams.append('app_id', this.appId);
    searchParams.append('app_key', this.appKey);
    searchParams.append('uri', uri);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add user ID header if provided (required for Active User Tracking)
      if (userId) {
        headers['Edamam-Account-User'] = userId;
      }

      const response = await fetch(`${this.recipeApiUrl}?${searchParams.toString()}`, {
        headers
      });
      
      if (!response.ok) {
        throw new Error(`Edamam API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.hits[0]?.recipe || null;
    } catch (error) {
      console.error('Error fetching recipe:', error);
      throw new Error(`Failed to fetch recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a meal plan using the Meal Planner API
   */
  async generateMealPlan(request: MealPlanRequest): Promise<EdamamRecipe[]> {
    const searchParams = new URLSearchParams();
    searchParams.append('app_id', this.appId);
    searchParams.append('app_key', this.appKey);
    searchParams.append('targetCalories', request.targetCalories.toString());
    
    if (request.diet) request.diet.forEach(diet => searchParams.append('diet', diet));
    if (request.exclude) request.exclude.forEach(exclude => searchParams.append('exclude', exclude));
    if (request.timeFrame) searchParams.append('timeFrame', request.timeFrame);

    try {
      const response = await fetch(`${this.mealPlannerApiUrl}?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Edamam Meal Planner API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.meals || [];
    } catch (error) {
      console.error('Error generating meal plan:', error);
      throw new Error(`Failed to generate meal plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate a meal plan using the NEW Meal Planner API v1
   */
  async generateMealPlanV1(request: MealPlannerRequest, userId?: string): Promise<MealPlannerResponse> {
    console.log('🚨🚨🚨 EDAMAM SERVICE START 🚨🚨🚨');
    console.log('🚨 EDAMAM SERVICE - Input request:', JSON.stringify(request, null, 2));
    console.log('🚨 EDAMAM SERVICE - User ID:', userId);
    
    try {
      // Create Basic Auth header using app_id:app_key
      const credentials = `${this.appId}:${this.appKey}`;
      const base64Credentials = Buffer.from(credentials).toString('base64');
      
      const headers: HeadersInit = {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Credentials}`
      };
      
      // Add user ID header if provided (required for Active User Tracking)
      // Always use 'test2' for Edamam API calls to avoid rate limiting
      const accountUser = "test3"
      headers['Edamam-Account-User'] = accountUser;
      console.log('🍽️ Edamam Service - Using Edamam-Account-User:', accountUser);

      // Use the correct Edamam Meal Planner API endpoint with appId and type=public
      const url = `${this.mealPlannerApiUrl}/${this.appId}/select?type=public`;
      console.log('🍽️ Edamam Service - Request URL:', url);
      console.log('🍽️ Edamam Service - Request headers:', JSON.stringify(headers, null, 2));
      console.log('🍽️ Edamam Service - Request body:', JSON.stringify(request, null, 2));
      console.log('🚨🚨🚨 EDAMAM REQUEST START 🚨🚨🚨');
      console.log('🚨 EDAMAM REQUEST METHOD: POST');
      console.log('🚨 EDAMAM REQUEST URL:', url);
      console.log('🚨 EDAMAM REQUEST HEADERS:', JSON.stringify(headers, null, 2));
      console.log('🚨 EDAMAM REQUEST BODY:', JSON.stringify(request, null, 2));
      console.log('🚨🚨🚨 EDAMAM REQUEST END 🚨🚨🚨');
      console.log('🚨 EDAMAM - ABOUT TO MAKE FETCH CALL 🚨');

      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      console.log('🚨 EDAMAM - FETCH CALL STARTING 🚨');
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(request),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('🚨 EDAMAM - FETCH CALL COMPLETED 🚨');
      console.log('🚨 EDAMAM - RESPONSE STATUS:', response.status);
      console.log('🚨🚨🚨 EDAMAM RESPONSE START 🚨🚨🚨');
      console.log('🚨 EDAMAM RESPONSE STATUS:', response.status);
      console.log('🚨 EDAMAM RESPONSE STATUS TEXT:', response.statusText);
      console.log('🚨 EDAMAM RESPONSE HEADERS:', JSON.stringify(Object.fromEntries(response.headers as any), null, 2));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edamam Service - Meal Planner API error response:');
        console.error('  - Status:', response.status);
        console.error('  - Status Text:', response.statusText);
        console.error('  - Error Body:', errorText);
        throw new Error(`Edamam Meal Planner API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('🚨🚨🚨 EDAMAM RESPONSE BODY START 🚨🚨🚨');
      console.log('🚨 EDAMAM FULL RESPONSE DATA:', JSON.stringify(data, null, 2));
      console.log('🚨🚨🚨 EDAMAM RESPONSE BODY END 🚨🚨🚨');
      console.log('✅ Edamam Service - Meal plan generated successfully');
      console.log('✅ Edamam Service - Response summary:');
      console.log('  - Response type:', typeof data);
      console.log('  - Has selection:', !!data.selection);
      console.log('  - Selection count:', data.selection ? data.selection.length : 0);
      console.log('  - Status:', data.status);
      console.log('🍽️ Edamam Service - ===== generateMealPlanV1 END =====');
      
      return data;
    } catch (error) {
      console.error('❌ Edamam Service - Error generating meal plan:', error);
      console.error('❌ Edamam Service - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.log('🍽️ Edamam Service - ===== generateMealPlanV1 ERROR =====');
      throw new Error(`Failed to generate meal plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Fetch recipe details from Edamam Recipe API v2 using the recipe URI
   */
  async getRecipeDetails(recipeUri: string, userId?: string): Promise<any> {
    console.log('🍽️ Edamam Service - ===== getRecipeDetails START =====');
    console.log('🍽️ Edamam Service - Input recipe URI:', recipeUri);
    console.log('🍽️ Edamam Service - User ID:', userId);
    
    try {
      // Extract recipe ID from URI (e.g., "recipe_f0ae5c39b8140a2523ebb1f45ebefdf3")
      const recipeId = recipeUri.split('#recipe_')[1];
      if (!recipeId) {
        throw new Error('Invalid recipe URI format');
      }

      console.log('🍽️ Edamam Service - Recipe ID extracted:', recipeId);
      
      // Recipe API v2 uses query parameters for authentication, not Basic Auth header
      const headers: HeadersInit = {
        'accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      // Add user ID header if provided (required for Active User Tracking)
      // Always use 'test2' for Edamam API calls to avoid rate limiting
      const accountUser = "test3"
      headers['Edamam-Account-User'] = accountUser;
      console.log('🍽️ Edamam Service - Using Edamam-Account-User for Recipe API:', accountUser);

      // Use query parameters for app_id and app_key as shown in working CURL
      const url = `https://api.edamam.com/api/recipes/v2/${recipeId}?app_id=${this.appId}&app_key=${this.appKey}&type=public`;
      console.log('🍽️ Edamam Service - Recipe API request details:');
      console.log('  - Method: GET');
      console.log('  - URL:', url);
      console.log('  - Headers:', JSON.stringify(headers, null, 2));
      console.log('  - Recipe ID:', recipeId);
      
      // Add timeout to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      console.log('🍽️ Edamam Service - Recipe API response received:');
      console.log('  - Status:', response.status);
      console.log('  - Status Text:', response.statusText);
      console.log('  - Response Headers:', JSON.stringify(Object.fromEntries(response.headers as any), null, 2));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Edamam Service - Recipe API error:');
        console.error('  - Status:', response.status);
        console.error('  - Status Text:', response.statusText);
        console.error('  - Error Body:', errorText);
        
        // If Recipe API v2 fails, create a mock recipe as fallback
        console.log('🍽️ Edamam Service - Recipe API v2 failed, creating mock recipe as fallback');
        const mockRecipe = {
          recipe: {
            label: `Recipe ${recipeId.substring(0, 8)}`,
            url: '',
            image: '',
            calories: 0, // Will be filled from meal distribution
            totalNutrients: {
              PROCNT: { quantity: 0, unit: 'g' },
              CHOCDF: { quantity: 0, unit: 'g' },
              FAT: { quantity: 0, unit: 'g' },
              FIBTG: { quantity: 0, unit: 'g' }
            },
            ingredientLines: []
          }
        };
        
        return mockRecipe;
      }

      const data = await response.json();
      console.log('✅ Edamam Service - Recipe details fetched successfully');
      console.log('✅ Edamam Service - Recipe response data:', JSON.stringify(data, null, 2));
      console.log('✅ Edamam Service - Recipe response summary:');
      console.log('  - Recipe label:', data.label);
      console.log('  - Calories:', data.calories);
      console.log('  - Ingredients count:', data.ingredients ? data.ingredients.length : 0);
      console.log('  - Total nutrients:', data.totalNutrients ? Object.keys(data.totalNutrients).length : 0);
      console.log('🍽️ Edamam Service - ===== getRecipeDetails END =====');
      
      return data;
    } catch (error) {
      console.error('❌ Edamam Service - Error fetching recipe details:', error);
      
      // Create mock recipe as fallback
      console.log('🍽️ Edamam Service - Creating mock recipe due to error');
      const recipeId = recipeUri.split('#recipe_')[1] || 'unknown';
      const mockRecipe = {
        recipe: {
          label: `Recipe ${recipeId.substring(0, 8)}`,
          url: '',
          image: '',
          calories: 0,
          totalNutrients: {
            PROCNT: { quantity: 0, unit: 'g' },
            CHOCDF: { quantity: 0, unit: 'g' },
            FAT: { quantity: 0, unit: 'g' },
            FIBTG: { quantity: 0, unit: 'g' }
          },
          ingredientLines: []
        }
      };
      
      return mockRecipe;
    }
  }

  /**
   * Search for recipes that fit specific nutrition criteria
   */
  async searchRecipesByNutrition(
    targetCalories: number,
    targetProtein?: number,
    targetCarbs?: number,
    targetFat?: number,
    additionalParams: Partial<RecipeSearchParams> = {},
    userId?: string
  ): Promise<MealPlanResponse> {
    // Calculate calorie range (±20% of target)
    const calorieRange = `${Math.round(targetCalories * 0.8)}-${Math.round(targetCalories * 1.2)}`;
    
    const params: RecipeSearchParams = {
      calories: calorieRange,
      ...additionalParams
    };

    return this.searchRecipes(params, userId);
  }

  /**
   * Get nutrition information for a food item
   */
  async getFoodNutrition(query: string): Promise<any> {
    const searchParams = new URLSearchParams();
    searchParams.append('app_id', this.appId);
    searchParams.append('app_key', this.appKey);
    searchParams.append('ingr', query);

    try {
      const response = await fetch(`${this.nutritionApiUrl}/parser?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error(`Edamam Nutrition API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching food nutrition:', error);
      throw new Error(`Failed to fetch food nutrition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert Edamam recipe to standardized format
   */
  static convertRecipeToStandard(edamamRecipe: EdamamRecipe) {
    return {
      id: edamamRecipe.uri,
      name: edamamRecipe.label,
      image: edamamRecipe.image,
      source: edamamRecipe.source,
      url: edamamRecipe.url,
      servings: edamamRecipe.yield,
      prepTime: edamamRecipe.totalTime,
      calories: edamamRecipe.calories,
      protein: edamamRecipe.totalNutrients.PROCNT?.quantity || 0,
      carbs: edamamRecipe.totalNutrients.CHOCDF?.quantity || 0,
      fat: edamamRecipe.totalNutrients.FAT?.quantity || 0,
      fiber: edamamRecipe.totalNutrients.FIBTG?.quantity || 0,
      ingredients: edamamRecipe.ingredientLines,
      instructions: edamamRecipe.ingredientLines, // Edamam doesn't provide cooking instructions
      dietLabels: edamamRecipe.dietLabels,
      healthLabels: edamamRecipe.healthLabels,
      cuisineType: edamamRecipe.cuisineType,
      mealType: edamamRecipe.mealType,
      dishType: edamamRecipe.dishType
    };
  }

  /**
   * Calculate total nutrition for multiple recipes
   */
  static calculateTotalNutrition(recipes: EdamamRecipe[], servings: number[] = []): {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalFiber: number;
  } {
    let totalCalories = 0;
    let totalProtein = 0;
    let totalCarbs = 0;
    let totalFat = 0;
    let totalFiber = 0;

    recipes.forEach((recipe, index) => {
      const servingMultiplier = servings[index] || 1;
      totalCalories += (recipe.calories * servingMultiplier);
      totalProtein += ((recipe.totalNutrients.PROCNT?.quantity || 0) * servingMultiplier);
      totalCarbs += ((recipe.totalNutrients.CHOCDF?.quantity || 0) * servingMultiplier);
      totalFat += ((recipe.totalNutrients.FAT?.quantity || 0) * servingMultiplier);
      totalFiber += ((recipe.totalNutrients.FIBTG?.quantity || 0) * servingMultiplier);
    });

    return {
      totalCalories: Math.round(totalCalories),
      totalProtein: Math.round(totalProtein * 100) / 100,
      totalCarbs: Math.round(totalCarbs * 100) / 100,
      totalFat: Math.round(totalFat * 100) / 100,
      totalFiber: Math.round(totalFiber * 100) / 100
    };
  }
}
