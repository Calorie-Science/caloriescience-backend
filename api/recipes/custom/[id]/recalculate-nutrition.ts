import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../../lib/auth';
import { supabase } from '../../../../lib/supabase';
import { IngredientNutritionTransformer } from '../../../../lib/ingredientNutritionTransformer';

interface IngredientNutrition {
  calories?: number;
  macros?: {
    protein?: number;
    carbs?: number;
    fat?: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    [key: string]: any;
  };
  micros?: {
    vitamins?: { [key: string]: number };
    minerals?: { [key: string]: number };
  };
  weight?: number;
  [key: string]: any;
}

/**
 * POST /api/recipes/custom/[id]/recalculate-nutrition
 *
 * Recalculate nutrition for a custom recipe based on its ingredients
 * Useful when nutrition calculation logic is fixed and existing recipes need updating
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle OPTIONS preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const user = (req as any).user;

  // Only nutritionists can recalculate nutrition
  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      success: false,
      message: 'Only nutritionists can recalculate nutrition'
    });
  }

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const recipeId = req.query.id as string;

    if (!recipeId) {
      return res.status(400).json({
        success: false,
        message: 'Recipe ID is required'
      });
    }

    console.log('🔧 Recalculating nutrition for recipe:', recipeId);

    // Fetch the recipe
    const { data: recipe, error } = await supabase
      .from('cached_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('provider', 'manual')
      .single();

    if (error || !recipe) {
      return res.status(404).json({
        success: false,
        message: 'Recipe not found'
      });
    }

    // Verify ownership
    if (recipe.created_by_nutritionist_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You do not own this recipe'
      });
    }

    console.log(`📝 Recipe: ${recipe.recipe_name}`);
    console.log(`🥘 Ingredients count: ${recipe.ingredients?.length || 0}`);
    console.log(`🍽️  Servings: ${recipe.servings}`);

    if (!recipe.ingredients || recipe.ingredients.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No ingredients found in recipe'
      });
    }

    // Recalculate nutrition
    let totalCalories = 0;
    let totalProteinG = 0;
    let totalCarbsG = 0;
    let totalFatG = 0;
    let totalFiberG = 0;
    let totalSugarG = 0;
    let totalSodiumMg = 0;
    let totalWeightG = 0;

    // Initialize detailed nutrition in standardized format
    const detailedNutrition: any = {
      macros: {},
      micros: {
        vitamins: {},
        minerals: {}
      }
    };

    const ingredientResults: any[] = [];

    // Process each ingredient
    for (const ingredient of recipe.ingredients) {
      let nutrition = ingredient.nutrition;

      if (nutrition) {
        console.log(`📦 Processing ingredient: ${ingredient.name}`);

        // Transform nutrition data to standardized format if needed
        const transformed = IngredientNutritionTransformer.transformToStandardFormat(nutrition);
        if (transformed) {
          console.log(`   ✅ Transformed nutrition`);
          nutrition = transformed;
        }

        // Accumulate calories
        const calories = nutrition.calories || 0;
        totalCalories += calories;

        // Support both flat and nested format
        const macros = nutrition.macros || nutrition;

        // Accumulate macros
        const protein = macros.protein || 0;
        const carbs = macros.carbs || 0;
        const fat = macros.fat || 0;
        const fiber = macros.fiber || 0;
        const sugar = macros.sugar || 0;
        const sodium = macros.sodium || 0;
        const weight = nutrition.weight || 0;

        totalProteinG += protein;
        totalCarbsG += carbs;
        totalFatG += fat;
        totalFiberG += fiber;
        totalSugarG += sugar;
        totalSodiumMg += sodium;
        totalWeightG += weight;

        // Accumulate extended macros (if available)
        if (nutrition.macros) {
          ['cholesterol', 'saturatedFat', 'transFat', 'monounsaturatedFat', 'polyunsaturatedFat'].forEach(macro => {
            if (nutrition.macros[macro] !== undefined) {
              if (!detailedNutrition.macros[macro]) {
                detailedNutrition.macros[macro] = 0;
              }
              detailedNutrition.macros[macro] += nutrition.macros[macro];
            }
          });
        }

        // Accumulate vitamins (if available)
        if (nutrition.micros?.vitamins) {
          Object.keys(nutrition.micros.vitamins).forEach(vitamin => {
            if (!detailedNutrition.micros.vitamins[vitamin]) {
              detailedNutrition.micros.vitamins[vitamin] = 0;
            }
            detailedNutrition.micros.vitamins[vitamin] += nutrition.micros.vitamins[vitamin] || 0;
          });
        }

        // Accumulate minerals (if available)
        if (nutrition.micros?.minerals) {
          Object.keys(nutrition.micros.minerals).forEach(mineral => {
            if (!detailedNutrition.micros.minerals[mineral]) {
              detailedNutrition.micros.minerals[mineral] = 0;
            }
            detailedNutrition.micros.minerals[mineral] += nutrition.micros.minerals[mineral] || 0;
          });
        }

        ingredientResults.push({
          name: ingredient.name,
          calories,
          protein,
          carbs,
          fat,
          fiber
        });
      }
    }

    console.log(`📊 Total Nutrition: Cal=${totalCalories} P=${totalProteinG}g C=${totalCarbsG}g F=${totalFatG}g`);

    // Calculate per serving
    const servings = recipe.servings || 1;
    const caloriesPerServing = totalCalories / servings;
    const proteinPerServingG = totalProteinG / servings;
    const carbsPerServingG = totalCarbsG / servings;
    const fatPerServingG = totalFatG / servings;
    const fiberPerServingG = totalFiberG / servings;
    const sugarPerServingG = totalSugarG / servings;
    const sodiumPerServingMg = totalSodiumMg / servings;

    // Helper function to get vitamin unit
    const getVitaminUnit = (vitaminKey: string): string => {
      const units: { [key: string]: string } = {
        vitaminA: 'IU',
        vitaminC: 'mg',
        vitaminD: 'µg',
        vitaminE: 'mg',
        vitaminK: 'µg',
        thiamin: 'mg',
        riboflavin: 'mg',
        niacin: 'mg',
        vitaminB6: 'mg',
        folate: 'µg',
        vitaminB12: 'µg',
        biotin: 'µg',
        pantothenicAcid: 'mg'
      };
      return units[vitaminKey] || 'mg';
    };

    // Add main macros to detailed nutrition with per-serving values in standardized format
    detailedNutrition.macros.protein = { quantity: Math.round(proteinPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.carbs = { quantity: Math.round(carbsPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.fat = { quantity: Math.round(fatPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.fiber = { quantity: Math.round(fiberPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.sugar = { quantity: Math.round(sugarPerServingG * 10) / 10, unit: 'g' };
    detailedNutrition.macros.sodium = { quantity: Math.round(sodiumPerServingMg * 10) / 10, unit: 'mg' };

    // Convert extended macros to standardized format
    Object.keys(detailedNutrition.macros).forEach(key => {
      if (!['protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'].includes(key)) {
        const value = detailedNutrition.macros[key];
        if (typeof value === 'number') {
          const perServing = servings > 0 ? value / servings : 0;
          const unit = key === 'cholesterol' ? 'mg' : 'g';
          detailedNutrition.macros[key] = { quantity: Math.round(perServing * 10) / 10, unit };
        }
      }
    });

    // Convert vitamins to standardized format
    Object.keys(detailedNutrition.micros.vitamins).forEach(key => {
      const value = detailedNutrition.micros.vitamins[key];
      if (typeof value === 'number') {
        const perServing = servings > 0 ? value / servings : 0;
        detailedNutrition.micros.vitamins[key] = { quantity: Math.round(perServing * 100) / 100, unit: getVitaminUnit(key) };
      }
    });

    // Convert minerals to standardized format
    Object.keys(detailedNutrition.micros.minerals).forEach(key => {
      const value = detailedNutrition.micros.minerals[key];
      if (typeof value === 'number') {
        const perServing = servings > 0 ? value / servings : 0;
        detailedNutrition.micros.minerals[key] = { quantity: Math.round(perServing * 100) / 100, unit: 'mg' };
      }
    });

    // Add calories at top level in standardized format
    detailedNutrition.calories = { quantity: Math.round(caloriesPerServing * 10) / 10, unit: 'kcal' };

    // Update the recipe
    const { error: updateError } = await supabase
      .from('cached_recipes')
      .update({
        total_calories: Math.round(totalCalories * 100) / 100,
        total_protein_g: Math.round(totalProteinG * 100) / 100,
        total_carbs_g: Math.round(totalCarbsG * 100) / 100,
        total_fat_g: Math.round(totalFatG * 100) / 100,
        total_fiber_g: Math.round(totalFiberG * 100) / 100,
        total_sugar_g: Math.round(totalSugarG * 100) / 100,
        total_sodium_mg: Math.round(totalSodiumMg * 100) / 100,
        total_weight_g: Math.round(totalWeightG * 100) / 100,
        calories_per_serving: Math.round(caloriesPerServing * 100) / 100,
        protein_per_serving_g: Math.round(proteinPerServingG * 100) / 100,
        carbs_per_serving_g: Math.round(carbsPerServingG * 100) / 100,
        fat_per_serving_g: Math.round(fatPerServingG * 100) / 100,
        fiber_per_serving_g: Math.round(fiberPerServingG * 100) / 100,
        nutrition_details: detailedNutrition,
        updated_at: new Date().toISOString()
      })
      .eq('id', recipeId);

    if (updateError) {
      console.error('❌ Error updating recipe:', updateError);
      return res.status(500).json({
        success: false,
        message: 'Failed to update recipe nutrition',
        error: updateError.message
      });
    }

    console.log('✅ Recipe nutrition recalculated successfully!');

    return res.status(200).json({
      success: true,
      message: 'Recipe nutrition recalculated successfully',
      data: {
        recipeId,
        recipeName: recipe.recipe_name,
        servings,
        totalNutrition: {
          calories: Math.round(totalCalories * 100) / 100,
          protein: Math.round(totalProteinG * 100) / 100,
          carbs: Math.round(totalCarbsG * 100) / 100,
          fat: Math.round(totalFatG * 100) / 100,
          fiber: Math.round(totalFiberG * 100) / 100
        },
        perServing: {
          calories: Math.round(caloriesPerServing * 100) / 100,
          protein: Math.round(proteinPerServingG * 100) / 100,
          carbs: Math.round(carbsPerServingG * 100) / 100,
          fat: Math.round(fatPerServingG * 100) / 100,
          fiber: Math.round(fiberPerServingG * 100) / 100
        },
        ingredients: ingredientResults
      }
    });

  } catch (error: any) {
    console.error('❌ Error recalculating nutrition:', error);

    return res.status(500).json({
      success: false,
      message: 'Failed to recalculate nutrition',
      error: error.message
    });
  }
}

export default requireAuth(handler);
