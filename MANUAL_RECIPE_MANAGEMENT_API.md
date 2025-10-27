# Manual Custom Recipe Management API

## Overview

Nutritionists can create, edit, list, and delete their own custom recipes. These APIs manage the **base custom recipes** themselves (not recipes within meal plans).

All APIs require **nutritionist authentication**.

---

## API Endpoints

### 1. List All Custom Recipes

**Endpoint:** `GET /api/recipes/custom`

**Description:** Get a list of all custom recipes created by the nutritionist, with optional filters.

**Authentication:** Required (Nutritionist only)

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20, max: 100) - Results per page
- `search` (optional) - Search by recipe name
- `healthLabels` (optional) - Filter by health labels (comma-separated or array)
- `cuisineTypes` (optional) - Filter by cuisine types
- `mealTypes` (optional) - Filter by meal types
- `dishTypes` (optional) - Filter by dish types
- `caloriesMin` (optional) - Minimum calories per serving
- `caloriesMax` (optional) - Maximum calories per serving
- `includePublic` (optional, default: true) - Include public recipes from other nutritionists

**Example Request:**
```bash
curl -X GET "https://your-api.com/api/recipes/custom?page=1&limit=10&search=smoothie&healthLabels=high-protein" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "recipe-uuid",
      "provider": "manual",
      "recipeName": "High-Protein Smoothie Bowl",
      "recipeDescription": "A nutrient-dense breakfast option",
      "recipeImageUrl": "https://example.com/image.jpg",
      "servings": 2,
      "caloriesPerServing": 136,
      "proteinPerServingG": 13.6,
      "carbsPerServingG": 16.55,
      "fatPerServingG": 2.25,
      "fiberPerServingG": 1.9,
      "healthLabels": ["high-protein", "gluten-free"],
      "allergens": ["tree-nuts"],
      "cuisineTypes": ["american"],
      "mealTypes": ["breakfast"],
      "isPublic": true,
      "createdByNutritionistId": "nutritionist-uuid",
      "createdAt": "2025-10-22T10:30:00Z",
      "updatedAt": "2025-10-22T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

**Features:**
- ✅ Lists your own private recipes
- ✅ Lists public recipes from other nutritionists (if `includePublic=true`)
- ✅ Supports full-text search on recipe name
- ✅ Filters by health labels, cuisine, meal type, calories
- ✅ Pagination support

---

### 2. Get Single Custom Recipe Details

**Endpoint:** `GET /api/recipes/[id]/details?id=<recipe_id>`

**Description:** Get complete details of a single custom recipe including ingredients, instructions, and full nutrition.

**Authentication:** Required (Nutritionist only)

**Query Parameters:**
- `id` (required) - The recipe UUID

**Example Request:**
```bash
curl -X GET "https://your-api.com/api/recipes/[id]/details?id=recipe-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recipe-uuid",
    "provider": "manual",
    "title": "High-Protein Smoothie Bowl",
    "description": "A nutrient-dense breakfast option",
    "image": "https://example.com/image.jpg",
    "servings": 2,
    "prepTime": 5,
    "cookTime": 0,
    "totalTime": 5,
    "ingredients": [
      {
        "name": "banana",
        "quantity": 1,
        "unit": "medium",
        "nutrition": {
          "calories": 105,
          "macros": {
            "protein": 1.3,
            "carbs": 27,
            "fat": 0.4,
            "fiber": 3.1
          }
        }
      }
    ],
    "instructions": [
      "Add all ingredients to a blender",
      "Blend until smooth",
      "Pour into bowls and serve"
    ],
    "nutritionDetails": {
      "calories": { "quantity": 136, "unit": "kcal" },
      "macros": {
        "protein": { "quantity": 13.6, "unit": "g" },
        "carbs": { "quantity": 16.55, "unit": "g" },
        "fat": { "quantity": 2.25, "unit": "g" },
        "fiber": { "quantity": 1.9, "unit": "g" }
      },
      "micros": {
        "vitamins": { ... },
        "minerals": { ... }
      }
    },
    "healthLabels": ["high-protein", "gluten-free"],
    "allergens": ["tree-nuts"],
    "cuisineType": ["american"],
    "mealType": ["breakfast"],
    "customNotes": "Great for post-workout recovery",
    "isPublic": true,
    "createdBy": "nutritionist-uuid",
    "fromCache": true
  }
}
```

**Access Control:**
- ✅ Public recipes: Accessible by all nutritionists
- ✅ Private recipes: Only accessible by the creator

---

### 3. Create Custom Recipe

**Endpoint:** `POST /api/recipes/custom`

**Description:** Create a new custom recipe with ingredients and automatic nutrition calculation.

**Authentication:** Required (Nutritionist only)

**Request Body:**
```json
{
  "recipeName": "High-Protein Smoothie Bowl",
  "description": "A nutrient-dense breakfast option",
  "ingredients": [
    {
      "name": "banana",
      "quantity": 1,
      "unit": "medium",
      "nutritionData": {
        "calories": 105,
        "macros": {
          "protein": 1.3,
          "carbs": 27,
          "fat": 0.4,
          "fiber": 3.1,
          "sugar": 14.4,
          "sodium": 1.2
        },
        "micros": {
          "vitamins": {
            "vitaminC": 10.3,
            "vitaminB6": 0.4
          },
          "minerals": {
            "potassium": 422,
            "magnesium": 32
          }
        },
        "weight": 118
      }
    },
    {
      "name": "protein powder",
      "quantity": 30,
      "unit": "g",
      "nutritionData": {
        "calories": 120,
        "macros": {
          "protein": 24,
          "carbs": 3,
          "fat": 1.5,
          "fiber": 0,
          "sugar": 1,
          "sodium": 150
        },
        "micros": {
          "vitamins": {},
          "minerals": {}
        },
        "weight": 30
      }
    }
  ],
  "servings": 2,
  "instructions": [
    "Add all ingredients to a blender",
    "Blend until smooth and creamy",
    "Pour into bowls",
    "Top with your favorite toppings"
  ],
  "customNotes": "Great for post-workout recovery. Can substitute almond milk with any plant-based milk.",
  "imageUrl": "https://example.com/smoothie-bowl.jpg",
  "healthLabels": ["high-protein", "gluten-free", "vegetarian"],
  "allergens": ["tree-nuts"],
  "dietLabels": ["vegetarian"],
  "cuisineTypes": ["american"],
  "mealTypes": ["breakfast"],
  "dishTypes": ["smoothie"],
  "prepTimeMinutes": 5,
  "cookTimeMinutes": 0,
  "totalTimeMinutes": 5,
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom recipe created successfully",
  "data": {
    "id": "new-recipe-uuid",
    "provider": "manual",
    "recipeName": "High-Protein Smoothie Bowl",
    "servings": 2,
    "totalCalories": 272,
    "totalProteinG": 27.2,
    "totalCarbsG": 33.1,
    "totalFatG": 4.5,
    "caloriesPerServing": 136,
    "proteinPerServingG": 13.6,
    "carbsPerServingG": 16.55,
    "fatPerServingG": 2.25,
    "isPublic": true,
    "createdAt": "2025-10-24T12:00:00Z"
  }
}
```

**Features:**
- ✅ Automatically calculates total nutrition by summing all ingredients
- ✅ Automatically calculates per-serving nutrition
- ✅ Supports micronutrients (vitamins & minerals)
- ✅ Validates all required fields
- ✅ Public/private visibility control

**Validation:**
- `recipeName`: Required, non-empty string
- `ingredients`: Required array with at least 1 ingredient
- `servings`: Required, minimum 1
- `isPublic`: Required boolean (true or false)

---

### 4. Edit/Update Custom Recipe

**Endpoint:** `PUT /api/recipes/custom`

**Description:** Update an existing custom recipe. Only the recipe creator can edit.

**Authentication:** Required (Nutritionist only, must be recipe owner)

**Request Body:**
```json
{
  "id": "recipe-uuid",
  "recipeName": "Updated Recipe Name",
  "description": "Updated description",
  "ingredients": [
    {
      "name": "banana",
      "quantity": 2,
      "unit": "medium",
      "nutritionData": { ... }
    }
  ],
  "servings": 3,
  "instructions": ["Updated step 1", "Updated step 2"],
  "customNotes": "Updated notes",
  "imageUrl": "https://example.com/new-image.jpg",
  "healthLabels": ["high-protein", "low-sugar"],
  "isPublic": false,
  "prepTimeMinutes": 10,
  "cookTimeMinutes": 5
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom recipe updated successfully",
  "data": {
    "id": "recipe-uuid",
    "recipeName": "Updated Recipe Name",
    "servings": 3,
    "caloriesPerServing": 120,
    "updatedAt": "2025-10-24T12:30:00Z"
  }
}
```

**Features:**
- ✅ Partial updates supported (only include fields you want to change)
- ✅ Recalculates nutrition if ingredients or servings change
- ✅ Validates ownership before updating
- ✅ All fields are optional except `id`

**Validation:**
- `id`: Required - UUID of the recipe to update
- Ownership: Must be created by the authenticated nutritionist

**Errors:**
- `403`: Access denied - You don't own this recipe
- `404`: Recipe not found

---

### 5. Delete Custom Recipe

**Endpoint:** `DELETE /api/recipes/custom?id=<recipe_id>`

**Description:** Delete a custom recipe. Only the recipe creator can delete.

**Authentication:** Required (Nutritionist only, must be recipe owner)

**Query Parameters:**
- `id` (required) - The recipe UUID to delete

**Example Request:**
```bash
curl -X DELETE "https://your-api.com/api/recipes/custom?id=recipe-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "message": "Custom recipe deleted successfully"
}
```

**Features:**
- ✅ Validates ownership before deletion
- ✅ Permanently removes recipe from database

**Validation:**
- `id`: Required - UUID of the recipe to delete
- Ownership: Must be created by the authenticated nutritionist

**Errors:**
- `403`: Access denied - You don't own this recipe
- `404`: Recipe not found

---

## Complete Workflow Example

### Step 1: Get Ingredient Nutrition Data

Before creating a recipe, fetch nutrition data for each ingredient:

```bash
# Get nutrition for banana
curl -X POST "https://your-api.com/api/ingredients/nutrition" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "ingredientQuery": "1 medium banana",
    "provider": "edamam"
  }'
