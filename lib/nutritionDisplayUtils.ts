/**
 * Nutrition Display Utilities
 * 
 * Functions to format and convert nutritional data based on measurement system preferences
 */

import {
  MeasurementSystem,
  convertWeight,
  convertVolume,
  formatNutritionalValue,
  convertServingSize,
  NutritionalValue,
  formatDateDDMonYYYY
} from './measurementSystem';

export interface FormattedNutritionData {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  saturatedFat?: string;
  monounsaturatedFat?: string;
  polyunsaturatedFat?: string;
  cholesterol?: string;
  sodium?: string;
  potassium?: string;
  calcium?: string;
  iron?: string;
  vitaminC?: string;
  vitaminD?: string;
  vitaminB12?: string;
  folate?: string;
  water?: string;
  measurementSystem: MeasurementSystem;
  systemLabel: string;
}

export interface FormattedIngredient {
  text: string;
  quantity: number;
  measure: string;
  food: string;
  weight: number;
  weightDisplay: string;
  measurementSystem: MeasurementSystem;
}

/**
 * Format complete nutrition data according to measurement system
 */
export function formatNutritionData(
  nutritionData: any,
  measurementSystem: MeasurementSystem = 'metric'
): FormattedNutritionData {
  const systemLabel = measurementSystem === 'metric' ? 'Metric' : 'Imperial';

  // Calories always stay the same
  const calories = nutritionData.calories || nutritionData.totalCalories || 0;

  // Macronutrients (usually in grams)
  const protein = nutritionData.protein || nutritionData.totalProtein || 0;
  const carbs = nutritionData.carbs || nutritionData.totalCarbs || nutritionData.carbohydrates || 0;
  const fat = nutritionData.fat || nutritionData.totalFat || 0;
  const fiber = nutritionData.fiber || nutritionData.totalFiber || 0;

  // Format macronutrients
  const result: FormattedNutritionData = {
    calories: `${Math.round(calories)} kcal`,
    protein: formatNutritionalValue({ value: protein, unit: 'g', name: 'protein' }, measurementSystem),
    carbs: formatNutritionalValue({ value: carbs, unit: 'g', name: 'carbs' }, measurementSystem),
    fat: formatNutritionalValue({ value: fat, unit: 'g', name: 'fat' }, measurementSystem),
    fiber: formatNutritionalValue({ value: fiber, unit: 'g', name: 'fiber' }, measurementSystem),
    measurementSystem,
    systemLabel
  };

  // Add other nutrients if available
  if (nutritionData.saturatedFat !== undefined) {
    result.saturatedFat = formatNutritionalValue(
      { value: nutritionData.saturatedFat, unit: 'g', name: 'saturatedFat' }, 
      measurementSystem
    );
  }

  if (nutritionData.monounsaturatedFat !== undefined) {
    result.monounsaturatedFat = formatNutritionalValue(
      { value: nutritionData.monounsaturatedFat, unit: 'g', name: 'monounsaturatedFat' }, 
      measurementSystem
    );
  }

  if (nutritionData.polyunsaturatedFat !== undefined) {
    result.polyunsaturatedFat = formatNutritionalValue(
      { value: nutritionData.polyunsaturatedFat, unit: 'g', name: 'polyunsaturatedFat' }, 
      measurementSystem
    );
  }

  if (nutritionData.cholesterol !== undefined) {
    result.cholesterol = formatNutritionalValue(
      { value: nutritionData.cholesterol, unit: 'mg', name: 'cholesterol' }, 
      measurementSystem
    );
  }

  if (nutritionData.sodium !== undefined) {
    result.sodium = formatNutritionalValue(
      { value: nutritionData.sodium, unit: 'mg', name: 'sodium' }, 
      measurementSystem
    );
  }

  if (nutritionData.potassium !== undefined) {
    result.potassium = formatNutritionalValue(
      { value: nutritionData.potassium, unit: 'mg', name: 'potassium' }, 
      measurementSystem
    );
  }

  if (nutritionData.calcium !== undefined) {
    result.calcium = formatNutritionalValue(
      { value: nutritionData.calcium, unit: 'mg', name: 'calcium' }, 
      measurementSystem
    );
  }

  if (nutritionData.iron !== undefined) {
    result.iron = formatNutritionalValue(
      { value: nutritionData.iron, unit: 'mg', name: 'iron' }, 
      measurementSystem
    );
  }

  if (nutritionData.vitaminC !== undefined) {
    result.vitaminC = formatNutritionalValue(
      { value: nutritionData.vitaminC, unit: 'mg', name: 'vitaminC' }, 
      measurementSystem
    );
  }

  if (nutritionData.vitaminD !== undefined) {
    result.vitaminD = formatNutritionalValue(
      { value: nutritionData.vitaminD, unit: 'mcg', name: 'vitaminD' }, 
      measurementSystem
    );
  }

  if (nutritionData.vitaminB12 !== undefined) {
    result.vitaminB12 = formatNutritionalValue(
      { value: nutritionData.vitaminB12, unit: 'mcg', name: 'vitaminB12' }, 
      measurementSystem
    );
  }

  if (nutritionData.folate !== undefined) {
    result.folate = formatNutritionalValue(
      { value: nutritionData.folate, unit: 'mcg', name: 'folate' }, 
      measurementSystem
    );
  }

  if (nutritionData.water !== undefined) {
    const waterValue = nutritionData.water;
    const waterUnit = nutritionData.waterUnit || 'ml';
    
    if (measurementSystem === 'imperial' && waterUnit === 'ml') {
      const converted = convertVolume(waterValue, waterUnit, measurementSystem);
      result.water = `${converted.value} ${converted.unit}`;
    } else {
      result.water = `${Math.round(waterValue * 10) / 10} ${waterUnit}`;
    }
  }

  return result;
}

