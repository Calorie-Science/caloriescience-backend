import { SupabaseClient } from '@supabase/supabase-js';
import { 
  MicronutrientGuidelines, 
  ClientMicronutrientRequirements,
  NutrientValue,
  getPrimaryValue,
  getUpperLimit,
  getLowerLimit,
  MICRONUTRIENT_KEYS
} from '../types/micronutrients';
import { getCountryGuidelineSource, getCountryGuidelineType } from './countryMicronutrientMapping';

export class FlexibleMicronutrientService {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Get micronutrient guidelines for a specific demographic using country name
   */
  async getGuidelinesByCountryName(
    countryName: string,
    gender: 'male' | 'female',
    age: number,
    pregnancy?: boolean,
    lactation?: boolean,
    activityLevel?: string
  ): Promise<MicronutrientGuidelines | null> {
    // Map country name to guideline source
    const guidelineSource = getCountryGuidelineSource(countryName);
    return this.getGuidelines(guidelineSource, gender, age, pregnancy, lactation, activityLevel);
  }

  /**
   * Get micronutrient guidelines for a specific demographic
   */
  async getGuidelines(
    country: 'uk' | 'us' | 'india' | 'eu' | 'who',
    gender: 'male' | 'female',
    age: number,
    pregnancy?: boolean,
    lactation?: boolean,
    activityLevel?: string
  ): Promise<MicronutrientGuidelines | null> {
    // Round to float4 precision (6 decimal places) to match database data type
    const clientAge = Math.round(parseFloat(age.toString()) * 1000000) / 1000000;
    
    console.log(`🔍 Starting micronutrient guideline search for:`, {
      country,
      gender,
      age: age, // Original float age for logging
      clientAge: clientAge, // Rounded to float4 precision (6 decimals) for database query
      pregnancy,
      lactation,
      activityLevel
    });
    
    // HIGHEST PRIORITY: Pregnancy/Lactation specific guidelines
    if (gender === 'female' && (pregnancy || lactation)) {
      const condition = pregnancy ? 'pregnancy' : 'lactation';
      console.log(`🔴 HIGH PRIORITY: Looking for ${condition} guidelines for ${gender}, age ${clientAge}, country ${country}`);
      
      const query = this.supabase
        .from('micronutrient_guidelines_flexible')
        .select('*')
        .eq('country', country)
        .eq('gender', gender)
        .lte('age_min', clientAge)
        .gte('age_max', clientAge)
        .ilike('notes', `%${condition}%`);
      
      console.log(`🔍 Query params: country=${country}, gender=${gender}, age_min<=${clientAge}, age_max>=${clientAge}, notes like %${condition}%`);
      
      const { data, error } = await query.limit(1).single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
        console.error('Error fetching pregnancy/lactation guidelines:', error);
        throw error;
      }
      
      if (data) {
        console.log(`✅ Found ${condition} guidelines for ${gender}, age ${clientAge}:`, { id: data.id, age_range: `${data.age_min}-${data.age_max}`, notes: data.notes });
        return data;
      }
      
      console.log(`⚠️ No specific ${condition} guidelines found, falling back to regular guidelines`);
    }

    // SECOND PRIORITY: Gender-specific guidelines (no pregnancy/lactation notes)
    console.log(`🟡 SECOND PRIORITY: Looking for gender-specific guidelines for ${gender}, age ${clientAge}, country ${country}`);
    
    const query2 = this.supabase
      .from('micronutrient_guidelines_flexible')
      .select('*')
      .eq('country', country)
      .eq('gender', gender)
      .lte('age_min', clientAge)
      .gte('age_max', clientAge)
      .is('notes', null); // Exclude specific notes like pregnancy/lactation
    
    console.log(`🔍 Query params: country=${country}, gender=${gender}, age_min<=${clientAge}, age_max>=${clientAge}, notes IS NULL`);
    
    // Add raw query logging to debug
    console.log(`🔍 Raw query: SELECT * FROM micronutrient_guidelines_flexible WHERE country='${country}' AND gender='${gender}' AND age_min<=${clientAge} AND age_max>=${clientAge} AND notes IS NULL`);
    
