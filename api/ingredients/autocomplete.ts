import { VercelRequest, VercelResponse } from '@vercel/node';
import { EdamamService } from '../../lib/edamamService';
import { requireAuth } from '../../lib/auth';

const edamamService = new EdamamService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Only nutritionists can access ingredient autocomplete
  if (user.role !== 'nutritionist') {
    return res.status(403).json({ error: 'Access denied. Only nutritionists can access ingredient autocomplete.' });
  }

  // Only GET method allowed
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Only GET method is allowed'
    });
  }

  try {
    const { q, mode } = req.query;

    // Validate query parameter
    if (!q || typeof q !== 'string') {
      return res.status(400).json({
        error: 'Missing or invalid query parameter',
        message: 'Query parameter "q" is required and must be a string'
      });
    }

    // Minimum query length check
    if (q.trim().length < 1) {
      return res.status(400).json({
        error: 'Query too short',
        message: 'Query must be at least 1 character long'
      });
    }

    // Maximum query length check (reasonable limit)
    if (q.length > 100) {
      return res.status(400).json({
        error: 'Query too long',
        message: 'Query must be 100 characters or less'
      });
    }

    // Validate mode parameter (optional)
    const validModes = ['basic', 'with_units', 'units_only'];
    const finalMode = mode && typeof mode === 'string' && validModes.includes(mode) 
      ? mode as 'basic' | 'with_units' | 'units_only'
      : 'basic';

    // Get autocomplete suggestions with unit suggestions
    const result = await edamamService.getIngredientAutocomplete(q, finalMode);

    // For units_only mode, return only the units field
    if (finalMode === 'units_only') {
      return res.status(200).json({
        units: result.units || []
      });
    }

    return res.status(200).json({
      success: true,
      query: q,
      mode: finalMode,
      suggestions: result.suggestions,
      unitSuggestions: result.unitSuggestions,
      count: result.suggestions.length
    });

  } catch (error) {
    console.error('Error in ingredient autocomplete:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Failed to get ingredient suggestions'
    });
  }
}

export default requireAuth(handler);
