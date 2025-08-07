import { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateEER, calculateMacros, EERCalculationInput, MacrosCalculationInput } from '../lib/calculations';
import { transformWithMapping, FIELD_MAPPINGS } from '../lib/caseTransform';
import { calculateBMI } from '../lib/healthMetrics';
import { getEERGuidelineFromLocation } from '../lib/locationMapping';
import Joi from 'joi';

// Validation schemas - Updated to use location instead of country
const eerSchema = Joi.object({
  location: Joi.string().max(255).required()
    .messages({
      'string.max': 'Location cannot exceed 255 characters',
      'any.required': 'Location is required to determine EER guideline'
    }),
  age: Joi.number().integer().min(1).max(120).required(),
  gender: Joi.string().valid('male', 'female').required(),
  heightCm: Joi.number().min(50).max(300).required(),
  weightKg: Joi.number().min(1).max(500).required(),
  activityLevel: Joi.string().valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active').required(),
  pregnancyStatus: Joi.string().valid('not_pregnant', 'first_trimester', 'second_trimester', 'third_trimester').optional().default('not_pregnant'),
  lactationStatus: Joi.string().valid('not_lactating', 'lactating_0_6_months', 'lactating_7_12_months').optional().default('not_lactating')
});

const macrosSchema = Joi.object({
  eer: Joi.number().min(500).max(10000).required(),
  location: Joi.string().max(255).required()
    .messages({
      'string.max': 'Location cannot exceed 255 characters',
      'any.required': 'Location is required to determine macro guideline'
    }),
  age: Joi.number().integer().min(1).max(120).required(),
  gender: Joi.string().valid('male', 'female').required(),
  weightKg: Joi.number().min(1).max(500).required()
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
      case 'calculateEer':
        return await handleEERCalculation(req, res);
      case 'calculateMacros':
        return await handleMacrosCalculation(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be either "calculateEer" or "calculateMacros"'
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

  // Automatically determine EER guideline from location
  const eerGuideline = getEERGuidelineFromLocation(value.location);

  const eerData: EERCalculationInput = {
    country: eerGuideline, // Use the determined guideline as country
    age: value.age,
    gender: value.gender,
    height_cm: value.heightCm,
    weight_kg: value.weightKg,
    activity_level: value.activityLevel,
    pregnancy_status: value.pregnancyStatus,
    lactation_status: value.lactationStatus
  };

  const eerResult = await calculateEER(eerData);

  // Calculate BMI and classification
  const bmiResult = calculateBMI(value.heightCm, value.weightKg);

  return res.status(200).json({
    success: true,
    bmr: eerResult.bmr,
    pal: eerResult.pal,
    eer: eerResult.eer,
    formulaUsed: eerResult.formula_used,
    eerGuideline: eerGuideline, // Include the determined guideline in response
    // Add BMI information
    bmi: parseFloat(bmiResult.bmi.toFixed(2)),
    bmiCategory: bmiResult.category,
    bmiClassification: bmiResult.classification,
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

  // Automatically determine macro guideline from location
  const macroGuideline = getEERGuidelineFromLocation(value.location);

  const macrosData: MacrosCalculationInput = {
    eer: value.eer,
    country: macroGuideline, // Use the determined guideline as country
    age: value.age,
    gender: value.gender,
    weight_kg: value.weightKg
  };

  const macrosResult = await calculateMacros(macrosData);

  return res.status(200).json({
    success: true,
    input: value,
    macroGuideline: macroGuideline, // Include the determined guideline in response
    macros: macrosResult,
    timestamp: new Date().toISOString(),
    message: 'Macronutrient recommendations calculated successfully'
  });
} 