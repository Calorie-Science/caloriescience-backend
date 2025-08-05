import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { client_id } = req.body;

    if (!client_id) {
      return res.status(400).json({
        error: 'Client ID required',
        message: 'Please provide a valid client ID'
      });
    }

    // Update client status to active
    const { data: client, error } = await supabase
      .from('clients')
      .update({
        status: 'active',
        converted_to_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', client_id)
      .eq('nutritionist_id', req.user.id)
      .select()
      .single();

    if (error) {
      console.error('Convert client error:', error);
      throw error;
    }

    if (!client) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'Client not found or you do not have permission to access it'
      });
    }

    res.status(200).json({
      message: 'Client converted to active successfully',
      client
    });
  } catch (error) {
    console.error('Convert client error:', error);
    res.status(500).json({
      error: 'Failed to convert client',
      message: 'An error occurred while converting the client to active status'
    });
  }
}

export default requireAuth(handler); 