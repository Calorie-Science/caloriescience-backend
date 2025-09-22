import { MealProgram, MealProgramMeal } from '../types/mealPrograms';
import { ClientGoal } from '../types/clientGoals';

// Edamam meal type mapping
export const EDAHAM_MEAL_TYPES = {
  'breakfast': 'breakfast',
  'lunch': 'lunch/dinner',
  'dinner': 'lunch/dinner',
  'snack': 'snack',
  'brunch': 'brunch',
  'teatime': 'teatime'
} as const;

export type EdamamMealType = typeof EDAHAM_MEAL_TYPES[keyof typeof EDAHAM_MEAL_TYPES];

export interface MealDistribution {
  [mealType: string]: {
    mealOrder: number;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    mealName: string;
    mealTime: string;
    edamamMealType: EdamamMealType;
    targetCalories?: number;
  };
}

export interface MealPlanRequest {
  clientId: string;
  planDate: string;
  dietaryRestrictions: string[];
  cuisinePreferences: string[];
  macroTargets?: {
    protein?: { min: number; max: number };
    fat?: { min: number; max: number };
    carbs?: { min: number; max: number };
  };
}

export class MealProgramMappingService {
  
  /**
   * Normalize time format to HH:MM (remove seconds if present)
   */
  private normalizeTimeFormat(timeString: string): string {
    // If time is in HH:MM:SS format, convert to HH:MM
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    return timeString;
  }

  /**
   * Map custom meal names to Edamam meal types
   */
  mapMealNameToEdamamType(mealName: string): EdamamMealType {
    const lowerMealName = mealName.toLowerCase();
    
    // Direct matches
    if (lowerMealName.includes('breakfast')) return 'breakfast';
    if (lowerMealName.includes('lunch')) return 'lunch/dinner';
    if (lowerMealName.includes('dinner')) return 'lunch/dinner';
    if (lowerMealName.includes('snack')) return 'snack';
    if (lowerMealName.includes('brunch')) return 'brunch';
    if (lowerMealName.includes('tea')) return 'teatime';
    
    // Time-based mapping (if meal time is available)
    // This could be enhanced with actual meal time logic
    
    // Default to snack for unknown meal types
    return 'snack';
  }

  /**
   * Calculate meal distribution based on client goals and meal program
   */
  calculateMealDistribution(
    clientGoal: ClientGoal,
    mealProgram: MealProgram
  ): MealDistribution {
    const distribution: MealDistribution = {};
    
    // Calculate total daily targets from client goal (use mid-point of ranges)
    const dailyCalories = clientGoal.eerGoalCalories;
    const dailyProtein = Math.round((clientGoal.proteinGoalMin + clientGoal.proteinGoalMax) / 2);
    const dailyCarbs = Math.round((clientGoal.carbsGoalMin + clientGoal.carbsGoalMax) / 2);
    const dailyFat = Math.round((clientGoal.fatGoalMin + clientGoal.fatGoalMax) / 2);
    
    mealProgram.meals.forEach(meal => {
      const mealKey = `meal_${meal.mealOrder}`;
      const edamamMealType = this.mapMealNameToEdamamType(meal.mealName);
      
      // Use target calories from meal program, or calculate proportional if not set
      let mealCalories: number;
      if (meal.targetCalories) {
        mealCalories = meal.targetCalories;
      } else {
        // Fallback: distribute calories evenly across meals
        mealCalories = Math.round(dailyCalories / mealProgram.meals.length);
      }
      
      // Calculate macros proportionally based on calorie ratio
      const calorieRatio = mealCalories / dailyCalories;
      const mealProtein = Math.round(dailyProtein * calorieRatio);
      const mealCarbs = Math.round(dailyCarbs * calorieRatio);
      const mealFat = Math.round(dailyFat * calorieRatio);
      
      distribution[mealKey] = {
        mealOrder: meal.mealOrder,
        calories: mealCalories,
        protein: mealProtein,
        carbs: mealCarbs,
        fat: mealFat,
        mealName: meal.mealName,
        mealTime: this.normalizeTimeFormat(meal.mealTime),
        edamamMealType,
        targetCalories: meal.targetCalories || mealCalories
      };
    });
    
    return distribution;
  }

