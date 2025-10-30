import { supabase } from './supabase';
import { EdamamService } from './edamamService';
import { MultiProviderRecipeSearchService } from './multiProviderRecipeSearchService';
import {
  CreateCustomRecipeInput,
  UpdateCustomRecipeInput,
  EditCustomRecipeBasicDetailsInput,
  CustomRecipeOutput,
  CustomRecipeFilter,
  NutritionCalculationResult,
  CustomRecipeIngredient,
  IngredientNutrition
} from '../types/customRecipe';

export class CustomRecipeService {
  private edamamService: EdamamService;
  private multiProviderService: MultiProviderRecipeSearchService;

  constructor() {
    this.edamamService = new EdamamService();
    this.multiProviderService = new MultiProviderRecipeSearchService();
  }

  /**
   * Create a new custom recipe
   */
  async createCustomRecipe(
    input: CreateCustomRecipeInput,
    nutritionistId: string
  ): Promise<CustomRecipeOutput> {
    // Validate input
    this.validateRecipeInput(input);

    // Calculate nutrition from ingredients
    const nutrition = await this.calculateRecipeNutrition(input.ingredients, input.servings);

    // Generate a unique external recipe ID for manual recipes
    const externalRecipeId = `manual_${nutritionistId}_${Date.now()}`;

    // Prepare ingredient lines
    const ingredientLines = input.ingredients.map(ing => 
      `${ing.quantity} ${ing.unit} ${ing.name}`
    );

    // Prepare ingredients JSONB
    const ingredientsJson = input.ingredients.map(ing => ({
      name: ing.name,
      quantity: ing.quantity,
      unit: ing.unit,
      nutrition: ing.nutritionData
    }));

    // Insert into cached_recipes
    const { data, error } = await supabase
      .from('cached_recipes')
      .insert({
        provider: 'manual',
        external_recipe_id: externalRecipeId,
        recipe_name: input.recipeName,
        recipe_description: input.description,
        recipe_url: null,
        recipe_image_url: input.imageUrl,
        
        // Classification
        cuisine_types: input.cuisineTypes || [],
        meal_types: input.mealTypes || [],
        dish_types: input.dishTypes || [],
        health_labels: input.healthLabels || [],
        diet_labels: input.dietLabels || [],
        allergens: input.allergens || [],
        
        // Servings & Time
        servings: input.servings,
        prep_time_minutes: input.prepTimeMinutes,
        cook_time_minutes: input.cookTimeMinutes,
        total_time_minutes: input.totalTimeMinutes || 
          ((input.prepTimeMinutes || 0) + (input.cookTimeMinutes || 0)) || null,
        
        // Total Nutrition
        total_calories: nutrition.totalCalories,
        total_protein_g: nutrition.totalProteinG,
        total_carbs_g: nutrition.totalCarbsG,
        total_fat_g: nutrition.totalFatG,
        total_fiber_g: nutrition.totalFiberG,
        total_sugar_g: nutrition.totalSugarG,
        total_sodium_mg: nutrition.totalSodiumMg,
        total_weight_g: nutrition.totalWeightG,
        
        // Per Serving Nutrition
        calories_per_serving: nutrition.caloriesPerServing,
        protein_per_serving_g: nutrition.proteinPerServingG,
        carbs_per_serving_g: nutrition.carbsPerServingG,
        fat_per_serving_g: nutrition.fatPerServingG,
        fiber_per_serving_g: nutrition.fiberPerServingG,
        
        // Recipe Details
        ingredients: ingredientsJson,
        ingredient_lines: ingredientLines,
        cooking_instructions: input.instructions || [],
        nutrition_details: nutrition.detailedNutrition,
        
        // Custom recipe fields
        created_by_nutritionist_id: nutritionistId,
        is_public: input.isPublic,
        custom_notes: input.customNotes,
        
        // Data quality
        has_complete_nutrition: true,
        has_detailed_ingredients: true,
        has_cooking_instructions: (input.instructions?.length || 0) > 0,
        cache_status: 'active'
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating custom recipe:', error);
      throw new Error(`Failed to create custom recipe: ${error.message}`);
    }

    return this.mapToOutput(data);
  }

  /**
   * Update an existing custom recipe
   */
  async updateCustomRecipe(
    input: UpdateCustomRecipeInput,
    nutritionistId: string
  ): Promise<CustomRecipeOutput> {
    // Validate ownership
    await this.validateRecipeOwnership(input.id, nutritionistId);

    // Calculate nutrition if ingredients changed
    let nutrition: NutritionCalculationResult | undefined;
    if (input.ingredients && input.servings) {
      nutrition = await this.calculateRecipeNutrition(input.ingredients, input.servings);
    }

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (input.recipeName) updateData.recipe_name = input.recipeName;
    if (input.description !== undefined) updateData.recipe_description = input.description;
    if (input.imageUrl !== undefined) updateData.recipe_image_url = input.imageUrl;
    if (input.cuisineTypes) updateData.cuisine_types = input.cuisineTypes;
    if (input.mealTypes) updateData.meal_types = input.mealTypes;
    if (input.dishTypes) updateData.dish_types = input.dishTypes;
    if (input.healthLabels) updateData.health_labels = input.healthLabels;
    if (input.dietLabels) updateData.diet_labels = input.dietLabels;
    if (input.allergens) updateData.allergens = input.allergens;
    if (input.servings) updateData.servings = input.servings;
    if (input.prepTimeMinutes !== undefined) updateData.prep_time_minutes = input.prepTimeMinutes;
    if (input.cookTimeMinutes !== undefined) updateData.cook_time_minutes = input.cookTimeMinutes;
    if (input.totalTimeMinutes !== undefined) updateData.total_time_minutes = input.totalTimeMinutes;
    if (input.instructions) updateData.cooking_instructions = input.instructions;
    if (input.customNotes !== undefined) updateData.custom_notes = input.customNotes;
    if (input.isPublic !== undefined) updateData.is_public = input.isPublic;

    // Update nutrition if recalculated
    if (nutrition) {
      updateData.total_calories = nutrition.totalCalories;
      updateData.total_protein_g = nutrition.totalProteinG;
      updateData.total_carbs_g = nutrition.totalCarbsG;
      updateData.total_fat_g = nutrition.totalFatG;
      updateData.total_fiber_g = nutrition.totalFiberG;
      updateData.total_sugar_g = nutrition.totalSugarG;
      updateData.total_sodium_mg = nutrition.totalSodiumMg;
      updateData.total_weight_g = nutrition.totalWeightG;
      updateData.calories_per_serving = nutrition.caloriesPerServing;
      updateData.protein_per_serving_g = nutrition.proteinPerServingG;
      updateData.carbs_per_serving_g = nutrition.carbsPerServingG;
      updateData.fat_per_serving_g = nutrition.fatPerServingG;
      updateData.fiber_per_serving_g = nutrition.fiberPerServingG;
      updateData.nutrition_details = nutrition.detailedNutrition;
    }

    // Update ingredients if provided
    if (input.ingredients) {
      const ingredientLines = input.ingredients.map(ing => 
        `${ing.quantity} ${ing.unit} ${ing.name}`
      );
      const ingredientsJson = input.ingredients.map(ing => ({
        name: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        nutrition: ing.nutritionData
      }));
      updateData.ingredients = ingredientsJson;
      updateData.ingredient_lines = ingredientLines;
    }

    // Perform update
    const { data, error } = await supabase
      .from('cached_recipes')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating custom recipe:', error);
      throw new Error(`Failed to update custom recipe: ${error.message}`);
    }

    return this.mapToOutput(data);
  }

