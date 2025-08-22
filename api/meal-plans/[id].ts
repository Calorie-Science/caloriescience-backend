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

  const { id } = req.query;

  if (!id || typeof id !== 'string') {
    return res.status(400).json({
      error: 'Missing required parameter',
      message: 'Meal plan ID is required'
    });
  }

  // GET - Get specific meal plan
  if (req.method === 'GET') {
    try {
      const mealPlan = await mealPlanningService.getMealPlan(id);

      if (!mealPlan) {
        return res.status(404).json({
          error: 'Meal plan not found',
          message: 'The specified meal plan does not exist'
        });
      }

      // Check if the meal plan belongs to a client of the authenticated nutritionist
      if (mealPlan.nutritionistId !== user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this meal plan'
        });
      }

      return res.status(200).json({
        message: 'Meal plan retrieved successfully',
        mealPlan
      });

    } catch (error) {
      console.error('Error fetching meal plan:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch meal plan'
      });
    }
  }

  // PUT - Update meal plan status
  if (req.method === 'PUT') {
    try {
      const { status } = req.body;

      if (!status) {
        return res.status(400).json({
          error: 'Missing required field',
          message: 'status is required'
        });
      }

      // Validate status
      const validStatuses = ['draft', 'active', 'completed', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          error: 'Invalid status',
          message: `Status must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Get meal plan to check ownership
      const mealPlan = await mealPlanningService.getMealPlan(id);
      if (!mealPlan) {
        return res.status(404).json({
          error: 'Meal plan not found',
          message: 'The specified meal plan does not exist'
        });
      }

      // Check if the meal plan belongs to a client of the authenticated nutritionist
      if (mealPlan.nutritionistId !== user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this meal plan'
        });
      }

      // Update status
      const success = await mealPlanningService.updateMealPlanStatus(id, status);

      if (!success) {
        return res.status(500).json({
          error: 'Update failed',
          message: 'Failed to update meal plan status'
        });
      }

      // Get updated meal plan
      const updatedMealPlan = await mealPlanningService.getMealPlan(id);

      return res.status(200).json({
        message: 'Meal plan status updated successfully',
        mealPlan: updatedMealPlan
      });

    } catch (error) {
      console.error('Error updating meal plan:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to update meal plan'
      });
    }
  }

  // DELETE - Delete meal plan
  if (req.method === 'DELETE') {
    try {
      // Get meal plan to check ownership
      const mealPlan = await mealPlanningService.getMealPlan(id);
      if (!mealPlan) {
        return res.status(404).json({
          error: 'Meal plan not found',
          message: 'The specified meal plan does not exist'
        });
      }

      // Check if the meal plan belongs to a client of the authenticated nutritionist
      if (mealPlan.nutritionistId !== user.id) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this meal plan'
        });
      }

      // Delete meal plan
      const success = await mealPlanningService.deleteMealPlan(id);

      if (!success) {
        return res.status(500).json({
          error: 'Deletion failed',
          message: 'Failed to delete meal plan'
        });
      }

      return res.status(200).json({
        message: 'Meal plan deleted successfully'
      });

    } catch (error) {
      console.error('Error deleting meal plan:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to delete meal plan'
      });
    }
  }

  // Method not allowed
  return res.status(405).json({
    error: 'Method not allowed',
    message: 'Only GET, PUT, and DELETE methods are allowed'
  });
}

export default requireAuth(handler);
