import OpenAI from 'openai';

export interface AssistantMealPlanRequest {
  clientGoals: any;
  additionalText?: string;
  clientId: string;
  nutritionistId: string;
}

export interface AssistantMealPlanResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: 'pending' | 'completed' | 'failed';
  runId?: string;
  threadId?: string;
}

export class OpenAIAssistantService {
  private openai: OpenAI;
  private assistantId: string;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || 'asst_WgJCEyh92kZqUBcwcYspU3oC';
  }

  /**
   * Start async meal plan generation with OpenAI Assistant
   * This method returns immediately and doesn't wait for completion
   */
  async generateMealPlanAsync(request: AssistantMealPlanRequest): Promise<AssistantMealPlanResponse> {
    try {
      console.log('🤖 OpenAI Assistant Service - Starting async meal plan generation');
      console.log('🤖 Client Goals:', JSON.stringify(request.clientGoals, null, 2));
      
      // Create a new thread
      const thread = await this.openai.beta.threads.create();
      console.log('🤖 Created thread:', thread.id);

      // Prepare the input message
      const inputMessage = this.prepareInputMessage(request);
      
      // Add message to thread
      const message = await this.openai.beta.threads.messages.create(thread.id, {
        role: 'user',
        content: inputMessage
      });
      console.log('🤖 Added message to thread:', message.id);

      // Create and start a run
      const run = await this.openai.beta.threads.runs.create(thread.id, {
        assistant_id: this.assistantId
      });
      console.log('🤖 Started run:', run.id);

      return {
        success: true,
        status: 'pending',
        runId: run.id,
        threadId: thread.id
      };

    } catch (error) {
      console.error('❌ OpenAI Assistant Service - Error starting meal plan generation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'failed'
      };
    }
  }


  /**
   * Check the status of a running assistant task
   */
  async checkGenerationStatus(threadId: string, runId: string): Promise<AssistantMealPlanResponse> {
    try {
      console.log('🤖 OpenAI Assistant Service - Checking status for run:', runId);
      
      const run = await this.openai.beta.threads.runs.retrieve(threadId, runId);
      console.log('🤖 Run status:', run.status);

      if (run.status === 'completed') {
        // Get the assistant's response
        const messages = await this.openai.beta.threads.messages.list(threadId);
        const assistantMessage = messages.data.find(msg => msg.role === 'assistant');
        
        if (assistantMessage && assistantMessage.content[0].type === 'text') {
          const content = assistantMessage.content[0].text.value;
          console.log('🤖 Assistant response:', content);
          
          try {
            // Parse the JSON response
            const mealPlanData = JSON.parse(content);
            return {
              success: true,
              status: 'completed',
              data: mealPlanData,
              runId,
              threadId
            };
          } catch (parseError) {
            console.error('❌ Failed to parse assistant response as JSON:', parseError);
            return {
              success: false,
              error: 'Failed to parse assistant response as JSON',
              status: 'failed',
              runId,
              threadId
            };
          }
        } else {
          return {
            success: false,
            error: 'No valid response from assistant',
            status: 'failed',
            runId,
            threadId
          };
        }
      } else if (run.status === 'failed') {
        const errorMessage = run.last_error?.message || 'Assistant run failed';
        console.error('❌ Assistant run failed:', errorMessage);
        return {
          success: false,
          error: errorMessage,
          status: 'failed',
          runId,
          threadId
        };
      } else {
        // Still running (queued, in_progress, etc.)
        return {
          success: true,
          status: 'pending',
          runId,
          threadId
        };
      }

    } catch (error) {
      console.error('❌ OpenAI Assistant Service - Error checking status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'failed',
        runId,
        threadId
      };
    }
  }

  /**
   * Prepare the input message for the assistant
   */
  private prepareInputMessage(request: AssistantMealPlanRequest): string {
    const { clientGoals, additionalText } = request;
    
    let message = `Please generate a comprehensive meal plan based on the following client goals:\n\n`;
    
    // Add client goals information
    message += `CLIENT GOALS:\n`;
    message += `- Target Calories: ${clientGoals.eerGoalCalories || 'Not specified'}\n`;
    message += `- Protein Range: ${clientGoals.proteinGoalMin || 0} - ${clientGoals.proteinGoalMax || 0} grams\n`;
    message += `- Carbs Range: ${clientGoals.carbsGoalMin || 0} - ${clientGoals.carbsGoalMax || 0} grams\n`;
    message += `- Fat Range: ${clientGoals.fatGoalMin || 0} - ${clientGoals.fatGoalMax || 0} grams\n`;
    
    if (clientGoals.fiberGoalGrams) {
      message += `- Fiber Goal: ${clientGoals.fiberGoalGrams} grams\n`;
    }
    
    if (clientGoals.waterGoalLiters) {
      message += `- Water Goal: ${clientGoals.waterGoalLiters} liters\n`;
    }
    
    if (clientGoals.allergies && clientGoals.allergies.length > 0) {
      message += `- Allergies: ${clientGoals.allergies.join(', ')}\n`;
    }
    
    if (clientGoals.preferences && clientGoals.preferences.length > 0) {
      message += `- Dietary Preferences: ${clientGoals.preferences.join(', ')}\n`;
    }
    
    if (clientGoals.cuisineTypes && clientGoals.cuisineTypes.length > 0) {
      message += `- Cuisine Preferences: ${clientGoals.cuisineTypes.join(', ')}\n`;
    }
    
    if (clientGoals.notes) {
      message += `- Additional Notes: ${clientGoals.notes}\n`;
    }
    
    message += `\n`;
    
    // Add any additional text
    if (additionalText) {
      message += `ADDITIONAL REQUIREMENTS:\n${additionalText}\n\n`;
    }
    
    message += `\nReturn the meal plan as a valid JSON object.`;
    
    return message;
  }
}
