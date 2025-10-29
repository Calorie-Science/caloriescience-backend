import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { SimpleIngredientService } from '../../lib/simpleIngredientService';

const simpleIngredientService = new SimpleIngredientService();

/**
 * Fast Simple Ingredients Search API
 * 
 * Searches the simple_ingredients database for matching ingredients by name
 * Returns all matching results (raw + cooked variants)
 * 
 * Query Parameters:
 * - query: Search term (required, min 2 characters)
 * - category: Filter by category (optional: vegetable, fruit, protein, grain, dairy, nuts, etc.)
 * - limit: Max results to return (optional, default: 50)
 * - allergens: Comma-separated allergens to exclude (optional)
 * 
 * Example:
 * GET /api/ingredients/search?query=broccoli
 * GET /api/ingredients/search?query=chicken&category=protein&limit=10
 * GET /api/ingredients/search?query=mushroom&allergens=dairy,soy
 */

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    const { query, category, limit, allergens } = req.query;

    // Validate query parameter
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        error: 'Missing query parameter',
        message: 'Query parameter "query" is required and must be a string'
      });
    }

    // Minimum query length check
    if (query.trim().length < 2) {
      return res.status(400).json({
        error: 'Query too short',
        message: 'Query must be at least 2 characters long'
      });
    }

    // Parse limit (default 50, max 100)
    const maxResults = limit && typeof limit === 'string' 
      ? Math.min(parseInt(limit), 100) 
      : 50;

    // Parse allergens if provided
    const allergenFilters = allergens && typeof allergens === 'string'
      ? allergens.split(',').map(a => a.trim()).filter(a => a.length > 0)
      : undefined;

    // Validate category if provided
    const validCategories = [
      'vegetable', 'fruit', 'protein', 'grain', 'dairy', 'nuts', 
      'legume', 'herb', 'spice', 'fat', 'condiment'
    ];
    const categoryFilter = category && typeof category === 'string' && validCategories.includes(category)
      ? category
      : undefined;

    console.log('🔍 Simple ingredient search:', {
      nutritionist: user.email,
      query,
      category: categoryFilter || 'all',
      limit: maxResults,
      allergens: allergenFilters || 'none'
    });

    // Search simple ingredients (uses in-memory cache for speed)
    const startTime = Date.now();
    const ingredients = await simpleIngredientService.searchIngredients(
      query,
      maxResults,
      allergenFilters,
      categoryFilter
    );
    const searchTime = Date.now() - startTime;

    // Group ingredients by cooking method for better presentation
    const groupedIngredients = groupIngredientsByType(ingredients);

    // Count by type for metadata
    const rawCount = groupedIngredients.raw.length;
    const cookedCount = ingredients.length - rawCount;

    console.log(`✅ Found ${ingredients.length} ingredients in ${searchTime}ms (${rawCount} raw, ${cookedCount} cooked)`);

    return res.status(200).json({
      success: true,
      data: {
        ingredients,
        totalResults: ingredients.length,
        grouped: groupedIngredients
      },
      metadata: {
        query,
        category: categoryFilter || 'all',
        limit: maxResults,
        allergenFilters: allergenFilters || [],
        totalResults: ingredients.length,
        rawIngredients: rawCount,
        cookedIngredients: cookedCount,
        searchTime: `${searchTime}ms`,
        nutritionist: user.email
      },
      message: `Found ${ingredients.length} matching ingredient${ingredients.length !== 1 ? 's' : ''}${rawCount > 0 && cookedCount > 0 ? ` (${rawCount} raw, ${cookedCount} cooked)` : ''}`
    });

  } catch (error) {
    console.error('❌ Simple ingredient search error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    });
  }
}

/**
 * Group ingredients by cooking method for better UX
 */
function groupIngredientsByType(ingredients: any[]): {
  raw: any[];
  steamed: any[];
  sauteed: any[];
  stirFry: any[];
  grilled: any[];
  baked: any[];
  other: any[];
} {
  const grouped = {
    raw: [] as any[],
    steamed: [] as any[],
    sauteed: [] as any[],
    stirFry: [] as any[],
    grilled: [] as any[],
    baked: [] as any[],
    other: [] as any[]
  };

  for (const ingredient of ingredients) {
    const name = ingredient.name.toLowerCase();
    
    if (name.startsWith('steamed ')) {
      grouped.steamed.push(ingredient);
    } else if (name.startsWith('sauteed ') || name.startsWith('sautéed ')) {
      grouped.sauteed.push(ingredient);
    } else if (name.startsWith('stir-fry ')) {
      grouped.stirFry.push(ingredient);
    } else if (name.startsWith('grilled ')) {
      grouped.grilled.push(ingredient);
    } else if (name.startsWith('baked ') || name.startsWith('roasted ')) {
      grouped.baked.push(ingredient);
    } else if (
      name.startsWith('boiled ') || 
      name.startsWith('scrambled ') || 
      name.startsWith('fried ') ||
      name.startsWith('poached ')
    ) {
      grouped.other.push(ingredient);
    } else {
      grouped.raw.push(ingredient);
    }
  }

  return grouped;
}

export default requireAuth(handler);

