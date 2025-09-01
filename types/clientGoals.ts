export interface ClientGoal {
  id: string;
  clientId: string;
  nutritionistId: string;
  
  // Energy Goals
  eerGoalCalories: number;
  bmrGoalCalories: number;
  
  // Macro Goals (grams)
  proteinGoalGrams: number;
  carbsGoalGrams: number;
  fatGoalGrams: number;
  
  // Macro Percentages
  proteinGoalPercentage: number;
  carbsGoalPercentage: number;
  fatGoalPercentage: number;
  
  // Additional Goals
  fiberGoalGrams?: number;
  waterGoalLiters?: number;
  
  // Goal Status
  isActive: boolean;
  goalStartDate: string;
  goalEndDate?: string;
  
  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateClientGoalRequest {
  clientId: string;
  eerGoalCalories: number;
  bmrGoalCalories: number;
  proteinGoalGrams: number;
  carbsGoalGrams: number;
  fatGoalGrams: number;
  proteinGoalPercentage: number;
  carbsGoalPercentage: number;
  fatGoalPercentage: number;
  fiberGoalGrams?: number;
  waterGoalLiters?: number;
  goalStartDate?: string;
  goalEndDate?: string;
  notes?: string;
}

export interface UpdateClientGoalRequest {
  eerGoalCalories?: number;
  bmrGoalCalories?: number;
  proteinGoalGrams?: number;
  carbsGoalGrams?: number;
  fatGoalGrams?: number;
  proteinGoalPercentage?: number;
  carbsGoalPercentage?: number;
  fatGoalPercentage?: number;
  fiberGoalGrams?: number;
  waterGoalLiters?: number;
  goalStartDate?: string;
  goalEndDate?: string;
  notes?: string;
}

export interface ClientGoalResponse {
  success: boolean;
  data?: ClientGoal;
  error?: string;
  message?: string;
}

export interface ClientGoalsResponse {
  success: boolean;
  data?: ClientGoal[];
  error?: string;
  message?: string;
}

// Validation helpers
export const validateMacroPercentages = (protein: number, carbs: number, fat: number): boolean => {
  const total = protein + carbs + fat;
  return Math.abs(total - 100) < 0.01; // Allow small floating point differences
};

export const calculateMacroGramsFromPercentages = (
  totalCalories: number,
  proteinPercentage: number,
  carbsPercentage: number,
  fatPercentage: number
): { protein: number; carbs: number; fat: number } => {
  return {
    protein: Math.round((totalCalories * proteinPercentage / 100) / 4), // 4 cal per gram
    carbs: Math.round((totalCalories * carbsPercentage / 100) / 4),   // 4 cal per gram
    fat: Math.round((totalCalories * fatPercentage / 100) / 9)        // 9 cal per gram
  };
};

export const calculateMacroPercentagesFromGrams = (
  proteinGrams: number,
  carbsGrams: number,
  fatGrams: number
): { protein: number; carbs: number; fat: number } => {
  const proteinCalories = proteinGrams * 4;
  const carbsCalories = carbsGrams * 4;
  const fatCalories = fatGrams * 9;
  const totalCalories = proteinCalories + carbsCalories + fatCalories;
  
  return {
    protein: Math.round((proteinCalories / totalCalories) * 100 * 100) / 100,
    carbs: Math.round((carbsCalories / totalCalories) * 100 * 100) / 100,
    fat: Math.round((fatCalories / totalCalories) * 100 * 100) / 100
  };
};
