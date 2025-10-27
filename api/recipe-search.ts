import { VercelRequest, VercelResponse } from '@vercel/node';
import { MultiProviderRecipeSearchService, UnifiedSearchParams } from '../lib/multiProviderRecipeSearchService';
import { requireAuth } from '../lib/auth';
import { checkAllergenConflicts } from '../lib/allergenChecker';
import { supabase } from '../lib/supabase';
import { simpleIngredientService } from '../lib/simpleIngredientService';

const multiProviderService = new MultiProviderRecipeSearchService();

/**
 * Check which recipes are used in active drafts for a nutritionist
 */
async function getRecipeUsageInDrafts(nutritionistId: string, recipeIds: string[]): Promise<Map<string, { draftIds: string[]; planIds: string[] }>> {
  const usage = new Map<string, { draftIds: string[]; planIds: string[] }>();
  
  if (recipeIds.length === 0) {
    return usage;
  }
  
  try {
    // Get all active drafts for this nutritionist
    const { data: drafts, error } = await supabase
      .from('meal_plan_drafts')
      .select('id, suggestions')
      .eq('nutritionist_id', nutritionistId)
      .in('status', ['draft', 'completed']) // Exclude finalized
      .gte('expires_at', new Date().toISOString()); // Only non-expired drafts
    
    if (error || !drafts) {
      console.error('Error fetching drafts for recipe usage:', error);
      return usage;
    }
    
    // Scan all drafts for recipe usage
    for (const draft of drafts) {
      const suggestions = draft.suggestions || [];
      
      for (const day of suggestions) {
        const meals = day.meals || {};
        
        for (const mealName of Object.keys(meals)) {
          const meal = meals[mealName];
          const recipes = meal.recipes || [];
          const selectedRecipeId = meal.selectedRecipeId;
          
          // Check all recipes in this meal
          for (const recipe of recipes) {
            if (recipeIds.includes(recipe.id)) {
              if (!usage.has(recipe.id)) {
                usage.set(recipe.id, { draftIds: [], planIds: [] });
              }
              
              const recipeUsage = usage.get(recipe.id)!;
              if (!recipeUsage.draftIds.includes(draft.id)) {
                recipeUsage.draftIds.push(draft.id);
              }
              
              // Mark if this recipe is selected
              if (recipe.id === selectedRecipeId) {
                // Recipe is selected in this draft
                recipeUsage.planIds.push(draft.id);
              }
            }
          }
        }
      }
    }
    
    console.log(`📊 Recipe usage check: ${usage.size} recipes used in ${drafts.length} drafts`);
    
  } catch (error) {
    console.error('Error checking recipe usage:', error);
  }
  
  return usage;
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access recipe search
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can search recipes.' });
  }

  if (req.method === 'GET') {
    try {
      const {
        query,
        diet,
        health,
        cuisineType,
        mealType,
        dishType,
        calories,
        time,
        excluded,
        maxResults = '20',
        provider = 'both',
        includeCustom = 'true'
      } = req.query;

      // Validate maxResults
      const maxResultsNum = parseInt(maxResults as string);
      if (isNaN(maxResultsNum) || maxResultsNum < 1 || maxResultsNum > 100) {
        return res.status(400).json({
          error: 'Invalid maxResults parameter',
          message: 'maxResults must be between 1 and 100'
        });
      }

      // Validate provider
      const validProviders = ['edamam', 'spoonacular', 'bonhappetee', 'both', 'all', 'manual'];
      if (!validProviders.includes(provider as string)) {
        return res.status(400).json({
          error: 'Invalid provider parameter',
          message: 'provider must be one of: edamam, spoonacular, bonhappetee, both, all, manual'
        });
      }

      // Build search parameters
      const searchParams: UnifiedSearchParams = {
        query: query as string,
        diet: diet ? (Array.isArray(diet) ? diet as string[] : [diet as string]) : undefined,
        health: health ? (Array.isArray(health) ? health as string[] : [health as string]) : undefined,
        cuisineType: cuisineType ? (Array.isArray(cuisineType) ? cuisineType as string[] : [cuisineType as string]) : undefined,
        mealType: mealType ? (Array.isArray(mealType) ? mealType as string[] : [mealType as string]) : undefined,
        dishType: dishType ? (Array.isArray(dishType) ? dishType as string[] : [dishType as string]) : undefined,
        calories: calories as string,
        time: time as string,
        excluded: excluded ? (Array.isArray(excluded) ? excluded as string[] : [excluded as string]) : undefined,
        maxResults: maxResultsNum,
        provider: provider as 'edamam' | 'spoonacular' | 'bonhappetee' | 'both' | 'all' | 'manual',
        includeCustom: includeCustom === 'true'
      };

      // Remove undefined values
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key as keyof UnifiedSearchParams] === undefined) {
          delete searchParams[key as keyof UnifiedSearchParams];
        }
      });

      // Search recipes directly from APIs (no caching)
      const results = await multiProviderService.searchRecipes(searchParams, user.id);

      // Always search for 1-2 matching simple ingredients (fruits, vegetables, proteins, etc.)
      // These should appear FIRST before complex recipes for better UX
      let ingredientRecipes: any[] = [];
      
      if (searchParams.query && searchParams.query.trim().length >= 2) {
        console.log(`🔍 Searching simple ingredients for: "${searchParams.query}"`);
        
        // Extract allergens from health labels if provided (e.g., "dairy-free" → "dairy")
        const allergenFilters = searchParams.health
          ?.filter(h => h.endsWith('-free'))
          .map(h => h.replace('-free', ''));
        
        // Search simple ingredients with allergen filtering (async)
        ingredientRecipes = await simpleIngredientService.searchIngredientsAsRecipes(
          searchParams.query,
          2, // Fetch up to 2 matching ingredients
          allergenFilters && allergenFilters.length > 0 ? allergenFilters : undefined
        );
        
        console.log(`✅ Found ${ingredientRecipes.length} matching simple ingredients`);
      }

      // Optional: Apply ingredient-level allergen filtering if health filters provided
      let filteredRecipes = results.recipes;
      let filteringApplied = false;
      
      if (searchParams.health && searchParams.health.length > 0) {
        console.log(`🔍 Applying ingredient-level allergen filtering for health labels:`, searchParams.health);
        
        const recipesBeforeFilter = filteredRecipes.length;
        
        // Extract allergens from health labels (e.g., "dairy-free" → "dairy")
        const allergenFilters = searchParams.health
          .filter(h => h.endsWith('-free'))
          .map(h => h.replace('-free', ''));
        
        if (allergenFilters.length > 0) {
          filteredRecipes = filteredRecipes.filter(recipe => {
            const conflictCheck = checkAllergenConflicts(
              recipe.allergens || [],
              recipe.healthLabels || [],
              allergenFilters,
              recipe.ingredients
            );
            
            if (conflictCheck.hasConflict) {
              console.log(`❌ Filtered "${recipe.title}" - conflicts:`, conflictCheck.conflictingAllergens);
            }
            
            return !conflictCheck.hasConflict;
          });
          
          filteringApplied = true;
          console.log(`🧹 Ingredient-level filter: ${recipesBeforeFilter} → ${filteredRecipes.length} recipes`);
        }
      }

      // Combine simple ingredients with filtered recipes (INGREDIENTS FIRST for better UX)
      const allRecipes = [...ingredientRecipes, ...filteredRecipes];
      
      // Get recipe usage in drafts
      const recipeIds = allRecipes.map(r => r.id);
      const usageMap = await getRecipeUsageInDrafts(user.id, recipeIds);
      
      // Enrich recipes with usage metadata
      const enrichedRecipes = allRecipes.map(recipe => ({
        ...recipe,
        usageMetadata: usageMap.has(recipe.id) ? {
          usedInDrafts: usageMap.get(recipe.id)!.draftIds,
          selectedInPlans: usageMap.get(recipe.id)!.planIds
        } : undefined
      }));

      return res.status(200).json({
        success: true,
        data: {
          ...results,
          recipes: enrichedRecipes,
          totalResults: allRecipes.length
        },
        metadata: {
          ingredientLevelFiltering: filteringApplied,
          originalCount: results.recipes.length,
          filteredCount: filteredRecipes.length,
          ingredientRecipesCount: ingredientRecipes.length,
          totalCount: allRecipes.length
        },
        message: `Found ${allRecipes.length} results from ${results.provider}${ingredientRecipes.length > 0 ? ` (${ingredientRecipes.length} ingredients, ${filteredRecipes.length} recipes)` : ''}`
      });

    } catch (error) {
      console.error('❌ Error in recipe search:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to search recipes'
      });
    }
  }

  if (req.method === 'POST') {
    try {
      const { action, ...actionData } = req.body;

      if (!action) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'action is required'
        });
      }

      switch (action) {
        case 'get-providers':
          // Get available providers
          const providers = multiProviderService.getAvailableProviders();
          return res.status(200).json({
            success: true,
            data: { providers },
            message: `Available providers: ${providers.join(', ')}`
          });

        case 'get-recipe-details':
          // Get detailed recipe information
          const { recipeId } = actionData;
          
          if (!recipeId || typeof recipeId !== 'string') {
            return res.status(400).json({
              error: 'Missing recipeId',
              message: 'recipeId is required and must be a string'
            });
          }

          const recipeDetails = await multiProviderService.getRecipeDetails(recipeId);
          
          if (!recipeDetails) {
            return res.status(404).json({
              error: 'Recipe not found',
              message: 'Could not find recipe with the specified ID'
            });
          }

          return res.status(200).json({
            success: true,
            data: recipeDetails,
            message: 'Recipe details retrieved successfully'
          });

        default:
          return res.status(400).json({
            error: 'Invalid action',
            message: 'action must be one of: get-providers, get-recipe-details'
          });
      }

    } catch (error) {
      console.error('❌ Error in POST request:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to process request'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only GET and POST methods are allowed'
  });
}

export default requireAuth(handler);
