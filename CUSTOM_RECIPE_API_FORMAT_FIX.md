# Custom Recipe API Format Standardization

## Problem
The `/api/recipes/custom` endpoint was returning recipes in a different format compared to all other recipe endpoints in the application. This inconsistency caused issues with the frontend, which expected the standard `UnifiedRecipeSummary` format used everywhere else.

### Old Format (Inconsistent)
```json
{
  "id": "uuid",
  "recipeName": "Recipe Name",
  "recipeDescription": "Description",
  "recipeImageUrl": "url",
  "externalRecipeId": "manual_...",
  "cuisineTypes": [],
  "mealTypes": [],
  "dishTypes": [],
  "caloriesPerServing": 350,
  "proteinPerServingG": 20,
  "carbsPerServingG": 40,
  "fatPerServingG": 10,
  ...
}
```

### New Format (Standardized)
```json
{
  "id": "uuid",
  "title": "Recipe Name",
  "image": "url",
  "sourceUrl": "",
  "source": "manual",
  "cuisineType": [],
  "mealType": [],
  "dishType": [],
  "calories": 350,
  "protein": 20,
  "carbs": 40,
  "fat": 10,
  "isCustom": true,
  "createdBy": "nutritionist_id",
  "isPublic": true,
  ...
}
```

## Changes Made

### 1. Updated `CustomRecipeOutput` Type Definition
**File:** `types/customRecipe.ts`

- Restructured the interface to match `UnifiedRecipeSummary` format
- Changed field names to match standard recipe format:
  - `recipeName` → `title`
  - `recipeImageUrl` → `image`
  - `cuisineTypes` → `cuisineType`
  - `mealTypes` → `mealType`
  - `dishTypes` → `dishType`
  - `caloriesPerServing` → `calories`
  - `proteinPerServingG` → `protein`
  - `carbsPerServingG` → `carbs`
  - `fatPerServingG` → `fat`
  - `fiberPerServingG` → `fiber`
- Added standard fields: `source`, `sourceUrl`, `isCustom`, `createdBy`
- Kept additional fields for backward compatibility (e.g., `description`, `prepTimeMinutes`, `totalCalories`, etc.)

### 2. Updated `mapToOutput` Method
**File:** `lib/customRecipeService.ts`

- Modified the `mapToOutput` method to return recipes in the `UnifiedRecipeSummary` format
- Ensured nutrition values are per-serving (matching other providers)
- Formatted ingredients to include all necessary fields for allergen checking:
  ```typescript
  ingredients: [{
    name: "ingredient name",
    food: "ingredient name",
    quantity: 1,
    unit: "cup",
    original: "1 cup ingredient name",
    nutrition: {...}
  }]
  ```
- Added `isCustom: true` flag to distinguish custom recipes
- Maintained backward compatibility by including additional fields

## Benefits

### 1. **Frontend Consistency**
- All recipe components can now handle custom recipes without special cases
- Recipe cards display correctly regardless of source
- Filtering and sorting work uniformly across all recipe types

### 2. **Simplified Integration**
- Custom recipes seamlessly integrate with recipe search results
- No need for format conversion in the frontend
- Consistent field names reduce confusion and bugs

### 3. **Better Allergen Checking**
- Ingredients are properly formatted for ingredient-level allergen filtering
- Custom recipes now work with the same allergen checking logic as other recipes

### 4. **Backward Compatibility**
- Additional fields (e.g., `totalCalories`, `prepTimeMinutes`) are still included
- Existing functionality remains intact
- Frontend can gradually migrate to standard field names

## API Response Structure

### GET `/api/recipes/custom?page=1&limit=12`

```json
{
  "success": true,
  "data": [
    {
      "id": "recipe-id",
      "title": "Healthy Breakfast Bowl",
      "image": "https://example.com/image.jpg",
      "sourceUrl": "",
      "source": "manual",
      "readyInMinutes": 15,
      "servings": 2,
      "calories": 350,
      "protein": 20,
      "carbs": 40,
      "fat": 10,
      "fiber": 8,
      "healthLabels": ["vegan", "gluten-free"],
      "dietLabels": ["plant-based"],
      "cuisineType": ["american"],
      "dishType": ["breakfast"],
      "mealType": ["breakfast"],
      "allergens": [],
      "ingredients": [
        {
          "name": "oats",
          "food": "oats",
          "quantity": 0.5,
          "unit": "cup",
          "original": "0.5 cup oats",
          "nutrition": {...}
        }
      ],
      "isCustom": true,
      "createdBy": "nutritionist-id",
      "isPublic": true,
      "description": "A healthy breakfast bowl",
      "ingredientLines": ["0.5 cup oats", "1 cup almond milk"],
      "instructions": ["Mix ingredients", "Serve"],
      "totalCalories": 700,
      "totalProtein": 40,
      "createdAt": "2025-10-27T00:00:00.000Z",
      "updatedAt": "2025-10-27T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 12,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

## Testing

### Test the API
```bash
curl 'https://caloriescience-api.vercel.app/api/recipes/custom?page=1&limit=12' \
  -H 'authorization: Bearer YOUR_TOKEN'
```

### Verify Response Format
- ✅ `title` field exists (not `recipeName`)
- ✅ `image` field exists (not `recipeImageUrl`)
- ✅ `calories` is a number (not `caloriesPerServing`)
- ✅ `cuisineType`, `mealType`, `dishType` are arrays
- ✅ `isCustom` is `true`
- ✅ `source` is `"manual"`
- ✅ `ingredients` array has proper structure

## Migration Notes for Frontend

If the frontend was previously using the old field names, update references:
- `.recipeName` → `.title`
- `.recipeImageUrl` → `.image`
- `.caloriesPerServing` → `.calories`
- `.proteinPerServingG` → `.protein`
- `.carbsPerServingG` → `.carbs`
- `.fatPerServingG` → `.fat`

The old fields are still available for backward compatibility but should be migrated to use standard field names.

## Related Files
- `lib/customRecipeService.ts` - Service for managing custom recipes
- `types/customRecipe.ts` - Type definitions
- `api/recipes/custom.ts` - API endpoint handler
- `lib/multiProviderRecipeSearchService.ts` - Already uses correct format for custom recipes in search

## Status
✅ **COMPLETE** - Custom recipe API now returns recipes in the standard `UnifiedRecipeSummary` format consistent with all other recipe endpoints.

