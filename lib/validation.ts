import Joi from 'joi';
import { transformWithMapping, FIELD_MAPPINGS } from './caseTransform';

// User registration validation
export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(1).max(100).required()
    .messages({
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name cannot exceed 100 characters',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string().max(100).optional().allow('')
    .messages({
      'string.max': 'Last name cannot exceed 100 characters'
    }),
  phone: Joi.string().pattern(/^[0-9+\-\s\(\)\.]+$/).min(7).max(20).optional()
    .messages({
      'string.pattern.base': 'Phone number can only contain numbers, spaces, hyphens, parentheses, plus signs, and dots',
      'string.min': 'Phone number must be at least 7 characters',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),
  phoneCountryCode: Joi.string().pattern(/^\+[1-9][0-9]{0,3}$/).optional().default('+1')
    .messages({
      'string.pattern.base': 'Country code must start with + followed by 1-4 digits (e.g., +1, +44, +91)'
    }),
  // Keep full_name for backward compatibility (will be deprecated)
  fullName: Joi.string().min(2).max(255).optional()
    .messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 255 characters'
    }),
  qualification: Joi.string().max(500).optional(),
  experienceYears: Joi.number().integer().min(0).max(50).optional(),
  specialization: Joi.array().items(Joi.string()).optional()
});

