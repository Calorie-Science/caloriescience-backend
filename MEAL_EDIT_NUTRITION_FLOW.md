# Meal Edit Nutrition Update Flow

## Overview
The system already implements comprehensive nutrition updates when editing meal previews. Here's how it works:

## Current Implementation

### 1. Edit Ingredient (`preview-edit-ingredient`)
**API Endpoint**: `POST /api/meal-plans`
**Action**: `preview-edit-ingredient`

**Flow**:
1. **Update Individual Ingredient**: Replace ingredient text in the meal's recipe
2. **Recalculate Meal Nutrition**: 
   - Fetch nutrition data for all remaining ingredients using Edamam API
   - Sum up total calories, weight, and all nutrients
   - Update recipe's `calories`, `totalWeight`, `totalNutrients`
   - Recalculate `nutritionSummary` per serving (dividing by yield)
3. **Update Daily Program Nutrition**:
   - Loop through all meals in the plan
   - Sum up nutrition from each meal's `nutritionSummary`
   - Round values to 2 decimal places
   - Update database with new `nutrition_summary`
4. **Return Updated Data**: Both meal and daily nutrition in response

### 2. Delete Ingredient (`preview-delete-ingredient`)
**API Endpoint**: `POST /api/meal-plans`
**Action**: `preview-delete-ingredient`

**Flow**:
1. **Remove Ingredient**: Delete ingredient from recipe ingredients array
2. **Recalculate Meal Nutrition**: Same as edit flow
3. **Update Daily Program Nutrition**: Same as edit flow
4. **Return Updated Data**: Both meal and daily nutrition in response

## Code Structure

### Key Files:
- `lib/mealPlanningService.ts`: Contains `editPreviewIngredient()` and `deletePreviewIngredient()`
- `api/meal-plans/index.ts`: API endpoint handlers
- `lib/edamamService.ts`: Nutrition data fetching

### Key Functions:
- `editPreviewIngredient()`: Lines 1767-1942 in mealPlanningService.ts
- `deletePreviewIngredient()`: Lines 1947-2122 in mealPlanningService.ts  
- `calculateDailyNutrition()`: Lines 2166-2212 in mealPlanningService.ts

## Nutrition Calculation Details

### Meal Level:
```javascript
// Per-serving nutrition calculation
const servings = meal.recipe.yield || 1;
meal.recipe.nutritionSummary = {
  calories: totalCalories / servings,
  protein: (totalNutrients['PROCNT']?.quantity || 0) / servings,
  carbs: (totalNutrients['CHOCDF']?.quantity || 0) / servings,
  fat: (totalNutrients['FAT']?.quantity || 0) / servings,
  fiber: (totalNutrients['FIBTG']?.quantity || 0) / servings,
  sodium: (totalNutrients['NA']?.quantity || 0) / servings,
  sugar: (totalNutrients['SUGAR']?.quantity || 0) / servings,
  servings: servings
};
```

### Daily Program Level:
```javascript
// Sum all meals' nutrition
const dailyNutrition = meals.reduce((acc, meal) => {
  const nutritionSummary = meal.recipe?.nutritionSummary || {};
  acc.totalCalories += nutritionSummary.calories || 0;
  acc.totalProtein += nutritionSummary.protein || 0;
  acc.totalCarbs += nutritionSummary.carbs || 0;
  acc.totalFat += nutritionSummary.fat || 0;
  // ... other nutrients
  return acc;
}, { totalCalories: 0, totalProtein: 0, /* ... */ });
```

## Database Updates

### Tables Updated:
1. **`meal_plans.generated_meals`**: Updated meal data with new recipe nutrition
2. **`meal_plans.nutrition_summary`**: Updated daily nutrition totals

### Update Pattern:
```javascript
// First update: meal data
await supabase
  .from('meal_plans')
  .update({ generated_meals: generatedMeals })
  .eq('id', previewId);

// Second update: daily nutrition
await supabase
  .from('meal_plans')
  .update({ nutrition_summary: dailyNutrition })
  .eq('id', previewId);
```

## API Response Structure

### Success Response:
```json
{
  "success": true,
  "data": {
    "mealPlan": {
      "meals": [...], // Updated meals array
      "dailyNutrition": {
        "totalCalories": 2187.27,
        "totalProtein": 170.65,
        "totalCarbs": 218.73,
        "totalFat": 75.62,
        "totalFiber": 46.4,
        "totalSodium": 2515.48,
        "totalSugar": 40.31
      }
    }
  }
}
```

## Testing

### Example cURL for Edit:
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "type": "meal-plan",
    "action": "preview-edit-ingredient",
    "previewId": "YOUR_PREVIEW_ID",
    "mealIndex": 0,
    "ingredientIndex": 0,
    "newIngredientText": "2 cups almond flour"
}'
```

### Example cURL for Delete:
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "type": "meal-plan", 
    "action": "preview-delete-ingredient",
    "previewId": "YOUR_PREVIEW_ID",
    "mealIndex": 0,
    "ingredientIndex": 0
}'
```

## Conclusion

✅ **The system already fully implements the requested functionality:**
- ✅ Updates individual meal nutrition when ingredients are edited/deleted
- ✅ Recalculates and updates daily program nutrition totals
- ✅ Stores updated data in database
- ✅ Returns updated nutrition data in API response
- ✅ Handles both edit and delete operations
- ✅ Uses consistent nutrition calculation logic
- ✅ Properly handles both old and new recipe data structures

**No additional implementation is needed** - the nutrition update functionality is already working as requested.
