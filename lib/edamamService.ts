import { config } from './config';
import { EdamamApiKeyService } from './edamamApiKeyService';
import { EdamamLoggingService, EdamamApiLogData } from './edamamLoggingService';
import OpenAI from 'openai';

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
  type?: string[]; // 'public', 'user', 'edamam-generic' - filters recipe source
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

export class EdamamService {
  private appId: string;
  private appKey: string;
  private recipeApiUrl: string;
  private nutritionApiUrl: string;
  private nutritionAppId: string;
  private nutritionAppKey: string;
  
  // New API key management services
  private apiKeyService: EdamamApiKeyService;
  private loggingService: EdamamLoggingService;
  
  // OpenAI client for unit suggestions
  private openai: OpenAI;
  
  // Round-robin user management for Recipe API
  private static recipeApiUsers = ['test1', 'test2', 'test3', 'test4', 'test5', 'test6', 'test7', 'test8', 'test9', 'test10'];
  private static currentRecipeApiUserIndex = 0;

  constructor() {
    this.appId = config.edamam.appId;
    this.appKey = config.edamam.appKey;
    this.recipeApiUrl = config.edamam.recipeApiUrl;
    this.nutritionApiUrl = config.edamam.nutritionApiUrl;
    this.nutritionAppId = process.env.EDAMAM_NUTRITION_APP_ID || '';
    this.nutritionAppKey = process.env.EDAMAM_NUTRITION_APP_KEY || '';
    
    // Initialize API key management services
    this.apiKeyService = new EdamamApiKeyService();
    this.loggingService = new EdamamLoggingService();
    
    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Wrapper method to log API calls
   */
  private async loggedApiCall<T>(
    apiType: EdamamApiLogData['apiType'],
    endpoint: string,
    apiCall: () => Promise<Response>,
    requestData?: {
      payload?: any;
      params?: any;
      headers?: any;
      userId?: string;
      clientId?: string;
      featureContext?: string;
      httpMethod?: string;
    }
  ): Promise<T> {
    const startTime = Date.now();
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Prepare initial log data
    const logData: EdamamApiLogData = {
      userId: requestData?.userId,
      clientId: requestData?.clientId,
      sessionId,
      apiType,
      endpoint,
      httpMethod: requestData?.httpMethod || 'GET',
      requestPayload: requestData?.payload,
      requestParams: requestData?.params,
      requestHeaders: requestData?.headers,
      featureContext: requestData?.featureContext || apiType,
      apiKeyUsed: 'edamam-key', // Will be masked in logging service
    };
    
    try {
      // Make the API call
      const response = await apiCall();
      const responseTime = Date.now() - startTime;
      
      // Parse response
      const responseData = await response.json();
      const responseSizeBytes = JSON.stringify(responseData).length;
      
      // Update log data with response info
      logData.responseStatus = response.status;
      logData.responsePayload = responseData;
      logData.responseSizeBytes = responseSizeBytes;
      logData.responseTimeMs = responseTime;
      logData.errorOccurred = !response.ok;
      
      if (!response.ok) {
        logData.errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        logData.errorCode = response.status.toString();
      }
      
      // Extract rate limit info from headers
      const rateLimitRemaining = response.headers.get('x-ratelimit-remaining');
      if (rateLimitRemaining) {
        logData.rateLimitRemaining = parseInt(rateLimitRemaining);
      }
      
      // Log the API call (don't await to avoid blocking)
      this.loggingService.logApiCall(logData).catch(error => {
        console.error('Failed to log Edamam API call:', error);
      });
      
      if (!response.ok) {
        throw new Error(`Edamam API error: ${response.status} ${response.statusText}`);
      }
      
      return responseData as T;
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update log data with error info
      logData.responseTimeMs = responseTime;
      logData.errorOccurred = true;
      logData.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Log the failed API call
      this.loggingService.logApiCall(logData).catch(logError => {
        console.error('Failed to log Edamam API error:', logError);
      });
      
      throw error;
    }
  }

  /**
   * Get API key with automatic rotation if needed
   */
  private async getApiKeyWithRotation(apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete'): Promise<{ appId: string; appKey: string }> {
    try {
      console.log(`🔑 Edamam Service - Getting ${apiType} API key from database`);
      
      // Get active API key from database
      const keyResult = await this.apiKeyService.getActiveApiKey(apiType);
      
      if (!keyResult.success || !keyResult.appId || !keyResult.appKey) {
        console.warn(`⚠️ Edamam Service - No active ${apiType} key found in database, falling back to hardcoded keys`);
        throw new Error(`No active ${apiType} key found`);
      }

      // Increment usage count
      await this.apiKeyService.incrementUsage(keyResult.appId, apiType);
      
      return { appId: keyResult.appId, appKey: keyResult.appKey };

    } catch (error) {
      console.error(`❌ Edamam Service - Error getting ${apiType} API key:`, error);
      
      // Fallback to hardcoded keys if database fails
      console.log(`🔄 Edamam Service - Falling back to hardcoded keys for ${apiType}`);
      
      switch (apiType) {
        case 'meal_planner':
          return { appId: '858bc297', appKey: '7b2f0ca26ac245692d8d180302246bd2' };
        case 'nutrition':
        case 'autocomplete':
          return { appId: 'b26e8df0', appKey: '6353e4a8c1d8c9b940d13da95db872e9' };
        case 'recipe':
          return { appId: '5bce8081', appKey: 'c80ecbf8968d48dfe51d395f6f19279a' };
        default:
          throw new Error(`Unknown API type: ${apiType}`);
      }
    }
  }

  /**
   * Get the next recipe API user for round-robin distribution
   */
  private static getNextRecipeApiUser(): string {
    const user = EdamamService.recipeApiUsers[EdamamService.currentRecipeApiUserIndex];
    EdamamService.currentRecipeApiUserIndex = (EdamamService.currentRecipeApiUserIndex + 1) % EdamamService.recipeApiUsers.length;
    return user;
  }

  /**
   * Search for recipes using the Recipe Search API
   */
  async searchRecipes(params: RecipeSearchParams, userId?: string): Promise<MealPlanResponse> {
    const searchParams = new URLSearchParams();
    
    // Get Recipe API credentials with automatic rotation
    const recipeKeys = await this.getApiKeyWithRotation('recipe');
    searchParams.append('app_id', recipeKeys.appId);
    searchParams.append('app_key', recipeKeys.appKey);
    
    // Add debugging for input parameters
    console.log('🔍 Edamam searchRecipes - Input params:', JSON.stringify(params, null, 2));
    
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
    // Add type filter - default to ['public'] to exclude user-generated recipes
    const recipeTypes = params.type || ['public'];
    recipeTypes.forEach(type => searchParams.append('type', type));
    
    // Add debugging for final URL parameters
    console.log('🔍 Edamam searchRecipes - Final URL params:', searchParams.toString());
    console.log('🔍 Edamam searchRecipes - Full URL:', `${this.recipeApiUrl}?${searchParams.toString()}`);

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      // Add user ID header (required for Active User Tracking)
      // Use cycling test users instead of actual userId to avoid format issues
      const cyclingUserId = EdamamService.getNextRecipeApiUser();
      headers['Edamam-Account-User'] = cyclingUserId;
      console.log(`🔄 Recipe Search - Using cycling user: ${cyclingUserId}`);

      const response = await fetch(`${this.recipeApiUrl}?${searchParams.toString()}`, {
        headers
      });
      
      console.log('🔍 Edamam API Debug - Response Status:', response.status);
      console.log('🔍 Edamam API Debug - Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ Edamam API Error Response:', errorText);
        console.log('❌ Edamam API Error - Request URL:', `${this.recipeApiUrl}?${searchParams.toString()}`);
        console.log('❌ Edamam API Error - Request params:', JSON.stringify(params, null, 2));
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
    const workingAppId = '5bce8081';
    const workingAppKey = 'c80ecbf8968d48dfe51d395f6f19279a';
    searchParams.append('app_id', workingAppId);
    searchParams.append('app_key', workingAppKey);
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
   * Parse ingredient text to extract quantity, measure, and food
   */
  public parseIngredientText(ingredientText: string): { quantity: number; measure: string; food: string } {
    const text = ingredientText.trim();
    console.log(`🔍 PARSING INGREDIENT TEXT: "${text}"`);
    
    // Common measurement patterns
    const patterns = [
      // "1 cup almond flour" -> quantity: 1, measure: "cup", food: "almond flour"
      /^(\d+(?:\.\d+)?)\s+(cup|cups)\s+(.+)$/i,
      // "2 tbsp olive oil" -> quantity: 2, measure: "tbsp", food: "olive oil"
      /^(\d+(?:\.\d+)?)\s+(tbsp|tablespoon|tablespoons)\s+(.+)$/i,
      // "1 tsp salt" -> quantity: 1, measure: "tsp", food: "salt"
      /^(\d+(?:\.\d+)?)\s+(tsp|teaspoon|teaspoons)\s+(.+)$/i,
      // "100g chicken" -> quantity: 100, measure: "g", food: "chicken"
      /^(\d+(?:\.\d+)?)\s*(g|gram|grams)\s+(.+)$/i,
      // "1 oz cheese" -> quantity: 1, measure: "oz", food: "cheese"
      /^(\d+(?:\.\d+)?)\s*(oz|ounce|ounces)\s+(.+)$/i,
      // "1 lb beef" -> quantity: 1, measure: "lb", food: "beef"
      /^(\d+(?:\.\d+)?)\s*(lb|pound|pounds)\s+(.+)$/i,
      // "6 fillet Salmon" -> quantity: 6, measure: "fillet", food: "Salmon"
      /^(\d+(?:\.\d+)?)\s+(fillet|fillets)\s+(.+)$/i,
      // "4 slice bacon" -> quantity: 4, measure: "slice", food: "bacon"
      /^(\d+(?:\.\d+)?)\s+(slice|slices)\s+(.+)$/i,
      // "1/2 cup milk" -> quantity: 0.5, measure: "cup", food: "milk"
      /^(\d+\/\d+)\s+(cup|cups)\s+(.+)$/i,
      // "1/4 tsp vanilla" -> quantity: 0.25, measure: "tsp", food: "vanilla"
      /^(\d+\/\d+)\s+(tsp|teaspoon|teaspoons)\s+(.+)$/i,
      // "5 cup almond flour" -> quantity: 5, measure: "cup", food: "almond flour"
      /^(\d+)\s+(cup|cups)\s+(.+)$/i,
      // "3 tbsp olive oil" -> quantity: 3, measure: "tbsp", food: "olive oil"
      /^(\d+)\s+(tbsp|tablespoon|tablespoons)\s+(.+)$/i,
      // "2 tsp salt" -> quantity: 2, measure: "tsp", food: "salt"
      /^(\d+)\s+(tsp|teaspoon|teaspoons)\s+(.+)$/i,
      // "6 fillet Salmon" -> quantity: 6, measure: "fillet", food: "Salmon" (fallback)
      /^(\d+)\s+(fillet|fillets)\s+(.+)$/i
    ];
    
    for (let i = 0; i < patterns.length; i++) {
      const pattern = patterns[i];
      const match = text.match(pattern);
      if (match) {
        console.log(`🔍 PATTERN ${i + 1} MATCHED:`, pattern.source);
        
        let quantity = parseFloat(match[1]);
        
        // Handle fractions
        if (match[1].includes('/')) {
          const [num, den] = match[1].split('/').map(Number);
          quantity = num / den;
          console.log(`🔍 FRACTION DETECTED: ${match[1]} = ${quantity}`);
        }
        
        let measure = match[2].toLowerCase();
        // Normalize measure names
        if (measure === 'tablespoon' || measure === 'tablespoons') measure = 'tbsp';
        if (measure === 'teaspoon' || measure === 'teaspoons') measure = 'tsp';
        if (measure === 'gram' || measure === 'grams') measure = 'g';
        if (measure === 'ounce' || measure === 'ounces') measure = 'oz';
        if (measure === 'pound' || measure === 'pounds') measure = 'lb';
        
        const food = match[3].trim();
        
        const result = { quantity, measure, food };
        console.log(`✅ PARSED RESULT:`, result);
        return result;
      }
    }
    
    // If no pattern matches, return default values
    console.log(`⚠️  NO PATTERN MATCHED, USING DEFAULT VALUES`);
    return { quantity: 1, measure: 'unit', food: text };
  }

  /**
   * Format ingredient text for better Edamam parsing
   */
  private formatIngredientForEdamam(ingredientText: string): string {
    let formatted = ingredientText.trim();
    
    // Common measurement unit improvements
    const unitPatterns = [
      { pattern: /(\d+\s+cup)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+tbsp)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+tsp)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+teaspoon)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+tablespoon)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+ounce)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+oz)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+pound)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+lb)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+gram)\s+/, replacement: '$1 of ' },
      { pattern: /(\d+\s+g)\s+/, replacement: '$1 of ' }
    ];
    
    unitPatterns.forEach(({ pattern, replacement }) => {
      if (pattern.test(formatted) && !formatted.includes(' of ')) {
        formatted = formatted.replace(pattern, replacement);
      }
    });
    
    return formatted;
  }

  /**
   * Get detailed nutrition for an ingredient using Nutrition Data API
   */
  async getIngredientNutrition(ingredientText: string, nutritionType: 'cooking' | 'logging' = 'logging'): Promise<any> {
    try {

      // Get Nutrition API credentials with automatic rotation
      const nutritionKeys = await this.getApiKeyWithRotation('nutrition');
      const url = `https://api.edamam.com/api/nutrition-data`;
      const params = new URLSearchParams({
        app_id: nutritionKeys.appId,
        app_key: nutritionKeys.appKey,
        'nutrition-type': nutritionType,
        ingr: ingredientText
      });

      const fullUrl = `${url}?${params.toString()}`;
      const credentials = `${nutritionKeys.appId}:${nutritionKeys.appKey}`;
      const base64Credentials = Buffer.from(credentials).toString('base64');

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Basic ${base64Credentials}`
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Edamam Nutrition Data API error:', response.status, errorText);
        throw new Error(`Edamam Nutrition Data API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Nutrition API error:', error);
      throw error;
    }
  }

  /**
   * Get ingredient autocomplete suggestions with optional unit suggestions
   */
  async getIngredientAutocomplete(query: string, mode: 'basic' | 'with_units' | 'units_only' = 'basic'): Promise<{suggestions: string[], unitSuggestions: Record<string, string[]>, units?: string[], unitsCount?: number}> {
    try {
      if (!query || query.trim().length === 0) {
        return mode === 'units_only' ? { units: [], suggestions: [], unitSuggestions: {} } : { suggestions: [], unitSuggestions: {} };
      }

      // Get Autocomplete API credentials with automatic rotation (uses same keys as nutrition)
      const autocompleteKeys = await this.getApiKeyWithRotation('autocomplete');
      const url = 'https://api.edamam.com/auto-complete';
      const params = new URLSearchParams({
        app_id: autocompleteKeys.appId,
        app_key: autocompleteKeys.appKey,
        q: query.trim()
      });

      const fullUrl = `${url}?${params.toString()}`;

      // Use logged API call wrapper
      const suggestions = await this.loggedApiCall<string[]>(
        'autocomplete',
        fullUrl,
        () => fetch(fullUrl, {
          method: 'GET',
          headers: {
            'accept': 'application/json'
          }
        }),
        {
          params: Object.fromEntries(params.entries()),
          featureContext: 'ingredient_autocomplete'
        }
      );

      const validSuggestions = Array.isArray(suggestions) ? suggestions : [];
      
      // Handle different modes
      if (mode === 'basic') {
        // Return only suggestions without units for faster response
        return {
          suggestions: validSuggestions,
          unitSuggestions: {}
        };
      } else if (mode === 'units_only') {
        // Return only unit suggestions for a single ingredient
        let units: string[] = [];
        if (validSuggestions.length > 0) {
          // For units_only mode, we only get units for the first (most relevant) suggestion
          const unitSuggestions = await this.getIngredientUnitSuggestions([validSuggestions[0]]);
          // Extract just the units array from the first ingredient
          const firstIngredient = validSuggestions[0];
          units = unitSuggestions[firstIngredient] || [];
        }
        return {
          units: units,
          suggestions: [],
          unitSuggestions: {}
        };
      } else {
        // mode === 'with_units' - return both suggestions and unit suggestions
        let unitSuggestions = {};
        if (validSuggestions.length > 0) {
          unitSuggestions = await this.getIngredientUnitSuggestions(validSuggestions);
        }
        return {
          suggestions: validSuggestions,
          unitSuggestions
        };
      }
    } catch (error) {
      console.error('Autocomplete API error:', error);
      // Return empty object instead of throwing error for better UX
      return mode === 'units_only' ? { units: [], suggestions: [], unitSuggestions: {} } : { suggestions: [], unitSuggestions: {} };
    }
  }

  /**
   * Get unit suggestions for ingredients using OpenAI
   */
  async getIngredientUnitSuggestions(ingredients: string[]): Promise<Record<string, string[]>> {
    try {
      if (!ingredients || ingredients.length === 0) {
        return {};
      }

      const systemPrompt = `You are a nutrition expert. For each ingredient provided, suggest the most common and practical units of measurement that are SUPPORTED BY EDAMAM API for cooking and food logging.

CRITICAL: Only suggest units from this EDAMAM-SUPPORTED list:

WEIGHT UNITS (most common for Edamam):
- gram (preferred for most solids)
- ounce, oz (imperial weight)
- pound, lb (imperial weight) 
- kilogram, kg (metric weight)

VOLUME UNITS (for liquids and some solids):
- ml, milliliter (preferred for liquids)
- liter, litre (larger liquid volumes)
- cup (US cup measure)
- tablespoon, tbsp (cooking measure)
- teaspoon, tsp (cooking measure)
- fluid_ounce, fl_oz (imperial liquid)

COUNT/PIECE UNITS (for discrete items):
- large (e.g., "2 large eggs")
- medium (e.g., "1 medium apple") 
- small (e.g., "3 small onions")
- slice (for bread, cheese, etc.)
- clove (for garlic)
- piece (generic count)
- whole (for whole items)
- fillet (for fish/meat)

SPECIAL EDAMAM UNITS:
- serving (generic serving size)
- unit (generic unit measure)

INGREDIENT-SPECIFIC GUIDELINES:
- Chicken/Meat/Fish: gram, ounce, pound, fillet, piece
- Eggs: large, medium, piece, gram
- Rice/Grains: gram, cup, ounce
- Milk/Liquids: ml, cup, liter, fl_oz
- Bread: slice, gram, piece
- Vegetables: gram, large, medium, small, piece
- Fruits: gram, large, medium, small, piece
- Nuts/Seeds: gram, ounce, tablespoon
- Oils/Fats: ml, tablespoon, teaspoon
- Spices: gram, teaspoon, tablespoon

IMPORTANT: 
- Prioritize "gram" and "ml" as they work best with Edamam
- Avoid non-standard units like "bunch", "head", "dozen" 
- Focus on units that Edamam can accurately convert to nutrition data
- Provide 3-4 most relevant units per ingredient

Return ONLY a JSON object where each ingredient is a key and the value is an array of unit strings. Do not include any other text or explanation.

Example format:
{
  "chicken": ["gram", "ounce", "pound", "fillet"],
  "eggs": ["large", "medium", "piece", "gram"],
  "rice": ["gram", "cup", "ounce"],
  "milk": ["ml", "cup", "liter", "fl_oz"],
  "bread": ["slice", "gram", "piece"],
  "spinach": ["gram", "ounce", "cup"],
  "olive oil": ["ml", "tablespoon", "teaspoon"]
}`;

      const userPrompt = `Please provide unit suggestions for these ingredients: ${ingredients.join(', ')}`;

      const response = await this.openai.chat.completions.create({
        model: config.openai.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.1,
        max_tokens: 1000
      });

      const content = response.choices[0].message.content;
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
      // Return empty object instead of throwing error for better UX
      return {};
    }
  }

  /**
   * Get detailed ingredient information including nutrition and serving sizes
   */
  async getIngredientDetails(ingredient: string, nutritionType: 'cooking' | 'logging' = 'cooking'): Promise<any> {
    try {
      if (!ingredient || ingredient.trim().length === 0) {
        return null;
      }

      // Get Nutrition API credentials with automatic rotation (food parser uses same keys as nutrition)
      const nutritionKeys = await this.getApiKeyWithRotation('nutrition');
      const url = 'https://api.edamam.com/api/food-database/v2/parser';
      const params = new URLSearchParams({
        app_id: nutritionKeys.appId,
        app_key: nutritionKeys.appKey,
        ingr: ingredient.trim(),
        'nutrition-type': nutritionType
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
        console.error('Edamam Food Database Parser API error:', response.status, errorText);
        throw new Error(`Edamam Food Database Parser API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Food Parser API error:', error);
      // Return null instead of throwing error for better UX
      return null;
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
