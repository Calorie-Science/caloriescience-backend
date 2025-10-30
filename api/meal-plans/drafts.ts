import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealPlanDraftService } from '../../lib/mealPlanDraftService';
import { RecipeCacheService } from '../../lib/recipeCacheService';
import Joi from 'joi';
import { supabase } from '../../lib/supabase';

const draftService = new MealPlanDraftService();
const cacheService = new RecipeCacheService();

const getDraftsSchema = Joi.object({
  clientId: Joi.string().uuid().optional(),
  status: Joi.string().valid('draft', 'finalized', 'completed').optional(),
  creationMethod: Joi.string().valid('auto_generated', 'manual', 'ai_generated').optional(),
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  includeNutrition: Joi.boolean().default(true),
  sortBy: Joi.string().valid('created_at', 'updated_at').default('updated_at'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc')
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access meal plan drafts
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Only nutritionists can access meal plan drafts' 
    });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate query parameters
    const { error, value } = getDraftsSchema.validate(req.query);
    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { clientId, status, creationMethod, page, pageSize, includeNutrition, sortBy, sortOrder } = value;

    // Build query
    let query = supabase
      .from('meal_plan_drafts')
      .select('*', { count: 'exact' })
      .eq('nutritionist_id', user.id);

    // Apply filters
    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (creationMethod) {
      query = query.eq('creation_method', creationMethod);
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });

    // Apply pagination
    const offset = (page - 1) * pageSize;
    query = query.range(offset, offset + pageSize - 1);

    const { data: drafts, error: queryError, count } = await query;

    if (queryError) {
      console.error('❌ Error fetching drafts:', queryError);
      throw new Error(`Failed to fetch drafts: ${queryError.message}`);
    }

    // Calculate nutrition for each draft if requested
    const enrichedDrafts = await Promise.all(
      (drafts || []).map(async (draft: any) => {
        const baseInfo = {
          id: draft.id,
          clientId: draft.client_id,
          nutritionistId: draft.nutritionist_id,
          status: draft.status,
          searchParams: draft.search_params,
          createdAt: draft.created_at,
          updatedAt: draft.updated_at,
          expiresAt: draft.expires_at
        };

        if (!includeNutrition) {
          return {
            ...baseInfo,
            suggestionCount: draft.suggestions?.length || 0
          };
        }

        // Calculate detailed nutrition
        const suggestions = draft.suggestions || [];
        const nutritionByDay = suggestions.map((day: any) => {
          const dayNumber = day.day;
          const date = day.date;
          const meals: any = {};
          let dayTotalNutrition = {
            calories: 0,
            protein: 0,
            carbs: 0,
            fat: 0,
            fiber: 0,
            sugar: 0,
            sodium: 0,
            cholesterol: 0,
            saturatedFat: 0,
            transFat: 0,
            monounsaturatedFat: 0,
            polyunsaturatedFat: 0
          };

          // Calculate nutrition for each meal
          Object.entries(day.meals || {}).forEach(([mealName, meal]: [string, any]) => {
            const selectedRecipe = meal.selectedRecipeId 
              ? meal.recipes.find((r: any) => r.id === meal.selectedRecipeId)
              : null;

            let mealNutrition = {
              calories: 0,
              protein: 0,
              carbs: 0,
              fat: 0,
              fiber: 0,
              sugar: 0,
              sodium: 0,
              cholesterol: 0,
              saturatedFat: 0,
              transFat: 0,
              monounsaturatedFat: 0,
              polyunsaturatedFat: 0
            };

            if (selectedRecipe) {
              // Check if there are customizations
              const customizations = meal.customizations?.[selectedRecipe.id];
              
              // Helper to extract numeric value from various formats
              const extractValue = (field: any): number => {
                if (typeof field === 'number') return field;
                if (field?.value !== undefined) return field.value; // {value, unit} format
                if (field?.quantity !== undefined) return field.quantity; // {quantity, unit} format
                return 0;
              };
              
              if (customizations?.customNutrition) {
                // Use custom nutrition if available (extract from standardized format)
                const customNut = customizations.customNutrition;
                const customMacros = customNut.macros || {};
                mealNutrition = {
                  calories: extractValue(customNut.calories),
                  protein: extractValue(customMacros.protein) || extractValue(customNut.protein),
                  carbs: extractValue(customMacros.carbs) || extractValue(customNut.carbs),
                  fat: extractValue(customMacros.fat) || extractValue(customNut.fat),
                  fiber: extractValue(customMacros.fiber) || extractValue(customNut.fiber),
                  sugar: extractValue(customMacros.sugar) || extractValue(customNut.sugar),
                  sodium: extractValue(customMacros.sodium) || extractValue(customNut.sodium),
                  cholesterol: extractValue(customMacros.cholesterol) || extractValue(customNut.cholesterol),
                  saturatedFat: extractValue(customMacros.saturatedFat) || extractValue(customNut.saturatedFat),
                  transFat: extractValue(customMacros.transFat) || extractValue(customNut.transFat),
                  monounsaturatedFat: extractValue(customMacros.monounsaturatedFat) || extractValue(customNut.monounsaturatedFat),
                  polyunsaturatedFat: extractValue(customMacros.polyunsaturatedFat) || extractValue(customNut.polyunsaturatedFat)
                };
              } else {
                // Use recipe's base nutrition
                const nutrition = selectedRecipe.nutrition || {};
                const macros = nutrition.macros || {};
                
                mealNutrition = {
                  calories: selectedRecipe.calories || extractValue(nutrition.calories),
                  protein: selectedRecipe.protein || extractValue(macros.protein),
                  carbs: selectedRecipe.carbs || extractValue(macros.carbs),
                  fat: selectedRecipe.fat || extractValue(macros.fat),
                  fiber: selectedRecipe.fiber || extractValue(macros.fiber),
                  sugar: extractValue(macros.sugar),
                  sodium: extractValue(macros.sodium),
                  cholesterol: extractValue(macros.cholesterol),
                  saturatedFat: extractValue(macros.saturatedFat),
                  transFat: extractValue(macros.transFat),
                  monounsaturatedFat: extractValue(macros.monounsaturatedFat),
                  polyunsaturatedFat: extractValue(macros.polyunsaturatedFat)
                };
              }

              // Add to day total (all fields)
              dayTotalNutrition.calories += mealNutrition.calories || 0;
              dayTotalNutrition.protein += mealNutrition.protein || 0;
              dayTotalNutrition.carbs += mealNutrition.carbs || 0;
              dayTotalNutrition.fat += mealNutrition.fat || 0;
              dayTotalNutrition.fiber += mealNutrition.fiber || 0;
              dayTotalNutrition.sugar += mealNutrition.sugar || 0;
              dayTotalNutrition.sodium += mealNutrition.sodium || 0;
              dayTotalNutrition.cholesterol += mealNutrition.cholesterol || 0;
              dayTotalNutrition.saturatedFat += mealNutrition.saturatedFat || 0;
              dayTotalNutrition.transFat += mealNutrition.transFat || 0;
              dayTotalNutrition.monounsaturatedFat += mealNutrition.monounsaturatedFat || 0;
              dayTotalNutrition.polyunsaturatedFat += mealNutrition.polyunsaturatedFat || 0;
            }

            meals[mealName] = {
              recipeName: selectedRecipe?.title || null,
              recipeId: selectedRecipe?.id || null,
              isSelected: !!meal.selectedRecipeId,
              hasCustomizations: !!(meal.customizations?.[selectedRecipe?.id]?.customizationsApplied),
              customNotes: selectedRecipe?.customNotes || null,
              nutrition: mealNutrition
            };
          });

          return {
            day: dayNumber,
            date: date,
            meals: meals,
            dayTotal: dayTotalNutrition
          };
        });

        // Calculate overall totals
        const overallTotal = nutritionByDay.reduce((acc: any, day: any) => ({
          calories: acc.calories + day.dayTotal.calories,
          protein: acc.protein + day.dayTotal.protein,
          carbs: acc.carbs + day.dayTotal.carbs,
          fat: acc.fat + day.dayTotal.fat,
          fiber: acc.fiber + day.dayTotal.fiber,
          sugar: acc.sugar + day.dayTotal.sugar,
          sodium: acc.sodium + day.dayTotal.sodium,
          cholesterol: acc.cholesterol + day.dayTotal.cholesterol,
          saturatedFat: acc.saturatedFat + day.dayTotal.saturatedFat,
          transFat: acc.transFat + day.dayTotal.transFat,
          monounsaturatedFat: acc.monounsaturatedFat + day.dayTotal.monounsaturatedFat,
          polyunsaturatedFat: acc.polyunsaturatedFat + day.dayTotal.polyunsaturatedFat
        }), { 
          calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, 
          sugar: 0, sodium: 0, cholesterol: 0, saturatedFat: 0, 
          transFat: 0, monounsaturatedFat: 0, polyunsaturatedFat: 0 
        });

        const totalDays = nutritionByDay.length;
        const dailyAverage = totalDays > 0 ? {
          calories: Math.round(overallTotal.calories / totalDays),
          protein: parseFloat((overallTotal.protein / totalDays).toFixed(1)),
          carbs: parseFloat((overallTotal.carbs / totalDays).toFixed(1)),
          fat: parseFloat((overallTotal.fat / totalDays).toFixed(1)),
          fiber: parseFloat((overallTotal.fiber / totalDays).toFixed(1)),
          sugar: parseFloat((overallTotal.sugar / totalDays).toFixed(1)),
          sodium: parseFloat((overallTotal.sodium / totalDays).toFixed(1)),
          cholesterol: parseFloat((overallTotal.cholesterol / totalDays).toFixed(1)),
          saturatedFat: parseFloat((overallTotal.saturatedFat / totalDays).toFixed(1)),
          transFat: parseFloat((overallTotal.transFat / totalDays).toFixed(1)),
          monounsaturatedFat: parseFloat((overallTotal.monounsaturatedFat / totalDays).toFixed(1)),
          polyunsaturatedFat: parseFloat((overallTotal.polyunsaturatedFat / totalDays).toFixed(1))
        } : null;

        // Calculate completion status
        const totalMeals = suggestions.reduce((sum: number, day: any) => 
          sum + Object.keys(day.meals || {}).length, 0
        );
        const selectedMeals = suggestions.reduce((sum: number, day: any) => 
          sum + Object.values(day.meals || {}).filter((meal: any) => meal.selectedRecipeId).length, 0
        );

        return {
          ...baseInfo,
          totalDays: totalDays,
          totalMeals: totalMeals,
          selectedMeals: selectedMeals,
          completionPercentage: totalMeals > 0 ? Math.round((selectedMeals / totalMeals) * 100) : 0,
          isComplete: selectedMeals === totalMeals,
          nutrition: {
            byDay: nutritionByDay,
            overall: overallTotal,
            dailyAverage: dailyAverage
          }
        };
      })
    );

    // Prepare response
    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);

    return res.status(200).json({
      success: true,
      data: {
        drafts: enrichedDrafts,
        pagination: {
          page: page,
          pageSize: pageSize,
          totalCount: totalCount,
          totalPages: totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1
        },
        filters: {
          clientId: clientId || null,
          status: status || null,
          creationMethod: creationMethod || null
        }
      },
      message: `Retrieved ${enrichedDrafts.length} meal plan draft(s)`
    });

  } catch (error) {
    console.error('❌ Error fetching meal plan drafts:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch meal plan drafts'
    });
  }
}

export default requireAuth(handler);

