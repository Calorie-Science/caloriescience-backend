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
        mealTime: meal.mealTime,
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
      const sectionCalories = meal.targetCalories || 0;
      sections[sectionName] = {
        accept: {
          all: [
            {
              meal: [edamamMealType]
            }
          ]
        },
        fit: {
          ENERC_KCAL: {
            min: Math.round(sectionCalories * 0.7), // Allow 30% flexibility
            max: Math.round(sectionCalories * 1.3)  // Allow 30% flexibility
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
            min: Math.round(totalCalories * 0.8), // Allow 20% flexibility for daily total
            max: Math.round(totalCalories * 1.2)  // Allow 20% flexibility for daily total
          },
          PROCNT: {
            min: clientGoal.proteinGoalMin, // Use actual min from client goals
            max: clientGoal.proteinGoalMax  // Use actual max from client goals
          },
          FAT: {
            min: clientGoal.fatGoalMin, // Use actual min from client goals
            max: clientGoal.fatGoalMax  // Use actual max from client goals
          },
          CHOCDF: {
            min: clientGoal.carbsGoalMin, // Use actual min from client goals
            max: clientGoal.carbsGoalMax  // Use actual max from client goals
          }
        }
      }
    };

    // Only add very basic constraints to see if we can get all meals working
    if (dietaryRestrictions && dietaryRestrictions.length > 0 || cuisinePreferences && cuisinePreferences.length > 0) {
      request.plan.accept = { all: [] };
      
      // Add dietary restrictions
      if (dietaryRestrictions && dietaryRestrictions.length > 0) {
        dietaryRestrictions.forEach(restriction => {
          request.plan.accept.all.push({
            health: [restriction.toUpperCase()]
          });
        });
      }
      
      // Add cuisine preferences
      if (cuisinePreferences && cuisinePreferences.length > 0) {
        cuisinePreferences.forEach(cuisine => {
          request.plan.accept.all.push({
            cuisine: [cuisine]
          });
        });
      }
    }

    console.log('🎯 Meal Program Mapping Service - Final Edamam request (WITH RANGE CONSTRAINTS):', JSON.stringify(request, null, 2));
    console.log('🎯 Meal Program Mapping Service - Sections created:', Object.keys(sections));
    console.log('🎯 Meal Program Mapping Service - Total calories:', totalCalories);
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
    console.log('🎯 Meal Program Mapping Service - ===== MAPPING EDAMAM RESPONSE =====');
    console.log('🎯 Meal Program Mapping Service - Edamam response:', JSON.stringify(edamamResponse, null, 2));
    console.log('🎯 Meal Program Mapping Service - Meal distribution:', JSON.stringify(mealDistribution, null, 2));
    
    const mappedMeals: any[] = [];
    
    // Extract recipe assignments from Edamam response
    const recipeAssignments: { [mealType: string]: string } = {};
    
    if (edamamResponse.selection && edamamResponse.selection.length > 0) {
      // Use the first selection (first day's meal plan)
      const firstSelection = edamamResponse.selection[0];
      console.log('🎯 Meal Program Mapping Service - First selection sections:', Object.keys(firstSelection.sections));
      
      // Map Edamam sections to our meal types
      Object.entries(firstSelection.sections).forEach(([edamamSection, sectionData]: [string, any]) => {
        console.log(`🎯 Meal Program Mapping Service - Processing section: ${edamamSection}`, JSON.stringify(sectionData, null, 2));
        
        if (sectionData.assigned) {
          // Extract meal order from section name (e.g., "Meal_1" -> meal order 1)
          const mealOrderMatch = edamamSection.match(/Meal_(\d+)/);
          if (mealOrderMatch) {
            const mealOrder = parseInt(mealOrderMatch[1]);
            console.log(`🎯 Meal Program Mapping Service - Found meal order: ${mealOrder} for section: ${edamamSection}`);
            
            // Find the meal with this order
            Object.entries(mealDistribution).forEach(([mealKey, meal]) => {
              if (meal.mealOrder === mealOrder) {
                console.log(`🎯 Meal Program Mapping Service - Assigning recipe to meal: ${mealKey} (${meal.mealName})`);
                recipeAssignments[mealKey] = sectionData.assigned;
              }
            });
          } else {
            console.log(`🎯 Meal Program Mapping Service - Could not extract meal order from section: ${edamamSection}`);
          }
        } else {
          console.log(`🎯 Meal Program Mapping Service - No recipe assigned to section: ${edamamSection}`);
        }
      });
      
      console.log('🎯 Meal Program Mapping Service - Final recipe assignments:', recipeAssignments);
    } else {
      console.log('🎯 Meal Program Mapping Service - No selection data in Edamam response');
    }
    
    // Map meals with recipe assignments
    Object.entries(mealDistribution).forEach(([mealKey, meal]) => {
      const recipeUri = recipeAssignments[mealKey];
      console.log(`🎯 Meal Program Mapping Service - Mapping meal: ${mealKey} (${meal.mealName}) - Recipe URI: ${recipeUri || 'NONE'}`);
      
      mappedMeals.push({
        mealKey,
        mealName: meal.mealName,
        mealTime: meal.mealTime,
        targetCalories: meal.targetCalories,
        edamamMealType: meal.edamamMealType,
        recipe: recipeUri ? {
          uri: recipeUri,
          recipeId: recipeUri.split('#recipe_')[1],
          _links: {
            self: {
              href: `https://api.edamam.com/api/recipes/v2/${recipeUri.split('#recipe_')[1]}`,
              title: "Recipe details"
            }
          },
          details: null, // Will be populated by meal planning service
          error: null,
          // Add per-serving nutrition summary
          nutritionSummary: null // Will be populated after recipe details are fetched
        } : null
      });
    });
    
    console.log('🎯 Meal Program Mapping Service - Final mapped meals:', JSON.stringify(mappedMeals, null, 2));
    console.log('🎯 Meal Program Mapping Service - ===== END MAPPING =====');
    
    return {
      meals: mappedMeals,
      // Keep old totals for backward compatibility
      totalCalories: Object.values(mealDistribution).reduce((sum, meal) => sum + meal.calories, 0),
      totalProtein: Object.values(mealDistribution).reduce((sum, meal) => sum + meal.protein, 0),
      totalCarbs: Object.values(mealDistribution).reduce((sum, meal) => sum + meal.carbs, 0),
      totalFat: Object.values(mealDistribution).reduce((sum, meal) => sum + meal.fat, 0),
      edamamResponse: edamamResponse // Include full response for debugging
    };
  }
}


