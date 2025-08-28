import { supabase } from './supabase';
import { EdamamService, EdamamRecipe, RecipeSearchParams } from './edamamService';

export interface MealPlanGenerationRequest {
  clientId: string;
  planDate: string; // YYYY-MM-DD format
  planType?: 'daily' | 'weekly' | 'custom';
  dietaryRestrictions?: string[];
  cuisinePreferences?: string[];
  mealPreferences?: {
    breakfast?: string[];
    lunch?: string[];
    dinner?: string[];
    snack?: string[];
  };
  targetCalories?: number; // Override client's EER if provided
  macroTargets?: {
    protein?: { min: number; max: number };
    fat?: { min: number; max: number };
    carbs?: { min: number; max: number };
  };
}

export interface GeneratedMealPlan {
  id: string;
  clientId: string;
  nutritionistId: string;
  planName: string;
  planDate: string;
  planType: string;
  status: string;
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  meals: GeneratedMeal[];
  nutritionSummary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalFiber: number;
    proteinPercentage: number;
    carbsPercentage: number;
    fatPercentage: number;
  };
  generatedAt: string;
}

export interface GeneratedMeal {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealOrder: number;
  recipeName: string;
  recipeUrl: string;
  recipeImageUrl: string;
  caloriesPerServing: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  servingsPerMeal: number;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  totalFiber: number;
  ingredients: string[];
  edamamRecipeId: string;
}

export interface MealPlanPreferences {
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  mealPreferences: Record<string, string[]>;
  excludedIngredients: string[];
  preferredCookingTime: string; // e.g., "0-30", "30-60"
  imageSize: 'THUMBNAIL' | 'SMALL' | 'REGULAR' | 'LARGE';
}

export class MealPlanningService {
  private edamamService: EdamamService;

  constructor() {
    this.edamamService = new EdamamService();
  }