  /**
   * Create Edamam meal plan request with proper meal type mapping
   */
  createEdamamMealPlanRequest(
    mealDistribution: MealDistribution,
    dietaryRestrictions: string[],
    cuisinePreferences: string[],
    clientGoal: ClientGoal,
    uiOverrideMeals?: any[] // Allow UI to override meal calories
  ): any {
    console.log('🎯 Meal Program Mapping Service - Creating Edamam request...');
    console.log('🎯 Meal Program Mapping Service - Meal distribution:', JSON.stringify(mealDistribution, null, 2));
    console.log('🎯 Meal Program Mapping Service - Dietary restrictions:', dietaryRestrictions);
    console.log('🎯 Meal Program Mapping Service - Cuisine preferences:', cuisinePreferences);
    console.log('🎯 Meal Program Mapping Service - Client goal:', JSON.stringify(clientGoal, null, 2));
    console.log('🎯 Meal Program Mapping Service - UI override meals:', uiOverrideMeals);

    // Create sections based on meal distribution
    const sections: any = {};
    let totalCalories = 0;
    
    Object.entries(mealDistribution).forEach(([mealKey, meal]) => {
      // Use UI override calories if provided, otherwise use meal target calories
      const mealCalories = uiOverrideMeals?.find(override => override.mealKey === mealKey)?.calories || meal.targetCalories || meal.calories;
      console.log(`🎯 CRITICAL DEBUG - Meal ${mealKey}: ${mealCalories} calories`);
      totalCalories += mealCalories;
      
      // Create unique section names for each meal (Edamam needs separate sections)
      const sectionName = `Meal_${meal.mealOrder}`; // Unique section name for each meal
      let edamamMealType: string;
      
      switch (meal.edamamMealType) {
        case 'breakfast':
          edamamMealType = 'breakfast';
          break;
        case 'lunch/dinner':
          edamamMealType = 'lunch/dinner';
          break;
        case 'snack':
          edamamMealType = 'snack';
          break;
        default:
          edamamMealType = 'snack';
      }
      
      // Set meal type constraint and calorie range at section level
      const sectionCalories = mealCalories || 0;
      const sectionConstraints: any[] = [
        {
          meal: [edamamMealType]
        }
      ];
      
      // Cuisine preferences are now handled at plan level, not section level
      
      sections[sectionName] = {
        accept: {
          all: sectionConstraints
        },
        fit: {
          ENERC_KCAL: {
            min: Math.round(sectionCalories * 0.9), // Allow 10% flexibility down
            max: Math.round(sectionCalories * 1.1)  // Allow 10% flexibility up
          }
        }
      };
    });

    // Create request with calorie constraints at section level and macro constraints at plan level
    const request: any = {
      size: 1,
      plan: {
        sections,
        fit: {
          ENERC_KCAL: {
            min: Math.round(totalCalories * 0.8), // Use totalCalories (sum of individual meals)
            max: Math.round(totalCalories * 1.2)  // Use totalCalories (sum of individual meals)
          },
          // Apply proportional macro constraints based on total calories vs client's daily goal
          // Calculate the proportion this meal represents of the daily calorie goal
          PROCNT: (() => {
            const proportion = totalCalories / (clientGoal.eerGoalCalories || 2000);
            const minProtein = Math.round((clientGoal.proteinGoalMin || 0) * proportion * 0.5); // 50% flexibility
            const maxProtein = Math.round((clientGoal.proteinGoalMax || 200) * proportion * 1.5); // 150% flexibility
            return { min: Math.max(5, minProtein), max: maxProtein };
          })(),
          CHOCDF: (() => {
            const proportion = totalCalories / (clientGoal.eerGoalCalories || 2000);
            const minCarbs = Math.round((clientGoal.carbsGoalMin || 0) * proportion * 0.5);
            const maxCarbs = Math.round((clientGoal.carbsGoalMax || 300) * proportion * 1.5);
            return { min: Math.max(10, minCarbs), max: maxCarbs };
          })(),
          FAT: (() => {
            const proportion = totalCalories / (clientGoal.eerGoalCalories || 2000);
            const minFat = Math.round((clientGoal.fatGoalMin || 0) * proportion * 0.5);
            const maxFat = Math.round((clientGoal.fatGoalMax || 100) * proportion * 1.5);
            return { min: Math.max(3, minFat), max: maxFat };
          })(),
          // Add fiber constraint if available
          ...(clientGoal.fiberGoalGrams && {
            FIBTG: {
              min: Math.round((clientGoal.fiberGoalGrams || 0) * 0.8),
              max: Math.round((clientGoal.fiberGoalGrams || 0) * 1.2)
            }
          })
        }
      }
    };

    // Add health labels and cuisine preferences at plan level as separate objects
    const planConstraints = [];
    
    if (dietaryRestrictions && dietaryRestrictions.length > 0) {
      planConstraints.push({
        health: dietaryRestrictions // Keep original format: lowercase with hyphens
      });
    }
    
    if (cuisinePreferences && cuisinePreferences.length > 0) {
      planConstraints.push({
        cuisine: cuisinePreferences
      });
    }
    
    if (planConstraints.length > 0) {
      request.plan.accept = {
        all: planConstraints
      };
    }

    console.log('🎯 Meal Program Mapping Service - Final Edamam request (WITH RANGE CONSTRAINTS):', JSON.stringify(request, null, 2));
    console.log('🎯 Meal Program Mapping Service - Sections created:', Object.keys(sections));
    console.log('🎯 CRITICAL DEBUG - Total calories calculated:', totalCalories);
    console.log('🎯 CRITICAL DEBUG - Individual meal calories sum check:', Object.values(mealDistribution).reduce((sum, meal) => {
      const mealCalories = uiOverrideMeals?.find(override => override.mealKey === `meal_${meal.mealOrder}`)?.calories || meal.targetCalories || meal.calories;
      return sum + mealCalories;
    }, 0));
    console.log('🎯 Meal Program Mapping Service - Macro ranges sent to Edamam:');
    console.log('🎯   - Protein:', clientGoal.proteinGoalMin, '-', clientGoal.proteinGoalMax, 'g');
    console.log('🎯   - Carbs:', clientGoal.carbsGoalMin, '-', clientGoal.carbsGoalMax, 'g');
    console.log('🎯   - Fat:', clientGoal.fatGoalMin, '-', clientGoal.fatGoalMax, 'g');
    return request;
  }



