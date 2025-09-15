import { EdamamApiKeyService } from './edamamApiKeyService';

export interface KeyRotationRequest {
  apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete';
  currentAppId: string;
  reason: 'usage_limit_reached' | 'manual_rotation' | 'key_expired';
}

export interface KeyRotationResponse {
  success: boolean;
  newAppId?: string;
  newAppKey?: string;
  error?: string;
  message?: string;
}

export class EdamamKeyRotationService {
  private apiKeyService: EdamamApiKeyService;
  private rotationApiUrl: string;
  private rotationApiKey: string;

  constructor() {
    this.apiKeyService = new EdamamApiKeyService();
    // These should be environment variables
    this.rotationApiUrl = process.env.EDAMAM_KEY_ROTATION_API_URL || 'https://api.your-key-rotation-service.com';
    this.rotationApiKey = process.env.EDAMAM_KEY_ROTATION_API_KEY || '';
  }

  /**
   * Call external API to get new Edamam API keys
   */
  private async callExternalRotationApi(request: KeyRotationRequest): Promise<KeyRotationResponse> {
    try {
      console.log(`🔄 Edamam Key Rotation Service - Calling external API for ${request.apiType} key rotation`);
      console.log(`🔄 Rotation API URL: ${this.rotationApiUrl}`);
      console.log(`🔄 Request:`, JSON.stringify(request, null, 2));

      const response = await fetch(`${this.rotationApiUrl}/rotate-key`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.rotationApiKey}`,
          'User-Agent': 'CalorieScience-App/1.0'
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ Edamam Key Rotation Service - External API error:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorText
        });
        
        return {
          success: false,
          error: `External API error: ${response.status} ${response.statusText}`
        };
      }

      const data = await response.json();
      console.log(`✅ Edamam Key Rotation Service - External API response:`, data);

      return {
        success: true,
        newAppId: data.newAppId,
        newAppKey: data.newAppKey,
        message: data.message || 'Key rotation successful'
      };

    } catch (error) {
      console.error(`❌ Edamam Key Rotation Service - Error calling external API:`, error);
      return {
        success: false,
        error: `Failed to call external API: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Rotate API key by calling external service and updating database
   */
  async rotateApiKey(
    apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete',
    currentAppId: string,
    reason: 'usage_limit_reached' | 'manual_rotation' | 'key_expired' = 'usage_limit_reached'
  ): Promise<KeyRotationResponse> {
    try {
      console.log(`🔄 Edamam Key Rotation Service - Starting key rotation for ${apiType} key: ${currentAppId}`);

      // 1. Call external API to get new keys
      const rotationRequest: KeyRotationRequest = {
        apiType,
        currentAppId,
        reason
      };

      const rotationResult = await this.callExternalRotationApi(rotationRequest);

      if (!rotationResult.success || !rotationResult.newAppId || !rotationResult.newAppKey) {
        console.error(`❌ Edamam Key Rotation Service - External API failed:`, rotationResult.error);
        return {
          success: false,
          error: `Key rotation failed: ${rotationResult.error}`
        };
      }

      // 2. Add new key to database
      const addKeySuccess = await this.apiKeyService.addApiKey(
        rotationResult.newAppId,
        rotationResult.newAppKey,
        apiType,
        100, // Default usage limit
        `Rotated from ${currentAppId} - ${reason}`
      );

      if (!addKeySuccess) {
        console.error(`❌ Edamam Key Rotation Service - Failed to add new key to database`);
        return {
          success: false,
          error: 'Failed to add new key to database'
        };
      }

      // 3. Deactivate old key
      const deactivateSuccess = await this.apiKeyService.deactivateApiKey(currentAppId, apiType);

      if (!deactivateSuccess) {
        console.warn(`⚠️ Edamam Key Rotation Service - Failed to deactivate old key, but new key was added`);
      }

      console.log(`✅ Edamam Key Rotation Service - Key rotation completed successfully`);
      console.log(`✅ Old key ${currentAppId} deactivated, new key ${rotationResult.newAppId} added`);

      return {
        success: true,
        newAppId: rotationResult.newAppId,
        newAppKey: rotationResult.newAppKey,
        message: `Key rotation successful. New ${apiType} key: ${rotationResult.newAppId}`
      };

    } catch (error) {
      console.error(`❌ Edamam Key Rotation Service - Unexpected error during key rotation:`, error);
      return {
        success: false,
        error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Check if key rotation is needed and perform it automatically
   */
  async checkAndRotateIfNeeded(
    apiType: 'meal_planner' | 'nutrition' | 'recipe' | 'autocomplete',
    appId: string
  ): Promise<{ needsRotation: boolean; rotationResult?: KeyRotationResponse }> {
    try {
      console.log(`🔄 Edamam Key Rotation Service - Checking if rotation needed for ${apiType} key: ${appId}`);

      const needsRotation = await this.apiKeyService.checkRotationNeeded(appId, apiType);

      if (!needsRotation) {
        console.log(`✅ Edamam Key Rotation Service - No rotation needed for ${apiType} key: ${appId}`);
        return { needsRotation: false };
      }

      console.log(`🔄 Edamam Key Rotation Service - Rotation needed for ${apiType} key: ${appId}`);
      
      const rotationResult = await this.rotateApiKey(apiType, appId, 'usage_limit_reached');

      return {
        needsRotation: true,
        rotationResult
      };

    } catch (error) {
      console.error(`❌ Edamam Key Rotation Service - Error checking rotation:`, error);
      return {
        needsRotation: false,
        rotationResult: {
          success: false,
          error: `Error checking rotation: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      };
    }
  }

  /**
   * Get rotation status for all API keys
   */
  async getRotationStatus(): Promise<{
    meal_planner: { total: number; active: number; nearLimit: number };
    nutrition: { total: number; active: number; nearLimit: number };
    recipe: { total: number; active: number; nearLimit: number };
    autocomplete: { total: number; active: number; nearLimit: number };
  }> {
    try {
      const apiTypes: ('meal_planner' | 'nutrition' | 'recipe' | 'autocomplete')[] = 
        ['meal_planner', 'nutrition', 'recipe', 'autocomplete'];

      const status: any = {};

      for (const apiType of apiTypes) {
        const keys = await this.apiKeyService.getApiKeys(apiType);
        
        status[apiType] = {
          total: keys.length,
          active: keys.filter(k => k.isActive).length,
          nearLimit: keys.filter(k => k.isActive && (k.usageCount / k.maxUsageLimit) >= 0.9).length
        };
      }

      return status;

    } catch (error) {
      console.error(`❌ Edamam Key Rotation Service - Error getting rotation status:`, error);
      return {
        meal_planner: { total: 0, active: 0, nearLimit: 0 },
        nutrition: { total: 0, active: 0, nearLimit: 0 },
        recipe: { total: 0, active: 0, nearLimit: 0 },
        autocomplete: { total: 0, active: 0, nearLimit: 0 }
      };
    }
  }
}
