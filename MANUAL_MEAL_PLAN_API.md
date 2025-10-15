# Manual Meal Plan API Documentation

## Overview

The Manual Meal Plan API allows nutritionists to create custom meal plans by manually selecting recipes for their clients. Unlike auto-generated plans, manual plans give full control to the nutritionist to search, select, and customize recipes for each meal slot.

## Features

- **Draft Workflow**: Create meal plans in draft mode, add/remove recipes, then finalize
- **Meal Program Templates**: Optionally use existing meal programs as templates
- **Recipe Flexibility**: Add recipes from Edamam or Spoonacular, fetched via API or from cache
- **Ingredient Modifications**: Use the same customization system as auto-generated plans
- **Expiration Management**: Drafts expire after 7 days; finalized plans never expire

## Architecture

### Database
- Uses the existing `meal_plan_drafts` table
- New column: `creation_method` ('manual' or 'auto_generated')
- No foreign key to meal program (template structure is copied to JSONB)

### Storage Structure
Customizations are stored in the `suggestions` JSONB field:
```json
{
  "days": [
    {
      "day": 1,
      "date": "2025-10-20",
      "meals": {
        "breakfast": {
          "recipes": [...],
          "customizations": {
            "recipe-id": {
              "source": "spoonacular",
              "servings": 1,
              "modifications": [...]
            }
          },
          "selectedRecipeId": "recipe-id",
          "totalNutrition": {...}
        }
      }
    }
  ]
}
```

---

## API Endpoints

### 1. Create Manual Meal Plan Draft

**Endpoint:** `POST /api/meal-plans/manual/create`

**Description:** Create a new manual meal plan draft with empty meal slots.

**Authentication:** Required (Nutritionist only)

**Request Body:**
```json
{
  "clientId": "uuid",
  "mealProgramId": "uuid",  // optional - use as template
  "planDate": "2025-10-20",
  "durationDays": 7
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "draftId": "manual-{clientId}-{timestamp}",
    "status": "draft",
    "creationMethod": "manual",
    "planDate": "2025-10-20",
    "durationDays": 7,
    "expiresAt": "2025-10-27T12:00:00.000Z"
  },
  "message": "Manual meal plan draft created successfully"
}
```

**Validation:**
- `clientId`: Must be valid UUID, client must belong to nutritionist
- `mealProgramId`: If provided, must exist and belong to client
- `planDate`: Must be valid ISO date (YYYY-MM-DD)
- `durationDays`: Must be between 1 and 30

**Errors:**
- `403`: Not a nutritionist
- `404`: Client or meal program not found
- `400`: Validation error

---

### 2. Add Recipe to Draft

**Endpoint:** `POST /api/meal-plans/manual/add-recipe`

**Description:** Add a recipe to a specific meal slot in the draft.

**Authentication:** Required (Nutritionist only)

**Request Body:**
```json
{
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "breakfast",
  "recipe": {
    "id": "recipe-id",
    "provider": "spoonacular",
    "source": "api"  // or "cached"
  },
  "servings": 1.5  // optional
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "draftId": "manual-uuid",
    "day": 1,
    "mealName": "breakfast",
    "recipe": {
      "id": "recipe-id",
      "title": "Scrambled Eggs",
      "image": "https://...",
      "sourceUrl": "https://...",
      "source": "spoonacular",
      "servings": 1.5,
      "nutrition": {
        "calories": 480,
        "protein": 24,
        "carbs": 12,
        "fat": 18,
        "fiber": 2
      }
    },
    "totalNutrition": {
      "calories": 480,
      "protein": 24,
      "carbs": 12,
      "fat": 18,
      "fiber": 2
    }
  },
  "message": "Recipe added successfully"
}
```

**Behavior:**
- If `source: "api"`: Fetches recipe from provider API and caches it
- If `source: "cached"`: Retrieves recipe from `cached_recipes` table
- Replaces any existing recipe in the meal slot
- Recalculates meal nutrition based on servings

**Validation:**
- `draftId`: Must exist and belong to nutritionist
- `day`: Must be within plan duration (1 to durationDays)
- `mealName`: Must exist in the meal structure
- `recipe.provider`: Must be 'edamam' or 'spoonacular'
- `recipe.source`: Must be 'api' or 'cached'
- `servings`: If provided, must be between 0.1 and 20

**Errors:**
- `403`: Access denied or not a nutritionist
- `404`: Draft, recipe, or meal slot not found
- `400`: Validation error

---

### 3. Remove Recipe from Draft

**Endpoint:** `DELETE /api/meal-plans/manual/remove-recipe`

**Description:** Remove a recipe from a meal slot.

**Authentication:** Required (Nutritionist only)

**Request Body:**
```json
{
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "breakfast"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Recipe removed successfully"
}
```

**Behavior:**
- Clears the recipe from the meal slot
- Removes all customizations for that meal
- Resets nutrition to undefined

**Validation:**
- `draftId`: Must exist and belong to nutritionist
- `day`: Must be within plan duration
- `mealName`: Must exist in the meal structure

