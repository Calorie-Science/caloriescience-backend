// Micronutrient calculation logic using database-driven guidelines

import { supabase } from './supabase';
import { getEERGuidelineFromLocation } from './locationMapping';

export interface MicronutrientCalculationInput {
  location: string;
  age: number;
  gender: 'male' | 'female';
}

export interface MicronutrientRecommendations {
  // Vitamins
  vitaminA: { amount: number; unit: 'mcg'; name: 'Vitamin A' };
  thiamin: { amount: number; unit: 'mg'; name: 'Thiamin (B1)' };
  riboflavin: { amount: number; unit: 'mg'; name: 'Riboflavin (B2)' };
  niacinEquivalent: { amount: number; unit: 'mg'; name: 'Niacin Equivalent' };
  pantothenicAcid: { amount: number; unit: 'mg'; name: 'Pantothenic Acid (B5)' };
  vitaminB6: { amount: number; unit: 'mg'; name: 'Vitamin B6' };
  biotin: { amount: number; unit: 'mcg'; name: 'Biotin (B7)' };
  vitaminB12: { amount: number; unit: 'mcg'; name: 'Vitamin B12' };
  folate: { amount: number; unit: 'mcg'; name: 'Folate' };
  vitaminC: { amount: number; unit: 'mg'; name: 'Vitamin C' };
  vitaminD: { amount: number; unit: 'mcg'; name: 'Vitamin D' };
  
  // Minerals
  iron: { amount: number; unit: 'mg'; name: 'Iron' };
  calcium: { amount: number; unit: 'mg'; name: 'Calcium' };
  magnesium: { amount: number; unit: 'mg'; name: 'Magnesium' };
  potassium: { amount: number; unit: 'mg'; name: 'Potassium' };
  zinc: { amount: number; unit: 'mg'; name: 'Zinc' };
  copper: { amount: number; unit: 'mg'; name: 'Copper' };
  iodine: { amount: number; unit: 'mcg'; name: 'Iodine' };
  selenium: { amount: number; unit: 'mcg'; name: 'Selenium' };
  phosphorus: { amount: number; unit: 'mg'; name: 'Phosphorus' };
  chloride: { amount: number; unit: 'mg'; name: 'Chloride' };
  sodium: { amount: number; unit: 'g'; name: 'Sodium' };
}

export interface MicronutrientCalculationResult {
  micronutrients: MicronutrientRecommendations;
  guideline_used: string;
  source: string;
  notes: string;
  age_group: string;
}

/**
 * Calculate micronutrient recommendations based on location, age, and gender
 */
export async function calculateMicronutrients(
  input: MicronutrientCalculationInput
): Promise<MicronutrientCalculationResult> {
  try {
    // Determine guideline from location
    const guideline = getEERGuidelineFromLocation(input.location);
    
    // Only UK has complete micronutrient data, so default all other countries to UK
    const effectiveGuideline = guideline === 'UK' ? 'UK' : 'UK';
    
    // Find the appropriate guideline entry for the age/gender combination
    // Prioritize records with complete vitamin A data over incomplete records
    const { data: guidelines, error } = await supabase
      .from('micronutrient_guidelines_flexible')  // Changed to correct table name
      .select('*')
      .eq('country', effectiveGuideline)
      .eq('gender', input.gender)
      .lte('age_min', input.age)
      .gte('age_max', input.age)
      .not('vitamin_a_mcg', 'is', null)  // Prioritize complete records with vitamin A data
      .order('age_min', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching micronutrient guidelines:', error);
      throw new Error('Failed to fetch micronutrient guidelines');
    }

    if (!guidelines || guidelines.length === 0) {
      throw new Error(`No micronutrient guidelines found for ${effectiveGuideline}, ${input.gender}, age ${input.age}`);
    }

    const guideline_data = guidelines[0];

    // Build micronutrient recommendations
    const micronutrients: MicronutrientRecommendations = {
      // Vitamins
      vitaminA: { 
        amount: parseFloat(guideline_data.vitamin_a_mcg?.toString() || '0'),
        unit: 'mcg',
        name: 'Vitamin A'
      },
      thiamin: { 
        amount: parseFloat(guideline_data.thiamin_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Thiamin (B1)'
      },
      riboflavin: { 
        amount: parseFloat(guideline_data.riboflavin_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Riboflavin (B2)'
      },
      niacinEquivalent: { 
        amount: parseFloat(guideline_data.niacin_equivalent_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Niacin Equivalent'
      },
      pantothenicAcid: { 
        amount: parseFloat(guideline_data.pantothenic_acid_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Pantothenic Acid (B5)'
      },
      vitaminB6: { 
        amount: parseFloat(guideline_data.vitamin_b6_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Vitamin B6'
      },
      biotin: { 
        amount: parseFloat(guideline_data.biotin_mcg?.toString() || '0'),
        unit: 'mcg',
        name: 'Biotin (B7)'
      },
      vitaminB12: { 
        amount: parseFloat(guideline_data.vitamin_b12_mcg?.toString() || '0'),
        unit: 'mcg',
        name: 'Vitamin B12'
      },
      folate: { 
        amount: parseFloat(guideline_data.folate_mcg?.toString() || '0'),
        unit: 'mcg',
        name: 'Folate'
      },
      vitaminC: { 
        amount: parseFloat(guideline_data.vitamin_c_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Vitamin C'
      },
      vitaminD: { 
        amount: parseFloat(guideline_data.vitamin_d_mcg?.toString() || '0'),
        unit: 'mcg',
        name: 'Vitamin D'
      },

      // Minerals
      iron: { 
        amount: parseFloat(guideline_data.iron_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Iron'
      },
      calcium: { 
        amount: parseFloat(guideline_data.calcium_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Calcium'
      },
      magnesium: { 
        amount: parseFloat(guideline_data.magnesium_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Magnesium'
      },
      potassium: { 
        amount: parseFloat(guideline_data.potassium_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Potassium'
      },
      zinc: { 
        amount: parseFloat(guideline_data.zinc_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Zinc'
      },
      copper: { 
        amount: parseFloat(guideline_data.copper_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Copper'
      },
      iodine: { 
        amount: parseFloat(guideline_data.iodine_mcg?.toString() || '0'),
        unit: 'mcg',
        name: 'Iodine'
      },
      selenium: { 
        amount: parseFloat(guideline_data.selenium_mcg?.toString() || '0'),
        unit: 'mcg',
        name: 'Selenium'
      },
      phosphorus: { 
        amount: parseFloat(guideline_data.phosphorus_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Phosphorus'
      },
      chloride: { 
        amount: parseFloat(guideline_data.chloride_mg?.toString() || '0'),
        unit: 'mg',
        name: 'Chloride'
      },
      sodium: { 
        amount: parseFloat(guideline_data.sodium_g?.toString() || '0'),
        unit: 'g',
        name: 'Sodium'
      }
    };

    const age_group = `${guideline_data.age_min}-${guideline_data.age_max} years`;

    return {
      micronutrients,
      guideline_used: effectiveGuideline,
      source: guideline_data.source || 'Government Guidelines',
      notes: guideline_data.notes || '',
      age_group
    };

  } catch (error) {
    console.error('Micronutrient calculation error:', error);
    throw error;
  }
} 