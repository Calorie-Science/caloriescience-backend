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
   * Get a complete nutrition object with all vitamins and minerals initialized to 0
   * This ensures consistent API responses with exhaustive nutrient lists
   */
  private static getCompleteNutritionTemplate(): StandardizedNutrition {
    return {
      calories: { quantity: 0, unit: 'kcal' },
      macros: {
        protein: { quantity: 0, unit: 'g' },
        carbs: { quantity: 0, unit: 'g' },
        fat: { quantity: 0, unit: 'g' },
        fiber: { quantity: 0, unit: 'g' },
        sugar: { quantity: 0, unit: 'g' },
        sodium: { quantity: 0, unit: 'mg' },
        cholesterol: { quantity: 0, unit: 'mg' },
        saturatedFat: { quantity: 0, unit: 'g' },
        transFat: { quantity: 0, unit: 'g' },
        monounsaturatedFat: { quantity: 0, unit: 'g' },
        polyunsaturatedFat: { quantity: 0, unit: 'g' }
      },
      micros: {
        vitamins: {
          vitaminA: { quantity: 0, unit: 'IU' },
          vitaminC: { quantity: 0, unit: 'mg' },
          vitaminD: { quantity: 0, unit: 'µg' },
          vitaminE: { quantity: 0, unit: 'mg' },
          vitaminK: { quantity: 0, unit: 'µg' },
          thiamin: { quantity: 0, unit: 'mg' },
          riboflavin: { quantity: 0, unit: 'mg' },
          niacin: { quantity: 0, unit: 'mg' },
          vitaminB6: { quantity: 0, unit: 'mg' },
          folate: { quantity: 0, unit: 'µg' },
          vitaminB12: { quantity: 0, unit: 'µg' },
          biotin: { quantity: 0, unit: 'µg' },
          pantothenicAcid: { quantity: 0, unit: 'mg' }
        },
        minerals: {
          calcium: { quantity: 0, unit: 'mg' },
          iron: { quantity: 0, unit: 'mg' },
          magnesium: { quantity: 0, unit: 'mg' },
          phosphorus: { quantity: 0, unit: 'mg' },
          potassium: { quantity: 0, unit: 'mg' },
          zinc: { quantity: 0, unit: 'mg' },
          copper: { quantity: 0, unit: 'mg' },
          manganese: { quantity: 0, unit: 'mg' },
          selenium: { quantity: 0, unit: 'µg' },
          iodine: { quantity: 0, unit: 'µg' },
          chromium: { quantity: 0, unit: 'µg' },
          molybdenum: { quantity: 0, unit: 'µg' }
        }
      }
    };
  }

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
  static transformEdamamNutrition(edamamData: any, servings?: number): StandardizedNutrition {
    // Start with complete template with all nutrients initialized to 0
    const nutrition: StandardizedNutrition = this.getCompleteNutritionTemplate();

    if (!edamamData) {
      return nutrition;
    }

    // Determine which format we're dealing with
    let totalNutrients: any = null;
    let recipeServings: number = servings || 1;
    
    // Format 1: Recipe format with totalNutrients
    if (edamamData.totalNutrients) {
      totalNutrients = edamamData.totalNutrients;
      // Get servings from recipe if not provided
      if (!servings && edamamData.yield) {
        recipeServings = edamamData.yield;
      }
      console.log(`📊 Using recipe format (totalNutrients), servings: ${recipeServings}`);
    }
    // Format 2: Ingredient format with nested structure
    else if (edamamData.ingredients && edamamData.ingredients[0]?.parsed && edamamData.ingredients[0].parsed[0]?.nutrients) {
      totalNutrients = edamamData.ingredients[0].parsed[0].nutrients;
      // For ingredient format, servings is always 1 (it's already per the specified amount)
      recipeServings = 1;
      console.log('📊 Using ingredient format (ingredients[0].parsed[0].nutrients), already per-serving');
    }
    
    if (!totalNutrients) {
      console.warn('⚠️ No nutrition data found in Edamam response');
      return nutrition;
    }

    // Map all nutrients and divide by servings to get PER-SERVING values
    // Edamam returns TOTAL nutrition for the whole recipe, so we need to divide
    for (const [edamamKey, mapping] of Object.entries(this.EDAMAM_NUTRIENT_MAP)) {
      if (totalNutrients[edamamKey]) {
        // Divide by servings to get per-serving value (for recipe format)
        const totalValue = totalNutrients[edamamKey].quantity;
        const perServingValue = Math.round((totalValue / recipeServings) * 100) / 100;
        const unit = totalNutrients[edamamKey].unit || 'g';
        
        if (mapping.category === 'calories') {
          nutrition.calories = { quantity: perServingValue, unit: unit };
        } else if (mapping.category === 'macros') {
          nutrition.macros[mapping.key as keyof typeof nutrition.macros] = { quantity: perServingValue, unit: unit };
        } else if (mapping.category === 'vitamins') {
          nutrition.micros.vitamins[mapping.key as keyof typeof nutrition.micros.vitamins] = { quantity: perServingValue, unit: unit };
        } else if (mapping.category === 'minerals') {
          nutrition.micros.minerals[mapping.key as keyof typeof nutrition.micros.minerals] = { quantity: perServingValue, unit: unit };
        }
      }
    }

    console.log(`✅ Transformed nutrition (per serving): ${nutrition.calories.quantity} kcal, ${Object.keys(nutrition.micros.vitamins).length} vitamins, ${Object.keys(nutrition.micros.minerals).length} minerals`);

    return nutrition;
  }

  /**
   * Transform Spoonacular nutrition data to standardized format
   */
  static transformSpoonacularNutrition(spoonacularData: any): StandardizedNutrition {
    // Start with complete template with all nutrients initialized to 0
    const nutrition: StandardizedNutrition = this.getCompleteNutritionTemplate();

    if (!spoonacularData) {
      return nutrition;
    }

    // Check if data is already in standardized format (has macros/micros structure)
    if (spoonacularData.macros && spoonacularData.calories) {
      console.log('📊 Spoonacular nutrition is already in standardized format');
      return spoonacularData as StandardizedNutrition;
    }

    // Check if data has nutrients array (raw Spoonacular format)
    if (!spoonacularData.nutrients) {
      console.warn('⚠️ Spoonacular nutrition data has no nutrients array and is not in standardized format');
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

    console.log(`✅ Transformed Spoonacular nutrition: ${nutrition.calories.quantity} kcal`);

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
      // Return complete template with all nutrients at 0
      return this.getCompleteNutritionTemplate();
    }
    
    // If rawData.nutrition exists, use the full nutrient data
    if (ingredientData.rawData?.nutrition) {
      return this.transformSpoonacularNutrition(ingredientData.rawData.nutrition);
    }
    
    // Otherwise, fallback to the simplified format with complete template
    const nutrition = this.getCompleteNutritionTemplate();
    
    // Populate the basic macros we have
    nutrition.calories.quantity = ingredientData.calories || 0;
    if (nutrition.macros.protein) nutrition.macros.protein.quantity = ingredientData.protein || 0;
    if (nutrition.macros.carbs) nutrition.macros.carbs.quantity = ingredientData.carbs || 0;
    if (nutrition.macros.fat) nutrition.macros.fat.quantity = ingredientData.fat || 0;
    if (nutrition.macros.fiber) nutrition.macros.fiber.quantity = ingredientData.fiber || 0;
    
    return nutrition;
  }

  /**
   * Transform Bon Happetee nutrition data to standardized format
   * Handles the nutrients array from Bon Happetee API
   */
  static transformBonHappeteeNutrition(nutrientsArray: any[]): StandardizedNutrition {
    if (!nutrientsArray || !Array.isArray(nutrientsArray)) {
      return this.getCompleteNutritionTemplate();
    }

    const nutrition = this.getCompleteNutritionTemplate();

    // Nutrient tag mapping for Bon Happetee
    const nutrientMap: { [key: string]: { category: 'calories' | 'macros' | 'vitamins' | 'minerals', key: string, unit: string } } = {
      // Energy
      'ENERC_KCAL': { category: 'calories', key: 'calories', unit: 'kcal' },
      
      // Macros
      'PROCNT': { category: 'macros', key: 'protein', unit: 'g' },
      'CHOCDF': { category: 'macros', key: 'carbs', unit: 'g' },
      'FAT': { category: 'macros', key: 'fat', unit: 'g' },
      'FIBTG': { category: 'macros', key: 'fiber', unit: 'g' },
      'SUGAR': { category: 'macros', key: 'sugar', unit: 'g' },
      'NA': { category: 'macros', key: 'sodium', unit: 'mg' },
      'CHOLE': { category: 'macros', key: 'cholesterol', unit: 'mg' },
      'FASAT': { category: 'macros', key: 'saturatedFat', unit: 'g' },
      'FAMS': { category: 'macros', key: 'monounsaturatedFat', unit: 'g' },
      'FAPU': { category: 'macros', key: 'polyunsaturatedFat', unit: 'g' },
      'FATRN': { category: 'macros', key: 'transFat', unit: 'g' },
      
      // Vitamins
      'VITA_RAE': { category: 'vitamins', key: 'vitaminA', unit: 'µg' },
      'VITC': { category: 'vitamins', key: 'vitaminC', unit: 'mg' },
      'VITD': { category: 'vitamins', key: 'vitaminD', unit: 'µg' },
      'VITE': { category: 'vitamins', key: 'vitaminE', unit: 'mg' },
      'VITK1': { category: 'vitamins', key: 'vitaminK', unit: 'µg' },
      'THIA': { category: 'vitamins', key: 'thiamin', unit: 'mg' },
      'RIBF': { category: 'vitamins', key: 'riboflavin', unit: 'mg' },
      'NIA': { category: 'vitamins', key: 'niacin', unit: 'mg' },
      'PANTAC': { category: 'vitamins', key: 'pantothenicAcid', unit: 'mg' },
      'VITB6A': { category: 'vitamins', key: 'vitaminB6', unit: 'mg' },
      'VITB12': { category: 'vitamins', key: 'vitaminB12', unit: 'µg' },
      'FOL': { category: 'vitamins', key: 'folate', unit: 'µg' },
      'CHOLN': { category: 'vitamins', key: 'choline', unit: 'mg' },
      
      // Minerals
      'CA': { category: 'minerals', key: 'calcium', unit: 'mg' },
      'FE': { category: 'minerals', key: 'iron', unit: 'mg' },
      'MG': { category: 'minerals', key: 'magnesium', unit: 'mg' },
      'P': { category: 'minerals', key: 'phosphorus', unit: 'mg' },
      'K': { category: 'minerals', key: 'potassium', unit: 'mg' },
      'ZN': { category: 'minerals', key: 'zinc', unit: 'mg' },
      'CU': { category: 'minerals', key: 'copper', unit: 'mg' },
      'MN': { category: 'minerals', key: 'manganese', unit: 'mg' },
      'SE': { category: 'minerals', key: 'selenium', unit: 'µg' }
    };

    // Process each nutrient
    for (const nutrient of nutrientsArray) {
      const mapping = nutrientMap[nutrient.nutrient_tag_name];
      if (mapping && nutrient.measure !== null && nutrient.measure !== undefined) {
        const value = Math.round(nutrient.measure * 100) / 100;
        
        // Convert unit if needed (e.g., "micro g" → "µg", "ug" → "µg")
        let unit = mapping.unit;
        if (nutrient.unit_of_measure) {
          const unitStr = nutrient.unit_of_measure.toLowerCase();
          if (unitStr.includes('micro') || unitStr === 'ug') {
            unit = 'µg';
          } else if (unitStr === 'mg') {
            unit = 'mg';
          } else if (unitStr === 'g') {
            unit = 'g';
          }
        }
        
        if (mapping.category === 'calories') {
          nutrition.calories = { quantity: value, unit: unit };
        } else if (mapping.category === 'macros') {
          nutrition.macros[mapping.key] = { quantity: value, unit: unit };
        } else if (mapping.category === 'vitamins') {
          nutrition.micros.vitamins[mapping.key] = { quantity: value, unit: unit };
        } else if (mapping.category === 'minerals') {
          nutrition.micros.minerals[mapping.key] = { quantity: value, unit: unit };
        }
      }
    }

    return nutrition;
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
   * Divide nutrition by a factor (useful for converting from total servings to per-serving)
   * @param nutrition - The nutrition object to divide
   * @param divisor - The number to divide by (e.g., number of servings)
   */
  static divideNutrition(nutrition: StandardizedNutrition, divisor: number): StandardizedNutrition {
    console.log(`🔢 divideNutrition called: ${nutrition.calories?.quantity || 0} kcal ÷ ${divisor} servings`);
    
    if (divisor === 0) {
      console.warn('⚠️ Cannot divide by zero, returning original nutrition');
      return nutrition;
    }
    
    if (divisor === 1) {
      console.log('ℹ️ Divisor is 1, returning nutrition unchanged');
      return nutrition;
    }
    
    const result: StandardizedNutrition = {
      calories: {
        quantity: Math.round((nutrition.calories?.quantity || 0) / divisor * 100) / 100,
        unit: nutrition.calories?.unit || 'kcal'
      },
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };

    // Divide macros
    for (const [key, value] of Object.entries(nutrition.macros)) {
      result.macros[key as keyof typeof result.macros] = {
        quantity: Math.round((value?.quantity || 0) / divisor * 100) / 100,
        unit: value?.unit || 'g'
      };
    }

    // Divide vitamins
    for (const [key, value] of Object.entries(nutrition.micros.vitamins)) {
      result.micros.vitamins[key as keyof typeof result.micros.vitamins] = {
        quantity: Math.round((value?.quantity || 0) / divisor * 100) / 100,
        unit: value?.unit || 'mg'
      };
    }

    // Divide minerals
    for (const [key, value] of Object.entries(nutrition.micros.minerals)) {
      result.micros.minerals[key as keyof typeof result.micros.minerals] = {
        quantity: Math.round((value?.quantity || 0) / divisor * 100) / 100,
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