**Errors:**
- `403`: Access denied or not a nutritionist
- `404`: Draft or meal slot not found
- `400`: Validation error

---

### 4. Modify Recipe Ingredients

**Endpoint:** `PUT /api/meal-plans/draft` (action: `update-customizations`)

**Description:** Modify ingredients in a recipe. **Uses the same endpoint as auto-generated plans.**

**Authentication:** Required (Nutritionist only)

**Request Body:**
```json
{
  "action": "update-customizations",
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "recipe-id",
  "customizations": {
    "source": "spoonacular",
    "servings": 1,
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "butter",
        "newIngredient": "olive oil",
        "amount": 2,
        "unit": "tbsp",
        "originalAmount": 2,
        "originalUnit": "tbsp"
      },
      {
        "type": "omit",
        "originalIngredient": "sugar"
      },
      {
        "type": "add",
        "newIngredient": "honey",
        "amount": 1,
        "unit": "tbsp"
      }
    ]
  },
  "autoCalculateNutrition": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "modifiedNutrition": {
      "calories": { "quantity": 520, "unit": "kcal" },
      "macros": {
        "protein": { "quantity": 22, "unit": "g" },
        "carbs": { "quantity": 15, "unit": "g" },
        "fat": { "quantity": 20, "unit": "g" }
      },
      "micros": {
        "vitamins": { ... },
        "minerals": { ... }
      }
    },
    "micronutrientsIncluded": true,
    "debugSteps": [...]
  }
}
```

**Modification Types:**
- `replace`: Replace an ingredient with another (e.g., butter → olive oil)
- `omit`: Remove an ingredient completely
- `add`: Add a new ingredient to the recipe

**Features:**
- **Smart Merge**: Automatically merges with existing modifications
- **Chained Modifications**: Can modify the result of previous modifications
- **Nutrition Recalculation**: Uses `IngredientCustomizationService` for accurate nutrition
- **Micronutrient Tracking**: Includes vitamins and minerals in calculations
- **Works at Any Status**: Can modify in draft, finalized, or active status

**See Also:** `api/meal-plans/draft.ts` for full implementation details

---

### 5. Finalize Manual Meal Plan

**Endpoint:** `POST /api/meal-plans/manual/finalize`

**Description:** Finalize a manual meal plan draft, making it permanent.

**Authentication:** Required (Nutritionist only)

**Request Body:**
```json
{
  "draftId": "manual-uuid",
  "planName": "Weekly Meal Plan"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "planId": "manual-uuid",
    "status": "finalized",
    "planName": "Weekly Meal Plan",
    "finalizedAt": "2025-10-20T12:00:00.000Z"
  },
  "message": "Meal plan finalized successfully"
}
```

**Behavior:**
- Validates all meal slots have recipes
- Sets status to 'finalized'
- Sets finalized_at timestamp
- Removes expiration (expires_at = null)
- Updates plan name

**Validation:**
- All meal slots must have at least one recipe
- Draft must be in 'draft' status
- Draft must belong to nutritionist

**Errors:**
- `403`: Access denied or not a nutritionist
- `404`: Draft not found
- `400`: Validation error or incomplete meal plan

---

### 6. Get Manual Meal Plan Draft

**Endpoint:** `GET /api/meal-plans/manual/{id}`

**Description:** Retrieve a manual meal plan draft with full details.

**Authentication:** Required (Nutritionist only)

**Request:** No body required

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "manual-uuid",
    "clientId": "uuid",
    "nutritionistId": "uuid",
    "status": "draft",
    "creationMethod": "manual",
    "planName": "Weekly Meal Plan",
    "planDate": "2025-10-20",
    "endDate": "2025-10-27",
    "durationDays": 7,
    "searchParams": {
      "creation_method": "manual",
      "client_id": "uuid",
      "plan_date": "2025-10-20",
      "duration_days": 7
    },
    "suggestions": [
      {
        "day": 1,
        "date": "2025-10-20",
        "meals": {
          "breakfast": {
            "recipes": [...],
            "customizations": {...},
            "selectedRecipeId": "recipe-id",
            "totalNutrition": {...}
          }
        }
      }
    ],
    "createdAt": "2025-10-20T12:00:00.000Z",
    "updatedAt": "2025-10-20T12:30:00.000Z",
    "expiresAt": "2025-10-27T12:00:00.000Z",
    "finalizedAt": null
  },
  "message": "Meal plan draft retrieved successfully"
}
```

**Errors:**
- `403`: Access denied or not a nutritionist
- `404`: Draft not found or expired
- `400`: Missing draft ID

---

## Workflow Examples

### Example 1: Create Plan Without Meal Program

```bash
# Step 1: Create draft
POST /api/meal-plans/manual/create
{
  "clientId": "client-uuid",
  "planDate": "2025-10-20",
  "durationDays": 7
}

# Response: draftId = "manual-client-uuid-1729425600000"
# Default structure: breakfast, lunch, dinner, snack for 7 days

