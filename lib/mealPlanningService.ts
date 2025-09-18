import { supabase } from './supabase';
import { EdamamService, EdamamRecipe, RecipeSearchParams } from './edamamService';
import { MealProgramMappingService } from './mealProgramMappingService';
import { ClientGoalsService } from './clientGoalsService';
import { objectToCamelCase } from './caseTransform';
import { calculateEER, calculateMacros } from './calculations';
import { mapCuisineTypesForEdamam, mergeAllergiesAndPreferencesForEdamam } from './clientGoalsMealPlanningIntegration';

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
  // Database fields (without "total" prefix) - optional since they might not always be present
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  ingredients: any[]; // Can be string[] or detailed ingredient objects
  edamamRecipeId: string;
}

export interface ManualMealIngredient {
  text: string;
  quantity: number;
  measure: string;
  food: string;
  weight?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
}

export interface ManualMeal {
  id: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  mealOrder: number;
  recipeName: string;
  cookingInstructions?: string;
  servings: number;
  isManual: true; // Flag to distinguish from generated meals
  ingredients: ManualMealIngredient[];
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
    sodium?: number;
    sugar?: number;
  };
}

export interface ManualMealPlan {
  id?: string;
  clientId: string;
  nutritionistId: string;
  planName: string;
  planDate: string;
  planType: string;
  status: string;
  isManual: true; // Flag to distinguish from generated meal plans
  meals: ManualMeal[];
  nutritionSummary: {
    totalCalories: number;
    totalProtein: number;
    totalCarbs: number;
    totalFat: number;
    totalFiber: number;
    totalSodium?: number;
    totalSugar?: number;
  };
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
  private clientGoalsService: ClientGoalsService;

  constructor() {
    this.edamamService = new EdamamService();
    this.clientGoalsService = new ClientGoalsService();
  }

