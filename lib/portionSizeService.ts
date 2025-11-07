import { supabase } from './supabase';
import { PortionSize, CreatePortionSizeInput, UpdatePortionSizeInput } from '../types/customRecipe';

export class PortionSizeService {
  /**
   * Get all portion sizes
   */
  async getAllPortionSizes(category?: string): Promise<PortionSize[]> {
    let query = supabase
      .from('portion_sizes')
      .select('*')
      .order('category', { ascending: true })
      .order('multiplier', { ascending: true });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching portion sizes:', error);
      throw new Error(`Failed to fetch portion sizes: ${error.message}`);
    }

    return (data || []).map(this.mapToPortionSize);
  }

  /**
   * Get portion sizes by category
   */
  async getPortionSizesByCategory(category: string): Promise<PortionSize[]> {
    return this.getAllPortionSizes(category);
  }

  /**
   * Get default portion sizes (one per category)
   */
  async getDefaultPortionSizes(): Promise<PortionSize[]> {
    const { data, error } = await supabase
      .from('portion_sizes')
      .select('*')
      .eq('is_default', true)
      .order('category', { ascending: true });

    if (error) {
      console.error('Error fetching default portion sizes:', error);
      throw new Error(`Failed to fetch default portion sizes: ${error.message}`);
    }

    return (data || []).map(this.mapToPortionSize);
  }

  /**
   * Get a single portion size by ID
   */
  async getPortionSizeById(id: string): Promise<PortionSize | null> {
    const { data, error } = await supabase
      .from('portion_sizes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      console.error('Error fetching portion size:', error);
      throw new Error(`Failed to fetch portion size: ${error.message}`);
    }

    return this.mapToPortionSize(data);
  }

  /**
   * Create a new portion size
   */
  async createPortionSize(input: CreatePortionSizeInput): Promise<PortionSize> {
    // Validate input
    this.validatePortionSizeInput(input);

    const { data, error } = await supabase
      .from('portion_sizes')
      .insert({
        name: input.name,
        description: input.description,
        category: input.category,
        food_category: input.foodCategory,
        volume_ml: input.volumeMl,
        weight_g: input.weightG,
        multiplier: input.multiplier,
        is_default: input.isDefault || false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating portion size:', error);
      throw new Error(`Failed to create portion size: ${error.message}`);
    }

    return this.mapToPortionSize(data);
  }

  /**
   * Update an existing portion size
   */
  async updatePortionSize(input: UpdatePortionSizeInput): Promise<PortionSize> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (input.name !== undefined) updateData.name = input.name;
    if (input.description !== undefined) updateData.description = input.description;
    if (input.category !== undefined) updateData.category = input.category;
    if (input.foodCategory !== undefined) updateData.food_category = input.foodCategory;
    if (input.volumeMl !== undefined) updateData.volume_ml = input.volumeMl;
    if (input.weightG !== undefined) updateData.weight_g = input.weightG;
    if (input.multiplier !== undefined) updateData.multiplier = input.multiplier;
    if (input.isDefault !== undefined) updateData.is_default = input.isDefault;

    const { data, error } = await supabase
      .from('portion_sizes')
      .update(updateData)
      .eq('id', input.id)
      .select()
      .single();

    if (error) {
      console.error('Error updating portion size:', error);
      throw new Error(`Failed to update portion size: ${error.message}`);
    }

    return this.mapToPortionSize(data);
  }

  /**
   * Delete a portion size
   */
  async deletePortionSize(id: string): Promise<void> {
    // Check if any recipes are using this portion size
    const { data: recipes, error: checkError } = await supabase
      .from('cached_recipes')
      .select('id')
      .eq('default_portion_size_id', id)
      .limit(1);

    if (checkError) {
      console.error('Error checking portion size usage:', checkError);
      throw new Error(`Failed to check portion size usage: ${checkError.message}`);
    }

    if (recipes && recipes.length > 0) {
      throw new Error('Cannot delete portion size that is being used by recipes');
    }

    const { error } = await supabase
      .from('portion_sizes')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting portion size:', error);
      throw new Error(`Failed to delete portion size: ${error.message}`);
    }
  }

  /**
   * Calculate nutrition values for a specific portion size
   */
  calculateNutritionForPortion(
    baseNutrition: {
      calories?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
      fiber?: number;
      [key: string]: any;
    },
    portionMultiplier: number
  ): any {
    const result: any = {};

    Object.keys(baseNutrition).forEach(key => {
      const value = baseNutrition[key];
      if (typeof value === 'number') {
        result[key] = Math.round(value * portionMultiplier * 100) / 100;
      } else if (typeof value === 'object' && value !== null) {
        // Handle nested nutrition objects (like macros, micros)
        result[key] = this.calculateNutritionForPortion(value, portionMultiplier);
      } else {
        result[key] = value;
      }
    });

    return result;
  }

  /**
   * Validate portion size input
   */
  private validatePortionSizeInput(input: CreatePortionSizeInput): void {
    if (!input.name || input.name.trim().length === 0) {
      throw new Error('Portion size name is required');
    }

    if (!input.category) {
      throw new Error('Portion size category is required');
    }

    if (input.multiplier === undefined || input.multiplier <= 0) {
      throw new Error('Portion size multiplier must be greater than 0');
    }

    // Validate that either volumeMl or weightG is provided
    if (!input.volumeMl && !input.weightG) {
      console.warn('Neither volumeMl nor weightG provided for portion size');
    }
  }

  /**
   * Map database record to PortionSize
   */
  private mapToPortionSize(data: any): PortionSize {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      category: data.category,
      foodCategory: data.food_category,
      volumeMl: data.volume_ml,
      weightG: data.weight_g,
      multiplier: data.multiplier,
      isDefault: data.is_default,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    };
  }
}
