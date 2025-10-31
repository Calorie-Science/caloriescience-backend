# Custom Recipe Modifications - Curl Examples

Quick reference for testing the custom recipe ingredient modifications API.

## Setup

```bash
# Set your auth token
export AUTH_TOKEN="your-jwt-token-here"

# Set API base URL (defaults to localhost)
export API_BASE_URL="http://localhost:3000"
# OR for production
export API_BASE_URL="https://your-domain.com"
```

## 1. Create a Test Recipe

```bash
curl -X POST "${API_BASE_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Classic Pancakes",
    "description": "Traditional pancake recipe",
    "servings": 4,
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 15,
    "ingredients": [
      {
        "name": "all-purpose flour",
        "quantity": 2,
        "unit": "cups"
      },
      {
        "name": "butter",
        "quantity": 4,
        "unit": "tablespoons"
      },
      {
        "name": "white sugar",
        "quantity": 0.25,
        "unit": "cup"
      },
      {
        "name": "whole milk",
        "quantity": 2,
        "unit": "cups"
      },
      {
        "name": "eggs",
        "quantity": 2,
        "unit": "large"
      }
    ],
    "instructions": ["Mix ingredients", "Cook on griddle"],
    "isPublic": false,
    "cuisineTypes": ["american"],
    "mealTypes": ["breakfast"],
    "allergens": ["dairy", "eggs", "gluten"]
  }' | jq '.'
```

**Save the recipe ID from the response:**
```bash
export RECIPE_ID="uuid-from-response"
```

## 2. Get Recipe Details

```bash
curl -X GET "${API_BASE_URL}/api/recipes/custom?id=${RECIPE_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq '.'
```

## 3. Modify Ingredients

### Test 1: Replace Butter with Olive Oil

```bash
curl -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "butter",
        "originalAmount": 4,
        "originalUnit": "tablespoons",
        "newIngredient": "olive oil",
        "amount": 3,
        "unit": "tablespoons"
      }
    ],
    "autoCalculateNutrition": true
  }' | jq '.'
```

### Test 2: Remove Sugar

```bash
curl -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "omit",
        "originalIngredient": "white sugar",
        "originalAmount": 0.25,
        "originalUnit": "cup"
      }
    ],
    "autoCalculateNutrition": true
  }' | jq '.'
```

### Test 3: Add Honey

```bash
curl -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "add",
        "newIngredient": "honey",
        "amount": 2,
        "unit": "tablespoons"
      }
    ],
    "autoCalculateNutrition": true
  }' | jq '.'
```

### Test 4: Multiple Modifications at Once

```bash
curl -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "whole milk",
        "originalAmount": 2,
        "originalUnit": "cups",
        "newIngredient": "almond milk",
        "amount": 2,
        "unit": "cups"
      },
      {
        "type": "add",
        "newIngredient": "protein powder",
        "amount": 30,
        "unit": "grams"
      },
      {
        "type": "omit",
        "originalIngredient": "butter",
        "originalAmount": 4,
        "originalUnit": "tablespoons"
      }
    ],
    "autoCalculateNutrition": true
  }' | jq '.'
```

### Test 5: Update Servings Only

Note: For just updating servings without ingredient changes, use the edit endpoint:

```bash
curl -X PATCH "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/edit" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "servings": 8
  }' | jq '.'
```

## 4. Verify Changes

```bash
# Get updated recipe
curl -X GET "${API_BASE_URL}/api/recipes/custom?id=${RECIPE_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  | jq '.data.recipes[0] | {
      recipeName,
      servings,
      ingredients: [.ingredients[] | {name, quantity, unit}],
      nutrition: {
        calories: .nutrition.calories,
        protein: .nutrition.macros.protein,
        carbs: .nutrition.macros.carbs,
        fat: .nutrition.macros.fat
      }
    }'
```

## 5. Error Cases

### Try to modify non-existent ingredient

```bash
curl -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "omit",
        "originalIngredient": "chocolate chips",
        "originalAmount": 1,
        "originalUnit": "cup"
      }
    ]
  }' | jq '.'
```

Expected: `400` error with message "Ingredient not found"

### Try to modify someone else's recipe

```bash
# Use a different recipe ID
curl -X PUT "${API_BASE_URL}/api/recipes/custom/some-other-recipe-id/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "add",
        "newIngredient": "vanilla",
        "amount": 1,
        "unit": "teaspoon"
      }
    ]
  }' | jq '.'
```

Expected: `403` error with "Access denied"

### Empty modifications array

```bash
curl -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": []
  }' | jq '.'
```

Expected: `400` error with validation message

## 6. Clean Up

```bash
# Delete the test recipe
curl -X DELETE "${API_BASE_URL}/api/recipes/custom?id=${RECIPE_ID}" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" | jq '.'
```

## Quick Copy-Paste Template

```bash
# Replace these values
export AUTH_TOKEN="your-token"
export RECIPE_ID="your-recipe-id"
export API_BASE_URL="http://localhost:3000"

# Modify ingredients
curl -X PUT "${API_BASE_URL}/api/recipes/custom/${RECIPE_ID}/modify-ingredients" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "ORIGINAL_NAME",
        "originalAmount": 0,
        "originalUnit": "UNIT",
        "newIngredient": "NEW_NAME",
        "amount": 0,
        "unit": "UNIT"
      }
    ],
    "autoCalculateNutrition": true
  }' | jq '.'
```

## Running Automated Tests

### Full test suite:
```bash
AUTH_TOKEN="your-token" ./test-custom-recipe-modifications.sh
```

### Simple test:
```bash
AUTH_TOKEN="your-token" RECIPE_ID="recipe-uuid" ./test-custom-recipe-modifications-simple.sh
```

## Expected Response Structure

```json
{
  "success": true,
  "message": "Recipe ingredients modified successfully",
  "data": {
    "recipe": {
      "id": "uuid",
      "recipeName": "Modified Recipe Name",
      "servings": 4,
      "ingredients": [
        {
          "name": "olive oil",
          "quantity": 3,
          "unit": "tablespoons",
          "nutrition": {...}
        }
      ],
      "nutrition": {
        "calories": {"quantity": 320, "unit": "kcal"},
        "macros": {
          "protein": {"quantity": 8, "unit": "g"},
          "carbs": {"quantity": 45, "unit": "g"},
          "fat": {"quantity": 12, "unit": "g"},
          "fiber": {"quantity": 2, "unit": "g"}
        },
        "micros": {
          "vitamins": {...},
          "minerals": {...}
        }
      },
      "nutritionServings": 1
    },
    "modificationSummary": {
      "modificationsApplied": 3,
      "nutritionRecalculated": true,
      "servings": 4
    }
  }
}
```
