import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { validateBody, clientSchema } from '../../lib/validation';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid client ID',
      message: 'Client ID is required and must be a valid UUID' 
    });
  }

  // GET - Fetch individual client
  if (req.method === 'GET') {
    try {
      const { data: client, error } = await supabase
        .from('clients')
        .select(`
          *,
          nutrition_requirements:client_nutrition_requirements!inner(
            id,
            eer_calories,
            nutritionist_notes,
            created_at,
            updated_at,
            is_active
          )
        `)
        .eq('id', id)
        .eq('nutritionist_id', req.user.id)
        .eq('client_nutrition_requirements.is_active', true)
        .single();

      if (error || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The requested client does not exist or you do not have access to it'
        });
      }

      // Format response to include EER data at top level
      const response = {
        ...client,
        eer_calories: client.nutrition_requirements?.[0]?.eer_calories || null,
        nutritionist_notes: client.nutrition_requirements?.[0]?.nutritionist_notes || null,
        eer_last_updated: client.nutrition_requirements?.[0]?.updated_at || null
      };

      // Remove the nested nutrition_requirements array
      delete response.nutrition_requirements;

      res.status(200).json({ client: response });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        error: 'Failed to fetch client',
        message: 'An error occurred while retrieving client data'
      });
    }
  }

  // PUT - Update client (including EER data)
  else if (req.method === 'PUT') {
    try {
      const { eer_calories, nutritionist_notes, original_ai_calculation, ...clientData } = req.body;

      // Update client data if provided
      if (Object.keys(clientData).length > 0) {
        const validation = validateBody(clientSchema, clientData);
        if (!validation.isValid) {
          return res.status(400).json({
            error: 'Validation failed',
            details: validation.errors
          });
        }

        const updateData = {
          ...validation.value,
          email: validation.value.email?.toLowerCase(),
          updated_at: new Date().toISOString()
        };

        const { error } = await supabase
          .from('clients')
          .update(updateData)
          .eq('id', id)
          .eq('nutritionist_id', req.user.id);

        if (error) {
          console.error('Update client error:', error);
          if (error.code === 'PGRST116') {
            return res.status(404).json({
              error: 'Client not found',
              message: 'The requested client does not exist or you do not have access to it'
            });
          }
          throw error;
        }
      }

      // Handle EER data if provided
      if (eer_calories !== undefined) {
        // Validate EER data
        if (eer_calories < 500 || eer_calories > 8000) {
          return res.status(400).json({
            error: 'Invalid EER calories',
            message: 'EER calories must be between 500 and 8000'
          });
        }

        // Deactivate existing nutrition requirements
        await supabase
          .from('client_nutrition_requirements')
          .update({ is_active: false })
          .eq('client_id', id);

        // Save new EER data
        const { error: eerError } = await supabase
          .from('client_nutrition_requirements')
          .insert({
            client_id: id,
            eer_calories: eer_calories,
            nutritionist_notes: nutritionist_notes || null,
            ai_calculation_data: original_ai_calculation || null,
            // Set minimal required fields
            protein_grams: 0,
            carbs_grams: 0,
            fat_grams: 0,
            calculation_method: 'nutritionist_approved',
            is_ai_generated: false,
            is_edited_by_nutritionist: true,
            is_active: true,
            approved_at: new Date().toISOString(),
            approved_by: req.user.id
          });

        if (eerError) {
          console.error('Save EER error:', eerError);
          return res.status(500).json({
            error: 'Failed to save EER data',
            message: 'An error occurred while saving EER information'
          });
        }
      }

      // Get updated client data
      const { data: updatedClient, error: fetchError } = await supabase
        .from('clients')
        .select(`
          *,
          nutrition_requirements:client_nutrition_requirements!inner(
            eer_calories,
            nutritionist_notes,
            updated_at
          )
        `)
        .eq('id', id)
        .eq('nutritionist_id', req.user.id)
        .eq('client_nutrition_requirements.is_active', true)
        .single();

      if (fetchError) {
        console.error('Fetch updated client error:', fetchError);
        // Still return success even if we can't fetch updated data
        return res.status(200).json({
          message: 'Client updated successfully'
        });
      }

      res.status(200).json({
        message: 'Client updated successfully',
        client: {
          ...updatedClient,
          eer_calories: updatedClient.nutrition_requirements?.[0]?.eer_calories || null,
          nutritionist_notes: updatedClient.nutrition_requirements?.[0]?.nutritionist_notes || null,
          eer_last_updated: updatedClient.nutrition_requirements?.[0]?.updated_at || null
        }
      });

    } catch (error) {
      console.error('Update client error:', error);
      res.status(500).json({
        error: 'Failed to update client',
        message: 'An error occurred while updating the client'
      });
    }
  }

  // DELETE - Delete client
  else if (req.method === 'DELETE') {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id)
        .eq('nutritionist_id', req.user.id);

      if (error) {
        console.error('Delete client error:', error);
        if (error.code === 'PGRST116') {
          return res.status(404).json({
            error: 'Client not found',
            message: 'The requested client does not exist or you do not have access to it'
          });
        }
        throw error;
      }

      res.status(200).json({
        message: 'Client deleted successfully'
      });
    } catch (error) {
      console.error('Delete client error:', error);
      res.status(500).json({
        error: 'Failed to delete client',
        message: 'An error occurred while deleting the client'
      });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

export default requireAuth(handler); 