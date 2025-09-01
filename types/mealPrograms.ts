export interface MealProgram {
  id: string;
  clientId: string;
  nutritionistId: string;
  name: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  meals: MealProgramMeal[];
}

export interface MealProgramMeal {
  id: string;
  mealProgramId: string;
  mealOrder: number;
  mealName: string;
  mealTime: string; // 24-hour format (HH:MM)
  targetCalories?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  createdAt: string;
  updatedAt: string;
}

export interface CreateMealProgramRequest {
  clientId: string;
  name: string;
  description?: string;
  meals: CreateMealProgramMealRequest[];
}

export interface CreateMealProgramMealRequest {
  mealOrder: number;
  mealName: string;
  mealTime: string; // 24-hour format (HH:MM)
  targetCalories?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface UpdateMealProgramRequest {
  name?: string;
  description?: string;
  meals?: UpdateMealProgramMealRequest[];
}

export interface UpdateMealProgramMealRequest {
  id?: string; // If updating existing meal
  mealOrder: number;
  mealName: string;
  mealTime: string; // 24-hour format (HH:MM)
  targetCalories?: number;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack';
}

export interface MealProgramResponse {
  success: boolean;
  data?: MealProgram;
  error?: string;
  message?: string;
}

export interface MealProgramsResponse {
  success: boolean;
  data?: MealProgram[];
  error?: string;
  message?: string;
}

// Predefined meal type suggestions
export const PREDEFINED_MEAL_NAMES = [
  'Pre-Breakfast Snack',
  'Breakfast',
  'Morning Snack',
  'Lunch',
  'Afternoon Snack',
  'Dinner',
  'Evening Snack',
  'Pre-Bed Snack',
  'Post-Workout',
  'Mid-Morning',
  'Tea Time',
  'Late Night'
] as const;

export type PredefinedMealName = typeof PREDEFINED_MEAL_NAMES[number];

// Time validation helper
export const isValidTimeFormat = (time: string): boolean => {
  const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return timeRegex.test(time);
};

// Time formatting helper
export const formatTimeForDisplay = (time: string): string => {
  if (!isValidTimeFormat(time)) return time;
  
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${displayHour}:${minutes} ${ampm}`;
};

// Convert 24-hour to 12-hour format
export const convertTo12Hour = (time: string): string => {
  if (!isValidTimeFormat(time)) return time;
  
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  
  return `${displayHour}:${minutes} ${ampm}`;
};

// Convert 12-hour to 24-hour format
export const convertTo24Hour = (time: string): string => {
  const timeRegex = /^(\d{1,2}):(\d{2})\s?(AM|PM|am|pm)$/;
  const match = time.match(timeRegex);
  
  if (!match) return time;
  
  let [_, hours, minutes, period] = match;
  let hour = parseInt(hours);
  
  if (period.toUpperCase() === 'PM' && hour !== 12) {
    hour += 12;
  } else if (period.toUpperCase() === 'AM' && hour === 12) {
    hour = 0;
  }
  
  return `${hour.toString().padStart(2, '0')}:${minutes}`;
};
