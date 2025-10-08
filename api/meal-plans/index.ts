import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../lib/auth';
import { MealProgramService } from '../../lib/mealProgramService';

const mealProgramService = new MealProgramService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { clientId, mode } = req.query;

    // Validate required parameters
    if (!clientId || typeof clientId !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid clientId parameter',
        message: 'clientId is required'
      });
    }

    // Handle different modes
    if (mode === 'meal-programs') {
      // Get all meal programs for a client
      console.log(`📋 Fetching meal programs for client: ${clientId}`);
      const result = await mealProgramService.getMealProgramsForClient(clientId, user.id);
      
      return res.status(200).json(result);
    }

    // Default: Get active meal program for client
    console.log(`📋 Fetching active meal program for client: ${clientId}`);
    const result = await mealProgramService.getMealProgramForClient(clientId, user.id);
    
    return res.status(200).json(result);

  } catch (error) {
    console.error('❌ Error fetching meal programs:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to fetch meal programs'
    });
  }
}

export default requireAuth(handler);