```

### Step 2: Create Recipe

```bash
curl -X POST "https://your-api.com/api/recipes/custom" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "My Custom Recipe",
    "ingredients": [
      {
        "name": "banana",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": { ... }
      }
    ],
    "servings": 2,
    "instructions": ["Step 1", "Step 2"],
    "isPublic": true
  }'
```

### Step 3: List Your Recipes

```bash
curl -X GET "https://your-api.com/api/recipes/custom?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 4: Update Recipe

```bash
curl -X PUT "https://your-api.com/api/recipes/custom" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "recipe-uuid",
    "recipeName": "Updated Name",
    "servings": 3
  }'
```

### Step 5: Get Recipe Details

```bash
curl -X GET "https://your-api.com/api/recipes/[id]/details?id=recipe-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 6: Delete Recipe

```bash
curl -X DELETE "https://your-api.com/api/recipes/custom?id=recipe-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Access Control

### Private Recipes (`isPublic: false`)
- ✅ Visible only in your own recipe list
- ✅ Only you can view details
- ✅ Only you can edit or delete
- ❌ Not visible to other nutritionists

### Public Recipes (`isPublic: true`)
- ✅ Visible to all nutritionists in search/list
- ✅ All nutritionists can view details
- ✅ Only you can edit or delete
- ✅ Appears in global recipe search

