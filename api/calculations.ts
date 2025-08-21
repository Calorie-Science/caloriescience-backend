import { VercelRequest, VercelResponse } from '@vercel/node';
import { calculateEER, calculateMacros, EERCalculationInput, MacrosCalculationInput } from '../lib/calculations';
import { calculateMicronutrients, MicronutrientCalculationInput } from '../lib/micronutrientCalculations';
import { transformWithMapping, FIELD_MAPPINGS } from '../lib/caseTransform';
import { calculateBMI } from '../lib/healthMetrics';
import { getEERGuidelineFromLocation, normalizeCountry } from '../lib/locationMapping';
import { categorizeMicronutrients } from '../lib/micronutrientCategorization';
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

const micronutrientSchema = Joi.object({
  location: Joi.string().max(255).required()
    .messages({
      'string.max': 'Location cannot exceed 255 characters',
      'any.required': 'Location is required to determine micronutrient guideline'
    }),
  age: Joi.number().integer().min(1).max(120).required(),
  gender: Joi.string().valid('male', 'female').required()
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
      case 'calculateMicronutrients':
        return await handleMicronutrientCalculation(req, res);
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be one of: "calculateEer", "calculateMacros", or "calculateMicronutrients"'
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

  // Normalize location to lowercase for consistent matching
  const normalizedLocation = normalizeCountry(value.location);
  
  // Automatically determine EER guideline from location (returns lowercase)
  const eerGuideline = getEERGuidelineFromLocation(normalizedLocation);

  const eerData: EERCalculationInput = {
    country: eerGuideline, // Use the determined guideline as country (already lowercase)
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

  // Format response to match GET client endpoint structure
  const response = {
    // EER data
    eerCalories: eerResult.eer,
    nutritionistNotes: null,
    eerLastUpdated: new Date().toISOString(),
    
    // Guideline tracking (without country)
    eerGuidelineCountry: null,
    macroGuidelineCountry: null,
    guidelineNotes: null,
    
    // Target Macros data (not calculated yet)
    proteinGrams: null,
    carbsGrams: null,
    fatGrams: null,
    fiberGrams: null,
    proteinPercentage: null,
    carbsPercentage: null,
    fatPercentage: null,
    
    // Macros Ranges (not calculated yet)
    macrosRanges: null,
    
    // Micronutrient data (not calculated yet)
    micronutrients: {
      vitamins: {},
      minerals: {},
      miscellaneous: {}
    },
    guidelineUsed: null,
    micronutrientNotes: null,
    micronutrientGuidelineType: null,
    micronutrientCalculationFactors: null,
    
    // AI calculation metadata
    calculationMethod: 'auto_calculated',
    
    // Additional EER-specific data
    bmr: eerResult.bmr,
    pal: eerResult.pal,
    formulaUsed: eerResult.formula_used,
    bmi: parseFloat(bmiResult.bmi.toFixed(2)),
    bmiCategory: bmiResult.category,
    bmiClassification: bmiResult.classification,
    input: value,
    timestamp: new Date().toISOString()
  };

  // Transform response to camelCase to match client endpoint
  const transformedResponse = transformWithMapping(response, FIELD_MAPPINGS.snakeToCamel);

  return res.status(200).json({
    success: true,
    ...transformedResponse,
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

  // Normalize location to lowercase for consistent matching
  const normalizedLocation = normalizeCountry(value.location);
  
  // Automatically determine macro guideline from location (returns lowercase)
  const macroGuideline = getEERGuidelineFromLocation(normalizedLocation);

  const macrosData: MacrosCalculationInput = {
    eer: value.eer,
    country: macroGuideline, // Use the determined guideline as country (already lowercase)
    age: value.age,
    gender: value.gender,
    weight_kg: value.weightKg
  };

  const macrosResult = await calculateMacros(macrosData);

  // Calculate average values for macros with ranges (for target values)
  const calculateAverage = (min: number | null, max: number | null): number => {
    if (min !== null && max !== null) return (min + max) / 2;
    if (min !== null) return min;
    if (max !== null) return max;
    return 0;
  };

  const proteinGrams = calculateAverage(macrosResult.Protein?.min, macrosResult.Protein?.max);
  const carbsGrams = calculateAverage(macrosResult['Carbohydrates']?.min, macrosResult['Carbohydrates']?.max);
  const fatGrams = calculateAverage(macrosResult['Total Fat']?.min, macrosResult['Total Fat']?.max);
  const fiberGrams = calculateAverage(macrosResult.Fiber?.min, macrosResult.Fiber?.max);

  // Calculate percentages
  const proteinPercentage = value.eer > 0 ? (proteinGrams * 4 / value.eer) * 100 : 0;
  const carbsPercentage = value.eer > 0 ? (carbsGrams * 4 / value.eer) * 100 : 0;
  const fatPercentage = value.eer > 0 ? (fatGrams * 9 / value.eer) * 100 : 0;

  // Format response to match GET client endpoint structure
  const response = {
    // EER data
    eerCalories: value.eer,
    nutritionistNotes: null,
    eerLastUpdated: new Date().toISOString(),
    
    // Guideline tracking (without country)
    eerGuidelineCountry: null,
    macroGuidelineCountry: null,
    guidelineNotes: null,
    
    // Target Macros data
    proteinGrams: Math.round(proteinGrams * 100) / 100,
    carbsGrams: Math.round(carbsGrams * 100) / 100,
    fatGrams: Math.round(fatGrams * 100) / 100,
    fiberGrams: Math.round(fiberGrams * 100) / 100,
    proteinPercentage: Math.round(proteinPercentage * 100) / 100,
    carbsPercentage: Math.round(carbsPercentage * 100) / 100,
    fatPercentage: Math.round(fatPercentage * 100) / 100,
    
    // Macros Ranges
    macrosRanges: {
      protein: {
        min: macrosResult.Protein?.min || null,
        max: macrosResult.Protein?.max || null,
        unit: 'g',
        note: macrosResult.Protein?.note || null
      },
      carbs: {
        min: macrosResult['Carbohydrates']?.min || null,
        max: macrosResult['Carbohydrates']?.max || null,
        unit: 'g',
        note: macrosResult['Carbohydrates']?.note || null
      },
      fat: {
        min: macrosResult['Total Fat']?.min || null,
        max: macrosResult['Total Fat']?.max || null,
        unit: 'g',
        note: macrosResult['Total Fat']?.note || null
      },
      fiber: {
        min: macrosResult.Fiber?.min || null,
        max: macrosResult.Fiber?.max || null,
        unit: 'g',
        note: macrosResult.Fiber?.note || null
      },
      saturatedFat: {
        min: macrosResult['Saturated Fat']?.min || null,
        max: macrosResult['Saturated Fat']?.max || null,
        unit: 'g',
        note: macrosResult['Saturated Fat']?.note || null
      },
      monounsaturatedFat: {
        min: macrosResult['Monounsaturated Fat']?.min || null,
        max: macrosResult['Monounsaturated Fat']?.max || null,
        unit: 'g',
        note: macrosResult['Monounsaturated Fat']?.note || null
      },
      polyunsaturatedFat: {
        min: macrosResult['Polyunsaturated Fat']?.min || null,
        max: macrosResult['Polyunsaturated Fat']?.max || null,
        unit: 'g',
        note: macrosResult['Polyunsaturated Fat']?.note || null
      },
      omega3: {
        min: macrosResult['Omega-3 Fatty Acids']?.min || null,
        max: macrosResult['Omega-3 Fatty Acids']?.max || null,
        unit: 'g',
        note: macrosResult['Omega-3 Fatty Acids']?.note || null
      },
      cholesterol: {
        min: macrosResult.Cholesterol?.min || null,
        max: macrosResult.Cholesterol?.max || null,
        unit: 'mg',
        note: macrosResult.Cholesterol?.note || null
      }
    },
    
    // Micronutrient data (not calculated yet)
    micronutrients: {
      vitamins: {},
      minerals: {},
      miscellaneous: {}
    },
    guidelineUsed: null,
    micronutrientNotes: null,
    micronutrientGuidelineType: null,
    micronutrientCalculationFactors: null,
    
    // AI calculation metadata
    calculationMethod: 'auto_calculated',
    
    // Additional macro-specific data
    input: value,
    timestamp: new Date().toISOString()
  };

  // Transform response to camelCase to match client endpoint
  const transformedResponse = transformWithMapping(response, FIELD_MAPPINGS.snakeToCamel);

  return res.status(200).json({
    success: true,
    ...transformedResponse,
    message: 'Macronutrient recommendations calculated successfully'
  });
}

async function handleMicronutrientCalculation(req: VercelRequest, res: VercelResponse): Promise<VercelResponse> {
  // Extract action field and validate the rest
  const { action, ...micronutrientRequestData } = req.body;
  const { error, value } = micronutrientSchema.validate(micronutrientRequestData, { abortEarly: false });
  
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }))
    });
  }

  // Normalize location to lowercase for consistent matching
  const normalizedLocation = normalizeCountry(value.location);
  
  // Automatically determine micronutrient guideline from location (returns lowercase)
  const micronutrientGuideline = getEERGuidelineFromLocation(normalizedLocation);

  const micronutrientData: MicronutrientCalculationInput = {
    location: normalizedLocation, // Use normalized lowercase location
    age: value.age,
    gender: value.gender
  };

  const micronutrientResult = await calculateMicronutrients(micronutrientData);

  // Format response to match GET client endpoint structure
  const response = {
    // EER data (not calculated)
    eerCalories: null,
    nutritionistNotes: null,
    eerLastUpdated: null,
    
    // Guideline tracking (without country)
    eerGuidelineCountry: null,
    macroGuidelineCountry: null,
    guidelineNotes: null,
    
    // Target Macros data (not calculated)
    proteinGrams: null,
    carbsGrams: null,
    fatGrams: null,
    fiberGrams: null,
    proteinPercentage: null,
    carbsPercentage: null,
    fatPercentage: null,
    
    // Macros Ranges (not calculated)
    macrosRanges: null,
    
    // Micronutrient data - categorized into vitamins, minerals, and miscellaneous
    micronutrients: categorizeMicronutrients(micronutrientResult.micronutrients, true),
    guidelineUsed: null,
    micronutrientNotes: null,
    micronutrientGuidelineType: null,
    micronutrientCalculationFactors: null,
    
    // AI calculation metadata
    calculationMethod: 'auto_calculated',
    
    // Additional micronutrient-specific data
    input: value,
    ageGroup: micronutrientResult.age_group,
    source: micronutrientResult.source,
    notes: micronutrientResult.notes,
    timestamp: new Date().toISOString()
  };

  // Transform response to camelCase to match client endpoint
  const transformedResponse = transformWithMapping(response, FIELD_MAPPINGS.snakeToCamel);

  return res.status(200).json({
    success: true,
    ...transformedResponse,
    message: 'Micronutrient recommendations calculated successfully'
  });
} 