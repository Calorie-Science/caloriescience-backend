export interface GeminiMealPlanRequest {
  clientGoals: any;
  additionalText?: string;
  clientId: string;
  nutritionistId: string;
  mealProgram?: any;
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
    this.apiKey = process.env.GEMINI_API_KEY || '';
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
    const { clientGoals, additionalText, mealProgram } = request;
    
    let message = `Generate a comprehensive meal plan based on nutritional guidelines. Structure is JSON array of meals for the day with nutrition breakdown per meal. Give overall nutrition also in the JSON in end. Focus on healthy, balanced meals with accurate cooking recipes and detailed instructions inside each meal item.

CRITICAL ALLERGEN AND DIETARY RESTRICTION INSTRUCTIONS:
- NEVER include any allergens or ingredients that the client is allergic to, even in trace amounts
- NEVER include any form, derivative, or cross-contamination risk of client allergies
- If a client has a nut allergy, exclude ALL nuts, nut oils, nut flours, nut milks, and anything processed in facilities with nuts
- If a client has a gluten allergy/intolerance, exclude ALL wheat, barley, rye, and ANY processed foods that may contain gluten
- If a client has a dairy allergy/intolerance, exclude ALL milk, cheese, butter, cream, yogurt, whey, casein, and any dairy derivatives
- Double-check every ingredient in every recipe to ensure ZERO allergen contamination
- When in doubt about an ingredient's allergen content, DO NOT include it
- Prioritize client safety over recipe variety - it's better to be overly cautious

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

CRITICAL INGREDIENT REQUIREMENTS:
- EVERY ingredient MUST have a valid "unit" field (NEVER empty string, null, or missing)
- Common units: "g" (grams), "cup", "tbsp", "tsp", "oz", "lb", "piece", "whole", "ml", "l", "kg"
- If quantity is in grams, use "g" as unit (e.g., {"amount": 200, "unit": "g", "name": "tofu"})
- If ingredient is counted, use "piece" or "whole" (e.g., {"amount": 2, "unit": "piece", "name": "eggs"})
- totalWeightG MUST be provided for each meal and represent total weight in grams
- Each ingredient MUST have: text, amount (number), unit (string, NEVER empty), name, originalString
- Example: {"text": "200g tofu", "amount": 200, "unit": "g", "name": "tofu", "originalString": "200g tofu"}

Return the meal plan as a valid JSON object following this exact structure:

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
                                    "text": "80g oats",
                                    "amount": 80,
                                    "unit": "g",
                                    "name": "oats",
                                    "originalString": "80g oats"
                                }
                            ],
                            "totalWeightG": 80,
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
