import { healthLabelsService, HealthLabelsForProvider } from './healthLabelsService';

/**
 * Enhanced service for transforming health labels using the standardized mapping system
 * This replaces the hardcoded mappings in mealDataTransformService
 */
export class HealthLabelsTransformService {
  private mappingCache: Map<string, HealthLabelsForProvider> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Convert our standard dietary restrictions to provider-specific health labels
   * This is the main method that replaces convertDietaryRestrictionsToEdamam
   */
  async convertHealthLabelsForProvider(
    standardLabels: string[], 
    providerName: string = 'edamam'
  ): Promise<HealthLabelsForProvider> {
    // Check cache first
    const cacheKey = `${providerName}:${standardLabels.sort().join(',')}`;
    const cachedResult = this.getCachedMapping(cacheKey);
    
    if (cachedResult) {
      return cachedResult;
    }

    try {
      // Use the health labels service to convert
      const result = await healthLabelsService.convertLabelsForProvider(
        standardLabels, 
        providerName
      );

      // Cache the result
      this.setCachedMapping(cacheKey, result);

      console.log(`🏷️ Health Labels Transform - Converted ${standardLabels.length} labels for ${providerName}:`, {
        input: standardLabels,
        output: result
      });

      return result;
    } catch (error) {
      console.error(`Error converting health labels for ${providerName}:`, error);
      
      // Return empty result on error
      return {
        provider: providerName,
        healthLabels: [],
        cuisineTypes: []
      };
    }
  }

  /**
   * Convert dietary restrictions specifically to Edamam format (backward compatibility)
   */
  async convertDietaryRestrictionsToEdamam(restrictions: string[]): Promise<string[]> {
    const result = await this.convertHealthLabelsForProvider(restrictions, 'edamam');
    return result.healthLabels;
  }

  /**
   * Convert cuisine preferences to provider format (backward compatibility)
   */
  async convertCuisinePreferencesToProvider(
    cuisines: string[], 
    providerName: string = 'edamam'
  ): Promise<string[]> {
    const result = await this.convertHealthLabelsForProvider(cuisines, providerName);
    return result.cuisineTypes;
  }

  /**
   * Validate health labels for a specific provider
   */
  async validateLabelsForProvider(
    standardLabels: string[], 
    providerName: string
  ): Promise<{ valid: boolean; unsupportedLabels: string[] }> {
    return healthLabelsService.validateLabelsForProvider(standardLabels, providerName);
  }

  /**
   * Get all supported labels for a provider
   */
  async getSupportedLabelsForProvider(providerName: string): Promise<string[]> {
    return healthLabelsService.getSupportedLabelsForProvider(providerName);
  }

  /**
   * Merge allergies and preferences for meal planning (replaces clientGoalsMealPlanningIntegration logic)
   */
  async mergeAllergiesAndPreferencesForProvider(
    allergies: string[] = [],
    preferences: string[] = [],
    providerName: string = 'edamam'
  ): Promise<HealthLabelsForProvider> {
    const allLabels = [...allergies, ...preferences];
    return this.convertHealthLabelsForProvider(allLabels, providerName);
  }

  /**
   * Convert mixed health labels (allergies + preferences + cuisines) for a provider
   */
  async convertMixedLabelsForProvider(
    allergies: string[] = [],
    preferences: string[] = [],
    cuisineTypes: string[] = [],
    providerName: string = 'edamam'
  ): Promise<HealthLabelsForProvider> {
    const allLabels = [...allergies, ...preferences, ...cuisineTypes];
    return this.convertHealthLabelsForProvider(allLabels, providerName);
  }

  /**
   * Get provider-specific label format for debugging
   */
  async getProviderLabelFormat(
    standardLabel: string, 
    providerName: string
  ): Promise<{ found: boolean; providerLabel?: string; supported: boolean }> {
    const mappings = await healthLabelsService.getMappingsForProvider(providerName);
    const mapping = mappings.find(m => m.standardLabelKey === standardLabel);
    
    return {
      found: !!mapping,
      providerLabel: mapping?.providerLabelKey,
      supported: mapping?.isSupported || false
    };
  }

  /**
   * Batch convert multiple label sets for different providers
   */
  async convertForMultipleProviders(
    standardLabels: string[],
    providerNames: string[]
  ): Promise<Record<string, HealthLabelsForProvider>> {
    const results: Record<string, HealthLabelsForProvider> = {};
    
    await Promise.all(
      providerNames.map(async (provider) => {
        results[provider] = await this.convertHealthLabelsForProvider(
          standardLabels, 
          provider
        );
      })
    );
    
    return results;
  }

  /**
   * Clear the mapping cache (useful for testing or when mappings are updated)
   */
  clearCache(): void {
    this.mappingCache.clear();
    this.cacheExpiry.clear();
  }

  /**
   * Get cached mapping if still valid
   */
  private getCachedMapping(key: string): HealthLabelsForProvider | null {
    const expiry = this.cacheExpiry.get(key);
    if (!expiry || Date.now() > expiry) {
      this.mappingCache.delete(key);
      this.cacheExpiry.delete(key);
      return null;
    }
    
    return this.mappingCache.get(key) || null;
  }

  /**
   * Set cached mapping with expiry
   */
  private setCachedMapping(key: string, mapping: HealthLabelsForProvider): void {
    this.mappingCache.set(key, mapping);
    this.cacheExpiry.set(key, Date.now() + this.CACHE_TTL);
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): { size: number; hitRate?: number } {
    return {
      size: this.mappingCache.size
    };
  }
}

// Create singleton instance
export const healthLabelsTransformService = new HealthLabelsTransformService();

// Export types for use in other services
export type { HealthLabelsForProvider } from './healthLabelsService';
