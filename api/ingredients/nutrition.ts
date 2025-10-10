import { VercelRequest, VercelResponse } from '@vercel/node';
import { EdamamService } from '../../lib/edamamService';
import { MultiProviderRecipeSearchService } from '../../lib/multiProviderRecipeSearchService';
import { NutritionMappingService } from '../../lib/nutritionMappingService';
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
    const validSources = ['edamam', 'spoonacular', 'auto'];
    const requestedSource = source && typeof source === 'string' && validSources.includes(source)
      ? source as 'edamam' | 'spoonacular' | 'auto'
      : 'auto'; // Default to auto (try Spoonacular first, then Edamam)

    // Build ingredient text with amount and unit if provided
    let ingredientText = ingredient.trim();
    if (amount) {
      // If unit is provided (even if empty string), include it in the text
      if (unit !== undefined) {
        ingredientText = unit ? `${amount} ${unit} ${ingredient}` : `${amount} ${ingredient}`;
      }
    }

    let nutritionData: any = null;
    let actualSource: string = requestedSource;

    if (requestedSource === 'edamam') {
      // Explicitly requested Edamam only
      console.log('🔍 Using Edamam (explicitly requested)');
      nutritionData = await edamamService.getIngredientNutrition(ingredientText);
      actualSource = 'edamam';
    } else if (requestedSource === 'spoonacular') {
      // Explicitly requested Spoonacular only
      console.log('🔍 Using Spoonacular (explicitly requested)');
      nutritionData = await multiProviderService.getIngredientNutrition(ingredientText);
      actualSource = 'spoonacular';
    } else {
      // Auto mode: Try Spoonacular first, fallback to Edamam
      console.log('🔍 Auto mode: Trying Spoonacular first...');
      nutritionData = await multiProviderService.getIngredientNutrition(ingredientText);
      
      if (nutritionData) {
        console.log('✅ Found in Spoonacular');
        actualSource = 'spoonacular';
      } else {
        console.log('⚠️ Not found in Spoonacular, falling back to Edamam...');
        nutritionData = await edamamService.getIngredientNutrition(ingredientText);
        
        if (nutritionData) {
          console.log('✅ Found in Edamam');
          actualSource = 'edamam';
        } else {
          console.log('❌ Not found in either source');
        }
      }
    }

    if (!nutritionData) {
      return res.status(200).json({
        success: false,
        ingredient: ingredientText,
        requestedSource: requestedSource,
        message: 'No nutrition information available for this ingredient in either Spoonacular or Edamam',
        timestamp: new Date().toISOString()
      });
    }

    // Transform to standardized format with exhaustive vitamins/minerals (all fields, even if 0)
    let standardizedNutrition;
    if (actualSource === 'spoonacular') {
      standardizedNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(nutritionData);
    } else {
      // Edamam - servings is 1 for ingredient nutrition (already for the specified amount)
      standardizedNutrition = NutritionMappingService.transformEdamamNutrition(nutritionData, 1);
    }

    return res.status(200).json({
      success: true,
      ingredient: ingredientText,
      source: actualSource,
      requestedSource: requestedSource,
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
