import { VercelRequest, VercelResponse } from '@vercel/node';
import { MealPlanningService } from '../../lib/mealPlanningService';
import { requireAuth } from '../../lib/auth';

const mealPlanningService = new MealPlanningService();

async function handler(req: VercelRequest, res: VercelResponse): Promise<VercelResponse | void> {
  // Get user from request (set by requireAuth middleware)
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // POST - Save a previewed meal plan
  if (req.method === 'POST') {
    try {
      const {
        clientId,
        planDate,
        planType = 'daily',
        targetCalories,
        targetProtein,
        targetCarbs,
        targetFat,
        targetFiber,
        dietaryRestrictions = [],
        cuisinePreferences = [],
        meals = []
      } = req.body;

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

      if (!meals || meals.length === 0) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'meals array is required'
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

      // Create meal plan object from preview data
      const mealPlan = {
        id: '', // Will be set when saved
        clientId,
        nutritionistId: user.id,
        planName: `${planType || 'Daily'} Meal Plan`,
        planDate,
        planType: planType || 'daily',
        status: 'draft',
        targetCalories: targetCalories || 0,
        targetProtein: targetProtein || 0,
        targetCarbs: targetCarbs || 0,
        targetFat: targetFat || 0,
        targetFiber: targetFiber || 0,
        dietaryRestrictions,
        cuisinePreferences,
        meals,
        nutritionSummary: {
          totalCalories: meals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0),
          totalProtein: meals.reduce((sum, meal) => sum + (meal.totalProtein || 0), 0),
          totalCarbs: meals.reduce((sum, meal) => sum + (meal.totalCarbs || 0), 0),
          totalFat: meals.reduce((sum, meal) => sum + (meal.totalFat || 0), 0),
          totalFiber: meals.reduce((sum, meal) => sum + (meal.totalFiber || 0), 0),
          proteinPercentage: 0, // Will be calculated by service
          carbsPercentage: 0,   // Will be calculated by service
          fatPercentage: 0      // Will be calculated by service
        },
        generatedAt: new Date().toISOString()
      };

      // Save to database
      const planId = await mealPlanningService.saveMealPlan(mealPlan);

      // Return the saved meal plan
      const savedMealPlan = await mealPlanningService.getMealPlan(planId);

      return res.status(201).json({
        message: 'Preview meal plan saved successfully',
        action: 'save_preview',
        mealPlan: savedMealPlan
      });

    } catch (error) {
      console.error('Error saving preview meal plan:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to save preview meal plan'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only POST method is allowed'
  });
}

export default requireAuth(handler);
