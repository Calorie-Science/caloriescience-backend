import { supabase } from './supabase';
import { OpenAIAssistantService, AssistantMealPlanRequest, AssistantMealPlanResponse } from './openaiAssistantService';
import { ClaudeService, ClaudeMealPlanRequest, ClaudeMealPlanResponse } from './claudeService';
import { GeminiService, GeminiMealPlanRequest, GeminiMealPlanResponse } from './geminiService';
import { GrokService, GrokMealPlanRequest, GrokMealPlanResponse } from './grokService';

export interface AsyncMealPlan {
  id: string;
  clientId: string;
  nutritionistId: string;
  threadId: string;
  runId: string;
  clientGoals: any;
  additionalText?: string;
  aiModel: 'openai' | 'claude' | 'gemini' | 'grok';
  status: 'pending' | 'completed' | 'failed';
  generatedMealPlan?: any;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface AsyncMealPlanResponse {
  success: boolean;
  data?: AsyncMealPlan | any; // Can be AsyncMealPlan or formatted draft structure
  error?: string;
}

export class AsyncMealPlanService {
  private openaiService: OpenAIAssistantService;
  private claudeService: ClaudeService;
  private geminiService: GeminiService;
  private grokService: GrokService;

  constructor() {
    this.openaiService = new OpenAIAssistantService();
    this.claudeService = new ClaudeService();
    this.geminiService = new GeminiService();
    this.grokService = new GrokService();
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
   * Start async meal plan generation and return formatted draft
   */
  async startGeneration(
    clientId: string,
    nutritionistId: string,
    clientGoals: any,
    additionalText?: string,
    aiModel: 'openai' | 'claude' | 'gemini' | 'grok' = 'claude',
    days: number = 7,
    startDate?: string
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

      if (aiModel === 'grok') {
        // Grok: Generate meal plan synchronously (fast)
        const grokRequest: GrokMealPlanRequest = {
          clientGoals,
          additionalText,
          clientId,
          nutritionistId,
          mealProgram,
          days
        };

        const grokResponse = await this.grokService.generateMealPlanSync(grokRequest);

        if (!grokResponse.success) {
          return {
            success: false,
            error: grokResponse.error || 'Failed to generate Grok meal plan'
          };
        }

        threadId = grokResponse.messageId || `thread-grok-${Date.now()}`;
        runId = `run-grok-${Date.now()}`;
        status = 'completed';
        generatedMealPlan = grokResponse.data;
      } else if (aiModel === 'gemini') {
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
          mealProgram,
          days
        };

        const claudeResponse = await this.claudeService.generateMealPlanSync(claudeRequest);
        
        if (!claudeResponse.success) {
          return {
            success: false,
            error: claudeResponse.error || 'Failed to generate Claude meal plan'
          };
        }

        // Handle case where Claude JSON parsing failed but we have rawText
        let processedMealPlan = claudeResponse.data;
        if (claudeResponse.data?.jsonParsingFailed && claudeResponse.data?.rawText) {
          console.log('🔧 Claude JSON parsing failed, attempting to parse rawText directly...');
          try {
            // The rawText is already a proper JSON string, just parse it directly
            const parsedMealPlan = JSON.parse(claudeResponse.data.rawText);
            
            // Validate the parsed result
            if (this.isValidMealPlanResponse(parsedMealPlan)) {
              console.log('✅ Successfully recovered Claude meal plan from rawText');
              processedMealPlan = parsedMealPlan;
            } else {
              console.log('❌ Parsed JSON is not a valid meal plan structure');
            }
          } catch (parseError) {
            console.error('❌ Failed to parse rawText directly:', parseError);
            console.log('🔍 Attempting with unescaping...');
            
            try {
              // Fallback: try unescaping if direct parsing fails
              let unescapedJson = claudeResponse.data.rawText;
              unescapedJson = unescapedJson.replace(/\\"/g, '"');
              unescapedJson = unescapedJson.replace(/\\n/g, '\n');
              unescapedJson = unescapedJson.replace(/\\r/g, '\r');
              unescapedJson = unescapedJson.replace(/\\t/g, '\t');
              unescapedJson = unescapedJson.replace(/\\\\/g, '\\');
              
              const parsedMealPlan = JSON.parse(unescapedJson);
              
              if (this.isValidMealPlanResponse(parsedMealPlan)) {
                console.log('✅ Successfully recovered Claude meal plan with unescaping');
                processedMealPlan = parsedMealPlan;
              }
            } catch (secondParseError) {
              console.error('❌ Both parsing attempts failed:', secondParseError);
            }
          }
        }

        threadId = claudeResponse.messageId || `thread-claude-${Date.now()}`;
        runId = `run-claude-${Date.now()}`;
        status = 'completed';
        generatedMealPlan = processedMealPlan;
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

      // If Claude or Grok (completed immediately), add wrapper fields to the response
      if ((aiModel === 'claude' || aiModel === 'grok') && status === 'completed' && generatedMealPlan) {
        // Create draft ID that will be used in meal_plan_drafts table
        const draftId = `ai-${asyncMealPlan.id}`;
        
        const formattedDraft = this.wrapAIResponse(
          draftId, // Use draft ID instead of async meal plan ID
          clientId,
          nutritionistId,
          clientGoals,
          mealProgram,
          generatedMealPlan,
          days,
          startDate,
          aiModel
        );
        
        // Also save to meal_plan_drafts table so it shows up in drafts list
        const { error: draftError } = await supabase
          .from('meal_plan_drafts')
          .insert({
            id: draftId,
            client_id: clientId,
            nutritionist_id: nutritionistId,
            status: 'completed',
            creation_method: 'ai_generated',
            search_params: formattedDraft.searchParams,
            suggestions: formattedDraft.suggestions,
            plan_name: formattedDraft.planName,
            plan_date: formattedDraft.planDate,
            plan_duration_days: formattedDraft.durationDays,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            expires_at: null, // AI plans don't expire
            finalized_at: new Date().toISOString()
          });
        
        if (draftError) {
          console.error('⚠️ Failed to save AI plan to meal_plan_drafts:', draftError);
          // Don't fail the request, just log the error
        } else {
          console.log('✅ AI meal plan saved to meal_plan_drafts with ID:', draftId);
        }
        
        return {
          success: true,
          data: formattedDraft
        };
      }

      // For other AI models or pending status, return simple structure
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
        // Handle case where Claude JSON parsing failed but we have rawText
        let processedMealPlan = claudeResponse.data;
        if (claudeResponse.data?.jsonParsingFailed && claudeResponse.data?.rawText) {
          console.log('🔧 Claude JSON parsing failed in background, attempting to parse rawText directly...');
          try {
            // The rawText is already a proper JSON string, just parse it directly
            const parsedMealPlan = JSON.parse(claudeResponse.data.rawText);
            
            // Validate the parsed result
            if (this.isValidMealPlanResponse(parsedMealPlan)) {
              console.log('✅ Successfully recovered Claude meal plan from rawText in background');
              processedMealPlan = parsedMealPlan;
            } else {
              console.log('❌ Parsed JSON is not a valid meal plan structure in background');
            }
          } catch (parseError) {
            console.error('❌ Failed to parse rawText directly in background:', parseError);
            console.log('🔍 Attempting with unescaping in background...');
            
            try {
              // Fallback: try unescaping if direct parsing fails
              let unescapedJson = claudeResponse.data.rawText;
              unescapedJson = unescapedJson.replace(/\\"/g, '"');
              unescapedJson = unescapedJson.replace(/\\n/g, '\n');
              unescapedJson = unescapedJson.replace(/\\r/g, '\r');
              unescapedJson = unescapedJson.replace(/\\t/g, '\t');
              unescapedJson = unescapedJson.replace(/\\\\/g, '\\');
              
              const parsedMealPlan = JSON.parse(unescapedJson);
              
              if (this.isValidMealPlanResponse(parsedMealPlan)) {
                console.log('✅ Successfully recovered Claude meal plan with unescaping in background');
                processedMealPlan = parsedMealPlan;
              }
            } catch (secondParseError) {
              console.error('❌ Both parsing attempts failed in background:', secondParseError);
            }
          }
        }

        // Update database with completed result
        await supabase
          .from('async_meal_plans')
          .update({
            status: 'completed',
            generated_meal_plan: processedMealPlan,
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
    let processedGeneratedMealPlan = dbRecord.generated_meal_plan;
    
    // Handle existing broken Claude records with jsonParsingFailed
    if (dbRecord.generated_meal_plan?.jsonParsingFailed && dbRecord.generated_meal_plan?.rawText) {
      console.log('🔧 Found existing broken Claude record, attempting to parse rawText directly...');
      try {
        // The rawText is already a proper JSON string, just parse it directly
        const parsedMealPlan = JSON.parse(dbRecord.generated_meal_plan.rawText);
        
        // Validate the parsed result
        if (this.isValidMealPlanResponse(parsedMealPlan)) {
          console.log('✅ Successfully recovered existing Claude meal plan from rawText');
          processedGeneratedMealPlan = parsedMealPlan;
        } else {
          console.log('❌ Parsed JSON from existing record is not a valid meal plan structure');
        }
      } catch (parseError) {
        console.error('❌ Failed to parse rawText directly from existing record:', parseError);
        console.log('🔍 Attempting with unescaping from existing record...');
        
        try {
          // Fallback: try unescaping if direct parsing fails
          let unescapedJson = dbRecord.generated_meal_plan.rawText;
          unescapedJson = unescapedJson.replace(/\\"/g, '"');
          unescapedJson = unescapedJson.replace(/\\n/g, '\n');
          unescapedJson = unescapedJson.replace(/\\r/g, '\r');
          unescapedJson = unescapedJson.replace(/\\t/g, '\t');
          unescapedJson = unescapedJson.replace(/\\\\/g, '\\');
          
          const parsedMealPlan = JSON.parse(unescapedJson);
          
          if (this.isValidMealPlanResponse(parsedMealPlan)) {
            console.log('✅ Successfully recovered existing Claude meal plan with unescaping');
            processedGeneratedMealPlan = parsedMealPlan;
          }
        } catch (secondParseError) {
          console.error('❌ Both parsing attempts failed for existing record:', secondParseError);
        }
      }
    }

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
      generatedMealPlan: processedGeneratedMealPlan,
      errorMessage: dbRecord.error_message,
      createdAt: dbRecord.created_at,
      updatedAt: dbRecord.updated_at,
      completedAt: dbRecord.completed_at
    };
  }

  /**
   * Validate meal plan response structure (manual/automated format)
   */
  private isValidMealPlanResponse(data: any): boolean {
    try {
      // Check basic structure - suggestions is required, nutrition is optional (will be calculated if missing)
      if (!data || typeof data !== 'object') return false;
      
      // Check for required top-level properties
      if (!data.suggestions || !Array.isArray(data.suggestions)) return false;
      
      // Nutrition is optional - it will be calculated from suggestions if missing
      // if (!data.nutrition || typeof data.nutrition !== 'object') return false;
      
      // Check that we have at least one day
      if (data.suggestions.length === 0) return false;
      
      const firstDay = data.suggestions[0];
      if (!firstDay.day || !firstDay.date || !firstDay.meals) return false;
      if (typeof firstDay.meals !== 'object') return false;
      
      // Check that we have at least one meal
      const mealNames = Object.keys(firstDay.meals);
      if (mealNames.length === 0) return false;
      
      // Validate first meal structure
      const firstMeal = firstDay.meals[mealNames[0]];
      if (!firstMeal.recipes || !Array.isArray(firstMeal.recipes)) return false;
      if (!firstMeal.totalNutrition || typeof firstMeal.totalNutrition !== 'object') return false;
      
      // Check nutrition structure
      if (!data.nutrition.byDay || !Array.isArray(data.nutrition.byDay)) return false;
      if (!data.nutrition.overall || typeof data.nutrition.overall !== 'object') return false;
      if (!data.nutrition.dailyAverage || typeof data.nutrition.dailyAverage !== 'object') return false;
      
      console.log('✅ Meal plan response structure is valid (manual/automated format)');
      return true;
    } catch (error) {
      console.error('❌ Meal plan validation error:', error);
      return false;
    }
  }

  /**
   * Calculate nutrition totals from suggestions
   * Aggregates nutrition from all meals across all days
   */
  private calculateNutritionFromSuggestions(suggestions: any[]): any {
    const totals = {
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

    let totalDays = 0;

    suggestions.forEach((day: any) => {
      if (day.meals) {
        totalDays++;
        Object.values(day.meals).forEach((meal: any) => {
          if (meal.totalNutrition) {
            const nutrition = meal.totalNutrition;
            
            // Add calories
            totals.calories += nutrition.calories?.value || nutrition.calories || 0;
            
            // Add macros
            if (nutrition.macros) {
              totals.protein += nutrition.macros.protein?.value || nutrition.macros.protein || 0;
              totals.carbs += nutrition.macros.carbs?.value || nutrition.macros.carbs || 0;
              totals.fat += nutrition.macros.fat?.value || nutrition.macros.fat || 0;
              totals.fiber += nutrition.macros.fiber?.value || nutrition.macros.fiber || 0;
              totals.sugar += nutrition.macros.sugar?.value || nutrition.macros.sugar || 0;
              totals.sodium += nutrition.macros.sodium?.value || nutrition.macros.sodium || 0;
              totals.cholesterol += nutrition.macros.cholesterol?.value || nutrition.macros.cholesterol || 0;
              totals.saturatedFat += nutrition.macros.saturatedFat?.value || nutrition.macros.saturatedFat || 0;
              totals.transFat += nutrition.macros.transFat?.value || nutrition.macros.transFat || 0;
              totals.monounsaturatedFat += nutrition.macros.monounsaturatedFat?.value || nutrition.macros.monounsaturatedFat || 0;
              totals.polyunsaturatedFat += nutrition.macros.polyunsaturatedFat?.value || nutrition.macros.polyunsaturatedFat || 0;
            }
          }
        });
      }
    });

    // Calculate daily averages
    const dailyAverage = totalDays > 0 ? {
      calories: Math.round(totals.calories / totalDays),
      protein: Math.round((totals.protein / totalDays) * 10) / 10,
      carbs: Math.round((totals.carbs / totalDays) * 10) / 10,
      fat: Math.round((totals.fat / totalDays) * 10) / 10,
      fiber: Math.round((totals.fiber / totalDays) * 10) / 10,
      sugar: Math.round((totals.sugar / totalDays) * 10) / 10,
      sodium: Math.round((totals.sodium / totalDays) * 10) / 10,
      cholesterol: Math.round((totals.cholesterol / totalDays) * 10) / 10,
      saturatedFat: Math.round((totals.saturatedFat / totalDays) * 10) / 10,
      transFat: Math.round((totals.transFat / totalDays) * 10) / 10,
      monounsaturatedFat: Math.round((totals.monounsaturatedFat / totalDays) * 10) / 10,
      polyunsaturatedFat: Math.round((totals.polyunsaturatedFat / totalDays) * 10) / 10
    } : totals;

    return {
      overallTotal: totals,
      dailyAverage: dailyAverage,
      totalDays: totalDays
    };
  }

  /**
   * Wrap AI response (Claude/Grok) with top-level fields to match manual/automated format
   */
  private wrapAIResponse(
    draftId: string,
    clientId: string,
    nutritionistId: string,
    clientGoals: any,
    mealProgram: any,
    generatedMealPlan: any,
    days: number,
    startDate?: string,
    aiModel: 'claude' | 'grok' = 'claude'
  ): any {
    try {
      console.log('🔍 Received generatedMealPlan:', JSON.stringify(generatedMealPlan, null, 2).substring(0, 500));
      
      // Validate basic structure
      if (!generatedMealPlan || !generatedMealPlan.suggestions) {
        console.error('❌ Invalid meal plan structure. Expected suggestions array');
        console.error('Received keys:', Object.keys(generatedMealPlan || {}));
        throw new Error('Invalid meal plan structure from Claude');
      }

      // Calculate nutrition from suggestions if not provided
      if (!generatedMealPlan.nutrition) {
        console.log('⚠️ Nutrition object missing from Claude response, calculating from suggestions...');
        generatedMealPlan.nutrition = this.calculateNutritionFromSuggestions(generatedMealPlan.suggestions);
        console.log('✅ Calculated nutrition:', generatedMealPlan.nutrition);
      }

      // Calculate start date
      const planStartDate = startDate || new Date().toISOString().split('T')[0];

      // Calculate completion stats from suggestions
      const totalMeals = generatedMealPlan.suggestions.reduce((sum: number, day: any) => 
        sum + Object.keys(day.meals || {}).length, 0
      );
      const selectedMeals = generatedMealPlan.suggestions.reduce((sum: number, day: any) => 
        sum + Object.values(day.meals || {}).filter((m: any) => m.recipes && m.recipes.length > 0).length, 0
      );
      const completionPercentage = totalMeals > 0 ? Math.round((selectedMeals / totalMeals) * 100) : 0;

      // Build meal program structure for searchParams
      const mealProgramData = mealProgram ? {
        meals: mealProgram.meals.map((meal: any) => ({
          mealName: meal.mealName,
          mealTime: meal.mealTime,
          mealType: meal.mealType,
          mealOrder: meal.mealOrder,
          targetCalories: meal.targetCalories
        }))
      } : null;

      // Generate unique plan name with timestamp to avoid duplicates
      // Format: "AI Meal Plan - YYYY-MM-DD HH:MM:SS" for guaranteed uniqueness
      const now = new Date();
      const uniquePlanName = `AI Meal Plan - ${now.toISOString().slice(0, 19).replace('T', ' ')}`;

      // Return the Claude response with top-level wrapper fields
      return {
        id: draftId,
        clientId,
        nutritionistId,
        status: 'completed',
        creationMethod: 'ai_generated',
        planName: uniquePlanName,
        planDate: planStartDate,
        durationDays: days,
        totalDays: days,
        totalMeals,
        selectedMeals,
        completionPercentage,
        isComplete: completionPercentage === 100,
        searchParams: {
          days,
          startDate: planStartDate,
          clientGoals: {
            calories: clientGoals.eerGoalCalories || 0,
            protein: clientGoals.proteinGoalMin || 0,
            carbs: clientGoals.carbsGoalMin || 0,
            fat: clientGoals.fatGoalMin || 0,
            fiber: clientGoals.fiberGoalGrams || 0
          },
          mealProgram: mealProgramData,
          dietaryPreferences: {
            allergies: clientGoals.allergies || [],
            cuisineTypes: clientGoals.cuisineTypes || [],
            dietaryPreferences: clientGoals.preferences || []
          },
          overrideClientGoals: {
            eerGoalCalories: clientGoals.eerGoalCalories,
            proteinGoalMin: clientGoals.proteinGoalMin,
            proteinGoalMax: clientGoals.proteinGoalMax,
            carbsGoalMin: clientGoals.carbsGoalMin,
            carbsGoalMax: clientGoals.carbsGoalMax,
            fatGoalMin: clientGoals.fatGoalMin,
            fatGoalMax: clientGoals.fatGoalMax,
            fiberGoalGrams: clientGoals.fiberGoalGrams,
            waterGoalLiters: clientGoals.waterGoalLiters,
            allergies: clientGoals.allergies || [],
            preferences: clientGoals.preferences || [],
            cuisineTypes: clientGoals.cuisineTypes || []
          },
          overrideMealProgram: mealProgramData
        },
        suggestions: generatedMealPlan.suggestions, // Already in correct format from Claude
        nutrition: generatedMealPlan.nutrition,      // Already in correct format from Claude
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: null, // AI-generated plans don't expire
        aiModel: aiModel
      };
    } catch (error) {
      console.error('❌ Error wrapping AI meal plan response:', error);
      throw error;
    }
  }

  /**
   * Helper to get default meal time for a meal type
   */
  private getMealTimeForType(mealType: string): string {
    const defaultTimes: { [key: string]: string } = {
      breakfast: '08:00',
      lunch: '12:00',
      dinner: '18:00',
      snack: '15:00'
    };
    return defaultTimes[mealType.toLowerCase()] || '12:00';
  }
}