// User login validation
export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Client validation - Updated to camelCase
export const clientSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).required()
    .messages({
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name cannot exceed 100 characters',
      'any.required': 'First name is required'
    }),
  lastName: Joi.string().max(100).optional().allow('')
    .messages({
      'string.max': 'Last name cannot exceed 100 characters'
    }),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^[0-9+\-\s\(\)\.]+$/).min(7).max(20).optional()
    .messages({
      'string.pattern.base': 'Phone number can only contain numbers, spaces, hyphens, parentheses, plus signs, and dots',
      'string.min': 'Phone number must be at least 7 characters',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),
  phoneCountryCode: Joi.string().pattern(/^\+[1-9][0-9]{0,3}$/).optional().default('+1')
    .messages({
      'string.pattern.base': 'Country code must start with + followed by 1-4 digits (e.g., +1, +44, +91)'
    }),
  // Keep full_name for backward compatibility (will be deprecated)
  fullName: Joi.string().min(2).max(255).optional()
    .messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 255 characters'
    }),
  dateOfBirth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  location: Joi.string().max(255).optional()
    .messages({
      'string.max': 'Location cannot exceed 255 characters'
    }),
  pregnancyStatus: Joi.string().valid('not_pregnant', 'first_trimester', 'second_trimester', 'third_trimester').optional().default('not_pregnant')
    .messages({
      'any.only': 'Pregnancy status must be one of: not_pregnant, first_trimester, second_trimester, third_trimester'
    }),
  lactationStatus: Joi.string().valid('not_lactating', 'lactating_0_6_months', 'lactating_7_12_months').optional().default('not_lactating')
    .messages({
      'any.only': 'Lactation status must be one of: not_lactating, lactating_0_6_months, lactating_7_12_months'
    }),
  heightCm: Joi.number().min(50).max(300).optional(),
  weightKg: Joi.number().min(20).max(500).optional(),
  activityLevel: Joi.string().valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active').optional(),
  medicalConditions: Joi.array().items(Joi.string()).optional(),
  allergies: Joi.array().items(Joi.string()).optional(),
  medications: Joi.array().items(Joi.string()).optional(),
  dietaryPreferences: Joi.array().items(Joi.string()).optional(),
  healthGoals: Joi.array().items(Joi.string()).optional(),
  targetWeightKg: Joi.number().min(20).max(500).optional(),
  // EER-related fields that can be passed from EER calculation API
  bmi: Joi.number().min(10).max(100).optional(),
  bmiCategory: Joi.string().valid('underweight', 'normal', 'overweight', 'obese_class_1', 'obese_class_2', 'obese_class_3').optional(),
  bmr: Joi.number().min(500).max(5000).optional(),
  eerCalories: Joi.number().min(500).max(10000).optional(),
  status: Joi.string().valid('prospective', 'active', 'inactive', 'archived').optional().default('prospective')
    .messages({
      'any.only': 'Status must be one of: prospective, active, inactive, archived'
    }),
  source: Joi.string().max(100).optional(),
  notes: Joi.string().max(2000).optional(),
  preferredMeasurementSystem: Joi.string().valid('metric', 'imperial').optional()
    .messages({
      'any.only': 'Preferred measurement system must be either "metric" or "imperial"'
    }),
  // Macros data - optional for client creation
  macrosData: Joi.object({
    Protein: Joi.object({
      min: Joi.number().allow(null).optional(),
      max: Joi.number().allow(null).optional(),
      unit: Joi.string().optional(),
      note: Joi.string().optional()
    }).optional(),
    Carbohydrates: Joi.object({
      min: Joi.number().allow(null).optional(),
      max: Joi.number().allow(null).optional(),
      unit: Joi.string().optional(),
      note: Joi.string().optional()
    }).optional(),
    'Total Fat': Joi.object({
      min: Joi.number().allow(null).optional(),
      max: Joi.number().allow(null).optional(),
      unit: Joi.string().optional(),
      note: Joi.string().optional()
    }).optional(),
    Fiber: Joi.object({
      min: Joi.number().allow(null).optional(),
      max: Joi.number().allow(null).optional(),
      unit: Joi.string().optional(),
      note: Joi.string().optional()
    }).optional(),
    'Saturated Fat': Joi.object({
      min: Joi.number().allow(null).optional(),
      max: Joi.number().allow(null).optional(),
      unit: Joi.string().optional(),
      note: Joi.string().optional()
    }).optional(),
    'Monounsaturated Fat': Joi.object({
      min: Joi.number().allow(null).optional(),
      max: Joi.number().allow(null).optional(),
      unit: Joi.string().optional(),
      note: Joi.string().optional()
    }).optional(),
    'Polyunsaturated Fat': Joi.object({
      min: Joi.number().allow(null).optional(),
      max: Joi.number().allow(null).optional(),
      unit: Joi.string().optional(),
      note: Joi.string().optional()
    }).optional(),
    'Omega-3 Fatty Acids': Joi.object({
      min: Joi.number().allow(null).optional(),
      max: Joi.number().allow(null).optional(),
      unit: Joi.string().optional(),
      note: Joi.string().optional()
    }).optional(),
    Cholesterol: Joi.object({
      min: Joi.number().allow(null).optional(),
      max: Joi.number().allow(null).optional(),
      unit: Joi.string().optional(),
      note: Joi.string().optional()
    }).optional()
  }).optional(),
  // Micronutrients data - optional for client creation
  micronutrientsData: Joi.object({
    micronutrients: Joi.object({
      vitaminA: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      thiamin: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      riboflavin: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      niacinEquivalent: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      pantothenicAcid: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      vitaminB6: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      biotin: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      vitaminB12: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      folate: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      vitaminC: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      vitaminD: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      iron: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      calcium: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      magnesium: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      potassium: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      zinc: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      copper: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      iodine: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      selenium: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      phosphorus: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      chloride: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional(),
      sodium: Joi.object({ amount: Joi.number(), unit: Joi.string(), name: Joi.string() }).optional()
    }).optional(),
    guidelineUsed: Joi.string().optional(),
    source: Joi.string().optional(),
    notes: Joi.string().optional(),
    ageGroup: Joi.string().optional()
  }).optional()
});

