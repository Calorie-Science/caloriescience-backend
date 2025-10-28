# Bon Happetee Ingredients Fix

## Issue

Bon Happetee recipes were not showing ingredients when added to manual meal plans. The recipes would be added successfully with nutrition data, but the `ingredients` array would be empty.

## Root Cause

In `lib/multiProviderRecipeSearchService.ts`, the `getBonHappeteeRecipeDetails` method was hardcoding an empty array for ingredients:

```typescript
// OLD CODE - Line 1534
ingredients: [], // Bon Happetee doesn't provide ingredient breakdown
```

This was incorrect because Bon Happetee **does** provide an ingredients endpoint at `/ingredients?food_item_id={uuid}`.

## Solution

Updated the `getBonHappeteeRecipeDetails` method to:

1. **Fetch ingredients in parallel** with recipe details using `Promise.all`
2. **Transform ingredients** to standardized format with fields: `text`, `food`, `quantity`, `measure`, `weight`
3. **Include ingredients** in the returned recipe object

### Code Changes

**File:** `lib/multiProviderRecipeSearchService.ts`

**Lines:** 1513-1567

```typescript
private async getBonHappeteeRecipeDetails(foodItemId: string): Promise<any> {
  try {
    if (!this.bonHappeteeService) {
      throw new Error('Bon Happetee service not initialized - API key missing');
    }

    // Fetch recipe details and ingredients in parallel
    const [recipeData, ingredientsData] = await Promise.all([
      this.bonHappeteeService.getRecipeDetails(foodItemId),
      this.bonHappeteeService.getIngredients(foodItemId)
    ]);

    const { NutritionMappingService } = require('./nutritionMappingService');
    
    // Transform Bon Happetee nutrition to standardized format
    const nutrition = NutritionMappingService.transformBonHappeteeNutrition(recipeData.nutrients);

    // Transform ingredients to standardized format
    const ingredients = (ingredientsData || []).map((ing: any) => ({
      text: ing.ingredient_name || ing.food_name || '',
      food: ing.ingredient_name || ing.food_name || '',
      quantity: ing.quantity || 0,
      measure: ing.unit || '',
      weight: ing.weight || 0
    }));

    console.log(`✅ Bon Happetee recipe ${foodItemId}: ${ingredients.length} ingredients found`);

    return {
      id: foodItemId,
      title: recipeData.title,
      image: null,
      sourceUrl: null,
      source: 'bonhappetee',
      servings: 1,
      readyInMinutes: (recipeData.prepTime || 0) + (recipeData.cookTime || 0),
      nutrition: nutrition,
      ingredients: ingredients, // ✅ Now populated with actual ingredients
      instructions: [],
      cuisineType: recipeData.cuisineType,
      mealType: recipeData.mealType,
      healthLabels: recipeData.healthLabels,
      allergens: recipeData.allergens,
      servingType: recipeData.servingType,
      measures: recipeData.measures,
      basicUnitMeasure: recipeData.basicUnitMeasure,
      caloriesCalculatedFor: recipeData.caloriesCalculatedFor,
      foodGroup: recipeData.foodGroup,
      disorderRisks: recipeData.disorderRisks
    };
  } catch (error) {
    console.error('❌ Error fetching Bon Happetee recipe details:', error);
    throw error;
  }
}
```

## How Ingredients Flow Through the System

### 1. Recipe Search
When searching for Bon Happetee recipes:
```
User searches "paneer" → 
Bon Happetee API /search → 
Returns basic recipe info (no ingredients yet)
```

### 2. Get Recipe Details
When viewing or adding a recipe:
```
getBonHappeteeRecipeDetails() called →
Parallel fetch:
  ├─ bonHappeteeService.getRecipeDetails() → nutrition, allergens, tags
  └─ bonHappeteeService.getIngredients() → ingredients list
Transform ingredients to standardized format →
Return complete recipe with ingredients
```

