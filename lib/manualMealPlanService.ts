import { supabase } from './supabase';
import { MultiProviderRecipeSearchService } from './multiProviderRecipeSearchService';

const recipeSearchService = new MultiProviderRecipeSearchService();

export interface CreateManualDraftParams {
  clientId: string;
  nutritionistId: string;
  mealProgramId?: string;
  planDate: string;
  durationDays: number;
}

export interface AddRecipeParams {
  draftId: string;
  day: number;
  mealName: string;
  recipeId: string;
  provider: 'edamam' | 'spoonacular';
  source: 'api' | 'cached';
  servings?: number;
}

export interface RemoveRecipeParams {
  draftId: string;
  day: number;
  mealName: string;
  recipeId?: string; // If provided, removes specific recipe; if not, removes all recipes
  removeMealSlot?: boolean; // If true, removes entire meal slot from structure
}

export interface MealSlot {
  mealName: string;
  mealTime: string;
  targetCalories?: number;
}

export interface DayStructure {
  day: number;
  date: string;
  meals: {
    [mealName: string]: {
      recipes: any[];
      customizations: {};
      selectedRecipeId?: string;
    };
  };
}

export class ManualMealPlanService {
  
  /**
   * Create a new manual meal plan draft
   */
  async createDraft(params: CreateManualDraftParams): Promise<string> {
    console.log('📝 Creating manual meal plan draft:', params);

    // Validate client exists and belongs to nutritionist
    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id, nutritionist_id')
      .eq('id', params.clientId)
      .single();

    if (clientError || !client) {
      throw new Error('Client not found');
    }

    if (client.nutritionist_id !== params.nutritionistId) {
      throw new Error('Client does not belong to this nutritionist');
    }

    // Validate duration
    if (params.durationDays < 1 || params.durationDays > 30) {
      throw new Error('Duration must be between 1 and 30 days');
    }

    // Fetch meal program if provided (as template)
    let mealSlots: MealSlot[] = [];
    if (params.mealProgramId) {
      const { data: mealProgram, error: programError } = await supabase
        .from('meal_programs')
        .select(`
          id,
          client_id,
          meal_program_meals(
            meal_name,
            meal_time,
            target_calories,
            meal_order
          )
        `)
        .eq('id', params.mealProgramId)
        .single();

      if (programError || !mealProgram) {
        throw new Error('Meal program not found');
      }

      if (mealProgram.client_id !== params.clientId) {
        throw new Error('Meal program does not belong to this client');
      }

      // Extract meal slots from meal program
      const meals = (mealProgram as any).meal_program_meals || [];
      mealSlots = meals
        .sort((a: any, b: any) => a.meal_order - b.meal_order)
        .map((meal: any) => ({
          mealName: meal.meal_name,
          mealTime: meal.meal_time,
          targetCalories: meal.target_calories
        }));

      console.log(`✅ Using meal program template with ${mealSlots.length} meal slots`);
    }

    // Generate draft structure
    const suggestions = this.generateMealStructure(
      params.planDate,
      params.durationDays,
      mealSlots
    );

    // Generate draft ID
    const timestamp = Date.now();
    const draftId = `manual-${params.clientId}-${timestamp}`;

    // Create search params
    const searchParams = {
      creation_method: 'manual',
      client_id: params.clientId,
      plan_date: params.planDate,
      duration_days: params.durationDays,
      meal_program_template: params.mealProgramId ? true : false
    };

    // Calculate expiration (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Insert into database
    const { error: insertError } = await supabase
      .from('meal_plan_drafts')
      .insert({
        id: draftId,
        client_id: params.clientId,
        nutritionist_id: params.nutritionistId,
        status: 'draft',
        creation_method: 'manual',
        search_params: searchParams,
        suggestions: suggestions,
        plan_date: params.planDate,
        plan_duration_days: params.durationDays,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('❌ Error creating draft:', insertError);
      throw new Error(`Failed to create draft: ${insertError.message}`);
    }

    console.log(`✅ Created manual meal plan draft: ${draftId}`);
    return draftId;
  }

  /**
   * Add a recipe to a meal slot in the draft
   */
  async addRecipe(params: AddRecipeParams): Promise<void> {
    console.log('🍽️ Adding recipe to draft:', params);

    // Fetch the draft
    const { data: draft, error: draftError } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', params.draftId)
      .single();

    if (draftError || !draft) {
      throw new Error('Draft not found');
    }

    // Validate day is within plan duration
    if (params.day < 1 || params.day > draft.plan_duration_days) {
      throw new Error(`Day must be between 1 and ${draft.plan_duration_days}`);
    }

    // Fetch or get recipe from cache
    let recipe: any;
    if (params.source === 'cached') {
      recipe = await this.getRecipeFromCache(params.recipeId, params.provider);
    } else {
      recipe = await this.fetchAndCacheRecipe(params.recipeId, params.provider);
    }

    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Find the day in suggestions
    const suggestions = draft.suggestions as DayStructure[];
    const dayPlan = suggestions.find((d: DayStructure) => d.day === params.day);
    
    if (!dayPlan) {
      throw new Error(`Day ${params.day} not found in draft`);
    }

    // Find the meal
    if (!dayPlan.meals[params.mealName]) {
      throw new Error(`Meal ${params.mealName} not found for day ${params.day}`);
    }

    // Parse full nutrition details from cache (includes macros AND micros)
    let fullNutrition = null;
    if (recipe.nutrition_details) {
      try {
        fullNutrition = typeof recipe.nutrition_details === 'string' 
          ? JSON.parse(recipe.nutrition_details) 
          : recipe.nutrition_details;
      } catch (e) {
        console.error('Error parsing nutrition_details:', e);
      }
    }

    // Extract values from fullNutrition if available, otherwise fall back to column values
    const calories = fullNutrition?.calories?.quantity || parseFloat(recipe.calories_per_serving) || 0;
    const protein = fullNutrition?.macros?.protein?.quantity || parseFloat(recipe.protein_per_serving_g) || 0;
    const carbs = fullNutrition?.macros?.carbs?.quantity || parseFloat(recipe.carbs_per_serving_g) || 0;
    const fat = fullNutrition?.macros?.fat?.quantity || parseFloat(recipe.fat_per_serving_g) || 0;
    const fiber = fullNutrition?.macros?.fiber?.quantity || parseFloat(recipe.fiber_per_serving_g) || 0;

    // Convert recipe to the format used in meal plans (matching automated meal plan format)
    const recipeForPlan = {
      id: recipe.external_recipe_id || recipe.id,
      title: recipe.recipe_name || recipe.title,
      image: recipe.recipe_image_url || recipe.image,
      sourceUrl: recipe.recipe_url || recipe.sourceUrl,
      source: params.provider,
      servings: params.servings || recipe.servings || 1,
      readyInMinutes: recipe.ready_in_minutes,
      fromCache: params.source === 'cached',
      cacheId: recipe.id,
      calories: calories,
      protein: protein,
      carbs: carbs,
      fat: fat,
      fiber: fiber,
      nutrition: fullNutrition || {
        calories: { unit: 'kcal', quantity: calories },
        macros: {
          protein: { unit: 'g', quantity: protein },
          carbs: { unit: 'g', quantity: carbs },
          fat: { unit: 'g', quantity: fat },
          fiber: { unit: 'g', quantity: fiber }
        }
      },
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      healthLabels: recipe.health_labels || [],
      dietLabels: recipe.diet_labels || [],
      cuisineTypes: recipe.cuisine_types || [],
      isSelected: true,
      selectedAt: new Date().toISOString()
    };

    // Add recipe to the meal (append to existing recipes)
    if (!dayPlan.meals[params.mealName].recipes) {
      dayPlan.meals[params.mealName].recipes = [];
    }
    dayPlan.meals[params.mealName].recipes.push(recipeForPlan);
    
    // Set as selected recipe ID (for backward compatibility, use first recipe)
    if (!dayPlan.meals[params.mealName].selectedRecipeId) {
      dayPlan.meals[params.mealName].selectedRecipeId = recipeForPlan.id;
    }
    
    // Calculate total meal nutrition by summing all recipes
    dayPlan.meals[params.mealName].totalNutrition = this.calculateMealNutrition(
      dayPlan.meals[params.mealName].recipes
    );

    // Update the draft
    const { error: updateError } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.draftId);

    if (updateError) {
      throw new Error(`Failed to update draft: ${updateError.message}`);
    }

    console.log(`✅ Added recipe "${recipe.recipe_name || recipe.title}" to ${params.mealName}, day ${params.day}`);
  }

