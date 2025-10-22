import { supabase } from './supabase';
import { EdamamService } from './edamamService';
import { MultiProviderRecipeSearchService } from './multiProviderRecipeSearchService';
import {
  CreateCustomRecipeInput,
  UpdateCustomRecipeInput,
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
      .eq('cache_status', 'active');

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

    const detailedNutrition: any = {};

    // Sum up nutrition from all ingredients
    for (const ingredient of ingredients) {
      const nutrition = ingredient.nutritionData;
      if (nutrition) {
        totalCalories += nutrition.calories || 0;
        totalProteinG += nutrition.protein || 0;
        totalCarbsG += nutrition.carbs || 0;
        totalFatG += nutrition.fat || 0;
        totalFiberG += nutrition.fiber || 0;
        totalSugarG += nutrition.sugar || 0;
        totalSodiumMg += nutrition.sodium || 0;
        totalWeightG += nutrition.weight || 0;

        // Accumulate detailed nutrition
        Object.keys(nutrition).forEach(key => {
          if (!['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'weight'].includes(key)) {
            if (!detailedNutrition[key]) {
              detailedNutrition[key] = 0;
            }
            detailedNutrition[key] += nutrition[key] || 0;
          }
        });
      }
    }

    // Calculate per serving nutrition
    const caloriesPerServing = servings > 0 ? totalCalories / servings : 0;
    const proteinPerServingG = servings > 0 ? totalProteinG / servings : 0;
    const carbsPerServingG = servings > 0 ? totalCarbsG / servings : 0;
    const fatPerServingG = servings > 0 ? totalFatG / servings : 0;
    const fiberPerServingG = servings > 0 ? totalFiberG / servings : 0;

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
   * Map database record to output format
   */
  private mapToOutput(data: any): CustomRecipeOutput {
    return {
      id: data.id,
      provider: 'manual',
      externalRecipeId: data.external_recipe_id,
      recipeName: data.recipe_name,
      recipeDescription: data.recipe_description,
      recipeImageUrl: data.recipe_image_url,
      
      cuisineTypes: data.cuisine_types || [],
      mealTypes: data.meal_types || [],
      dishTypes: data.dish_types || [],
      healthLabels: data.health_labels || [],
      dietLabels: data.diet_labels || [],
      allergens: data.allergens || [],
      
      servings: data.servings,
      prepTimeMinutes: data.prep_time_minutes,
      cookTimeMinutes: data.cook_time_minutes,
      totalTimeMinutes: data.total_time_minutes,
      
      totalCalories: data.total_calories,
      totalProteinG: data.total_protein_g,
      totalCarbsG: data.total_carbs_g,
      totalFatG: data.total_fat_g,
      totalFiberG: data.total_fiber_g,
      totalSugarG: data.total_sugar_g,
      totalSodiumMg: data.total_sodium_mg,
      
      caloriesPerServing: data.calories_per_serving,
      proteinPerServingG: data.protein_per_serving_g,
      carbsPerServingG: data.carbs_per_serving_g,
      fatPerServingG: data.fat_per_serving_g,
      fiberPerServingG: data.fiber_per_serving_g,
      
      ingredients: data.ingredients || [],
      ingredientLines: data.ingredient_lines || [],
      cookingInstructions: data.cooking_instructions || [],
      nutritionDetails: data.nutrition_details,
      
      createdByNutritionistId: data.created_by_nutritionist_id,
      isPublic: data.is_public,
      customNotes: data.custom_notes,
      
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}

