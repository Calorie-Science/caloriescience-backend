import { EdamamService } from './edamamService';

export interface IngredientModification {
  type: 'replace' | 'omit' | 'reduce' | 'add';
  originalIngredient?: string;
  newIngredient?: string;
  reductionPercent?: number;
  notes?: string;
}

export interface CustomizationResult {
  originalNutrition: any;
  modifiedNutrition: any;
  modifications: IngredientModification[];
  calculationMethod: 'edamam_api' | 'spoonacular_api' | 'manual_estimation';
  accuracy: 'precise' | 'approximate';
  source: 'edamam' | 'spoonacular';
}

export class IngredientCustomizationService {
  private edamamService: EdamamService;
  private spoonacularApiKey: string;

  constructor() {
    this.edamamService = new EdamamService();
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
   */
  private async applyEdamamModifications(
    recipeId: string,
    originalNutrition: any,
    modifications: IngredientModification[],
    servings: number
  ): Promise<CustomizationResult> {
    
    let adjustedNutrition = { ...originalNutrition };
    const appliedModifications: IngredientModification[] = [];

    for (const modification of modifications) {
      switch (modification.type) {
        case 'replace':
          if (modification.originalIngredient && modification.newIngredient) {
            // Use existing Edamam system: subtract old, add new
            const oldNutrition = await this.edamamService.getIngredientNutrition(modification.originalIngredient);
            const newNutrition = await this.edamamService.getIngredientNutrition(modification.newIngredient);
            
            if (oldNutrition && newNutrition) {
              // Subtract old ingredient nutrition
              adjustedNutrition = this.subtractNutrition(adjustedNutrition, oldNutrition);
              // Add new ingredient nutrition
              adjustedNutrition = this.addNutrition(adjustedNutrition, newNutrition);
              appliedModifications.push(modification);
            }
          }
          break;

        case 'omit':
          if (modification.originalIngredient) {
            const ingredientNutrition = await this.edamamService.getIngredientNutrition(modification.originalIngredient);
            if (ingredientNutrition) {
              adjustedNutrition = this.subtractNutrition(adjustedNutrition, ingredientNutrition);
              appliedModifications.push(modification);
            }
          }
          break;

        case 'reduce':
          if (modification.originalIngredient && modification.reductionPercent) {
            const ingredientNutrition = await this.edamamService.getIngredientNutrition(modification.originalIngredient);
            if (ingredientNutrition) {
              const reductionFactor = (100 - modification.reductionPercent) / 100;
              const reducedNutrition = this.multiplyNutrition(ingredientNutrition, reductionFactor);
              adjustedNutrition = this.subtractNutrition(adjustedNutrition, ingredientNutrition);
              adjustedNutrition = this.addNutrition(adjustedNutrition, reducedNutrition);
              appliedModifications.push(modification);
            }
          }
          break;
      }
    }

    // Apply serving adjustment
    if (servings !== 1) {
      adjustedNutrition = this.multiplyNutrition(adjustedNutrition, servings);
    }

    return {
      originalNutrition,
      modifiedNutrition: adjustedNutrition,
      modifications: appliedModifications,
      calculationMethod: 'edamam_api',
      accuracy: 'precise',
      source: 'edamam'
    };
  }

  /**
   * Apply modifications using Spoonacular's API
   */
  private async applySpoonacularModifications(
    recipeId: string,
    originalNutrition: any,
    modifications: IngredientModification[],
    servings: number
  ): Promise<CustomizationResult> {
    
    try {
      // Use Spoonacular's custom nutrition calculation API
      const modificationData = modifications.map(mod => ({
        ingredientId: mod.originalIngredient,
        action: mod.type,
        substituteId: mod.newIngredient,
        reductionPercent: mod.reductionPercent
      }));

      const response = await fetch(
        `https://api.spoonacular.com/recipes/${recipeId}/nutritionWidget.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': this.spoonacularApiKey
          },
          body: JSON.stringify({
            servings: servings,
            modifications: modificationData
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Spoonacular custom nutrition API error: ${response.status}`);
      }

      const customNutrition = await response.json();

      return {
        originalNutrition,
        modifiedNutrition: customNutrition,
        modifications,
        calculationMethod: 'spoonacular_api',
        accuracy: 'precise',
        source: 'spoonacular'
      };
    } catch (error) {
      console.error('❌ Error with Spoonacular custom nutrition:', error);
      // Fallback to manual calculation
      return this.applyManualModifications(originalNutrition, modifications, servings);
    }
  }

  /**
   * Fallback manual calculation for when APIs fail
   */
  private applyManualModifications(
    originalNutrition: any,
    modifications: IngredientModification[],
    servings: number
  ): CustomizationResult {
    
    let adjustedNutrition = { ...originalNutrition };
    
    // Simple portion adjustment
    if (servings !== 1) {
      adjustedNutrition = this.multiplyNutrition(adjustedNutrition, servings);
    }

    // Basic modification handling (simplified)
    modifications.forEach(mod => {
      if (mod.type === 'omit' && mod.reductionPercent) {
        const reductionFactor = (100 - mod.reductionPercent) / 100;
        adjustedNutrition = this.multiplyNutrition(adjustedNutrition, reductionFactor);
      }
    });

    return {
      originalNutrition,
      modifiedNutrition: adjustedNutrition,
      modifications,
      calculationMethod: 'manual_estimation',
      accuracy: 'approximate',
      source: 'edamam' // Default to edamam for manual calculations
    };
  }

  /**
   * Helper methods for nutrition calculations
   */
  private subtractNutrition(base: any, toSubtract: any): any {
    return {
      calories: Math.max(0, (base.calories || 0) - (toSubtract.calories || 0)),
      protein: Math.max(0, (base.protein || 0) - (toSubtract.protein || 0)),
      carbs: Math.max(0, (base.carbs || 0) - (toSubtract.carbs || 0)),
      fat: Math.max(0, (base.fat || 0) - (toSubtract.fat || 0)),
      fiber: Math.max(0, (base.fiber || 0) - (toSubtract.fiber || 0))
    };
  }

  private addNutrition(base: any, toAdd: any): any {
    return {
      calories: (base.calories || 0) + (toAdd.calories || 0),
      protein: (base.protein || 0) + (toAdd.protein || 0),
      carbs: (base.carbs || 0) + (toAdd.carbs || 0),
      fat: (base.fat || 0) + (toAdd.fat || 0),
      fiber: (base.fiber || 0) + (toAdd.fiber || 0)
    };
  }

  private multiplyNutrition(nutrition: any, factor: number): any {
    return {
      calories: Math.round((nutrition.calories || 0) * factor),
      protein: (nutrition.protein || 0) * factor,
      carbs: (nutrition.carbs || 0) * factor,
      fat: (nutrition.fat || 0) * factor,
      fiber: (nutrition.fiber || 0) * factor
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
