import { VercelRequest, VercelResponse } from '@vercel/node';
import { EdamamService, RecipeSearchParams } from '../../lib/edamamService';
import { requireAuth } from '../../lib/auth';

const edamamService = new EdamamService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // GET - Search recipes
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
        imageSize = 'REGULAR',
        random = 'false',
        beta = 'false',
        co2EmissionsClass
      } = req.query;

      // Build search parameters
      const searchParams: RecipeSearchParams = {};

      if (query && typeof query === 'string') searchParams.query = query;
      if (diet && Array.isArray(diet)) searchParams.diet = diet as string[];
      if (health && Array.isArray(health)) searchParams.health = health as string[];
      if (cuisineType && Array.isArray(cuisineType)) searchParams.cuisineType = cuisineType as string[];
      if (mealType && Array.isArray(mealType)) searchParams.mealType = mealType as string[];
      if (dishType && Array.isArray(dishType)) searchParams.dishType = dishType as string[];
      if (calories && typeof calories === 'string') searchParams.calories = calories;
      if (time && typeof time === 'string') searchParams.time = time;
      if (excluded && Array.isArray(excluded)) searchParams.excluded = excluded as string[];
      if (imageSize && typeof imageSize === 'string') {
        if (['THUMBNAIL', 'SMALL', 'REGULAR', 'LARGE'].includes(imageSize)) {
          searchParams.imageSize = imageSize as 'THUMBNAIL' | 'SMALL' | 'REGULAR' | 'LARGE';
        }
      }
      if (random === 'true') searchParams.random = true;
      if (beta === 'true') searchParams.beta = true;
      if (co2EmissionsClass && typeof co2EmissionsClass === 'string') {
        searchParams.co2EmissionsClass = co2EmissionsClass;
      }

      // Use a simple user ID for Edamam instead of the UUID
      const edamamUserId = 'nutritionist1';
      
      // Perform search
      const searchResults = await edamamService.searchRecipes(searchParams, edamamUserId);

      return res.status(200).json({
        message: 'Recipe search completed successfully',
        results: searchResults,
        searchParams: searchParams
      });

    } catch (error) {
      console.error('Error searching recipes:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to search recipes'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only GET method is allowed'
  });
}

export default requireAuth(handler);
