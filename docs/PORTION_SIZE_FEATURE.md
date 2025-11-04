# Portion Size Selection for Custom Recipes

## Overview

This feature allows nutritionists to select different portion sizes when adding custom recipes to manual meal plans. The nutrition values are automatically adjusted based on the selected portion size relative to the recipe's default portion size.

## How It Works

### Formula

```
adjusted_nutrition = base_nutrition × (selected_portion_multiplier / default_portion_multiplier)
```

### Example

If a custom recipe has:
- **Default portion size**: Small Cup (multiplier: 0.625)
- **Base nutrition** (at Small Cup): 200 calories, 10g protein

When selecting **Large Cup** (multiplier: 1.458):
```
adjusted_multiplier = 1.458 / 0.625 = 2.333
adjusted_calories = 200 × 2.333 = 466.6 calories
adjusted_protein = 10 × 2.333 = 23.3g protein
```

## API Endpoints

### 1. Get Recipe Portion Sizes (for Dropdown)

**Endpoint**: `GET /api/recipes/portion-sizes`

**Query Parameters**:
- `recipeId` (required): The custom recipe ID
- `provider` (required): Must be "manual" for custom recipes

**Example Request**:
```bash
curl -X GET \
  'https://caloriescience-api.vercel.app/api/recipes/portion-sizes?recipeId=dfd2bf8d-8a37-48c8-aae8-9fceec4988fa&provider=manual' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "recipe": {
      "id": "dfd2bf8d-8a37-48c8-aae8-9fceec4988fa",
      "name": "Chicken Salad",
      "servings": 2,
      "defaultPortionSize": {
        "id": "portion-size-id-1",
        "name": "Medium Plate",
        "multiplier": 1.0
      },
      "baseNutrition": {
        "calories": 350,
        "protein": 25,
        "carbs": 30,
        "fat": 15,
        "fiber": 5
      }
    },
    "portionSizes": [
      {
        "id": "portion-size-id-1",
        "name": "Medium Plate",
        "description": "Standard medium plate",
        "category": "plate",
        "multiplier": 1.0,
        "relativeMultiplier": 1.0,
        "isDefault": true,
        "nutrition": {
          "calories": 350,
          "protein": 25,
          "carbs": 30,
          "fat": 15,
          "fiber": 5
        }
      },
      {
        "id": "portion-size-id-2",
        "name": "Large Plate",
        "description": "Large serving plate",
        "category": "plate",
        "multiplier": 1.5,
        "relativeMultiplier": 1.5,
        "isDefault": false,
        "nutrition": {
          "calories": 525,
          "protein": 37.5,
          "carbs": 45,
          "fat": 22.5,
          "fiber": 7.5
        }
      },
      {
        "id": "portion-size-id-3",
        "name": "Small Cup",
        "description": "Small serving cup",
        "category": "cup",
        "multiplier": 0.625,
        "relativeMultiplier": 0.625,
        "isDefault": false,
        "nutrition": {
          "calories": 218.8,
          "protein": 15.6,
          "carbs": 18.8,
          "fat": 9.4,
          "fiber": 3.1
        }
      }
    ]
  }
}
```

### 2. Add Recipe to Manual Meal Plan with Portion Size

**Endpoint**: `POST /api/meal-plans/manual/add-recipe`

**Request Body**:
```json
{
  "draftId": "manual-client-123-1234567890",
  "day": 1,
  "mealName": "Lunch",
  "recipe": {
    "id": "dfd2bf8d-8a37-48c8-aae8-9fceec4988fa",
    "provider": "manual",
    "source": "cached"
  },
  "portionSizeId": "portion-size-id-2",
  "nutritionServings": 1
}
```

**Parameters Explanation**:
- `portionSizeId`: ID of the selected portion size (from the dropdown)
- `nutritionServings`: How many servings the person is consuming (default: 1)
- `portionSizeMultiplier`: Alternative to `portionSizeId` - directly provide the multiplier value

**Total Nutrition Calculation**:
```
total_nutrition = base_nutrition × (selected_portion / default_portion) × nutritionServings
```

Example:
- Base: 350 cal at Medium Plate (1.0x)
- Selected: Large Plate (1.5x)
- Servings: 2

```
total_calories = 350 × (1.5 / 1.0) × 2 = 1050 calories
```

## Frontend Implementation Guide

### Step 1: Fetch Available Portion Sizes

When the user selects a custom recipe to add to the meal plan:

```javascript
async function fetchPortionSizes(recipeId) {
  const response = await fetch(
    `/api/recipes/portion-sizes?recipeId=${recipeId}&provider=manual`,
    {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    }
  );

  const data = await response.json();
  return data.data;
}
```

### Step 2: Display Portion Size Dropdown

Create a dropdown/select element with the available portion sizes:

