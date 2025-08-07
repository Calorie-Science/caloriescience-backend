import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { validateAndTransformClient } from '../../lib/validation';
import { transformWithMapping, FIELD_MAPPINGS } from '../../lib/caseTransform';
import { calculateHealthMetrics } from '../../lib/healthMetrics';
import { getEERGuidelineFromLocation } from '../../lib/locationMapping';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method === 'GET') {
    // Get all clients for nutritionist
    try {
      const { status, page = 1, limit = 20, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let query = supabase
        .from('clients')
        .select(`
          *,
          client_nutrition_requirements(
            id,
            eer_calories,
            created_at,
            is_active
          )
        `, { count: 'exact' })
        .eq('nutritionist_id', req.user.id)
        .order('created_at', { ascending: false });

      // Apply filters
      if (status && status !== 'all') {
        query = query.eq('status', status);
      }

      if (search) {
        query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,full_name.ilike.%${search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + Number(limit) - 1);

      const { data: clients, error, count } = await query;

      if (error) {
        console.error('Get clients error:', error);
        throw error;
      }

      // Transform database response to camelCase
      const transformedClients = transformWithMapping(clients || [], FIELD_MAPPINGS.snakeToCamel);

      res.status(200).json({
        clients: transformedClients,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: count || 0,
          pages: Math.ceil((count || 0) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get clients error:', error);
      res.status(500).json({
        error: 'Failed to fetch clients',
        message: 'An error occurred while retrieving client data'
      });
    }
  }

  else if (req.method === 'POST') {
    // Create new client
    try {
      const validation = validateAndTransformClient(req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }

      const clientData = {
        ...validation.value,
        nutritionist_id: req.user.id,
        email: validation.value.email?.toLowerCase(),
        // Auto-generate full_name for backward compatibility
        full_name: validation.value.full_name || `${validation.value.first_name} ${validation.value.last_name || ''}`.trim(),
        // Auto-determine EER guideline from location
        eer_guideline: getEERGuidelineFromLocation(validation.value.location)
      };

      // Remove eer_calories from client data as it belongs in nutrition_requirements table
      delete clientData.eer_calories;

      // Calculate BMI if height and weight are provided AND BMI is not already provided
      if (validation.value.height_cm && validation.value.weight_kg && !validation.value.bmi) {
        const healthMetrics = calculateHealthMetrics(
          validation.value.height_cm,
          validation.value.weight_kg,
          validation.value.bmr // Pass BMR if provided from EER calculation
        );
        
        // Transform health metrics to snake_case for database
        const transformedHealthMetrics = transformWithMapping(healthMetrics, FIELD_MAPPINGS.camelToSnake);
        Object.assign(clientData, transformedHealthMetrics);
      } else if (validation.value.bmi || validation.value.bmr) {
        // If BMI/BMR are provided from EER calculation, set the last calculated timestamps
        const now = new Date().toISOString();
        if (validation.value.bmi) {
          clientData.bmi_last_calculated = now;
        }
        if (validation.value.bmr) {
          clientData.bmr_last_calculated = now;
        }
      }

      const { data: client, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) {
        console.error('Create client error:', error);
        console.error('Client data that failed:', JSON.stringify(clientData, null, 2));
        
        // Return specific error details for debugging
        return res.status(500).json({
          error: 'Failed to create client',
          message: 'An error occurred while creating the client',
          details: error.message,
          code: error.code,
          hint: error.hint
        });
      }

      // If EER data is provided, create nutrition requirements record
      if (validation.value.eer_calories) {
        const nutritionData = {
          client_id: client.id,
          eer_calories: validation.value.eer_calories,
          calculation_method: 'formula_based',
          is_ai_generated: false,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        const { error: nutritionError } = await supabase
          .from('client_nutrition_requirements')
          .insert(nutritionData);

        if (nutritionError) {
          console.warn('Failed to create nutrition requirements:', nutritionError);
          // Don't fail the client creation, just log the warning
        }
      }

      // Transform response to camelCase
      const transformedClient = transformWithMapping(client, FIELD_MAPPINGS.snakeToCamel);

      res.status(201).json({
        message: 'Client created successfully',
        client: transformedClient
      });
    } catch (error) {
      console.error('Create client error:', error);
      res.status(500).json({
        error: 'Failed to create client',
        message: 'An error occurred while creating the client'
      });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler); 