  /**
   * Generate a complete meal plan for a client based on their EER requirements
   */
  async generateMealPlan(request: MealPlanGenerationRequest, userId?: string): Promise<GeneratedMealPlan> {
    console.log('🚀 Meal Planning Service - ===== generateMealPlan START =====');
    console.log('🚀 Meal Planning Service - Request:', JSON.stringify(request, null, 2));
    console.log('🚀 Meal Planning Service - User ID:', userId);
    
    try {
      // 1. Get client's nutrition requirements
      console.log('🚀 Meal Planning Service - Getting client nutrition requirements...');
      const nutritionRequirements = await this.getClientNutritionRequirements(request.clientId);
      console.log('🚀 Meal Planning Service - Nutrition requirements:', JSON.stringify(nutritionRequirements, null, 2));
      
      if (!nutritionRequirements) {
        console.error('❌ Meal Planning Service - Client nutrition requirements not found');
        throw new Error('Client nutrition requirements not found');
      }

      // 2. Get client's dietary preferences and restrictions
      console.log('🚀 Meal Planning Service - Getting client preferences...');
      const clientPreferences = await this.getClientPreferences(request.clientId);
      console.log('🚀 Meal Planning Service - Client preferences:', JSON.stringify(clientPreferences, null, 2));
      
      // 3. Merge with request preferences
      console.log('🚀 Meal Planning Service - Merging preferences...');
      console.log('🚀 Meal Planning Service - Request dietary restrictions:', JSON.stringify(request.dietaryRestrictions, null, 2));
      const finalPreferences = this.mergePreferences(clientPreferences, request);
      console.log('🚀 Meal Planning Service - Final merged preferences:', JSON.stringify(finalPreferences, null, 2));

      // 4. Calculate meal distribution - focus only on calories
      const targetCalories = request.targetCalories || nutritionRequirements.eer_calories;
      
      console.log('🚀 Meal Planning Service - Target calories:', targetCalories);
      console.log('🚀 Meal Planning Service - Calculating meal distribution...');
      
      // Use macro ranges if available, otherwise use 0
      const targetProtein = nutritionRequirements.protein_grams || 
        (nutritionRequirements.protein_min_grams && nutritionRequirements.protein_max_grams ? 
          Math.round((nutritionRequirements.protein_min_grams + nutritionRequirements.protein_max_grams) / 2) : 0);
      
      const targetCarbs = nutritionRequirements.carbs_grams || 
        (nutritionRequirements.carbs_min_grams && nutritionRequirements.carbs_max_grams ? 
          Math.round((nutritionRequirements.carbs_min_grams + nutritionRequirements.carbs_max_grams) / 2) : 0);
      
      const targetFat = nutritionRequirements.fat_grams || 
        (nutritionRequirements.fat_min_grams && nutritionRequirements.fat_max_grams ? 
          Math.round((nutritionRequirements.fat_min_grams + nutritionRequirements.fat_max_grams) / 2) : 0);
      
      console.log('🚀 Meal Planning Service - Target macros - Protein:', targetProtein, 'Carbs:', targetCarbs, 'Fat:', targetFat);
      console.log('🚀 Meal Planning Service - Raw macro values from DB:');
      console.log('🚀 Meal Planning Service - - Protein grams:', nutritionRequirements.protein_grams, 'min:', nutritionRequirements.protein_min_grams, 'max:', nutritionRequirements.protein_max_grams);
      console.log('🚀 Meal Planning Service - - Carbs grams:', nutritionRequirements.carbs_grams, 'min:', nutritionRequirements.carbs_min_grams, 'max:', nutritionRequirements.carbs_max_grams);
      console.log('🚀 Meal Planning Service - - Fat grams:', nutritionRequirements.fat_grams, 'min:', nutritionRequirements.fat_min_grams, 'max:', nutritionRequirements.fat_max_grams);
      
      const mealDistribution = this.calculateMealDistribution(
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat
      );
      
      console.log('🚀 Meal Planning Service - Meal distribution calculated:', JSON.stringify(mealDistribution, null, 2));

      // 5. Generate meals for each meal type
      console.log('🚀 Meal Planning Service - About to generate meals for the day...');
      const generatedMeals = await this.generateMealsForDay(
        mealDistribution,
        finalPreferences,
        userId,
        nutritionRequirements,
        request.macroTargets
      );
      
      console.log('🚀 Meal Planning Service - Meals generation completed');
      console.log('🚀 Meal Planning Service - Generated meals count:', generatedMeals.length);
      generatedMeals.forEach((meal, index) => {
        console.log(`🚀 Meal Planning Service - Meal ${index + 1}: ${meal.recipeName} | Type: ${meal.mealType} | Is placeholder: ${meal.recipeName.includes('Recipe to be selected')}`);
      });

      // 6. Calculate nutrition summary
      console.log('🚀 Meal Planning Service - Calculating nutrition summary...');
      const nutritionSummary = this.calculateNutritionSummary(generatedMeals);
      console.log('🚀 Meal Planning Service - Nutrition summary calculated:', JSON.stringify(nutritionSummary, null, 2));

      // 7. Create meal plan object
      console.log('🚀 Meal Planning Service - Creating final meal plan object...');
      const mealPlan: GeneratedMealPlan = {
        id: '', // Will be set when saved to database
        clientId: request.clientId,
        nutritionistId: nutritionRequirements.nutritionist_id || '',
        planName: `${request.planType || 'Daily'} Meal Plan`,
        planDate: request.planDate,
        planType: request.planType || 'daily',
        status: 'draft',
        targetCalories: request.targetCalories || nutritionRequirements.eer_calories,
        targetProtein: nutritionRequirements.protein_grams,
        targetCarbs: nutritionRequirements.carbs_grams,
        targetFat: nutritionRequirements.fat_grams,
        targetFiber: nutritionRequirements.fiber_grams || 0,
        dietaryRestrictions: finalPreferences.dietaryRestrictions,
        cuisinePreferences: finalPreferences.cuisinePreferences,
        meals: generatedMeals,
        nutritionSummary,
        generatedAt: new Date().toISOString()
      };

      console.log('🚀 Meal Planning Service - Final meal plan created successfully');
      console.log('🚀 Meal Planning Service - Final meal plan details:');
      console.log('🚀 Meal Planning Service - - ID:', mealPlan.id);
      console.log('🚀 Meal Planning Service - - Client ID:', mealPlan.clientId);
      console.log('🚀 Meal Planning Service - - Plan name:', mealPlan.planName);
      console.log('🚀 Meal Planning Service - - Plan date:', mealPlan.planDate);
      console.log('🚀 Meal Planning Service - - Meals count:', mealPlan.meals.length);
      console.log('🚀 Meal Planning Service - - Nutrition summary:', JSON.stringify(mealPlan.nutritionSummary, null, 2));
      console.log('🚀 Meal Planning Service - ===== generateMealPlan END =====');

      return mealPlan;
    } catch (error) {
      console.error('❌ Meal Planning Service - Error in generateMealPlan:', error);
      console.error('❌ Meal Planning Service - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Meal Planning Service - ===== generateMealPlan ERROR =====');
      throw new Error(`Failed to generate meal plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get client's nutrition requirements from database
   */
  private async getClientNutritionRequirements(clientId: string) {
    const { data, error } = await supabase
      .from('client_nutrition_requirements')
      .select(`
        *,
        clients!inner(nutritionist_id)
      `)
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching nutrition requirements:', error);
      return null;
    }

    return data;
  }

  /**
   * Get client's dietary preferences and restrictions
   */
  private async getClientPreferences(clientId: string): Promise<MealPlanPreferences> {
    const { data: client, error } = await supabase
      .from('clients')
      .select('dietary_preferences, allergies, medical_conditions')
      .eq('id', clientId)
      .single();

    if (error) {
      console.error('Error fetching client preferences:', error);
      return this.getDefaultPreferences();
    }

    // Convert client data to meal plan preferences
    const dietaryRestrictions: string[] = [];
    const excludedIngredients: string[] = [];

    // Add dietary preferences
    if (client.dietary_preferences) {
      client.dietary_preferences.forEach(pref => {
        switch (pref.toLowerCase()) {
          case 'vegetarian':
            dietaryRestrictions.push('vegetarian');
            excludedIngredients.push('beef', 'pork', 'lamb', 'chicken', 'fish');
            break;
          case 'vegan':
            dietaryRestrictions.push('vegan');
            excludedIngredients.push('beef', 'pork', 'lamb', 'chicken', 'fish', 'dairy', 'eggs');
            break;
          case 'gluten-free':
            dietaryRestrictions.push('gluten-free');
            break;
          case 'dairy-free':
            dietaryRestrictions.push('dairy-free');
            break;
        }
      });
    }

    // Add allergies
    if (client.allergies) {
      client.allergies.forEach(allergy => {
        excludedIngredients.push(allergy.toLowerCase());
      });
    }

    return {
      dietaryRestrictions,
      cuisinePreferences: ['world'], // Default to world cuisine
      mealPreferences: {},
      excludedIngredients,
      preferredCookingTime: '0-60',
      imageSize: 'REGULAR'
    };
  }

  /**
   * Get default preferences when client has none
   */
  private getDefaultPreferences(): MealPlanPreferences {
    return {
      dietaryRestrictions: [],
      cuisinePreferences: ['world'],
      mealPreferences: {},
      excludedIngredients: [],
      preferredCookingTime: '0-60',
      imageSize: 'REGULAR'
    };
  }

  /**
   * Override client preferences with request preferences
   * Request preferences take precedence over database preferences
   */
  private mergePreferences(
    clientPreferences: MealPlanPreferences,
    request: MealPlanGenerationRequest
  ): MealPlanPreferences {
    return {
      // If request has dietary restrictions, use those; otherwise use client preferences
      dietaryRestrictions: request.dietaryRestrictions !== undefined 
        ? request.dietaryRestrictions 
        : clientPreferences.dietaryRestrictions,
      
      // If request has cuisine preferences, use those; otherwise use client preferences  
      cuisinePreferences: request.cuisinePreferences !== undefined 
        ? request.cuisinePreferences 
        : clientPreferences.cuisinePreferences,
      
      mealPreferences: {
        ...clientPreferences.mealPreferences,
        ...(request.mealPreferences || {})
      },
      excludedIngredients: clientPreferences.excludedIngredients,
      preferredCookingTime: clientPreferences.preferredCookingTime,
      imageSize: clientPreferences.imageSize
    };
  }

  /**
   * Calculate how calories and macros should be distributed across meals
   */
  private calculateMealDistribution(
    targetCalories: number,
    targetProtein: number,
    targetCarbs: number,
    targetFat: number
  ) {
    // Standard meal distribution: Breakfast 25%, Lunch 35%, Dinner 35%, Snack 5%
    return {
      breakfast: {
        calories: Math.round(targetCalories * 0.25),
        protein: targetProtein, // Keep original values for display
        carbs: targetCarbs,
        fat: targetFat
      },
      lunch: {
        calories: Math.round(targetCalories * 0.35),
        protein: targetProtein,
        carbs: targetCarbs,
        fat: targetFat
      },
      dinner: {
        calories: Math.round(targetCalories * 0.35),
        protein: targetProtein,
        carbs: targetCarbs,
        fat: targetFat
      },
      snack: {
        calories: Math.round(targetCalories * 0.05),
        protein: targetProtein,
        carbs: targetCarbs,
        fat: targetFat
      }
    };
  }

    /**
   * Generate meals for each meal type using Edamam Meal Planner API
   */
  private async generateMealsForDay(
    mealDistribution: Record<string, any>,
    preferences: MealPlanPreferences,
    userId?: string,
    nutritionRequirements?: any,
    macroTargets?: any
  ): Promise<GeneratedMeal[]> {
    console.log('🍽️ Meal Planning Debug - Starting generateMealsForDay with Meal Planner API');
    console.log('🍽️ Meal Planning Debug - Meal distribution:', JSON.stringify(mealDistribution, null, 2));
    console.log('🍽️ Meal Planning Debug - Preferences:', JSON.stringify(preferences, null, 2));
    console.log('🍽️ Meal Planning Debug - User ID:', userId);

          try {
        // Use the new Meal Planner API instead of individual recipe searches
        console.log('🍽️ Meal Planning Debug - Creating meal plan request for Meal Planner API...');

        const mealPlanRequest = this.createMealPlanRequest(mealDistribution, preferences, nutritionRequirements, macroTargets);
        console.log('🍽️ Meal Planning Debug - Meal plan request:', JSON.stringify(mealPlanRequest, null, 2));

        console.log('🍽️ Meal Planning Debug - Calling Edamam Meal Planner API...');
        const mealPlanResponse = await this.edamamService.generateMealPlanV1(mealPlanRequest, userId);
        console.log('🍽️ Meal Planning Debug - Meal plan response received:', JSON.stringify(mealPlanResponse, null, 2));

        // Check if we got a valid response with selections
        if (!mealPlanResponse || !mealPlanResponse.selection || mealPlanResponse.selection.length === 0) {
          console.error('❌ Meal Planning Debug - Invalid or empty response from Meal Planner API');
          console.error('❌ Meal Planning Debug - Response status:', mealPlanResponse?.status);
          console.log('🍽️ Meal Planning Debug - Falling back to placeholder meals due to empty response...');
          return this.createFallbackMeals(mealDistribution);
        }

        // Convert the meal plan response to our meal format
        const meals = this.convertMealPlanToMeals(mealPlanResponse, mealDistribution);
        console.log('🍽️ Meal Planning Debug - Converted meals:', JSON.stringify(meals, null, 2));

        // Check if we got any actual meals
        if (meals.length === 0) {
          console.error('❌ Meal Planning Debug - No meals were converted from response');
          console.log('🍽️ Meal Planning Debug - Falling back to placeholder meals due to no converted meals...');
          return this.createFallbackMeals(mealDistribution);
        }

        // Fetch full recipe details for each meal
        console.log('🍽️ Meal Planning Debug - Fetching recipe details for each meal...');
        const mealsWithDetails = await this.enrichMealsWithRecipeDetails(meals);
        console.log('🍽️ Meal Planning Debug - Meals enriched with recipe details:', JSON.stringify(mealsWithDetails, null, 2));

        return mealsWithDetails;
      } catch (error) {
        console.error('❌ Meal Planning Debug - Error generating meal plan with Meal Planner API:', error);
        console.error('❌ Meal Planning Debug - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
        console.error('❌ Meal Planning Debug - Error message:', error instanceof Error ? error.message : 'Unknown error');

        // Fallback to placeholder meals if Meal Planner API fails
        console.log('🍽️ Meal Planning Debug - Falling back to placeholder meals due to error...');
        return this.createFallbackMeals(mealDistribution);
      }
  }

  /**
   * Create a meal plan request for the Edamam Meal Planner API
   */
  private createMealPlanRequest(
    mealDistribution: Record<string, any>,
    preferences: MealPlanPreferences,
    nutritionRequirements?: any,
    macroTargets?: any
  ): any {
    console.log('🍽️ Meal Planning Debug - Creating meal plan request structure...');
    
    const sections: any = {};
    
    // Create sections for each meal type
    Object.entries(mealDistribution).forEach(([mealType, targets]) => {
      const sectionName = mealType.charAt(0).toUpperCase() + mealType.slice(1);

      const section: any = {
        accept: {
          all: [
            {
              meal: [this.getMealTypeForEdamam(mealType)]
            },
            {
              dish: this.getDishTypesForMeal(mealType)
            }
          ]
        },
        fit: {
          ENERC_KCAL: {
            min: Math.round(targets.calories * 0.7),
            max: Math.round(targets.calories * 1.3)
          }
        }
      };

      // Only add ENERC_KCAL constraints at section level (like the working curl)
      // Macro constraints should go at the plan level, not section level

      sections[sectionName] = section;
    });
    
    // Create request structure matching the working curl format
    const request: any = {
      size: 1, // 1 day meal plan
      plan: {
        sections,
        // Global fit constraints at plan level (like the working curl)
        fit: {
          ENERC_KCAL: {
            min: Math.round(mealDistribution.breakfast.calories + mealDistribution.lunch.calories + mealDistribution.dinner.calories + mealDistribution.snack.calories),
            max: Math.round((mealDistribution.breakfast.calories + mealDistribution.lunch.calories + mealDistribution.dinner.calories + mealDistribution.snack.calories) * 1.1)
          }
        }
      }
    };

    // Add macro constraints at plan level based on client's nutrition requirements or provided macro targets
    // Priority: 1. Provided macro targets, 2. Client nutrition requirements, 3. Fallback ranges
    if (macroTargets) {
      console.log('🍽️ Meal Planning Debug - Using provided macro targets:', JSON.stringify(macroTargets, null, 2));
      
      // Apply protein constraints if provided
      if (macroTargets.protein) {
        request.plan.fit.PROCNT = {
          min: Math.max(30, macroTargets.protein.min),
          max: Math.min(300, macroTargets.protein.max)
        };
        console.log('🍽️ Meal Planning Debug - Applied protein constraints from macro targets:', request.plan.fit.PROCNT);
      }
      
      // Apply fat constraints if provided
      if (macroTargets.fat) {
        request.plan.fit.FAT = {
          min: Math.max(20, macroTargets.fat.min),
          max: Math.min(200, macroTargets.fat.max)
        };
        console.log('🍽️ Meal Planning Debug - Applied fat constraints from macro targets:', request.plan.fit.FAT);
      }
      
      // Apply carb constraints if provided
      if (macroTargets.carbs) {
        request.plan.fit.CHOCDF = {
          min: Math.max(50, macroTargets.carbs.min),
          max: Math.min(600, macroTargets.carbs.max)
        };
        console.log('🍽️ Meal Planning Debug - Applied carb constraints from macro targets:', request.plan.fit.CHOCDF);
      }
      
      console.log('🍽️ Meal Planning Debug - Applied macro constraints from provided targets');
    } else if (nutritionRequirements) {
      console.log('🍽️ Meal Planning Debug - Nutrition requirements available:', JSON.stringify(nutritionRequirements, null, 2));
      
      // Protein constraints
      if (nutritionRequirements.protein_grams || (nutritionRequirements.protein_min_grams && nutritionRequirements.protein_max_grams)) {
        const targetProtein = nutritionRequirements.protein_grams || 
          Math.round((nutritionRequirements.protein_min_grams + nutritionRequirements.protein_max_grams) / 2);
        
        request.plan.fit.PROCNT = {
          min: Math.max(30, Math.round(targetProtein * 0.7)),   // Minimum 70% of target or 30g
          max: Math.min(300, Math.round(targetProtein * 1.3))   // Maximum 130% of target or 300g
        };
        console.log('🍽️ Meal Planning Debug - Applied protein constraints:', request.plan.fit.PROCNT);
      } else {
        console.log('🍽️ Meal Planning Debug - No protein requirements available, using fallback');
      }
      
      // Fat constraints
      if (nutritionRequirements.fat_grams || (nutritionRequirements.fat_min_grams && nutritionRequirements.fat_max_grams)) {
        const targetFat = nutritionRequirements.fat_grams || 
          Math.round((nutritionRequirements.fat_min_grams + nutritionRequirements.fat_max_grams) / 2);
        
        request.plan.fit.FAT = {
          min: Math.max(20, Math.round(targetFat * 0.7)),   // Minimum 70% of target or 20g
          max: Math.min(200, Math.round(targetFat * 1.3))   // Maximum 130% of target or 200g
        };
        console.log('🍽️ Meal Planning Debug - Applied fat constraints:', request.plan.fit.FAT);
      } else {
        console.log('🍽️ Meal Planning Debug - No fat requirements available, using fallback');
      }
      
      // Carbohydrate constraints
      if (nutritionRequirements.carbs_grams || (nutritionRequirements.carbs_min_grams && nutritionRequirements.carbs_max_grams)) {
        const targetCarbs = nutritionRequirements.carbs_grams || 
          Math.round((nutritionRequirements.carbs_min_grams + nutritionRequirements.carbs_max_grams) / 2);
        
        request.plan.fit.CHOCDF = {
          min: Math.max(50, Math.round(targetCarbs * 0.7)),   // Minimum 70% of target or 50g
          max: Math.min(600, Math.round(targetCarbs * 1.3))   // Maximum 130% of target or 600g
        };
        console.log('🍽️ Meal Planning Debug - Applied carb constraints:', request.plan.fit.CHOCDF);
      } else {
        console.log('🍽️ Meal Planning Debug - No carb requirements available, using fallback');
      }
      
      console.log('🍽️ Meal Planning Debug - Applied dynamic macro constraints based on client requirements (with ±30% tolerance)');
    } else {
      // Fallback to broad ranges if no nutrition requirements available
      request.plan.fit.PROCNT = { min: 30, max: 300 };
      request.plan.fit.FAT = { min: 20, max: 200 };
      request.plan.fit.CHOCDF = { min: 50, max: 600 };
      console.log('🍽️ Meal Planning Debug - Applied fallback broad macro constraints (no client requirements available)');
    }

    // Add valid health labels if we have any dietary restrictions
    const edamamHealthLabels = this.convertDietaryRestrictionsToEdamam(preferences.dietaryRestrictions);
    if (edamamHealthLabels.length > 0) {
      request.plan.accept = {
        all: [
          {
            health: edamamHealthLabels
          }
        ]
      };
      console.log('🍽️ Meal Planning Debug - Added valid health labels to request:', edamamHealthLabels);
    }

    console.log('🍽️ Meal Planning Debug - Final meal plan request created:', JSON.stringify(request, null, 2));
    console.log('🍽️ Meal Planning Debug - Request plan.fit section:', JSON.stringify(request.plan.fit, null, 2));
    return request;
  }

  /**
   * Get Edamam meal type for our meal type
   */
  private getMealTypeForEdamam(mealType: string): string {
    switch (mealType) {
      case 'breakfast': return 'breakfast';
      case 'lunch': return 'lunch/dinner';
      case 'dinner': return 'lunch/dinner';
      case 'snack': return 'snack';
      default: return 'lunch/dinner';
    }
  }

  /**
   * Convert dietary restrictions to proper Edamam health labels
   */
  private convertDietaryRestrictionsToEdamam(restrictions: string[]): string[] {
    const edamamHealthLabels: string[] = [];
    
    restrictions.forEach(restriction => {
      switch (restriction.toLowerCase()) {
        // Valid Health Labels (confirmed working)
        case 'vegetarian': edamamHealthLabels.push('vegetarian'); break;
        case 'vegan': edamamHealthLabels.push('vegan'); break;
        case 'gluten-free': edamamHealthLabels.push('gluten-free'); break;
        case 'dairy-free': edamamHealthLabels.push('dairy-free'); break;
        case 'egg-free': edamamHealthLabels.push('egg-free'); break;
        case 'fish-free': edamamHealthLabels.push('fish-free'); break;
        case 'shellfish-free': edamamHealthLabels.push('shellfish-free'); break;
        case 'peanut-free': edamamHealthLabels.push('peanut-free'); break;
        case 'tree-nut-free': edamamHealthLabels.push('tree-nut-free'); break;
        case 'soy-free': edamamHealthLabels.push('soy-free'); break;
        case 'wheat-free': edamamHealthLabels.push('wheat-free'); break;
        case 'celery-free': edamamHealthLabels.push('celery-free'); break;
        case 'mustard-free': edamamHealthLabels.push('mustard-free'); break;
        case 'sesame-free': edamamHealthLabels.push('sesame-free'); break;
        case 'lupine-free': edamamHealthLabels.push('lupine-free'); break;
        case 'mollusk-free': edamamHealthLabels.push('mollusk-free'); break;
        
        // Invalid Health Labels (confirmed not working) - skip these
        // case 'balanced': edamamHealthLabels.push('balanced'); break;
        // case 'high-fiber': edamamHealthLabels.push('high-fiber'); break;
        // case 'high-protein': edamamHealthLabels.push('high-protein'); break;
        // case 'low-carb': edamamHealthLabels.push('low-carb'); break;
        // case 'low-fat': edamamHealthLabels.push('low-fat'); break;
        // case 'low-sodium': edamamHealthLabels.push('low-sodium'); break;
        // case 'sugar-conscious': edamamHealthLabels.push('sugar-conscious'); break;
        
        // Rate limited labels - skip these too
        // case 'sulfite-free': edamamHealthLabels.push('sulfite-free'); break;
        // case 'fodmap-free': edamamHealthLabels.push('fodmap-free'); break;
        // case 'alcohol-free': edamamHealthLabels.push('alcohol-free'); break;
        // case 'pork-free': edamamHealthLabels.push('pork-free'); break;
        // case 'red-meat-free': edamamHealthLabels.push('red-meat-free'); break;
        // case 'crustacean-free': edamamHealthLabels.push('crustacean-free'); break;
        
        default:
          console.log(`🍽️ Meal Planning Debug - Skipping invalid health label: ${restriction}`);
          break;
      }
    });
    
    return edamamHealthLabels;
  }

  /**
   * Convert cuisine preferences to proper Edamam cuisine types
   */
  private convertCuisinePreferencesToEdamam(cuisines: string[]): string[] {
    const edamamCuisineTypes: string[] = [];
    
    cuisines.forEach(cuisine => {
      switch (cuisine.toLowerCase()) {
        case 'american': edamamCuisineTypes.push('american'); break;
        case 'asian': edamamCuisineTypes.push('asian'); break;
        case 'british': edamamCuisineTypes.push('british'); break;
        case 'caribbean': edamamCuisineTypes.push('caribbean'); break;
        case 'central europe': edamamCuisineTypes.push('central europe'); break;
        case 'chinese': edamamCuisineTypes.push('chinese'); break;
        case 'eastern europe': edamamCuisineTypes.push('eastern europe'); break;
        case 'french': edamamCuisineTypes.push('french'); break;
        case 'greek': edamamCuisineTypes.push('greek'); break;
        case 'indian': edamamCuisineTypes.push('indian'); break;
        case 'italian': edamamCuisineTypes.push('italian'); break;
        case 'japanese': edamamCuisineTypes.push('japanese'); break;
        case 'korean': edamamCuisineTypes.push('korean'); break;
        case 'mediterranean': edamamCuisineTypes.push('mediterranean'); break;
        case 'mexican': edamamCuisineTypes.push('mexican'); break;
        case 'middle eastern': edamamCuisineTypes.push('middle eastern'); break;
        case 'nordic': edamamCuisineTypes.push('nordic'); break;
        case 'south american': edamamCuisineTypes.push('south american'); break;
        case 'south east asian': edamamCuisineTypes.push('south east asian'); break;
        case 'world': edamamCuisineTypes.push('world'); break;
        
        default:
          console.log(`⚠️ Meal Planning Debug - Unknown cuisine preference: ${cuisine}`);
          break;
      }
    });
    
    return edamamCuisineTypes;
  }

  /**
   * Get appropriate dish types for each meal
   */
  private getDishTypesForMeal(mealType: string): string[] {
    switch (mealType) {
      case 'breakfast': return ['egg', 'cereals', 'bread', 'pancake', 'biscuits and cookies'];
      case 'lunch': return ['main course', 'pasta', 'salad', 'soup', 'sandwiches', 'pizza'];
      case 'dinner': return ['main course', 'pasta', 'salad', 'pizza', 'seafood'];
      case 'snack': return ['biscuits and cookies', 'sweets', 'ice cream and custard'];
      default: return ['main course'];
    }
  }

  /**
   * Convert Edamam meal plan response to our meal format
   */
    private convertMealPlanToMeals(
    mealPlanResponse: any,
    mealDistribution: Record<string, any>
  ): GeneratedMeal[] {
    console.log('🍽️ Meal Planning Debug - Converting meal plan response to meals...');
    console.log('🍽️ Meal Planning Debug - Response structure:', JSON.stringify(mealPlanResponse, null, 2));

    const meals: GeneratedMeal[] = [];
    let mealOrder = 1;

    // The new Meal Planner API returns a selection array with multiple meal plan options
    // We'll take the first option (index 0)
    if (mealPlanResponse.selection && mealPlanResponse.selection.length > 0) {
      const selectedPlan = mealPlanResponse.selection[0];
      console.log('🍽️ Meal Planning Debug - Selected plan:', JSON.stringify(selectedPlan, null, 2));

      // Convert each section to a meal
      Object.entries(selectedPlan.sections).forEach(([sectionName, sectionData]: [string, any]) => {
        const mealType = this.getMealTypeFromSection(sectionName);
        const targets = mealDistribution[mealType];

        if (targets && sectionData && sectionData.assigned) {
          // Extract recipe URI from the assigned field
          const recipeUri = sectionData.assigned;
          console.log(`🍽️ Meal Planning Debug - ${mealType} recipe URI:`, recipeUri);

          // For now, create a meal with the recipe URI - we'll need to fetch full details later
          const meal: GeneratedMeal = {
            id: '',
            mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
            mealOrder,
            recipeName: `Recipe ${mealOrder}`, // Placeholder - will be updated when we fetch recipe details
            recipeUrl: '', // Will be filled when we get recipe details
            recipeImageUrl: '', // Will be filled when we get recipe details
            caloriesPerServing: targets.calories, // Use target calories as placeholder
            proteinGrams: targets.protein || 0,
            carbsGrams: targets.carbs || 0,
            fatGrams: targets.fat || 0,
            fiberGrams: targets.fiber || 0,
            servingsPerMeal: 1,
            totalCalories: targets.calories,
            totalProtein: targets.protein || 0,
            totalCarbs: targets.carbs || 0,
            totalFat: targets.fat || 0,
            totalFiber: targets.fiber || 0,
            ingredients: [], // Will be filled when we get recipe details
            edamamRecipeId: recipeUri
          };

          meals.push(meal);
          console.log(`✅ Meal Planning Debug - ${mealType} meal converted successfully`);
        }

        mealOrder++;
      });
    } else {
      console.log('⚠️ Meal Planning Debug - No selection found in response');
    }

    console.log(`🍽️ Meal Planning Debug - Conversion completed. Total meals: ${meals.length}`);
    return meals;
  }

  /**
   * Get meal type from section name
   */
  private getMealTypeFromSection(sectionName: string): string {
    const lowerSection = sectionName.toLowerCase();
    if (lowerSection.includes('breakfast')) return 'breakfast';
    if (lowerSection.includes('lunch')) return 'lunch';
    if (lowerSection.includes('dinner')) return 'dinner';
    if (lowerSection.includes('snack')) return 'snack';
    return 'lunch'; // default
  }

  /**
   * Create fallback meals if Meal Planner API fails
   */
    private createFallbackMeals(mealDistribution: Record<string, any>): GeneratedMeal[] {
    console.log('🍽️ Meal Planning Debug - Creating fallback meals...');

    const meals: GeneratedMeal[] = [];
    let mealOrder = 1;

    Object.entries(mealDistribution).forEach(([mealType, targets]) => {
      const placeholderMeal = this.createPlaceholderMeal(mealType, mealOrder, targets);
      meals.push(placeholderMeal);
      mealOrder++;
    });

    console.log(`🍽️ Meal Planning Debug - Fallback meals created: ${meals.length}`);
    return meals;
  }

  /**
   * Enrich meals with full recipe details from Edamam Recipe API
   */
  private async enrichMealsWithRecipeDetails(meals: GeneratedMeal[]): Promise<GeneratedMeal[]> {
    console.log('🍽️ Meal Planning Debug - Enriching meals with recipe details...');
    console.log('🍽️ Meal Planning Debug - Input meals:', JSON.stringify(meals, null, 2));
    
    const enrichedMeals: GeneratedMeal[] = [];
    
    for (const meal of meals) {
      try {
        if (meal.edamamRecipeId) {
          console.log(`🍽️ Meal Planning Debug - Fetching details for ${meal.mealType} meal:`, meal.edamamRecipeId);
          
          const recipeDetails = await this.edamamService.getRecipeDetails(meal.edamamRecipeId, 'nutritionist1');
          console.log(`🍽️ Meal Planning Debug - Raw recipe details for ${meal.mealType}:`, JSON.stringify(recipeDetails, null, 2));
          
          if (recipeDetails && recipeDetails.recipe) {
            const recipe = recipeDetails.recipe;
            console.log(`🍽️ Meal Planning Debug - Recipe object for ${meal.mealType}:`, JSON.stringify(recipe, null, 2));
            
            // Update meal with actual recipe details
            meal.recipeName = recipe.label || `Recipe ${meal.mealOrder}`;
            meal.recipeUrl = recipe.url || '';
            meal.recipeImageUrl = recipe.image || '';
            
            // Calculate per-serving values based on recipe yield
            const recipeYield = recipe.yield || 1;
            meal.caloriesPerServing = Math.round((recipe.calories || 0) / recipeYield);
            meal.proteinGrams = Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / recipeYield * 100) / 100;
            meal.carbsGrams = Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / recipeYield * 100) / 100;
            meal.fatGrams = Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / recipeYield * 100) / 100;
            meal.fiberGrams = Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / recipeYield * 100) / 100;
            meal.ingredients = recipe.ingredientLines || [];
            
            // Update totals to match per-serving values
            meal.totalCalories = meal.caloriesPerServing;
            meal.totalProtein = meal.proteinGrams;
            meal.totalCarbs = meal.carbsGrams;
            meal.totalFat = meal.fatGrams;
            meal.totalFiber = meal.fiberGrams;
            
            console.log(`✅ Meal Planning Debug - ${meal.mealType} meal enriched:`, JSON.stringify(meal, null, 2));
          } else {
            console.log(`⚠️ Meal Planning Debug - No recipe data found for ${meal.mealType} meal. Recipe details:`, recipeDetails);
          }
        } else {
          console.log(`⚠️ Meal Planning Debug - No edamamRecipeId for ${meal.mealType} meal`);
        }
      } catch (error) {
        console.error(`❌ Meal Planning Debug - Error enriching ${meal.mealType} meal:`, error);
        console.error(`❌ Meal Planning Debug - Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
        // Keep the meal as is if enrichment fails
      }
      
      enrichedMeals.push(meal);
    }
    
    console.log(`🍽️ Meal Planning Debug - Meal enrichment completed. Total meals: ${enrichedMeals.length}`);
    console.log(`🍽️ Meal Planning Debug - Final enriched meals:`, JSON.stringify(enrichedMeals, null, 2));
    return enrichedMeals;
  }

