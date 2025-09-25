import { supabase } from './supabase';
import { EdamamService } from './edamamService';
import { MealProgramMappingService } from './mealProgramMappingService';
import { ClientGoalsService } from './clientGoalsService';
import { calculateEER, calculateMacros } from './calculations';
import { mapCuisineTypesForEdamam, mergeAllergiesAndPreferencesForEdamam } from './clientGoalsMealPlanningIntegration';

// Import our new modular services
import { NutritionCalculationService } from './nutritionCalculationService';
import { MealDataTransformService } from './mealDataTransformService';
import { MealGenerationService, GeneratedMeal } from './mealGenerationService';
import { MealPlanStorageService, GeneratedMealPlan } from './mealPlanStorageService';

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

export interface MealPlanPreferences {
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  excludedIngredients?: string[];
  mealPreferences?: any;
}

/**
 * MODULAR Meal Planning Service - Clean, focused, and easy to understand
 * 
 * This service orchestrates meal plan generation by delegating specific
 * responsibilities to specialized service modules.
 */
export class MealPlanningService {
  // Core services
  private edamamService: EdamamService;
  private mealProgramMappingService: MealProgramMappingService;
  private clientGoalsService: ClientGoalsService;
  
  // Modular services
  private nutritionService: NutritionCalculationService;
  private dataTransformService: MealDataTransformService;
  private mealGenerationService: MealGenerationService;
  private storageService: MealPlanStorageService;

  constructor() {
    // Initialize core services
    this.edamamService = new EdamamService();
    this.mealProgramMappingService = new MealProgramMappingService();
    this.clientGoalsService = new ClientGoalsService();
    
    // Initialize modular services
    this.nutritionService = new NutritionCalculationService();
    this.dataTransformService = new MealDataTransformService();
    this.mealGenerationService = new MealGenerationService();
    this.storageService = new MealPlanStorageService();
  }

  /**
   * Generate a complete meal plan for a client
   * Main orchestration method that coordinates all services
   */
  async generateMealPlan(request: MealPlanGenerationRequest, userId?: string): Promise<GeneratedMealPlan> {
    console.log('🚀 Starting meal plan generation...');
    console.log('📋 Request:', JSON.stringify(request, null, 2));
    
    try {
      // 1. Get or calculate nutrition requirements
      const nutritionRequirements = await this.getNutritionRequirements(request.clientId);
      console.log('📊 Nutrition requirements:', nutritionRequirements);
      
      // 2. Get client preferences and merge with request
      const preferences = await this.getClientPreferences(request.clientId);
      const finalPreferences = this.mergePreferences(preferences, request);
      console.log('🎯 Final preferences:', finalPreferences);
      
      // 3. Calculate meal distribution (calories per meal)
      const mealDistribution = this.calculateMealDistribution(
        nutritionRequirements,
        request.targetCalories
      );
      console.log('🍽️ Meal distribution:', mealDistribution);
      
      // 4. Generate meals for the day
      const generatedMeals = await this.mealGenerationService.generateMealsForDay(
        mealDistribution,
        finalPreferences,
        request.targetCalories || nutritionRequirements.eer_calories,
        request.macroTargets
      );
      console.log(`✅ Generated ${generatedMeals.length} meals`);
      
      // 5. Enrich meals with detailed recipe information
      const enrichedMeals = await this.mealGenerationService.enrichMealsWithRecipeDetails(generatedMeals);
      
      // 6. Calculate nutrition summary with micronutrients
      const nutritionSummary = this.calculateNutritionSummary(enrichedMeals);
      console.log('📊 Nutrition summary calculated');
      
      // 7. Create final meal plan object
      const mealPlan: GeneratedMealPlan = {
        id: '', // Will be set when saved
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
        meals: enrichedMeals,
        nutritionSummary,
        generatedAt: new Date().toISOString()
      };
      
      console.log('🎉 Meal plan generation completed successfully');
      return mealPlan;
      
    } catch (error) {
      console.error('❌ Error generating meal plan:', error);
      throw error;
    }
  }

  /**
   * Save a meal plan to the database
   */
  async saveMealPlan(mealPlan: GeneratedMealPlan): Promise<string> {
    return this.storageService.saveMealPlan(mealPlan);
  }

  /**
   * Get a meal plan by ID
   */
  async getMealPlan(planId: string): Promise<GeneratedMealPlan | null> {
    return this.storageService.getMealPlan(planId);
  }

  /**
   * Get meal plan with specific view format
   */
  async getMealPlanWithView(mealPlanId: string, view: string = 'consolidated', dayNumber?: number): Promise<any> {
    return this.storageService.getMealPlanWithView(mealPlanId, view, dayNumber);
  }

  /**
   * Update meal plan status
   */
  async updateMealPlanStatus(planId: string, status: string): Promise<boolean> {
    return this.storageService.updateMealPlanStatus(planId, status);
  }

  /**
   * Delete a meal plan
   */
  async deleteMealPlan(planId: string): Promise<boolean> {
    return this.storageService.deleteMealPlan(planId);
  }

  /**
   * Save preview as final meal plan
   */
  async saveFromPreview(previewId: string, planName: string, isActive: boolean = false): Promise<any> {
    return this.storageService.saveFromPreview(previewId, planName, isActive);
  }

