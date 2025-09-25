import { supabase } from './supabase';
import { NutritionCalculationService } from './nutritionCalculationService';

export interface GeneratedMealPlan {
  id: string;
  clientId: string;
  nutritionistId: string;
  planName: string;
  planDate: string;
  planType: 'daily' | 'weekly' | 'custom';
  status: 'draft' | 'active' | 'completed' | 'archived';
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  targetFiber: number;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  meals: any[];
  nutritionSummary: any;
  generatedAt: string;
}

/**
 * Service for handling meal plan storage and retrieval operations
 */
export class MealPlanStorageService {
  private nutritionService: NutritionCalculationService;

  constructor() {
    this.nutritionService = new NutritionCalculationService();
  }

  /**
   * Save a generated meal plan to the database
   */
  async saveMealPlan(mealPlan: GeneratedMealPlan): Promise<string> {
    try {
      console.log('💾 Saving meal plan to database...');
      
      const { data, error } = await supabase
        .from('meal_plans')
        .insert({
          client_id: mealPlan.clientId,
          nutritionist_id: mealPlan.nutritionistId,
          plan_name: mealPlan.planName,
          plan_date: mealPlan.planDate,
          plan_type: mealPlan.planType,
          status: mealPlan.status,
          target_calories: mealPlan.targetCalories,
          target_protein: mealPlan.targetProtein,
          target_carbs: mealPlan.targetCarbs,
          target_fat: mealPlan.targetFat,
          target_fiber: mealPlan.targetFiber,
          dietary_restrictions: mealPlan.dietaryRestrictions,
          cuisine_preferences: mealPlan.cuisinePreferences,
          generated_meals: mealPlan.meals,
          nutrition_summary: mealPlan.nutritionSummary,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Error saving meal plan:', error);
        throw new Error(`Failed to save meal plan: ${error.message}`);
      }

      console.log('✅ Meal plan saved successfully with ID:', data.id);
      return data.id;
      
    } catch (error) {
      console.error('❌ Error in saveMealPlan:', error);
      throw error;
    }
  }

  /**
   * Retrieve a meal plan by ID
   */
  async getMealPlan(planId: string): Promise<GeneratedMealPlan | null> {
    try {
      console.log(`🔍 Fetching meal plan: ${planId}`);
      
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          clients (
            id,
            first_name,
            last_name,
            email
          )
        `)
        .eq('id', planId)
        .single();

      if (error) {
        console.error('❌ Error fetching meal plan:', error);
        return null;
      }

      if (!data) {
        console.log('⚠️ Meal plan not found');
        return null;
      }

      // Transform database format to application format
      const mealPlan: GeneratedMealPlan = {
        id: data.id,
        clientId: data.client_id,
        nutritionistId: data.nutritionist_id,
        planName: data.plan_name,
        planDate: data.plan_date,
        planType: data.plan_type,
        status: data.status,
        targetCalories: data.target_calories,
        targetProtein: data.target_protein,
        targetCarbs: data.target_carbs,
        targetFat: data.target_fat,
        targetFiber: data.target_fiber,
        dietaryRestrictions: data.dietary_restrictions || [],
        cuisinePreferences: data.cuisine_preferences || [],
        meals: data.generated_meals || [],
        nutritionSummary: data.nutrition_summary || {},
        generatedAt: data.created_at
      };

      console.log('✅ Meal plan fetched successfully');
      return mealPlan;
      
    } catch (error) {
      console.error('❌ Error in getMealPlan:', error);
      return null;
    }
  }

  /**
   * Get meal plan with different view formats (consolidated, detailed, etc.)
   */
  async getMealPlanWithView(mealPlanId: string, view: string = 'consolidated', dayNumber?: number): Promise<any> {
    try {
      console.log(`🔍 Getting meal plan ${mealPlanId} with view: ${view}, day: ${dayNumber}`);
      
      // Check if this is an async meal plan ID (UUID format)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      const isAsyncPlan = uuidRegex.test(mealPlanId);

      if (isAsyncPlan) {
        return await this.handleAsyncMealPlan(mealPlanId);
      }

      // Regular meal plan flow
      const { data: mealPlan, error: mealPlanError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', mealPlanId)
        .single();

      if (mealPlanError || !mealPlan) {
        console.error('❌ Meal plan not found:', mealPlanError);
        throw new Error('Meal plan not found');
      }

      // Get meal program details for meal names
      const { data: mealProgramMeals } = await supabase
        .from('meal_program_meals')
        .select('*')
        .eq('meal_program_id', mealPlan.meal_program_id || '')
        .order('meal_order');

      let meals = [];
      const generatedMeals = mealPlan.generated_meals;

      // Handle different meal data formats
      if (Array.isArray(generatedMeals)) {
        // Convert GeneratedMeal format to meal_plan_meals format for consistency
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
          totalNutrients: meal.totalNutrients ? this.nutritionService.standardizeNutrientKeys(meal.totalNutrients) : {}, // Include all micronutrients with standardized keys
          nutrition: {
            calories: meal.totalCalories,
            protein: meal.totalProtein,
            carbs: meal.totalCarbs,
            fat: meal.totalFat,
            fiber: meal.totalFiber
          }
        }));
        console.log(`✅ PREVIEW MEALS FOUND: ${meals.length} meals`);
      } else {
        // Fetch from meal_plan_meals table for saved plans
        const { data: savedMeals, error: mealsError } = await supabase
          .from('meal_plan_meals')
          .select('*')
          .eq('meal_plan_id', mealPlanId)
          .order('day_number', { ascending: true })
          .order('meal_order', { ascending: true });

        if (mealsError) {
          console.error('❌ Error fetching meals:', mealsError);
          throw new Error('Failed to fetch meal data');
        }

        meals = savedMeals || [];
      }

      if (view === 'consolidated') {
        return this.buildConsolidatedView(mealPlan, meals, mealProgramMeals);
      }

      // Default view - return meal plan data as-is
      return {
        mealPlan,
        meals,
        mealProgramMeals
      };
      
    } catch (error) {
      console.error('❌ Error in getMealPlanWithView:', error);
      throw error;
    }
  }

  /**
   * Update meal plan status
   */
  async updateMealPlanStatus(planId: string, status: string): Promise<boolean> {
    try {
      console.log(`🔄 Updating meal plan ${planId} status to: ${status}`);
      
      const { error } = await supabase
        .from('meal_plans')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', planId);

      if (error) {
        console.error('❌ Error updating meal plan status:', error);
        return false;
      }

      console.log('✅ Meal plan status updated successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error in updateMealPlanStatus:', error);
      return false;
    }
  }

  /**
   * Delete a meal plan
   */
  async deleteMealPlan(planId: string): Promise<boolean> {
    try {
      console.log(`🗑️ Deleting meal plan: ${planId}`);
      
      // Delete associated meals first
      await supabase
        .from('meal_plan_meals')
        .delete()
        .eq('meal_plan_id', planId);

      // Delete the meal plan
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', planId);

      if (error) {
        console.error('❌ Error deleting meal plan:', error);
        return false;
      }

      console.log('✅ Meal plan deleted successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Error in deleteMealPlan:', error);
      return false;
    }
  }

  /**
   * Save a preview as a final meal plan
   */
  async saveFromPreview(previewId: string, planName: string, isActive: boolean = false): Promise<any> {
    try {
      console.log(`🔄 Converting preview ${previewId} to final meal plan: ${planName}`);
      
      // Fetch the draft
      const { data: plan, error: fetchError } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('id', previewId)
        .eq('status', 'draft')
        .single();

      if (fetchError || !plan) {
        throw new Error('Preview meal plan not found or not in draft status');
      }

      // Update the plan
      const { data: updatedPlan, error: updateError } = await supabase
        .from('meal_plans')
        .update({
          plan_name: planName,
          status: isActive ? 'active' : 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('id', previewId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to update meal plan: ${updateError.message}`);
      }

      console.log('✅ Preview converted to final meal plan successfully');
      return {
        success: true,
        data: updatedPlan,
        message: `Meal plan "${planName}" saved successfully`
      };
      
    } catch (error) {
      console.error('❌ Error in saveFromPreview:', error);
      throw error;
    }
  }

  /**
   * Clean up old draft meal plans
   */
  async cleanupOldDrafts(): Promise<{ success: boolean; deletedCount: number; error?: string }> {
    try {
      console.log('🧹 Cleaning up old draft meal plans...');
      
      // Delete drafts older than 24 hours
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('status', 'draft')
        .lt('created_at', oneDayAgo.toISOString())
        .select('id');

      if (error) {
        console.error('❌ Error cleaning up drafts:', error);
        return { success: false, deletedCount: 0, error: error.message };
      }

      const deletedCount = data?.length || 0;
      console.log(`✅ Cleaned up ${deletedCount} old draft meal plans`);
      
      return { success: true, deletedCount };
      
    } catch (error) {
      console.error('❌ Error in cleanupOldDrafts:', error);
      return { success: false, deletedCount: 0, error: (error as Error).message };
    }
  }

  /**
   * Handle async meal plan retrieval
   */
  private async handleAsyncMealPlan(mealPlanId: string): Promise<any> {
    // Check async_meal_plans table
    const { data: asyncMealPlan, error: asyncError } = await supabase
      .from('async_meal_plans')
      .select('*')
      .eq('id', mealPlanId)
      .single();

    if (asyncError || !asyncMealPlan) {
      throw new Error('Async meal plan not found');
    }

    // Handle based on AI model
    if (asyncMealPlan.ai_model === 'claude') {
      return this.handleClaudeAsyncMealPlan(asyncMealPlan, mealPlanId);
    } else {
      return this.handleOpenAIAsyncMealPlan(asyncMealPlan, mealPlanId);
    }
  }

  /**
   * Handle Claude async meal plan retrieval
   */
  private async handleClaudeAsyncMealPlan(asyncMealPlan: any, mealPlanId: string): Promise<any> {
    console.log('🤖 Handling Claude async meal plan');
    
    // Implementation for Claude-specific handling
    return {
      success: false,
      message: 'Claude async meal plans not yet implemented',
      data: asyncMealPlan
    };
  }

  /**
   * Handle OpenAI async meal plan retrieval
   */
  private async handleOpenAIAsyncMealPlan(asyncMealPlan: any, mealPlanId: string): Promise<any> {
    console.log('🤖 Handling OpenAI async meal plan');
    
    // Implementation for OpenAI-specific handling
    return {
      success: false,
      message: 'OpenAI async meal plans not yet implemented',
      data: asyncMealPlan
    };
  }

  /**
   * Build consolidated view for meal plan data
   */
  private buildConsolidatedView(mealPlan: any, meals: any[], mealProgramMeals: any[] = []): any {
    // Group meals by day number
    const mealsByDay = meals.reduce((acc: any, meal: any) => {
      const dayKey = `day_${meal.day_number}`;
      if (!acc[dayKey]) {
        acc[dayKey] = {
          dayNumber: meal.day_number,
          date: meal.meal_date,
          meals: []
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
        ingredients: meal.ingredients,
        totalNutrients: meal.totalNutrients ? this.nutritionService.standardizeNutrientKeys(meal.totalNutrients) : {} // Include micronutrients with standardized keys
      };

      acc[dayKey].meals.push(mealData);

      return acc;
    }, {});

    // Calculate proper daily nutrition for each day using centralized function
    Object.values(mealsByDay).forEach((day: any) => {
      day.dailyNutrition = this.nutritionService.calculateDailyNutrition(day.meals);
    });

    // Calculate overall statistics
    const days = Object.values(mealsByDay);
    const totalNutrition = this.nutritionService.calculateTotalNutrition(days);

    const overallStats = {
      totalDays: days.length,
      totalMeals: meals.length,
      averageMealsPerDay: Math.round((meals.length / Math.max(days.length, 1)) * 100) / 100,
      totalCalories: totalNutrition.totalCalories,
      totalProtein: totalNutrition.totalProtein,
      totalCarbs: totalNutrition.totalCarbs,
      totalFat: totalNutrition.totalFat,
      totalFiber: totalNutrition.totalFiber,
      averageCaloriesPerDay: Math.round((totalNutrition.totalCalories / Math.max(days.length, 1)) * 100) / 100
    };

    return {
      mealPlan: {
        id: mealPlan.id,
        clientId: mealPlan.client_id,
        nutritionistId: mealPlan.nutritionist_id,
        planName: mealPlan.plan_name,
        startDate: mealPlan.plan_date,
        endDate: mealPlan.end_date || mealPlan.plan_date,
        duration: days.length,
        planType: mealPlan.plan_type,
        status: mealPlan.status,
        targetCalories: mealPlan.target_calories,
        dietaryRestrictions: mealPlan.dietary_restrictions || [],
        cuisinePreferences: mealPlan.cuisine_preferences || [],
        excludedRecipes: mealPlan.excluded_recipes || [],
        generationMetadata: mealPlan.generation_metadata || {},
        createdAt: mealPlan.created_at,
        meals: meals
      },
      days: Object.values(mealsByDay),
      overallStats
    };
  }
}
