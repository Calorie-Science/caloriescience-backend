import { supabase } from './supabase';

// Input interfaces
export interface EERCalculationInput {
  country: string;
  age: number;
  gender: 'male' | 'female';
  height_cm: number;
  weight_kg: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
}

export interface MacrosCalculationInput {
  eer: number;
  country: string;
  age: number;
  gender: 'male' | 'female';
  weight_kg: number;
}

// Result interfaces
export interface EERCalculationResult {
  bmr: number;
  pal: number;
  eer: number;
  formula_used: string;
  input: EERCalculationInput;
}

export interface MacrosCalculationResult {
  Protein: {
    min_grams: number | null;
    max_grams: number | null;
    note: string;
  };
  Carbohydrates: {
    min_grams: number | null;
    max_grams: number | null;
    note: string;
  };
  'Total Fat': {
    min_grams: number | null;
    max_grams: number | null;
    note: string;
  };
  Fiber: {
    min_grams: number | null;
    max_grams: number | null;
    note: string;
  };
  'Saturated Fat': {
    min_grams: number | null;
    max_grams: number | null;
    note: string;
  };
  'Monounsaturated Fat': {
    min_grams: number | null;
    max_grams: number | null;
    note: string;
  };
  'Polyunsaturated Fat': {
    min_grams: number | null;
    max_grams: number | null;
    note: string;
  };
  'Omega-3 Fatty Acids': {
    min_grams: number | null;
    max_grams: number | null;
    note: string;
  };
  Cholesterol: {
    min_grams: number | null;
    max_grams: number | null;
    note: string;
  };
}

// Calculate EER using database formulas
export async function calculateEER(input: EERCalculationInput): Promise<EERCalculationResult> {
  const { country, age, gender, height_cm, weight_kg, activity_level } = input;

  // 1. Get EER formula
  const { data: formulas, error: formulaError } = await supabase
    .from('eer_formulas')
    .select('*')
    .eq('country', country)
    .eq('gender', gender)
    .lte('age_min', age)  // age_min <= age
    .gte('age_max', age)  // age_max >= age
    .order('age_min', { ascending: false })  // Prefer more specific age ranges (higher age_min)
    .limit(1);

  if (formulaError || !formulas || formulas.length === 0) {
    throw new Error(`No EER formula found for ${country}, ${gender}, age ${age}`);
  }

  const formula = formulas[0];

  // 2. Get PAL value
  const { data: palData, error: palError } = await supabase
    .from('pal_values')
    .select('pal_value')
    .eq('country', country)
    .eq('activity_level', activity_level)
    .single();

  if (palError || !palData) {
    throw new Error(`No PAL value found for ${country}, ${activity_level}`);
  }

  const pal = palData.pal_value;

  // 3. Calculate BMR using Harris-Benedict formula
  const bmr = formula.bmr_constant + 
    (formula.bmr_weight_coefficient * weight_kg) + 
    (formula.bmr_height_coefficient * height_cm) + 
    (formula.bmr_age_coefficient * age);

  // 4. Calculate EER using IOM formula
  const height_m = height_cm / 100;
  let eer: number;

  if (formula.eer_base !== null) {
    // Use IOM EER formula: EER = base - (age_coeff × age) + PAL × (weight_coeff × weight + height_coeff × height_m)
    eer = formula.eer_base + 
      (formula.eer_age_coefficient * age) + 
      (pal * ((formula.eer_weight_coefficient * weight_kg) + (formula.eer_height_coefficient * height_m)));
  } else {
    // Fallback to BMR × PAL
    eer = bmr * pal;
  }

  return {
    bmr: Math.round(bmr),
    pal: pal,
    eer: Math.round(eer),
    formula_used: formula.bmr_formula,
    input: input
  };
}

