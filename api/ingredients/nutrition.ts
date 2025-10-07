import { VercelRequest, VercelResponse } from '@vercel/node';
import { EdamamService } from '../../lib/edamamService';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
import { requireAuth } from '../../lib/auth';

const edamamService = new EdamamService();
const multiProviderService = new MultiProviderRecipeSearchService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access ingredient nutrition
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can access ingredient nutrition.' });
  }

  // Only GET method allowed
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    const { ingredient, source, amount, unit } = req.query;

    // Validate required parameters
    if (!ingredient || typeof ingredient !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid ingredient parameter',
        message: 'Ingredient parameter is required and must be a string'
      });
    }

    // Validate source parameter
    const validSources = ['edamam', 'spoonacular'];
    const finalSource = source && typeof source === 'string' && validSources.includes(source)
      ? source as 'edamam' | 'spoonacular'
      : 'edamam';

    // Build ingredient text with amount and unit if provided
    let ingredientText = ingredient.trim();
    if (amount && unit) {
      ingredientText = `${amount} ${unit} ${ingredient}`;
    }

    let nutritionData: any = null;

    if (finalSource === 'edamam') {
      // Get nutrition from Edamam
      nutritionData = await edamamService.getIngredientNutrition(ingredientText);
    } else if (finalSource === 'spoonacular') {
      // Get nutrition from Spoonacular
      nutritionData = await multiProviderService.getIngredientNutrition(ingredientText);
    }

    if (!nutritionData) {
      return res.status(404).json({
        error: 'Nutrition data not found',
        message: 'No nutrition information available for this ingredient'
      });
    }

    return res.status(200).json({
      success: true,
      ingredient: ingredientText,
      source: finalSource,
      nutrition: nutritionData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in ingredient nutrition lookup:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to get ingredient nutrition'
    });
  }
}

export default requireAuth(handler);