  /**
   * Clean up old draft meal plans
   */
  async cleanupOldDrafts(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    return this.storageService.cleanupOldDrafts();
  }

  // ========================================
  // PRIVATE HELPER METHODS
  // ========================================

  /**
   * Get or calculate nutrition requirements for a client
   */
  private async getNutritionRequirements(clientId: string) {
    let requirements = await this.getClientNutritionRequirements(clientId);
    
    if (!requirements) {
      console.log('⚠️ No client nutrition requirements found, calculating from guidelines...');
      requirements = await this.nutritionService.calculateNutritionFromGuidelines(clientId);
      
      if (!requirements) {
        throw new Error('Unable to determine nutrition requirements. Please ensure client profile is complete.');
      }
    }
    
    return requirements;
  }

  /**
   * Get client's existing nutrition requirements from database
   */
  private async getClientNutritionRequirements(clientId: string) {
    try {
      const { data, error } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.log('ℹ️ No active client goals found, will calculate from guidelines');
        return null;
      }

      return {
        eer_calories: data.eer_goal_calories,
        protein_min_grams: data.protein_goal_min,
        protein_max_grams: data.protein_goal_max,
        carbs_min_grams: data.carbs_goal_min,
        carbs_max_grams: data.carbs_goal_max,
        fat_min_grams: data.fat_goal_min,
        fat_max_grams: data.fat_goal_max,
        fiber_min_grams: 25, // Default fiber goal
        nutritionist_id: data.nutritionist_id,
        client_id: clientId
      };
    } catch (error) {
      console.error('❌ Error fetching client nutrition requirements:', error);
      return null;
    }
  }

  /**
   * Get client's dietary preferences and restrictions
   */
  private async getClientPreferences(clientId: string): Promise<MealPlanPreferences> {
    try {
      // First try to get from client_goals table
      const { data: clientGoals } = await supabase
        .from('client_goals')
        .select('allergies, preferences, cuisine_types')
        .eq('client_id', clientId)
        .eq('is_active', true)
        .single();

      if (clientGoals) {
        return {
          dietaryRestrictions: [
            ...(clientGoals.allergies || []),
            ...(clientGoals.preferences || [])
          ],
          cuisinePreferences: clientGoals.cuisine_types || [],
          excludedIngredients: []
        };
      }

      // Fallback to default preferences
      return this.getDefaultPreferences();
    } catch (error) {
      console.error('❌ Error fetching client preferences:', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Get default preferences when client preferences are not available
   */
  private getDefaultPreferences(): MealPlanPreferences {
    return {
      dietaryRestrictions: [],
      cuisinePreferences: [],
      excludedIngredients: []
    };
  }

  /**
   * Merge client preferences with request overrides
   */
  private mergePreferences(
    clientPreferences: MealPlanPreferences,
    request: MealPlanGenerationRequest
  ): MealPlanPreferences {
    return {
      dietaryRestrictions: [
        ...clientPreferences.dietaryRestrictions,
        ...(request.dietaryRestrictions || [])
      ],
      cuisinePreferences: [
        ...clientPreferences.cuisinePreferences,
        ...(request.cuisinePreferences || [])
      ],
      excludedIngredients: clientPreferences.excludedIngredients || [],
      mealPreferences: request.mealPreferences
    };
  }

  /**
   * Calculate how calories should be distributed across meals
   */
  private calculateMealDistribution(
    nutritionRequirements: any,
    targetCaloriesOverride?: number
  ): Record<string, any> {
    const totalCalories = targetCaloriesOverride || nutritionRequirements.eer_calories;
    
    // Standard distribution: Breakfast 25%, Lunch 35%, Dinner 40%
    const distribution = {
      breakfast_1: {
        mealType: 'breakfast',
        mealOrder: 1,
        targetCalories: Math.round(totalCalories * 0.25),
        mealName: 'Breakfast'
      },
      lunch_2: {
        mealType: 'lunch',
        mealOrder: 2,
        targetCalories: Math.round(totalCalories * 0.35),
        mealName: 'Lunch'
      },
      dinner_3: {
        mealType: 'dinner',
        mealOrder: 3,
        targetCalories: Math.round(totalCalories * 0.40),
        mealName: 'Dinner'
      }
    };

    console.log('📊 Calculated meal distribution:', distribution);
    return distribution;
  }

  /**
   * Calculate nutrition summary using the nutrition service
   */
  private calculateNutritionSummary(meals: GeneratedMeal[]) {
    // Convert GeneratedMeal format to format expected by calculateDailyNutrition
    const mealsForCalculation = meals.map(meal => ({
      totalCalories: meal.totalCalories,
      protein: meal.totalProtein,
      carbs: meal.totalCarbs,
      fat: meal.totalFat,
      fiber: meal.totalFiber,
      sodium: 0, // These will be calculated from totalNutrients
      sugar: 0,
      cholesterol: 0,
      calcium: 0,
      iron: 0,
      totalNutrients: meal.totalNutrients ? this.nutritionService.standardizeNutrientKeys(meal.totalNutrients) : {}
    }));
    
    return this.nutritionService.calculateDailyNutrition(mealsForCalculation);
  }
}

// Export the types for use by other modules
export { GeneratedMeal, GeneratedMealPlan, MealPlanPreferences };