// Calculate macros using database guidelines
export async function calculateMacros(input: MacrosCalculationInput): Promise<MacrosCalculationResult> {
  const { eer, country, age, gender, weight_kg } = input;

  // Get macro guidelines
  const { data: guidelinesArray, error: guidelinesError } = await supabase
    .from('macro_guidelines')
    .select('*')
    .eq('country', country)
    .eq('gender', gender)
    .lte('age_min', age)
    .gte('age_max', age)
    .order('age_min', { ascending: false })  // Prefer more specific age ranges
    .limit(1);

  if (guidelinesError || !guidelinesArray || guidelinesArray.length === 0) {
    throw new Error(`No macro guidelines found for ${country}, ${gender}, age ${age}`);
  }

  const guidelines = guidelinesArray[0];

  // Debug: Log the guidelines data to see what we're getting
  console.log('Guidelines found:', JSON.stringify(guidelines, null, 2));

  // Calculate protein ranges from percentages only
  let proteinMinGrams: number | null = null;
  let proteinMaxGrams: number | null = null;
  
  if (guidelines.protein_min_percent !== null && guidelines.protein_max_percent !== null) {
    proteinMinGrams = (guidelines.protein_min_percent / 100 * eer) / 4;
    proteinMaxGrams = (guidelines.protein_max_percent / 100 * eer) / 4;
  }

  // Calculate carbs ranges from percentages
  let carbsMinGrams: number | null = null;
  let carbsMaxGrams: number | null = null;
  if (guidelines.carbs_min_percent !== null && guidelines.carbs_max_percent !== null) {
    carbsMinGrams = (guidelines.carbs_min_percent / 100 * eer) / 4;
    carbsMaxGrams = (guidelines.carbs_max_percent / 100 * eer) / 4;
  }

  // Calculate fat ranges from percentages
  let fatMinGrams: number | null = null;
  let fatMaxGrams: number | null = null;
  if (guidelines.fat_min_percent !== null && guidelines.fat_max_percent !== null) {
    fatMinGrams = (guidelines.fat_min_percent / 100 * eer) / 9;
    fatMaxGrams = (guidelines.fat_max_percent / 100 * eer) / 9;
  }

  // Calculate fiber - handle both per-1000-kcal and absolute values
  let fiberMinGrams: number | null = null;
  let fiberMaxGrams: number | null = null;
  
  if (guidelines.fiber_per_1000_kcal !== null) {
    // USA: 14 g/1000 kcal
    const fiberGrams = (guidelines.fiber_per_1000_kcal * eer) / 1000;
    fiberMinGrams = fiberGrams;
    fiberMaxGrams = fiberGrams;
  } else if (guidelines.fiber_absolute_min !== null && guidelines.fiber_absolute_max !== null) {
    // EU: 25-30 g/day, AU/NZ & UK: 30 g/day
    fiberMinGrams = guidelines.fiber_absolute_min;
    fiberMaxGrams = guidelines.fiber_absolute_max;
  }

  // Calculate saturated fat max from percentage
  let saturatedFatMaxGrams: number | null = null;
  if (guidelines.saturated_fat_max_percent !== null) {
    saturatedFatMaxGrams = (guidelines.saturated_fat_max_percent / 100 * eer) / 9;
  }

  // Calculate monounsaturated fat from percentage
  let monoMinGrams: number | null = null;
  let monoMaxGrams: number | null = null;
  if (guidelines.monounsaturated_fat_min_percent !== null && guidelines.monounsaturated_fat_max_percent !== null) {
    monoMinGrams = (guidelines.monounsaturated_fat_min_percent / 100 * eer) / 9;
    monoMaxGrams = (guidelines.monounsaturated_fat_max_percent / 100 * eer) / 9;
  }

  // Calculate polyunsaturated fat from percentage
  let polyMinGrams: number | null = null;
  let polyMaxGrams: number | null = null;
  if (guidelines.polyunsaturated_fat_min_percent !== null && guidelines.polyunsaturated_fat_max_percent !== null) {
    polyMinGrams = (guidelines.polyunsaturated_fat_min_percent / 100 * eer) / 9;
    polyMaxGrams = (guidelines.polyunsaturated_fat_max_percent / 100 * eer) / 9;
  }

  // Calculate omega-3 from percentage
  let omega3MinGrams: number | null = null;
  let omega3MaxGrams: number | null = null;
  if (guidelines.omega3_min_percent !== null && guidelines.omega3_max_percent !== null) {
    omega3MinGrams = (guidelines.omega3_min_percent / 100 * eer) / 9; // Fat calories
    omega3MaxGrams = (guidelines.omega3_max_percent / 100 * eer) / 9;
  }

  // Convert cholesterol from mg to grams - only if there's a specific limit
  let cholesterolMaxGrams: number | null = null;
  if (guidelines.cholesterol_max_mg !== null) {
    cholesterolMaxGrams = guidelines.cholesterol_max_mg / 1000;
  }

  return {
    Protein: {
      min_grams: proteinMinGrams !== null ? Math.round(proteinMinGrams * 10) / 10 : null,
      max_grams: proteinMaxGrams !== null ? Math.round(proteinMaxGrams * 10) / 10 : null,
      note: guidelines.protein_note || ''
    },
    Carbohydrates: {
      min_grams: carbsMinGrams !== null ? Math.round(carbsMinGrams * 10) / 10 : null,
      max_grams: carbsMaxGrams !== null ? Math.round(carbsMaxGrams * 10) / 10 : null,
      note: guidelines.carbs_note || ''
    },
    'Total Fat': {
      min_grams: fatMinGrams !== null ? Math.round(fatMinGrams * 10) / 10 : null,
      max_grams: fatMaxGrams !== null ? Math.round(fatMaxGrams * 10) / 10 : null,
      note: guidelines.fat_note || ''
    },
    Fiber: {
      min_grams: fiberMinGrams !== null ? Math.round(fiberMinGrams * 10) / 10 : null,
      max_grams: fiberMaxGrams !== null ? Math.round(fiberMaxGrams * 10) / 10 : null,
      note: guidelines.fiber_note || ''
    },
    'Saturated Fat': {
      min_grams: null,
      max_grams: saturatedFatMaxGrams !== null ? Math.round(saturatedFatMaxGrams * 10) / 10 : null,
      note: guidelines.saturated_fat_note || ''
    },
    'Monounsaturated Fat': {
      min_grams: monoMinGrams !== null ? Math.round(monoMinGrams * 10) / 10 : null,
      max_grams: monoMaxGrams !== null ? Math.round(monoMaxGrams * 10) / 10 : null,
      note: guidelines.monounsaturated_fat_note || 'No specific recommendations'
    },
    'Polyunsaturated Fat': {
      min_grams: polyMinGrams !== null ? Math.round(polyMinGrams * 10) / 10 : null,
      max_grams: polyMaxGrams !== null ? Math.round(polyMaxGrams * 10) / 10 : null,
      note: guidelines.polyunsaturated_fat_note || 'No specific recommendations'
    },
    'Omega-3 Fatty Acids': {
      min_grams: omega3MinGrams !== null ? Math.round(omega3MinGrams * 10) / 10 : null,
      max_grams: omega3MaxGrams !== null ? Math.round(omega3MaxGrams * 10) / 10 : null,
      note: guidelines.omega3_note || ''
    },
    Cholesterol: {
      min_grams: null,
      max_grams: cholesterolMaxGrams !== null ? Math.round(cholesterolMaxGrams * 1000) / 1000 : null,
      note: guidelines.cholesterol_note || ''
    }
  };
} 