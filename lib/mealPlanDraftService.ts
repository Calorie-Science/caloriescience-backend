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
  servings?: number; // Deprecated: use nutritionServings
  nutritionServings?: number; // Portion size multiplier for nutrition (default: 1)
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
        recipes: RecipeSuggestion[]; // Currently displayed recipes (6 per page by default)
        allRecipes?: { // ALL fetched recipes for pagination
          edamam: RecipeSuggestion[];
          spoonacular: RecipeSuggestion[];
        };
        displayOffset?: { // Track which batch is currently shown (legacy for shuffle)
          edamam: number; // Index offset for edamam recipes (0, 3, 6, 9, 12)
          spoonacular: number; // Index offset for spoonacular recipes (0, 3, 6, 9, 12)
        };
        pagination?: { // Pagination info
          currentPage: number; // Current page number (1-based)
          totalPages: number; // Total number of pages available
          recipesPerPage: number; // Number of recipes to show per page (default 6)
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
    
    return ingredients.map(ing => {
      const unit = ing.measure || ing.unit || '';
      return {
        id: ing.foodId || ing.id,
        name: ing.food || ing.name || ing.text,
        amount: ing.quantity || ing.amount || 0,
        unit: unit === '<unit>' ? '' : unit,
        image: ing.image,
        original: ing.text || ing.original || ing.originalString || '',
        weight: ing.weight,
        foodCategory: ing.foodCategory
      };
    });
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
      image: ing.image ? (ing.image.startsWith('http') ? ing.image : `https://spoonacular.com/cdn/ingredients_100x100/${ing.image}`) : undefined,
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
            let stepText = inst.step;
            // Check if step is double-encoded JSON
            if (typeof stepText === 'string' && stepText.startsWith('{')) {
              try {
                const parsed = JSON.parse(stepText);
                if (parsed && typeof parsed === 'object' && parsed.step) {
                  stepText = parsed.step;
                }
              } catch (e) {
                // Keep original if parsing fails
              }
            }
            return stepText;
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

    // Log what we're about to save for debugging
    console.log(`💾 Saving recipe selection for ${mealName}:`, {
      draftId,
      day,
      mealName,
      recipeId,
      selectedRecipeId: dayPlan.meals[mealName].selectedRecipeId,
      totalMealsInDay: Object.keys(dayPlan.meals).length,
      mealsWithSelections: Object.entries(dayPlan.meals)
        .filter(([_, meal]: [string, any]) => meal.selectedRecipeId)
        .map(([name, meal]: [string, any]) => ({ name, recipeId: meal.selectedRecipeId }))
    });

    // Update database with optimistic locking using updated_at
    const newUpdatedAt = new Date().toISOString();
    const { data: updateResult, error } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: draft.suggestions,
        updated_at: newUpdatedAt
      })
      .eq('id', draftId)
      .eq('updated_at', draft.updatedAt) // Optimistic lock: only update if not modified by another request
      .select('id');

    if (error) {
      console.error(`❌ Failed to update draft for ${mealName}:`, error);
      throw new Error(`Failed to update draft: ${error.message}`);
    }
    
    // Check if the update actually happened (optimistic lock check)
    if (!updateResult || updateResult.length === 0) {
      console.warn(`⚠️ Draft was modified by another request during ${mealName} selection. Retrying...`);
      // Retry the operation by recursively calling selectRecipe
      // This will fetch the fresh draft and try again
      return await this.selectRecipe(draftId, day, mealName, recipeId, customizations);
    }
    
    console.log(`✅ Successfully saved recipe selection for ${mealName}`);
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
        
        // Transform nutritionDetails format to totalNutrients format
        const nutritionDetails = cachedRecipe.nutritionDetails || {};
        const totalNutrients: any = {};
        
        // Add macros
        if (nutritionDetails.macros) {
          Object.entries(nutritionDetails.macros).forEach(([key, value]: [string, any]) => {
            if (value && value.quantity !== undefined) {
              totalNutrients[key] = value;
            }
          });
        }
        
        // Add vitamins
        if (nutritionDetails.micros?.vitamins) {
          Object.entries(nutritionDetails.micros.vitamins).forEach(([key, value]: [string, any]) => {
            if (value && value.quantity !== undefined) {
              totalNutrients[key] = value;
            }
          });
        }
        
        // Add minerals
        if (nutritionDetails.micros?.minerals) {
          Object.entries(nutritionDetails.micros.minerals).forEach(([key, value]: [string, any]) => {
            if (value && value.quantity !== undefined) {
              totalNutrients[key] = value;
            }
          });
        }
        
        return {
          ingredients: normalizedIngredients,
          instructions: normalizedInstructions,
          nutrition: {
            calories: nutritionDetails.calories?.quantity || 0,
            protein: nutritionDetails.macros?.protein?.quantity || 0,
            carbs: nutritionDetails.macros?.carbs?.quantity || 0,
            fat: nutritionDetails.macros?.fat?.quantity || 0,
            fiber: nutritionDetails.macros?.fiber?.quantity || 0,
            totalNutrients: totalNutrients
          }
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
        
        // NOTE: multiProviderService.getRecipeDetails() already transforms nutrition to standardized format
        // So we just use it directly, no need to transform again!
        let nutritionDetails: any = null;
        
        if ((recipeDetails as any).nutrition) {
          nutritionDetails = (recipeDetails as any).nutrition;
          
          // Validate that we got actual nutrition data
          const hasValidNutrition = nutritionDetails && 
            nutritionDetails.macros && 
            (nutritionDetails.macros.protein?.quantity > 0 || 
             nutritionDetails.macros.carbs?.quantity > 0 ||
             nutritionDetails.macros.fat?.quantity > 0);
          
          if (hasValidNutrition) {
            console.log(`  💾 Caching with micronutrients: ${Object.keys(nutritionDetails.micros?.vitamins || {}).length} vitamins, ${Object.keys(nutritionDetails.micros?.minerals || {}).length} minerals`);
            console.log(`  💾 Nutrition values: protein=${nutritionDetails.macros.protein?.quantity}g, carbs=${nutritionDetails.macros.carbs?.quantity}g, fat=${nutritionDetails.macros.fat?.quantity}g`);
          } else {
            console.warn(`  ⚠️ Nutrition data is empty for recipe ${recipeId} - skipping cache`);
            nutritionDetails = null; // Mark as missing rather than empty
          }
        } else {
          console.warn(`  ⚠️ No nutrition data in API response for recipe ${recipeId} - skipping cache`);
        }
        
        // Only cache if we have complete nutrition
        if (!nutritionDetails) {
          console.log('⚠️ Skipping cache - incomplete nutrition data. Recipe will be fetched fresh when needed.');
          return {
            ingredients: normalizedIngredients,
            instructions: normalizedInstructions,
            nutrition: {
              calories: recipeDetails.calories || 0,
              protein: recipeDetails.protein || 0,
              carbs: recipeDetails.carbs || 0,
              fat: recipeDetails.fat || 0,
              fiber: recipeDetails.fiber || 0,
              totalNutrients: {}
            }
          };
        }
        
        // Transform nutritionDetails format to totalNutrients format
        const totalNutrients: any = {};
        
        // Add macros
        if (nutritionDetails.macros) {
          Object.entries(nutritionDetails.macros).forEach(([key, value]: [string, any]) => {
            if (value && value.quantity !== undefined) {
              totalNutrients[key] = value;
            }
          });
        }
        
        // Add vitamins
        if (nutritionDetails.micros?.vitamins) {
          Object.entries(nutritionDetails.micros.vitamins).forEach(([key, value]: [string, any]) => {
            if (value && value.quantity !== undefined) {
              totalNutrients[key] = value;
            }
          });
        }
        
        // Add minerals
        if (nutritionDetails.micros?.minerals) {
          Object.entries(nutritionDetails.micros.minerals).forEach(([key, value]: [string, any]) => {
            if (value && value.quantity !== undefined) {
              totalNutrients[key] = value;
            }
          });
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
            calories: nutritionDetails.calories?.quantity || 0,
            protein: nutritionDetails.macros?.protein?.quantity || 0,
            carbs: nutritionDetails.macros?.carbs?.quantity || 0,
            fat: nutritionDetails.macros?.fat?.quantity || 0,
            fiber: nutritionDetails.macros?.fiber?.quantity || 0,
            totalNutrients: totalNutrients
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

    // Update recipe top-level nutrition fields to match customNutrition
    if (customizations.customNutrition) {
      console.log('🔄 Updating recipe top-level nutrition fields to match customNutrition');

      // Extract nutrition values from customNutrition
      const extractNumber = (value: any): number => {
        if (typeof value === 'number') return value;
        if (value?.quantity !== undefined) return value.quantity;
        return 0;
      };

      const customNutritionAny = customizations.customNutrition as any;
      const nutritionServings = (customizations as any).nutritionServings || (customizations as any).servings || 1;

      // Store MULTIPLIED nutrition values in the recipe (so they show correctly in GET responses)
      recipe.calories = extractNumber(customNutritionAny.calories) * nutritionServings;
      recipe.protein = extractNumber(customNutritionAny.macros?.protein) * nutritionServings;
      recipe.carbs = extractNumber(customNutritionAny.macros?.carbs) * nutritionServings;
      recipe.fat = extractNumber(customNutritionAny.macros?.fat) * nutritionServings;
      recipe.fiber = extractNumber(customNutritionAny.macros?.fiber) * nutritionServings;

      // Update recipe.nutrition to include multiplied values with micros
      if (customNutritionAny.macros || customNutritionAny.micros) {
        const recipeNutrition: any = {
          calories: { quantity: recipe.calories, unit: 'kcal' },
          macros: {},
          micros: { vitamins: {}, minerals: {} },
          totalNutrients: {} // Add totalNutrients for calculateMealTotalNutrition
        };

        // Multiply macros
        if (customNutritionAny.macros) {
          Object.entries(customNutritionAny.macros).forEach(([key, value]: [string, any]) => {
            if (value && value.quantity !== undefined) {
              const multipliedValue = {
                quantity: value.quantity * nutritionServings,
                unit: value.unit,
                label: value.label
              };
              recipeNutrition.macros[key] = multipliedValue;
              // Also add to totalNutrients
              recipeNutrition.totalNutrients[key] = multipliedValue;
            }
          });
        }

        // Multiply micros
        if (customNutritionAny.micros?.vitamins) {
          Object.entries(customNutritionAny.micros.vitamins).forEach(([key, value]: [string, any]) => {
            if (value && value.quantity !== undefined) {
              const multipliedValue = {
                quantity: value.quantity * nutritionServings,
                unit: value.unit,
                label: value.label
              };
              recipeNutrition.micros.vitamins[key] = multipliedValue;
              // Also add to totalNutrients
              recipeNutrition.totalNutrients[key] = multipliedValue;
            }
          });
        }

        if (customNutritionAny.micros?.minerals) {
          Object.entries(customNutritionAny.micros.minerals).forEach(([key, value]: [string, any]) => {
            if (value && value.quantity !== undefined) {
              const multipliedValue = {
                quantity: value.quantity * nutritionServings,
                unit: value.unit,
                label: value.label
              };
              recipeNutrition.micros.minerals[key] = multipliedValue;
              // Also add to totalNutrients
              recipeNutrition.totalNutrients[key] = multipliedValue;
            }
          });
        }

        recipe.nutrition = recipeNutrition;
      }

      // Store nutritionServings on the recipe so it displays correctly
      (recipe as any).nutritionServings = nutritionServings;

      console.log('  ✅ Updated top-level nutrition (multiplied by nutritionServings):', {
        nutritionServings,
        calories: recipe.calories,
        protein: recipe.protein,
        carbs: recipe.carbs,
        fat: recipe.fat
      });
      
      // For simple ingredients, update the title to reflect new quantity
      const recipeAny = recipe as any;
      if (recipeAny.isSimpleIngredient || recipeAny.isIngredient) {
        // Option 1: servings-based change (simpler approach)
        const customServings = (customizations as any).nutritionServings || (customizations as any).servings;
        if (customServings && customServings !== 1 && recipe.ingredients && recipe.ingredients.length > 0) {
          const originalIng = recipe.ingredients[0];
          const originalAmount = originalIng.amount || 1;
          const originalUnit = originalIng.unit || '';
          const newAmount = originalAmount * customServings;
          
          // Extract ingredient name from title (before the opening parenthesis)
          const titleMatch = recipe.title.match(/^(.+?)\s*\(/);
          const ingredientName = titleMatch ? titleMatch[1] : recipe.title;
          
          // Build new title with updated quantity
          const newTitle = `${ingredientName} (${newAmount}${originalUnit})`;
          
          console.log(`  🏷️ Updating simple ingredient title (servings): "${recipe.title}" → "${newTitle}"`);
          recipe.title = newTitle;
          
          // Also update the ingredients array
          recipe.ingredients[0] = {
            ...originalIng,
            amount: newAmount,
            original: `${newAmount} ${originalUnit} ${originalIng.name}`
          };
        } 
        // Option 2: replace modification (legacy approach)
        else {
          const replaceMod = customizations.modifications.find((mod: any) => mod.type === 'replace');
          
          if (replaceMod && (replaceMod as any).amount !== undefined && (replaceMod as any).unit) {
            // Extract ingredient name from title (before the opening parenthesis)
            const titleMatch = recipe.title.match(/^(.+?)\s*\(/);
            const ingredientName = titleMatch ? titleMatch[1] : recipe.title;
            
            // Build new title with updated quantity
            const newTitle = `${ingredientName} (${(replaceMod as any).amount}${(replaceMod as any).unit})`;
            
            console.log(`  🏷️ Updating simple ingredient title (replace): "${recipe.title}" → "${newTitle}"`);
            recipe.title = newTitle;
          }
        }
      }
    }

    // REPLACE customizations (smart merge already happened in API handler)
    // The API handler in draft.ts already handles smart merging, so we just save what we're given
    console.log(`💾 Saving customizations: ${customizations.modifications.length} modifications (smart merge already applied)`);
    dayPlan.meals[mealName].customizations[recipeId] = customizations;

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

    // If totalNutrients is empty, try to fetch detailed nutrition from cache
    const hasEmptyNutrients = !baseNutrition.totalNutrients || Object.keys(baseNutrition.totalNutrients).length === 0;
    if (hasEmptyNutrients) {
      try {
        const cachedRecipe = await cacheService.getRecipeById(selectedRecipe.id);
        if (cachedRecipe?.nutritionDetails) {
          console.log(`📊 Fetching detailed nutrition from cache for meal calculation: ${selectedRecipe.id}`);
          
          // Build totalNutrients from cached nutritionDetails
          const totalNutrients: any = {};
          
          // Add macros
          if (cachedRecipe.nutritionDetails.macros) {
            Object.entries(cachedRecipe.nutritionDetails.macros).forEach(([key, value]: [string, any]) => {
              if (value && value.quantity !== undefined) {
                totalNutrients[key] = value;
              }
            });
          }
          
          // Add vitamins
          if (cachedRecipe.nutritionDetails.micros?.vitamins) {
            Object.entries(cachedRecipe.nutritionDetails.micros.vitamins).forEach(([key, value]: [string, any]) => {
              if (value && value.quantity !== undefined) {
                totalNutrients[key] = value;
              }
            });
          }
          
          // Add minerals
          if (cachedRecipe.nutritionDetails.micros?.minerals) {
            Object.entries(cachedRecipe.nutritionDetails.micros.minerals).forEach(([key, value]: [string, any]) => {
              if (value && value.quantity !== undefined) {
                totalNutrients[key] = value;
              }
            });
          }
          
          baseNutrition.totalNutrients = totalNutrients;
          console.log(`✅ Loaded ${Object.keys(totalNutrients).length} nutrients from cache`);
        }
      } catch (error) {
        console.error(`⚠️ Error fetching detailed nutrition from cache:`, error);
      }
    }

    // Check if customizations are applied
    const customization = meal.customizations[meal.selectedRecipeId];
    const customizationsApplied = customization && customization.customizationsApplied;

    // If customizations are applied, the selectedRecipe already has MULTIPLIED values
    // (from updateCustomization in mealPlanDraftService.ts)
    // So we should NOT multiply again. Just use the values as-is.

    // If NO customizations, we need to multiply by servings
    if (!customizationsApplied) {
      const servings = customization?.nutritionServings || customization?.servings || 1;
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
    }

    // Standardize nutrient keys for aggregation
    const standardizedNutrients = nutritionService.standardizeNutrientKeys(baseNutrition.totalNutrients);

    // Extract commonly accessed nutrients from totalNutrients
    const extractQuantity = (nutrientKey: string): number => {
      const nutrient = standardizedNutrients[nutrientKey];
      return nutrient && typeof nutrient === 'object' && 'quantity' in nutrient ? nutrient.quantity : 0;
    };

    // Return in the format that calculateDailyNutrition expects
    // It expects fields: totalCalories, protein, carbs, fat, fiber, sodium, sugar, cholesterol, calcium, iron, totalNutrients
    return {
      totalCalories: baseNutrition.totalCalories,
      protein: baseNutrition.protein,
      carbs: baseNutrition.carbs,
      fat: baseNutrition.fat,
      fiber: baseNutrition.fiber,
      sodium: extractQuantity('sodium'),
      sugar: extractQuantity('sugars') || extractQuantity('sugar'),
      cholesterol: extractQuantity('cholesterol'),
      calcium: extractQuantity('calcium'),
      iron: extractQuantity('iron'),
      totalNutrients: standardizedNutrients
    };
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
        console.log(`🔍 Checking meal "${mealName}" - selectedRecipeId: ${meal.selectedRecipeId || 'NONE'}, recipes count: ${meal.recipes?.length || 0}`);
        
        if (meal.selectedRecipeId) {
          const selectedRecipe = meal.recipes.find((r: any) => r.id === meal.selectedRecipeId);
          if (selectedRecipe) {
            console.log(`✅ Including meal "${mealName}" with recipe "${selectedRecipe.title}" (${selectedRecipe.id})`);
            // Keep the same structure but remove allRecipes and displayOffset
            finalizedDay.meals[mealName] = {
              recipes: [selectedRecipe], // Only the selected recipe, with all its properties
              // Remove allRecipes and displayOffset (not needed in finalized plan)
              customizations: meal.customizations || {},
              selectedRecipeId: meal.selectedRecipeId,
              totalNutrition: meal.totalNutrition
            };
          } else {
            console.warn(`⚠️ Selected recipe ${meal.selectedRecipeId} not found in meal "${mealName}" recipes array`);
          }
        } else {
          console.warn(`⚠️ Meal "${mealName}" has no selectedRecipeId - will be excluded from finalized plan`);
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
   * Change page for recipe suggestions (pagination)
   */
  async changePage(
    planId: string,
    day: number,
    mealName: string,
    direction: 'next' | 'prev' | 'specific',
    pageNumber?: number
  ): Promise<{ 
    displayedRecipes: RecipeSuggestion[];
    currentPage: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }> {
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
      throw new Error(`No recipes available for pagination. This meal plan may have been created before the pagination feature was added.`);
    }

    // Combine all recipes from both providers
    const allRecipesCombined = [
      ...(meal.allRecipes.edamam || []),
      ...(meal.allRecipes.spoonacular || [])
    ];

    const recipesPerPage = 6; // Show 6 recipes per page
    const totalRecipes = allRecipesCombined.length;
    const totalPages = Math.ceil(totalRecipes / recipesPerPage);

    // Initialize pagination if not exists
    if (!meal.pagination) {
      meal.pagination = {
        currentPage: 1,
        totalPages: totalPages,
        recipesPerPage: recipesPerPage
      };
    }

    // Determine the target page
    let targetPage = meal.pagination.currentPage;
    
    if (direction === 'next') {
      targetPage = Math.min(meal.pagination.currentPage + 1, totalPages);
    } else if (direction === 'prev') {
      targetPage = Math.max(meal.pagination.currentPage - 1, 1);
    } else if (direction === 'specific' && pageNumber) {
      if (pageNumber < 1 || pageNumber > totalPages) {
        throw new Error(`Invalid page number ${pageNumber}. Valid range is 1 to ${totalPages}.`);
      }
      targetPage = pageNumber;
    }

    // Check if we're already on the target page
    if (targetPage === meal.pagination.currentPage && direction !== 'specific') {
      if (direction === 'next') {
        throw new Error(`No more pages available. You're already on the last page (${totalPages}).`);
      } else if (direction === 'prev') {
        throw new Error(`No previous pages available. You're already on the first page.`);
      }
    }

    // Calculate start and end indices for the target page
    const startIndex = (targetPage - 1) * recipesPerPage;
    const endIndex = Math.min(startIndex + recipesPerPage, totalRecipes);

    // Get recipes for the target page
    const displayedRecipes = allRecipesCombined.slice(startIndex, endIndex);

    console.log(`📄 Changing page for ${mealName}: page ${meal.pagination.currentPage} -> ${targetPage}`);
    console.log(`   Total recipes: ${totalRecipes}, Showing: ${startIndex + 1}-${endIndex} (${displayedRecipes.length} recipes)`);

    // Update the meal with new displayed recipes and pagination info
    meal.recipes = displayedRecipes;
    meal.pagination = {
      currentPage: targetPage,
      totalPages: totalPages,
      recipesPerPage: recipesPerPage
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

    return {
      displayedRecipes,
      currentPage: targetPage,
      totalPages: totalPages,
      hasNextPage: targetPage < totalPages,
      hasPrevPage: targetPage > 1
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
