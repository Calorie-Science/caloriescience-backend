/**
 * Service for mapping and standardizing nutrition data from different providers
 * Handles both Edamam and Spoonacular formats and converts to unified structure
 */

export interface StandardizedNutrition {
  calories: { quantity: number; unit: string };
  macros: {
    protein?: { quantity: number; unit: string };
    carbs?: { quantity: number; unit: string };
    fat?: { quantity: number; unit: string };
    fiber?: { quantity: number; unit: string };
    sugar?: { quantity: number; unit: string };
    sodium?: { quantity: number; unit: string };
    cholesterol?: { quantity: number; unit: string };
    saturatedFat?: { quantity: number; unit: string };
    transFat?: { quantity: number; unit: string };
    monounsaturatedFat?: { quantity: number; unit: string };
    polyunsaturatedFat?: { quantity: number; unit: string };
  };
  micros: {
    vitamins: {
      vitaminA?: { quantity: number; unit: string };
      vitaminC?: { quantity: number; unit: string };
      vitaminD?: { quantity: number; unit: string };
      vitaminE?: { quantity: number; unit: string };
      vitaminK?: { quantity: number; unit: string };
      thiamin?: { quantity: number; unit: string };
      riboflavin?: { quantity: number; unit: string };
      niacin?: { quantity: number; unit: string };
      vitaminB6?: { quantity: number; unit: string };
      folate?: { quantity: number; unit: string };
      vitaminB12?: { quantity: number; unit: string };
      biotin?: { quantity: number; unit: string };
      pantothenicAcid?: { quantity: number; unit: string };
    };
    minerals: {
      calcium?: { quantity: number; unit: string };
      iron?: { quantity: number; unit: string };
      magnesium?: { quantity: number; unit: string };
      phosphorus?: { quantity: number; unit: string };
      potassium?: { quantity: number; unit: string };
      zinc?: { quantity: number; unit: string };
      copper?: { quantity: number; unit: string };
      manganese?: { quantity: number; unit: string };
      selenium?: { quantity: number; unit: string };
      iodine?: { quantity: number; unit: string };
      chromium?: { quantity: number; unit: string };
      molybdenum?: { quantity: number; unit: string };
    };
  };
}

export class NutritionMappingService {
  /**
   * Edamam nutrient code to standard format mapping
   */
  private static readonly EDAMAM_NUTRIENT_MAP: { 
    [key: string]: { key: string; category: 'calories' | 'macros' | 'vitamins' | 'minerals' } 
  } = {
    // Calories
    'ENERC_KCAL': { key: 'calories', category: 'calories' },
    
    // Macros
    'PROCNT': { key: 'protein', category: 'macros' },
    'CHOCDF': { key: 'carbs', category: 'macros' },
    'FAT': { key: 'fat', category: 'macros' },
    'FIBTG': { key: 'fiber', category: 'macros' },
    'SUGAR': { key: 'sugar', category: 'macros' },
    'NA': { key: 'sodium', category: 'macros' },
    'CHOLE': { key: 'cholesterol', category: 'macros' },
    'FASAT': { key: 'saturatedFat', category: 'macros' },
    'FATRN': { key: 'transFat', category: 'macros' },
    'FAMS': { key: 'monounsaturatedFat', category: 'macros' },
    'FAPU': { key: 'polyunsaturatedFat', category: 'macros' },
    
    // Vitamins
    'VITA_RAE': { key: 'vitaminA', category: 'vitamins' },
    'VITC': { key: 'vitaminC', category: 'vitamins' },
    'VITD': { key: 'vitaminD', category: 'vitamins' },
    'TOCPHA': { key: 'vitaminE', category: 'vitamins' },
    'VITK1': { key: 'vitaminK', category: 'vitamins' },
    'THIA': { key: 'thiamin', category: 'vitamins' },
    'RIBF': { key: 'riboflavin', category: 'vitamins' },
    'NIA': { key: 'niacin', category: 'vitamins' },
    'VITB6A': { key: 'vitaminB6', category: 'vitamins' },
    'FOLDFE': { key: 'folate', category: 'vitamins' },
    'VITB12': { key: 'vitaminB12', category: 'vitamins' },
    'BIOT': { key: 'biotin', category: 'vitamins' },
    'PANTAC': { key: 'pantothenicAcid', category: 'vitamins' },
    
    // Minerals
    'CA': { key: 'calcium', category: 'minerals' },
    'FE': { key: 'iron', category: 'minerals' },
    'MG': { key: 'magnesium', category: 'minerals' },
    'P': { key: 'phosphorus', category: 'minerals' },
    'K': { key: 'potassium', category: 'minerals' },
    'ZN': { key: 'zinc', category: 'minerals' },
    'CU': { key: 'copper', category: 'minerals' },
    'MN': { key: 'manganese', category: 'minerals' },
    'SE': { key: 'selenium', category: 'minerals' },
    'ID': { key: 'iodine', category: 'minerals' },
    'CR': { key: 'chromium', category: 'minerals' },
    'MO': { key: 'molybdenum', category: 'minerals' }
  };

