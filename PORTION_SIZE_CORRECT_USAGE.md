# Portion Size - Correct Usage Guide

## Understanding the Two Multipliers

When adding recipes to meal plans, nutrition is calculated using **TWO separate multipliers**:

### 1. **Portion Size Multiplier** (`portionSizeMultiplier`)
- **What it is**: The SIZE of one serving
- **Examples**:
  - Small Cup = 0.625x
  - Medium Cup = 1.0x (standard)
  - Large Cup = 1.458x
- **Use case**: "I want a large portion instead of medium"

### 2. **Nutrition Servings** (`nutritionServings`)
- **What it is**: HOW MANY servings the person is consuming
- **Examples**:
  - 1.0 = one serving
  - 1.5 = one and a half servings
  - 2.0 = two servings
- **Use case**: "I'm eating 2 servings of this recipe"

### Formula

```
Final Nutrition = Base Nutrition × Portion Size Multiplier × Nutrition Servings
```

## Complete Example

### Recipe Base
- **Recipe**: Green Smoothie
- **Base nutrition (per serving, medium cup)**:
  - 100 calories
  - 10g protein
  - 20g carbs

### Scenario 1: Large Cup, 1 Serving
```javascript
portionSizeMultiplier: 1.458  // Large Cup
nutritionServings: 1           // 1 serving

Final = 100 × 1.458 × 1 = 145.8 calories
```

### Scenario 2: Medium Cup, 2 Servings
```javascript
portionSizeMultiplier: 1.0     // Medium Cup (default)
nutritionServings: 2           // 2 servings

Final = 100 × 1.0 × 2 = 200 calories
```

### Scenario 3: Large Cup, 2 Servings
```javascript
portionSizeMultiplier: 1.458   // Large Cup
nutritionServings: 2           // 2 servings

Final = 100 × 1.458 × 2 = 291.6 calories
```

### Scenario 4: Small Cup, 0.5 Servings (Snack)
```javascript
portionSizeMultiplier: 0.625   // Small Cup
nutritionServings: 0.5         // Half serving

Final = 100 × 0.625 × 0.5 = 31.25 calories
```

## API Usage

### Method 1: Using Direct Multiplier (Recommended)

```bash
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe \
  -H "Content-Type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "draftId": "draft-123",
    "day": 1,
    "mealName": "Breakfast",
    "recipe": {
      "id": "recipe-456",
      "provider": "manual",
      "source": "cached"
    },
    "portionSizeMultiplier": 1.458,
    "nutritionServings": 2
  }'
```

**Result**:
- Recipe base: 100 cal
- Large Cup (1.458x) × 2 servings
- Final: **291.6 calories**

### Method 2: Using Portion Size ID (Future)

```bash
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe \
  -H "Content-Type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "draftId": "draft-123",
    "day": 1,
    "mealName": "Breakfast",
    "recipe": {
      "id": "recipe-456",
      "provider": "manual",
      "source": "cached"
    },
    "portionSizeId": "9aeabe03-290e-4ce0-bd5b-a3a95348941c",
    "nutritionServings": 2
  }'
```

**Note**: When using `portionSizeId`, the system will fetch the portion size from the database and apply its multiplier automatically.

## Frontend Integration

### React/TypeScript Example

```typescript
function AddRecipeWithPortion() {
  const [portionMultiplier, setPortionMultiplier] = useState(1.0); // Medium Cup default
  const [servingsCount, setServingsCount] = useState(1);           // 1 serving default

  const addToMealPlan = async () => {
    await fetch('/api/meal-plans/manual/add-recipe', {
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
        portionSizeMultiplier: portionMultiplier,  // Size of one serving
        nutritionServings: servingsCount            // How many servings
      })
    });
  };

  return (
    <div>
      <label>Portion Size:</label>
      <select value={portionMultiplier} onChange={(e) => setPortionMultiplier(parseFloat(e.target.value))}>
        <option value="0.625">Small Cup (0.625x)</option>
        <option value="1.0">Medium Cup (1.0x)</option>
        <option value="1.458">Large Cup (1.458x)</option>
      </select>

      <label>Number of Servings:</label>
      <input
        type="number"
        step="0.5"
        min="0.5"
        max="5"
        value={servingsCount}
        onChange={(e) => setServingsCount(parseFloat(e.target.value))}
      />

      <div>
        Total Multiplier: {(portionMultiplier * servingsCount).toFixed(2)}x
      </div>

      <button onClick={addToMealPlan}>Add to Meal Plan</button>
    </div>
  );
}
```

