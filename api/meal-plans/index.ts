import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealProgramService } from '../../lib/mealProgramService';
import { ClientGoalsService } from '../../lib/clientGoalsService';
import { AsyncMealPlanService } from '../../lib/asyncMealPlanService';
import { supabase } from '../../lib/supabase';

const mealProgramService = new MealProgramService();
const clientGoalsService = new ClientGoalsService();
const asyncMealPlanService = new AsyncMealPlanService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  // Handle GET requests (fetch meal programs)
  if (req.method === 'GET') {
    try {
      const { clientId, mode } = req.query;

      // Validate required parameters
      if (!clientId || typeof clientId !== 'string') {
        return res.status(400).json({
          error: 'Missing or invalid clientId parameter',
          message: 'clientId is required'
        });
      }

      // Handle different modes
      if (mode === 'meal-programs') {
        // Get all meal programs for a client
        console.log(`📋 Fetching meal programs for client: ${clientId}`);
        const result = await mealProgramService.getMealProgramsForClient(clientId, user.id);
        
        return res.status(200).json(result);
      }

      // Default: Get active meal program for client
      console.log(`📋 Fetching active meal program for client: ${clientId}`);
      const result = await mealProgramService.getMealProgramForClient(clientId, user.id);
      
      return res.status(200).json(result);

    } catch (error) {
      console.error('❌ Error fetching meal programs:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch meal programs'
      });
    }
  }

  // Handle POST requests (create/update meal programs and client goals)
  if (req.method === 'POST') {
    try {
      const { 
        type, 
        action, 
        clientId, 
        mealProgramId, 
        meals, 
        // Client goal fields
        cuisineTypes, 
        allergies, 
        preferences,
        eerGoalCalories,
        bmrGoalCalories,
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

      // Handle client-goal type
      if (type === 'client-goal') {
        console.log(`🎯 Updating client goal for client: ${clientId}`);

        // Validate required fields
        if (!clientId) {
          return res.status(400).json({
            error: 'Missing required field',
            message: 'clientId is required'
          });
        }

        // Get the active goal for this client
        const activeGoalResult = await clientGoalsService.getActiveClientGoal(clientId, user.id);

        if (!activeGoalResult.success || !activeGoalResult.data) {
          // No active goal exists, create a new one
          console.log(`📝 No active goal found, creating new goal for client: ${clientId}`);
          
          const createResult = await clientGoalsService.createClientGoal(
            {
              clientId,
              cuisineTypes,
              allergies,
              preferences,
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

          if (!createResult.success) {
            return res.status(400).json({
              error: createResult.error || 'Failed to create client goal'
            });
          }

          return res.status(201).json(createResult);
        }

        // Update existing goal
        const updateResult = await clientGoalsService.updateClientGoal(
          activeGoalResult.data.id,
          {
            cuisineTypes,
            allergies,
            preferences,
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

        if (!updateResult.success) {
          return res.status(400).json({
            error: updateResult.error || 'Failed to update client goal'
          });
        }

        return res.status(200).json(updateResult);
      }

      // Handle async-generate action for meal-plan type
      if (type === 'meal-plan' && action === 'async-generate') {
        console.log(`🤖 Starting async meal plan generation for client: ${clientId}`);

        // Validate required fields
        if (!clientId) {
          return res.status(400).json({
            error: 'Missing required field',
            message: 'clientId is required'
          });
        }

        // Get AI model from request body (support both aiModel and aiProvider for backwards compatibility)
        // Prefer aiModel if both are provided
        let aiModel = (req.body.aiModel || req.body.aiProvider || 'claude') as string;

        // Normalize GPT variants to 'openai'
        if (['gpt', 'chatgpt', 'gpt-4', 'gpt-3.5', 'gpt-4-turbo', 'gpt-3.5-turbo'].includes(aiModel.toLowerCase())) {
          console.log(`🔄 Normalizing AI model "${aiModel}" to "openai"`);
          aiModel = 'openai';
        }

        // Cast to proper type after normalization
        const normalizedAiModel = aiModel as 'openai' | 'claude' | 'gemini' | 'grok';

        // Validate AI model
        if (!['openai', 'claude', 'gemini', 'grok'].includes(normalizedAiModel)) {
          return res.status(400).json({
            error: 'Invalid AI model',
            message: 'aiModel/aiProvider must be one of: openai, claude, gemini, grok (gpt/chatgpt variants are also accepted)'
          });
        }

        try {
          // Get active client goals
          const activeGoalResult = await clientGoalsService.getActiveClientGoal(clientId, user.id);

          let clientGoals = activeGoalResult.data;

          // If no active client goal, use EER from client's nutrition requirements
          if (!activeGoalResult.success || !activeGoalResult.data) {
            console.log('⚠️ No active client goal found, fetching EER from client data...');

            // Fetch client data with nutrition requirements
            const { data: client, error: clientError } = await supabase
              .from('clients')
              .select('*')
              .eq('id', clientId)
              .eq('nutritionist_id', user.id)
              .single();

            if (clientError || !client) {
              return res.status(400).json({
                error: 'Client not found',
                message: 'Unable to find client data'
              });
            }

            // Fetch nutrition requirements
            const { data: nutritionRequirements } = await supabase
              .from('client_nutrition_requirements')
              .select('*')
              .eq('client_id', clientId)
              .eq('is_active', true)
              .order('created_at', { ascending: false })
              .limit(1);

            const eerCalories = nutritionRequirements?.[0]?.eer_calories;

            if (!eerCalories) {
              return res.status(400).json({
                error: 'No calorie goal found',
                message: 'Please set client goals or ensure client has calculated EER'
              });
            }

            // Create minimal client goals with EER and default to 3 meals
            clientGoals = {
              id: 'default',
              clientId: clientId,
              nutritionistId: user.id,
              eerGoalCalories: eerCalories,
              proteinGoalMin: 0,
              proteinGoalMax: 0,
              carbsGoalMin: 0,
              carbsGoalMax: 0,
              fatGoalMin: 0,
              fatGoalMax: 0,
              fiberGoalGrams: undefined,
              waterGoalLiters: undefined,
              allergies: [],
              preferences: [],
              cuisineTypes: [],
              isActive: true,
              goalStartDate: new Date().toISOString().split('T')[0],
              goalEndDate: undefined,
              notes: 'Auto-generated from EER',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };

            console.log(`✅ Using EER of ${eerCalories} calories for meal plan generation`);
          }

          // Start async generation with Claude (returns complete draft in same format as automated/manual)
          const days = req.body.days || 2;
          const startDate = req.body.startDate;
          const result = await asyncMealPlanService.startGeneration(
            clientId,
            user.id,
            clientGoals,
            req.body.additionalText,
            normalizedAiModel,
            days,
            startDate
          );

          if (!result.success) {
            return res.status(500).json({
              error: result.error || 'Failed to start meal plan generation'
            });
          }

          // Return the formatted draft (same structure as automated/manual meal plans)
          return res.status(200).json({
            success: true,
            message: 'AI meal plan generated successfully',
            data: result.data
          });
        } catch (error) {
          console.error('❌ Error starting async generation:', error);
          return res.status(500).json({
            error: 'Failed to start async meal plan generation',
            message: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      // Validate request type for meal-program
      if (type !== 'meal-program') {
        return res.status(400).json({
          error: 'Invalid request type',
          message: 'Expected type: meal-program, meal-plan, or client-goal'
        });
      }

      // Handle update action
      if (action === 'update') {
        console.log(`🔄 Updating meal program: ${mealProgramId} for client: ${clientId}`);

        // Validate required fields
        if (!mealProgramId || !clientId || !meals || !Array.isArray(meals)) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: 'mealProgramId, clientId, and meals array are required'
          });
        }

        // Update the meal program
        const result = await mealProgramService.updateMealProgram(
          mealProgramId,
          user.id,
          { meals }
        );

        if (!result.success) {
          return res.status(400).json({
            error: result.error || 'Failed to update meal program'
          });
        }

        return res.status(200).json(result);
      }

      // Handle create action
      if (action === 'create') {
        console.log(`➕ Creating meal program for client: ${clientId}`);

        // Validate required fields
        if (!clientId || !meals || !Array.isArray(meals)) {
          return res.status(400).json({
            error: 'Missing required fields',
            message: 'clientId and meals array are required'
          });
        }

        // Create new meal program
        const result = await mealProgramService.createMealProgram(
          { clientId, meals },
          user.id
        );

        if (!result.success) {
          return res.status(400).json({
            error: result.error || 'Failed to create meal program'
          });
        }

        return res.status(201).json(result);
      }

      // Unknown action
      return res.status(400).json({
        error: 'Invalid action',
        message: 'Expected action: create or update'
      });

    } catch (error) {
      console.error('❌ Error handling meal program request:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to process meal program'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ 
    error: 'Method not allowed',
    message: 'Only GET and POST methods are allowed' 
  });
}

export default requireAuth(handler);

