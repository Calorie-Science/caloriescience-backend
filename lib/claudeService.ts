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
      message += `\n\nMEAL STRUCTURE (${mealProgram.meals.length} meals):`;
      
      mealProgram.meals.forEach((meal: any) => {
        message += `\n${meal.mealOrder}. ${meal.mealName} (${meal.mealTime}) - ${meal.targetCalories || 'proportional'} cal`;
      });
    }
    
    if (additionalText) {
      message += `\n\nADDITIONAL: ${additionalText}`;
    }
    
    message += `

JSON FORMAT (return ONLY this structure):
{
  "success": true,
  "message": "Meal plan generated successfully",
  "data": {
    "mealPlan": {
      "dailyNutrition": {"totalCalories": 0, "totalProtein": 0, "totalCarbs": 0, "totalFat": 0, "totalFiber": 0, "totalSodium": 0, "totalSugar": 0},
      "previewId": "claude-generated-plan",
      "days": [{
        "dayNumber": 1,
        "date": "2025-09-17",
        "meals": [{
          "id": "meal-1",
          "mealType": "breakfast",
          "mealOrder": 1,
          "recipeName": "Recipe Name",
          "recipeUrl": null,
          "recipeImageUrl": null,
          "caloriesPerServing": 0,
          "proteinGrams": 0,
          "carbsGrams": 0,
          "fatGrams": 0,
          "fiberGrams": 0,
          "servingsPerMeal": 1,
          "totalCalories": 0,
          "totalProtein": 0,
          "totalCarbs": 0,
          "totalFat": 0,
          "totalFiber": 0,
          "recipe": ["Step 1", "Step 2"],
          "ingredients": [{"text": "ingredient", "quantity": 0, "measure": "unit", "food": "food", "weight": 0}],
          "edamamRecipeId": null
        }],
        "dailyNutrition": {"totalCalories": 0, "totalProtein": 0, "totalCarbs": 0, "totalFat": 0, "totalFiber": 0, "totalSodium": 0, "totalSugar": 0}
      }]
    },
    "clientGoals": ${JSON.stringify({
      eerGoalCalories: clientGoals.eerGoalCalories,
      proteinGoalMin: clientGoals.proteinGoalMin,
      proteinGoalMax: clientGoals.proteinGoalMax,
      carbsGoalMin: clientGoals.carbsGoalMin,
      carbsGoalMax: clientGoals.carbsGoalMax,
      fatGoalMin: clientGoals.fatGoalMin,
      fatGoalMax: clientGoals.fatGoalMax
    })}
  }
}

RULES:
1. Return ONLY JSON (no markdown, no text before/after)
2. Exclude all allergens completely
3. Match meal structure exactly
4. Use proper JSON syntax with commas between array/object items
5. Start response with: {"success": true,`;

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