```jsx
function PortionSizeSelector({ recipeData, onSelect }) {
  const { recipe, portionSizes } = recipeData;
  const [selectedPortionId, setSelectedPortionId] = useState(
    recipe.defaultPortionSize?.id || portionSizes[0]?.id
  );

  const handleChange = (portionId) => {
    setSelectedPortionId(portionId);
    const selected = portionSizes.find(p => p.id === portionId);
    onSelect(selected);
  };

  return (
    <div>
      <label>Portion Size:</label>
      <select value={selectedPortionId} onChange={(e) => handleChange(e.target.value)}>
        {portionSizes.map(portion => (
          <option key={portion.id} value={portion.id}>
            {portion.name} - {portion.nutrition.calories} cal
            {portion.isDefault && ' (Default)'}
          </option>
        ))}
      </select>

      {/* Display nutrition preview */}
      {selectedPortionId && (
        <div className="nutrition-preview">
          {portionSizes.find(p => p.id === selectedPortionId)?.nutrition && (
            <div>
              <p>Calories: {portionSizes.find(p => p.id === selectedPortionId).nutrition.calories}</p>
              <p>Protein: {portionSizes.find(p => p.id === selectedPortionId).nutrition.protein}g</p>
              <p>Carbs: {portionSizes.find(p => p.id === selectedPortionId).nutrition.carbs}g</p>
              <p>Fat: {portionSizes.find(p => p.id === selectedPortionId).nutrition.fat}g</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### Step 3: Add Recipe with Selected Portion Size

```javascript
async function addRecipeToMealPlan(draftId, day, mealName, recipe, portionSizeId, servings = 1) {
  const response = await fetch('/api/meal-plans/manual/add-recipe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      draftId,
      day,
      mealName,
      recipe: {
        id: recipe.id,
        provider: 'manual',
        source: 'cached'
      },
      portionSizeId,
      nutritionServings: servings
    })
  });

  return await response.json();
}
```

## Database Schema

### `portion_sizes` Table

```sql
CREATE TABLE portion_sizes (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'cup', 'plate', 'bowl', 'glass', 'serving', 'other'
  volume_ml DECIMAL(10, 2),
  weight_g DECIMAL(10, 2),
  multiplier DECIMAL(5, 3) NOT NULL, -- e.g., 0.625, 1.0, 1.458
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### `cached_recipes` Table (Custom Recipes)

```sql
-- Existing columns plus:
ALTER TABLE cached_recipes ADD COLUMN default_portion_size_id UUID REFERENCES portion_sizes(id);
```

## Example Portion Sizes

Common portion sizes with multipliers (base = 1.0):

### Cups
- Small Cup: 0.625 (250ml)
- Medium Cup: 1.0 (400ml) - **default**
- Large Cup: 1.458 (583ml)

### Plates
- Small Plate: 0.75 (7 inch)
- Medium Plate: 1.0 (9 inch) - **default**
- Large Plate: 1.5 (11 inch)

### Bowls
- Small Bowl: 0.625 (250ml)
- Medium Bowl: 1.0 (400ml) - **default**
- Large Bowl: 1.667 (667ml)

## Testing

### Test Scenario 1: Add Recipe with Portion Size

```bash
# 1. Create a manual meal plan draft
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjE4MjYxODYsImV4cCI6MTc2MjQzMDk4Nn0.EYNTM0YVc56QYbBPKPTtyw3khccE5-kaijKl8GOPUaw"

# 2. Get portion sizes for recipe
RECIPE_ID="dfd2bf8d-8a37-48c8-aae8-9fceec4988fa"

curl -X GET \
  "https://caloriescience-api.vercel.app/api/recipes/portion-sizes?recipeId=$RECIPE_ID&provider=manual" \
  -H "Authorization: Bearer $TOKEN"

# 3. Add recipe with selected portion size
curl -X POST \
  'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Authorization: Bearer $TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "draftId": "YOUR_DRAFT_ID",
    "day": 1,
    "mealName": "Lunch",
    "recipe": {
      "id": "dfd2bf8d-8a37-48c8-aae8-9fceec4988fa",
      "provider": "manual",
      "source": "cached"
    },
    "portionSizeId": "SELECTED_PORTION_SIZE_ID",
    "nutritionServings": 1
  }'
```

## Notes

1. **Custom Recipes Only**: This feature currently only works with custom recipes (provider='manual'). Regular API recipes use the existing `nutritionServings` parameter.

2. **Default Portion Size**: If a custom recipe doesn't have a default portion size set, the selected portion size multiplier is used as-is.

3. **Backward Compatibility**: The existing `portionSizeMultiplier` parameter still works - you can pass a direct multiplier value instead of a portion size ID.

4. **Combined Multipliers**: The system supports both portion size multiplier AND nutrition servings:
   ```
   total_multiplier = portionSizeMultiplier × nutritionServings
   ```
   Example: Large Cup (1.458x) × 2 servings = 2.916x total

5. **Nutrition Servings**: The `nutritionServings` parameter (1, 1.5, 2, etc.) represents how many servings the person is consuming, NOT the portion size. Use `portionSizeId` for portion size selection.
