import { supabase } from './supabase';
import { 
  ClientGoal, 
  CreateClientGoalRequest, 
  UpdateClientGoalRequest,
  ClientGoalResponse,
  ClientGoalsResponse,
  validateMacroRanges
} from '../types/clientGoals';

export class ClientGoalsService {
  
  /**
   * Create a new client goal
   */
  async createClientGoal(request: CreateClientGoalRequest, nutritionistId: string): Promise<ClientGoalResponse> {
    try {
      console.log('🎯 Client Goals Service - Creating client goal:', JSON.stringify(request, null, 2));
      
      // Validate request
      if (!request.clientId || !request.eerGoalCalories) {
        return {
          success: false,
          error: 'Missing required fields: clientId and eerGoalCalories are required'
        };
      }

      // Validate macro ranges
      if (!validateMacroRanges(
        request.proteinGoalMin, request.proteinGoalMax,
        request.carbsGoalMin, request.carbsGoalMax,
        request.fatGoalMin, request.fatGoalMax
      )) {
        return {
          success: false,
          error: 'Invalid macro ranges: min values must be less than max values and all values must be positive'
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

      // Try to create the goal with retry logic to handle race conditions
      let clientGoal: any = null;
      let goalError: any = null;
      let retryCount = 0;
      const maxRetries = 3;

      while (retryCount < maxRetries) {
        try {
          // Deactivate any existing active goal for this client
          await supabase
            .from('client_goals')
            .update({ is_active: false })
            .eq('client_id', request.clientId)
            .eq('is_active', true);

          // Create new client goal
          const result = await supabase
            .from('client_goals')
            .insert({
              client_id: request.clientId,
              nutritionist_id: nutritionistId,
              eer_goal_calories: request.eerGoalCalories,
              protein_goal_min: request.proteinGoalMin,
              protein_goal_max: request.proteinGoalMax,
              carbs_goal_min: request.carbsGoalMin,
              carbs_goal_max: request.carbsGoalMax,
              fat_goal_min: request.fatGoalMin,
              fat_goal_max: request.fatGoalMax,
              fiber_goal_grams: request.fiberGoalGrams,
              water_goal_liters: request.waterGoalLiters,
              goal_start_date: request.goalStartDate || new Date().toISOString().split('T')[0],
              goal_end_date: request.goalEndDate,
              notes: request.notes
            })
            .select()
            .single();

          clientGoal = result.data;
          goalError = result.error;
          break; // Success, exit retry loop
        } catch (error: any) {
          // Check if it's a unique constraint violation
          if (error.code === '23505' && error.message.includes('client_goals_client_id_is_active_key')) {
            retryCount++;
            if (retryCount < maxRetries) {
              console.log(`🔄 Client Goals Service - Retry ${retryCount} due to constraint violation`);
              await new Promise(resolve => setTimeout(resolve, 100 * retryCount)); // Exponential backoff
              continue;
            }
          }
          goalError = error;
          break;
        }
      }

      if (goalError || !clientGoal) {
        console.error('❌ Client Goals Service - Error creating client goal:', goalError);
        return {
          success: false,
          error: 'Failed to create client goal'
        };
      }

      const goal: ClientGoal = {
        id: clientGoal?.id || '',
        clientId: clientGoal?.client_id || '',
        nutritionistId: clientGoal?.nutritionist_id || '',
        eerGoalCalories: clientGoal?.eer_goal_calories || 0,
        proteinGoalMin: clientGoal?.protein_goal_min || 0,
        proteinGoalMax: clientGoal?.protein_goal_max || 0,
        carbsGoalMin: clientGoal?.carbs_goal_min || 0,
        carbsGoalMax: clientGoal?.carbs_goal_max || 0,
        fatGoalMin: clientGoal?.fat_goal_min || 0,
        fatGoalMax: clientGoal?.fat_goal_max || 0,
        fiberGoalGrams: clientGoal?.fiber_goal_grams,
        waterGoalLiters: clientGoal?.water_goal_liters,
        isActive: clientGoal?.is_active || false,
        goalStartDate: clientGoal?.goal_start_date || '',
        goalEndDate: clientGoal?.goal_end_date,
        notes: clientGoal?.notes,
        createdAt: clientGoal?.created_at || '',
        updatedAt: clientGoal?.updated_at || ''
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
        id: clientGoal?.id || '',
        clientId: clientGoal?.client_id || '',
        nutritionistId: clientGoal?.nutritionist_id || '',
        eerGoalCalories: clientGoal?.eer_goal_calories || 0,
        proteinGoalMin: clientGoal?.protein_goal_min || 0,
        proteinGoalMax: clientGoal?.protein_goal_max || 0,
        carbsGoalMin: clientGoal?.carbs_goal_min || 0,
        carbsGoalMax: clientGoal?.carbs_goal_max || 0,
        fatGoalMin: clientGoal?.fat_goal_min || 0,
        fatGoalMax: clientGoal?.fat_goal_max || 0,
        fiberGoalGrams: clientGoal?.fiber_goal_grams,
        waterGoalLiters: clientGoal?.water_goal_liters,
        isActive: clientGoal?.is_active || false,
        goalStartDate: clientGoal?.goal_start_date || '',
        goalEndDate: clientGoal?.goal_end_date,
        notes: clientGoal?.notes,
        createdAt: clientGoal?.created_at || '',
        updatedAt: clientGoal?.updated_at || ''
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
        id: clientGoal?.id || '',
        clientId: clientGoal?.client_id || '',
        nutritionistId: clientGoal?.nutritionist_id || '',
        eerGoalCalories: clientGoal?.eer_goal_calories || 0,
        proteinGoalMin: clientGoal?.protein_goal_min || 0,
        proteinGoalMax: clientGoal?.protein_goal_max || 0,
        carbsGoalMin: clientGoal?.carbs_goal_min || 0,
        carbsGoalMax: clientGoal?.carbs_goal_max || 0,
        fatGoalMin: clientGoal?.fat_goal_min || 0,
        fatGoalMax: clientGoal?.fat_goal_max || 0,
        fiberGoalGrams: clientGoal?.fiber_goal_grams,
        waterGoalLiters: clientGoal?.water_goal_liters,
        isActive: clientGoal?.is_active || false,
        goalStartDate: clientGoal?.goal_start_date || '',
        goalEndDate: clientGoal?.goal_end_date,
        notes: clientGoal?.notes,
        createdAt: clientGoal?.created_at || '',
        updatedAt: clientGoal?.updated_at || ''
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

  /**
   * Update an existing client goal
   */
  async updateClientGoal(goalId: string, request: UpdateClientGoalRequest, nutritionistId: string): Promise<ClientGoalResponse> {
    try {
      console.log('🎯 Client Goals Service - Updating client goal:', goalId);
      console.log('🎯 Client Goals Service - Update data:', JSON.stringify(request, null, 2));

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
          error: 'Access denied. Only nutritionists can update client goals.'
        };
      }

      // Check if goal exists and belongs to nutritionist
      const { data: existingGoal, error: checkError } = await supabase
        .from('client_goals')
        .select('id, client_id')
        .eq('id', goalId)
        .eq('nutritionist_id', nutritionistId)
        .single();

      if (checkError || !existingGoal) {
        return {
          success: false,
          error: 'Client goal not found or access denied'
        };
      }

      // Validate macro ranges if provided
      if (request.proteinGoalMin && request.proteinGoalMax && 
          request.carbsGoalMin && request.carbsGoalMax && 
          request.fatGoalMin && request.fatGoalMax) {
        if (!validateMacroRanges(
          request.proteinGoalMin, request.proteinGoalMax,
          request.carbsGoalMin, request.carbsGoalMax,
          request.fatGoalMin, request.fatGoalMax
        )) {
          return {
            success: false,
            error: 'Invalid macro ranges: min values must be less than max values and all values must be positive'
          };
        }
      }

      // Update client goal
      const updateData: any = {};
      
      if (request.eerGoalCalories !== undefined) updateData.eer_goal_calories = request.eerGoalCalories;
      if (request.proteinGoalMin !== undefined) updateData.protein_goal_min = request.proteinGoalMin;
      if (request.proteinGoalMax !== undefined) updateData.protein_goal_max = request.proteinGoalMax;
      if (request.carbsGoalMin !== undefined) updateData.carbs_goal_min = request.carbsGoalMin;
      if (request.carbsGoalMax !== undefined) updateData.carbs_goal_max = request.carbsGoalMax;
      if (request.fatGoalMin !== undefined) updateData.fat_goal_min = request.fatGoalMin;
      if (request.fatGoalMax !== undefined) updateData.fat_goal_max = request.fatGoalMax;
      if (request.fiberGoalGrams !== undefined) updateData.fiber_goal_grams = request.fiberGoalGrams;
      if (request.waterGoalLiters !== undefined) updateData.water_goal_liters = request.waterGoalLiters;
      if (request.goalStartDate !== undefined) updateData.goal_start_date = request.goalStartDate;
      if (request.goalEndDate !== undefined) updateData.goal_end_date = request.goalEndDate;
      if (request.notes !== undefined) updateData.notes = request.notes;
      
      updateData.updated_at = new Date().toISOString();

      const { data: updatedGoal, error: updateError } = await supabase
        .from('client_goals')
        .update(updateData)
        .eq('id', goalId)
        .select()
        .single();

      if (updateError || !updatedGoal) {
        console.error('❌ Client Goals Service - Error updating client goal:', updateError);
        return {
          success: false,
          error: 'Failed to update client goal'
        };
      }

      const goal: ClientGoal = {
        id: updatedGoal?.id || '',
        clientId: updatedGoal?.client_id || '',
        nutritionistId: updatedGoal?.nutritionist_id || '',
        eerGoalCalories: updatedGoal?.eer_goal_calories || 0,
        proteinGoalMin: updatedGoal?.protein_goal_min || 0,
        proteinGoalMax: updatedGoal?.protein_goal_max || 0,
        carbsGoalMin: updatedGoal?.carbs_goal_min || 0,
        carbsGoalMax: updatedGoal?.carbs_goal_max || 0,
        fatGoalMin: updatedGoal?.fat_goal_min || 0,
        fatGoalMax: updatedGoal?.fat_goal_max || 0,
        fiberGoalGrams: updatedGoal?.fiber_goal_grams,
        waterGoalLiters: updatedGoal?.water_goal_liters,
        isActive: updatedGoal?.is_active || false,
        goalStartDate: updatedGoal?.goal_start_date || '',
        goalEndDate: updatedGoal?.goal_end_date,
        notes: updatedGoal?.notes,
        createdAt: updatedGoal?.created_at || '',
        updatedAt: updatedGoal?.updated_at || ''
      };

      console.log('✅ Client Goals Service - Client goal updated successfully');
      return {
        success: true,
        data: goal,
        message: 'Client goal updated successfully'
      };

    } catch (error) {
      console.error('❌ Client Goals Service - Error in updateClientGoal:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }
}
