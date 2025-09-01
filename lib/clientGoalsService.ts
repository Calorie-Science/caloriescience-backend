import { supabase } from './supabase';
import { 
  ClientGoal, 
  CreateClientGoalRequest, 
  UpdateClientGoalRequest,
  ClientGoalResponse,
  ClientGoalsResponse,
  validateMacroPercentages
} from '../types/clientGoals';

export class ClientGoalsService {
  
  /**
   * Create a new client goal
   */
  async createClientGoal(request: CreateClientGoalRequest, nutritionistId: string): Promise<ClientGoalResponse> {
    try {
      console.log('🎯 Client Goals Service - Creating client goal:', JSON.stringify(request, null, 2));
      
      // Validate request
      if (!request.clientId || !request.eerGoalCalories || !request.bmrGoalCalories) {
        return {
          success: false,
          error: 'Missing required fields: clientId, eerGoalCalories, and bmrGoalCalories are required'
        };
      }

      // Validate macro percentages
      if (!validateMacroPercentages(request.proteinGoalPercentage, request.carbsGoalPercentage, request.fatGoalPercentage)) {
        return {
          success: false,
          error: 'Invalid macro percentages: protein + carbs + fat must equal 100%'
        };
      }

      // Check if client exists and belongs to nutritionist
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, nutritionist_id')
        .eq('id', request.clientId)
        .eq('nutritionist_id', nutritionistId)
        .single();

      if (clientError || !client) {
        return {
          success: false,
          error: 'Client not found or access denied'
        };
      }

      // Validate that the user is actually a nutritionist
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', nutritionistId)
        .eq('role', 'nutritionist')
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'Access denied. Only nutritionists can create client goals.'
        };
      }

      // Deactivate any existing active goal for this client
      await supabase
        .from('client_goals')
        .update({ is_active: false })
        .eq('client_id', request.clientId)
        .eq('is_active', true);

      // Create new client goal
      const { data: clientGoal, error: goalError } = await supabase
        .from('client_goals')
        .insert({
          client_id: request.clientId,
          nutritionist_id: nutritionistId,
          eer_goal_calories: request.eerGoalCalories,
          bmr_goal_calories: request.bmrGoalCalories,
          protein_goal_grams: request.proteinGoalGrams,
          carbs_goal_grams: request.carbsGoalGrams,
          fat_goal_grams: request.fatGoalGrams,
          protein_goal_percentage: request.proteinGoalPercentage,
          carbs_goal_percentage: request.carbsGoalPercentage,
          fat_goal_percentage: request.fatGoalPercentage,
          fiber_goal_grams: request.fiberGoalGrams,
          water_goal_liters: request.waterGoalLiters,
          goal_start_date: request.goalStartDate || new Date().toISOString().split('T')[0],
          goal_end_date: request.goalEndDate,
          notes: request.notes
        })
        .select()
        .single();

      if (goalError || !clientGoal) {
        console.error('❌ Client Goals Service - Error creating client goal:', goalError);
        return {
          success: false,
          error: 'Failed to create client goal'
        };
      }

      const goal: ClientGoal = {
        id: clientGoal.id,
        clientId: clientGoal.client_id,
        nutritionistId: clientGoal.nutritionist_id,
        eerGoalCalories: clientGoal.eer_goal_calories,
        bmrGoalCalories: clientGoal.bmr_goal_calories,
        proteinGoalGrams: clientGoal.protein_goal_grams,
        carbsGoalGrams: clientGoal.carbs_goal_grams,
        fatGoalGrams: clientGoal.fat_goal_grams,
        proteinGoalPercentage: clientGoal.protein_goal_percentage,
        carbsGoalPercentage: clientGoal.carbs_goal_percentage,
        fatGoalPercentage: clientGoal.fat_goal_percentage,
        fiberGoalGrams: clientGoal.fiber_goal_grams,
        waterGoalLiters: clientGoal.water_goal_liters,
        isActive: clientGoal.is_active,
        goalStartDate: clientGoal.goal_start_date,
        goalEndDate: clientGoal.goal_end_date,
        notes: clientGoal.notes,
        createdAt: clientGoal.created_at,
        updatedAt: clientGoal.updated_at
      };

