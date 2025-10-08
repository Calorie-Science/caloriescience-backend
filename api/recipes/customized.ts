import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealPlanDraftService } from '../../lib/mealPlanDraftService';
import { RecipeCacheService } from '../../lib/recipeCacheService';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
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

    const meal = dayPlan.meals[validatedMealName];
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
        console.log('⚠️ nutritionDetails empty or has no data in cache, attempting to extract from originalApiResponse');
        
        if (originalResponse) {
          // Try Edamam format
          if (originalResponse.totalNutrients) {
            console.log('  📊 Found Edamam totalNutrients in originalApiResponse');
            const NutritionMappingService = require('../../lib/nutritionMappingService').NutritionMappingService;
            nutritionDetails = NutritionMappingService.transformEdamamNutrition(originalResponse);
          }
          // Try Spoonacular format or already standardized
          else if (originalResponse.nutrition) {
            // Check if already in standardized format
            if (originalResponse.nutrition.macros || originalResponse.nutrition.calories) {
              console.log('  📊 Found standardized nutrition in originalApiResponse');
              nutritionDetails = originalResponse.nutrition;
            } 
            // Raw Spoonacular format with nutrients array
            else if (originalResponse.nutrition.nutrients) {
              console.log('  📊 Found raw Spoonacular nutrition in originalApiResponse');
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
            console.log('  💾 Updating cache with extracted nutrition from originalApiResponse...');
            await cacheService.updateRecipeNutrition(cached.id, nutritionDetails);
            console.log('  ✅ Cache updated successfully');
          } catch (error) {
            console.error('  ❌ Failed to update cache:', error);
          }
        }
        
        // If still no nutritionDetails, fetch from API
        if (!hasActualDataAfterExtraction) {
          console.log('  🔄 Fetching full nutrition from API...');
          const freshRecipeDetails = await multiProviderService.getRecipeDetails(validatedRecipeId);
          if (freshRecipeDetails && freshRecipeDetails.nutrition) {
            console.log('  ✅ Got fresh nutrition from API');
            const NutritionMappingService = require('../../lib/nutritionMappingService').NutritionMappingService;
            
            // Transform based on source
            if (source === 'edamam' && freshRecipeDetails.nutrition.totalNutrients) {
              nutritionDetails = NutritionMappingService.transformEdamamNutrition(freshRecipeDetails.nutrition);
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
        healthLabels: cached.health_labels || cached.healthLabels || [],
        dietLabels: cached.diet_labels || cached.dietLabels || [],
        servings: cached.servings,
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
        ingredients: cached.ingredients || [],
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
      baseRecipe.ingredients = baseRecipe.ingredients?.map((ing: any) => ({
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
      })) || [];
      
      // Normalize cookingInstructions to array of objects with number and step
      if (baseRecipe.cookingInstructions && Array.isArray(baseRecipe.cookingInstructions)) {
        baseRecipe.cookingInstructions = baseRecipe.cookingInstructions.map((instruction: any, index: number) => {
          // If it's already an object with step, return as is
          if (typeof instruction === 'object' && instruction.step) {
            return instruction;
          }
          // If it's a string, convert to object format
          if (typeof instruction === 'string') {
            return {
              number: index + 1,
              step: instruction
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
        // If it's already an object with step, return as is
        if (typeof instruction === 'object' && instruction.step) {
          return instruction;
        }
        // If it's a string, convert to object format
        if (typeof instruction === 'string') {
          return {
            number: index + 1,
            step: instruction
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

    // Step 7: Apply serving adjustments if any
    const servings = customizations.servings || 1;
    if (servings !== 1) {
      customizedRecipe.adjustedServings = servings;
      console.log(`📊 Recipe adjusted for ${servings} servings`);
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

export default requireAuth(handler);


