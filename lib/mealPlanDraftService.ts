import { supabase } from './supabase';
import { RecipeCacheService } from './recipeCacheService';
import { MultiProviderRecipeSearchService } from './multiProviderRecipeSearchService';
import { NutritionCalculationService } from './nutritionCalculationService';

const cacheService = new RecipeCacheService();
const multiProviderService = new MultiProviderRecipeSearchService();
const nutritionService = new NutritionCalculationService();

// Unified ingredient format
export interface UnifiedIngredient {
  id?: string | number; // Spoonacular has numeric IDs, Edamam has string IDs
  name: string; // Ingredient name
  amount: number; // Quantity
  unit: string; // Unit of measurement
  image?: string; // Image URL
  original: string; // Original ingredient text
  // Optional Edamam-specific fields
  weight?: number; // Weight in grams
  foodCategory?: string; // Food category
  // Optional Spoonacular-specific fields
  aisle?: string; // Store aisle location
  measures?: {
    us: { amount: number; unitShort: string; unitLong: string };
    metric: { amount: number; unitShort: string; unitLong: string };
  };
}

export interface RecipeSuggestion {
  id: string;
  title: string;
  image: string;
  sourceUrl: string;
  source: 'edamam' | 'spoonacular';
  servings: number;
  readyInMinutes?: number;
  fromCache: boolean;
  cacheId?: string;
  // Nutrition data (per serving)
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  ingredients?: UnifiedIngredient[]; // Now using unified format
  // Detailed information from cache (optional)
  instructions?: any[];
  healthLabels?: string[];
  dietLabels?: string[];
  cuisineTypes?: string[];
  dishTypes?: string[];
  mealTypes?: string[];
  // Selection status (used in draft)
  isSelected?: boolean;
  selectedAt?: string | null;
  hasCustomizations?: boolean;
  hasCustomInstructions?: boolean;
  customNotes?: string | null; // Custom notes added by nutritionist
}

export interface MealCustomization {
  recipeId: string;
  source: 'edamam' | 'spoonacular';
  modifications: {
    type: 'replace' | 'omit' | 'reduce' | 'add';
    ingredient?: string;
    newIngredient?: string;
    reductionPercent?: number;
    notes?: string;
  }[];
  customNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  };
  servings: number;
  customizationsApplied: boolean;
}