    let { data, error } = await query2.limit(1).single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching gender-specific guidelines:', error);
      throw error;
    }
    
    if (data) {
      console.log(`✅ Found gender-specific guidelines for ${gender}, age ${clientAge}:`, { id: data.id, age_range: `${data.age_min}-${data.age_max}`, notes: data.notes });
      return data;
    }
    
    console.log(`⚠️ No gender-specific guidelines found for ${gender}, age ${clientAge}, country ${country}`);
    console.log(`🔍 Database response: data=${JSON.stringify(data)}, error=${JSON.stringify(error)}`);

    // THIRD PRIORITY: Common gender guidelines (no pregnancy/lactation notes)
    console.log(`🟢 THIRD PRIORITY: Looking for common gender guidelines for age ${clientAge}, country ${country}`);
    
    const query3 = this.supabase
      .from('micronutrient_guidelines_flexible')
      .select('*')
      .eq('country', country)
      .eq('gender', 'common')
      .lte('age_min', clientAge)
      .gte('age_max', clientAge)
      .is('notes', null);
    
    console.log(`🔍 Query params: country=${country}, gender=common, age_min<=${clientAge}, age_max>=${clientAge}, notes IS NULL`);
    
    ({ data, error } = await query3.limit(1).single());

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching common guidelines:', error);
      throw error;
    }
    
    if (data) {
      console.log(`✅ Found common gender guidelines for age ${clientAge}:`, { id: data.id, age_range: `${data.age_min}-${data.age_max}`, notes: data.notes });
      return data;
    }
    
    console.log(`⚠️ No common gender guidelines found for age ${clientAge}, country ${country}`);

    // FOURTH PRIORITY: Gender-specific guidelines with any notes (excluding pregnancy/lactation already handled)
    console.log(`🔵 FOURTH PRIORITY: Looking for gender-specific guidelines with notes for ${gender}, age ${clientAge}, country ${country}`);
    
    // Try to match activity level first
    let query4 = this.supabase
      .from('micronutrient_guidelines_flexible')
      .select('*')
      .eq('country', country)
      .eq('gender', gender)
      .lte('age_min', clientAge)
      .gte('age_max', clientAge)
      .not('notes', 'ilike', '%pregnancy%')
      .not('notes', 'ilike', '%lactation%');
    
    // If we have activity level info, try to match it, but don't require it
    if (activityLevel) {
      console.log(`🔍 Trying to match activity level: ${activityLevel}`);
      
      // Create a backup query without activity level restriction
      const backupQuery = this.supabase
        .from('micronutrient_guidelines_flexible')
        .select('*')
        .eq('country', country)
        .eq('gender', gender)
        .lte('age_min', clientAge)
        .gte('age_max', clientAge)
        .not('notes', 'ilike', '%pregnancy%')
        .not('notes', 'ilike', '%lactation%');
      
      // Try with activity level first
      if (activityLevel === 'moderately_active') {
        query4 = query4.ilike('notes', '%moderate%');
      } else if (activityLevel === 'very_active') {
        query4 = query4.ilike('notes', '%heavy%');
      } else if (activityLevel === 'sedentary') {
        query4 = query4.ilike('notes', '%sedentary%');
      }
      
      // Try the activity-specific query first
      let { data: activityData, error: activityError } = await query4.limit(1).single();
      
      if (activityData) {
        console.log(`✅ Found guidelines matching activity level ${activityLevel} for ${gender}, age ${clientAge}:`, { id: activityData.id, age_range: `${activityData.age_min}-${activityData.age_max}`, notes: activityData.notes });
        return activityData;
      }
      
      // If no activity-specific match, try the backup query
      console.log(`⚠️ No activity-specific guidelines found, trying general guidelines`);
      const { data: backupData, error: backupError } = await backupQuery.limit(1).single();
      
      if (backupData) {
        console.log(`✅ Found general guidelines for ${gender}, age ${clientAge}:`, { id: backupData.id, age_range: `${backupData.age_min}-${backupData.age_max}`, notes: backupData.notes });
        return backupData;
      }
      
      if (backupError && backupError.code !== 'PGRST116') {
        console.error('Error fetching backup guidelines:', backupError);
        throw backupError;
      }
    }
    
    // If no activity level or no activity-specific match, try the general query
    if (!activityLevel) {
      console.log(`🔍 Query params: country=${country}, gender=${gender}, age_min<=${clientAge}, age_max>=${clientAge}, notes NOT LIKE %pregnancy% AND NOT LIKE %lactation%`);
      
      ({ data, error } = await query4.limit(1).single());

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching gender-specific guidelines with notes:', error);
        throw error;
      }
      
      if (data) {
        console.log(`✅ Found gender-specific guidelines with notes for ${gender}, age ${clientAge}:`, { id: data.id, age_range: `${data.age_min}-${data.age_max}`, notes: data.notes });
        return data;
      }
    }
    
    console.log(`⚠️ No gender-specific guidelines with notes found for ${gender}, age ${clientAge}, country ${country}`);

    // FIFTH PRIORITY: Common gender guidelines with any notes (excluding pregnancy/lactation already handled)
    console.log(`🟣 FIFTH PRIORITY: Looking for common gender guidelines with notes for age ${clientAge}, country ${country}`);
    
    const query5 = this.supabase
      .from('micronutrient_guidelines_flexible')
      .select('*')
      .eq('country', country)
      .eq('gender', 'common')
      .lte('age_min', clientAge)
      .gte('age_max', clientAge)
      .not('notes', 'ilike', '%pregnancy%')
      .not('notes', 'ilike', '%lactation%');
    
    console.log(`🔍 Query params: country=${country}, gender=common, age_min<=${clientAge}, age_max>=${clientAge}, notes NOT LIKE %pregnancy% AND NOT LIKE %lactation%`);
    
    ({ data, error } = await query5.limit(1).single());

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching common guidelines with notes:', error);
      throw error;
    }
    
    if (data) {
      console.log(`✅ Found common gender guidelines with notes for age ${clientAge}:`, { id: data.id, age_range: `${data.age_min}-${data.age_max}`, notes: data.notes });
      return data;
    }
    
    console.log(`⚠️ No common gender guidelines with notes found for age ${clientAge}, country ${country}`);

    console.log(`❌ No guidelines found for ${gender}, age ${clientAge}, country ${country}`);
    return null;
  }

  /**
   * Calculate micronutrient requirements for a client using country name
   */
  async calculateClientRequirementsByCountryName(
    clientId: string,
    countryName: string,
    gender: 'male' | 'female',
    age: number,
    adjustmentFactors?: {
      pregnancy?: boolean;
      lactation?: boolean;
      activityLevel?: 'sedentary' | 'moderate' | 'active' | 'very_active';
      healthConditions?: string[];
    }
  ): Promise<ClientMicronutrientRequirements | null> {
    // Map country name to guideline source
    const guidelineSource = getCountryGuidelineSource(countryName);
    return this.calculateClientRequirements(
      clientId, guidelineSource, gender, age, adjustmentFactors
    );
  }

  /**
   * Calculate micronutrient requirements for a client
   */
  async calculateClientRequirements(
    clientId: string,
    country: 'uk' | 'us' | 'india' | 'eu' | 'who',
    gender: 'male' | 'female',
    age: number,
    adjustmentFactors?: {
      pregnancy?: boolean;
      lactation?: boolean;
      activityLevel?: 'sedentary' | 'moderate' | 'active' | 'very_active';
      healthConditions?: string[];
    }
  ): Promise<ClientMicronutrientRequirements | null> {
    // Get base guidelines - now including pregnancy/lactation specific ones
    const guidelines = await this.getGuidelines(
      country, 
      gender, 
      age,
      adjustmentFactors?.pregnancy,
      adjustmentFactors?.lactation,
      adjustmentFactors?.activityLevel
    );
    if (!guidelines) return null;

    // Check if we got specific pregnancy/lactation guidelines or regular ones
    const hasSpecificGuidelines = guidelines.notes && 
      (guidelines.notes.includes('Pregnancy') || guidelines.notes.includes('Lactation'));

    // Apply adjustments based on activity level and health conditions
    // For UK or when specific guidelines aren't found, also apply pregnancy/lactation adjustments
    const adjustedMicronutrients = this.applyAdjustments(
      guidelines.micronutrients,
      country,
      {
        // Only apply pregnancy/lactation adjustments if we didn't get specific guidelines
        pregnancy: hasSpecificGuidelines ? undefined : adjustmentFactors?.pregnancy,
        lactation: hasSpecificGuidelines ? undefined : adjustmentFactors?.lactation,
        activityLevel: adjustmentFactors?.activityLevel,
        healthConditions: adjustmentFactors?.healthConditions
      }
    );

    // Create client requirements record
    const requirements: ClientMicronutrientRequirements = {
      client_id: clientId,
      micronutrient_recommendations: adjustedMicronutrients,
      country_guideline: country,
      guideline_type: guidelines.guideline_type,
      calculation_method: 'standard',
      calculation_factors: adjustmentFactors,
      is_ai_generated: false,
      is_active: true
    };

    return requirements;
  }

  /**
   * Apply adjustments to base micronutrient values
   */
  private applyAdjustments(
    baseMicronutrients: Record<string, NutrientValue>,
    country: 'uk' | 'us' | 'india' | 'eu' | 'who',
    factors?: {
      pregnancy?: boolean;
      lactation?: boolean;
      activityLevel?: string;
      healthConditions?: string[];
    }
  ): Record<string, NutrientValue> {
    // Deep clone the base values
    const adjusted = JSON.parse(JSON.stringify(baseMicronutrients));

    if (!factors) return adjusted;

    // Activity level adjustments (mainly affects B vitamins)
    if (factors.activityLevel && factors.activityLevel !== 'sedentary') {
      this.adjustForActivity(adjusted, country, factors.activityLevel);
    }

    // Pregnancy-specific adjustments
    if (factors.pregnancy) {
      this.adjustForPregnancy(adjusted, country);
    }

    // Lactation-specific adjustments
    if (factors.lactation) {
      this.adjustForLactation(adjusted, country);
    }

    return adjusted;
  }

  /**
   * Update the primary value for a nutrient based on country
   */
  private updatePrimaryValue(
    nutrient: NutrientValue,
    country: 'uk' | 'us' | 'india' | 'eu' | 'who',
    newValue: number
  ): void {
    if (country === 'uk') {
      (nutrient as any).rni = newValue;
    } else if (country === 'eu') {
      // For EU, update PRI if it exists, otherwise AI
      if ('pri' in nutrient && nutrient.pri !== null && nutrient.pri !== undefined) {
        (nutrient as any).pri = newValue;
      } else if ('ai' in nutrient) {
        (nutrient as any).ai = newValue;
      }
    } else if (country === 'who') {
      // For WHO, update RNI if it exists, otherwise AI
      if ('rni' in nutrient && nutrient.rni !== null && nutrient.rni !== undefined) {
        (nutrient as any).rni = newValue;
      } else if ('ai' in nutrient) {
        (nutrient as any).ai = newValue;
      }
    } else {
      (nutrient as any).rda = newValue;
    }
  }

  /**
   * Pregnancy-specific adjustments
   */
  private adjustForPregnancy(
    micronutrients: Record<string, NutrientValue>,
    country: 'uk' | 'us' | 'india' | 'eu' | 'who'
  ): void {
    // These adjustments are based on typical increases during pregnancy
    const adjustments = {
      [MICRONUTRIENT_KEYS.FOLATE]: 1.5,        // 50% increase (critical for neural tube development)
      [MICRONUTRIENT_KEYS.IRON]: 1.5,          // 50% increase
      [MICRONUTRIENT_KEYS.VITAMIN_D]: 1.0,     // No change (already adequate in base)
      [MICRONUTRIENT_KEYS.VITAMIN_C]: 1.1,     // 10% increase
      [MICRONUTRIENT_KEYS.CALCIUM]: 1.0,       // No change (body adapts absorption)
      [MICRONUTRIENT_KEYS.IODINE]: 1.5,        // 50% increase
      [MICRONUTRIENT_KEYS.VITAMIN_B12]: 1.1,   // 10% increase
      [MICRONUTRIENT_KEYS.ZINC]: 1.2,          // 20% increase
      [MICRONUTRIENT_KEYS.VITAMIN_A]: 1.1,     // 10% increase
      [MICRONUTRIENT_KEYS.THIAMIN]: 1.2,       // 20% increase
      [MICRONUTRIENT_KEYS.RIBOFLAVIN]: 1.2,    // 20% increase
      [MICRONUTRIENT_KEYS.NIACIN]: 1.1,        // 10% increase
      [MICRONUTRIENT_KEYS.VITAMIN_B6]: 1.5     // 50% increase
    };

    this.applyMultipliers(micronutrients, country, adjustments);
  }

  /**
   * Lactation-specific adjustments
   */
  private adjustForLactation(
    micronutrients: Record<string, NutrientValue>,
    country: 'uk' | 'us' | 'india' | 'eu' | 'who'
  ): void {
    const adjustments = {
      [MICRONUTRIENT_KEYS.VITAMIN_A]: 1.4, // 40% increase
      [MICRONUTRIENT_KEYS.VITAMIN_C]: 1.5, // 50% increase
      [MICRONUTRIENT_KEYS.CALCIUM]: 1.0, // No change
      [MICRONUTRIENT_KEYS.IODINE]: 1.5, // 50% increase
      [MICRONUTRIENT_KEYS.ZINC]: 1.3, // 30% increase
      [MICRONUTRIENT_KEYS.VITAMIN_B12]: 1.2, // 20% increase
      [MICRONUTRIENT_KEYS.RIBOFLAVIN]: 1.3 // 30% increase
    };

    this.applyMultipliers(micronutrients, country, adjustments);
  }

  /**
   * Activity level adjustments
   */
  private adjustForActivity(
    micronutrients: Record<string, NutrientValue>,
    country: 'uk' | 'us' | 'india' | 'eu' | 'who',
    activityLevel: string
  ): void {
    // Higher activity increases need for B vitamins and some minerals
    const multiplier = activityLevel === 'very_active' ? 1.2 : 
                      activityLevel === 'active' ? 1.1 : 1.05;

    const adjustments = {
      [MICRONUTRIENT_KEYS.THIAMIN]: multiplier,
      [MICRONUTRIENT_KEYS.RIBOFLAVIN]: multiplier,
      [MICRONUTRIENT_KEYS.NIACIN]: multiplier,
      [MICRONUTRIENT_KEYS.IRON]: multiplier,
      [MICRONUTRIENT_KEYS.MAGNESIUM]: multiplier,
      [MICRONUTRIENT_KEYS.ZINC]: multiplier * 0.9 // Slightly less increase for zinc
    };

    this.applyMultipliers(micronutrients, country, adjustments);
  }

  /**
   * Apply multipliers to micronutrient values
   */
  private applyMultipliers(
    micronutrients: Record<string, NutrientValue>,
    country: 'uk' | 'us' | 'india' | 'eu' | 'who',
    multipliers: Record<string, number>
  ): void {
    for (const [key, multiplier] of Object.entries(multipliers)) {
      if (micronutrients[key]) {
        const nutrient = micronutrients[key];
        const primaryValue = getPrimaryValue(nutrient, country);
        if (primaryValue) {
          this.updatePrimaryValue(nutrient, country, primaryValue * multiplier);
        }
      }
    }
  }

  /**
   * Save client requirements to database
   */
  async saveClientRequirements(
    requirements: ClientMicronutrientRequirements
  ): Promise<ClientMicronutrientRequirements | null> {
    // Deactivate existing requirements
    await this.supabase
      .from('client_micronutrient_requirements_flexible')
      .update({ is_active: false })
      .eq('client_id', requirements.client_id)
      .eq('is_active', true);

    // Insert new requirements
    const { data, error } = await this.supabase
      .from('client_micronutrient_requirements_flexible')
      .insert(requirements)
      .select()
      .single();

    if (error) {
      console.error('Error saving client requirements:', error);
      return null;
    }

    return data as ClientMicronutrientRequirements;
  }

  /**
   * Get active client requirements
   */
  async getActiveClientRequirements(
    clientId: string
  ): Promise<ClientMicronutrientRequirements | null> {
    const { data, error } = await this.supabase
      .from('client_micronutrient_requirements_flexible')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .single();

    if (error) {
      console.error('Error fetching client requirements:', error);
      return null;
    }

    return data as ClientMicronutrientRequirements;
  }

  /**
   * Compare client intake with requirements
   */
  compareIntakeWithRequirements(
    requirements: ClientMicronutrientRequirements,
    dailyIntake: Record<string, number>
  ): Record<string, {
    required: number | null;
    intake: number;
    percentage: number;
    status: 'deficient' | 'low' | 'adequate' | 'high' | 'excessive';
    upperLimit: number | null;
    lowerLimit: number | null;
  }> {
    const comparison: Record<string, any> = {};

    for (const [nutrientKey, nutrientValue] of Object.entries(requirements.micronutrient_recommendations)) {
      const required = getPrimaryValue(nutrientValue, requirements.country_guideline);
      const intake = dailyIntake[nutrientKey] || 0;
      const upperLimit = getUpperLimit(nutrientValue, requirements.country_guideline);
      const lowerLimit = getLowerLimit(nutrientValue, requirements.country_guideline);

      let status: 'deficient' | 'low' | 'adequate' | 'high' | 'excessive';
      const percentage = required ? (intake / required) * 100 : 0;

      if (requirements.country_guideline === 'uk' && lowerLimit) {
        // UK has LRNI
        if (intake < lowerLimit) {
          status = 'deficient';
        } else if (intake < (required || 0)) {
          status = 'low';
        } else if (upperLimit && intake > upperLimit) {
          status = 'excessive';
        } else if (intake > (required || 0) * 1.5) {
          status = 'high';
        } else {
          status = 'adequate';
        }
      } else {
        // US/India - no lower limit
        if (intake < (required || 0) * 0.7) {
          status = 'deficient';
        } else if (intake < (required || 0)) {
          status = 'low';
        } else if (upperLimit && intake > upperLimit) {
          status = 'excessive';
        } else if (intake > (required || 0) * 1.5) {
          status = 'high';
        } else {
          status = 'adequate';
        }
      }

      comparison[nutrientKey] = {
        required,
        intake,
        percentage,
        status,
        upperLimit,
        lowerLimit
      };
    }

    return comparison;
  }
} 