import { supabase } from './supabase';
import { MultiProviderRecipeSearchService } from './multiProviderRecipeSearchService';
import { checkAllergenConflicts } from './allergenChecker';
import type { ValidAllergen } from './allergenChecker';
import { simpleIngredientService } from './simpleIngredientService';

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
  provider: 'edamam' | 'spoonacular' | 'bonhappetee' | 'manual';
  source: 'api' | 'cached';
  servings?: number;
}

export interface AddRecipeWithAllergenCheckParams extends AddRecipeParams {
  clientAllergens: string[];
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
      customizations: any;
      selectedRecipeId?: string;
      totalNutrition?: any;
      mealTime?: string; // HH:MM format
      targetCalories?: number;
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
   * Add a recipe to a meal slot in the draft with allergen conflict checking
   */
  async addRecipeWithAllergenCheck(params: AddRecipeWithAllergenCheckParams): Promise<{
    allergenConflict?: {
      hasConflict: boolean;
      conflictingAllergens: ValidAllergen[];
      warning?: string;
    };
  }> {
    console.log('🍽️ Adding recipe to draft with allergen check:', params);

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

    // Handle simple ingredient recipes (ID starts with ingredient_)
    let recipe: any;
    const isSimpleIngredient = params.recipeId.startsWith('ingredient_');
    
    if (isSimpleIngredient) {
      // Get simple ingredient recipe from ingredient service
      recipe = await this.getIngredientRecipe(params.recipeId);
      if (!recipe) {
        throw new Error('Ingredient not found');
      }
    } else if (params.provider === 'manual') {
      // Get custom/manual recipe from cache
      if (params.source === 'cached') {
        // Manual recipes are stored with provider='manual' in cached_recipes
        const { data: manualRecipe, error } = await supabase
          .from('cached_recipes')
          .select('*')
          .eq('id', params.recipeId)
          .eq('provider', 'manual')
          .single();
        
        if (error || !manualRecipe) {
          throw new Error('Manual recipe not found');
        }
        recipe = manualRecipe;
      } else {
        throw new Error('Manual recipes must use source: "cached"');
      }
    } else {
      // Fetch or get recipe from cache (for regular recipes)
      if (params.source === 'cached') {
        recipe = await this.getRecipeFromCache(params.recipeId, params.provider);
      } else {
        recipe = await this.fetchAndCacheRecipe(params.recipeId, params.provider);
      }

      if (!recipe) {
        throw new Error('Recipe not found');
      }
    }

    // Check for allergen conflicts
    const allergenConflictResult = checkAllergenConflicts(
      recipe.allergens || [],
      recipe.health_labels || [],
      params.clientAllergens
    );

    // Log allergen warning if present
    if (allergenConflictResult.hasConflict) {
      console.warn('⚠️ Allergen conflict detected:', {
        recipeId: params.recipeId,
        recipeName: recipe.recipe_name || recipe.title,
        conflictingAllergens: allergenConflictResult.conflictingAllergens,
        clientAllergens: params.clientAllergens
      });
    }

    // Continue with adding the recipe (same logic as addRecipe)
    await this.addRecipeInternal(params, draft, recipe);

    return {
      allergenConflict: allergenConflictResult.hasConflict ? allergenConflictResult : undefined
    };
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

    // Handle simple ingredient recipes (ID starts with ingredient_)
    let recipe: any;
    const isSimpleIngredient = params.recipeId.startsWith('ingredient_');
    
    if (isSimpleIngredient) {
      // Get simple ingredient recipe from ingredient service
      recipe = await this.getIngredientRecipe(params.recipeId);
      if (!recipe) {
        throw new Error('Ingredient not found');
      }
    } else if (params.provider === 'manual') {
      // Get custom/manual recipe from cache
      if (params.source === 'cached') {
        // Manual recipes are stored with provider='manual' in cached_recipes
        const { data: manualRecipe, error } = await supabase
          .from('cached_recipes')
          .select('*')
          .eq('id', params.recipeId)
          .eq('provider', 'manual')
          .single();
        
        if (error || !manualRecipe) {
          throw new Error('Manual recipe not found');
        }
        recipe = manualRecipe;
      } else {
        throw new Error('Manual recipes must use source: "cached"');
      }
    } else {
      // Fetch or get recipe from cache (for regular recipes)
      if (params.source === 'cached') {
        recipe = await this.getRecipeFromCache(params.recipeId, params.provider);
      } else {
        recipe = await this.fetchAndCacheRecipe(params.recipeId, params.provider);
      }

      if (!recipe) {
        throw new Error('Recipe not found');
      }
    }

    // Add recipe using internal method
    await this.addRecipeInternal(params, draft, recipe);
  }