export interface MealPlanDraft {
  id: string;
  clientId: string;
  nutritionistId: string;
  status: 'draft' | 'completed' | 'finalized';
  searchParams: any;
  suggestions: Array<{
    day: number;
    date: string;
    meals: {
      [mealType: string]: {
        recipes: RecipeSuggestion[]; // Currently displayed recipes (3 from each provider)
        allRecipes?: { // ALL fetched recipes for shuffling
          edamam: RecipeSuggestion[];
          spoonacular: RecipeSuggestion[];
        };
        displayOffset?: { // Track which batch is currently shown
          edamam: number; // Index offset for edamam recipes (0, 3, 6, 9, 12)
          spoonacular: number; // Index offset for spoonacular recipes (0, 3, 6, 9, 12)
        };
        customizations: { [recipeId: string]: MealCustomization };
        selectedRecipeId?: string;
        totalNutrition?: {
          calories: number;
          protein: number;
          carbs: number;
          fat: number;
          fiber: number;
        };
      };
    };
  }>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export class MealPlanDraftService {
  
  /**
   * Normalize ingredients from Edamam format to unified format
   */
  private static normalizeEdamamIngredients(ingredients: any[]): UnifiedIngredient[] {
    if (!ingredients || !Array.isArray(ingredients)) return [];
    
    return ingredients.map(ing => ({
      id: ing.foodId || ing.id,
      name: ing.food || ing.name || ing.text,
      amount: ing.quantity || ing.amount || 0,
      unit: ing.measure || ing.unit || '',
      image: ing.image,
      original: ing.text || ing.original || ing.originalString || '',
      weight: ing.weight,
      foodCategory: ing.foodCategory
    }));
  }

  /**
   * Normalize ingredients from Spoonacular format to unified format
   */
  private static normalizeSpoonacularIngredients(ingredients: any[]): UnifiedIngredient[] {
    if (!ingredients || !Array.isArray(ingredients)) return [];
    
    return ingredients.map(ing => ({
      id: ing.id,
      name: ing.name || ing.nameClean || ing.originalName,
      amount: ing.amount || 0,
      unit: ing.unit || '',
      image: ing.image ? `https://spoonacular.com/cdn/ingredients_100x100/${ing.image}` : undefined,
      original: ing.original || ing.originalString || '',
      aisle: ing.aisle,
      measures: ing.measures
    }));
  }

  /**
   * Normalize ingredients based on recipe source
   */
  private static normalizeIngredients(ingredients: any[], source: 'edamam' | 'spoonacular'): UnifiedIngredient[] {
    if (!ingredients || !Array.isArray(ingredients)) return [];
    
    // Check if already in unified format
    if (ingredients.length > 0 && ingredients[0].original && ingredients[0].name) {
      return ingredients as UnifiedIngredient[];
    }
    
    return source === 'edamam' 
      ? this.normalizeEdamamIngredients(ingredients)
      : this.normalizeSpoonacularIngredients(ingredients);
  }

  /**
   * Normalize instructions to a consistent format
   * Handles both string and object formats, and JSON-stringified objects
   */
  private static normalizeInstructions(instructions: any): string[] {
    if (!instructions) return [];
    
    // If it's a string, split by newlines
    if (typeof instructions === 'string') {
      return instructions
        .split(/\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
    
    // If it's an array
    if (Array.isArray(instructions)) {
      return instructions.map((inst, index) => {
        // Handle JSON-stringified objects
        if (typeof inst === 'string') {
          try {
            const parsed = JSON.parse(inst);
            // If it's an object with step property
            if (parsed && typeof parsed === 'object' && parsed.step) {
              return parsed.step;
            }
            // Otherwise return the string as-is
            return inst;
          } catch (e) {
            // Not JSON, return as-is
            return inst;
          }
        }
        
        // Handle instruction objects (Spoonacular format: {number, step})
        if (typeof inst === 'object' && inst !== null) {
          if (inst.step) {
            return inst.step;
          }
          // If it has a text property (some other format)
          if (inst.text) {
            return inst.text;
          }
        }
        
        // Fallback: convert to string
        return String(inst);
      }).filter(s => s && s.length > 0);
    }
    
    // Fallback: return empty array
    return [];
  }
  
  /**
   * Create a new meal plan draft
   */
  async createDraft(
    clientId: string,
    nutritionistId: string,
    searchParams: any,
    suggestions: any
  ): Promise<MealPlanDraft> {
    const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const draft: MealPlanDraft = {
      id: draftId,
      clientId,
      nutritionistId,
      status: 'draft',
      searchParams,
      suggestions: this.transformSuggestionsToDraftFormat(suggestions),
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      expiresAt: expiresAt.toISOString()
    };

    // Save to database
    const { error } = await supabase
      .from('meal_plan_drafts')
      .insert({
        id: draftId,
        client_id: clientId,
        nutritionist_id: nutritionistId,
        status: 'draft',
        search_params: searchParams,
        suggestions: draft.suggestions,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      });

    if (error) {
      throw new Error(`Failed to create draft: ${error.message}`);
    }

    return draft;
  }

  /**
   * Get a meal plan draft
   */
  async getDraft(draftId: string): Promise<MealPlanDraft | null> {
    const { data, error } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Draft not found
      }
      throw new Error(`Failed to get draft: ${error.message}`);
    }

    return {
      id: data.id,
      clientId: data.client_id,
      nutritionistId: data.nutritionist_id,
      status: data.status,
      searchParams: data.search_params,
      suggestions: data.suggestions,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      expiresAt: data.expires_at
    };
  }

  /**
   * Update recipe selection in draft
   */
  async selectRecipe(
    draftId: string,
    day: number,
    mealName: string,
    recipeId: string,
    customizations?: MealCustomization
  ): Promise<void> {
    const draft = await this.getDraft(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Find the day in the suggestions array
    const dayPlan = draft.suggestions.find((d: any) => d.day === day);
    if (!dayPlan) {
      throw new Error(`Day ${day} not found in draft`);
    }

    if (!dayPlan.meals[mealName]) {
      throw new Error(`Meal ${mealName} not found for day ${day}`);
    }

    // Find the selected recipe to get its source
    const selectedRecipe = dayPlan.meals[mealName].recipes.find((r: any) => r.id === recipeId);
    if (!selectedRecipe) {
      throw new Error(`Recipe ${recipeId} not found in meal ${mealName}`);
    }

    // Fetch detailed recipe information if not already present
    if (!selectedRecipe.ingredients || selectedRecipe.ingredients.length === 0) {
      console.log(`🔍 Fetching detailed recipe information for ${recipeId}`);
      const detailedRecipe = await this.fetchDetailedRecipe(recipeId, selectedRecipe.source);
      
      if (detailedRecipe) {
        // Merge detailed information into the recipe
        selectedRecipe.ingredients = detailedRecipe.ingredients || [];
        selectedRecipe.instructions = detailedRecipe.instructions || [];
        selectedRecipe.nutrition = detailedRecipe.nutrition || {};
        console.log(`✅ Fetched ${selectedRecipe.ingredients?.length || 0} ingredients for recipe`);
      } else {
        console.warn(`⚠️ Could not fetch detailed recipe information for ${recipeId}`);
      }
    }

    // Update all recipes to set isSelected correctly
    dayPlan.meals[mealName].recipes.forEach((recipe: any) => {
      recipe.isSelected = recipe.id === recipeId;
      recipe.selectedAt = recipe.id === recipeId ? new Date().toISOString() : null;
    });

    // Set the selected recipe ID
    dayPlan.meals[mealName].selectedRecipeId = recipeId;
    
    // Add customizations if provided
    if (customizations) {
      dayPlan.meals[mealName].customizations[recipeId] = customizations;
    }

    // Recalculate total nutrition for this meal
    dayPlan.meals[mealName].totalNutrition = 
      await this.calculateMealTotalNutrition(dayPlan.meals[mealName]);

    // Update database
    const { error } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: draft.suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId);

    if (error) {
      throw new Error(`Failed to update draft: ${error.message}`);
    }
  }

  /**
   * Fetch detailed recipe information from cache or API
   */
  private async fetchDetailedRecipe(recipeId: string, source: 'edamam' | 'spoonacular'): Promise<any> {
    try {
      // First, try to get from cache
      const cachedRecipe = await cacheService.getRecipeByExternalId(source, recipeId);
      
      if (cachedRecipe && cachedRecipe.ingredients && cachedRecipe.ingredients.length > 0) {
        console.log(`✅ Found recipe in cache with ${cachedRecipe.ingredients.length} ingredients`);
        // Normalize ingredients and instructions from cache
        const normalizedIngredients = MealPlanDraftService.normalizeIngredients(cachedRecipe.ingredients, source);
        const normalizedInstructions = MealPlanDraftService.normalizeInstructions(cachedRecipe.cookingInstructions);
        return {
          ingredients: normalizedIngredients,
          instructions: normalizedInstructions,
          nutrition: cachedRecipe.nutritionDetails || {}
        };
      }

      // If not in cache or incomplete, fetch from API
      console.log(`🔄 Fetching recipe from ${source} API`);
      const recipeDetails = await multiProviderService.getRecipeDetails(recipeId);
      
      if (recipeDetails) {
        // Normalize ingredients and instructions before storing
        const normalizedIngredients = MealPlanDraftService.normalizeIngredients(recipeDetails.ingredients, source);
        const normalizedInstructions = MealPlanDraftService.normalizeInstructions(recipeDetails.instructions);
        
        // Store in cache for future use (store normalized data)
        console.log(`💾 Storing recipe in cache with ${normalizedIngredients.length} normalized ingredients and ${normalizedInstructions.length} instructions`);
        // Transform nutrition to standardized format with micronutrients
        const NutritionMappingService = (await import('./nutritionMappingService')).NutritionMappingService;
        let nutritionDetails: any = {};
        
        if ((recipeDetails as any).nutrition) {
          // Use the nutrition object from the API response
          if (source === 'edamam') {
            nutritionDetails = NutritionMappingService.transformEdamamNutrition((recipeDetails as any).nutrition);
          } else if (source === 'spoonacular') {
            nutritionDetails = NutritionMappingService.transformSpoonacularNutrition((recipeDetails as any).nutrition);
          }
          console.log(`  💾 Caching with micronutrients: ${Object.keys(nutritionDetails.micros?.vitamins || {}).length} vitamins, ${Object.keys(nutritionDetails.micros?.minerals || {}).length} minerals`);
        } else {
          console.warn(`  ⚠️ No nutrition data in API response, caching with empty nutritionDetails`);
        }
        
        await cacheService.storeRecipe({
          provider: source,
          externalRecipeId: recipeId,
          recipeName: recipeDetails.title,
          recipeUrl: recipeDetails.sourceUrl,
          recipeImageUrl: recipeDetails.image,
          servings: recipeDetails.servings,
          totalTimeMinutes: recipeDetails.readyInMinutes,
          caloriesPerServing: recipeDetails.calories,
          proteinPerServingG: recipeDetails.protein,
          carbsPerServingG: recipeDetails.carbs,
          fatPerServingG: recipeDetails.fat,
          fiberPerServingG: recipeDetails.fiber,
          ingredients: normalizedIngredients,
          cookingInstructions: normalizedInstructions,
          nutritionDetails: nutritionDetails,  // ✅ Now saving full nutrition with micros!
          healthLabels: recipeDetails.healthLabels,
          dietLabels: recipeDetails.dietLabels,
          cuisineTypes: recipeDetails.cuisineType,
          dishTypes: recipeDetails.dishType,
          mealTypes: recipeDetails.mealType,
          originalApiResponse: recipeDetails,
          hasCompleteNutrition: Object.keys(nutritionDetails.macros || {}).length > 0,
          hasDetailedIngredients: recipeDetails.ingredients && recipeDetails.ingredients.length > 0,
          hasCookingInstructions: normalizedInstructions.length > 0,
          dataQualityScore: 80
        });

        return {
          ingredients: normalizedIngredients,
          instructions: normalizedInstructions,
          nutrition: {
            calories: recipeDetails.calories || 0,
            protein: recipeDetails.protein || 0,
            carbs: recipeDetails.carbs || 0,
            fat: recipeDetails.fat || 0,
            fiber: recipeDetails.fiber || 0
          }
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Error fetching detailed recipe:`, error);
      return null;
    }
  }

  /**
   * Deselect recipe in draft (remove selection)
   */
  async deselectRecipe(
    draftId: string,
    day: number,
    mealName: string
  ): Promise<void> {
    const draft = await this.getDraft(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Find the day in the suggestions array
    const dayPlan = draft.suggestions.find((d: any) => d.day === day);
    if (!dayPlan) {
      throw new Error(`Day ${day} not found in draft`);
    }

    if (!dayPlan.meals[mealName]) {
      throw new Error(`Meal ${mealName} not found for day ${day}`);
    }

    // Clear selection for all recipes
    dayPlan.meals[mealName].recipes.forEach((recipe: any) => {
      recipe.isSelected = false;
      recipe.selectedAt = null;
    });

    // Clear the selected recipe ID and customizations
    dayPlan.meals[mealName].selectedRecipeId = undefined;
    dayPlan.meals[mealName].totalNutrition = undefined;

    // Update database
    const { error } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: draft.suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId);

    if (error) {
      throw new Error(`Failed to update draft: ${error.message}`);
    }
  }

  /**
   * Update recipe customizations
   */
  async updateRecipeCustomizations(
    draftId: string,
    day: number,
    mealName: string,
    recipeId: string,
    customizations: MealCustomization
  ): Promise<void> {
    const draft = await this.getDraft(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    // Find the day in the suggestions array
    const dayPlan = draft.suggestions.find((d: any) => d.day === day);
    if (!dayPlan) {
      throw new Error(`Day ${day} not found in draft`);
    }

    if (!dayPlan.meals[mealName]) {
      throw new Error(`Meal ${mealName} not found for day ${day}`);
    }

    // Find the recipe to modify
    const recipe = dayPlan.meals[mealName].recipes.find((r: any) => r.id === recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found in meal ${mealName}`);
    }

    // Apply ingredient modifications to the recipe's ingredient list
    if (customizations.modifications && recipe.ingredients) {
      console.log('🔧 Applying ingredient modifications...');
      
      for (const mod of customizations.modifications) {
        if (mod.type === 'omit' && (mod as any).originalIngredient) {
          // REMOVE the ingredient from the list
          const originalCount = recipe.ingredients.length;
          recipe.ingredients = recipe.ingredients.filter((ing: any) => {
            const ingName = ing.name?.toLowerCase() || ing.food?.toLowerCase() || '';
            const targetName = (mod as any).originalIngredient.toLowerCase();
            return !ingName.includes(targetName) && !targetName.includes(ingName);
          });
          console.log(`  🚫 Omitted "${(mod as any).originalIngredient}" (${originalCount} → ${recipe.ingredients.length} ingredients)`);
        } 
        else if (mod.type === 'add' && mod.newIngredient) {
          // ADD the new ingredient to the list
          recipe.ingredients.push({
            name: mod.newIngredient,
            amount: (mod as any).amount || null,
            unit: (mod as any).unit || null,
            original: `${(mod as any).amount || ''} ${(mod as any).unit || ''} ${mod.newIngredient}`.trim()
          });
          console.log(`  ➕ Added "${mod.newIngredient}" (${recipe.ingredients.length} ingredients)`);
        }
        else if (mod.type === 'replace' && (mod as any).originalIngredient && mod.newIngredient) {
          // REPLACE: find and update the ingredient in place
          let replaced = false;
          recipe.ingredients = recipe.ingredients.map((ing: any) => {
            const ingName = ing.name?.toLowerCase() || ing.food?.toLowerCase() || '';
            const targetName = (mod as any).originalIngredient.toLowerCase();
            
            if ((ingName.includes(targetName) || targetName.includes(ingName)) && !replaced) {
              replaced = true;
              console.log(`  🔄 Replaced "${ing.name || ing.food}" with "${mod.newIngredient}"`);
              return {
                ...ing,
                name: mod.newIngredient,
                amount: (mod as any).amount || ing.amount,
                unit: (mod as any).unit || ing.unit,
                original: `${(mod as any).amount || ing.amount || ''} ${(mod as any).unit || ing.unit || ''} ${mod.newIngredient}`.trim()
              };
            }
            return ing;
          });
        }
      }
    }

    // Merge new customizations with existing ones (don't replace entirely)
    const existingCustomizations = dayPlan.meals[mealName].customizations[recipeId];
    
    if (existingCustomizations && existingCustomizations.modifications) {
      // Merge modifications arrays
      const mergedModifications = [
        ...existingCustomizations.modifications,
        ...customizations.modifications
      ];
      
      // Merge customizations, preserving existing data
      const mergedCustomizations = {
        ...existingCustomizations,
        ...customizations,
        modifications: mergedModifications
      };
      
      console.log(`🔄 Merged customizations: ${existingCustomizations.modifications.length} existing + ${customizations.modifications.length} new = ${mergedModifications.length} total`);
      dayPlan.meals[mealName].customizations[recipeId] = mergedCustomizations;
    } else {
      // No existing customizations, use new ones
      console.log(`🆕 Setting new customizations: ${customizations.modifications.length} modifications`);
      dayPlan.meals[mealName].customizations[recipeId] = customizations;
    }

    // Recalculate total nutrition for this meal
    dayPlan.meals[mealName].totalNutrition = 
      await this.calculateMealTotalNutrition(dayPlan.meals[mealName]);

    // Update database
    const { error } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: draft.suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId);

    if (error) {
      throw new Error(`Failed to update draft: ${error.message}`);
    }
  }

  /**
   * Get draft with full details including overall nutrition
   */
  async getDraftWithNutrition(draftId: string): Promise<any> {
    const draft = await this.getDraft(draftId);
    if (!draft) {
      return null;
    }

    // Calculate nutrition for each meal first
    for (const day of draft.suggestions) {
      for (const [mealType, meal] of Object.entries(day.meals)) {
        if (meal.selectedRecipeId) {
          meal.totalNutrition = await this.calculateMealTotalNutrition(meal);
        }
      }
    }

    // Return full draft with added nutrition calculations
    return {
      ...draft,
      overallNutrition: {
        totalNutrition: await this.calculateDraftTotalNutrition(draft),
        dayWiseNutrition: await this.calculateDayWiseNutrition(draft)
      },
      mealSummary: await this.getMealSummary(draft),
      completionStatus: await this.getCompletionStatus(draft)
    };
  }

  /**
   * Get draft status with total nutrition summary
   */
  async getDraftStatus(draftId: string): Promise<any> {
    const draft = await this.getDraft(draftId);
    if (!draft) {
      return null;
    }

    // Calculate nutrition for each meal first
    for (const day of draft.suggestions) {
      for (const [mealType, meal] of Object.entries(day.meals)) {
        if (meal.selectedRecipeId) {
          meal.totalNutrition = await this.calculateMealTotalNutrition(meal);
        }
      }
    }

    const status = {
      draftId: draft.id,
      clientId: draft.clientId,
      nutritionistId: draft.nutritionistId,
      status: draft.status,
      createdAt: draft.createdAt,
      updatedAt: draft.updatedAt,
      expiresAt: draft.expiresAt,
      totalNutrition: await this.calculateDraftTotalNutrition(draft),
      dayWiseNutrition: await this.calculateDayWiseNutrition(draft),
      mealSummary: await this.getMealSummary(draft),
      completionStatus: await this.getCompletionStatus(draft)
    };

    return status;
  }

  /**
   * Transform meal plan suggestions to draft format
   */
  private transformSuggestionsToDraftFormat(suggestions: any): any {
    return suggestions.map((dayPlan: any) => ({
      day: dayPlan.day,
      date: dayPlan.date,
      meals: Object.entries(dayPlan.meals).reduce((acc, [mealType, mealData]) => {
        // Handle both old format (array of recipes) and new format (object with recipes, allRecipes, displayOffset)
        const mealDataAny = mealData as any;
        const recipesArray = Array.isArray(mealDataAny) ? mealDataAny : mealDataAny.recipes || [];
        const allRecipes = mealDataAny.allRecipes || null;
        const displayOffset = mealDataAny.displayOffset || null;
        
        acc[mealType] = {
          recipes: recipesArray.map((recipe: any) => ({
            ...recipe,
            // Normalize ingredients and instructions if they exist
            ingredients: recipe.ingredients ? MealPlanDraftService.normalizeIngredients(recipe.ingredients, recipe.source) : undefined,
            instructions: recipe.instructions ? MealPlanDraftService.normalizeInstructions(recipe.instructions) : undefined,
            isSelected: false,
            customizations: null,
            selectedAt: null,
          })),
          // Include allRecipes and displayOffset for shuffling
          allRecipes: allRecipes ? {
            edamam: allRecipes.edamam.map((recipe: any) => ({
              ...recipe,
              ingredients: recipe.ingredients ? MealPlanDraftService.normalizeIngredients(recipe.ingredients, 'edamam') : undefined,
              instructions: recipe.instructions ? MealPlanDraftService.normalizeInstructions(recipe.instructions) : undefined
            })),
            spoonacular: allRecipes.spoonacular.map((recipe: any) => ({
              ...recipe,
              ingredients: recipe.ingredients ? MealPlanDraftService.normalizeIngredients(recipe.ingredients, 'spoonacular') : undefined,
              instructions: recipe.instructions ? MealPlanDraftService.normalizeInstructions(recipe.instructions) : undefined
            }))
          } : undefined,
          displayOffset,
          customizations: {},
          totalNutrition: null,
          selectedRecipeId: null
        };
        return acc;
      }, {} as any)
    }));
  }

  /**
   * Calculate total nutrition for a meal (including all vitamins and minerals)
   */
  private async calculateMealTotalNutrition(meal: any): Promise<any> {
    if (!meal.selectedRecipeId) {
      return null;
    }

    const selectedRecipe = meal.recipes.find((r: RecipeSuggestion) => r.id === meal.selectedRecipeId);
    if (!selectedRecipe) {
      return null;
    }

    let baseNutrition = {
      totalCalories: selectedRecipe.calories || selectedRecipe.nutrition?.calories || 0,
      protein: selectedRecipe.protein || selectedRecipe.nutrition?.protein || 0,
      carbs: selectedRecipe.carbs || selectedRecipe.nutrition?.carbs || 0,
      fat: selectedRecipe.fat || selectedRecipe.nutrition?.fat || 0,
      fiber: selectedRecipe.fiber || selectedRecipe.nutrition?.fiber || 0,
      totalNutrients: selectedRecipe.nutrition?.totalNutrients || selectedRecipe.totalNutrients || {}
    };

    // Apply customizations if any
    const customization = meal.customizations[meal.selectedRecipeId];
    if (customization && customization.customizationsApplied && customization.customNutrition) {
      baseNutrition = {
        totalCalories: customization.customNutrition.calories || 0,
        protein: customization.customNutrition.protein || 0,
        carbs: customization.customNutrition.carbs || 0,
        fat: customization.customNutrition.fat || 0,
        fiber: customization.customNutrition.fiber || 0,
        totalNutrients: customization.customNutrition.totalNutrients || baseNutrition.totalNutrients
      };
    }

    // Apply serving adjustment
    const servings = customization?.servings || 1;
    if (servings !== 1) {
      // Adjust macros
      baseNutrition.totalCalories = Math.round(baseNutrition.totalCalories * servings);
      baseNutrition.protein = baseNutrition.protein * servings;
      baseNutrition.carbs = baseNutrition.carbs * servings;
      baseNutrition.fat = baseNutrition.fat * servings;
      baseNutrition.fiber = baseNutrition.fiber * servings;
      
      // Adjust micronutrients
      const adjustedNutrients: any = {};
      Object.entries(baseNutrition.totalNutrients).forEach(([key, value]: [string, any]) => {
        if (value && typeof value === 'object' && 'quantity' in value) {
          adjustedNutrients[key] = {
            ...value,
            quantity: value.quantity * servings
          };
        }
      });
      baseNutrition.totalNutrients = adjustedNutrients;
    }

    // Standardize nutrient keys and calculate with NutritionCalculationService
    const standardizedNutrients = nutritionService.standardizeNutrientKeys(baseNutrition.totalNutrients);
    const fullNutrition = nutritionService.calculateDailyNutrition([baseNutrition]);

    return fullNutrition;
  }

  /**
   * Calculate total nutrition for entire draft (including all vitamins and minerals)
   */
  private async calculateDraftTotalNutrition(draft: MealPlanDraft): Promise<any> {
    const allMeals: any[] = [];

    draft.suggestions.forEach(day => {
      Object.values(day.meals).forEach(meal => {
        if (meal.totalNutrition) {
          allMeals.push(meal.totalNutrition);
        }
      });
    });

    if (allMeals.length === 0) {
      // Return empty nutrition with all vitamins and minerals at 0
      return nutritionService.calculateDailyNutrition([]);
    }

    // Use NutritionCalculationService to aggregate all nutrients
    return nutritionService.calculateDailyNutrition(allMeals);
  }

  /**
   * Calculate day-wise nutrition breakdown (including all vitamins and minerals)
   */
  private async calculateDayWiseNutrition(draft: MealPlanDraft): Promise<any> {
    const dayWiseNutrition: any = {};

    draft.suggestions.forEach(day => {
      const dayKey = `day${day.day}`;
      const dayMeals: any[] = [];
      let mealsCount = 0;
      let selectedMealsCount = 0;

      Object.values(day.meals).forEach(meal => {
        mealsCount++;
        if (meal.totalNutrition) {
          selectedMealsCount++;
          dayMeals.push(meal.totalNutrition);
        }
      });

      // Calculate nutrition using NutritionCalculationService
      const dayNutrition = dayMeals.length > 0 
        ? nutritionService.calculateDailyNutrition(dayMeals)
        : nutritionService.calculateDailyNutrition([]); // Returns all nutrients at 0

      dayWiseNutrition[dayKey] = {
        day: day.day,
        date: day.date,
        nutrition: dayNutrition,
        mealsCount,
        selectedMealsCount
      };
    });

    return dayWiseNutrition;
  }

  /**
   * Get meal summary for draft
   */
  private async getMealSummary(draft: MealPlanDraft): Promise<any> {
    const summary: any = {};

    draft.suggestions.forEach(day => {
      const dayKey = `day${day.day}`;
      summary[dayKey] = {};
      
      Object.entries(day.meals).forEach(([mealType, meal]) => {
        summary[dayKey][mealType] = {
          totalRecipes: meal.recipes.length,
          selectedRecipe: meal.selectedRecipeId ? {
            id: meal.selectedRecipeId,
            title: meal.recipes.find(r => r.id === meal.selectedRecipeId)?.title,
            hasCustomizations: !!meal.customizations[meal.selectedRecipeId],
            nutrition: meal.totalNutrition
          } : null
        };
      });
    });

    return summary;
  }

  /**
   * Get completion status
   */
  private async getCompletionStatus(draft: MealPlanDraft): Promise<any> {
    let totalMeals = 0;
    let selectedMeals = 0;

    draft.suggestions.forEach(day => {
      Object.values(day.meals).forEach(meal => {
        totalMeals++;
        if (meal.selectedRecipeId) {
          selectedMeals++;
        }
      });
    });

    return {
      totalMeals,
      selectedMeals,
      completionPercentage: totalMeals > 0 ? Math.round((selectedMeals / totalMeals) * 100) : 0,
      isComplete: selectedMeals === totalMeals
    };
  }

  /**
   * Clean up expired drafts
   */
  async cleanupExpiredDrafts(): Promise<void> {
    const { error } = await supabase
      .from('meal_plan_drafts')
      .delete()
      .eq('status', 'draft')
      .not('expires_at', 'is', null)
      .lt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Failed to cleanup expired drafts:', error);
    }
  }