  /**
   * Update basic details of a custom recipe (without recalculating nutrition)
   * This method is for updating metadata, descriptions, tags, etc. without changing ingredients
   */
  async updateBasicDetails(
    recipeId: string,
    input: EditCustomRecipeBasicDetailsInput,
    nutritionistId: string
  ): Promise<CustomRecipeOutput> {
    // Validate ownership
    await this.validateRecipeOwnership(recipeId, nutritionistId);

    // Prepare update data
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    // Only update fields that are provided
    if (input.recipeName) updateData.recipe_name = input.recipeName;
    if (input.description !== undefined) updateData.recipe_description = input.description;
    if (input.imageUrl !== undefined) updateData.recipe_image_url = input.imageUrl;
    if (input.servings !== undefined) updateData.servings = input.servings;
    if (input.prepTimeMinutes !== undefined) updateData.prep_time_minutes = input.prepTimeMinutes;
    if (input.cookTimeMinutes !== undefined) updateData.cook_time_minutes = input.cookTimeMinutes;
    if (input.totalTimeMinutes !== undefined) {
      updateData.total_time_minutes = input.totalTimeMinutes;
    } else if (input.prepTimeMinutes !== undefined || input.cookTimeMinutes !== undefined) {
      // Auto-calculate total time if prep or cook time changed
      const { data: currentRecipe } = await supabase
        .from('cached_recipes')
        .select('prep_time_minutes, cook_time_minutes')
        .eq('id', recipeId)
        .single();
      
      const prepTime = input.prepTimeMinutes !== undefined ? input.prepTimeMinutes : (currentRecipe?.prep_time_minutes || 0);
      const cookTime = input.cookTimeMinutes !== undefined ? input.cookTimeMinutes : (currentRecipe?.cook_time_minutes || 0);
      updateData.total_time_minutes = prepTime + cookTime || null;
    }
    if (input.instructions !== undefined) updateData.cooking_instructions = input.instructions;
    if (input.customNotes !== undefined) updateData.custom_notes = input.customNotes;
    if (input.isPublic !== undefined) updateData.is_public = input.isPublic;
    if (input.cuisineTypes !== undefined) updateData.cuisine_types = input.cuisineTypes;
    if (input.mealTypes !== undefined) updateData.meal_types = input.mealTypes;
    if (input.dishTypes !== undefined) updateData.dish_types = input.dishTypes;
    if (input.healthLabels !== undefined) updateData.health_labels = input.healthLabels;
    if (input.dietLabels !== undefined) updateData.diet_labels = input.dietLabels;
    if (input.allergens !== undefined) updateData.allergens = input.allergens;

    // Perform update
    const { data, error } = await supabase
      .from('cached_recipes')
      .update(updateData)
      .eq('id', recipeId)
      .select()
      .single();

    if (error) {
      console.error('Error updating basic details:', error);
      throw new Error(`Failed to update basic details: ${error.message}`);
    }

    return this.mapToOutput(data);
  }

