import { VercelRequest, VercelResponse } from '@vercel/node';
import { PortionSizeService } from '../lib/portionSizeService';
import Joi from 'joi';

const portionSizeService = new PortionSizeService();

// Validation schemas
const createPortionSizeSchema = Joi.object({
  action: Joi.string().valid('create').required(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  category: Joi.string().valid('cup', 'plate', 'bowl', 'glass', 'serving', 'other').required(),
  volumeMl: Joi.number().min(0).optional(),
  weightG: Joi.number().min(0).optional(),
  multiplier: Joi.number().min(0.01).required(),
  isDefault: Joi.boolean().optional()
});

const updatePortionSizeSchema = Joi.object({
  action: Joi.string().valid('update').required(),
  id: Joi.string().required(),
  name: Joi.string().optional(),
  description: Joi.string().optional(),
  category: Joi.string().valid('cup', 'plate', 'bowl', 'glass', 'serving', 'other').optional(),
  volumeMl: Joi.number().min(0).optional(),
  weightG: Joi.number().min(0).optional(),
  multiplier: Joi.number().min(0.01).optional(),
  isDefault: Joi.boolean().optional()
});

const deletePortionSizeSchema = Joi.object({
  action: Joi.string().valid('delete').required(),
  id: Joi.string().required()
});

const getPortionSizeSchema = Joi.object({
  action: Joi.string().valid('get').required(),
  id: Joi.string().required()
});

const listPortionSizesSchema = Joi.object({
  action: Joi.string().valid('list').required(),
  category: Joi.string().optional()
});

const getDefaultsSchema = Joi.object({
  action: Joi.string().valid('get-defaults').required()
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Only allow GET and POST
  if (req.method === 'GET') {
    // GET request - list all portion sizes
    try {
      const category = req.query.category as string | undefined;
      const portionSizes = await portionSizeService.getAllPortionSizes(category);
      return res.status(200).json({
        success: true,
        data: portionSizes
      });
    } catch (error) {
      console.error('Error fetching portion sizes:', error);
      return res.status(500).json({
        error: 'Failed to fetch portion sizes',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action } = req.body;

    switch (action) {
      case 'list':
        return await handleList(req, res);

      case 'get':
        return await handleGet(req, res);

      case 'get-defaults':
        return await handleGetDefaults(req, res);

      case 'create':
        return await handleCreate(req, res);

      case 'update':
        return await handleUpdate(req, res);

      case 'delete':
        return await handleDelete(req, res);

      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Portion size API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * List all portion sizes (optionally filtered by category)
 */
async function handleList(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const { error, value } = listPortionSizesSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  try {
    const portionSizes = await portionSizeService.getAllPortionSizes(value.category);
    return res.status(200).json({
      success: true,
      data: portionSizes
    });
  } catch (error) {
    console.error('Error listing portion sizes:', error);
    return res.status(500).json({
      error: 'Failed to list portion sizes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get a single portion size by ID
 */
async function handleGet(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const { error, value } = getPortionSizeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  try {
    const portionSize = await portionSizeService.getPortionSizeById(value.id);
    if (!portionSize) {
      return res.status(404).json({
        error: 'Portion size not found'
      });
    }

    return res.status(200).json({
      success: true,
      data: portionSize
    });
  } catch (error) {
    console.error('Error getting portion size:', error);
    return res.status(500).json({
      error: 'Failed to get portion size',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Get default portion sizes
 */
async function handleGetDefaults(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const { error } = getDefaultsSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  try {
    const portionSizes = await portionSizeService.getDefaultPortionSizes();
    return res.status(200).json({
      success: true,
      data: portionSizes
    });
  } catch (error) {
    console.error('Error getting default portion sizes:', error);
    return res.status(500).json({
      error: 'Failed to get default portion sizes',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Create a new portion size
 */
async function handleCreate(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const { error, value } = createPortionSizeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  try {
    const portionSize = await portionSizeService.createPortionSize({
      name: value.name,
      description: value.description,
      category: value.category,
      volumeMl: value.volumeMl,
      weightG: value.weightG,
      multiplier: value.multiplier,
      isDefault: value.isDefault
    });

    return res.status(201).json({
      success: true,
      data: portionSize
    });
  } catch (error) {
    console.error('Error creating portion size:', error);
    return res.status(500).json({
      error: 'Failed to create portion size',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Update an existing portion size
 */
async function handleUpdate(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const { error, value } = updatePortionSizeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  try {
    const portionSize = await portionSizeService.updatePortionSize({
      id: value.id,
      name: value.name,
      description: value.description,
      category: value.category,
      volumeMl: value.volumeMl,
      weightG: value.weightG,
      multiplier: value.multiplier,
      isDefault: value.isDefault
    });

    return res.status(200).json({
      success: true,
      data: portionSize
    });
  } catch (error) {
    console.error('Error updating portion size:', error);
    return res.status(500).json({
      error: 'Failed to update portion size',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * Delete a portion size
 */
async function handleDelete(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  const { error, value } = deletePortionSizeSchema.validate(req.body);
  if (error) {
    return res.status(400).json({
      error: 'Validation error',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  try {
    await portionSizeService.deletePortionSize(value.id);
    return res.status(200).json({
      success: true,
      message: 'Portion size deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting portion size:', error);
    return res.status(500).json({
      error: 'Failed to delete portion size',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
