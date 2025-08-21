import { supabase } from './supabase';

// Input interfaces
export interface EERCalculationInput {
  country: string;
  age: number;
  gender: 'male' | 'female';
  height_cm: number;
  weight_kg: number;
  activity_level: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  pregnancy_status?: 'not_pregnant' | 'first_trimester' | 'second_trimester' | 'third_trimester';
  lactation_status?: 'not_lactating' | 'lactating_0_6_months' | 'lactating_7_12_months';
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
  guideline_country: string; // Added to track which country's guideline was used
}

export interface MacrosCalculationResult {
  Protein: {
    min: number | null;
    max: number | null;
    unit: string;
    note: string;
  };
  Carbohydrates: {
    min: number | null;
    max: number | null;
    unit: string;
    note: string;
  };
  'Total Fat': {
    min: number | null;
    max: number | null;
    unit: string;
    note: string;
  };
  Fiber: {
    min: number | null;
    max: number | null;
    unit: string;
    note: string;
  };
  'Saturated Fat': {
    min: number | null;
    max: number | null;
    unit: string;
    note: string;
  };
  'Monounsaturated Fat': {
    min: number | null;
    max: number | null;
    unit: string;
    note: string;
  };
  'Polyunsaturated Fat': {
    min: number | null;
    max: number | null;
    unit: string;
    note: string;
  };
  'Omega-3 Fatty Acids': {
    min: number | null;
    max: number | null;
    unit: string;
    note: string;
  };
  Cholesterol: {
    min: number | null;
    max: number | null;
    unit: string;
    note: string;
  };
  guideline_country: string; // Added to track which country's guideline was used
  guideline_notes?: string; // Added to track any notes about guideline selection
}

