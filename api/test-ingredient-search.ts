import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth';
import { ingredientRecipeService } from '../lib/ingredientRecipeService';

/**
 * Test endpoint for ingredient search
 * GET /api/test-ingredient-search?query=banana
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;
  
  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({ 
      error: 'Access denied',
      message: 'Only nutritionists can test ingredient search' 
    });
  }

  if (req.method === 'GET') {
    try {
      const { query = 'banana', allergens } = req.query;

      console.log(`🧪 Testing ingredient search with query: "${query}"`);
      
      // Parse allergens
      const clientAllergens = allergens 
        ? (typeof allergens === 'string' ? allergens.split(',') : allergens)
        : undefined;

      const ingredients = await ingredientRecipeService.searchIngredientsAsRecipes(
        query as string,
        5,
        clientAllergens as string[] | undefined
      );

      console.log(`🧪 Result: Found ${ingredients.length} ingredients`);

      return res.status(200).json({
        success: true,
        query,
        clientAllergens: clientAllergens || [],
        count: ingredients.length,
        ingredients: ingredients.map(i => ({
          id: i.id,
          title: i.title,
          allergens: i.allergens,
          healthLabels: i.healthLabels,
          source: i.source
        })),
        message: `Found ${ingredients.length} ingredient results`
      });

    } catch (error) {
      console.error('❌ Test error:', error);
      
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to test ingredient search',
        stack: error instanceof Error ? error.stack : undefined
      });
    }
  }

  return res.status(405).json({ 
    error: 'Method not allowed',
    message: 'Only GET requests are supported' 
  });
}

export default requireAuth(handler);