  /**
   * Internal method to add recipe to draft (shared by addRecipe and addRecipeWithAllergenCheck)
   */
  private async addRecipeInternal(params: AddRecipeParams, draft: any, recipe: any): Promise<void> {

    // Find the day in suggestions
    const suggestions = draft.suggestions as DayStructure[];
    const dayPlan = suggestions.find((d: DayStructure) => d.day === params.day);
    
    if (!dayPlan) {
      throw new Error(`Day ${params.day} not found in draft`);
    }

    // Find the meal (case-insensitive) or create it dynamically
    let targetMealName = params.mealName;
    const mealKeys = Object.keys(dayPlan.meals);
    
    // Try case-insensitive match first
    const matchedMeal = mealKeys.find(key => key.toLowerCase() === params.mealName.toLowerCase());
    
    if (matchedMeal) {
      targetMealName = matchedMeal;
      console.log(`✅ Found meal (case-insensitive): "${params.mealName}" → "${targetMealName}"`);
    } else {
      // Create new meal slot dynamically (without target calories - user should use meal-slot API to set those)
      console.log(`➕ Creating new meal slot: "${params.mealName}"`);
      dayPlan.meals[params.mealName] = {
        recipes: [],
        customizations: {},
        mealTime: undefined,
        targetCalories: undefined
      };
      targetMealName = params.mealName;
    }

    // Parse full nutrition details from cache (includes macros AND micros)
    let fullNutrition: any = null;
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
      allergens: recipe.allergens || [],
      cuisineTypes: recipe.cuisine_types || [],
      isSelected: true,
      selectedAt: new Date().toISOString()
    };

    // Add recipe to the meal (append to existing recipes)
    if (!dayPlan.meals[targetMealName].recipes) {
      dayPlan.meals[targetMealName].recipes = [];
    }
    dayPlan.meals[targetMealName].recipes.push(recipeForPlan);
    
    // Set as selected recipe ID (for backward compatibility, use first recipe)
    if (!dayPlan.meals[targetMealName].selectedRecipeId) {
      dayPlan.meals[targetMealName].selectedRecipeId = recipeForPlan.id;
    }
    
