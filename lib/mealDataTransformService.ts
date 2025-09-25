/**
 * Service for handling data transformations between different formats
 */
export class MealDataTransformService {

  /**
   * Convert ingredient text to include weight in grams
   */
  convertIngredientToGrams(text: string, weight: number): string {
    // Add weight in grams to the ingredient text for clarity
    const weightInGrams = Math.round(weight);
    return `${text} (${weightInGrams}g)`;
  }

  /**
   * Extract food name from ingredient text
   */
  extractFoodName(text: string): string {
    // Remove quantities, measurements, and common preparation words
    return text
      .replace(/^\d+(\.\d+)?\s*(cups?|tablespoons?|teaspoons?|tbsp|tsp|oz|ounces?|pounds?|lbs?|grams?|g|kg|liters?|l|ml)\s*/i, '')
      .replace(/\s*\([^)]*\)\s*/g, '') // Remove parenthetical content
      .replace(/,.*$/, '') // Remove everything after first comma
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Normalize ingredient text for consistency
   */
  normalizeIngredientText(text: string): string {
    return text
      .trim()
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/^\d+\s*x\s*/i, '') // Remove "2x" style prefixes
      .replace(/\s*,\s*chopped$/i, '') // Remove trailing preparation words
      .replace(/\s*,\s*diced$/i, '')
      .replace(/\s*,\s*sliced$/i, '');
  }

  /**
   * Extract quantity and measure from ingredient text
   */
  extractQuantityAndMeasure(text: string, weight?: number): { quantity: number; measure: string } {
    // Try to extract quantity and measure from text
    const match = text.match(/^(\d+(?:\.\d+)?)\s*(cups?|tablespoons?|teaspoons?|tbsp|tsp|oz|ounces?|pounds?|lbs?|grams?|g|kg|liters?|l|ml|pieces?|items?|whole)?/i);
    
    if (match) {
      return {
        quantity: parseFloat(match[1]),
        measure: match[2] || 'piece'
      };
    }

    // Fallback to weight-based calculation if available
    if (weight) {
      return {
        quantity: Math.round(weight),
        measure: 'g'
      };
    }

    // Default fallback
    return {
      quantity: 1,
      measure: 'piece'
    };
  }

  /**
   * Convert dietary restrictions to Edamam format
   */
  convertDietaryRestrictionsToEdamam(restrictions: string[]): string[] {
    const edamamHealthLabels: string[] = [];
    
    restrictions.forEach(restriction => {
      const lowerRestriction = restriction.toLowerCase();
      
      // Map common dietary restrictions to Edamam health labels
      if (lowerRestriction.includes('vegetarian')) {
        edamamHealthLabels.push('Vegetarian');
      }
      if (lowerRestriction.includes('vegan')) {
        edamamHealthLabels.push('Vegan');
      }
      if (lowerRestriction.includes('gluten') || lowerRestriction.includes('celiac')) {
        edamamHealthLabels.push('Gluten-Free');
      }
      if (lowerRestriction.includes('dairy') || lowerRestriction.includes('lactose')) {
        edamamHealthLabels.push('Dairy-Free');
      }
      if (lowerRestriction.includes('nut') || lowerRestriction.includes('peanut')) {
        edamamHealthLabels.push('Tree-Nut-Free');
        edamamHealthLabels.push('Peanut-Free');
      }
      if (lowerRestriction.includes('shellfish')) {
        edamamHealthLabels.push('Shellfish-Free');
      }
      if (lowerRestriction.includes('egg')) {
        edamamHealthLabels.push('Egg-Free');
      }
      if (lowerRestriction.includes('fish')) {
        edamamHealthLabels.push('Fish-Free');
      }
      if (lowerRestriction.includes('soy')) {
        edamamHealthLabels.push('Soy-Free');
      }
      if (lowerRestriction.includes('alcohol')) {
        edamamHealthLabels.push('Alcohol-Free');
      }
      if (lowerRestriction.includes('keto') || lowerRestriction.includes('ketogenic')) {
        edamamHealthLabels.push('Keto-Friendly');
      }
      if (lowerRestriction.includes('paleo')) {
        edamamHealthLabels.push('Paleo');
      }
      if (lowerRestriction.includes('low-carb') || lowerRestriction.includes('low carb')) {
        edamamHealthLabels.push('Low-Carb');
      }
      if (lowerRestriction.includes('low-fat') || lowerRestriction.includes('low fat')) {
        edamamHealthLabels.push('Low-Fat');
      }
      if (lowerRestriction.includes('low-sodium') || lowerRestriction.includes('low sodium')) {
        edamamHealthLabels.push('Low-Sodium');
      }
      if (lowerRestriction.includes('sugar-conscious') || lowerRestriction.includes('sugar conscious')) {
        edamamHealthLabels.push('Sugar-Conscious');
      }
    });
    
    // Remove duplicates
    return [...new Set(edamamHealthLabels)];
  }

  /**
   * Convert cuisine preferences to Edamam format
   */
  convertCuisinePreferencesToEdamam(cuisines: string[]): string[] {
    const edamamCuisines: string[] = [];
    
    cuisines.forEach(cuisine => {
      const lowerCuisine = cuisine.toLowerCase();
      
      // Map common cuisine types to Edamam format
      if (lowerCuisine.includes('american')) {
        edamamCuisines.push('American');
      }
      if (lowerCuisine.includes('asian')) {
        edamamCuisines.push('Asian');
      }
      if (lowerCuisine.includes('british')) {
        edamamCuisines.push('British');
      }
      if (lowerCuisine.includes('caribbean')) {
        edamamCuisines.push('Caribbean');
      }
      if (lowerCuisine.includes('central europe')) {
        edamamCuisines.push('Central Europe');
      }
      if (lowerCuisine.includes('chinese')) {
        edamamCuisines.push('Chinese');
      }
      if (lowerCuisine.includes('eastern europe')) {
        edamamCuisines.push('Eastern Europe');
      }
      if (lowerCuisine.includes('french')) {
        edamamCuisines.push('French');
      }
      if (lowerCuisine.includes('indian')) {
        edamamCuisines.push('Indian');
      }
      if (lowerCuisine.includes('italian')) {
        edamamCuisines.push('Italian');
      }
      if (lowerCuisine.includes('japanese')) {
        edamamCuisines.push('Japanese');
      }
      if (lowerCuisine.includes('kosher')) {
        edamamCuisines.push('Kosher');
      }
      if (lowerCuisine.includes('mediterranean')) {
        edamamCuisines.push('Mediterranean');
      }
      if (lowerCuisine.includes('mexican')) {
        edamamCuisines.push('Mexican');
      }
      if (lowerCuisine.includes('middle eastern')) {
        edamamCuisines.push('Middle Eastern');
      }
      if (lowerCuisine.includes('nordic')) {
        edamamCuisines.push('Nordic');
      }
      if (lowerCuisine.includes('south american')) {
        edamamCuisines.push('South American');
      }
      if (lowerCuisine.includes('south east asian')) {
        edamamCuisines.push('South East Asian');
      }
    });
    
    // Remove duplicates
    return [...new Set(edamamCuisines)];
  }

  /**
   * Get meal type in Edamam format
   */
  getMealTypeForEdamam(mealType: string): string {
    const lowerMealType = mealType.toLowerCase();
    
    if (lowerMealType.includes('breakfast')) {
      return 'Breakfast';
    }
    if (lowerMealType.includes('lunch')) {
      return 'Lunch';
    }
    if (lowerMealType.includes('dinner') || lowerMealType.includes('supper')) {
      return 'Dinner';
    }
    if (lowerMealType.includes('snack')) {
      return 'Snack';
    }
    if (lowerMealType.includes('teatime')) {
      return 'Teatime';
    }
    
    // Default to lunch for lunch/dinner combined types
    if (lowerMealType.includes('lunch/dinner')) {
      return 'Lunch';
    }
    
    return 'Lunch'; // Default fallback
  }

  /**
   * Get dish types for a meal type
   */
  getDishTypesForMeal(mealType: string): string[] {
    const lowerMealType = mealType.toLowerCase();
    
    if (lowerMealType.includes('breakfast')) {
      return ['Main course', 'Side dish', 'Bread', 'Cereals', 'Egg'];
    }
    if (lowerMealType.includes('lunch') || lowerMealType.includes('dinner')) {
      return ['Main course', 'Side dish', 'Soup', 'Salad'];
    }
    if (lowerMealType.includes('snack')) {
      return ['Snack', 'Finger food', 'Appetizer'];
    }
    
    return ['Main course']; // Default
  }

  /**
   * Get meal type from section name (for mapping responses)
   */
  getMealTypeFromSection(sectionName: string): string {
    const lowerSection = sectionName.toLowerCase();
    
    if (lowerSection.includes('breakfast')) {
      return 'breakfast';
    }
    if (lowerSection.includes('lunch')) {
      return 'lunch';
    }
    if (lowerSection.includes('dinner')) {
      return 'dinner';
    }
    if (lowerSection.includes('snack')) {
      return 'snack';
    }
    
    return 'lunch'; // Default fallback
  }

  /**
   * Convert meal plan data to meals array
   */
  convertMealPlanToMeals(mealPlanData: any, mealDistribution: any): any[] {
    console.log('🎯 Converting meal plan data to meals array');
    console.log('🎯 Meal plan data sections:', Object.keys(mealPlanData));
    
    const meals: any[] = [];
    
    // Process each section in the meal plan data
    Object.entries(mealPlanData).forEach(([sectionName, sectionData]: [string, any]) => {
      console.log(`🎯 Processing section: ${sectionName}`);
      
      if (sectionData && typeof sectionData === 'object') {
        Object.entries(sectionData).forEach(([slotName, slotData]: [string, any]) => {
          console.log(`🎯 Processing slot: ${slotName} in section: ${sectionName}`);
          
          if (slotData && slotData.recipe && slotData.recipe.uri) {
            const mealType = this.getMealTypeFromSection(sectionName);
            
            // Find corresponding meal in distribution for target calories
            const distributionMeal = Object.values(mealDistribution).find((meal: any) => {
              const mealKey = `${meal.mealName.toLowerCase().replace(/\s+/g, '_')}_${meal.mealOrder}`;
              return sectionName.toLowerCase().includes(meal.mealName.toLowerCase()) || 
                     mealKey.toLowerCase().includes(sectionName.toLowerCase());
            }) as any;
            
            const targetCalories = distributionMeal?.targetCalories || slotData.calories || 500;
            
            console.log(`🎯 Creating meal: ${slotData.recipe.label} (${mealType}) - ${targetCalories} cal`);
            
            meals.push({
              mealType,
              targetCalories,
              recipeName: slotData.recipe.label,
              recipeUrl: slotData.recipe.url,
              recipeImageUrl: slotData.recipe.image,
              recipe: slotData.recipe,
              calories: slotData.calories,
              edamamRecipeId: slotData.recipe.uri
            });
          }
        });
      }
    });
    
    console.log(`🎯 Converted ${meals.length} meals from meal plan data`);
    return meals;
  }
}
