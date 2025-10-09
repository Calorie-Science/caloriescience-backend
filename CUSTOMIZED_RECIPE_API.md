# Customized Recipe API

## Overview

This API endpoint allows you to fetch a recipe with all draft customizations applied. It retrieves the base recipe from cache or API, applies any modifications made during meal plan drafting (ingredient omissions, additions, replacements), and returns the final customized version with updated ingredients and nutrition.

## Endpoint

```
GET /api/recipes/customized
```

## Authentication

Requires valid JWT token in the `Authorization` header:
```
Authorization: Bearer YOUR_JWT_TOKEN
```

## Query Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `recipeId` | string | Yes | The external recipe ID (from Edamam or Spoonacular) |
| `draftId` | string | Yes | The meal plan draft ID containing the customizations |
| `day` | number | Yes | The day number in the meal plan (1-based) |
| `mealName` | string | Yes | The meal name (e.g., "breakfast", "lunch", "dinner", "snacks") |

## Use Cases

### 1. Display Customized Recipe to User
After a nutritionist has made modifications to a recipe in a draft, use this endpoint to show the final version with:
- Modified ingredient list (with omitted/added/replaced ingredients)
- Updated nutrition information
- Original vs customized comparison

### 2. Export/Print Meal Plans
When generating PDFs or exports of finalized meal plans, use this endpoint to get the accurate ingredient lists and nutrition for each recipe.

### 3. Recipe Preview
Show clients exactly what they'll be cooking with all customizations applied.

## Response Format

### Success Response (200 OK)

#### Without Customizations:
```json
{
  "success": true,
  "data": {
    "id": "622598",
    "recipeName": "Pittata - Pizza Frittata",
    "recipeImageUrl": "https://...",
    "recipeUrl": "https://...",
    "provider": "spoonacular",
    "servings": 2,
    "totalTimeMinutes": 30,
    "caloriesPerServing": "669",
    "proteinPerServingG": "49",
    "carbsPerServingG": "13",
    "fatPerServingG": "49",
    "fiberPerServingG": "1",
    "customNotes": null,
    "ingredients": [
      {
        "name": "eggs",
        "amount": 6,
        "unit": "large",
        "original": "6 large eggs"
      },
      {
        "name": "basil",
        "amount": 2,
        "unit": "tablespoons",
        "original": "2 tablespoons fresh basil"
      }
      // ... more ingredients
    ],
    "cookingInstructions": [
      {
        "number": 1,
        "step": "Preheat oven to 375°F"
      },
      {
        "number": 2,
        "step": "Beat eggs in a bowl"
      }
      // ... more steps
    ],
    "healthLabels": ["gluten-free"],
    "dietLabels": ["low-carb"],
    "cuisineTypes": ["italian"]
  },
  "hasCustomizations": false,
  "customizations": null,
  "message": "Recipe retrieved from cache (no customizations)"
}
```

#### With Customizations:
```json
{
  "success": true,
  "data": {
    "id": "622598",
    "recipeName": "Pittata - Pizza Frittata",
    "recipeImageUrl": "https://...",
    "recipeUrl": "https://...",
    "provider": "spoonacular",
    "servings": 2,
    "totalTimeMinutes": 30,
    "caloriesPerServing": "535",
    "proteinPerServingG": "36.5",
    "carbsPerServingG": "8.7",
    "fatPerServingG": "38.8",
    "fiberPerServingG": "0",
    "customNotes": "This recipe has been customized for a client with egg allergy. Make sure to use dairy alternatives if needed.",
    "adjustedServings": 1,
    "ingredients": [
      {
        "name": "basil",
        "amount": 2,
        "unit": "tablespoons",
        "original": "2 tablespoons fresh basil"
      },
      {
        "name": "milk",
        "amount": 0.25,
        "unit": "cup",
        "original": "0.25 cup milk"
      },
      {
        "name": "parmesan cheese",
        "amount": 0.25,
        "unit": "cup",
        "original": "0.25 cup grated parmesan cheese"
      },
      {
        "name": "pepperoni",
        "amount": 0.5,
        "unit": "cup",
        "original": "0.5 cup sliced pepperoni"
      },
      {
        "name": "mozzarella cheese",
        "amount": 0.5,
        "unit": "cup",
        "original": "0.5 cup shredded mozzarella cheese"
      }
      // Note: "eggs" ingredient has been removed
    ],
    "cookingInstructions": [
      {
        "number": 1,
        "step": "Preheat oven to 375°F"
      },
      {
        "number": 2,
        "step": "Mix ingredients in a bowl"
      }
      // ... more steps
    ],
    "healthLabels": ["gluten-free"],
    "dietLabels": ["low-carb"],
    "cuisineTypes": ["italian"]
  },
  "hasCustomizations": true,
  "customizations": {
    "modifications": [
      {
        "type": "omit",
        "originalIngredient": "eggs",
        "notes": "Removed manually"
      }
    ],
    "customizationSummary": [
      {
        "type": "omit",
        "action": "Removed",
        "ingredient": "eggs",
        "amount": null,
        "notes": "Removed manually",
        "hasNotes": true
      }
    ],
    "appliedServings": 1,
    "micronutrientsIncluded": false,
    "nutritionComparison": {
      "macros": {
        "original": {
          "caloriesPerServing": "669",
          "proteinPerServingG": "49",
          "carbsPerServingG": "13",
          "fatPerServingG": "49",
          "fiberPerServingG": "1"
        },
        "customized": {
          "caloriesPerServing": "535",
          "proteinPerServingG": "36.5",
          "carbsPerServingG": "8.7",
          "fatPerServingG": "38.8",
          "fiberPerServingG": "0"
        }
      }
    },
    "originalNutrition": {
      "caloriesPerServing": "669",
      "proteinPerServingG": "49",
      "carbsPerServingG": "13",
      "fatPerServingG": "49",
      "fiberPerServingG": "1"
    },
    "customizedNutrition": {
      "caloriesPerServing": "535",
      "proteinPerServingG": "36.5",
      "carbsPerServingG": "8.7",
      "fatPerServingG": "38.8",
      "fiberPerServingG": "0"
    }
  },
  "message": "Recipe retrieved from cache with customizations applied"
}
```