---

## Integration with Meal Plans

Once created, custom recipes can be used in meal plans:

```bash
# Add custom recipe to meal plan
curl -X POST "https://your-api.com/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "meal-plan-draft-id",
    "day": 1,
    "mealName": "breakfast",
    "recipe": {
      "id": "custom-recipe-uuid",
      "provider": "manual",
      "source": "cached"
    },
    "servings": 2
  }'
```

---

## Best Practices

1. **Use Ingredient APIs**: Always fetch nutrition data from `/api/ingredients/nutrition` for accuracy
2. **Validate Units**: Ensure quantity and unit match what was used to fetch nutrition
3. **Set Visibility Carefully**: Use `isPublic: false` while drafting, then switch to `true` when ready
4. **Include Instructions**: Add clear cooking instructions for better UX
5. **Tag Appropriately**: Use health labels, cuisine types, and meal types for better searchability

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error",
  "message": "recipeName is required"
}
```

### 403 Forbidden
```json
{
  "error": "Access denied",
  "message": "You do not own this recipe"
}
```

### 404 Not Found
```json
{
  "error": "Not found",
  "message": "Recipe not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Failed to create custom recipe"
}
```

---

## Summary

All APIs for managing custom recipes are **already implemented**:

- ✅ **GET /api/recipes/custom** - List all custom recipes
- ✅ **GET /api/recipes/[id]/details** - Get recipe details
- ✅ **POST /api/recipes/custom** - Create new recipe
- ✅ **PUT /api/recipes/custom** - Edit/update recipe
- ✅ **DELETE /api/recipes/custom** - Delete recipe

These APIs are **production-ready** and fully functional!

