// Utility functions for converting between camelCase and snake_case

/**
 * Convert snake_case string to camelCase
 */
export function toCamelCase(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

/**
 * Convert camelCase string to snake_case
 */
export function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Convert object keys from snake_case to camelCase
 */
export function objectToCamelCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects specifically
  if (obj instanceof Date) {
    return obj.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format
  }

  if (Array.isArray(obj)) {
    return obj.map(item => objectToCamelCase(item));
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const camelKey = toCamelCase(key);
    result[camelKey] = objectToCamelCase(value);
  }
  
  return result;
}

/**
 * Convert object keys from camelCase to snake_case
 */
export function objectToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects specifically - convert to ISO string for database
  if (obj instanceof Date) {
    return obj.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format for DATE fields
  }

  if (Array.isArray(obj)) {
    return obj.map(item => objectToSnakeCase(item));
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = toSnakeCase(key);
    result[snakeKey] = objectToSnakeCase(value);
  }
  
  return result;
}

/**
 * Field mapping for specific conversions
 */
export const FIELD_MAPPINGS = {
  // API (camelCase) -> Database (snake_case)
  camelToSnake: {
    firstName: 'first_name',
    lastName: 'last_name',
    fullName: 'full_name',
    dateOfBirth: 'date_of_birth',
    phoneCountryCode: 'phone_country_code',
    activityLevel: 'activity_level',
    pregnancyStatus: 'pregnancy_status',
    lactationStatus: 'lactation_status',
    medicalConditions: 'medical_conditions',
    dietaryPreferences: 'dietary_preferences',
    healthGoals: 'health_goals',
    targetWeightKg: 'target_weight_kg',
    heightCm: 'height_cm',
    weightKg: 'weight_kg',
    eerGuideline: 'eer_guideline',
    eerCalories: 'eer_calories',
    nutritionistNotes: 'nutritionist_notes',
    macrosData: 'macros_data',
    proteinGrams: 'protein_grams',
    carbsGrams: 'carbs_grams',
    fatGrams: 'fat_grams',
    fiberGrams: 'fiber_grams',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    convertedToActiveAt: 'converted_to_active_at',
    lastInteractionAt: 'last_interaction_at',
    preferredContactMethod: 'preferred_contact_method',
    preferredMeasurementSystem: 'preferred_measurement_system',
    nutritionistId: 'nutritionist_id',
    clientId: 'client_id',
    userId: 'user_id',
    isActive: 'is_active',
    isAiGenerated: 'is_ai_generated',
    calculationMethod: 'calculation_method',
    aiCalculationData: 'ai_calculation_data',
    isEditedByNutritionist: 'is_edited_by_nutritionist',
    approvedAt: 'approved_at',
    approvedBy: 'approved_by',
    emailVerified: 'email_verified',
    experienceYears: 'experience_years',
    totalClients: 'total_clients',
    newThisMonth: 'new_this_month',
    recentClients: 'recent_clients',
    clientsNeedingEer: 'clients_needing_eer',
    upcomingInteractions: 'upcoming_interactions',
    interactionType: 'interaction_type',
    scheduledAt: 'scheduled_at',
    migrationsRun: 'migrations_run',
    migrationName: 'migration_name',
    bmiCategory: 'bmi_category',
    bmiLastCalculated: 'bmi_last_calculated',
    bmrLastCalculated: 'bmr_last_calculated',
    micronutrientsData: 'micronutrients_data',
    guidelineUsed: 'guideline_used'
  },
  // Database (snake_case) -> API (camelCase)
  snakeToCamel: {} as Record<string, string>
};

// Auto-generate reverse mapping
for (const [camel, snake] of Object.entries(FIELD_MAPPINGS.camelToSnake)) {
  FIELD_MAPPINGS.snakeToCamel[snake] = camel;
}

/**
 * Transform object using specific field mappings
 */
export function transformWithMapping(obj: any, mapping: Record<string, string>): any {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  // Handle Date objects specifically - convert to ISO string for database
  if (obj instanceof Date) {
    return obj.toISOString().split('T')[0]; // Convert to YYYY-MM-DD format for DATE fields
  }

  if (Array.isArray(obj)) {
    return obj.map(item => transformWithMapping(item, mapping));
  }

  const result: any = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = mapping[key] || key;
    
    // Handle Date objects in values
    if (value instanceof Date) {
      result[newKey] = value.toISOString().split('T')[0];
    } else {
      result[newKey] = transformWithMapping(value, mapping);
    }
  }
  
  return result;
} 