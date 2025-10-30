import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeMealPlanRequest {
  clientGoals: any;
  additionalText?: string;
  clientId: string;
  nutritionistId: string;
  mealProgram?: any;
  days?: number;
}

export interface ClaudeMealPlanResponse {
  success: boolean;
  data?: any;
  error?: string;
  messageId?: string;
  status?: 'completed' | 'failed';
}

export class ClaudeService {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is required');
    }
    
    this.anthropic = new Anthropic({
      apiKey
    });
  }

  /**
   * Generate meal plan using Claude (synchronous version)
   */
  async generateMealPlanSync(request: ClaudeMealPlanRequest): Promise<ClaudeMealPlanResponse> {
    const maxRetries = 3;
    let attempt = 0;
    
    while (attempt < maxRetries) {
      try {
        console.log(`🤖 Claude meal plan generation started (attempt ${attempt + 1}/${maxRetries})`);
        
        const prompt = this.prepareInputMessage(request);
        console.log('🤖 Claude prompt prepared');

        const stream = await this.anthropic.messages.stream({
          model: 'claude-opus-4-1-20250805',
          max_tokens: 24000, // Increased to 24K to handle multi-day plans with full nutrition data
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        console.log('🤖 Claude streaming started');

        // Collect the streamed response
        let content = '';
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            content += chunk.delta.text;
          }
        }

        const response = await stream.finalMessage();
        console.log('🤖 Claude response received');

        if (content) {
          console.log('🤖 Claude response content received');
          
          // Declare jsonContent outside try block for error handling
          let jsonContent = '';
          
          try {
            // Clean up the content
            content = content.trim();
            console.log('🔍 Raw Claude response length:', content.length);
            console.log('🔍 First 200 chars:', content.substring(0, 200));
            console.log('🔍 Last 200 chars:', content.substring(Math.max(0, content.length - 200)));
            
            jsonContent = content;
            
            // 1. First try: Extract from markdown code block if present
            let jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch && jsonMatch[1]) {
              jsonContent = jsonMatch[1].trim();
              console.log('🤖 Extracted JSON from markdown block');
            }
            
            // 2. Second try: Find JSON object (starts with { and ends with })
            else if (content.includes('{')) {
              const startIndex = content.indexOf('{');
              let braceCount = 0;
              let endIndex = -1;
              
              for (let i = startIndex; i < content.length; i++) {
                if (content[i] === '{') braceCount++;
                if (content[i] === '}') braceCount--;
                if (braceCount === 0) {
                  endIndex = i;
                  break;
                }
              }
              
              if (endIndex > startIndex) {
                jsonContent = content.substring(startIndex, endIndex + 1);
                console.log('🤖 Extracted JSON by brace matching');
              }
            }
            
            // 3. Third try: Use regex to find JSON object
            else {
              jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch && jsonMatch[0]) {
                jsonContent = jsonMatch[0].trim();
                console.log('🤖 Extracted JSON with regex fallback');
              }
            }
            
            // Clean up any remaining issues
            jsonContent = jsonContent
              .replace(/^[^{]*/, '') // Remove anything before first {
              .replace(/[^}]*$/, '') // Remove anything after last }
              .trim();
            
            console.log('🔍 Final JSON content length:', jsonContent.length);
            console.log('🔍 JSON starts with:', jsonContent.substring(0, 50));
            console.log('🔍 JSON ends with:', jsonContent.substring(Math.max(0, jsonContent.length - 50)));
            
            // Validate JSON structure before parsing
            if (!jsonContent.startsWith('{') || !jsonContent.endsWith('}')) {
              throw new Error(`Invalid JSON structure: starts with '${jsonContent.charAt(0)}', ends with '${jsonContent.charAt(jsonContent.length - 1)}'`);
            }
            
            // First try parsing without any fixes
            let mealPlanData;
            try {
              mealPlanData = JSON.parse(jsonContent);
              console.log('✅ JSON parsed successfully without fixes');
            } catch (firstParseError) {
              console.log('🔧 Initial parse failed, attempting fixes...');
              // Only apply fixes if initial parsing failed
              const fixedJsonContent = this.fixCommonJsonIssues(jsonContent);
              mealPlanData = JSON.parse(fixedJsonContent);
              console.log('✅ JSON parsed successfully with fixes');
            }
            console.log('✅ Successfully parsed JSON response');
            console.log('🔍 Top-level keys in parsed response:', Object.keys(mealPlanData));
            console.log('🔍 Has suggestions?', !!mealPlanData.suggestions);
            console.log('🔍 Has nutrition?', !!mealPlanData.nutrition);
            
            // Validate the response structure
            if (!this.isValidMealPlanResponse(mealPlanData)) {
              console.error('❌ Validation failed. Response structure:', JSON.stringify(mealPlanData, null, 2).substring(0, 500));
              throw new Error('Response does not match expected meal plan structure');
            }
            return {
              success: true,
              status: 'completed',
              data: mealPlanData,
              messageId: response.id || `claude-${Date.now()}`
            };
            } catch (parseError) {
              console.error('❌ Error parsing Claude JSON response:', parseError);
              console.log('🔍 Raw Claude response content:', content);
              console.log('🔍 Processed JSON content:', jsonContent);
              
              // Try one more time with a more aggressive fix
              try {
                let aggressivelyFixed = this.aggressiveJsonFix(jsonContent);
                
                // If we have position information, try to fix syntax errors at that position
                const positionMatch = parseError instanceof Error ? parseError.message.match(/at position (\d+)/) : null;
                if (positionMatch) {
                  const errorPosition = parseInt(positionMatch[1]);
                  aggressivelyFixed = this.fixJsonAtPosition(aggressivelyFixed, errorPosition);
                }
                const mealPlanData = JSON.parse(aggressivelyFixed);
                console.log('✅ Successfully parsed JSON with aggressive fixes');
                
                if (this.isValidMealPlanResponse(mealPlanData)) {
                  return {
                    success: true,
                    status: 'completed',
                    data: mealPlanData,
                    messageId: response.id || `claude-${Date.now()}`
                  };
                }
              } catch (secondParseError) {
                console.error('❌ Aggressive JSON fix also failed:', secondParseError);
              }
              
              // If all JSON parsing attempts failed, return the raw text response
              console.log('📄 JSON parsing failed completely, returning plaintext response');
              return {
                success: true,
                status: 'completed',
                data: {
                  rawText: content,
                  jsonParsingFailed: true,
                  error: `JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown parse error'}`
                },
                messageId: response.id || `claude-${Date.now()}`
              };
            }
        } else {
          console.error('❌ No content in Claude response');
          return {
            success: false,
            status: 'failed',
            error: 'No content received from Claude'
          };
        }
      } catch (error) {
        console.error(`❌ Error calling Claude API (attempt ${attempt + 1}):`, error);
        
        // Check if it's an overloaded error that we should retry
        const errorMessage = error instanceof Error ? error.message : String(error);
        const isOverloadedError = errorMessage.includes('Overloaded') || errorMessage.includes('overloaded') || errorMessage.includes('api_error');
        
        if (isOverloadedError && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
          console.log(`⏳ Claude API overloaded, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          attempt++;
          continue;
        }
        
        // If not retryable or max retries reached, return error
        return {
          success: false,
          status: 'failed',
          error: errorMessage
        };
      }
    }
    
    // This should never be reached due to the return statements above
    return {
      success: false,
      status: 'failed',
      error: 'Max retries exceeded'
    };
  }

  /**
   * Generate meal plan using Claude (async version - calls sync internally)
   */
  async generateMealPlan(request: ClaudeMealPlanRequest): Promise<ClaudeMealPlanResponse> {
    return this.generateMealPlanSync(request);
  }

  /**
   * Prepare the input message for Claude with strong allergen exclusion instructions
   */
  private prepareInputMessage(request: ClaudeMealPlanRequest): string {
    const { clientGoals, additionalText, mealProgram } = request;
    
    let message = `Generate a meal plan with nutrition breakdown. Return ONLY valid JSON - no markdown, no explanations.

NUTRITIONAL TARGETS:
- Calories: ${clientGoals.eerGoalCalories || 'Not specified'}
- Protein: ${clientGoals.proteinGoalMin || 0}-${clientGoals.proteinGoalMax || 0}g
- Carbs: ${clientGoals.carbsGoalMin || 0}-${clientGoals.carbsGoalMax || 0}g
- Fat: ${clientGoals.fatGoalMin || 0}-${clientGoals.fatGoalMax || 0}g`;
    
    if (clientGoals.fiberGoalGrams) {
      message += `\n- Fiber: ${clientGoals.fiberGoalGrams}g`;
    }
    
    // CRITICAL: Add allergen exclusion
    if (clientGoals.allergies && clientGoals.allergies.length > 0) {
      message += `\n\n⚠️ ALLERGIES (EXCLUDE COMPLETELY): ${clientGoals.allergies.join(', ')}`;
      message += `\n- Exclude ALL forms, derivatives, and cross-contamination risks of these allergens.`;
    }
    
    if (clientGoals.preferences && clientGoals.preferences.length > 0) {
      message += `\n- Dietary Preferences: ${clientGoals.preferences.join(', ')}`;
    }
    
    if (clientGoals.cuisineTypes && clientGoals.cuisineTypes.length > 0) {
      message += `\n- Cuisine Types: ${clientGoals.cuisineTypes.join(', ')}`;
    }
    
    if (clientGoals.notes) {
      message += `\n- Notes: ${clientGoals.notes}`;
    }
    
    // Add meal program constraints
    if (mealProgram && mealProgram.meals && mealProgram.meals.length > 0) {
      message += `\n\nMEAL STRUCTURE (${mealProgram.meals.length} meals per day):`;
      
      mealProgram.meals.forEach((meal: any) => {
        message += `\n${meal.mealOrder}. ${meal.mealName} (${meal.mealTime}) - ${meal.targetCalories || 'proportional'} cal`;
      });
    }
    
    if (additionalText) {
      message += `\n\nADDITIONAL: ${additionalText}`;
    }
    
    // Build default meal structure if no meal program provided
    const defaultMeals = [
      { mealName: 'breakfast', mealTime: '08:00', mealType: 'breakfast', mealOrder: 1 },
      { mealName: 'lunch', mealTime: '12:00', mealType: 'lunch', mealOrder: 2 },
      { mealName: 'dinner', mealTime: '18:00', mealType: 'dinner', mealOrder: 3 },
      { mealName: 'snack', mealTime: '15:00', mealType: 'snack', mealOrder: 4 }
    ];
    
    const mealsToUse = (mealProgram && mealProgram.meals && mealProgram.meals.length > 0) 
      ? mealProgram.meals 
      : defaultMeals;
    
    message += `

JSON FORMAT - COMPACT VERSION (return ONLY this structure):
{
  "suggestions": [
    {
      "day": 1,
      "date": "2025-10-29",
      "meals": {
        "${mealsToUse[0]?.mealName || 'breakfast'}": {
          "mealTime": "${mealsToUse[0]?.mealTime || '08:00'}",
          "targetCalories": ${mealsToUse[0]?.targetCalories || 500},
          "recipes": [
            {
              "id": "recipe-1-breakfast",
              "title": "Recipe Name Here",
              "image": null,
              "sourceUrl": null,
              "source": "claude",
              "servings": 1,
              "fromCache": false,
              "calories": 500,
              "protein": 25,
              "carbs": 60,
              "fat": 15,
              "fiber": 8,
              "nutrition": {"calories": {"value": 500, "unit": "kcal"}, "macros": {"protein": {"value": 25, "unit": "g"}, "carbs": {"value": 60, "unit": "g"}, "fat": {"value": 15, "unit": "g"}, "fiber": {"value": 8, "unit": "g"}, "sugar": {"value": 5, "unit": "g"}, "sodium": {"value": 200, "unit": "mg"}, "cholesterol": {"value": 10, "unit": "mg"}, "saturatedFat": {"value": 2, "unit": "g"}, "transFat": {"value": 0, "unit": "g"}, "monounsaturatedFat": {"value": 3, "unit": "g"}, "polyunsaturatedFat": {"value": 2, "unit": "g"}}, "micros": {"vitamins": {"vitaminA": {"value": 800, "unit": "IU"}, "vitaminC": {"value": 90, "unit": "mg"}, "vitaminD": {"value": 2, "unit": "mcg"}, "vitaminE": {"value": 5, "unit": "mg"}, "vitaminK": {"value": 1, "unit": "mcg"}, "thiamin": {"value": 0.5, "unit": "mg"}, "riboflavin": {"value": 0.6, "unit": "mg"}, "niacin": {"value": 5, "unit": "mg"}, "vitaminB6": {"value": 0.8, "unit": "mg"}, "folate": {"value": 100, "unit": "mcg"}, "vitaminB12": {"value": 1, "unit": "mcg"}, "biotin": {"value": 10, "unit": "mcg"}, "pantothenicAcid": {"value": 2, "unit": "mg"}}, "minerals": {"calcium": {"value": 300, "unit": "mg"}, "iron": {"value": 8, "unit": "mg"}, "magnesium": {"value": 50, "unit": "mg"}, "phosphorus": {"value": 200, "unit": "mg"}, "potassium": {"value": 400, "unit": "mg"}, "zinc": {"value": 3, "unit": "mg"}, "copper": {"value": 0.5, "unit": "mg"}, "manganese": {"value": 1, "unit": "mg"}, "selenium": {"value": 20, "unit": "mcg"}, "iodine": {"value": 50, "unit": "mcg"}, "chromium": {"value": 10, "unit": "mcg"}, "molybdenum": {"value": 20, "unit": "mcg"}}}},
              "ingredients": [{"text": "1 cup ingredient", "quantity": 1, "measure": "cup", "food": "ingredient", "weight": 100}],
              "instructions": ["Cook ingredient", "Serve hot"],
              "isSelected": true,
              "selectedAt": "2025-10-29T12:00:00.000Z"
            }
          ],
          "customizations": {},
          "selectedRecipeId": "recipe-1-breakfast",
          "totalNutrition": {"calories": {"value": 500, "unit": "kcal"}, "macros": {"protein": {"value": 25, "unit": "g"}, "carbs": {"value": 60, "unit": "g"}, "fat": {"value": 15, "unit": "g"}, "fiber": {"value": 8, "unit": "g"}, "sugar": {"value": 5, "unit": "g"}, "sodium": {"value": 200, "unit": "mg"}, "cholesterol": {"value": 10, "unit": "mg"}, "saturatedFat": {"value": 2, "unit": "g"}, "transFat": {"value": 0, "unit": "g"}, "monounsaturatedFat": {"value": 3, "unit": "g"}, "polyunsaturatedFat": {"value": 2, "unit": "g"}}, "micros": {"vitamins": {"vitaminA": {"value": 800, "unit": "IU"}, "vitaminC": {"value": 90, "unit": "mg"}, "vitaminD": {"value": 2, "unit": "mcg"}, "vitaminE": {"value": 5, "unit": "mg"}, "vitaminK": {"value": 1, "unit": "mcg"}, "thiamin": {"value": 0.5, "unit": "mg"}, "riboflavin": {"value": 0.6, "unit": "mg"}, "niacin": {"value": 5, "unit": "mg"}, "vitaminB6": {"value": 0.8, "unit": "mg"}, "folate": {"value": 100, "unit": "mcg"}, "vitaminB12": {"value": 1, "unit": "mcg"}, "biotin": {"value": 10, "unit": "mcg"}, "pantothenicAcid": {"value": 2, "unit": "mg"}}, "minerals": {"calcium": {"value": 300, "unit": "mg"}, "iron": {"value": 8, "unit": "mg"}, "magnesium": {"value": 50, "unit": "mg"}, "phosphorus": {"value": 200, "unit": "mg"}, "potassium": {"value": 400, "unit": "mg"}, "zinc": {"value": 3, "unit": "mg"}, "copper": {"value": 0.5, "unit": "mg"}, "manganese": {"value": 1, "unit": "mg"}, "selenium": {"value": 20, "unit": "mcg"}, "iodine": {"value": 50, "unit": "mcg"}, "chromium": {"value": 10, "unit": "mcg"}, "molybdenum": {"value": 20, "unit": "mcg"}}}}
        }
      }
    }
  ],
  "nutrition": {
    "byDay": [
      {
        "day": 1,
        "date": "2025-10-29",
        "meals": {
          "${mealsToUse[0]?.mealName || 'breakfast'}": {
            "mealTime": "${mealsToUse[0]?.mealTime || '08:00'}",
            "targetCalories": ${mealsToUse[0]?.targetCalories || 500},
            "calories": {"value": 500, "unit": "kcal"},
            "macros": {"protein": {"value": 25, "unit": "g"}, "carbs": {"value": 60, "unit": "g"}, "fat": {"value": 15, "unit": "g"}, "fiber": {"value": 8, "unit": "g"}, "sugar": {"value": 5, "unit": "g"}, "sodium": {"value": 200, "unit": "mg"}, "cholesterol": {"value": 10, "unit": "mg"}, "saturatedFat": {"value": 2, "unit": "g"}, "transFat": {"value": 0, "unit": "g"}, "monounsaturatedFat": {"value": 3, "unit": "g"}, "polyunsaturatedFat": {"value": 2, "unit": "g"}},
            "micros": {"vitamins": {"vitaminA": {"value": 800, "unit": "IU"}, "vitaminC": {"value": 90, "unit": "mg"}, "vitaminD": {"value": 2, "unit": "mcg"}, "vitaminE": {"value": 5, "unit": "mg"}, "vitaminK": {"value": 1, "unit": "mcg"}, "thiamin": {"value": 0.5, "unit": "mg"}, "riboflavin": {"value": 0.6, "unit": "mg"}, "niacin": {"value": 5, "unit": "mg"}, "vitaminB6": {"value": 0.8, "unit": "mg"}, "folate": {"value": 100, "unit": "mcg"}, "vitaminB12": {"value": 1, "unit": "mcg"}, "biotin": {"value": 10, "unit": "mcg"}, "pantothenicAcid": {"value": 2, "unit": "mg"}}, "minerals": {"calcium": {"value": 300, "unit": "mg"}, "iron": {"value": 8, "unit": "mg"}, "magnesium": {"value": 50, "unit": "mg"}, "phosphorus": {"value": 200, "unit": "mg"}, "potassium": {"value": 400, "unit": "mg"}, "zinc": {"value": 3, "unit": "mg"}, "copper": {"value": 0.5, "unit": "mg"}, "manganese": {"value": 1, "unit": "mg"}, "selenium": {"value": 20, "unit": "mcg"}, "iodine": {"value": 50, "unit": "mcg"}, "chromium": {"value": 10, "unit": "mcg"}, "molybdenum": {"value": 20, "unit": "mcg"}}}
          }
        },
        "dayTotal": {"calories": {"value": 2000, "unit": "kcal"}, "macros": {"protein": {"value": 150, "unit": "g"}, "carbs": {"value": 250, "unit": "g"}, "fat": {"value": 65, "unit": "g"}, "fiber": {"value": 30, "unit": "g"}, "sugar": {"value": 50, "unit": "g"}, "sodium": {"value": 2000, "unit": "mg"}, "cholesterol": {"value": 100, "unit": "mg"}, "saturatedFat": {"value": 20, "unit": "g"}, "transFat": {"value": 0, "unit": "g"}, "monounsaturatedFat": {"value": 25, "unit": "g"}, "polyunsaturatedFat": {"value": 15, "unit": "g"}}, "micros": {"vitamins": {"vitaminA": {"value": 3000, "unit": "IU"}, "vitaminC": {"value": 300, "unit": "mg"}, "vitaminD": {"value": 10, "unit": "mcg"}, "vitaminE": {"value": 20, "unit": "mg"}, "vitaminK": {"value": 80, "unit": "mcg"}, "thiamin": {"value": 2, "unit": "mg"}, "riboflavin": {"value": 2.5, "unit": "mg"}, "niacin": {"value": 20, "unit": "mg"}, "vitaminB6": {"value": 2.5, "unit": "mg"}, "folate": {"value": 400, "unit": "mcg"}, "vitaminB12": {"value": 5, "unit": "mcg"}, "biotin": {"value": 50, "unit": "mcg"}, "pantothenicAcid": {"value": 8, "unit": "mg"}}, "minerals": {"calcium": {"value": 1200, "unit": "mg"}, "iron": {"value": 18, "unit": "mg"}, "magnesium": {"value": 400, "unit": "mg"}, "phosphorus": {"value": 1200, "unit": "mg"}, "potassium": {"value": 3500, "unit": "mg"}, "zinc": {"value": 15, "unit": "mg"}, "copper": {"value": 2, "unit": "mg"}, "manganese": {"value": 5, "unit": "mg"}, "selenium": {"value": 70, "unit": "mcg"}, "iodine": {"value": 150, "unit": "mcg"}, "chromium": {"value": 35, "unit": "mcg"}, "molybdenum": {"value": 75, "unit": "mcg"}}}}
      }
    ],
    "overall": {"calories": {"value": 4000, "unit": "kcal"}, "macros": {"protein": {"value": 300, "unit": "g"}, "carbs": {"value": 500, "unit": "g"}, "fat": {"value": 130, "unit": "g"}, "fiber": {"value": 60, "unit": "g"}, "sugar": {"value": 100, "unit": "g"}, "sodium": {"value": 4000, "unit": "mg"}, "cholesterol": {"value": 200, "unit": "mg"}, "saturatedFat": {"value": 40, "unit": "g"}, "transFat": {"value": 0, "unit": "g"}, "monounsaturatedFat": {"value": 50, "unit": "g"}, "polyunsaturatedFat": {"value": 30, "unit": "g"}}, "micros": {"vitamins": {"vitaminA": {"value": 6000, "unit": "IU"}, "vitaminC": {"value": 600, "unit": "mg"}, "vitaminD": {"value": 20, "unit": "mcg"}, "vitaminE": {"value": 40, "unit": "mg"}, "vitaminK": {"value": 160, "unit": "mcg"}, "thiamin": {"value": 4, "unit": "mg"}, "riboflavin": {"value": 5, "unit": "mg"}, "niacin": {"value": 40, "unit": "mg"}, "vitaminB6": {"value": 5, "unit": "mg"}, "folate": {"value": 800, "unit": "mcg"}, "vitaminB12": {"value": 10, "unit": "mcg"}, "biotin": {"value": 100, "unit": "mcg"}, "pantothenicAcid": {"value": 16, "unit": "mg"}}, "minerals": {"calcium": {"value": 2400, "unit": "mg"}, "iron": {"value": 36, "unit": "mg"}, "magnesium": {"value": 800, "unit": "mg"}, "phosphorus": {"value": 2400, "unit": "mg"}, "potassium": {"value": 7000, "unit": "mg"}, "zinc": {"value": 30, "unit": "mg"}, "copper": {"value": 4, "unit": "mg"}, "manganese": {"value": 10, "unit": "mg"}, "selenium": {"value": 140, "unit": "mcg"}, "iodine": {"value": 300, "unit": "mcg"}, "chromium": {"value": 70, "unit": "mcg"}, "molybdenum": {"value": 150, "unit": "mcg"}}}},
    "dailyAverage": {"calories": {"value": 2000, "unit": "kcal"}, "macros": {"protein": {"value": 150, "unit": "g"}, "carbs": {"value": 250, "unit": "g"}, "fat": {"value": 65, "unit": "g"}, "fiber": {"value": 30, "unit": "g"}, "sugar": {"value": 50, "unit": "g"}, "sodium": {"value": 2000, "unit": "mg"}, "cholesterol": {"value": 100, "unit": "mg"}, "saturatedFat": {"value": 20, "unit": "g"}, "transFat": {"value": 0, "unit": "g"}, "monounsaturatedFat": {"value": 25, "unit": "g"}, "polyunsaturatedFat": {"value": 15, "unit": "g"}}, "micros": {"vitamins": {"vitaminA": {"value": 3000, "unit": "IU"}, "vitaminC": {"value": 300, "unit": "mg"}, "vitaminD": {"value": 10, "unit": "mcg"}, "vitaminE": {"value": 20, "unit": "mg"}, "vitaminK": {"value": 80, "unit": "mcg"}, "thiamin": {"value": 2, "unit": "mg"}, "riboflavin": {"value": 2.5, "unit": "mg"}, "niacin": {"value": 20, "unit": "mg"}, "vitaminB6": {"value": 2.5, "unit": "mg"}, "folate": {"value": 400, "unit": "mcg"}, "vitaminB12": {"value": 5, "unit": "mcg"}, "biotin": {"value": 50, "unit": "mcg"}, "pantothenicAcid": {"value": 8, "unit": "mg"}}, "minerals": {"calcium": {"value": 1200, "unit": "mg"}, "iron": {"value": 18, "unit": "mg"}, "magnesium": {"value": 400, "unit": "mg"}, "phosphorus": {"value": 1200, "unit": "mg"}, "potassium": {"value": 3500, "unit": "mg"}, "zinc": {"value": 15, "unit": "mg"}, "copper": {"value": 2, "unit": "mg"}, "manganese": {"value": 5, "unit": "mg"}, "selenium": {"value": 70, "unit": "mcg"}, "iodine": {"value": 150, "unit": "mcg"}, "chromium": {"value": 35, "unit": "mcg"}, "molybdenum": {"value": 75, "unit": "mcg"}}}}
  }
}

CRITICAL RULES - MUST FOLLOW EXACTLY:
1. Return ONLY JSON (no markdown, no text before/after, no code blocks, no backticks)
2. YOUR FIRST CHARACTER MUST BE: {
3. Start response EXACTLY with: {"suggestions":
4. DO NOT wrap in "success", "message", "data" or any other fields
5. Exclude all allergens completely - no exceptions
6. Generate ALL ${mealsToUse.length} meals for EACH day: ${mealsToUse.map((m: any) => m.mealName).join(', ')}
7. Each meal MUST be in the "meals" object under its meal name (e.g., "breakfast", "lunch")
8. Each meal MUST have: mealTime, targetCalories, recipes array, customizations object, selectedRecipeId, totalNutrition
9. Each recipe MUST have: id (unique), title, nutrition object, ingredients array, instructions array
10. totalNutrition for each meal = sum of all recipes in that meal's recipes array
11. nutrition.byDay[].dayTotal = sum of all meals for that day
12. nutrition.overall and nutrition.dailyAverage should match target goals as closely as possible
13. Generate ${request.days || 2} days of meals (ONLY ${request.days || 2} DAYS!)
14. Generate ONLY 1 recipe per meal (NOT multiple alternatives)
15. Keep instructions SHORT (2-3 steps max per recipe)
16. Keep ingredient lists CONCISE (4-6 ingredients per recipe)
17. Use proper JSON syntax - all strings in double quotes, commas between items
18. Dates should increment: day 1 = today, day 2 = tomorrow, etc.
19. Recipe IDs format: "recipe-{dayNumber}-{mealName}"
20. Use COMPACT JSON formatting (minimize whitespace)
21. EVERY meal in nutrition.byDay[].meals MUST include BOTH complete macros AND micros
22. ALL macros MUST be included (even if 0): protein, carbs, fat, fiber, sugar, sodium, cholesterol, saturatedFat, transFat, monounsaturatedFat, polyunsaturatedFat
23. ALL micros MUST be included in nested structure with vitamins and minerals
24. Vitamins MUST include: vitaminA, vitaminC, vitaminD, vitaminE, vitaminK, thiamin, riboflavin, niacin, vitaminB6, folate, vitaminB12, biotin, pantothenicAcid
25. Minerals MUST include: calcium, iron, magnesium, phosphorus, potassium, zinc, copper, manganese, selenium, iodine, chromium, molybdenum
26. If a nutrient value is unknown, use 0 - NEVER omit any nutrient field
27. dayTotal, overall, and dailyAverage MUST also include ALL complete macros AND micros
28. EACH recipe's "nutrition" field MUST use structured format: {calories: {value, unit}, macros: {...}, micros: {vitamins: {...}, minerals: {...}}}
29. EACH meal's "totalNutrition" field MUST use structured format: {calories: {value, unit}, macros: {...}, micros: {vitamins: {...}, minerals: {...}}}
30. DO NOT use flat format like {calories: 500, protein: 25} - ALWAYS use {calories: {value: 500, unit: "kcal"}, macros: {protein: {value: 25, unit: "g"}}}

IMPORTANT: Your response must have EXACTLY 2 top-level keys: "suggestions" and "nutrition"
DO NOT add "success", "message", "data" or any wrapper - just suggestions and nutrition!`;

    return message;
  }

  /**
   * Aggressive JSON fix for severely malformed responses
   */
  private aggressiveJsonFix(jsonString: string): string {
    let fixed = jsonString;
    
    // Try to complete incomplete JSON objects
    let braceCount = 0;
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < fixed.length; i++) {
      const char = fixed[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }
      
      if (char === '"') {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
      }
    }
    
    // Add missing closing braces
    while (braceCount > 0) {
      fixed += '}';
      braceCount--;
    }
    
    console.log('🔧 Applied aggressive JSON fixes');
    return fixed;
  }

  /**
   * Fix common JSON formatting issues
   */
  private fixCommonJsonIssues(jsonString: string): string {
    let fixed = jsonString;
    
    // Fix trailing commas in objects and arrays
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');
    
    // Fix missing commas between array elements (objects in arrays)
    fixed = fixed.replace(/}(\s*){/g, '},\n$1{');
    
    // Fix missing commas between array elements (strings/numbers)
    fixed = fixed.replace(/"(\s*)"(?!\s*[,:\]}])/g, '",$1"');
    
    // Fix missing commas after array elements before next element
    fixed = fixed.replace(/](\s*)\[/g, '],$1[');
    
    // Fix missing commas between object properties
    fixed = fixed.replace(/}(\s*)"([^"]*)"(\s*):/g, '},$1"$2"$3:');
    
    // Fix unescaped quotes in strings
    fixed = fixed.replace(/([^\\])"([^",:}\]]*)"([^,:\s}\]])/g, '$1"$2\\"$3');
    
    // Ensure numeric values are not quoted (unless they're meant to be strings)
    fixed = fixed.replace(/"(\d+(?:\.\d+)?)"(\s*[,}\]])/g, '$1$2');
    
    // Fix common array formatting issues
    fixed = this.fixArrayFormatting(fixed);
    
    console.log('🔧 Applied JSON fixes');
    return fixed;
  }

  /**
   * Fix JSON syntax errors at a specific position
   */
  private fixJsonAtPosition(jsonString: string, errorPosition: number): string {
    if (errorPosition >= jsonString.length) return jsonString;
    
    let fixed = jsonString;
    const context = 50; // Characters to check around the error position
    const start = Math.max(0, errorPosition - context);
    const end = Math.min(jsonString.length, errorPosition + context);
    const errorArea = jsonString.substring(start, end);
    
    console.log(`🔍 Fixing JSON at position ${errorPosition}`);
    console.log(`🔍 Error area: "${errorArea}"`);
    
    // Check what character is at the error position
    const errorChar = jsonString[errorPosition];
    const prevChar = errorPosition > 0 ? jsonString[errorPosition - 1] : '';
    const nextChar = errorPosition < jsonString.length - 1 ? jsonString[errorPosition + 1] : '';
    
    // Common fixes based on the error context
    if (errorChar === '{' && prevChar !== ',' && prevChar !== '[' && prevChar !== ':') {
      // Missing comma before object
      fixed = jsonString.substring(0, errorPosition) + ',' + jsonString.substring(errorPosition);
      console.log('🔧 Added missing comma before object');
    } else if (errorChar === '"' && prevChar === '"' && nextChar !== ':' && nextChar !== ',') {
      // Missing comma between strings
      fixed = jsonString.substring(0, errorPosition) + ',' + jsonString.substring(errorPosition);
      console.log('🔧 Added missing comma between strings');
    } else if (errorChar === '}' && prevChar !== '"' && prevChar !== '}' && prevChar !== ']' && !prevChar.match(/\d/)) {
      // Missing comma before closing brace
      fixed = jsonString.substring(0, errorPosition) + ',' + jsonString.substring(errorPosition);
      console.log('🔧 Added missing comma before closing brace');
    } else if ((errorChar === '[' || errorChar === '{') && prevChar === ']' || prevChar === '}') {
      // Missing comma between array/object elements
      fixed = jsonString.substring(0, errorPosition) + ',' + jsonString.substring(errorPosition);
      console.log('🔧 Added missing comma between elements');
    }
    
    return fixed;
  }

  /**
   * Fix specific array formatting issues
   */
  private fixArrayFormatting(jsonString: string): string {
    let fixed = jsonString;
    
    // Find arrays and fix missing commas between elements
    const arrayPattern = /\[([^\[\]]*(?:\[[^\]]*\][^\[\]]*)*)\]/g;
    
    fixed = fixed.replace(arrayPattern, (match, content) => {
      // Skip if it's a simple array or already properly formatted
      if (!content.includes('{') && !content.includes('"')) return match;
      
      let fixedContent = content;
      
      // Fix missing commas between objects in arrays
      fixedContent = fixedContent.replace(/}(\s*){/g, '},$1{');
      
      // Fix missing commas between strings in arrays
      fixedContent = fixedContent.replace(/"(\s*)"(?!\s*[,\]])/g, '",$1"');
      
      // Fix missing commas between numbers in arrays
      fixedContent = fixedContent.replace(/(\d)(\s*)(\d)/g, '$1,$2$3');
      
      return `[${fixedContent}]`;
    });
    
    return fixed;
  }

  /**
   * Validate meal plan response structure (manual/automated format)
   */
  private isValidMealPlanResponse(data: any): boolean {
    try {
      // Check basic structure - now expecting suggestions and nutrition at top level
      if (!data || typeof data !== 'object') return false;
      
      // Check for required top-level properties
      if (!data.suggestions || !Array.isArray(data.suggestions)) return false;
      if (!data.nutrition || typeof data.nutrition !== 'object') return false;
      
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
}