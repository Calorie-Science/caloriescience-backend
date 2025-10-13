import OpenAI from 'openai';

export interface AssistantMealPlanRequest {
  clientGoals: any;
  additionalText?: string;
  clientId: string;
  nutritionistId: string;
  mealProgram?: any;
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
    this.assistantId = process.env.OPENAI_ASSISTANT_ID || '';
    
    if (!this.assistantId) {
      throw new Error('OPENAI_ASSISTANT_ID environment variable is required');
    }
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
    const { clientGoals, additionalText, mealProgram } = request;
    
    let message = `Please generate a comprehensive meal plan based on the following client goals:

CRITICAL ALLERGEN AND DIETARY RESTRICTION INSTRUCTIONS:
- NEVER include any allergens or ingredients that the client is allergic to, even in trace amounts
- NEVER include any form, derivative, or cross-contamination risk of client allergies
- If a client has a nut allergy, exclude ALL nuts, nut oils, nut flours, nut milks, and anything processed in facilities with nuts
- If a client has a gluten allergy/intolerance, exclude ALL wheat, barley, rye, and ANY processed foods that may contain gluten
- If a client has a dairy allergy/intolerance, exclude ALL milk, cheese, butter, cream, yogurt, whey, casein, and any dairy derivatives
- Double-check every ingredient in every recipe to ensure ZERO allergen contamination
- When in doubt about an ingredient's allergen content, DO NOT include it
- Prioritize client safety over recipe variety - it's better to be overly cautious

`;
    
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
    
    // CRITICAL: Add strong allergen exclusion
    if (clientGoals.allergies && clientGoals.allergies.length > 0) {
      message += `\n⚠️ CRITICAL ALLERGIES (MUST EXCLUDE COMPLETELY): ${clientGoals.allergies.join(', ')}\n`;
      message += `- These allergies are LIFE-THREATENING. Exclude ALL forms, derivatives, and cross-contamination risks.\n`;
      message += `- Do NOT include any ingredient that could contain traces of these allergens.\n`;
      message += `- Check every single ingredient in every recipe for allergen content.\n`;
    }
    
    if (clientGoals.preferences && clientGoals.preferences.length > 0) {
      message += `- Dietary Preferences: ${clientGoals.preferences.join(', ')}\n`;
      message += `  * Follow these dietary restrictions strictly (e.g., vegan = no animal products, vegetarian = no meat/fish, keto = low carb high fat)\n`;
      message += `  * Ensure all meals and ingredients align with these dietary choices\n`;
    }
    
    if (clientGoals.cuisineTypes && clientGoals.cuisineTypes.length > 0) {
      message += `- Cuisine Preferences: ${clientGoals.cuisineTypes.join(', ')}\n`;
      message += `  * Focus on recipes and flavors from these cuisine types\n`;
      message += `  * Use authentic ingredients and cooking methods when possible\n`;
      message += `  * Balance variety across different cuisine types if multiple are specified\n`;
    }
    
    if (clientGoals.notes) {
      message += `- Additional Notes: ${clientGoals.notes}\n`;
    }
    
    // CRITICAL: Add meal program constraints
    if (mealProgram && mealProgram.meals && mealProgram.meals.length > 0) {
      message += `\n🍽️ MEAL PROGRAM STRUCTURE (MUST FOLLOW EXACTLY):\n`;
      message += `- You must generate exactly ${mealProgram.meals.length} meals as specified below\n`;
      message += `- Each meal must match the specified timing, type, and calorie targets\n`;
      message += `- Do NOT add extra meals or skip any meals from this program\n\n`;
      
      mealProgram.meals.forEach((meal: any, index: number) => {
        message += `Meal ${meal.mealOrder}: ${meal.mealName}\n`;
        message += `  - Meal Type: ${meal.mealType || 'Not specified'}\n`;
        message += `  - Scheduled Time: ${meal.mealTime}\n`;
        message += `  - Target Calories: ${meal.targetCalories || 'Proportional to daily target'}\n`;
        if (index < mealProgram.meals.length - 1) message += `\n`;
      });
      
      message += `\n⚠️ CRITICAL: Your response must include exactly these ${mealProgram.meals.length} meals in the specified order with matching calorie targets.\n`;
    }
    
    message += `\n`;
    
    // Add any additional text
    if (additionalText) {
      message += `ADDITIONAL REQUIREMENTS:\n${additionalText}\n\n`;
    }
    
    message += `\nIMPORTANT REMINDERS:
- EXCLUDE ALL ALLERGENS COMPLETELY - no exceptions, no trace amounts
- FOLLOW MEAL PROGRAM STRUCTURE EXACTLY - correct number of meals, timing, and calorie targets
- Ensure all nutrition calculations are accurate
- Provide detailed, actionable cooking instructions
- Focus on balanced, nutritious meals that meet the client's goals
- Follow dietary preferences strictly and incorporate preferred cuisine types

Return the meal plan as a valid JSON object.`;
    
    return message;
  }
}