  /**
   * Spoonacular nutrient name to standard format mapping
   */
  private static readonly SPOONACULAR_NUTRIENT_MAP: { 
    [key: string]: { key: string; category: 'calories' | 'macros' | 'vitamins' | 'minerals' } 
  } = {
    // Calories
    'Calories': { key: 'calories', category: 'calories' },
    
    // Macros
    'Protein': { key: 'protein', category: 'macros' },
    'Carbohydrates': { key: 'carbs', category: 'macros' },
    'Fat': { key: 'fat', category: 'macros' },
    'Fiber': { key: 'fiber', category: 'macros' },
    'Sugar': { key: 'sugar', category: 'macros' },
    'Sodium': { key: 'sodium', category: 'macros' },
    'Cholesterol': { key: 'cholesterol', category: 'macros' },
    'Saturated Fat': { key: 'saturatedFat', category: 'macros' },
    'Trans Fat': { key: 'transFat', category: 'macros' },
    'Monounsaturated Fat': { key: 'monounsaturatedFat', category: 'macros' },
    'Polyunsaturated Fat': { key: 'polyunsaturatedFat', category: 'macros' },
    
    // Vitamins
    'Vitamin A': { key: 'vitaminA', category: 'vitamins' },
    'Vitamin C': { key: 'vitaminC', category: 'vitamins' },
    'Vitamin D': { key: 'vitaminD', category: 'vitamins' },
    'Vitamin E': { key: 'vitaminE', category: 'vitamins' },
    'Vitamin K': { key: 'vitaminK', category: 'vitamins' },
    'Thiamin': { key: 'thiamin', category: 'vitamins' },
    'Riboflavin': { key: 'riboflavin', category: 'vitamins' },
    'Niacin': { key: 'niacin', category: 'vitamins' },
    'Vitamin B6': { key: 'vitaminB6', category: 'vitamins' },
    'Folate': { key: 'folate', category: 'vitamins' },
    'Vitamin B12': { key: 'vitaminB12', category: 'vitamins' },
    'Biotin': { key: 'biotin', category: 'vitamins' },
    'Pantothenic Acid': { key: 'pantothenicAcid', category: 'vitamins' },
    
    // Minerals
    'Calcium': { key: 'calcium', category: 'minerals' },
    'Iron': { key: 'iron', category: 'minerals' },
    'Magnesium': { key: 'magnesium', category: 'minerals' },
    'Phosphorus': { key: 'phosphorus', category: 'minerals' },
    'Potassium': { key: 'potassium', category: 'minerals' },
    'Zinc': { key: 'zinc', category: 'minerals' },
    'Copper': { key: 'copper', category: 'minerals' },
    'Manganese': { key: 'manganese', category: 'minerals' },
    'Selenium': { key: 'selenium', category: 'minerals' },
    'Iodine': { key: 'iodine', category: 'minerals' },
    'Chromium': { key: 'chromium', category: 'minerals' },
    'Molybdenum': { key: 'molybdenum', category: 'minerals' }
  };

