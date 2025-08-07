import { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateEER, calculateMacros, EERCalculationInput, MacrosCalculationInput } from '../lib/calculations';
import Joi from 'joi';

// Validation schemas
const eerSchema = Joi.object({
  country: Joi.string().valid('USA', 'Canada', 'EU', 'AU/NZ', 'UK', 'Singapore', 'UAE', 'India', 'Japan', 'WHO', 'ZA', 'Brazil').default('USA'),
  age: Joi.number().integer().min(1).max(120).required(),
  gender: Joi.string().valid('male', 'female').required(),
  height_cm: Joi.number().min(50).max(300).required(),
  weight_kg: Joi.number().min(1).max(500).required(),
  activity_level: Joi.string().valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active').required()
});

const macrosSchema = Joi.object({
  eer: Joi.number().min(500).max(10000).required(),
  country: Joi.string().valid('USA', 'Canada', 'EU', 'AU/NZ', 'UK', 'Singapore', 'UAE', 'India', 'Japan', 'WHO', 'ZA', 'Brazil').required(),
  age: Joi.number().integer().min(1).max(120).required(),
  gender: Joi.string().valid('male', 'female').required(),
  weight_kg: Joi.number().min(1).max(500).required()
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action } = req.body;

  try {
    switch (action) {
      case 'calculate_eer':
        return await handleEERCalculation(req, res);
      case 'calculate_macros':
        return await handleMacrosCalculation(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be either "calculate_eer" or "calculate_macros"'
        });
    }
  } catch (error) {
    console.error('Calculation error:', error);
    return res.status(500).json({
      error: 'Calculation failed',
      message: 'An unexpected error occurred during calculation'
    });
  }
}

async function handleEERCalculation(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  // Extract action field and validate the rest
  const { action, ...eerRequestData } = req.body;
  const { error, value } = eerSchema.validate(eerRequestData, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const eerData: EERCalculationInput = {
    country: value.country,
    age: value.age,
    gender: value.gender,
    height_cm: value.height_cm,
    weight_kg: value.weight_kg,
    activity_level: value.activity_level
  };

  const eerResult = await calculateEER(eerData);

  return res.status(200).json({
    success: true,
    bmr: eerResult.bmr,
    pal: eerResult.pal,
    eer: eerResult.eer,
    formula_used: eerResult.formula_used,
    input: value,
    timestamp: new Date().toISOString(),
    message: 'EER calculation completed successfully'
  });
}

async function handleMacrosCalculation(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  // Extract action field and validate the rest
  const { action, ...macrosRequestData } = req.body;
  const { error, value } = macrosSchema.validate(macrosRequestData, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  const macrosData: MacrosCalculationInput = {
    eer: value.eer,
    country: value.country,
    age: value.age,
    gender: value.gender,
    weight_kg: value.weight_kg
  };

  const macrosResult = await calculateMacros(macrosData);

  return res.status(200).json({
    success: true,
    input: value,
    macros: macrosResult,
    timestamp: new Date().toISOString(),
    message: 'Macronutrient recommendations calculated successfully'
  });
} 