// Client update validation - Makes firstName optional for partial updates
export const clientUpdateSchema = Joi.object({
  firstName: Joi.string().min(1).max(100).optional()
    .messages({
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name cannot exceed 100 characters'
    }),
  lastName: Joi.string().max(100).optional().allow('')
    .messages({
      'string.max': 'Last name cannot exceed 100 characters'
    }),
  email: Joi.string().email().optional(),
  phone: Joi.string().pattern(/^[0-9+\-\s\(\)\.]+$/).min(7).max(20).optional()
    .messages({
      'string.pattern.base': 'Phone number can only contain numbers, spaces, hyphens, parentheses, plus signs, and dots',
      'string.min': 'Phone number must be at least 7 characters',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),
  phoneCountryCode: Joi.string().pattern(/^\+[1-9][0-9]{0,3}$/).optional().default('+1')
    .messages({
      'string.pattern.base': 'Country code must start with + followed by 1-4 digits (e.g., +1, +44, +91)'
    }),
  // Keep full_name for backward compatibility (will be deprecated)
  fullName: Joi.string().min(2).max(255).optional()
    .messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 255 characters'
    }),
  dateOfBirth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  location: Joi.string().max(255).optional()
    .messages({
      'string.max': 'Location cannot exceed 255 characters'
    }),
  pregnancyStatus: Joi.string().valid('not_pregnant', 'first_trimester', 'second_trimester', 'third_trimester').optional().default('not_pregnant')
    .messages({
      'any.only': 'Pregnancy status must be one of: not_pregnant, first_trimester, second_trimester, third_trimester'
    }),
  lactationStatus: Joi.string().valid('not_lactating', 'lactating_0_6_months', 'lactating_7_12_months').optional().default('not_lactating')
    .messages({
      'any.only': 'Lactation status must be one of: not_lactating, lactating_0_6_months, lactating_7_12_months'
    }),
  heightCm: Joi.number().min(50).max(300).optional(),
  weightKg: Joi.number().min(20).max(500).optional(),
  activityLevel: Joi.string().valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active').optional(),
  medicalConditions: Joi.array().items(Joi.string()).optional(),
  allergies: Joi.array().items(Joi.string()).optional(),
  medications: Joi.array().items(Joi.string()).optional(),
  dietaryPreferences: Joi.array().items(Joi.string()).optional(),
  healthGoals: Joi.array().items(Joi.string()).optional(),
  targetWeightKg: Joi.number().min(20).max(500).optional(),
  // EER-related fields that can be passed from EER calculation API
  bmi: Joi.number().min(10).max(100).optional(),
  bmiCategory: Joi.string().valid('underweight', 'normal', 'overweight', 'obese_class_1', 'obese_class_2', 'obese_class_3').optional(),
  bmr: Joi.number().min(500).max(5000).optional(),
  // Status and management fields
  status: Joi.string().valid('prospective', 'active', 'inactive', 'archived').optional(),
  source: Joi.string().max(100).optional(),
  notes: Joi.string().optional(),
  preferredContactMethod: Joi.string().valid('email', 'phone', 'sms').optional().default('email')
});

// EER calculation validation - Updated for OpenAI Assistant
export const eerCalculationSchema = Joi.object({
  clientId: Joi.string().uuid().required(),
  country: Joi.string().min(2).max(100).required(),
  age: Joi.number().integer().min(1).max(120).required(),
  sex: Joi.string().valid('male', 'female').required(),
  weightKg: Joi.number().min(20).max(500).required(),
  heightCm: Joi.number().min(50).max(300).required(),
  pal: Joi.number().min(1.0).max(3.0).optional(), // Physical Activity Level
  activityLevel: Joi.string().valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active').optional(),
  specialCases: Joi.string().max(500).optional(), // Any special medical conditions or considerations
  healthGoals: Joi.array().items(Joi.string()).optional(),
  medicalConditions: Joi.array().items(Joi.string()).optional()
});

// Helper function to validate request body with case transformation
export function validateBody(schema: Joi.ObjectSchema, body: any) {
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

// Helper function to validate and transform client data
export function validateAndTransformClient(body: any) {
  const validation = validateBody(clientUpdateSchema, body);
  
  if (!validation.isValid) {
    return validation;
  }

  // Transform camelCase API input to snake_case for database
  const transformedValue = transformWithMapping(validation.value, FIELD_MAPPINGS.camelToSnake);
  
  return {
    isValid: true,
    errors: null,
    value: transformedValue
  };
} 