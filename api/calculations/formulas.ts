import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import Joi from 'joi';

/**
 * GET /api/calculations/formulas - Get available BMR/EER formulas for user selection
 *
 * Query params:
 * - age: number (required)
 * - gender: male|female (required)
 * - country: string (optional) - filter by specific country
 */

const querySchema = Joi.object({
  age: Joi.number().min(0).max(120).required(),
  gender: Joi.string().valid('male', 'female').required(),
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

      const { age, gender, country } = validatedData;
      const roundedAge = Math.round(age);

      // Build query to get formulas that match the age range
      let query = supabase
        .from('eer_formulas')
        .select('*')
        .eq('gender', gender)
        .lte('age_min', roundedAge)
        .gte('age_max', roundedAge)
        .order('country', { ascending: true })
        .order('age_min', { ascending: false });

      // Optionally filter by country
      if (country) {
        query = query.eq('country', country.toLowerCase());
      }

      const { data: formulas, error: formulaError } = await query;

      if (formulaError) {
        console.error('❌ Error fetching formulas:', formulaError);
        return res.status(500).json({
          error: 'Failed to fetch formulas',
          message: formulaError.message
        });
      }

      // Group formulas by country and formula type for better UI presentation
      const groupedFormulas: any = {};

      formulas?.forEach(formula => {
        const countryKey = formula.country.toUpperCase();

        if (!groupedFormulas[countryKey]) {
          groupedFormulas[countryKey] = [];
        }

        // Create a human-readable formula name
        let formulaName = formula.bmr_formula;
        if (formula.age_category && formula.age_category !== 'adult') {
          formulaName += ` (${formula.age_category})`;
        }
        formulaName += ` - Ages ${formula.age_min}-${formula.age_max}`;

        groupedFormulas[countryKey].push({
          id: formula.id,
          country: formula.country,
          gender: formula.gender,
          ageCategory: formula.age_category,
          ageMin: formula.age_min,
          ageMax: formula.age_max,
          formulaName: formulaName,
          bmrFormula: formula.bmr_formula,
          description: getFormulaDescription(formula),
          isApplicable: roundedAge >= formula.age_min && roundedAge <= formula.age_max
        });
      });

      // Create a flat list for dropdown with country prefix
      const formulaOptions = formulas?.map(formula => {
        let displayName = `${formula.country.toUpperCase()} - ${formula.bmr_formula}`;
        if (formula.age_category && formula.age_category !== 'adult') {
          displayName += ` (${formula.age_category})`;
        }
        displayName += ` [Ages ${formula.age_min}-${formula.age_max}]`;

        return {
          value: formula.id,
          label: displayName,
          country: formula.country,
          bmrFormula: formula.bmr_formula,
          ageRange: `${formula.age_min}-${formula.age_max}`,
          isRecommended: false // Will be set based on user's country
        };
      }) || [];

      return res.status(200).json({
        success: true,
        data: {
          age: roundedAge,
          gender: gender,
          formulaOptions: formulaOptions,
          groupedByCountry: groupedFormulas,
          totalFormulas: formulas?.length || 0
        },
        message: `Found ${formulas?.length || 0} applicable formulas`
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

/**
 * Generate a human-readable description of the formula
 */
function getFormulaDescription(formula: any): string {
  const descriptions: { [key: string]: string } = {
    'Harris-Benedict (revised)': 'Classic BMR formula revised in 1984, widely used for adults',
    'Mifflin-St Jeor': 'Modern BMR formula (1990), considered more accurate for modern populations',
    'Schofield': 'WHO-recommended formula (1985), used internationally',
    'Henry Oxford': 'Updated formula (2005) based on Oxford database, more accurate for diverse populations',
    'IOM': 'Institute of Medicine EER equation, accounts for age, activity, and growth needs',
    'ICMR-NIN': 'Indian Council of Medical Research formula, specific to Indian population',
    'MHLW': 'Japanese Ministry of Health formula, calibrated for Japanese population'
  };

  // Try to match formula name
  for (const [key, desc] of Object.entries(descriptions)) {
    if (formula.bmr_formula.includes(key)) {
      return desc;
    }
  }

  return 'BMR/EER calculation formula';
}

export default requireAuth(handler);
