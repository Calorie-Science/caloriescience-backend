export interface GeminiMealPlanRequest {
  clientGoals: any;
  additionalText?: string;
  clientId: string;
  nutritionistId: string;
}

export interface GeminiMealPlanResponse {
  success: boolean;
  data?: any;
  error?: string;
  status?: 'pending' | 'completed' | 'failed';
  messageId?: string;
  batchId?: string;
}

export class GeminiService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || 'AIzaSyCxWPyeQrOQIrd39LbfyUC2GT-KDXolwJc'; // Fallback to provided key
    this.model = 'gemini-2.0-flash-exp'; // Use the latest Gemini model
    this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
    
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
  }

  /**
   * Generate meal plan using Gemini
   */
  async generateMealPlan(request: GeminiMealPlanRequest): Promise<GeminiMealPlanResponse> {
    try {
      console.log('🤖 Gemini Service - Starting meal plan generation');
      console.log('🤖 Client Goals:', JSON.stringify(request.clientGoals, null, 2));
      
      // Prepare the input message
      const inputMessage = this.prepareInputMessage(request);
      
      // Send request to Gemini API
      const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: inputMessage
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8000,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Gemini API error:', errorData);
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const responseData = await response.json();
      console.log('🤖 Gemini response received');

      if (responseData.candidates && responseData.candidates[0]?.content?.parts?.[0]?.text) {
        let content = responseData.candidates[0].content.parts[0].text;
        console.log('🤖 Gemini response content:', content);
        
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
            messageId: responseData.responseId || `gemini-${Date.now()}`
          };
        } catch (parseError) {
          console.error('❌ Failed to parse Gemini response as JSON:', parseError);
          console.error('❌ Raw content that failed to parse:', content);
          return {
            success: false,
            error: 'Failed to parse Gemini response as JSON',
            status: 'failed',
            messageId: responseData.responseId || `gemini-${Date.now()}`
          };
        }
      } else {
        return {
          success: false,
          error: 'No valid response from Gemini',
          status: 'failed'
        };
      }

    } catch (error) {
      console.error('❌ Gemini Service - Error generating meal plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        status: 'failed'
      };
    }
  }

  /**
   * Generate meal plan using Gemini (synchronous version)
   */
  async generateMealPlanSync(request: GeminiMealPlanRequest): Promise<GeminiMealPlanResponse> {
    try {
      console.log('🤖 Gemini Service - Generating meal plan synchronously for client:', request.clientId);
      
      // Prepare the input message
      const inputMessage = this.prepareInputMessage(request);
      
      // Send request to Gemini API
      const response = await fetch(`${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: inputMessage
            }]
          }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8000,
            topP: 0.8,
            topK: 40
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Gemini API error:', errorData);
        throw new Error(`Gemini API error: ${errorData.error?.message || response.statusText}`);
      }

      const responseData = await response.json();
      console.log('🤖 Gemini response received');

      if (responseData.candidates && responseData.candidates[0]?.content?.parts?.[0]?.text) {
        let content = responseData.candidates[0].content.parts[0].text;
        console.log('🤖 Gemini response content received');
        
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
            messageId: responseData.responseId || `gemini-${Date.now()}`
          };
        } catch (parseError) {
          console.error('❌ Failed to parse Gemini response as JSON:', parseError);
          console.error('❌ Raw content that failed to parse:', content);
          return {
            success: false,
            error: 'Failed to parse Gemini response as JSON',
            status: 'failed',
            messageId: responseData.responseId || `gemini-${Date.now()}`
          };
        }
      } else {
        return {
          success: false,
          error: 'No valid response from Gemini',
          status: 'failed'
        };
      }

    } catch (error) {
      console.error('❌ Gemini Service - Error generating meal plan:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate meal plan with Gemini',
        status: 'failed'
      };
    }
  }

  /**
   * Prepare the input message for Gemini
   */
  private prepareInputMessage(request: GeminiMealPlanRequest): string {
    const { clientGoals, additionalText } = request;
    
    let message = `Generate a comprehensive meal plan based on nutritional guidelines. Structure is JSON array of meals for the day with nutrition breakdown per meal. Give overall nutrition also in the JSON in end. Focus on healthy, balanced meals with accurate cooking recipes and detailed instructions inside each meal item.

Follow this JSON structure. Don't focus on shopping list etc. Focus on nutrients and allergies. You can give recipe url and images as null.

Please generate a comprehensive meal plan based on the following nutritional guidelines:\n\n`;
    
    // Add client goals information
    message += `NUTRITIONAL GUIDELINES:\n`;
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
            "previewId": "gemini-generated-plan",
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
            "id": "gemini-generated"
        },
        "planDate": "2025-09-17",
        "dietaryRestrictions": [],
        "cuisinePreferences": []
    }
}`;
    
    return message;
  }
}
