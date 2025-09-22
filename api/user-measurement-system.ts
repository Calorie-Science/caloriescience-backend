import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth';
import { userProfileMeasurementService, extractMeasurementSystemFromRequest } from '../lib/userProfileMeasurementSystem';
import { MeasurementSystem } from '../lib/measurementSystem';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access measurement system features
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ 
      error: 'Access denied', 
      message: 'Only nutritionists can access measurement system features.' 
    });
  }

  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        return await handleGetMeasurementSystem(req, res, user.id);
      case 'PUT':
        return await handleUpdateMeasurementSystem(req, res, user.id);
      case 'POST':
        return await handleMeasurementSystemActions(req, res, user.id);
      default:
        return res.status(405).json({
          error: 'Method not allowed',
          message: `Method ${method} is not allowed`
        });
    }
  } catch (error) {
    console.error('Error in user measurement system API:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to process measurement system request'
    });
  }
}

/**
 * GET /api/user-measurement-system
 * Get current measurement system context (no sessionId needed)
 */
async function handleGetMeasurementSystem(
  req: VercelRequest, 
  res: VercelResponse, 
  nutritionistId: string
): Promise<VercelResponse> {
  const { override, forceNutritionistSystem, clientId } = extractMeasurementSystemFromRequest(req);

  try {
    const context = await userProfileMeasurementService.getMeasurementContext(
      nutritionistId,
      clientId,
      override,
      forceNutritionistSystem
    );

    return res.status(200).json({
      success: true,
      context,
      toggleOptions: {
        // Show available toggle options based on current context
        canToggleToNutritionistSystem: clientId && context.source === 'client-preference',
        canToggleToClientSystem: clientId && context.source === 'user-default' && context.clientSystem,
        canToggleToOppositeSystem: !clientId, // Can toggle metric/imperial when not viewing client
        toggleToSystem: getToggleToSystem(context),
        toggleLabel: getToggleLabel(context)
      }
    });
  } catch (error) {
    console.error('Error getting measurement system context:', error);
    return res.status(500).json({
      error: 'Failed to get measurement system context',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

/**
 * PUT /api/user-measurement-system
 * Update user's default measurement system preference
 */
async function handleUpdateMeasurementSystem(
  req: VercelRequest, 
  res: VercelResponse, 
  nutritionistId: string
): Promise<VercelResponse> {
  const { system } = req.body;

  if (!system || !['metric', 'imperial'].includes(system)) {
    return res.status(400).json({
      error: 'Invalid system',
      message: 'system must be either "metric" or "imperial"'
    });
  }

  try {
    const success = await userProfileMeasurementService.updateUserMeasurementSystem(
      nutritionistId,
      system as MeasurementSystem
    );

    if (!success) {
      return res.status(500).json({
        error: 'Update failed',
        message: 'Failed to update measurement system preference'
      });
    }

    return res.status(200).json({
      success: true,
      message: `Default measurement system updated to ${system}`,
      system
    });
  } catch (error) {
    console.error('Error updating measurement system:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to update measurement system'
    });
  }
}

/**
 * POST /api/user-measurement-system
 * Handle measurement system actions (update client preference, etc.)
 */
async function handleMeasurementSystemActions(
  req: VercelRequest, 
  res: VercelResponse, 
  nutritionistId: string
): Promise<VercelResponse> {
  const { action, clientId, system } = req.body;

  if (!action) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'action is required'
    });
  }

  const validActions = ['update-client-preference'];
  if (!validActions.includes(action)) {
    return res.status(400).json({
      error: 'Invalid action',
      message: `action must be one of: ${validActions.join(', ')}`
    });
  }

  try {
    switch (action) {
      case 'update-client-preference':
        if (!clientId) {
          return res.status(400).json({
            error: 'Missing required field',
            message: 'clientId is required for update-client-preference action'
          });
        }
        
        if (!system || !['metric', 'imperial'].includes(system)) {
          return res.status(400).json({
            error: 'Invalid system',
            message: 'system must be either "metric" or "imperial"'
          });
        }
        
        const success = await userProfileMeasurementService.updateClientMeasurementSystem(
          clientId,
          system as MeasurementSystem
        );
        
        if (!success) {
          return res.status(500).json({
            error: 'Update failed',
            message: 'Failed to update client measurement system preference'
          });
        }
        
        return res.status(200).json({
          success: true,
          message: `Client measurement system updated to ${system}`,
          clientId,
          system
        });

      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: `Unknown action: ${action}`
        });
    }
  } catch (error) {
    console.error('Error handling measurement system action:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to process measurement system action'
    });
  }
}

/**
 * Helper function to determine what system to toggle to
 */
function getToggleToSystem(context: any): MeasurementSystem | null {
  if (context.clientSystem && context.source === 'user-default') {
    // Currently showing nutritionist's system, can toggle to client's system
    return context.clientSystem;
  } else if (context.source === 'client-preference') {
    // Currently showing client's system, can toggle to nutritionist's system
    return context.nutritionistSystem;
  } else if (!context.clientSystem) {
    // No client context, can toggle to opposite system
    return context.currentSystem === 'metric' ? 'imperial' : 'metric';
  }
  return null;
}

/**
 * Helper function to generate toggle label
 */
function getToggleLabel(context: any): string {
  const toggleTo = getToggleToSystem(context);
  if (!toggleTo) return '';
  
  if (context.clientSystem && context.source === 'user-default') {
    return `Switch to Client's System (${toggleTo === 'metric' ? 'Metric' : 'Imperial'})`;
  } else if (context.source === 'client-preference') {
    return `Switch to Your System (${toggleTo === 'metric' ? 'Metric' : 'Imperial'})`;
  } else {
    return `Switch to ${toggleTo === 'metric' ? 'Metric' : 'Imperial'}`;
  }
}

export default requireAuth(handler);
