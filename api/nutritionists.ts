import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../lib/supabase';

/**
 * Get All Nutritionists (Public Endpoint)
 *
 * GET /api/nutritionists
 *
 * Returns a list of all nutritionists in the system with their basic information.
 * This is a public endpoint that doesn't require authentication.
 */

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Query all users with role 'nutritionist'
    const { data: nutritionists, error: queryError } = await supabase
      .from('users')
      .select('id, first_name, last_name, email')
      .eq('role', 'nutritionist')
      .order('first_name', { ascending: true });

    if (queryError) {
      console.error('❌ Error fetching nutritionists:', queryError);
      throw new Error(`Failed to fetch nutritionists: ${queryError.message}`);
    }

    // Transform the data to include full name
    const transformedNutritionists = (nutritionists || []).map((n: any) => ({
      id: n.id,
      firstName: n.first_name,
      lastName: n.last_name,
      fullName: `${n.first_name} ${n.last_name}`.trim() || n.email,
      email: n.email
    }));

    return res.status(200).json({
      success: true,
      data: {
        nutritionists: transformedNutritionists,
        count: transformedNutritionists.length
      }
    });

  } catch (error) {
    console.error('❌ Nutritionists API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