### Error Responses

#### 400 Bad Request - Validation Error
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "recipeId",
      "message": "recipeId is required"
    }
  ]
}
```

#### 403 Forbidden - Access Denied
```json
{
  "error": "Access denied",
  "message": "You do not have access to this draft"
}
```

#### 404 Not Found
```json
{
  "error": "Recipe not found",
  "message": "Recipe 622598 not found in meal lunch"
}
```

#### 405 Method Not Allowed
```json
{
  "error": "Method not allowed"
}
```

## Example Usage

### cURL Example

```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipes/customized?recipeId=622598&draftId=draft_1759771713995_ksn6dvy0q&day=1&mealName=lunch' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Accept: application/json'
```

### JavaScript/Fetch Example

```javascript
const getCustomizedRecipe = async (recipeId, draftId, day, mealName) => {
  const params = new URLSearchParams({
    recipeId,
    draftId,
    day: day.toString(),
    mealName
  });

  const response = await fetch(
    `https://caloriescience-api.vercel.app/api/recipes/customized?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
        'Accept': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
};

// Usage
const { recipe, hasCustomizations, customizations } = await getCustomizedRecipe(
  '622598',
  'draft_1759771713995_ksn6dvy0q',
  1,
  'lunch'
);

console.log('Recipe title:', recipe.title);
console.log('Ingredients count:', recipe.ingredients.length);
console.log('Calories:', recipe.calories);

if (hasCustomizations) {
  console.log('Modifications:', customizations.modifications);
  console.log('Original calories:', customizations.originalNutrition.calories);
  console.log('New calories:', customizations.customizedNutrition.calories);
}
```

### React Example

```tsx
import { useState, useEffect } from 'react';

interface CustomizedRecipeData {
  recipe: Recipe;
  hasCustomizations: boolean;
  customizations: Customizations | null;
}

const CustomizedRecipeView = ({ recipeId, draftId, day, mealName }) => {
  const [data, setData] = useState<CustomizedRecipeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomizedRecipe = async () => {
      try {
        const params = new URLSearchParams({
          recipeId,
          draftId,
          day: day.toString(),
          mealName
        });

        const response = await fetch(
          `/api/recipes/customized?${params}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Accept': 'application/json'
            }
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch recipe');
        }

        const result = await response.json();
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomizedRecipe();
  }, [recipeId, draftId, day, mealName]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.recipeName}</h1>
      <img src={data.recipeImageUrl} alt={data.recipeName} />
      
      {hasCustomizations && (
        <div className="customization-badge">
          ⚡ Customized Recipe
        </div>
      )}

      {data.customNotes && (
        <div className="custom-notes">
          <h3>📝 Recipe Notes</h3>
          <p>{data.customNotes}</p>
        </div>
      )}

      <div className="nutrition">
        <h3>Nutrition (per serving)</h3>
        <ul>
          <li>Calories: {data.caloriesPerServing}</li>
          <li>Protein: {data.proteinPerServingG}g</li>
          <li>Carbs: {data.carbsPerServingG}g</li>
          <li>Fat: {data.fatPerServingG}g</li>
          <li>Fiber: {data.fiberPerServingG}g</li>
        </ul>

        {hasCustomizations && customizations && (
          <div className="comparison">
            <h4>Nutrition Changes</h4>
            <p>
              Original: {customizations.originalNutrition.calories} cal →
              Customized: {customizations.customizedNutrition.calories} cal
              ({customizations.customizedNutrition.calories - customizations.originalNutrition.calories > 0 ? '+' : ''}
              {customizations.customizedNutrition.calories - customizations.originalNutrition.calories} cal)
            </p>
          </div>
        )}
      </div>

      <div className="ingredients">
        <h3>Ingredients</h3>
        <ul>
          {data.ingredients.map((ing, idx) => (
            <li key={idx}>
              {ing.amount} {ing.unit} {ing.name}
            </li>
          ))}
        </ul>
      </div>

      {hasCustomizations && customizations && customizations.modifications.length > 0 && (
        <div className="modifications">
          <h3>Modifications Applied</h3>
          <ul>
            {customizations.modifications.map((mod, idx) => (
              <li key={idx}>
                {mod.type === 'omit' && `🚫 Removed: ${mod.originalIngredient}`}
                {mod.type === 'add' && `➕ Added: ${mod.newIngredient}`}
                {mod.type === 'replace' && `🔄 Replaced: ${mod.originalIngredient} → ${mod.newIngredient}`}
                {mod.notes && <span className="notes"> ({mod.notes})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="instructions">
        <h3>Instructions</h3>
        <ol>
          {data.cookingInstructions.map((instruction, idx) => (
            <li key={idx}>{instruction.step}</li>
          ))}
        </ol>
      </div>
    </div>
  );
};
```

## How It Works

1. **Fetches Draft**: Retrieves the meal plan draft to access customizations
2. **Locates Recipe**: Finds the specific recipe in the draft by day and meal name
3. **Gets Base Recipe**: Retrieves the original recipe from cache or API
4. **Applies Modifications**: 
   - **Omit**: Removes ingredients from the list and subtracts their nutrition
   - **Add**: Adds new ingredients to the list and adds their nutrition
   - **Replace**: Swaps ingredients and adjusts nutrition accordingly
5. **Returns Result**: Provides both the customized recipe and a comparison with the original

## Key Features

- ✅ **Cache-First**: Prioritizes recipe cache for faster response
- ✅ **Full Ingredient List**: Shows the final ingredient list with all modifications
- ✅ **Accurate Nutrition**: Reflects nutrition changes from ingredient modifications
- ✅ **Modification History**: Returns list of all applied modifications
- ✅ **Before/After Comparison**: Shows original vs customized nutrition
- ✅ **Serving Adjustments**: Accounts for serving size changes
- ✅ **Custom Notes**: Includes custom notes added to the recipe (see below)
- ✅ **Access Control**: Ensures users can only access their own drafts

## Custom Notes

Custom notes are additional text annotations that nutritionists can add to recipes. These notes are stored in the draft and returned in the customized recipe response.

### Saving Custom Notes

To save custom notes for a recipe, use the `update-notes` action on the draft API:

```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "update-notes",
    "planId": "draft_1759771713995_ksn6dvy0q",
    "day": 1,
    "mealName": "lunch",
    "recipeId": "622598",
    "notes": "This recipe has been customized for a client with egg allergy. Make sure to use dairy alternatives if needed."
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Notes updated successfully",
  "data": {
    "day": 1,
    "mealName": "lunch",
    "recipeId": "622598",
    "recipeTitle": "Pittata - Pizza Frittata",
    "customNotes": "This recipe has been customized for a client with egg allergy. Make sure to use dairy alternatives if needed.",
    "notesLength": 111
  }
}
```

### Retrieving Custom Notes

Custom notes are automatically included in the customized recipe response as `customNotes` field in the recipe object. See the response examples above.

## Related Endpoints

- `POST /api/meal-plans/generate` - Generate meal plan drafts
- `POST /api/meal-plans/draft` - Manage draft customizations (including custom notes)
- `GET /api/recipes/[id]/details` - Get base recipe details without customizations

## Notes

- The endpoint returns the **final state** of the recipe with all modifications applied
- If no customizations exist, it returns the base recipe unchanged
- Ingredient matching is case-insensitive and uses partial matching
- Nutrition recalculation happens automatically based on ingredient changes
- The original recipe in cache remains unchanged

