import { NextRequest, NextResponse } from 'next/server';
import { FoodCategory, getPortionSizesForCategory } from '@/types/foodCategory';

/**
 * GET /api/food-categories/[category]/portion-sizes
 *
 * Returns all portion sizes (primary and alternatives) for a specific food category
 * Useful when user wants to see all available portion options
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { category: string } }
) {
  try {
    const { category } = params;

    // Validate category
    if (!Object.values(FoodCategory).includes(category as FoodCategory)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid food category'
        },
        { status: 400 }
      );
    }

    // Get portion sizes for this category
    const portionData = getPortionSizesForCategory(category as FoodCategory);

    if (!portionData) {
      return NextResponse.json(
        {
          success: false,
          error: 'No portion sizes found for this category'
        },
        { status: 404 }
      );
    }

    // Format for UX
    const portions = portionData.allowedPortions.map(p => ({
      name: p.name,
      description: p.description,
      weightG: p.weightG,
      volumeMl: p.volumeMl,
      multiplier: p.multiplier,
      isDefault: p.isDefault
    }));

    return NextResponse.json({
      success: true,
      category: category,
      portions: {
        primary: portions.filter(p => p.isDefault),
        alternatives: portions.filter(p => !p.isDefault)
      },
      allPortions: portions
    });

  } catch (error: any) {
    console.error('Error fetching portion sizes:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch portion sizes'
      },
      { status: 500 }
    );
  }
}