  /**
   * Map Edamam response back to client's meal program structure
   */
  mapEdamamResponseToMealProgram(
    edamamResponse: any,
    mealDistribution: MealDistribution
  ): any {
    console.log('🎯 Meal Program Mapping Service - ===== START MAPPING =====');
    console.log('🎯 Meal Program Mapping Service - Edamam response:', JSON.stringify(edamamResponse, null, 2));
    console.log('🎯 Meal Program Mapping Service - Meal distribution:', JSON.stringify(mealDistribution, null, 2));
    console.log('🎯 Meal Program Mapping Service - ===== MAPPING EDAMAM RESPONSE =====');
    console.log('🎯 CRITICAL DEBUG - Edamam response keys:', Object.keys(edamamResponse || {}));
    console.log('🎯 CRITICAL DEBUG - Has selection:', !!edamamResponse?.selection);
    console.log('🎯 CRITICAL DEBUG - Selection length:', edamamResponse?.selection?.length || 0);
    console.log('🎯 CRITICAL DEBUG - Has plan:', !!edamamResponse?.plan);
    console.log('🎯 Meal Program Mapping Service - Edamam response:', JSON.stringify(edamamResponse, null, 2));
    console.log('🎯 Meal Program Mapping Service - Meal distribution:', JSON.stringify(mealDistribution, null, 2));
    
    const mappedMeals: any[] = [];
    
    // Extract recipe assignments and nutrition data from Edamam response
    const recipeAssignments: { [mealType: string]: string } = {};
    const nutritionData: { [mealType: string]: any } = {};
    
    if (!edamamResponse || !edamamResponse.selection || !Array.isArray(edamamResponse.selection) || edamamResponse.selection.length === 0) {
      console.error('❌ Meal Program Mapping Service - Invalid Edamam response structure:', edamamResponse);
      console.error('❌ Meal Program Mapping Service - Expected selection array, got:', typeof edamamResponse?.selection);
      return { meals: [] };
    }
    
    if (edamamResponse.selection && edamamResponse.selection.length > 0) {
      // Use the first selection (first day's meal plan)
      const firstSelection = edamamResponse.selection[0];
      console.log('🎯 Meal Program Mapping Service - First selection:', JSON.stringify(firstSelection, null, 2));
      console.log('🎯 Meal Program Mapping Service - First selection sections:', Object.keys(firstSelection.sections));
      
      // Map Edamam sections to our meal types
      Object.entries(firstSelection.sections).forEach(([edamamSection, sectionData]: [string, any]) => {
        console.log(`🎯 Meal Program Mapping Service - Processing section: ${edamamSection}`, JSON.stringify(sectionData, null, 2));
        
        // Check for different possible response structures
        let recipeUri = sectionData.assigned || sectionData.recipe || sectionData.uri;
        
        if (recipeUri) {
          // Extract meal order from section name (e.g., "Meal_1" -> meal order 1)
          const mealOrderMatch = edamamSection.match(/Meal_(\d+)/);
          if (mealOrderMatch) {
            const mealOrder = parseInt(mealOrderMatch[1]);
            console.log(`🎯 Meal Program Mapping Service - Found meal order: ${mealOrder} for section: ${edamamSection}`);
            console.log(`🎯 Meal Program Mapping Service - Recipe URI: ${recipeUri}`);
            
            // Find the meal with this order
            Object.entries(mealDistribution).forEach(([mealKey, meal]) => {
              if (meal.mealOrder === mealOrder) {
                console.log(`🎯 Meal Program Mapping Service - Assigning recipe to meal: ${mealKey} (${meal.mealName})`);
                recipeAssignments[mealKey] = recipeUri;
              }
            });
          } else {
            console.log(`🎯 Meal Program Mapping Service - Could not extract meal order from section: ${edamamSection}`);
          }
        } else {
          console.log(`🎯 Meal Program Mapping Service - No recipe found in section: ${edamamSection}`);
          console.log(`🎯 Meal Program Mapping Service - Section data keys:`, Object.keys(sectionData));
        }
      });
      
      console.log('🎯 Meal Program Mapping Service - Final recipe assignments:', recipeAssignments);
    } else {
      console.log('🎯 Meal Program Mapping Service - No selection data in Edamam response');
    }
    
    // Extract nutrition data from plan section if available
    if (edamamResponse.plan) {
      console.log('🎯 Meal Program Mapping Service - Processing plan data for nutrition info');
      const planDates = Object.keys(edamamResponse.plan);
      if (planDates.length > 0) {
        const firstDate = planDates[0];
        const dayPlan = edamamResponse.plan[firstDate];
        console.log('🎯 Meal Program Mapping Service - Day plan sections:', Object.keys(dayPlan));
        
        // Extract nutrition data for each section
        Object.entries(dayPlan).forEach(([sectionName, sectionData]: [string, any]) => {
          const mealOrderMatch = sectionName.match(/Meal_(\d+)/);
          if (mealOrderMatch) {
            const mealOrder = parseInt(mealOrderMatch[1]);
            console.log(`🎯 Meal Program Mapping Service - Processing nutrition for section: ${sectionName} (meal order: ${mealOrder})`);
            
            // Find the meal with this order and store nutrition data
            Object.entries(mealDistribution).forEach(([mealKey, meal]) => {
              if (meal.mealOrder === mealOrder) {
                console.log(`🎯 Meal Program Mapping Service - Storing nutrition data for meal: ${mealKey} (${meal.mealName})`);
                nutritionData[mealKey] = sectionData;
              }
            });
          }
        });
      }
    }
    
    // Map meals with recipe assignments and nutrition data
    console.log('🎯 Meal Program Mapping Service - Available recipe assignments:', recipeAssignments);
    console.log('🎯 Meal Program Mapping Service - Available nutrition data:', Object.keys(nutritionData));
    console.log('🎯 Meal Program Mapping Service - Meal distribution keys:', Object.keys(mealDistribution));
    console.log('🎯 Meal Program Mapping Service - Meal distribution:', JSON.stringify(mealDistribution, null, 2));
    
    Object.entries(mealDistribution).forEach(([mealKey, meal]) => {
      const recipeUri = recipeAssignments[mealKey];
      const nutrition = nutritionData[mealKey];
      console.log(`🎯 Meal Program Mapping Service - Mapping meal: ${mealKey} (${meal.mealName}) - Recipe URI: ${recipeUri || 'NONE'}`);
      console.log(`🎯 Meal Program Mapping Service - Nutrition data available: ${!!nutrition}`);
      console.log(`🎯 Meal Program Mapping Service - Meal order: ${meal.mealOrder}, Meal key: ${mealKey}`);
      
      // Calculate actual calories from Edamam response if available
      let actualCalories = meal.targetCalories; // Default to target calories
      if (nutrition) {
        // Extract calories from the first slot in the section
        const slots = Object.values(nutrition);
        if (slots.length > 0) {
          const firstSlot = slots[0] as any;
          if (firstSlot.calories) {
            actualCalories = firstSlot.calories; // Use exact calories without rounding
            console.log(`🎯 Meal Program Mapping Service - Using actual calories from Edamam: ${actualCalories} for ${meal.mealName}`);
          }
        }
      }
      
      const mappedMeal = {
        mealKey,
        mealName: meal.mealName,
        mealTime: meal.mealTime,
        targetCalories: actualCalories, // Use actual calories from Edamam response
        edamamMealType: meal.edamamMealType,
        recipe: recipeUri ? {
          uri: recipeUri,
          id: recipeUri.split('#recipe_')[1]
        } : null
      };
      
      console.log(`🎯 Meal Program Mapping Service - Final mapped meal:`, JSON.stringify(mappedMeal, null, 2));
      mappedMeals.push(mappedMeal);
    });
    
      console.log('🎯 Meal Program Mapping Service - Final mapped meals:', JSON.stringify(mappedMeals, null, 2));
      console.log('🎯 Meal Program Mapping Service - ===== END MAPPING =====');
      
      // Debug: Check if any meals have recipe URIs
      const mealsWithRecipes = mappedMeals.filter(meal => meal.recipe?.uri);
      console.log('🎯 Meal Program Mapping Service - Meals with recipe URIs:', mealsWithRecipes.length);
      console.log('🎯 Meal Program Mapping Service - Recipe URIs:', mealsWithRecipes.map(m => m.recipe.uri));
      
      console.log('🎯 Meal Program Mapping Service - Final mapped meals count:', mappedMeals.length);
      console.log('🎯 Meal Program Mapping Service - Final mapped meals:', JSON.stringify(mappedMeals, null, 2));
      
      return {
        meals: mappedMeals
      };
  }
}