  /**
   * Find a suitable recipe for a specific meal type and nutrition targets
   */
  private async findRecipeForMeal(
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    targets: any,
    preferences: MealPlanPreferences,
    userId?: string
  ): Promise<EdamamRecipe | null> {
    console.log(`🔍 Meal Planning Debug - ===== findRecipeForMeal START =====`);
    console.log(`🔍 Meal Planning Debug - Meal type: ${mealType}`);
    console.log(`🔍 Meal Planning Debug - Targets:`, JSON.stringify(targets, null, 2));
    console.log(`🔍 Meal Planning Debug - Preferences:`, JSON.stringify(preferences, null, 2));
    console.log(`🔍 Meal Planning Debug - User ID: ${userId}`);
    
    const searchParams: RecipeSearchParams = {
      // Simplified search - removed restrictive filters that were causing 0 hits
      time: preferences.preferredCookingTime,
      imageSize: preferences.imageSize,
      random: true
    };
    
    console.log(`🔍 Meal Planning Debug - Initial search params:`, JSON.stringify(searchParams, null, 2));
    
    // Add simple, common food terms that Edamam definitely has
    if (mealType === 'breakfast') {
      searchParams.query = 'eggs';
      console.log(`🔍 Meal Planning Debug - Added breakfast query: eggs`);
    } else if (mealType === 'lunch') {
      searchParams.query = 'chicken';
      console.log(`🔍 Meal Planning Debug - Added lunch query: chicken`);
    } else if (mealType === 'dinner') {
      searchParams.query = 'salmon';
      console.log(`🔍 Meal Planning Debug - Added dinner query: salmon`);
    } else if (mealType === 'snack') {
      searchParams.query = 'nuts';
      console.log(`🔍 Meal Planning Debug - Added snack query: nuts`);
      // Remove calorie restriction for snack to get more options
      delete searchParams.calories;
      console.log(`🔍 Meal Planning Debug - Removed calories restriction for snack`);
    }

    // Add dietary restrictions
    if (preferences.dietaryRestrictions.length > 0) {
      searchParams.diet = preferences.dietaryRestrictions;
      console.log(`🔍 Meal Planning Debug - Added dietary restrictions:`, preferences.dietaryRestrictions);
    }

    // Add cuisine preferences
    if (preferences.cuisinePreferences.length > 0) {
      searchParams.cuisineType = preferences.cuisinePreferences;
      console.log(`🔍 Meal Planning Debug - Added cuisine preferences:`, preferences.cuisinePreferences);
    }

    // Add health labels based on dietary restrictions
    if (preferences.dietaryRestrictions.includes('gluten-free')) {
      searchParams.health = ['gluten-free'];
      console.log(`🔍 Meal Planning Debug - Added gluten-free health label`);
    }
    if (preferences.dietaryRestrictions.includes('dairy-free')) {
      searchParams.health = ['dairy-free'];
      console.log(`🔍 Meal Planning Debug - Added dairy-free health label`);
    }
    
    // Removed alcohol-free filter as it was too restrictive and causing 0 hits
    console.log(`🔍 Meal Planning Debug - No health filters applied to avoid over-restriction`);

    console.log(`🔍 Meal Planning Debug - Final search params:`, JSON.stringify(searchParams, null, 2));

    try {
      console.log(`🔍 Meal Planning Debug - About to call Edamam API...`);
      console.log(`🔍 Meal Planning Debug - Calling edamamService.searchRecipes with userId: ${userId}`);
      
      const response = await this.edamamService.searchRecipes(searchParams, userId);
      
      console.log(`🔍 Meal Planning Debug - Edamam API call completed successfully`);
      console.log(`🔍 Meal Planning Debug - Response received:`, JSON.stringify(response, null, 2));
      console.log(`🔍 Meal Planning Debug - Response hits count: ${response.hits?.length || 0}`);
      
      if (response.hits && response.hits.length > 0) {
        console.log(`🔍 Meal Planning Debug - Processing ${response.hits.length} recipe hits...`);
        
        // Filter recipes based on per-serving calories
        // Edamam returns total dish calories, so we need to estimate per-serving
        const suitableRecipes = response.hits.filter(hit => {
          const recipeData = hit.recipe;
          const totalDishCalories = recipeData.calories || 0;
          
          // Estimate servings based on recipe yield (default to 4 servings if not specified)
          const estimatedServings = recipeData.yield || 4;
          const perServingCalories = totalDishCalories / estimatedServings;
          
          // Check if per-serving calories are within reasonable range of target calories
          // Using very wide range (0.2x to 3.0x) to account for realistic recipe variations
          const minCalories = targets.calories * 0.2;
          const maxCalories = targets.calories * 3.0;
          const caloriesOk = perServingCalories >= minCalories && perServingCalories <= maxCalories;
          
          console.log(`🔍 Meal Planning Debug - Recipe: ${recipeData.label}`);
          console.log(`🔍 Meal Planning Debug - Total calories: ${totalDishCalories}, Estimated servings: ${estimatedServings}`);
          console.log(`🔍 Meal Planning Debug - Per-serving calories: ${perServingCalories.toFixed(1)}`);
          console.log(`🔍 Meal Planning Debug - Target range: ${minCalories.toFixed(1)}-${maxCalories.toFixed(1)}`);
          console.log(`🔍 Meal Planning Debug - Calories OK: ${caloriesOk ? '✅ YES' : '❌ NO'}`);
          
          return caloriesOk;
        });

        console.log(`🔍 Meal Planning Debug - Calorie filtering completed. Suitable recipes: ${suitableRecipes.length}`);

        if (suitableRecipes.length > 0) {
          const selectedRecipe = suitableRecipes[0].recipe;
          console.log(`✅ Meal Planning Debug - Found ${suitableRecipes.length} suitable recipes, using first one: ${selectedRecipe.label}`);
          console.log(`✅ Meal Planning Debug - Selected recipe details:`, JSON.stringify(selectedRecipe, null, 2));
          return selectedRecipe;
        } else {
          console.log(`⚠️ Meal Planning Debug - No recipes passed calorie filtering`);
          console.log(`⚠️ Meal Planning Debug - This explains why we get placeholder meals`);
        }
      } else {
        console.log(`⚠️ Meal Planning Debug - No hits returned from Edamam API`);
      }
    } catch (error) {
      console.error(`❌ Meal Planning Debug - Error searching for ${mealType} recipe:`, error);
      console.error(`❌ Meal Planning Debug - Error stack:`, error instanceof Error ? error.stack : 'No stack trace');
      console.error(`❌ Meal Planning Debug - This error is causing placeholder meals to be created`);
    }

    console.log(`🔍 Meal Planning Debug - findRecipeForMeal returning null (no recipe found)`);
    console.log(`🔍 Meal Planning Debug - ===== findRecipeForMeal END =====`);
    return null;
  }

