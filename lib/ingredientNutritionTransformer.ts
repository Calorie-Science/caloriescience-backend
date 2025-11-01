/**
 * Transform various ingredient nutrition formats into standardized format
 * Handles Edamam raw API responses and other formats
 */

import { IngredientNutrition } from '../types/customRecipe';

export class IngredientNutritionTransformer {

  /**
   * Transform ingredient nutrition from any format to standardized format
   */
  static transformToStandardFormat(rawNutrition: any): IngredientNutrition | null {
    if (!rawNutrition) {
      return null;
    }

    // Check if already in standardized format
    if (this.isStandardizedFormat(rawNutrition)) {
      return rawNutrition as IngredientNutrition;
    }

    // Check if it's Edamam's raw format (nested with ingredients[0].parsed[0].nutrients)
    if (this.isEdamamRawFormat(rawNutrition)) {
      return this.transformEdamamRawFormat(rawNutrition);
    }

    // If it has direct nutrient keys (ENERC_KCAL, PROCNT, etc.)
    if (rawNutrition.ENERC_KCAL || rawNutrition.nutrients) {
      return this.transformEdamamNutrientsFormat(rawNutrition.nutrients || rawNutrition);
    }

    console.warn('Unknown ingredient nutrition format:', Object.keys(rawNutrition));
    return null;
  }

  /**
   * Check if nutrition is already in standardized format
   */
  private static isStandardizedFormat(nutrition: any): boolean {
    return (
      nutrition.calories !== undefined &&
      nutrition.macros &&
      typeof nutrition.macros === 'object' &&
      nutrition.macros.protein !== undefined
    );
  }

  /**
   * Check if it's Edamam's raw nested format
   */
  private static isEdamamRawFormat(nutrition: any): boolean {
    return (
      nutrition.ingredients &&
      Array.isArray(nutrition.ingredients) &&
      nutrition.ingredients[0]?.parsed &&
      nutrition.ingredients[0].parsed[0]?.nutrients
    );
  }

  /**
   * Transform Edamam's nested format to standardized format
   */
  private static transformEdamamRawFormat(rawNutrition: any): IngredientNutrition | null {
    try {
      // Navigate to the nutrients object
      const nutrients = rawNutrition.ingredients[0]?.parsed[0]?.nutrients;
      const weight = rawNutrition.ingredients[0]?.parsed[0]?.weight;

      if (!nutrients) {
        console.error('No nutrients found in Edamam raw format');
        return null;
      }

      return this.transformEdamamNutrientsFormat(nutrients, weight);
    } catch (error) {
      console.error('Error transforming Edamam raw format:', error);
      return null;
    }
  }

