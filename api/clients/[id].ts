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
          client_nutrition_requirements(
            id,
            eer_calories,
            protein_grams,
            carbs_grams,
            fat_grams,
            created_at,
            is_active
          )
        `)
        .eq('id', id)
        .eq('nutritionist_id', req.user.id)
        .single();

      if (error || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The requested client does not exist or you do not have access to it'
        });
      }

      res.status(200).json({ client });
    } catch (error) {
      console.error('Get client error:', error);
      res.status(500).json({
        error: 'Failed to fetch client',
        message: 'An error occurred while retrieving client data'
      });
    }
  }

  // PUT - Update client
  else if (req.method === 'PUT') {
    try {
      const validation = validateBody(clientSchema, req.body);
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

      const { data: client, error } = await supabase
        .from('clients')
        .update(updateData)
        .eq('id', id)
        .eq('nutritionist_id', req.user.id)
        .select()
        .single();

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

      res.status(200).json({
        message: 'Client updated successfully',
        client
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