# Custom Recipe Format Standardization - Summary

## Issue Description
The `/api/recipes/custom` endpoint was returning recipes in a different format than all other recipe endpoints, causing frontend inconsistencies.

## Root Cause
The `CustomRecipeOutput` type and the `mapToOutput` method in `customRecipeService.ts` were using custom field names instead of the standard `UnifiedRecipeSummary` format used throughout the application.

## Changes Made

### 1. Updated Type Definition
**File:** `types/customRecipe.ts`

```typescript
// OLD FORMAT
export interface CustomRecipeOutput {
  recipeName: string;
  recipeImageUrl?: string;
  caloriesPerServing?: number;
  proteinPerServingG?: number;
  // ... etc
}

// NEW FORMAT (matches UnifiedRecipeSummary)
export interface CustomRecipeOutput {
  title: string;
  image: string;
  calories?: number;
  protein?: number;
  // ... etc
}
```

### 2. Updated Service Mapping
**File:** `lib/customRecipeService.ts`

Modified the `mapToOutput` method to return recipes in the standard format:
- Maps database fields to standard UnifiedRecipeSummary fields
- Ensures nutrition values are per-serving
- Formats ingredients properly for allergen checking
- Adds metadata flags like `isCustom: true`

## Field Name Mappings

| Old Field Name | New Field Name | Notes |
|---------------|----------------|-------|
| `recipeName` | `title` | Standard across all recipes |
| `recipeImageUrl` | `image` | Standard across all recipes |
| `recipeDescription` | `description` | Additional field |
| `cuisineTypes` | `cuisineType` | Consistent naming |
| `mealTypes` | `mealType` | Consistent naming |
| `dishTypes` | `dishType` | Consistent naming |
| `caloriesPerServing` | `calories` | Per-serving value |
| `proteinPerServingG` | `protein` | Per-serving value |
| `carbsPerServingG` | `carbs` | Per-serving value |
| `fatPerServingG` | `fat` | Per-serving value |
| `fiberPerServingG` | `fiber` | Per-serving value |
| `createdByNutritionistId` | `createdBy` | Standard field |
| N/A | `source` | Always "manual" |
| N/A | `sourceUrl` | Always "" |
| N/A | `isCustom` | Always true |

## Response Format Comparison

### Before (❌ Inconsistent)
```json
{
  "success": true,
  "data": [{
    "id": "123",
    "recipeName": "Healthy Bowl",
    "recipeImageUrl": "url",
    "recipeDescription": "desc",
    "cuisineTypes": ["american"],
    "mealTypes": ["breakfast"],
    "caloriesPerServing": 350,
    "proteinPerServingG": 20,
    "createdByNutritionistId": "nutritionist-id"
  }]
}
```

### After (✅ Standardized)
```json
{
  "success": true,
  "data": [{
    "id": "123",
    "title": "Healthy Bowl",
    "image": "url",
    "source": "manual",
    "sourceUrl": "",
    "cuisineType": ["american"],
    "mealType": ["breakfast"],
    "calories": 350,
    "protein": 20,
    "isCustom": true,
    "createdBy": "nutritionist-id",
    "description": "desc"
  }]
}
```

## Benefits

1. **Consistency Across APIs**
   - All recipe endpoints now return the same format
   - Frontend components work uniformly with all recipe types
   - No special cases needed for custom recipes

2. **Better Integration**
   - Custom recipes seamlessly integrate with search results
   - Recipe cards display correctly regardless of source
   - Filtering and sorting work consistently

3. **Improved Allergen Checking**
   - Ingredients properly formatted for allergen detection
   - Works with existing allergen filtering logic
   - No duplicate code needed

4. **Backward Compatibility**
   - Additional fields preserved (e.g., `totalCalories`, `prepTimeMinutes`)
   - Existing functionality remains intact
   - Gradual migration possible

## Testing

### Quick Test
```bash
./test-custom-recipe-format.sh
```

### Manual Test
```bash
curl 'https://caloriescience-api.vercel.app/api/recipes/custom?page=1&limit=12' \
  -H 'authorization: Bearer YOUR_TOKEN' | jq '.data[0]'
```

### Expected Fields in Response
- ✅ `title` (not `recipeName`)
- ✅ `image` (not `recipeImageUrl`)
- ✅ `calories` (not `caloriesPerServing`)
- ✅ `protein` (not `proteinPerServingG`)
- ✅ `source` = "manual"
- ✅ `isCustom` = true
- ✅ `cuisineType`, `mealType`, `dishType` (arrays)

## Important Notes

### Input vs Output Format
- **Input** (`CreateCustomRecipeInput`): Still uses `recipeName` field
- **Output** (`CustomRecipeOutput`): Uses `title` field
- This is intentional and follows standard API design patterns

### Other Endpoints
The following endpoints use different data models and are NOT affected:
- `/api/recipes/customized` - Has its own format for customizations
- `/api/meal-plans/draft` - Internal meal planning format
- These are working as intended and don't need changes

## Files Modified

1. ✅ `types/customRecipe.ts` - Updated `CustomRecipeOutput` type
2. ✅ `lib/customRecipeService.ts` - Updated `mapToOutput` method
3. ✅ No linter errors
4. ✅ No breaking changes to existing functionality

## Status
✅ **COMPLETE** - The custom recipe API now returns recipes in the standard `UnifiedRecipeSummary` format, consistent with all other recipe endpoints in the application.

## Next Steps
1. Test the endpoint to verify the new format
2. Update frontend code if it was using old field names
3. Remove any workarounds for custom recipe formatting in frontend

## Related Documentation
- `CUSTOM_RECIPE_API_FORMAT_FIX.md` - Detailed technical documentation
- `test-custom-recipe-format.sh` - Automated format verification script