  /**
   * Transform Edamam nutrition data to standardized format
   * Handles BOTH recipe format (totalNutrients) and ingredient format (ingredients[0].parsed[0].nutrients)
   */
  static transformEdamamNutrition(edamamData: any): StandardizedNutrition {
    const nutrition: StandardizedNutrition = {
      calories: { quantity: 0, unit: 'kcal' },
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };

    if (!edamamData) {
      return nutrition;
    }

    // Determine which format we're dealing with
    let totalNutrients: any = null;
    
    // Format 1: Recipe format with totalNutrients
    if (edamamData.totalNutrients) {
      totalNutrients = edamamData.totalNutrients;
      console.log('📊 Using recipe format (totalNutrients)');
    }
    // Format 2: Ingredient format with nested structure
    else if (edamamData.ingredients && edamamData.ingredients[0]?.parsed && edamamData.ingredients[0].parsed[0]?.nutrients) {
      totalNutrients = edamamData.ingredients[0].parsed[0].nutrients;
      console.log('📊 Using ingredient format (ingredients[0].parsed[0].nutrients)');
    }
    
    if (!totalNutrients) {
      console.warn('⚠️ No nutrition data found in Edamam response');
      return nutrition;
    }

    // Map all nutrients
    for (const [edamamKey, mapping] of Object.entries(this.EDAMAM_NUTRIENT_MAP)) {
      if (totalNutrients[edamamKey]) {
        const value = Math.round(totalNutrients[edamamKey].quantity * 100) / 100;
        const unit = totalNutrients[edamamKey].unit || 'g';
        
        if (mapping.category === 'calories') {
          nutrition.calories = { quantity: value, unit: unit };
        } else if (mapping.category === 'macros') {
          nutrition.macros[mapping.key as keyof typeof nutrition.macros] = { quantity: value, unit: unit };
        } else if (mapping.category === 'vitamins') {
          nutrition.micros.vitamins[mapping.key as keyof typeof nutrition.micros.vitamins] = { quantity: value, unit: unit };
        } else if (mapping.category === 'minerals') {
          nutrition.micros.minerals[mapping.key as keyof typeof nutrition.micros.minerals] = { quantity: value, unit: unit };
        }
      }
    }

    console.log(`✅ Transformed nutrition: ${nutrition.calories.quantity} kcal, ${Object.keys(nutrition.micros.vitamins).length} vitamins, ${Object.keys(nutrition.micros.minerals).length} minerals`);

    return nutrition;
  }

  /**
   * Transform Spoonacular nutrition data to standardized format
   */
  static transformSpoonacularNutrition(spoonacularData: any): StandardizedNutrition {
    const nutrition: StandardizedNutrition = {
      calories: { quantity: 0, unit: 'kcal' },
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };

    if (!spoonacularData || !spoonacularData.nutrients) {
      return nutrition;
    }

    for (const nutrient of spoonacularData.nutrients) {
      const mapping = this.SPOONACULAR_NUTRIENT_MAP[nutrient.name];
      if (mapping) {
        const value = Math.round(nutrient.amount * 100) / 100;
        const unit = nutrient.unit || 'g';
        
        if (mapping.category === 'calories') {
          nutrition.calories = { quantity: value, unit: unit };
        } else if (mapping.category === 'macros') {
          nutrition.macros[mapping.key as keyof typeof nutrition.macros] = { quantity: value, unit: unit };
        } else if (mapping.category === 'vitamins') {
          nutrition.micros.vitamins[mapping.key as keyof typeof nutrition.micros.vitamins] = { quantity: value, unit: unit };
        } else if (mapping.category === 'minerals') {
          nutrition.micros.minerals[mapping.key as keyof typeof nutrition.micros.minerals] = { quantity: value, unit: unit };
        }
      }
    }

    return nutrition;
  }

