import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { RecipeCacheService } from '../../../lib/recipeCacheService';
import { MultiProviderRecipeSearchService } from '../../../lib/multiProviderRecipeSearchService';
import { RecipeResponseStandardizationService, StandardizedRecipeResponse } from '../../../lib/recipeResponseStandardizationService';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can fetch recipe details.' });
  }

  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'Recipe ID is required'
        });
      }

      console.log('🔍 Fetching detailed recipe:', {
        user: user.id,
        recipeId: id
      });

      // Initialize standardization service
      const standardizationService = new RecipeResponseStandardizationService();

      // Step 1: Check cache first
      const cacheService = new RecipeCacheService();
      const cachedRecipe = await cacheService.getRecipeById(id);
      
      if (cachedRecipe) {
        console.log('✅ Found recipe in cache:', cachedRecipe.id);
        
        // Check access permissions for custom recipes
        if (cachedRecipe.provider === 'manual') {
          const isOwner = cachedRecipe.createdByNutritionistId === user.id;
          const isPublic = cachedRecipe.isPublic;
          
          if (!isOwner && !isPublic) {
            return res.status(403).json({
              error: 'Access denied',
              message: 'You do not have permission to view this custom recipe'
            });
          }
        }
        
        // Standardize the cached recipe response
        const standardizedRecipe = standardizationService.standardizeDatabaseRecipeResponse(cachedRecipe);
        
        // Check if nutritionDetails is empty and extract from originalApiResponse
        const hasNutritionData = standardizedRecipe.nutritionDetails && 
                                  (standardizedRecipe.nutritionDetails.calories?.quantity > 0 || 
                                   Object.keys(standardizedRecipe.nutritionDetails.macros || {}).length > 0);
        
        if (!hasNutritionData && standardizedRecipe.originalApiResponse) {
          console.log('⚠️ nutritionDetails empty, extracting from originalApiResponse');
          const NutritionMappingService = (await import('../../../lib/nutritionMappingService')).NutritionMappingService;
          const originalResponse = standardizedRecipe.originalApiResponse;
          
          // Try different formats
          if (originalResponse.nutrition) {
            // Spoonacular or already standardized format
            if (originalResponse.nutrition.macros) {
              standardizedRecipe.nutritionDetails = originalResponse.nutrition;
              console.log('  ✅ Used nutrition from originalApiResponse (already standardized)');
            } else {
              // Spoonacular raw format
              standardizedRecipe.nutritionDetails = NutritionMappingService.transformSpoonacularNutrition(originalResponse.nutrition);
              console.log('  ✅ Transformed Spoonacular nutrition');
            }
          } else if (originalResponse.totalNutrients) {
            // Edamam format - pass servings to get PER-SERVING nutrition (Edamam returns total)
            const recipeServings = cachedRecipe?.servings || originalResponse.yield || 1;
            standardizedRecipe.nutritionDetails = NutritionMappingService.transformEdamamNutrition(originalResponse, recipeServings);
            console.log(`  ✅ Transformed Edamam nutrition (${recipeServings} servings)`);
          }
          
          // Update cache with extracted nutrition
          if (standardizedRecipe.nutritionDetails && Object.keys(standardizedRecipe.nutritionDetails.macros || {}).length > 0) {
            try {
              await cacheService.updateRecipeNutrition(cachedRecipe.id, standardizedRecipe.nutritionDetails);
              console.log('  💾 Updated cache with nutrition');
            } catch (error) {
              console.error('  ❌ Failed to update cache:', error);
            }
          }
        }
        
        // Check if healthLabels are empty and extract from originalApiResponse (especially for Spoonacular)
        if ((!standardizedRecipe.healthLabels || standardizedRecipe.healthLabels.length === 0) && 
            cachedRecipe.provider === 'spoonacular' && 
            standardizedRecipe.originalApiResponse) {
          console.log('⚠️ healthLabels empty for Spoonacular recipe, extracting from originalApiResponse');
          const originalResponse = standardizedRecipe.originalApiResponse;
          const extractedLabels: string[] = [];
          
          if (originalResponse.glutenFree) extractedLabels.push('gluten-free');
          if (originalResponse.dairyFree) extractedLabels.push('dairy-free');
          if (originalResponse.vegetarian) extractedLabels.push('vegetarian');
          if (originalResponse.vegan) extractedLabels.push('vegan');
          if (originalResponse.ketogenic) extractedLabels.push('ketogenic');
          if (originalResponse.lowFodmap) extractedLabels.push('low-fodmap');
          if (originalResponse.whole30) extractedLabels.push('whole30');
          
          if (extractedLabels.length > 0) {
            standardizedRecipe.healthLabels = extractedLabels;
            console.log(`  ✅ Extracted ${extractedLabels.length} health labels:`, extractedLabels);
          }
        }
        
        return res.status(200).json({
          success: true,
          data: standardizedRecipe,
          message: 'Recipe details retrieved from cache (standardized)'
        });
      }

      // Step 2: Not in cache, fetch from external API
      console.log('🔄 Recipe not in cache, fetching from external API...');
      
      const multiProviderService = new MultiProviderRecipeSearchService();
      const externalRecipe = await multiProviderService.getRecipeDetails(id);
      
      if (!externalRecipe) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: 'The specified recipe does not exist'
        });
      }

      // Step 3: Store in cache for future use
      console.log('💾 Storing recipe in cache for future use...');
      
      // Transform external recipe to cache format
      const cacheRecipeData = {
        provider: externalRecipe.source,
        externalRecipeId: externalRecipe.id.startsWith('recipe_') ? externalRecipe.id.replace('recipe_', '') : externalRecipe.id,
        externalRecipeUri: externalRecipe.sourceUrl,
        recipeName: externalRecipe.title,
        recipeSource: externalRecipe.sourceUrl,
        recipeUrl: externalRecipe.sourceUrl,
        recipeImageUrl: externalRecipe.image,
        cuisineTypes: externalRecipe.cuisines || [],
        mealTypes: externalRecipe.dishTypes || [],
        dishTypes: externalRecipe.dishTypes || [],
        healthLabels: externalRecipe.healthLabels || [],
        dietLabels: externalRecipe.diets || [],
        servings: externalRecipe.servings || 1,
        totalTimeMinutes: externalRecipe.readyInMinutes,
        caloriesPerServing: externalRecipe.nutrition?.calories?.quantity || 0,
        proteinPerServingG: externalRecipe.nutrition?.macros?.protein?.quantity || 0,
        carbsPerServingG: externalRecipe.nutrition?.macros?.carbs?.quantity || 0,
        fatPerServingG: externalRecipe.nutrition?.macros?.fat?.quantity || 0,
        fiberPerServingG: externalRecipe.nutrition?.macros?.fiber?.quantity || 0,
        ingredients: externalRecipe.ingredients || [],
        cookingInstructions: externalRecipe.instructions || [],
        nutritionDetails: externalRecipe.nutrition || null, // Use null instead of {} for missing nutrition
        originalApiResponse: externalRecipe,
        hasCompleteNutrition: !!(externalRecipe.nutrition?.calories?.quantity && externalRecipe.nutrition?.macros?.protein?.quantity),
        hasDetailedIngredients: !!(externalRecipe.ingredients && externalRecipe.ingredients.length > 0),
        hasCookingInstructions: !!(externalRecipe.instructions && externalRecipe.instructions.length > 0),
        dataQualityScore: calculateDataQuality(externalRecipe)
      };
      
      if (!cacheRecipeData.nutritionDetails) {
        console.warn(`⚠️ Recipe ${externalRecipe.id} has no nutrition data - caching with null nutritionDetails`);
      }
      
      await cacheService.storeRecipe(cacheRecipeData);

      // Step 4: Standardize and return the external recipe
      console.log('🔧 Standardizing external recipe response...');
      
      // Convert external recipe to format expected by standardization service
      const recipeForStandardization = {
        id: externalRecipe.id,
        provider: externalRecipe.source,
        external_recipe_id: externalRecipe.id.startsWith('recipe_') ? externalRecipe.id.replace('recipe_', '') : externalRecipe.id,
        external_recipe_uri: externalRecipe.sourceUrl,
        recipe_name: externalRecipe.title,
        recipe_source: externalRecipe.sourceUrl,
        recipe_url: externalRecipe.sourceUrl,
        recipe_image_url: externalRecipe.image,
        cuisine_types: externalRecipe.cuisines || [],
        meal_types: externalRecipe.dishTypes || [],
        dish_types: externalRecipe.dishTypes || [],
        health_labels: externalRecipe.healthLabels || [],
        diet_labels: externalRecipe.diets || [],
        servings: externalRecipe.servings || 1,
        prep_time_minutes: null,
        cook_time_minutes: null,
        total_time_minutes: externalRecipe.readyInMinutes,
        total_calories: null,
        total_protein_g: null,
        total_carbs_g: null,
        total_fat_g: null,
        total_fiber_g: null,
        total_sugar_g: null,
        total_sodium_mg: null,
        total_weight_g: null,
        calories_per_serving: externalRecipe.nutrition?.calories?.quantity?.toString() || '0',
        protein_per_serving_g: externalRecipe.nutrition?.macros?.protein?.quantity?.toString() || '0',
        carbs_per_serving_g: externalRecipe.nutrition?.macros?.carbs?.quantity?.toString() || '0',
        fat_per_serving_g: externalRecipe.nutrition?.macros?.fat?.quantity?.toString() || '0',
        fiber_per_serving_g: externalRecipe.nutrition?.macros?.fiber?.quantity?.toString() || '0',
        ingredients: externalRecipe.ingredients || [],
        ingredient_lines: [],
        cooking_instructions: externalRecipe.instructions || [],
        nutrition_details: externalRecipe.nutrition || {},
        original_api_response: externalRecipe,
        cache_status: 'active',
        api_fetch_count: 1,
        last_api_fetch_at: new Date().toISOString(),
        last_accessed_at: new Date().toISOString(),
        has_complete_nutrition: !!(externalRecipe.nutrition?.calories?.quantity && externalRecipe.nutrition?.macros?.protein?.quantity),
        has_detailed_ingredients: !!(externalRecipe.ingredients && externalRecipe.ingredients.length > 0),
        has_cooking_instructions: !!(externalRecipe.instructions && externalRecipe.instructions.length > 0),
        data_quality_score: calculateDataQuality(externalRecipe),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const standardizedRecipe = standardizationService.standardizeRecipeResponse(recipeForStandardization);
      
      return res.status(200).json({
        success: true,
        data: standardizedRecipe,
        message: 'Recipe details retrieved from external API and cached (standardized)'
      });

    } catch (error) {
      console.error('❌ Error fetching recipe details:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch recipe details'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Old transformation functions removed - now using standardization service

/**
 * Calculate data quality score for a recipe (0-100)
 */
function calculateDataQuality(recipe: any): number {
  let score = 0;
  
  // Basic info (20 points)
  if (recipe.title) score += 10;
  if (recipe.image) score += 5;
  if (recipe.sourceUrl) score += 5;
  
  // Nutrition data (40 points)
  if (recipe.nutrition?.calories?.quantity && recipe.nutrition.calories.quantity > 0) score += 10;
  if (recipe.nutrition?.macros?.protein?.quantity && recipe.nutrition.macros.protein.quantity > 0) score += 10;
  if (recipe.nutrition?.macros?.carbs?.quantity && recipe.nutrition.macros.carbs.quantity > 0) score += 10;
  if (recipe.nutrition?.macros?.fat?.quantity && recipe.nutrition.macros.fat.quantity > 0) score += 10;
  
  // Ingredients (20 points)
  if (recipe.ingredients && recipe.ingredients.length > 0) score += 20;
  
  // Additional data (20 points)
  if (recipe.servings) score += 5;
  if (recipe.readyInMinutes) score += 5;
  if (recipe.healthLabels && recipe.healthLabels.length > 0) score += 5;
  if (recipe.cuisines && recipe.cuisines.length > 0) score += 5;
  
  return Math.min(score, 100);
}

export default requireAuth(handler);