  /**
   * Remove a recipe from a meal slot
   */
  async removeRecipe(params: RemoveRecipeParams): Promise<void> {
    console.log('🗑️ Removing recipe from draft:', params);

    // Fetch the draft
    const { data: draft, error: draftError } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', params.draftId)
      .single();

    if (draftError || !draft) {
      throw new Error('Draft not found');
    }

    // Find the day in suggestions
    const suggestions = draft.suggestions as DayStructure[];
    const dayPlan = suggestions.find((d: DayStructure) => d.day === params.day);
    
    if (!dayPlan) {
      throw new Error(`Day ${params.day} not found in draft`);
    }

    // Find the meal
    if (!dayPlan.meals[params.mealName]) {
      throw new Error(`Meal ${params.mealName} not found for day ${params.day}`);
    }

    if (params.removeMealSlot) {
      // Remove entire meal slot from structure
      delete dayPlan.meals[params.mealName];
      console.log(`✅ Removed entire meal slot "${params.mealName}" from day ${params.day}`);
    } else if (params.recipeId) {
      // Remove specific recipe by ID
      const meal = dayPlan.meals[params.mealName];
      const initialCount = meal.recipes?.length || 0;
      meal.recipes = (meal.recipes || []).filter((r: any) => r.id !== params.recipeId);
      const finalCount = meal.recipes.length;
      
      if (initialCount === finalCount) {
        throw new Error(`Recipe ${params.recipeId} not found in ${params.mealName}`);
      }
      
      // Update selected recipe ID if we removed it
      if (meal.selectedRecipeId === params.recipeId && meal.recipes.length > 0) {
        meal.selectedRecipeId = meal.recipes[0].id;
      } else if (meal.recipes.length === 0) {
        meal.selectedRecipeId = undefined;
      }
      
      // Recalculate nutrition for remaining recipes
      meal.totalNutrition = meal.recipes.length > 0 
        ? this.calculateMealNutrition(meal.recipes)
        : undefined;
      
      // Remove customizations for the removed recipe
      if (meal.customizations && meal.customizations[params.recipeId]) {
        delete meal.customizations[params.recipeId];
      }
      
      console.log(`✅ Removed recipe ${params.recipeId} from ${params.mealName}, day ${params.day} (${initialCount} → ${finalCount} recipes)`);
    } else {
      // Clear all recipes, keep the empty slot
      dayPlan.meals[params.mealName].recipes = [];
      dayPlan.meals[params.mealName].selectedRecipeId = undefined;
      dayPlan.meals[params.mealName].totalNutrition = undefined;
      dayPlan.meals[params.mealName].customizations = {};
      console.log(`✅ Cleared all recipes from ${params.mealName}, day ${params.day} (slot remains)`);
    }

    // Update the draft
    const { error: updateError } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.draftId);

