import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeMealPlanRequest {
  clientGoals: any;
  additionalText?: string;
  clientId: string;
  nutritionistId: string;
}

export interface ClaudeMealPlanResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: 'pending' | 'completed' | 'failed';
  messageId?: string;
  batchId?: string;
}

export class ClaudeService {
  private claude: Anthropic;
  private model: string;

  constructor() {
    this.claude = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
    // Default to a commonly available Claude model
    this.model = 'claude-opus-4-1';
  }

  /**
   * Generate meal plan using Claude
   */
  async generateMealPlan(request: ClaudeMealPlanRequest): Promise<ClaudeMealPlanResponse> {
    try {
      console.log('🤖 Claude Service - Starting meal plan generation');
      console.log('🤖 Client Goals:', JSON.stringify(request.clientGoals, null, 2));
      
      // Prepare the input message
      const inputMessage = this.prepareInputMessage(request);
      
      // Send message to Claude
      const response = await this.claude.messages.create({
        model: 'claude-opus-4-1',  // Latest Claude Opus model
        max_tokens: 8000,  // Increased to handle longer responses
        messages: [
          {
            role: 'user',
            content: inputMessage
          }
        ]
      });

      console.log('🤖 Claude response received');

      if (response.content && response.content[0].type === 'text') {
        let content = response.content[0].text;
        console.log('🤖 Claude response content:', content);
        
        try {
          // Extract JSON from markdown code block if present
          let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch && jsonMatch[1]) {
            content = jsonMatch[1].trim();
            console.log('🤖 Extracted JSON from markdown block');
          } else {
            // Try to find JSON object in the content
            jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch && jsonMatch[0]) {
              content = jsonMatch[0].trim();
              console.log('🤖 Extracted JSON object from content');
            }
          }
          
          // Check if JSON is complete (ends with })
          if (!content.trim().endsWith('}')) {
            console.log('⚠️ JSON appears to be truncated, attempting to complete it');
            // Try to find the last complete object
            const lastCompleteMatch = content.match(/(\{[\s\S]*?\})$/);
            if (lastCompleteMatch && lastCompleteMatch[1]) {
              content = lastCompleteMatch[1];
              console.log('🤖 Using last complete JSON object');
            }
          }
          
          // Parse the JSON response
          const mealPlanData = JSON.parse(content);
          return {
            success: true,
            status: 'completed',
            data: mealPlanData,
            messageId: response.id
          };
        } catch (parseError) {
          console.error('❌ Failed to parse Claude response as JSON:', parseError);
          console.error('❌ Raw content that failed to parse:', content);
          return {
            success: false,
            error: 'Failed to parse Claude response as JSON',
            status: 'failed',
            messageId: response.id
          };
        }
      } else {
        return {
          success: false,
          error: 'No valid response from Claude',
          status: 'failed'
        };
      }

    } catch (error) {
      console.error('❌ Claude Service - Error generating meal plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'failed'
      };
    }
  }

  /**
   * Submit batch request to Claude for async meal plan generation
   */
  async submitBatchRequest(request: ClaudeMealPlanRequest): Promise<ClaudeMealPlanResponse> {
    try {
      console.log('🤖 Claude Service - Submitting batch request for client:', request.clientId);
      
      // Prepare the input message
      const inputMessage = this.prepareInputMessage(request);
      
      // Submit batch request
      const response = await this.claude.messages.batches.create({
        requests: [
          {
            custom_id: `meal-plan-${request.clientId}-${Date.now()}`,
            params: {
              model: this.model,
              max_tokens: 8000,
              messages: [
                {
                  role: 'user',
                  content: inputMessage
                }
              ]
            }
          }
        ]
      });

      console.log('🤖 Claude batch submitted:', response.id);

      return {
        success: true,
        status: 'pending',
        batchId: response.id,
        messageId: undefined
      };

    } catch (error) {
      console.error('❌ Claude Service - Error submitting batch:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit batch to Claude',
        status: 'failed'
      };
    }
  }

  /**
   * Check batch status and retrieve results
   */
  async checkBatchStatus(batchId: string): Promise<ClaudeMealPlanResponse> {
    try {
      console.log('🤖 Claude Service - Checking batch status:', batchId);
      
      // Check batch status
      const batchResponse = await this.claude.messages.batches.retrieve(batchId);
      
      console.log('🤖 Batch status:', batchResponse.processing_status);

      if (batchResponse.processing_status === 'ended') {
        // For completed batches, we need to get the results from the results_url
        // The message ID is in the results, not in the batch response
        if (!batchResponse.results_url) {
          return {
            success: false,
            error: 'No results URL found in batch response',
            status: 'failed'
          };
        }
        
        const resultsResponse = await fetch(batchResponse.results_url, {
          headers: {
            'x-api-key': process.env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01'
          }
        });
        
        if (!resultsResponse.ok) {
          return {
            success: false,
            error: 'Failed to fetch batch results',
            status: 'failed'
          };
        }
        
        const resultsData = await resultsResponse.json();
        console.log('🤖 Batch results:', resultsData);
        
        if (resultsData.result?.type === 'succeeded' && resultsData.result?.message?.content?.[0]?.text) {
          let content = resultsData.result.message.content[0].text;
          console.log('🤖 Claude batch response content received');
          
          try {
            // Extract JSON from markdown code block if present
            let jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              content = jsonMatch[1].trim();
              console.log('🤖 Extracted JSON from markdown block');
            } else {
              // Try to find JSON object in the content
              jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch && jsonMatch[0]) {
                content = jsonMatch[0].trim();
                console.log('🤖 Extracted JSON object from content');
              }
            }
            
            // Check if JSON is complete (ends with })
            if (!content.trim().endsWith('}')) {
              console.log('⚠️ JSON appears to be truncated, attempting to complete it');
              // Try to find the last complete object
              const lastCompleteMatch = content.match(/(\{[\s\S]*?\})$/);
              if (lastCompleteMatch && lastCompleteMatch[1]) {
                content = lastCompleteMatch[1];
                console.log('🤖 Using last complete JSON object');
              }
            }
            
            // Parse the JSON response
            const mealPlanData = JSON.parse(content);
            return {
              success: true,
              status: 'completed',
              data: mealPlanData,
              batchId: batchId,
              messageId: resultsData.result.message.id
            };
          } catch (parseError) {
            console.error('❌ Failed to parse Claude batch response as JSON:', parseError);
            console.error('❌ Raw content that failed to parse:', content);
            return {
              success: false,
              error: 'Failed to parse Claude response as JSON',
              status: 'failed',
              batchId: batchId
            };
          }
        } else {
          return {
            success: false,
            error: 'No valid response from Claude batch',
            status: 'failed',
            batchId: batchId
          };
        }
      } else if (batchResponse.processing_status === 'canceling') {
        return {
          success: false,
          error: 'Claude batch processing failed',
          status: 'failed',
          batchId: batchId
        };
      } else {
        // Still in progress
        return {
          success: true,
          status: 'pending',
          batchId: batchId
        };
      }

    } catch (error) {
      console.error('❌ Claude Service - Error checking batch status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check Claude batch status',
        status: 'failed',
        batchId: batchId
      };
    }
  }

  /**
   * Prepare the input message for Claude
   */
  private prepareInputMessage(request: ClaudeMealPlanRequest): string {
    const { clientGoals, additionalText } = request;
    
    let message = `Given target calories of the user for the day, macro requirements for the day and location and allergies, I want you to generate a meal plan generation. Structure is JSON array of meals for the day with nutrition breakdown per meal. Give overall nutrition also in the JSON in end. Focus on localized and accurate health condition wise dishes. Like suppose local dishes. Also give cooking recipe with accurate instructions inside each of the meal items.

Follow this JSON structure. Don't focus on shopping list etc. Focus on nutrients and allergies. You can give recipe url and images as null.

Please generate a comprehensive meal plan based on the following client goals:\n\n`;
    
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
    
    message += `\nReturn the meal plan as a valid JSON object following this exact structure:

{
    "success": true,
    "message": "Meal plan generated successfully",
    "data": {
        "mealPlan": {
            "dailyNutrition": {
                "totalCalories": 3000,
                "totalProtein": 120,
                "totalCarbs": 400,
                "totalFat": 100,
                "totalFiber": 30,
                "totalSodium": 2000,
                "totalSugar": 50,
                "totalCholesterol": 300,
                "totalCalcium": 1000,
                "totalIron": 15
            },
            "previewId": "claude-generated-plan",
            "days": [
                {
                    "dayNumber": 1,
                    "date": "2025-09-17",
                    "meals": [
                        {
                            "id": "meal-breakfast",
                            "mealType": "breakfast",
                            "mealOrder": 1,
                            "recipeName": "Example Breakfast",
                            "recipeUrl": null,
                            "recipeImageUrl": null,
                            "caloriesPerServing": 500,
                            "proteinGrams": 20,
                            "carbsGrams": 60,
                            "fatGrams": 15,
                            "fiberGrams": 8,
                            "servingsPerMeal": 1,
                            "totalCalories": 500,
                            "totalProtein": 20,
                            "totalCarbs": 60,
                            "totalFat": 15,
                            "totalFiber": 8,
                            "recipe": [
                                "Step 1: Add ingredients",
                                "Step 2: Mix well",
                                "Step 3: Cook for 10 minutes"
                            ],
                            "ingredients": [
                                {
                                    "text": "1 cup oats",
                                    "quantity": 80,
                                    "measure": "gram",
                                    "food": "oats",
                                    "weight": 80
                                }
                            ],
                            "edamamRecipeId": null
                        }
                    ],
                    "dailyNutrition": {
                        "totalCalories": 3000,
                        "totalProtein": 120,
                        "totalCarbs": 400,
                        "totalFat": 100,
                        "totalFiber": 30,
                        "totalSodium": 2000,
                        "totalSugar": 50,
                        "totalCholesterol": 300,
                        "totalCalcium": 1000,
                        "totalIron": 15
                    }
                }
            ]
        },
        "clientGoals": {
            "eerGoalCalories": 3000,
            "proteinGoalMin": 100,
            "proteinGoalMax": 150,
            "carbsGoalMin": 300,
            "carbsGoalMax": 400,
            "fatGoalMin": 80,
            "fatGoalMax": 120,
            "fiberGoalGrams": 30,
            "waterGoalLiters": 2.5
        },
        "mealProgram": {
            "id": "claude-generated"
        },
        "planDate": "2025-09-17",
        "dietaryRestrictions": [],
        "cuisinePreferences": []
    }
}`;
    
    return message;
  }
}
