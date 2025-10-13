import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealProgramService } from '../../lib/mealProgramService';
import { ClientGoalsService } from '../../lib/clientGoalsService';

const mealProgramService = new MealProgramService();
const clientGoalsService = new ClientGoalsService();

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

      // Validate request type for meal-program
      if (type !== 'meal-program') {
        return res.status(400).json({
          error: 'Invalid request type',
          message: 'Expected type: meal-program or client-goal'
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

