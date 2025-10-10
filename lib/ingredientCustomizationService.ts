import { EdamamService } from './edamamService';
import { MultiProviderRecipeSearchService } from './multiProviderRecipeSearchService';
import { NutritionMappingService, StandardizedNutrition } from './nutritionMappingService';

export interface IngredientModification {
  type: 'replace' | 'omit' | 'reduce' | 'add';
  originalIngredient?: string;
  newIngredient?: string;
  reductionPercent?: number;
  notes?: string;
}

export interface CustomizationResult {
  originalNutrition: StandardizedNutrition;
  modifiedNutrition: StandardizedNutrition;
  modifications: IngredientModification[];
  calculationMethod: 'edamam_api' | 'spoonacular_api' | 'manual_estimation';
  accuracy: 'precise' | 'approximate';
  source: 'edamam' | 'spoonacular';
  micronutrientsIncluded: boolean; // Flag to indicate micros were calculated
}

export class IngredientCustomizationService {
  private edamamService: EdamamService;
  private spoonacularService: MultiProviderRecipeSearchService;
  private spoonacularApiKey: string;

  constructor() {
    this.edamamService = new EdamamService();
    this.spoonacularService = new MultiProviderRecipeSearchService();
    this.spoonacularApiKey = process.env.SPOONACULAR_API_KEY || '0c6f2e35fab0436eafec876a66fd2c51';
  }

  /**
   * Get ingredient nutrition with automatic fallback: Spoonacular → Edamam
   * @param ingredientText - Full ingredient text (e.g., "2 cups flour")
   * @returns Nutrition data and the source that was used
   */
  private async getIngredientNutritionWithFallback(ingredientText: string): Promise<{ data: any; source: 'spoonacular' | 'edamam' } | null> {
    console.log(`🔍 Fetching nutrition for: "${ingredientText}" (Spoonacular → Edamam fallback)`);
    
    // Try Spoonacular first
    const spoonacularData = await this.spoonacularService.getIngredientNutrition(ingredientText);
    
    if (spoonacularData) {
      console.log(`✅ Found in Spoonacular: ${spoonacularData.nutrition?.calories || 'N/A'} kcal`);
      return { data: spoonacularData, source: 'spoonacular' };
    }
    
    // Fallback to Edamam
    console.log(`⚠️ Not found in Spoonacular, trying Edamam...`);
    const edamamData = await this.edamamService.getIngredientNutrition(ingredientText);
    
    if (edamamData) {
      console.log(`✅ Found in Edamam`);
      return { data: edamamData, source: 'edamam' };
    }
    
    console.log(`❌ Not found in either source`);
    return null;
  }

  /**
   * Get available customization options for a recipe
   */
  async getAvailableCustomizations(recipeId: string, source: 'edamam' | 'spoonacular'): Promise<any> {
    const capabilities = {
      edamam: {
        ingredientReplacement: true,
        ingredientOmission: true,
        ingredientReduction: true,
        portionAdjustment: true,
        ingredientSubstitution: false, // No API for substitutes
        customNutritionCalculation: true, // Via Nutrition Data API
        calculationMethod: 'edamam_api',
        accuracy: 'precise'
      },
      spoonacular: {
        ingredientReplacement: true,
        ingredientOmission: true,
        ingredientReduction: true,
        portionAdjustment: true,
        ingredientSubstitution: true, // Has substitutes API
        customNutritionCalculation: true, // Has custom nutrition API
        calculationMethod: 'spoonacular_api',
        accuracy: 'precise'
      }
    };

    return {
      recipeId,
      source,
      capabilities: capabilities[source],
      availableModifications: this.getAvailableModifications(source)
    };
  }

  /**
   * Apply ingredient modifications to a recipe
   */
  async applyModifications(
    recipeId: string,
    source: 'edamam' | 'spoonacular',
    originalNutrition: any,
    modifications: IngredientModification[],
    servings: number = 1
  ): Promise<CustomizationResult> {
    
    if (source === 'edamam') {
      return this.applyEdamamModifications(recipeId, originalNutrition, modifications, servings);
    } else {
      return this.applySpoonacularModifications(recipeId, originalNutrition, modifications, servings);
    }
  }

  /**
   * Get ingredient substitutes (Spoonacular only)
   */
  async getIngredientSubstitutes(recipeId: string, ingredientId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `https://api.spoonacular.com/recipes/${recipeId}/substitutes/${ingredientId}?apiKey=${this.spoonacularApiKey}`
      );

      if (!response.ok) {
        throw new Error(`Spoonacular substitutes API error: ${response.status}`);
      }