      console.log('✅ Client Goals Service - Client goal created successfully');
      return {
        success: true,
        data: goal,
        message: 'Client goal created successfully'
      };

    } catch (error) {
      console.error('❌ Client Goals Service - Error in createClientGoal:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get active client goal
   */
  async getActiveClientGoal(clientId: string, nutritionistId: string): Promise<ClientGoalResponse> {
    try {
      // Validate that the user is actually a nutritionist
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', nutritionistId)
        .eq('role', 'nutritionist')
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'Access denied. Only nutritionists can access client goals.'
        };
      }

      const { data: clientGoal, error: goalError } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('nutritionist_id', nutritionistId)
        .eq('is_active', true)
        .single();

      if (goalError || !clientGoal) {
        return {
          success: false,
          error: 'No active goal found for this client'
        };
      }

      const goal: ClientGoal = {
        id: clientGoal.id,
        clientId: clientGoal.client_id,
        nutritionistId: clientGoal.nutritionist_id,
        eerGoalCalories: clientGoal.eer_goal_calories,
        bmrGoalCalories: clientGoal.bmr_goal_calories,
        proteinGoalGrams: clientGoal.protein_goal_grams,
        carbsGoalGrams: clientGoal.carbs_goal_grams,
        fatGoalGrams: clientGoal.fat_goal_grams,
        proteinGoalPercentage: clientGoal.protein_goal_percentage,
        carbsGoalPercentage: clientGoal.carbs_goal_percentage,
        fatGoalPercentage: clientGoal.fat_goal_percentage,
        fiberGoalGrams: clientGoal.fiber_goal_grams,
        waterGoalLiters: clientGoal.water_goal_liters,
        isActive: clientGoal.is_active,
        goalStartDate: clientGoal.goal_start_date,
        goalEndDate: clientGoal.goal_end_date,
        notes: clientGoal.notes,
        createdAt: clientGoal.created_at,
        updatedAt: clientGoal.updated_at
      };

      return {
        success: true,
        data: goal
      };

    } catch (error) {
      console.error('❌ Client Goals Service - Error in getActiveClientGoal:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get all client goals for a client
   */
  async getClientGoals(clientId: string, nutritionistId: string): Promise<ClientGoalsResponse> {
    try {
      // Validate that the user is actually a nutritionist
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id, role')
        .eq('id', nutritionistId)
        .eq('role', 'nutritionist')
        .single();

      if (userError || !user) {
        return {
          success: false,
          error: 'Access denied. Only nutritionists can access client goals.'
        };
      }

      const { data: clientGoals, error: goalsError } = await supabase
        .from('client_goals')
        .select('*')
        .eq('client_id', clientId)
        .eq('nutritionist_id', nutritionistId)
        .order('created_at', { ascending: false });

      if (goalsError) {
        console.error('❌ Client Goals Service - Error fetching client goals:', goalsError);
        return {
          success: false,
          error: 'Failed to fetch client goals'
        };
      }

      const goals: ClientGoal[] = clientGoals.map(clientGoal => ({
        id: clientGoal.id,
        clientId: clientGoal.client_id,
        nutritionistId: clientGoal.nutritionist_id,
        eerGoalCalories: clientGoal.eer_goal_calories,
        bmrGoalCalories: clientGoal.bmr_goal_calories,
        proteinGoalGrams: clientGoal.protein_goal_grams,
        carbsGoalGrams: clientGoal.carbs_goal_grams,
        fatGoalGrams: clientGoal.fat_goal_grams,
        proteinGoalPercentage: clientGoal.protein_goal_percentage,
        carbsGoalPercentage: clientGoal.carbs_goal_percentage,
        fatGoalPercentage: clientGoal.fat_goal_percentage,
        fiberGoalGrams: clientGoal.fiber_goal_grams,
        waterGoalLiters: clientGoal.water_goal_liters,
        isActive: clientGoal.is_active,
        goalStartDate: clientGoal.goal_start_date,
        goalEndDate: clientGoal.goal_end_date,
        notes: clientGoal.notes,
        createdAt: clientGoal.created_at,
        updatedAt: clientGoal.updated_at
      }));

      return {
        success: true,
        data: goals
      };

    } catch (error) {
      console.error('❌ Client Goals Service - Error in getClientGoals:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }
}
