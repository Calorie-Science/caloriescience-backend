import { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateMacrosWithAssistant, MacrosCalculationInput } from '../lib/openai';
import Joi from 'joi';

// Validation schema for macros calculation input
const macrosSchema = Joi.object({
  eer: Joi.number().min(500).max(8000).required()
    .messages({
      'number.min': 'EER must be at least 500 kcal',
      'number.max': 'EER must not exceed 8000 kcal',
      'any.required': 'EER is required'
    }),
  country: Joi.string().valid('USA', 'EU', 'AU/NZ', 'UK').required()
    .messages({
      'any.only': 'Country must be one of: USA, EU, AU/NZ, UK',
      'any.required': 'Country is required'
    }),
  age: Joi.number().min(1).max(120).required()
    .messages({
      'number.min': 'Age must be at least 1',
      'number.max': 'Age must not exceed 120',
      'any.required': 'Age is required'
    }),
  gender: Joi.string().valid('male', 'female').required()
    .messages({
      'any.only': 'Gender must be either male or female',
      'any.required': 'Gender is required'
    }),
  pal: Joi.number().min(1.0).max(3.0).required()
    .messages({
      'number.min': 'PAL must be at least 1.0',
      'number.max': 'PAL must not exceed 3.0',
      'any.required': 'PAL (Physical Activity Level) is required'
    })
});

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only POST requests are supported for macros calculation'
    });
  }

  try {
    // Validate request body
    const { error, value } = macrosSchema.validate(req.body, { abortEarly: false });
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data',
        details: error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message
        }))
      });
    }

    console.log('Macros calculation request:', value);

    // Calculate macros using OpenAI Assistant
    const macrosData: MacrosCalculationInput = {
      eer: value.eer,
      country: value.country,
      age: value.age,
      gender: value.gender,
      pal: value.pal
    };

    const macrosResult = await calculateMacrosWithAssistant(macrosData);

    // Return successful response
    return res.status(200).json({
      success: true,
      input: value,
      macros: macrosResult,
      timestamp: new Date().toISOString(),
      message: 'Macronutrient recommendations calculated successfully'
    });

  } catch (error) {
    console.error('Macros calculation error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('timeout')) {
        return res.status(408).json({
          error: 'Request timeout',
          message: 'Macros calculation took too long. Please try again.'
        });
      }
      
      if (error.message.includes('Invalid') || error.message.includes('format')) {
        return res.status(400).json({
          error: 'Invalid response format',
          message: 'The AI response was not in the expected format. Please try again.'
        });
      }
    }

    // Generic server error
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to calculate macronutrient recommendations. Please try again later.'
    });
  }
} 