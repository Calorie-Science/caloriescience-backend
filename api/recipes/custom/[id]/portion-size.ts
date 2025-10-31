import { VercelRequest, VercelResponse } from '@vercel/node';
import { CustomRecipeService } from '../../../../lib/customRecipeService';
import Joi from 'joi';

const customRecipeService = new CustomRecipeService();

// Validation schemas
const getWithPortionSizeSchema = Joi.object({
  action: Joi.string().valid('get-with-portion-size').required(),
  portionSizeId: Joi.string().required(),
  nutritionistId: Joi.string().required()
});

const updateDefaultPortionSizeSchema = Joi.object({
  action: Joi.string().valid('update-default-portion-size').required(),
  portionSizeId: Joi.string().allow(null).optional(),
  nutritionistId: Joi.string().required()
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;
    const recipeId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id;

    if (!recipeId) {
      return res.status(400).json({ error: 'Recipe ID is required' });
    }

    switch (action) {
      case 'get-with-portion-size':
        return await handleGetWithPortionSize(req, res, recipeId);

      case 'update-default-portion-size':
        return await handleUpdateDefaultPortionSize(req, res, recipeId);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Custom recipe portion size API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get recipe with a specific portion size (nutrition scaled accordingly)
 */
async function handleGetWithPortionSize(
  req: VercelRequest,
  res: VercelResponse,
  recipeId: string
): Promise<VercelResponse> {
  const { error, value } = getWithPortionSizeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { portionSizeId, nutritionistId } = value;

  try {
    const recipe = await customRecipeService.getRecipeWithPortionSize(
      recipeId,
      portionSizeId,
      nutritionistId
    );

    return res.status(200).json({
      success: true,
      data: recipe
    });
  } catch (error) {
    console.error('Error getting recipe with portion size:', error);
    return res.status(500).json({
      error: 'Failed to get recipe with portion size',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update the default portion size for a recipe
 */
async function handleUpdateDefaultPortionSize(
  req: VercelRequest,
  res: VercelResponse,
  recipeId: string
): Promise<VercelResponse> {
  const { error, value } = updateDefaultPortionSizeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { portionSizeId, nutritionistId } = value;

  try {
    const recipe = await customRecipeService.updateDefaultPortionSize(
      recipeId,
      portionSizeId,
      nutritionistId
    );

    return res.status(200).json({
      success: true,
      data: recipe
    });
  } catch (error) {
    console.error('Error updating default portion size:', error);
    return res.status(500).json({
      error: 'Failed to update default portion size',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
