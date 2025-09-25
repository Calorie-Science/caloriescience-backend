import { supabase } from './supabase';
import { OpenAIAssistantService, AssistantMealPlanRequest, AssistantMealPlanResponse } from './openaiAssistantService';
import { ClaudeService, ClaudeMealPlanRequest, ClaudeMealPlanResponse } from './claudeService';
import { GeminiService, GeminiMealPlanRequest, GeminiMealPlanResponse } from './geminiService';

export interface AsyncMealPlan {
  id: string;
  clientId: string;
  nutritionistId: string;
  threadId: string;
  runId: string;
  clientGoals: any;
  additionalText?: string;
  aiModel: 'openai' | 'claude' | 'gemini';
  status: 'pending' | 'completed' | 'failed';
  generatedMealPlan?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AsyncMealPlanResponse {
  success: boolean;
  data?: AsyncMealPlan;
  error?: string;
}

export class AsyncMealPlanService {
  private openaiService: OpenAIAssistantService;
  private claudeService: ClaudeService;
  private geminiService: GeminiService;

  constructor() {
    this.openaiService = new OpenAIAssistantService();
    this.claudeService = new ClaudeService();
    this.geminiService = new GeminiService();
  }

  /**
   * Get client's meal program data
   */
  private async getClientMealProgram(clientId: string): Promise<any> {
    try {
      const { data: mealProgram, error } = await supabase
        .from('meal_programs')
        .select(`
          *,
          meals:meal_program_meals(
            id,
            meal_order,
            meal_name,
            meal_time,
            target_calories,
            meal_type,
            created_at,
            updated_at
          )
        `)
        .eq('client_id', clientId)
        .single();

      if (error || !mealProgram) {
        console.log('⚠️ No meal program found for client:', clientId);
        return null;
      }

      // Transform to match expected structure
      return {
        id: mealProgram.id,
        clientId: mealProgram.client_id,
        nutritionistId: mealProgram.nutritionist_id,
        createdAt: mealProgram.created_at,
        updatedAt: mealProgram.updated_at,
        meals: mealProgram.meals.map((meal: any) => ({
          id: meal.id,
          mealOrder: meal.meal_order,
          mealName: meal.meal_name,
          mealTime: meal.meal_time,
          targetCalories: meal.target_calories,
          mealType: meal.meal_type,
          createdAt: meal.created_at,
          updatedAt: meal.updated_at
        })).sort((a: any, b: any) => a.mealOrder - b.mealOrder)
      };
    } catch (error) {
      console.error('❌ Error fetching meal program:', error);
      return null;
    }
  }

