import { supabase } from './supabase';

export interface EdamamApiLogData {
  // Request identification
  userId?: string;
  clientId?: string;
  sessionId?: string;
  
  // API details
  apiType: 'recipe_search' | 'nutrition_analysis' | 'meal_planner' | 'autocomplete' | 'ingredient_details';
  endpoint: string;
  httpMethod?: string;
  
  // Request data
  requestPayload?: any;
  requestParams?: any;
  requestHeaders?: any;
  
  // Response data
  responseStatus?: number;
  responsePayload?: any;
  responseHeaders?: any;
  responseSizeBytes?: number;
  
  // Performance metrics
  responseTimeMs?: number;
  apiKeyUsed?: string;
  rateLimitRemaining?: number;
  
  // Error tracking
  errorOccurred?: boolean;
  errorMessage?: string;
  errorCode?: string;
  
  // Usage context
  featureContext?: string;
  userAgent?: string;
  ipAddress?: string;
  
  // Cost tracking
  estimatedCostUsd?: number;
  creditsUsed?: number;
  
  // Metadata
  notes?: string;
  tags?: string[];
}

export interface EdamamApiLogEntry extends EdamamApiLogData {
  id: string;
  createdAt: string;
  processedAt?: string;
}

export class EdamamLoggingService {
  
