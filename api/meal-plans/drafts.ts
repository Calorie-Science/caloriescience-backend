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

    const { clientId, status, page, pageSize, includeNutrition, sortBy, sortOrder } = value;

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
            fiber: 0
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
              fiber: 0
            };

            if (selectedRecipe) {
              // Check if there are customizations
              const customizations = meal.customizations?.[selectedRecipe.id];
              
              if (customizations?.customNutrition) {
                // Use custom nutrition if available
                mealNutrition = customizations.customNutrition;
              } else {
                // Use recipe's base nutrition
                mealNutrition = {
                  calories: selectedRecipe.calories || selectedRecipe.nutrition?.calories || 0,
                  protein: selectedRecipe.protein || selectedRecipe.nutrition?.protein || 0,
                  carbs: selectedRecipe.carbs || selectedRecipe.nutrition?.carbs || 0,
                  fat: selectedRecipe.fat || selectedRecipe.nutrition?.fat || 0,
                  fiber: selectedRecipe.fiber || selectedRecipe.nutrition?.fiber || 0
                };
              }

              // Add to day total
              dayTotalNutrition.calories += mealNutrition.calories;
              dayTotalNutrition.protein += mealNutrition.protein;
              dayTotalNutrition.carbs += mealNutrition.carbs;
              dayTotalNutrition.fat += mealNutrition.fat;
              dayTotalNutrition.fiber += mealNutrition.fiber;
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
          fiber: acc.fiber + day.dayTotal.fiber
        }), { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 });

        const totalDays = nutritionByDay.length;
        const dailyAverage = totalDays > 0 ? {
          calories: Math.round(overallTotal.calories / totalDays),
          protein: parseFloat((overallTotal.protein / totalDays).toFixed(1)),
          carbs: parseFloat((overallTotal.carbs / totalDays).toFixed(1)),
          fat: parseFloat((overallTotal.fat / totalDays).toFixed(1)),
          fiber: parseFloat((overallTotal.fiber / totalDays).toFixed(1))
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
          status: status || null
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

