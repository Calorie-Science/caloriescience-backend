import { supabase } from './supabase';

export interface EdamamApiKey {
  id: string;
  appId: string;
  appKey: string;
  apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete';
  isActive: boolean;
  usageCount: number;
  maxUsageLimit: number;
  createdAt: string;
  updatedAt: string;
  lastUsedAt?: string;
  notes?: string;
}

export interface ApiKeyUsageResult {
  success: boolean;
  appId?: string;
  appKey?: string;
  error?: string;
  needsRotation?: boolean;
}

export class EdamamApiKeyService {
  
  /**
   * Get an active API key for the specified API type
   * Returns the key with the lowest usage count
   */
  async getActiveApiKey(apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete'): Promise<ApiKeyUsageResult> {
    try {
      console.log(`🔑 Edamam API Key Service - Getting active key for ${apiType}`);
      
      const { data, error } = await supabase
        .from('edamam_api_keys')
        .select('*')
        .eq('api_type', apiType)
        .eq('is_active', true)
        .order('usage_count', { ascending: true })
        .limit(1)
        .single();

      if (error) {
        console.error(`❌ Edamam API Key Service - Error fetching ${apiType} key:`, error);
        return {
          success: false,
          error: `Failed to fetch ${apiType} API key: ${error.message}`
        };
      }

      if (!data) {
        console.error(`❌ Edamam API Key Service - No active ${apiType} key found`);
        return {
          success: false,
          error: `No active ${apiType} API key found`
        };
      }

      const needsRotation = data.usage_count >= data.max_usage_limit;
      
      console.log(`✅ Edamam API Key Service - Found ${apiType} key:`, {
        appId: data.app_id,
        usageCount: data.usage_count,
        maxLimit: data.max_usage_limit,
        needsRotation
      });

      return {
        success: true,
        appId: data.app_id,
        appKey: data.app_key,
        needsRotation
      };

    } catch (error) {
      console.error(`❌ Edamam API Key Service - Unexpected error getting ${apiType} key:`, error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Increment usage count for an API key
   */
  async incrementUsage(appId: string, apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete'): Promise<boolean> {
    try {
      console.log(`🔑 Edamam API Key Service - Incrementing usage for ${apiType} key: ${appId}`);
      
      // First get the current usage count
      const { data: currentKey, error: fetchError } = await supabase
        .from('edamam_api_keys')
        .select('usage_count')
        .eq('app_id', appId)
        .eq('api_type', apiType)
        .single();

      if (fetchError || !currentKey) {
        console.error(`❌ Edamam API Key Service - Error fetching current usage:`, fetchError);
        return false;
      }

      // Then increment it
      const { error } = await supabase
        .from('edamam_api_keys')
        .update({
          usage_count: currentKey.usage_count + 1,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('app_id', appId)
        .eq('api_type', apiType);

      if (error) {
        console.error(`❌ Edamam API Key Service - Error incrementing usage:`, error);
        return false;
      }

      console.log(`✅ Edamam API Key Service - Usage incremented for ${apiType} key: ${appId}`);
      return true;

    } catch (error) {
      console.error(`❌ Edamam API Key Service - Unexpected error incrementing usage:`, error);
      return false;
    }
  }

  /**
   * Check if an API key needs rotation (usage >= 90% of limit)
   */
  async checkRotationNeeded(appId: string, apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete'): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('edamam_api_keys')
        .select('usage_count, max_usage_limit')
        .eq('app_id', appId)
        .eq('api_type', apiType)
        .single();

      if (error || !data) {
        console.error(`❌ Edamam API Key Service - Error checking rotation status:`, error);
        return false;
      }

      const usagePercentage = (data.usage_count / data.max_usage_limit) * 100;
      const needsRotation = usagePercentage >= 90;

      console.log(`🔑 Edamam API Key Service - Rotation check for ${apiType} key ${appId}:`, {
        usageCount: data.usage_count,
        maxLimit: data.max_usage_limit,
        usagePercentage: usagePercentage.toFixed(1) + '%',
        needsRotation
      });

      return needsRotation;

    } catch (error) {
      console.error(`❌ Edamam API Key Service - Unexpected error checking rotation:`, error);
      return false;
    }
  }

  /**
   * Add a new API key to the database
   */
  async addApiKey(
    appId: string, 
    appKey: string, 
    apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete',
    maxUsageLimit: number = 100,
    notes?: string
  ): Promise<boolean> {
    try {
      console.log(`🔑 Edamam API Key Service - Adding new ${apiType} key: ${appId}`);
      
      const { error } = await supabase
        .from('edamam_api_keys')
        .insert({
          app_id: appId,
          app_key: appKey,
          api_type: apiType,
          is_active: true,
          usage_count: 0,
          max_usage_limit: maxUsageLimit,
          notes: notes || `Added via API key rotation`
        });

      if (error) {
        console.error(`❌ Edamam API Key Service - Error adding API key:`, error);
        return false;
      }

      console.log(`✅ Edamam API Key Service - New ${apiType} key added: ${appId}`);
      return true;

    } catch (error) {
      console.error(`❌ Edamam API Key Service - Unexpected error adding API key:`, error);
      return false;
    }
  }

  /**
   * Deactivate an API key (mark as inactive)
   */
  async deactivateApiKey(appId: string, apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete'): Promise<boolean> {
    try {
      console.log(`🔑 Edamam API Key Service - Deactivating ${apiType} key: ${appId}`);
      
      const { error } = await supabase
        .from('edamam_api_keys')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('app_id', appId)
        .eq('api_type', apiType);

      if (error) {
        console.error(`❌ Edamam API Key Service - Error deactivating API key:`, error);
        return false;
      }

      console.log(`✅ Edamam API Key Service - ${apiType} key deactivated: ${appId}`);
      return true;

    } catch (error) {
      console.error(`❌ Edamam API Key Service - Unexpected error deactivating API key:`, error);
      return false;
    }
  }

  /**
   * Get all API keys for a specific type (for monitoring)
   */
  async getApiKeys(apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete'): Promise<EdamamApiKey[]> {
    try {
      const { data, error } = await supabase
        .from('edamam_api_keys')
        .select('*')
        .eq('api_type', apiType)
        .order('usage_count', { ascending: true });

      if (error) {
        console.error(`❌ Edamam API Key Service - Error fetching ${apiType} keys:`, error);
        return [];
      }

      return data.map(key => ({
        id: key.id,
        appId: key.app_id,
        appKey: key.app_key,
        apiType: key.api_type,
        isActive: key.is_active,
        usageCount: key.usage_count,
        maxUsageLimit: key.max_usage_limit,
        createdAt: key.created_at,
        updatedAt: key.updated_at,
        lastUsedAt: key.last_used_at,
        notes: key.notes
      }));

    } catch (error) {
      console.error(`❌ Edamam API Key Service - Unexpected error fetching API keys:`, error);
      return [];
    }
  }
}
