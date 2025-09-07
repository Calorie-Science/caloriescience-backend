import { VercelRequest, VercelResponse } from '@vercel/node';
import { EdamamService } from '../../lib/edamamService';
import { requireAuth } from '../../lib/auth';

const edamamService = new EdamamService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access ingredient details
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can access ingredient details.' });
  }

  // Only GET method allowed
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    const { ingr, nutritionType } = req.query;

    // Validate ingredient parameter
    if (!ingr || typeof ingr !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid ingredient parameter',
        message: 'Query parameter "ingr" is required and must be a string'
      });
    }

    // Minimum ingredient length check
    if (ingr.trim().length < 1) {
      return res.status(400).json({
        error: 'Ingredient too short',
        message: 'Ingredient must be at least 1 character long'
      });
    }

    // Maximum ingredient length check (reasonable limit)
    if (ingr.length > 200) {
      return res.status(400).json({
        error: 'Ingredient too long',
        message: 'Ingredient must be 200 characters or less'
      });
    }

    // Validate nutrition type parameter (optional)
    const validNutritionTypes = ['cooking', 'logging'];
    const finalNutritionType = nutritionType && typeof nutritionType === 'string' && validNutritionTypes.includes(nutritionType) 
      ? nutritionType as 'cooking' | 'logging'
      : 'cooking';

    // Get ingredient details
    const details = await edamamService.getIngredientDetails(ingr, finalNutritionType);

    if (!details) {
      return res.status(404).json({
        error: 'Ingredient not found',
        message: 'Could not find details for the specified ingredient'
      });
    }

    // Transform the response to make it more user-friendly
    const transformedResponse = {
      success: true,
      ingredient: ingr,
      nutritionType: finalNutritionType,
      totalResults: details.count || 0,
      parsed: details.parsed || [],
      hints: details.hints || [],
      // Extract the most relevant result (usually the first parsed result or first hint)
      primaryResult: details.parsed?.[0] || details.hints?.[0] || null,
      _links: details._links || null
    };

    // Add simplified nutrition info for the primary result if available
    if (transformedResponse.primaryResult?.food) {
      const food = transformedResponse.primaryResult.food;
      transformedResponse.primaryResult.simplifiedNutrition = {
        foodId: food.foodId,
        label: food.label,
        knownAs: food.knownAs,
        category: food.category,
        image: food.image,
        brand: food.brand || null,
        nutrients: {
          calories: food.nutrients?.ENERC_KCAL || 0,
          protein: food.nutrients?.PROCNT || 0,
          fat: food.nutrients?.FAT || 0,
          carbs: food.nutrients?.CHOCDF || 0,
          fiber: food.nutrients?.FIBTG || 0
        },
        servingSizes: food.servingSizes || [],
        availableMeasures: transformedResponse.primaryResult.measures || []
      };
    }

    return res.status(200).json(transformedResponse);

  } catch (error) {
    console.error('Error in ingredient details:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to get ingredient details'
    });
  }
}

export default requireAuth(handler);
