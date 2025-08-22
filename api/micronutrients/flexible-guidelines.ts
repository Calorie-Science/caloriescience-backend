import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { FlexibleMicronutrientService } from '../../lib/micronutrients-flexible';
import { getAllValues } from '../../types/micronutrients';
import { normalizeCountry } from '../../lib/locationMapping';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { method } = req;

  switch (method) {
    case 'GET':
      return handleGet(req, res);
    case 'POST':
      return handlePost(req, res);
    default:
      return res.status(405).json({ error: 'Method not allowed' });
  }
}

/**
 * GET /api/micronutrients/flexible-guidelines
 * Get micronutrient guidelines for a specific demographic
 */
async function handleGet(req: VercelRequest, res: VercelResponse) {
  const { country, gender, age } = req.query;

  if (!country || !gender || !age) {
    return res.status(400).json({ 
      error: 'Missing required parameters: country, gender, age' 
    });
  }

  // Normalize country to lowercase
  const normalizedCountry = normalizeCountry(country as string);

  // Validate country
  if (!['uk', 'us', 'india'].includes(normalizedCountry)) {
    return res.status(400).json({ 
      error: 'Invalid country. Must be uk, us, or india' 
    });
  }

  // Validate gender
  if (!['male', 'female'].includes(gender as string)) {
    return res.status(400).json({ 
      error: 'Invalid gender. Must be male or female' 
    });
  }

  const service = new FlexibleMicronutrientService(supabase);
  
  try {
    const guidelines = await service.getGuidelines(
      normalizedCountry as 'uk' | 'us' | 'india',
      gender as 'male' | 'female',
      parseInt(age as string)
    );

    if (!guidelines) {
      return res.status(404).json({ 
        error: 'No guidelines found for the specified demographic' 
      });
    }

    // Transform the response to include formatted values
    const formattedGuidelines = {
      ...guidelines,
      formatted_micronutrients: Object.entries(guidelines.micronutrients).reduce(
        (acc, [key, value]) => {
          acc[key] = {
            ...value,
            all_values: getAllValues(value, guidelines.country),
            guideline_info: getGuidelineInfo(guidelines.country)
          };
          return acc;
        },
        {} as Record<string, any>
      )
    };

    return res.status(200).json({
      success: true,
      data: formattedGuidelines
    });

  } catch (error) {
    console.error('Error fetching guidelines:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * POST /api/micronutrients/flexible-guidelines
 * Calculate and save micronutrient requirements for a client
 */
async function handlePost(req: VercelRequest, res: VercelResponse) {
  const { 
    client_id, 
    country, 
    gender, 
    age,
    adjustmentFactors 
  } = req.body;

  if (!client_id || !country || !gender || !age) {
    return res.status(400).json({ 
      error: 'Missing required fields: client_id, country, gender, age' 
    });
  }

  // Normalize country to lowercase
  const normalizedCountry = normalizeCountry(country as string);

  // Validate country
  if (!['uk', 'us', 'india'].includes(normalizedCountry)) {
    return res.status(400).json({ 
      error: 'Invalid country. Must be uk, us, or india' 
    });
  }

  const service = new FlexibleMicronutrientService(supabase);

  try {
    // Calculate requirements
    const requirements = await service.calculateClientRequirements(
      client_id,
      normalizedCountry as 'uk' | 'us' | 'india',
      gender as 'male' | 'female',
      age,
      adjustmentFactors
    );

    if (!requirements) {
      return res.status(400).json({ 
        error: 'Failed to calculate requirements' 
      });
    }

    // Save to database
    const saved = await service.saveClientRequirements(requirements);

    if (!saved) {
      return res.status(500).json({ 
        error: 'Failed to save requirements' 
      });
    }

    return res.status(201).json({
      success: true,
      data: saved,
      message: 'Micronutrient requirements calculated and saved successfully'
    });

  } catch (error) {
    console.error('Error calculating requirements:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

/**
 * Helper function to get guideline information
 */
function getGuidelineInfo(country: string): Record<string, string> {
  const info: Record<string, Record<string, string>> = {
    UK: {
      RNI: 'Reference Nutrient Intake - Amount sufficient for 97.5% of population',
      LRNI: 'Lower Reference Nutrient Intake - Amount sufficient for 2.5% of population',
      SUI: 'Safe Upper Intake - Maximum safe amount'
    },
    US: {
      RDA: 'Recommended Dietary Allowance - Average daily intake sufficient for 97-98% of population',
      AI: 'Adequate Intake - Used when RDA cannot be determined',
      UL: 'Tolerable Upper Intake Level - Maximum daily intake unlikely to cause adverse effects'
    },
    India: {
      RDA: 'Recommended Dietary Allowance - Average daily intake sufficient for 97-98% of population',
      AI: 'Adequate Intake - Used when RDA cannot be determined',
      UL: 'Upper Limit - Maximum safe daily intake'
    }
  };

  return info[country] || {};
} 