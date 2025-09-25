import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeMealPlanRequest {
  clientGoals: any;
  additionalText?: string;
  clientId: string;
  nutritionistId: string;
  mealProgram?: any;
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

        const response = await this.anthropic.messages.create({
          model: 'claude-opus-4-1-20250805',
          max_tokens: 4000,
          temperature: 0.7,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        });

        console.log('🤖 Claude response received');

        if (response.content && response.content[0] && response.content[0].type === 'text') {
          let content = response.content[0].text;
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
            
            // Try to fix common JSON issues before parsing
            jsonContent = this.fixCommonJsonIssues(jsonContent);
            
            // Parse the JSON response
            const mealPlanData = JSON.parse(jsonContent);
            console.log('✅ Successfully parsed JSON response');
            
            // Validate the response structure
            if (!this.isValidMealPlanResponse(mealPlanData)) {
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

Please generate a comprehensive meal plan based on the following nutritional guidelines:

`;
    
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
    
    message += `
CRITICAL JSON FORMATTING INSTRUCTIONS:
- You MUST return ONLY valid JSON - no extra text before or after
- Do NOT wrap the JSON in markdown code blocks (no \`\`\`json)
- Do NOT include any explanations or additional text
- Ensure all JSON strings are properly quoted with double quotes
- Ensure all object properties are properly closed with closing braces
- Test your JSON mentally before responding - it must be parseable

RESPONSE FORMAT - Return ONLY this exact JSON structure:
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
            "carbsGoalMax": 450,
            "fatGoalMin": 80,
            "fatGoalMax": 120
        }
    }
}

FINAL CRITICAL INSTRUCTIONS:
- EXCLUDE ALL ALLERGENS COMPLETELY - no exceptions, no trace amounts
- FOLLOW MEAL PROGRAM STRUCTURE EXACTLY - correct number of meals, timing, and calorie targets
- Ensure all nutrition calculations are accurate
- Provide detailed, actionable cooking instructions
- Focus on balanced, nutritious meals that meet the client's goals
- Follow dietary preferences strictly and incorporate preferred cuisine types

JSON RESPONSE REQUIREMENTS:
1. Return ONLY the JSON object - no explanations, no markdown, no extra text
2. Start your response immediately with { and end with }
3. Ensure all strings use double quotes "like this"
4. Ensure all numeric values are numbers, not strings
5. CRITICAL: Every array element MUST be followed by a comma except the last one
   - ✅ Correct: ["item1", "item2", "item3"]
   - ❌ Wrong: ["item1" "item2" "item3"]
6. CRITICAL: Every object in an array MUST be followed by a comma except the last one
   - ✅ Correct: [{"a": 1}, {"b": 2}, {"c": 3}]
   - ❌ Wrong: [{"a": 1} {"b": 2} {"c": 3}]
7. Double-check your JSON is complete and properly closed
8. Pay special attention to the "ingredients" arrays - each ingredient object needs a comma

Your response must start with: {"success": true, "message": "Meal plan generated successfully", "data": {`;

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
   * Validate meal plan response structure
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
}