  /**
   * Generate a complete meal plan for a client based on their EER requirements
   */
  async generateMealPlan(request: MealPlanGenerationRequest, userId?: string): Promise<GeneratedMealPlan> {
    console.log('🚀 Meal Planning Service - ===== generateMealPlan START =====');
    console.log('🚀 Meal Planning Service - Request:', JSON.stringify(request, null, 2));
    console.log('🚀 Meal Planning Service - User ID:', userId);
    
    try {
      // 1. Get client's nutrition requirements or calculate from guidelines
      console.log('🚀 Meal Planning Service - Getting client nutrition requirements...');
      let nutritionRequirements = await this.getClientNutritionRequirements(request.clientId);
      console.log('🚀 Meal Planning Service - Nutrition requirements:', JSON.stringify(nutritionRequirements, null, 2));
      
      // If no client goals found, calculate from nutritional guidelines
      if (!nutritionRequirements) {
        console.log('⚠️ Meal Planning Service - No client nutrition requirements found, calculating from guidelines...');
        nutritionRequirements = await this.calculateNutritionFromGuidelines(request.clientId);
        console.log('🔄 Meal Planning Service - Calculated nutrition requirements:', JSON.stringify(nutritionRequirements, null, 2));
        
        if (!nutritionRequirements) {
          console.error('❌ Meal Planning Service - Failed to calculate nutrition requirements from guidelines');
          throw new Error('Unable to determine nutrition requirements. Please ensure client profile is complete.');
        }
      }

      // 2. Get client's dietary preferences and restrictions
      console.log('🚀 Meal Planning Service - Getting client preferences...');
      const clientPreferences = await this.getClientPreferences(request.clientId);
      console.log('🚀 Meal Planning Service - Client preferences:', JSON.stringify(clientPreferences, null, 2));
      
      // 2.5. Get client goals for cuisine types, allergies, and preferences
      console.log('🚀 Meal Planning Service - Getting client goals...');
      const clientGoalsResult = await this.clientGoalsService.getActiveClientGoal(request.clientId, userId || '');
      const clientGoals = clientGoalsResult.success ? clientGoalsResult.data : null;
      console.log('🚀 Meal Planning Service - Client goals:', JSON.stringify(clientGoals, null, 2));
      
      // 3. Merge with request preferences and client goals
      console.log('🚀 Meal Planning Service - Merging preferences...');
      console.log('🚀 Meal Planning Service - Request dietary restrictions:', JSON.stringify(request.dietaryRestrictions, null, 2));
      const finalPreferences = this.mergePreferencesWithClientGoals(clientPreferences, request, clientGoals);
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
        nutritionistId: userId || nutritionRequirements.nutritionist_id || '',
        planName: `${request.planType || 'Daily'} Meal Plan`,
        planDate: request.planDate,
        planType: request.planType || 'daily',
        status: 'draft',
        targetCalories: request.targetCalories || nutritionRequirements.eer_calories,
        targetProtein: nutritionRequirements.protein_grams || nutritionRequirements.protein_min_grams || 0,
        targetCarbs: nutritionRequirements.carbs_grams || nutritionRequirements.carbs_min_grams || 0,
        targetFat: nutritionRequirements.fat_grams || nutritionRequirements.fat_min_grams || 0,
        targetFiber: nutritionRequirements.fiber_grams || nutritionRequirements.fiber_min_grams || 0,
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
        : (clientPreferences.dietaryRestrictions || []),
      
      // If request has cuisine preferences, use those; otherwise use client preferences  
      cuisinePreferences: request.cuisinePreferences !== undefined 
        ? request.cuisinePreferences 
        : (clientPreferences.cuisinePreferences || []),
      
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
   * Merge client preferences with request preferences and client goals
   * Client goals take precedence for cuisine types, allergies, and preferences
   */
  private mergePreferencesWithClientGoals(
    clientPreferences: MealPlanPreferences,
    request: MealPlanGenerationRequest,
    clientGoals: any
  ): MealPlanPreferences {
    // Start with base preferences
    const basePreferences = this.mergePreferences(clientPreferences, request);
    
    // Override with client goals data if available
    if (clientGoals) {
      // Get cuisine types from client goals
      const clientGoalsCuisineTypes = mapCuisineTypesForEdamam(clientGoals.cuisineTypes);
      
      // Get health labels (allergies + preferences) from client goals
      const clientGoalsHealthLabels = mergeAllergiesAndPreferencesForEdamam(
        clientGoals.allergies,
        clientGoals.preferences
      );
      
      console.log('🚀 Meal Planning Service - Client goals cuisine types:', clientGoalsCuisineTypes);
      console.log('🚀 Meal Planning Service - Client goals health labels:', clientGoalsHealthLabels);
      
      return {
        ...basePreferences,
        // Use client goals cuisine types if available, otherwise use request/client preferences
        cuisinePreferences: clientGoalsCuisineTypes.length > 0 
          ? clientGoalsCuisineTypes 
          : basePreferences.cuisinePreferences,
        
        // Merge dietary restrictions with client goals health labels
        dietaryRestrictions: [
          ...basePreferences.dietaryRestrictions,
          ...clientGoalsHealthLabels
        ].filter((value, index, self) => self.indexOf(value) === index) // Remove duplicates
      };
    }
    
    return basePreferences;
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
          throw new Error('Unable to fetch meals from food database');
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
          
          // Extract recipe ID from URI
          const recipeId = meal.edamamRecipeId.split('#recipe_')[1];
          if (!recipeId) {
            console.log(`⚠️ Meal Planning Debug - Invalid recipe URI format: ${meal.edamamRecipeId}`);
            enrichedMeals.push(meal);
            continue;
          }
          
          // Use the working searchRecipes approach instead of getRecipeDetails
          const searchParams = {
            query: recipeId // Search by recipe ID
          };
          
          console.log(`🍽️ Meal Planning Debug - Searching for recipe with ID: ${recipeId}`);
          const response = await this.edamamService.searchRecipes(searchParams, 'nutritionist1');
          
          if (response && response.hits && response.hits.length > 0) {
            const recipe = response.hits[0].recipe;
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
            // Use detailed ingredients with quantity, measure, etc. - scaled per serving
            meal.ingredients = recipe.ingredients?.map((ing: any) => {
              const scaledWeight = (ing.weight || 0) / recipeYield;
              return {
                text: this.convertIngredientToGrams(ing.text, scaledWeight),
                quantity: Math.round(scaledWeight),
                measure: 'gram',
                food: ing.food || this.extractFoodName(ing.text),
                weight: scaledWeight,
              calories: ing.nutrients?.ENERC_KCAL?.quantity,
              protein: ing.nutrients?.PROCNT?.quantity,
              carbs: ing.nutrients?.CHOCDF?.quantity,
              fat: ing.nutrients?.FAT?.quantity,
              fiber: ing.nutrients?.FIBTG?.quantity
              };
            }) || recipe.ingredientLines || [];
            
            // Preserve original nutrition values if they exist, otherwise calculate from recipe
            const servings = meal.servingsPerMeal || 1;
            
            // PRESERVE ORIGINAL NUTRITION VALUES - Don't overwrite with calculated values
            // The original values from meal plan generation are correct
            // Don't overwrite them with potentially incorrect Edamam recipe calculations
            console.log(`🔍 Preserving original nutrition values for ${meal.mealType}:`, {
              originalTotalProtein: meal.totalProtein,
              calculatedProteinGrams: meal.proteinGrams,
              servings: servings
            });
            
            console.log(`✅ Meal Planning Debug - ${meal.mealType} meal enriched:`, JSON.stringify(meal, null, 2));
          } else {
            console.log(`⚠️ Meal Planning Debug - No recipe found for ${meal.mealType} meal with ID: ${recipeId}`);
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
    if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.includes('gluten-free')) {
      searchParams.health = ['gluten-free'];
      console.log(`🔍 Meal Planning Debug - Added gluten-free health label`);
    }
    if (preferences.dietaryRestrictions && preferences.dietaryRestrictions.includes('dairy-free')) {
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

      // Insert individual meals - only those with valid recipes
      const mealInserts = mealPlan.meals
        .filter(meal => {
          // Enhanced validation: Only include meals with valid recipe data and meaningful nutrition
          const hasValidData = meal.edamamRecipeId && 
                              meal.caloriesPerServing > 0 && 
                              meal.recipeName && 
                              meal.recipeName.trim() !== '';
          
          if (!hasValidData) {
            console.log(`⚠️ Skipping meal without valid recipe: ${meal.recipeName || meal.mealType} - Recipe ID: ${meal.edamamRecipeId || 'N/A'}, Calories: ${meal.caloriesPerServing || 'N/A'}`);
            return false;
          }
          return true;
        })
        .map(meal => ({
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
      console.error('Error details:', JSON.stringify(error, null, 2));
      throw new Error(`Failed to save meal plan: ${error instanceof Error ? error.message : 'Unknown error'} - Original error: ${JSON.stringify(error)}`);
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

      let generatedMeals: GeneratedMeal[] = [];

      // Check if meals are stored in generated_meals JSONB field (preview/manual meals)
      if (plan.generated_meals && typeof plan.generated_meals === 'object') {
        const generatedMealsData = plan.generated_meals as any;
        
        // Handle manual meal plans
        if (generatedMealsData.isManual && generatedMealsData.meals) {
          generatedMeals = generatedMealsData.meals.map((meal: any) => ({
            id: meal.id,
            mealType: meal.mealType,
            mealOrder: meal.mealOrder,
            recipeName: meal.recipeName,
            recipeUrl: '',
            recipeImageUrl: '',
            caloriesPerServing: meal.nutrition?.calories || 0,
            proteinGrams: meal.nutrition?.protein || 0,
            carbsGrams: meal.nutrition?.carbs || 0,
            fatGrams: meal.nutrition?.fat || 0,
            fiberGrams: meal.nutrition?.fiber || 0,
            servingsPerMeal: meal.servings || 1,
            totalCalories: (meal.nutrition?.calories || 0) * (meal.servings || 1),
            totalProtein: (meal.nutrition?.protein || 0) * (meal.servings || 1),
            totalCarbs: (meal.nutrition?.carbs || 0) * (meal.servings || 1),
            totalFat: (meal.nutrition?.fat || 0) * (meal.servings || 1),
            totalFiber: (meal.nutrition?.fiber || 0) * (meal.servings || 1),
            ingredients: meal.ingredients?.map((ing: any) => ({
              text: ing.text,
              quantity: ing.quantity,
              measure: ing.measure,
              food: ing.food,
              weight: ing.weight,
              calories: ing.nutrients?.ENERC_KCAL?.quantity,
              protein: ing.nutrients?.PROCNT?.quantity,
              carbs: ing.nutrients?.CHOCDF?.quantity,
              fat: ing.nutrients?.FAT?.quantity,
              fiber: ing.nutrients?.FIBTG?.quantity
            })) || [],
            edamamRecipeId: ''
          }));
        } 
        // Handle preview meal plans (generated from Edamam)
        else if (Array.isArray(generatedMealsData)) {
          console.log('🔍 getMealPlan - Processing preview meals, count:', generatedMealsData.length);
          
          // Check if data is already in GeneratedMeal format
          if (generatedMealsData.length > 0 && generatedMealsData[0].id && generatedMealsData[0].mealOrder) {
            console.log('🔍 getMealPlan - Data is in GeneratedMeal format, using as-is');
            // Data is already in GeneratedMeal format, use as-is
            generatedMeals = generatedMealsData.map((meal: any) => ({
              ...meal,
              servingsPerMeal: meal.servingsPerMeal || 1 // Ensure servingsPerMeal is preserved
            }));
          } else {
            console.log('🔍 getMealPlan - Data is in old format, mapping...');
            // Data is in old format, map it
            generatedMeals = generatedMealsData.map((meal: any) => ({
              id: meal.id || `meal-${meal.mealOrder || 0}`,
              mealType: meal.mealType,
              mealOrder: meal.mealOrder,
              recipeName: meal.recipeName || meal.recipe?.label,
              recipeUrl: meal.recipe?.url || '',
              recipeImageUrl: meal.recipe?.image || '',
              caloriesPerServing: meal.recipe?.nutritionSummary?.calories || 0,
              proteinGrams: meal.recipe?.nutritionSummary?.protein || 0,
              carbsGrams: meal.recipe?.nutritionSummary?.carbs || 0,
              fatGrams: meal.recipe?.nutritionSummary?.fat || 0,
              fiberGrams: meal.recipe?.nutritionSummary?.fiber || 0,
              servingsPerMeal: meal.recipe?.yield || 1,
              totalCalories: meal.recipe?.nutritionSummary?.calories || 0,
              totalProtein: meal.recipe?.nutritionSummary?.protein || 0,
              totalCarbs: meal.recipe?.nutritionSummary?.carbs || 0,
              totalFat: meal.recipe?.nutritionSummary?.fat || 0,
              totalFiber: meal.recipe?.nutritionSummary?.fiber || 0,
              ingredients: meal.recipe?.ingredients?.map((ing: any) => ({
                text: ing.text,
                quantity: ing.quantity,
                measure: ing.measure,
                food: ing.food,
                weight: ing.weight,
                calories: ing.nutrients?.ENERC_KCAL?.quantity,
                protein: ing.nutrients?.PROCNT?.quantity,
                carbs: ing.nutrients?.CHOCDF?.quantity,
                fat: ing.nutrients?.FAT?.quantity,
                fiber: ing.nutrients?.FIBTG?.quantity
              })) || meal.recipe?.ingredientLines || [],
              edamamRecipeId: meal.recipe?.uri || ''
            }));
          }
          
          console.log('🔍 getMealPlan - Final meals:', generatedMeals.map(m => ({ 
            id: m.id, 
            mealOrder: m.mealOrder, 
            totalCalories: m.totalCalories,
            ingredientsCount: m.ingredients?.length 
          })));
        }
      } 
      // Fallback: Check meal_plan_meals table for saved meal plans
      else {
        const { data: meals, error: mealsError } = await supabase
          .from('meal_plan_meals')
          .select('*')
          .eq('meal_plan_id', planId)
          .order('meal_order');

        if (mealsError) throw mealsError;

        // Convert database format to service format
        generatedMeals = meals.map(meal => ({
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
      }

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
   * Handle Claude async meal plan retrieval
   */
  private async handleClaudeAsyncMealPlan(asyncMealPlan: any, mealPlanId: string): Promise<any> {
    console.log('🤖 Handling Claude async meal plan');
    
    if (asyncMealPlan.status === 'pending') {
      // Check Claude batch status
      console.log('🤖 Checking Claude batch status');
      
      const { ClaudeService } = await import('./claudeService');
      const claudeService = new ClaudeService();
      
      const claudeResponse = await claudeService.checkBatchStatus(asyncMealPlan.thread_id);
      
      if (claudeResponse.success && claudeResponse.status === 'completed') {
        // Update database with completed result
        await supabase
          .from('async_meal_plans')
          .update({
            status: 'completed',
            generated_meal_plan: claudeResponse.data,
            completed_at: new Date().toISOString()
          })
          .eq('id', mealPlanId);
        
        // Extract days from the nested structure
        const generatedData = claudeResponse.data;
        const daysData = generatedData?.data?.mealPlan?.days || generatedData?.days || [];
        
        return {
          success: true,
          data: {
            mealPlan: {
              id: mealPlanId,
              status: 'preview',
              clientId: asyncMealPlan.client_id,
              nutritionistId: asyncMealPlan.nutritionist_id,
              completedAt: new Date().toISOString()
            },
            days: daysData,
            overallStats: generatedData?.data?.mealPlan?.dailyNutrition || generatedData?.overallStats || null,
            clientGoals: generatedData?.clientGoals || asyncMealPlan.client_goals || null,
            generatedMealPlan: generatedData
          }
        };
      } else if (claudeResponse.success && claudeResponse.status === 'pending') {
        // Still processing
        return {
          success: true,
          data: {
            mealPlan: {
              id: mealPlanId,
              status: 'preview',
              clientId: asyncMealPlan.client_id,
              nutritionistId: asyncMealPlan.nutritionist_id,
              estimatedCompletionTime: '30-60 seconds'
            },
            days: [],
            overallStats: null,
            clientGoals: asyncMealPlan.client_goals,
            generatedMealPlan: null
          }
        };
      } else {
        // Update database with error
        await supabase
          .from('async_meal_plans')
          .update({
            status: 'failed',
            error_message: claudeResponse.error || 'Claude generation failed'
          })
          .eq('id', mealPlanId);
        
        return {
          success: false,
          error: claudeResponse.error || 'Claude meal plan generation failed'
        };
      }
    } else if (asyncMealPlan.status === 'completed') {
      // Claude has completed
      const generatedData = asyncMealPlan.generated_meal_plan;
      const daysData = generatedData?.data?.mealPlan?.days || generatedData?.days || [];
      
      return {
        success: true,
        data: {
          mealPlan: {
            id: mealPlanId,
            status: 'preview',
            clientId: asyncMealPlan.client_id,
            nutritionistId: asyncMealPlan.nutritionist_id,
            completedAt: asyncMealPlan.completed_at
          },
          days: daysData,
          overallStats: generatedData?.data?.mealPlan?.dailyNutrition || generatedData?.overallStats || null,
          clientGoals: generatedData?.clientGoals || asyncMealPlan.client_goals || null,
          generatedMealPlan: generatedData
        }
      };
    } else if (asyncMealPlan.status === 'failed') {
      return {
        success: false,
        error: asyncMealPlan.error_message || 'Claude meal plan generation failed'
      };
    }
  }

  /**
   * Handle OpenAI async meal plan retrieval
   */
  private async handleOpenAIAsyncMealPlan(asyncMealPlan: any, mealPlanId: string): Promise<any> {
    console.log('🤖 Handling OpenAI async meal plan');
    
    if (asyncMealPlan.status === 'pending') {
      // Check with OpenAI Assistant
      const { OpenAIAssistantService } = await import('./openaiAssistantService');
      const openaiService = new OpenAIAssistantService();
      
      const assistantResponse = await openaiService.checkGenerationStatus(
        asyncMealPlan.thread_id,
        asyncMealPlan.run_id
      );
    
      if (assistantResponse.status === 'completed') {
        // Update status in database
        await supabase
          .from('async_meal_plans')
          .update({
            status: 'completed',
            generated_meal_plan: assistantResponse.data,
            completed_at: new Date().toISOString()
          })
          .eq('id', mealPlanId);
        
        // Extract days from the nested structure
        const generatedData = assistantResponse.data;
        const daysData = generatedData?.data?.mealPlan?.days || generatedData?.days || [];
        
        return {
          success: true,
          data: {
            mealPlan: {
              id: mealPlanId,
              status: 'preview',
              clientId: asyncMealPlan.client_id,
              nutritionistId: asyncMealPlan.nutritionist_id,
              completedAt: new Date().toISOString()
            },
            days: daysData,
            overallStats: generatedData?.data?.mealPlan?.dailyNutrition || generatedData?.overallStats || null,
            clientGoals: generatedData?.clientGoals || asyncMealPlan.client_goals || null,
            generatedMealPlan: generatedData
          }
        };
      } else if (assistantResponse.status === 'failed') {
        return {
          success: false,
          error: assistantResponse.error || 'OpenAI meal plan generation failed'
        };
      } else {
        // Still pending
        return {
          success: true,
          data: {
            mealPlan: {
              id: mealPlanId,
              status: 'preview',
              clientId: asyncMealPlan.client_id,
              nutritionistId: asyncMealPlan.nutritionist_id,
              estimatedCompletionTime: '2-3 minutes'
            },
            days: [],
            overallStats: null,
            clientGoals: asyncMealPlan.client_goals,
            generatedMealPlan: null
          }
        };
      }
    } else if (asyncMealPlan.status === 'completed') {
      // Extract days from the nested structure
      const generatedData = asyncMealPlan.generated_meal_plan;
      const daysData = generatedData?.data?.mealPlan?.days || generatedData?.days || [];
      
      return {
        success: true,
        data: {
          mealPlan: {
            id: mealPlanId,
            status: 'preview',
            clientId: asyncMealPlan.client_id,
            nutritionistId: asyncMealPlan.nutritionist_id,
            completedAt: asyncMealPlan.completed_at
          },
          days: daysData,
          overallStats: generatedData?.data?.mealPlan?.dailyNutrition || generatedData?.overallStats || null,
          clientGoals: generatedData?.clientGoals || asyncMealPlan.client_goals || null,
          generatedMealPlan: generatedData
        }
      };
    } else if (asyncMealPlan.status === 'failed') {
      return {
        success: false,
        error: asyncMealPlan.error_message || 'OpenAI meal plan generation failed'
      };
    }
  }

  /**
   * Get all meal plans for a client (optimized version)
   */
  async getClientMealPlans(clientId: string): Promise<GeneratedMealPlan[]> {
    try {
      // Single query to get all meal plans with their meals
      const { data: plans, error: plansError } = await supabase
        .from('meal_plans')
        .select(`
          *,
          meal_plan_meals (*)
        `)
        .eq('client_id', clientId)
        .order('plan_date', { ascending: false });

      if (plansError) throw plansError;

      // Process all plans in parallel (no sequential DB calls)
      const mealPlans: GeneratedMealPlan[] = plans.map(plan => {
        let generatedMeals: GeneratedMeal[] = [];

        // Check if meals are stored in generated_meals JSONB field (preview/manual meals)
        if (plan.generated_meals && typeof plan.generated_meals === 'object') {
          const generatedMealsData = plan.generated_meals as any;
          
          // Handle manual meal plans
          if (generatedMealsData.isManual && generatedMealsData.meals) {
            generatedMeals = generatedMealsData.meals.map((meal: any) => ({
              id: meal.id,
              mealType: meal.mealType,
              mealOrder: meal.mealOrder,
              recipeName: meal.recipeName,
              recipeUrl: '',
              recipeImageUrl: '',
              caloriesPerServing: meal.nutrition?.calories || 0,
              proteinGrams: meal.nutrition?.protein || 0,
              carbsGrams: meal.nutrition?.carbs || 0,
              fatGrams: meal.nutrition?.fat || 0,
              fiberGrams: meal.nutrition?.fiber || 0,
              servingsPerMeal: meal.servings || 1,
              totalCalories: (meal.nutrition?.calories || 0) * (meal.servings || 1),
              totalProtein: (meal.nutrition?.protein || 0) * (meal.servings || 1),
              totalCarbs: (meal.nutrition?.carbs || 0) * (meal.servings || 1),
              totalFat: (meal.nutrition?.fat || 0) * (meal.servings || 1),
              totalFiber: (meal.nutrition?.fiber || 0) * (meal.servings || 1),
              ingredients: meal.ingredients?.map((ing: any) => ({
              text: ing.text,
              quantity: ing.quantity,
              measure: ing.measure,
              food: ing.food,
              weight: ing.weight,
              calories: ing.nutrients?.ENERC_KCAL?.quantity,
              protein: ing.nutrients?.PROCNT?.quantity,
              carbs: ing.nutrients?.CHOCDF?.quantity,
              fat: ing.nutrients?.FAT?.quantity,
              fiber: ing.nutrients?.FIBTG?.quantity
            })) || [],
              edamamRecipeId: ''
            }));
          } 
          // Handle preview meal plans (generated from Edamam)
          else if (Array.isArray(generatedMealsData)) {
            generatedMeals = generatedMealsData.map((meal: any) => ({
              id: meal.id || `meal-${meal.mealOrder || 0}`,
              mealType: meal.mealType,
              mealOrder: meal.mealOrder,
              recipeName: meal.recipeName || meal.recipe?.label,
              recipeUrl: meal.recipe?.url || '',
              recipeImageUrl: meal.recipe?.image || '',
              caloriesPerServing: meal.recipe?.nutritionSummary?.calories || 0,
              proteinGrams: meal.recipe?.nutritionSummary?.protein || 0,
              carbsGrams: meal.recipe?.nutritionSummary?.carbs || 0,
              fatGrams: meal.recipe?.nutritionSummary?.fat || 0,
              fiberGrams: meal.recipe?.nutritionSummary?.fiber || 0,
              servingsPerMeal: meal.recipe?.yield || 1,
              totalCalories: meal.recipe?.nutritionSummary?.calories || 0,
              totalProtein: meal.recipe?.nutritionSummary?.protein || 0,
              totalCarbs: meal.recipe?.nutritionSummary?.carbs || 0,
              totalFat: meal.recipe?.nutritionSummary?.fat || 0,
              totalFiber: meal.recipe?.nutritionSummary?.fiber || 0,
              ingredients: meal.recipe?.ingredients?.map((ing: any) => ({
                text: ing.text,
                quantity: ing.quantity,
                measure: ing.measure,
                food: ing.food,
                weight: ing.weight,
                calories: ing.nutrients?.ENERC_KCAL?.quantity,
                protein: ing.nutrients?.PROCNT?.quantity,
                carbs: ing.nutrients?.CHOCDF?.quantity,
                fat: ing.nutrients?.FAT?.quantity,
                fiber: ing.nutrients?.FIBTG?.quantity
              })) || meal.recipe?.ingredientLines || [],
              edamamRecipeId: meal.recipe?.uri || ''
            }));
          }
        } 
        // Handle saved meal plans from meal_plan_meals table
        else if (plan.meal_plan_meals && Array.isArray(plan.meal_plan_meals)) {
          generatedMeals = plan.meal_plan_meals
            .sort((a: any, b: any) => a.meal_order - b.meal_order)
            .map((meal: any) => ({
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
        }

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
      });

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

  /**
   * Generate multi-day meal plan with recipe exclusion
   */
  async generateMultiDayMealPlan(
    clientId: string,
    startDate: string,
    days: number,
    dietaryRestrictions: string[],
    cuisinePreferences: string[],
    userId: string,
    overrideMealProgram?: any,
    overrideClientGoals?: any
  ): Promise<any> {
    console.log('🚨🚨🚨 MULTI-DAY MEAL PLANNING START 🚨🚨🚨');
    console.log('🎯 Multi-Day Meal Planning Service - Generating meal plan for client:', clientId);
    console.log('🎯 Start Date:', startDate, 'Days:', days);
    console.log('🎯 Override Meal Program:', !!overrideMealProgram);
    console.log('🎯 Override Client Goals:', !!overrideClientGoals);
    
    try {
      const clientGoalsService = new ClientGoalsService();
      const mealProgramMappingService = new MealProgramMappingService();
      
      // 1. Get client's active goals (or use override)
      let clientGoal;
      if (overrideClientGoals) {
        clientGoal = overrideClientGoals;
        console.log('🎯 Multi-Day Meal Planning Service - Using override client goals');
      } else {
        const goalsResponse = await clientGoalsService.getActiveClientGoal(clientId, userId);
        if (!goalsResponse.success || !goalsResponse.data) {
          throw new Error('No active client goals found and no override provided. Please set client goals first.');
        }
        clientGoal = goalsResponse.data;
        console.log('🎯 Multi-Day Meal Planning Service - Using database client goals');
      }
      
      // 2. Get client's active meal program (or use override)
      let mealProgram;
      if (overrideMealProgram) {
        mealProgram = {
          id: 'override',
          client_id: clientId,
          nutritionist_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          meals: overrideMealProgram.meals.map((meal: any, index: number) => ({
            id: `override_${index}`,
            meal_program_id: 'override',
            meal_order: meal.mealOrder || index + 1,
            meal_name: meal.mealName,
            meal_time: meal.mealTime,
            target_calories: meal.targetCalories,
            meal_type: meal.mealType,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        };
        console.log('🎯 Multi-Day Meal Planning Service - Using override meal program');
      } else {
        const { data: dbMealProgram, error: programError } = await supabase
          .from('meal_programs')
          .select(`
            *,
            meals:meal_program_meals(*)
          `)
          .eq('client_id', clientId)
          .single();
        
        if (programError || !dbMealProgram) {
          throw new Error('No meal program found and no override provided. Please create a meal program first.');
        }
        mealProgram = dbMealProgram;
        console.log('🎯 Multi-Day Meal Planning Service - Using database meal program');
      }
      
      // 3. Calculate meal distribution
      const mealDistribution = mealProgramMappingService.calculateMealDistribution(
        clientGoal,
        {
          id: mealProgram.id,
          clientId: mealProgram.client_id,
          nutritionistId: mealProgram.nutritionist_id,
          createdAt: mealProgram.created_at,
          updatedAt: mealProgram.updated_at,
          meals: mealProgram.meals.map((meal: any) => ({
            id: meal.id,
            mealProgramId: meal.meal_program_id,
            mealOrder: meal.meal_order,
            mealName: meal.meal_name,
            mealTime: meal.meal_time,
            targetCalories: meal.target_calories,
            mealType: meal.meal_type,
            createdAt: meal.created_at,
            updatedAt: meal.updated_at
          }))
        }
      );
      
      // 4. Create base Edamam request
      const baseEdamamRequest = mealProgramMappingService.createEdamamMealPlanRequest(
        mealDistribution,
        dietaryRestrictions,
        cuisinePreferences,
        clientGoal,
        undefined
      );
      
      console.log('🚨 Multi-Day Meal Planning - Base Edamam Request:', JSON.stringify(baseEdamamRequest, null, 2));
      
      // 5. Generate multi-day meal plans using Edamam
      const { dayPlans, allExcludedRecipes } = await this.edamamService.generateMultiDayMealPlan(
        baseEdamamRequest,
        days,
        userId
      );
      
      console.log(`🎉 Multi-Day Meal Planning - Generated ${dayPlans.length} day plans`);
      
      // 6. Process each day's response
      const processedDays: any[] = [];
      
      for (let dayIndex = 0; dayIndex < dayPlans.length; dayIndex++) {
        const dayNumber = dayIndex + 1;
        const dayPlan = dayPlans[dayIndex];
        const dayDate = new Date(startDate);
        dayDate.setDate(dayDate.getDate() + dayIndex);
        
        console.log(`🔄 Processing day ${dayNumber} (${dayDate.toISOString().split('T')[0]})`);
        
        // Map Edamam response to meal program structure
        const mappedDayResponse = mealProgramMappingService.mapEdamamResponseToMealProgram(
          dayPlan,
          mealDistribution
        );
        
        // Fetch recipe details for this day with improved timeout handling
        console.log(`🔄 Day ${dayNumber} - Fetching detailed recipe info for ${mappedDayResponse.meals.length} meals`);
        
        const recipeFetchPromises = mappedDayResponse.meals
          .filter(meal => meal.recipe?.uri)
          .map(async (meal, index) => {
            try {
              console.log(`🔄 Day ${dayNumber} - Fetching recipe ${index + 1}: ${meal.mealName} (${meal.recipe.uri})`);
              
              // Add timeout for individual recipe fetching (shorter timeout)
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Recipe fetch timeout')), 8000); // 8 second timeout per recipe
              });
              
              const recipeDetailsPromise = this.edamamService.getRecipeDetails(meal.recipe.uri, userId);
              
              const recipeDetails = await Promise.race([recipeDetailsPromise, timeoutPromise]);
              
              // getRecipeDetails already returns the recipe object directly, not wrapped
              if (recipeDetails) {
                const recipe = recipeDetails;
                const servings = recipe.yield || 1;
                
                meal.recipe = {
                  ...(meal.recipe as object),
                  ...(recipe as object),
                  nutritionSummary: {
                    calories: Math.round((recipe.calories || 0) / servings),
                    protein: Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / servings),
                    carbs: Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / servings),
                    fat: Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / servings),
                    fiber: Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / servings),
                    sodium: Math.round((recipe.totalNutrients?.NA?.quantity || 0) / servings),
                    sugar: Math.round((recipe.totalNutrients?.SUGAR?.quantity || 0) / servings),
                    servings: servings
                  }
                };
                delete meal.recipe.details;
                console.log(`✅ Day ${dayNumber} - Recipe details fetched for: ${meal.mealName}`);
                console.log(`📊 Day ${dayNumber} - Recipe details: URL=${recipe.url}, Image=${recipe.image}, Ingredients=${recipe.ingredientLines?.length || 0}`);
              } else {
                console.log(`❌ Day ${dayNumber} - No recipe data returned for: ${meal.mealName}`);
                // Set fallback data
                meal.recipe.nutritionSummary = {
                  calories: meal.targetCalories || 0,
                  protein: Math.round((meal.targetCalories || 0) * 0.15 / 4),
                  carbs: Math.round((meal.targetCalories || 0) * 0.55 / 4),
                  fat: Math.round((meal.targetCalories || 0) * 0.30 / 9),
                  fiber: 5,
                  sodium: 400,
                  sugar: 10,
                  servings: 1
                };
                meal.recipe.error = 'Failed to fetch recipe details';
              }
            } catch (error) {
              console.error(`❌ Day ${dayNumber} - Recipe fetch error for ${meal.mealName}:`, error);
              // Set fallback data on error
              meal.recipe.nutritionSummary = {
                calories: meal.targetCalories || 0,
                protein: Math.round((meal.targetCalories || 0) * 0.15 / 4),
                carbs: Math.round((meal.targetCalories || 0) * 0.55 / 4),
                fat: Math.round((meal.targetCalories || 0) * 0.30 / 9),
                fiber: 5,
                sodium: 400,
                sugar: 10,
                servings: 1
              };
              meal.recipe.error = `Failed to fetch recipe details: ${error instanceof Error ? error.message : 'Unknown error'}`;
            }
          });
        
        console.log(`🔄 Day ${dayNumber} - Waiting for all ${recipeFetchPromises.length} recipe details (with 8s timeout each)...`);
        
        try {
          // Add timeout for the entire recipe fetch process for this day (shorter total timeout)
          const allRecipesPromise = Promise.all(recipeFetchPromises);
          const dayTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`Recipe fetch timeout for day ${dayNumber}`)), 25000); // 25 second timeout for all recipes in a day
          });
          
          await Promise.race([allRecipesPromise, dayTimeoutPromise]);
          console.log(`✅ Day ${dayNumber} - All recipe details completed successfully`);
        } catch (error) {
          console.error(`❌ Day ${dayNumber} - Recipe fetch timeout or error:`, error);
          console.log(`⚠️ Day ${dayNumber} - Continuing with partial/fallback recipe data`);
          // Continue with whatever recipe data we have (fallback data was set in individual promises)
        }
        
        // Calculate daily nutrition
        const dailyNutrition = this.calculateDailyNutrition(mappedDayResponse.meals);
        mappedDayResponse.dailyNutrition = dailyNutrition;
        
        processedDays.push({
          dayNumber,
          date: dayDate.toISOString().split('T')[0],
          meals: mappedDayResponse.meals,
          dailyNutrition: mappedDayResponse.dailyNutrition
        });
      }
      
      // 7. Insert multi-day meal plan into database
      console.log('🔍 Multi-Day Meal Planning Service - ===== DATABASE INSERTION START =====');
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + days - 1);
      
      console.log('🔍 Multi-Day Meal Planning Service - Preparing meal plan insertion:');
      console.log('  - Client ID:', clientId);
      console.log('  - Nutritionist ID:', userId);
      console.log('  - Start Date:', startDate);
      console.log('  - End Date:', endDate.toISOString().split('T')[0]);
      console.log('  - Duration Days:', days);
      console.log('  - Excluded Recipes Count:', allExcludedRecipes.length);
      
      const mealPlanData = {
        client_id: clientId,
        nutritionist_id: userId,
        plan_name: `${days}-Day Meal Plan`,
        plan_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        plan_duration_days: days,
        plan_type: days === 1 ? 'daily' : 'multi-day',
        status: 'draft',
        target_calories: clientGoal.eerGoalCalories,
        target_protein_grams: (clientGoal.proteinGoalMin + clientGoal.proteinGoalMax) / 2,
        target_carbs_grams: (clientGoal.carbsGoalMin + clientGoal.carbsGoalMax) / 2,
        target_fat_grams: (clientGoal.fatGoalMin + clientGoal.fatGoalMax) / 2,
        target_fiber_grams: 0,
        dietary_restrictions: dietaryRestrictions,
        cuisine_preferences: cuisinePreferences,
        excluded_recipes: allExcludedRecipes,
        generation_metadata: {
          daysGenerated: days,
          edamamApiCalls: days,
          totalExcludedRecipes: allExcludedRecipes.length,
          generatedAt: new Date().toISOString()
        }
      };
      
      console.log('🔍 DB INSERT: Creating meal plan with duration:', mealPlanData.plan_duration_days);
      
      const { data: mealPlan, error: planError } = await supabase
        .from('meal_plans')
        .insert(mealPlanData)
        .select('id')
        .single();
      
      if (planError || !mealPlan) {
        console.error('❌ DB INSERT: Failed to create meal plan:', {
          error_code: planError?.code,
          error_message: planError?.message,
          error_details: planError?.details,
          error_hint: planError?.hint,
          meal_plan_data: mealPlanData
        });
        throw new Error(`Failed to create multi-day meal plan: ${planError?.message} (${planError?.code})`);
      }
      
      const mealPlanId = mealPlan.id;
      console.log('✅ DB INSERT: Meal plan created with ID:', mealPlanId);
      
      // 8. Insert individual meals for each day
      const mealInserts: any[] = [];
      
      processedDays.forEach((day) => {
        day.meals.forEach((meal: any, mealIndex: number) => {
          // Enhanced validation: Only insert meals that have valid recipes with meaningful nutrition data
          const hasValidRecipe = meal.recipe && 
                                meal.recipe.id && 
                                meal.recipe.nutritionSummary &&
                                meal.recipe.label &&
                                meal.recipe.nutritionSummary.calories > 0;
          
          if (hasValidRecipe) {
            const calories = Math.round(meal.recipe.nutritionSummary.calories || 0);
            const protein = Math.round(meal.recipe.nutritionSummary.protein || 0);
            const carbs = Math.round(meal.recipe.nutritionSummary.carbs || 0);
            const fat = Math.round(meal.recipe.nutritionSummary.fat || 0);
            const fiber = Math.round(meal.recipe.nutritionSummary.fiber || 0);
            
            mealInserts.push({
              meal_plan_id: mealPlanId,
              day_number: day.dayNumber,
              meal_date: day.date,
              meal_type: meal.edamamMealType || 'snack',
              meal_order: mealIndex + 1,
              edamam_recipe_id: meal.recipe.id,
              recipe_name: meal.recipe.label,
              recipe_url: meal.recipe.url || null,
              recipe_image_url: meal.recipe.image || null,
              calories_per_serving: calories,
              protein_grams: protein,
              carbs_grams: carbs,
              fat_grams: fat,
              fiber_grams: fiber,
              servings_per_meal: 1.0,
              total_calories: calories,
              total_protein_grams: protein,
              total_carbs_grams: carbs,
              total_fat_grams: fat,
              total_fiber_grams: fiber,
              ingredients: meal.recipe.ingredients || []
            });
          } else {
            console.log(`⚠️ Skipping meal without valid recipe: Day ${day.dayNumber}, ${meal.mealName} - Recipe: ${meal.recipe ? 'exists' : 'null'}, Calories: ${meal.recipe?.nutritionSummary?.calories || 'N/A'}`);
          }
        });
      });
      
      console.log(`🔍 DB INSERT: Attempting to insert ${mealInserts.length} meals`);
      console.log(`🔍 DB INSERT: First meal data:`, {
        meal_plan_id: mealInserts[0]?.meal_plan_id,
        day_number: mealInserts[0]?.day_number,
        meal_order: mealInserts[0]?.meal_order,
        meal_type: mealInserts[0]?.meal_type,
        recipe_name: mealInserts[0]?.recipe_name,
        calories_per_serving: mealInserts[0]?.calories_per_serving,
        calories_type: typeof mealInserts[0]?.calories_per_serving
      });
      
      const { error: mealsError } = await supabase
        .from('meal_plan_meals')
        .insert(mealInserts);
      
      if (mealsError) {
        console.error('❌ DB INSERT FAILED:', {
          error_code: mealsError.code,
          error_message: mealsError.message,
          error_details: mealsError.details,
          error_hint: mealsError.hint,
          total_meals: mealInserts.length,
          sample_data: mealInserts[0]
        });
        throw new Error(`Failed to save meal plan meals: ${mealsError.message} (${mealsError.code})`);
      }
      
      console.log('🎉 Multi-Day Meal Planning Service - Successfully created multi-day meal plan');
      
      return {
        success: true,
        data: {
          mealPlan: {
            id: mealPlanId,
            planName: `${days}-Day Meal Plan`,
            startDate,
            endDate: endDate.toISOString().split('T')[0],
            days: processedDays,
            totalDays: days
          },
          clientGoals: clientGoal,
          mealProgram: overrideMealProgram || {
            id: mealProgram.id,
            name: mealProgram.name,
            description: mealProgram.description
          },
          dietaryRestrictions,
          cuisinePreferences,
          excludedRecipes: allExcludedRecipes,
          overrideUsed: {
            mealProgram: !!overrideMealProgram,
            clientGoals: !!overrideClientGoals
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Multi-Day Meal Planning Service - Error:', error);
      console.error('❌ Multi-Day Meal Planning Service - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Multi-Day Meal Planning Service - Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : 'Unknown error',
        cause: (error as any).cause
      });
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate multi-day meal plan'
      };
    }
  }

  /**
   * Get meal plan with different view options (consolidated, day-wise, specific day)
   */
  async getMealPlanWithView(mealPlanId: string, view: string = 'consolidated', dayNumber?: number): Promise<any> {
    console.log(`🔍 Getting meal plan ${mealPlanId} with view: ${view}, day: ${dayNumber}`);
    
    try {
      // Check if this is an async meal plan ID (UUID format)
      if (mealPlanId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        // Try to find it in async_meal_plans table first
        const { data: asyncMealPlan, error: asyncError } = await supabase
          .from('async_meal_plans')
          .select('*')
          .eq('id', mealPlanId)
          .single();
        
        if (!asyncError && asyncMealPlan) {
          console.log(`🤖 ASYNC MEAL PLAN DETECTED: ${mealPlanId}, AI Model: ${asyncMealPlan.ai_model}`);
          
          // Handle based on AI model
          if (asyncMealPlan.ai_model === 'claude') {
            return this.handleClaudeAsyncMealPlan(asyncMealPlan, mealPlanId);
          } else {
            return this.handleOpenAIAsyncMealPlan(asyncMealPlan, mealPlanId);
          }
        }
      }

      // Get meal plan basic info
      const { data: mealPlan, error: planError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .single();

      if (planError || !mealPlan) {
        console.log(`❌ MEAL PLAN NOT FOUND: ${mealPlanId}, Error:`, planError);
        return {
          success: false,
          error: 'Meal plan not found'
        };
      }

      console.log(`✅ MEAL PLAN FOUND: ${mealPlan.plan_name}, Duration: ${mealPlan.plan_duration_days} days, Type: ${mealPlan.plan_type}, Status: ${mealPlan.status}`);

      let meals: any[] = [];
      
      // For preview/draft meal plans, get meals from generated_meals JSONB
      if (mealPlan.status === 'draft' && mealPlan.generated_meals) {
        console.log(`🔍 PREVIEW MEAL PLAN: Getting meals from generated_meals field`);
        
        // Parse generated_meals if it's a string
        const generatedMeals = typeof mealPlan.generated_meals === 'string' 
          ? JSON.parse(mealPlan.generated_meals) 
          : mealPlan.generated_meals;
        
        // Convert GeneratedMeal format to meal_plan_meals format for consistency
        if (Array.isArray(generatedMeals)) {
          meals = generatedMeals.map((meal: any, index: number) => ({
            id: meal.id || `preview-meal-${index}`,
            meal_plan_id: mealPlanId,
            day_number: 1, // Preview plans are single-day by default
            meal_order: meal.mealOrder || index,
            meal_type: meal.mealType,
            recipe_name: meal.recipeName,
            recipe_url: meal.recipeUrl,
            recipe_image_url: meal.recipeImageUrl,
            target_calories: meal.targetCalories || meal.totalCalories,
            actual_calories: meal.totalCalories,
            servingsPerMeal: meal.servingsPerMeal || 1,
            protein_grams: meal.totalProtein,
            carbs_grams: meal.totalCarbs,
            fat_grams: meal.totalFat,
            fiber_grams: meal.totalFiber,
            servings: meal.servingsPerMeal || 1,
            ingredients: meal.ingredients,
            nutrition: {
              calories: meal.totalCalories,
              protein: meal.totalProtein,
              carbs: meal.totalCarbs,
              fat: meal.totalFat,
              fiber: meal.totalFiber
            }
          }));
          console.log(`✅ PREVIEW MEALS FOUND: ${meals.length} meals`);
        }
      } else {
        // For saved meal plans, get from meal_plan_meals table
        console.log(`🔍 SAVED MEAL PLAN: Getting meals from meal_plan_meals table`);
        
        let mealsQuery = supabase
          .from('meal_plan_meals')
          .select('*')
          .eq('meal_plan_id', mealPlanId);

        // Add day filter if specific day requested
        if (view === 'day' && dayNumber) {
          mealsQuery = mealsQuery.eq('day_number', dayNumber);
        }

        const { data: mealsData, error: mealsError } = await mealsQuery
          .order('day_number')
          .order('meal_order');

        console.log(`🔍 MEALS QUERY: Found ${mealsData?.length || 0} meals, Error:`, mealsError);

        if (mealsError) {
          return {
            success: false,
            error: 'Failed to fetch meal plan meals'
          };
        }
        
        meals = mealsData || [];
      }

      // Get meal program data for the client to get meal names
      let mealProgramMeals: any[] = [];
      console.log(`🔍 FETCHING MEAL PROGRAM FOR CLIENT: ${mealPlan.client_id}`);
      
      // First get the meal program for this client
      const { data: mealProgram, error: programError } = await supabase
        .from('meal_programs')
        .select('id')
        .eq('client_id', mealPlan.client_id)
        .single();

      if (!programError && mealProgram) {
        // Then get the meal program meals
        const { data: mealProgramData, error: mealsError } = await supabase
          .from('meal_program_meals')
          .select('*')
          .eq('meal_program_id', mealProgram.id)
          .order('meal_order');

        if (!mealsError && mealProgramData) {
          mealProgramMeals = mealProgramData;
          console.log(`✅ MEAL PROGRAM MEALS FOUND: ${mealProgramMeals.length} meals`);
        } else {
          console.log(`⚠️ MEAL PROGRAM MEALS NOT FOUND:`, mealsError);
        }
      } else {
        console.log(`⚠️ MEAL PROGRAM NOT FOUND:`, programError);
      }

      // Get client goals data
      let clientGoals: any = null;
      console.log(`🔍 FETCHING CLIENT GOALS FOR CLIENT: ${mealPlan.client_id}`);
      
      const { data: goalsData, error: goalsError } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', mealPlan.client_id)
        .eq('is_active', true)
        .single();

      if (!goalsError && goalsData) {
        // Convert snake_case to camelCase
        clientGoals = {
          id: goalsData.id,
          clientId: goalsData.client_id,
          isActive: goalsData.is_active,
          eerGoalCalories: goalsData.eer_goal_calories,
          proteinGoalMin: goalsData.protein_goal_min,
          proteinGoalMax: goalsData.protein_goal_max,
          carbsGoalMin: goalsData.carbs_goal_min,
          carbsGoalMax: goalsData.carbs_goal_max,
          fatGoalMin: goalsData.fat_goal_min,
          fatGoalMax: goalsData.fat_goal_max,
          fiberGoalMin: goalsData.fiber_goal_min,
          fiberGoalMax: goalsData.fiber_goal_max,
          createdAt: goalsData.created_at,
          updatedAt: goalsData.updated_at
        };
        console.log(`✅ CLIENT GOALS FOUND:`, clientGoals);
      } else {
        console.log(`⚠️ CLIENT GOALS NOT FOUND:`, goalsError);
      }

      // Format response based on view type
      let responseData: any = {
        mealPlan: {
          id: mealPlan.id,
          clientId: mealPlan.client_id,
          nutritionistId: mealPlan.nutritionist_id,
          planName: mealPlan.plan_name,
          startDate: mealPlan.plan_date,
          endDate: mealPlan.end_date,
          duration: mealPlan.plan_duration_days,
          planType: mealPlan.plan_type,
          status: mealPlan.status,
          targetCalories: mealPlan.target_calories,
          dietaryRestrictions: mealPlan.dietary_restrictions,
          cuisinePreferences: mealPlan.cuisine_preferences,
          excludedRecipes: mealPlan.excluded_recipes,
          generationMetadata: mealPlan.generation_metadata,
          createdAt: mealPlan.created_at
        }
      };

      if (view === 'consolidated') {
        console.log(`🔍 CONSOLIDATED VIEW: Found ${meals.length} meals for meal plan ${mealPlan.id}`);
        
        // For both single-day and multi-day plans, always return days array structure
        const daysArray: any[] = [];
        
        if (meals.length > 0) {
          // Group meals by day number
          const mealsByDay = meals.reduce((acc: any, meal: any) => {
            const dayKey = `day_${meal.day_number}`;
            if (!acc[dayKey]) {
              acc[dayKey] = {
                dayNumber: meal.day_number,
                date: meal.meal_date,
                meals: [],
                dailyNutrition: {
                  totalCalories: 0,
                  totalProtein: 0,
                  totalCarbs: 0,
                  totalFat: 0,
                  totalFiber: 0
                }
              };
            }
            
            // Find corresponding meal program meal name
            const mealProgramMeal = mealProgramMeals.find(mp => mp.meal_order === meal.meal_order);
            const mealName = mealProgramMeal ? mealProgramMeal.meal_name : null;

            const mealData = {
              id: meal.id,
              mealType: meal.meal_type,
              mealOrder: meal.meal_order,
              mealName: mealName, // Add meal program meal name
              recipeName: meal.recipe_name,
              recipeUrl: meal.recipe_url,
              recipeImage: meal.recipe_image_url,
              caloriesPerServing: meal.calories_per_serving || (meal.actual_calories / (meal.servings || 1)),
              totalCalories: meal.actual_calories || meal.total_calories || 0,
              protein: meal.protein_grams || 0,
              carbs: meal.carbs_grams || 0,
              fat: meal.fat_grams || 0,
              fiber: meal.fiber_grams || 0,
              ingredients: meal.ingredients
            };

            acc[dayKey].meals.push(mealData);
            
            // Add to daily nutrition
            acc[dayKey].dailyNutrition.totalCalories += meal.actual_calories || meal.total_calories || 0;
            acc[dayKey].dailyNutrition.totalProtein += meal.protein_grams || 0;
            acc[dayKey].dailyNutrition.totalCarbs += meal.carbs_grams || 0;
            acc[dayKey].dailyNutrition.totalFat += meal.fat_grams || 0;
            acc[dayKey].dailyNutrition.totalFiber += meal.fiber_grams || 0;
            
            return acc;
          }, {});

          daysArray.push(...Object.values(mealsByDay));
        } else {
          // If no meals found, create empty days based on plan duration
          for (let dayNum = 1; dayNum <= mealPlan.plan_duration_days; dayNum++) {
            const dayDate = new Date(mealPlan.plan_date);
            dayDate.setDate(dayDate.getDate() + (dayNum - 1));
            
            daysArray.push({
              dayNumber: dayNum,
              date: dayDate.toISOString().split('T')[0],
              meals: [],
              dailyNutrition: {
                totalCalories: 0,
                totalProtein: 0,
                totalCarbs: 0,
                totalFat: 0,
                totalFiber: 0
              },
              mealCount: 0
            });
          }
        }
        
        // Calculate overall statistics
        const overallStats = {
          totalDays: mealPlan.plan_duration_days,
          totalMeals: meals.length,
          averageMealsPerDay: mealPlan.plan_duration_days > 0 ? meals.length / mealPlan.plan_duration_days : 0,
          totalCalories: daysArray.reduce((sum: number, day: any) => sum + day.dailyNutrition.totalCalories, 0),
          totalProtein: daysArray.reduce((sum: number, day: any) => sum + day.dailyNutrition.totalProtein, 0),
          totalCarbs: daysArray.reduce((sum: number, day: any) => sum + day.dailyNutrition.totalCarbs, 0),
          totalFat: daysArray.reduce((sum: number, day: any) => sum + day.dailyNutrition.totalFat, 0),
          totalFiber: daysArray.reduce((sum: number, day: any) => sum + day.dailyNutrition.totalFiber, 0),
          averageCaloriesPerDay: daysArray.length > 0 ? daysArray.reduce((sum: number, day: any) => sum + day.dailyNutrition.totalCalories, 0) / daysArray.length : 0
        };

        // Also add a flat meals array for backward compatibility
        const allMeals = daysArray.flatMap((day: any) => day.meals);
        responseData.mealPlan.meals = allMeals;
        
        responseData.days = daysArray;
        responseData.overallStats = overallStats;
        responseData.totalDays = mealPlan.plan_duration_days;
        responseData.clientGoals = clientGoals;

      } else if (view === 'day-wise') {
        // Return summary of each day without full meal details
        const daysSummary = meals.reduce((acc: any, meal: any) => {
          const dayKey = `day_${meal.day_number}`;
          if (!acc[dayKey]) {
            acc[dayKey] = {
              dayNumber: meal.day_number,
              date: meal.meal_date,
              mealCount: 0,
              totalCalories: 0,
              mealTypes: []
            };
          }
          
          acc[dayKey].mealCount += 1;
          acc[dayKey].totalCalories += meal.total_calories || 0;
          if (!acc[dayKey].mealTypes.includes(meal.meal_type)) {
            acc[dayKey].mealTypes.push(meal.meal_type);
          }
          
          return acc;
        }, {});

        responseData.daysSummary = Object.values(daysSummary);
        responseData.totalDays = mealPlan.plan_duration_days;

      } else if (view === 'day') {
        // Return specific day details
        if (!dayNumber || dayNumber < 1 || dayNumber > mealPlan.plan_duration_days) {
          return {
            success: false,
            error: 'Invalid day number'
          };
        }

        const dayMeals = meals.map(meal => ({
          id: meal.id,
          mealType: meal.meal_type,
          mealOrder: meal.meal_order,
          recipeName: meal.recipe_name,
          recipeUrl: meal.recipe_url,
          recipeImage: meal.recipe_image_url,
          caloriesPerServing: meal.calories_per_serving,
          totalCalories: meal.total_calories,
          protein: meal.protein_grams,
          carbs: meal.carbs_grams,
          servingsPerMeal: meal.servingsPerMeal || 1,
          fat: meal.fat_grams,
          fiber: meal.fiber_grams,
          ingredients: meal.ingredients
        }));

        const dailyNutrition = {
          totalCalories: meals.reduce((sum, meal) => sum + (meal.total_calories || 0), 0),
          totalProtein: meals.reduce((sum, meal) => sum + (meal.total_protein_grams || 0), 0),
          totalCarbs: meals.reduce((sum, meal) => sum + (meal.total_carbs_grams || 0), 0),
          totalFat: meals.reduce((sum, meal) => sum + (meal.total_fat_grams || 0), 0),
          totalFiber: meals.reduce((sum, meal) => sum + (meal.total_fiber_grams || 0), 0)
        };

        responseData.days = [{
          dayNumber,
          date: meals[0]?.meal_date,
          meals: dayMeals,
          dailyNutrition,
          mealCount: dayMeals.length
        }];
      }

      return {
        success: true,
        data: responseData
      };

    } catch (error) {
      console.error('❌ Error getting meal plan with view:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Convert ingredient text to grams-based format for consistency
   */
  private convertIngredientToGrams(text: string, weight: number): string {
    if (!text || !weight) return text;
    
    // Remove leading asterisk and whitespace
    const cleanText = text.replace(/^\*\s*/, '').trim();
    
    // Extract the food name (remove only the quantity/measure at the beginning, keep the full food description)
    // Handle fractions like "1/2 cup", "1 1/2 tablespoons", etc.
    const foodMatch = cleanText.match(/^(?:\d+(?:\s+\d+\/\d+|\.\d+|\/\d+)?\s*(?:cups?|tablespoons?|teaspoons?|ounces?|lbs?|pounds?|whole|medium|large|small)?\s*(?:of\s+)?)\s*(.+?)(?:\s*\([^)]*\))?$/i);
    const foodName = foodMatch ? foodMatch[1].trim() : cleanText;
    
    // Convert to grams format, preserving the full food description
    const gramsText = `${Math.round(weight)}g ${foodName}`;
    
    console.log(`🔧 Converted to grams: "${text}" → "${gramsText}"`);
    return gramsText;
  }
  
  /**
   * Extract full food name from ingredient text (preserving cuts/preparations)
   */
  private extractFoodName(text: string): string {
    if (!text) return text;
    
    // Remove leading asterisk and whitespace
    const cleanText = text.replace(/^\*\s*/, '').trim();
    
    // Extract the food name (remove weight and measure at the beginning)
    const foodMatch = cleanText.match(/(?:\d+\s*(?:g|grams?|cups?|tablespoons?|teaspoons?|ounces?|lbs?|pounds?|whole|medium|large|small)?\s*(?:of\s+)?)\s*(.+?)(?:\s*\([^)]*\))?$/i);
    return foodMatch ? foodMatch[1].trim() : cleanText;
  }

  /**
   * Normalize ingredient text to improve Edamam parsing consistency
   */
  private normalizeIngredientText(text: string): string {
    if (!text) return text;
    
    // Remove leading asterisk and whitespace
    let normalized = text.replace(/^\*\s*/, '').trim();
    
    // Standardize weight formats: "gram" → "g", "grams" → "g"
    normalized = normalized.replace(/(\d+)\s*grams?\b/gi, '$1g');
    
    // Standardize food names to include proper cuts/preparations for consistency
    normalized = normalized
      // "792g salmon" → "792g salmon fillets" (add fillets if missing)
      .replace(/(\d+g)\s+salmon(?!\s+fillet)/gi, '$1 salmon fillets')
      // "200g chicken" → "200g chicken breast" (add breast if missing)
      .replace(/(\d+g)\s+chicken(?!\s+breast)/gi, '$1 chicken breast')
      // "300g beef" → "300g beef steak" (add steak if missing)
      .replace(/(\d+g)\s+beef(?!\s+steak)/gi, '$1 beef steak')
      // "250g pork" → "250g pork chop" (add chop if missing)
      .replace(/(\d+g)\s+pork(?!\s+chop)/gi, '$1 pork chop')
    
    console.log(`🔧 Normalized ingredient: "${text}" → "${normalized}"`);
    return normalized;
  }

  /**
   * Helper method to calculate daily nutrition totals
   */
  private calculateDailyNutrition(meals: any[]): any {
    const dailyNutrition = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSodium: 0,
      totalSugar: 0,
      totalCholesterol: 0,
      totalCalcium: 0,
      totalIron: 0
    };

    meals.forEach(meal => {
      // Use direct meal nutrition fields
      dailyNutrition.totalCalories += meal.totalCalories || 0;
      dailyNutrition.totalProtein += meal.protein || 0;
      dailyNutrition.totalCarbs += meal.carbs || 0;
      dailyNutrition.totalFat += meal.fat || 0;
      dailyNutrition.totalFiber += meal.fiber || 0;
      dailyNutrition.totalSodium += meal.sodium || 0;
      dailyNutrition.totalSugar += meal.sugar || 0;
      dailyNutrition.totalCholesterol += meal.cholesterol || 0;
      dailyNutrition.totalCalcium += meal.calcium || 0;
      dailyNutrition.totalIron += meal.iron || 0;
    });

    return {
      totalCalories: Math.round(dailyNutrition.totalCalories * 100) / 100,
      totalProtein: Math.round(dailyNutrition.totalProtein * 100) / 100,
      totalCarbs: Math.round(dailyNutrition.totalCarbs * 100) / 100,
      totalFat: Math.round(dailyNutrition.totalFat * 100) / 100,
      totalFiber: Math.round(dailyNutrition.totalFiber * 100) / 100,
      totalSodium: Math.round(dailyNutrition.totalSodium * 100) / 100,
      totalSugar: Math.round(dailyNutrition.totalSugar * 100) / 100,
      totalCholesterol: Math.round(dailyNutrition.totalCholesterol * 100) / 100,
      totalCalcium: Math.round(dailyNutrition.totalCalcium * 100) / 100,
      totalIron: Math.round(dailyNutrition.totalIron * 100) / 100
    };
  }

  /**
   * Generate meal plan based on client's meal program and goals with UI overrides
   */
  async generateMealPlanFromProgramWithOverrides(
    clientId: string,
    planDate: string,
    dietaryRestrictions: string[],
    cuisinePreferences: string[],
    userId: string,
    overrideMealProgram?: any,
    overrideClientGoals?: any
  ): Promise<any> {
    console.log('🎯 Meal Planning Service - Generating meal plan with overrides for client:', clientId);
    console.log('🎯 Override Meal Program:', JSON.stringify(overrideMealProgram, null, 2));
    console.log('🎯 Override Client Goals:', JSON.stringify(overrideClientGoals, null, 2));
    
    try {
      const clientGoalsService = new ClientGoalsService();
      const mealProgramMappingService = new MealProgramMappingService();
      
      // 1. Get client's active goals (or use override)
      let clientGoal;
      if (overrideClientGoals) {
        // Use override client goals from UI
        clientGoal = overrideClientGoals;
        console.log('🎯 Meal Planning Service - Using override client goals');
      } else {
        // Get from database
        const goalsResponse = await clientGoalsService.getActiveClientGoal(clientId, userId);
        if (!goalsResponse.success || !goalsResponse.data) {
          throw new Error('No active client goals found and no override provided. Please set client goals first.');
        }
        clientGoal = goalsResponse.data;
        console.log('🎯 Meal Planning Service - Using database client goals');
      }
      
      console.log('🎯 Meal Planning Service - Client goals:', JSON.stringify(clientGoal, null, 2));
      
      // 2. Get client's active meal program (or use override)
      let mealProgram;
      if (overrideMealProgram) {
        // Use override meal program from UI
        mealProgram = {
          id: 'override',
          client_id: clientId,
          nutritionist_id: userId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          meals: overrideMealProgram.meals.map((meal: any, index: number) => ({
            id: `override_${index}`,
            meal_program_id: 'override',
            meal_order: meal.mealOrder || index + 1,
            meal_name: meal.mealName,
            meal_time: meal.mealTime,
            target_calories: meal.targetCalories,
            meal_type: meal.mealType,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }))
        };
        console.log('🎯 Meal Planning Service - Using override meal program');
      } else {
        // Get from database
        const { data: dbMealProgram, error: programError } = await supabase
          .from('meal_programs')
          .select(`
            *,
            meals:meal_program_meals(*)
          `)
          .eq('client_id', clientId)
          .single();
        
        if (programError || !dbMealProgram) {
          throw new Error('No meal program found and no override provided. Please create a meal program first.');
        }
        mealProgram = dbMealProgram;
        console.log('🎯 Meal Planning Service - Using database meal program');
      }
      
      console.log('🎯 Meal Planning Service - Meal program:', JSON.stringify(mealProgram, null, 2));
      
      // 3. Calculate meal distribution based on goals and program
      const mealDistribution = mealProgramMappingService.calculateMealDistribution(
        clientGoal,
        {
          id: mealProgram.id,
          clientId: mealProgram.client_id,
          nutritionistId: mealProgram.nutritionist_id,
          createdAt: mealProgram.created_at,
          updatedAt: mealProgram.updated_at,
          meals: mealProgram.meals.map((meal: any) => ({
            id: meal.id,
            mealProgramId: meal.meal_program_id,
            mealOrder: meal.meal_order,
            mealName: meal.meal_name,
            mealTime: meal.meal_time,
            targetCalories: meal.target_calories,
            mealType: meal.meal_type,
            createdAt: meal.created_at,
            updatedAt: meal.updated_at
          }))
        }
      );
      
      console.log('🎯 Meal Planning Service - Meal distribution:', JSON.stringify(mealDistribution, null, 2));
      
      // 4. Create Edamam meal plan request
      const edamamRequest = mealProgramMappingService.createEdamamMealPlanRequest(
        mealDistribution,
        dietaryRestrictions,
        cuisinePreferences,
        clientGoal,
        undefined // No individual meal overrides since we're using program/goal overrides
      );
      
      console.log('🚨🚨🚨 MEAL PLANNING - EDAMAM REQUEST WITH OVERRIDES 🚨🚨🚨');
      console.log('🚨 MEAL PLANNING - EDAMAM REQUEST BODY:', JSON.stringify(edamamRequest, null, 2));
      console.log('🚨🚨🚨 MEAL PLANNING - EDAMAM REQUEST END 🚨🚨🚨');
      
      // 5. Call Edamam API
      console.log('🚨🚨🚨 MEAL PLANNING - CALLING EDAMAM API 🚨🚨🚨');
      console.log('🚨 MEAL PLANNING - About to call Edamam with request above');
      const edamamResponse = await this.edamamService.generateMealPlanV1(edamamRequest, undefined);
      console.log('🚨🚨🚨 MEAL PLANNING - EDAMAM API CALL COMPLETED 🚨🚨🚨');
      console.log('🚨 MEAL PLANNING - EDAMAM RESPONSE RECEIVED:', JSON.stringify(edamamResponse, null, 2));
      
      // 6. Map response back to meal program structure
      console.log('🎯 Meal Planning Service - ===== MAPPING EDAMAM RESPONSE =====');
      const mappedResponse = mealProgramMappingService.mapEdamamResponseToMealProgram(
        edamamResponse,
        mealDistribution
      );
      console.log('🎯 Meal Planning Service - Mapped response:', JSON.stringify(mappedResponse, null, 2));
      console.log('🎯 Meal Planning Service - ===== END MAPPING =====');
      
      // 7. Fetch recipe details for each meal that has a recipe URI (in parallel for speed)
      console.log('🎯 Meal Planning Service - Fetching recipe details for meals in parallel...');
      const recipeFetchPromises = mappedResponse.meals
        .filter(meal => meal.recipe?.uri)
        .map(async (meal) => {
          try {
            console.log(`🎯 Meal Planning Service - Fetching details for meal: ${meal.mealName} (Order: ${meal.mealOrder || 'N/A'})`);
            const recipeDetails = await this.edamamService.getRecipeDetails(meal.recipe.uri, userId);
            
            // getRecipeDetails already returns the recipe object directly, not wrapped
            if (recipeDetails) {
              const recipe = recipeDetails;
              const servings = recipe.yield || 1;
              
              meal.recipe = {
                ...(meal.recipe as object),  // Type assertion to allow spread
                ...(recipe as object),       // Type assertion to allow spread
                nutritionSummary: {
                  calories: Math.round((recipe.calories || 0) / servings * 100) / 100,
                  protein: Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / servings * 100) / 100,
                  carbs: Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / servings * 100) / 100,
                  fat: Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / servings * 100) / 100,
                  fiber: Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / servings * 100) / 100,
                  sodium: Math.round((recipe.totalNutrients?.NA?.quantity || 0) / servings * 100) / 100,
                  sugar: Math.round((recipe.totalNutrients?.SUGAR?.quantity || 0) / servings * 100) / 100,
                  servings: servings
                }
              };
              // Remove the now redundant 'details' if it was set
              delete meal.recipe.details;
            } else {
              meal.recipe.error = 'Failed to fetch recipe details';
            }
            
            console.log(`✅ Meal Planning Service - Recipe details fetched and flattened for: ${meal.mealName}`);
          } catch (error) {
            console.error(`❌ Meal Planning Service - Failed to fetch recipe details for ${meal.mealName}:`, error);
            meal.recipe.error = 'Failed to fetch recipe details';
          }
        });
      
      // Wait for all recipe fetches to complete
      if (recipeFetchPromises.length > 0) {
        console.log(`🎯 Meal Planning Service - Waiting for ${recipeFetchPromises.length} recipe fetches to complete...`);
        await Promise.all(recipeFetchPromises);
        console.log('✅ Meal Planning Service - All recipe fetches completed');
      } else {
        console.log('🎯 Meal Planning Service - No recipes to fetch details for');
      }
      
      // Calculate consolidated daily nutrition totals AFTER all recipe details have been fetched
      console.log('🎯 Meal Planning Service - ===== CALCULATING DAILY NUTRITION =====');
      const dailyNutrition = {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
        totalSodium: 0,
        totalSugar: 0,
        totalCholesterol: 0,
        totalCalcium: 0,
        totalIron: 0
      };

      // Calculate totals from actual recipe nutrition (now that details are populated)
      mappedResponse.meals.forEach(meal => {
        console.log(`🎯 Meal Planning Service - Processing meal: ${meal.mealName}`);
        console.log(`🎯 Meal Planning Service - Has recipe: ${!!meal.recipe}`);
        
        if (meal.recipe && meal.recipe.totalNutrients) {  // Use flattened structure
          const recipe = meal.recipe;
          const servings = recipe.yield || 1;
          const perServingCalories = (recipe.calories || 0) / servings;
          const perServingProtein = (recipe.totalNutrients?.PROCNT?.quantity || 0) / servings;
          const perServingCarbs = (recipe.totalNutrients?.CHOCDF?.quantity || 0) / servings;
          const perServingFat = (recipe.totalNutrients?.FAT?.quantity || 0) / servings;
          const perServingFiber = (recipe.totalNutrients?.FIBTG?.quantity || 0) / servings;
          const perServingSodium = (recipe.totalNutrients?.NA?.quantity || 0) / servings;
          const perServingSugar = (recipe.totalNutrients?.SUGAR?.quantity || 0) / servings;
          const perServingCholesterol = (recipe.totalNutrients?.CHOLE?.quantity || 0) / servings;
          const perServingCalcium = (recipe.totalNutrients?.CA?.quantity || 0) / servings;
          const perServingIron = (recipe.totalNutrients?.FE?.quantity || 0) / servings;

          console.log(`🎯 Meal Planning Service - Per-serving values for ${meal.mealName}:`);
          console.log(`  - Calories: ${perServingCalories}`);
          console.log(`  - Protein: ${perServingProtein}g`);
          console.log(`  - Carbs: ${perServingCarbs}g`);
          console.log(`  - Fat: ${perServingFat}g`);
          console.log(`  - Fiber: ${perServingFiber}g`);
          
          dailyNutrition.totalCalories += perServingCalories;
          dailyNutrition.totalProtein += perServingProtein;
          dailyNutrition.totalCarbs += perServingCarbs;
          dailyNutrition.totalFat += perServingFat;
          dailyNutrition.totalFiber += perServingFiber;
          dailyNutrition.totalSodium += perServingSodium;
          dailyNutrition.totalSugar += perServingSugar;
          dailyNutrition.totalCholesterol += perServingCholesterol;
          dailyNutrition.totalCalcium += perServingCalcium;
          dailyNutrition.totalIron += perServingIron;
          
          console.log(`🎯 Meal Planning Service - Added nutrition from ${meal.mealName}: Calories=${perServingCalories}, Protein=${perServingProtein}, Carbs=${perServingCarbs}, Fat=${perServingFat}`);
        } else {
          // Use meal distribution estimates for meals without recipes
          dailyNutrition.totalCalories += meal.targetCalories || 0;
          console.log(`🎯 Meal Planning Service - Added estimated calories from ${meal.mealName}: ${meal.targetCalories || 0}`);
        }
      });

      // Add dailyNutrition to the mappedResponse
      mappedResponse.dailyNutrition = {
        ...dailyNutrition,
        totalCalories: Math.round(dailyNutrition.totalCalories * 100) / 100,
        totalProtein: Math.round(dailyNutrition.totalProtein * 100) / 100,
        totalCarbs: Math.round(dailyNutrition.totalCarbs * 100) / 100,
        totalFat: Math.round(dailyNutrition.totalFat * 100) / 100,
        totalFiber: Math.round(dailyNutrition.totalFiber * 100) / 100,
        totalSodium: Math.round(dailyNutrition.totalSodium * 100) / 100,
        totalSugar: Math.round(dailyNutrition.totalSugar * 100) / 100,
        totalCholesterol: Math.round(dailyNutrition.totalCholesterol * 100) / 100,
        totalCalcium: Math.round(dailyNutrition.totalCalcium * 100) / 100,
        totalIron: Math.round(dailyNutrition.totalIron * 100) / 100
      };
      
      console.log('🎯 Meal Planning Service - Final daily nutrition totals:', JSON.stringify(mappedResponse.dailyNutrition, null, 2));
      console.log('🎯 Meal Planning Service - ===== END CALCULATING DAILY NUTRITION =====');
      
      // Convert meals to GeneratedMeal format for consistency with saved meal plans
      console.log('🎯 Meal Planning Service - Converting to GeneratedMeal format...');
      const generatedMeals = mappedResponse.meals.map((meal: any) => {
        const recipe = meal.recipe;
        const servings = recipe?.yield || 1;
        const mealOrder = parseInt(meal.mealKey?.split('_')[1]) || 1;
        
        // Calculate scale factor based on target calories vs recipe total calories
        const targetCalories = meal.targetCalories || 1000;
        const recipeCalories = recipe?.calories || 4000;
        const scaleFactor = targetCalories / recipeCalories;
        
        console.log(`🔍 MEAL SCALING DEBUG for ${meal.mealName}:`, {
          targetCalories,
          recipeCalories,
          scaleFactor,
          servings
        });
        
        return {
          id: `meal-${meal.mealKey || mealOrder}`,
          mealType: meal.edamamMealType || meal.mealName,
          mealOrder: mealOrder,
          recipeName: recipe?.label || meal.mealName,
          recipeUrl: recipe?.url || '',
          recipeImageUrl: recipe?.image || '',
          caloriesPerServing: Math.round((recipe?.calories || 0) / servings * 100) / 100,
          proteinGrams: Math.round((recipe?.totalNutrients?.PROCNT?.quantity || 0) * scaleFactor * 100) / 100,
          carbsGrams: Math.round((recipe?.totalNutrients?.CHOCDF?.quantity || 0) * scaleFactor * 100) / 100,
          fatGrams: Math.round((recipe?.totalNutrients?.FAT?.quantity || 0) * scaleFactor * 100) / 100,
          fiberGrams: Math.round((recipe?.totalNutrients?.FIBTG?.quantity || 0) * scaleFactor * 100) / 100,
          servingsPerMeal: servings,
          totalCalories: targetCalories,
          totalProtein: Math.round((recipe?.totalNutrients?.PROCNT?.quantity || 0) * scaleFactor * 100) / 100,
          totalCarbs: Math.round((recipe?.totalNutrients?.CHOCDF?.quantity || 0) * scaleFactor * 100) / 100,
          totalFat: Math.round((recipe?.totalNutrients?.FAT?.quantity || 0) * scaleFactor * 100) / 100,
          totalFiber: Math.round((recipe?.totalNutrients?.FIBTG?.quantity || 0) * scaleFactor * 100) / 100,
        ingredients: recipe?.ingredients?.map((ing: any) => {
          // Scale ingredients by calorie ratio (target calories / recipe calories)
          const scaledWeight = (ing.weight || 0) * scaleFactor;
          return {
            text: this.convertIngredientToGrams(ing.text, scaledWeight),
            quantity: Math.round(scaledWeight),
            measure: 'gram',
            food: ing.food || this.extractFoodName(ing.text),
            weight: scaledWeight,
            calories: ing.nutrients?.ENERC_KCAL?.quantity,
            protein: ing.nutrients?.PROCNT?.quantity,
            carbs: ing.nutrients?.CHOCDF?.quantity,
            fat: ing.nutrients?.FAT?.quantity,
            fiber: ing.nutrients?.FIBTG?.quantity
          };
        }) || (recipe?.ingredientLines?.map((line: string) => ({
            text: line,
            quantity: 1,
            measure: 'serving',
            food: line,
            weight: 0
          })) || []),
          edamamRecipeId: recipe?.uri || ''
        };
      });
      
      console.log('🎯 Meal Planning Service - Generated meals format:', JSON.stringify(generatedMeals, null, 2));
      
      // Insert as draft meal plan
      const insertData = {
        client_id: clientId,
        nutritionist_id: userId,
        // meal_program_id: mealProgram.id !== 'override' ? mealProgram.id : null, // Remove this column as it doesn't exist
        plan_name: 'Preview Meal Plan',
        plan_date: planDate,
        plan_type: 'daily',
        status: 'draft',
        target_calories: clientGoal.eerGoalCalories,
        target_protein_grams: (clientGoal.proteinGoalMin + clientGoal.proteinGoalMax) / 2,
        target_carbs_grams: (clientGoal.carbsGoalMin + clientGoal.carbsGoalMax) / 2,
        target_fat_grams: (clientGoal.fatGoalMin + clientGoal.fatGoalMax) / 2,
        target_fiber_grams: 0, // Add if available
        dietary_restrictions: dietaryRestrictions,
        cuisine_preferences: cuisinePreferences,
        generated_meals: generatedMeals, // Store meals in GeneratedMeal format
        nutrition_summary: mappedResponse.dailyNutrition
      };

      console.log('🚨🚨🚨 ATTEMPTING SUPABASE INSERT 🚨🚨🚨');
      console.log('🚨 Insert data keys:', Object.keys(insertData));
      console.log('🚨 Generated meals count:', mappedResponse.meals?.length || 0);
      console.log('🚨 Generated meals size (approx):', JSON.stringify(mappedResponse.meals).length, 'characters');
      console.log('🚨 Nutrition summary:', JSON.stringify(mappedResponse.dailyNutrition, null, 2));
      console.log('🚨 Full insert data size (approx):', JSON.stringify(insertData).length, 'characters');
      console.log('🚨🚨🚨 END DEBUGGING SUPABASE INSERT 🚨🚨🚨');

      const { data: draftPlan, error: draftError } = await supabase
        .from('meal_plans')
        .insert(insertData)
        .select('id')
        .single();

      if (draftError || !draftPlan) {
        console.error('❌ Meal Planning Service - Draft creation error:', JSON.stringify(draftError, null, 2));
        console.error('❌ Meal Planning Service - Error details:', draftError);
        throw new Error(`Failed to create draft preview: ${JSON.stringify(draftError)}`);
      }

      const previewId = draftPlan.id;
      console.log('🎯 Meal Planning Service - Created draft preview with ID:', previewId);

      // Add previewId to response
      mappedResponse.previewId = previewId;
      console.log('🎯 Meal Planning Service - Added previewId to mappedResponse:', mappedResponse.previewId);

      // Create days array structure for consistency with saved meal plans
      const daysArray = [{
        dayNumber: 1,
        date: planDate,
        meals: generatedMeals,
        dailyNutrition: mappedResponse.dailyNutrition
      }];
      
      // Add days array to mappedResponse
      mappedResponse.days = daysArray;
      
      // Remove the meals property from mappedResponse to avoid duplication
      const { meals: _, ...mappedResponseWithoutMeals } = mappedResponse;
      
      return {
        success: true,
        data: {
          mealPlan: {
            ...mappedResponseWithoutMeals
          },
          clientGoals: clientGoal,
          mealProgram: overrideMealProgram || {
            id: mealProgram.id,
            name: mealProgram.name,
            description: mealProgram.description
          },
          planDate,
          dietaryRestrictions,
          cuisinePreferences,
          overrideUsed: {
            mealProgram: !!overrideMealProgram,
            clientGoals: !!overrideClientGoals
          }
        }
      };
      
    } catch (error) {
      console.error('❌ Meal Planning Service - Error generating meal plan with overrides:', error);
      console.error('❌ Meal Planning Service - Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('❌ Meal Planning Service - Error details:', JSON.stringify(error, null, 2));
      console.error('❌ Meal Planning Service - Client ID:', clientId);
      console.error('❌ Meal Planning Service - Plan Date:', planDate);
      console.error('❌ Meal Planning Service - User ID:', userId);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate meal plan with overrides'
      };
    }
  }

  /**
   * Generate meal plan based on client's meal program and goals
   */
  async generateMealPlanFromProgram(
    clientId: string,
    planDate: string,
    dietaryRestrictions: string[],
    cuisinePreferences: string[],
    uiOverrideMeals?: any[], // Allow UI to override meal calories
    userId?: string
  ): Promise<any> {
    console.log('🎯 Meal Planning Service - Generating meal plan from program for client:', clientId);
    
    try {
      const clientGoalsService = new ClientGoalsService();
      const mealProgramMappingService = new MealProgramMappingService();
      
      // 1. Get client's active goals
      const goalsResponse = await clientGoalsService.getActiveClientGoal(clientId, userId!);
      if (!goalsResponse.success || !goalsResponse.data) {
        throw new Error('No active client goals found. Please set client goals first.');
      }
      
      const clientGoal = goalsResponse.data;
      console.log('🎯 Meal Planning Service - Client goals:', JSON.stringify(clientGoal, null, 2));
      
      // 1.5. Get cuisine types from client goals and merge with request preferences
      const clientGoalsCuisineTypes = mapCuisineTypesForEdamam(clientGoal.cuisineTypes);
      const clientGoalsHealthLabels = mergeAllergiesAndPreferencesForEdamam(
        clientGoal.allergies,
        clientGoal.preferences
      );
      
      // Merge cuisine preferences: client goals take precedence
      const finalCuisinePreferences = clientGoalsCuisineTypes.length > 0 
        ? clientGoalsCuisineTypes 
        : cuisinePreferences;
      
      // Merge dietary restrictions: combine request + client goals
      const finalDietaryRestrictions = [
        ...dietaryRestrictions,
        ...clientGoalsHealthLabels
      ].filter((value, index, self) => self.indexOf(value) === index); // Remove duplicates
      
      console.log('🎯 Meal Planning Service - Final cuisine preferences:', finalCuisinePreferences);
      console.log('🎯 Meal Planning Service - Final dietary restrictions:', finalDietaryRestrictions);
      
      // 2. Get client's active meal program
      const { data: mealProgram, error: programError } = await supabase
        .from('meal_programs')
        .select(`
          *,
          meals:meal_program_meals(*)
        `)
        .eq('client_id', clientId)
        .single();
      
      if (programError || !mealProgram) {
        throw new Error('No meal program found. Please create a meal program first.');
      }
      
      console.log('🎯 Meal Planning Service - Meal program:', JSON.stringify(mealProgram, null, 2));
      
      // 3. Calculate meal distribution based on goals and program
      const mealDistribution = mealProgramMappingService.calculateMealDistribution(
        clientGoal,
        {
          id: mealProgram.id,
          clientId: mealProgram.client_id,
          nutritionistId: mealProgram.nutritionist_id,
          createdAt: mealProgram.created_at,
          updatedAt: mealProgram.updated_at,
          meals: mealProgram.meals.map((meal: any) => ({
            id: meal.id,
            mealProgramId: meal.meal_program_id,
            mealOrder: meal.meal_order,
            mealName: meal.meal_name,
            mealTime: meal.meal_time,
            targetCalories: meal.target_calories,
            mealType: meal.meal_type,
            createdAt: meal.created_at,
            updatedAt: meal.updated_at
          }))
        }
      );
      
      console.log('🎯 Meal Planning Service - Meal distribution:', JSON.stringify(mealDistribution, null, 2));
      
      // 4. Create Edamam meal plan request
      const edamamRequest = mealProgramMappingService.createEdamamMealPlanRequest(
        mealDistribution,
        finalDietaryRestrictions,
        finalCuisinePreferences,
        clientGoal,
        uiOverrideMeals
      );
      
      console.log('🚨🚨🚨 MEAL PLANNING - EDAMAM REQUEST 🚨🚨🚨');
      console.log('🚨 MEAL PLANNING - EDAMAM REQUEST BODY:', JSON.stringify(edamamRequest, null, 2));
      console.log('🚨🚨🚨 MEAL PLANNING - EDAMAM REQUEST END 🚨🚨🚨');
      
      // 5. Call Edamam API
      console.log('🚨🚨🚨 MEAL PLANNING - CALLING EDAMAM API 🚨🚨🚨');
      console.log('🚨 MEAL PLANNING - About to call Edamam with request above');
      const edamamResponse = await this.edamamService.generateMealPlanV1(edamamRequest, undefined);
      console.log('🚨🚨🚨 MEAL PLANNING - EDAMAM API CALL COMPLETED 🚨🚨🚨');
      console.log('🚨 MEAL PLANNING - EDAMAM RESPONSE RECEIVED:', JSON.stringify(edamamResponse, null, 2));
      
      // 6. Map response back to meal program structure
      console.log('🎯 Meal Planning Service - ===== MAPPING EDAMAM RESPONSE =====');
      const mappedResponse = mealProgramMappingService.mapEdamamResponseToMealProgram(
        edamamResponse,
        mealDistribution
      );
      console.log('🎯 Meal Planning Service - Mapped response:', JSON.stringify(mappedResponse, null, 2));
      console.log('🎯 Meal Planning Service - ===== END MAPPING =====');
      
      // 7. Fetch recipe details for each meal that has a recipe URI (in parallel for speed)
      console.log('🎯 Meal Planning Service - Fetching recipe details for meals in parallel...');
      const recipeFetchPromises = mappedResponse.meals
        .filter(meal => meal.recipe?.uri)
        .map(async (meal) => {
          try {
            console.log(`🎯 Meal Planning Service - Fetching details for meal: ${meal.mealName} (Order: ${meal.mealOrder || 'N/A'})`);
            const recipeDetails = await this.edamamService.getRecipeDetails(meal.recipe.uri, userId);
            
            // getRecipeDetails already returns the recipe object directly, not wrapped
            if (recipeDetails) {
              const recipe = recipeDetails;
              const servings = recipe.yield || 1;
              
              meal.recipe = {
                ...(meal.recipe as object),  // Type assertion to allow spread
                ...(recipe as object),       // Type assertion to allow spread
                nutritionSummary: {
                  calories: Math.round((recipe.calories || 0) / servings * 100) / 100,
                  protein: Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / servings * 100) / 100,
                  carbs: Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / servings * 100) / 100,
                  fat: Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / servings * 100) / 100,
                  fiber: Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / servings * 100) / 100,
                  sodium: Math.round((recipe.totalNutrients?.NA?.quantity || 0) / servings * 100) / 100,
                  sugar: Math.round((recipe.totalNutrients?.SUGAR?.quantity || 0) / servings * 100) / 100,
                  servings: servings
                }
              };
              // Remove the now redundant 'details' if it was set
              delete meal.recipe.details;
            } else {
              meal.recipe.error = 'Failed to fetch recipe details';
            }
            
            console.log(`✅ Meal Planning Service - Recipe details fetched and flattened for: ${meal.mealName}`);
          } catch (error) {
            console.error(`❌ Meal Planning Service - Failed to fetch recipe details for ${meal.mealName}:`, error);
            meal.recipe.error = 'Failed to fetch recipe details';
          }
        });
      
      // Wait for all recipe fetches to complete
      if (recipeFetchPromises.length > 0) {
        console.log(`🎯 Meal Planning Service - Waiting for ${recipeFetchPromises.length} recipe fetches to complete...`);
        await Promise.all(recipeFetchPromises);
        console.log('✅ Meal Planning Service - All recipe fetches completed');
      } else {
        console.log('🎯 Meal Planning Service - No recipes to fetch details for');
      }
      
      // Calculate consolidated daily nutrition totals AFTER all recipe details have been fetched
      console.log('🎯 Meal Planning Service - ===== CALCULATING DAILY NUTRITION =====');
      const dailyNutrition = {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
        totalSodium: 0,
        totalSugar: 0,
        totalCholesterol: 0,
        totalCalcium: 0,
        totalIron: 0
      };

      // Calculate totals from actual recipe nutrition (now that details are populated)
      mappedResponse.meals.forEach(meal => {
        console.log(`🎯 Meal Planning Service - Processing meal: ${meal.mealName}`);
        console.log(`🎯 Meal Planning Service - Has recipe: ${!!meal.recipe}`);
        
        if (meal.recipe && meal.recipe.totalNutrients) {  // Use flattened structure
          const recipe = meal.recipe;
          const servings = recipe.yield || 1;
          const perServingCalories = (recipe.calories || 0) / servings;
          const perServingProtein = (recipe.totalNutrients?.PROCNT?.quantity || 0) / servings;
          const perServingCarbs = (recipe.totalNutrients?.CHOCDF?.quantity || 0) / servings;
          const perServingFat = (recipe.totalNutrients?.FAT?.quantity || 0) / servings;
          const perServingFiber = (recipe.totalNutrients?.FIBTG?.quantity || 0) / servings;
          const perServingSodium = (recipe.totalNutrients?.NA?.quantity || 0) / servings;
          const perServingSugar = (recipe.totalNutrients?.SUGAR?.quantity || 0) / servings;
          const perServingCholesterol = (recipe.totalNutrients?.CHOLE?.quantity || 0) / servings;
          const perServingCalcium = (recipe.totalNutrients?.CA?.quantity || 0) / servings;
          const perServingIron = (recipe.totalNutrients?.FE?.quantity || 0) / servings;

          console.log(`🎯 Meal Planning Service - Per-serving values for ${meal.mealName}:`);
          console.log(`  - Calories: ${perServingCalories}`);
          console.log(`  - Protein: ${perServingProtein}g`);
          console.log(`  - Carbs: ${perServingCarbs}g`);
          console.log(`  - Fat: ${perServingFat}g`);
          console.log(`  - Fiber: ${perServingFiber}g`);
          
          dailyNutrition.totalCalories += perServingCalories;
          dailyNutrition.totalProtein += perServingProtein;
          dailyNutrition.totalCarbs += perServingCarbs;
          dailyNutrition.totalFat += perServingFat;
          dailyNutrition.totalFiber += perServingFiber;
          dailyNutrition.totalSodium += perServingSodium;
          dailyNutrition.totalSugar += perServingSugar;
          dailyNutrition.totalCholesterol += perServingCholesterol;
          dailyNutrition.totalCalcium += perServingCalcium;
          dailyNutrition.totalIron += perServingIron;
          
          console.log(`🎯 Meal Planning Service - Added nutrition from ${meal.mealName}: Calories=${perServingCalories}, Protein=${perServingProtein}, Carbs=${perServingCarbs}, Fat=${perServingFat}`);
        } else {
          // Use meal distribution estimates for meals without recipes
          dailyNutrition.totalCalories += meal.targetCalories || 0;
          console.log(`🎯 Meal Planning Service - Added estimated calories from ${meal.mealName}: ${meal.targetCalories || 0}`);
        }
      });

      // Add dailyNutrition to the mappedResponse
      mappedResponse.dailyNutrition = {
        ...dailyNutrition,
        totalCalories: Math.round(dailyNutrition.totalCalories * 100) / 100,
        totalProtein: Math.round(dailyNutrition.totalProtein * 100) / 100,
        totalCarbs: Math.round(dailyNutrition.totalCarbs * 100) / 100,
        totalFat: Math.round(dailyNutrition.totalFat * 100) / 100,
        totalFiber: Math.round(dailyNutrition.totalFiber * 100) / 100,
        totalSodium: Math.round(dailyNutrition.totalSodium * 100) / 100,
        totalSugar: Math.round(dailyNutrition.totalSugar * 100) / 100,
        totalCholesterol: Math.round(dailyNutrition.totalCholesterol * 100) / 100,
        totalCalcium: Math.round(dailyNutrition.totalCalcium * 100) / 100,
        totalIron: Math.round(dailyNutrition.totalIron * 100) / 100
      };
      
      console.log('🎯 Meal Planning Service - Final daily nutrition totals:', JSON.stringify(mappedResponse.dailyNutrition, null, 2));
      console.log('🎯 Meal Planning Service - ===== END CALCULATING DAILY NUTRITION =====');
      
      // Convert meals to GeneratedMeal format before storing
      const generatedMeals: GeneratedMeal[] = mappedResponse.meals.map((meal: any) => ({
        id: meal.id || `meal-${meal.mealOrder || 0}`,
        mealType: meal.mealType,
        mealOrder: meal.mealOrder,
        recipeName: meal.recipeName || meal.recipe?.label,
        recipeUrl: meal.recipe?.url || '',
        recipeImageUrl: meal.recipe?.image || '',
        caloriesPerServing: meal.recipe?.nutritionSummary?.calories || 0,
        proteinGrams: meal.recipe?.nutritionSummary?.protein || 0,
        carbsGrams: meal.recipe?.nutritionSummary?.carbs || 0,
        fatGrams: meal.recipe?.nutritionSummary?.fat || 0,
        fiberGrams: meal.recipe?.nutritionSummary?.fiber || 0,
        servingsPerMeal: meal.recipe?.yield || meal.recipe?.nutritionSummary?.servings || 1,
        totalCalories: meal.targetCalories || meal.recipe?.nutritionSummary?.calories || 0,
        totalProtein: (meal.recipe?.totalNutrients?.PROCNT?.quantity || 0) * (meal.targetCalories || 1000) / (meal.recipe?.calories || 4000),
        totalCarbs: (meal.recipe?.totalNutrients?.CHOCDF?.quantity || 0) * (meal.targetCalories || 1000) / (meal.recipe?.calories || 4000),
        totalFat: (meal.recipe?.totalNutrients?.FAT?.quantity || 0) * (meal.targetCalories || 1000) / (meal.recipe?.calories || 4000),
        totalFiber: (meal.recipe?.totalNutrients?.FIBTG?.quantity || 0) * (meal.targetCalories || 1000) / (meal.recipe?.calories || 4000),
        ingredients: meal.recipe?.ingredients?.map((ing: any) => {
          const scaleFactor = (meal.targetCalories || 1000) / (meal.recipe?.calories || 4000);
          const scaledWeight = (ing.weight || 0) * scaleFactor;
          console.log(`🔍 INGREDIENT SCALING DEBUG:`, {
            ingredientText: ing.text,
            originalWeight: ing.weight,
            targetCalories: meal.targetCalories,
            recipeCalories: meal.recipe?.calories,
            scaleFactor: scaleFactor,
            scaledWeight: scaledWeight,
            finalText: this.convertIngredientToGrams(ing.text, scaledWeight)
          });
          return {
            text: this.convertIngredientToGrams(ing.text, scaledWeight),
            quantity: Math.round(scaledWeight),
            measure: 'gram',
            food: ing.food || this.extractFoodName(ing.text),
            weight: scaledWeight,
          calories: ing.nutrients?.ENERC_KCAL?.quantity,
          protein: ing.nutrients?.PROCNT?.quantity,
          carbs: ing.nutrients?.CHOCDF?.quantity,
          fat: ing.nutrients?.FAT?.quantity,
          fiber: ing.nutrients?.FIBTG?.quantity
          };
        }) || (meal.recipe?.ingredientLines?.map((line: string) => ({
          text: line,
          quantity: 1,
          measure: 'serving',
          food: line,
          weight: 0
        })) || []),
        edamamRecipeId: meal.recipe?.uri || ''
      }));

      // Insert as draft meal plan
      const { data: draftPlan, error: draftError } = await supabase
        .from('meal_plans')
        .insert({
          client_id: clientId,
          nutritionist_id: userId || '', // Assuming userId is nutritionist
          plan_name: 'Preview Meal Plan',
          plan_date: planDate,
          plan_type: 'daily',
          status: 'draft',
          target_calories: clientGoal.eerGoalCalories,
          target_protein_grams: (clientGoal.proteinGoalMin + clientGoal.proteinGoalMax) / 2,
          target_carbs_grams: (clientGoal.carbsGoalMin + clientGoal.carbsGoalMax) / 2,
          target_fat_grams: (clientGoal.fatGoalMin + clientGoal.fatGoalMax) / 2,
          target_fiber_grams: 0, // Add if available
          dietary_restrictions: dietaryRestrictions,
          cuisine_preferences: cuisinePreferences,
          generated_meals: generatedMeals, // Store GeneratedMeal format in JSONB
          nutrition_summary: mappedResponse.dailyNutrition
        })
        .select('id')
        .single();

      if (draftError || !draftPlan) {
        console.error('❌ Meal Planning Service - Draft creation error:', JSON.stringify(draftError, null, 2));
        console.error('❌ Meal Planning Service - Error details:', draftError);
        throw new Error(`Failed to create draft preview: ${JSON.stringify(draftError)}`);
      }

      const previewId = draftPlan.id;
      console.log('🎯 Meal Planning Service - Created draft preview with ID:', previewId);

      // Add previewId to response
      mappedResponse.previewId = previewId;
      console.log('🎯 Meal Planning Service - Added previewId to mappedResponse:', mappedResponse.previewId);

      return {
        success: true,
        data: {
          mealPlan: mappedResponse,
          clientGoals: clientGoal,
          mealProgram: {
            id: mealProgram.id,
            name: mealProgram.name,
            description: mealProgram.description
          },
          planDate,
          dietaryRestrictions,
          cuisinePreferences,
          uiOverrideMeals
        }
      };
      
    } catch (error) {
      console.error('❌ Meal Planning Service - Error generating meal plan from program:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate meal plan from program'
      };
    }
  }

