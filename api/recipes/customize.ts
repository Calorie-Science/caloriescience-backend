import { VercelRequest, VercelResponse } from '@vercel/node';
import { IngredientCustomizationService } from '../../lib/ingredientCustomizationService';
import Joi from 'joi';

const customizationService = new IngredientCustomizationService();

// Validation schemas
const modificationSchema = Joi.object({
  type: Joi.string().valid('replace', 'omit', 'reduce', 'add', 'substitute').required(),
  originalIngredient: Joi.string().optional(),
  newIngredient: Joi.string().optional(),
  reductionPercent: Joi.number().min(0).max(100).optional(),
  notes: Joi.string().optional()
});

const applyModificationsSchema = Joi.object({
  recipeId: Joi.string().required(),
  source: Joi.string().valid('edamam', 'spoonacular').required(),
  originalNutrition: Joi.object().required(),
  modifications: Joi.array().items(modificationSchema).required(),
  servings: Joi.number().min(0.1).max(20).optional().default(1)
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    switch (action) {
      case 'get-available-customizations':
        return await handleGetAvailableCustomizations(req, res);
      
      case 'apply-modifications':
        return await handleApplyModifications(req, res);
      
      case 'get-ingredient-substitutes':
        return await handleGetIngredientSubstitutes(req, res);
      
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('❌ Ingredient customization error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get available customization options for a recipe
 */
async function handleGetAvailableCustomizations(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const schema = Joi.object({
    action: Joi.string().valid('get-available-customizations').required(),
    recipeId: Joi.string().required(),
    source: Joi.string().valid('edamam', 'spoonacular').required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { recipeId, source } = value;

  try {
    const customizations = await customizationService.getAvailableCustomizations(recipeId, source);
    
    return res.status(200).json({
      success: true,
      data: customizations
    });
  } catch (error) {
    console.error('❌ Error getting available customizations:', error);
    return res.status(500).json({
      error: 'Failed to get available customizations',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Apply ingredient modifications to a recipe
 */
async function handleApplyModifications(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const { error, value } = applyModificationsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { recipeId, source, originalNutrition, modifications, servings } = value;

  try {
    const result = await customizationService.applyModifications(
      recipeId,
      source,
      originalNutrition,
      modifications,
      servings
    );
    
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('❌ Error applying modifications:', error);
    return res.status(500).json({
      error: 'Failed to apply modifications',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get ingredient substitutes (Spoonacular only)
 */
async function handleGetIngredientSubstitutes(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const schema = Joi.object({
    action: Joi.string().valid('get-ingredient-substitutes').required(),
    recipeId: Joi.string().required(),
    ingredientId: Joi.string().required()
  });

  const { error, value } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const { recipeId, ingredientId } = value;

  try {
    const substitutes = await customizationService.getIngredientSubstitutes(recipeId, ingredientId);
    
    return res.status(200).json({
      success: true,
      data: {
        recipeId,
        ingredientId,
        substitutes
      }
    });
  } catch (error) {
    console.error('❌ Error getting ingredient substitutes:', error);
    return res.status(500).json({
      error: 'Failed to get ingredient substitutes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
