import { VercelRequest, VercelResponse } from '@vercel/node';
import { healthLabelsService } from '../lib/healthLabelsService';
import { healthLabelsTransformService } from '../lib/healthLabelsTransformService';
import { requireAuth } from '../lib/auth';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access health labels management
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Only nutritionists can access health labels management.' 
    });
  }

  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGetHealthLabels(req, res);
      case 'POST':
        return await handleHealthLabelsActions(req, res);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Method ${method} is not allowed`
        });
    }
  } catch (error) {
    console.error('Error in health labels API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to process health labels request'
    });
  }
}

/**
 * GET /api/health-labels
 * Get health labels data
 */
async function handleGetHealthLabels(
  req: VercelRequest, 
  res: VercelResponse
): Promise<VercelResponse> {
  const { 
    action = 'list',
    category,
    provider,
    labels 
  } = req.query;

  try {
    switch (action) {
      case 'list':
        // Get all standard health labels grouped by category
        const [categories, allLabels] = await Promise.all([
          healthLabelsService.getCategories(),
          healthLabelsService.getStandardLabels()
        ]);

        const labelsByCategory = categories.map(cat => ({
          ...cat,
          labels: allLabels.filter(label => label.categoryId === cat.id)
        }));

        return res.status(200).json({
          success: true,
          data: {
            categories: labelsByCategory,
            totalLabels: allLabels.length
          }
        });

      case 'category':
        if (!category || typeof category !== 'string') {
          return res.status(400).json({
            error: 'Missing category parameter',
            message: 'category parameter is required for category action'
          });
        }

        const categoryLabels = await healthLabelsService.getStandardLabelsByCategory(category);
        return res.status(200).json({
          success: true,
          data: {
            category,
            labels: categoryLabels
          }
        });

      case 'providers':
        // Get all food database providers
        const providers = await healthLabelsService.getProviders();
        return res.status(200).json({
          success: true,
          data: { providers }
        });

      case 'mappings':
        if (!provider || typeof provider !== 'string') {
          return res.status(400).json({
            error: 'Missing provider parameter',
            message: 'provider parameter is required for mappings action'
          });
        }

        const mappings = await healthLabelsService.getMappingsForProvider(provider);
        return res.status(200).json({
          success: true,
          data: {
            provider,
            mappings,
            totalMappings: mappings.length,
            supportedCount: mappings.filter(m => m.isSupported).length
          }
        });

      case 'supported':
        if (!provider || typeof provider !== 'string') {
          return res.status(400).json({
            error: 'Missing provider parameter',
            message: 'provider parameter is required for supported action'
          });
        }

        const supportedLabels = await healthLabelsTransformService.getSupportedLabelsForProvider(provider);
        return res.status(200).json({
          success: true,
          data: {
            provider,
            supportedLabels,
            count: supportedLabels.length
          }
        });

      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'action must be one of: list, category, providers, mappings, supported'
        });
    }
  } catch (error) {
    console.error('Error in handleGetHealthLabels:', error);
    return res.status(500).json({
      error: 'Failed to get health labels',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * POST /api/health-labels
 * Handle health labels actions
 */
async function handleHealthLabelsActions(
  req: VercelRequest, 
  res: VercelResponse
): Promise<VercelResponse> {
  const { action, ...actionData } = req.body;

  if (!action) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'action is required'
    });
  }

  try {
    switch (action) {
      case 'convert':
        // Convert standard labels to provider format
        const { standardLabels, provider = 'edamam' } = actionData;
        
        if (!standardLabels || !Array.isArray(standardLabels)) {
          return res.status(400).json({
            error: 'Invalid standardLabels',
            message: 'standardLabels must be an array of label keys'
          });
        }

        const convertedLabels = await healthLabelsTransformService.convertHealthLabelsForProvider(
          standardLabels,
          provider
        );

        return res.status(200).json({
          success: true,
          data: convertedLabels,
          message: `Successfully converted ${standardLabels.length} labels for ${provider}`
        });

      case 'validate':
        // Validate labels for a provider
        const { labels, provider: validateProvider = 'edamam' } = actionData;
        
        if (!labels || !Array.isArray(labels)) {
          return res.status(400).json({
            error: 'Invalid labels',
            message: 'labels must be an array of label keys'
          });
        }

        const validation = await healthLabelsTransformService.validateLabelsForProvider(
          labels,
          validateProvider
        );

        return res.status(200).json({
          success: true,
          data: validation,
          message: validation.valid 
            ? 'All labels are supported' 
            : `${validation.unsupportedLabels.length} labels are not supported`
        });

      case 'clear-cache':
        // Clear the transform service cache
        healthLabelsTransformService.clearCache();
        
        return res.status(200).json({
          success: true,
          message: 'Health labels cache cleared successfully'
        });

      case 'cache-stats':
        // Get cache statistics
        const cacheStats = healthLabelsTransformService.getCacheStats();
        
        return res.status(200).json({
          success: true,
          data: cacheStats
        });

      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'action must be one of: convert, validate, clear-cache, cache-stats'
        });
    }
  } catch (error) {
    console.error('Error in handleHealthLabelsActions:', error);
    return res.status(500).json({
      error: 'Failed to process health labels action',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
