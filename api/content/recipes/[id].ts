import { VercelRequest, VercelResponse } from '@vercel/node';
import { MultiProviderRecipeSearchService, UnifiedRecipe } from '../../lib/multiProviderRecipeSearchService';
import { RecipeCacheService } from '../../lib/recipeCacheService';
import { EdamamService } from '../../lib/edamamService';
import { requireAuth } from '../../lib/auth';

const multiProviderService = new MultiProviderRecipeSearchService();
const cacheService = new RecipeCacheService();
const edamamService = new EdamamService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access recipe details
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can view recipe details.' });
  }

  if (req.method === 'GET') {
    try {
      const { id } = req.params;
      const { source } = req.query;

      if (!id) {
        return res.status(400).json({
          error: 'Missing recipe ID',
          message: 'Recipe ID is required'
        });
      }

      if (!source || (source as string !== 'edamam' && source as string !== 'spoonacular')) {
        return res.status(400).json({
          error: 'Missing or invalid source',
          message: 'Source must be either edamam or spoonacular'
        });
      }

      console.log('🔍 Recipe Details Request:', {
        user: user.id,
        recipeId: id,
        source
      });

      // Step 1: Check cache first
      console.log('📦 Checking cache for recipe details...');
      const cachedRecipe = await cacheService.getRecipeByExternalId(source as 'edamam' | 'spoonacular', id);
      
      if (cachedRecipe) {
        console.log('✅ Cache hit: Found recipe in cache');
        const unifiedRecipe = cacheService.convertCachedToUnified(cachedRecipe);
        
        return res.status(200).json({
          success: true,
          data: unifiedRecipe,
          message: 'Recipe details retrieved from cache',
          fromCache: true,
          cacheId: cachedRecipe.id
        });
      }

      // Step 2: Fetch from API provider
      console.log('⚠️ Cache miss: Fetching from API provider...');
      let recipe: UnifiedRecipe | null = null;

      if (source === 'edamam') {
        // Get cycling user ID for Edamam
        const cyclingUserId = 'test1'; // Simplified - could cycle if needed
        const uri = `http://www.edamam.com/ontologies/edamam.owl#recipe_${id}`;
        const edamamRecipe = await edamamService.getRecipe(uri, cyclingUserId);
        recipe = multiProviderService.convertEdamamToUnified(edamamRecipe);
      } else if (source === 'spoonacular') {
        recipe = await multiProviderService.getSpoonacularRecipeDetails(parseInt(id));
      }

      if (!recipe) {
        return res.status(404).json({
          error: 'Recipe not found',
          message: `Recipe with ID ${id} not found in ${source}`
        });
      }

      // Step 3: Store in cache (async, don't wait)
      console.log('💾 Storing recipe in cache...');
      try {
        await cacheService.storeRecipe({
          provider: source as 'edamam' | 'spoonacular',
          externalRecipeId: id,
          recipeName: recipe.title,
          recipeUrl: recipe.sourceUrl,
          recipeImageUrl: recipe.image,
          servings: recipe.servings,
          totalTimeMinutes: recipe.readyInMinutes,
          caloriesPerServing: recipe.calories,
          proteinPerServingG: recipe.protein,
          carbsPerServingG: recipe.carbs,
          fatPerServingG: recipe.fat,
          fiberPerServingG: recipe.fiber,
          ingredients: recipe.ingredients,
          healthLabels: recipe.healthLabels,
          dietLabels: recipe.dietLabels,
          cuisineTypes: recipe.cuisineType,
          dishTypes: recipe.dishType,
          mealTypes: recipe.mealType,
          originalApiResponse: recipe,
          hasCompleteNutrition: recipe.calories > 0 && recipe.protein > 0,
          hasDetailedIngredients: recipe.ingredients && recipe.ingredients.length > 0,
          dataQualityScore: calculateDataQuality(recipe)
        });
      } catch (error) {
        console.error('Error storing recipe in cache:', error);
      }

      return res.status(200).json({
        success: true,
        data: recipe,
        message: `Recipe details retrieved from ${source}`,
        fromCache: false
      });

    } catch (error) {
      console.error('❌ Error fetching recipe details:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch recipe details'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Calculate data quality score for a recipe (0-100)
 */
function calculateDataQuality(recipe: UnifiedRecipe): number {
  let score = 0;
  
  // Basic info (20 points)
  if (recipe.title) score += 10;
  if (recipe.image) score += 5;
  if (recipe.sourceUrl) score += 5;
  
  // Nutrition data (40 points)
  if (recipe.calories && recipe.calories > 0) score += 10;
  if (recipe.protein && recipe.protein > 0) score += 10;
  if (recipe.carbs && recipe.carbs > 0) score += 10;
  if (recipe.fat && recipe.fat > 0) score += 10;
  
  // Ingredients (20 points)
  if (recipe.ingredients && recipe.ingredients.length > 0) score += 20;
  
  // Additional data (20 points)
  if (recipe.servings) score += 5;
  if (recipe.readyInMinutes) score += 5;
  if (recipe.healthLabels && recipe.healthLabels.length > 0) score += 5;
  if (recipe.cuisineType && recipe.cuisineType.length > 0) score += 5;
  
  return Math.min(score, 100);
}

export default requireAuth(handler);
