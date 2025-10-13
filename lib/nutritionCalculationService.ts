import { supabase } from './supabase';
import { calculateEER, calculateMacros } from './calculations';

/**
 * Service for handling all nutrition calculations and transformations
 */
export class NutritionCalculationService {

  /**
   * Get complete list of all vitamins with default 0 values
   */
  private getCompleteVitamins(): { [key: string]: { label: string; quantity: number; unit: string } } {
    return {
      vitaminA: { label: 'Vitamin A', quantity: 0, unit: 'µg' },
      vitaminC: { label: 'Vitamin C', quantity: 0, unit: 'mg' },
      vitaminD: { label: 'Vitamin D', quantity: 0, unit: 'µg' },
      vitaminE: { label: 'Vitamin E', quantity: 0, unit: 'mg' },
      vitaminK: { label: 'Vitamin K', quantity: 0, unit: 'µg' },
      thiamin: { label: 'Thiamin (B1)', quantity: 0, unit: 'mg' },
      riboflavin: { label: 'Riboflavin (B2)', quantity: 0, unit: 'mg' },
      niacin: { label: 'Niacin (B3)', quantity: 0, unit: 'mg' },
      vitaminB6: { label: 'Vitamin B6', quantity: 0, unit: 'mg' },
      vitaminB12: { label: 'Vitamin B12', quantity: 0, unit: 'µg' },
      folate: { label: 'Folate', quantity: 0, unit: 'µg' },
      pantothenicAcid: { label: 'Pantothenic Acid (B5)', quantity: 0, unit: 'mg' },
      biotin: { label: 'Biotin', quantity: 0, unit: 'µg' }
    };
  }

  /**
   * Get complete list of all minerals with default 0 values
   */
  private getCompleteMinerals(): { [key: string]: { label: string; quantity: number; unit: string } } {
    return {
      calcium: { label: 'Calcium', quantity: 0, unit: 'mg' },
      iron: { label: 'Iron', quantity: 0, unit: 'mg' },
      magnesium: { label: 'Magnesium', quantity: 0, unit: 'mg' },
      phosphorus: { label: 'Phosphorus', quantity: 0, unit: 'mg' },
      potassium: { label: 'Potassium', quantity: 0, unit: 'mg' },
      sodium: { label: 'Sodium', quantity: 0, unit: 'mg' },
      zinc: { label: 'Zinc', quantity: 0, unit: 'mg' },
      copper: { label: 'Copper', quantity: 0, unit: 'mg' },
      selenium: { label: 'Selenium', quantity: 0, unit: 'µg' },
      iodine: { label: 'Iodine', quantity: 0, unit: 'µg' }
    };
  }

  /**
   * Calculate daily nutrition from meals with micronutrient categorization
   */
  calculateDailyNutrition(meals: any[]): any {
    const dailyNutrition = {
      totalCalories: 0,
      totalProtein: 0,
      totalCarbs: 0,
      totalFat: 0,
      totalFiber: 0,
      totalSodium: 0,
      totalSugar: 0,
      totalCholesterol: 0,
      totalCalcium: 0,
      totalIron: 0
    };

    // Initialize total micronutrients object
    const totalMicronutrients: { [key: string]: { label: string; quantity: number; unit: string } } = {};

    meals.forEach(meal => {
      // Add basic nutrients
      dailyNutrition.totalCalories += meal.totalCalories || 0;
      dailyNutrition.totalProtein += meal.protein || 0;
      dailyNutrition.totalCarbs += meal.carbs || 0;
      dailyNutrition.totalFat += meal.fat || 0;
      dailyNutrition.totalFiber += meal.fiber || 0;
      dailyNutrition.totalSodium += meal.sodium || 0;
      dailyNutrition.totalSugar += meal.sugar || 0;
      dailyNutrition.totalCholesterol += meal.cholesterol || 0;
      dailyNutrition.totalCalcium += meal.calcium || 0;
      dailyNutrition.totalIron += meal.iron || 0;

      // Add all micronutrients from meal.totalNutrients if available
      if (meal.totalNutrients) {
        Object.entries(meal.totalNutrients).forEach(([nutrientKey, nutrientData]: [string, any]) => {
          if (nutrientData && typeof nutrientData === 'object' && 'quantity' in nutrientData) {
            if (!totalMicronutrients[nutrientKey]) {
              totalMicronutrients[nutrientKey] = {
                label: nutrientData.label || nutrientKey,
                quantity: 0,
                unit: nutrientData.unit || ''
              };
            }
            totalMicronutrients[nutrientKey].quantity += nutrientData.quantity;
          }
        });
      }
    });

    // Round micronutrients
    Object.keys(totalMicronutrients).forEach(key => {
      totalMicronutrients[key].quantity = Math.round(totalMicronutrients[key].quantity * 100) / 100;
    });

    // Categorize nutrients into macros and micros
    const categorizedNutrients = this.categorizeNutrients(totalMicronutrients);

    return {
      totalCalories: Math.round(dailyNutrition.totalCalories * 100) / 100,
      totalProtein: Math.round(dailyNutrition.totalProtein * 100) / 100,
      totalCarbs: Math.round(dailyNutrition.totalCarbs * 100) / 100,
      totalFat: Math.round(dailyNutrition.totalFat * 100) / 100,
      totalFiber: Math.round(dailyNutrition.totalFiber * 100) / 100,
      totalSodium: Math.round(dailyNutrition.totalSodium * 100) / 100,
      totalSugar: Math.round(dailyNutrition.totalSugar * 100) / 100,
      totalCholesterol: Math.round(dailyNutrition.totalCholesterol * 100) / 100,
      totalCalcium: Math.round(dailyNutrition.totalCalcium * 100) / 100,
      totalIron: Math.round(dailyNutrition.totalIron * 100) / 100,
      macros: categorizedNutrients.macros,
      micros: categorizedNutrients.micros
    };
  }