    // Calculate total meal nutrition by summing all recipes
    dayPlan.meals[targetMealName].totalNutrition = this.calculateMealNutrition(
      dayPlan.meals[targetMealName].recipes,
      dayPlan.meals[targetMealName].customizations
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

    // Find the meal (case-insensitive)
    let targetMealName = params.mealName;
    const mealKeys = Object.keys(dayPlan.meals);
    const matchedMeal = mealKeys.find(key => key.toLowerCase() === params.mealName.toLowerCase());
    
    if (matchedMeal) {
      targetMealName = matchedMeal;
    } else {
      throw new Error(`Meal ${params.mealName} not found for day ${params.day}`);
    }

    if (params.removeMealSlot) {
      // Remove entire meal slot from structure
      delete dayPlan.meals[targetMealName];
      console.log(`✅ Removed entire meal slot "${targetMealName}" from day ${params.day}`);
    } else if (params.recipeId) {
      // Remove specific recipe by ID
      const meal = dayPlan.meals[targetMealName];
      const initialCount = meal.recipes?.length || 0;
      meal.recipes = (meal.recipes || []).filter((r: any) => r.id !== params.recipeId);
      const finalCount = meal.recipes.length;
      
      if (initialCount === finalCount) {
        throw new Error(`Recipe ${params.recipeId} not found in ${targetMealName}`);
      }
      
      // Update selected recipe ID if we removed it
      if (meal.selectedRecipeId === params.recipeId && meal.recipes.length > 0) {
        meal.selectedRecipeId = meal.recipes[0].id;
      } else if (meal.recipes.length === 0) {
        meal.selectedRecipeId = undefined;
      }
      
      // Recalculate nutrition for remaining recipes
      meal.totalNutrition = meal.recipes.length > 0 
        ? this.calculateMealNutrition(meal.recipes, meal.customizations)
        : undefined;
      
      // Remove customizations for the removed recipe
      if (meal.customizations && meal.customizations[params.recipeId]) {
        delete meal.customizations[params.recipeId];
      }
      
      console.log(`✅ Removed recipe ${params.recipeId} from ${targetMealName}, day ${params.day} (${initialCount} → ${finalCount} recipes)`);
    } else {
      // Clear all recipes, keep the empty slot
      dayPlan.meals[targetMealName].recipes = [];
      dayPlan.meals[targetMealName].selectedRecipeId = undefined;
      dayPlan.meals[targetMealName].totalNutrition = undefined;
      dayPlan.meals[targetMealName].customizations = {};
      console.log(`✅ Cleared all recipes from ${targetMealName}, day ${params.day} (slot remains)`);
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
   * Format draft response to match automated meal plan structure
   */
  async formatDraftResponse(draft: any): Promise<any> {
    const nutritionSummary = await this.calculateDraftNutrition(draft.id);
    
    // Calculate completion stats (match automated meal plans)
    const suggestions = draft.suggestions as any[];
    let totalMeals = 0;
    let selectedMeals = 0;
    
    for (const day of suggestions) {
      const mealCount = Object.keys(day.meals || {}).length;
      totalMeals += mealCount;
      
      for (const meal of Object.values(day.meals || {})) {
        const mealData = meal as any;
        if (mealData.recipes && mealData.recipes.length > 0) {
          selectedMeals++;
        }
      }
    }
    
    const completionPercentage = totalMeals > 0 ? Math.round((selectedMeals / totalMeals) * 100) : 0;
    const isComplete = totalMeals > 0 && selectedMeals === totalMeals;

    // Extract meal slots from first day to add to searchParams (match automated structure)
    const mealSlotsArray: any[] = [];
    if (suggestions.length > 0) {
      let mealOrder = 1;
      for (const [mealName, mealData] of Object.entries(suggestions[0].meals)) {
        const meal = mealData as any;
        mealSlotsArray.push({
          mealName,
          mealTime: meal.mealTime || '00:00',
          mealOrder: mealOrder++,
          targetCalories: meal.targetCalories || 0
          // Note: mealType NOT included for manual meal plans
        });
      }
    }

    // Fetch client nutrition requirements (same as automated meal plans)
    const { data: nutritionReq } = await supabase
      .from('client_nutrition_requirements')
      .select('*')
      .eq('client_id', draft.client_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Fetch client goals (dietary preferences, allergies, and macro goals)
    const { data: clientGoal } = await supabase
      .from('client_goals')
      .select('allergies, preferences, cuisine_types, eer_goal_calories, protein_goal_min, protein_goal_max, carbs_goal_min, carbs_goal_max, fat_goal_min, fat_goal_max, fiber_goal_grams')
      .eq('client_id', draft.client_id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Build searchParams with overrideMealProgram (match automated structure)
    const searchParams = draft.search_params || {};
    
    // Always populate clientGoals and dietaryPreferences from database
    // This ensures they're present even for finalized drafts
    const enrichedSearchParams = {
      ...searchParams,
      // Add fields to match automated meal plans
      days: draft.plan_duration_days,
      startDate: draft.plan_date,
      clientGoals: {
        calories: clientGoal?.eer_goal_calories || nutritionReq?.eer_calories || 0,
        protein: clientGoal?.protein_goal_min || nutritionReq?.protein_grams || 0,
        carbs: clientGoal?.carbs_goal_min || nutritionReq?.carbs_grams || 0,
        fat: clientGoal?.fat_goal_min || nutritionReq?.fat_grams || 0,
        fiber: clientGoal?.fiber_goal_grams || nutritionReq?.fiber_grams || 0
      },
      dietaryPreferences: {
        allergies: clientGoal?.allergies || [],
        cuisineTypes: clientGoal?.cuisine_types || [],
        dietaryPreferences: clientGoal?.preferences || []
      },
      overrideMealProgram: {
        meals: mealSlotsArray
      }
    };

    return {
      id: draft.id,
      clientId: draft.client_id,
      nutritionistId: draft.nutritionist_id,
      status: draft.status,
      creationMethod: draft.creation_method,
      planName: draft.plan_name,
      planDate: draft.plan_date,
      endDate: draft.end_date,
      durationDays: draft.plan_duration_days,
      totalDays: draft.plan_duration_days, // Match automated field name
      totalMeals, // Match automated
      selectedMeals, // Match automated
      completionPercentage, // Match automated
      isComplete, // Match automated
      searchParams: enrichedSearchParams, // Includes overrideMealProgram without mealType
      suggestions: draft.suggestions,
      // Match automated: dayWiseNutrition and totalNutrition at top level, not nested in nutrition
      dayWiseNutrition: nutritionSummary?.dayWiseNutrition,
      totalNutrition: nutritionSummary?.overall, // Renamed from overall to totalNutrition
      nutrition: nutritionSummary, // Keep for backward compatibility
      createdAt: draft.created_at,
      updatedAt: draft.updated_at,
      expiresAt: draft.expires_at,
      finalizedAt: draft.finalized_at
    };
  }

  /**
   * Fetch recipe from API and cache it
   */
  private async fetchAndCacheRecipe(recipeId: string, provider: 'edamam' | 'spoonacular' | 'bonhappetee'): Promise<any> {
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
    const cacheData: any = {
      provider: provider,
      external_recipe_id: recipeId,
      external_recipe_uri: recipe.uri || recipe.sourceUrl || null,
      recipe_name: recipe.title,
      recipe_source: recipe.sourceName || provider,
      recipe_url: recipe.url || recipe.sourceUrl,
      recipe_image_url: recipe.image,
      servings: recipe.servings || 1,
      total_time_minutes: recipe.readyInMinutes,
      total_calories: caloriesValue * (recipe.servings || 1),
      calories_per_serving: caloriesValue,
      protein_per_serving_g: proteinValue,
      carbs_per_serving_g: carbsValue,
      fat_per_serving_g: fatValue,
      fiber_per_serving_g: fiberValue,
      ingredients: recipe.ingredients || [],
      cooking_instructions: recipe.instructions || [],
      nutrition_details: recipe.nutrition || null, // CRITICAL: Store full nutrition with micros
      health_labels: recipe.healthLabels || [],
      diet_labels: recipe.dietLabels || [],
      cuisine_types: recipe.cuisineType || recipe.cuisineTypes || [],
      meal_types: recipe.mealType || recipe.mealTypes || [],
      dish_types: recipe.dishTypes || [],
      cache_status: 'active',
      data_quality_score: 100,
      last_accessed_at: new Date().toISOString()
    };

    // Add allergens if column exists (migration 064)
    if (recipe.allergens) {
      cacheData.allergens = recipe.allergens;
    }

    console.log('💾 Attempting to cache recipe:', {
      provider,
      recipeId,
      title: cacheData.recipe_name,
      hasNutritionDetails: !!cacheData.nutrition_details,
      hasAllergens: !!cacheData.allergens
    });

    const { data: cached, error: cacheError } = await supabase
      .from('cached_recipes')
      .insert(cacheData)
      .select()
      .single();

    if (cacheError) {
      console.error('❌ Error caching Bon Happetee recipe:', {
        error: cacheError,
        message: cacheError.message,
        details: cacheError.details,
        hint: cacheError.hint,
        code: cacheError.code
      });
      // Throw error instead of silently continuing
      throw new Error(`Failed to cache recipe: ${cacheError.message}`);
    }

    console.log('✅ Recipe cached successfully:', cached.id);
    return cached;
  }

  /**
   * Get recipe from cache
   */
  private async getRecipeFromCache(recipeId: string, provider: 'edamam' | 'spoonacular' | 'bonhappetee'): Promise<any> {
    const { data: recipe, error } = await supabase
      .from('cached_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('provider', provider)
      .single();

    if (error || !recipe) {
      throw new Error('Cached recipe not found');
    }

    // Extract health labels from originalApiResponse if missing (especially for Spoonacular)
    if ((!recipe.health_labels || recipe.health_labels.length === 0) && provider === 'spoonacular') {
      const originalResponse = recipe.original_api_response;
      
      // Check if originalApiResponse has data
      const hasOriginalResponseData = originalResponse && typeof originalResponse === 'object' && Object.keys(originalResponse).length > 0;
      
      if (hasOriginalResponseData) {
        // Spoonacular stores health info as boolean flags (glutenFree, dairyFree, etc.)
        const extractedLabels: string[] = [];
        if (originalResponse.glutenFree) extractedLabels.push('gluten-free');
        if (originalResponse.dairyFree) extractedLabels.push('dairy-free');
        if (originalResponse.vegetarian) extractedLabels.push('vegetarian');
        if (originalResponse.vegan) extractedLabels.push('vegan');
        if (originalResponse.ketogenic) extractedLabels.push('ketogenic');
        if (originalResponse.lowFodmap) extractedLabels.push('low-fodmap');
        if (originalResponse.whole30) extractedLabels.push('whole30');
        
        if (extractedLabels.length > 0) {
          recipe.health_labels = extractedLabels;
          console.log(`  ✅ Extracted ${extractedLabels.length} health labels from cached originalApiResponse:`, extractedLabels);
        }
      } else {
        // originalApiResponse is empty, fetch fresh data from API
        console.log('  ⚠️ originalApiResponse is empty, fetching fresh health labels from Spoonacular API...');
        try {
          const freshRecipeDetails = await recipeSearchService.getRecipeDetails(recipe.external_recipe_id);
          if (freshRecipeDetails && freshRecipeDetails.healthLabels) {
            recipe.health_labels = freshRecipeDetails.healthLabels;
            console.log(`  ✅ Fetched ${recipe.health_labels.length} health labels from fresh API call:`, recipe.health_labels);
          }
        } catch (error) {
          console.error('  ❌ Failed to fetch fresh health labels:', error);
        }
      }
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

      // Create meal slots with target calories and meal time
      for (const slot of defaultMealSlots) {
        dayStructure.meals[slot.mealName] = {
          recipes: [],
          customizations: {},
          selectedRecipeId: undefined,
          mealTime: slot.mealTime,
          targetCalories: slot.targetCalories
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
  private calculateMealNutrition(recipes: any[], customizations?: any): any {
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
      // Check if there are customizations for this recipe
      const recipeCustomizations = customizations?.[recipe.id];
      const hasCustomNutrition = recipeCustomizations?.customizationsApplied && recipeCustomizations?.customNutrition;
      
      // Use customized nutrition if available, otherwise use base recipe nutrition
      const nutrition = hasCustomNutrition ? recipeCustomizations.customNutrition : recipe.nutrition;
      
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
    const dayWiseNutrition: any = {}; // Object with day1, day2, etc. keys (match automated)
    const overall: any = {
      calories: { unit: 'kcal', quantity: 0 },
      macros: {},
      micros: { vitamins: {}, minerals: {} }
    };

    for (const day of suggestions) {
      const dayKey = `day${day.day}`; // Create day1, day2, etc. keys
      
      const dayNutrition: any = {
        day: day.day,
        date: day.date,
        mealsCount: Object.keys(day.meals).length, // Match automated field name
        nutrition: { // Match automated: nest macros/micros under nutrition
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalFiber: 0,
          macros: {
            calories: { label: 'Calories', quantity: 0, unit: 'kcal' }
          },
          micros: { vitamins: {}, minerals: {} }
        },
        meals: {} // Meal-level breakdown
      };

      const dayTotal: any = {
        calories: { unit: 'kcal', quantity: 0 },
        macros: {},
        micros: { vitamins: {}, minerals: {} }
      };

      // Calculate nutrition for each meal
      for (const [mealName, meal] of Object.entries(day.meals)) {
        const mealData = meal as any;
        const mealTotal = this.calculateMealNutrition(mealData.recipes, mealData.customizations);
        
        // Include target comparison
        const mealWithTarget: any = {
          ...mealTotal,
          targetCalories: mealData.targetCalories,
          mealTime: mealData.mealTime
        };

        // Add calorie comparison if target exists
        if (mealData.targetCalories && mealTotal) {
          const actualCalories = mealTotal.calories?.quantity || 0;
          mealWithTarget.calorieComparison = {
            target: mealData.targetCalories,
            actual: actualCalories,
            difference: actualCalories - mealData.targetCalories,
            percentageOfTarget: Math.round((actualCalories / mealData.targetCalories) * 100)
          };
        }

        dayNutrition.meals[mealName] = mealWithTarget;

        // Add to day total
        if (mealTotal) {
          this.addNutritionToTotal(dayTotal, mealTotal);
        }
      }

      // Set totals in the flat format (match automated)
      dayNutrition.nutrition.totalCalories = dayTotal.calories.quantity;
      dayNutrition.nutrition.totalProtein = dayTotal.macros.protein?.quantity || 0;
      dayNutrition.nutrition.totalCarbs = dayTotal.macros.carbs?.quantity || 0;
      dayNutrition.nutrition.totalFat = dayTotal.macros.fat?.quantity || 0;
      dayNutrition.nutrition.totalFiber = dayTotal.macros.fiber?.quantity || 0;
      
      // Also store in object format
      dayNutrition.nutrition.macros = dayTotal.macros;
      dayNutrition.nutrition.micros = dayTotal.micros;
      dayNutrition.nutrition.calories = dayTotal.calories;

      // Add day total to overall
      this.addNutritionToTotal(overall, dayTotal);
      
      dayWiseNutrition[dayKey] = dayNutrition; // Use day1, day2, etc. as keys
    }

    return {
      dayWiseNutrition, // Match automated: object with day1, day2 keys
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

  /**
   * Create a new meal slot with target calories
   */
  async createMealSlot(params: { draftId: string; day: number; mealName: string; mealTime?: string; targetCalories?: number }): Promise<void> {
    console.log('➕ Creating meal slot:', params);

    const { data: draft, error: draftError } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', params.draftId)
      .single();

    if (draftError || !draft) {
      throw new Error('Draft not found');
    }

    const suggestions = draft.suggestions as DayStructure[];
    const dayPlan = suggestions.find((d: DayStructure) => d.day === params.day);
    
    if (!dayPlan) {
      throw new Error(`Day ${params.day} not found in draft`);
    }

    // Check if meal already exists (case-insensitive)
    const existingMeal = Object.keys(dayPlan.meals).find(
      key => key.toLowerCase() === params.mealName.toLowerCase()
    );

    if (existingMeal) {
      throw new Error(`Meal slot "${existingMeal}" already exists for day ${params.day}`);
    }

    // Create new meal slot
    dayPlan.meals[params.mealName] = {
      recipes: [],
      customizations: {},
      mealTime: params.mealTime || undefined,
      targetCalories: params.targetCalories || undefined
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

    console.log(`✅ Created meal slot "${params.mealName}" on day ${params.day}`);
  }

  /**
   * Update meal slot properties (mealTime, targetCalories)
   */
  async updateMealSlot(params: { draftId: string; day: number; mealName: string; mealTime?: string; targetCalories?: number }): Promise<void> {
    console.log('✏️ Updating meal slot:', params);

    const { data: draft, error: draftError } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', params.draftId)
      .single();

    if (draftError || !draft) {
      throw new Error('Draft not found');
    }

    const suggestions = draft.suggestions as DayStructure[];
    const dayPlan = suggestions.find((d: DayStructure) => d.day === params.day);
    
    if (!dayPlan) {
      throw new Error(`Day ${params.day} not found in draft`);
    }

    // Find meal (case-insensitive)
    const mealKey = Object.keys(dayPlan.meals).find(
      key => key.toLowerCase() === params.mealName.toLowerCase()
    );

    if (!mealKey) {
      throw new Error(`Meal slot "${params.mealName}" not found for day ${params.day}`);
    }

    // Update properties
    if (params.mealTime !== undefined) {
      dayPlan.meals[mealKey].mealTime = params.mealTime;
    }
    if (params.targetCalories !== undefined) {
      dayPlan.meals[mealKey].targetCalories = params.targetCalories;
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

    console.log(`✅ Updated meal slot "${mealKey}" on day ${params.day}`);
  }

  /**
   * Delete a meal slot (same as remove-recipe with removeMealSlot: true)
   */
  async deleteMealSlot(params: { draftId: string; day: number; mealName: string }): Promise<void> {
    return this.removeRecipe({
      draftId: params.draftId,
      day: params.day,
      mealName: params.mealName,
      removeMealSlot: true
    });
  }

  /**
   * Get ingredient recipe from simple ingredient service
   */
  private async getIngredientRecipe(ingredientId: string): Promise<any> {
    // Extract ingredient name from ID (format: ingredient_banana, ingredient_chicken_breast)
    const ingredientName = ingredientId.replace(/^ingredient_/, '').replace(/_/g, ' ');
    
    console.log(`🔍 Getting ingredient recipe for: ${ingredientName}`);
    
    // Search for this specific ingredient (now async)
    const results = await simpleIngredientService.searchIngredientsAsRecipes(ingredientName, 1);
    
    if (results.length === 0) {
      console.log(`❌ Ingredient not found: ${ingredientName}`);
      return null;
    }

    const ingredientRecipe = results[0];
    
    // Convert to cached recipe format for compatibility
    return {
      id: ingredientRecipe.id,
      external_recipe_id: ingredientRecipe.id,
      recipe_name: ingredientRecipe.title,
      recipe_image_url: ingredientRecipe.image,
      recipe_url: null,
      servings: ingredientRecipe.servings,
      ready_in_minutes: 0,
      calories_per_serving: ingredientRecipe.calories,
      protein_per_serving_g: ingredientRecipe.protein,
      carbs_per_serving_g: ingredientRecipe.carbs,
      fat_per_serving_g: ingredientRecipe.fat,
      fiber_per_serving_g: ingredientRecipe.fiber,
      nutrition_details: ingredientRecipe.nutrition,
      ingredients: ingredientRecipe.ingredients,
      instructions: ingredientRecipe.instructions,
      health_labels: ingredientRecipe.healthLabels,
      diet_labels: ingredientRecipe.dietLabels,
      allergens: ingredientRecipe.allergens,
      cuisine_types: ingredientRecipe.cuisineType,
      meal_types: ingredientRecipe.mealType,
      dish_types: ingredientRecipe.dishType
    };
  }

}

export const manualMealPlanService = new ManualMealPlanService();

