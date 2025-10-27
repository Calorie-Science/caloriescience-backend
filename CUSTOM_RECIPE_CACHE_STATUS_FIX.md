# Custom Recipe cache_status NULL Fix

## Critical Issue Found

Custom recipes with `cache_status = NULL` are being **filtered out** of search results because the search query requires `cache_status = 'active'`.

### User's Recipe
```json
{
  "id": "d47f2b79-ccc9-406d-aaa9-3afbda14941c",
  "title": "azdd",
  "provider": "manual",
  "isPublic": true,
  "cache_status": null,  // ❌ NULL instead of 'active'
  "createdBy": "fcf88e44-db97-494d-9a49-8cc91e716734"
}
```

### Search Query
```typescript
query = supabase
  .from('cached_recipes')
  .eq('provider', 'manual')
  .eq('cache_status', 'active');  // ❌ Excludes NULL values
```

### Result
Recipe is excluded from search results even though it matches all other criteria.

## Root Cause

Custom recipes can have `cache_status = NULL` if:
1. Created before `cache_status` column was added
2. Created with older version of code
3. Column default value not set in database schema

The search code filters for `cache_status = 'active'` which excludes NULL values.

## Solution (2 Parts)

### Part 1: Update Search Queries to Include NULL

**Files Fixed**:
- `lib/multiProviderRecipeSearchService.ts` (Line 641-642)
- `lib/customRecipeService.ts` (Line 272-273)

**Change**:
```typescript
// Before
.eq('cache_status', 'active')

// After
.in('cache_status', ['active', null] as any)
```

This includes recipes where cache_status is **either 'active' OR NULL**.

### Part 2: Migration to Update Existing Recipes

Create migration to set `cache_status = 'active'` for all manual recipes that have NULL:

**File**: `database/migrations/071_fix_manual_recipe_cache_status.sql`

```sql
-- Fix cache_status for existing manual recipes
-- Set cache_status to 'active' for manual recipes that have NULL

UPDATE cached_recipes
SET cache_status = 'active',
    updated_at = NOW()
WHERE provider = 'manual'
  AND cache_status IS NULL;

-- Add default value for future inserts (if not already set)
ALTER TABLE cached_recipes
ALTER COLUMN cache_status SET DEFAULT 'active';
```

## Testing

### Before Fix
```bash
# Search for custom recipe
GET /api/recipe-search-client?query=azdd
Response: { recipes: [], customRecipes: [] }  # ❌ Empty
```

### After Fix (Code Only)
```bash
# Search for custom recipe
GET /api/recipe-search-client?query=azdd
Response: { recipes: [...], customRecipes: [...] }  # ✅ Found!
```

### After Fix (Code + Migration)
```bash
# All custom recipes have cache_status='active'
# Query is simpler and more efficient
```

## Impact

### Immediate (Code Fix)
- ✅ Recipes with NULL cache_status now appear in search
- ✅ Backward compatible with older recipes
- ✅ No data loss

### Long Term (After Migration)
- ✅ All recipes have consistent cache_status
- ✅ Future recipes automatically get 'active' (default value)
- ✅ Simpler queries (can use .eq() instead of .in())

## Files Changed

- ✅ `lib/multiProviderRecipeSearchService.ts` - Line 641-642
- ✅ `lib/customRecipeService.ts` - Line 272-273
- ✅ `database/migrations/071_fix_manual_recipe_cache_status.sql` - New migration

## Why This Bug Existed

The `cache_status` column was likely added later to support:
- `'active'` - Searchable recipes
- `'expired'` - Old cached recipes to clean up
- `'invalid'` - Failed/corrupted recipes

But custom recipes created before this system or with older code have `NULL`, which should be treated as `'active'` for backward compatibility.

## Related Code

The custom recipe creation service (lib/customRecipeService.ts) **does set** `cache_status: 'active'` when creating NEW recipes:

```typescript
cache_status: 'active'  // Line 110
```

So this issue only affects **existing** recipes created before this field was properly managed.

