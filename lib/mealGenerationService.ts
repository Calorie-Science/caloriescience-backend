import { EdamamService, EdamamRecipe, RecipeSearchParams } from './edamamService';
import { MealDataTransformService } from './mealDataTransformService';
import { NutritionCalculationService } from './nutritionCalculationService';

export interface GeneratedMeal {
  id?: string;
  mealType: string;
  mealOrder?: number;
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
  ingredients: any[]; // Can be string[] or detailed ingredient objects
  edamamRecipeId: string;
  totalNutrients?: { [key: string]: { label: string; quantity: number; unit: string } }; // All micronutrients from Edamam
}

/**
 * Service for generating meals and enriching them with recipe details
 */
export class MealGenerationService {
  private edamamService: EdamamService;
  private dataTransformService: MealDataTransformService;
  private nutritionService: NutritionCalculationService;

  constructor() {
    this.edamamService = new EdamamService();
    this.dataTransformService = new MealDataTransformService();
    this.nutritionService = new NutritionCalculationService();
  }

  /**
   * Generate meals for a single day based on meal distribution
   */
  async generateMealsForDay(
    mealDistribution: Record<string, any>,
    preferences: any,
    targetCalories: number,
    macroTargets?: any
  ): Promise<GeneratedMeal[]> {
    console.log('🍽️ Generating meals for day with distribution:', mealDistribution);
    
    const meals: GeneratedMeal[] = [];
    
    for (const [mealKey, mealInfo] of Object.entries(mealDistribution)) {
      console.log(`🔍 Generating meal: ${mealKey}`, mealInfo);
      
      try {
        const recipe = await this.findRecipeForMeal(mealInfo, preferences, macroTargets);
        
        if (recipe) {
          const meal = this.createMealFromRecipe(recipe, mealInfo);
          meals.push(meal);
          console.log(`✅ Generated meal: ${meal.recipeName} (${meal.totalCalories} cal)`);
        } else {
          // Create placeholder meal if no recipe found
          const placeholderMeal = this.createPlaceholderMeal(mealInfo);
          meals.push(placeholderMeal);
          console.log(`⚠️ Created placeholder meal for: ${mealInfo.mealType || mealKey}`);
        }
      } catch (error) {
        console.error(`❌ Error generating meal for ${mealKey}:`, error);
        // Create placeholder meal on error
        const placeholderMeal = this.createPlaceholderMeal(mealInfo);
        meals.push(placeholderMeal);
      }
    }
    
    console.log(`🎯 Generated ${meals.length} meals for the day`);
    return meals;
  }