  /**
   * Finalize a draft - removes unselected recipes and allRecipes, keeps only selected ones with customizations
   * The finalized plan maintains the same structure as drafts but without suggestions
   */
  async finalizeDraft(
    draftId: string,
    planName?: string
  ): Promise<{ success: boolean; finalizedPlanId: string }> {
    const draft = await this.getDraft(draftId);
    if (!draft) {
      throw new Error('Draft not found');
    }

    if (draft.status !== 'draft') {
      throw new Error(`Cannot finalize plan with status: ${draft.status}`);
    }

    // Create finalized suggestions with only selected recipes
    const finalizedSuggestions = draft.suggestions.map((day: any) => {
      const finalizedDay = {
        day: day.day,
        date: day.date,
        meals: {} as any
      };

      // For each meal, keep only the selected recipe
      Object.entries(day.meals).forEach(([mealName, meal]: [string, any]) => {
        if (meal.selectedRecipeId) {
          const selectedRecipe = meal.recipes.find((r: any) => r.id === meal.selectedRecipeId);
          if (selectedRecipe) {
            // Keep the same structure but remove allRecipes and displayOffset
            finalizedDay.meals[mealName] = {
              recipes: [selectedRecipe], // Only the selected recipe, with all its properties
              // Remove allRecipes and displayOffset (not needed in finalized plan)
              customizations: meal.customizations || {},
              selectedRecipeId: meal.selectedRecipeId,
              totalNutrition: meal.totalNutrition
            };
          }
        }
      });

      return finalizedDay;
    });

    // Count total meals vs selected meals (for logging only)
    const totalMeals = draft.suggestions.reduce((count: number, day: any) => 
      count + Object.keys(day.meals).length, 0
    );
    const selectedMeals = finalizedSuggestions.reduce((count: number, day: any) => 
      count + Object.keys(day.meals).length, 0
    );

    console.log(`📊 Finalization: ${selectedMeals} of ${totalMeals} meals selected`);

    if (selectedMeals < totalMeals) {
      console.log(`ℹ️ Finalizing with partial selections: ${selectedMeals}/${totalMeals} meals`);
    }

    // Allow finalization even with no selections (empty meal plan)
    // This gives nutritionists flexibility to finalize partial plans

    // Update the draft to finalized status
    // Use existing searchParams.startDate, no need for separate planDate
    const { error } = await supabase
      .from('meal_plan_drafts')
      .update({
        status: 'finalized',
        suggestions: finalizedSuggestions,
        plan_name: planName || `Meal Plan ${new Date().toLocaleDateString()}`,
        finalized_at: new Date().toISOString(),
        expires_at: null, // Remove expiration for finalized plans
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId);

    if (error) {
      throw new Error(`Failed to finalize draft: ${error.message}`);
    }

    return {
      success: true,
      finalizedPlanId: draftId
    };
  }

  /**
   * Replace ingredient in a finalized meal plan
   * Uses the same logic as draft ingredient replacement
   */
  async replaceIngredientInFinalizedPlan(
    planId: string,
    day: number,
    mealName: string,
    recipeId: string,
    originalIngredient: string,
    newIngredient: string,
    source: 'edamam' | 'spoonacular'
  ): Promise<void> {
    const plan = await this.getDraft(planId); // Works for both drafts and finalized plans
    if (!plan) {
      throw new Error('Meal plan not found');
    }

    if (plan.status === 'draft') {
      throw new Error('Use the draft ingredient replacement endpoint for drafts');
    }

    // Find the day and meal
    const dayPlan = plan.suggestions.find((d: any) => d.day === day);
    if (!dayPlan) {
      throw new Error(`Day ${day} not found in meal plan`);
    }

    const meal = dayPlan.meals[mealName];
    if (!meal) {
      throw new Error(`Meal ${mealName} not found for day ${day}`);
    }

    // For finalized plans, there should only be one recipe (the selected one)
    const recipe = meal.recipes[0];
    if (!recipe || recipe.id !== recipeId) {
      throw new Error(`Recipe ${recipeId} not found in meal ${mealName}`);
    }

    // Get original recipe nutrition
    const originalRecipeNutrition = {
      calories: recipe.calories || recipe.nutrition?.calories || 0,
      protein: recipe.protein || recipe.nutrition?.protein || 0,
      carbs: recipe.carbs || recipe.nutrition?.carbs || 0,
      fat: recipe.fat || recipe.nutrition?.fat || 0,
      fiber: recipe.fiber || recipe.nutrition?.fiber || 0
    };

    const recipeServings = recipe.servings || 1;

    // Get nutrition for both ingredients (same logic as draft replacement)
    const EdamamService = require('./edamamService').EdamamService;
    const MultiProviderRecipeSearchService = require('./multiProviderRecipeSearchService').MultiProviderRecipeSearchService;
    
    const edamamService = new EdamamService();
    const multiProviderService = new MultiProviderRecipeSearchService();

    let originalIngredientNutrition: any;
    let newIngredientNutrition: any;

    if (source === 'edamam') {
      originalIngredientNutrition = await edamamService.getIngredientNutrition(originalIngredient);
      newIngredientNutrition = await edamamService.getIngredientNutrition(newIngredient);
    } else {
      originalIngredientNutrition = await multiProviderService.getIngredientNutrition(originalIngredient);
      newIngredientNutrition = await multiProviderService.getIngredientNutrition(newIngredient);
    }

    if (!originalIngredientNutrition || !newIngredientNutrition) {
      throw new Error('Could not fetch ingredient nutrition');
    }

    // Extract nutrition values (same helper as in replace.ts)
    const extractNutrition = (data: any) => {
      if (data.calories !== undefined) {
        return {
          calories: data.calories || 0,
          protein: data.protein || 0,
          carbs: data.carbs || 0,
          fat: data.fat || 0,
          fiber: data.fiber || 0
        };
      }
      
      if (data.ingredients?.[0]?.parsed?.[0]?.nutrients) {
        const nutrients = data.ingredients[0].parsed[0].nutrients;
        return {
          calories: nutrients.ENERC_KCAL?.quantity || 0,
          protein: nutrients.PROCNT?.quantity || 0,
          carbs: nutrients.CHOCDF?.quantity || 0,
          fat: nutrients.FAT?.quantity || 0,
          fiber: nutrients.FIBTG?.quantity || 0
        };
      }

      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    };

    const oldNutrition = extractNutrition(originalIngredientNutrition);
    const newNutrition = extractNutrition(newIngredientNutrition);

    // Calculate new recipe nutrition: (Total) - (Old) + (New)
    const totalRecipeNutrition = {
      calories: originalRecipeNutrition.calories * recipeServings,
      protein: originalRecipeNutrition.protein * recipeServings,
      carbs: originalRecipeNutrition.carbs * recipeServings,
      fat: originalRecipeNutrition.fat * recipeServings,
      fiber: originalRecipeNutrition.fiber * recipeServings
    };

    const newTotalRecipeNutrition = {
      calories: Math.max(0, totalRecipeNutrition.calories - oldNutrition.calories + newNutrition.calories),
      protein: Math.max(0, totalRecipeNutrition.protein - oldNutrition.protein + newNutrition.protein),
      carbs: Math.max(0, totalRecipeNutrition.carbs - oldNutrition.carbs + newNutrition.carbs),
      fat: Math.max(0, totalRecipeNutrition.fat - oldNutrition.fat + newNutrition.fat),
      fiber: Math.max(0, totalRecipeNutrition.fiber - oldNutrition.fiber + newNutrition.fiber)
    };

    const newPerServingNutrition = {
      calories: Math.round(newTotalRecipeNutrition.calories / recipeServings),
      protein: parseFloat((newTotalRecipeNutrition.protein / recipeServings).toFixed(1)),
      carbs: parseFloat((newTotalRecipeNutrition.carbs / recipeServings).toFixed(1)),
      fat: parseFloat((newTotalRecipeNutrition.fat / recipeServings).toFixed(1)),
      fiber: parseFloat((newTotalRecipeNutrition.fiber / recipeServings).toFixed(1))
    };

    // Update customizations
    const existingCustomization = meal.customizations[recipeId] || {
      recipeId,
      source,
      modifications: [],
      servings: recipeServings,
      customizationsApplied: false
    };

    existingCustomization.modifications.push({
      type: 'replace',
      ingredient: originalIngredient,
      newIngredient: newIngredient,
      notes: `Replaced ${originalIngredient} with ${newIngredient}`
    });

    existingCustomization.customNutrition = newPerServingNutrition;
    existingCustomization.customizationsApplied = true;

    meal.customizations[recipeId] = existingCustomization;

    // Recalculate meal total nutrition
    meal.totalNutrition = await this.calculateMealTotalNutrition(meal);

    // Update database
    const { error } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: plan.suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) {
      throw new Error(`Failed to update meal plan: ${error.message}`);
    }
  }

