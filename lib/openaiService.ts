import OpenAI from 'openai';

export interface OpenAIMealPlanRequest {
  clientGoals: any;
  additionalText?: string;
  clientId: string;
  nutritionistId: string;
  mealProgram?: any;
  days?: number;
}

export interface OpenAIMealPlanResponse {
  success: boolean;
  data?: any;
  error?: string;
  messageId?: string;
  status?: 'completed' | 'failed';
}

export class OpenAIService {
  private openai: OpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY environment variable is required');
    }

    this.openai = new OpenAI({
      apiKey
    });
  }

  /**
   * Generate meal plan using OpenAI (synchronous version)
   */
  async generateMealPlanSync(request: OpenAIMealPlanRequest): Promise<OpenAIMealPlanResponse> {
    const maxRetries = 3;
    let attempt = 0;

    while (attempt < maxRetries) {
      try {
        console.log(`🤖 OpenAI meal plan generation started (attempt ${attempt + 1}/${maxRetries})`);

        // Warn if requesting too many days
        const days = request.days || 2;
        const mealsPerDay = request.mealProgram?.meals?.length || 2;
        if (days * mealsPerDay > 14) {
          console.log(`⚠️  Warning: Requesting ${days} days × ${mealsPerDay} meals = ${days * mealsPerDay} total meals`);
        }

        const prompt = this.prepareInputMessage(request);
        console.log('🤖 OpenAI prompt prepared');

        // Use GPT-4o-mini with streaming to avoid timeout (collects as it generates)
        console.log('🤖 Starting OpenAI streaming completion...');
        const startTime = Date.now();

        // Select model and max tokens based on environment variable
        const modelName = process.env.OPENAI_MODEL || 'gpt-4.1-mini-2025-04-14';
        let maxTokens = 16384; // Default for gpt-4o-mini and gpt-4o

        // Set max tokens based on model
        if (modelName === 'gpt-4o-64k-output-alpha') {
          maxTokens = 64000;
          console.log('🚀 Using GPT-4o 64k output model with 64,000 max tokens');
        } else if (modelName.includes('gpt-4.1')) {
          // GPT-4.1, GPT-4.1-mini, GPT-4.1-nano all support 32,768 output tokens
          maxTokens = 32768;
          console.log(`🚀 Using ${modelName} with 32,768 max tokens (GPT-4.1 family)`);
        } else {
          console.log(`🤖 Using ${modelName} with ${maxTokens} max tokens`);
        }

        const stream = await this.openai.chat.completions.create({
          model: modelName,
          messages: [
            {
              role: 'system',
              content: 'You are a professional nutritionist AI assistant that generates detailed meal plans in JSON format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: maxTokens,
          stream: true,
          response_format: { type: 'json_object' }
        });

        console.log('🤖 OpenAI streaming started');

        // Collect the streamed response with progress updates
        let content = '';
        let chunkCount = 0;
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content;
          if (delta) {
            content += delta;
            chunkCount++;

            // Log progress every 50 chunks
            if (chunkCount % 50 === 0) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              console.log(`🤖 OpenAI streaming progress: ${chunkCount} chunks, ${content.length} chars, ${elapsed}s elapsed`);
            }
          }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
        console.log(`🤖 OpenAI streaming completed: ${chunkCount} chunks, ${content.length} chars in ${elapsed}s`);

        if (content) {
          console.log('🤖 OpenAI response content received');

          try {
            // Parse the JSON response
            const parsedResponse = JSON.parse(content);
            console.log('✅ Successfully parsed OpenAI JSON response');

            // Validate structure (using suggestions format like Claude/Grok)
            if (!parsedResponse.suggestions || !Array.isArray(parsedResponse.suggestions)) {
              throw new Error('Invalid meal plan structure: missing suggestions array');
            }
            if (!parsedResponse.nutrition || typeof parsedResponse.nutrition !== 'object') {
              throw new Error('Invalid meal plan structure: missing nutrition object');
            }

            // Calculate byDay, overall, and dailyAverage nutrition from the suggestions
            console.log('🧮 Calculating nutrition aggregates...');
            parsedResponse.nutrition = this.calculateNutritionAggregates(parsedResponse.suggestions);
            console.log('✅ Nutrition aggregates calculated');

            return {
              success: true,
              data: parsedResponse,
              status: 'completed',
              messageId: `openai-${Date.now()}`
            };
          } catch (parseError) {
            console.error('❌ Failed to parse OpenAI JSON:', parseError);
            console.log('Raw content:', content.substring(0, 500));

            // Try to extract JSON from markdown code blocks
            const jsonMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              try {
                const parsedResponse = JSON.parse(jsonMatch[1]);
                console.log('✅ Successfully extracted and parsed JSON from markdown');

                return {
                  success: true,
                  data: parsedResponse,
                  status: 'completed',
                  messageId: `openai-${Date.now()}`
                };
              } catch (extractError) {
                console.error('❌ Failed to parse extracted JSON:', extractError);
              }
            }

            // If it's the last retry, return the error
            if (attempt === maxRetries - 1) {
              return {
                success: false,
                error: 'Failed to parse OpenAI response as JSON',
                status: 'failed'
              };
            }

            // Otherwise, retry
            attempt++;
            console.log(`🔄 Retrying... (${attempt}/${maxRetries})`);
            continue;
          }
        }

        throw new Error('No content in OpenAI response');
      } catch (error) {
        console.error(`❌ OpenAI error (attempt ${attempt + 1}/${maxRetries}):`, error);

        if (attempt === maxRetries - 1) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            status: 'failed'
          };
        }

        attempt++;
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }
    }

    return {
      success: false,
      error: 'Max retries exceeded',
      status: 'failed'
    };
  }

  /**
   * Prepare the input message for OpenAI (same format as Claude/Grok)
   */
  private prepareInputMessage(request: OpenAIMealPlanRequest): string {
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
              "source": "openai",
              "servings": 1,
              "fromCache": false,
              "calories": 500,
              "protein": 25,
              "carbs": 60,
              "fat": 15,
              "fiber": 8,
              "nutrition": {"calories": {"quantity": 500, "unit": "kcal"}, "macros": {"protein": {"quantity": 25, "unit": "g"}, "carbs": {"quantity": 60, "unit": "g"}, "fat": {"quantity": 15, "unit": "g"}, "fiber": {"quantity": 8, "unit": "g"}, "sugar": {"quantity": 5, "unit": "g"}, "sodium": {"quantity": 200, "unit": "mg"}, "cholesterol": {"quantity": 10, "unit": "mg"}, "saturatedFat": {"quantity": 2, "unit": "g"}, "transFat": {"quantity": 0, "unit": "g"}, "monounsaturatedFat": {"quantity": 3, "unit": "g"}, "polyunsaturatedFat": {"quantity": 2, "unit": "g"}}, "micros": {"vitamins": {"vitaminA": {"quantity": 800, "unit": "IU"}, "vitaminC": {"quantity": 90, "unit": "mg"}, "vitaminD": {"quantity": 2, "unit": "mcg"}, "vitaminE": {"quantity": 5, "unit": "mg"}, "vitaminB12": {"quantity": 1, "unit": "mcg"}, "folate": {"quantity": 100, "unit": "mcg"}}, "minerals": {"calcium": {"quantity": 300, "unit": "mg"}, "iron": {"quantity": 8, "unit": "mg"}, "magnesium": {"quantity": 50, "unit": "mg"}, "potassium": {"quantity": 400, "unit": "mg"}, "zinc": {"quantity": 3, "unit": "mg"}, "selenium": {"quantity": 20, "unit": "mcg"}}}},
              "ingredients": [{"text": "1 cup ingredient", "quantity": 1, "measure": "cup", "food": "ingredient", "weight": 100}],
              "instructions": ["Cook ingredient", "Serve hot"],
              "isSelected": true,
              "selectedAt": "2025-10-29T12:00:00.000Z"
            }
          ],
          "customizations": {},
          "selectedRecipeId": "recipe-1-breakfast",
          "totalNutrition": {"calories": {"quantity": 500, "unit": "kcal"}, "macros": {"protein": {"quantity": 25, "unit": "g"}, "carbs": {"quantity": 60, "unit": "g"}, "fat": {"quantity": 15, "unit": "g"}, "fiber": {"quantity": 8, "unit": "g"}, "sugar": {"quantity": 5, "unit": "g"}, "sodium": {"quantity": 200, "unit": "mg"}, "cholesterol": {"quantity": 10, "unit": "mg"}, "saturatedFat": {"quantity": 2, "unit": "g"}, "transFat": {"quantity": 0, "unit": "g"}, "monounsaturatedFat": {"quantity": 3, "unit": "g"}, "polyunsaturatedFat": {"quantity": 2, "unit": "g"}}, "micros": {"vitamins": {"vitaminA": {"quantity": 800, "unit": "IU"}, "vitaminC": {"quantity": 90, "unit": "mg"}, "vitaminD": {"quantity": 2, "unit": "mcg"}, "vitaminE": {"quantity": 5, "unit": "mg"}, "vitaminB12": {"quantity": 1, "unit": "mcg"}, "folate": {"quantity": 100, "unit": "mcg"}}, "minerals": {"calcium": {"quantity": 300, "unit": "mg"}, "iron": {"quantity": 8, "unit": "mg"}, "magnesium": {"quantity": 50, "unit": "mg"}, "potassium": {"quantity": 400, "unit": "mg"}, "zinc": {"quantity": 3, "unit": "mg"}, "selenium": {"quantity": 20, "unit": "mcg"}}}}
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
13. Escape special characters in strings: \\" \\\\ \\n \\t
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
35. Vitamins MUST include (essential 6): vitaminA, vitaminC, vitaminD, vitaminE, vitaminB12, folate
36. Minerals MUST include (essential 6): calcium, iron, magnesium, potassium, zinc, selenium
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
   * Calculate nutrition aggregates (byDay, overall, dailyAverage) from suggestions
   */
  private calculateNutritionAggregates(suggestions: any[]): any {
    const byDay: any[] = [];
    const totalDays = suggestions.length;

    // Helper function to create empty nutrient structure
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
          vitaminB12: { quantity: 0, unit: 'mcg' },
          folate: { quantity: 0, unit: 'mcg' }
        },
        minerals: {
          calcium: { quantity: 0, unit: 'mg' },
          iron: { quantity: 0, unit: 'mg' },
          magnesium: { quantity: 0, unit: 'mg' },
          potassium: { quantity: 0, unit: 'mg' },
          zinc: { quantity: 0, unit: 'mg' },
          selenium: { quantity: 0, unit: 'mcg' }
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