  /**
   * Transform Spoonacular INGREDIENT nutrition data to standardized format
   * Handles the response from /recipes/parseIngredients endpoint
   */
  static transformSpoonacularIngredientNutrition(ingredientData: any): StandardizedNutrition {
    // The ingredient data from parseIngredients has this structure:
    // { calories, protein, carbs, fat, fiber, rawData: { nutrition: { nutrients: [...] } } }
    
    if (!ingredientData) {
      return {
        calories: { quantity: 0, unit: 'kcal' },
        macros: {},
        micros: { vitamins: {}, minerals: {} }
      };
    }
    
    // If rawData.nutrition exists, use the full nutrient data
    if (ingredientData.rawData?.nutrition) {
      return this.transformSpoonacularNutrition(ingredientData.rawData.nutrition);
    }
    
    // Otherwise, fallback to the simplified format
    return {
      calories: { quantity: ingredientData.calories || 0, unit: 'kcal' },
      macros: {
        protein: { quantity: ingredientData.protein || 0, unit: 'g' },
        carbs: { quantity: ingredientData.carbs || 0, unit: 'g' },
        fat: { quantity: ingredientData.fat || 0, unit: 'g' },
        fiber: { quantity: ingredientData.fiber || 0, unit: 'g' }
      },
      micros: {
        vitamins: {},
        minerals: {}
      }
    };
  }

  /**
   * Add two nutrition objects together
   */
  static addNutrition(base: StandardizedNutrition, toAdd: StandardizedNutrition): StandardizedNutrition {
    const result: StandardizedNutrition = {
      calories: {
        quantity: (base.calories?.quantity || 0) + (toAdd.calories?.quantity || 0),
        unit: base.calories?.unit || toAdd.calories?.unit || 'kcal'
      },
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };

    // Add macros
    const allMacroKeys = new Set([
      ...Object.keys(base.macros),
      ...Object.keys(toAdd.macros)
    ]);

    for (const key of allMacroKeys) {
      const baseValue = base.macros[key as keyof typeof base.macros];
      const addValue = toAdd.macros[key as keyof typeof toAdd.macros];
      
      result.macros[key as keyof typeof result.macros] = {
        quantity: (baseValue?.quantity || 0) + (addValue?.quantity || 0),
        unit: baseValue?.unit || addValue?.unit || 'g'
      };
    }

    // Add vitamins
    const allVitaminKeys = new Set([
      ...Object.keys(base.micros.vitamins),
      ...Object.keys(toAdd.micros.vitamins)
    ]);

    for (const key of allVitaminKeys) {
      const baseValue = base.micros.vitamins[key as keyof typeof base.micros.vitamins];
      const addValue = toAdd.micros.vitamins[key as keyof typeof toAdd.micros.vitamins];
      
      result.micros.vitamins[key as keyof typeof result.micros.vitamins] = {
        quantity: (baseValue?.quantity || 0) + (addValue?.quantity || 0),
        unit: baseValue?.unit || addValue?.unit || 'mg'
      };
    }

    // Add minerals
    const allMineralKeys = new Set([
      ...Object.keys(base.micros.minerals),
      ...Object.keys(toAdd.micros.minerals)
    ]);

    for (const key of allMineralKeys) {
      const baseValue = base.micros.minerals[key as keyof typeof base.micros.minerals];
      const addValue = toAdd.micros.minerals[key as keyof typeof toAdd.micros.minerals];
      
      result.micros.minerals[key as keyof typeof result.micros.minerals] = {
        quantity: (baseValue?.quantity || 0) + (addValue?.quantity || 0),
        unit: baseValue?.unit || addValue?.unit || 'mg'
      };
    }

    return result;
  }