  /**
   * Create a meal object from an Edamam recipe
   */
  private createMealFromRecipe(
    recipe: EdamamRecipe,
    mealType: string,
    mealOrder: number,
    targets: any
  ): GeneratedMeal {
    const servingsPerMeal = this.calculateOptimalServings(recipe, targets);
    
    // Calculate per-serving values from total dish values
    const estimatedServings = recipe.yield || 4;
    const caloriesPerServing = Math.round(recipe.calories / estimatedServings);
    const proteinPerServing = Math.round((recipe.totalNutrients.PROCNT?.quantity || 0) / estimatedServings * 100) / 100;
    const carbsPerServing = Math.round((recipe.totalNutrients.CHOCDF?.quantity || 0) / estimatedServings * 100) / 100;
    const fatPerServing = Math.round((recipe.totalNutrients.FAT?.quantity || 0) / estimatedServings * 100) / 100;
    const fiberPerServing = Math.round((recipe.totalNutrients.FIBTG?.quantity || 0) / estimatedServings * 100) / 100;
    
    return {
      id: '',
      mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      mealOrder,
      recipeName: recipe.label,
      recipeUrl: recipe.url,
      recipeImageUrl: recipe.image,
      caloriesPerServing,
      proteinGrams: proteinPerServing,
      carbsGrams: carbsPerServing,
      fatGrams: fatPerServing,
      fiberGrams: fiberPerServing,
      servingsPerMeal,
      totalCalories: Math.round(caloriesPerServing * servingsPerMeal),
      totalProtein: Math.round(proteinPerServing * servingsPerMeal * 100) / 100,
      totalCarbs: Math.round(carbsPerServing * servingsPerMeal * 100) / 100,
      totalFat: Math.round(fatPerServing * servingsPerMeal * 100) / 100,
      totalFiber: Math.round(fiberPerServing * servingsPerMeal * 100) / 100,
      ingredients: recipe.ingredientLines,
      edamamRecipeId: recipe.uri
    };
  }