  /**
   * Start async meal plan generation and return preview ID
   */
  async startGeneration(
    clientId: string,
    nutritionistId: string,
    clientGoals: any,
    additionalText?: string,
    aiModel: 'openai' | 'claude' | 'gemini' = 'openai'
  ): Promise<AsyncMealPlanResponse> {
    try {
      console.log('🔄 Async Meal Plan Service - Starting generation for client:', clientId, 'using AI model:', aiModel);
      
      // Get client's meal program
      const mealProgram = await this.getClientMealProgram(clientId);
      console.log('🍽️ Meal program for client:', mealProgram ? `${mealProgram.meals.length} meals` : 'No meal program found');
      
      let threadId: string;
      let runId: string;
      let status: 'pending' | 'completed' | 'failed' = 'pending';
      let generatedMealPlan: any = null;

      if (aiModel === 'gemini') {
        // Gemini: Generate meal plan synchronously (fast)
        const geminiRequest: GeminiMealPlanRequest = {
          clientGoals,
          additionalText,
          clientId,
          nutritionistId,
          mealProgram
        };

        const geminiResponse = await this.geminiService.generateMealPlanSync(geminiRequest);
        
        if (!geminiResponse.success) {
          return {
            success: false,
            error: geminiResponse.error || 'Failed to generate Gemini meal plan'
          };
        }

        threadId = geminiResponse.messageId || `thread-gemini-${Date.now()}`;
        runId = `run-gemini-${Date.now()}`;
        status = 'completed';
        generatedMealPlan = geminiResponse.data;
      } else if (aiModel === 'claude') {
        // Claude: Generate meal plan synchronously (fast)
        const claudeRequest: ClaudeMealPlanRequest = {
          clientGoals,
          additionalText,
          clientId,
          nutritionistId,
          mealProgram
        };

        const claudeResponse = await this.claudeService.generateMealPlanSync(claudeRequest);
        
        if (!claudeResponse.success) {
          return {
            success: false,
            error: claudeResponse.error || 'Failed to generate Claude meal plan'
          };
        }

        threadId = claudeResponse.messageId || `thread-claude-${Date.now()}`;
        runId = `run-claude-${Date.now()}`;
        status = 'completed';
        generatedMealPlan = claudeResponse.data;
      } else {
        // Use OpenAI Assistant for async generation
        const assistantRequest: AssistantMealPlanRequest = {
          clientGoals,
          additionalText,
          clientId,
          nutritionistId,
          mealProgram
        };

        const assistantResponse = await this.openaiService.generateMealPlanAsync(assistantRequest);
        
        if (!assistantResponse.success || !assistantResponse.runId || !assistantResponse.threadId) {
          return {
            success: false,
            error: assistantResponse.error || 'Failed to start OpenAI Assistant generation'
          };
        }

        threadId = assistantResponse.threadId;
        runId = assistantResponse.runId;
      }

      // Store in database with UUID (let database generate it)
      const { data: asyncMealPlan, error: insertError } = await supabase
        .from('async_meal_plans')
        .insert({
          client_id: clientId,
          nutritionist_id: nutritionistId,
          thread_id: threadId,
          run_id: runId,
          client_goals: clientGoals,
          additional_text: additionalText,
          ai_model: aiModel,
          status: status,
          generated_meal_plan: generatedMealPlan,
          completed_at: status === 'completed' ? new Date().toISOString() : null
        })
        .select()
        .single();

      if (insertError || !asyncMealPlan) {
        console.error('❌ Failed to store async meal plan:', insertError);
        return {
          success: false,
          error: 'Failed to store generation request'
        };
      }

      console.log('✅ Async Meal Plan Service - Generation started with ID:', asyncMealPlan.id);

      return {
        success: true,
        data: this.mapDbToAsyncMealPlan(asyncMealPlan)
      };

    } catch (error) {
      console.error('❌ Async Meal Plan Service - Error starting generation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Check generation status and update if completed
   */
  async checkStatus(asyncMealPlanId: string): Promise<AsyncMealPlanResponse> {
    try {
      console.log('🔄 Async Meal Plan Service - Checking status for ID:', asyncMealPlanId);
      
      // Get the async meal plan from database
      const { data: asyncMealPlan, error: fetchError } = await supabase
        .from('async_meal_plans')
        .select('*')
        .eq('id', asyncMealPlanId)
        .single();

      if (fetchError || !asyncMealPlan) {
        return {
          success: false,
          error: 'Async meal plan not found'
        };
      }

      // If already completed or failed, return current status
      if (asyncMealPlan.status === 'completed' || asyncMealPlan.status === 'failed') {
        return {
          success: true,
          data: this.mapDbToAsyncMealPlan(asyncMealPlan)
        };
      }

      // Check with OpenAI Assistant
      const assistantResponse = await this.openaiService.checkGenerationStatus(
        asyncMealPlan.thread_id,
        asyncMealPlan.run_id
      );

      if (!assistantResponse.success) {
        // Update status to failed
        await this.updateStatus(asyncMealPlanId, 'failed', null, assistantResponse.error);
        
        return {
          success: true,
          data: {
            ...this.mapDbToAsyncMealPlan(asyncMealPlan),
            status: 'failed',
            errorMessage: assistantResponse.error
          }
        };
      }

      if (assistantResponse.status === 'completed') {
        // Update status to completed with the generated meal plan
        await this.updateStatus(asyncMealPlanId, 'completed', assistantResponse.data);
        
        return {
          success: true,
          data: {
            ...this.mapDbToAsyncMealPlan(asyncMealPlan),
            status: 'completed',
            generatedMealPlan: assistantResponse.data,
            completedAt: new Date().toISOString()
          }
        };
      } else {
        // Still pending
        return {
          success: true,
          data: this.mapDbToAsyncMealPlan(asyncMealPlan)
        };
      }

    } catch (error) {
      console.error('❌ Async Meal Plan Service - Error checking status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get async meal plan by preview ID and check if completed
   */
  async getAsyncMealPlanByPreviewId(previewId: string): Promise<AsyncMealPlanResponse> {
    try {
      console.log('🔄 Async Meal Plan Service - Getting async meal plan by preview ID:', previewId);
      
      const { data: asyncMealPlan, error } = await supabase
        .from('async_meal_plans')
        .select('*')
        .eq('id', previewId)
        .single();

      if (error || !asyncMealPlan) {
        return {
          success: false,
          error: 'Async meal plan not found'
        };
      }

      // If already completed or failed, return current status
      if (asyncMealPlan.status === 'completed' || asyncMealPlan.status === 'failed') {
        return {
          success: true,
          data: this.mapDbToAsyncMealPlan(asyncMealPlan)
        };
      }

      // Check with OpenAI Assistant if still pending
      const assistantResponse = await this.openaiService.checkGenerationStatus(
        asyncMealPlan.thread_id,
        asyncMealPlan.run_id
      );

      if (!assistantResponse.success) {
        // Update status to failed
        await this.updateStatus(previewId, 'failed', null, assistantResponse.error);
        
        return {
          success: true,
          data: {
            ...this.mapDbToAsyncMealPlan(asyncMealPlan),
            status: 'failed',
            errorMessage: assistantResponse.error
          }
        };
      }

      if (assistantResponse.status === 'completed') {
        // Update status to completed with the generated meal plan
        await this.updateStatus(previewId, 'completed', assistantResponse.data);
        
        return {
          success: true,
          data: {
            ...this.mapDbToAsyncMealPlan(asyncMealPlan),
            status: 'completed',
            generatedMealPlan: assistantResponse.data,
            completedAt: new Date().toISOString()
          }
        };
      } else {
        // Still pending
        return {
          success: true,
          data: this.mapDbToAsyncMealPlan(asyncMealPlan)
        };
      }

    } catch (error) {
      console.error('❌ Async Meal Plan Service - Error getting async meal plan by preview ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get async meal plan by ID (legacy method)
   */
  async getAsyncMealPlan(asyncMealPlanId: string): Promise<AsyncMealPlanResponse> {
    try {
      const { data: asyncMealPlan, error } = await supabase
        .from('async_meal_plans')
        .select('*')
        .eq('id', asyncMealPlanId)
        .single();

      if (error || !asyncMealPlan) {
        return {
          success: false,
          error: 'Async meal plan not found'
        };
      }

      return {
        success: true,
        data: this.mapDbToAsyncMealPlan(asyncMealPlan)
      };

    } catch (error) {
      console.error('❌ Async Meal Plan Service - Error getting async meal plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get all async meal plans for a client
   */
  async getClientAsyncMealPlans(clientId: string): Promise<{ success: boolean; data?: AsyncMealPlan[]; error?: string }> {
    try {
      const { data: asyncMealPlans, error } = await supabase
        .from('async_meal_plans')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) {
        return {
          success: false,
          error: 'Failed to fetch async meal plans'
        };
      }

      return {
        success: true,
        data: asyncMealPlans.map(this.mapDbToAsyncMealPlan)
      };

    } catch (error) {
      console.error('❌ Async Meal Plan Service - Error getting client async meal plans:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Update async meal plan status
   */
  private async updateStatus(
    asyncMealPlanId: string,
    status: 'completed' | 'failed',
    generatedMealPlan?: any,
    errorMessage?: string
  ): Promise<void> {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };

    if (status === 'completed') {
      updateData.generated_meal_plan = generatedMealPlan;
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'failed') {
      updateData.error_message = errorMessage;
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('async_meal_plans')
      .update(updateData)
      .eq('id', asyncMealPlanId);

    if (error) {
      console.error('❌ Failed to update async meal plan status:', error);
    }
  }

  /**
   * Generate Claude meal plan in background
   */
  private async generateClaudeMealPlanInBackground(
    clientId: string,
    nutritionistId: string,
    clientGoals: any,
    additionalText: string | undefined,
    threadId: string,
    runId: string
  ): Promise<void> {
    try {
      console.log('🤖 Starting Claude generation in background for thread:', threadId);
      
      // Get client's meal program
      const mealProgram = await this.getClientMealProgram(clientId);
      
      const claudeRequest: ClaudeMealPlanRequest = {
        clientGoals,
        additionalText,
        clientId,
        nutritionistId,
        mealProgram
      };

      const claudeResponse = await this.claudeService.generateMealPlan(claudeRequest);
      
      if (claudeResponse.success) {
        // Update database with completed result
        await supabase
          .from('async_meal_plans')
          .update({
            status: 'completed',
            generated_meal_plan: claudeResponse.data,
            completed_at: new Date().toISOString()
          })
          .eq('thread_id', threadId)
          .eq('run_id', runId);
        
        console.log('✅ Claude generation completed for thread:', threadId);
      } else {
        // Update database with error
        await supabase
          .from('async_meal_plans')
          .update({
            status: 'failed',
            error_message: claudeResponse.error || 'Claude generation failed'
          })
          .eq('thread_id', threadId)
          .eq('run_id', runId);
        
        console.log('❌ Claude generation failed for thread:', threadId, claudeResponse.error);
      }
    } catch (error) {
      console.error('❌ Error in Claude background generation:', error);
      
      // Update database with error
      await supabase
        .from('async_meal_plans')
        .update({
          status: 'failed',
          error_message: error instanceof Error ? error.message : 'Unknown error'
        })
        .eq('thread_id', threadId)
        .eq('run_id', runId);
    }
  }

  /**
   * Map database record to AsyncMealPlan interface
   */
  private mapDbToAsyncMealPlan(dbRecord: any): AsyncMealPlan {
    return {
      id: dbRecord.id,
      clientId: dbRecord.client_id,
      nutritionistId: dbRecord.nutritionist_id,
      threadId: dbRecord.thread_id,
      runId: dbRecord.run_id,
      clientGoals: dbRecord.client_goals,
      additionalText: dbRecord.additional_text,
      aiModel: dbRecord.ai_model || 'openai',
      status: dbRecord.status,
      generatedMealPlan: dbRecord.generated_meal_plan,
      errorMessage: dbRecord.error_message,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      completedAt: dbRecord.completed_at
    };
  }
}
