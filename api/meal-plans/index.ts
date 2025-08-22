import { VercelRequest, VercelResponse } from '@vercel/node';
import { MealPlanningService, MealPlanGenerationRequest } from '../../lib/mealPlanningService';
import { requireAuth } from '../../lib/auth';

const mealPlanningService = new MealPlanningService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // POST - Generate new meal plan (preview or save)
  if (req.method === 'POST') {
    try {
      const {
        action = 'save', // 'preview' or 'save'
        clientId,
        planDate,
        planType = 'daily',
        dietaryRestrictions = [],
        cuisinePreferences = [],
        mealPreferences = {},
        targetCalories
      } = req.body;

      // Validate action
      if (!['preview', 'save'].includes(action)) {
        return res.status(400).json({
          error: 'Invalid action',
          message: 'action must be either "preview" or "save"'
        });
      }

      // Validation
      if (!clientId) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'clientId is required'
        });
      }

      if (!planDate) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'planDate is required (YYYY-MM-DD format)'
        });
      }

      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(planDate)) {
        return res.status(400).json({
          error: 'Invalid date format',
          message: 'planDate must be in YYYY-MM-DD format'
        });
      }

      // Check if plan date is not in the past
      const planDateObj = new Date(planDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (planDateObj < today) {
        return res.status(400).json({
          error: 'Invalid date',
          message: 'Plan date cannot be in the past'
        });
      }

      // Check if client exists and belongs to the authenticated nutritionist
      const { data: client, error: clientError } = await require('../../lib/supabase').supabase
        .from('clients')
        .select('id, nutritionist_id')
        .eq('id', clientId)
        .eq('nutritionist_id', user.id)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The specified client does not exist or you do not have access to it'
        });
      }

      // Generate meal plan
      const mealPlanRequest: MealPlanGenerationRequest = {
        clientId,
        planDate,
        planType,
        dietaryRestrictions,
        cuisinePreferences,
        mealPreferences,
        targetCalories
      };

      console.log('🔍 API Debug - User ID from JWT:', user.id);
      console.log('🔍 API Debug - User object:', JSON.stringify(user, null, 2));
      
      // Use a simple user ID for Edamam instead of the UUID
      const edamamUserId = 'nutritionist1';
      console.log('🔍 API Debug - Using Edamam User ID:', edamamUserId);
      console.log('🚨 TEST DEBUG - This should appear in logs!');
      
      const generatedMealPlan = await mealPlanningService.generateMealPlan(mealPlanRequest, edamamUserId);

      // Handle based on action
      if (action === 'preview') {
        // Return preview without saving
        return res.status(200).json({
          message: 'Meal plan preview generated successfully',
          action: 'preview',
          mealPlan: {
            ...generatedMealPlan,
            id: 'preview-' + Date.now(), // Temporary ID for preview
            status: 'preview'
          }
        });
      } else {
        // Save to database
        const planId = await mealPlanningService.saveMealPlan(generatedMealPlan);

        // Return the generated meal plan with the new ID
        const savedMealPlan = await mealPlanningService.getMealPlan(planId);

        return res.status(201).json({
          message: 'Meal plan generated and saved successfully',
          action: 'save',
          mealPlan: savedMealPlan
        });
      }

    } catch (error) {
      console.error('Error generating meal plan:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to generate meal plan'
      });
    }
  }

  // GET - List meal plans for a client
  if (req.method === 'GET') {
    try {
      const { clientId } = req.query;

      if (!clientId || typeof clientId !== 'string') {
        return res.status(400).json({
          error: 'Missing required parameter',
          message: 'clientId query parameter is required'
        });
      }

      // Check if client exists and belongs to the authenticated nutritionist
      const { data: client, error: clientError } = await require('../../lib/supabase').supabase
        .from('clients')
        .select('id, nutritionist_id')
        .eq('id', clientId)
        .eq('nutritionist_id', user.id)
        .single();

      if (clientError || !client) {
        return res.status(404).json({
          error: 'Client not found',
          message: 'The specified client does not exist or you do not have access to it'
        });
      }

      // Get meal plans for the client
      const mealPlans = await mealPlanningService.getClientMealPlans(clientId);

      return res.status(200).json({
        message: 'Meal plans retrieved successfully',
        mealPlans,
        count: mealPlans.length
      });

    } catch (error) {
      console.error('Error fetching meal plans:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch meal plans'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only POST and GET methods are allowed'
  });
}

export default requireAuth(handler);
