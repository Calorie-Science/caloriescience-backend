import { VercelRequest, VercelResponse } from '@vercel/node';
import { MealPlanningService, MealPlanGenerationRequest } from '../../lib/mealPlanningService';
import { MealProgramService } from '../../lib/mealProgramService';
import { ClientGoalsService } from '../../lib/clientGoalsService';
import { requireAuth } from '../../lib/auth';

const mealPlanningService = new MealPlanningService();
const mealProgramService = new MealProgramService();
const clientGoalsService = new ClientGoalsService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access meal plans and programs
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can manage meal plans and programs.' });
  }

  // POST - Handle both meal planning and meal program creation
  if (req.method === 'POST') {
    try {
      const {
        type = 'meal-plan', // 'meal-plan' or 'meal-program'
        action = 'save', // 'preview', 'save', 'update', 'activate' (for meal-plan type)
        clientId,
        planDate,
        planType = 'daily',
        dietaryRestrictions = [],
        cuisinePreferences = [],
        mealPreferences = {},
        targetCalories,
        macroTargets = null, // New field for macro targets
        // Meal program fields
        name,
        description,
        meals,
        // Edit fields
        mealProgramId, // For editing meal programs
        mealPlanId, // For editing meal plans
        isActive // For meal program activation
      } = req.body;

      if (req.body.action === 'cleanup') {
        if (req.body.secret !== process.env.CLEANUP_SECRET) {
          return res.status(403).json({ error: 'Invalid cleanup secret' });
        }

        const result = await mealPlanningService.cleanupOldDrafts();

        if (!result.success) {
          return res.status(500).json({ error: result.error });
        }

        return res.status(200).json({
          message: `Cleanup successful: ${result.deletedCount} old drafts deleted`
        });
      }

      // Validate type
      if (!['meal-plan', 'meal-program', 'client-goal'].includes(type)) {
        return res.status(400).json({
          error: 'Invalid type',
          message: 'type must be either "meal-plan", "meal-program", or "client-goal"'
        });
      }

      // Validate clientId for operations that need it
      const needsClientId = type === 'meal-program' || 
                           type === 'client-goal' || 
                           (type === 'meal-plan' && ['preview', 'save'].includes(action));
      
      if (needsClientId && !clientId) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'clientId is required'
        });
      }

      // Check if client exists and belongs to the authenticated nutritionist (only if clientId is needed)
      if (needsClientId && clientId) {
        const { data: client, error: clientError } = await require('../../lib/supabase').supabase
          .from('clients')
          .select('id, nutritionist_id')
          .eq('id', clientId)
          .eq('nutritionist_id', user.id)
          .single();

        if (clientError || !client) {
          return res.status(404).json({
            error: 'Client not found',
            message: 'The specified client does not exist or you do not have access to it'
          });
        }
      }

      // Handle different types
      if (type === 'meal-program') {
        // Handle edit operations
        if (action === 'update' && mealProgramId) {
          // Update existing meal program
          if (!name || !meals || !Array.isArray(meals) || meals.length === 0) {
            return res.status(400).json({
              error: 'Missing required fields',
              message: 'name and meals array are required for updating meal programs'
            });
          }

          if (meals.length > 10) {
            return res.status(400).json({
              error: 'Too many meals',
              message: 'Maximum 10 meals allowed per program'
            });
          }

          // Check for duplicate meal orders
          const mealOrders = meals.map(m => m.mealOrder);
          if (new Set(mealOrders).size !== mealOrders.length) {
            return res.status(400).json({
              error: 'Duplicate meal orders',
              message: 'Each meal must have a unique order number'
            });
          }

          const result = await mealProgramService.updateMealProgram(mealProgramId, user.id, {
            name,
            description,
            meals
          });

          if (!result.success) {
            return res.status(400).json({
              error: 'Failed to update meal program',
              message: result.error
            });
          }

          return res.status(200).json({
            success: true,
            data: result.data,
            message: 'Meal program updated successfully'
          });
        } else if (action === 'activate' && mealProgramId) {
          // Activate meal program
          const result = await mealProgramService.activateMealProgram(mealProgramId, user.id);
          
          if (!result.success) {
            return res.status(400).json({
              error: 'Failed to activate meal program',
              message: result.error
            });
          }

          return res.status(200).json({
            success: true,
            data: result.data,
            message: 'Meal program activated successfully'
          });
        } else if (action === 'delete' && mealProgramId) {
          // Delete meal program
          const result = await mealProgramService.deleteMealProgram(mealProgramId, user.id);
          
          if (!result.success) {
            return res.status(400).json({
              error: 'Failed to delete meal program',
              message: result.error
            });
          }

          return res.status(200).json({
            success: true,
            message: 'Meal program deleted successfully'
          });
        } else {
          // Create new meal program (default action)
          // Validate meal program fields
          if (!name || !meals || !Array.isArray(meals) || meals.length === 0) {
            return res.status(400).json({
              error: 'Missing required fields',
              message: 'name and meals array are required for meal programs'
            });
          }

          if (meals.length > 10) {
            return res.status(400).json({
              error: 'Too many meals',
              message: 'Maximum 10 meals allowed per program'
            });
          }

          // Check for duplicate meal orders
          const mealOrders = meals.map(m => m.mealOrder);
          if (new Set(mealOrders).size !== mealOrders.length) {
            return res.status(400).json({
              error: 'Duplicate meal orders',
              message: 'Each meal must have a unique order number'
            });
          }

                    // Create meal program
          const result = await mealProgramService.createMealProgram(
            { clientId, name, description, meals },
            user.id
          );

          if (!result.success) {
            return res.status(400).json({
              error: 'Failed to create meal program',
              message: result.error
            });
          }

          return res.status(201).json({
            success: true,
            data: result.data,
            message: result.message || 'Meal program created successfully'
          });
        }
      } else if (type === 'client-goal') {
        // Handle client goal operations
        if (action === 'update' && req.body.goalId) {
          // Update existing client goal
          const {
            goalId,
            eerGoalCalories,
            proteinGoalMin,
            proteinGoalMax,
            carbsGoalMin,
            carbsGoalMax,
            fatGoalMin,
            fatGoalMax,
            fiberGoalGrams,
            waterGoalLiters,
            goalStartDate,
            goalEndDate,
            notes
          } = req.body;

          const result = await clientGoalsService.updateClientGoal(
            goalId,
            {
              eerGoalCalories,
              proteinGoalMin,
              proteinGoalMax,
              carbsGoalMin,
              carbsGoalMax,
              fatGoalMin,
              fatGoalMax,
              fiberGoalGrams,
              waterGoalLiters,
              goalStartDate,
              goalEndDate,
              notes
            },
            user.id
          );

          if (!result.success) {
            return res.status(400).json({
              error: 'Failed to update client goal',
              message: result.error
            });
          }

          return res.status(200).json({
            success: true,
            data: result.data,
            message: 'Client goal updated successfully'
          });
        } else {
          // Create new client goal
          const {
            eerGoalCalories,
            proteinGoalMin,
            proteinGoalMax,
            carbsGoalMin,
            carbsGoalMax,
            fatGoalMin,
            fatGoalMax,
            fiberGoalGrams,
            waterGoalLiters,
            goalStartDate,
            goalEndDate,
            notes
          } = req.body;

          if (!eerGoalCalories || !proteinGoalMin || !proteinGoalMax || !carbsGoalMin || !carbsGoalMax || !fatGoalMin || !fatGoalMax) {
            return res.status(400).json({
              error: 'Missing required fields',
              message: 'eerGoalCalories, proteinGoalMin, proteinGoalMax, carbsGoalMin, carbsGoalMax, fatGoalMin, and fatGoalMax are required'
            });
          }

          // Create client goal
          const result = await clientGoalsService.createClientGoal(
            {
              clientId,
              eerGoalCalories,
              proteinGoalMin,
              proteinGoalMax,
              carbsGoalMin,
              carbsGoalMax,
              fatGoalMin,
              fatGoalMax,
              fiberGoalGrams,
              waterGoalLiters,
              goalStartDate,
              goalEndDate,
              notes
            },
            user.id
          );

          if (!result.success) {
            return res.status(400).json({
              error: 'Failed to create client goal',
              message: result.error
            });
          }

          return res.status(201).json({
            success: true,
            data: result.data,
            message: 'Client goal created successfully'
          });
        }
      } else {
        // Meal plan type - validate action
        if (!['preview', 'save', 'preview-edit-ingredient', 'preview-delete-ingredient', 'save-from-preview'].includes(action)) {
          return res.status(400).json({
            error: 'Invalid action',
            message: 'action must be one of: "preview", "save", "preview-edit-ingredient", "preview-delete-ingredient", "save-from-preview"'
          });
        }

        // Only validate planDate for preview and save actions
        if (['preview', 'save'].includes(action)) {
          if (!planDate) {
            return res.status(400).json({
              error: 'Missing required field',
              message: 'planDate is required (YYYY-MM-DD format)'
            });
          }

          // Validate date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(planDate)) {
            return res.status(400).json({
              error: 'Invalid date format',
              message: 'planDate must be in YYYY-MM-DD format'
            });
          }

          // Check if plan date is not in the past
          const planDateObj = new Date(planDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          if (planDateObj < today) {
            return res.status(400).json({
              error: 'Invalid date',
              message: 'Plan date cannot be in the past'
            });
          }
        }

        // Validate macro targets if provided (only for preview and save actions)
        if (['preview', 'save'].includes(action) && macroTargets) {
          if (typeof macroTargets !== 'object' || macroTargets === null) {
            return res.status(400).json({
              error: 'Invalid macro targets format',
              message: 'macroTargets must be an object with protein, fat, and/or carbs properties'
            });
          }

          // Validate each macro target
          const validMacros = ['protein', 'fat', 'carbs'];
          for (const [macro, value] of Object.entries(macroTargets)) {
            if (!validMacros.includes(macro)) {
              return res.status(400).json({
                error: 'Invalid macro type',
                message: `Invalid macro type: ${macro}. Valid types are: ${validMacros.join(', ')}`
              });
            }

            if (typeof value !== 'object' || value === null || !('min' in value) || !('max' in value)) {
              return res.status(400).json({
                error: 'Invalid macro target format',
                message: `Each macro target must have min and max numeric values. Got: ${JSON.stringify(value)}`
              });
            }

            const min = (value as any).min;
            const max = (value as any).max;

            if (typeof min !== 'number' || typeof max !== 'number' || min < 0 || max < 0 || min > max) {
              return res.status(400).json({
                error: 'Invalid macro target values',
                message: `Macro targets must have positive values with min <= max. Got: ${macro} min: ${min}, max: ${max}`
              });
            }
          }
        }

        // Handle different meal plan actions
        let generatedMealPlan;
        
        if (['preview', 'save'].includes(action)) {
          // Check if client has a meal program - if yes, use it for meal planning
          const { data: activeMealProgram } = await require('../../lib/supabase').supabase
            .from('meal_programs')
            .select('id')
            .eq('client_id', clientId)
            .eq('is_active', true)
            .single();
          
          if (activeMealProgram) {
            console.log('🎯 API - Client has active meal program, using program-based meal planning');
            
            // Check if UI is sending meal program overrides
            const uiOverrideMeals = req.body.uiOverrideMeals || null;
            
            // Generate meal plan based on meal program
            generatedMealPlan = await mealPlanningService.generateMealPlanFromProgram(
              clientId,
              planDate,
              dietaryRestrictions,
              cuisinePreferences,
              uiOverrideMeals,
              user.id
            );
            
            if (!generatedMealPlan.success) {
              return res.status(400).json({
                error: 'Meal plan generation failed',
                message: generatedMealPlan.error
              });
            }
            
            // Return the program-based meal plan
            if (action === 'preview') {
              console.log('🎯 API - Returning preview response with data:', JSON.stringify(generatedMealPlan.data, null, 2));
              console.log('🎯 API - PreviewId in mealPlan:', generatedMealPlan.data?.mealPlan?.previewId);
              return res.status(200).json({
                success: true,
                message: 'Meal plan preview generated successfully',
                data: {
                  mealPlan: generatedMealPlan.data.mealPlan,
                  clientGoals: generatedMealPlan.data.clientGoals,
                  mealProgram: generatedMealPlan.data.mealProgram,
                  planDate: generatedMealPlan.data.planDate,
                  dietaryRestrictions: generatedMealPlan.data.dietaryRestrictions,
                  cuisinePreferences: generatedMealPlan.data.cuisinePreferences
                }
              });
            } else {
              // For save action, you might want to store this differently
              return res.status(200).json({
                success: true,
                message: 'Meal plan saved successfully',
                data: {
                  mealPlan: generatedMealPlan.data.mealPlan,
                  clientGoals: generatedMealPlan.data.clientGoals,
                  mealProgram: generatedMealPlan.data.mealProgram,
                  planDate: generatedMealPlan.data.planDate,
                  dietaryRestrictions: generatedMealPlan.data.dietaryRestrictions,
                  cuisinePreferences: generatedMealPlan.data.cuisinePreferences
                }
              });
            }
          } else {
            console.log('🎯 API - No active meal program, using standard meal planning');
            
            // Generate meal plan using standard method
            const mealPlanRequest: MealPlanGenerationRequest = {
              clientId,
              planDate,
              planType,
              dietaryRestrictions,
              cuisinePreferences,
              mealPreferences,
              targetCalories,
              macroTargets
            };

            console.log('🔍 API Debug - User ID from JWT:', user.id);
            console.log('🔍 API Debug - User object:', JSON.stringify(user, null, 2));
            
            // Use a simple user ID for Edamam instead of the UUID
            const edamamUserId = 'nutritionist1';
            console.log('🔍 API Debug - Using Edamam User ID:', edamamUserId);
            console.log('🚨 TEST DEBUG - This should appear in logs!');
            
            generatedMealPlan = await mealPlanningService.generateMealPlan(mealPlanRequest, edamamUserId);
          }

          // Handle based on action
          if (action === 'preview') {
            // Return preview without saving
            return res.status(200).json({
              success: true,
              message: 'Meal plan preview generated successfully',
              data: {
                mealPlan: {
                  ...generatedMealPlan,
                  id: 'preview-' + Date.now(), // Temporary ID for preview
                  status: 'preview'
                }
              }
            });
          } else {
            // Save to database
            const planId = await mealPlanningService.saveMealPlan(generatedMealPlan);

            // Return the generated meal plan with the new ID
            const savedMealPlan = await mealPlanningService.getMealPlan(planId);

            return res.status(201).json({
              success: true,
              message: 'Meal plan generated and saved successfully',
              data: {
                mealPlan: savedMealPlan
              }
            });
          }
        }

        // Handle based on action
        if (action === 'preview') {
          // Return preview without saving
          return res.status(200).json({
            success: true,
            message: 'Meal plan preview generated successfully',
            data: {
              mealPlan: {
                ...generatedMealPlan,
                id: 'preview-' + Date.now(), // Temporary ID for preview
                status: 'preview'
              }
            }
          });
        } else if (action === 'preview-edit-ingredient') {
          const { previewId, mealIndex, ingredientIndex, newIngredientText } = req.body;

          if (!previewId || mealIndex === undefined || ingredientIndex === undefined || !newIngredientText) {
            return res.status(400).json({ error: 'Missing required fields for edit' });
          }

          const result = await mealPlanningService.editPreviewIngredient(previewId, mealIndex, ingredientIndex, newIngredientText);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Ingredient edited successfully',
            data: result.data
          });
        } else if (action === 'preview-delete-ingredient') {
          const { previewId, mealIndex, ingredientIndex } = req.body;

          if (!previewId || mealIndex === undefined || ingredientIndex === undefined) {
            return res.status(400).json({ error: 'Missing required fields for delete' });
          }

          const result = await mealPlanningService.deletePreviewIngredient(previewId, mealIndex, ingredientIndex);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Ingredient deleted successfully',
            data: result.data
          });
        } else if (action === 'save-from-preview') {
          const { previewId, planName, isActive } = req.body;

          if (!previewId || !planName) {
            return res.status(400).json({ error: 'Missing required fields for save' });
          }

          const result = await mealPlanningService.saveFromPreview(previewId, planName, isActive);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Meal plan saved from preview successfully',
            data: result.data
          });
        } else {
          // Save to database
          const planId = await mealPlanningService.saveMealPlan(generatedMealPlan);

          // Return the generated meal plan with the new ID
          const savedMealPlan = await mealPlanningService.getMealPlan(planId);

          return res.status(201).json({
            message: 'Meal plan generated and saved successfully',
            action: 'save',
            mealPlan: savedMealPlan
          });
        }
      }

    } catch (error) {
      console.error('Error in POST request:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to process request'
      });
    }
  }

  // GET - Handle different modes: meal plans or meal programs
  if (req.method === 'GET') {
    try {
      const { clientId, mode = 'meal-plans' } = req.query;

      if (!clientId || typeof clientId !== 'string') {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'clientId query parameter is required'
        });
      }

      // Check if client exists and belongs to the authenticated nutritionist
      const { data: client, error: clientError } = await require('../../lib/supabase').supabase
        .from('clients')
        .select('id, nutritionist_id')
        .eq('id', clientId)
        .eq('nutritionist_id', user.id)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The specified client does not exist or you do not have access to it'
        });
      }

      // Handle different modes
      if (mode === 'meal-programs') {
        // Get meal programs for the client
        const result = await mealProgramService.getMealProgramsForClient(clientId, user.id);

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to fetch meal programs',
            message: result.error
          });
        }

        return res.status(200).json({
          success: true,
          data: result.data,
          message: 'Meal programs fetched successfully'
        });
      } else if (mode === 'client-goals') {
        // Get client goals
        const result = await clientGoalsService.getClientGoals(clientId, user.id);

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to fetch client goals',
            message: result.error
          });
        }

        return res.status(200).json({
          success: true,
          data: result.data,
          message: 'Client goals fetched successfully'
        });
      } else {
        // Default mode: get meal plans for the client
        const mealPlans = await mealPlanningService.getClientMealPlans(clientId);

        return res.status(200).json({
          message: 'Meal plans retrieved successfully',
          mealPlans,
          count: mealPlans.length
        });
      }

    } catch (error) {
      console.error('Error in GET request:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to process request'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only POST and GET methods are allowed'
  });
}

export default requireAuth(handler);
