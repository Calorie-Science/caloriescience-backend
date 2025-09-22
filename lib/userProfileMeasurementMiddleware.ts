/**
 * User Profile-Based Measurement System Middleware
 * 
 * No sessionId required! Uses:
 * 1. User's profile measurement system preference
 * 2. Client's preference (when viewing client data)
 * 3. Query/header overrides
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { userProfileMeasurementService, extractMeasurementSystemFromRequest } from './userProfileMeasurementSystem';
import { formatNutritionDisplay } from './nutritionDisplayUtils';
import { MeasurementSystem } from './measurementSystem';

/**
 * Apply measurement system formatting to API response data
 */
export function applyMeasurementSystemFormatting(
  data: any,
  measurementSystem: MeasurementSystem,
  options: {
    formatDates?: boolean;
    formatNutrition?: boolean;
    formatPhysicalMeasurements?: boolean;
    excludeFields?: string[];
  } = {}
): any {
  const {
    formatDates = true,
    formatNutrition = true,
    formatPhysicalMeasurements = true,
    excludeFields = []
  } = options;

  if (!data || typeof data !== 'object') {
    return data;
  }

  // Clone data to avoid mutation
  let result = JSON.parse(JSON.stringify(data));

  // Apply comprehensive formatting
  if (formatDates || formatNutrition || formatPhysicalMeasurements) {
    result = formatNutritionDisplay(result, measurementSystem);
  }

  // Remove excluded fields
  if (excludeFields.length > 0) {
    result = removeExcludedFields(result, excludeFields);
  }

  // Add metadata about measurement system
  if (typeof result === 'object' && !Array.isArray(result)) {
    result._measurementSystem = {
      system: measurementSystem,
      label: measurementSystem === 'metric' ? 'Metric' : 'Imperial',
      appliedAt: new Date().toISOString()
    };
  }

  return result;
}

/**
 * Remove excluded fields from data
 */
function removeExcludedFields(data: any, excludeFields: string[]): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => removeExcludedFields(item, excludeFields));
  }

  const result = { ...data };
  for (const field of excludeFields) {
    delete result[field];
  }

  // Recursively process nested objects
  for (const [key, value] of Object.entries(result)) {
    if (typeof value === 'object') {
      result[key] = removeExcludedFields(value, excludeFields);
    }
  }

  return result;
}

/**
 * Enhanced response function using user profile preferences
 */
export async function enhanceWithUserProfile(
  data: any,
  req: VercelRequest,
  options: {
    formatNutrition?: boolean;
    formatPhysicalMeasurements?: boolean;
    formatDates?: boolean;
    excludeFields?: string[];
  } = {}
): Promise<any> {
  
  try {
    // Get user from request
    const user = (req as any).user;
    if (!user?.id) {
      // If no user, just return original data with metric system
      return applyMeasurementSystemFormatting(data, 'metric', options);
    }
    
    // Extract measurement parameters from request
    const { override, forceNutritionistSystem, clientId } = extractMeasurementSystemFromRequest(req);
    
    // Get measurement context from user profile
    const context = await userProfileMeasurementService.getMeasurementContext(
      user.id,
      clientId,
      override,
      forceNutritionistSystem
    );
    
    // Apply formatting
    const formatted = applyMeasurementSystemFormatting(data, context.currentSystem, options);
    
    // Add enhanced metadata
    if (typeof formatted === 'object' && !Array.isArray(formatted)) {
      formatted._measurementSystem = {
        current: context.currentSystem,
        label: context.label,
        source: context.source,
        nutritionistSystem: context.nutritionistSystem,
        clientSystem: context.clientSystem,
        appliedAt: new Date().toISOString()
      };
    }
    
    return formatted;
    
  } catch (error) {
    console.error('Error in user profile measurement middleware:', error);
    // Fallback to original data with metric system
    return applyMeasurementSystemFormatting(data, 'metric', options);
  }
}

/**
 * Simple function to replace enhanceResponseWithMeasurementSystem
 * 
 * Usage: Replace this in existing APIs:
 *   const enhanced = enhanceResponseWithMeasurementSystem(data, req, options);
 * With:
 *   const enhanced = await enhanceWithUserProfile(data, req, options);
 */
export async function enhanceResponseWithUserProfile(
  data: any,
  req: VercelRequest,
  options: {
    formatNutrition?: boolean;
    formatPhysicalMeasurements?: boolean;
    formatDates?: boolean;
    excludeFields?: string[];
  } = {}
): Promise<any> {
  return enhanceWithUserProfile(data, req, options);
}

/**
 * Middleware wrapper for API handlers (user profile-based)
 */
export function withUserProfileMeasurementSystem(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | void>,
  options: {
    formatNutrition?: boolean;
    formatPhysicalMeasurements?: boolean;
    formatDates?: boolean;
    excludeFields?: string[];
  } = {}
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override res.json to apply measurement system formatting
    res.json = async function(data: any) {
      try {
        const enhanced = await enhanceWithUserProfile(data, req, options);
        return originalJson(enhanced);
      } catch (error) {
        console.error('Error in user profile measurement middleware:', error);
        return originalJson(data);
      }
    };
    
    // Call original handler
    return handler(req, res);
  };
}

/**
 * Get current measurement system for a request (utility function)
 */
export async function getCurrentMeasurementSystemFromProfile(req: VercelRequest): Promise<MeasurementSystem> {
  try {
    const user = (req as any).user;
    if (!user?.id) return 'metric';
    
    const { override, forceNutritionistSystem, clientId } = extractMeasurementSystemFromRequest(req);
    
    const context = await userProfileMeasurementService.getMeasurementContext(
      user.id,
      clientId,
      override,
      forceNutritionistSystem
    );
    
    return context.currentSystem;
  } catch (error) {
    console.error('Error getting measurement system from profile:', error);
    return 'metric';
  }
}
