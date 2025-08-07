import Joi from 'joi';

// User registration validation
export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().min(1).max(100).required()
    .messages({
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name cannot exceed 100 characters',
      'any.required': 'First name is required'
    }),
  last_name: Joi.string().max(100).optional().allow('')
    .messages({
      'string.max': 'Last name cannot exceed 100 characters'
    }),
  phone: Joi.string().pattern(/^[0-9+\-\s\(\)\.]+$/).min(7).max(20).optional()
    .messages({
      'string.pattern.base': 'Phone number can only contain numbers, spaces, hyphens, parentheses, plus signs, and dots',
      'string.min': 'Phone number must be at least 7 characters',
      'string.max': 'Phone number cannot exceed 20 characters'
    }),
  phone_country_code: Joi.string().pattern(/^\+[1-9][0-9]{0,3}$/).optional().default('+1')
    .messages({
      'string.pattern.base': 'Country code must start with + followed by 1-4 digits (e.g., +1, +44, +91)'
    }),
  // Keep full_name for backward compatibility (will be deprecated)
  full_name: Joi.string().min(2).max(255).optional()
    .messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 255 characters'
    }),
  qualification: Joi.string().max(500).optional(),
  experience_years: Joi.number().integer().min(0).max(50).optional(),
  specialization: Joi.array().items(Joi.string()).optional()
});

// User login validation
export const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

// Client validation
export const clientSchema = Joi.object({
  first_name: Joi.string().min(1).max(100).required()
    .messages({
      'string.min': 'First name must be at least 1 character',
      'string.max': 'First name cannot exceed 100 characters',
      'any.required': 'First name is required'
    }),
  last_name: Joi.string().max(100).optional().allow('')
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
  phone_country_code: Joi.string().pattern(/^\+[1-9][0-9]{0,3}$/).optional().default('+1')
    .messages({
      'string.pattern.base': 'Country code must start with + followed by 1-4 digits (e.g., +1, +44, +91)'
    }),
  // Keep full_name for backward compatibility (will be deprecated)
  full_name: Joi.string().min(2).max(255).optional()
    .messages({
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 255 characters'
    }),
  date_of_birth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  location: Joi.string().max(255).optional()
    .messages({
      'string.max': 'Location cannot exceed 255 characters'
    }),
  pregnancy_status: Joi.string().valid('not_pregnant', 'first_trimester', 'second_trimester', 'third_trimester').optional().default('not_pregnant')
    .messages({
      'any.only': 'Pregnancy status must be one of: not_pregnant, first_trimester, second_trimester, third_trimester'
    }),
  lactation_status: Joi.string().valid('not_lactating', 'lactating_0_6_months', 'lactating_7_12_months').optional().default('not_lactating')
    .messages({
      'any.only': 'Lactation status must be one of: not_lactating, lactating_0_6_months, lactating_7_12_months'
    }),
  height_cm: Joi.number().min(50).max(300).optional(),
  weight_kg: Joi.number().min(20).max(500).optional(),
  activity_level: Joi.string().valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active').optional(),
  medical_conditions: Joi.array().items(Joi.string()).optional(),
  allergies: Joi.array().items(Joi.string()).optional(),
  medications: Joi.array().items(Joi.string()).optional(),
  dietary_preferences: Joi.array().items(Joi.string()).optional(),
  health_goals: Joi.array().items(Joi.string()).optional(),
  target_weight_kg: Joi.number().min(20).max(500).optional(),
  status: Joi.string().valid('prospective', 'active', 'inactive', 'archived').optional().default('prospective')
    .messages({
      'any.only': 'Status must be one of: prospective, active, inactive, archived'
    }),
  source: Joi.string().max(100).optional(),
  notes: Joi.string().max(2000).optional()
});

// EER calculation validation - Updated for OpenAI Assistant
export const eerCalculationSchema = Joi.object({
  client_id: Joi.string().uuid().required(),
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

// Helper function to validate request body
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