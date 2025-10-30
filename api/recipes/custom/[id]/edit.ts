import type { VercelRequest, VercelResponse } from '@vercel/node';
import Joi from 'joi';
import { requireAuth } from '../../../../lib/auth';
import { CustomRecipeService } from '../../../../lib/customRecipeService';
import { EditCustomRecipeBasicDetailsInput } from '../../../../types/customRecipe';

const customRecipeService = new CustomRecipeService();

// Validation schema for editing basic details
const editBasicDetailsSchema = Joi.object({
  recipeName: Joi.string().min(1).max(200).optional(),
  description: Joi.string().max(5000).allow('').optional(),
  imageUrl: Joi.string().uri().allow('').optional(),
  servings: Joi.number().integer().min(1).max(100).optional(),
  prepTimeMinutes: Joi.number().integer().min(0).max(10000).allow(null).optional(),
  cookTimeMinutes: Joi.number().integer().min(0).max(10000).allow(null).optional(),
  totalTimeMinutes: Joi.number().integer().min(0).max(10000).allow(null).optional(),
  instructions: Joi.array().items(Joi.string()).optional(),
  customNotes: Joi.string().max(5000).allow('').optional(),
  isPublic: Joi.boolean().optional(),
  cuisineTypes: Joi.array().items(Joi.string()).optional(),
  mealTypes: Joi.array().items(Joi.string()).optional(),
  dishTypes: Joi.array().items(Joi.string()).optional(),
  healthLabels: Joi.array().items(Joi.string()).optional(),
  dietLabels: Joi.array().items(Joi.string()).optional(),
  allergens: Joi.array().items(Joi.string()).optional()
}).min(1); // At least one field must be provided

/**
 * PATCH /api/recipes/custom/[id]/edit
 * Edit basic details of a custom recipe (without modifying ingredients)
 * 
 * This endpoint allows updating metadata, descriptions, tags, times, etc.
 * without triggering nutrition recalculation.
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  // Only nutritionists can edit custom recipes
  if (!user || user.role !== 'nutritionist') {
    return res.status(403).json({
      success: false,
      message: 'Only nutritionists can edit custom recipes'
    });
  }

  // Only allow PATCH
  if (req.method !== 'PATCH') {
    return res.status(405).json({
      success: false,
      message: 'Method not allowed'
    });
  }

  try {
    const recipeId = req.query.id as string;

    if (!recipeId) {
      return res.status(400).json({
        success: false,
        message: 'Recipe ID is required'
      });
    }

    // Validate request body
    const { error, value } = editBasicDetailsSchema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: error.details[0].message
      });
    }

    const input: EditCustomRecipeBasicDetailsInput = value;

    // Update basic details
    const recipe = await customRecipeService.updateBasicDetails(recipeId, input, user.id);

    return res.status(200).json({
      success: true,
      message: 'Recipe basic details updated successfully',
      data: recipe
    });

  } catch (error: any) {
    console.error('❌ Error editing custom recipe basic details:', error);
    
    // Handle access denied errors
    if (error.message && error.message.includes('Access denied')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }

    // Handle not found errors
    if (error.message && (error.message.includes('not found') || error.message.includes('Recipe not found'))) {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }

    // Handle validation errors
    if (error.message && (
      error.message.includes('required') || 
      error.message.includes('must be') ||
      error.message.includes('Validation')
    )) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Failed to update recipe basic details',
      error: error.message
    });
  }
}

export default requireAuth(handler);