/**
 * Format ingredient according to measurement system
 */
export function formatIngredient(
  ingredient: any,
  measurementSystem: MeasurementSystem = 'metric'
): any {
  if (!ingredient) return ingredient;

  // Keep original data unchanged
  const originalIngredient = { ...ingredient };

  // Add display properties for the current measurement system
  if (measurementSystem === 'imperial') {
    // Convert text display for imperial
    if (ingredient.text) {
      originalIngredient.textDisplay = convertServingSize(ingredient.text, measurementSystem);
    }

    // Add imperial weight display
    if (ingredient.weight && ingredient.weight > 0) {
      const converted = convertWeight(ingredient.weight, 'g', measurementSystem);
      originalIngredient.weightDisplay = `${converted.value} ${converted.unit}`;
    }

    // Add imperial quantity display if applicable
    if (ingredient.quantity && ingredient.measure) {
      const weightMeasures = ['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms'];
      const volumeMeasures = ['ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters'];
      
      if (weightMeasures.includes(ingredient.measure.toLowerCase())) {
        const converted = convertWeight(ingredient.quantity, ingredient.measure, measurementSystem);
        originalIngredient.quantityDisplay = `${converted.value} ${converted.unit}`;
      } else if (volumeMeasures.includes(ingredient.measure.toLowerCase())) {
        const converted = convertVolume(ingredient.quantity, ingredient.measure, measurementSystem);
        originalIngredient.quantityDisplay = `${converted.value} ${converted.unit}`;
      }
    }
  } else {
    // For metric, display properties are the same as original
    originalIngredient.textDisplay = ingredient.text;
    if (ingredient.weight && ingredient.weight > 0) {
      originalIngredient.weightDisplay = `${Math.round(ingredient.weight)} g`;
    }
    if (ingredient.quantity && ingredient.measure) {
      originalIngredient.quantityDisplay = `${ingredient.quantity} ${ingredient.measure}`;
    }
  }

  // Add measurement system metadata
  originalIngredient._measurementSystem = {
    current: measurementSystem,
    originalUnits: 'metric'
  };

  return originalIngredient;
}

/**
 * Convert user input from their measurement system back to metric for API calls
 */
