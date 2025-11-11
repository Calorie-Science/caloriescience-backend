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
    // Using CLAUDE_API_KEY_V2 as the environment variable name
    const apiKey = process.env.CLAUDE_API_KEY_V2;
    if (!apiKey) {
      throw new Error('CLAUDE_API_KEY_V2 environment variable is required');
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

        // Warn if requesting too many days (risk of truncation)
        const days = request.days || 2;
        const mealsPerDay = request.mealProgram?.meals?.length || 2;
        if (days * mealsPerDay > 14) {
          console.log(`⚠️  Warning: Requesting ${days} days × ${mealsPerDay} meals = ${days * mealsPerDay} total meals`);
          console.log(`⚠️  This may exceed token limits. Consider generating fewer days at a time.`);
        }

        const prompt = this.prepareInputMessage(request);
        console.log('🤖 Claude prompt prepared');

        const stream = await this.anthropic.messages.stream({
          model: 'claude-opus-4-1-20250805',
          max_tokens: 32000, // Claude Opus 4 maximum output tokens
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

        // Log token usage for monitoring
        if (response.usage) {
          console.log('📊 Token usage:', {
            input: response.usage.input_tokens,
            output: response.usage.output_tokens,
            total: (response.usage.input_tokens || 0) + (response.usage.output_tokens || 0)
          });

          // Warn if output tokens are close to limit
          const outputTokens = response.usage.output_tokens || 0;
          if (outputTokens > 28000) {
            console.log('⚠️  Warning: Output tokens approaching max_tokens limit (32K)!');
            console.log('⚠️  Consider reducing days or simplifying meal plan structure');
          }
        }

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
              .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters (keep \t, \n, \r)
              .trim();

            console.log('🔍 Final JSON content length:', jsonContent.length);
            console.log('🔍 JSON starts with:', jsonContent.substring(0, 50));
            console.log('🔍 JSON ends with:', jsonContent.substring(Math.max(0, jsonContent.length - 50)));

            // Check for potential truncation by counting opening vs closing brackets/braces
            const openBraces = (jsonContent.match(/\{/g) || []).length;
            const closeBraces = (jsonContent.match(/\}/g) || []).length;
            const openBrackets = (jsonContent.match(/\[/g) || []).length;
            const closeBrackets = (jsonContent.match(/\]/g) || []).length;

            if (openBraces !== closeBraces || openBrackets !== closeBrackets) {
              console.log('⚠️  Potential truncation detected:');
              console.log(`   Opening braces: ${openBraces}, Closing braces: ${closeBraces}, Diff: ${openBraces - closeBraces}`);
              console.log(`   Opening brackets: ${openBrackets}, Closing brackets: ${closeBrackets}, Diff: ${openBrackets - closeBrackets}`);
            }
            
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
              console.log('🔍 Parse error:', firstParseError instanceof Error ? firstParseError.message : String(firstParseError));

              // Log the exact JSON content that failed to parse
              console.log('🔍 JSON content (first 500 chars):', jsonContent.substring(0, 500));
              console.log('🔍 JSON content (last 500 chars):', jsonContent.substring(Math.max(0, jsonContent.length - 500)));

              // Only apply fixes if initial parsing failed
              const fixedJsonContent = this.fixCommonJsonIssues(jsonContent);

              // Log what changed
              if (fixedJsonContent !== jsonContent) {
                console.log('🔧 JSON fixes were applied, content changed');
                console.log('🔍 Fixed JSON (first 500 chars):', fixedJsonContent.substring(0, 500));
              } else {
                console.log('🔧 JSON fixes applied but no changes made');
              }

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

            // Calculate byDay, overall, and dailyAverage nutrition from the suggestions
            console.log('🧮 Calculating nutrition aggregates...');
            mealPlanData.nutrition = this.calculateNutritionAggregates(mealPlanData.suggestions);
            console.log('✅ Nutrition aggregates calculated');

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
    
    // Build default meal structure if no meal program provided (3 meals)
    const defaultMeals = [
      { mealName: 'breakfast', mealTime: '08:00', mealType: 'breakfast', mealOrder: 1 },
      { mealName: 'lunch', mealTime: '12:00', mealType: 'lunch', mealOrder: 2 },
      { mealName: 'dinner', mealTime: '18:00', mealType: 'dinner', mealOrder: 3 }
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
              "nutrition": {"calories": {"quantity": 500, "unit": "kcal"}, "macros": {"protein": {"quantity": 25, "unit": "g"}, "carbs": {"quantity": 60, "unit": "g"}, "fat": {"quantity": 15, "unit": "g"}, "fiber": {"quantity": 8, "unit": "g"}, "sugar": {"quantity": 5, "unit": "g"}, "sodium": {"quantity": 200, "unit": "mg"}, "cholesterol": {"quantity": 10, "unit": "mg"}, "saturatedFat": {"quantity": 2, "unit": "g"}, "transFat": {"quantity": 0, "unit": "g"}, "monounsaturatedFat": {"quantity": 3, "unit": "g"}, "polyunsaturatedFat": {"quantity": 2, "unit": "g"}}, "micros": {"vitamins": {"vitaminA": {"quantity": 800, "unit": "IU"}, "vitaminC": {"quantity": 90, "unit": "mg"}, "vitaminD": {"quantity": 2, "unit": "mcg"}, "vitaminE": {"quantity": 5, "unit": "mg"}, "vitaminK": {"quantity": 1, "unit": "mcg"}, "thiamin": {"quantity": 0.5, "unit": "mg"}, "riboflavin": {"quantity": 0.6, "unit": "mg"}, "niacin": {"quantity": 5, "unit": "mg"}, "vitaminB6": {"quantity": 0.8, "unit": "mg"}, "folate": {"quantity": 100, "unit": "mcg"}, "vitaminB12": {"quantity": 1, "unit": "mcg"}, "biotin": {"quantity": 10, "unit": "mcg"}, "pantothenicAcid": {"quantity": 2, "unit": "mg"}}, "minerals": {"calcium": {"quantity": 300, "unit": "mg"}, "iron": {"quantity": 8, "unit": "mg"}, "magnesium": {"quantity": 50, "unit": "mg"}, "phosphorus": {"quantity": 200, "unit": "mg"}, "potassium": {"quantity": 400, "unit": "mg"}, "zinc": {"quantity": 3, "unit": "mg"}, "copper": {"quantity": 0.5, "unit": "mg"}, "manganese": {"quantity": 1, "unit": "mg"}, "selenium": {"quantity": 20, "unit": "mcg"}, "iodine": {"quantity": 50, "unit": "mcg"}, "chromium": {"quantity": 10, "unit": "mcg"}, "molybdenum": {"quantity": 20, "unit": "mcg"}}}},
              "ingredients": [{"text": "1 cup ingredient", "quantity": 1, "measure": "cup", "food": "ingredient", "weight": 100}],
              "instructions": ["Cook ingredient", "Serve hot"],
              "isSelected": true,
              "selectedAt": "2025-10-29T12:00:00.000Z"
            }
          ],
          "customizations": {},
          "selectedRecipeId": "recipe-1-breakfast",
          "totalNutrition": {"calories": {"quantity": 500, "unit": "kcal"}, "macros": {"protein": {"quantity": 25, "unit": "g"}, "carbs": {"quantity": 60, "unit": "g"}, "fat": {"quantity": 15, "unit": "g"}, "fiber": {"quantity": 8, "unit": "g"}, "sugar": {"quantity": 5, "unit": "g"}, "sodium": {"quantity": 200, "unit": "mg"}, "cholesterol": {"quantity": 10, "unit": "mg"}, "saturatedFat": {"quantity": 2, "unit": "g"}, "transFat": {"quantity": 0, "unit": "g"}, "monounsaturatedFat": {"quantity": 3, "unit": "g"}, "polyunsaturatedFat": {"quantity": 2, "unit": "g"}}, "micros": {"vitamins": {"vitaminA": {"quantity": 800, "unit": "IU"}, "vitaminC": {"quantity": 90, "unit": "mg"}, "vitaminD": {"quantity": 2, "unit": "mcg"}, "vitaminE": {"quantity": 5, "unit": "mg"}, "vitaminK": {"quantity": 1, "unit": "mcg"}, "thiamin": {"quantity": 0.5, "unit": "mg"}, "riboflavin": {"quantity": 0.6, "unit": "mg"}, "niacin": {"quantity": 5, "unit": "mg"}, "vitaminB6": {"quantity": 0.8, "unit": "mg"}, "folate": {"quantity": 100, "unit": "mcg"}, "vitaminB12": {"quantity": 1, "unit": "mcg"}, "biotin": {"quantity": 10, "unit": "mcg"}, "pantothenicAcid": {"quantity": 2, "unit": "mg"}}, "minerals": {"calcium": {"quantity": 300, "unit": "mg"}, "iron": {"quantity": 8, "unit": "mg"}, "magnesium": {"quantity": 50, "unit": "mg"}, "phosphorus": {"quantity": 200, "unit": "mg"}, "potassium": {"quantity": 400, "unit": "mg"}, "zinc": {"quantity": 3, "unit": "mg"}, "copper": {"quantity": 0.5, "unit": "mg"}, "manganese": {"quantity": 1, "unit": "mg"}, "selenium": {"quantity": 20, "unit": "mcg"}, "iodine": {"quantity": 50, "unit": "mcg"}, "chromium": {"quantity": 10, "unit": "mcg"}, "molybdenum": {"quantity": 20, "unit": "mcg"}}}}
        }
      }
    }
  ],
  "nutrition": {"byDay": [], "overall": {}, "dailyAverage": {}}
}

