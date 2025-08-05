import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { validateBody, clientSchema } from '../../lib/validation';

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
          client_nutrition_requirements!inner(
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
        query = query.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`);
      }

      // Apply pagination
      query = query.range(offset, offset + Number(limit) - 1);

      const { data: clients, error, count } = await query;

      if (error) {
        console.error('Get clients error:', error);
        throw error;
      }

      res.status(200).json({
        clients: clients || [],
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
      const validation = validateBody(clientSchema, req.body);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validation.errors
        });
      }

      const clientData = {
        ...validation.value,
        nutritionist_id: req.user.id,
        email: validation.value.email?.toLowerCase()
      };

      const { data: client, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single();

      if (error) {
        console.error('Create client error:', error);
        throw error;
      }

      res.status(201).json({
        message: 'Client created successfully',
        client
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