export function convertIngredientInputToMetric(
  userInput: {
    quantity: number;
    measure: string;
    food: string;
  },
  fromMeasurementSystem: MeasurementSystem = 'metric'
): {
  quantity: number;
  measure: string;
  food: string;
  originalInput: any;
} {
  
  if (fromMeasurementSystem === 'metric') {
    // Already metric, no conversion needed
    return {
      ...userInput,
      originalInput: userInput
    };
  }

  // Convert from imperial to metric
  const { quantity, measure, food } = userInput;
  let convertedQuantity = quantity;
  let convertedMeasure = measure;

  // Weight conversions
  const imperialWeightMeasures = ['oz', 'ounce', 'ounces', 'lb', 'lbs', 'pound', 'pounds'];
  if (imperialWeightMeasures.includes(measure.toLowerCase())) {
    const converted = convertWeight(quantity, measure, 'metric');
    convertedQuantity = converted.value;
    convertedMeasure = converted.unit;
  }

  // Volume conversions  
  const imperialVolumeMeasures = ['cup', 'cups', 'fl oz', 'fluid ounce', 'fluid ounces', 'pint', 'pints', 'quart', 'quarts', 'gallon', 'gallons'];
  if (imperialVolumeMeasures.includes(measure.toLowerCase())) {
    const converted = convertVolume(quantity, measure, 'metric');
    convertedQuantity = converted.value;
    convertedMeasure = converted.unit;
  }

  return {
    quantity: Math.round(convertedQuantity * 100) / 100, // Round to 2 decimal places
    measure: convertedMeasure,
    food,
    originalInput: userInput
  };
}

/**
 * Parse ingredient text input and convert to metric for API calls
 */
export function parseAndConvertIngredientText(
  ingredientText: string,
  fromMeasurementSystem: MeasurementSystem = 'metric'
): {
  convertedText: string;
  parsedIngredient: any;
  originalText: string;
} {
  
  if (fromMeasurementSystem === 'metric') {
    return {
      convertedText: ingredientText,
      parsedIngredient: null,
      originalText: ingredientText
    };
  }

  // Parse ingredient text pattern: "4.0 oz chicken breast"
  const patterns = [
    /^(\d+(?:\.\d+)?)\s*(oz|ounce|ounces|lb|lbs|pound|pounds|cup|cups|fl\s*oz|fluid\s*ounce|fluid\s*ounces)\s+(.+)$/i,
    /^(\d+(?:\.\d+)?)\s*(g|gram|grams|kg|kilogram|kilograms|ml|milliliter|milliliters|l|liter|liters)\s+(.+)$/i
  ];

  for (const pattern of patterns) {
    const match = ingredientText.match(pattern);
    if (match) {
      const [, quantityStr, measure, food] = match;
      const quantity = parseFloat(quantityStr);
      
      // Convert to metric
      const converted = convertIngredientInputToMetric(
        { quantity, measure, food: food.trim() },
        fromMeasurementSystem
      );
      
      return {
        convertedText: `${converted.quantity} ${converted.measure} ${converted.food}`,
        parsedIngredient: converted,
        originalText: ingredientText
      };
    }
  }

  // If no pattern matches, return as-is
  return {
    convertedText: ingredientText,
    parsedIngredient: null,
    originalText: ingredientText
  };
}

/**
 * Format client physical measurements according to measurement system
 */
export interface FormattedPhysicalMeasurements {
  height: string;
  weight: string;
  targetWeight?: string;
  bmi?: string;
  measurementSystem: MeasurementSystem;
}

