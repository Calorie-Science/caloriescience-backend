import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import Joi from 'joi';

/**
 * GET /api/calculations/formulas - Get available BMR/EER formulas for user selection
 *
 * Query params:
 * - country: string (optional) - filter by specific country
 */

const querySchema = Joi.object({
  country: Joi.string().optional()
});

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const user = (req as any).user;

  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (user.role !== 'nutritionist') {
    return res.status(403).json({
      error: 'Access denied',
      message: 'Only nutritionists can access this endpoint'
    });
  }

  if (req.method === 'GET') {
    try {
      // Validate query parameters
      const { error: validationError, value: validatedData } = querySchema.validate(req.query, {
        abortEarly: false
      });

      if (validationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Invalid query parameters',
          details: validationError.details.map(detail => ({
            field: detail.path.join('.'),
            message: detail.message
          }))
        });
      }

      const { country } = validatedData;

      // Fetch all formulas from formula_definitions table
      let query = supabase
        .from('formula_definitions')
        .select('*')
        .order('category', { ascending: true })
        .order('year_published', { ascending: false });

      // Optionally filter by country (check if country is in primary_countries array)
      if (country) {
        query = query.contains('primary_countries', [country.toLowerCase()]);
      }

      const { data: formulas, error: formulaError } = await query;

      if (formulaError) {
        console.error('❌ Error fetching formulas:', formulaError);
        return res.status(500).json({
          error: 'Failed to fetch formulas',
          message: formulaError.message
        });
      }

      // Create a flat list for dropdown
      const formulaOptions = formulas?.map(formula => ({
        id: formula.id,
        label: formula.display_name,
        formulaName: formula.formula_name,
        category: formula.category,
        description: formula.description,
        ageGroup: formula.age_group,
        ageMin: formula.age_min,
        ageMax: formula.age_max,
        primaryCountries: formula.primary_countries,
        yearPublished: formula.year_published,
        source: formula.source,
        notes: formula.notes,
        bmrEquationMale: formula.bmr_equation_male,
        bmrEquationFemale: formula.bmr_equation_female,
        eerEquationMale: formula.eer_equation_male,
        eerEquationFemale: formula.eer_equation_female
      })) || [];

      return res.status(200).json({
        success: true,
        data: {
          formulas: formulaOptions,
          totalFormulas: formulas?.length || 0
        },
        message: `Found ${formulas?.length || 0} formulas`
      });

    } catch (error) {
      console.error('❌ Error in GET formulas:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}


export default requireAuth(handler);