// Calculate EER using database formulas
export async function calculateEER(input: EERCalculationInput): Promise<EERCalculationResult> {
  const { country, age, gender, height_cm, weight_kg, activity_level, pregnancy_status, lactation_status } = input;

  // Round age to nearest integer for database query since EER formulas use integer age ranges
  const roundedAge = Math.round(age);
  console.log(`🔢 Age rounding: ${age} → ${roundedAge} for database query`);

  // 1. Get EER formula
  const { data: formulas, error: formulaError } = await supabase
    .from('eer_formulas')
    .select('*')
    .eq('country', country)
    .eq('gender', gender)
    .lte('age_min', roundedAge)  // age_min <= roundedAge
    .gte('age_max', roundedAge)  // age_max >= roundedAge
    .order('age_min', { ascending: false })  // Prefer more specific age ranges (higher age_min)
    .limit(1);

  if (formulaError || !formulas || formulas.length === 0) {
    throw new Error(`No EER formula found for ${country}, ${gender}, age ${age} (rounded to ${roundedAge})`);
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

  // 5. Apply pregnancy and lactation adjustments (for females only) based on database values
  let adjustments: string[] = [];
  let totalAdjustment = 0;

  if (gender === 'female') {
    // Pregnancy adjustments (from database per country)
    if (pregnancy_status && pregnancy_status !== 'not_pregnant') {
      switch (pregnancy_status) {
        case 'first_trimester':
          // CSV shows no additional calories needed in first trimester
          break;
        case 'second_trimester':
          if (formula.pregnancy_second_trimester_kcal) {
            totalAdjustment += formula.pregnancy_second_trimester_kcal;
            adjustments.push(`+${formula.pregnancy_second_trimester_kcal} kcal (2nd trimester pregnancy)`);
          }
          break;
        case 'third_trimester':
          if (formula.pregnancy_third_trimester_kcal) {
            totalAdjustment += formula.pregnancy_third_trimester_kcal;
            adjustments.push(`+${formula.pregnancy_third_trimester_kcal} kcal (3rd trimester pregnancy)`);
          }
          break;
      }
    }

    // Lactation adjustments (from database per country)
    if (lactation_status && lactation_status !== 'not_lactating') {
      switch (lactation_status) {
        case 'lactating_0_6_months':
          if (formula.lactation_0_6_months_kcal) {
            totalAdjustment += formula.lactation_0_6_months_kcal;
            adjustments.push(`+${formula.lactation_0_6_months_kcal} kcal (lactation 0-6 months)`);
          }
          break;
        case 'lactating_7_12_months':
          if (formula.lactation_7_12_months_kcal) {
            totalAdjustment += formula.lactation_7_12_months_kcal;
            adjustments.push(`+${formula.lactation_7_12_months_kcal} kcal (lactation 7-12 months)`);
          }
          break;
      }
    }
  }

  const finalEER = eer + totalAdjustment;
  const adjustmentString = adjustments.length > 0 ? ` ${adjustments.join(', ')}` : '';

  return {
    bmr: Math.round(bmr),
    pal: pal,
    eer: Math.round(finalEER),
    formula_used: formula.bmr_formula + adjustmentString,
    input: input,
    guideline_country: country // Assuming the input country is the guideline country for EER
  };
}

// Calculate macros using database guidelines
export async function calculateMacros(input: MacrosCalculationInput): Promise<MacrosCalculationResult> {
  const { eer, country, age, gender, weight_kg } = input;

  // Round age to nearest integer for database query since macro guidelines use integer age ranges
  const roundedAge = Math.round(age);
  console.log(`🔢 Macro calculation age rounding: ${age} → ${roundedAge} for database query`);

  // Try to get macro guidelines for the requested country first
  let { data: guidelinesArray, error: guidelinesError } = await supabase
    .from('macro_guidelines')
    .select('*')
    .eq('country', country)
    .eq('gender', gender)
    .lte('age_min', roundedAge)
    .gte('age_max', roundedAge)
    .order('age_min', { ascending: false })  // Prefer more specific age ranges
    .limit(1);

  // If no guidelines found for the requested country, fallback to USA
  let effectiveCountry = country;
  if (guidelinesError || !guidelinesArray || guidelinesArray.length === 0) {
    console.log(`No macro guidelines found for ${country}, falling back to USA`);
    effectiveCountry = 'USA';
    
    const fallbackResult = await supabase
      .from('macro_guidelines')
      .select('*')
      .eq('country', 'USA')
      .eq('gender', gender)
      .lte('age_min', roundedAge)
      .gte('age_max', roundedAge)
      .order('age_min', { ascending: false })
      .limit(1);
    
    guidelinesArray = fallbackResult.data;
    guidelinesError = fallbackResult.error;
  }

  if (guidelinesError || !guidelinesArray || guidelinesArray.length === 0) {
    throw new Error(`No macro guidelines found for ${effectiveCountry}, ${gender}, age ${age}`);
  }

  const guidelines = guidelinesArray[0];

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
      min: proteinMinGrams !== null ? Math.round(proteinMinGrams * 10) / 10 : null,
      max: proteinMaxGrams !== null ? Math.round(proteinMaxGrams * 10) / 10 : null,
      unit: 'g',
      note: guidelines.protein_note || ''
    },
    Carbohydrates: {
      min: carbsMinGrams !== null ? Math.round(carbsMinGrams * 10) / 10 : null,
      max: carbsMaxGrams !== null ? Math.round(carbsMaxGrams * 10) / 10 : null,
      unit: 'g',
      note: guidelines.carbs_note || ''
    },
    'Total Fat': {
      min: fatMinGrams !== null ? Math.round(fatMinGrams * 10) / 10 : null,
      max: fatMaxGrams !== null ? Math.round(fatMaxGrams * 10) / 10 : null,
      unit: 'g',
      note: guidelines.fat_note || ''
    },
    Fiber: {
      min: fiberMinGrams !== null ? Math.round(fiberMinGrams * 10) / 10 : null,
      max: fiberMaxGrams !== null ? Math.round(fiberMaxGrams * 10) / 10 : null,
      unit: 'g',
      note: guidelines.fiber_note || ''
    },
    'Saturated Fat': {
      min: null,
      max: saturatedFatMaxGrams !== null ? Math.round(saturatedFatMaxGrams * 10) / 10 : null,
      unit: 'g',
      note: guidelines.saturated_fat_note || ''
    },
    'Monounsaturated Fat': {
      min: monoMinGrams !== null ? Math.round(monoMinGrams * 10) / 10 : null,
      max: monoMaxGrams !== null ? Math.round(monoMaxGrams * 10) / 10 : null,
      unit: 'g',
      note: guidelines.monounsaturated_fat_note || ''
    },
    'Polyunsaturated Fat': {
      min: polyMinGrams !== null ? Math.round(polyMinGrams * 10) / 10 : null,
      max: polyMaxGrams !== null ? Math.round(polyMaxGrams * 10) / 10 : null,
      unit: 'g',
      note: guidelines.polyunsaturated_fat_note || ''
    },
    'Omega-3 Fatty Acids': {
      min: omega3MinGrams !== null ? Math.round(omega3MinGrams * 10) / 10 : null,
      max: omega3MaxGrams !== null ? Math.round(omega3MaxGrams * 10) / 10 : null,
      unit: 'g',
      note: guidelines.omega3_note || ''
    },
    Cholesterol: {
      min: null,
      max: guidelines.cholesterol_max_mg !== null ? guidelines.cholesterol_max_mg : null,
      unit: 'mg',
      note: guidelines.cholesterol_note || ''
    },
    guideline_country: effectiveCountry, // Assuming the effective country is the guideline country for macros
    guideline_notes: guidelines.notes || undefined
  };
} 