# Step 2: Add recipe to breakfast, day 1
POST /api/meal-plans/manual/add-recipe
{
  "draftId": "manual-client-uuid-1729425600000",
  "day": 1,
  "mealName": "breakfast",
  "recipe": {
    "id": "663959",
    "provider": "spoonacular",
    "source": "api"
  }
}

# Step 3: Modify ingredients
PUT /api/meal-plans/draft
{
  "action": "update-customizations",
  "draftId": "manual-client-uuid-1729425600000",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "663959",
  "customizations": {
    "source": "spoonacular",
    "servings": 1,
    "modifications": [
      { "type": "omit", "originalIngredient": "sugar" }
    ]
  }
}

# Step 4: Finalize
POST /api/meal-plans/manual/finalize
{
  "draftId": "manual-client-uuid-1729425600000",
  "planName": "October Week 3"
}
```

### Example 2: Create Plan With Meal Program Template

```bash
# Step 1: Create draft with meal program template
POST /api/meal-plans/manual/create
{
  "clientId": "client-uuid",
  "mealProgramId": "program-uuid",
  "planDate": "2025-10-20",
  "durationDays": 7
}

# Meal program structure is copied:
# - Breakfast at 8:00 (500 cal target)
# - Lunch at 12:00 (600 cal target)
# - Dinner at 18:00 (600 cal target)
# - Snack at 15:00 (200 cal target)

# Step 2: Add recipes to each meal slot
# (same as example 1)
```

---

## Integration with Other APIs

### Recipe Search
After searching with `/api/recipe-search-client`, add selected recipes:

```javascript
// 1. Search for recipes
const searchResponse = await fetch('/api/recipe-search-client', {
  method: 'GET',
  params: {
    clientId: 'client-uuid',
    query: 'chicken',
    searchType: 'name'
  }
});

// 2. User selects recipe from results
const selectedRecipe = searchResponse.data.recipes[0];

// 3. Add to meal plan
await fetch('/api/meal-plans/manual/add-recipe', {
  method: 'POST',
  body: {
    draftId: 'manual-uuid',
    day: 1,
    mealName: 'breakfast',
    recipe: {
      id: selectedRecipe.id,
      provider: selectedRecipe.source,
      source: 'api'
    }
  }
});
```

### Cached Recipes
If the recipe is already in cache, use `source: "cached"`:

```javascript
await fetch('/api/meal-plans/manual/add-recipe', {
  method: 'POST',
  body: {
    draftId: 'manual-uuid',
    day: 1,
    mealName: 'breakfast',
    recipe: {
      id: 'cached-recipe-uuid',  // UUID from cached_recipes table
      provider: 'spoonacular',
      source: 'cached'
    }
  }
});
```

---

## Status Lifecycle

```
draft → finalized → active → completed → archived
  ↓
expired (if not finalized within 7 days)
```

**Status Definitions:**
- `draft`: Being built, expires in 7 days
- `finalized`: Complete but not yet active, never expires
- `active`: Currently in use by client
- `completed`: Client finished the plan
- `archived`: Historical record

**Note:** Ingredient modifications can be made at ANY status.

---

## Validation Rules

### Creation
- Client must exist and belong to nutritionist
- Meal program (if provided) must belong to client
- Duration must be 1-30 days

### Add Recipe
- Draft must exist and belong to nutritionist
- Day must be within plan duration
- Meal slot must exist in structure
- Recipe must be valid (found via API or in cache)

### Remove Recipe
- Draft must exist and belong to nutritionist
- Day must be within plan duration
- Meal slot must exist

### Modify Ingredients
- Draft must exist and belong to nutritionist
- Recipe must exist in the meal slot
- Modifications must be valid (ingredients exist)
- Works at ANY status (draft/finalized/active)

### Finalize
- All meal slots must have at least one recipe
- Draft must be in 'draft' status
- Draft must belong to nutritionist

---

## Error Handling

### Common Error Responses

**400 Bad Request - Validation Error:**
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "durationDays",
      "message": "durationDays must be between 1 and 30"
    }
  ]
}
```

**403 Forbidden - Access Denied:**
```json
{
  "error": "Access denied",
  "message": "Only nutritionists can create manual meal plans"
}
```

**404 Not Found:**
```json
{
  "error": "Draft not found",
  "message": "The specified meal plan draft does not exist or has expired"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Failed to create draft: <specific error>"
}
```

---

## Performance Considerations

1. **Recipe Caching**: Recipes fetched from APIs are automatically cached to reduce API calls
2. **Nutrition Recalculation**: Only triggered when modifications are made
3. **Draft Cleanup**: Expired drafts (> 7 days old, not finalized) should be cleaned up periodically
4. **JSONB Indexing**: The `suggestions` field uses JSONB for flexible structure and fast queries

---

## Future Enhancements

- [ ] Bulk recipe addition (multiple meals at once)
- [ ] Copy from another meal plan
- [ ] Recipe substitution suggestions
- [ ] Nutrition target tracking per day/meal
- [ ] Shopping list generation
- [ ] Meal plan versioning

