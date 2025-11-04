import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealPlanDraftService } from '../../lib/mealPlanDraftService';
import { RecipeCacheService } from '../../lib/recipeCacheService';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
import { simpleIngredientService } from '../../lib/simpleIngredientService';
import Joi from 'joi';

const draftService = new MealPlanDraftService();
const cacheService = new RecipeCacheService();
const multiProviderService = new MultiProviderRecipeSearchService();

// Validation schema
const customizedRecipeSchema = Joi.object({
  recipeId: Joi.string().required(),
  draftId: Joi.string().required(),
  day: Joi.number().integer().min(1).required(),
  mealName: Joi.string().required()
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { recipeId, draftId, day, mealName } = req.query;

    // Validate query parameters
    const { error, value } = customizedRecipeSchema.validate({
      recipeId,
      draftId,
      day: day ? parseInt(day as string) : undefined,
      mealName
    });

    if (error) {
      return res.status(400).json({
        error: 'Validation error',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    const { recipeId: validatedRecipeId, draftId: validatedDraftId, day: validatedDay, mealName: validatedMealName } = value;

    console.log('🔍 Fetching customized recipe:', {
      recipeId: validatedRecipeId,
      draftId: validatedDraftId,
      day: validatedDay,
      mealName: validatedMealName
    });

    // Step 1: Get the draft
    const draft = await draftService.getDraft(validatedDraftId);
    if (!draft) {
      return res.status(404).json({
        error: 'Draft not found',
        message: 'The specified draft does not exist or has expired'
      });
    }

    // Verify user has access to this draft
    if (draft.nutritionistId !== user.id) {
      return res.status(403).json({
        error: 'Access denied',
        message: 'You do not have access to this draft'
      });
    }

    // Step 2: Find the recipe in the draft
    const dayPlan = draft.suggestions.find((d: any) => d.day === validatedDay);
    if (!dayPlan) {
      return res.status(404).json({
        error: 'Day not found',
        message: `Day ${validatedDay} not found in draft`
      });
    }

    // Find the meal (case-insensitive) to support both automated and manual meal plans
    let targetMealName = validatedMealName;
    const mealKeys = Object.keys(dayPlan.meals);
    const matchedMeal = mealKeys.find(key => key.toLowerCase() === validatedMealName.toLowerCase());
    
    if (matchedMeal) {
      targetMealName = matchedMeal;
      console.log(`✅ Found meal (case-insensitive): "${validatedMealName}" → "${targetMealName}"`);
    }

    const meal = dayPlan.meals[targetMealName];
    if (!meal) {
      return res.status(404).json({
        error: 'Meal not found',
        message: `Meal ${validatedMealName} not found for day ${validatedDay}`
      });
    }

    const recipe = meal.recipes.find((r: any) => r.id === validatedRecipeId);
    if (!recipe) {
      return res.status(404).json({
        error: 'Recipe not found',
        message: `Recipe ${validatedRecipeId} not found in meal ${validatedMealName}`
      });
    }

    // Check if this is a simple ingredient recipe
    const isSimpleIngredient = validatedRecipeId.startsWith('ingredient_') || recipe.isSimpleIngredient;
    
    if (isSimpleIngredient) {
      // Handle simple ingredient recipes - return with customization support
      // Pass meal object to access customizations
      return await handleIngredientRecipe(validatedRecipeId, recipe, meal, res);
    }

    // Check if this is a manual/custom recipe
    const isManualRecipe = recipe.source === 'manual' || validatedRecipeId.startsWith('manual_');
    
    if (isManualRecipe) {
      // Handle manual/custom recipes - return with customization support
      return await handleManualRecipe(validatedRecipeId, recipe, meal, res);
    }

    // Step 3: Get base recipe from cache or API (using same structure as recipe details API)
    let baseRecipe: any;
    let fromCache = false;
    const source = recipe.source as 'edamam' | 'spoonacular';

    // Try cache first
    const cachedRecipe = await cacheService.getRecipeByExternalId(source, validatedRecipeId);
    if (cachedRecipe) {
      console.log('✅ Found recipe in cache');
      fromCache = true;
      // Supabase returns snake_case from DB, need to access correctly
      const cached = cachedRecipe as any;
      // Use the exact same structure as recipe details API
      // Extract nutrition details from cache or originalApiResponse
      let nutritionDetails = cached.nutrition_details || cached.nutritionDetails;
      
      // If nutritionDetails is empty/null or has no actual data, try to extract from originalApiResponse
      const hasActualNutritionData = nutritionDetails && (
        (nutritionDetails.calories && nutritionDetails.calories.quantity > 0) ||
        (nutritionDetails.macros && Object.keys(nutritionDetails.macros).length > 0)
      );
      
      if (!hasActualNutritionData) {
        const originalResponse = cached.original_api_response || cached.originalApiResponse;
        
        if (originalResponse) {
          // Try Edamam format
          if (originalResponse.totalNutrients) {
            const NutritionMappingService = require('../../lib/nutritionMappingService').NutritionMappingService;
            // Pass servings to get PER-SERVING nutrition (Edamam returns total)
            const recipeServings = cached.servings || originalResponse.yield || 1;
            nutritionDetails = NutritionMappingService.transformEdamamNutrition(originalResponse, recipeServings);
          }
          // Try Spoonacular format or already standardized
          else if (originalResponse.nutrition) {
            // Check if already in standardized format
            if (originalResponse.nutrition.macros || originalResponse.nutrition.calories) {
              nutritionDetails = originalResponse.nutrition;
            } 
            // Raw Spoonacular format with nutrients array
            else if (originalResponse.nutrition.nutrients) {
              const NutritionMappingService = require('../../lib/nutritionMappingService').NutritionMappingService;
              nutritionDetails = NutritionMappingService.transformSpoonacularNutrition(originalResponse.nutrition);
            }
          }
        }
        
        // Check again if we have actual nutrition data now
        const hasActualDataAfterExtraction = nutritionDetails && (
          (nutritionDetails.calories && nutritionDetails.calories.quantity > 0) ||
          (nutritionDetails.macros && Object.keys(nutritionDetails.macros).length > 0)
        );
        
        // If we successfully extracted nutrition from originalApiResponse, update the cache
        if (hasActualDataAfterExtraction && cached.id) {
          try {
            await cacheService.updateRecipeNutrition(cached.id, nutritionDetails);
          } catch (error) {
            console.error('Failed to update cache:', error);
          }
        }
        
        // If still no nutritionDetails, fetch from API
        if (!hasActualDataAfterExtraction) {
          const freshRecipeDetails = await multiProviderService.getRecipeDetails(validatedRecipeId);
          if (freshRecipeDetails && freshRecipeDetails.nutrition) {
            console.log('  ✅ Got fresh nutrition from API');
            const NutritionMappingService = require('../../lib/nutritionMappingService').NutritionMappingService;
            
            // Transform based on source
            if (source === 'edamam' && freshRecipeDetails.nutrition.totalNutrients) {
              // Pass servings to get PER-SERVING nutrition (Edamam returns total)
              const recipeServings = freshRecipeDetails.servings || freshRecipeDetails.nutrition.yield || 1;
              nutritionDetails = NutritionMappingService.transformEdamamNutrition(freshRecipeDetails.nutrition, recipeServings);
            } else if (source === 'spoonacular') {
              nutritionDetails = NutritionMappingService.transformSpoonacularNutrition(freshRecipeDetails.nutrition);
            }
            
            // Update cache with new nutrition details
            if (nutritionDetails && cached.id) {
              try {
                console.log('  💾 Updating cache with nutrition details...');
                await cacheService.updateRecipeNutrition(cached.id, nutritionDetails);
                console.log('  ✅ Cache updated successfully');
              } catch (error) {
                console.error('  ❌ Failed to update cache:', error);
              }
            }
          }
        }
      }
      
      // Extract health labels from originalApiResponse if missing (especially for Spoonacular)
      let healthLabels = cached.health_labels || cached.healthLabels || [];
      if ((!healthLabels || healthLabels.length === 0) && source === 'spoonacular') {
        const originalResponse = cached.original_api_response || cached.originalApiResponse;
        
        // Check if originalApiResponse has data and extract labels
        const hasOriginalResponseData = originalResponse && Object.keys(originalResponse).length > 0;
        
        if (hasOriginalResponseData) {
          // Spoonacular stores health info as boolean flags (glutenFree, dairyFree, etc.)
          const extractedLabels: string[] = [];
          if (originalResponse.glutenFree) extractedLabels.push('gluten-free');
          if (originalResponse.dairyFree) extractedLabels.push('dairy-free');
          if (originalResponse.vegetarian) extractedLabels.push('vegetarian');
          if (originalResponse.vegan) extractedLabels.push('vegan');
          if (originalResponse.ketogenic) extractedLabels.push('ketogenic');
          if (originalResponse.lowFodmap) extractedLabels.push('low-fodmap');
          if (originalResponse.whole30) extractedLabels.push('whole30');
          
          if (extractedLabels.length > 0) {
            healthLabels = extractedLabels;
            console.log(`  ✅ Extracted ${extractedLabels.length} health labels from cached originalApiResponse:`, extractedLabels);
          }
        } else {
          // originalApiResponse is empty, fetch fresh data from API
          console.log('  ⚠️ originalApiResponse is empty, fetching fresh health labels from Spoonacular API...');
          try {
            const freshRecipeDetails = await multiProviderService.getRecipeDetails(validatedRecipeId);
            if (freshRecipeDetails && freshRecipeDetails.healthLabels) {
              healthLabels = freshRecipeDetails.healthLabels;
              console.log(`  ✅ Fetched ${healthLabels.length} health labels from fresh API call:`, healthLabels);
            }
          } catch (error) {
            console.error('  ❌ Failed to fetch fresh health labels:', error);
          }
        }
      }
      
      baseRecipe = {
        id: cached.id,
        provider: cached.provider,
        externalRecipeId: cached.external_recipe_id || cached.externalRecipeId,
        externalRecipeUri: cached.external_recipe_uri || cached.externalRecipeUri,
        recipeName: cached.recipe_name || cached.recipeName,
        recipeSource: cached.recipe_source || cached.recipeSource,
        recipeUrl: cached.recipe_url || cached.recipeUrl,
        recipeImageUrl: cached.recipe_image_url || cached.recipeImageUrl,
        cuisineTypes: cached.cuisine_types || cached.cuisineTypes || [],
        mealTypes: cached.meal_types || cached.mealTypes || [],
        dishTypes: cached.dish_types || cached.dishTypes || [],
        healthLabels: healthLabels,
        dietLabels: cached.diet_labels || cached.dietLabels || [],
        servings: cached.servings,
        nutritionServings: 1, // Default to 1, can be changed via edit servings API
        prepTimeMinutes: cached.prep_time_minutes || cached.prepTimeMinutes,
        cookTimeMinutes: cached.cook_time_minutes || cached.cookTimeMinutes,
        totalTimeMinutes: cached.total_time_minutes || cached.totalTimeMinutes,
        caloriesPerServing: (cached.calories_per_serving || cached.caloriesPerServing)?.toString(),
        proteinPerServingG: (cached.protein_per_serving_g || cached.proteinPerServingG)?.toString(),
        carbsPerServingG: (cached.carbs_per_serving_g || cached.carbsPerServingG)?.toString(),
        fatPerServingG: (cached.fat_per_serving_g || cached.fatPerServingG)?.toString(),
        fiberPerServingG: (cached.fiber_per_serving_g || cached.fiberPerServingG)?.toString(),
        sugarPerServingG: (cached.total_sugar_g || cached.totalSugarG)?.toString(),
        sodiumPerServingMg: (cached.total_sodium_mg || cached.totalSodiumMg)?.toString(),
        totalCalories: cached.total_calories || cached.totalCalories,
        totalProteinG: cached.total_protein_g || cached.totalProteinG,
        totalCarbsG: cached.total_carbs_g || cached.totalCarbsG,
        totalFatG: cached.total_fat_g || cached.totalFatG,
        totalFiberG: cached.total_fiber_g || cached.totalFiberG,
        totalSugarG: cached.total_sugar_g || cached.totalSugarG,
        totalSodiumMg: cached.total_sodium_mg || cached.totalSodiumMg,
        totalWeightG: cached.total_weight_g || cached.totalWeightG,
        ingredients: (cached.ingredients || []).map((ing: any) => ({
          ...ing,
          // Transform cached field names to expected format
          amount: ing.amount !== undefined ? ing.amount : ing.quantity,
          unit: ing.unit !== undefined ? ing.unit : ing.measure
        })),
        ingredientLines: cached.ingredient_lines || cached.ingredientLines || [],
        cookingInstructions: cached.cooking_instructions || cached.cookingInstructions || [],
        nutritionDetails: nutritionDetails || {},
        originalApiResponse: cached.original_api_response || cached.originalApiResponse || {},
        cacheStatus: cached.cache_status || cached.cacheStatus,
        apiFetchCount: cached.api_fetch_count || cached.apiFetchCount,
        lastApiFetchAt: cached.last_api_fetch_at || cached.lastApiFetchAt,
        lastAccessedAt: cached.last_accessed_at || cached.lastAccessedAt,
        hasCompleteNutrition: cached.has_complete_nutrition || cached.hasCompleteNutrition,
        hasDetailedIngredients: cached.has_detailed_ingredients || cached.hasDetailedIngredients,
        hasCookingInstructions: cached.has_cooking_instructions || cached.hasCookingInstructions,
        dataQualityScore: cached.data_quality_score || cached.dataQualityScore,
        createdAt: cached.created_at || cached.createdAt,
        updatedAt: cached.updated_at || cached.updatedAt,
        customNotes: recipe.customNotes || null
      };
    } else {
      // Fetch from API if not in cache
      console.log('🔄 Fetching recipe from API');
      const recipeDetails = await multiProviderService.getRecipeDetails(validatedRecipeId);
      if (!recipeDetails) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: 'Could not fetch recipe from provider'
        });
      }
      
      // Convert API response to match cache structure
      baseRecipe = {
        id: null, // Not in cache yet
        provider: source,
        externalRecipeId: recipeDetails.id,
        externalRecipeUri: recipeDetails.uri || recipeDetails.sourceUrl,
        recipeName: recipeDetails.title,
        recipeSource: recipeDetails.source,
        recipeUrl: recipeDetails.sourceUrl,
        recipeImageUrl: recipeDetails.image,
        cuisineTypes: recipeDetails.cuisineTypes || recipeDetails.cuisineType || [],
        mealTypes: recipeDetails.mealTypes || recipeDetails.mealType || [],
        dishTypes: recipeDetails.dishTypes || recipeDetails.dishType || [],
        healthLabels: recipeDetails.healthLabels || [],
        dietLabels: recipeDetails.dietLabels || [],
        servings: recipeDetails.servings,
        prepTimeMinutes: recipeDetails.prepTimeMinutes || null,
        cookTimeMinutes: recipeDetails.cookTimeMinutes || null,
        totalTimeMinutes: recipeDetails.readyInMinutes || recipeDetails.totalTimeMinutes,
        caloriesPerServing: recipeDetails.calories?.toString(),
        proteinPerServingG: recipeDetails.protein?.toString(),
        carbsPerServingG: recipeDetails.carbs?.toString(),
        fatPerServingG: recipeDetails.fat?.toString(),
        fiberPerServingG: recipeDetails.fiber?.toString(),
        sugarPerServingG: null,
        sodiumPerServingMg: null,
        totalCalories: null,
        totalProteinG: null,
        totalCarbsG: null,
        totalFatG: null,
        totalFiberG: null,
        totalSugarG: null,
        totalSodiumMg: null,
        totalWeightG: null,
        ingredients: recipeDetails.ingredients || [],
        ingredientLines: recipeDetails.ingredientLines || [],
        cookingInstructions: recipeDetails.instructions || [],
        nutritionDetails: recipeDetails.nutrition || {},
        originalApiResponse: recipeDetails,
        cacheStatus: null,
        apiFetchCount: 0,
        lastApiFetchAt: null,
        lastAccessedAt: null,
        hasCompleteNutrition: false,
        hasDetailedIngredients: recipeDetails.ingredients?.length > 0,
        hasCookingInstructions: (recipeDetails.instructions?.length || 0) > 0,
        dataQualityScore: null,
        createdAt: null,
        updatedAt: null,
        customNotes: recipe.customNotes || null
      };
      
      // CACHE THE RECIPE for future use!
      try {
        console.log('💾 Caching recipe for future use...');
        
        // NOTE: multiProviderService.getRecipeDetails() already returns transformed nutrition
        // So we just use it directly, no need to transform again!
        let nutritionDetails: any = null;
        
        if (recipeDetails.nutrition) {
          nutritionDetails = recipeDetails.nutrition;
          console.log(`  💾 Using pre-transformed nutrition for caching: protein=${nutritionDetails?.macros?.protein?.quantity || 0}g`);
        } else {
          console.warn(`  ⚠️ No nutrition data in API response for recipe ${recipeDetails.id}`);
        }
        
        // Only cache if we have complete nutrition with detailed macros
        const hasCompleteNutrition = !!(nutritionDetails?.macros?.protein?.quantity);
        
        if (!hasCompleteNutrition) {
          console.log('⚠️ Skipping cache - incomplete nutrition data. Recipe will be fetched fresh when needed.');
        } else {
          const recipeToCache: any = {
            provider: source,
            externalRecipeId: recipeDetails.id,
            externalRecipeUri: recipeDetails.uri || recipeDetails.sourceUrl,
            recipeName: recipeDetails.title,
            recipeSource: source,
            recipeUrl: recipeDetails.sourceUrl,
            recipeImageUrl: recipeDetails.image,
            cuisineTypes: recipeDetails.cuisineTypes || recipeDetails.cuisineType || [],
            mealTypes: recipeDetails.mealTypes || recipeDetails.mealType || [],
            dishTypes: recipeDetails.dishTypes || recipeDetails.dishType || [],
            healthLabels: recipeDetails.healthLabels || [],
            dietLabels: recipeDetails.dietLabels || recipeDetails.diets || [],
            servings: recipeDetails.servings,
            nutritionServings: 1, // Default to 1, can be changed via edit servings API
            prepTimeMinutes: recipeDetails.prepTimeMinutes || null,
            cookTimeMinutes: recipeDetails.cookTimeMinutes || null,
            totalTimeMinutes: recipeDetails.readyInMinutes || recipeDetails.totalTimeMinutes,
            caloriesPerServing: recipeDetails.calories?.toString(),
            proteinPerServingG: recipeDetails.protein?.toString(),
            carbsPerServingG: recipeDetails.carbs?.toString(),
            fatPerServingG: recipeDetails.fat?.toString(),
            fiberPerServingG: recipeDetails.fiber?.toString(),
            ingredients: recipeDetails.ingredients,
            ingredientLines: recipeDetails.ingredientLines || [],
            cookingInstructions: recipeDetails.instructions || [],
            nutritionDetails: nutritionDetails, // Use properly transformed nutrition
            originalApiResponse: recipeDetails,
            hasCompleteNutrition: true,
            hasDetailedIngredients: !!(recipeDetails.ingredients && recipeDetails.ingredients.length > 0),
            hasCookingInstructions: !!(recipeDetails.instructions && recipeDetails.instructions.length > 0),
            dataQualityScore: 85
          };
          await cacheService.storeRecipe(recipeToCache);
          console.log('✅ Recipe cached successfully with complete nutrition');
        }
      } catch (cacheError) {
        console.error('⚠️ Failed to cache recipe:', cacheError);
        // Don't fail the request if caching fails
      }
    }

    // Helper function to get ingredient image URL from Spoonacular
    const getIngredientImage = async (ingredientName: string): Promise<string> => {
      try {
        const multiProviderService = new (await import('../../lib/multiProviderRecipeSearchService')).MultiProviderRecipeSearchService();
        const ingredientData = await multiProviderService.getIngredientNutrition(`1 ${ingredientName}`);
        if (ingredientData?.rawData?.image) {
          const image = ingredientData.rawData.image;
          // Spoonacular returns just the filename, need to add CDN URL
          if (image && !image.startsWith('http')) {
            return `https://spoonacular.com/cdn/ingredients_100x100/${image}`;
          }
          return image;
        }
      } catch (error) {
        console.log(`  ⚠️ Could not fetch image for ${ingredientName}`);
      }
      // Return empty string - frontend can show a placeholder
      return '';
    };
    
    // Step 4: Check if there are customizations for this recipe
    const customizations = meal.customizations?.[validatedRecipeId];
    
    if (!customizations || !customizations.customizationsApplied) {
      // No customizations, return base recipe with same structure
      console.log('ℹ️ No customizations found, returning base recipe');
      
      // Format ingredients with proper image URLs even for non-customized recipes
      // Format ingredients - ensure 'amount' field (custom/manual recipes use 'quantity')
      baseRecipe.ingredients = baseRecipe.ingredients?.map((ing: any) => {
        const ingredientAmount = ing.amount || ing.quantity || 0;
        return {
          id: ing.id,
          name: ing.name || ing.food,
          unit: ing.unit || '',
          amount: ingredientAmount,
          image: ing.image ? (ing.image.startsWith('http') ? ing.image : `https://spoonacular.com/cdn/ingredients_100x100/${ing.image}`) : '',
          originalString: ing.original || ing.originalString || '',
          aisle: ing.aisle || '',
          meta: ing.meta || [],
          measures: ing.measures || {
            us: { amount: ingredientAmount, unitLong: ing.unit || '', unitShort: ing.unit || '' },
            metric: { amount: ingredientAmount, unitLong: ing.unit || '', unitShort: ing.unit || '' }
          }
        };
      }) || [];
      
      // Normalize cookingInstructions to array of objects with number and step
      if (baseRecipe.cookingInstructions && Array.isArray(baseRecipe.cookingInstructions)) {
        baseRecipe.cookingInstructions = baseRecipe.cookingInstructions.map((instruction: any, index: number) => {
          // If it's a string, check if it's stringified JSON first
          if (typeof instruction === 'string') {
            // Try to parse if it looks like JSON
            if (instruction.trim().startsWith('{')) {
              try {
                const parsed = JSON.parse(instruction);
                // If it's a valid object with number and step, use it
                if (parsed && typeof parsed === 'object' && parsed.step) {
                  return {
                    number: parsed.number || index + 1,
                    step: parsed.step
                  };
                }
              } catch (e) {
                // Not valid JSON, treat as plain text step
              }
            }
            // Plain text string - convert to object format
            return {
              number: index + 1,
              step: instruction
            };
          }
          // If it's already an object with step, check if step is double-encoded JSON
          if (typeof instruction === 'object' && instruction.step) {
            let stepText = instruction.step;
            
            // Check if step is a stringified JSON object (double-encoded)
            if (typeof stepText === 'string' && stepText.startsWith('{')) {
              try {
                const parsed = JSON.parse(stepText);
                // If it parsed successfully and has a step property, use that
                if (parsed && typeof parsed === 'object' && parsed.step) {
                  stepText = parsed.step;
                }
              } catch (e) {
                // If parsing fails, keep the original string
              }
            }
            
            return {
              number: instruction.number || index + 1,
              step: stepText
            };
          }
          return instruction;
        });
      }
      
      return res.status(200).json({
        success: true,
        data: baseRecipe,
        hasCustomizations: false,
        customizations: null,
        message: fromCache ? 'Recipe retrieved from cache (no customizations)' : 'Recipe fetched from API (no customizations)'
      });
    }
    
    // Step 5: Apply customizations to create a new customized recipe
    console.log('🔧 Applying customizations...');
    const customizedRecipe = JSON.parse(JSON.stringify(baseRecipe)); // Deep clone

    // Apply ingredient modifications
    if (customizations.modifications && customizations.modifications.length > 0) {
      console.log(`📝 Applying ${customizations.modifications.length} modifications`);

      for (const mod of customizations.modifications) {
        if (mod.type === 'omit' && mod.originalIngredient) {
          // Remove ingredient
          const originalCount = customizedRecipe.ingredients.length;
          customizedRecipe.ingredients = customizedRecipe.ingredients.filter((ing: any) => {
            const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
            const targetName = mod.originalIngredient.toLowerCase();
            return !ingName.includes(targetName) && !targetName.includes(ingName);
          });
          console.log(`  🚫 Omitted "${mod.originalIngredient}" (${originalCount} → ${customizedRecipe.ingredients.length} ingredients)`);
        } 
        else if (mod.type === 'add' && mod.newIngredient) {
          // Fetch ingredient image if not provided
          const ingredientImage = (mod as any).image || await getIngredientImage(mod.newIngredient);
          
          // Add new ingredient
          customizedRecipe.ingredients.push({
            name: mod.newIngredient,
            amount: (mod as any).amount || null,
            unit: (mod as any).unit || null,
            image: ingredientImage,
            original: `${(mod as any).amount || ''} ${(mod as any).unit || ''} ${mod.newIngredient}`.trim()
          });
          console.log(`  ➕ Added "${mod.newIngredient}" with image: ${ingredientImage ? '✅' : '❌'} (${customizedRecipe.ingredients.length} ingredients)`);
        }
        else if (mod.type === 'replace' && mod.originalIngredient && mod.newIngredient) {
          // Replace ingredient
          let replaced = false;
          customizedRecipe.ingredients = await Promise.all(customizedRecipe.ingredients.map(async (ing: any) => {
            const ingName = (ing.name || ing.food || ing.original || '').toLowerCase();
            const targetName = mod.originalIngredient.toLowerCase();
            
            if ((ingName.includes(targetName) || targetName.includes(ingName)) && !replaced) {
              replaced = true;
              // Fetch new ingredient image if not provided
              const newImage = (mod as any).image || ing.image || await getIngredientImage(mod.newIngredient);
              
              console.log(`  🔄 Replaced "${ing.name || ing.food}" with "${mod.newIngredient}" (image: ${newImage ? '✅' : '❌'})`);
              return {
                ...ing,
                name: mod.newIngredient,
                amount: (mod as any).amount || ing.amount,
                unit: (mod as any).unit || ing.unit,
                image: newImage,
                original: `${(mod as any).amount || ing.amount || ''} ${(mod as any).unit || ing.unit || ''} ${mod.newIngredient}`.trim()
              };
            }
            return ing;
          }));
        }
      }
    }
    
    // Normalize cookingInstructions to array of objects with number and step
    if (customizedRecipe.cookingInstructions && Array.isArray(customizedRecipe.cookingInstructions)) {
      customizedRecipe.cookingInstructions = customizedRecipe.cookingInstructions.map((instruction: any, index: number) => {
        // If it's a string, check if it's stringified JSON first
        if (typeof instruction === 'string') {
          // Try to parse if it looks like JSON
          if (instruction.trim().startsWith('{')) {
            try {
              const parsed = JSON.parse(instruction);
              // If it's a valid object with number and step, use it
              if (parsed && typeof parsed === 'object' && parsed.step) {
                return {
                  number: parsed.number || index + 1,
                  step: parsed.step
                };
              }
            } catch (e) {
              // Not valid JSON, treat as plain text step
            }
          }
          // Plain text string - convert to object format
          return {
            number: index + 1,
            step: instruction
          };
        }
        // If it's already an object with step, check if step is double-encoded JSON
        if (typeof instruction === 'object' && instruction.step) {
          let stepText = instruction.step;
          
          // Check if step is a stringified JSON object (double-encoded)
          if (typeof stepText === 'string' && stepText.startsWith('{')) {
            try {
              const parsed = JSON.parse(stepText);
              // If it parsed successfully and has a step property, use that
              if (parsed && typeof parsed === 'object' && parsed.step) {
                stepText = parsed.step;
              }
            } catch (e) {
              // If parsing fails, keep the original string
            }
          }
          
          return {
            number: instruction.number || index + 1,
            step: stepText
          };
        }
        return instruction;
      });
    }

    // Step 6: Apply custom nutrition if provided
    if (customizations.customNutrition) {
      console.log('🔬 Applying custom nutrition with micronutrient data');
      
      const customNutrition = customizations.customNutrition;
      
      // Check if customNutrition has the new StandardizedNutrition format
      const hasStandardizedFormat = customNutrition.micros !== undefined;
      
      if (hasStandardizedFormat) {
        // New format with micronutrients
        console.log('  ✅ Custom nutrition includes micronutrients');
        
        // Update per-serving nutrition fields (macros)
        customizedRecipe.caloriesPerServing = (customNutrition.calories?.quantity || 0).toString();
        customizedRecipe.proteinPerServingG = (customNutrition.macros?.protein?.quantity || 0).toString();
        customizedRecipe.carbsPerServingG = (customNutrition.macros?.carbs?.quantity || 0).toString();
        customizedRecipe.fatPerServingG = (customNutrition.macros?.fat?.quantity || 0).toString();
        customizedRecipe.fiberPerServingG = (customNutrition.macros?.fiber?.quantity || 0).toString();
        customizedRecipe.sugarPerServingG = (customNutrition.macros?.sugar?.quantity || 0).toString();
        customizedRecipe.sodiumPerServingMg = (customNutrition.macros?.sodium?.quantity || 0).toString();
        
        // Initialize nutritionDetails if needed
        if (!customizedRecipe.nutritionDetails) {
          customizedRecipe.nutritionDetails = { macros: {}, micros: { vitamins: {}, minerals: {} }, calories: {} };
        }
        
        // Update calories
        customizedRecipe.nutritionDetails.calories = {
          unit: customNutrition.calories?.unit || 'kcal',
          quantity: customNutrition.calories?.quantity || 0
        };
        
        // Update all macros
        if (customNutrition.macros) {
          Object.keys(customNutrition.macros).forEach(macroKey => {
            const macroValue = customNutrition.macros[macroKey as keyof typeof customNutrition.macros];
            if (macroValue) {
              customizedRecipe.nutritionDetails.macros[macroKey] = {
                unit: macroValue.unit,
                quantity: macroValue.quantity
              };
            }
          });
        }
        
        // Update all vitamins
        if (customNutrition.micros?.vitamins) {
          if (!customizedRecipe.nutritionDetails.micros) {
            customizedRecipe.nutritionDetails.micros = { vitamins: {}, minerals: {} };
          }
          if (!customizedRecipe.nutritionDetails.micros.vitamins) {
            customizedRecipe.nutritionDetails.micros.vitamins = {};
          }
          
          Object.keys(customNutrition.micros.vitamins).forEach(vitaminKey => {
            const vitaminValue = customNutrition.micros.vitamins[vitaminKey as keyof typeof customNutrition.micros.vitamins];
            if (vitaminValue) {
              customizedRecipe.nutritionDetails.micros.vitamins[vitaminKey] = {
                unit: vitaminValue.unit,
                quantity: vitaminValue.quantity
              };
            }
          });
          
          console.log(`  📊 Updated ${Object.keys(customNutrition.micros.vitamins).length} vitamins`);
        }
        
        // Update all minerals
        if (customNutrition.micros?.minerals) {
          if (!customizedRecipe.nutritionDetails.micros) {
            customizedRecipe.nutritionDetails.micros = { vitamins: {}, minerals: {} };
          }
          if (!customizedRecipe.nutritionDetails.micros.minerals) {
            customizedRecipe.nutritionDetails.micros.minerals = {};
          }
          
          Object.keys(customNutrition.micros.minerals).forEach(mineralKey => {
            const mineralValue = customNutrition.micros.minerals[mineralKey as keyof typeof customNutrition.micros.minerals];
            if (mineralValue) {
              customizedRecipe.nutritionDetails.micros.minerals[mineralKey] = {
                unit: mineralValue.unit,
                quantity: mineralValue.quantity
              };
            }
          });
          
          console.log(`  📊 Updated ${Object.keys(customNutrition.micros.minerals).length} minerals`);
        }
      } else {
        // Old simplified format (backward compatibility)
        console.log('  ⚠️ Custom nutrition is in simplified format (no micronutrients)');
        
        customizedRecipe.caloriesPerServing = (customNutrition.calories || 0).toString();
        customizedRecipe.proteinPerServingG = (customNutrition.protein || 0).toString();
        customizedRecipe.carbsPerServingG = (customNutrition.carbs || 0).toString();
        customizedRecipe.fatPerServingG = (customNutrition.fat || 0).toString();
        customizedRecipe.fiberPerServingG = (customNutrition.fiber || 0).toString();
      
      // Update nutritionDetails object to match recipe details structure
      if (!customizedRecipe.nutritionDetails) {
        customizedRecipe.nutritionDetails = { macros: {}, micros: { vitamins: {}, minerals: {} }, calories: {} };
      }
      
      if (!customizedRecipe.nutritionDetails.macros) {
        customizedRecipe.nutritionDetails.macros = {};
      }
      
      customizedRecipe.nutritionDetails.calories = {
        unit: 'kcal',
          quantity: customNutrition.calories || 0
      };
      
      customizedRecipe.nutritionDetails.macros.protein = {
        unit: 'g',
          quantity: customNutrition.protein || 0
      };
      
      customizedRecipe.nutritionDetails.macros.carbs = {
        unit: 'g',
          quantity: customNutrition.carbs || 0
      };
      
      customizedRecipe.nutritionDetails.macros.fat = {
        unit: 'g',
          quantity: customNutrition.fat || 0
      };
      
      customizedRecipe.nutritionDetails.macros.fiber = {
        unit: 'g',
          quantity: customNutrition.fiber || 0
      };
      }
      
      console.log('✅ Applied custom nutrition');
    }

    // Step 7: Apply nutritionServings multiplier
    const servings = customizations.nutritionServings || customizations.servings || 1;
    customizedRecipe.nutritionServings = servings;
    if (servings !== 1) {
      console.log(`📊 Multiplying nutrition by ${servings} servings`);

      // Multiply top-level nutrition fields (these are mislabeled as "PerServing" but actually show totals)
      customizedRecipe.caloriesPerServing = (parseFloat(customizedRecipe.caloriesPerServing) * servings).toString();
      customizedRecipe.proteinPerServingG = (parseFloat(customizedRecipe.proteinPerServingG) * servings).toString();
      customizedRecipe.carbsPerServingG = (parseFloat(customizedRecipe.carbsPerServingG) * servings).toString();
      customizedRecipe.fatPerServingG = (parseFloat(customizedRecipe.fatPerServingG) * servings).toString();
      customizedRecipe.fiberPerServingG = (parseFloat(customizedRecipe.fiberPerServingG) * servings).toString();
      customizedRecipe.sugarPerServingG = (parseFloat(customizedRecipe.sugarPerServingG || 0) * servings).toString();
      customizedRecipe.sodiumPerServingMg = (parseFloat(customizedRecipe.sodiumPerServingMg || 0) * servings).toString();

      // Also multiply the "total" fields (these should match the "PerServing" fields)
      customizedRecipe.totalCalories = customizedRecipe.caloriesPerServing;
      customizedRecipe.totalProteinG = customizedRecipe.proteinPerServingG;
      customizedRecipe.totalCarbsG = customizedRecipe.carbsPerServingG;
      customizedRecipe.totalFatG = customizedRecipe.fatPerServingG;
      customizedRecipe.totalFiberG = customizedRecipe.fiberPerServingG;
      customizedRecipe.totalSugarG = customizedRecipe.sugarPerServingG;
      customizedRecipe.totalSodiumMg = customizedRecipe.sodiumPerServingMg;

      // Multiply nutritionDetails
      if (customizedRecipe.nutritionDetails) {
        // Multiply calories
        if (customizedRecipe.nutritionDetails.calories) {
          customizedRecipe.nutritionDetails.calories.quantity *= servings;
        }

        // Multiply macros
        if (customizedRecipe.nutritionDetails.macros) {
          Object.keys(customizedRecipe.nutritionDetails.macros).forEach(key => {
            const macro = customizedRecipe.nutritionDetails.macros[key];
            if (macro && typeof macro.quantity === 'number') {
              macro.quantity *= servings;
            }
          });
        }

        // Multiply micros
        if (customizedRecipe.nutritionDetails.micros) {
          if (customizedRecipe.nutritionDetails.micros.vitamins) {
            Object.keys(customizedRecipe.nutritionDetails.micros.vitamins).forEach(key => {
              const vitamin = customizedRecipe.nutritionDetails.micros.vitamins[key];
              if (vitamin && typeof vitamin.quantity === 'number') {
                vitamin.quantity *= servings;
              }
            });
          }
          if (customizedRecipe.nutritionDetails.micros.minerals) {
            Object.keys(customizedRecipe.nutritionDetails.micros.minerals).forEach(key => {
              const mineral = customizedRecipe.nutritionDetails.micros.minerals[key];
              if (mineral && typeof mineral.quantity === 'number') {
                mineral.quantity *= servings;
              }
            });
          }
        }
      }
    }

    // Format ingredients to ensure proper structure (add originalString, aisle, meta, measures)
    customizedRecipe.ingredients = customizedRecipe.ingredients.map((ing: any) => ({
      id: ing.id,
      name: ing.name || ing.food,
      unit: ing.unit || '',
      amount: ing.amount || 0,
      image: ing.image ? (ing.image.startsWith('http') ? ing.image : `https://spoonacular.com/cdn/ingredients_100x100/${ing.image}`) : '',
      originalString: ing.original || ing.originalString || '',
      aisle: ing.aisle || '',
      meta: ing.meta || [],
      measures: ing.measures || {
        us: { amount: ing.amount || 0, unitLong: ing.unit || '', unitShort: ing.unit || '' },
        metric: { amount: ing.amount || 0, unitLong: ing.unit || '', unitShort: ing.unit || '' }
      }
    }));

    // Prepare customization summary with notes
    const customizationSummary = customizations.modifications?.map((mod: any) => ({
      type: mod.type,
      action: mod.type === 'omit' ? 'Removed' : mod.type === 'add' ? 'Added' : 'Replaced',
      ingredient: mod.type === 'omit' ? mod.originalIngredient : 
                  mod.type === 'add' ? mod.newIngredient : 
                  `${mod.originalIngredient} → ${mod.newIngredient}`,
      amount: mod.amount ? `${mod.amount} ${mod.unit || ''}`.trim() : null,
      notes: mod.notes || null,
      hasNotes: !!(mod.notes && mod.notes.trim())
    })) || [];

    // Prepare nutrition comparison (including micronutrients if available)
    const nutritionComparison: any = {
      macros: {
        original: {
          caloriesPerServing: baseRecipe.caloriesPerServing,
          proteinPerServingG: baseRecipe.proteinPerServingG,
          carbsPerServingG: baseRecipe.carbsPerServingG,
          fatPerServingG: baseRecipe.fatPerServingG,
          fiberPerServingG: baseRecipe.fiberPerServingG
        },
        customized: {
          caloriesPerServing: customizedRecipe.caloriesPerServing,
          proteinPerServingG: customizedRecipe.proteinPerServingG,
          carbsPerServingG: customizedRecipe.carbsPerServingG,
          fatPerServingG: customizedRecipe.fatPerServingG,
          fiberPerServingG: customizedRecipe.fiberPerServingG
        }
      }
    };

    // Add micronutrient comparison if available
    if (baseRecipe.nutritionDetails?.micros && customizedRecipe.nutritionDetails?.micros) {
      nutritionComparison.micros = {
        original: {
          vitamins: baseRecipe.nutritionDetails.micros.vitamins || {},
          minerals: baseRecipe.nutritionDetails.micros.minerals || {}
        },
        customized: {
          vitamins: customizedRecipe.nutritionDetails.micros.vitamins || {},
          minerals: customizedRecipe.nutritionDetails.micros.minerals || {}
        }
      };
      
      console.log('📊 Including micronutrient comparison in response');
    }

    // Return the customized recipe with exact same structure as recipe details API
    return res.status(200).json({
      success: true,
      data: customizedRecipe,
      hasCustomizations: true,
      customizations: {
        modifications: customizations.modifications || [],
        customizationSummary: customizationSummary,
        appliedServings: servings,
        micronutrientsIncluded: !!(customizations.customNutrition?.micros),
        nutritionComparison: nutritionComparison,
        // Backward compatibility fields
        originalNutrition: {
          caloriesPerServing: baseRecipe.caloriesPerServing,
          proteinPerServingG: baseRecipe.proteinPerServingG,
          carbsPerServingG: baseRecipe.carbsPerServingG,
          fatPerServingG: baseRecipe.fatPerServingG,
          fiberPerServingG: baseRecipe.fiberPerServingG
        },
        customizedNutrition: {
          caloriesPerServing: customizedRecipe.caloriesPerServing,
          proteinPerServingG: customizedRecipe.proteinPerServingG,
          carbsPerServingG: customizedRecipe.carbsPerServingG,
          fatPerServingG: customizedRecipe.fatPerServingG,
          fiberPerServingG: customizedRecipe.fiberPerServingG
        }
      },
      message: fromCache ? 'Recipe retrieved from cache with customizations applied' : 'Recipe fetched from API with customizations applied'
    });

  } catch (error) {
    console.error('❌ Error fetching customized recipe:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Handle simple ingredient recipes (banana, apple, etc.)
 * Now marked as Spoonacular so they can use portion/unit modification
 */
async function handleIngredientRecipe(recipeId: string, recipe: any, meal: any, res: VercelResponse): Promise<VercelResponse> {
  // Extract ingredient name from ID (format: ingredient_banana)
  const ingredientName = recipeId.replace(/^ingredient_/, '').replace(/_/g, ' ');
  
  console.log(`✅ Handling simple ingredient recipe: ${ingredientName}`);
  
  // Get ingredient recipe from simple ingredient service (now async)
  const ingredients = await simpleIngredientService.searchIngredientsAsRecipes(ingredientName, 1);
  
  if (ingredients.length === 0) {
    return res.status(404).json({
      error: 'Ingredient not found',
      message: `Ingredient ${ingredientName} not found in database`
    });
  }

  const ingredientRecipe = ingredients[0];
  
  // Get customizations from meal (not recipe)
  const customizations = meal.customizations?.[recipeId] || null;
  
  console.log(`🔍 Customizations for ${recipeId}:`, customizations ? JSON.stringify(customizations, null, 2) : 'None');

  // Build modified ingredients list by applying modifications
  let modifiedIngredients = [...ingredientRecipe.ingredients];
  
  if (customizations?.modifications && customizations.modifications.length > 0) {
    for (const mod of customizations.modifications) {
      if (mod.type === 'add' && mod.newIngredient) {
        // Add new ingredient
        modifiedIngredients.push({
          name: mod.newIngredient,
          amount: (mod as any).amount || 1,
          unit: (mod as any).unit || '',
          original: `${(mod as any).amount || 1} ${(mod as any).unit || ''} ${mod.newIngredient}`.trim(),
          nutrition: {} // Will be calculated
        });
      } else if (mod.type === 'replace' && mod.originalIngredient && mod.newIngredient) {
        // Replace ingredient
        const index = modifiedIngredients.findIndex(ing => 
          ing.name.toLowerCase() === mod.originalIngredient.toLowerCase()
        );
        if (index >= 0) {
          modifiedIngredients[index] = {
            name: mod.newIngredient,
            amount: (mod as any).amount || 1,
            unit: (mod as any).unit || '',
            original: `${(mod as any).amount || 1} ${(mod as any).unit || ''} ${mod.newIngredient}`.trim(),
            nutrition: {}
          };
        }
      } else if (mod.type === 'omit' && mod.originalIngredient) {
        // Remove ingredient
        modifiedIngredients = modifiedIngredients.filter(ing => 
          ing.name.toLowerCase() !== mod.originalIngredient.toLowerCase()
        );
      }
    }
  }

  // Return ingredient recipe in customized format (as Spoonacular for compatibility)
  return res.status(200).json({
    success: true,
    data: {
      recipeId: ingredientRecipe.id,
      title: ingredientRecipe.title,
      image: ingredientRecipe.image,
      servings: ingredientRecipe.servings,
      readyInMinutes: 0,
      source: 'spoonacular', // Marked as spoonacular for customization compatibility
      sourceUrl: null,
      
      // Nutrition - use customized if available, otherwise original
      nutrition: customizations?.customNutrition || ingredientRecipe.nutrition,
      
      // Ingredients - show modified list if customizations exist, otherwise original
      ingredients: modifiedIngredients,
      originalIngredients: ingredientRecipe.ingredients, // Keep original for reference
      
      // Instructions
      instructions: ingredientRecipe.instructions,
      
      // Metadata
      healthLabels: ingredientRecipe.healthLabels,
      dietLabels: ingredientRecipe.dietLabels,
      allergens: ingredientRecipe.allergens,
      cuisineType: ingredientRecipe.cuisineType,
      dishType: ingredientRecipe.dishType,
      mealType: ingredientRecipe.mealType,
      
      // Customization info - NOW FROM MEAL
      currentCustomizations: customizations,
      currentServings: recipe.servings || 1,
      modifications: customizations?.modifications || [],
      customizationsApplied: customizations?.customizationsApplied || false,
      
      // Special flags
      isIngredient: true,
      isSimpleIngredient: true,
      canCustomize: true, // Can modify portion size and unit
      
      message: customizations ? 'Simple ingredient with customizations' : 'Simple ingredient - you can modify the portion size and unit'
    }
  });
}

/**
 * Handle manual/custom recipes
 */
async function handleManualRecipe(recipeId: string, recipe: any, meal: any, res: VercelResponse): Promise<VercelResponse> {
  console.log(`✅ Handling manual/custom recipe: ${recipeId}`);

  // Get customizations from meal (not recipe)
  const customizations = meal.customizations?.[recipeId] || null;

  // Try to fetch from cache to get full nutrition details
  let baseRecipe: any;
  let fromCache = false;

  try {
    const cachedRecipe = await cacheService.getRecipeById(recipeId);
    if (cachedRecipe) {
      console.log('✅ Found manual recipe in cache');
      fromCache = true;
      const cached = cachedRecipe as any;

      // Build baseRecipe from cache with same structure as main path
      baseRecipe = {
        id: cached.id,
        provider: cached.provider,
        externalRecipeId: cached.external_recipe_id || cached.externalRecipeId,
        externalRecipeUri: cached.external_recipe_uri || cached.externalRecipeUri,
        recipeName: cached.recipe_name || cached.recipeName,
        description: cached.description,
        recipeSource: cached.recipe_source || cached.recipeSource,
        recipeUrl: cached.recipe_url || cached.recipeUrl,
        recipeImageUrl: cached.recipe_image_url || cached.recipeImageUrl,
        cuisineTypes: cached.cuisine_types || cached.cuisineTypes || [],
        mealTypes: cached.meal_types || cached.mealTypes || [],
        dishTypes: cached.dish_types || cached.dishTypes || [],
        healthLabels: cached.health_labels || cached.healthLabels || [],
        dietLabels: cached.diet_labels || cached.dietLabels || [],
        allergens: cached.allergens || [],
        servings: cached.servings,
        nutritionServings: 1,
        prepTimeMinutes: cached.prep_time_minutes || cached.prepTimeMinutes,
        cookTimeMinutes: cached.cook_time_minutes || cached.cookTimeMinutes,
        totalTimeMinutes: cached.total_time_minutes || cached.totalTimeMinutes,
        caloriesPerServing: (cached.calories_per_serving || cached.caloriesPerServing)?.toString(),
        proteinPerServingG: (cached.protein_per_serving_g || cached.proteinPerServingG)?.toString(),
        carbsPerServingG: (cached.carbs_per_serving_g || cached.carbsPerServingG)?.toString(),
        fatPerServingG: (cached.fat_per_serving_g || cached.fatPerServingG)?.toString(),
        fiberPerServingG: (cached.fiber_per_serving_g || cached.fiberPerServingG)?.toString(),
        sugarPerServingG: (cached.total_sugar_g || cached.totalSugarG)?.toString(),
        sodiumPerServingMg: (cached.total_sodium_mg || cached.totalSodiumMg)?.toString(),
        totalCalories: (cached.total_calories || cached.totalCalories)?.toString(),
        totalProteinG: (cached.total_protein_g || cached.totalProteinG)?.toString(),
        totalCarbsG: (cached.total_carbs_g || cached.totalCarbsG)?.toString(),
        totalFatG: (cached.total_fat_g || cached.totalFatG)?.toString(),
        totalFiberG: (cached.total_fiber_g || cached.totalFiberG)?.toString(),
        totalSugarG: (cached.total_sugar_g || cached.totalSugarG)?.toString(),
        totalSodiumMg: (cached.total_sodium_mg || cached.totalSodiumMg)?.toString(),
        totalWeightG: cached.total_weight_g || cached.totalWeightG,
        ingredients: (cached.ingredients || []).map((ing: any) => ({
          ...ing,
          amount: ing.amount || ing.quantity || 0
        })),
        ingredientLines: cached.ingredient_lines || cached.ingredientLines || [],
        cookingInstructions: cached.cooking_instructions || cached.cookingInstructions || [],
        nutritionDetails: cached.nutrition_details || cached.nutritionDetails || {},
        originalApiResponse: cached.original_api_response || cached.originalApiResponse || {},
        cacheStatus: cached.cache_status || cached.cacheStatus,
        apiFetchCount: cached.api_fetch_count || cached.apiFetchCount,
        lastApiFetchAt: cached.last_api_fetch_at || cached.lastApiFetchAt,
        lastAccessedAt: cached.last_accessed_at || cached.lastAccessedAt,
        hasCompleteNutrition: cached.has_complete_nutrition || cached.hasCompleteNutrition,
        hasDetailedIngredients: cached.has_detailed_ingredients || cached.hasDetailedIngredients,
        hasCookingInstructions: cached.has_cooking_instructions || cached.hasCookingInstructions,
        dataQualityScore: cached.data_quality_score || cached.dataQualityScore,
        createdAt: cached.created_at || cached.createdAt,
        updatedAt: cached.updated_at || cached.updatedAt,
        isPublic: cached.is_public || cached.isPublic,
        createdBy: cached.created_by || cached.createdBy,
        defaultPortionSizeId: cached.default_portion_size_id || cached.defaultPortionSizeId
      };
    }
  } catch (error) {
    console.log('⚠️ Could not fetch manual recipe from cache, using draft data');
  }

  // If not in cache, use recipe from draft
  if (!baseRecipe) {
    baseRecipe = {
      recipeId: recipe.id,
      recipeName: recipe.title,
      recipeImageUrl: recipe.image,
      servings: recipe.servings || 1,
      nutritionServings: 1,
      totalTimeMinutes: recipe.readyInMinutes || 0,
      caloriesPerServing: recipe.calories?.toString() || '0',
      proteinPerServingG: recipe.protein?.toString() || '0',
      carbsPerServingG: recipe.carbs?.toString() || '0',
      fatPerServingG: recipe.fat?.toString() || '0',
      fiberPerServingG: recipe.fiber?.toString() || '0',
      sugarPerServingG: '0',
      sodiumPerServingMg: '0',
      totalCalories: recipe.calories?.toString() || '0',
      totalProteinG: recipe.protein?.toString() || '0',
      totalCarbsG: recipe.carbs?.toString() || '0',
      totalFatG: recipe.fat?.toString() || '0',
      totalFiberG: recipe.fiber?.toString() || '0',
      totalSugarG: '0',
      totalSodiumMg: '0',
      ingredients: (recipe.ingredients || []).map((ing: any) => ({
        ...ing,
        amount: ing.amount || ing.quantity || 0
      })),
      cookingInstructions: recipe.instructions || [],
      nutritionDetails: recipe.nutrition || {},
      healthLabels: recipe.healthLabels || [],
      dietLabels: recipe.dietLabels || [],
      allergens: recipe.allergens || [],
      cuisineTypes: recipe.cuisineTypes || [],
      dishTypes: recipe.dishTypes || [],
      mealTypes: recipe.mealTypes || [],
      provider: 'manual',
      recipeSource: 'manual'
    };
  }

  // If no customizations, return baseRecipe
  // Check both customizationsApplied flag AND nutritionServings to handle older drafts
  const hasNutritionServings = customizations && (customizations.nutritionServings || customizations.servings) && (customizations.nutritionServings || customizations.servings) !== 1;
  const shouldApplyCustomizations = customizations && (customizations.customizationsApplied || hasNutritionServings || (customizations.modifications && customizations.modifications.length > 0));

  if (!shouldApplyCustomizations) {
    return res.status(200).json({
      success: true,
      data: baseRecipe,
      hasCustomizations: false,
      customizations: null,
      message: fromCache ? 'Manual recipe retrieved from cache (no customizations)' : 'Manual recipe (no customizations)'
    });
  }

  // Apply customizations
  const customizedRecipe = JSON.parse(JSON.stringify(baseRecipe)); // Deep clone

  // Apply custom nutrition if provided
  if (customizations.customNutrition) {
    const customNutrition = customizations.customNutrition;

    // Update per-serving nutrition fields
    customizedRecipe.caloriesPerServing = (customNutrition.calories?.quantity || 0).toString();
    customizedRecipe.proteinPerServingG = (customNutrition.macros?.protein?.quantity || 0).toString();
    customizedRecipe.carbsPerServingG = (customNutrition.macros?.carbs?.quantity || 0).toString();
    customizedRecipe.fatPerServingG = (customNutrition.macros?.fat?.quantity || 0).toString();
    customizedRecipe.fiberPerServingG = (customNutrition.macros?.fiber?.quantity || 0).toString();
    customizedRecipe.sugarPerServingG = (customNutrition.macros?.sugar?.quantity || 0).toString();
    customizedRecipe.sodiumPerServingMg = (customNutrition.macros?.sodium?.quantity || 0).toString();

    // Update nutritionDetails
    if (!customizedRecipe.nutritionDetails) {
      customizedRecipe.nutritionDetails = { macros: {}, micros: { vitamins: {}, minerals: {} }, calories: {} };
    }

    customizedRecipe.nutritionDetails.calories = {
      unit: customNutrition.calories?.unit || 'kcal',
      quantity: customNutrition.calories?.quantity || 0
    };

    if (customNutrition.macros) {
      Object.keys(customNutrition.macros).forEach(macroKey => {
        const macroValue = customNutrition.macros[macroKey as keyof typeof customNutrition.macros];
        if (macroValue) {
          customizedRecipe.nutritionDetails.macros[macroKey] = {
            unit: macroValue.unit,
            quantity: macroValue.quantity
          };
        }
      });
    }

    if (customNutrition.micros?.vitamins) {
      if (!customizedRecipe.nutritionDetails.micros) {
        customizedRecipe.nutritionDetails.micros = { vitamins: {}, minerals: {} };
      }
      customizedRecipe.nutritionDetails.micros.vitamins = customNutrition.micros.vitamins;
    }

    if (customNutrition.micros?.minerals) {
      if (!customizedRecipe.nutritionDetails.micros) {
        customizedRecipe.nutritionDetails.micros = { vitamins: {}, minerals: {} };
      }
      customizedRecipe.nutritionDetails.micros.minerals = customNutrition.micros.minerals;
    }
  }

  // Apply nutritionServings multiplier
  const servings = customizations.nutritionServings || customizations.servings || 1;
  customizedRecipe.nutritionServings = servings;

  if (servings !== 1) {
    console.log(`📊 Multiplying manual recipe nutrition by ${servings} servings`);

    // Multiply top-level nutrition fields
    customizedRecipe.caloriesPerServing = (parseFloat(customizedRecipe.caloriesPerServing || 0) * servings).toString();
    customizedRecipe.proteinPerServingG = (parseFloat(customizedRecipe.proteinPerServingG || 0) * servings).toString();
    customizedRecipe.carbsPerServingG = (parseFloat(customizedRecipe.carbsPerServingG || 0) * servings).toString();
    customizedRecipe.fatPerServingG = (parseFloat(customizedRecipe.fatPerServingG || 0) * servings).toString();
    customizedRecipe.fiberPerServingG = (parseFloat(customizedRecipe.fiberPerServingG || 0) * servings).toString();
    customizedRecipe.sugarPerServingG = (parseFloat(customizedRecipe.sugarPerServingG || 0) * servings).toString();
    customizedRecipe.sodiumPerServingMg = (parseFloat(customizedRecipe.sodiumPerServingMg || 0) * servings).toString();

    // Update "total" fields to match
    customizedRecipe.totalCalories = customizedRecipe.caloriesPerServing;
    customizedRecipe.totalProteinG = customizedRecipe.proteinPerServingG;
    customizedRecipe.totalCarbsG = customizedRecipe.carbsPerServingG;
    customizedRecipe.totalFatG = customizedRecipe.fatPerServingG;
    customizedRecipe.totalFiberG = customizedRecipe.fiberPerServingG;
    customizedRecipe.totalSugarG = customizedRecipe.sugarPerServingG;
    customizedRecipe.totalSodiumMg = customizedRecipe.sodiumPerServingMg;

    // Multiply nutritionDetails
    if (customizedRecipe.nutritionDetails) {
      if (customizedRecipe.nutritionDetails.calories) {
        customizedRecipe.nutritionDetails.calories.quantity *= servings;
      }

      if (customizedRecipe.nutritionDetails.macros) {
        Object.keys(customizedRecipe.nutritionDetails.macros).forEach(key => {
          const macro = customizedRecipe.nutritionDetails.macros[key];
          if (macro && typeof macro.quantity === 'number') {
            macro.quantity *= servings;
          }
        });
      }

      if (customizedRecipe.nutritionDetails.micros) {
        if (customizedRecipe.nutritionDetails.micros.vitamins) {
          Object.keys(customizedRecipe.nutritionDetails.micros.vitamins).forEach(key => {
            const vitamin = customizedRecipe.nutritionDetails.micros.vitamins[key];
            if (vitamin && typeof vitamin.quantity === 'number') {
              vitamin.quantity *= servings;
            }
          });
        }
        if (customizedRecipe.nutritionDetails.micros.minerals) {
          Object.keys(customizedRecipe.nutritionDetails.micros.minerals).forEach(key => {
            const mineral = customizedRecipe.nutritionDetails.micros.minerals[key];
            if (mineral && typeof mineral.quantity === 'number') {
              mineral.quantity *= servings;
            }
          });
        }
      }
    }
  }

  // Prepare response with nutrition comparison
  const nutritionComparison: any = {
    macros: {
      original: {
        caloriesPerServing: baseRecipe.caloriesPerServing,
        proteinPerServingG: baseRecipe.proteinPerServingG,
        carbsPerServingG: baseRecipe.carbsPerServingG,
        fatPerServingG: baseRecipe.fatPerServingG,
        fiberPerServingG: baseRecipe.fiberPerServingG
      },
      customized: {
        caloriesPerServing: customizedRecipe.caloriesPerServing,
        proteinPerServingG: customizedRecipe.proteinPerServingG,
        carbsPerServingG: customizedRecipe.carbsPerServingG,
        fatPerServingG: customizedRecipe.fatPerServingG,
        fiberPerServingG: customizedRecipe.fiberPerServingG
      }
    }
  };

  if (baseRecipe.nutritionDetails?.micros && customizedRecipe.nutritionDetails?.micros) {
    nutritionComparison.micros = {
      original: {
        vitamins: baseRecipe.nutritionDetails.micros.vitamins || {},
        minerals: baseRecipe.nutritionDetails.micros.minerals || {}
      },
      customized: {
        vitamins: customizedRecipe.nutritionDetails.micros.vitamins || {},
        minerals: customizedRecipe.nutritionDetails.micros.minerals || {}
      }
    };
  }

  // Add modifiedNutrition and originalNutrition for consistency with cache response
  customizedRecipe.modifiedNutrition = customizedRecipe.nutritionDetails;
  customizedRecipe.originalNutrition = baseRecipe.nutritionDetails;

  return res.status(200).json({
    success: true,
    data: customizedRecipe,
    hasCustomizations: true,
    customizations: {
      modifications: customizations.modifications || [],
      customizationSummary: [],
      appliedServings: servings,
      nutritionServings: servings,
      micronutrientsIncluded: !!(customizations.customNutrition?.micros),
      nutritionComparison: nutritionComparison,
      originalNutrition: {
        caloriesPerServing: baseRecipe.caloriesPerServing,
        proteinPerServingG: baseRecipe.proteinPerServingG,
        carbsPerServingG: baseRecipe.carbsPerServingG,
        fatPerServingG: baseRecipe.fatPerServingG,
        fiberPerServingG: baseRecipe.fiberPerServingG
      },
      customizedNutrition: {
        caloriesPerServing: customizedRecipe.caloriesPerServing,
        proteinPerServingG: customizedRecipe.proteinPerServingG,
        carbsPerServingG: customizedRecipe.carbsPerServingG,
        fatPerServingG: customizedRecipe.fatPerServingG,
        fiberPerServingG: customizedRecipe.fiberPerServingG
      }
    },
    message: 'Customizations updated successfully',
    autoCalculated: true
  });
}

export default requireAuth(handler);


