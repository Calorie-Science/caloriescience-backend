import { VercelRequest, VercelResponse } from '@vercel/node';
import { supabase } from '../../lib/supabase';
import { requireAuth } from '../../lib/auth';
import { transformWithMapping, FIELD_MAPPINGS } from '../../lib/caseTransform';

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get client counts by status
    const { data: clientStats, error: statsError } = await supabase
      .from('clients')
      .select('status, created_at')
      .eq('nutritionist_id', req.user.id);

    if (statsError) {
      console.error('Client stats error:', statsError);
      throw statsError;
    }

    const stats = {
      totalClients: clientStats.length,
      prospective: clientStats.filter(c => c.status === 'prospective').length,
      active: clientStats.filter(c => c.status === 'active').length,
      inactive: clientStats.filter(c => c.status === 'inactive').length,
      newThisMonth: clientStats.filter(c => {
        const createdDate = new Date(c.created_at);
        const now = new Date();
        return createdDate.getMonth() === now.getMonth() && 
               createdDate.getFullYear() === now.getFullYear();
      }).length
    };

    // Get recent clients
    const { data: recentClients, error: recentError } = await supabase
      .from('clients')
      .select('id, full_name, status, created_at, email')
      .eq('nutritionist_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('Recent clients error:', recentError);
      throw recentError;
    }

    // Get clients needing EER calculations
    const { data: clientsNeedingEER, error: eerError } = await supabase
      .from('clients')
      .select(`
        id, 
        full_name, 
        status, 
        created_at,
        client_nutrition_requirements!left(id)
      `)
      .eq('nutritionist_id', req.user.id)
      .eq('status', 'active')
      .is('client_nutrition_requirements.id', null)
      .limit(5);

    if (eerError) {
      console.error('Clients needing EER error:', eerError);
      throw eerError;
    }

    // Get upcoming interactions
    const { data: upcomingInteractions, error: interactionsError } = await supabase
      .from('client_interactions')
      .select(`
        id,
        title,
        interaction_type,
        scheduled_at,
        clients(full_name)
      `)
      .eq('nutritionist_id', req.user.id)
      .gte('scheduled_at', new Date().toISOString())
      .order('scheduled_at', { ascending: true })
      .limit(5);

    if (interactionsError) {
      console.error('Upcoming interactions error:', interactionsError);
      throw interactionsError;
    }

    // Transform all responses to camelCase
    const transformedRecentClients = transformWithMapping(recentClients || [], FIELD_MAPPINGS.snakeToCamel);
    const transformedClientsNeedingEER = transformWithMapping(clientsNeedingEER || [], FIELD_MAPPINGS.snakeToCamel);
    const transformedUpcomingInteractions = transformWithMapping(upcomingInteractions || [], FIELD_MAPPINGS.snakeToCamel);

    res.status(200).json({
      stats,
      recentClients: transformedRecentClients,
      clientsNeedingEer: transformedClientsNeedingEER,
      upcomingInteractions: transformedUpcomingInteractions
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard stats',
      message: 'An error occurred while retrieving dashboard statistics'
    });
  }
}

export default requireAuth(handler); 