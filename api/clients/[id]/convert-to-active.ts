import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../../lib/supabase';
import { requireAuth } from '../../../lib/auth';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'PATCH, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ 
      error: 'Invalid client ID',
      message: 'Client ID is required and must be a valid UUID' 
    });
  }

  try {
    // First check if client exists and belongs to this nutritionist
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('id, status, full_name')
      .eq('id', id)
      .eq('nutritionist_id', req.user.id)
      .single();

    if (fetchError || !existingClient) {
      return res.status(404).json({
        error: 'Client not found',
        message: 'The requested client does not exist or you do not have access to it'
      });
    }

    // Check if client is already active
    if (existingClient.status === 'active') {
      return res.status(400).json({
        error: 'Client already active',
        message: 'This client is already in active status'
      });
    }

    // Update client status to active
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        status: 'active',
        converted_to_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('nutritionist_id', req.user.id)
      .select()
      .single();

    if (updateError) {
      console.error('Convert to active error:', updateError);
      throw updateError;
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');

    res.status(200).json({
      message: 'Client successfully converted to active status',
      client: updatedClient
    });

  } catch (error) {
    console.error('Convert client to active error:', error);
    res.status(500).json({
      error: 'Failed to convert client to active',
      message: 'An error occurred while updating the client status'
    });
  }
}

export default requireAuth(handler); 