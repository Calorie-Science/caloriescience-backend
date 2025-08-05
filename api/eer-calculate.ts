import { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateEERWithAssistant } from '../lib/openai';
import Joi from 'joi';

// Validation schema for direct EER calculation
const directEERCalculationSchema = Joi.object({
  country: Joi.string().min(2).max(100).required(),
  age: Joi.number().integer().min(1).max(120).required(),
  sex: Joi.string().valid('male', 'female').required(),
  weight_kg: Joi.number().min(20).max(500).required(),
  height_cm: Joi.number().min(50).max(300).required(),
  pal: Joi.number().min(1.0).max(3.0).optional(), // Physical Activity Level
  activity_level: Joi.string().valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active').optional(),
  special_cases: Joi.string().max(500).optional(), // Any special medical conditions or considerations
  health_goals: Joi.array().items(Joi.string()).optional(),
  medical_conditions: Joi.array().items(Joi.string()).optional()
});

function validateBody(schema: Joi.ObjectSchema, body: any) {
  const { error, value } = schema.validate(body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    return { isValid: false, errors, value: null };
  }

  return { isValid: true, errors: null, value };
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Validate request body
    const validation = validateBody(directEERCalculationSchema, req.body);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Validation failed',
        details: validation.errors
      });
    }

    const data = validation.value;

    // Calculate EER using OpenAI Assistant
    const eerResult = await calculateEERWithAssistant({
      country: data.country,
      age: data.age,
      sex: data.sex,
      weight_kg: data.weight_kg,
      height_cm: data.height_cm,
      pal: data.pal,
      activity_level: data.activity_level,
      special_cases: data.special_cases,
      health_goals: data.health_goals,
      medical_conditions: data.medical_conditions
    });

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Return success response
    res.status(200).json({
      message: 'EER calculation completed successfully',
      calculation: {
        input: {
          country: data.country,
          age: data.age,
          sex: data.sex,
          weight_kg: data.weight_kg,
          height_cm: data.height_cm,
          pal: data.pal,
          activity_level: data.activity_level,
          special_cases: data.special_cases
        },
        results: eerResult,
        calculated_at: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('EER calculation error:', error);
    res.status(500).json({
      error: 'Failed to calculate EER requirements',
      message: 'An error occurred while calculating nutritional requirements. Please try again.'
    });
  }
} 