  /**
   * Calculate optimal number of servings to meet nutrition targets
   */
  private calculateOptimalServings(recipe: EdamamRecipe, targets: any): number {
    // Use 1.0 servings by default for more realistic meal plans
    // The calorie differences will be natural and acceptable
    return 1.0;
    
    /* Old logic that was creating unrealistic serving sizes:
    const currentCalories = recipe.calories;
    const currentProtein = recipe.totalNutrients.PROCNT?.quantity || 0;
    const currentCarbs = recipe.totalNutrients.CHOCDF?.quantity || 0;
    const currentFat = recipe.totalNutrients.FAT?.quantity || 0;

    // Calculate serving multipliers based on each nutrient
    const calorieMultiplier = targets.calories / currentCalories;
    const proteinMultiplier = targets.protein / currentProtein;
    const carbsMultiplier = targets.carbs / currentCarbs;
    const fatMultiplier = targets.fat / currentFat;

    // Use the average of all multipliers, but cap at reasonable limits
    const avgMultiplier = (calorieMultiplier + proteinMultiplier + carbsMultiplier + fatMultiplier) / 4;
    const cappedMultiplier = Math.max(0.5, Math.min(2.0, avgMultiplier));

    return Math.round(cappedMultiplier * 100) / 100;
    */
  }