  /**
   * Standardize individual nutrient keys from Edamam format to user-defined format
   */
  standardizeNutrientKeys(totalNutrients: { [key: string]: { label?: string; quantity: number; unit: string } }): { [key: string]: { label: string; quantity: number; unit: string } } {
    // Define Edamam to standardized key mappings for vitamins
    const vitaminMappings: { [key: string]: string } = {
      'VITA_RAE': 'vitaminA',
      'VITC': 'vitaminC',
      'VITD': 'vitaminD',
      'TOCPHA': 'vitaminE',
      'VITK1': 'vitaminK',
      'THIA': 'thiamin',
      'RIBF': 'riboflavin',
      'NIA': 'niacin',
      'VITB6A': 'vitaminB6',
      'VITB12': 'vitaminB12',
      'FOLDFE': 'folate', // Use folate as primary key
      'FOLFD': 'folate',  // Map to same key
      'FOLAC': 'folate',  // Map to same key
      'PANTAC': 'pantothenicAcid',
      'BIOTIN': 'biotin'
    };

    // Define Edamam to standardized key mappings for minerals
    const mineralMappings: { [key: string]: string } = {
      'CA': 'calcium',
      'FE': 'iron',
      'MG': 'magnesium',
      'P': 'phosphorus',
      'K': 'potassium',
      'NA': 'sodium',
      'ZN': 'zinc',
      'CU': 'copper',
      'SE': 'selenium',
      'ID': 'iodine'
    };

    // Create combined mapping
    const allMappings = { ...vitaminMappings, ...mineralMappings };
    const standardizedNutrients: { [key: string]: { label: string; quantity: number; unit: string } } = {};

    // First pass: map standardized keys and combine quantities for duplicates
    Object.entries(totalNutrients).forEach(([edamamKey, nutrientData]) => {
      const standardKey = allMappings[edamamKey] || edamamKey; // Use mapping or keep original key
      
      if (standardizedNutrients[standardKey]) {
        // Combine quantities if multiple Edamam keys map to same standard key (e.g., folate)
        standardizedNutrients[standardKey].quantity += nutrientData.quantity;
      } else {
        standardizedNutrients[standardKey] = { 
          ...nutrientData,
          label: nutrientData.label || edamamKey // Ensure label is always a string
        };
      }
    });

    // Round quantities
    Object.keys(standardizedNutrients).forEach(key => {
      standardizedNutrients[key].quantity = Math.round(standardizedNutrients[key].quantity * 100) / 100;
    });

    return standardizedNutrients;
  }

