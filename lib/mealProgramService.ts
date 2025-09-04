import { supabase } from './supabase';
import { 
  MealProgram, 
  MealProgramMeal, 
  CreateMealProgramRequest, 
  UpdateMealProgramRequest,
  MealProgramResponse,
  MealProgramsResponse,
  isValidTimeFormat
} from '../types/mealPrograms';

export class MealProgramService {
  
  /**
   * Create a new meal program for a client
   */
  async createMealProgram(request: CreateMealProgramRequest, nutritionistId: string): Promise<MealProgramResponse> {
    try {
      console.log('🍽️ Meal Program Service - Creating meal program:', JSON.stringify(request, null, 2));
      
      // Validate request
      if (!request.clientId || !request.name || !request.meals || request.meals.length === 0) {
        return {
          success: false,
          error: 'Missing required fields: clientId, name, and meals are required'
        };
      }

      // Validate meals
      for (const meal of request.meals) {
        if (!meal.mealName || !meal.mealTime || meal.mealOrder <= 0 || meal.mealOrder > 10) {
          return {
            success: false,
            error: `Invalid meal data: meal ${meal.mealOrder} has invalid data`
          };
        }

        if (!isValidTimeFormat(meal.mealTime)) {
          return {
            success: false,
            error: `Invalid time format for meal ${meal.mealOrder}: ${meal.mealTime}. Use 24-hour format (HH:MM)`
          };
        }

        if (meal.targetCalories && meal.targetCalories <= 0) {
          return {
            success: false,
            error: `Invalid target calories for meal ${meal.mealOrder}: must be positive`
          };
        }
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
          error: 'Access denied. Only nutritionists can create meal programs.'
        };
      }

      // Deactivate any existing active meal program for this client
      await supabase
        .from('meal_programs')
        .update({ is_active: false })
        .eq('client_id', request.clientId)
        .eq('is_active', true);

      // Create new meal program (active by default - latest one becomes active)
      const { data: mealProgram, error: programError } = await supabase
        .from('meal_programs')
        .insert({
          client_id: request.clientId,
          nutritionist_id: nutritionistId,
          name: request.name,
          description: request.description,
          is_active: true
        })
        .select()
        .single();

      if (programError || !mealProgram) {
        console.error('❌ Meal Program Service - Error creating meal program:', programError);
        return {
          success: false,
          error: 'Failed to create meal program'
        };
      }

      // Create meals for the program
      const mealsData = request.meals.map(meal => ({
        meal_program_id: mealProgram.id,
        meal_order: meal.mealOrder,
        meal_name: meal.mealName,
        meal_time: this.normalizeTimeFormat(meal.mealTime),
        target_calories: meal.targetCalories,
        meal_type: meal.mealType
      }));

      const { data: meals, error: mealsError } = await supabase
        .from('meal_program_meals')
        .insert(mealsData)
        .select();

      if (mealsError || !meals) {
        console.error('❌ Meal Program Service - Error creating meals:', mealsError);
        // Clean up the meal program if meals creation fails
        await supabase
          .from('meal_programs')
          .delete()
          .eq('id', mealProgram.id);
        
        return {
          success: false,
          error: 'Failed to create meals for the program'
        };
      }

      // Fetch the complete meal program with meals
      const completeProgram = await this.getMealProgramById(mealProgram.id, nutritionistId);
      
      console.log('✅ Meal Program Service - Meal program created successfully');
      return {
        success: true,
        data: completeProgram.data,
        message: 'Meal program created successfully'
      };

    } catch (error) {
      console.error('❌ Meal Program Service - Error in createMealProgram:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Normalize time format to HH:MM (remove seconds if present)
   */
  private normalizeTimeFormat(timeString: string): string {
    // If time is in HH:MM:SS format, convert to HH:MM
    if (timeString.includes(':')) {
      const parts = timeString.split(':');
      if (parts.length >= 2) {
        return `${parts[0]}:${parts[1]}`;
      }
    }
    return timeString;
  }

  /**
   * Format time for API response (ensure HH:MM format)
   */
  private formatTimeForResponse(timeString: string): string {
    return this.normalizeTimeFormat(timeString);
  }

  /**
   * Get meal program by ID
   */
  async getMealProgramById(programId: string, nutritionistId: string): Promise<MealProgramResponse> {
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
          error: 'Access denied. Only nutritionists can access meal programs.'
        };
      }

      const { data: mealProgram, error: programError } = await supabase
        .from('meal_programs')
        .select('*')
        .eq('id', programId)
        .eq('nutritionist_id', nutritionistId)
        .single();

      if (programError || !mealProgram) {
        return {
          success: false,
          error: 'Meal program not found or access denied'
        };
      }

      // Get meals for this program
      const { data: meals, error: mealsError } = await supabase
        .from('meal_program_meals')
        .select('*')
        .eq('meal_program_id', programId)
        .order('meal_order');

      if (mealsError) {
        console.error('❌ Meal Program Service - Error fetching meals:', mealsError);
        return {
          success: false,
          error: 'Failed to fetch meals'
        };
      }

      const completeProgram: MealProgram = {
        id: mealProgram.id,
        clientId: mealProgram.client_id,
        nutritionistId: mealProgram.nutritionist_id,
        name: mealProgram.name,
        description: mealProgram.description,
        isActive: mealProgram.is_active,
        createdAt: mealProgram.created_at,
        updatedAt: mealProgram.updated_at,
        meals: meals.map(meal => ({
          id: meal.id,
          mealProgramId: meal.meal_program_id,
          mealOrder: meal.meal_order,
          mealName: meal.meal_name,
          mealTime: this.formatTimeForResponse(meal.meal_time),
          targetCalories: meal.target_calories,
          mealType: meal.meal_type,
          createdAt: meal.created_at,
          updatedAt: meal.updated_at
        }))
      };

      return {
        success: true,
        data: completeProgram
      };

    } catch (error) {
      console.error('❌ Meal Program Service - Error in getMealProgramById:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get active meal program for a client
   */
  async getActiveMealProgram(clientId: string, nutritionistId: string): Promise<MealProgramResponse> {
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
          error: 'Access denied. Only nutritionists can access meal programs.'
        };
      }

      const { data: mealProgram, error: programError } = await supabase
        .from('meal_programs')
        .select('*')
        .eq('client_id', clientId)
        .eq('nutritionist_id', nutritionistId)
        .eq('is_active', true)
        .single();

      if (programError || !mealProgram) {
        return {
          success: false,
          error: 'No active meal program found for this client'
        };
      }

      return this.getMealProgramById(mealProgram.id, nutritionistId);

    } catch (error) {
      console.error('❌ Meal Program Service - Error in getActiveMealProgram:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Get all meal programs for a client
   */
  async getMealProgramsForClient(clientId: string, nutritionistId: string): Promise<MealProgramsResponse> {
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
          error: 'Access denied. Only nutritionists can access meal programs.'
        };
      }

      const { data: mealPrograms, error: programsError } = await supabase
        .from('meal_programs')
        .select('*')
        .eq('client_id', clientId)
        .eq('nutritionist_id', nutritionistId)
        .order('created_at', { ascending: false });

      if (programsError) {
        console.error('❌ Meal Program Service - Error fetching meal programs:', programsError);
        return {
          success: false,
          error: 'Failed to fetch meal programs'
        };
      }

      const completePrograms: MealProgram[] = [];

      for (const program of mealPrograms) {
        const completeProgram = await this.getMealProgramById(program.id, nutritionistId);
        if (completeProgram.success && completeProgram.data) {
          completePrograms.push(completeProgram.data);
        }
      }

      return {
        success: true,
        data: completePrograms
      };

    } catch (error) {
      console.error('❌ Meal Program Service - Error in getMealProgramsForClient:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }



  /**
   * Delete a meal program
   */
  async deleteMealProgram(programId: string, nutritionistId: string): Promise<MealProgramResponse> {
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
          error: 'Access denied. Only nutritionists can access meal programs.'
        };
      }

      // Check if program exists and belongs to nutritionist
      const { data: existingProgram, error: checkError } = await supabase
        .from('meal_programs')
        .select('id')
        .eq('id', programId)
        .eq('nutritionist_id', nutritionistId)
        .single();

      if (checkError || !existingProgram) {
        return {
          success: false,
          error: 'Meal program not found or access denied'
        };
      }

      // Delete meals first (cascade should handle this, but being explicit)
      const { error: mealsError } = await supabase
        .from('meal_program_meals')
        .delete()
        .eq('meal_program_id', programId);

      if (mealsError) {
        console.error('❌ Meal Program Service - Error deleting meals:', mealsError);
        return {
          success: false,
          error: 'Failed to delete meals'
        };
      }

      // Delete the program
      const { error: programError } = await supabase
        .from('meal_programs')
        .delete()
        .eq('id', programId);

      if (programError) {
        console.error('❌ Meal Program Service - Error deleting program:', programError);
        return {
          success: false,
          error: 'Failed to delete meal program'
        };
      }

      console.log('✅ Meal Program Service - Meal program deleted successfully');
      return {
        success: true,
        message: 'Meal program deleted successfully'
      };

    } catch (error) {
      console.error('❌ Meal Program Service - Error in deleteMealProgram:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Update an existing meal program
   */
  async updateMealProgram(programId: string, nutritionistId: string, updateData: UpdateMealProgramRequest): Promise<MealProgramResponse> {
    try {
      console.log('🍽️ Meal Program Service - Updating meal program:', programId);
      console.log('🍽️ Meal Program Service - Update data:', JSON.stringify(updateData, null, 2));

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
          error: 'Access denied. Only nutritionists can update meal programs.'
        };
      }

      // Check if program exists and belongs to nutritionist
      const { data: existingProgram, error: checkError } = await supabase
        .from('meal_programs')
        .select('id, client_id')
        .eq('id', programId)
        .eq('nutritionist_id', nutritionistId)
        .single();

      if (checkError || !existingProgram) {
        return {
          success: false,
          error: 'Meal program not found or access denied'
        };
      }

      // Validate meals
      if (updateData.meals) {
        for (const meal of updateData.meals) {
          if (!meal.mealName || !meal.mealTime || meal.mealOrder <= 0 || meal.mealOrder > 10) {
            return {
              success: false,
              error: `Invalid meal data: meal ${meal.mealOrder} has invalid data`
            };
          }

          if (!isValidTimeFormat(meal.mealTime)) {
            return {
              success: false,
              error: `Invalid time format for meal ${meal.mealOrder}: ${meal.mealTime}. Use 24-hour format (HH:MM)`
            };
          }

          if (meal.targetCalories && meal.targetCalories <= 0) {
            return {
              success: false,
              error: `Invalid target calories for meal ${meal.mealOrder}: must be positive`
            };
          }
        }
      }

      // Start a transaction
      const { error: updateProgramError } = await supabase
        .from('meal_programs')
        .update({
          name: updateData.name,
          description: updateData.description,
          updated_at: new Date().toISOString()
        })
        .eq('id', programId);

      if (updateProgramError) {
        console.error('❌ Meal Program Service - Error updating meal program:', updateProgramError);
        return {
          success: false,
          error: 'Failed to update meal program'
        };
      }

      // Delete existing meals
      const { error: deleteMealsError } = await supabase
        .from('meal_program_meals')
        .delete()
        .eq('meal_program_id', programId);

      if (deleteMealsError) {
        console.error('❌ Meal Program Service - Error deleting existing meals:', deleteMealsError);
        return {
          success: false,
          error: 'Failed to update meal program meals'
        };
      }

      // Insert new meals
      if (updateData.meals) {
        const mealsToInsert = updateData.meals.map(meal => ({
          meal_program_id: programId,
          meal_order: meal.mealOrder,
          meal_name: meal.mealName,
          meal_time: meal.mealTime,
          target_calories: meal.targetCalories,
          meal_type: meal.mealType
        }));

        const { error: insertMealsError } = await supabase
          .from('meal_program_meals')
          .insert(mealsToInsert);

        if (insertMealsError) {
          console.error('❌ Meal Program Service - Error inserting new meals:', insertMealsError);
          return {
            success: false,
            error: 'Failed to update meal program meals'
          };
        }
      }



      // Fetch updated program
      const updatedProgram = await this.getMealProgramById(programId, nutritionistId);
      
      console.log('✅ Meal Program Service - Meal program updated successfully');
      return {
        success: true,
        data: updatedProgram.data,
        message: 'Meal program updated successfully'
      };

    } catch (error) {
      console.error('❌ Meal Program Service - Error in updateMealProgram:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }

  /**
   * Activate a meal program (deactivates others)
   */
  async activateMealProgram(programId: string, nutritionistId: string): Promise<MealProgramResponse> {
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
          error: 'Access denied. Only nutritionists can access meal programs.'
        };
      }

      // Check if program exists and belongs to nutritionist
      const { data: existingProgram, error: checkError } = await supabase
        .from('meal_programs')
        .select('id, client_id')
        .eq('id', programId)
        .eq('nutritionist_id', nutritionistId)
        .single();

      if (checkError || !existingProgram) {
        return {
          success: false,
          error: 'Meal program not found or access denied'
        };
      }

      // Deactivate all other programs for this client
      const { error: deactivateError } = await supabase
        .from('meal_programs')
        .update({ is_active: false })
        .eq('client_id', existingProgram.client_id)
        .neq('id', programId);

      if (deactivateError) {
        console.error('❌ Meal Program Service - Error deactivating other programs:', deactivateError);
        return {
          success: false,
          error: 'Failed to activate meal program'
        };
      }

      // Activate the selected program
      const { error: activateError } = await supabase
        .from('meal_programs')
        .update({ is_active: true })
        .eq('id', programId);

      if (activateError) {
        console.error('❌ Meal Program Service - Error activating program:', activateError);
        return {
          success: false,
          error: 'Failed to activate meal program'
        };
      }

      // Fetch updated program
      const updatedProgram = await this.getMealProgramById(programId, nutritionistId);
      
      console.log('✅ Meal Program Service - Meal program activated successfully');
      return {
        success: true,
        data: updatedProgram.data,
        message: 'Meal program activated successfully'
      };

    } catch (error) {
      console.error('❌ Meal Program Service - Error in activateMealProgram:', error);
      return {
        success: false,
        error: 'Internal server error'
      };
    }
  }
}