  /**
   * Transform Edamam nutrients object to standardized format
   */
  private static transformEdamamNutrientsFormat(nutrients: any, weight?: number): IngredientNutrition {
    // Extract main nutrition values
    const calories = nutrients.ENERC_KCAL?.quantity || 0;
    const protein = nutrients.PROCNT?.quantity || 0;
    const carbs = nutrients.CHOCDF?.quantity || 0;
    const fat = nutrients.FAT?.quantity || 0;
    const fiber = nutrients.FIBTG?.quantity || 0;
    const sugar = nutrients.SUGAR?.quantity || 0;
    const sodium = nutrients.NA?.quantity || 0;

    // Extended macros
    const cholesterol = nutrients.CHOLE?.quantity;
    const saturatedFat = nutrients.FASAT?.quantity;
    const transFat = nutrients.FATRN?.quantity;
    const monounsaturatedFat = nutrients.FAMS?.quantity;
    const polyunsaturatedFat = nutrients.FAPU?.quantity;

    // Vitamins
    const vitamins: any = {};
    if (nutrients.VITA_RAE?.quantity) vitamins.vitaminA = nutrients.VITA_RAE.quantity;
    if (nutrients.VITC?.quantity) vitamins.vitaminC = nutrients.VITC.quantity;
    if (nutrients.VITD?.quantity) vitamins.vitaminD = nutrients.VITD.quantity;
    if (nutrients.TOCPHA?.quantity) vitamins.vitaminE = nutrients.TOCPHA.quantity;
    if (nutrients.VITK1?.quantity) vitamins.vitaminK = nutrients.VITK1.quantity;
    if (nutrients.THIA?.quantity) vitamins.thiamin = nutrients.THIA.quantity;
    if (nutrients.RIBF?.quantity) vitamins.riboflavin = nutrients.RIBF.quantity;
    if (nutrients.NIA?.quantity) vitamins.niacin = nutrients.NIA.quantity;
    if (nutrients.VITB6A?.quantity) vitamins.vitaminB6 = nutrients.VITB6A.quantity;
    if (nutrients.FOLDFE?.quantity) vitamins.folate = nutrients.FOLDFE.quantity;
    if (nutrients.VITB12?.quantity) vitamins.vitaminB12 = nutrients.VITB12.quantity;

    // Minerals
    const minerals: any = {};
    if (nutrients.CA?.quantity) minerals.calcium = nutrients.CA.quantity;
    if (nutrients.FE?.quantity) minerals.iron = nutrients.FE.quantity;
    if (nutrients.MG?.quantity) minerals.magnesium = nutrients.MG.quantity;
    if (nutrients.P?.quantity) minerals.phosphorus = nutrients.P.quantity;
    if (nutrients.K?.quantity) minerals.potassium = nutrients.K.quantity;
    if (nutrients.ZN?.quantity) minerals.zinc = nutrients.ZN.quantity;

    // Build standardized format
    const standardized: IngredientNutrition = {
      calories,
      macros: {
        protein,
        carbs,
        fat,
        fiber,
        sugar,
        sodium,
        ...(cholesterol !== undefined && { cholesterol }),
        ...(saturatedFat !== undefined && { saturatedFat }),
        ...(transFat !== undefined && { transFat }),
        ...(monounsaturatedFat !== undefined && { monounsaturatedFat }),
        ...(polyunsaturatedFat !== undefined && { polyunsaturatedFat })
      },
      micros: {
        vitamins,
        minerals
      },
      ...(weight && { weight })
    };

    return standardized;
  }

  /**
   * Validate that ingredient nutrition is in correct format
   */
  static validate(nutrition: any): { valid: boolean; error?: string; transformed?: IngredientNutrition } {
    if (!nutrition) {
      return { valid: false, error: 'No nutrition data provided' };
    }

    // Try to transform
    const transformed = this.transformToStandardFormat(nutrition);

    if (!transformed) {
      return {
        valid: false,
        error: 'Could not transform nutrition data to standard format'
      };
    }

    // Validate required fields
    if (transformed.calories === undefined) {
      return { valid: false, error: 'Missing calories' };
    }

    if (!transformed.macros || transformed.macros.protein === undefined) {
      return { valid: false, error: 'Missing macros data' };
    }

    return { valid: true, transformed };
  }

  /**
   * Log nutrition data format for debugging
   */
  static debugFormat(nutrition: any, label: string = 'Nutrition'): void {
    console.log(`\n🔍 ${label} Format Debug:`);

    if (!nutrition) {
      console.log('  ❌ Nutrition is null/undefined');
      return;
    }

    console.log('  Keys:', Object.keys(nutrition).slice(0, 10));

    if (this.isStandardizedFormat(nutrition)) {
      console.log('  ✅ Already in standardized format');
      console.log(`     Calories: ${nutrition.calories}`);
      console.log(`     Protein: ${nutrition.macros?.protein}g`);
    } else if (this.isEdamamRawFormat(nutrition)) {
      console.log('  ⚠️ Edamam raw nested format detected');
      const nutrients = nutrition.ingredients?.[0]?.parsed?.[0]?.nutrients;
      if (nutrients) {
        console.log(`     ENERC_KCAL: ${nutrients.ENERC_KCAL?.quantity}`);
        console.log(`     PROCNT: ${nutrients.PROCNT?.quantity}g`);
      }
    } else if (nutrition.ENERC_KCAL) {
      console.log('  ⚠️ Edamam nutrients format (direct keys)');
      console.log(`     ENERC_KCAL: ${nutrition.ENERC_KCAL?.quantity}`);
    } else {
      console.log('  ❓ Unknown format');
    }
  }
}