  /**
   * Enrich meals with detailed recipe information
   */
  async enrichMealsWithRecipeDetails(meals: GeneratedMeal[]): Promise<GeneratedMeal[]> {
    console.log('🔍 Enriching meals with recipe details...');
    
    const enrichedMeals = await Promise.all(
      meals.map(async (meal) => {
        try {
          if (meal.edamamRecipeId && !meal.edamamRecipeId.includes('placeholder')) {
            console.log(`🔍 Fetching recipe details for: ${meal.recipeName}`);
            
            const recipe = await this.edamamService.getRecipeById(meal.edamamRecipeId);
            
            if (recipe) {
              // Calculate optimal servings based on target calories
              const recipeYield = recipe.yield || 1;
              const recipeCalories = recipe.calories || 1;
              const caloriesPerServing = recipeCalories / recipeYield;
              
              // Update meal with detailed recipe information
              meal.caloriesPerServing = Math.round(caloriesPerServing * 100) / 100;
              meal.proteinGrams = Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / recipeYield * 100) / 100;
              meal.carbsGrams = Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / recipeYield * 100) / 100;
              meal.fatGrams = Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / recipeYield * 100) / 100;
              meal.fiberGrams = Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / recipeYield * 100) / 100;
              
              // Include ALL totalNutrients for micronutrient calculation (scaled per serving and standardized keys)
              const scaledNutrients: { [key: string]: { label: string; quantity: number; unit: string } } = {};
              if (recipe.totalNutrients) {
                Object.entries(recipe.totalNutrients).forEach(([key, nutrientData]: [string, any]) => {
                  if (nutrientData && typeof nutrientData === 'object' && 'quantity' in nutrientData) {
                    scaledNutrients[key] = {
                      label: nutrientData.label || key,
                      quantity: (nutrientData.quantity || 0) / recipeYield, // Scale per serving
                      unit: nutrientData.unit || ''
                    };
                  }
                });
              }
              meal.totalNutrients = this.nutritionService.standardizeNutrientKeys(scaledNutrients);
              
              // Use detailed ingredients with quantity, measure, etc. - scaled per serving
              meal.ingredients = recipe.ingredients?.map((ing: any) => {
                const scaledWeight = (ing.weight || 0) / recipeYield;
                return {
                  text: this.dataTransformService.convertIngredientToGrams(ing.text, scaledWeight),
                  quantity: ing.quantity ? ing.quantity / recipeYield : 1,
                  measure: ing.measure || 'piece',
                  food: ing.food || this.dataTransformService.extractFoodName(ing.text),
                  weight: scaledWeight
                };
              }) || recipe.ingredientLines || [];
              
              console.log(`✅ Enriched meal: ${meal.recipeName} with detailed recipe data`);
            }
          }
          
          return meal;
        } catch (error) {
          console.error(`❌ Error enriching meal ${meal.recipeName}:`, error);
          return meal; // Return meal as-is if enrichment fails
        }
      })
    );
    
    console.log('✅ Meal enrichment completed');
    return enrichedMeals;
  }

  /**
   * Find a suitable recipe for a meal
   */
  async findRecipeForMeal(
    mealInfo: any,
    preferences: any,
    macroTargets?: any
  ): Promise<EdamamRecipe | null> {
    try {
      console.log(`🔍 Finding recipe for meal: ${mealInfo.mealType || 'Unknown'} (${mealInfo.targetCalories} cal)`);
      
      // Build search parameters
      const searchParams: RecipeSearchParams = {
        q: mealInfo.mealType || 'healthy meal',
        calories: `${Math.max(50, mealInfo.targetCalories - 100)}-${mealInfo.targetCalories + 100}`,
        mealType: [this.dataTransformService.getMealTypeForEdamam(mealInfo.mealType || 'lunch')],
        dishType: this.dataTransformService.getDishTypesForMeal(mealInfo.mealType || 'lunch'),
        health: this.dataTransformService.convertDietaryRestrictionsToEdamam(preferences.dietaryRestrictions || []),
        cuisineType: this.dataTransformService.convertCuisinePreferencesToEdamam(preferences.cuisinePreferences || []),
        random: true,
        from: 0,
        to: 20
      };

      console.log('🔍 Recipe search params:', searchParams);
      
      const searchResult = await this.edamamService.searchRecipes(searchParams);
      
      if (searchResult && searchResult.hits && searchResult.hits.length > 0) {
        // Get the first recipe (random=true means Edamam randomizes results)
        const recipe = searchResult.hits[0].recipe;
        console.log(`✅ Found recipe: ${recipe.label} (${Math.round(recipe.calories)} cal)`);
        return recipe;
      }
      
      console.log('⚠️ No recipes found for meal criteria');
      return null;
      
    } catch (error) {
      console.error('❌ Error finding recipe for meal:', error);
      return null;
    }
  }

  /**
   * Create a meal object from a recipe
   */
  createMealFromRecipe(recipe: EdamamRecipe, mealInfo: any): GeneratedMeal {
    const recipeYield = recipe.yield || 1;
    const recipeCalories = recipe.calories || 1;
    const caloriesPerServing = recipeCalories / recipeYield;
    
    // Calculate optimal servings based on target calories
    const optimalServings = this.calculateOptimalServings(recipe, mealInfo);
    
    return {
      mealType: mealInfo.mealType || 'meal',
      mealOrder: mealInfo.mealOrder,
      recipeName: recipe.label,
      recipeUrl: recipe.url,
      recipeImageUrl: recipe.image,
      caloriesPerServing: Math.round(caloriesPerServing * 100) / 100,
      proteinGrams: Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / recipeYield * 100) / 100,
      carbsGrams: Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / recipeYield * 100) / 100,
      fatGrams: Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / recipeYield * 100) / 100,
      fiberGrams: Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / recipeYield * 100) / 100,
      servingsPerMeal: optimalServings,
      totalCalories: Math.round(caloriesPerServing * optimalServings * 100) / 100,
      totalProtein: Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / recipeYield * optimalServings * 100) / 100,
      totalCarbs: Math.round((recipe.totalNutrients?.CHOCDF?.quantity || 0) / recipeYield * optimalServings * 100) / 100,
      totalFat: Math.round((recipe.totalNutrients?.FAT?.quantity || 0) / recipeYield * optimalServings * 100) / 100,
      totalFiber: Math.round((recipe.totalNutrients?.FIBTG?.quantity || 0) / recipeYield * optimalServings * 100) / 100,
      ingredients: recipe.ingredientLines || [],
      edamamRecipeId: recipe.uri,
      totalNutrients: recipe.totalNutrients ? this.nutritionService.standardizeNutrientKeys(
        Object.fromEntries(
          Object.entries(recipe.totalNutrients).map(([key, nutrientData]: [string, any]) => [
            key,
            {
              label: nutrientData.label || key,
              quantity: (nutrientData.quantity || 0) / recipeYield * optimalServings,
              unit: nutrientData.unit || ''
            }
          ])
        )
      ) : {}
    };
  }

  /**
   * Calculate optimal servings for a recipe based on target calories
   */
  calculateOptimalServings(recipe: EdamamRecipe, targets: any): number {
    const recipeYield = recipe.yield || 1;
    const recipeCalories = recipe.calories || 1;
    const caloriesPerServing = recipeCalories / recipeYield;
    const targetCalories = targets.targetCalories || 500;
    
    // Calculate how many servings needed to meet target calories
    const optimalServings = targetCalories / caloriesPerServing;
    
    // Round to reasonable serving sizes (0.25, 0.5, 0.75, 1, 1.25, etc.)
    const roundedServings = Math.round(optimalServings * 4) / 4;
    
    // Ensure minimum 0.25 serving and maximum 3 servings
    return Math.max(0.25, Math.min(3, roundedServings));
  }

  /**
   * Create a placeholder meal when no recipe is found
   */
  createPlaceholderMeal(mealInfo: any): GeneratedMeal {
    const targetCalories = mealInfo.targetCalories || 500;
    
    return {
      mealType: mealInfo.mealType || 'meal',
      mealOrder: mealInfo.mealOrder,
      recipeName: `${mealInfo.mealType || 'Meal'} Recipe - To be selected`,
      recipeUrl: '',
      recipeImageUrl: '',
      caloriesPerServing: targetCalories,
      proteinGrams: Math.round(targetCalories * 0.15 / 4), // ~15% protein
      carbsGrams: Math.round(targetCalories * 0.50 / 4), // ~50% carbs
      fatGrams: Math.round(targetCalories * 0.35 / 9), // ~35% fat
      fiberGrams: Math.round(targetCalories / 100), // ~1g per 100 cal
      servingsPerMeal: 1,
      totalCalories: targetCalories,
      totalProtein: Math.round(targetCalories * 0.15 / 4),
      totalCarbs: Math.round(targetCalories * 0.50 / 4),
      totalFat: Math.round(targetCalories * 0.35 / 9),
      totalFiber: Math.round(targetCalories / 100),
      ingredients: ['Recipe selection pending'],
      edamamRecipeId: '',
      totalNutrients: {}
    };
  }

  /**
   * Create fallback meals when meal generation fails
   */
  createFallbackMeals(mealDistribution: Record<string, any>): GeneratedMeal[] {
    console.log('⚠️ Creating fallback meals for distribution:', Object.keys(mealDistribution));
    
    return Object.entries(mealDistribution).map(([mealKey, mealInfo]) => {
      console.log(`⚠️ Creating fallback meal for: ${mealKey}`);
      return this.createPlaceholderMeal(mealInfo);
    });
  }
}
