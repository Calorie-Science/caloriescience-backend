import { VercelRequest, VercelResponse } from '@vercel/node';
import { MealPlanningService, MealPlanGenerationRequest } from '../../lib/mealPlanningService';
import { MealProgramService } from '../../lib/mealProgramService';
import { ClientGoalsService } from '../../lib/clientGoalsService';
import { AsyncMealPlanService } from '../../lib/asyncMealPlanService';
import { requireAuth } from '../../lib/auth';

const mealPlanningService = new MealPlanningService();
const mealProgramService = new MealProgramService();
const clientGoalsService = new ClientGoalsService();
const asyncMealPlanService = new AsyncMealPlanService();

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
          action = 'save', // 'preview', 'save', 'update', 'activate', 'async-generate' (for meal-plan type)
          clientId,
          planDate,
          planType = 'daily',
          dietaryRestrictions = [],
          cuisinePreferences = [],
          mealPreferences = {},
          targetCalories,
          macroTargets = null, // New field for macro targets
          // Multi-day meal plan fields
          days = 1, // Number of days for the meal plan (1-30)
          startDate = planDate, // Start date for multi-day plans (defaults to planDate for backward compatibility)
          // Override fields for UI-driven meal plan generation
          overrideMealProgram = null, // Override meal program data from UI
          overrideClientGoals = null, // Override client goals data from UI
          // Async generation fields
          additionalText, // Additional text for AI Assistant
          aiModel = 'openai', // AI model to use: 'openai', 'claude', or 'gemini'
          aiProvider, // Alias for aiModel (same behavior)
          // Meal program fields
          name,
          description,
          meals,
          // Edit fields
          mealProgramId, // For editing meal programs
          mealPlanId, // For editing meal plans
          isActive // For meal program activation
        } = req.body;

      // Use aiProvider as fallback for aiModel if provided
      let selectedAiModel = aiProvider || aiModel;
      
      // Map common aliases to standard values
      if (selectedAiModel === 'chatgpt') {
        selectedAiModel = 'openai';
      }

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
                           (type === 'meal-plan' && ['preview', 'save', 'async-generate'].includes(action));
      
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
          if (!meals || !Array.isArray(meals) || meals.length === 0) {
            return res.status(400).json({
              error: 'Missing required fields',
              message: 'meals array is required for updating meal programs'
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
          if (!meals || !Array.isArray(meals) || meals.length === 0) {
            return res.status(400).json({
              error: 'Missing required fields',
              message: 'meals array is required for meal programs'
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
            { clientId, meals },
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
        // Handle client goal operations - flexible upsert approach
        // Always check if goal exists first, then update or create accordingly
        {
          // Flexible client goal handling - check if exists, update if yes, create if no
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
            allergies,
            preferences,
            cuisineTypes,
            goalStartDate,
            goalEndDate,
            notes
          } = req.body;

          // First, check if client goal already exists
          const existingGoalResult = await clientGoalsService.getActiveClientGoal(clientId, user.id);
          
          if (existingGoalResult.success && existingGoalResult.data) {
            // Client goal exists - UPDATE only the provided fields
            console.log('🎯 Client goal exists, updating with provided fields only');
            
            const result = await clientGoalsService.updateClientGoal(
              existingGoalResult.data.id,
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
                allergies,
                preferences,
                cuisineTypes,
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
            // Client goal doesn't exist - CREATE with provided fields only
            // No required fields validation - allow creating with just allergies, preferences, etc.
            console.log('🎯 No client goal exists, creating new one with provided fields only');
            
            const result = await clientGoalsService.createClientGoal(
              {
                clientId,
                eerGoalCalories: eerGoalCalories || 0, // Default to 0 if not provided
                proteinGoalMin: proteinGoalMin || 0,
                proteinGoalMax: proteinGoalMax || 0,
                carbsGoalMin: carbsGoalMin || 0,
                carbsGoalMax: carbsGoalMax || 0,
                fatGoalMin: fatGoalMin || 0,
                fatGoalMax: fatGoalMax || 0,
                fiberGoalGrams,
                waterGoalLiters,
                allergies,
                preferences,
                cuisineTypes,
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
        }
      } else {
        // Meal plan type - validate action
        if (!['preview', 'save', 'save-from-preview', 'async-generate', 'multi-day-edit-ingredient', 'multi-day-delete-ingredient', 'multi-day-add-ingredient', 'create-manual', 'add-manual-meal', 'add-manual-ingredient', 'remove-manual-ingredient', 'delete-manual-meal'].includes(action)) {
          return res.status(400).json({
            error: 'Invalid action',
            message: 'action must be one of: "preview", "save", "save-from-preview", "async-generate", "multi-day-edit-ingredient", "multi-day-delete-ingredient", "multi-day-add-ingredient", "create-manual", "add-manual-meal", "add-manual-ingredient", "remove-manual-ingredient", "delete-manual-meal"'
          });
        }

        // Only validate planDate/startDate for preview and save actions
        if (['preview', 'save'].includes(action)) {
          // For multi-day plans, allow either planDate or startDate
          const effectiveDate = startDate || planDate;
          if (!effectiveDate) {
            return res.status(400).json({
              error: 'Missing required field',
              message: 'planDate or startDate is required (YYYY-MM-DD format)'
            });
          }

          // Validate date format
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(effectiveDate)) {
            return res.status(400).json({
              error: 'Invalid date format',
              message: 'Date must be in YYYY-MM-DD format'
            });
          }

          // Use effective date for processing
          const effectivePlanDate = effectiveDate;

          // Check if plan date is not in the past
          const planDateObj = new Date(effectivePlanDate);
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
          // Validate multi-day parameters
          if (days && (days < 1 || days > 30)) {
            return res.status(400).json({
              error: 'Invalid days parameter',
              message: 'Days must be between 1 and 30'
            });
          }

          // Use the effective date (startDate takes precedence over planDate)
          const effectiveStartDate = startDate || planDate;

          // Check if this is a multi-day meal plan request
          if (days && days > 1) {
            console.log(`🎯 API - Generating multi-day meal plan for ${days} days starting ${effectiveStartDate}`);
            
            // Generate multi-day meal plan
            generatedMealPlan = await mealPlanningService.generateMultiDayMealPlan(
              clientId,
              effectiveStartDate,
              days,
              dietaryRestrictions,
              cuisinePreferences,
              user.id,
              overrideMealProgram,
              overrideClientGoals
            );
            
            if (!generatedMealPlan.success) {
              return res.status(400).json({
                error: 'Multi-day meal plan generation failed',
                message: generatedMealPlan.error
              });
            }
            
            // Always save multi-day meal plans as drafts
            return res.status(200).json({
              success: true,
              message: `${days}-day meal plan generated successfully`,
              data: generatedMealPlan.data
            });
          }

          // Single-day meal plan logic (existing)
          // Check if UI provided override meal program, otherwise check if client has a meal program
          const hasOverrideMealProgram = overrideMealProgram && overrideMealProgram.meals && overrideMealProgram.meals.length > 0;
          
          let clientMealProgram = null;
          if (!hasOverrideMealProgram) {
            const { data } = await require('../../lib/supabase').supabase
              .from('meal_programs')
              .select('id')
              .eq('client_id', clientId)
              .single();
            clientMealProgram = data;
          }
          
          if (hasOverrideMealProgram || clientMealProgram) {
            console.log('🎯 API - Using program-based meal planning with overrides:', {
              hasOverrideMealProgram,
              hasClientMealProgram: !!clientMealProgram,
              hasOverrideClientGoals: !!overrideClientGoals
            });
            
            // Generate meal plan based on meal program (with possible overrides)
            generatedMealPlan = await mealPlanningService.generateMealPlanFromProgramWithOverrides(
              clientId,
              effectiveStartDate,
              dietaryRestrictions,
              cuisinePreferences,
              user.id,
              overrideMealProgram,
              overrideClientGoals
            );
            
            if (!generatedMealPlan.success) {
              return res.status(400).json({
                error: 'Meal plan generation failed',
                message: generatedMealPlan.error
              });
            }
            
            // Always save program-based meal plans as drafts
            console.log('🎯 API - Returning program-based meal plan response with data:', JSON.stringify(generatedMealPlan.data, null, 2));
            console.log('🎯 API - PreviewId in mealPlan:', generatedMealPlan.data?.mealPlan?.previewId);
            return res.status(200).json({
              success: true,
              message: 'Meal plan generated successfully',
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
            console.log('🎯 API - No meal program found, using standard meal planning with possible overrides');
            
            // Check if UI provided override client goals for standard meal planning
            let effectiveTargetCalories = targetCalories;
            let effectiveMacroTargets = macroTargets;
            
            if (overrideClientGoals) {
              console.log('🎯 API - Using override client goals for standard meal planning');
              effectiveTargetCalories = overrideClientGoals.eerGoalCalories || targetCalories;
              effectiveMacroTargets = {
                protein: { 
                  min: overrideClientGoals.proteinGoalMin || 0, 
                  max: overrideClientGoals.proteinGoalMax || 0 
                },
                fat: { 
                  min: overrideClientGoals.fatGoalMin || 0, 
                  max: overrideClientGoals.fatGoalMax || 0 
                },
                carbs: { 
                  min: overrideClientGoals.carbsGoalMin || 0, 
                  max: overrideClientGoals.carbsGoalMax || 0 
                }
              };
            }
            
            // Generate meal plan using standard method
            const mealPlanRequest: MealPlanGenerationRequest = {
              clientId,
              planDate: effectiveStartDate,
              planType,
              dietaryRestrictions,
              cuisinePreferences,
              mealPreferences,
              targetCalories: effectiveTargetCalories,
              macroTargets: effectiveMacroTargets
            };

            console.log('🔍 API Debug - User ID from JWT:', user.id);
            console.log('🔍 API Debug - User object:', JSON.stringify(user, null, 2));
            console.log('🔍 API Debug - Effective meal plan request:', JSON.stringify(mealPlanRequest, null, 2));
            
            // Use a simple user ID for Edamam instead of the UUID
            const edamamUserId = 'nutritionist1';
            console.log('🔍 API Debug - Using Edamam User ID:', edamamUserId);
            console.log('🚨 TEST DEBUG - This should appear in logs!');
            
            generatedMealPlan = await mealPlanningService.generateMealPlan(mealPlanRequest, user.id);
          }

          // Always save meal plans as drafts (remove temporary preview functionality)
          try {
            const planId = await mealPlanningService.saveMealPlan(generatedMealPlan);

            // Return the generated meal plan with the new ID
            const savedMealPlan = await mealPlanningService.getMealPlan(planId);

            return res.status(200).json({
              success: true,
              message: 'Meal plan generated successfully',
              data: {
                mealPlan: savedMealPlan
              }
            });
          } catch (saveError) {
            console.error('❌ Error saving meal plan:', saveError);
            const errorLine = saveError instanceof Error ? saveError.stack?.split('\n')[1] : 'Unknown line';
            return res.status(400).json({
              success: false,
              error: 'Failed to save meal plan',
              message: saveError instanceof Error ? saveError.message : 'Unknown error occurred while saving meal plan',
              details: {
                error: saveError,
                stack: saveError instanceof Error ? saveError.stack : undefined,
                errorLine: errorLine,
                generatedMealPlan: {
                  clientId: generatedMealPlan?.clientId,
                  nutritionistId: generatedMealPlan?.nutritionistId,
                  planName: generatedMealPlan?.planName,
                  mealsCount: generatedMealPlan?.meals?.length || 0
                }
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
        } else if (action === 'async-generate') {
          // Start async meal plan generation with OpenAI Assistant
          console.log('🤖 Starting async meal plan generation for client:', clientId);
          
          // Get client goals for async generation, or use default guidelines
          const goalsResponse = await clientGoalsService.getActiveClientGoal(clientId, user.id);
          let clientGoals = goalsResponse.data;
          
          // If no client goals found, use default nutritional guidelines
          if (!goalsResponse.success || !goalsResponse.data) {
            console.log('🤖 No client goals found, using default nutritional guidelines');
            clientGoals = {
              eerGoalCalories: 2000, // Average adult calorie needs
              proteinGoalMin: 50,    // Minimum protein (0.8g per kg body weight for average 60kg person)
              proteinGoalMax: 100,    // Maximum protein (1.6g per kg body weight)
              carbsGoalMin: 200,     // Minimum carbs (40% of calories)
              carbsGoalMax: 300,     // Maximum carbs (60% of calories)
              fatGoalMin: 44,        // Minimum fat (20% of calories)
              fatGoalMax: 78,        // Maximum fat (35% of calories)
              fiberGoalGrams: 25,    // Recommended daily fiber
              waterGoalLiters: 2.5,  // Recommended daily water intake
              allergies: [],
              preferences: [],
              cuisineTypes: [],
              notes: 'Generated using general nutritional guidelines'
            };
          }

          // Start async generation
           const asyncResult = await asyncMealPlanService.startGeneration(
             clientId,
             user.id,
             clientGoals,
             additionalText,
             selectedAiModel
           );

          if (!asyncResult.success) {
            return res.status(500).json({
              error: asyncResult.error || 'Failed to start async meal plan generation'
            });
          }

          // Return preview ID immediately - UI can use this to check status
          return res.status(200).json({
            success: true,
            message: 'Async meal plan generation started',
            data: {
              mealPlan: {
                id: asyncResult.data?.id, // This is the preview ID
                status: 'preview',
                clientId: clientId,
                nutritionistId: user.id,
                estimatedCompletionTime: '2-3 minutes'
              }
            }
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
        } else if (action === 'multi-day-edit-ingredient') {
          const { mealPlanId, dayNumber, mealOrder, ingredientIndex, newIngredientText, previewId } = req.body;

          if ((!mealPlanId && !previewId) || dayNumber === undefined || mealOrder === undefined || ingredientIndex === undefined || !newIngredientText) {
            return res.status(400).json({ error: 'Missing required fields for ingredient edit' });
          }

          // Check if this is a preview edit (has previewId) or saved meal edit
          let result;
          if (previewId) {
            // Edit preview meal ingredient
            result = await mealPlanningService.editPreviewMealIngredientMultiDay(previewId, dayNumber, mealOrder, ingredientIndex, newIngredientText);
          } else {
            // Edit saved meal ingredient
            result = await mealPlanningService.editSavedMealIngredientMultiDay(mealPlanId, dayNumber, mealOrder, ingredientIndex, newIngredientText);
          }

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Meal ingredient edited successfully',
            data: result.data
          });
        } else if (action === 'multi-day-delete-ingredient') {
          const { mealPlanId, dayNumber, mealOrder, ingredientIndex, previewId } = req.body;

          if ((!mealPlanId && !previewId) || dayNumber === undefined || mealOrder === undefined || ingredientIndex === undefined) {
            return res.status(400).json({ error: 'Missing required fields for ingredient delete. Need either mealPlanId or previewId, plus dayNumber, mealOrder, and ingredientIndex' });
          }

          // Use previewId if provided, otherwise use mealPlanId
          const targetId = previewId || mealPlanId;
          
          // Delete preview meal ingredient (works for both preview and saved meal plans)
          const result = await mealPlanningService.deletePreviewMealIngredientMultiDay(targetId, dayNumber, mealOrder, ingredientIndex);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Meal ingredient deleted successfully',
            data: result.data
          });
        } else if (action === 'multi-day-add-ingredient') {
          const { mealPlanId, dayNumber, mealOrder, newIngredientText, previewId } = req.body;

          if ((!mealPlanId && !previewId) || dayNumber === undefined || mealOrder === undefined || !newIngredientText) {
            return res.status(400).json({ error: 'Missing required fields for ingredient add. Need either mealPlanId or previewId, plus dayNumber, mealOrder, and newIngredientText' });
          }

          // Use previewId if provided, otherwise use mealPlanId
          const targetId = previewId || mealPlanId;
          
          // Add preview meal ingredient (works for both preview and saved meal plans)
          const result = await mealPlanningService.addPreviewMealIngredientMultiDay(targetId, dayNumber, mealOrder, newIngredientText);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Meal ingredient added successfully',
            data: result.data
          });
        } else if (action === 'create-manual') {
          const { planName, planDate, planType } = req.body;

          if (!planName || !planDate) {
            return res.status(400).json({ error: 'planName and planDate are required for manual meal plan creation' });
          }

          const result = await mealPlanningService.createManualMealPlan(clientId, user.id, planName, planDate, planType);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(201).json({
            message: 'Manual meal plan created successfully',
            data: result.data
          });
        } else if (action === 'add-manual-meal') {
          const { mealPlanId, mealType, recipeName, servings, cookingInstructions } = req.body;

          if (!mealPlanId || !mealType || !recipeName) {
            return res.status(400).json({ error: 'mealPlanId, mealType, and recipeName are required' });
          }

          const result = await mealPlanningService.addManualMeal(mealPlanId, mealType, recipeName, servings, cookingInstructions);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Manual meal added successfully',
            data: result.data
          });
        } else if (action === 'add-manual-ingredient') {
          const { mealPlanId, mealId, ingredientText } = req.body;

          if (!mealPlanId || !mealId || !ingredientText) {
            return res.status(400).json({ error: 'mealPlanId, mealId, and ingredientText are required' });
          }

          const result = await mealPlanningService.addIngredientToManualMeal(mealPlanId, mealId, ingredientText);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Ingredient added to manual meal successfully',
            data: result.data
          });
        } else if (action === 'remove-manual-ingredient') {
          const { mealPlanId, mealId, ingredientIndex } = req.body;

          if (!mealPlanId || !mealId || ingredientIndex === undefined) {
            return res.status(400).json({ error: 'mealPlanId, mealId, and ingredientIndex are required' });
          }

          const result = await mealPlanningService.removeIngredientFromManualMeal(mealPlanId, mealId, ingredientIndex);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Ingredient removed from manual meal successfully',
            data: result.data
          });
        } else if (action === 'delete-manual-meal') {
          const { mealPlanId, mealId } = req.body;

          if (!mealPlanId || !mealId) {
            return res.status(400).json({ error: 'mealPlanId and mealId are required' });
          }

          const result = await mealPlanningService.deleteManualMeal(mealPlanId, mealId);

          if (!result.success) {
            return res.status(400).json({ error: result.error });
          }

          return res.status(200).json({
            message: 'Manual meal deleted successfully',
            data: result.data
          });
        } else {
          // Always save meal plans as drafts (remove temporary preview functionality)
          try {
            const planId = await mealPlanningService.saveMealPlan(generatedMealPlan);

            // Return the generated meal plan with the new ID
            const savedMealPlan = await mealPlanningService.getMealPlan(planId);

            return res.status(200).json({
              success: true,
              message: 'Meal plan generated successfully',
              data: {
                mealPlan: savedMealPlan
              }
            });
          } catch (saveError) {
            console.error('❌ Error saving meal plan:', saveError);
            const errorLine = saveError instanceof Error ? saveError.stack?.split('\n')[1] : 'Unknown line';
            return res.status(400).json({
              success: false,
              error: 'Failed to save meal plan',
              message: saveError instanceof Error ? saveError.message : 'Unknown error occurred while saving meal plan',
              details: {
                error: saveError,
                stack: saveError instanceof Error ? saveError.stack : undefined,
                errorLine: errorLine,
                generatedMealPlan: {
                  clientId: generatedMealPlan?.clientId,
                  nutritionistId: generatedMealPlan?.nutritionistId,
                  planName: generatedMealPlan?.planName,
                  mealsCount: generatedMealPlan?.meals?.length || 0
                }
              }
            });
          }
        }
      }

    } catch (error) {
      console.error('❌ Error in POST request:', error);
      
      // Check if this is the specific Edamam error
      if (error instanceof Error && error.message === 'Unable to fetch meals from food database') {
        return res.status(400).json({
          success: false,
          error: 'Meal planning failed',
          message: 'Unable to fetch meals from food database'
        });
      }
      
      const errorDetails = {
        message: error instanceof Error ? error.message : 'Failed to process request',
        stack: error instanceof Error ? error.stack : undefined,
        line: error instanceof Error ? error.stack?.split('\n')[1] : undefined,
        fullError: error
      };
      return res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: errorDetails.message,
        details: errorDetails
      });
    }
  }

  // GET - Handle different modes: meal plans or meal programs
  if (req.method === 'GET') {
    try {
      const { 
        clientId, 
        mode = 'meal-plans', 
        mealPlanId, 
        view = 'consolidated', // 'consolidated', 'day-wise', 'day'
        day 
      } = req.query;

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
      } else if (mode === 'meal-plan-detail' && mealPlanId) {
        // Get specific meal plan with different view options
        const mealPlanIdParam = Array.isArray(mealPlanId) ? mealPlanId[0] : mealPlanId;
        const dayParam = Array.isArray(day) ? day[0] : day;
        
        // Check if this is a preview meal plan (starts with "preview-")
        if (mealPlanIdParam.startsWith('preview-')) {
          console.log(`🔍 PREVIEW MEAL PLAN REQUEST: ${mealPlanIdParam}`);
          
          // For preview meal plans, we need to regenerate them since they're not stored in DB
          // This is a limitation - preview meal plans are not persisted
          return res.status(400).json({
            error: 'Preview meal plans not supported for consolidated view',
            message: 'Preview meal plans are temporary and not stored in the database. Please save the meal plan first to retrieve consolidated view, or regenerate the preview with the same parameters.'
          });
        }
        
        const result = await mealPlanningService.getMealPlanWithView(mealPlanIdParam, view as string, dayParam ? parseInt(dayParam) : undefined);

        if (!result.success) {
          return res.status(400).json({
            error: 'Failed to fetch meal plan',
            message: result.error
          });
        }

        return res.status(200).json({
          success: true,
          data: result.data,
          message: `Meal plan fetched successfully (${view} view)`
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