  /**
   * Subtract one nutrition object from another
   */
  static subtractNutrition(base: StandardizedNutrition, toSubtract: StandardizedNutrition): StandardizedNutrition {
    const result: StandardizedNutrition = {
      calories: {
        quantity: Math.max(0, (base.calories?.quantity || 0) - (toSubtract.calories?.quantity || 0)),
        unit: base.calories?.unit || 'kcal'
      },
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };

    // Subtract macros
    const allMacroKeys = new Set([
      ...Object.keys(base.macros),
      ...Object.keys(toSubtract.macros)
    ]);

    for (const key of allMacroKeys) {
      const baseValue = base.macros[key as keyof typeof base.macros];
      const subtractValue = toSubtract.macros[key as keyof typeof toSubtract.macros];
      
      result.macros[key as keyof typeof result.macros] = {
        quantity: Math.max(0, (baseValue?.quantity || 0) - (subtractValue?.quantity || 0)),
        unit: baseValue?.unit || 'g'
      };
    }

    // Subtract vitamins
    const allVitaminKeys = new Set([
      ...Object.keys(base.micros.vitamins),
      ...Object.keys(toSubtract.micros.vitamins)
    ]);

    for (const key of allVitaminKeys) {
      const baseValue = base.micros.vitamins[key as keyof typeof base.micros.vitamins];
      const subtractValue = toSubtract.micros.vitamins[key as keyof typeof toSubtract.micros.vitamins];
      
      result.micros.vitamins[key as keyof typeof result.micros.vitamins] = {
        quantity: Math.max(0, (baseValue?.quantity || 0) - (subtractValue?.quantity || 0)),
        unit: baseValue?.unit || 'mg'
      };
    }

    // Subtract minerals
    const allMineralKeys = new Set([
      ...Object.keys(base.micros.minerals),
      ...Object.keys(toSubtract.micros.minerals)
    ]);

    for (const key of allMineralKeys) {
      const baseValue = base.micros.minerals[key as keyof typeof base.micros.minerals];
      const subtractValue = toSubtract.micros.minerals[key as keyof typeof toSubtract.micros.minerals];
      
      result.micros.minerals[key as keyof typeof result.micros.minerals] = {
        quantity: Math.max(0, (baseValue?.quantity || 0) - (subtractValue?.quantity || 0)),
        unit: baseValue?.unit || 'mg'
      };
    }

    return result;
  }

  /**
   * Multiply nutrition values by a factor
   */
  static multiplyNutrition(nutrition: StandardizedNutrition, factor: number): StandardizedNutrition {
    const result: StandardizedNutrition = {
      calories: {
        quantity: Math.round((nutrition.calories?.quantity || 0) * factor * 100) / 100,
        unit: nutrition.calories?.unit || 'kcal'
      },
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };

    // Multiply macros
    for (const [key, value] of Object.entries(nutrition.macros)) {
      result.macros[key as keyof typeof result.macros] = {
        quantity: Math.round((value?.quantity || 0) * factor * 100) / 100,
        unit: value?.unit || 'g'
      };
    }

    // Multiply vitamins
    for (const [key, value] of Object.entries(nutrition.micros.vitamins)) {
      result.micros.vitamins[key as keyof typeof result.micros.vitamins] = {
        quantity: Math.round((value?.quantity || 0) * factor * 100) / 100,
        unit: value?.unit || 'mg'
      };
    }

    // Multiply minerals
    for (const [key, value] of Object.entries(nutrition.micros.minerals)) {
      result.micros.minerals[key as keyof typeof result.micros.minerals] = {
        quantity: Math.round((value?.quantity || 0) * factor * 100) / 100,
        unit: value?.unit || 'mg'
      };
    }

    return result;
  }

  /**
   * Convert standardized nutrition to simplified format (for backward compatibility)
   */
  static toSimplifiedFormat(nutrition: StandardizedNutrition): any {
    return {
      calories: nutrition.calories?.quantity || 0,
      protein: nutrition.macros.protein?.quantity || 0,
      carbs: nutrition.macros.carbs?.quantity || 0,
      fat: nutrition.macros.fat?.quantity || 0,
      fiber: nutrition.macros.fiber?.quantity || 0,
      sugar: nutrition.macros.sugar?.quantity || 0,
      sodium: nutrition.macros.sodium?.quantity || 0
    };
  }

  /**
   * Convert simplified format to standardized format
   */
  static fromSimplifiedFormat(simplified: any): StandardizedNutrition {
    return {
      calories: { quantity: simplified.calories || 0, unit: 'kcal' },
      macros: {
        protein: { quantity: simplified.protein || 0, unit: 'g' },
        carbs: { quantity: simplified.carbs || 0, unit: 'g' },
        fat: { quantity: simplified.fat || 0, unit: 'g' },
        fiber: { quantity: simplified.fiber || 0, unit: 'g' },
        sugar: { quantity: simplified.sugar || 0, unit: 'g' },
        sodium: { quantity: simplified.sodium || 0, unit: 'mg' }
      },
      micros: {
        vitamins: {},
        minerals: {}
      }
    };
  }

  /**
   * Create an empty nutrition object
   */
  static createEmpty(): StandardizedNutrition {
    return {
      calories: { quantity: 0, unit: 'kcal' },
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };
  }
}