    if (updateError) {
      throw new Error(`Failed to update draft: ${updateError.message}`);
    }
  }

  /**
   * Finalize a manual meal plan
   */
  async finalize(draftId: string, planName: string): Promise<void> {
    console.log('✅ Finalizing manual meal plan:', draftId);

    // Fetch the draft
    const { data: draft, error: draftError } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      throw new Error('Draft not found');
    }

    if (draft.status !== 'draft') {
      throw new Error('Only drafts in draft status can be finalized');
    }

    // Validate all meal slots have recipes
    const suggestions = draft.suggestions as DayStructure[];
    for (const day of suggestions) {
      for (const [mealName, meal] of Object.entries(day.meals)) {
        if (!meal.selectedRecipeId || meal.recipes.length === 0) {
          throw new Error(`Meal slot "${mealName}" on day ${day.day} has no recipe. All meal slots must have a recipe before finalizing.`);
        }
      }
    }

    // Update to finalized status
    const { error: updateError } = await supabase
      .from('meal_plan_drafts')
      .update({
        status: 'finalized',
        plan_name: planName,
        finalized_at: new Date().toISOString(),
        expires_at: null, // No longer expires
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId);

    if (updateError) {
      throw new Error(`Failed to finalize draft: ${updateError.message}`);
    }

    console.log(`✅ Finalized meal plan: ${draftId}`);
  }

  /**
   * Get a draft with full details
   */
  async getDraft(draftId: string): Promise<any> {
    const { data: draft, error: draftError } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      return null;
    }

    return draft;
  }

  /**
   * Fetch recipe from API and cache it
   */
  private async fetchAndCacheRecipe(recipeId: string, provider: 'edamam' | 'spoonacular'): Promise<any> {
    console.log(`🔍 Fetching recipe ${recipeId} from ${provider}`);

    // Get the full recipe details from provider
    // Note: getRecipeDetails auto-detects provider from ID format
    const recipe = await recipeSearchService.getRecipeDetails(recipeId);
    
    if (!recipe) {
      throw new Error('Recipe not found');
    }

    // Check if already cached
    const { data: existingCache } = await supabase
      .from('cached_recipes')
      .select('id')
      .eq('provider', provider)
      .eq('external_recipe_id', recipeId)
      .single();

    if (existingCache) {
      console.log('✅ Recipe already cached');
      return await this.getRecipeFromCache(existingCache.id, provider);
    }

    // Extract nutrition values from standardized format
    const extractNutritionValue = (value: any) => {
      if (typeof value === 'number') return value;
      if (value?.quantity !== undefined) return value.quantity;
      return 0;
    };

    const caloriesValue = extractNutritionValue(recipe.nutrition?.calories);
    const proteinValue = extractNutritionValue(recipe.nutrition?.macros?.protein || recipe.nutrition?.protein);
    const carbsValue = extractNutritionValue(recipe.nutrition?.macros?.carbs || recipe.nutrition?.carbs);
    const fatValue = extractNutritionValue(recipe.nutrition?.macros?.fat || recipe.nutrition?.fat);
    const fiberValue = extractNutritionValue(recipe.nutrition?.macros?.fiber || recipe.nutrition?.fiber);

    // Cache the recipe with FULL nutrition details
    const cacheData = {
      provider: provider,
      external_recipe_id: recipeId,
      external_recipe_uri: recipe.uri || recipe.sourceUrl || null,
      recipe_name: recipe.title,
      recipe_source: recipe.sourceName || provider,
      recipe_url: recipe.url || recipe.sourceUrl,
      recipe_image_url: recipe.image,
      servings: recipe.servings || 1,
      ready_in_minutes: recipe.readyInMinutes,
      total_calories: caloriesValue * (recipe.servings || 1),
      calories_per_serving: caloriesValue,
      protein_per_serving_g: proteinValue,
      carbs_per_serving_g: carbsValue,
      fat_per_serving_g: fatValue,
      fiber_per_serving_g: fiberValue,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      nutrition_details: recipe.nutrition || null, // CRITICAL: Store full nutrition with micros
      health_labels: recipe.healthLabels || [],
      diet_labels: recipe.dietLabels || [],
      cuisine_types: recipe.cuisineTypes || [],
      meal_types: recipe.mealTypes || [],
      dish_types: recipe.dishTypes || [],
      cache_status: 'active',
      data_quality_score: 100,
      last_accessed_at: new Date().toISOString()
    };

    const { data: cached, error: cacheError } = await supabase
      .from('cached_recipes')
      .insert(cacheData)
      .select()
      .single();

    if (cacheError) {
      console.error('❌ Error caching recipe:', cacheError);
      // Return recipe even if caching fails
      return { ...recipe, ...cacheData };
    }

    console.log('✅ Recipe cached successfully');
    return cached;
  }

  /**
   * Get recipe from cache
   */
  private async getRecipeFromCache(recipeId: string, provider: 'edamam' | 'spoonacular'): Promise<any> {
    const { data: recipe, error } = await supabase
      .from('cached_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('provider', provider)
      .single();

    if (error || !recipe) {
      throw new Error('Cached recipe not found');
    }

    // Update last accessed timestamp
    await supabase
      .from('cached_recipes')
      .update({ last_accessed_at: new Date().toISOString() })
      .eq('id', recipeId);

    return recipe;
  }

  /**
   * Generate empty meal structure for the plan
   */
  private generateMealStructure(
    startDate: string,
    durationDays: number,
    mealSlots: MealSlot[]
  ): DayStructure[] {
    const days: DayStructure[] = [];
    const start = new Date(startDate);

    // If no meal slots provided, use default structure
    const defaultMealSlots: MealSlot[] = mealSlots.length > 0 ? mealSlots : [
      { mealName: 'breakfast', mealTime: '08:00', targetCalories: 500 },
      { mealName: 'lunch', mealTime: '12:00', targetCalories: 600 },
      { mealName: 'dinner', mealTime: '18:00', targetCalories: 600 },
      { mealName: 'snack', mealTime: '15:00', targetCalories: 200 }
    ];

    for (let i = 0; i < durationDays; i++) {
      const currentDate = new Date(start);
      currentDate.setDate(start.getDate() + i);
      
      const dayStructure: DayStructure = {
        day: i + 1,
        date: currentDate.toISOString().split('T')[0],
        meals: {}
      };

      // Create meal slots
      for (const slot of defaultMealSlots) {
        dayStructure.meals[slot.mealName] = {
          recipes: [],
          customizations: {},
          selectedRecipeId: undefined
        };
      }

      days.push(dayStructure);
    }

    return days;
  }

  /**
   * Extract numeric value from nutrition field (handles both number and object formats)
   */
  private extractNutritionValue(value: any): number {
    if (typeof value === 'number') return value;
    if (value?.quantity !== undefined) return parseFloat(value.quantity) || 0;
    return 0;
  }

  /**
   * Calculate total nutrition for a meal from multiple recipes
   */
  private calculateMealNutrition(recipes: any[]): any {
    if (!recipes || recipes.length === 0) {
      return undefined;
    }

    // Sum nutrition from all recipes
    const total: any = {
      calories: { unit: 'kcal', quantity: 0 },
      macros: {},
      micros: { vitamins: {}, minerals: {} }
    };

    for (const recipe of recipes) {
      const nutrition = recipe.nutrition;
      if (!nutrition) continue;

      // Add calories (handle both formats)
      total.calories.quantity += this.extractNutritionValue(nutrition.calories);

      // Add macros
      if (nutrition.macros) {
        for (const [key, value] of Object.entries(nutrition.macros)) {
          const val = value as any;
          if (!total.macros[key]) {
            total.macros[key] = { unit: val.unit || 'g', quantity: 0 };
          }
          total.macros[key].quantity += this.extractNutritionValue(val);
        }
      }

      // Add vitamins
      if (nutrition.micros?.vitamins) {
        for (const [key, value] of Object.entries(nutrition.micros.vitamins)) {
          const val = value as any;
          if (!total.micros.vitamins[key]) {
            total.micros.vitamins[key] = { unit: val.unit || 'mg', quantity: 0 };
          }
          total.micros.vitamins[key].quantity += this.extractNutritionValue(val);
        }
      }

      // Add minerals
      if (nutrition.micros?.minerals) {
        for (const [key, value] of Object.entries(nutrition.micros.minerals)) {
          const val = value as any;
          if (!total.micros.minerals[key]) {
            total.micros.minerals[key] = { unit: val.unit || 'mg', quantity: 0 };
          }
          total.micros.minerals[key].quantity += this.extractNutritionValue(val);
        }
      }
    }

    return total;
  }

  /**
   * Calculate day-wise and overall nutrition for a draft
   */
  async calculateDraftNutrition(draftId: string): Promise<any> {
    const draft = await this.getDraft(draftId);
    if (!draft) {
      return null;
    }

    const suggestions = draft.suggestions as DayStructure[];
    const dayWiseNutrition = [];
    const overall: any = {
      calories: { unit: 'kcal', quantity: 0 },
      macros: {},
      micros: { vitamins: {}, minerals: {} }
    };

    for (const day of suggestions) {
      const dayNutrition: any = {
        day: day.day,
        date: day.date,
        meals: {},
        dayTotal: {
          calories: { unit: 'kcal', quantity: 0 },
          macros: {},
          micros: { vitamins: {}, minerals: {} }
        }
      };

      // Calculate nutrition for each meal
      for (const [mealName, meal] of Object.entries(day.meals)) {
        const mealTotal = this.calculateMealNutrition((meal as any).recipes);
        dayNutrition.meals[mealName] = mealTotal;

        // Add to day total
        if (mealTotal) {
          this.addNutritionToTotal(dayNutrition.dayTotal, mealTotal);
        }
      }

      // Add day total to overall
      this.addNutritionToTotal(overall, dayNutrition.dayTotal);
      dayWiseNutrition.push(dayNutrition);
    }

    return {
      dayWise: dayWiseNutrition,
      overall,
      dailyAverage: this.divideTotalByDays(overall, suggestions.length)
    };
  }

  /**
   * Add nutrition to a total (helper for summing)
   */
  private addNutritionToTotal(total: any, nutrition: any): void {
    if (!nutrition) return;

    total.calories.quantity += this.extractNutritionValue(nutrition.calories);

    // Add macros
    if (nutrition.macros) {
      for (const [key, value] of Object.entries(nutrition.macros)) {
        const val = value as any;
        if (!total.macros[key]) {
          total.macros[key] = { unit: val.unit || 'g', quantity: 0 };
        }
        total.macros[key].quantity += this.extractNutritionValue(val);
      }
    }

    // Add vitamins
    if (nutrition.micros?.vitamins) {
      for (const [key, value] of Object.entries(nutrition.micros.vitamins)) {
        const val = value as any;
        if (!total.micros.vitamins[key]) {
          total.micros.vitamins[key] = { unit: val.unit || 'mg', quantity: 0 };
        }
        total.micros.vitamins[key].quantity += this.extractNutritionValue(val);
      }
    }

    // Add minerals
    if (nutrition.micros?.minerals) {
      for (const [key, value] of Object.entries(nutrition.micros.minerals)) {
        const val = value as any;
        if (!total.micros.minerals[key]) {
          total.micros.minerals[key] = { unit: val.unit || 'mg', quantity: 0 };
        }
        total.micros.minerals[key].quantity += this.extractNutritionValue(val);
      }
    }
  }

  /**
   * Divide total nutrition by number of days
   */
  private divideTotalByDays(total: any, days: number): any {
    if (days === 0) return total;

    const avg: any = {
      calories: { unit: 'kcal', quantity: total.calories.quantity / days },
      macros: {},
      micros: { vitamins: {}, minerals: {} }
    };

    // Divide macros
    if (total.macros) {
      for (const [key, value] of Object.entries(total.macros)) {
        const val = value as any;
        avg.macros[key] = { unit: val.unit, quantity: val.quantity / days };
      }
    }

    // Divide vitamins
    if (total.micros?.vitamins) {
      for (const [key, value] of Object.entries(total.micros.vitamins)) {
        const val = value as any;
        avg.micros.vitamins[key] = { unit: val.unit, quantity: val.quantity / days };
      }
    }

    // Divide minerals
    if (total.micros?.minerals) {
      for (const [key, value] of Object.entries(total.micros.minerals)) {
        const val = value as any;
        avg.micros.minerals[key] = { unit: val.unit, quantity: val.quantity / days };
      }
    }

    return avg;
  }
}

export const manualMealPlanService = new ManualMealPlanService();