  /**
   * Delete a custom recipe
   */
  async deleteCustomRecipe(recipeId: string, nutritionistId: string): Promise<void> {
    // Validate ownership
    await this.validateRecipeOwnership(recipeId, nutritionistId);

    const { error } = await supabase
      .from('cached_recipes')
      .delete()
      .eq('id', recipeId);

    if (error) {
      console.error('Error deleting custom recipe:', error);
      throw new Error(`Failed to delete custom recipe: ${error.message}`);
    }
  }

  /**
   * Get a single custom recipe
   */
  async getCustomRecipe(recipeId: string, nutritionistId: string): Promise<CustomRecipeOutput | null> {
    const { data, error } = await supabase
      .from('cached_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('provider', 'manual')
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching custom recipe:', error);
      throw new Error(`Failed to fetch custom recipe: ${error.message}`);
    }

    // Check access permission
    if (!data.is_public && data.created_by_nutritionist_id !== nutritionistId) {
      throw new Error('Access denied: You do not have permission to view this recipe');
    }

    return this.mapToOutput(data);
  }

  /**
   * List custom recipes with filters
   */
  async listCustomRecipes(
    nutritionistId: string,
    filters: CustomRecipeFilter = {}
  ): Promise<{ recipes: CustomRecipeOutput[]; totalCount: number; page: number; limit: number }> {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;
    const includePublic = filters.includePublic !== false;

    // Build query
    let query = supabase
      .from('cached_recipes')
      .select('*', { count: 'exact' })
      .eq('provider', 'manual')
      // Include active OR null cache_status (backward compatibility)
      .in('cache_status', ['active', null] as any);

    // Access filter: own private recipes + public recipes
    if (includePublic) {
      query = query.or(`created_by_nutritionist_id.eq.${nutritionistId},is_public.eq.true`);
    } else {
      query = query.eq('created_by_nutritionist_id', nutritionistId);
    }

    // Search filter
    if (filters.search) {
      query = query.ilike('recipe_name', `%${filters.search}%`);
    }

    // Health labels filter
    if (filters.healthLabels && filters.healthLabels.length > 0) {
      query = query.contains('health_labels', filters.healthLabels);
    }

    // Cuisine types filter
    if (filters.cuisineTypes && filters.cuisineTypes.length > 0) {
      query = query.overlaps('cuisine_types', filters.cuisineTypes);
    }

    // Meal types filter
    if (filters.mealTypes && filters.mealTypes.length > 0) {
      query = query.overlaps('meal_types', filters.mealTypes);
    }

    // Dish types filter
    if (filters.dishTypes && filters.dishTypes.length > 0) {
      query = query.overlaps('dish_types', filters.dishTypes);
    }

    // Calories filter
    if (filters.caloriesMin !== undefined) {
      query = query.gte('calories_per_serving', filters.caloriesMin);
    }
    if (filters.caloriesMax !== undefined) {
      query = query.lte('calories_per_serving', filters.caloriesMax);
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    // Order by creation date (newest first)
    query = query.order('created_at', { ascending: false });

    const { data, error, count } = await query;

    if (error) {
      console.error('Error listing custom recipes:', error);
      throw new Error(`Failed to list custom recipes: ${error.message}`);
    }

    return {
      recipes: (data || []).map(r => this.mapToOutput(r)),
      totalCount: count || 0,
      page,
      limit
    };
  }

  /**
   * Calculate nutrition from ingredients
   */
  private async calculateRecipeNutrition(
    ingredients: CustomRecipeIngredient[],
    servings: number
  ): Promise<NutritionCalculationResult> {
    let totalCalories = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;
    let totalFiberG = 0;
    let totalSugarG = 0;
    let totalSodiumMg = 0;
    let totalWeightG = 0;

    // Initialize detailed nutrition in standardized format
    const detailedNutrition: any = {
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };

    // Sum up nutrition from all ingredients
    for (const ingredient of ingredients) {
      const nutrition = ingredient.nutritionData;
      if (nutrition) {
        // Accumulate calories
        totalCalories += nutrition.calories || 0;
        
        // Support both flat and nested format
        const macros = nutrition.macros || nutrition; // Fallback to root if no macros object
        
        // Accumulate macros
        totalProteinG += macros.protein || 0;
        totalCarbsG += macros.carbs || 0;
        totalFatG += macros.fat || 0;
        totalFiberG += macros.fiber || 0;
        totalSugarG += macros.sugar || 0;
        totalSodiumMg += macros.sodium || 0;
        totalWeightG += nutrition.weight || 0;

        // Accumulate extended macros (if available) - store in standardized format
        if (nutrition.macros) {
          ['cholesterol', 'saturatedFat', 'transFat', 'monounsaturatedFat', 'polyunsaturatedFat'].forEach(macro => {
            if (nutrition.macros[macro] !== undefined) {
              if (!detailedNutrition.macros[macro]) {
                detailedNutrition.macros[macro] = 0;
              }
              detailedNutrition.macros[macro] += nutrition.macros[macro];
            }
          });
        }

        // Accumulate vitamins (if available) - store in nested format
        if (nutrition.micros?.vitamins) {
          Object.keys(nutrition.micros.vitamins).forEach(vitamin => {
            if (!detailedNutrition.micros.vitamins[vitamin]) {
              detailedNutrition.micros.vitamins[vitamin] = 0;
            }
            detailedNutrition.micros.vitamins[vitamin] += nutrition.micros.vitamins[vitamin] || 0;
          });
        }
        
        // Accumulate minerals (if available) - store in nested format
        if (nutrition.micros?.minerals) {
          Object.keys(nutrition.micros.minerals).forEach(mineral => {
            if (!detailedNutrition.micros.minerals[mineral]) {
              detailedNutrition.micros.minerals[mineral] = 0;
            }
            detailedNutrition.micros.minerals[mineral] += nutrition.micros.minerals[mineral] || 0;
          });
        }
      }
    }

    // Calculate per serving nutrition
    const caloriesPerServing = servings > 0 ? totalCalories / servings : 0;
    const proteinPerServingG = servings > 0 ? totalProteinG / servings : 0;
    const carbsPerServingG = servings > 0 ? totalCarbsG / servings : 0;
    const fatPerServingG = servings > 0 ? totalFatG / servings : 0;
    const fiberPerServingG = servings > 0 ? totalFiberG / servings : 0;
    const sugarPerServingG = servings > 0 ? totalSugarG / servings : 0;
    const sodiumPerServingMg = servings > 0 ? totalSodiumMg / servings : 0;

    // Add main macros to detailed nutrition with per-serving values in standardized format
    detailedNutrition.macros.protein = { quantity: Math.round(proteinPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.carbs = { quantity: Math.round(carbsPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.fat = { quantity: Math.round(fatPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.fiber = { quantity: Math.round(fiberPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.sugar = { quantity: Math.round(sugarPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.sodium = { quantity: Math.round(sodiumPerServingMg * 10) / 10, unit: 'mg' };
    
    // Convert extended macros to standardized format
    Object.keys(detailedNutrition.macros).forEach(key => {
      if (!['protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'].includes(key)) {
        const value = detailedNutrition.macros[key];
        if (typeof value === 'number') {
          const perServing = servings > 0 ? value / servings : 0;
          const unit = key === 'cholesterol' ? 'mg' : 'g';
          detailedNutrition.macros[key] = { quantity: Math.round(perServing * 10) / 10, unit };
        }
      }
    });

    // Convert vitamins to standardized format
    Object.keys(detailedNutrition.micros.vitamins).forEach(key => {
      const value = detailedNutrition.micros.vitamins[key];
      if (typeof value === 'number') {
        const perServing = servings > 0 ? value / servings : 0;
        detailedNutrition.micros.vitamins[key] = { quantity: Math.round(perServing * 100) / 100, unit: this.getVitaminUnit(key) };
      }
    });

    // Convert minerals to standardized format
    Object.keys(detailedNutrition.micros.minerals).forEach(key => {
      const value = detailedNutrition.micros.minerals[key];
      if (typeof value === 'number') {
        const perServing = servings > 0 ? value / servings : 0;
        detailedNutrition.micros.minerals[key] = { quantity: Math.round(perServing * 100) / 100, unit: 'mg' };
      }
    });
    
    // Add calories at top level in standardized format
    detailedNutrition.calories = { quantity: Math.round(caloriesPerServing * 10) / 10, unit: 'kcal' };

    return {
      totalCalories: Math.round(totalCalories * 100) / 100,
      totalProteinG: Math.round(totalProteinG * 100) / 100,
      totalCarbsG: Math.round(totalCarbsG * 100) / 100,
      totalFatG: Math.round(totalFatG * 100) / 100,
      totalFiberG: Math.round(totalFiberG * 100) / 100,
      totalSugarG: Math.round(totalSugarG * 100) / 100,
      totalSodiumMg: Math.round(totalSodiumMg * 100) / 100,
      totalWeightG: Math.round(totalWeightG * 100) / 100,
      
      caloriesPerServing: Math.round(caloriesPerServing * 100) / 100,
      proteinPerServingG: Math.round(proteinPerServingG * 100) / 100,
      carbsPerServingG: Math.round(carbsPerServingG * 100) / 100,
      fatPerServingG: Math.round(fatPerServingG * 100) / 100,
      fiberPerServingG: Math.round(fiberPerServingG * 100) / 100,
      
      detailedNutrition
    };
  }

  /**
   * Validate recipe ownership
   */
  private async validateRecipeOwnership(recipeId: string, nutritionistId: string): Promise<void> {
    const { data, error } = await supabase
      .from('cached_recipes')
      .select('created_by_nutritionist_id')
      .eq('id', recipeId)
      .eq('provider', 'manual')
      .single();

    if (error || !data) {
      throw new Error('Recipe not found');
    }

    if (data.created_by_nutritionist_id !== nutritionistId) {
      throw new Error('Access denied: You do not own this recipe');
    }
  }

  /**
   * Validate recipe input
   */
  private validateRecipeInput(input: CreateCustomRecipeInput): void {
    if (!input.recipeName || input.recipeName.trim().length === 0) {
      throw new Error('Recipe name is required');
    }

    if (!input.ingredients || input.ingredients.length === 0) {
      throw new Error('At least one ingredient is required');
    }

    if (!input.servings || input.servings < 1) {
      throw new Error('Servings must be at least 1');
    }

    // Validate each ingredient
    input.ingredients.forEach((ing, index) => {
      if (!ing.name || ing.name.trim().length === 0) {
        throw new Error(`Ingredient ${index + 1}: name is required`);
      }
      if (ing.quantity === undefined || ing.quantity <= 0) {
        throw new Error(`Ingredient ${index + 1}: quantity must be greater than 0`);
      }
      if (!ing.unit || ing.unit.trim().length === 0) {
        throw new Error(`Ingredient ${index + 1}: unit is required`);
      }
    });
  }

  /**
   * Map database record to output format (UnifiedRecipeSummary format)
   */
  private mapToOutput(data: any): CustomRecipeOutput {
    return {
      // Standard UnifiedRecipeSummary fields
      id: data.id,
      title: data.recipe_name,
      image: data.recipe_image_url || '',
      sourceUrl: '',
      source: 'manual',
      readyInMinutes: data.total_time_minutes || undefined,
      servings: data.servings,
      nutritionServings: 1, // Default to 1, can be changed via edit servings API
      
      // Nutrition data (per serving)
      calories: data.calories_per_serving,
      protein: data.protein_per_serving_g,
      carbs: data.carbs_per_serving_g,
      fat: data.fat_per_serving_g,
      fiber: data.fiber_per_serving_g,
      
      // Metadata for filtering
      healthLabels: data.health_labels || [],
      dietLabels: data.diet_labels || [],
      cuisineType: data.cuisine_types || [],
      dishType: data.dish_types || [],
      mealType: data.meal_types || [],
      allergens: data.allergens || [],
      
      // Ingredients (formatted for allergen checking)
      ingredients: (data.ingredients || []).map((ing: any) => ({
        name: ing.name,
        food: ing.name,
        quantity: ing.quantity,
        unit: ing.unit,
        original: `${ing.quantity} ${ing.unit} ${ing.name}`,
        nutrition: ing.nutrition
      })),
      
      // Custom recipe metadata
      isCustom: true,
      createdBy: data.created_by_nutritionist_id,
      isPublic: data.is_public,
      
      // Additional fields for detailed view (backward compatible)
      description: data.recipe_description,
      prepTimeMinutes: data.prep_time_minutes,
      cookTimeMinutes: data.cook_time_minutes,
      totalTimeMinutes: data.total_time_minutes,
      ingredientLines: data.ingredient_lines || [],
      instructions: data.cooking_instructions || [],
      customNotes: data.custom_notes,
      nutritionDetails: this.standardizeNutritionDetails(data.nutrition_details, data),
      
      // Total nutrition (for detailed calculations)
      totalCalories: data.total_calories,
      totalProtein: data.total_protein_g,
      totalCarbs: data.total_carbs_g,
      totalFat: data.total_fat_g,
      totalFiber: data.total_fiber_g,
      totalSugar: data.total_sugar_g,
      totalSodium: data.total_sodium_mg,
      totalWeight: data.total_weight_g,
      
      // Timestamps
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }

  /**
   * Standardize nutrition details to match format used by other recipes
   * Handles both old flat format and new nested format
   */
  private standardizeNutritionDetails(nutritionDetails: any, recipeData: any): any {
    if (!nutritionDetails || Object.keys(nutritionDetails).length === 0) {
      nutritionDetails = {};
    }

    // Initialize standardized structure
    const standardized: any = {
      calories: { quantity: recipeData.calories_per_serving || 0, unit: 'kcal' },
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };

    // Check if already in new format (has macros.protein as object with quantity/unit)
    if (nutritionDetails.macros && typeof nutritionDetails.macros.protein === 'object' && nutritionDetails.macros.protein.quantity !== undefined) {
      // Already in standardized format
      return nutritionDetails;
    }

    // Check if in new format but without quantity/unit objects
    if (nutritionDetails.macros && typeof nutritionDetails.macros.protein === 'number') {
      // New nested format but without quantity/unit objects - convert
      const macros = nutritionDetails.macros || {};
      standardized.macros = {
        protein: { quantity: macros.protein || recipeData.protein_per_serving_g || 0, unit: 'g' },
        carbs: { quantity: macros.carbs || recipeData.carbs_per_serving_g || 0, unit: 'g' },
        fat: { quantity: macros.fat || recipeData.fat_per_serving_g || 0, unit: 'g' },
        fiber: { quantity: macros.fiber || recipeData.fiber_per_serving_g || 0, unit: 'g' },
        sugar: { quantity: macros.sugar || 0, unit: 'g' },
        sodium: { quantity: macros.sodium || 0, unit: 'mg' }
      };

      // Add extended macros if present
      if (macros.cholesterol !== undefined) standardized.macros.cholesterol = { quantity: macros.cholesterol, unit: 'mg' };
      if (macros.saturatedFat !== undefined) standardized.macros.saturatedFat = { quantity: macros.saturatedFat, unit: 'g' };
      if (macros.transFat !== undefined) standardized.macros.transFat = { quantity: macros.transFat, unit: 'g' };
      if (macros.monounsaturatedFat !== undefined) standardized.macros.monounsaturatedFat = { quantity: macros.monounsaturatedFat, unit: 'g' };
      if (macros.polyunsaturatedFat !== undefined) standardized.macros.polyunsaturatedFat = { quantity: macros.polyunsaturatedFat, unit: 'g' };

      // Convert micros
      if (nutritionDetails.micros) {
        const vitamins = nutritionDetails.micros.vitamins || {};
        const minerals = nutritionDetails.micros.minerals || {};

        Object.keys(vitamins).forEach(key => {
          standardized.micros.vitamins[key] = { quantity: vitamins[key], unit: this.getVitaminUnit(key) };
        });

        Object.keys(minerals).forEach(key => {
          standardized.micros.minerals[key] = { quantity: minerals[key], unit: 'mg' };
        });
      }

      return standardized;
    }

    // Old flat format (e.g., "minerals_iron": 5.2) - convert to standardized format
    standardized.macros = {
      protein: { quantity: recipeData.protein_per_serving_g || 0, unit: 'g' },
      carbs: { quantity: recipeData.carbs_per_serving_g || 0, unit: 'g' },
      fat: { quantity: recipeData.fat_per_serving_g || 0, unit: 'g' },
      fiber: { quantity: recipeData.fiber_per_serving_g || 0, unit: 'g' },
      sugar: { quantity: 0, unit: 'g' },
      sodium: { quantity: 0, unit: 'mg' }
    };

    // Extract flat format data
    Object.keys(nutritionDetails).forEach(key => {
      const value = nutritionDetails[key];
      
      // Extended macros (flat format)
      if (key === 'cholesterol') standardized.macros.cholesterol = { quantity: value, unit: 'mg' };
      else if (key === 'saturatedFat') standardized.macros.saturatedFat = { quantity: value, unit: 'g' };
      else if (key === 'transFat') standardized.macros.transFat = { quantity: value, unit: 'g' };
      else if (key === 'monounsaturatedFat') standardized.macros.monounsaturatedFat = { quantity: value, unit: 'g' };
      else if (key === 'polyunsaturatedFat') standardized.macros.polyunsaturatedFat = { quantity: value, unit: 'g' };
      
      // Vitamins (flat format: "vitamins_vitaminA" -> vitaminA)
      else if (key.startsWith('vitamins_')) {
        const vitaminKey = key.replace('vitamins_', '');
        standardized.micros.vitamins[vitaminKey] = { quantity: value, unit: this.getVitaminUnit(vitaminKey) };
      }
      
      // Minerals (flat format: "minerals_iron" -> iron)
      else if (key.startsWith('minerals_')) {
        const mineralKey = key.replace('minerals_', '');
        standardized.micros.minerals[mineralKey] = { quantity: value, unit: 'mg' };
      }
    });

    return standardized;
  }

  /**
   * Get the appropriate unit for a vitamin
   */
  private getVitaminUnit(vitaminKey: string): string {
    const units: { [key: string]: string } = {
      vitaminA: 'IU',
      vitaminC: 'mg',
      vitaminD: 'µg',
      vitaminE: 'mg',
      vitaminK: 'µg',
      thiamin: 'mg',
      riboflavin: 'mg',
      niacin: 'mg',
      vitaminB6: 'mg',
      folate: 'µg',
      vitaminB12: 'µg',
      biotin: 'µg',
      pantothenicAcid: 'mg'
    };
    return units[vitaminKey] || 'mg';
  }
}