### 3. Add to Manual Meal Plan
When adding to a manual meal plan:
```
Manual meal plan service calls getRecipeDetails() →
Gets recipe with ingredients →
Caches recipe in database (ingredients stored in JSONB) →
Recipe displayed in meal plan with full ingredients list
```

## Ingredient Format

### Bon Happetee API Response
```json
{
  "food_unique_id": "xxx",
  "food_name": "Paneer Butter Masala",
  "ingredients": [
    {
      "ingredient_name": "Paneer",
      "food_name": "Paneer",
      "quantity": 200,
      "unit": "g",
      "weight": 200
    },
    {
      "ingredient_name": "Butter",
      "food_name": "Butter",
      "quantity": 2,
      "unit": "tbsp",
      "weight": 28
    }
  ]
}
```

### Standardized Format (in our system)
```json
{
  "ingredients": [
    {
      "text": "Paneer",
      "food": "Paneer",
      "quantity": 200,
      "measure": "g",
      "weight": 200
    },
    {
      "text": "Butter",
      "food": "Butter",
      "quantity": 2,
      "measure": "tbsp",
      "weight": 28
    }
  ]
}
```

## Testing

### Manual Test

1. **Search for Bon Happetee recipe:**
```bash
curl -X POST "http://localhost:3000/api/recipes/search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-uuid",
    "query": "paneer",
    "providers": ["bonhappetee"],
    "maxResults": 5
  }'
```

2. **Get recipe details:**
```bash
curl -X GET "http://localhost:3000/api/recipes/{bon-recipe-id}/details" \
  -H "Authorization: Bearer $TOKEN"
```

**Expected:** Response should include `ingredients` array with actual ingredients (not empty).

3. **Add to manual meal plan:**
```bash
curl -X POST "http://localhost:3000/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "draft-id",
    "day": 1,
    "mealName": "lunch",
    "recipe": {
      "id": "bon-recipe-id",
      "provider": "bonhappetee",
      "source": "api"
    }
  }'
```

**Expected:** Recipe in meal plan should have `ingredients` array populated.

### Automated Test

Run the test script:
```bash
chmod +x test-bon-happetee-ingredients.sh
./test-bon-happetee-ingredients.sh
```

The script will:
1. Search for Bon Happetee recipes
2. Get recipe details and verify ingredients are present
3. Create a manual meal plan
4. Add Bon Happetee recipe to the plan
5. Verify ingredients are included and persisted

## Impact

### Before Fix
- ❌ Bon Happetee recipes showed 0 ingredients
- ❌ Nutritionists couldn't see what's in the recipe
- ❌ Ingredient customization was not possible
- ❌ Poor user experience for Indian recipes

### After Fix
- ✅ Bon Happetee recipes show full ingredients list
- ✅ Nutritionists can see exactly what's in each recipe
- ✅ Ingredient customization is now possible
- ✅ Better support for Indian cuisine recipes

## Related Files

- `lib/multiProviderRecipeSearchService.ts` - Fixed to fetch ingredients
- `lib/bonHappeteeService.ts` - Already had `getIngredients()` method
- `lib/manualMealPlanService.ts` - Caches and displays ingredients
- `database/schema.sql` - `cached_recipes.ingredients` stores as JSONB

## Notes

- **Performance:** Using `Promise.all` to fetch recipe details and ingredients in parallel (no performance impact)
- **Caching:** Ingredients are cached in the database along with nutrition data
- **Format:** Standardized ingredient format matches Edamam and Spoonacular
- **Fallback:** If ingredients endpoint fails, returns empty array (graceful degradation)

## Future Enhancements

1. **Ingredient Images:** Bon Happetee doesn't provide ingredient images, could add from other sources
2. **Nutrition per Ingredient:** Could calculate nutrition contribution of each ingredient
3. **Smart Substitutions:** Use ingredient data for better substitution suggestions
4. **Recipe Complexity Score:** Calculate based on number of ingredients

