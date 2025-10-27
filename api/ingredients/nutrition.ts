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
      nutritionData = await edamamService.getIngredientNutrition(ingredientText);
      actualSource = 'edamam';
    } else if (requestedSource === 'spoonacular') {
      // Explicitly requested Spoonacular only
      nutritionData = await multiProviderService.getIngredientNutrition(ingredientText);
      actualSource = 'spoonacular';
    } else {
      // Auto mode: Try Spoonacular first, fallback to Edamam
      nutritionData = await multiProviderService.getIngredientNutrition(ingredientText);
      
      if (nutritionData) {
        actualSource = 'spoonacular';
      } else {
        nutritionData = await edamamService.getIngredientNutrition(ingredientText);
        
        if (nutritionData) {
          actualSource = 'edamam';
        }
      }
    }

    if (!nutritionData) {
      return res.status(404).json({
        success: false,
        ingredient: ingredientText,
        message: 'No nutrition information available for this ingredient'
      });
    }

    // Transform to standardized format to extract key fields
    let standardizedNutrition;
    if (actualSource === 'spoonacular') {
      standardizedNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(nutritionData);
    } else {
      // Edamam - servings is 1 for ingredient nutrition (already for the specified amount)
      standardizedNutrition = NutritionMappingService.transformEdamamNutrition(nutritionData, 1);
    }

    // Helper function to extract quantities from standardized nutrition
    const extractQuantities = (obj: any): any => {
      if (obj && typeof obj === 'object' && 'quantity' in obj) {
        return obj.quantity;
      }
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const key in obj) {
          result[key] = extractQuantities(obj[key]);
        }
        return result;
      }
      return obj;
    };

    // Return complete nutrition data including macros, vitamins, and minerals
    return res.status(200).json({
      success: true,
      ingredient: ingredientText,
      source: actualSource,
      nutrition: {
        // Basic calories
        calories: standardizedNutrition.calories.quantity,
        
        // Macros (with quantities extracted)
        macros: {
          protein: standardizedNutrition.macros.protein?.quantity || 0,
          carbs: standardizedNutrition.macros.carbs?.quantity || 0,
          fat: standardizedNutrition.macros.fat?.quantity || 0,
          fiber: standardizedNutrition.macros.fiber?.quantity || 0,
          sugar: standardizedNutrition.macros.sugar?.quantity || 0,
          sodium: standardizedNutrition.macros.sodium?.quantity || 0,
          cholesterol: standardizedNutrition.macros.cholesterol?.quantity || 0,
          saturatedFat: standardizedNutrition.macros.saturatedFat?.quantity || 0,
          transFat: standardizedNutrition.macros.transFat?.quantity || 0,
          monounsaturatedFat: standardizedNutrition.macros.monounsaturatedFat?.quantity || 0,
          polyunsaturatedFat: standardizedNutrition.macros.polyunsaturatedFat?.quantity || 0
        },
        
        // Micronutrients
        micros: {
          vitamins: extractQuantities(standardizedNutrition.micros.vitamins),
          minerals: extractQuantities(standardizedNutrition.micros.minerals)
        }
      }
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
