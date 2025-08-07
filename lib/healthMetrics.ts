// Health metrics calculation utilities

export interface BMIResult {
  bmi: number;
  category: string;
  classification: string;
}

export interface HealthMetrics {
  bmi?: number;
  bmiCategory?: string;
  bmr?: number;
  bmiLastCalculated?: string;
  bmrLastCalculated?: string;
}

/**
 * Calculate BMI from height and weight
 */
export function calculateBMI(heightCm: number, weightKg: number): BMIResult {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) {
    throw new Error('Invalid height or weight provided');
  }

  // Convert height from cm to meters
  const heightM = heightCm / 100;
  
  // Calculate BMI: weight (kg) / height (m)²
  const bmi = weightKg / (heightM * heightM);
  
  // Determine BMI category according to WHO classification
  let category: string;
  let classification: string;
  
  if (bmi < 18.5) {
    category = 'underweight';
    classification = 'Underweight';
  } else if (bmi >= 18.5 && bmi < 25) {
    category = 'normal';
    classification = 'Normal weight';
  } else if (bmi >= 25 && bmi < 30) {
    category = 'overweight';
    classification = 'Overweight';
  } else if (bmi >= 30 && bmi < 35) {
    category = 'obese_class_1';
    classification = 'Obesity Class I';
  } else if (bmi >= 35 && bmi < 40) {
    category = 'obese_class_2';
    classification = 'Obesity Class II';
  } else {
    category = 'obese_class_3';
    classification = 'Obesity Class III';
  }

  return {
    bmi: Math.round(bmi * 100) / 100, // Round to 2 decimal places
    category,
    classification
  };
}

/**
 * Update client health metrics when height, weight, or EER changes
 */
export function calculateHealthMetrics(
  heightCm?: number, 
  weightKg?: number, 
  bmr?: number
): HealthMetrics {
  const metrics: HealthMetrics = {};
  const now = new Date().toISOString();

  // Calculate BMI if we have height and weight
  if (heightCm && weightKg) {
    try {
      const bmiResult = calculateBMI(heightCm, weightKg);
      metrics.bmi = bmiResult.bmi;
      metrics.bmiCategory = bmiResult.category;
      metrics.bmiLastCalculated = now;
    } catch (error) {
      console.warn('Failed to calculate BMI:', error);
    }
  }

  // Set BMR if provided (from EER calculation)
  if (bmr !== undefined && bmr > 0) {
    metrics.bmr = Math.round(bmr * 100) / 100; // Round to 2 decimal places
    metrics.bmrLastCalculated = now;
  }

  return metrics;
}

/**
 * Get BMI category description for display
 */
export function getBMICategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    underweight: 'Underweight (BMI < 18.5)',
    normal: 'Normal weight (BMI 18.5-24.9)',
    overweight: 'Overweight (BMI 25.0-29.9)',
    obese_class_1: 'Obesity Class I (BMI 30.0-34.9)',
    obese_class_2: 'Obesity Class II (BMI 35.0-39.9)',
    obese_class_3: 'Obesity Class III (BMI ≥ 40.0)'
  };
  
  return descriptions[category] || 'Unknown category';
}

/**
 * Check if health metrics need recalculation based on client data changes
 */
export function shouldRecalculateHealthMetrics(
  oldClient: any,
  newClient: any
): { recalculateBMI: boolean; recalculateBMR: boolean } {
  const heightChanged = oldClient?.height_cm !== newClient?.height_cm;
  const weightChanged = oldClient?.weight_kg !== newClient?.weight_kg;
  
  return {
    recalculateBMI: heightChanged || weightChanged,
    recalculateBMR: false // BMR will be updated when EER is recalculated
  };
} 