  /**
   * Categorize Edamam nutrients into macros and micros
   */
  private categorizeNutrients(totalNutrients: { [key: string]: { label: string; quantity: number; unit: string } }): any {
    const macros: { [key: string]: { label: string; quantity: number; unit: string } } = {};
    
    // Start with complete lists of all vitamins and minerals (with 0 defaults)
    const micros = {
      vitamins: this.getCompleteVitamins(),
      minerals: this.getCompleteMinerals()
    };

    // Define Edamam nutrient codes for categorization
    const macroKeys = [
      'ENERC_KCAL', // Energy/Calories
      'PROCNT',     // Protein
      'CHOCDF',     // Carbohydrates
      'CHOCDF.net', // Net carbs
      'FAT',        // Total Fat
      'FASAT',      // Saturated Fat
      'FAMS',       // Monounsaturated Fat
      'FAPU',       // Polyunsaturated Fat
      'FATRN',      // Trans Fat
      'FIBTG',      // Fiber
      'SUGAR',      // Sugars
      'SUGAR.added' // Added sugars
    ];
    
    // Also include standardized macro keys for already-transformed data
    const standardizedMacroKeys = [
      'calories', 'protein', 'carbs', 'netCarbs', 'fat', 
      'saturatedFat', 'monounsaturatedFat', 'polyunsaturatedFat', 
      'transFat', 'fiber', 'sugar', 'sugars', 'addedSugars', 'cholesterol', 'sodium'
    ];

    // Define Edamam to standardized key mappings for macronutrients
    const macroMappings: { [key: string]: string } = {
      'ENERC_KCAL': 'calories',
      'PROCNT': 'protein',
      'CHOCDF': 'carbs',
      'CHOCDF.net': 'netCarbs',
      'FAT': 'fat',
      'FASAT': 'saturatedFat',
      'FAMS': 'monounsaturatedFat',
      'FAPU': 'polyunsaturatedFat',
      'FATRN': 'transFat',
      'FIBTG': 'fiber',
      'SUGAR': 'sugars',
      'SUGAR.added': 'addedSugars'
    };

    // Define Edamam to standardized key mappings for vitamins
    const vitaminMappings: { [key: string]: string } = {
      'VITA_RAE': 'vitaminA',
      'VITC': 'vitaminC',
      'VITD': 'vitaminD',
      'TOCPHA': 'vitaminE',
      'VITK1': 'vitaminK',
      'THIA': 'thiamin',
      'RIBF': 'riboflavin',
      'NIA': 'niacin',
      'VITB6A': 'vitaminB6',
      'VITB12': 'vitaminB12',
      'FOLDFE': 'folate', // Use folate as primary key
      'FOLFD': 'folate',  // Map to same key
      'FOLAC': 'folate',  // Map to same key
      'PANTAC': 'pantothenicAcid',
      'BIOTIN': 'biotin'
    };

    // Define Edamam to standardized key mappings for minerals
    const mineralMappings: { [key: string]: string } = {
      'CA': 'calcium',
      'FE': 'iron',
      'MG': 'magnesium',
      'P': 'phosphorus',
      'K': 'potassium',
      'NA': 'sodium',
      'ZN': 'zinc',
      'CU': 'copper',
      'SE': 'selenium',
      'ID': 'iodine'
    };

    // Create reverse mappings to handle already standardized keys
    const reverseVitaminMappings: { [key: string]: string } = {};
    Object.entries(vitaminMappings).forEach(([edamam, standard]) => {
      reverseVitaminMappings[standard] = standard;
    });
    
    const reverseMineralMappings: { [key: string]: string } = {};
    Object.entries(mineralMappings).forEach(([edamam, standard]) => {
      reverseMineralMappings[standard] = standard;
    });

    // Categorize nutrients using mappings
    Object.entries(totalNutrients).forEach(([key, nutrientData]) => {
      if (macroKeys.includes(key) || standardizedMacroKeys.includes(key)) {
        // Map macro keys to standardized format (or use as-is if already standardized)
        const standardKey = macroMappings[key] || key;
        macros[standardKey] = nutrientData;
      } else if (vitaminMappings[key]) {
        // Handle Edamam vitamin keys
        const standardKey = vitaminMappings[key];
        // Since we start with complete list, we always have the key
        micros.vitamins[standardKey].quantity += nutrientData.quantity;
        // Preserve label and unit from actual data if available
        if (nutrientData.label) micros.vitamins[standardKey].label = nutrientData.label;
        if (nutrientData.unit) micros.vitamins[standardKey].unit = nutrientData.unit;
      } else if (reverseVitaminMappings[key]) {
        // Handle already standardized vitamin keys
        micros.vitamins[key].quantity += nutrientData.quantity;
        if (nutrientData.label) micros.vitamins[key].label = nutrientData.label;
        if (nutrientData.unit) micros.vitamins[key].unit = nutrientData.unit;
      } else if (mineralMappings[key]) {
        // Handle Edamam mineral keys
        const standardKey = mineralMappings[key];
        // Since we start with complete list, we always have the key
        micros.minerals[standardKey].quantity += nutrientData.quantity;
        // Preserve label and unit from actual data if available
        if (nutrientData.label) micros.minerals[standardKey].label = nutrientData.label;
        if (nutrientData.unit) micros.minerals[standardKey].unit = nutrientData.unit;
      } else if (reverseMineralMappings[key]) {
        // Handle already standardized mineral keys
        micros.minerals[key].quantity += nutrientData.quantity;
        if (nutrientData.label) micros.minerals[key].label = nutrientData.label;
        if (nutrientData.unit) micros.minerals[key].unit = nutrientData.unit;
      }
      // Note: Removed the fallback to avoid unmapped nutrients cluttering the response
    });

    // Round all quantities to 2 decimal places
    Object.keys(micros.vitamins).forEach(key => {
      micros.vitamins[key].quantity = Math.round(micros.vitamins[key].quantity * 100) / 100;
    });
    Object.keys(micros.minerals).forEach(key => {
      micros.minerals[key].quantity = Math.round(micros.minerals[key].quantity * 100) / 100;
    });

    return { macros, micros };
  }
}