export function formatPhysicalMeasurements(
  client: any,
  measurementSystem: MeasurementSystem = 'metric'
): FormattedPhysicalMeasurements {
  let height = '';
  let weight = '';
  let targetWeight = '';

  // Format height
  if (client.height_cm || client.heightCm) {
    const heightValue = client.height_cm || client.heightCm;
    if (measurementSystem === 'imperial') {
      const converted = convertWeight(heightValue, 'cm', measurementSystem);
      height = converted.unit; // This will be in feet'inches" format
    } else {
      height = `${heightValue} cm`;
    }
  }

  // Format weight
  if (client.weight_kg || client.weightKg) {
    const weightValue = client.weight_kg || client.weightKg;
    if (measurementSystem === 'imperial') {
      const converted = convertWeight(weightValue, 'kg', measurementSystem);
      weight = `${converted.value} ${converted.unit}`;
    } else {
      weight = `${weightValue} kg`;
    }
  }

  // Format target weight
  if (client.target_weight_kg || client.targetWeightKg) {
    const targetWeightValue = client.target_weight_kg || client.targetWeightKg;
    if (measurementSystem === 'imperial') {
      const converted = convertWeight(targetWeightValue, 'kg', measurementSystem);
      targetWeight = `${converted.value} ${converted.unit}`;
    } else {
      targetWeight = `${targetWeightValue} kg`;
    }
  }

  return {
    height,
    weight,
    targetWeight: targetWeight || undefined,
    bmi: client.bmi ? `${Math.round(client.bmi * 10) / 10}` : undefined,
    measurementSystem
  };
}

/**
 * Format goal ranges according to measurement system
 */
export interface FormattedGoals {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber?: string;
  water?: string;
  measurementSystem: MeasurementSystem;
}

export function formatGoals(
  goals: any,
  measurementSystem: MeasurementSystem = 'metric'
): FormattedGoals {
  const result: FormattedGoals = {
    calories: goals.eer_goal_calories ? `${goals.eer_goal_calories} kcal` : '0 kcal',
    protein: '',
    carbs: '',
    fat: '',
    measurementSystem
  };

  // Format protein range
  if (goals.protein_goal_min !== undefined && goals.protein_goal_max !== undefined) {
    const minProtein = formatNutritionalValue(
      { value: goals.protein_goal_min, unit: 'g', name: 'protein' }, 
      measurementSystem
    );
    const maxProtein = formatNutritionalValue(
      { value: goals.protein_goal_max, unit: 'g', name: 'protein' }, 
      measurementSystem
    );
    result.protein = `${minProtein} - ${maxProtein}`;
  }

  // Format carbs range
  if (goals.carbs_goal_min !== undefined && goals.carbs_goal_max !== undefined) {
    const minCarbs = formatNutritionalValue(
      { value: goals.carbs_goal_min, unit: 'g', name: 'carbs' }, 
      measurementSystem
    );
    const maxCarbs = formatNutritionalValue(
      { value: goals.carbs_goal_max, unit: 'g', name: 'carbs' }, 
      measurementSystem
    );
    result.carbs = `${minCarbs} - ${maxCarbs}`;
  }

  // Format fat range
  if (goals.fat_goal_min !== undefined && goals.fat_goal_max !== undefined) {
    const minFat = formatNutritionalValue(
      { value: goals.fat_goal_min, unit: 'g', name: 'fat' }, 
      measurementSystem
    );
    const maxFat = formatNutritionalValue(
      { value: goals.fat_goal_max, unit: 'g', name: 'fat' }, 
      measurementSystem
    );
    result.fat = `${minFat} - ${maxFat}`;
  }

  // Format fiber
  if (goals.fiber_goal_grams !== undefined) {
    result.fiber = formatNutritionalValue(
      { value: goals.fiber_goal_grams, unit: 'g', name: 'fiber' }, 
      measurementSystem
    );
  }

  // Format water
  if (goals.water_goal_liters !== undefined) {
    const waterValue = goals.water_goal_liters;
    if (measurementSystem === 'imperial') {
      const converted = convertVolume(waterValue, 'l', measurementSystem);
      result.water = `${converted.value} ${converted.unit}`;
    } else {
      result.water = `${waterValue} L`;
    }
  }

  return result;
}

/**
 * Format all dates in the application to DD-MON-YYYY format
 */
