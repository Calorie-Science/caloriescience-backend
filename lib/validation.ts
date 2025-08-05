import Joi from 'joi';

// User registration validation
export const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  full_name: Joi.string().min(2).max(255).required(),
  phone: Joi.string().optional(),
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
  full_name: Joi.string().min(2).max(255).required(),
  email: Joi.string().email().optional(),
  phone: Joi.string().optional(),
  date_of_birth: Joi.date().max('now').optional(),
  gender: Joi.string().valid('male', 'female', 'other').optional(),
  height_cm: Joi.number().min(50).max(300).optional(),
  weight_kg: Joi.number().min(20).max(500).optional(),
  activity_level: Joi.string().valid('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active').optional(),
  medical_conditions: Joi.array().items(Joi.string()).optional(),
  allergies: Joi.array().items(Joi.string()).optional(),
  medications: Joi.array().items(Joi.string()).optional(),
  dietary_preferences: Joi.array().items(Joi.string()).optional(),
  health_goals: Joi.array().items(Joi.string()).optional(),
  target_weight_kg: Joi.number().min(20).max(500).optional(),
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