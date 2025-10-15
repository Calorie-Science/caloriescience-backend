import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  MultiProviderRecipeSearchService, 
  ClientAwareSearchParams 
} from '../lib/multiProviderRecipeSearchService';
import { requireAuth } from '../lib/auth';

const multiProviderService = new MultiProviderRecipeSearchService();

/**
 * GET /api/recipe-search-client
 * 
 * Search recipes with automatic allergen filtering based on client profile.
 * Allows nutritionist to override specific filters.
 * 
 * Query Parameters:
 * - clientId (required): Client UUID
 * - query (required for 'broad' and 'name'): Search term (min 2 characters)
 * - searchType: 'broad' | 'name' | 'ingredient' (default: 'broad')
 *   - broad: Search recipe names, ingredients, descriptions
 *   - name: Search recipe names only
 *   - ingredient: Search by ingredients (use 'ingredients' param)
 * - ingredients: Comma-separated ingredients (for searchType=ingredient)
 * - maxResults: Number of results (default: 20)
 * - provider: 'edamam' | 'spoonacular' | 'both' (default: 'both')
 * - mealType: Meal type filter
 * - cuisineType: Cuisine type filter (comma-separated)
 * - excludeClientAllergens: Allergens to NOT filter (comma-separated) - OVERRIDE
 * - excludeClientPreferences: Preferences to NOT filter (comma-separated) - OVERRIDE
 * 
 * Examples:
 * 1. Broad search: ?clientId=123&query=chicken
 * 2. Name search: ?clientId=123&query=chicken&searchType=name
 * 3. Ingredient search: ?clientId=123&searchType=ingredient&ingredients=chicken,broccoli
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;
  
  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Only nutritionists can search recipes for clients' 
    });
  }

  if (req.method === 'GET') {
    try {
      const { 
        clientId, 
        query, 
        searchType = 'broad',
        ingredients,
        maxResults = '20',
        provider = 'both',
        mealType,
        cuisineType,
        diet
      } = req.query;

      // Validate required parameters
      if (!clientId) {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'clientId is required'
        });
      }

      // Validate based on search type
      if (searchType === 'ingredient') {
        if (!ingredients || (ingredients as string).length < 2) {
          return res.status(400).json({
            error: 'Invalid ingredients',
            message: 'ingredients parameter is required for ingredient search (min 2 characters)'
          });
        }
      } else {
        // For 'broad' and 'name' search types
        if (!query || (query as string).length < 2) {
          return res.status(400).json({
            error: 'Invalid query',
            message: 'query must be at least 2 characters'
          });
        }
      }

      // Parse comma-separated values
      const parseCsvParam = (param: string | string[] | undefined): string[] => {
        if (!param) return [];
        const value = Array.isArray(param) ? param[0] : param;
        return value.split(',').map(v => v.trim()).filter(Boolean);
      };

      // Build search params
      const searchParams: ClientAwareSearchParams = {
        clientId: clientId as string,
        query: query as string,
        searchType: searchType as 'broad' | 'name' | 'ingredient',
        maxResults: parseInt(maxResults as string) || 20,
        provider: (provider as any) || 'both',
        // UX provides the actual preferences and cuisineTypes they want
        diet: parseCsvParam(diet),
        cuisineType: parseCsvParam(cuisineType)
      };

      // Add ingredients for ingredient search
      if (searchType === 'ingredient' && ingredients) {
        searchParams.ingredients = parseCsvParam(ingredients);
      }

      // Add optional filters
      if (mealType) {
        searchParams.mealType = [mealType as string];
      }

      console.log('📥 Recipe search request:', {
        nutritionist: user.email,
        clientId,
        searchType,
        query: query || null,
        ingredients: searchParams.ingredients || null,
        uxFilters: {
          preferences: searchParams.diet,
          cuisineTypes: searchParams.cuisineType
        }
      });

      // Search with automatic allergen filtering
      const results = await multiProviderService.searchRecipesForClient(
        searchParams,
        user.id
      );

      // Add info about removed filters (if any)
      const hasRemovedFilters = 
        results.appliedFilters.removedPreferences.length > 0 ||
        results.appliedFilters.removedCuisineTypes.length > 0;

      return res.status(200).json({
        success: true,
        data: results,
        metadata: {
          clientName: results.clientProfile.name,
          totalResults: results.totalResults,
          appliedFilters: results.appliedFilters,
          info: hasRemovedFilters ? {
            message: 'Some client preferences/cuisines were not included in search',
            removedPreferences: results.appliedFilters.removedPreferences,
            removedCuisineTypes: results.appliedFilters.removedCuisineTypes
          } : null
        },
        message: `Found ${results.recipes.length} recipes from ${results.provider}`
      });

    } catch (error) {
      console.error('❌ Error in client recipe search:', error);
      
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to search recipes'
      });
    }
  }

  return res.status(405).json({ 
    error: 'Method not allowed',
    message: 'Only GET requests are supported' 
  });
}

export default requireAuth(handler);