CRITICAL JSON SYNTAX RULES - MUST FOLLOW EXACTLY:
1. Return ONLY JSON (no markdown, no text before/after, no code blocks, no backticks)
2. YOUR FIRST CHARACTER MUST BE: {
3. Start response EXACTLY with: {"suggestions":
4. DO NOT wrap in "success", "message", "data" or any other fields
5. ALL property names MUST be in double quotes: "propertyName": value
6. ALL string values MUST be in double quotes: "value"
7. Use commas between properties and array elements (but NO trailing commas)
8. Numbers should NOT be in quotes: 25 not "25"
9. Booleans should NOT be in quotes: true not "true"
10. null should NOT be in quotes: null not "null"
11. Ensure ALL braces and brackets are properly closed
12. NO single quotes - ONLY double quotes for strings
13. Escape special characters in strings: \" \\ \n \t
14. NO comments in JSON (// or /* */)
15. NO trailing commas before closing } or ]

CONTENT RULES - MUST FOLLOW EXACTLY:
16. Exclude all allergens completely - no exceptions
17. Generate ALL ${mealsToUse.length} meals for EACH day: ${mealsToUse.map((m: any) => m.mealName).join(', ')}
18. Each meal MUST be in the "meals" object under its meal name (e.g., "breakfast", "lunch")
19. Each meal MUST have: mealTime, targetCalories, recipes array, customizations object, selectedRecipeId, totalNutrition
20. Each recipe MUST have: id (unique), title, nutrition object, ingredients array, instructions array
21. totalNutrition for each meal = sum of all recipes in that meal's recipes array
22. Leave nutrition.byDay as empty array [] - we will calculate it on the backend
23. Leave nutrition.overall as empty object {} - we will calculate it on the backend
24. Leave nutrition.dailyAverage as empty object {} - we will calculate it on the backend
25. Generate ${request.days || 2} days of meals (ONLY ${request.days || 2} DAYS!)
26. Generate ONLY 1 recipe per meal (NOT multiple alternatives)
27. Instructions should be 5 clear steps per recipe (NOT more, NOT less)
28. Keep ingredient lists CONCISE (4-6 ingredients per recipe)
29. Dates should increment: day 1 = today, day 2 = tomorrow, etc.
30. Recipe IDs format: "recipe-{dayNumber}-{mealName}"
31. Use COMPACT JSON formatting (minimize whitespace)

NUTRITION STRUCTURE RULES:
32. EVERY recipe and meal MUST include BOTH complete macros AND micros
33. ALL macros MUST be included: protein, carbs, fat, fiber, sugar, sodium, cholesterol, saturatedFat, transFat, monounsaturatedFat, polyunsaturatedFat
34. ALL micros MUST be included in nested structure with vitamins and minerals
35. Vitamins MUST include (all 13): vitaminA, vitaminC, vitaminD, vitaminE, vitaminK, thiamin, riboflavin, niacin, vitaminB6, folate, vitaminB12, biotin, pantothenicAcid
36. Minerals MUST include (all 12): calcium, iron, magnesium, phosphorus, potassium, zinc, copper, manganese, selenium, iodine, chromium, molybdenum
37. CRITICAL - ACCURATE NUTRITION VALUES (DO NOT IGNORE):
   - Calculate nutrient values based on actual ingredients used - BE SPECIFIC AND REALISTIC
   - For cholesterol: Only animal products contain cholesterol (eggs ~186mg, chicken ~85mg, fish ~50-70mg, dairy/ghee ~20-30mg per serving). ALL plant-based foods = 0mg (rice, dosa, vegetables, vegetable oils, grains, lentils, nuts have ZERO cholesterol).
   - For vitamin B12: Animal products are rich sources (chicken 100g = 0.3mcg, fish 100g = 2-8mcg, eggs = 0.6mcg, dairy = 0.4-1.2mcg). Plant-based meals typically 0-0.1mcg unless fortified.
   - For vitamin D: Fatty fish (salmon 100g = 10-25mcg, mackerel = 5-10mcg), egg yolk = 2mcg, fortified dairy = 1-2mcg. Plant-based meals = 0-0.5mcg unless fortified (mushrooms/fortified products).
   - For saturatedFat: Animal products (chicken skin = 3-4g/100g, red meat = 5-10g/100g), coconut oil = 12g/tablespoon, ghee = 8g/tablespoon, palm oil = 7g/tablespoon. Calculate based on actual ingredients.
   - For transFat: Mainly in processed/fried foods. Natural whole foods = 0g or trace (<0.1g).
   - NEVER default all nutrients to 0 - this is INCORRECT and LAZY
   - Use your knowledge of food composition to estimate realistic values
   - Example: 100g cooked chicken breast should have ~0.3mcg B12, ~0.1mcg vitamin D, ~85mg cholesterol, ~1g saturated fat
   - Example: 1 egg should have ~0.6mcg B12, ~2mcg vitamin D, ~186mg cholesterol, ~1.6g saturated fat
   - Example: Dosa with sambar (no animal products) should have ~0mcg B12, ~0mcg vitamin D, 0mg cholesterol, ~0.5g saturated fat (from oil)
38. EACH recipe's "nutrition" field MUST use structured format: {"calories": {"quantity": 500, "unit": "kcal"}, "macros": {...}, "micros": {"vitamins": {...}, "minerals": {...}}}
39. EACH meal's "totalNutrition" field MUST use same structured format
40. DO NOT use flat format like {"calories": 500, "protein": 25}

VALIDATION CHECKLIST BEFORE RESPONDING:
✓ First character is {
✓ Starts with {"suggestions":
✓ Has exactly 2 top-level keys: "suggestions" and "nutrition"
✓ All property names in double quotes
✓ All strings in double quotes
✓ Numbers NOT in quotes
✓ No trailing commas
✓ All braces/brackets closed
✓ No comments or markdown

IMPORTANT: Your response must have EXACTLY 2 top-level keys: "suggestions" and "nutrition"
DO NOT add "success", "message", "data" or any wrapper - just suggestions and nutrition!`;

    return message;
  }

  /**
   * Aggressive JSON fix for severely malformed responses
   * Handles truncated JSON by:
   * 1. Detecting incomplete objects (missing required fields)
   * 2. Removing incomplete trailing content
   * 3. Properly closing remaining structure
   */
  private aggressiveJsonFix(jsonString: string): string {
    let fixed = jsonString;

    // First, try to detect and remove incomplete trailing objects
    // Look for common patterns that indicate truncation
    const truncationPatterns = [
      // Incomplete nutrition object (has micros but no ingredients/instructions)
      /,\s*"nutrition"\s*:\s*\{[^}]*"minerals"\s*:\s*\{[^}]*\}\s*\}\s*\}[^}]*$/,
      // Incomplete recipe object
      /,\s*\{\s*"id"\s*:\s*"[^"]*"[^}]*$/,
      // Any incomplete object at the end
      /,\s*"[^"]+"\s*:\s*[^,}]*$/
    ];

    let foundTruncation = false;
    for (const pattern of truncationPatterns) {
      if (pattern.test(fixed)) {
        // Try to find the last complete object boundary
        // Look for the last valid comma at the same nesting level
        let lastSafeComma = -1;
        let braceDepth = 0;
        let bracketDepth = 0;
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

          if (char === '"' && !escaped) {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (char === '{') braceDepth++;
            if (char === '}') braceDepth--;
            if (char === '[') bracketDepth++;
            if (char === ']') bracketDepth--;

            // Track commas at depth 3-4 (inside recipes array)
            if (char === ',' && braceDepth >= 3 && braceDepth <= 4) {
              lastSafeComma = i;
            }
          }
        }

        // If we found a safe comma, truncate there
        if (lastSafeComma > fixed.length / 2) {  // Must be in latter half
          fixed = fixed.substring(0, lastSafeComma);
          foundTruncation = true;
          console.log('🔧 Removed incomplete trailing object at position', lastSafeComma);
          break;
        }
      }
    }

    // Now count unmatched brackets and braces
    let braceCount = 0;
    let bracketCount = 0;
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

      if (char === '"' && !escaped) {
        inString = !inString;
        continue;
      }

      if (!inString) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (char === '[') bracketCount++;
        if (char === ']') bracketCount--;
      }
    }

    // If we're still in a string, close it
    if (inString) {
      fixed += '"';
      console.log('🔧 Closed unclosed string');
    }

    // Store counts before modifying
    const bracketsToAdd = bracketCount;
    const bracesToAdd = braceCount;

    // Add missing closing brackets first (arrays should close before objects)
    while (bracketCount > 0) {
      fixed += ']';
      bracketCount--;
    }

    // Add missing closing braces
    while (braceCount > 0) {
      fixed += '}';
      braceCount--;
    }

    if (foundTruncation || bracketsToAdd > 0 || bracesToAdd > 0) {
      console.log(`🔧 Applied aggressive JSON fixes: removed truncation=${foundTruncation}, added ${bracketsToAdd} closing brackets and ${bracesToAdd} closing braces`);
    }
    return fixed;
  }

  /**
   * Fix common JSON formatting issues
   * IMPORTANT: Be VERY conservative - only fix obvious issues
   */
  private fixCommonJsonIssues(jsonString: string): string {
    let fixed = jsonString;

    // Only fix trailing commas in objects and arrays (very safe fix)
    fixed = fixed.replace(/,(\s*[}\]])/g, '$1');

    // Fix missing commas between consecutive objects in arrays (safe)
    // Match: }whitespace{ where not inside quotes
    fixed = fixed.replace(/}(\s*){/g, '},\n$1{');

    // Fix missing commas between consecutive array brackets (safe)
    fixed = fixed.replace(/](\s*)\[/g, '],$1[');

    console.log('🔧 Applied conservative JSON fixes (trailing commas, missing commas between objects/arrays)');
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
      
      // Check nutrition structure exists (can be empty - will be calculated later)
      if (data.nutrition.byDay !== undefined && !Array.isArray(data.nutrition.byDay)) return false;
      if (data.nutrition.overall !== undefined && typeof data.nutrition.overall !== 'object') return false;
      if (data.nutrition.dailyAverage !== undefined && typeof data.nutrition.dailyAverage !== 'object') return false;
      
      console.log('✅ Meal plan response structure is valid (manual/automated format)');
      return true;
    } catch (error) {
      console.error('❌ Meal plan validation error:', error);
      return false;
    }
  }

  /**
   * Calculate nutrition aggregates (byDay, overall, dailyAverage) from suggestions
   */
  private calculateNutritionAggregates(suggestions: any[]): any {
    const byDay: any[] = [];
    const totalDays = suggestions.length;

    // Helper function to create empty nutrient structure (with all 13 vitamins and 12 minerals)
    const createEmptyNutrient = () => ({
      calories: { quantity: 0, unit: 'kcal' },
      macros: {
        protein: { quantity: 0, unit: 'g' },
        carbs: { quantity: 0, unit: 'g' },
        fat: { quantity: 0, unit: 'g' },
        fiber: { quantity: 0, unit: 'g' },
        sugar: { quantity: 0, unit: 'g' },
        sodium: { quantity: 0, unit: 'mg' },
        cholesterol: { quantity: 0, unit: 'mg' },
        saturatedFat: { quantity: 0, unit: 'g' },
        transFat: { quantity: 0, unit: 'g' },
        monounsaturatedFat: { quantity: 0, unit: 'g' },
        polyunsaturatedFat: { quantity: 0, unit: 'g' }
      },
      micros: {
        vitamins: {
          vitaminA: { quantity: 0, unit: 'IU' },
          vitaminC: { quantity: 0, unit: 'mg' },
          vitaminD: { quantity: 0, unit: 'mcg' },
          vitaminE: { quantity: 0, unit: 'mg' },
          vitaminK: { quantity: 0, unit: 'mcg' },
          thiamin: { quantity: 0, unit: 'mg' },
          riboflavin: { quantity: 0, unit: 'mg' },
          niacin: { quantity: 0, unit: 'mg' },
          vitaminB6: { quantity: 0, unit: 'mg' },
          folate: { quantity: 0, unit: 'mcg' },
          vitaminB12: { quantity: 0, unit: 'mcg' },
          biotin: { quantity: 0, unit: 'mcg' },
          pantothenicAcid: { quantity: 0, unit: 'mg' }
        },
        minerals: {
          calcium: { quantity: 0, unit: 'mg' },
          iron: { quantity: 0, unit: 'mg' },
          magnesium: { quantity: 0, unit: 'mg' },
          phosphorus: { quantity: 0, unit: 'mg' },
          potassium: { quantity: 0, unit: 'mg' },
          zinc: { quantity: 0, unit: 'mg' },
          copper: { quantity: 0, unit: 'mg' },
          manganese: { quantity: 0, unit: 'mg' },
          selenium: { quantity: 0, unit: 'mcg' },
          iodine: { quantity: 0, unit: 'mcg' },
          chromium: { quantity: 0, unit: 'mcg' },
          molybdenum: { quantity: 0, unit: 'mcg' }
        }
      }
    });

    // Helper function to add nutrients
    const addNutrients = (target: any, source: any) => {
      if (!source) return;

      if (source.calories?.quantity) {
        target.calories.quantity += source.calories.quantity;
      }

      // Add macros
      if (source.macros) {
        Object.keys(target.macros).forEach(macro => {
          if (source.macros[macro]?.quantity) {
            target.macros[macro].quantity += source.macros[macro].quantity;
          }
        });
      }

      // Add micros (vitamins)
      if (source.micros?.vitamins) {
        Object.keys(target.micros.vitamins).forEach(vitamin => {
          if (source.micros.vitamins[vitamin]?.quantity) {
            target.micros.vitamins[vitamin].quantity += source.micros.vitamins[vitamin].quantity;
          }
        });
      }

      // Add micros (minerals)
      if (source.micros?.minerals) {
        Object.keys(target.micros.minerals).forEach(mineral => {
          if (source.micros.minerals[mineral]?.quantity) {
            target.micros.minerals[mineral].quantity += source.micros.minerals[mineral].quantity;
          }
        });
      }
    };

    // Initialize overall total
    const overall = createEmptyNutrient();

    // Calculate nutrition for each day
    suggestions.forEach((day: any) => {
      const dayTotal = createEmptyNutrient();
      const meals: any = {};

      // Process each meal in the day
      if (day.meals) {
        Object.keys(day.meals).forEach(mealName => {
          const meal = day.meals[mealName];
          const mealNutrition = createEmptyNutrient();

          // Use totalNutrition if available, otherwise sum up recipes
          if (meal.totalNutrition) {
            addNutrients(mealNutrition, meal.totalNutrition);
          } else if (meal.recipes && Array.isArray(meal.recipes)) {
            meal.recipes.forEach((recipe: any) => {
              if (recipe.nutrition) {
                addNutrients(mealNutrition, recipe.nutrition);
              }
            });
          }

          meals[mealName] = mealNutrition;
          addNutrients(dayTotal, mealNutrition);
        });
      }

      byDay.push({
        day: day.day,
        date: day.date,
        meals,
        dayTotal
      });

      // Add to overall
      addNutrients(overall, dayTotal);
    });

    // Calculate daily average
    const dailyAverage = createEmptyNutrient();
    if (totalDays > 0) {
      // Divide overall by number of days
      dailyAverage.calories.quantity = Math.round(overall.calories.quantity / totalDays);

      Object.keys(dailyAverage.macros).forEach(macro => {
        dailyAverage.macros[macro].quantity = Math.round(overall.macros[macro].quantity / totalDays);
      });

      Object.keys(dailyAverage.micros.vitamins).forEach(vitamin => {
        dailyAverage.micros.vitamins[vitamin].quantity = Math.round(overall.micros.vitamins[vitamin].quantity / totalDays);
      });

      Object.keys(dailyAverage.micros.minerals).forEach(mineral => {
        dailyAverage.micros.minerals[mineral].quantity = Math.round(overall.micros.minerals[mineral].quantity / totalDays);
      });
    }

    return {
      byDay,
      overall,
      dailyAverage
    };
  }
}