  /**
   * Log an Edamam API request/response
   */
  async logApiCall(logData: EdamamApiLogData): Promise<{ success: boolean; logId?: string; error?: string }> {
    try {
      // Sanitize sensitive data
      const sanitizedData = this.sanitizeLogData(logData);
      
      // Prepare data for database
      const dbData = {
        user_id: sanitizedData.userId || null,
        client_id: sanitizedData.clientId || null,
        session_id: sanitizedData.sessionId || null,
        api_type: sanitizedData.apiType,
        endpoint: sanitizedData.endpoint,
        http_method: sanitizedData.httpMethod || 'GET',
        request_payload: sanitizedData.requestPayload || null,
        request_params: sanitizedData.requestParams || null,
        request_headers: sanitizedData.requestHeaders || null,
        response_status: sanitizedData.responseStatus || null,
        response_payload: sanitizedData.responsePayload || null,
        response_headers: sanitizedData.responseHeaders || null,
        response_size_bytes: sanitizedData.responseSizeBytes || null,
        response_time_ms: sanitizedData.responseTimeMs || null,
        api_key_used: sanitizedData.apiKeyUsed || null,
        rate_limit_remaining: sanitizedData.rateLimitRemaining || null,
        error_occurred: sanitizedData.errorOccurred || false,
        error_message: sanitizedData.errorMessage || null,
        error_code: sanitizedData.errorCode || null,
        feature_context: sanitizedData.featureContext || null,
        user_agent: sanitizedData.userAgent || null,
        ip_address: sanitizedData.ipAddress || null,
        estimated_cost_usd: sanitizedData.estimatedCostUsd || null,
        credits_used: sanitizedData.creditsUsed || null,
        notes: sanitizedData.notes || null,
        tags: sanitizedData.tags || null,
        processed_at: sanitizedData.responseStatus ? new Date().toISOString() : null
      };
      
      const { data, error } = await supabase
        .from('edamam_api_logs')
        .insert(dbData)
        .select('id')
        .single();
      
      if (error) {
        console.error('❌ Failed to log Edamam API call:', error);
        return { success: false, error: error.message };
      }
      
      return { success: true, logId: data.id };
      
    } catch (error) {
      console.error('❌ Error in EdamamLoggingService.logApiCall:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Get API logs with filters
   */
  async getApiLogs(filters: {
    userId?: string;
    clientId?: string;
    apiType?: string;
    featureContext?: string;
    errorOccurred?: boolean;
    startDate?: string;
    endDate?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ success: boolean; data?: EdamamApiLogEntry[]; totalCount?: number; error?: string }> {
    try {
      let query = supabase
        .from('edamam_api_logs')
        .select('*', { count: 'exact' });
      
      // Apply filters
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters.clientId) {
        query = query.eq('client_id', filters.clientId);
      }
      
      if (filters.apiType) {
        query = query.eq('api_type', filters.apiType);
      }
      
      if (filters.featureContext) {
        query = query.eq('feature_context', filters.featureContext);
      }
      
      if (filters.errorOccurred !== undefined) {
        query = query.eq('error_occurred', filters.errorOccurred);
      }
      
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      // Apply pagination
      const limit = filters.limit || 50;
      const offset = filters.offset || 0;
      query = query.range(offset, offset + limit - 1);
      
      // Order by most recent
      query = query.order('created_at', { ascending: false });
      
      const { data, error, count } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Transform to camelCase
      const transformedData = data?.map(this.transformDbToLogEntry) || [];
      
      return { 
        success: true, 
        data: transformedData, 
        totalCount: count || 0 
      };
      
    } catch (error) {
      console.error('❌ Error in EdamamLoggingService.getApiLogs:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Get API usage analytics
   */
  async getUsageAnalytics(filters: {
    userId?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      // Build analytics query
      let query = supabase
        .from('edamam_api_logs')
        .select(`
          api_type,
          feature_context,
          error_occurred,
          response_time_ms,
          estimated_cost_usd,
          created_at
        `);
      
      if (filters.userId) {
        query = query.eq('user_id', filters.userId);
      }
      
      if (filters.startDate) {
        query = query.gte('created_at', filters.startDate);
      }
      
      if (filters.endDate) {
        query = query.lte('created_at', filters.endDate);
      }
      
      const { data, error } = await query;
      
      if (error) {
        return { success: false, error: error.message };
      }
      
      // Calculate analytics
      const analytics = this.calculateAnalytics(data || []);
      
      return { success: true, data: analytics };
      
    } catch (error) {
      console.error('❌ Error in EdamamLoggingService.getUsageAnalytics:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }
  
  /**
   * Sanitize log data to remove sensitive information
   */
  private sanitizeLogData(logData: EdamamApiLogData): EdamamApiLogData {
    const sanitized = { ...logData };
    
    // Mask API key
    if (sanitized.apiKeyUsed) {
      sanitized.apiKeyUsed = this.maskApiKey(sanitized.apiKeyUsed);
    }
    
    // Remove sensitive headers
    if (sanitized.requestHeaders) {
      const { authorization, ...safeHeaders } = sanitized.requestHeaders;
      sanitized.requestHeaders = safeHeaders;
    }
    
    // Truncate large responses to prevent database bloat
    if (sanitized.responsePayload) {
      sanitized.responsePayload = this.truncateLargeResponse(sanitized.responsePayload);
    }
    
    return sanitized;
  }
  
  /**
   * Mask API key for logging
   */
  private maskApiKey(apiKey: string): string {
    if (apiKey.length <= 8) return '***';
    return apiKey.substring(0, 4) + '***' + apiKey.substring(apiKey.length - 4);
  }
  
  /**
   * Truncate large responses to prevent database bloat
   */
  private truncateLargeResponse(response: any): any {
    const responseStr = JSON.stringify(response);
    const maxSize = 100000; // 100KB limit
    
    if (responseStr.length > maxSize) {
      return {
        ...response,
        _truncated: true,
        _originalSize: responseStr.length,
        _truncatedAt: new Date().toISOString()
      };
    }
    
    return response;
  }
  
  /**
   * Transform database record to log entry
   */
  private transformDbToLogEntry(dbRecord: any): EdamamApiLogEntry {
    return {
      id: dbRecord.id,
      userId: dbRecord.user_id,
      clientId: dbRecord.client_id,
      sessionId: dbRecord.session_id,
      apiType: dbRecord.api_type,
      endpoint: dbRecord.endpoint,
      httpMethod: dbRecord.http_method,
      requestPayload: dbRecord.request_payload,
      requestParams: dbRecord.request_params,
      requestHeaders: dbRecord.request_headers,
      responseStatus: dbRecord.response_status,
      responsePayload: dbRecord.response_payload,
      responseHeaders: dbRecord.response_headers,
      responseSizeBytes: dbRecord.response_size_bytes,
      responseTimeMs: dbRecord.response_time_ms,
      apiKeyUsed: dbRecord.api_key_used,
      rateLimitRemaining: dbRecord.rate_limit_remaining,
      errorOccurred: dbRecord.error_occurred,
      errorMessage: dbRecord.error_message,
      errorCode: dbRecord.error_code,
      featureContext: dbRecord.feature_context,
      userAgent: dbRecord.user_agent,
      ipAddress: dbRecord.ip_address,
      estimatedCostUsd: dbRecord.estimated_cost_usd,
      creditsUsed: dbRecord.credits_used,
      notes: dbRecord.notes,
      tags: dbRecord.tags,
      createdAt: dbRecord.created_at,
      processedAt: dbRecord.processed_at
    };
  }
  
  /**
   * Calculate usage analytics from log data
   */
  private calculateAnalytics(logs: any[]): any {
    const analytics = {
      totalCalls: logs.length,
      callsByApiType: {} as Record<string, number>,
      callsByFeatureContext: {} as Record<string, number>,
      errorRate: 0,
      averageResponseTime: 0,
      totalCost: 0,
      dateRange: {
        start: null as string | null,
        end: null as string | null
      }
    };
    
    if (logs.length === 0) return analytics;
    
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    let errorCount = 0;
    let totalCost = 0;
    
    logs.forEach(log => {
      // Count by API type
      analytics.callsByApiType[log.api_type] = (analytics.callsByApiType[log.api_type] || 0) + 1;
      
      // Count by feature context
      if (log.feature_context) {
        analytics.callsByFeatureContext[log.feature_context] = (analytics.callsByFeatureContext[log.feature_context] || 0) + 1;
      }
      
      // Error tracking
      if (log.error_occurred) {
        errorCount++;
      }
      
      // Response time tracking
      if (log.response_time_ms) {
        totalResponseTime += log.response_time_ms;
        responseTimeCount++;
      }
      
      // Cost tracking
      if (log.estimated_cost_usd) {
        totalCost += parseFloat(log.estimated_cost_usd);
      }
    });
    
    // Calculate rates and averages
    analytics.errorRate = logs.length > 0 ? (errorCount / logs.length) * 100 : 0;
    analytics.averageResponseTime = responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0;
    analytics.totalCost = totalCost;
    
    // Date range
    const dates = logs.map(log => log.created_at).sort();
    analytics.dateRange.start = dates[0] || null;
    analytics.dateRange.end = dates[dates.length - 1] || null;
    
    return analytics;
  }
}
