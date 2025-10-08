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
   */
  private async applyEdamamModifications(
    recipeId: string,
    originalNutrition: any,
    modifications: IngredientModification[],
    servings: number
  ): Promise<CustomizationResult> {
    
    console.log('🔬 Starting Edamam ingredient modifications with micronutrient tracking');
    
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
            
            const newIngredientText = newUnit ? `${newAmount} ${newUnit} ${modification.newIngredient}` : `${newAmount} ${modification.newIngredient}`;
            const oldIngredientText = oldUnit ? `${oldAmount} ${oldUnit} ${modification.originalIngredient}` : `${oldAmount} ${modification.originalIngredient}`;
            
            // Get nutrition data for both ingredients from Spoonacular
            console.log(`  📝 Fetching nutrition for old: "${oldIngredientText}" (Spoonacular)`);
            const oldNutritionData = await this.spoonacularService.getIngredientNutrition(oldIngredientText);
            console.log(`  📝 Fetching nutrition for new: "${newIngredientText}" (Spoonacular)`);
            const newNutritionData = await this.spoonacularService.getIngredientNutrition(newIngredientText);
            
            if (oldNutritionData && newNutritionData) {
              // Transform to standardized format with full micronutrient data
              const oldNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(oldNutritionData);
              const newNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(newNutritionData);
              
              console.log(`  🔄 Replace: ${oldIngredientText} → ${newIngredientText}`);
              console.log(`     Old: ${oldNutrition.calories.quantity} kcal`);
              console.log(`     New: ${newNutrition.calories.quantity} kcal`);
              console.log(`     Net change: ${newNutrition.calories.quantity - oldNutrition.calories.quantity} kcal`);
              
              // Subtract old ingredient nutrition (including micros)
              adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, oldNutrition);
              // Add new ingredient nutrition (including micros)
              adjustedNutrition = NutritionMappingService.addNutrition(adjustedNutrition, newNutrition);
              
              appliedModifications.push(modification);
              micronutrientsTracked = true;
            }
          }
          break;

        case 'omit':
          if (modification.originalIngredient) {
            // Construct full ingredient text with amount and unit
            const amount = (modification as any).amount || 1;
            const unit = (modification as any).unit || '';
            const ingredientText = unit ? `${amount} ${unit} ${modification.originalIngredient}` : `${amount} ${modification.originalIngredient}`;
            
            console.log(`  📝 Fetching nutrition for omit: "${ingredientText}" (Spoonacular)`);
            const ingredientData = await this.spoonacularService.getIngredientNutrition(ingredientText);
            if (ingredientData) {
              const ingredientNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData);
              
              console.log(`  🚫 Omit: ${ingredientText}`);
              console.log(`     Removing: ${ingredientNutrition.calories.quantity} kcal, Iron: ${ingredientNutrition.micros.minerals.iron?.quantity || 0}mg`);
              
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
            
            console.log(`  📝 Fetching nutrition for: "${ingredientText}" (Spoonacular)`);
            const ingredientData = await this.spoonacularService.getIngredientNutrition(ingredientText);
            if (ingredientData) {
              const ingredientNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData);
              
              console.log(`  ➕ Add: ${ingredientText}`);
              console.log(`     Adding: ${ingredientNutrition.calories.quantity} kcal, Calcium: ${ingredientNutrition.micros.minerals.calcium?.quantity || 0}mg`);
              
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
            const ingredientText = unit ? `${amount} ${unit} ${modification.originalIngredient}` : `${amount} ${modification.originalIngredient}`;
            
            console.log(`  📝 Fetching nutrition for reduce: "${ingredientText}" (Spoonacular)`);
            const ingredientData = await this.spoonacularService.getIngredientNutrition(ingredientText);
            if (ingredientData) {
              const ingredientNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData);
              const reductionFactor = modification.reductionPercent / 100;
              
              console.log(`  📉 Reduce: ${ingredientText} by ${modification.reductionPercent}%`);
              
              // Calculate the amount to remove (reductionPercent of the ingredient)
              const amountToRemove = NutritionMappingService.multiplyNutrition(ingredientNutrition, reductionFactor);
              adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, amountToRemove);
              
              appliedModifications.push(modification);
              micronutrientsTracked = true;
            }
          }
          break;
      }
    }

    // Apply serving adjustment
    if (servings !== 1) {
      console.log(`📊 Adjusting for ${servings} servings`);
      adjustedNutrition = NutritionMappingService.multiplyNutrition(adjustedNutrition, servings);
    }

    console.log('✅ Edamam modifications complete');
    console.log(`   Final: ${adjustedNutrition.calories.quantity} kcal`);
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
      micronutrientsIncluded: micronutrientsTracked
    };
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
              
              const newIngredientText = newUnit ? `${newAmount} ${newUnit} ${modification.newIngredient}` : `${newAmount} ${modification.newIngredient}`;
              const oldIngredientText = oldUnit ? `${oldAmount} ${oldUnit} ${modification.originalIngredient}` : `${oldAmount} ${modification.originalIngredient}`;
              
              // Use Spoonacular for ingredient nutrition
              console.log(`  📝 Fetching nutrition for old: "${oldIngredientText}" (Spoonacular)`);
              const oldNutritionData = await this.spoonacularService.getIngredientNutrition(oldIngredientText);
              console.log(`  📝 Fetching nutrition for new: "${newIngredientText}" (Spoonacular)`);
              const newNutritionData = await this.spoonacularService.getIngredientNutrition(newIngredientText);
              
              if (oldNutritionData && newNutritionData) {
                const oldNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(oldNutritionData);
                const newNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(newNutritionData);
                
                console.log(`  🔄 Replace: ${oldIngredientText} → ${newIngredientText}`);
                console.log(`     Old: ${oldNutrition.calories.quantity} kcal`);
                console.log(`     New: ${newNutrition.calories.quantity} kcal`);
                console.log(`     Net change: ${newNutrition.calories.quantity - oldNutrition.calories.quantity} kcal`);
                
                adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, oldNutrition);
                adjustedNutrition = NutritionMappingService.addNutrition(adjustedNutrition, newNutrition);
                
                appliedModifications.push(modification);
                micronutrientsTracked = true;
              }
            }
            break;

          case 'omit':
            if (modification.originalIngredient) {
              // Construct full ingredient text with amount and unit
              const amount = (modification as any).amount || 1;
              const unit = (modification as any).unit || '';
              const ingredientText = unit ? `${amount} ${unit} ${modification.originalIngredient}` : `${amount} ${modification.originalIngredient}`;
              
              console.log(`  📝 Fetching nutrition for omit: "${ingredientText}" (Spoonacular)`);
              const ingredientData = await this.spoonacularService.getIngredientNutrition(ingredientText);
              if (ingredientData) {
                const ingredientNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData);
                console.log(`  🚫 Omit: ${ingredientText} (${ingredientNutrition.calories.quantity} kcal)`);
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
              
              console.log(`  📝 Fetching nutrition for: "${ingredientText}" (Spoonacular)`);
              const ingredientData = await this.spoonacularService.getIngredientNutrition(ingredientText);
              if (ingredientData) {
                const ingredientNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData);
                console.log(`  ➕ Add: ${ingredientText} (${ingredientNutrition.calories.quantity} kcal)`);
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
              const ingredientText = unit ? `${amount} ${unit} ${modification.originalIngredient}` : `${amount} ${modification.originalIngredient}`;
              
              console.log(`  📝 Fetching nutrition for reduce: "${ingredientText}" (Spoonacular)`);
              const ingredientData = await this.spoonacularService.getIngredientNutrition(ingredientText);
              if (ingredientData) {
                const ingredientNutrition = NutritionMappingService.transformSpoonacularIngredientNutrition(ingredientData);
                const reductionFactor = modification.reductionPercent / 100;
                console.log(`  📉 Reduce: ${ingredientText} by ${modification.reductionPercent}%`);
                const amountToRemove = NutritionMappingService.multiplyNutrition(ingredientNutrition, reductionFactor);
                adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, amountToRemove);
                appliedModifications.push(modification);
                micronutrientsTracked = true;
              }
            }
            break;
        }
      }

      // Apply serving adjustment
      if (servings !== 1) {
        console.log(`📊 Adjusting for ${servings} servings`);
        adjustedNutrition = NutritionMappingService.multiplyNutrition(adjustedNutrition, servings);
      }

      console.log('✅ Spoonacular modifications complete');
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