  /**
   * Create a placeholder meal when recipe generation fails
   */
  private createPlaceholderMeal(
    mealType: string,
    mealOrder: number,
    targets: any
  ): GeneratedMeal {
    return {
      id: '',
      mealType: mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack',
      mealOrder,
      recipeName: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} - Recipe to be selected`,
      recipeUrl: '',
      recipeImageUrl: '',
      caloriesPerServing: targets.calories,
      proteinGrams: targets.protein,
      carbsGrams: targets.carbs,
      fatGrams: targets.fat,
      fiberGrams: 0,
      servingsPerMeal: 1,
      totalCalories: targets.calories,
      totalProtein: targets.protein,
      totalCarbs: targets.carbs,
      totalFat: targets.fat,
      totalFiber: 0,
      ingredients: ['Recipe selection pending'],
      edamamRecipeId: ''
    };
  }

  /**
   * Calculate nutrition summary for all meals
   */
  private calculateNutritionSummary(meals: GeneratedMeal[]) {
    const totals = meals.reduce(
      (acc, meal) => {
        acc.calories += meal.totalCalories;
        acc.protein += meal.totalProtein;
        acc.carbs += meal.totalCarbs;
        acc.fat += meal.totalFat;
        acc.fiber += meal.totalFiber;
        return acc;
      },
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 }
    );

    const totalCalories = totals.calories;
    const proteinPercentage = totalCalories > 0 ? (totals.protein * 4 / totalCalories) * 100 : 0;
    const carbsPercentage = totalCalories > 0 ? (totals.carbs * 4 / totalCalories) * 100 : 0;
    const fatPercentage = totalCalories > 0 ? (totals.fat * 9 / totalCalories) * 100 : 0;

    return {
      totalCalories: Math.round(totals.calories),
      totalProtein: Math.round(totals.protein * 100) / 100,
      totalCarbs: Math.round(totals.carbs * 100) / 100,
      totalFat: Math.round(totals.fat * 100) / 100,
      totalFiber: Math.round(totals.fiber * 100) / 100,
      proteinPercentage: Math.round(proteinPercentage * 100) / 100,
      carbsPercentage: Math.round(carbsPercentage * 100) / 100,
      fatPercentage: Math.round(fatPercentage * 100) / 100
    };
  }

  /**
   * Save generated meal plan to database
   */
  async saveMealPlan(mealPlan: GeneratedMealPlan): Promise<string> {
    try {
      // Insert meal plan
      const { data: planData, error: planError } = await supabase
        .from('meal_plans')
        .insert({
          client_id: mealPlan.clientId,
          nutritionist_id: mealPlan.nutritionistId,
          plan_name: mealPlan.planName,
          plan_date: mealPlan.planDate,
          plan_type: mealPlan.planType,
          status: mealPlan.status,
          target_calories: mealPlan.targetCalories,
          target_protein_grams: mealPlan.targetProtein,
          target_carbs_grams: mealPlan.targetCarbs,
          target_fat_grams: mealPlan.targetFat,
          target_fiber_grams: mealPlan.targetFiber,
          dietary_restrictions: mealPlan.dietaryRestrictions,
          cuisine_preferences: mealPlan.cuisinePreferences,
          generated_meals: mealPlan.meals,
          nutrition_summary: mealPlan.nutritionSummary,
          generated_at: mealPlan.generatedAt
        })
        .select('id')
        .single();

      if (planError) throw planError;

      const planId = planData.id;

      // Insert individual meals
      const mealInserts = mealPlan.meals.map(meal => ({
        meal_plan_id: planId,
        meal_type: meal.mealType,
        meal_order: meal.mealOrder,
        edamam_recipe_id: meal.edamamRecipeId,
        recipe_name: meal.recipeName,
        recipe_url: meal.recipeUrl,
        recipe_image_url: meal.recipeImageUrl,
        calories_per_serving: meal.caloriesPerServing,
        protein_grams: meal.proteinGrams,
        carbs_grams: meal.carbsGrams,
        fat_grams: meal.fatGrams,
        fiber_grams: meal.fiberGrams,
        servings_per_meal: meal.servingsPerMeal,
        total_calories: meal.totalCalories,
        total_protein_grams: meal.totalProtein,
        total_carbs_grams: meal.totalCarbs,
        total_fat_grams: meal.totalFat,
        total_fiber_grams: meal.totalFiber,
        ingredients: meal.ingredients
      }));

      const { error: mealsError } = await supabase
        .from('meal_plan_meals')
        .insert(mealInserts);

      if (mealsError) throw mealsError;

      return planId;
    } catch (error) {
      console.error('Error saving meal plan:', error);
      throw new Error(`Failed to save meal plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get meal plan by ID
   */
  async getMealPlan(planId: string): Promise<GeneratedMealPlan | null> {
    try {
      const { data: plan, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (planError || !plan) return null;

      const { data: meals, error: mealsError } = await supabase
        .from('meal_plan_meals')
        .select('*')
        .eq('meal_plan_id', planId)
        .order('meal_order');

      if (mealsError) throw mealsError;

      // Convert database format to service format
      const generatedMeals: GeneratedMeal[] = meals.map(meal => ({
        id: meal.id,
        mealType: meal.meal_type,
        mealOrder: meal.meal_order,
        recipeName: meal.recipe_name,
        recipeUrl: meal.recipe_url || '',
        recipeImageUrl: meal.recipe_image_url || '',
        caloriesPerServing: meal.calories_per_serving || 0,
        proteinGrams: meal.protein_grams || 0,
        carbsGrams: meal.carbs_grams || 0,
        fatGrams: meal.fat_grams || 0,
        fiberGrams: meal.fiber_grams || 0,
        servingsPerMeal: meal.servings_per_meal || 1,
        totalCalories: meal.total_calories || 0,
        totalProtein: meal.total_protein_grams || 0,
        totalCarbs: meal.total_carbs_grams || 0,
        totalFat: meal.total_fat_grams || 0,
        totalFiber: meal.total_fiber_grams || 0,
        ingredients: meal.ingredients || [],
        edamamRecipeId: meal.edamam_recipe_id || ''
      }));

      return {
        id: plan.id,
        clientId: plan.client_id,
        nutritionistId: plan.nutritionist_id,
        planName: plan.plan_name,
        planDate: plan.plan_date,
        planType: plan.plan_type,
        status: plan.status,
        targetCalories: plan.target_calories,
        targetProtein: plan.target_protein_grams,
        targetCarbs: plan.target_carbs_grams,
        targetFat: plan.target_fat_grams,
        targetFiber: plan.target_fiber_grams || 0,
        dietaryRestrictions: plan.dietary_restrictions || [],
        cuisinePreferences: plan.cuisine_preferences || [],
        meals: generatedMeals,
        nutritionSummary: plan.nutrition_summary || {},
        generatedAt: plan.generated_at || plan.created_at
      };
    } catch (error) {
      console.error('Error fetching meal plan:', error);
      return null;
    }
  }

  /**
   * Get all meal plans for a client
   */
  async getClientMealPlans(clientId: string): Promise<GeneratedMealPlan[]> {
    try {
      const { data: plans, error: plansError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('plan_date', { ascending: false });

      if (plansError) throw plansError;

      const mealPlans: GeneratedMealPlan[] = [];

      for (const plan of plans) {
        const mealPlan = await this.getMealPlan(plan.id);
        if (mealPlan) {
          mealPlans.push(mealPlan);
        }
      }

      return mealPlans;
    } catch (error) {
      console.error('Error fetching client meal plans:', error);
      return [];
    }
  }

  /**
   * Update meal plan status
   */
  async updateMealPlanStatus(planId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('meal_plans')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', planId);

      return !error;
    } catch (error) {
      console.error('Error updating meal plan status:', error);
      return false;
    }
  }

  /**
   * Delete meal plan
   */
  async deleteMealPlan(planId: string): Promise<boolean> {
    try {
      // Delete meals first (due to foreign key constraint)
      const { error: mealsError } = await supabase
        .from('meal_plan_meals')
        .delete()
        .eq('meal_plan_id', planId);

      if (mealsError) throw mealsError;

      // Delete meal plan
      const { error: planError } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId);

      return !planError;
    } catch (error) {
      console.error('Error deleting meal plan:', error);
      return false;
    }
  }
}