  /**
   * Update an existing meal plan
   */
  async updateMealPlan(mealPlanId: string, nutritionistId: string, updateData: {
    planName?: string;
    planDate?: string;
    dietaryRestrictions?: string[];
    cuisinePreferences?: string[];
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🎯 Meal Planning Service - Updating meal plan:', mealPlanId);
      console.log('🎯 Meal Planning Service - Update data:', JSON.stringify(updateData, null, 2));

      // Validate that the user is actually a nutritionist
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', nutritionistId)
        .eq('role', 'nutritionist')
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'Access denied. Only nutritionists can update meal plans.'
        };
      }

      // Check if meal plan exists and belongs to nutritionist
      const { data: existingMealPlan, error: checkError } = await supabase
        .from('meal_plans')
        .select('id, nutritionist_id')
        .eq('id', mealPlanId)
        .eq('nutritionist_id', nutritionistId)
        .single();

      if (checkError || !existingMealPlan) {
        return {
          success: false,
          error: 'Meal plan not found or access denied'
        };
      }

      // Validate plan date if provided
      if (updateData.planDate) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(updateData.planDate)) {
          return {
            success: false,
            error: 'Invalid date format. planDate must be in YYYY-MM-DD format'
          };
        }

        // Check if plan date is not in the past
        const planDateObj = new Date(updateData.planDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (planDateObj < today) {
          return {
            success: false,
            error: 'Plan date cannot be in the past'
          };
        }
      }

      // Update meal plan
      const updateFields: any = {
        updated_at: new Date().toISOString()
      };

      if (updateData.planName) updateFields.plan_name = updateData.planName;
      if (updateData.planDate) updateFields.plan_date = updateData.planDate;
      if (updateData.dietaryRestrictions) updateFields.dietary_restrictions = updateData.dietaryRestrictions;
      if (updateData.cuisinePreferences) updateFields.cuisine_preferences = updateData.cuisinePreferences;

      const { error: updateError } = await supabase
        .from('meal_plans')
        .update(updateFields)
        .eq('id', mealPlanId);

      if (updateError) {
        console.error('❌ Meal Planning Service - Error updating meal plan:', updateError);
        return {
          success: false,
          error: 'Failed to update meal plan'
        };
      }

      // Fetch updated meal plan
      const { data: updatedMealPlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .single();

      if (fetchError || !updatedMealPlan) {
        return {
          success: false,
          error: 'Failed to fetch updated meal plan'
        };
      }

      console.log('✅ Meal Planning Service - Meal plan updated successfully');
      return {
        success: true,
        data: updatedMealPlan
      };

    } catch (error) {
      console.error('❌ Meal Planning Service - Error in updateMealPlan:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Edit an ingredient in a preview meal plan
   */
  async editPreviewIngredient(
    previewId: string,
    mealIndex: number,
    ingredientIndex: number,
    newIngredientText: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🚨🚨🚨 EDIT PREVIEW INGREDIENT - START 🚨🚨🚨');
      console.log('previewId:', previewId);
      console.log('mealIndex:', mealIndex);
      console.log('ingredientIndex:', ingredientIndex);
      console.log('newIngredientText:', newIngredientText);

      // Fetch the draft meal plan
      const { data: mealPlan, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', previewId)
        .eq('status', 'draft')
        .single();

      if (error || !mealPlan) {
        console.log('🚨🚨🚨 ERROR: Meal plan not found or not draft 🚨🚨🚨');
        return { success: false, error: 'Meal plan not found or not in draft status' };
      }

      const generatedMeals = mealPlan.generated_meals as any[];
      if (!generatedMeals || mealIndex >= generatedMeals.length) {
        console.log('🚨🚨🚨 ERROR: Invalid meal index 🚨🚨🚨');
        return { success: false, error: 'Invalid meal index' };
      }

      const meal = generatedMeals[mealIndex];
    
      // Check if meal has recipe structure with ingredients (handle both old and new structures)
      let ingredients: any[] = [];
      if (meal.recipe?.ingredients) {
        // New flattened structure
        ingredients = meal.recipe.ingredients;
      } else if (meal.recipe?.details?.recipe?.ingredients) {
        // Old nested structure
        ingredients = meal.recipe.details.recipe.ingredients;
      } else {
        console.log('🚨🚨🚨 ERROR: Meal does not have recipe with ingredients 🚨🚨🚨');
        console.log('meal:', JSON.stringify(meal, null, 2));
        return { success: false, error: 'Meal does not have recipe with ingredients' };
      }
    
      if (ingredientIndex >= ingredients.length) {
        console.log('🚨🚨🚨 ERROR: Invalid ingredient index 🚨🚨🚨');
        return { success: false, error: 'Invalid ingredient index' };
      }

      const oldIngredient = ingredients[ingredientIndex];

      // Parse the new ingredient text to extract quantity, measure, and food
      const parsedIngredient = this.edamamService.parseIngredientText(newIngredientText);
      
      // Update all ingredient fields
      ingredients[ingredientIndex].text = newIngredientText;
      ingredients[ingredientIndex].quantity = parsedIngredient.quantity;
      ingredients[ingredientIndex].measure = parsedIngredient.measure;
      ingredients[ingredientIndex].food = parsedIngredient.food;
      
      console.log('🔄 UPDATED INGREDIENT:', {
        text: newIngredientText,
        quantity: parsedIngredient.quantity,
        measure: parsedIngredient.measure,
        food: parsedIngredient.food
      });

      // Recalculate totals from all ingredients
      let totalCalories: number = 0;
      let totalWeight: number = 0;
      const totalNutrients: { [key: string]: { label?: string; quantity: number; unit: string } } = {};

      for (const ing of ingredients) {
        console.log('🚨🚨🚨 PROCESSING INGREDIENT FOR NUTRITION 🚨🚨🚨');
        console.log('Original ingredient text:', ing.text);
        console.log('Ingredient text length:', ing.text?.length || 0);
        console.log('Ingredient text encoded:', encodeURIComponent(ing.text || ''));
        
        const ingNutrition = await this.edamamService.getIngredientNutrition(ing.text);
        totalCalories += ingNutrition?.calories || 0;
        totalWeight += ingNutrition?.totalWeight || 0;
        Object.entries(ingNutrition?.totalNutrients || {}).forEach(([nutrient, data]) => {
          const nutrientData = data as { label?: string; quantity: number; unit: string };
          if (!totalNutrients[nutrient]) {
            totalNutrients[nutrient] = { ...nutrientData, quantity: 0 };
          }
          totalNutrients[nutrient].quantity += nutrientData.quantity || 0;
        });
      }

      // Update recipe fields based on structure
      if (meal.recipe.ingredients) {
        // New flattened structure
        meal.recipe.calories = totalCalories;
        meal.recipe.totalWeight = totalWeight;
        meal.recipe.totalNutrients = totalNutrients;
        
        // Recalculate nutritionSummary
        const servings = meal.recipe.yield || 1;
        meal.recipe.nutritionSummary = {
          calories: totalCalories / servings,
          protein: (totalNutrients['PROCNT']?.quantity || 0) / servings,
          carbs: (totalNutrients['CHOCDF']?.quantity || 0) / servings,
          fat: (totalNutrients['FAT']?.quantity || 0) / servings,
          fiber: (totalNutrients['FIBTG']?.quantity || 0) / servings,
          sodium: (totalNutrients['NA']?.quantity || 0) / servings,
          sugar: (totalNutrients['SUGAR']?.quantity || 0) / servings,
          servings: servings
        };
      } else {
        // Old nested structure
        meal.recipe.details.recipe.calories = totalCalories;
        meal.recipe.details.recipe.totalWeight = totalWeight;
        meal.recipe.details.recipe.totalNutrients = totalNutrients;
        
        // Recalculate nutritionSummary
        const servings = meal.recipe.details.recipe.yield || 1;
        meal.recipe.nutritionSummary = {
          calories: totalCalories / servings,
          protein: (totalNutrients['PROCNT']?.quantity || 0) / servings,
          carbs: (totalNutrients['CHOCDF']?.quantity || 0) / servings,
          fat: (totalNutrients['FAT']?.quantity || 0) / servings,
          fiber: (totalNutrients['FIBTG']?.quantity || 0) / servings,
          sodium: (totalNutrients['NA']?.quantity || 0) / servings,
          sugar: (totalNutrients['SUGAR']?.quantity || 0) / servings,
          servings: servings
        };
      }

      // Update database
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ generated_meals: generatedMeals })
        .eq('id', previewId);

      if (updateError) {
        return { success: false, error: 'Failed to update meal plan' };
      }

      // Recalculate daily nutrition
      const dailyNutrition = {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
        totalSodium: 0,
        totalSugar: 0,
        totalCholesterol: 0,
        totalCalcium: 0,
        totalIron: 0
      };

      generatedMeals.forEach(m => {
        if (m.recipe?.nutritionSummary) {
          dailyNutrition.totalCalories += m.recipe.nutritionSummary.calories;
          dailyNutrition.totalProtein += m.recipe.nutritionSummary.protein;
          dailyNutrition.totalCarbs += m.recipe.nutritionSummary.carbs;
          dailyNutrition.totalFat += m.recipe.nutritionSummary.fat;
          dailyNutrition.totalFiber += m.recipe.nutritionSummary.fiber;
          dailyNutrition.totalSodium += m.recipe.nutritionSummary.sodium;
          dailyNutrition.totalSugar += m.recipe.nutritionSummary.sugar;
        } else {
          dailyNutrition.totalCalories += m.targetCalories || 0;
        }
      });

      // Round daily nutrition
      Object.keys(dailyNutrition).forEach(key => {
        dailyNutrition[key] = Math.round(dailyNutrition[key] * 100) / 100;
      });

      await supabase.from('meal_plans').update({ nutrition_summary: dailyNutrition }).eq('id', previewId);

      // Return the same structure as preview meal plan
      return { 
        success: true, 
        data: { 
          mealPlan: {
            meals: generatedMeals,
            dailyNutrition: dailyNutrition
          }
        } 
      };
    } catch (error) {
      console.log('🚨🚨🚨 EDIT PREVIEW INGREDIENT - ERROR 🚨🚨🚨');
      console.log('error:', error);
      return { success: false, error: 'Failed to edit ingredient' };
    }
  }

  /**
   * Edit an ingredient in a saved meal plan (active, completed, or archived status)
   */
  async editSavedMealIngredient(
    mealPlanId: string,
    mealIndex: number,
    ingredientIndex: number,
    newIngredientText: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🚨🚨🚨 EDIT SAVED MEAL INGREDIENT - START 🚨🚨🚨');
      console.log('mealPlanId:', mealPlanId);
      console.log('mealIndex:', mealIndex);
      console.log('ingredientIndex:', ingredientIndex);
      console.log('newIngredientText:', newIngredientText);

      // Fetch the saved meal plan (not draft)
      const { data: mealPlan, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .neq('status', 'draft') // Allow active, completed, archived
        .single();

      if (error || !mealPlan) {
        console.log('🚨🚨🚨 ERROR: Saved meal plan not found 🚨🚨🚨');
        return { success: false, error: 'Saved meal plan not found' };
      }

      const generatedMeals = mealPlan.generated_meals as any[];
      if (!generatedMeals || mealIndex >= generatedMeals.length) {
        console.log('🚨🚨🚨 ERROR: Invalid meal index 🚨🚨🚨');
        return { success: false, error: 'Invalid meal index' };
      }

      const meal = generatedMeals[mealIndex];
    
      // Check if meal has recipe structure with ingredients (handle both old and new structures)
      let ingredients: any[] = [];
      if (meal.recipe?.ingredients) {
        // New flattened structure
        ingredients = meal.recipe.ingredients;
      } else if (meal.recipe?.details?.recipe?.ingredients) {
        // Old nested structure
        ingredients = meal.recipe.details.recipe.ingredients;
      } else {
        console.log('🚨🚨🚨 ERROR: Meal does not have recipe with ingredients 🚨🚨🚨');
        console.log('meal:', JSON.stringify(meal, null, 2));
        return { success: false, error: 'Meal does not have recipe with ingredients' };
      }
    
      if (ingredientIndex >= ingredients.length) {
        console.log('🚨🚨🚨 ERROR: Invalid ingredient index 🚨🚨🚨');
        return { success: false, error: 'Invalid ingredient index' };
      }

      const oldIngredient = ingredients[ingredientIndex];

      // Parse the new ingredient text to extract quantity, measure, and food
      const parsedIngredient = this.edamamService.parseIngredientText(newIngredientText);
      
      // Update all ingredient fields
      ingredients[ingredientIndex].text = newIngredientText;
      ingredients[ingredientIndex].quantity = parsedIngredient.quantity;
      ingredients[ingredientIndex].measure = parsedIngredient.measure;
      ingredients[ingredientIndex].food = parsedIngredient.food;
      
      console.log('🔄 UPDATED INGREDIENT:', {
        text: newIngredientText,
        quantity: parsedIngredient.quantity,
        measure: parsedIngredient.measure,
        food: parsedIngredient.food
      });

      // Recalculate totals from all ingredients
      let totalCalories: number = 0;
      let totalWeight: number = 0;
      const totalNutrients: { [key: string]: { label?: string; quantity: number; unit: string } } = {};

      for (const ing of ingredients) {
        console.log('🚨🚨🚨 PROCESSING INGREDIENT FOR NUTRITION 🚨🚨🚨');
        console.log('Original ingredient text:', ing.text);
        
        const ingNutrition = await this.edamamService.getIngredientNutrition(ing.text);
        totalCalories += ingNutrition?.calories || 0;
        totalWeight += ingNutrition?.totalWeight || 0;
        Object.entries(ingNutrition?.totalNutrients || {}).forEach(([nutrient, data]) => {
          const nutrientData = data as { label?: string; quantity: number; unit: string };
          if (!totalNutrients[nutrient]) {
            totalNutrients[nutrient] = { ...nutrientData, quantity: 0 };
          }
          totalNutrients[nutrient].quantity += nutrientData.quantity || 0;
        });
      }

      // Update recipe fields based on structure
      if (meal.recipe.ingredients) {
        // New flattened structure
        meal.recipe.calories = totalCalories;
        meal.recipe.totalWeight = totalWeight;
        meal.recipe.totalNutrients = totalNutrients;
        
        // Recalculate nutritionSummary
        const servings = meal.recipe.yield || 1;
        meal.recipe.nutritionSummary = {
          calories: totalCalories / servings,
          protein: (totalNutrients['PROCNT']?.quantity || 0) / servings,
          carbs: (totalNutrients['CHOCDF']?.quantity || 0) / servings,
          fat: (totalNutrients['FAT']?.quantity || 0) / servings,
          fiber: (totalNutrients['FIBTG']?.quantity || 0) / servings,
          sodium: (totalNutrients['NA']?.quantity || 0) / servings,
          sugar: (totalNutrients['SUGAR']?.quantity || 0) / servings,
          servings: servings
        };
      } else {
        // Old nested structure
        meal.recipe.details.recipe.calories = totalCalories;
        meal.recipe.details.recipe.totalWeight = totalWeight;
        meal.recipe.details.recipe.totalNutrients = totalNutrients;
        
        // Recalculate nutritionSummary
        const servings = meal.recipe.details.recipe.yield || 1;
        meal.recipe.nutritionSummary = {
          calories: totalCalories / servings,
          protein: (totalNutrients['PROCNT']?.quantity || 0) / servings,
          carbs: (totalNutrients['CHOCDF']?.quantity || 0) / servings,
          fat: (totalNutrients['FAT']?.quantity || 0) / servings,
          fiber: (totalNutrients['FIBTG']?.quantity || 0) / servings,
          sodium: (totalNutrients['NA']?.quantity || 0) / servings,
          sugar: (totalNutrients['SUGAR']?.quantity || 0) / servings,
          servings: servings
        };
      }

      // Update database with new updated_at timestamp
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ 
          generated_meals: generatedMeals,
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlanId);

      if (updateError) {
        return { success: false, error: 'Failed to update saved meal plan' };
      }

      // Recalculate daily nutrition
      const dailyNutrition = await this.calculateDailyNutrition(generatedMeals);

      // Update nutrition summary in database
      const { error: nutritionUpdateError } = await supabase
        .from('meal_plans')
        .update({ nutrition_summary: dailyNutrition })
        .eq('id', mealPlanId);

      if (nutritionUpdateError) {
        console.log('🚨🚨🚨 ERROR: Failed to update nutrition summary 🚨🚨🚨');
      }

      return {
        success: true,
        data: {
          mealPlan: {
            ...mealPlan,
            generated_meals: generatedMeals,
            nutrition_summary: dailyNutrition,
            updated_at: new Date().toISOString()
          },
          updatedMeal: meal,
          dailyNutrition
        }
      };

    } catch (error) {
      console.log('🚨🚨🚨 EDIT SAVED MEAL INGREDIENT ERROR 🚨🚨🚨');
      console.log('error:', error);
      return { success: false, error: 'Failed to edit ingredient in saved meal' };
    }
  }

  /**
   * Delete an ingredient from a meal in the preview
   */
  async deletePreviewIngredient(
    previewId: string,
    mealIndex: number,
    ingredientIndex: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🚨🚨🚨 DELETE PREVIEW INGREDIENT - START 🚨🚨🚨');
      console.log('previewId:', previewId);
      console.log('mealIndex:', mealIndex);
      console.log('ingredientIndex:', ingredientIndex);

      // Fetch the draft meal plan
      const { data: mealPlan, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', previewId)
        .eq('status', 'draft')
        .single();

      if (error || !mealPlan) {
        console.log('🚨🚨🚨 ERROR: Meal plan not found or not draft 🚨🚨🚨');
        return { success: false, error: 'Meal plan not found or not in draft status' };
      }

      const generatedMeals = mealPlan.generated_meals as any[];
      if (!generatedMeals || mealIndex >= generatedMeals.length) {
        console.log('🚨🚨🚨 ERROR: Invalid meal index 🚨🚨🚨');
        return { success: false, error: 'Invalid meal index' };
      }

      const meal = generatedMeals[mealIndex];
      
      // Check if meal has recipe structure with ingredients (handle both old and new structures)
      let ingredients: any[] = [];
      if (meal.recipe?.ingredients) {
        // New flattened structure
        ingredients = meal.recipe.ingredients;
      } else if (meal.recipe?.details?.recipe?.ingredients) {
        // Old nested structure
        ingredients = meal.recipe.details.recipe.ingredients;
      } else {
        console.log('🚨🚨🚨 ERROR: Meal does not have recipe with ingredients 🚨🚨🚨');
        console.log('meal:', JSON.stringify(meal, null, 2));
        return { success: false, error: 'Meal does not have recipe with ingredients' };
      }

      if (ingredientIndex >= ingredients.length) {
        console.log('🚨🚨🚨 ERROR: Invalid ingredient index 🚨🚨🚨');
        return { success: false, error: 'Invalid ingredient index' };
      }

      const deletedIngredient = ingredients[ingredientIndex];
      console.log('🚨🚨🚨 DELETED INGREDIENT 🚨🚨🚨');
      console.log('deletedIngredient:', JSON.stringify(deletedIngredient, null, 2));

      // Remove the ingredient
      ingredients.splice(ingredientIndex, 1);

      // Recalculate totals from remaining ingredients
      let totalCalories: number = 0;
      let totalWeight: number = 0;
      const totalNutrients: { [key: string]: { label?: string; quantity: number; unit: string } } = {};

      for (const ing of ingredients) {
        const ingNutrition = await this.edamamService.getIngredientNutrition(ing.text);
        totalCalories += ingNutrition?.calories || 0;
        totalWeight += ingNutrition?.totalWeight || 0;
        Object.entries(ingNutrition?.totalNutrients || {}).forEach(([nutrient, data]) => {
          const nutrientData = data as { label?: string; quantity: number; unit: string };
          if (!totalNutrients[nutrient]) {
            totalNutrients[nutrient] = { ...nutrientData, quantity: 0 };
          }
          totalNutrients[nutrient].quantity += nutrientData.quantity || 0;
        });
      }

      // Update recipe fields based on structure
      if (meal.recipe.ingredients) {
        // New flattened structure
        meal.recipe.calories = totalCalories;
        meal.recipe.totalWeight = totalWeight;
        meal.recipe.totalNutrients = totalNutrients;
        
        // Recalculate nutritionSummary
        const servings = meal.recipe.yield || 1;
        meal.recipe.nutritionSummary = {
          calories: totalCalories / servings,
          protein: (totalNutrients['PROCNT']?.quantity || 0) / servings,
          carbs: (totalNutrients['CHOCDF']?.quantity || 0) / servings,
          fat: (totalNutrients['FAT']?.quantity || 0) / servings,
          fiber: (totalNutrients['FIBTG']?.quantity || 0) / servings,
          sodium: (totalNutrients['NA']?.quantity || 0) / servings,
          sugar: (totalNutrients['SUGAR']?.quantity || 0) / servings,
          servings: servings
        };
      } else {
        // Old nested structure
        meal.recipe.details.recipe.calories = totalCalories;
        meal.recipe.details.recipe.totalWeight = totalWeight;
        meal.recipe.details.recipe.totalNutrients = totalNutrients;
        
        // Recalculate nutritionSummary
        const servings = meal.recipe.details.recipe.yield || 1;
        meal.recipe.nutritionSummary = {
          calories: totalCalories / servings,
          protein: (totalNutrients['PROCNT']?.quantity || 0) / servings,
          carbs: (totalNutrients['CHOCDF']?.quantity || 0) / servings,
          fat: (totalNutrients['FAT']?.quantity || 0) / servings,
          fiber: (totalNutrients['FIBTG']?.quantity || 0) / servings,
          sodium: (totalNutrients['NA']?.quantity || 0) / servings,
          sugar: (totalNutrients['SUGAR']?.quantity || 0) / servings,
          servings: servings
        };
      }

      // Update database
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ generated_meals: generatedMeals })
        .eq('id', previewId);

      if (updateError) {
        return { success: false, error: 'Failed to update meal plan' };
      }

      // Recalculate daily nutrition
      const dailyNutrition = {
        totalCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFat: 0,
        totalFiber: 0,
        totalSodium: 0,
        totalSugar: 0,
        totalCholesterol: 0,
        totalCalcium: 0,
        totalIron: 0
      };

      generatedMeals.forEach(m => {
        if (m.recipe?.nutritionSummary) {
          dailyNutrition.totalCalories += m.recipe.nutritionSummary.calories;
          dailyNutrition.totalProtein += m.recipe.nutritionSummary.protein;
          dailyNutrition.totalCarbs += m.recipe.nutritionSummary.carbs;
          dailyNutrition.totalFat += m.recipe.nutritionSummary.fat;
          dailyNutrition.totalFiber += m.recipe.nutritionSummary.fiber;
          dailyNutrition.totalSodium += m.recipe.nutritionSummary.sodium;
          dailyNutrition.totalSugar += m.recipe.nutritionSummary.sugar;
        } else {
          dailyNutrition.totalCalories += m.targetCalories || 0;
        }
      });

      // Round daily nutrition
      Object.keys(dailyNutrition).forEach(key => {
        dailyNutrition[key] = Math.round(dailyNutrition[key] * 100) / 100;
      });

      await supabase.from('meal_plans').update({ nutrition_summary: dailyNutrition }).eq('id', previewId);

      // Return the same structure as preview meal plan
      return { 
        success: true, 
        data: { 
          mealPlan: {
            meals: generatedMeals,
            dailyNutrition: dailyNutrition
          }
        } 
      };
    } catch (error) {
      console.log('🚨🚨🚨 DELETE PREVIEW INGREDIENT - ERROR 🚨🚨🚨');
      console.log('error:', error);
      return { success: false, error: 'Failed to delete ingredient' };
    }
  }

  /**
   * Delete an ingredient from a meal in a saved meal plan (active, completed, or archived status)
   */
  async deleteSavedMealIngredient(
    mealPlanId: string,
    mealIndex: number,
    ingredientIndex: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🚨🚨🚨 DELETE SAVED MEAL INGREDIENT - START 🚨🚨🚨');
      console.log('mealPlanId:', mealPlanId);
      console.log('mealIndex:', mealIndex);
      console.log('ingredientIndex:', ingredientIndex);

      // Fetch the saved meal plan (not draft)
      const { data: mealPlan, error } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .neq('status', 'draft') // Allow active, completed, archived
        .single();

      if (error || !mealPlan) {
        console.log('🚨🚨🚨 ERROR: Saved meal plan not found 🚨🚨🚨');
        return { success: false, error: 'Saved meal plan not found' };
      }

      const generatedMeals = mealPlan.generated_meals as any[];
      if (!generatedMeals || mealIndex >= generatedMeals.length) {
        console.log('🚨🚨🚨 ERROR: Invalid meal index 🚨🚨🚨');
        return { success: false, error: 'Invalid meal index' };
      }

      const meal = generatedMeals[mealIndex];
      
      // Check if meal has recipe structure with ingredients (handle both old and new structures)
      let ingredients: any[] = [];
      if (meal.recipe?.ingredients) {
        // New flattened structure
        ingredients = meal.recipe.ingredients;
      } else if (meal.recipe?.details?.recipe?.ingredients) {
        // Old nested structure
        ingredients = meal.recipe.details.recipe.ingredients;
      } else {
        console.log('🚨🚨🚨 ERROR: Meal does not have recipe with ingredients 🚨🚨🚨');
        console.log('meal:', JSON.stringify(meal, null, 2));
        return { success: false, error: 'Meal does not have recipe with ingredients' };
      }

      if (ingredientIndex >= ingredients.length) {
        console.log('🚨🚨🚨 ERROR: Invalid ingredient index 🚨🚨🚨');
        return { success: false, error: 'Invalid ingredient index' };
      }

      // Remove the ingredient
      const deletedIngredient = ingredients.splice(ingredientIndex, 1)[0];
      console.log('🗑️ DELETED INGREDIENT:', deletedIngredient);

      // Recalculate totals from remaining ingredients
      let totalCalories: number = 0;
      let totalWeight: number = 0;
      const totalNutrients: { [key: string]: { label?: string; quantity: number; unit: string } } = {};

      for (const ing of ingredients) {
        console.log('🚨🚨🚨 PROCESSING INGREDIENT FOR NUTRITION 🚨🚨🚨');
        console.log('Original ingredient text:', ing.text);
        
        const ingNutrition = await this.edamamService.getIngredientNutrition(ing.text);
        totalCalories += ingNutrition?.calories || 0;
        totalWeight += ingNutrition?.totalWeight || 0;
        Object.entries(ingNutrition?.totalNutrients || {}).forEach(([nutrient, data]) => {
          const nutrientData = data as { label?: string; quantity: number; unit: string };
          if (!totalNutrients[nutrient]) {
            totalNutrients[nutrient] = { ...nutrientData, quantity: 0 };
          }
          totalNutrients[nutrient].quantity += nutrientData.quantity || 0;
        });
      }

      // Update recipe fields based on structure
      if (meal.recipe.ingredients) {
        // New flattened structure
        meal.recipe.calories = totalCalories;
        meal.recipe.totalWeight = totalWeight;
        meal.recipe.totalNutrients = totalNutrients;
        
        // Recalculate nutritionSummary
        const servings = meal.recipe.yield || 1;
        meal.recipe.nutritionSummary = {
          calories: totalCalories / servings,
          protein: (totalNutrients['PROCNT']?.quantity || 0) / servings,
          carbs: (totalNutrients['CHOCDF']?.quantity || 0) / servings,
          fat: (totalNutrients['FAT']?.quantity || 0) / servings,
          fiber: (totalNutrients['FIBTG']?.quantity || 0) / servings,
          sodium: (totalNutrients['NA']?.quantity || 0) / servings,
          sugar: (totalNutrients['SUGAR']?.quantity || 0) / servings,
          servings: servings
        };
      } else {
        // Old nested structure
        meal.recipe.details.recipe.calories = totalCalories;
        meal.recipe.details.recipe.totalWeight = totalWeight;
        meal.recipe.details.recipe.totalNutrients = totalNutrients;
        
        // Recalculate nutritionSummary
        const servings = meal.recipe.details.recipe.yield || 1;
        meal.recipe.nutritionSummary = {
          calories: totalCalories / servings,
          protein: (totalNutrients['PROCNT']?.quantity || 0) / servings,
          carbs: (totalNutrients['CHOCDF']?.quantity || 0) / servings,
          fat: (totalNutrients['FAT']?.quantity || 0) / servings,
          fiber: (totalNutrients['FIBTG']?.quantity || 0) / servings,
          sodium: (totalNutrients['NA']?.quantity || 0) / servings,
          sugar: (totalNutrients['SUGAR']?.quantity || 0) / servings,
          servings: servings
        };
      }

      // Update database with new updated_at timestamp
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ 
          generated_meals: generatedMeals,
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlanId);

      if (updateError) {
        return { success: false, error: 'Failed to update saved meal plan' };
      }

      // Recalculate daily nutrition
      const dailyNutrition = await this.calculateDailyNutrition(generatedMeals);

      // Update nutrition summary in database
      const { error: nutritionUpdateError } = await supabase
        .from('meal_plans')
        .update({ nutrition_summary: dailyNutrition })
        .eq('id', mealPlanId);

      if (nutritionUpdateError) {
        console.log('🚨🚨🚨 ERROR: Failed to update nutrition summary 🚨🚨🚨');
      }

      return {
        success: true,
        data: {
          mealPlan: {
            ...mealPlan,
            generated_meals: generatedMeals,
            nutrition_summary: dailyNutrition,
            updated_at: new Date().toISOString()
          },
          updatedMeal: meal,
          dailyNutrition,
          deletedIngredient
        }
      };

    } catch (error) {
      console.log('🚨🚨🚨 DELETE SAVED MEAL INGREDIENT - ERROR 🚨🚨🚨');
      console.log('error:', error);
      return { success: false, error: 'Failed to delete ingredient from saved meal' };
    }
  }

  /**
   * Save a preview as a final meal plan
   */
  async saveFromPreview(previewId: string, planName: string, isActive: boolean = false): Promise<any> {
    try {
      // Fetch the draft
      const { data: plan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', previewId)
        .eq('status', 'draft')
        .single();

      if (fetchError || !plan) {
        throw new Error('Preview not found or not in draft status');
      }

      // Update to active if isActive, else completed or something
      const newStatus = isActive ? 'active' : 'completed';

      const { data: updatedPlan, error: updateError } = await supabase
        .from('meal_plans')
        .update({
          plan_name: planName,
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', previewId)
        .select('*')
        .single();

      if (updateError || !updatedPlan) {
        throw new Error('Failed to save preview');
      }

      return { success: true, data: updatedPlan };
    } catch (error: unknown) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }


  /**
   * Cleanup old draft previews
   */
  async cleanupOldDrafts(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      const { data, error, count } = await supabase
        .from('meal_plans')
        .delete()
        .eq('status', 'draft')
        .lt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .select() // To enable counting
        .then(result => ({ data: result.data, error: result.error, count: result.data?.length || 0 }));

      if (error) throw error;

      return { success: true, deletedCount: count };
    } catch (error) {
      return { success: false, deletedCount: 0, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Calculate nutrition requirements from nutritional guidelines when client goals are absent
   */
  async calculateNutritionFromGuidelines(clientId: string): Promise<any> {
    try {
      console.log('🔄 Calculating nutrition from guidelines for client:', clientId);

      // Get client basic information
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('age, gender, height_cm, weight_kg, country, activity_level')
        .eq('id', clientId)
        .single();

      if (clientError || !client) {
        console.error('❌ Client not found for guidelines calculation');
        return null;
      }

      console.log('📊 Client data for guidelines calculation:', {
        age: client.age,
        gender: client.gender,
        height: client.height_cm,
        weight: client.weight_kg,
        country: client.country,
        activityLevel: client.activity_level
      });

      // Calculate EER using database formulas
      const eerResult = await calculateEER({
        country: client.country || 'usa',
        age: client.age,
        gender: client.gender,
        height_cm: client.height_cm,
        weight_kg: client.weight_kg,
        activity_level: client.activity_level || 'moderately_active'
      });

      console.log('⚡ EER calculation result:', eerResult);

      // Calculate macros using database guidelines
      const macroResult = await calculateMacros({
        eer: eerResult.eer,
        country: client.country || 'usa',
        age: client.age,
        gender: client.gender,
        weight_kg: client.weight_kg
      });

      console.log('🥗 Macro calculation result:', macroResult);

      // Return in the same format as client nutrition requirements
      const calculatedRequirements = {
        client_id: clientId,
        eer_calories: Math.round(eerResult.eer),
        protein_grams_min: Math.round(macroResult.Protein.min || 0),
        protein_grams_max: Math.round(macroResult.Protein.max || 0),
        carbs_grams_min: Math.round(macroResult.Carbohydrates.min || 0),
        carbs_grams_max: Math.round(macroResult.Carbohydrates.max || 0),
        fat_grams_min: Math.round(macroResult['Total Fat'].min || 0),
        fat_grams_max: Math.round(macroResult['Total Fat'].max || 0),
        fiber_grams: Math.round(macroResult.Fiber.min || 25),
        water_liters: Math.round((client.weight_kg * 35) / 1000 * 100) / 100, // 35ml per kg
        calculated_from_guidelines: true, // Flag to indicate this was calculated
        guideline_country: macroResult.guideline_country,
        calculation_date: new Date().toISOString()
      };

      console.log('✅ Final calculated requirements:', calculatedRequirements);
      return calculatedRequirements;

    } catch (error) {
      console.error('❌ Error calculating nutrition from guidelines:', error);
      return null;
    }
  }

  // ========================================
  // MANUAL MEAL PLAN FUNCTIONS
  // ========================================

  /**
   * Create a new manual meal plan
   */
  async createManualMealPlan(
    clientId: string,
    nutritionistId: string,
    planName: string,
    planDate: string,
    planType: string = 'daily'
  ): Promise<{ success: boolean; data?: ManualMealPlan; error?: string }> {
    try {
      const manualMealPlan: ManualMealPlan = {
        clientId,
        nutritionistId,
        planName,
        planDate,
        planType,
        status: 'draft',
        isManual: true,
        meals: [],
        nutritionSummary: {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalFiber: 0,
          totalSodium: 0,
          totalSugar: 0
        }
      };

      // Save to database
      const { data: savedPlan, error } = await supabase
        .from('meal_plans')
        .insert({
          client_id: clientId,
          nutritionist_id: nutritionistId,
          plan_name: planName,
          plan_date: planDate,
          plan_type: planType,
          status: 'draft',
          target_calories: 0,
          target_protein_grams: 0,
          target_carbs_grams: 0,
          target_fat_grams: 0,
          target_fiber_grams: 0,
          generated_meals: { isManual: true, meals: [] },
          nutrition_summary: manualMealPlan.nutritionSummary
        })
        .select()
        .single();

      if (error) throw error;

      manualMealPlan.id = savedPlan.id;

      return { success: true, data: manualMealPlan };
    } catch (error) {
      console.error('Error creating manual meal plan:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Add a manual meal to a meal plan
   */
  async addManualMeal(
    mealPlanId: string,
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
    recipeName: string,
    servings: number = 1,
    cookingInstructions?: string
  ): Promise<{ success: boolean; data?: ManualMeal; error?: string }> {
    try {
      // Get current meal plan
      const { data: mealPlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .single();

      if (fetchError || !mealPlan) {
        return { success: false, error: 'Meal plan not found' };
      }

      const generatedMeals = mealPlan.generated_meals as any;
      if (!generatedMeals?.isManual) {
        return { success: false, error: 'This is not a manual meal plan' };
      }

      // Create new meal
      const mealOrder = (generatedMeals.meals?.length || 0) + 1;
      const newMeal: ManualMeal = {
        id: `manual-meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        mealType,
        mealOrder,
        recipeName,
        cookingInstructions,
        servings,
        isManual: true,
        ingredients: [],
        nutrition: {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          fiber: 0,
          sodium: 0,
          sugar: 0
        }
      };

      // Add to meals array
      const updatedMeals = [...(generatedMeals.meals || []), newMeal];
      const updatedGeneratedMeals = { ...generatedMeals, meals: updatedMeals };

      // Update database
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ 
          generated_meals: updatedGeneratedMeals,
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlanId);

      if (updateError) throw updateError;

      return { success: true, data: newMeal };
    } catch (error) {
      console.error('Error adding manual meal:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Add an ingredient to a manual meal
   */
  async addIngredientToManualMeal(
    mealPlanId: string,
    mealId: string,
    ingredientText: string
  ): Promise<{ success: boolean; data?: { meal: ManualMeal; ingredient: ManualMealIngredient }; error?: string }> {
    try {
      // Get current meal plan
      const { data: mealPlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .single();

      if (fetchError || !mealPlan) {
        return { success: false, error: 'Meal plan not found' };
      }

      const generatedMeals = mealPlan.generated_meals as any;
      if (!generatedMeals?.isManual) {
        return { success: false, error: 'This is not a manual meal plan' };
      }

      // Find the meal
      const meals = generatedMeals.meals || [];
      const mealIndex = meals.findIndex((m: any) => m.id === mealId);
      if (mealIndex === -1) {
        return { success: false, error: 'Meal not found' };
      }

      // Parse ingredient text
      const parsedIngredient = this.edamamService.parseIngredientText(ingredientText);
      
      // Get nutrition data from Edamam
      const nutritionData = await this.edamamService.getIngredientNutrition(ingredientText);
      
      // Create ingredient
      const newIngredient: ManualMealIngredient = {
        text: ingredientText,
        quantity: parsedIngredient.quantity,
        measure: parsedIngredient.measure,
        food: parsedIngredient.food,
        weight: nutritionData?.totalWeight || 0,
        calories: nutritionData?.calories || 0,
        protein: nutritionData?.totalNutrients?.PROCNT?.quantity || 0,
        carbs: nutritionData?.totalNutrients?.CHOCDF?.quantity || 0,
        fat: nutritionData?.totalNutrients?.FAT?.quantity || 0,
        fiber: nutritionData?.totalNutrients?.FIBTG?.quantity || 0
      };

      // Add ingredient to meal
      const updatedMeal = { ...meals[mealIndex] };
      updatedMeal.ingredients = [...(updatedMeal.ingredients || []), newIngredient];

      // Recalculate meal nutrition
      updatedMeal.nutrition = this.calculateMealNutrition(updatedMeal.ingredients, updatedMeal.servings);

      // Update meals array
      const updatedMeals = [...meals];
      updatedMeals[mealIndex] = updatedMeal;

      // Recalculate plan nutrition
      const planNutrition = this.calculateManualPlanNutrition(updatedMeals);

      // Update database
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ 
          generated_meals: { ...generatedMeals, meals: updatedMeals },
          nutrition_summary: planNutrition,
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlanId);

      if (updateError) throw updateError;

      return { success: true, data: { meal: updatedMeal, ingredient: newIngredient } };
    } catch (error) {
      console.error('Error adding ingredient to manual meal:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Calculate nutrition for a manual meal based on its ingredients
   */
  private calculateMealNutrition(ingredients: ManualMealIngredient[], servings: number = 1) {
    const totalNutrition = ingredients.reduce(
      (acc, ingredient) => ({
        calories: acc.calories + (ingredient.calories || 0),
        protein: acc.protein + (ingredient.protein || 0),
        carbs: acc.carbs + (ingredient.carbs || 0),
        fat: acc.fat + (ingredient.fat || 0),
        fiber: acc.fiber + (ingredient.fiber || 0),
        sodium: acc.sodium + 0, // Can be added later if needed
        sugar: acc.sugar + 0    // Can be added later if needed
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sodium: 0, sugar: 0 }
    );

    // Divide by servings to get per-serving nutrition
    return {
      calories: Math.round((totalNutrition.calories / servings) * 100) / 100,
      protein: Math.round((totalNutrition.protein / servings) * 100) / 100,
      carbs: Math.round((totalNutrition.carbs / servings) * 100) / 100,
      fat: Math.round((totalNutrition.fat / servings) * 100) / 100,
      fiber: Math.round((totalNutrition.fiber / servings) * 100) / 100,
      sodium: Math.round((totalNutrition.sodium / servings) * 100) / 100,
      sugar: Math.round((totalNutrition.sugar / servings) * 100) / 100
    };
  }

  /**
   * Calculate total nutrition for a manual meal plan
   */
  private calculateManualPlanNutrition(meals: ManualMeal[]) {
    return meals.reduce(
      (acc, meal) => ({
        totalCalories: acc.totalCalories + (meal.nutrition.calories * meal.servings),
        totalProtein: acc.totalProtein + (meal.nutrition.protein * meal.servings),
        totalCarbs: acc.totalCarbs + (meal.nutrition.carbs * meal.servings),
        totalFat: acc.totalFat + (meal.nutrition.fat * meal.servings),
        totalFiber: acc.totalFiber + (meal.nutrition.fiber * meal.servings),
        totalSodium: acc.totalSodium + (meal.nutrition.sodium || 0) * meal.servings,
        totalSugar: acc.totalSugar + (meal.nutrition.sugar || 0) * meal.servings
      }),
      { 
        totalCalories: 0, 
        totalProtein: 0, 
        totalCarbs: 0, 
        totalFat: 0, 
        totalFiber: 0, 
        totalSodium: 0, 
        totalSugar: 0 
      }
    );
  }

  /**
   * Remove an ingredient from a manual meal
   */
  async removeIngredientFromManualMeal(
    mealPlanId: string,
    mealId: string,
    ingredientIndex: number
  ): Promise<{ success: boolean; data?: ManualMeal; error?: string }> {
    try {
      // Get current meal plan
      const { data: mealPlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .single();

      if (fetchError || !mealPlan) {
        return { success: false, error: 'Meal plan not found' };
      }

      const generatedMeals = mealPlan.generated_meals as any;
      if (!generatedMeals?.isManual) {
        return { success: false, error: 'This is not a manual meal plan' };
      }

      // Find the meal
      const meals = generatedMeals.meals || [];
      const mealIndex = meals.findIndex((m: any) => m.id === mealId);
      if (mealIndex === -1) {
        return { success: false, error: 'Meal not found' };
      }

      const updatedMeal = { ...meals[mealIndex] };
      if (ingredientIndex >= updatedMeal.ingredients.length) {
        return { success: false, error: 'Ingredient index out of range' };
      }

      // Remove ingredient
      updatedMeal.ingredients = updatedMeal.ingredients.filter((_, index) => index !== ingredientIndex);

      // Recalculate meal nutrition
      updatedMeal.nutrition = this.calculateMealNutrition(updatedMeal.ingredients, updatedMeal.servings);

      // Update meals array
      const updatedMeals = [...meals];
      updatedMeals[mealIndex] = updatedMeal;

      // Recalculate plan nutrition
      const planNutrition = this.calculateManualPlanNutrition(updatedMeals);

      // Update database
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ 
          generated_meals: { ...generatedMeals, meals: updatedMeals },
          nutrition_summary: planNutrition,
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlanId);

      if (updateError) throw updateError;

      return { success: true, data: updatedMeal };
    } catch (error) {
      console.error('Error removing ingredient from manual meal:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delete a manual meal from a meal plan
   */
  async deleteManualMeal(
    mealPlanId: string,
    mealId: string
  ): Promise<{ success: boolean; data?: ManualMealPlan; error?: string }> {
    try {
      // Get current meal plan
      const { data: mealPlan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .single();

      if (fetchError || !mealPlan) {
        return { success: false, error: 'Meal plan not found' };
      }

      const generatedMeals = mealPlan.generated_meals as any;
      if (!generatedMeals?.isManual) {
        return { success: false, error: 'This is not a manual meal plan' };
      }

      // Remove meal
      const updatedMeals = (generatedMeals.meals || []).filter((m: any) => m.id !== mealId);

      // Recalculate plan nutrition
      const planNutrition = this.calculateManualPlanNutrition(updatedMeals);

      // Update database
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({ 
          generated_meals: { ...generatedMeals, meals: updatedMeals },
          nutrition_summary: planNutrition,
          updated_at: new Date().toISOString()
        })
        .eq('id', mealPlanId);

      if (updateError) throw updateError;

      // Return updated meal plan
      const updatedMealPlan: ManualMealPlan = {
        id: mealPlan.id,
        clientId: mealPlan.client_id,
        nutritionistId: mealPlan.nutritionist_id,
        planName: mealPlan.plan_name,
        planDate: mealPlan.plan_date,
        planType: mealPlan.plan_type,
        status: mealPlan.status,
        isManual: true,
        meals: updatedMeals,
        nutritionSummary: planNutrition
      };

      return { success: true, data: updatedMealPlan };
    } catch (error) {
      console.error('Error deleting manual meal:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Edit an ingredient in a multi-day meal plan
   */
  async editSavedMealIngredientMultiDay(
    mealPlanId: string,
    dayNumber: number,
    mealOrder: number,
    ingredientIndex: number,
    newIngredientText: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔧 EDIT MULTI-DAY MEAL INGREDIENT - START');
      console.log('mealPlanId:', mealPlanId);
      console.log('dayNumber:', dayNumber);
      console.log('mealOrder:', mealOrder);
      console.log('ingredientIndex:', ingredientIndex);
      console.log('newIngredientText:', newIngredientText);

      // Fetch the specific meal from meal_plan_meals table
      const { data: meal, error: mealError } = await supabase
        .from('meal_plan_meals')
        .select('*')
        .eq('meal_plan_id', mealPlanId)
        .eq('day_number', dayNumber)
        .eq('meal_order', mealOrder)
        .single();

      if (mealError || !meal) {
        console.log('❌ ERROR: Meal not found');
        return { success: false, error: 'Meal not found' };
      }

      // Check if ingredients are stored as strings (old format) or objects (new format)
      let ingredients: any[] = [];
      if (Array.isArray(meal.ingredients)) {
        if (meal.ingredients.length > 0 && typeof meal.ingredients[0] === 'string') {
          // Old format: array of strings, need to convert to objects
          console.log('🔄 Converting old string format to structured format');
          ingredients = meal.ingredients.map((text: string, index: number) => ({
            text: text,
            food: text.split(' ').slice(1).join(' '), // Remove first word (quantity)
            quantity: 1,
            measure: 'unit',
            weight: 100,
            foodCategory: 'unknown',
            foodId: `temp_${index}`,
            image: ''
          }));
        } else {
          // New format: array of objects
          ingredients = meal.ingredients;
        }
      }

      if (ingredientIndex >= ingredients.length) {
        console.log('❌ ERROR: Invalid ingredient index');
        return { success: false, error: 'Invalid ingredient index' };
      }

      const oldIngredient = ingredients[ingredientIndex];
      console.log('🔄 OLD INGREDIENT:', oldIngredient);

      // Parse the new ingredient text to extract quantity, measure, and food
      const parsedIngredient = await this.edamamService.parseIngredientText(newIngredientText);
      if (!parsedIngredient) {
        return {
          success: false,
          error: 'Failed to parse ingredient text'
        };
      }
      
      // Update ingredient fields
      ingredients[ingredientIndex] = parsedIngredient;
      
      console.log('🔄 UPDATED INGREDIENT:', {
        text: newIngredientText,
        quantity: parsedIngredient.quantity,
        measure: parsedIngredient.measure,
        food: parsedIngredient.food
      });

      // Recalculate nutrition from all ingredients
      let totalCalories: number = 0;
      let totalWeight: number = 0;
      const totalNutrients: { [key: string]: { label?: string; quantity: number; unit: string } } = {};

      for (const ing of ingredients) {
        // Ensure we have the text property (handle both string and object formats)
        const ingredientText = typeof ing === 'string' ? ing : ing.text;
        console.log('🔍 Processing ingredient:', ingredientText);
        
        // Get nutrition data for this ingredient
        const nutritionData = await this.edamamService.getIngredientNutrition(ingredientText);
        if (nutritionData) {
          totalCalories += nutritionData.calories || 0;
          totalWeight += nutritionData.weight || 0;
          
          // Add to total nutrients
          Object.entries(nutritionData.totalNutrients || {}).forEach(([key, value]: [string, any]) => {
            if (totalNutrients[key]) {
              totalNutrients[key].quantity += value.quantity || 0;
            } else {
              totalNutrients[key] = {
                label: value.label,
                quantity: value.quantity || 0,
                unit: value.unit
              };
            }
          });
        }
      }

      // Calculate per-serving values (assuming 1 serving per meal)
      const servings = 1;
      const caloriesPerServing = Math.round(totalCalories / servings);
      const proteinPerServing = Math.round((totalNutrients.PROCNT?.quantity || 0) / servings);
      const carbsPerServing = Math.round((totalNutrients.CHOCDF?.quantity || 0) / servings);
      const fatPerServing = Math.round((totalNutrients.FAT?.quantity || 0) / servings);
      const fiberPerServing = Math.round((totalNutrients.FIBTG?.quantity || 0) / servings);

      console.log('📊 RECALCULATED NUTRITION:', {
        totalCalories,
        caloriesPerServing,
        proteinPerServing,
        carbsPerServing,
        fatPerServing,
        fiberPerServing
      });

      // Update the meal in database
      const { error: updateError } = await supabase
        .from('meal_plan_meals')
        .update({
          ingredients: ingredients,
          calories_per_serving: caloriesPerServing,
          protein_grams: proteinPerServing,
          carbs_grams: carbsPerServing,
          fat_grams: fatPerServing,
          fiber_grams: fiberPerServing,
          total_calories: caloriesPerServing,
          total_protein_grams: proteinPerServing,
          total_carbs_grams: carbsPerServing,
          total_fat_grams: fatPerServing,
          total_fiber_grams: fiberPerServing
        })
        .eq('id', meal.id);

      if (updateError) {
        console.log('❌ ERROR updating meal:', updateError);
        return { success: false, error: 'Failed to update meal' };
      }

      // Get updated meal plan data for response
      const updatedMealPlan = await this.getMealPlanWithView(mealPlanId, 'consolidated');

      console.log('✅ EDIT MULTI-DAY MEAL INGREDIENT - SUCCESS');
      return { 
        success: true, 
        data: {
          mealPlan: updatedMealPlan.data?.mealPlan,
          days: updatedMealPlan.data?.days,
          overallStats: updatedMealPlan.data?.overallStats,
          updatedMeal: {
            dayNumber,
            mealOrder,
            ingredientIndex,
            newIngredient: {
              ...ingredients[ingredientIndex],
              text: newIngredientText,
              quantity: parsedIngredient.quantity,
              measure: parsedIngredient.measure,
              food: parsedIngredient.food
            },
            updatedNutrition: {
              caloriesPerServing,
              proteinPerServing,
              carbsPerServing,
              fatPerServing,
              fiberPerServing
            }
          }
        }
      };

    } catch (error) {
      console.error('❌ ERROR in editSavedMealIngredientMultiDay:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Edit an ingredient in a preview meal plan
   */
  async editPreviewMealIngredientMultiDay(
    previewId: string,
    dayNumber: number,
    mealOrder: number,
    ingredientIndex: number,
    newIngredientText: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🔧 EDIT PREVIEW MEAL INGREDIENT - START');
      console.log('previewId:', previewId);
      console.log('dayNumber:', dayNumber);
      console.log('mealOrder:', mealOrder);
      console.log('ingredientIndex:', ingredientIndex);
      console.log('newIngredientText:', newIngredientText);

      // Get the meal plan data using the getMealPlan function
      const mealPlan = await this.getMealPlan(previewId);
      if (!mealPlan) {
        return { success: false, error: 'Preview not found' };
      }

      // Get the meals data
      const rawMeals = mealPlan.meals;
      if (!Array.isArray(rawMeals)) {
        return { success: false, error: 'Invalid meal data structure' };
      }

      // Find the specific meal in the data
      const mealIndex = rawMeals.findIndex(
        (m: any) => m.mealOrder === mealOrder
      );

      if (mealIndex === -1) {
        console.log('Available meals:', rawMeals.map(m => ({ mealOrder: m.mealOrder, mealType: m.mealType })));
        return { success: false, error: 'Meal not found in preview' };
      }

      const meal = rawMeals[mealIndex];

      console.log('🔍 MEAL OBJECT RIGHT AFTER FETCH:', {
        'meal.totalProtein': meal.totalProtein,
        'meal.protein': meal.protein,
        'meal.proteinGrams': meal.proteinGrams,
        'meal object keys': Object.keys(meal),
        'meal ID': meal.id
      });

      // Check if ingredients exist
      // The GeneratedMeal format has ingredients as an array of strings
      if (!meal.ingredients || ingredientIndex >= meal.ingredients.length) {
        return { success: false, error: 'Invalid ingredient index' };
      }

      const oldIngredient = meal.ingredients[ingredientIndex];
      console.log('🔄 OLD INGREDIENT:', oldIngredient);

      // Get nutrition data for the old ingredient to subtract
      // Handle both string and object formats for ingredients
      let oldIngredientText = typeof oldIngredient === 'string' ? oldIngredient : oldIngredient.text;
      
      // Normalize ingredient text to improve Edamam parsing consistency
      oldIngredientText = this.normalizeIngredientText(oldIngredientText);
      console.log('🔄 OLD INGREDIENT TEXT (normalized):', oldIngredientText);
      
      let oldNutritionData: any = null;
      if (oldIngredientText) {
        console.log('🔍 CALLING EDAMAM FOR OLD INGREDIENT:', oldIngredientText);
        oldNutritionData = await this.edamamService.getIngredientNutrition(oldIngredientText);
        console.log('🔄 OLD INGREDIENT NUTRITION:', oldNutritionData);
        console.log('🔍 OLD INGREDIENT HAS INGREDIENTS?:', !!oldNutritionData?.ingredients);
        console.log('🔍 OLD INGREDIENT HAS PARSED?:', !!oldNutritionData?.ingredients?.[0]?.parsed);
        console.log('🔍 OLD INGREDIENT PARSED LENGTH:', oldNutritionData?.ingredients?.[0]?.parsed?.length);
        console.log('🔍 OLD INGREDIENT HAS NUTRIENTS?:', !!oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients);
        if (oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients) {
          console.log('🔍 OLD INGREDIENT PROTEIN VALUE:', oldNutritionData.ingredients[0].parsed[0].nutrients.PROCNT?.quantity);
          console.log('🔍 OLD INGREDIENT FAT VALUE:', oldNutritionData.ingredients[0].parsed[0].nutrients.FAT?.quantity);
        }
      } else {
        console.log('⚠️ OLD INGREDIENT TEXT IS EMPTY - SKIPPING SUBTRACTION');
      }

      // Get nutrition data for the new ingredient to add
      const normalizedNewIngredientText = this.normalizeIngredientText(newIngredientText);
      console.log('🔄 NEW INGREDIENT TEXT (normalized):', normalizedNewIngredientText);
      const newNutritionData = await this.edamamService.getIngredientNutrition(normalizedNewIngredientText);
      if (!newNutritionData) {
        return {
          success: false,
          error: 'Failed to get nutrition data for new ingredient'
        };
      }
      console.log('🔄 NEW INGREDIENT NUTRITION:', newNutritionData);

      // Update the ingredient object (structure without nutrition macros)
      const parsedWeight = newNutritionData.ingredients?.[0]?.parsed?.[0]?.weight || 0;
      const parsedFood = newNutritionData.ingredients?.[0]?.parsed?.[0]?.food || newIngredientText;
      const normalizedText = this.normalizeIngredientText(newIngredientText);
      
      const newIngredientObject = {
        text: normalizedText,
        quantity: Math.round(parsedWeight),
        measure: 'gram',
        food: parsedFood, // Use Edamam's parsed food name directly
        weight: parsedWeight
        // No calories, protein, carbs, fat, fiber - these are calculated at meal level
      };
      
      meal.ingredients[ingredientIndex] = newIngredientObject;
      
      console.log('🔄 UPDATED INGREDIENT OBJECT:', newIngredientObject);

      // Get current total nutrition from the meal (these are total values, not per-serving)
      let totalCalories = meal.totalCalories || 0;
      let totalProtein = meal.totalProtein || meal.protein || 0;
      let totalCarbs = meal.totalCarbs || meal.carbs || 0;
      let totalFat = meal.totalFat || meal.fat || 0;
      let totalFiber = meal.totalFiber || meal.fiber || 0;

      console.log('🔍 RAW MEAL DATA FROM DATABASE:', {
        'meal.protein': meal.protein,
        'meal.totalProtein': meal.totalProtein,
        'meal.proteinGrams': meal.proteinGrams,
        'meal object keys': Object.keys(meal)
      });
      
      console.log('📊 CURRENT MEAL TOTALS:', {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber
      });

      console.log('🔍 DETAILED MEAL DATA:', {
        mealId: meal.id,
        mealType: meal.mealType,
        mealOrder: meal.mealOrder,
        originalTotalCalories: meal.totalCalories,
        originalTotalProtein: meal.totalProtein,
        originalProtein: meal.protein,
        originalCarbs: meal.carbs,
        originalTotalCarbs: meal.totalCarbs,
        originalFat: meal.fat,
        originalTotalFat: meal.totalFat,
        originalFiber: meal.fiber,
        originalTotalFiber: meal.totalFiber,
        servingsPerMeal: meal.servingsPerMeal
      });

      // Subtract old ingredient nutrition (total values from Edamam)
      if (oldNutritionData) {
        const oldCalories = oldNutritionData.calories || oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0;
        const oldProtein = oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0;
        const oldCarbs = oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0;
        const oldFat = oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0;
        const oldFiber = oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0;
        
        console.log('🔍 OLD INGREDIENT PARSED VALUES:', {
          calories: oldCalories,
          protein: oldProtein,
          carbs: oldCarbs,
          fat: oldFat,
          fiber: oldFiber
        });
        
        console.log('🔍 OLD INGREDIENT RAW NUTRIENTS:', oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients);
        
        totalCalories -= oldCalories;
        totalProtein -= oldProtein;
        totalCarbs -= oldCarbs;
        totalFat -= oldFat;
        totalFiber -= oldFiber;

        console.log('➖ SUBTRACTED OLD INGREDIENT:', {
          calories: oldCalories,
          protein: oldProtein,
          carbs: oldCarbs,
          fat: oldFat,
          fiber: oldFiber
        });

        console.log('🧮 SUBTRACTION MATH:', {
          step: 'After subtracting old ingredient',
          totalCaloriesBefore: totalCalories + oldCalories,
          totalCaloriesAfter: totalCalories,
          totalProteinBefore: totalProtein + oldProtein,
          totalProteinAfter: totalProtein,
          totalCarbsBefore: totalCarbs + oldCarbs,
          totalCarbsAfter: totalCarbs,
          totalFatBefore: totalFat + oldFat,
          totalFatAfter: totalFat,
          totalFiberBefore: totalFiber + oldFiber,
          totalFiberAfter: totalFiber
        });
      }

      // Add new ingredient nutrition (total values from Edamam)
      const newCalories = newNutritionData.calories || newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0;
      const newProtein = newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0;
      const newCarbs = newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0;
      const newFat = newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0;
      const newFiber = newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0;
      
      console.log('🔍 NEW INGREDIENT PARSED VALUES:', {
        calories: newCalories,
        protein: newProtein,
        carbs: newCarbs,
        fat: newFat,
        fiber: newFiber
      });
      
      totalCalories += newCalories;
      totalProtein += newProtein;
      totalCarbs += newCarbs;
      totalFat += newFat;
      totalFiber += newFiber;

      console.log('➕ ADDED NEW INGREDIENT:', {
        calories: newCalories,
        protein: newProtein,
        carbs: newCarbs,
        fat: newFat,
        fiber: newFiber
      });

      console.log('🧮 ADDITION MATH:', {
        step: 'After adding new ingredient',
        totalCaloriesBefore: totalCalories - newCalories,
        totalCaloriesAfter: totalCalories,
        totalProteinBefore: totalProtein - newProtein,
        totalProteinAfter: totalProtein,
        totalCarbsBefore: totalCarbs - newCarbs,
        totalCarbsAfter: totalCarbs,
        totalFatBefore: totalFat - newFat,
        totalFatAfter: totalFat,
        totalFiberBefore: totalFiber - newFiber,
        totalFiberAfter: totalFiber
      });

      console.log('📊 NUTRITION UPDATE:', {
        oldCalories: oldNutritionData?.calories || oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0,
        newCalories: newNutritionData?.calories || newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0,
        totalCaloriesBefore: (meal.totalCalories || 0),
        totalCaloriesAfter: totalCalories,
        netChange: (newNutritionData?.calories || newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0) - (oldNutritionData?.calories || oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0)
      });

      console.log('🎯 COMPLETE MATH SUMMARY:', {
        step1_originalMealTotals: {
          calories: meal.totalCalories || 0,
          protein: meal.protein || meal.totalProtein || 0,
          carbs: meal.carbs || meal.totalCarbs || 0,
          fat: meal.fat || meal.totalFat || 0,
          fiber: meal.fiber || meal.totalFiber || 0
        },
        step2_oldIngredientValues: {
          calories: oldNutritionData?.calories || oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0,
          protein: oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0,
          carbs: oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0,
          fat: oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0,
          fiber: oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0
        },
        step3_newIngredientValues: {
          calories: newNutritionData?.calories || newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0,
          protein: newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0,
          carbs: newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0,
          fat: newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0,
          fiber: newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0
        },
        step4_finalCalculatedTotals: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
          fiber: totalFiber
        },
        step5_netChanges: {
          calories: (newNutritionData?.calories || newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0) - (oldNutritionData?.calories || oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0),
          protein: (newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0) - (oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0),
          carbs: (newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0) - (oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0),
          fat: (newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0) - (oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0),
          fiber: (newNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0) - (oldNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0)
        }
      });

      // Update meal nutrition data
      const servings = meal.servingsPerMeal || 1;
      console.log('🔍 SERVINGS VALUE:', servings);
      console.log('🔍 CALCULATED TOTALS:', {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber
      });
      
      console.log('🔍 DETAILED CALCULATION BREAKDOWN:', {
        step1_initial: {
          calories: meal.totalCalories || 0,
          protein: meal.protein || 0,
          carbs: meal.carbs || 0,
          fat: meal.fat || 0,
          fiber: meal.fiber || 0
        },
        step2_oldSubtracted: oldNutritionData ? {
          calories: oldNutritionData.calories || oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0,
          protein: oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0,
          carbs: oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0,
          fat: oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0,
          fiber: oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0
        } : 'NO_OLD_DATA',
        step3_newAdded: {
          calories: newNutritionData.calories || newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0,
          protein: newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0,
          carbs: newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0,
          fat: newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0,
          fiber: newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0
        },
        step4_final: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
          fiber: totalFiber
        }
      });
      
      console.log('🔍 BEFORE UPDATING MEAL OBJECT:', {
        'meal.protein': meal.protein,
        'calculated totalProtein': totalProtein
      });
      
      meal.totalCalories = totalCalories;
      meal.protein = totalProtein;
      meal.carbs = totalCarbs;
      meal.fat = totalFat;
      meal.fiber = totalFiber;
      
      // Also update the total* fields for consistency
      meal.totalProtein = totalProtein;
      meal.totalCarbs = totalCarbs;
      meal.totalFat = totalFat;
      meal.totalFiber = totalFiber;
      
      console.log('🔍 AFTER UPDATING MEAL OBJECT:', {
        'meal.protein': meal.protein,
        'meal.carbs': meal.carbs,
        'meal.fat': meal.fat,
        'meal.fiber': meal.fiber
      });
      
      // Preserve the servingsPerMeal field
      meal.servingsPerMeal = servings;
      
      // Update per-serving values (divide total by servings)
      meal.caloriesPerServing = Math.round(totalCalories / servings * 100) / 100;
      meal.proteinGrams = Math.round(totalProtein / servings * 100) / 100;
      meal.carbsGrams = Math.round(totalCarbs / servings * 100) / 100;
      meal.fatGrams = Math.round(totalFat / servings * 100) / 100;
      meal.fiberGrams = Math.round(totalFiber / servings * 100) / 100;

      console.log('📊 RECALCULATED NUTRITION:', {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber,
        caloriesPerServing: meal.caloriesPerServing,
        proteinPerServing: meal.proteinGrams,
        carbsPerServing: meal.carbsGrams,
        fatPerServing: meal.fatGrams,
        fiberPerServing: meal.fiberGrams
      });

      // Update the rawMeals array with the modified meal
      rawMeals[mealIndex] = meal;
      
      console.log('🔍 UPDATED MEAL OBJECT BEFORE SAVE:', JSON.stringify(meal, null, 2));

      // Recalculate daily nutrition
      const dailyNutrition = this.calculateDailyNutrition(rawMeals);

      // Update the meal plan in database
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({
          generated_meals: rawMeals,
          nutrition_summary: dailyNutrition
        })
        .eq('id', previewId);

      if (updateError) {
        console.log('❌ ERROR updating preview meal plan:', updateError);
        return { success: false, error: 'Failed to update preview meal plan' };
      }

      console.log('✅ EDIT PREVIEW MEAL INGREDIENT - SUCCESS');
      
      // Create days array structure to match consolidated GET API
      const daysArray = [{
        dayNumber: 1,
        date: new Date().toISOString().split('T')[0],
        meals: rawMeals.map((m: any) => ({
          id: m.id,
          mealType: m.mealType,
          mealOrder: m.mealOrder,
          mealName: m.mealType?.toUpperCase(),
          recipeName: m.recipeName,
          recipeUrl: m.recipeUrl,
          recipeImage: m.recipeImageUrl,
          caloriesPerServing: m.caloriesPerServing,
          totalCalories: m.totalCalories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          fiber: m.fiber,
          ingredients: m.ingredients
        })),
        dailyNutrition: dailyNutrition,
        mealCount: rawMeals.length
      }];

      // Calculate overall stats
      const overallStats = {
        totalDays: 1,
        totalMeals: rawMeals.length,
        averageMealsPerDay: rawMeals.length,
        totalCalories: dailyNutrition.totalCalories,
        totalProtein: dailyNutrition.totalProtein,
        totalCarbs: dailyNutrition.totalCarbs,
        totalFat: dailyNutrition.totalFat,
        totalFiber: dailyNutrition.totalFiber,
        averageCaloriesPerDay: dailyNutrition.totalCalories
      };

      // Create detailed calculation breakdown for debugging
      const calculationBreakdown = {
        step1_initial: {
          calories: meal.totalCalories || 0,
          protein: meal.totalProtein || meal.protein || 0,
          carbs: meal.totalCarbs || meal.carbs || 0,
          fat: meal.totalFat || meal.fat || 0,
          fiber: meal.totalFiber || meal.fiber || 0
        },
        step2_oldSubtracted: oldNutritionData ? {
          calories: oldNutritionData.calories || oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0,
          protein: oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0,
          carbs: oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0,
          fat: oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0,
          fiber: oldNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0
        } : 'NO_OLD_DATA',
        step3_newAdded: {
          calories: newNutritionData.calories || newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0,
          protein: newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0,
          carbs: newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0,
          fat: newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0,
          fiber: newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0
        },
        step4_final: {
          calories: totalCalories,
          protein: totalProtein,
          carbs: totalCarbs,
          fat: totalFat,
          fiber: totalFiber
        },
        edamamRequests: {
          oldIngredientText: oldIngredientText,
          newIngredientText: newIngredientText
        },
        debugMealObject: {
          'meal.totalProtein': meal.totalProtein,
          'meal.protein': meal.protein,
          'meal.proteinGrams': meal.proteinGrams,
          'meal.totalCalories': meal.totalCalories,
          'meal.totalCarbs': meal.totalCarbs,
          'meal.totalFat': meal.totalFat,
          'meal.totalFiber': meal.totalFiber,
          'meal object keys': Object.keys(meal),
          'meal ID': meal.id,
          'firstIngredient': meal.ingredients?.[0]
        }
      };

      return { 
        success: true, 
        data: {
          mealPlan: {
            id: previewId,
            meals: rawMeals.map((m: any) => ({
              id: m.id,
              mealType: m.mealType,
              mealOrder: m.mealOrder,
              mealName: m.mealType?.toUpperCase(),
              recipeName: m.recipeName,
              recipeUrl: m.recipeUrl,
              recipeImage: m.recipeImageUrl,
              caloriesPerServing: m.caloriesPerServing,
              totalCalories: m.totalCalories,
              protein: m.protein,
              carbs: m.carbs,
              fat: m.fat,
              fiber: m.fiber,
              ingredients: m.ingredients
            }))
          },
          days: daysArray,
          overallStats: overallStats,
          totalDays: 1,
          calculationBreakdown: calculationBreakdown
        }
      };

    } catch (error) {
      console.error('❌ ERROR in editPreviewMealIngredientMultiDay:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delete an ingredient from a preview meal plan
   */
  async deletePreviewMealIngredientMultiDay(
    previewId: string,
    dayNumber: number,
    mealOrder: number,
    ingredientIndex: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🗑️ DELETE PREVIEW MEAL INGREDIENT - START');
      console.log('previewId:', previewId);
      console.log('dayNumber:', dayNumber);
      console.log('mealOrder:', mealOrder);
      console.log('ingredientIndex:', ingredientIndex);

      // Get the meal plan data using the getMealPlan function (same as edit)
      const mealPlan = await this.getMealPlan(previewId);
      if (!mealPlan) {
        return { success: false, error: 'Preview not found' };
      }

      // Get the meals data
      const rawMeals = mealPlan.meals;
      if (!Array.isArray(rawMeals)) {
        return { success: false, error: 'Invalid meal data structure' };
      }

      // Find the specific meal in the raw data
      // For preview meals, we need to look at the meal structure differently
      console.log('🔍 Looking for meal with mealOrder:', mealOrder);
      console.log('🔍 Available meals:', rawMeals.map(m => ({ 
        mealOrder: m.mealOrder, 
        mealType: m.mealType,
        id: m.id,
        keys: Object.keys(m)
      })));
      
      // Find the specific meal in the data
      const mealIndex = rawMeals.findIndex(
        (m: any) => m.mealOrder === mealOrder
      );

      if (mealIndex === -1) {
        console.log('Available meals:', rawMeals.map(m => ({ mealOrder: m.mealOrder, mealType: m.mealType })));
        return { success: false, error: 'Meal not found in preview' };
      }

      const meal = rawMeals[mealIndex];

      // Check if ingredients exist
      if (!meal.ingredients || ingredientIndex >= meal.ingredients.length) {
        return { success: false, error: 'Invalid ingredient index' };
      }

      const deletedIngredient = meal.ingredients[ingredientIndex];
      console.log('🗑️ DELETING INGREDIENT:', deletedIngredient);

      // Get nutrition data for the ingredient to be deleted
      let deletedIngredientText = typeof deletedIngredient === 'string' ? deletedIngredient : deletedIngredient.text;
      
      // Normalize ingredient text for consistent Edamam parsing
      deletedIngredientText = this.normalizeIngredientText(deletedIngredientText);
      console.log('🗑️ DELETED INGREDIENT TEXT (normalized):', deletedIngredientText);
      
      let deletedNutritionData: any = null;
      if (deletedIngredientText) {
        deletedNutritionData = await this.edamamService.getIngredientNutrition(deletedIngredientText);
      console.log('🗑️ DELETED INGREDIENT NUTRITION:', deletedNutritionData);
      }

      // Remove the ingredient
      meal.ingredients.splice(ingredientIndex, 1);

      // Get current total nutrition from the meal (same logic as edit)
      let totalCalories = meal.totalCalories || 0;
      let totalProtein = meal.totalProtein || meal.protein || 0;
      let totalCarbs = meal.totalCarbs || meal.carbs || 0;
      let totalFat = meal.totalFat || meal.fat || 0;
      let totalFiber = meal.totalFiber || meal.fiber || 0;

      console.log('📊 CURRENT MEAL TOTALS BEFORE DELETE:', {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber
      });

      // Subtract deleted ingredient nutrition (same parsing as edit)
      if (deletedNutritionData) {
        const deletedCalories = deletedNutritionData.calories || deletedNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0;
        const deletedProtein = deletedNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0;
        const deletedCarbs = deletedNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0;
        const deletedFat = deletedNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0;
        const deletedFiber = deletedNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0;
        
        totalCalories -= deletedCalories;
        totalProtein -= deletedProtein;
        totalCarbs -= deletedCarbs;
        totalFat -= deletedFat;
        totalFiber -= deletedFiber;

        console.log('➖ SUBTRACTED DELETED INGREDIENT:', {
          calories: deletedCalories,
          protein: deletedProtein,
          carbs: deletedCarbs,
          fat: deletedFat,
          fiber: deletedFiber
        });
      }

      console.log('📊 NUTRITION UPDATE:', {
        deletedCalories: deletedNutritionData?.calories || deletedNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0,
        totalCaloriesBefore: meal.totalCalories || 0,
        totalCaloriesAfter: totalCalories,
        netChange: -(deletedNutritionData?.calories || deletedNutritionData?.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0)
      });

      // Update meal nutrition data (same logic as edit)
      const servings = meal.servingsPerMeal || 1;
      meal.totalCalories = totalCalories;
      meal.protein = totalProtein;
      meal.carbs = totalCarbs;
      meal.fat = totalFat;
      meal.fiber = totalFiber;
      
      // Also update the total* fields for consistency
      meal.totalProtein = totalProtein;
      meal.totalCarbs = totalCarbs;
      meal.totalFat = totalFat;
      meal.totalFiber = totalFiber;
      
      // Preserve the servingsPerMeal field
      meal.servingsPerMeal = servings;
      
      // Update per-serving values (divide total by servings)
      meal.caloriesPerServing = Math.round(totalCalories / servings * 100) / 100;
      meal.proteinGrams = Math.round(totalProtein / servings * 100) / 100;
      meal.carbsGrams = Math.round(totalCarbs / servings * 100) / 100;
      meal.fatGrams = Math.round(totalFat / servings * 100) / 100;
      meal.fiberGrams = Math.round(totalFiber / servings * 100) / 100;

      console.log('📊 RECALCULATED NUTRITION:', {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber,
        caloriesPerServing: meal.caloriesPerServing,
        proteinPerServing: meal.proteinGrams,
        carbsPerServing: meal.carbsGrams,
        fatPerServing: meal.fatGrams,
        fiberPerServing: meal.fiberGrams
      });

      // Update the rawMeals array with the modified meal
      rawMeals[mealIndex] = meal;

      // Recalculate daily nutrition
      const dailyNutrition = this.calculateDailyNutrition(rawMeals);

      // Update the meal plan in database
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({
          generated_meals: rawMeals,
          nutrition_summary: dailyNutrition
        })
        .eq('id', previewId);

      if (updateError) {
        console.log('❌ ERROR updating preview meal plan:', updateError);
        return { success: false, error: 'Failed to update preview meal plan' };
      }

      console.log('✅ DELETE PREVIEW MEAL INGREDIENT - SUCCESS');
      
      // Create days array structure to match consolidated GET API
      const daysArray = [{
        dayNumber: 1,
        date: new Date().toISOString().split('T')[0],
        meals: rawMeals.map((m: any) => ({
          id: m.id,
          mealType: m.mealType,
          mealOrder: m.mealOrder,
          mealName: m.mealType?.toUpperCase(),
          recipeName: m.recipeName,
          recipeUrl: m.recipeUrl,
          recipeImage: m.recipeImageUrl,
          caloriesPerServing: m.caloriesPerServing,
          totalCalories: m.totalCalories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          fiber: m.fiber,
          ingredients: m.ingredients
        })),
        dailyNutrition: dailyNutrition,
        mealCount: rawMeals.length
      }];

      // Calculate overall stats
      const overallStats = {
        totalDays: 1,
        totalMeals: rawMeals.length,
        averageMealsPerDay: rawMeals.length,
        totalCalories: dailyNutrition.totalCalories,
        totalProtein: dailyNutrition.totalProtein,
        totalCarbs: dailyNutrition.totalCarbs,
        totalFat: dailyNutrition.totalFat,
        totalFiber: dailyNutrition.totalFiber,
        averageCaloriesPerDay: dailyNutrition.totalCalories
      };

      return { 
        success: true, 
        data: {
          mealPlan: {
            id: previewId,
            meals: rawMeals.map((m: any) => ({
              id: m.id,
              mealType: m.mealType,
              mealOrder: m.mealOrder,
              mealName: m.mealType?.toUpperCase(),
              recipeName: m.recipeName,
              recipeUrl: m.recipeUrl,
              recipeImage: m.recipeImageUrl,
              caloriesPerServing: m.caloriesPerServing,
              totalCalories: m.totalCalories,
              protein: m.protein,
              carbs: m.carbs,
              fat: m.fat,
              fiber: m.fiber,
              ingredients: m.ingredients
            }))
          },
          days: daysArray,
          overallStats: overallStats,
          totalDays: 1
        }
      };

    } catch (error) {
      console.error('❌ ERROR in deletePreviewMealIngredientMultiDay:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Add an ingredient to a meal in the preview
   */
  async addPreviewMealIngredientMultiDay(
    previewId: string,
    dayNumber: number,
    mealOrder: number,
    newIngredientText: string
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('➕ ADD PREVIEW MEAL INGREDIENT - START');
      console.log('previewId:', previewId);
      console.log('dayNumber:', dayNumber);
      console.log('mealOrder:', mealOrder);
      console.log('newIngredientText:', newIngredientText);

      // Get the meal plan data using the getMealPlan function (same as edit)
      const mealPlan = await this.getMealPlan(previewId);
      if (!mealPlan) {
        return { success: false, error: 'Preview not found' };
      }

      // Get the meals data
      const rawMeals = mealPlan.meals;
      if (!Array.isArray(rawMeals)) {
        return { success: false, error: 'Invalid meal data structure' };
      }

      // Find the specific meal in the data
      const mealIndex = rawMeals.findIndex(
        (m: any) => m.mealOrder === mealOrder
      );

      if (mealIndex === -1) {
        console.log('Available meals:', rawMeals.map(m => ({ mealOrder: m.mealOrder, mealType: m.mealType })));
        return { success: false, error: 'Meal not found in preview' };
      }

      const meal = rawMeals[mealIndex];

      // Get nutrition data for the new ingredient to add
      const normalizedNewIngredientText = this.normalizeIngredientText(newIngredientText);
      console.log('➕ NEW INGREDIENT TEXT (normalized):', normalizedNewIngredientText);
      const newNutritionData = await this.edamamService.getIngredientNutrition(normalizedNewIngredientText);
      if (!newNutritionData) {
        return {
          success: false,
          error: 'Failed to get nutrition data for new ingredient'
        };
      }
      console.log('➕ NEW INGREDIENT NUTRITION:', newNutritionData);

      // Create new ingredient object (same logic as edit)
      const parsedWeight = newNutritionData.ingredients?.[0]?.parsed?.[0]?.weight || 0;
      const parsedFood = newNutritionData.ingredients?.[0]?.parsed?.[0]?.food || newIngredientText;
      
      const newIngredientObject = {
        text: normalizedNewIngredientText,
        quantity: Math.round(parsedWeight),
        measure: 'gram',
        food: parsedFood, // Use Edamam's parsed food name directly
        weight: parsedWeight
      };
      
      // Add ingredient to meal
      meal.ingredients = meal.ingredients || [];
      meal.ingredients.push(newIngredientObject);
      
      console.log('➕ ADDED INGREDIENT OBJECT:', newIngredientObject);

      // Get current total nutrition from the meal (same logic as edit)
      let totalCalories = meal.totalCalories || 0;
      let totalProtein = meal.totalProtein || meal.protein || 0;
      let totalCarbs = meal.totalCarbs || meal.carbs || 0;
      let totalFat = meal.totalFat || meal.fat || 0;
      let totalFiber = meal.totalFiber || meal.fiber || 0;

      console.log('📊 CURRENT MEAL TOTALS BEFORE ADD:', {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber
      });

      // Add new ingredient nutrition (same parsing as edit, no subtraction)
      const newCalories = newNutritionData.calories || newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.ENERC_KCAL?.quantity || 0;
      const newProtein = newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.PROCNT?.quantity || 0;
      const newCarbs = newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.CHOCDF?.quantity || 0;
      const newFat = newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FAT?.quantity || 0;
      const newFiber = newNutritionData.ingredients?.[0]?.parsed?.[0]?.nutrients?.FIBTG?.quantity || 0;
      
      totalCalories += newCalories;
      totalProtein += newProtein;
      totalCarbs += newCarbs;
      totalFat += newFat;
      totalFiber += newFiber;

      console.log('➕ ADDED NEW INGREDIENT NUTRITION:', {
        calories: newCalories,
        protein: newProtein,
        carbs: newCarbs,
        fat: newFat,
        fiber: newFiber
      });

      // Update meal nutrition data (same logic as edit)
      const servings = meal.servingsPerMeal || 1;
      meal.totalCalories = totalCalories;
      meal.protein = totalProtein;
      meal.carbs = totalCarbs;
      meal.fat = totalFat;
      meal.fiber = totalFiber;
      
      // Also update the total* fields for consistency
      meal.totalProtein = totalProtein;
      meal.totalCarbs = totalCarbs;
      meal.totalFat = totalFat;
      meal.totalFiber = totalFiber;
      
      // Preserve the servingsPerMeal field
      meal.servingsPerMeal = servings;
      
      // Update per-serving values (divide total by servings)
      meal.caloriesPerServing = Math.round(totalCalories / servings * 100) / 100;
      meal.proteinGrams = Math.round(totalProtein / servings * 100) / 100;
      meal.carbsGrams = Math.round(totalCarbs / servings * 100) / 100;
      meal.fatGrams = Math.round(totalFat / servings * 100) / 100;
      meal.fiberGrams = Math.round(totalFiber / servings * 100) / 100;

      console.log('📊 RECALCULATED NUTRITION:', {
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        totalFiber,
        caloriesPerServing: meal.caloriesPerServing,
        proteinPerServing: meal.proteinGrams,
        carbsPerServing: meal.carbsGrams,
        fatPerServing: meal.fatGrams,
        fiberPerServing: meal.fiberGrams
      });

      // Update the rawMeals array with the modified meal
      rawMeals[mealIndex] = meal;

      // Recalculate daily nutrition
      const dailyNutrition = this.calculateDailyNutrition(rawMeals);

      // Update the meal plan in database
      const { error: updateError } = await supabase
        .from('meal_plans')
        .update({
          generated_meals: rawMeals,
          nutrition_summary: dailyNutrition
        })
        .eq('id', previewId);

      if (updateError) {
        console.log('❌ ERROR updating preview meal plan:', updateError);
        return { success: false, error: 'Failed to update preview meal plan' };
      }

      console.log('✅ ADD PREVIEW MEAL INGREDIENT - SUCCESS');
      
      // Create days array structure to match consolidated GET API
      const daysArray = [{
        dayNumber: 1,
        date: new Date().toISOString().split('T')[0],
        meals: rawMeals.map((m: any) => ({
          id: m.id,
          mealType: m.mealType,
          mealOrder: m.mealOrder,
          mealName: m.mealType?.toUpperCase(),
          recipeName: m.recipeName,
          recipeUrl: m.recipeUrl,
          recipeImage: m.recipeImageUrl,
          caloriesPerServing: m.caloriesPerServing,
          totalCalories: m.totalCalories,
          protein: m.protein,
          carbs: m.carbs,
          fat: m.fat,
          fiber: m.fiber,
          ingredients: m.ingredients
        })),
        dailyNutrition: dailyNutrition,
        mealCount: rawMeals.length
      }];

      // Calculate overall stats
      const overallStats = {
        totalDays: 1,
        totalMeals: rawMeals.length,
        averageMealsPerDay: rawMeals.length,
        totalCalories: dailyNutrition.totalCalories,
        totalProtein: dailyNutrition.totalProtein,
        totalCarbs: dailyNutrition.totalCarbs,
        totalFat: dailyNutrition.totalFat,
        totalFiber: dailyNutrition.totalFiber,
        averageCaloriesPerDay: dailyNutrition.totalCalories
      };

      return { 
        success: true, 
        data: {
          mealPlan: {
            id: previewId,
            meals: rawMeals.map((m: any) => ({
              id: m.id,
              mealType: m.mealType,
              mealOrder: m.mealOrder,
              mealName: m.mealType?.toUpperCase(),
              recipeName: m.recipeName,
              recipeUrl: m.recipeUrl,
              recipeImage: m.recipeImageUrl,
              caloriesPerServing: m.caloriesPerServing,
              totalCalories: m.totalCalories,
              protein: m.protein,
              carbs: m.carbs,
              fat: m.fat,
              fiber: m.fiber,
              ingredients: m.ingredients
            }))
          },
          days: daysArray,
          overallStats: overallStats,
          totalDays: 1
        }
      };

    } catch (error) {
      console.error('❌ ERROR in addPreviewMealIngredientMultiDay:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Delete an ingredient from a multi-day meal plan
   */
  async deleteSavedMealIngredientMultiDay(
    mealPlanId: string,
    dayNumber: number,
    mealOrder: number,
    ingredientIndex: number
  ): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      console.log('🗑️ DELETE MULTI-DAY MEAL INGREDIENT - START');
      console.log('mealPlanId:', mealPlanId);
      console.log('dayNumber:', dayNumber);
      console.log('mealOrder:', mealOrder);
      console.log('ingredientIndex:', ingredientIndex);

      // Fetch the specific meal from meal_plan_meals table
      const { data: meal, error: mealError } = await supabase
        .from('meal_plan_meals')
        .select('*')
        .eq('meal_plan_id', mealPlanId)
        .eq('day_number', dayNumber)
        .eq('meal_order', mealOrder)
        .single();

      if (mealError || !meal) {
        console.log('❌ ERROR: Meal not found');
        return { success: false, error: 'Meal not found' };
      }

      // Check if ingredients are stored as strings (old format) or objects (new format)
      let ingredients: any[] = [];
      if (Array.isArray(meal.ingredients)) {
        if (meal.ingredients.length > 0 && typeof meal.ingredients[0] === 'string') {
          // Old format: array of strings, need to convert to objects
          console.log('🔄 Converting old string format to structured format');
          ingredients = meal.ingredients.map((text: string, index: number) => ({
            text: text,
            food: text.split(' ').slice(1).join(' '), // Remove first word (quantity)
            quantity: 1,
            measure: 'unit',
            weight: 100,
            foodCategory: 'unknown',
            foodId: `temp_${index}`,
            image: ''
          }));
        } else {
          // New format: array of objects
          ingredients = meal.ingredients;
        }
      }

      if (ingredientIndex >= ingredients.length) {
        console.log('❌ ERROR: Invalid ingredient index');
        return { success: false, error: 'Invalid ingredient index' };
      }

      const deletedIngredient = ingredients[ingredientIndex];
      console.log('🗑️ DELETING INGREDIENT:', deletedIngredient);

      // Remove the ingredient
      ingredients.splice(ingredientIndex, 1);

      // Recalculate nutrition from remaining ingredients
      let totalCalories: number = 0;
      let totalWeight: number = 0;
      const totalNutrients: { [key: string]: { label?: string; quantity: number; unit: string } } = {};

      for (const ing of ingredients) {
        // Ensure we have the text property (handle both string and object formats)
        const ingredientText = typeof ing === 'string' ? ing : ing.text;
        console.log('🔍 Processing ingredient:', ingredientText);
        
        // Get nutrition data for this ingredient
        const nutritionData = await this.edamamService.getIngredientNutrition(ingredientText);
        if (nutritionData) {
          totalCalories += nutritionData.calories || 0;
          totalWeight += nutritionData.weight || 0;
          
          // Add to total nutrients
          Object.entries(nutritionData.totalNutrients || {}).forEach(([key, value]: [string, any]) => {
            if (totalNutrients[key]) {
              totalNutrients[key].quantity += value.quantity || 0;
            } else {
              totalNutrients[key] = {
                label: value.label,
                quantity: value.quantity || 0,
                unit: value.unit
              };
            }
          });
        }
      }

      // Calculate per-serving values (assuming 1 serving per meal)
      const servings = 1;
      const caloriesPerServing = Math.round(totalCalories / servings);
      const proteinPerServing = Math.round((totalNutrients.PROCNT?.quantity || 0) / servings);
      const carbsPerServing = Math.round((totalNutrients.CHOCDF?.quantity || 0) / servings);
      const fatPerServing = Math.round((totalNutrients.FAT?.quantity || 0) / servings);
      const fiberPerServing = Math.round((totalNutrients.FIBTG?.quantity || 0) / servings);

      console.log('📊 RECALCULATED NUTRITION:', {
        totalCalories,
        caloriesPerServing,
        proteinPerServing,
        carbsPerServing,
        fatPerServing,
        fiberPerServing
      });

      // Update the meal in database
      const { error: updateError } = await supabase
        .from('meal_plan_meals')
        .update({
          ingredients: ingredients,
          calories_per_serving: caloriesPerServing,
          protein_grams: proteinPerServing,
          carbs_grams: carbsPerServing,
          fat_grams: fatPerServing,
          fiber_grams: fiberPerServing,
          total_calories: caloriesPerServing,
          total_protein_grams: proteinPerServing,
          total_carbs_grams: carbsPerServing,
          total_fat_grams: fatPerServing,
          total_fiber_grams: fiberPerServing
        })
        .eq('id', meal.id);

      if (updateError) {
        console.log('❌ ERROR updating meal:', updateError);
        return { success: false, error: 'Failed to update meal' };
      }

      // Get updated meal plan data for response
      const updatedMealPlan = await this.getMealPlanWithView(mealPlanId, 'consolidated');

      console.log('✅ DELETE MULTI-DAY MEAL INGREDIENT - SUCCESS');
      return { 
        success: true, 
        data: {
          mealPlan: updatedMealPlan.data?.mealPlan,
          days: updatedMealPlan.data?.days,
          overallStats: updatedMealPlan.data?.overallStats,
          updatedMeal: {
            dayNumber,
            mealOrder,
            deletedIngredient,
            updatedNutrition: {
              caloriesPerServing,
              proteinPerServing,
              carbsPerServing,
              fatPerServing,
              fiberPerServing
            }
          }
        }
      };

    } catch (error) {
      console.error('❌ ERROR in deleteSavedMealIngredientMultiDay:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

}
