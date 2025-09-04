export interface ClientGoal {
  id: string;
  clientId: string;
  nutritionistId: string;
  
  // Energy Goals
  eerGoalCalories: number;
  
  // Macro Goals (min/max ranges in grams)
  proteinGoalMin: number;
  proteinGoalMax: number;
  carbsGoalMin: number;
  carbsGoalMax: number;
  fatGoalMin: number;
  fatGoalMax: number;
  
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
  proteinGoalMin: number;
  proteinGoalMax: number;
  carbsGoalMin: number;
  carbsGoalMax: number;
  fatGoalMin: number;
  fatGoalMax: number;
  fiberGoalGrams?: number;
  waterGoalLiters?: number;
  goalStartDate?: string;
  goalEndDate?: string;
  notes?: string;
}

export interface UpdateClientGoalRequest {
  eerGoalCalories?: number;
  proteinGoalMin?: number;
  proteinGoalMax?: number;
  carbsGoalMin?: number;
  carbsGoalMax?: number;
  fatGoalMin?: number;
  fatGoalMax?: number;
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
export const validateMacroRanges = (
  proteinMin: number, proteinMax: number,
  carbsMin: number, carbsMax: number,
  fatMin: number, fatMax: number
): boolean => {
  // Check that min values are less than max values
  if (proteinMin >= proteinMax || carbsMin >= carbsMax || fatMin >= fatMax) {
    return false;
  }
  
  // Check that all values are positive
  if (proteinMin <= 0 || proteinMax <= 0 || carbsMin <= 0 || carbsMax <= 0 || fatMin <= 0 || fatMax <= 0) {
    return false;
  }
  
  return true;
};

export const calculateMacroCaloriesFromGrams = (
  proteinGrams: number,
  carbsGrams: number,
  fatGrams: number
): { protein: number; carbs: number; fat: number; total: number } => {
  const proteinCalories = proteinGrams * 4; // 4 cal per gram
  const carbsCalories = carbsGrams * 4;     // 4 cal per gram
  const fatCalories = fatGrams * 9;         // 9 cal per gram
  const totalCalories = proteinCalories + carbsCalories + fatCalories;
  
  return {
    protein: proteinCalories,
    carbs: carbsCalories,
    fat: fatCalories,
    total: totalCalories
  };
};

export const calculateMacroGramsFromCalories = (
  proteinCalories: number,
  carbsCalories: number,
  fatCalories: number
): { protein: number; carbs: number; fat: number } => {
  return {
    protein: Math.round(proteinCalories / 4), // 4 cal per gram
    carbs: Math.round(carbsCalories / 4),     // 4 cal per gram
    fat: Math.round(fatCalories / 9)          // 9 cal per gram
  };
};
