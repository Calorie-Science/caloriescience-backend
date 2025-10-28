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
  data?: AsyncMealPlan | any; // Can be AsyncMealPlan or formatted draft structure
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
   * Start async meal plan generation and return formatted draft
   */
  async startGeneration(
    clientId: string,
    nutritionistId: string,
    clientGoals: any,
    additionalText?: string,
    aiModel: 'openai' | 'claude' | 'gemini' = 'claude',
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

      // If Claude (completed immediately), format as draft response
      if (aiModel === 'claude' && status === 'completed' && generatedMealPlan) {
        const formattedDraft = await this.formatAsDraft(
          asyncMealPlan.id,
          clientId,
          nutritionistId,
          clientGoals,
          mealProgram,
          generatedMealPlan,
          days,
          startDate
        );
        
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
   * Validate meal plan response structure (copied from ClaudeService)
   */
  private isValidMealPlanResponse(data: any): boolean {
    try {
      // Check basic structure
      if (!data || typeof data !== 'object') return false;
      if (!data.success || !data.message || !data.data) return false;
      if (!data.data.mealPlan) return false;
      
      const mealPlan = data.data.mealPlan;
      
      // Check for required mealPlan properties
      if (!mealPlan.days || !Array.isArray(mealPlan.days)) return false;
      if (!mealPlan.dailyNutrition || typeof mealPlan.dailyNutrition !== 'object') return false;
      
      // Check that we have at least one day with meals
      if (mealPlan.days.length === 0) return false;
      
      const firstDay = mealPlan.days[0];
      if (!firstDay.meals || !Array.isArray(firstDay.meals)) return false;
      if (firstDay.meals.length === 0) return false;
      
      console.log('✅ Meal plan response structure is valid');
      return true;
    } catch (error) {
      console.error('❌ Meal plan validation error:', error);
      return false;
    }
  }

  /**
   * Format AI-generated meal plan as a draft (matches automated/manual meal plan structure)
   */
  private async formatAsDraft(
    draftId: string,
    clientId: string,
    nutritionistId: string,
    clientGoals: any,
    mealProgram: any,
    generatedMealPlan: any,
    days: number,
    startDate?: string
  ): Promise<any> {
    try {
      const mealPlan = generatedMealPlan?.data?.mealPlan;
      if (!mealPlan) {
        throw new Error('Invalid meal plan structure');
      }

      // Calculate start date
      const planStartDate = startDate || new Date().toISOString().split('T')[0];

      // Transform AI meal plan days into suggestions format
      const suggestions = mealPlan.days.map((day: any) => {
        const meals: any = {};
        
        // Group meals by mealType
        if (day.meals && Array.isArray(day.meals)) {
          day.meals.forEach((meal: any) => {
            const mealType = (meal.mealType || 'meal').toLowerCase();
            
            if (!meals[mealType]) {
              meals[mealType] = {
                recipes: [],
                customizations: {},
                selectedRecipeId: meal.id,
                mealTime: meal.mealTime || this.getMealTimeForType(mealType),
                targetCalories: meal.totalCalories || 0
              };
            }
            
            // Add recipe
            meals[mealType].recipes.push({
              id: meal.id || `ai-recipe-${Date.now()}-${Math.random()}`,
              title: meal.recipeName || 'AI Generated Recipe',
              image: meal.recipeImageUrl || null,
              sourceUrl: meal.recipeUrl || null,
              source: 'claude',
              servings: meal.servingsPerMeal || 1,
              fromCache: false,
              calories: meal.caloriesPerServing || meal.totalCalories,
              protein: meal.proteinGrams || meal.totalProtein,
              carbs: meal.carbsGrams || meal.totalCarbs,
              fat: meal.fatGrams || meal.totalFat,
              fiber: meal.fiberGrams || meal.totalFiber,
              nutrition: {
                calories: meal.caloriesPerServing || meal.totalCalories || 0,
                protein: meal.proteinGrams || meal.totalProtein || 0,
                carbs: meal.carbsGrams || meal.totalCarbs || 0,
                fat: meal.fatGrams || meal.totalFat || 0,
                fiber: meal.fiberGrams || meal.totalFiber || 0
              },
              ingredients: meal.ingredients || [],
              instructions: meal.recipe || [],
              isSelected: true,
              selectedAt: new Date().toISOString()
            });
            
            // Set total nutrition for the meal
            meals[mealType].totalNutrition = {
              calories: meal.totalCalories || 0,
              protein: meal.totalProtein || 0,
              carbs: meal.totalCarbs || 0,
              fat: meal.totalFat || 0,
              fiber: meal.totalFiber || 0
            };
          });
        }
        
        return {
          day: day.dayNumber,
          date: day.date,
          meals
        };
      });

      // Calculate nutrition summary
      const nutrition = {
        byDay: mealPlan.days.map((day: any) => ({
          day: day.dayNumber,
          date: day.date,
          nutrition: day.dailyNutrition || {
            totalCalories: 0,
            totalProtein: 0,
            totalCarbs: 0,
            totalFat: 0,
            totalFiber: 0
          }
        })),
        overall: mealPlan.dailyNutrition || {
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0,
          totalFiber: 0
        }
      };

      // Calculate completion stats
      const totalMeals = suggestions.reduce((sum: number, day: any) => 
        sum + Object.keys(day.meals).length, 0
      );
      const selectedMeals = suggestions.reduce((sum: number, day: any) => 
        sum + Object.values(day.meals).filter((m: any) => m.recipes.length > 0).length, 0
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

      return {
        id: draftId,
        clientId,
        nutritionistId,
        status: 'completed',
        creationMethod: 'ai_generated',
        planName: `AI Meal Plan - ${new Date().toLocaleDateString()}`,
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
            eerGoalCalories: clientGoals.eerGoalCalories,
            proteinGoalMin: clientGoals.proteinGoalMin,
            proteinGoalMax: clientGoals.proteinGoalMax,
            carbsGoalMin: clientGoals.carbsGoalMin,
            carbsGoalMax: clientGoals.carbsGoalMax,
            fatGoalMin: clientGoals.fatGoalMin,
            fatGoalMax: clientGoals.fatGoalMax,
            fiberGoalGrams: clientGoals.fiberGoalGrams,
            waterGoalLiters: clientGoals.waterGoalLiters
          },
          dietaryPreferences: {
            allergies: clientGoals.allergies || [],
            preferences: clientGoals.preferences || [],
            cuisineTypes: clientGoals.cuisineTypes || []
          },
          overrideMealProgram: mealProgramData
        },
        suggestions,
        nutrition,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        expiresAt: null, // AI-generated plans don't expire
        aiModel: 'claude'
      };
    } catch (error) {
      console.error('❌ Error formatting AI meal plan as draft:', error);
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
