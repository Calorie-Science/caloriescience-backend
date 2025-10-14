import { VercelRequest, VercelResponse } from '@vercel/node';
import { MultiProviderRecipeSearchService, UnifiedSearchParams } from '../lib/multiProviderRecipeSearchService';
import { requireAuth } from '../lib/auth';

const multiProviderService = new MultiProviderRecipeSearchService();

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
        provider = 'both'
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
      const validProviders = ['edamam', 'spoonacular', 'both'];
      if (!validProviders.includes(provider as string)) {
        return res.status(400).json({
          error: 'Invalid provider parameter',
          message: 'provider must be one of: edamam, spoonacular, both'
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
        provider: provider as 'edamam' | 'spoonacular' | 'both'
      };

      // Remove undefined values
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key as keyof UnifiedSearchParams] === undefined) {
          delete searchParams[key as keyof UnifiedSearchParams];
        }
      });

      // Search recipes directly from APIs (no caching)
      const results = await multiProviderService.searchRecipes(searchParams, user.id);

      return res.status(200).json({
        success: true,
        data: results,
        message: `Found ${results.recipes.length} recipes from ${results.provider}`
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
