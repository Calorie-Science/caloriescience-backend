import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { RecipeCacheService } from '../../../lib/recipeCacheService';
import { MultiProviderRecipeSearchService } from '../../../lib/multiProviderRecipeSearchService';

interface DetailedRecipe {
  id: string;
  title: string;
  image?: string;
  sourceUrl?: string;
  source: 'edamam' | 'spoonacular';
  servings: number;
  readyInMinutes?: number;
  fromCache: boolean;
  
  // Detailed nutrition information
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
    cholesterol?: number;
    saturatedFat?: number;
    transFat?: number;
    monounsaturatedFat?: number;
    polyunsaturatedFat?: number;
    potassium?: number;
    calcium?: number;
    iron?: number;
    vitaminA?: number;
    vitaminC?: number;
    vitaminD?: number;
    vitaminE?: number;
    vitaminK?: number;
    thiamin?: number;
    riboflavin?: number;
    niacin?: number;
    vitaminB6?: number;
    folate?: number;
    vitaminB12?: number;
    biotin?: number;
    pantothenicAcid?: number;
    phosphorus?: number;
    iodine?: number;
    magnesium?: number;
    zinc?: number;
    selenium?: number;
    copper?: number;
    manganese?: number;
    chromium?: number;
    molybdenum?: number;
  };
  
  // Detailed ingredients
  ingredients: Array<{
    id?: string;
    name: string;
    amount: number;
    unit: string;
    originalString?: string;
    image?: string;
    aisle?: string;
    meta?: string[];
    measures?: {
      us?: { amount: number; unitShort: string; unitLong: string };
      metric?: { amount: number; unitShort: string; unitLong: string };
    };
  }>;
  
  // Instructions
  instructions?: Array<{
    number: number;
    step: string;
  }>;
  
  // Additional metadata
  summary?: string;
  cuisines?: string[];
  dishTypes?: string[];
  diets?: string[];
  healthLabels?: string[];
  cautions?: string[];
  tags?: string[];
}

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can fetch recipe details.' });
  }

  if (req.method === 'GET') {
    try {
      const { id } = req.query;
      
      if (!id || typeof id !== 'string') {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'Recipe ID is required'
        });
      }

      console.log('🔍 Fetching detailed recipe:', {
        user: user.id,
        recipeId: id
      });

      // Step 1: Check cache first
      const cacheService = new RecipeCacheService();
      const cachedRecipe = await cacheService.getRecipeById(id);
      
      if (cachedRecipe) {
        console.log('✅ Found recipe in cache:', cachedRecipe.id);
        
        const detailedRecipe = transformCachedRecipeToDetailed(cachedRecipe);
        return res.status(200).json({
          success: true,
          data: detailedRecipe,
          message: 'Recipe details retrieved from cache'
        });
      }

      // Step 2: Not in cache, fetch from external API
      console.log('🔄 Recipe not in cache, fetching from external API...');
      
      const multiProviderService = new MultiProviderRecipeSearchService();
      const externalRecipe = await multiProviderService.getRecipeDetails(id);
      
      if (!externalRecipe) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: 'The specified recipe does not exist'
        });
      }

      // Step 3: Store in cache for future use
      console.log('💾 Storing recipe in cache for future use...');
      
      // Transform external recipe to cache format
      const cacheRecipeData = {
        provider: externalRecipe.source,
        externalRecipeId: externalRecipe.id.startsWith('recipe_') ? externalRecipe.id.replace('recipe_', '') : externalRecipe.id,
        externalRecipeUri: externalRecipe.sourceUrl,
        recipeName: externalRecipe.title,
        recipeSource: externalRecipe.sourceUrl,
        recipeUrl: externalRecipe.sourceUrl,
        recipeImageUrl: externalRecipe.image,
        cuisineTypes: externalRecipe.cuisines || [],
        mealTypes: externalRecipe.dishTypes || [],
        dishTypes: externalRecipe.dishTypes || [],
        healthLabels: externalRecipe.healthLabels || [],
        dietLabels: externalRecipe.diets || [],
        servings: externalRecipe.servings || 1,
        totalTimeMinutes: externalRecipe.readyInMinutes,
        caloriesPerServing: externalRecipe.nutrition?.calories?.quantity || 0,
        proteinPerServingG: externalRecipe.nutrition?.macros?.protein?.quantity || 0,
        carbsPerServingG: externalRecipe.nutrition?.macros?.carbs?.quantity || 0,
        fatPerServingG: externalRecipe.nutrition?.macros?.fat?.quantity || 0,
        fiberPerServingG: externalRecipe.nutrition?.macros?.fiber?.quantity || 0,
        ingredients: externalRecipe.ingredients || [],
        cookingInstructions: externalRecipe.instructions || [],
        nutritionDetails: externalRecipe.nutrition || {},
        originalApiResponse: externalRecipe,
        hasCompleteNutrition: !!(externalRecipe.nutrition?.calories?.quantity && externalRecipe.nutrition?.macros?.protein?.quantity),
        hasDetailedIngredients: !!(externalRecipe.ingredients && externalRecipe.ingredients.length > 0),
        hasCookingInstructions: !!(externalRecipe.instructions && externalRecipe.instructions.length > 0),
        dataQualityScore: calculateDataQuality(externalRecipe)
      };
      
      await cacheService.storeRecipe(cacheRecipeData);

      // Step 4: Transform and return
      const detailedRecipe = transformExternalRecipeToDetailed(externalRecipe);
      
      return res.status(200).json({
        success: true,
        data: detailedRecipe,
        message: 'Recipe details retrieved from external API and cached'
      });

    } catch (error) {
      console.error('❌ Error fetching recipe details:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch recipe details'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

function transformCachedRecipeToDetailed(cachedRecipe: any): DetailedRecipe {
  // Transform nutrition data to new format if it's in old format
  let nutrition = cachedRecipe.nutrition_details || {};
  
  // Check if nutrition is in old flat format and needs transformation
  if (nutrition && !nutrition.macros && !nutrition.micros) {
    nutrition = transformOldNutritionFormat(nutrition);
  }
  
  return {
    id: cachedRecipe.id,
    title: cachedRecipe.recipe_name,
    image: cachedRecipe.recipe_image_url,
    sourceUrl: cachedRecipe.recipe_url,
    source: cachedRecipe.provider,
    servings: cachedRecipe.servings || 1,
    readyInMinutes: cachedRecipe.total_time_minutes,
    fromCache: true,
    nutrition: nutrition,
    ingredients: cachedRecipe.ingredients || [],
    instructions: cachedRecipe.cooking_instructions || [],
    summary: cachedRecipe.summary,
    cuisines: cachedRecipe.cuisine_types || [],
    dishTypes: cachedRecipe.dish_types || [],
    diets: cachedRecipe.diet_labels || [],
    healthLabels: cachedRecipe.health_labels || [],
    cautions: cachedRecipe.cautions || [],
    tags: cachedRecipe.tags || []
  };
}

/**
 * Transform old flat nutrition format to new structured format
 */
function transformOldNutritionFormat(oldNutrition: any): any {
  const nutrition = {
    macros: {},
    micros: {
      vitamins: {},
      minerals: {}
    }
  };

  // Define nutrient categories
  const macros = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium', 'cholesterol', 'saturatedFat', 'transFat', 'monounsaturatedFat', 'polyunsaturatedFat'];
  const vitamins = ['vitaminA', 'vitaminC', 'vitaminD', 'vitaminE', 'vitaminK', 'thiamin', 'riboflavin', 'niacin', 'vitaminB6', 'folate', 'vitaminB12', 'biotin', 'pantothenicAcid'];
  const minerals = ['potassium', 'calcium', 'iron', 'phosphorus', 'iodine', 'magnesium', 'zinc', 'selenium', 'copper', 'manganese', 'chromium', 'molybdenum'];

  // Categorize nutrients
  for (const [key, value] of Object.entries(oldNutrition)) {
    if (macros.includes(key)) {
      nutrition.macros[key] = value;
    } else if (vitamins.includes(key)) {
      nutrition.micros.vitamins[key] = value;
    } else if (minerals.includes(key)) {
      nutrition.micros.minerals[key] = value;
    }
  }

  return nutrition;
}

function transformExternalRecipeToDetailed(externalRecipe: any): DetailedRecipe {
  return {
    id: externalRecipe.id,
    title: externalRecipe.title,
    image: externalRecipe.image,
    sourceUrl: externalRecipe.sourceUrl,
    source: externalRecipe.source,
    servings: externalRecipe.servings || 1,
    readyInMinutes: externalRecipe.readyInMinutes,
    fromCache: false,
    nutrition: externalRecipe.nutrition || {},
    ingredients: externalRecipe.ingredients || [],
    instructions: externalRecipe.instructions || [],
    summary: externalRecipe.summary,
    cuisines: externalRecipe.cuisines || [],
    dishTypes: externalRecipe.dishTypes || [],
    diets: externalRecipe.diets || [],
    healthLabels: externalRecipe.healthLabels || [],
    cautions: externalRecipe.cautions || [],
    tags: externalRecipe.tags || []
  };
}

/**
 * Calculate data quality score for a recipe (0-100)
 */
function calculateDataQuality(recipe: any): number {
  let score = 0;
  
  // Basic info (20 points)
  if (recipe.title) score += 10;
  if (recipe.image) score += 5;
  if (recipe.sourceUrl) score += 5;
  
  // Nutrition data (40 points)
  if (recipe.nutrition?.calories?.quantity && recipe.nutrition.calories.quantity > 0) score += 10;
  if (recipe.nutrition?.macros?.protein?.quantity && recipe.nutrition.macros.protein.quantity > 0) score += 10;
  if (recipe.nutrition?.macros?.carbs?.quantity && recipe.nutrition.macros.carbs.quantity > 0) score += 10;
  if (recipe.nutrition?.macros?.fat?.quantity && recipe.nutrition.macros.fat.quantity > 0) score += 10;
  
  // Ingredients (20 points)
  if (recipe.ingredients && recipe.ingredients.length > 0) score += 20;
  
  // Additional data (20 points)
  if (recipe.servings) score += 5;
  if (recipe.readyInMinutes) score += 5;
  if (recipe.healthLabels && recipe.healthLabels.length > 0) score += 5;
  if (recipe.cuisines && recipe.cuisines.length > 0) score += 5;
  
  return Math.min(score, 100);
}

export default requireAuth(handler);
