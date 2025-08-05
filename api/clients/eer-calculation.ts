import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { calculateEERWithAssistant } from '../../lib/openai';
import { validateBody, eerCalculationSchema } from '../../lib/validation';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method === 'POST') {
    // Generate EER calculation using OpenAI Assistant
    try {
      const validation = validateBody(eerCalculationSchema, req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }

      const data = validation.value;

      // Check if client exists and belongs to nutritionist
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('id', data.client_id)
        .eq('nutritionist_id', req.user.id)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'Client not found or you do not have permission to access it'
        });
      }

      // Calculate EER using OpenAI Assistant
      const eerResult = await calculateEERWithAssistant({
        country: data.country,
        age: data.age,
        sex: data.sex,
        weight_kg: data.weight_kg,
        height_cm: data.height_cm,
        pal: data.pal,
        activity_level: data.activity_level,
        special_cases: data.special_cases,
        health_goals: data.health_goals,
        medical_conditions: data.medical_conditions
      });

      // Deactivate any existing nutrition requirements
      await supabase
        .from('client_nutrition_requirements')
        .update({ is_active: false })
        .eq('client_id', data.client_id);

      // Save new nutrition requirements to database
      const { data: nutritionReq, error: insertError } = await supabase
        .from('client_nutrition_requirements')
        .insert({
          client_id: data.client_id,
          ...eerResult,
          ai_calculation_data: { 
            input: data, 
            output: eerResult,
            timestamp: new Date().toISOString()
          },
          calculation_method: 'mifflin_st_jeor',
          is_ai_generated: true,
          is_active: true
        })
        .select()
        .single();

      if (insertError) {
        console.error('Insert nutrition requirements error:', insertError);
        throw insertError;
      }

      res.status(201).json({
        message: 'EER calculation completed successfully',
        client_name: client.full_name,
        nutrition_requirements: nutritionReq
      });
    } catch (error) {
      console.error('EER calculation error:', error);
      res.status(500).json({
        error: 'Failed to calculate EER requirements',
        message: 'An error occurred while calculating nutritional requirements'
      });
    }
  }

  else if (req.method === 'GET') {
    // Get existing EER calculation for client
    try {
      const { client_id } = req.query;

      if (!client_id) {
        return res.status(400).json({
          error: 'Client ID required',
          message: 'Please provide a client ID'
        });
      }

      // Verify client belongs to nutritionist
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id, full_name')
        .eq('id', client_id)
        .eq('nutritionist_id', req.user.id)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'Client not found or you do not have permission to access it'
        });
      }

      // Get active nutrition requirements
      const { data: nutritionReq, error } = await supabase
        .from('client_nutrition_requirements')
        .select('*')
        .eq('client_id', client_id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Get nutrition requirements error:', error);
        throw error;
      }

      res.status(200).json({
        client_name: client.full_name,
        nutrition_requirements: nutritionReq || null
      });
    } catch (error) {
      console.error('Get EER error:', error);
      res.status(500).json({
        error: 'Failed to fetch EER requirements',
        message: 'An error occurred while retrieving nutritional requirements'
      });
    }
  }

  else if (req.method === 'PUT') {
    // Update EER calculation (nutritionist edits)
    try {
      const { client_id, ...updates } = req.body;

      if (!client_id) {
        return res.status(400).json({
          error: 'Client ID required',
          message: 'Please provide a client ID'
        });
      }

      // Verify client belongs to nutritionist
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('id')
        .eq('id', client_id)
        .eq('nutritionist_id', req.user.id)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'Client not found or you do not have permission to access it'
        });
      }

      // Update nutrition requirements
      const { data: nutritionReq, error } = await supabase
        .from('client_nutrition_requirements')
        .update({
          ...updates,
          is_edited_by_nutritionist: true,
          updated_at: new Date().toISOString(),
          approved_at: new Date().toISOString(),
          approved_by: req.user.id
        })
        .eq('client_id', client_id)
        .eq('is_active', true)
        .select()
        .single();

      if (error) {
        console.error('Update nutrition requirements error:', error);
        throw error;
      }

      res.status(200).json({
        message: 'Nutrition requirements updated successfully',
        nutrition_requirements: nutritionReq
      });
    } catch (error) {
      console.error('Update EER error:', error);
      res.status(500).json({
        error: 'Failed to update EER requirements',
        message: 'An error occurred while updating nutritional requirements'
      });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler); 