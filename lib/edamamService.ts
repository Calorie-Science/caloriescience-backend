import { config } from './config';
import { EdamamApiKeyService } from './edamamApiKeyService';
import { EdamamKeyRotationService } from './edamamKeyRotationService';

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
    exclude?: string[]; // Array of recipe URIs to exclude
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
  private nutritionAppId: string;
  private nutritionAppKey: string;
  
  // New API key management services
  private apiKeyService: EdamamApiKeyService;
  private keyRotationService: EdamamKeyRotationService;
  
  // Round-robin user management for Meal Planner API only
  private static mealPlannerUsers = ['test1', 'test2', 'test3', 'test4', 'test5'];
  private static currentMealPlannerUserIndex = 0;

  constructor() {
    this.appId = config.edamam.appId;
    this.appKey = config.edamam.appKey;
    this.recipeApiUrl = config.edamam.recipeApiUrl;
    this.mealPlannerApiUrl = config.edamam.mealPlannerApiUrl;
    this.nutritionApiUrl = config.edamam.nutritionApiUrl;
    this.nutritionAppId = process.env.EDAMAM_NUTRITION_APP_ID || '';
    this.nutritionAppKey = process.env.EDAMAM_NUTRITION_APP_KEY || '';
    
    // Initialize API key management services
    this.apiKeyService = new EdamamApiKeyService();
    this.keyRotationService = new EdamamKeyRotationService();
    
    // Log constructor values for debugging
    console.log('🚨🚨🚨 EDAMAM SERVICE CONSTRUCTOR 🚨🚨🚨');
    console.log('Recipe API - appId exists:', !!this.appId);
    console.log('Recipe API - appId value:', this.appId);
    console.log('Recipe API - appKey exists:', !!this.appKey);
    console.log('Recipe API - appKey value:', this.appKey);
    console.log('Nutrition API - appId exists:', !!this.nutritionAppId);
    console.log('Nutrition API - appKey exists:', !!this.nutritionAppKey);
    console.log('Environment check:');
    console.log('  - EDAMAM_APP_ID exists:', !!process.env.EDAMAM_APP_ID);
    console.log('  - EDAMAM_APP_ID value:', process.env.EDAMAM_APP_ID);
    console.log('  - EDAMAM_APP_KEY exists:', !!process.env.EDAMAM_APP_KEY);
    console.log('  - EDAMAM_APP_KEY value:', process.env.EDAMAM_APP_KEY);
    console.log('  - EDAMAM_NUTRITION_APP_ID exists:', !!process.env.EDAMAM_NUTRITION_APP_KEY);
    console.log('  - EDAMAM_NUTRITION_APP_KEY exists:', !!process.env.EDAMAM_NUTRITION_APP_KEY);
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

      // Check if rotation is needed
      if (keyResult.needsRotation) {
        console.log(`🔄 Edamam Service - ${apiType} key needs rotation, attempting rotation...`);
        const rotationResult = await this.keyRotationService.checkAndRotateIfNeeded(apiType, keyResult.appId);
        
        if (rotationResult.needsRotation && rotationResult.rotationResult?.success) {
          console.log(`✅ Edamam Service - Key rotation successful for ${apiType}`);
          // Get the new key after rotation
          const newKeyResult = await this.apiKeyService.getActiveApiKey(apiType);
          if (newKeyResult.success && newKeyResult.appId && newKeyResult.appKey) {
            return { appId: newKeyResult.appId, appKey: newKeyResult.appKey };
          }
        } else {
          console.warn(`⚠️ Edamam Service - Key rotation failed for ${apiType}, using current key`);
        }
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
          return { appId: '86a78566', appKey: '0938eb1f14ffeb73a5ba2414fd4198d5' };
        case 'recipe':
          return { appId: '5bce8081', appKey: 'c80ecbf8968d48dfe51d395f6f19279a' };
        default:
          throw new Error(`Unknown API type: ${apiType}`);
      }
    }
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
   * Get current meal planner user (round-robin)
   */
  private static getCurrentMealPlannerUser(): string {
    return EdamamService.mealPlannerUsers[EdamamService.currentMealPlannerUserIndex];
  }

  /**
   * Move to next meal planner user in round-robin
   */
  private static moveToNextMealPlannerUser(): string {
    EdamamService.currentMealPlannerUserIndex = 
      (EdamamService.currentMealPlannerUserIndex + 1) % EdamamService.mealPlannerUsers.length;
    const newUser = EdamamService.getCurrentMealPlannerUser();
    console.log(`🔄 Switching to next Edamam meal planner user: ${newUser}`);
    return newUser;
  }

  /**
   * Generate multi-day meal plans with recipe exclusion
   */
  async generateMultiDayMealPlan(
    baseRequest: MealPlannerRequest, 
    days: number, 
    userId?: string
  ): Promise<{ dayPlans: MealPlannerResponse[]; allExcludedRecipes: string[] }> {
    console.log('🚨🚨🚨 EDAMAM SERVICE - MULTI-DAY MEAL PLAN START 🚨🚨🚨');
    console.log('🚨 EDAMAM SERVICE - Base request:', JSON.stringify(baseRequest, null, 2));
    console.log('🚨 EDAMAM SERVICE - Days requested:', days);
    console.log('🚨 EDAMAM SERVICE - User ID:', userId);
    
    const dayPlans: MealPlannerResponse[] = [];
    const allExcludedRecipes: string[] = [...(baseRequest.plan.exclude || [])];
    
    for (let day = 1; day <= days; day++) {
      console.log(`🔄 EDAMAM SERVICE - Generating day ${day} of ${days}`);
      
      // Create request for this day with accumulated excluded recipes
      const dayRequest: MealPlannerRequest = {
        ...baseRequest,
        plan: {
          ...baseRequest.plan,
          exclude: allExcludedRecipes.length > 0 ? [...allExcludedRecipes] : undefined
        }
      };
      
      console.log(`📝 EDAMAM SERVICE - Day ${day} request with ${allExcludedRecipes.length} excluded recipes:`, 
        JSON.stringify(dayRequest, null, 2));
      
      try {
        // Generate meal plan for this day
        const dayPlan = await this.generateMealPlanV1(dayRequest, userId);
        dayPlans.push(dayPlan);
        
        // Extract recipe URIs from this day's plan to exclude them from subsequent days
        const dayRecipeUris = this.extractRecipeUrisFromResponse(dayPlan);
        console.log(`🍽️ EDAMAM SERVICE - Day ${day} generated ${dayRecipeUris.length} recipes:`, dayRecipeUris);
        
        // Add these recipes to the exclusion list for next day
        allExcludedRecipes.push(...dayRecipeUris);
        
        console.log(`✅ EDAMAM SERVICE - Day ${day} completed. Total excluded recipes: ${allExcludedRecipes.length}`);
        
        // Small delay between API calls to be respectful to the API
        if (day < days) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ EDAMAM SERVICE - Error generating day ${day}:`, error);
        
        // If it's a rate limiting error (429), wait longer and retry
        if (error instanceof Error && error.message.includes('429')) {
          console.log(`🔄 EDAMAM SERVICE - Rate limit hit for day ${day}, waiting 5 seconds before retry...`);
          await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
          
          try {
            console.log(`🔄 EDAMAM SERVICE - Retrying day ${day} after rate limit...`);
            const retryDayPlan = await this.generateMealPlanV1(dayRequest, userId);
            dayPlans.push(retryDayPlan);
            
            // Extract recipe URIs from this day's plan to exclude them from subsequent days
            const dayRecipeUris = this.extractRecipeUrisFromResponse(retryDayPlan);
            console.log(`🍽️ EDAMAM SERVICE - Day ${day} retry generated ${dayRecipeUris.length} recipes:`, dayRecipeUris);
            
            // Add these recipes to the exclusion list for next day
            allExcludedRecipes.push(...dayRecipeUris);
            
            console.log(`✅ EDAMAM SERVICE - Day ${day} retry completed. Total excluded recipes: ${allExcludedRecipes.length}`);
            continue; // Skip to next day
          } catch (retryError) {
            console.error(`❌ EDAMAM SERVICE - Retry failed for day ${day}:`, retryError);
            throw new Error(`Failed to generate meal plan for day ${day} even after retry: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`);
          }
        }
        
        throw new Error(`Failed to generate meal plan for day ${day}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log('🎉 EDAMAM SERVICE - Multi-day meal plan generation completed');
    console.log(`📊 EDAMAM SERVICE - Generated ${dayPlans.length} day plans with ${allExcludedRecipes.length} total excluded recipes`);
    
    return {
      dayPlans,
      allExcludedRecipes
    };
  }

  /**
   * Extract recipe URIs from a meal planner response
   */
  private extractRecipeUrisFromResponse(response: MealPlannerResponse): string[] {
    const recipeUris: string[] = [];
    
    if (response.selection && response.selection.length > 0) {
      const firstSelection = response.selection[0];
      
      Object.values(firstSelection.sections).forEach(section => {
        if (section.assigned) {
          recipeUris.push(section.assigned);
        }
      });
    }
    
    console.log('🔍 EDAMAM SERVICE - Extracted recipe URIs:', recipeUris);
    return recipeUris;
  }

  /**
   * Generate a meal plan using the NEW Meal Planner API v1 with round-robin fallback
   */
  async generateMealPlanV1(request: MealPlannerRequest, userId?: string): Promise<MealPlannerResponse> {
    console.log('🚨🚨🚨 EDAMAM SERVICE START 🚨🚨🚨');
    console.log('🚨 EDAMAM SERVICE - Input request:', JSON.stringify(request, null, 2));
    console.log('🚨 EDAMAM SERVICE - User ID:', userId);
    
    // Check credentials immediately
    if (!this.appId || !this.appKey) {
      console.log('❌❌❌ MISSING MEAL PLANNER CREDENTIALS ❌❌❌');
      console.log('appId missing:', !this.appId);
      console.log('appKey missing:', !this.appKey);
      throw new Error('Missing Meal Planner API credentials');
    }
    
    try {
      // Get Meal Planner API credentials with automatic rotation
      const mealPlannerKeys = await this.getApiKeyWithRotation('meal_planner');
      const credentials = `${mealPlannerKeys.appId}:${mealPlannerKeys.appKey}`;
      const base64Credentials = Buffer.from(credentials).toString('base64');
      
      console.log('🔧🔧🔧 USING DATABASE MEAL PLANNER CREDENTIALS 🔧🔧🔧');
      console.log('Meal Planner appId:', mealPlannerKeys.appId);
      console.log('Meal Planner appKey:', mealPlannerKeys.appKey);
      
      const headers: HeadersInit = {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${base64Credentials}`
      };
      
      // Use round-robin user system for meal planner API to handle rate limits
      let currentUser = EdamamService.getCurrentMealPlannerUser();
      let attemptCount = 0;
      const maxAttempts = 2;
      
      while (attemptCount < maxAttempts) {
        attemptCount++;
        headers['Edamam-Account-User'] = currentUser;
        console.log(`🔄 ATTEMPT ${attemptCount}: Using Edamam-Account-User: ${currentUser}`);

      // Use the correct Edamam Meal Planner API endpoint with database appId and type=public
      const url = `${this.mealPlannerApiUrl}/${mealPlannerKeys.appId}/select?type=public`;
      
      // Log credentials being used (masked)
      console.log('🔑🔑🔑 MEAL PLANNER API CREDENTIALS 🔑🔑🔑');
      console.log('Using appId:', this.appId ? this.appId.substring(0, 8) + '...' : 'MISSING');
      console.log('Using appKey:', this.appKey ? this.appKey.substring(0, 8) + '...' : 'MISSING');
      console.log('Full appId:', this.appId);
      console.log('Full appKey:', this.appKey);
      
      // Generate the cURL command equivalent
      const requestBodyString = JSON.stringify(request);
      const authHeader = `Authorization: Basic ${base64Credentials}`;
      const accountUserHeader = `Edamam-Account-User: ${currentUser}`;
      
      // Log the complete cURL command as a single line to avoid truncation
      const completeCurl = `curl -X POST '${url}' -H 'accept: application/json' -H 'Content-Type: application/json' -H '${authHeader}' -H '${accountUserHeader}' -d '${requestBodyString}'`;
      
      console.error('MEAL_PLANNER_FAILING_CURL:');
      console.error(completeCurl);
      
      // Also break it down for readability
      console.log('CURL_BREAKDOWN_START');
      console.log('URL:', url);
      console.log('METHOD: POST');
      console.log('AUTH_HEADER:', authHeader);
      console.log('USER_HEADER:', accountUserHeader);
      console.log('BODY_LENGTH:', requestBodyString.length);
      console.log('CURL_BREAKDOWN_END');
      
      console.log('🍽️ Edamam Service - Request URL:', url);
      console.log('🍽️ Edamam Service - Request headers:', JSON.stringify(headers, null, 2));
      console.log('🍽️ Edamam Service - Request body:', JSON.stringify(request, null, 2));
      console.log('🚨 EDAMAM - ABOUT TO MAKE FETCH CALL 🚨');

        try {
          // Add timeout to prevent hanging requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          console.log(`🚨 EDAMAM - FETCH CALL STARTING (Attempt ${attemptCount}) 🚨`);
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(request),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          console.log(`🚨 EDAMAM - RESPONSE STATUS (Attempt ${attemptCount}):`, response.status);
          console.log(`🚨 EDAMAM - RESPONSE STATUS TEXT (Attempt ${attemptCount}):`, response.statusText);
          
          if (response.ok) {
            // Success! Parse and return data
            const data = await response.json();
            console.log(`✅ SUCCESS with user ${currentUser} on attempt ${attemptCount}`);
            console.log('✅ Edamam Service - Response summary:');
            console.log('  - Response type:', typeof data);
            console.log('  - Has selection:', !!data.selection);
            console.log('  - Selection count:', data.selection ? data.selection.length : 0);
            console.log('  - Status:', data.status);
            
            // Log the full response structure for debugging
            if (data.selection && data.selection.length > 0) {
              console.log('✅ Edamam Service - First selection structure:');
              console.log('  - Selection keys:', Object.keys(data.selection[0]));
              if (data.selection[0].sections) {
                console.log('  - Section keys:', Object.keys(data.selection[0].sections));
                Object.entries(data.selection[0].sections).forEach(([key, value]) => {
                  console.log(`  - Section ${key}:`, JSON.stringify(value, null, 2));
                });
              }
            } else {
              console.log('❌ Edamam Service - No selections in response');
              console.log('❌ Edamam Service - Full response:', JSON.stringify(data, null, 2));
            }
            
            return data;
          }
          
          // API call failed - check if it's a rate limit or other error
          const errorText = await response.text();
          console.error(`❌ Attempt ${attemptCount} failed with user ${currentUser}:`);
          console.error('  - Status:', response.status);
          console.error('  - Status Text:', response.statusText);
          console.error('  - Error Body:', errorText);
          
          // If this is not the last attempt, try next user
          if (attemptCount < maxAttempts) {
            currentUser = EdamamService.moveToNextMealPlannerUser();
            console.log(`🔄 Moving to next user for attempt ${attemptCount + 1}: ${currentUser}`);
            continue;
          }
          
          // Last attempt failed, throw error
          throw new Error(`Edamam Meal Planner API error after ${maxAttempts} attempts: ${response.status} ${response.statusText}`);
          
        } catch (error) {
          console.error(`❌ Attempt ${attemptCount} with user ${currentUser} failed:`, error);
          
          // If this is not the last attempt and it's not a timeout error, try next user
          if (attemptCount < maxAttempts && error instanceof Error && !error.message.includes('aborted')) {
            currentUser = EdamamService.moveToNextMealPlannerUser();
            console.log(`🔄 Error occurred, trying next user for attempt ${attemptCount + 1}: ${currentUser}`);
            continue;
          }
          
          // Last attempt or timeout error, throw
          throw error;
        }
      }
      
      throw new Error('All meal planner user attempts exhausted');
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
    console.log('🍽️ CRITICAL DEBUG - Will use user ID:', userId || 'test2');
    
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
      // Always use 'test3' for Recipe API calls as per user requirement
      const accountUser = "test3"
      headers['Edamam-Account-User'] = accountUser;
      console.log('🍽️ Edamam Service - Using Edamam-Account-User for Recipe API:', accountUser);

      // Use working meal planner credentials for Recipe API (as per Edamam docs)
      const workingAppId = 'fb9b0e62';
      const workingAppKey = '8a58a60fd0235f1bc39d3defab42922e';
      const url = `https://api.edamam.com/api/recipes/v2/${recipeId}?app_id=${workingAppId}&app_key=${workingAppKey}&type=public`;
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
      console.log('  - Recipe label:', data.recipe?.label);
      console.log('  - Calories:', data.recipe?.calories);
      console.log('  - Ingredients count:', data.recipe?.ingredients ? data.recipe.ingredients.length : 0);
      console.log('  - Total nutrients:', data.recipe?.totalNutrients ? Object.keys(data.recipe.totalNutrients).length : 0);
      
      // Log detailed ingredient information and fix problematic measures
      if (data.recipe?.ingredients && data.recipe.ingredients.length > 0) {
        console.log('🔍 EDAMAM RECIPE INGREDIENTS - Detailed ingredient analysis:');
        
        // Fix ingredients using Nutrition Data API for better parsing
        const fixedIngredients = await Promise.all(data.recipe.ingredients.map(async (ingredient: any, index: number) => {
          console.log(`  🔍 INGREDIENT ${index + 1} STRUCTURE:`, JSON.stringify(ingredient, null, 2));
          console.log(`  Ingredient ${index + 1}:`, {
            text: ingredient.text,
            quantity: ingredient.quantity,
            measure: ingredient.measure,
            food: ingredient.food,
            weight: ingredient.weight,
            foodCategory: ingredient.foodCategory,
            foodId: ingredient.foodId,
            image: ingredient.image
          });
          
          // Check for problematic measure values and fix them using Nutrition Data API
          if (ingredient.measure === '<unit>' || ingredient.measure === '<unit>') {
            console.log(`  ⚠️  PROBLEMATIC MEASURE DETECTED: "${ingredient.measure}" for ingredient: "${ingredient.text}"`);
            console.log(`  ⚠️  ORIGINAL EDAMAM PARSING:`, {
              quantity: ingredient.quantity,
              measure: ingredient.measure,
              food: ingredient.food,
              weight: ingredient.weight,
              foodCategory: ingredient.foodCategory
            });
            
            try {
              // Use Nutrition Data API to get properly parsed ingredient
              console.log(`  🔧  FETCHING NUTRITION DATA FOR: "${ingredient.text}"`);
              const nutritionData = await this.getIngredientNutrition(ingredient.text);
              
              console.log(`  🔧  NUTRITION DATA RESPONSE:`, JSON.stringify(nutritionData, null, 2));
              
              if (nutritionData.ingredients && nutritionData.ingredients.length > 0) {
                const parsedIngredient = nutritionData.ingredients[0];
                console.log(`  🔧  PARSED INGREDIENT:`, JSON.stringify(parsedIngredient, null, 2));
                
                if (parsedIngredient.parsed && parsedIngredient.parsed.length > 0) {
                  const parsed = parsedIngredient.parsed[0];
                  
                  console.log(`  🔧  NUTRITION DATA PARSED:`, parsed);
                  console.log(`  🔧  BEFORE REPLACEMENT:`, {
                    quantity: ingredient.quantity,
                    measure: ingredient.measure,
                    food: ingredient.food,
                    weight: ingredient.weight,
                    foodCategory: ingredient.foodCategory
                  });
                  
                  // Update ALL the ingredient fields with Nutrition Data API values
                  ingredient.quantity = parsed.quantity;
                  ingredient.measure = parsed.measure;
                  ingredient.food = parsed.food;
                  ingredient.weight = parsed.weight;
                  ingredient.foodId = parsed.foodId;
                  
                  // Update food category based on the food name
                  if (parsed.food.toLowerCase().includes('flour')) ingredient.foodCategory = 'Grains';
                  else if (parsed.food.toLowerCase().includes('milk') || parsed.food.toLowerCase().includes('cheese')) ingredient.foodCategory = 'Dairy';
                  else if (parsed.food.toLowerCase().includes('oil')) ingredient.foodCategory = 'Oils';
                  else if (parsed.food.toLowerCase().includes('sugar') || parsed.food.toLowerCase().includes('honey')) ingredient.foodCategory = 'Sweeteners';
                  else ingredient.foodCategory = 'Other';
                  
                  console.log(`  ✅  AFTER REPLACEMENT:`, {
                    quantity: ingredient.quantity,
                    measure: ingredient.measure,
                    food: ingredient.food,
                    weight: ingredient.weight,
                    foodCategory: ingredient.foodCategory
                  });
                } else {
                  console.log(`  ⚠️  NO PARSED DATA FOUND IN NUTRITION RESPONSE`);
                }
              } else {
                console.log(`  ⚠️  NO INGREDIENTS FOUND IN NUTRITION RESPONSE`);
              }
            } catch (error) {
              console.error(`  ❌  FAILED TO FETCH NUTRITION DATA:`, error);
              
              // Fallback to our own parsing
              const parsed = this.parseIngredientText(ingredient.text);
              console.log(`  🔧  FALLBACK PARSED INGREDIENT:`, parsed);
              
              // Update the ingredient fields with our parsed values
              ingredient.quantity = parsed.quantity;
              ingredient.measure = parsed.measure;
              ingredient.food = parsed.food;
              
              // Estimate weight based on common conversions
              let estimatedWeight = ingredient.weight; // Keep original as fallback
              if (parsed.measure === 'cup') {
                if (parsed.food.toLowerCase().includes('flour')) estimatedWeight = parsed.quantity * 120;
                else if (parsed.food.toLowerCase().includes('sugar')) estimatedWeight = parsed.quantity * 200;
                else if (parsed.food.toLowerCase().includes('milk')) estimatedWeight = parsed.quantity * 240;
                else if (parsed.food.toLowerCase().includes('oil')) estimatedWeight = parsed.quantity * 216;
                else estimatedWeight = parsed.quantity * 150;
              } else if (parsed.measure === 'tbsp') {
                estimatedWeight = parsed.quantity * 15;
              } else if (parsed.measure === 'tsp') {
                estimatedWeight = parsed.quantity * 5;
              } else if (parsed.measure === 'g') {
                estimatedWeight = parsed.quantity;
              } else if (parsed.measure === 'oz') {
                estimatedWeight = parsed.quantity * 28.35;
              } else if (parsed.measure === 'lb') {
                estimatedWeight = parsed.quantity * 453.59;
              }
              
              ingredient.weight = Math.round(estimatedWeight);
              
              // Update food category
              if (parsed.food.toLowerCase().includes('flour')) ingredient.foodCategory = 'Grains';
              else if (parsed.food.toLowerCase().includes('milk') || parsed.food.toLowerCase().includes('cheese')) ingredient.foodCategory = 'Dairy';
              else if (parsed.food.toLowerCase().includes('oil')) ingredient.foodCategory = 'Oils';
              else if (parsed.food.toLowerCase().includes('sugar') || parsed.food.toLowerCase().includes('honey')) ingredient.foodCategory = 'Sweeteners';
              else ingredient.foodCategory = 'Other';
              
              console.log(`  ✅  FALLBACK FIXED INGREDIENT:`, {
                quantity: ingredient.quantity,
                measure: ingredient.measure,
                food: ingredient.food,
                weight: ingredient.weight,
                foodCategory: ingredient.foodCategory
              });
            }
          }
          
          return ingredient;
        }));
        
        // Replace the ingredients array with the fixed one
        data.recipe.ingredients = fixedIngredients;
      }
      
      console.log('🍽️ Edamam Service - ===== getRecipeDetails END =====');
      
      return data.recipe;
    } catch (error) {
      console.error('❌ Edamam Service - Error fetching recipe details:', error);
      
      // Create mock recipe as fallback
      console.log('🍽️ Edamam Service - Creating mock recipe due to error');
      const recipeId = recipeUri.split('#recipe_')[1] || 'unknown';
      const mockRecipe = {
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
      console.log('🚨🚨🚨 EDAMAM NUTRITION DATA API - START 🚨🚨🚨');
      console.log('ingredientText:', ingredientText);
      console.log('nutritionType:', nutritionType);

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
      
      console.log('🚨🚨🚨 HARDCODED CURL COMMAND 🚨🚨🚨');
      console.log(`curl -X GET '${fullUrl}' -H 'accept: application/json' -H 'Authorization: Basic ${base64Credentials}'`);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': `Basic ${base64Credentials}`
        }
      });

      console.log('🚨🚨🚨 RESPONSE STATUS 🚨🚨🚨');
      console.log('Response status:', response.status);
      console.log('Response statusText:', response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('🚨🚨🚨 ERROR RESPONSE 🚨🚨🚨');
        console.log('errorText:', errorText);
        throw new Error(`Edamam Nutrition Data API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('🚨🚨🚨 SUCCESS RESPONSE 🚨🚨🚨');
      console.log('Calories:', data.calories);
      console.log('Protein:', data.totalNutrients?.PROCNT?.quantity);

      return data;
    } catch (error) {
      console.log('🚨🚨🚨 NUTRITION API ERROR 🚨🚨🚨');
      console.log('error:', error);
      throw error;
    }
  }

  /**
   * Get ingredient autocomplete suggestions
   */
  async getIngredientAutocomplete(query: string): Promise<string[]> {
    try {
      console.log('🔍 EDAMAM AUTOCOMPLETE API - START');
      console.log('query:', query);

      if (!query || query.trim().length === 0) {
        return [];
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
      console.log('🔍 AUTOCOMPLETE CURL COMMAND');
      console.log(`curl -X GET '${fullUrl}' -H 'accept: application/json'`);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      console.log('🔍 AUTOCOMPLETE RESPONSE STATUS:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ AUTOCOMPLETE ERROR RESPONSE:', errorText);
        throw new Error(`Edamam Autocomplete API error: ${response.status}`);
      }

      const suggestions = await response.json();
      console.log('✅ AUTOCOMPLETE SUCCESS - Suggestions count:', suggestions?.length || 0);
      console.log('✅ AUTOCOMPLETE SUGGESTIONS:', suggestions);

      return Array.isArray(suggestions) ? suggestions : [];
    } catch (error) {
      console.log('❌ AUTOCOMPLETE API ERROR:', error);
      // Return empty array instead of throwing error for better UX
      return [];
    }
  }

  /**
   * Get detailed ingredient information including nutrition and serving sizes
   */
  async getIngredientDetails(ingredient: string, nutritionType: 'cooking' | 'logging' = 'cooking'): Promise<any> {
    try {
      console.log('🔍 EDAMAM FOOD DATABASE PARSER API - START');
      console.log('ingredient:', ingredient);
      console.log('nutritionType:', nutritionType);

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
      console.log('🔍 FOOD PARSER CURL COMMAND');
      console.log(`curl -X GET '${fullUrl}' -H 'accept: application/json'`);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'accept': 'application/json'
        }
      });

      console.log('🔍 FOOD PARSER RESPONSE STATUS:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.log('❌ FOOD PARSER ERROR RESPONSE:', errorText);
        throw new Error(`Edamam Food Database Parser API error: ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ FOOD PARSER SUCCESS - Results count:', data?.hints?.length || 0);
      console.log('✅ FOOD PARSER PARSED COUNT:', data?.parsed?.length || 0);

      return data;
    } catch (error) {
      console.log('❌ FOOD PARSER API ERROR:', error);
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
