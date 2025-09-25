import { supabase } from './supabase';

export interface HealthLabelCategory {
  id: string;
  name: string;
  description: string;
  priority: number;
  isActive: boolean;
}

export interface StandardHealthLabel {
  id: string;
  categoryId: string;
  categoryName: string;
  labelKey: string;
  displayName: string;
  description: string;
  severityLevel: 'critical' | 'high' | 'medium' | 'preference';
  isActive: boolean;
}

export interface FoodDatabaseProvider {
  id: string;
  providerName: string;
  displayName: string;
  apiBaseUrl: string;
  isActive: boolean;
  priority: number;
}

export interface HealthLabelMapping {
  id: string;
  standardLabelId: string;
  standardLabelKey: string;
  providerId: string;
  providerName: string;
  providerLabelKey: string;
  providerLabelValue?: string;
  isSupported: boolean;
  mappingNotes?: string;
}

export interface HealthLabelsForProvider {
  provider: string;
  healthLabels: string[];
  cuisineTypes: string[];
}

export class HealthLabelsService {
  /**
   * Get all health label categories
   */
  async getCategories(): Promise<HealthLabelCategory[]> {
    const { data, error } = await supabase
      .from('health_labels_categories')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching health label categories:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      priority: row.priority,
      isActive: row.is_active
    }));
  }

  /**
   * Get all standard health labels with category information
   */
  async getStandardLabels(): Promise<StandardHealthLabel[]> {
    const { data, error } = await supabase
      .from('health_labels_standard')
      .select(`
        *,
        health_labels_categories!inner (
          name
        )
      `)
      .eq('is_active', true)
      .eq('health_labels_categories.is_active', true)
      .order('health_labels_categories.priority', { ascending: true })
      .order('label_key', { ascending: true });

    if (error) {
      console.error('Error fetching standard health labels:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.health_labels_categories.name,
      labelKey: row.label_key,
      displayName: row.display_name,
      description: row.description,
      severityLevel: row.severity_level,
      isActive: row.is_active
    }));
  }

  /**
   * Get standard labels by category
   */
  async getStandardLabelsByCategory(categoryName: string): Promise<StandardHealthLabel[]> {
    const { data, error } = await supabase
      .from('health_labels_standard')
      .select(`
        *,
        health_labels_categories!inner (
          name
        )
      `)
      .eq('is_active', true)
      .eq('health_labels_categories.name', categoryName)
      .eq('health_labels_categories.is_active', true)
      .order('label_key', { ascending: true });

    if (error) {
      console.error(`Error fetching ${categoryName} health labels:`, error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      categoryId: row.category_id,
      categoryName: row.health_labels_categories.name,
      labelKey: row.label_key,
      displayName: row.display_name,
      description: row.description,
      severityLevel: row.severity_level,
      isActive: row.is_active
    }));
  }

  /**
   * Get all food database providers
   */
  async getProviders(): Promise<FoodDatabaseProvider[]> {
    const { data, error } = await supabase
      .from('food_database_providers')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching food database providers:', error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      providerName: row.provider_name,
      displayName: row.display_name,
      apiBaseUrl: row.api_base_url,
      isActive: row.is_active,
      priority: row.priority
    }));
  }

  /**
   * Get health label mappings for a specific provider
   */
  async getMappingsForProvider(providerName: string): Promise<HealthLabelMapping[]> {
    const { data, error } = await supabase
      .from('health_labels_provider_mapping')
      .select(`
        *,
        health_labels_standard!inner (
          label_key
        ),
        food_database_providers!inner (
          provider_name
        )
      `)
      .eq('food_database_providers.provider_name', providerName)
      .eq('food_database_providers.is_active', true)
      .eq('health_labels_standard.is_active', true)
      .order('health_labels_standard.label_key', { ascending: true });

    if (error) {
      console.error(`Error fetching mappings for ${providerName}:`, error);
      return [];
    }

    return data.map(row => ({
      id: row.id,
      standardLabelId: row.standard_label_id,
      standardLabelKey: row.health_labels_standard.label_key,
      providerId: row.provider_id,
      providerName: row.food_database_providers.provider_name,
      providerLabelKey: row.provider_label_key,
      providerLabelValue: row.provider_label_value,
      isSupported: row.is_supported,
      mappingNotes: row.mapping_notes
    }));
  }

  /**
   * Convert our standard health labels to provider-specific labels
   */
  async convertLabelsForProvider(
    standardLabels: string[], 
    providerName: string
  ): Promise<HealthLabelsForProvider> {
    const mappings = await this.getMappingsForProvider(providerName);
    
    const healthLabels: string[] = [];
    const cuisineTypes: string[] = [];
    
    // Get category information to separate health labels from cuisine types
    const categories = await this.getCategories();
    const cuisineCategoryId = categories.find(cat => cat.name === 'cuisine_type')?.id;
    
    for (const standardLabel of standardLabels) {
      const mapping = mappings.find(m => 
        m.standardLabelKey === standardLabel && m.isSupported
      );
      
      if (mapping && mapping.providerLabelKey) {
        // Check if this is a cuisine type by getting the standard label info
        const { data: labelInfo } = await supabase
          .from('health_labels_standard')
          .select('category_id')
          .eq('label_key', standardLabel)
          .single();
        
        if (labelInfo?.category_id === cuisineCategoryId) {
          cuisineTypes.push(mapping.providerLabelKey);
        } else {
          healthLabels.push(mapping.providerLabelKey);
        }
      } else {
        console.warn(`No supported mapping found for ${standardLabel} in ${providerName}`);
      }
    }
    
    return {
      provider: providerName,
      healthLabels: [...new Set(healthLabels)], // Remove duplicates
      cuisineTypes: [...new Set(cuisineTypes)]   // Remove duplicates
    };
  }

  /**
   * Get supported labels for a provider (for validation)
   */
  async getSupportedLabelsForProvider(providerName: string): Promise<string[]> {
    const mappings = await this.getMappingsForProvider(providerName);
    return mappings
      .filter(m => m.isSupported)
      .map(m => m.standardLabelKey);
  }

  /**
   * Validate that all provided labels are supported by a provider
   */
  async validateLabelsForProvider(
    standardLabels: string[], 
    providerName: string
  ): Promise<{ valid: boolean; unsupportedLabels: string[] }> {
    const supportedLabels = await this.getSupportedLabelsForProvider(providerName);
    const unsupportedLabels = standardLabels.filter(label => 
      !supportedLabels.includes(label)
    );
    
    return {
      valid: unsupportedLabels.length === 0,
      unsupportedLabels
    };
  }

  /**
   * Add a new health label mapping for a provider
   */
  async addMapping(
    standardLabelKey: string,
    providerName: string,
    providerLabelKey: string,
    isSupported: boolean = true,
    mappingNotes?: string
  ): Promise<boolean> {
    try {
      // Get the standard label ID
      const { data: standardLabel } = await supabase
        .from('health_labels_standard')
        .select('id')
        .eq('label_key', standardLabelKey)
        .single();

      if (!standardLabel) {
        console.error(`Standard label ${standardLabelKey} not found`);
        return false;
      }

      // Get the provider ID
      const { data: provider } = await supabase
        .from('food_database_providers')
        .select('id')
        .eq('provider_name', providerName)
        .single();

      if (!provider) {
        console.error(`Provider ${providerName} not found`);
        return false;
      }

      // Insert the mapping
      const { error } = await supabase
        .from('health_labels_provider_mapping')
        .insert({
          standard_label_id: standardLabel.id,
          provider_id: provider.id,
          provider_label_key: providerLabelKey,
          is_supported: isSupported,
          mapping_notes: mappingNotes
        });

      if (error) {
        console.error('Error adding health label mapping:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in addMapping:', error);
      return false;
    }
  }

  /**
   * Update an existing mapping
   */
  async updateMapping(
    mappingId: string,
    updates: {
      providerLabelKey?: string;
      isSupported?: boolean;
      mappingNotes?: string;
    }
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('health_labels_provider_mapping')
        .update({
          ...(updates.providerLabelKey && { provider_label_key: updates.providerLabelKey }),
          ...(updates.isSupported !== undefined && { is_supported: updates.isSupported }),
          ...(updates.mappingNotes !== undefined && { mapping_notes: updates.mappingNotes })
        })
        .eq('id', mappingId);

      if (error) {
        console.error('Error updating health label mapping:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateMapping:', error);
      return false;
    }
  }

  /**
   * Get all allergies (critical severity labels)
   */
  async getAllergies(): Promise<StandardHealthLabel[]> {
    return this.getStandardLabelsByCategory('allergy');
  }

  /**
   * Get all dietary preferences
   */
  async getDietaryPreferences(): Promise<StandardHealthLabel[]> {
    return this.getStandardLabelsByCategory('dietary_preference');
  }

  /**
   * Get all cuisine types
   */
  async getCuisineTypes(): Promise<StandardHealthLabel[]> {
    return this.getStandardLabelsByCategory('cuisine_type');
  }

  /**
   * Get nutrition focus labels
   */
  async getNutritionFocusLabels(): Promise<StandardHealthLabel[]> {
    return this.getStandardLabelsByCategory('nutrition_focus');
  }
}

// Create singleton instance
export const healthLabelsService = new HealthLabelsService();
