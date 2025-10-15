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

    // Convert recipe to the format used in meal plans
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
      calories: recipe.calories_per_serving,
      protein: recipe.protein_per_serving_g,
      carbs: recipe.carbs_per_serving_g,
      fat: recipe.fat_per_serving_g,
      fiber: recipe.fiber_per_serving_g,
      nutrition: {
        calories: recipe.calories_per_serving || 0,
        protein: recipe.protein_per_serving_g || 0,
        carbs: recipe.carbs_per_serving_g || 0,
        fat: recipe.fat_per_serving_g || 0,
        fiber: recipe.fiber_per_serving_g || 0
      },
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      healthLabels: recipe.health_labels || [],
      dietLabels: recipe.diet_labels || [],
      cuisineTypes: recipe.cuisine_types || [],
      isSelected: true,
      selectedAt: new Date().toISOString()
    };

    // Add recipe to the meal (replace if one exists)
    dayPlan.meals[params.mealName].recipes = [recipeForPlan];
    dayPlan.meals[params.mealName].selectedRecipeId = recipeForPlan.id;
    
    // Calculate meal nutrition
    dayPlan.meals[params.mealName].totalNutrition = {
      calories: recipeForPlan.nutrition.calories,
      protein: recipeForPlan.nutrition.protein,
      carbs: recipeForPlan.nutrition.carbs,
      fat: recipeForPlan.nutrition.fat,
      fiber: recipeForPlan.nutrition.fiber
    };

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

    // Clear the recipe
    dayPlan.meals[params.mealName].recipes = [];
    dayPlan.meals[params.mealName].selectedRecipeId = undefined;
    dayPlan.meals[params.mealName].totalNutrition = undefined;
    dayPlan.meals[params.mealName].customizations = {};

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

    console.log(`✅ Removed recipe from ${params.mealName}, day ${params.day}`);
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
    const recipe = await recipeSearchService.getRecipeDetails(`${provider}:${recipeId}`);
    
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

    // Cache the recipe
    const cacheData = {
      provider: provider,
      external_recipe_id: recipeId,
      external_recipe_uri: recipe.uri || null,
      recipe_name: recipe.title,
      recipe_source: recipe.sourceName || provider,
      recipe_url: recipe.url,
      recipe_image_url: recipe.image,
      servings: recipe.servings || 1,
      ready_in_minutes: recipe.readyInMinutes,
      total_calories: (recipe.nutrition?.calories || 0) * (recipe.servings || 1),
      calories_per_serving: recipe.nutrition?.calories || 0,
      protein_per_serving_g: recipe.nutrition?.protein || 0,
      carbs_per_serving_g: recipe.nutrition?.carbs || 0,
      fat_per_serving_g: recipe.nutrition?.fat || 0,
      fiber_per_serving_g: recipe.nutrition?.fiber || 0,
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
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
}

export const manualMealPlanService = new ManualMealPlanService();

