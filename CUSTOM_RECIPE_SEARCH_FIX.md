# Custom Recipe Search Fix

## Problem
Custom/manual recipes created by nutritionists were not appearing in recipe search results when using the `/api/recipe-search-client` endpoint (which is what the frontend uses for client meal planning).

## Root Cause

The `/api/recipe-search-client` endpoint builds search parameters but **did not include** the `includeCustom: true` flag.

**File**: `api/recipe-search-client.ts` (Line 96-105)

**Before:**
```typescript
const searchParams: ClientAwareSearchParams = {
  clientId: clientId as string,
  query: query as string,
  searchType: searchType as 'broad' | 'name' | 'ingredient',
  maxResults: parseInt(maxResults as string) || 20,
  provider: (provider as any) || 'both',
  diet: parseCsvParam(diet),
  cuisineType: parseCsvParam(cuisineType)
  // ❌ Missing: includeCustom: true
};
```

Without this flag, the `multiProviderService.searchRecipes()` method would skip searching custom recipes from the `cached_recipes` table.

## Solution

**File**: `api/recipe-search-client.ts` (Line 105)

**After:**
```typescript
const searchParams: ClientAwareSearchParams = {
  clientId: clientId as string,
  query: query as string,
  searchType: searchType as 'broad' | 'name' | 'ingredient',
  maxResults: parseInt(maxResults as string) || 20,
  provider: (provider as any) || 'both',
  diet: parseCsvParam(diet),
  cuisineType: parseCsvParam(cuisineType),
  includeCustom: true // ✅ Include custom recipes in search results
};
```

## How Custom Recipe Search Works

### 1. Custom Recipe Storage
Custom recipes are stored in `cached_recipes` table with:
- `provider = 'manual'`
- `created_by_nutritionist_id` = creator's ID
- `is_public` = true (searchable by all) or false (only creator)

### 2. Search Flow
```
User searches "smoothie" →
recipe-search-client API →
multiProviderService.searchRecipesForClient() →
  searchRecipes(params, userId) →
    If includeCustom === true:
      searchCustomRecipes(params, userId) →
        Query cached_recipes WHERE:
          - provider = 'manual'
          - (created_by_nutritionist_id = userId OR is_public = true)
          - recipe_name ILIKE '%smoothie%'
```

### 3. Access Control
- **Public recipes** (`is_public = true`): Visible to all nutritionists
- **Private recipes** (`is_public = false`): Only visible to creator

### 4. Search Results Order
Custom recipes are **mixed with** external API recipes:
```javascript
// From lib/multiProviderRecipeSearchService.ts
if (includeCustom && userId) {
  const customResults = await this.searchCustomRecipes(params, userId);
  results.recipes = [...customResults.recipes, ...results.recipes];
  // Custom recipes appear FIRST in results
}
```

## Testing

### 1. Create a Custom Recipe
```bash
curl -X POST https://caloriescience-api.vercel.app/api/recipes/custom \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "My Protein Smoothie",
    "servings": 2,
    "isPublic": true,
    "ingredients": [
      {
        "ingredientName": "banana",
        "quantity": 1,
        "unit": "medium"
      }
    ],
    "instructions": ["Blend and serve"]
  }'
```

### 2. Search for the Custom Recipe
```bash
# This should now return your custom recipe!
curl "https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=CLIENT_ID&query=smoothie" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Expected result:**
```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "uuid-of-custom-recipe",
        "title": "My Protein Smoothie",
        "source": "manual",
        "isCustom": true,
        "calories": 105,
        ...
      },
      ... other recipes from Spoonacular/Edamam ...
    ]
  }
}
```

## API Endpoints

### For Nutritionists (General Search)
```
GET /api/recipe-search?query=smoothie&includeCustom=true
```
- Already working (had `includeCustom` parameter with default 'true')
- Returns: External recipes + custom recipes

### For Client Meal Planning (Client-Aware Search)  
```
GET /api/recipe-search-client?clientId=X&query=smoothie
```
- **NOW FIXED** (added `includeCustom: true`)
- Returns: External recipes + custom recipes + simple ingredients
- Automatically filters by client allergens

### For Custom Recipes Only
```
GET /api/recipes/custom?search=smoothie
```
- Returns only custom recipes created by user or public ones
- Supports detailed filtering by health labels, cuisine, calories, etc.

## Comparison: Recipe Search Endpoints

| Endpoint | Purpose | Includes Custom | Includes Simple Ingredients |
|----------|---------|-----------------|---------------------------|
| `/api/recipe-search` | General recipe search | ✅ Yes (if includeCustom=true) | ✅ Yes (always) |
| `/api/recipe-search-client` | Client-aware search with allergen filtering | ✅ **NOW FIXED** | ✅ Yes (always) |
| `/api/recipes/custom` | Custom recipes only | ✅ Yes (only custom) | ❌ No |

## Impact

After this fix:
- ✅ Custom recipes appear in client meal plan recipe search
- ✅ Nutritionists can find their own custom recipes when planning meals
- ✅ Public custom recipes are shared across nutritionists
- ✅ Private custom recipes remain private to creator

## Related Documentation

- `CUSTOM_RECIPE_CREATION.md` - How to create custom recipes
- `MANUAL_RECIPE_MANAGEMENT_API.md` - Custom recipe API documentation
- `RECIPE_SEARCH_CLIENT_API.md` - Client-aware search API

## Additional Fix: Cuisine Type Filter Issue

### Problem
Even with `includeCustom: true`, custom recipes with **empty cuisine types** were being filtered out when searching with cuisine filters (e.g., `cuisineType=indian,asian,british`).

**Example**: Recipe "azd" has `cuisineTypes: []` (empty), but search with `cuisineType=indian` would exclude it.

### Root Cause
The database query used `.overlaps()` which requires at least one matching value:
```typescript
query = query.overlaps('cuisine_types', params.cuisineType);
```

Empty arrays don't overlap with anything, so recipes without cuisine tags were excluded.

### Solution
**File**: `lib/multiProviderRecipeSearchService.ts` (Lines 656-749)

Changed to **post-filter in JavaScript** instead of database query:
```typescript
// Skip cuisine/meal/dish filters in DB query (would exclude empty arrays)
const applyCuisineFilter = params.cuisineType && params.cuisineType.length > 0;

// After fetching from DB, post-filter:
if (applyCuisineFilter) {
  filteredRecipes = filteredRecipes.filter(recipe => {
    // Include if: has matching cuisine OR has no cuisine types set
    const hasCuisineTypes = recipe.cuisineType && recipe.cuisineType.length > 0;
    if (!hasCuisineTypes) return true; // ✅ Include recipes without tags
    return recipe.cuisineType.some(c => params.cuisineType!.includes(c));
  });
}
```

**Benefits**:
- ✅ Recipes with matching cuisine types are included
- ✅ Recipes without cuisine types are also included (not yet categorized)
- ✅ Users can create recipes quickly and categorize later

## Files Changed

- ✅ `api/recipe-search-client.ts` - Line 105: Added `includeCustom: true`
- ✅ `lib/multiProviderRecipeSearchService.ts` - Lines 656-749: Post-filter for cuisine/meal/dish types

## Deployment

Deploy these fixes and custom recipes will appear in search results regardless of whether they have cuisine tags set!

