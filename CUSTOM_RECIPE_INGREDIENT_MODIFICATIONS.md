# Custom Recipe Ingredient Modifications API

## Overview

This API allows modifying ingredients in custom/manual recipes (provider='manual') with automatic nutrition recalculation. Unlike meal plan customizations which are temporary, these modifications **update the base recipe itself** permanently.

## Endpoint

**PUT** `/api/recipes/custom/[id]/modify-ingredients`

## Authentication

- **Required**: Yes
- **Role**: Nutritionist only

## Features

✅ **Replace ingredients** - Swap one ingredient for another (e.g., butter → olive oil)
✅ **Omit ingredients** - Remove ingredients completely (e.g., remove sugar)
✅ **Add ingredients** - Add new ingredients to the recipe (e.g., add honey)
✅ **Automatic nutrition recalculation** - Uses Edamam API for accurate nutrition
✅ **Updates base recipe** - Modifications are permanent (not temporary customizations)
✅ **Consistent format** - Matches meal plan customization structure

## Request Format

```json
{
  "modifications": [
    {
      "type": "replace",
      "originalIngredient": "butter",
      "originalAmount": 2,
      "originalUnit": "tablespoons",
      "newIngredient": "olive oil",
      "amount": 2,
      "unit": "tablespoons"
    },
    {
      "type": "omit",
      "originalIngredient": "sugar",
      "originalAmount": 0.5,
      "originalUnit": "cup"
    },
    {
      "type": "add",
      "newIngredient": "honey",
      "amount": 2,
      "unit": "tablespoons"
    }
  ],
  "servings": 4,
  "autoCalculateNutrition": true
}
```

### Request Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `modifications` | Array | ✅ Yes | Array of ingredient modifications (min: 1) |
| `servings` | Number | ❌ No | Update servings (1-100), defaults to current servings |
| `autoCalculateNutrition` | Boolean | ❌ No | Auto-recalculate nutrition (default: true) |

### Modification Types

#### 1. Replace (`type: "replace"`)

Replace an existing ingredient with a new one.

**Required fields:**
- `originalIngredient`: String - Name of ingredient to replace
- `originalAmount`: Number - Amount of original ingredient
- `originalUnit`: String - Unit of original ingredient
- `newIngredient`: String - Name of new ingredient
- `amount`: Number - Amount of new ingredient
- `unit`: String - Unit of new ingredient

#### 2. Omit (`type: "omit"`)

Remove an ingredient completely.

**Required fields:**
- `originalIngredient`: String - Name of ingredient to remove
- `originalAmount`: Number - Amount of ingredient
- `originalUnit`: String - Unit of ingredient

#### 3. Add (`type: "add"`)

Add a new ingredient to the recipe.

**Required fields:**
- `newIngredient`: String - Name of ingredient to add
- `amount`: Number - Amount of ingredient
- `unit`: String - Unit of ingredient

## Response Format

```json
{
  "success": true,
  "message": "Recipe ingredients modified successfully",
  "data": {
    "recipe": {
      "id": "uuid",
      "recipeName": "Healthier Pancakes",
      "description": "Modified pancakes with olive oil instead of butter",
      "servings": 4,
      "ingredients": [
        {
          "name": "olive oil",
          "quantity": 2,
          "unit": "tablespoons",
          "nutrition": { ... }
        },
        {
          "name": "honey",
          "quantity": 2,
          "unit": "tablespoons",
          "nutrition": { ... }
        },
        {
          "name": "flour",
          "quantity": 2,
          "unit": "cups",
          "nutrition": { ... }
        }
      ],
      "nutrition": {
        "calories": { "quantity": 320, "unit": "kcal" },
        "macros": {
          "protein": { "quantity": 8, "unit": "g" },
          "carbs": { "quantity": 45, "unit": "g" },
          "fat": { "quantity": 12, "unit": "g" },
          "fiber": { "quantity": 2, "unit": "g" }
        },
        "micros": {
          "vitamins": { ... },
          "minerals": { ... }
        }
      },
      "nutritionServings": 1,
      "createdBy": "nutritionist-uuid",
      "isPublic": false,
      "createdAt": "2025-10-30T...",
      "updatedAt": "2025-10-30T..."
    },
    "modificationSummary": {
      "modificationsApplied": 3,
      "nutritionRecalculated": true,
      "servings": 4
    }
  }
}
```

## Usage Examples

### Example 1: Make Recipe Healthier

Replace butter with olive oil and remove sugar:

```bash
curl -X PUT 'https://your-domain.com/api/recipes/custom/recipe-uuid/modify-ingredients' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
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
      },
      {
        "type": "omit",
        "originalIngredient": "white sugar",
        "originalAmount": 0.5,
        "originalUnit": "cup"
      },
      {
        "type": "add",
        "newIngredient": "honey",
        "amount": 3,
        "unit": "tablespoons"
      }
    ],
    "autoCalculateNutrition": true
  }'
```

### Example 2: Adjust Recipe for Larger Batch

Keep ingredients but change servings:

```bash
curl -X PUT 'https://your-domain.com/api/recipes/custom/recipe-uuid/modify-ingredients' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "modifications": [],
    "servings": 8
  }'
```

Wait, this won't work because modifications array requires min 1 item. For just updating servings, use the existing `PATCH /api/recipes/custom/[id]/edit` endpoint.

### Example 3: Add Extra Protein

Add protein powder without changing anything else:

```bash
curl -X PUT 'https://your-domain.com/api/recipes/custom/recipe-uuid/modify-ingredients' \
  -H 'Authorization: Bearer <token>' \
  -H 'Content-Type: application/json' \
  -d '{
    "modifications": [
      {
        "type": "add",
        "newIngredient": "protein powder",
        "amount": 30,
        "unit": "grams"
      }
    ]
  }'
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "message": "Ingredient \"butter\" not found in recipe"
}
```

**Causes:**
- Missing required fields
- Invalid modification type
- Ingredient not found
- Empty modifications array

### 403 Forbidden

```json
{
  "success": false,
  "message": "Access denied: This recipe does not belong to you"
}
```

**Causes:**
- Not a nutritionist
- Recipe belongs to another nutritionist

### 404 Not Found

```json
{
  "success": false,
  "message": "Custom recipe not found"
}
```

**Causes:**
- Recipe ID doesn't exist
- Recipe is not a custom recipe (provider != 'manual')

### 500 Internal Server Error

```json
{
  "success": false,
  "message": "Failed to modify recipe ingredients",
  "error": "Specific error message"
}
```

## Comparison with Other Endpoints

| Endpoint | Use Case | Updates | Format |
|----------|----------|---------|--------|
| `PUT /api/recipes/custom` | Full recipe update | Base recipe | Requires complete ingredients array |
| `PATCH /api/recipes/custom/[id]/edit` | Metadata only | Base recipe | No ingredient changes |
| **`PUT /api/recipes/custom/[id]/modify-ingredients`** | **Ingredient modifications** | **Base recipe** | **Incremental changes (replace/omit/add)** |
| `PUT /api/meal-plans/draft` (update-customizations) | Meal plan customizations | Temporary customizations | Same modification format |

## Key Differences from Meal Plan Customizations

| Feature | Custom Recipe Modifications | Meal Plan Customizations |
|---------|----------------------------|--------------------------|
| **Scope** | Updates base recipe permanently | Creates temporary customization |
| **Storage** | Modifies `cached_recipes` table | Stores in draft `customizations` JSONB |
| **Recipe Object** | `recipe.ingredients` updated | `recipe.ingredients` unchanged |
| **Use Case** | Improve/fix recipe permanently | Try variations for specific meal plan |
| **Reusability** | All future uses get new version | Only applies to that meal plan |

## Important Notes

⚠️ **Permanent Changes**: Unlike meal plan customizations, these modifications **permanently update the base recipe**. All future uses will have the modified version.

⚠️ **Only Custom Recipes**: This endpoint only works for custom recipes (`provider='manual'`). For Edamam/Spoonacular recipes, use meal plan customizations.

⚠️ **Ingredient Matching**: Ingredient names are matched case-insensitively. "Butter" matches "butter" matches "BUTTER".

✅ **Nutrition Accuracy**: Uses Edamam Nutrition Analysis API for accurate ingredient nutrition data.

✅ **Format Consistency**: Response format matches other recipe endpoints with standardized nutrition structure.

## Workflow

1. **Fetch Recipe**: `GET /api/recipes/custom?id=recipe-uuid`
2. **Modify Ingredients**: `PUT /api/recipes/custom/[id]/modify-ingredients`
3. **View Updated Recipe**: Response includes complete updated recipe
4. **Use in Meal Plans**: Add modified recipe to meal plans via manual meal plan API

## Related Endpoints

- `GET /api/recipes/custom` - List custom recipes
- `POST /api/recipes/custom` - Create custom recipe
- `PUT /api/recipes/custom` - Update entire recipe
- `PATCH /api/recipes/custom/[id]/edit` - Update metadata only
- `DELETE /api/recipes/custom?id=<id>` - Delete custom recipe
- `POST /api/meal-plans/manual/add-recipe` - Add recipe to meal plan
