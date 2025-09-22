/**
 * Example: How to handle ingredient editing with measurement system conversion
 * 
 * This shows the complete flow for when users edit ingredients in their preferred units
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import { 
  convertIngredientInputToMetric, 
  parseAndConvertIngredientText,
  getCurrentMeasurementSystemFromProfile 
} from './lib/userProfileMeasurementMiddleware';
import { EdamamService } from './lib/edamamService';

// Example API endpoint: PUT /api/meal-plans/{id}/meals/{mealId}/ingredients/{ingredientId}
async function updateIngredientHandler(req: VercelRequest, res: VercelResponse) {
  try {
    const user = (req as any).user;
    const { ingredientText, quantity, measure, food } = req.body;
    
    // 1. Get user's current measurement system preference
    const userMeasurementSystem = await getCurrentMeasurementSystemFromProfile(req);
    console.log(`👤 User measurement system: ${userMeasurementSystem}`);
    
    // 2. Convert user input to metric for Edamam API
    let metricIngredient;
    
    if (ingredientText) {
      // User provided text like "4.0 oz chicken breast"
      const parsed = parseAndConvertIngredientText(ingredientText, userMeasurementSystem);
      console.log(`📝 Original input: "${parsed.originalText}"`);
      console.log(`🔄 Converted for Edamam: "${parsed.convertedText}"`);
      metricIngredient = parsed.convertedText;
    } else if (quantity && measure && food) {
      // User provided structured data
      const converted = convertIngredientInputToMetric(
        { quantity, measure, food },
        userMeasurementSystem
      );
      console.log(`📊 Original: ${converted.originalInput.quantity} ${converted.originalInput.measure} ${converted.originalInput.food}`);
      console.log(`🔄 Converted: ${converted.quantity} ${converted.measure} ${converted.food}`);
      metricIngredient = `${converted.quantity} ${converted.measure} ${converted.food}`;
    }
    
    // 3. Call Edamam Nutrition API with metric units
    const edamamService = new EdamamService();
    const nutritionData = await edamamService.getNutritionData(metricIngredient, 'nutritionist1');
    
    if (!nutritionData || nutritionData.status === 'error') {
      return res.status(400).json({
        error: 'Invalid ingredient',
        message: 'Could not find nutritional information for this ingredient'
      });
    }
    
    // 4. Update meal plan in database (store in metric)
    // ... database update logic here ...
    
    // 5. Return response in user's preferred measurement system
    const responseData = {
      ingredient: {
        // Store original metric data
        text: metricIngredient,
        quantity: nutritionData.quantity,
        measure: nutritionData.measure,
        weight: nutritionData.weight,
        nutrition: nutritionData.nutrition,
        
        // Add display data for user's system
        originalUserInput: ingredientText || `${quantity} ${measure} ${food}`,
        userMeasurementSystem
      },
      message: 'Ingredient updated successfully'
    };
    
    // Apply measurement system formatting to response
    const enhancedResponse = await enhanceResponseWithUserProfile(responseData, req, {
      formatNutrition: true
    });
    
    return res.status(200).json(enhancedResponse);
    
  } catch (error) {
    console.error('Error updating ingredient:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update ingredient'
    });
  }
}

/**
 * Example usage scenarios:
 */

// SCENARIO 1: User in Imperial system edits ingredient
// User input: "4.0 oz chicken breast"
// Converted for Edamam: "113.4 g chicken breast"
// Edamam response: nutrition data for 113.4g
// User sees: "4.0 oz chicken breast (113.4g)" with imperial nutrition display

// SCENARIO 2: User in Metric system edits ingredient  
// User input: "200g salmon fillet"
// Sent to Edamam: "200g salmon fillet" (no conversion)
// User sees: "200g salmon fillet" with metric nutrition display

// SCENARIO 3: User toggles measurement system after editing
// Original edit: "4.0 oz chicken" (stored as 113.4g in DB)
// User toggles to metric: sees "113.4g chicken"
// User toggles back to imperial: sees "4.0 oz chicken (113.4g)"

export default updateIngredientHandler;
