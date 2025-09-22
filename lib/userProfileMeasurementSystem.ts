/**
 * User Profile-Based Measurement System
 * 
 * Stores measurement system preference directly in user profile.
 * No sessionId needed - just uses JWT token + database preferences.
 */

import { MeasurementSystem } from './measurementSystem';
import { supabase } from './supabase';

export interface UserMeasurementPreferences {
  nutritionistId: string;
  nutritionistSystem: MeasurementSystem;
  useClientSystemByDefault: boolean; // Whether to automatically use client's system when viewing clients
}

export interface MeasurementContext {
  currentSystem: MeasurementSystem;
  source: 'override' | 'client-preference' | 'user-default';
  label: string;
  nutritionistSystem: MeasurementSystem;
  clientSystem?: MeasurementSystem;
  useClientSystemByDefault: boolean;
}

export class UserProfileMeasurementService {
  
  /**
   * Get user's measurement system preferences from profile
   */
  async getUserPreferences(nutritionistId: string): Promise<UserMeasurementPreferences> {
    const { data: user } = await supabase
      .from('users')
      .select('preferred_measurement_system')
      .eq('id', nutritionistId)
      .single();
    
    return {
      nutritionistId,
      nutritionistSystem: user?.preferred_measurement_system || 'metric',
      useClientSystemByDefault: true // Default behavior: use client's system when viewing clients
    };
  }
  
  /**
   * Get measurement system context for a request
   */
  async getMeasurementContext(
    nutritionistId: string,
    clientId?: string,
    override?: MeasurementSystem,
    forceNutritionistSystem?: boolean
  ): Promise<MeasurementContext> {
    
    // Get user preferences
    const userPrefs = await this.getUserPreferences(nutritionistId);
    
    // Get client's preferred system if viewing client data
    let clientSystem: MeasurementSystem | undefined;
    if (clientId) {
      const { data: client } = await supabase
        .from('clients')
        .select('preferred_measurement_system')
        .eq('id', clientId)
        .single();
      
      clientSystem = client?.preferred_measurement_system || userPrefs.nutritionistSystem;
    }
    
    // Determine current system
    let currentSystem: MeasurementSystem;
    let source: MeasurementContext['source'];
    let label: string;
    
    // 1. Override parameter (highest priority)
    if (override) {
      currentSystem = override;
      source = 'override';
      label = `Values shown in: ${currentSystem === 'metric' ? 'Metric' : 'Imperial'} (Override)`;
    }
    // 2. Force nutritionist system
    else if (forceNutritionistSystem) {
      currentSystem = userPrefs.nutritionistSystem;
      source = 'user-default';
      label = `Values shown in: ${currentSystem === 'metric' ? 'Metric' : 'Imperial'} (Your System)`;
    }
    // 3. Use client's system if viewing client data and user prefers client system by default
    else if (clientId && clientSystem && userPrefs.useClientSystemByDefault) {
      currentSystem = clientSystem;
      source = 'client-preference';
      label = `Values shown in: ${currentSystem === 'metric' ? 'Metric' : 'Imperial'} (Client's System)`;
    }
    // 4. Use nutritionist's default system
    else {
      currentSystem = userPrefs.nutritionistSystem;
      source = 'user-default';
      label = `Values shown in: ${currentSystem === 'metric' ? 'Metric' : 'Imperial'} (Your Default)`;
    }
    
    return {
      currentSystem,
      source,
      label,
      nutritionistSystem: userPrefs.nutritionistSystem,
      clientSystem,
      useClientSystemByDefault: userPrefs.useClientSystemByDefault
    };
  }
  
  /**
   * Update user's default measurement system
   */
  async updateUserMeasurementSystem(
    nutritionistId: string,
    system: MeasurementSystem
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          preferred_measurement_system: system,
          updated_at: new Date().toISOString()
        })
        .eq('id', nutritionistId);

      return !error;
    } catch (error) {
      console.error('Error updating user measurement system:', error);
      return false;
    }
  }
  
  /**
   * Update client's measurement system preference
   */
  async updateClientMeasurementSystem(
    clientId: string,
    system: MeasurementSystem
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ 
          preferred_measurement_system: system,
          updated_at: new Date().toISOString()
        })
        .eq('id', clientId);

      return !error;
    } catch (error) {
      console.error('Error updating client measurement system:', error);
      return false;
    }
  }
}

/**
 * Extract measurement system parameters from request
 */
export function extractMeasurementSystemFromRequest(req: any): {
  override?: MeasurementSystem;
  forceNutritionistSystem?: boolean;
  clientId?: string;
} {
  // Check query parameters and headers for override
  const queryOverride = req.query.measurementSystem;
  const headerOverride = req.headers['x-measurement-system'];
  const forceNutritionistSystem = req.headers['x-use-nutritionist-system'] === 'true' || 
                                 req.query.useNutritionistSystem === 'true';
  
  let override: MeasurementSystem | undefined;
  if (queryOverride === 'metric' || queryOverride === 'imperial') {
    override = queryOverride;
  } else if (headerOverride === 'metric' || headerOverride === 'imperial') {
    override = headerOverride;
  }
  
  const clientId = req.query.clientId as string | undefined || req.body?.clientId;
  
  return {
    override,
    forceNutritionistSystem,
    clientId
  };
}

// Export singleton
export const userProfileMeasurementService = new UserProfileMeasurementService();