      const data = await response.json();
      return data.substitutes || [];
    } catch (error) {
      console.error('❌ Error fetching ingredient substitutes:', error);
      return [];
    }
  }

  /**
   * Apply modifications using Edamam's existing system
   * Now includes full micronutrient tracking
   * 
   * IMPORTANT: Recipe nutrition is PER SERVING, but ingredients are for ALL servings!
   * @param servings - Number of servings in the recipe (used to divide ingredient nutrition)
   */
  private async applyEdamamModifications(
    recipeId: string,
    originalNutrition: any,
    modifications: IngredientModification[],
    servings: number
  ): Promise<CustomizationResult> {
    
    console.log('🔬 Starting Edamam ingredient modifications with micronutrient tracking');
    console.log(`   ⚠️ IMPORTANT: Original nutrition is PER SERVING, ingredients are for ${servings} servings TOTAL`);
    console.log(`   📐 Will DIVIDE ingredient nutrition by ${servings} to get per-serving contribution`);
    
    // Debug array to track all operations
    const debugSteps: any[] = [];
    
    // Convert original nutrition to standardized format
    let adjustedNutrition: StandardizedNutrition;
    
    // Check if it's already in standardized format AND has actual data
    const hasStandardizedFormat = originalNutrition.micros !== undefined;
    const hasMacroData = originalNutrition.macros && Object.keys(originalNutrition.macros).length > 0;
    const hasCaloriesObject = originalNutrition.calories && typeof originalNutrition.calories === 'object';
    
    if (hasStandardizedFormat && (hasMacroData || hasCaloriesObject)) {
      // Already in standardized format with data
      adjustedNutrition = JSON.parse(JSON.stringify(originalNutrition));
      console.log('  ✅ Using standardized format with data');
    } else if (hasStandardizedFormat && !hasMacroData) {
      // Has standardized structure but macros are empty - this might be from a bad fallback
      // Try to extract from calories/protein/carbs/fat properties if they exist
      adjustedNutrition = {
        calories: originalNutrition.calories || { quantity: 0, unit: 'kcal' },
        macros: originalNutrition.macros || {},
        micros: originalNutrition.micros || { vitamins: {}, minerals: {} }
      };
      console.log('  ⚠️ Standardized format but checking for data:', adjustedNutrition.calories);
    } else {
      // Convert from simplified format
      adjustedNutrition = NutritionMappingService.fromSimplifiedFormat(originalNutrition);
      console.log('  🔄 Converted from simplified format');
    }
    
    console.log('  📊 Starting nutrition:', {
      calories: adjustedNutrition.calories?.quantity,
      proteinKeys: Object.keys(adjustedNutrition.macros)
    });

    const appliedModifications: IngredientModification[] = [];
    let micronutrientsTracked = false;

    for (const modification of modifications) {
      console.log(`📝 Processing modification: ${modification.type} - ${modification.originalIngredient || modification.newIngredient}`);
      
      switch (modification.type) {
        case 'replace':
          if (modification.originalIngredient && modification.newIngredient) {
            // Construct full ingredient text with amount and unit for accurate nutrition
            // Use separate amounts for old and new (for portion size changes)
            const newAmount = (modification as any).amount || 1;
            const newUnit = (modification as any).unit || '';
            const oldAmount = (modification as any).originalAmount || newAmount;  // Fallback to new amount if not specified
            const oldUnit = (modification as any).originalUnit || newUnit;
            
            // Use exact ingredient name from recipe if provided (for Spoonacular/Edamam compatibility)
            const oldIngredientName = (modification as any).originalIngredientName || modification.originalIngredient;
            
            // OPTIMIZATION: If it's the same ingredient, just quantity changed, use linear scaling
            const sameIngredient = modification.originalIngredient.toLowerCase().trim() === modification.newIngredient.toLowerCase().trim();
            const sameUnit = oldUnit.toLowerCase() === newUnit.toLowerCase();
            
            let quantityChangeApplied = false;
            
            if (sameIngredient && sameUnit && oldUnit) {
              // Quantity-only change - use linear scaling for accuracy
              console.log(`  📊 Same ingredient quantity change detected: ${oldAmount} → ${newAmount} ${newUnit} ${modification.originalIngredient}`);
              
              // Fetch nutrition for 1 unit (use exact ingredient name if provided)
              const baseIngredientText = `1 ${newUnit} ${oldIngredientName}`;
              const baseNutritionResult = await this.getIngredientNutritionWithFallback(baseIngredientText);
              const baseNutritionData = baseNutritionResult?.data;
              
              if (baseNutritionData && baseNutritionResult) {
                // Transform based on which source returned the data
                const baseNutrition = baseNutritionResult.source === 'spoonacular'
                  ? NutritionMappingService.transformSpoonacularIngredientNutrition(baseNutritionData)
                  : NutritionMappingService.transformEdamamNutrition(baseNutritionData, 1);
                
                // Calculate delta: (newAmount - oldAmount) * baseNutrition
                const amountDelta = newAmount - oldAmount;
                console.log(`  📐 Amount delta: ${oldAmount} → ${newAmount} = ${amountDelta} ${newUnit}`);
                console.log(`  📊 Base nutrition (per ${newUnit}): ${baseNutrition.calories.quantity} kcal`);
                
                // Scale the base nutrition by the delta
                const deltaNutrition = NutritionMappingService.multiplyNutrition(baseNutrition, amountDelta);
                console.log(`  📊 Delta nutrition (${amountDelta} ${newUnit}, TOTAL): ${deltaNutrition.calories.quantity} kcal`);
                
                const beforeDivision = adjustedNutrition.calories.quantity;
                
                // DIVIDE by servings to get per-serving contribution (ingredients are for ALL servings)
                const deltaPerServing = NutritionMappingService.divideNutrition(deltaNutrition, servings);
                console.log(`  📐 Divided by ${servings} servings: ${deltaPerServing.calories.quantity} kcal per serving`);
                
                // Add the per-serving delta to original per-serving nutrition
                adjustedNutrition = NutritionMappingService.addNutrition(adjustedNutrition, deltaPerServing);
                
                console.log(`  ✅ Applied quantity change using linear scaling`);
                console.log(`     Result: ${adjustedNutrition.calories.quantity} kcal`);
                
                debugSteps.push({
                  step: 'LINEAR_SCALING',
                  ingredient: modification.originalIngredient,
                  oldAmount: oldAmount,
                  oldUnit: oldUnit,
                  newAmount: newAmount,
                  newUnit: newUnit,
                  amountDelta: amountDelta,
                  baseNutritionPerUnit: baseNutrition.calories.quantity,
                  deltaNutritionTotal: deltaNutrition.calories.quantity,
                  servings: servings,
                  deltaNutritionPerServing: deltaPerServing.calories.quantity,
                  nutritionBefore: beforeDivision,
                  nutritionAfter: adjustedNutrition.calories.quantity
                });
                
                appliedModifications.push(modification);
                micronutrientsTracked = true;
                quantityChangeApplied = true;
              } else {
                console.warn(`  ⚠️ Could not fetch base nutrition, falling back to full ingredient fetch`);
              }
            }
            
            // Fallback or different ingredient replacement
            if (!quantityChangeApplied) {
              // Normalize units to singular (Spoonacular prefers singular)
              const normalizeUnit = (unit: string): string => {
                if (!unit) return '';
                const u = unit.toLowerCase();
                // Remove trailing 's' for common units
                if (u.endsWith('slices')) return u.slice(0, -1); // slices → slice
                if (u.endsWith('cups')) return 'cup';
                if (u.endsWith('tbsps') || u.endsWith('tablespoons')) return 'tablespoon';
                if (u.endsWith('tsps') || u.endsWith('teaspoons')) return 'teaspoon';
                if (u.endsWith('ounces')) return 'ounce';
                if (u.endsWith('pieces')) return 'piece';
                if (u.endsWith('grams')) return 'gram';
                if (u.endsWith('pounds')) return 'pound';
                return unit;
              };
              
              const normalizedOldUnit = normalizeUnit(oldUnit);
              const normalizedNewUnit = normalizeUnit(newUnit);
              
              // If oldUnit is empty but newUnit exists, use newUnit for both (user is clarifying the unit)
              const effectiveOldUnit = normalizedOldUnit || normalizedNewUnit;
              const effectiveNewUnit = normalizedNewUnit;
              
              const newIngredientText = effectiveNewUnit ? `${newAmount} ${effectiveNewUnit} ${modification.newIngredient}` : `${newAmount} ${modification.newIngredient}`;
              const oldIngredientText = effectiveOldUnit ? `${oldAmount} ${effectiveOldUnit} ${oldIngredientName}` : `${oldAmount} ${oldIngredientName}`;
              
              debugSteps.push({
                step: 'FALLBACK_FETCH_START',
                oldText: oldIngredientText,
                newText: newIngredientText,
                oldAmount: oldAmount,
                oldUnit: oldUnit,
                oldUnitNormalized: normalizedOldUnit,
                newAmount: newAmount,
                newUnit: newUnit,
                newUnitNormalized: normalizedNewUnit,
                servings: servings
              });
              
              // Get nutrition data for both ingredients with fallback
              const oldNutritionResult = await this.getIngredientNutritionWithFallback(oldIngredientText);
              const oldNutritionData = oldNutritionResult?.data;
              console.log(`  📝 OLD nutrition fetched:`, oldNutritionData ? `SUCCESS (${oldNutritionResult?.source})` : 'NULL');
              
              const newNutritionResult = await this.getIngredientNutritionWithFallback(newIngredientText);
              const newNutritionData = newNutritionResult?.data;
              console.log(`  📝 NEW nutrition fetched:`, newNutritionData ? `SUCCESS (${newNutritionResult?.source})` : 'NULL');
              
              debugSteps.push({
                step: 'FALLBACK_FETCH_RESULT',
                oldNutritionFetched: !!oldNutritionData,
                newNutritionFetched: !!newNutritionData,
                oldCalories: oldNutritionData?.nutrition?.calories || 'NULL',
                newCalories: newNutritionData?.nutrition?.calories || 'NULL'
              });
              
              if (oldNutritionData && newNutritionData && oldNutritionResult && newNutritionResult) {
                // Transform to standardized format with full micronutrient data (based on source)
                const oldNutritionTotal = oldNutritionResult.source === 'spoonacular'
                  ? NutritionMappingService.transformSpoonacularIngredientNutrition(oldNutritionData)
                  : NutritionMappingService.transformEdamamNutrition(oldNutritionData, 1);
                const newNutritionTotal = newNutritionResult.source === 'spoonacular'
                  ? NutritionMappingService.transformSpoonacularIngredientNutrition(newNutritionData)
                  : NutritionMappingService.transformEdamamNutrition(newNutritionData, 1);
                
                console.log(`  🔄 Replace: ${oldIngredientText} → ${newIngredientText}`);
                console.log(`     Old (TOTAL for ${servings} servings): ${oldNutritionTotal.calories.quantity} kcal`);
                console.log(`     New (TOTAL for ${servings} servings): ${newNutritionTotal.calories.quantity} kcal`);
                console.log(`     Net change (TOTAL): ${newNutritionTotal.calories.quantity - oldNutritionTotal.calories.quantity} kcal`);
                
                const beforeDivision = adjustedNutrition.calories.quantity;
                
                // DIVIDE by servings to get per-serving contribution (ingredients are for ALL servings)
                const oldNutritionPerServing = NutritionMappingService.divideNutrition(oldNutritionTotal, servings);
                const newNutritionPerServing = NutritionMappingService.divideNutrition(newNutritionTotal, servings);
                
                console.log(`     Old (per serving): ${oldNutritionPerServing.calories.quantity} kcal`);
                console.log(`     New (per serving): ${newNutritionPerServing.calories.quantity} kcal`);
                console.log(`     Net change (per serving): ${newNutritionPerServing.calories.quantity - oldNutritionPerServing.calories.quantity} kcal`);
                
                const beforeSubtract = adjustedNutrition.calories.quantity;
                
                // Subtract old ingredient nutrition (including micros)
                adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, oldNutritionPerServing);
                
                const afterSubtract = adjustedNutrition.calories.quantity;
                
                // Add new ingredient nutrition (including micros)
                adjustedNutrition = NutritionMappingService.addNutrition(adjustedNutrition, newNutritionPerServing);
                
                const afterAdd = adjustedNutrition.calories.quantity;
                
                debugSteps.push({
                  step: 'FALLBACK_REPLACE',
                  ingredient: modification.originalIngredient,
                  oldText: oldIngredientText,
                  newText: newIngredientText,
                  oldNutritionTotal: oldNutritionTotal.calories.quantity,
                  newNutritionTotal: newNutritionTotal.calories.quantity,
                  servings: servings,
                  oldNutritionPerServing: oldNutritionPerServing.calories.quantity,
                  newNutritionPerServing: newNutritionPerServing.calories.quantity,
                  beforeSubtract: beforeSubtract,
                  afterSubtract: afterSubtract,
                  afterAdd: afterAdd,
                  finalCalories: adjustedNutrition.calories.quantity
                });
                
                appliedModifications.push(modification);
                micronutrientsTracked = true;
              } else {
                // Nutrition fetch failed!
                debugSteps.push({
                  step: 'FALLBACK_FETCH_FAILED',
                  reason: !oldNutritionData ? 'OLD_NUTRITION_NULL' : 'NEW_NUTRITION_NULL',
                  oldText: oldIngredientText,
                  newText: newIngredientText,
                  message: 'Ingredient nutrition fetch failed - modification skipped!',
                  nutritionUnchanged: adjustedNutrition.calories.quantity
                });
              }
            }
          }
          break;

        case 'omit':
          if (modification.originalIngredient) {
            // Construct full ingredient text with amount and unit
            const amount = (modification as any).amount || 1;
            const unit = (modification as any).unit || '';
            const ingredientName = (modification as any).originalIngredientName || modification.originalIngredient;
            const ingredientText = unit ? `${amount} ${unit} ${ingredientName}` : `${amount} ${ingredientName}`;
            
            const ingredientResult = await this.getIngredientNutritionWithFallback(ingredientText);
            const ingredientData = ingredientResult?.data;
            if (ingredientData && ingredientResult) {
              const ingredientNutritionTotal = ingredientResult.source === 'spoonacular'
                ? NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData)
                : NutritionMappingService.transformEdamamNutrition(ingredientData, 1);
              
              console.log(`  🚫 Omit: ${ingredientText}`);
              console.log(`     Removing (TOTAL for ${servings} servings): ${ingredientNutritionTotal.calories.quantity} kcal, Iron: ${ingredientNutritionTotal.micros.minerals.iron?.quantity || 0}mg`);
              
              // DIVIDE by servings to get per-serving contribution (ingredients are for ALL servings)
              const ingredientNutritionPerServing = NutritionMappingService.divideNutrition(ingredientNutritionTotal, servings);
              console.log(`     Removing (per serving): ${ingredientNutritionPerServing.calories.quantity} kcal`);
              
              adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, ingredientNutritionPerServing);
              appliedModifications.push(modification);
              micronutrientsTracked = true;
            }
          }
          break;

        case 'add':
          if (modification.newIngredient) {
            // Construct full ingredient text with amount and unit for accurate nutrition
            const amount = (modification as any).amount || 1;
            const unit = (modification as any).unit || '';
            const ingredientText = unit ? `${amount} ${unit} ${modification.newIngredient}` : `${amount} ${modification.newIngredient}`;
            
            const ingredientResult = await this.getIngredientNutritionWithFallback(ingredientText);
            const ingredientData = ingredientResult?.data;
            if (ingredientData && ingredientResult) {
              const ingredientNutritionTotal = ingredientResult.source === 'spoonacular'
                ? NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData)
                : NutritionMappingService.transformEdamamNutrition(ingredientData, 1);
              
              console.log(`  ➕ Add: ${ingredientText}`);
              console.log(`     Adding (TOTAL for ${servings} servings): ${ingredientNutritionTotal.calories.quantity} kcal, Calcium: ${ingredientNutritionTotal.micros.minerals.calcium?.quantity || 0}mg`);
              
              // DIVIDE by servings to get per-serving contribution (ingredients are for ALL servings)
              const ingredientNutritionPerServing = NutritionMappingService.divideNutrition(ingredientNutritionTotal, servings);
              console.log(`     Adding (per serving): ${ingredientNutritionPerServing.calories.quantity} kcal`);
              
              adjustedNutrition = NutritionMappingService.addNutrition(adjustedNutrition, ingredientNutritionPerServing);
              appliedModifications.push(modification);
              micronutrientsTracked = true;
            }
          }
          break;

        case 'reduce':
          if (modification.originalIngredient && modification.reductionPercent) {
            // Construct full ingredient text with amount and unit
            const amount = (modification as any).amount || 1;
            const unit = (modification as any).unit || '';
            const ingredientName = (modification as any).originalIngredientName || modification.originalIngredient;
            const ingredientText = unit ? `${amount} ${unit} ${ingredientName}` : `${amount} ${ingredientName}`;
            
            const ingredientResult = await this.getIngredientNutritionWithFallback(ingredientText);
            const ingredientData = ingredientResult?.data;
            if (ingredientData && ingredientResult) {
              const ingredientNutritionTotal = ingredientResult.source === 'spoonacular'
                ? NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData)
                : NutritionMappingService.transformEdamamNutrition(ingredientData, 1);
              const reductionFactor = modification.reductionPercent / 100;
              
              console.log(`  📉 Reduce: ${ingredientText} by ${modification.reductionPercent}%`);
              console.log(`     Ingredient nutrition (TOTAL): ${ingredientNutritionTotal.calories.quantity} kcal`);
              
              // DIVIDE by servings first to get per-serving contribution
              const ingredientNutritionPerServing = NutritionMappingService.divideNutrition(ingredientNutritionTotal, servings);
              console.log(`     Ingredient nutrition (per serving): ${ingredientNutritionPerServing.calories.quantity} kcal`);
              
              // Calculate the amount to remove (reductionPercent of the per-serving ingredient)
              const amountToRemove = NutritionMappingService.multiplyNutrition(ingredientNutritionPerServing, reductionFactor);
              console.log(`     Removing (per serving): ${amountToRemove.calories.quantity} kcal`);
              
              adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, amountToRemove);
              
              appliedModifications.push(modification);
              micronutrientsTracked = true;
            }
          }
          break;
      }
    }

    // NO LONGER NEED TO MULTIPLY by servings at the end because:
    // - Original nutrition is already PER SERVING
    // - We divided each ingredient modification by servings to get per-serving changes
    // - Result is PER SERVING nutrition (which is what we want!)

    console.log('✅ Edamam modifications complete');
    console.log(`   Final (PER SERVING): ${adjustedNutrition.calories.quantity} kcal`);
    console.log(`   Micros tracked: ${micronutrientsTracked}`);

    // Convert original nutrition to standardized format for comparison
    const standardizedOriginal = originalNutrition.micros 
      ? originalNutrition 
      : NutritionMappingService.fromSimplifiedFormat(originalNutrition);

    return {
      originalNutrition: standardizedOriginal,
      modifiedNutrition: adjustedNutrition,
      modifications: appliedModifications,
      calculationMethod: 'spoonacular_api',
      accuracy: 'precise',
      source: 'edamam',
      micronutrientsIncluded: micronutrientsTracked,
      debugSteps: debugSteps // Include detailed calculation steps
    } as any;
  }

  /**
   * Apply modifications using Spoonacular's API
   * Includes full micronutrient tracking
   */
  private async applySpoonacularModifications(
    recipeId: string,
    originalNutrition: any,
    modifications: IngredientModification[],
    servings: number
  ): Promise<CustomizationResult> {
    
    console.log('🔬 Starting Spoonacular ingredient modifications with micronutrient tracking');
    
    try {
      // Note: Spoonacular doesn't have a direct ingredient modification API
      // We'll fetch ingredient nutrition from Spoonacular and calculate manually
      
      // Convert original nutrition to standardized format
      let adjustedNutrition: StandardizedNutrition;
      
      // Check if it's already in standardized format AND has actual data
      const hasStandardizedFormat = originalNutrition.micros !== undefined;
      const hasMacroData = originalNutrition.macros && Object.keys(originalNutrition.macros).length > 0;
      const hasCaloriesObject = originalNutrition.calories && typeof originalNutrition.calories === 'object';
      
      if (hasStandardizedFormat && (hasMacroData || hasCaloriesObject)) {
        // Already in standardized format with data
        adjustedNutrition = JSON.parse(JSON.stringify(originalNutrition));
        console.log('  ✅ Using standardized format with data');
      } else if (hasStandardizedFormat && !hasMacroData) {
        // Has standardized structure but macros are empty - this might be from a bad fallback
        adjustedNutrition = {
          calories: originalNutrition.calories || { quantity: 0, unit: 'kcal' },
          macros: originalNutrition.macros || {},
          micros: originalNutrition.micros || { vitamins: {}, minerals: {} }
        };
        console.log('  ⚠️ Standardized format but empty macros');
      } else {
        // Convert from simplified format
        adjustedNutrition = NutritionMappingService.fromSimplifiedFormat(originalNutrition);
        console.log('  🔄 Converted from simplified format');
      }
      
      console.log('  📊 Starting nutrition:', {
        calories: adjustedNutrition.calories?.quantity,
        proteinKeys: Object.keys(adjustedNutrition.macros)
      });

      const appliedModifications: IngredientModification[] = [];
      let micronutrientsTracked = false;

      for (const modification of modifications) {
        console.log(`📝 Processing Spoonacular modification: ${modification.type}`);
        
        // For Spoonacular, we can use their ingredient search API
        // For now, fallback to Edamam for ingredient-level nutrition
        // In a production system, you'd want to implement Spoonacular ingredient nutrition API
        
        switch (modification.type) {
          case 'replace':
            if (modification.originalIngredient && modification.newIngredient) {
              // Construct full ingredient text with amount and unit for accurate nutrition
              // Use separate amounts for old and new (for portion size changes)
              const newAmount = (modification as any).amount || 1;
              const newUnit = (modification as any).unit || '';
              const oldAmount = (modification as any).originalAmount || newAmount;  // Fallback to new amount if not specified
              const oldUnit = (modification as any).originalUnit || newUnit;
              
              // Use exact ingredient name from recipe if provided (for Spoonacular/Edamam compatibility)
              const oldIngredientName = (modification as any).originalIngredientName || modification.originalIngredient;
              
              // OPTIMIZATION: If it's the same ingredient, just quantity changed, use linear scaling
              const sameIngredient = modification.originalIngredient.toLowerCase().trim() === modification.newIngredient.toLowerCase().trim();
              const sameUnit = oldUnit.toLowerCase() === newUnit.toLowerCase();
              
              let quantityChangeApplied = false;
              
              if (sameIngredient && sameUnit && oldUnit) {
                // Quantity-only change - use linear scaling for accuracy
                console.log(`  📊 Same ingredient quantity change detected: ${oldAmount} → ${newAmount} ${newUnit} ${modification.originalIngredient}`);
                
                // Fetch nutrition for 1 unit (use exact ingredient name if provided)
                const baseIngredientText = `1 ${newUnit} ${oldIngredientName}`;
                const baseNutritionResult = await this.getIngredientNutritionWithFallback(baseIngredientText);
                const baseNutritionData = baseNutritionResult?.data;
                
                if (baseNutritionData && baseNutritionResult) {
                  const baseNutrition = baseNutritionResult.source === 'spoonacular'
                    ? NutritionMappingService.transformSpoonacularIngredientNutrition(baseNutritionData)
                    : NutritionMappingService.transformEdamamNutrition(baseNutritionData, 1);
                  
                  // Calculate delta: (newAmount - oldAmount) * baseNutrition
                  const amountDelta = newAmount - oldAmount;
                  console.log(`  📐 Amount delta: ${oldAmount} → ${newAmount} = ${amountDelta} ${newUnit}`);
                  console.log(`  📊 Base nutrition (per ${newUnit}): ${baseNutrition.calories.quantity} kcal`);
                  
                  // Scale the base nutrition by the delta
                  const deltaNutritionTotal = NutritionMappingService.multiplyNutrition(baseNutrition, amountDelta);
                  console.log(`  📊 Delta nutrition TOTAL (${amountDelta} ${newUnit}): ${deltaNutritionTotal.calories.quantity} kcal`);
                  
                  // DIVIDE by servings to get per-serving delta (ingredients are for ALL servings, recipe nutrition is PER SERVING)
                  const deltaNutrition = NutritionMappingService.divideNutrition(deltaNutritionTotal, servings);
                  console.log(`  📊 Delta nutrition PER SERVING (÷${servings}): ${deltaNutrition.calories.quantity} kcal`);
                  
                  // Add the per-serving delta to original per-serving nutrition
                  adjustedNutrition = NutritionMappingService.addNutrition(adjustedNutrition, deltaNutrition);
                  
                  console.log(`  ✅ Applied quantity change using linear scaling`);
                  console.log(`     Result: ${adjustedNutrition.calories.quantity} kcal`);
                  
                  appliedModifications.push(modification);
                  micronutrientsTracked = true;
                  quantityChangeApplied = true;
                } else {
                  console.warn(`  ⚠️ Could not fetch base nutrition, falling back to full ingredient fetch`);
                }
              }
              
              // Fallback or different ingredient replacement
              if (!quantityChangeApplied) {
                // If oldUnit is empty but newUnit exists, use newUnit for both (user is clarifying the unit)
                const effectiveOldUnit = oldUnit || newUnit;
                const effectiveNewUnit = newUnit;
                
                const newIngredientText = effectiveNewUnit ? `${newAmount} ${effectiveNewUnit} ${modification.newIngredient}` : `${newAmount} ${modification.newIngredient}`;
                const oldIngredientText = effectiveOldUnit ? `${oldAmount} ${effectiveOldUnit} ${oldIngredientName}` : `${oldAmount} ${oldIngredientName}`;
                
                // Get ingredient nutrition with fallback
                const oldNutritionResult = await this.getIngredientNutritionWithFallback(oldIngredientText);
                const oldNutritionData = oldNutritionResult?.data;
                console.log(`  📝 OLD nutrition fetched:`, oldNutritionData ? `SUCCESS (${oldNutritionResult?.source})` : 'NULL');
                
                const newNutritionResult = await this.getIngredientNutritionWithFallback(newIngredientText);
                const newNutritionData = newNutritionResult?.data;
                console.log(`  📝 NEW nutrition fetched:`, newNutritionData ? `SUCCESS (${newNutritionResult?.source})` : 'NULL');
                
                if (oldNutritionData && newNutritionData && oldNutritionResult && newNutritionResult) {
                  const oldNutritionTotal = oldNutritionResult.source === 'spoonacular'
                    ? NutritionMappingService.transformSpoonacularIngredientNutrition(oldNutritionData)
                    : NutritionMappingService.transformEdamamNutrition(oldNutritionData, 1);
                  const newNutritionTotal = newNutritionResult.source === 'spoonacular'
                    ? NutritionMappingService.transformSpoonacularIngredientNutrition(newNutritionData)
                    : NutritionMappingService.transformEdamamNutrition(newNutritionData, 1);
                  
                  console.log(`  🔄 Replace: ${oldIngredientText} → ${newIngredientText}`);
                  console.log(`     Old TOTAL: ${oldNutritionTotal.calories.quantity} kcal`);
                  console.log(`     New TOTAL: ${newNutritionTotal.calories.quantity} kcal`);
                  console.log(`     Net change TOTAL: ${newNutritionTotal.calories.quantity - oldNutritionTotal.calories.quantity} kcal`);
                  
                  // DIVIDE by servings to get per-serving nutrition (ingredients are for ALL servings)
                  const oldNutrition = NutritionMappingService.divideNutrition(oldNutritionTotal, servings);
                  const newNutrition = NutritionMappingService.divideNutrition(newNutritionTotal, servings);
                  console.log(`     Old PER SERVING (÷${servings}): ${oldNutrition.calories.quantity} kcal`);
                  console.log(`     New PER SERVING (÷${servings}): ${newNutrition.calories.quantity} kcal`);
                  
                  adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, oldNutrition);
                  adjustedNutrition = NutritionMappingService.addNutrition(adjustedNutrition, newNutrition);
                  
                  appliedModifications.push(modification);
                  micronutrientsTracked = true;
                }
              }
            }
            break;

          case 'omit':
            if (modification.originalIngredient) {
              // Construct full ingredient text with amount and unit
              const amount = (modification as any).amount || 1;
              const unit = (modification as any).unit || '';
              const ingredientName = (modification as any).originalIngredientName || modification.originalIngredient;
              const ingredientText = unit ? `${amount} ${unit} ${ingredientName}` : `${amount} ${ingredientName}`;
              
              const ingredientResult = await this.getIngredientNutritionWithFallback(ingredientText);
              const ingredientData = ingredientResult?.data;
              if (ingredientData && ingredientResult) {
                const ingredientNutritionTotal = ingredientResult.source === 'spoonacular'
                  ? NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData)
                  : NutritionMappingService.transformEdamamNutrition(ingredientData, 1);
                console.log(`  🚫 Omit TOTAL: ${ingredientText} (${ingredientNutritionTotal.calories.quantity} kcal)`);
                
                // DIVIDE by servings to get per-serving nutrition
                const ingredientNutrition = NutritionMappingService.divideNutrition(ingredientNutritionTotal, servings);
                console.log(`  🚫 Omit PER SERVING (÷${servings}): ${ingredientNutrition.calories.quantity} kcal`);
                
                adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, ingredientNutrition);
                appliedModifications.push(modification);
                micronutrientsTracked = true;
              }
            }
            break;

          case 'add':
            if (modification.newIngredient) {
              // Construct full ingredient text with amount and unit for accurate nutrition
              const amount = (modification as any).amount || 1;
              const unit = (modification as any).unit || '';
              const ingredientText = unit ? `${amount} ${unit} ${modification.newIngredient}` : `${amount} ${modification.newIngredient}`;
              
              const ingredientResult = await this.getIngredientNutritionWithFallback(ingredientText);
              const ingredientData = ingredientResult?.data;
              if (ingredientData && ingredientResult) {
                const ingredientNutritionTotal = ingredientResult.source === 'spoonacular'
                  ? NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData)
                  : NutritionMappingService.transformEdamamNutrition(ingredientData, 1);
                console.log(`  ➕ Add TOTAL: ${ingredientText} (${ingredientNutritionTotal.calories.quantity} kcal)`);
                
                // DIVIDE by servings to get per-serving nutrition
                const ingredientNutrition = NutritionMappingService.divideNutrition(ingredientNutritionTotal, servings);
                console.log(`  ➕ Add PER SERVING (÷${servings}): ${ingredientNutrition.calories.quantity} kcal`);
                
                adjustedNutrition = NutritionMappingService.addNutrition(adjustedNutrition, ingredientNutrition);
                appliedModifications.push(modification);
                micronutrientsTracked = true;
              }
            }
            break;

          case 'reduce':
            if (modification.originalIngredient && modification.reductionPercent) {
              // Construct full ingredient text with amount and unit
              const amount = (modification as any).amount || 1;
              const unit = (modification as any).unit || '';
              const ingredientName = (modification as any).originalIngredientName || modification.originalIngredient;
              const ingredientText = unit ? `${amount} ${unit} ${ingredientName}` : `${amount} ${ingredientName}`;
              
              const ingredientResult = await this.getIngredientNutritionWithFallback(ingredientText);
              const ingredientData = ingredientResult?.data;
              if (ingredientData && ingredientResult) {
                const ingredientNutritionTotal = ingredientResult.source === 'spoonacular'
                  ? NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData)
                  : NutritionMappingService.transformEdamamNutrition(ingredientData, 1);
                const reductionFactor = modification.reductionPercent / 100;
                console.log(`  📉 Reduce TOTAL: ${ingredientText} by ${modification.reductionPercent}% (${ingredientNutritionTotal.calories.quantity} kcal)`);
                
                // DIVIDE by servings to get per-serving nutrition
                const ingredientNutrition = NutritionMappingService.divideNutrition(ingredientNutritionTotal, servings);
                const amountToRemove = NutritionMappingService.multiplyNutrition(ingredientNutrition, reductionFactor);
                console.log(`  📉 Reduce PER SERVING (÷${servings}, ×${reductionFactor}): ${amountToRemove.calories.quantity} kcal`);
                
                adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, amountToRemove);
                appliedModifications.push(modification);
                micronutrientsTracked = true;
              }
            }
            break;
        }
      }

      // NOTE: NO serving adjustment needed here!
      // Recipe nutrition is already per-serving, and we've been dividing all ingredient changes by servings.
      // So the final result is correctly in per-serving format.

      console.log('✅ Spoonacular modifications complete');
      console.log(`   Final nutrition PER SERVING: ${adjustedNutrition.calories.quantity} kcal`);
      console.log(`   Micros tracked: ${micronutrientsTracked}`);

      const standardizedOriginal = originalNutrition.micros 
        ? originalNutrition 
        : NutritionMappingService.fromSimplifiedFormat(originalNutrition);

      return {
        originalNutrition: standardizedOriginal,
        modifiedNutrition: adjustedNutrition,
        modifications: appliedModifications,
        calculationMethod: 'spoonacular_api', // Using Spoonacular for ingredient nutrition
        accuracy: 'precise',
        source: 'spoonacular',
        micronutrientsIncluded: micronutrientsTracked
      };
    } catch (error) {
      console.error('❌ Error with Spoonacular modifications:', error);
      // Fallback to manual calculation
      return this.applyManualModifications(originalNutrition, modifications, servings);
    }
  }

  /**
   * Fallback manual calculation for when APIs fail
   * Uses basic estimation without micronutrient tracking
   */
  private applyManualModifications(
    originalNutrition: any,
    modifications: IngredientModification[],
    servings: number
  ): CustomizationResult {
    
    console.log('⚠️ Using manual estimation fallback (no micronutrient tracking)');
    
    let adjustedNutrition = originalNutrition.micros 
      ? JSON.parse(JSON.stringify(originalNutrition))
      : NutritionMappingService.fromSimplifiedFormat(originalNutrition);
    
    // Simple portion adjustment
    if (servings !== 1) {
      adjustedNutrition = NutritionMappingService.multiplyNutrition(adjustedNutrition, servings);
    }

    // Basic modification handling (very simplified, macros only)
    modifications.forEach(mod => {
      if (mod.type === 'omit' || mod.type === 'reduce') {
        const reductionPercent = mod.reductionPercent || 100; // Full removal if not specified
        const reductionFactor = reductionPercent / 100;
        
        // Estimate reduction by reducing all macros proportionally
        adjustedNutrition.calories.quantity = Math.max(0, adjustedNutrition.calories.quantity * (1 - reductionFactor));
        
        Object.keys(adjustedNutrition.macros).forEach(key => {
          if (adjustedNutrition.macros[key as keyof typeof adjustedNutrition.macros]) {
            adjustedNutrition.macros[key as keyof typeof adjustedNutrition.macros]!.quantity = 
              Math.max(0, adjustedNutrition.macros[key as keyof typeof adjustedNutrition.macros]!.quantity * (1 - reductionFactor));
          }
        });
      }
    });

    const standardizedOriginal = originalNutrition.micros 
      ? originalNutrition 
      : NutritionMappingService.fromSimplifiedFormat(originalNutrition);

    return {
      originalNutrition: standardizedOriginal,
      modifiedNutrition: adjustedNutrition,
      modifications,
      calculationMethod: 'manual_estimation',
      accuracy: 'approximate',
      source: 'edamam',
      micronutrientsIncluded: false // Manual calculations don't track micros
    };
  }

  private getAvailableModifications(source: 'edamam' | 'spoonacular'): any[] {
    const baseModifications = [
      {
        type: 'replace',
        description: 'Replace ingredient with another',
        available: true
      },
      {
        type: 'omit',
        description: 'Remove ingredient completely',
        available: true
      },
      {
        type: 'reduce',
        description: 'Reduce ingredient amount',
        available: true
      }
    ];

    if (source === 'spoonacular') {
      baseModifications.push({
        type: 'substitute',
        description: 'Use ingredient substitute',
        available: true
      });
    }

    return baseModifications;
  }
}
