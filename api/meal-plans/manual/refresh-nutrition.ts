import { VercelRequest, VercelResponse } from '@vercel/node';
import { ManualMealPlanService } from '../../../lib/manualMealPlanService';
import { requireRole } from '../../../lib/auth';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * PUT /api/meal-plans/manual/refresh-nutrition
 * Refresh nutrition data for a recipe in a meal plan from the source recipe
 *
 * Request body:
 * {
 *   "draftId": "string",
 *   "day": number,
 *   "mealName": "string",
 *   "recipeId": "string"
 * }
 */
async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const user = (req as any).user;

  try {
    const { draftId, day, mealName, recipeId } = req.body;

    if (!draftId || !day || !mealName || !recipeId) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: draftId, day, mealName, recipeId'
      });
    }

    // Fetch the draft
    const { data: draft, error: draftError } = await supabase
      .from('meal_plan_drafts')
      .select('*')
      .eq('id', draftId)
      .single();

    if (draftError || !draft) {
      return res.status(404).json({ success: false, message: 'Draft not found' });
    }

    // Check ownership
    if (draft.nutritionist_id !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this meal plan draft'
      });
    }

    // Find the day in suggestions
    const suggestions = draft.suggestions as any[];
    const dayPlan = suggestions.find((d: any) => d.day === day);

    if (!dayPlan) {
      return res.status(404).json({ success: false, message: `Day ${day} not found` });
    }

    // Find the meal (case-insensitive)
    const mealKeys = Object.keys(dayPlan.meals);
    const matchedMeal = mealKeys.find(key => key.toLowerCase() === mealName.toLowerCase());

    if (!matchedMeal) {
      return res.status(404).json({ success: false, message: `Meal "${mealName}" not found` });
    }

    const meal = dayPlan.meals[matchedMeal];

    // Find the recipe in the meal
    const recipeIndex = meal.recipes?.findIndex((r: any) => r.id === recipeId || r.cacheId === recipeId);

    if (recipeIndex === -1 || recipeIndex === undefined) {
      return res.status(404).json({ success: false, message: 'Recipe not found in meal' });
    }

    const recipe = meal.recipes[recipeIndex];

    // Fetch fresh nutrition from cached_recipes
    const { data: cachedRecipe, error: cacheError } = await supabase
      .from('cached_recipes')
      .select('*')
      .eq('id', recipe.cacheId || recipeId)
      .single();

    if (cacheError || !cachedRecipe) {
      return res.status(404).json({ success: false, message: 'Source recipe not found in cache' });
    }

    // Parse fresh nutrition details
    let fullNutrition: any = null;
    if (cachedRecipe.nutrition_details) {
      try {
        fullNutrition = typeof cachedRecipe.nutrition_details === 'string'
          ? JSON.parse(cachedRecipe.nutrition_details)
          : cachedRecipe.nutrition_details;
      } catch (e) {
        console.error('Error parsing nutrition_details:', e);
      }
    }

    // Ensure micros structure exists
    if (fullNutrition && !fullNutrition.micros) {
      fullNutrition.micros = { vitamins: {}, minerals: {} };
    }

    // Extract basic nutrition values
    const calories = fullNutrition?.calories?.quantity || parseFloat(cachedRecipe.calories_per_serving) || 0;
    const protein = fullNutrition?.macros?.protein?.quantity || parseFloat(cachedRecipe.protein_per_serving_g) || 0;
    const carbs = fullNutrition?.macros?.carbs?.quantity || parseFloat(cachedRecipe.carbs_per_serving_g) || 0;
    const fat = fullNutrition?.macros?.fat?.quantity || parseFloat(cachedRecipe.fat_per_serving_g) || 0;
    const fiber = fullNutrition?.macros?.fiber?.quantity || parseFloat(cachedRecipe.fiber_per_serving_g) || 0;

    // Update recipe nutrition in meal plan
    recipe.calories = calories;
    recipe.protein = protein;
    recipe.carbs = carbs;
    recipe.fat = fat;
    recipe.fiber = fiber;
    recipe.nutrition = fullNutrition || {
      calories: { unit: 'kcal', quantity: calories },
      macros: {
        protein: { unit: 'g', quantity: protein },
        carbs: { unit: 'g', quantity: carbs },
        fat: { unit: 'g', quantity: fat },
        fiber: { unit: 'g', quantity: fiber }
      },
      micros: { vitamins: {}, minerals: {} }
    };

    // Recalculate meal nutrition
    const manualMealPlanService = new ManualMealPlanService();
    const recalculatedNutrition = manualMealPlanService.calculateMealNutrition(
      meal.recipes,
      meal.customizations
    );
    meal.totalNutrition = recalculatedNutrition;

    // Update the draft
    const { error: updateError } = await supabase
      .from('meal_plan_drafts')
      .update({
        suggestions: suggestions,
        updated_at: new Date().toISOString()
      })
      .eq('id', draftId);

    if (updateError) {
      throw new Error(`Failed to update draft: ${updateError.message}`);
    }

    console.log(`✅ Refreshed nutrition for recipe "${recipe.title}" in ${mealName}, day ${day}`);

    return res.status(200).json({
      success: true,
      message: 'Nutrition refreshed successfully',
      data: {
        recipe: recipe,
        mealNutrition: recalculatedNutrition
      }
    });

  } catch (error: any) {
    console.error('Error refreshing nutrition:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to refresh nutrition'
    });
  }
}

export default requireRole(['nutritionist'])(handler);