  /**
   * Shuffle recipe suggestions - rotate to show next batch of 3 recipes from each provider
   */
  async shuffleRecipes(
    planId: string,
    day: number,
    mealName: string
  ): Promise<{ displayedRecipes: RecipeSuggestion[], hasMore: { edamam: boolean, spoonacular: boolean } }> {
    const plan = await this.getDraft(planId);
    if (!plan) {
      throw new Error('Meal plan not found');
    }

    // Find the day and meal
    const dayPlan = plan.suggestions.find((d: any) => d.day === day);
    if (!dayPlan) {
      throw new Error(`Day ${day} not found in meal plan`);
    }

    const meal = dayPlan.meals[mealName];
    if (!meal) {
      throw new Error(`Meal ${mealName} not found for day ${day}`);
    }

    if (!meal.allRecipes) {
      throw new Error(`No additional recipes available for shuffling. This meal plan may have been created before the shuffle feature was added.`);
    }

    // Get current offsets or initialize to 0
    const currentOffset = meal.displayOffset || { edamam: 0, spoonacular: 0 };
    
    // Calculate next offsets
    const nextEdamamOffset = currentOffset.edamam + 3;
    const nextSpoonacularOffset = currentOffset.spoonacular + 3;
    
    // Check if more recipes are available
    const hasMoreEdamam = nextEdamamOffset < meal.allRecipes.edamam.length;
    const hasMoreSpoonacular = nextSpoonacularOffset < meal.allRecipes.spoonacular.length;
    
    if (!hasMoreEdamam && !hasMoreSpoonacular) {
      throw new Error(`No more recipes available to shuffle for ${mealName}. You've reached the end of available suggestions.`);
    }

    // Get next batch of recipes
    const nextEdamamBatch = hasMoreEdamam 
      ? meal.allRecipes.edamam.slice(nextEdamamOffset, nextEdamamOffset + 3)
      : [];
    
    const nextSpoonacularBatch = hasMoreSpoonacular
      ? meal.allRecipes.spoonacular.slice(nextSpoonacularOffset, nextSpoonacularOffset + 3)
      : [];

    // If one provider ran out, fill from the other if available
    let displayedRecipes: RecipeSuggestion[] = [];
    
    if (nextEdamamBatch.length === 0 && hasMoreSpoonacular) {
      // Only spoonacular has more
      displayedRecipes = nextSpoonacularBatch;
    } else if (nextSpoonacularBatch.length === 0 && hasMoreEdamam) {
      // Only edamam has more
      displayedRecipes = nextEdamamBatch;
    } else {
      // Both have recipes, combine them
      displayedRecipes = [...nextEdamamBatch, ...nextSpoonacularBatch];
    }

    console.log(`🔄 Shuffling ${mealName}: Edamam offset ${currentOffset.edamam} -> ${nextEdamamOffset}, Spoonacular offset ${currentOffset.spoonacular} -> ${nextSpoonacularOffset}`);
    console.log(`📊 Retrieved: ${nextEdamamBatch.length} Edamam + ${nextSpoonacularBatch.length} Spoonacular = ${displayedRecipes.length} total`);

    // Update the meal with new displayed recipes and offsets
    meal.recipes = displayedRecipes;
    meal.displayOffset = {
      edamam: hasMoreEdamam ? nextEdamamOffset : currentOffset.edamam,
      spoonacular: hasMoreSpoonacular ? nextSpoonacularOffset : currentOffset.spoonacular
    };

    // Update database
    const { error } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: plan.suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) {
      throw new Error(`Failed to update meal plan: ${error.message}`);
    }

