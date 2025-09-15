import { VercelRequest, VercelResponse } from '@vercel/node';
import { EdamamApiKeyService } from '../lib/edamamApiKeyService';
import { EdamamKeyRotationService } from '../lib/edamamKeyRotationService';

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKeyService = new EdamamApiKeyService();
    const keyRotationService = new EdamamKeyRotationService();

    // Get all API keys
    const mealPlannerKeys = await apiKeyService.getApiKeys('meal_planner');
    const nutritionKeys = await apiKeyService.getApiKeys('nutrition');
    const recipeKeys = await apiKeyService.getApiKeys('recipe');
    const autocompleteKeys = await apiKeyService.getApiKeys('autocomplete');

    // Get rotation status
    const rotationStatus = await keyRotationService.getRotationStatus();

    // Test getting active keys
    const activeMealPlannerKey = await apiKeyService.getActiveApiKey('meal_planner');
    const activeNutritionKey = await apiKeyService.getActiveApiKey('nutrition');

    return res.status(200).json({
      success: true,
      data: {
        mealPlannerKeys,
        nutritionKeys,
        recipeKeys,
        autocompleteKeys,
        rotationStatus,
        activeKeys: {
          mealPlanner: activeMealPlannerKey,
          nutrition: activeNutritionKey
        }
      }
    });

  } catch (error) {
    console.error('❌ Test API Keys Error:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