## Real-World Use Cases

### Use Case 1: Kid's Meal
```javascript
// Adult recipe: 500 calories (medium cup, 1 serving)
portionSizeMultiplier: 0.625  // Small cup
nutritionServings: 1

Result: 500 × 0.625 × 1 = 312.5 calories
```

### Use Case 2: Athlete Post-Workout
```javascript
// Standard smoothie: 300 calories
portionSizeMultiplier: 1.458  // Large cup
nutritionServings: 2          // Double serving

Result: 300 × 1.458 × 2 = 874.8 calories
```

### Use Case 3: Snack Size
```javascript
// Full meal: 600 calories
portionSizeMultiplier: 0.625  // Small portion
nutritionServings: 0.5        // Half serving

Result: 600 × 0.625 × 0.5 = 187.5 calories
```

## How It Works Internally

### Step 1: Recipe Added to Meal Plan
```typescript
// When adding recipe
{
  portionSizeMultiplier: 1.458,
  nutritionServings: 2
}
```

### Step 2: Stored in Meal Plan
```typescript
recipe: {
  id: "recipe-123",
  calories: 100,  // Base per serving
  portionSizeMultiplier: 1.458,
  nutritionServings: 2
}
```

### Step 3: Nutrition Calculation
```typescript
// In calculateMealNutrition()
const portionSizeMultiplier = recipe.portionSizeMultiplier || 1;
const nutritionServings = recipe.nutritionServings || 1;
const totalMultiplier = portionSizeMultiplier * nutritionServings;

finalCalories = baseCalories × totalMultiplier;
// 100 × 1.458 × 2 = 291.6
```

### Step 4: Response
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
              "title": "Green Smoothie",
              "portionSizeMultiplier": 1.458,
              "nutritionServings": 2,
              "nutrition": {
                "calories": {"quantity": 291.6, "unit": "kcal"},
                "macros": {
                  "protein": {"quantity": 29.16, "unit": "g"},
                  "carbs": {"quantity": 58.32, "unit": "g"}
                }
              }
            }
          ],
          "totalNutrition": {
            "calories": 291.6
          }
        }
      }
    }
  ]
}
```

## Comparison Table

| Scenario | Portion Size | Servings | Base Cal | Final Cal | Calculation |
|----------|--------------|----------|----------|-----------|-------------|
| Standard | Medium (1.0x) | 1 | 100 | 100 | 100 × 1.0 × 1 |
| Large portion | Large (1.458x) | 1 | 100 | 145.8 | 100 × 1.458 × 1 |
| Double serving | Medium (1.0x) | 2 | 100 | 200 | 100 × 1.0 × 2 |
| Large + Double | Large (1.458x) | 2 | 100 | 291.6 | 100 × 1.458 × 2 |
| Kid's snack | Small (0.625x) | 0.5 | 100 | 31.25 | 100 × 0.625 × 0.5 |

## API Fields Reference

```typescript
{
  // Recipe identification
  draftId: string;
  day: number;
  mealName: string;
  recipe: {
    id: string;
    provider: 'manual' | 'edamam' | 'spoonacular';
    source: 'api' | 'cached';
  };

  // Portion sizing (choose ONE method)
  portionSizeId?: string;           // Option 1: Use DB portion size
  portionSizeMultiplier?: number;   // Option 2: Direct multiplier (0.625, 1.0, 1.458)

  // Quantity
  nutritionServings?: number;       // How many servings (1, 1.5, 2, etc.)
}
```

## Summary

✅ **Key Points**:
1. **Portion Size** = SIZE of one serving (Small/Medium/Large)
2. **Nutrition Servings** = HOW MANY servings
3. **Total = Base × Portion × Servings**
4. Both multipliers work independently and multiply together
5. Meal plan totals automatically include the scaled nutrition

🎯 **This ensures accurate nutrition tracking** when users have different portion sizes or multiple servings!