    // Check if there are still more recipes after this batch
    const stillHasMoreEdamam = meal.displayOffset.edamam + 3 < meal.allRecipes.edamam.length;
    const stillHasMoreSpoonacular = meal.displayOffset.spoonacular + 3 < meal.allRecipes.spoonacular.length;

    return {
      displayedRecipes,
      hasMore: {
        edamam: stillHasMoreEdamam,
        spoonacular: stillHasMoreSpoonacular
      }
    };
  }

  /**
   * Update custom notes for a recipe in draft or finalized plan
   */
  async updateRecipeNotes(
    planId: string,
    day: number,
    mealName: string,
    recipeId: string,
    notes: string | null
  ): Promise<void> {
    const plan = await this.getDraft(planId);
    if (!plan) {
      throw new Error('Meal plan not found');
    }

    // Find the day and meal
    const dayPlan = plan.suggestions.find((d: any) => d.day === day);
    if (!dayPlan) {
      throw new Error(`Day ${day} not found in meal plan`);
    }

    const meal = dayPlan.meals[mealName];
    if (!meal) {
      throw new Error(`Meal ${mealName} not found for day ${day}`);
    }

    // Find the recipe
    const recipe = meal.recipes.find((r: any) => r.id === recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found in meal ${mealName}`);
    }

    // Update the recipe's custom notes
    recipe.customNotes = notes;

    console.log(`✅ Updated custom notes for recipe ${recipeId}: ${notes ? `"${notes.substring(0, 50)}${notes.length > 50 ? '...' : ''}"` : 'cleared'}`);

    // Update database
    const { error } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: plan.suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) {
      throw new Error(`Failed to update meal plan: ${error.message}`);
    }
  }

  /**
   * Update cooking instructions for a recipe in draft or finalized plan
   */
  async updateRecipeInstructions(
    planId: string,
    day: number,
    mealName: string,
    recipeId: string,
    instructions: string | string[]
  ): Promise<void> {
    const plan = await this.getDraft(planId);
    if (!plan) {
      throw new Error('Meal plan not found');
    }

    // Find the day and meal
    const dayPlan = plan.suggestions.find((d: any) => d.day === day);
    if (!dayPlan) {
      throw new Error(`Day ${day} not found in meal plan`);
    }

    const meal = dayPlan.meals[mealName];
    if (!meal) {
      throw new Error(`Meal ${mealName} not found for day ${day}`);
    }

    // Find the recipe
    const recipe = meal.recipes.find((r: any) => r.id === recipeId);
    if (!recipe) {
      throw new Error(`Recipe ${recipeId} not found in meal ${mealName}`);
    }

    // Normalize instructions to array format
    let instructionsArray: string[];
    if (typeof instructions === 'string') {
      // Split by newlines or numbered steps
      instructionsArray = instructions
        .split(/\n+/)
        .map(s => s.trim())
        .filter(s => s.length > 0)
        .map(s => s.replace(/^\d+\.\s*/, '')); // Remove leading numbers like "1. "
    } else {
      instructionsArray = instructions;
    }

    // Update the recipe's instructions
    recipe.instructions = instructionsArray;
    recipe.hasCustomInstructions = true;

    console.log(`✅ Updated instructions for recipe ${recipeId}: ${instructionsArray.length} steps`);

    // Update database
    const { error } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: plan.suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', planId);

    if (error) {
      throw new Error(`Failed to update meal plan: ${error.message}`);
    }
  }
}
