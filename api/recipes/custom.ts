import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { CustomRecipeService } from '../../lib/customRecipeService';
import {
  CreateCustomRecipeInput,
  UpdateCustomRecipeInput,
  CustomRecipeFilter
} from '../../types/customRecipe';

const customRecipeService = new CustomRecipeService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can manage custom recipes
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Only nutritionists can manage custom recipes.' 
    });
  }

  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGetCustomRecipes(req, res, user.id);
      case 'POST':
        return await handleCreateCustomRecipe(req, res, user.id);
      case 'PUT':
        return await handleUpdateCustomRecipe(req, res, user.id);
      case 'DELETE':
        return await handleDeleteCustomRecipe(req, res, user.id);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Method ${method} is not allowed`
        });
    }
  } catch (error) {
    console.error('Error in custom recipes API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to process custom recipe request'
    });
  }
}

/**
 * GET /api/recipes/custom
 * List custom recipes with filters
 */
async function handleGetCustomRecipes(
  req: VercelRequest,
  res: VercelResponse,
  nutritionistId: string
): Promise<VercelResponse> {
  try {
    const {
      page,
      limit,
      search,
      healthLabels,
      cuisineTypes,
      mealTypes,
      dishTypes,
      caloriesMin,
      caloriesMax,
      includePublic
    } = req.query;

    // Parse filters
    const filters: CustomRecipeFilter = {
      page: page ? parseInt(page as string) : 1,
      limit: limit ? parseInt(limit as string) : 20,
      search: search as string,
      healthLabels: healthLabels ? (Array.isArray(healthLabels) ? healthLabels as string[] : [healthLabels as string]) : undefined,
      cuisineTypes: cuisineTypes ? (Array.isArray(cuisineTypes) ? cuisineTypes as string[] : [cuisineTypes as string]) : undefined,
      mealTypes: mealTypes ? (Array.isArray(mealTypes) ? mealTypes as string[] : [mealTypes as string]) : undefined,
      dishTypes: dishTypes ? (Array.isArray(dishTypes) ? dishTypes as string[] : [dishTypes as string]) : undefined,
      caloriesMin: caloriesMin ? parseFloat(caloriesMin as string) : undefined,
      caloriesMax: caloriesMax ? parseFloat(caloriesMax as string) : undefined,
      includePublic: includePublic === 'false' ? false : true
    };

    // Validate pagination
    if (filters.page && (filters.page < 1 || isNaN(filters.page))) {
      return res.status(400).json({
        error: 'Invalid page parameter',
        message: 'Page must be a positive integer'
      });
    }

    if (filters.limit && (filters.limit < 1 || filters.limit > 100 || isNaN(filters.limit))) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        message: 'Limit must be between 1 and 100'
      });
    }

    const result = await customRecipeService.listCustomRecipes(nutritionistId, filters);

    return res.status(200).json({
      success: true,
      data: result.recipes,
      pagination: {
        page: result.page,
        limit: result.limit,
        totalCount: result.totalCount,
        totalPages: Math.ceil(result.totalCount / result.limit)
      }
    });
  } catch (error) {
    console.error('Error getting custom recipes:', error);
    return res.status(500).json({
      error: 'Failed to get custom recipes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/recipes/custom
 * Create a new custom recipe
 */
async function handleCreateCustomRecipe(
  req: VercelRequest,
  res: VercelResponse,
  nutritionistId: string
): Promise<VercelResponse> {
  try {
    const input: CreateCustomRecipeInput = req.body;

    // Validate required fields
    if (!input.recipeName) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'recipeName is required'
      });
    }

    if (!input.ingredients || !Array.isArray(input.ingredients) || input.ingredients.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'ingredients array is required and must contain at least one ingredient'
      });
    }

    if (!input.servings || input.servings < 1) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'servings must be at least 1'
      });
    }

    if (input.isPublic === undefined) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'isPublic field is required (true or false)'
      });
    }

    const recipe = await customRecipeService.createCustomRecipe(input, nutritionistId);

    return res.status(201).json({
      success: true,
      message: 'Custom recipe created successfully',
      data: recipe
    });
  } catch (error) {
    console.error('Error creating custom recipe:', error);
    
    // Handle validation errors with 400 status
    if (error instanceof Error && 
        (error.message.includes('required') || 
         error.message.includes('must be') ||
         error.message.includes('Validation'))) {
      return res.status(400).json({
        error: 'Validation error',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to create custom recipe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * PUT /api/recipes/custom
 * Update an existing custom recipe
 */
async function handleUpdateCustomRecipe(
  req: VercelRequest,
  res: VercelResponse,
  nutritionistId: string
): Promise<VercelResponse> {
  try {
    const input: UpdateCustomRecipeInput = req.body;

    // Validate recipe ID
    if (!input.id) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Recipe id is required'
      });
    }

    const recipe = await customRecipeService.updateCustomRecipe(input, nutritionistId);

    return res.status(200).json({
      success: true,
      message: 'Custom recipe updated successfully',
      data: recipe
    });
  } catch (error) {
    console.error('Error updating custom recipe:', error);
    
    // Handle access denied errors with 403 status
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'Access denied',
        message: error.message
      });
    }

    // Handle not found errors with 404 status
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to update custom recipe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * DELETE /api/recipes/custom?id=<recipe_id>
 * Delete a custom recipe
 */
async function handleDeleteCustomRecipe(
  req: VercelRequest,
  res: VercelResponse,
  nutritionistId: string
): Promise<VercelResponse> {
  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Recipe id is required as a query parameter'
      });
    }

    await customRecipeService.deleteCustomRecipe(id, nutritionistId);

    return res.status(200).json({
      success: true,
      message: 'Custom recipe deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting custom recipe:', error);
    
    // Handle access denied errors with 403 status
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({
        error: 'Access denied',
        message: error.message
      });
    }

    // Handle not found errors with 404 status
    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Not found',
        message: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to delete custom recipe',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);

