# Custom Recipe Cuisine Filter Fix

## Problem
Custom recipes without cuisine tags (e.g., `cuisineTypes: []`) were being **filtered out** when searching with cuisine type filters, even though they were created by the user.

### User Experience
1. User creates custom recipe "azd" without setting cuisine types
2. User searches with `cuisineType=indian,asian,british`
3. Recipe "azd" doesn't appear in results ❌
4. User is confused - they just created it!

### Technical Details
**Recipe**: "azd"
- `id`: badf1ae4-8248-4e58-b6a5-2fc27f7b6c51
- `cuisineTypes`: [] (empty array)
- `isPublic`: false
- `source`: manual

**Search Query**: `?query=azd&cuisineType=indian,asian,british`

**Database Query** (before fix):
```typescript
query = query.overlaps('cuisine_types', ['indian', 'asian', 'british']);
```

**Result**: Empty array `[]` doesn't overlap with `['indian', 'asian', 'british']` → Recipe excluded ❌

## Root Cause

The `.overlaps()` operator in Supabase/PostgreSQL requires **at least one matching value** between arrays:
- `['indian', 'chinese'].overlaps(['indian', 'asian'])` → ✅ true (has 'indian')
- `[].overlaps(['indian', 'asian'])` → ❌ false (no overlap)

This is correct for filtering, but **too strict** for custom recipes that haven't been categorized yet.

## Solution

**File**: `lib/multiProviderRecipeSearchService.ts` (Lines 656-749)

Changed from **database-level filtering** to **JavaScript post-filtering**:

### Before (Database Query)
```typescript
// Cuisine types filter
if (params.cuisineType && params.cuisineType.length > 0) {
  query = query.overlaps('cuisine_types', params.cuisineType);
  // ❌ Excludes recipes with empty arrays
}
```

### After (Post-Filter)
```typescript
// Step 1: Fetch ALL custom recipes matching other criteria (name, health labels, etc.)
// Do NOT apply cuisine/meal/dish filters in DB query

const applyCuisineFilter = params.cuisineType && params.cuisineType.length > 0;

// Step 2: Post-filter in JavaScript
if (applyCuisineFilter) {
  filteredRecipes = filteredRecipes.filter(recipe => {
    // Include if: has matching cuisine OR has no cuisine types set
    const hasCuisineTypes = recipe.cuisineType && recipe.cuisineType.length > 0;
    if (!hasCuisineTypes) return true; // ✅ Include uncategorized recipes
    return recipe.cuisineType.some(c => params.cuisineType!.includes(c));
  });
}
```

## How It Works

### Scenario 1: Recipe With Cuisine Tags
```
Recipe: "Chicken Tikka Masala"
cuisineTypes: ["indian"]

Search: cuisineType=indian,asian
Result: ✅ Included (matches 'indian')
```

### Scenario 2: Recipe Without Cuisine Tags (FIXED)
```
Recipe: "azd"
cuisineTypes: []

Search: cuisineType=indian,asian
Result: ✅ Included (has no tags, so not filtered out)
```

### Scenario 3: Recipe With Non-Matching Tags
```
Recipe: "Tacos"
cuisineTypes: ["mexican"]

Search: cuisineType=indian,asian
Result: ❌ Excluded (no overlap)
```

## Benefits

1. ✅ **Newly created recipes appear immediately** - Even without categorization
2. ✅ **Flexible workflow** - Users can create recipes quickly and add tags later
3. ✅ **Better UX** - Users don't wonder why their recipe disappeared
4. ✅ **Still filters** - Recipes with tags are still filtered by cuisine

## Applied to All Tag Types

The same post-filtering logic is applied to:
- **Cuisine Types** - Indian, Asian, British, etc.
- **Meal Types** - Breakfast, Lunch, Dinner, etc.
- **Dish Types** - Main course, Side dish, Dessert, etc.

All of these now **include recipes with empty tags**.

## Testing

### Test Case 1: Recipe Without Tags
```bash
# 1. Create recipe without cuisine tags
POST /api/recipes/custom
{
  "recipeName": "My Test Recipe",
  "cuisineTypes": [],  // Empty
  ...
}

# 2. Search with cuisine filter
GET /api/recipe-search-client?query=test&cuisineType=indian,asian

# Result: ✅ Recipe appears in results!
```

### Test Case 2: Recipe With Matching Tags
```bash
# 1. Create recipe with cuisine tags
POST /api/recipes/custom
{
  "recipeName": "Curry",
  "cuisineTypes": ["indian"],
  ...
}

# 2. Search with cuisine filter
GET /api/recipe-search-client?query=curry&cuisineType=indian,asian

# Result: ✅ Recipe appears (matches 'indian')
```

### Test Case 3: Recipe With Non-Matching Tags
```bash
# 1. Create recipe with different cuisine
POST /api/recipes/custom
{
  "recipeName": "Tacos",
  "cuisineTypes": ["mexican"],
  ...
}

# 2. Search with cuisine filter
GET /api/recipe-search-client?query=tacos&cuisineType=indian,asian

# Result: ❌ Recipe excluded (no overlap)
```

## Impact

After this fix, custom recipes will appear in search results when:
1. ✅ They match the search query
2. ✅ They match health/allergen filters (if any)
3. ✅ They match cuisine/meal/dish types **OR have empty tags**

This makes the search behavior more intuitive and user-friendly!

## Files Changed

- ✅ `lib/multiProviderRecipeSearchService.ts` - Lines 656-749

## Related Issues

This also fixes the same issue for:
- Meal type filters (`mealType=breakfast,lunch`)
- Dish type filters (`dishType=main-course,dessert`)

All now include recipes with empty tag arrays.

