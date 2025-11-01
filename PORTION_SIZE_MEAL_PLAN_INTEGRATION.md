# Portion Size Integration with Meal Plans

## Overview

The portion size feature is now fully integrated with meal plans. When adding recipes to meal plan slots, you can specify a portion size to automatically scale the nutrition values.

## How It Works

### 1. Recipe with Default Portion Size

When you create a custom recipe with a default portion size:

```javascript
const recipe = await createCustomRecipe({
  recipeName: "Green Smoothie",
  ingredients: [...],
  servings: 1,
  portionSizeId: "635294f5-0cda-40ad-aa6b-357c60990e87", // Medium Cup
  nutritionistId: "your-id"
});

// Recipe has:
// - defaultPortionSizeId: "635294f5-0cda-40ad-aa6b-357c60990e87"
// - Base nutrition: 128 calories, 4.2g protein, etc.
```

### 2. Add Recipe to Meal Plan with Different Portion Size

**Method 1: Using `nutritionServings` (Direct Multiplier)**

```javascript
POST /api/meal-plans/manual/add-recipe
{
  "draftId": "draft-id",
  "day": 1,
  "mealName": "Breakfast",
  "recipe": {
    "id": "recipe-id",
    "provider": "manual",
    "source": "cached"
  },
  "nutritionServings": 1.458  // Large Cup multiplier
}
```

**Result**: Recipe nutrition is scaled by 1.458x
- Calories: 186.62 (128 × 1.458)
- Protein: 6.12 (4.2 × 1.458)
- etc.

**Method 2: Using `portionSizeId` (Future Enhancement)**

```javascript
POST /api/meal-plans/manual/add-recipe
{
  "draftId": "draft-id",
  "day": 1,
  "mealName": "Breakfast",
  "recipe": {
    "id": "recipe-id",
    "provider": "manual",
    "source": "cached"
  },
  "portionSizeId": "9aeabe03-290e-4ce0-bd5b-a3a95348941c"  // Large Cup
}
```

**Note**: Currently, when using `portionSizeId`, you need to fetch the portion size details first to get the multiplier, then pass `nutritionServings`.

### 3. Automatic Nutrition Scaling in Meal Plans

The meal plan service automatically handles nutrition scaling:

1. **When adding recipe** ([manualMealPlanService.ts:397-419](lib/manualMealPlanService.ts#L397-L419)):
   ```typescript
   // Determines nutritionServings from:
   // 1. Explicit nutritionServings parameter
   // 2. Recipe's existing nutritionServings
   // 3. Defaults to 1
   ```

2. **When calculating meal nutrition** ([manualMealPlanService.ts:1059-1111](lib/manualMealPlanService.ts#L1059-L1111)):
   ```typescript
   // Applies nutritionServings multiplier to all nutrition values:
   // - Calories
   // - Macros (protein, carbs, fat, fiber, etc.)
   // - Vitamins
   // - Minerals
   ```

3. **When formatting response** ([manualMealPlanService.ts:635-690](lib/manualMealPlanService.ts#L635-L690)):
   ```typescript
   // Merges nutritionServings from customizations into recipe objects
   // Scales nutrition if nutritionServings !== 1
   ```

## Complete Workflow Example

### Step 1: Get Portion Size IDs

```bash
curl https://caloriescience-api.vercel.app/api/portion-sizes?category=cup
```

Response:
```json
{
  "success": true,
  "data": [
    {"id": "52f79bfe-436a-427a-b2fd-1d14b29fc75e", "name": "Small Cup (150ml)", "multiplier": 0.625},
    {"id": "635294f5-0cda-40ad-aa6b-357c60990e87", "name": "Medium Cup (240ml)", "multiplier": 1.0},
    {"id": "9aeabe03-290e-4ce0-bd5b-a3a95348941c", "name": "Large Cup (350ml)", "multiplier": 1.458}
  ]
}
```

### Step 2: Create Recipe with Default Portion

```bash
curl -X POST https://caloriescience-api.vercel.app/api/recipes/custom \
  -H "Content-Type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "action": "create",
    "recipeName": "Protein Shake",
    "ingredients": [...],
    "servings": 1,
    "portionSizeId": "635294f5-0cda-40ad-aa6b-357c60990e87",
    "nutritionistId": "your-id"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "recipe-123",
    "title": "Protein Shake",
    "calories": 250,
    "protein": 30,
    "carbs": 20,
    "defaultPortionSizeId": "635294f5-0cda-40ad-aa6b-357c60990e87"
  }
}
```

### Step 3: Add to Meal Plan with Small Portion

```bash
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe \
  -H "Content-Type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "draftId": "draft-456",
    "day": 1,
    "mealName": "Breakfast",
    "recipe": {
      "id": "recipe-123",
      "provider": "manual",
      "source": "cached"
    },
    "nutritionServings": 0.625
  }'
```

### Step 4: View Meal Plan with Scaled Nutrition

```bash
curl https://caloriescience-api.vercel.app/api/meal-plans/manual/draft-456 \
  -H "authorization: Bearer $TOKEN"
```

Response shows scaled nutrition:
```json
{
  "suggestions": [
    {
      "day": 1,
      "meals": {
        "Breakfast": {
          "recipes": [
            {
              "id": "recipe-123",
              "title": "Protein Shake",
              "nutritionServings": 0.625,
              "nutrition": {
                "calories": {"quantity": 156.25, "unit": "kcal"},
                "macros": {
                  "protein": {"quantity": 18.75, "unit": "g"},
                  "carbs": {"quantity": 12.5, "unit": "g"}
                }
              }
            }
          ],
          "totalNutrition": {
            "calories": 156.25,
            "protein": 18.75,
            "carbs": 12.5
          }
        }
      }
    }
  ]
}
```

## Frontend Integration

### React/TypeScript Example

```typescript
import { useState, useEffect } from 'react';

interface PortionSize {
  id: string;
  name: string;
  multiplier: number;
  category: string;
}

function AddRecipeToMealPlan() {
  const [portionSizes, setPortionSizes] = useState<PortionSize[]>([]);
  const [selectedPortion, setSelectedPortion] = useState<string>('');

  // Fetch portion sizes on component mount
  useEffect(() => {
    fetch('/api/portion-sizes?category=cup')
      .then(res => res.json())
      .then(data => setPortionSizes(data.data));
  }, []);

  const addRecipeWithPortion = async (recipeId: string, portionMultiplier: number) => {
    const response = await fetch('/api/meal-plans/manual/add-recipe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        draftId: currentDraftId,
        day: 1,
        mealName: 'Breakfast',
        recipe: {
          id: recipeId,
          provider: 'manual',
          source: 'cached'
        },
        nutritionServings: portionMultiplier
      })
    });

    const result = await response.json();
    console.log('Recipe added with scaled nutrition:', result);
  };

  return (
    <div>
      <h3>Select Portion Size</h3>
      <select
        value={selectedPortion}
        onChange={(e) => setSelectedPortion(e.target.value)}
      >
        {portionSizes.map(portion => (
          <option key={portion.id} value={portion.multiplier}>
            {portion.name} ({portion.multiplier}x nutrition)
          </option>
        ))}
      </select>

      <button
        onClick={() => addRecipeWithPortion(recipeId, parseFloat(selectedPortion))}
      >
        Add to Meal Plan
      </button>
    </div>
  );
}
```

## Nutrition Calculation Flow

```
1. Recipe Created
   └─> Base Nutrition: 250 cal, 30g protein
   └─> Default Portion: Medium Cup (1.0x)

2. Add to Meal Plan
   └─> Selected Portion: Small Cup (0.625x)
   └─> nutritionServings: 0.625

3. Service Layer (addRecipeInternal)
   └─> Sets recipe.nutritionServings = 0.625
   └─> Stores in meal plan

4. Nutrition Calculation (calculateMealNutrition)
   └─> Reads nutritionServings = 0.625
   └─> Multiplies all nutrition values:
       - 250 × 0.625 = 156.25 cal
       - 30 × 0.625 = 18.75g protein

5. Response Formatting
   └─> Returns scaled nutrition in recipe object
   └─> Shows in meal totals
```

## Key Benefits

1. **Automatic Scaling**: No manual calculation needed
2. **Consistent**: Same scaling applied to all nutrition fields
3. **Flexible**: Can use any multiplier (0.5x, 1.5x, 2x, etc.)
4. **Meal Plan Aware**: Total nutrition calculations include scaled values
5. **Preserves Base**: Original recipe nutrition unchanged

## API Reference

### Add Recipe with Portion Size

**Endpoint**: `POST /api/meal-plans/manual/add-recipe`

**Request Body**:
```typescript
{
  draftId: string;           // Meal plan draft ID
  day: number;               // Day number (1-30)
  mealName: string;          // Meal slot name
  recipe: {
    id: string;              // Recipe ID
    provider: string;        // 'manual' | 'edamam' | 'spoonacular'
    source: string;          // 'api' | 'cached'
  };
  servings?: number;         // Number of recipe servings (optional)
  portionSizeId?: string;    // Portion size ID (future use)
  nutritionServings?: number; // Nutrition multiplier (0.1 - 20)
}
```

**Response**:
```typescript
{
  success: true,
  data: {
    // Full meal plan draft with scaled nutrition
    suggestions: [...],
    nutritionSummary: {
      // Includes scaled nutrition in totals
    }
  }
}
```

## Common Use Cases

### Use Case 1: Kid's Portion
```javascript
// Adult recipe: 500 calories
// Kid's portion: 0.5x multiplier
nutritionServings: 0.5
// Result: 250 calories
```

### Use Case 2: Athlete's Portion
```javascript
// Regular recipe: 400 calories
// Double portion: 2.0x multiplier
nutritionServings: 2.0
// Result: 800 calories
```

### Use Case 3: Snack Size
```javascript
// Meal recipe: 600 calories
// Snack size: 0.33x multiplier
nutritionServings: 0.33
// Result: 198 calories
```

## Testing

See [PORTION_SIZE_TEST_RESULTS.md](PORTION_SIZE_TEST_RESULTS.md) for complete test results showing:
- ✅ Recipe creation with portion sizes
- ✅ Nutrition scaling (0.625x, 1.0x, 1.458x)
- ✅ Meal plan integration
- ✅ Total nutrition calculations

## Summary

✅ **Portion sizes are fully supported in meal plans**
- Add `nutritionServings` parameter when adding recipes
- Nutrition automatically scales by the multiplier
- Meal totals include scaled nutrition
- Compatible with all nutrition calculation features

🎯 **Ready for production use!**
