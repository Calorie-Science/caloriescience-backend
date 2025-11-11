import { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../../../lib/auth';
import { supabase } from '../../../lib/supabase';
import { FoodCategory } from '../../../types/foodCategory';

/**
 * GET /api/food-categories/[category]/portion-sizes
 *
 * Returns all portion sizes (primary and alternatives) for a specific food category
 * Useful when user wants to see all available portion options
 */
async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    const { category } = req.query;

    // Validate category parameter (can be ID or code)
    if (!category || typeof category !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Category parameter is required'
      });
    }

    // Try to fetch food category by code first, then by ID
    let foodCategory = null;

    // First try by code
    const { data: categoryByCode } = await supabase
      .from('food_categories')
      .select('id, code, name, category_group')
      .eq('code', category)
      .maybeSingle();

    if (categoryByCode) {
      foodCategory = categoryByCode;
    } else {
      // Try by ID (if it looks like a UUID)
      if (category.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
        const { data: categoryById } = await supabase
          .from('food_categories')
          .select('id, code, name, category_group')
          .eq('id', category)
          .maybeSingle();

        if (categoryById) {
          foodCategory = categoryById;
        }
      }
    }

    if (!foodCategory) {
      return res.status(404).json({
        success: false,
        error: 'Food category not found'
      });
    }

    // Fetch portion sizes from database via junction table
    const { data: portionSizes, error: portionsError } = await supabase
      .from('food_category_portion_sizes')
      .select(`
        portion_sizes (
          id,
          name,
          description,
          volume_ml,
          weight_g,
          multiplier,
          is_default
        )
      `)
      .eq('food_category_id', foodCategory.id);

    if (portionsError) {
      throw portionsError;
    }

    if (!portionSizes || portionSizes.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'No portion sizes found for this category'
      });
    }

    // Format for UX - extract portion_sizes from junction table result
    const portions = portionSizes
      .map(item => item.portion_sizes)
      .filter(p => p !== null)
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        weightG: p.weight_g,
        volumeMl: p.volume_ml,
        multiplier: p.multiplier,
        isDefault: p.is_default
      }))
      .sort((a, b) => {
        // Sort by is_default descending, then multiplier ascending
        if (a.isDefault !== b.isDefault) return b.isDefault ? 1 : -1;
        return a.multiplier - b.multiplier;
      });

    return res.status(200).json({
      success: true,
      category: {
        id: foodCategory.id,
        code: foodCategory.code,
        name: foodCategory.name,
        group: foodCategory.category_group
      },
      portions: {
        primary: portions.filter(p => p.isDefault),
        alternatives: portions.filter(p => !p.isDefault)
      },
      allPortions: portions
    });

  } catch (error: any) {
    console.error('Error fetching portion sizes:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch portion sizes'
    });
  }
}

export default requireAuth(handler);