export function formatAllDates(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(formatAllDates);
  }

  const result = { ...data };

  // List of common date field names
  const dateFields = [
    'created_at', 'updated_at', 'last_login_at', 'last_interaction_at',
    'converted_to_active_at', 'analyzed_at', 'uploaded_at', 'completed_at',
    'follow_up_date', 'document_date', 'goal_start_date', 'goal_end_date',
    'plan_date', 'start_date', 'end_date', 'date_of_birth', 'scheduled_at',
    'password_reset_expires', 'bmi_last_calculated', 'bmr_last_calculated',
    'createdAt', 'updatedAt', 'lastLoginAt', 'lastInteractionAt',
    'convertedToActiveAt', 'analyzedAt', 'uploadedAt', 'completedAt',
    'followUpDate', 'documentDate', 'goalStartDate', 'goalEndDate',
    'planDate', 'startDate', 'endDate', 'dateOfBirth', 'scheduledAt',
    'passwordResetExpires', 'bmiLastCalculated', 'bmrLastCalculated'
  ];

  for (const [key, value] of Object.entries(result)) {
    if (dateFields.includes(key) && typeof value === 'string') {
      // Try to parse as date and format
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        result[key] = formatDateDDMonYYYY(date);
      }
    } else if (typeof value === 'object') {
      result[key] = formatAllDates(value);
    }
  }

  return result;
}

/**
 * Comprehensive function to format all nutrition-related data for display
 */
export function formatNutritionDisplay(
  data: any,
  measurementSystem: MeasurementSystem = 'metric'
): any {
  if (!data) return data;

  const formattedData = { ...data };

  // Format dates to DD-MON-YYYY
  formatAllDates(formattedData);

  // Handle Edamam meal plan structure: mealPlan.days[].meals[].recipe.ingredients[]
  if (formattedData.mealPlan && formattedData.mealPlan.days && Array.isArray(formattedData.mealPlan.days)) {
    formattedData.mealPlan.days = formattedData.mealPlan.days.map((day: any) => ({
      ...day,
      meals: day.meals && Array.isArray(day.meals) ? 
        day.meals.map((meal: any) => ({
          ...meal,
          recipe: meal.recipe ? {
            ...meal.recipe,
            ingredients: meal.recipe.ingredients ? 
              meal.recipe.ingredients.map((ing: any) => formatIngredient(ing, measurementSystem)) : 
              meal.recipe.ingredients,
            ingredientLines: meal.recipe.ingredientLines ? 
              meal.recipe.ingredientLines.map((line: string) => convertServingSize(line, measurementSystem)) : 
              meal.recipe.ingredientLines
          } : meal.recipe
        })) : day.meals
    }));
  }

  // Handle standard meal plan structure: meals[].ingredients[]
  if (formattedData.meals && Array.isArray(formattedData.meals)) {
    formattedData.meals = formattedData.meals.map((meal: any) => ({
      ...meal,
      nutrition: meal.nutrition ? formatNutritionData(meal.nutrition, measurementSystem) : undefined,
      ingredients: meal.ingredients ? 
        meal.ingredients.map((ing: any) => formatIngredient(ing, measurementSystem)) : 
        undefined,
      recipe: meal.recipe ? {
        ...meal.recipe,
        ingredients: meal.recipe.ingredients ? 
          meal.recipe.ingredients.map((ing: any) => formatIngredient(ing, measurementSystem)) : 
          meal.recipe.ingredients,
        ingredientLines: meal.recipe.ingredientLines ? 
          meal.recipe.ingredientLines.map((line: string) => convertServingSize(line, measurementSystem)) : 
          meal.recipe.ingredientLines
      } : meal.recipe
    }));
  }

  // If it's client data, format physical measurements
  if (formattedData.height_cm || formattedData.weight_kg || formattedData.heightCm || formattedData.weightKg) {
    const physicalMeasurements = formatPhysicalMeasurements(formattedData, measurementSystem);
    formattedData.physicalMeasurements = physicalMeasurements;
  }

  // If it's goals data, format goal ranges
  if (formattedData.eer_goal_calories || formattedData.eerGoalCalories) {
    const formattedGoals = formatGoals(formattedData, measurementSystem);
    formattedData.formattedGoals = formattedGoals;
  }

  // If it has direct nutrition data, format it
  if (formattedData.calories || formattedData.protein || formattedData.totalCalories) {
    formattedData.formattedNutrition = formatNutritionData(formattedData, measurementSystem);
  }

  return formattedData;
}
