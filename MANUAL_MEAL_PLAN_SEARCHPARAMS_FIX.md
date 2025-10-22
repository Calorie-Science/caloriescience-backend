# Manual Meal Plan - SearchParams Fix for Finalized Drafts

## 🐛 Issue

After finalizing a manual meal plan, `clientGoals` and `dietaryPreferences` were not appearing in the `searchParams` when fetching the draft via:
- `GET /api/meal-plans/manual/{draftId}` 
- `GET /api/meal-plans/drafts/{draftId}`

These fields were present **before** finalization but disappeared **after** finalization.

## 🔍 Root Cause

The code was using the `||` operator to fallback to database values:

```typescript
// OLD CODE (BUGGY)
clientGoals: searchParams.clientGoals || {
  calories: clientGoal?.eer_goal_calories || 0,
  ...
}
```

**Problem:** If `searchParams.clientGoals` was an **empty object** `{}`, the `||` operator would return the empty object instead of the fallback.

In JavaScript:
- `{} || fallback` returns `{}`
- `null || fallback` returns `fallback`
- `undefined || fallback` returns `fallback`

So if `search_params` in the database had `clientGoals: {}`, it would return an empty object instead of fetching from `client_goals` table.

## ✅ Solution

Changed to **always populate** `clientGoals` and `dietaryPreferences` from the database, regardless of what's in `search_params`:

```typescript
// NEW CODE (FIXED)
clientGoals: {
  calories: clientGoal?.eer_goal_calories || nutritionReq?.eer_calories || 0,
  protein: clientGoal?.protein_goal_min || nutritionReq?.protein_grams || 0,
  carbs: clientGoal?.carbs_goal_min || nutritionReq?.carbs_grams || 0,
  fat: clientGoal?.fat_goal_min || nutritionReq?.fat_grams || 0,
  fiber: clientGoal?.fiber_goal_grams || nutritionReq?.fiber_grams || 0
},
dietaryPreferences: {
  allergies: clientGoal?.allergies || [],
  cuisineTypes: clientGoal?.cuisine_types || [],
  dietaryPreferences: clientGoal?.preferences || []
}
```

Now these fields are **always fetched fresh** from the database when returning a draft (both draft and finalized status).

## 📝 Code Changes

### Change 1: Manual Meal Plan Service
**File:** `/lib/manualMealPlanService.ts`  
**Method:** `formatDraftResponse`  
**Lines:** 626-648

### Before:
```typescript
clientGoals: searchParams.clientGoals || { ... },
dietaryPreferences: searchParams.dietaryPreferences || { ... }
```

### After:
```typescript
// Always populate from database
clientGoals: { ... },
dietaryPreferences: { ... }
```

### Change 2: Unified Drafts API Endpoint
**File:** `/api/meal-plans/drafts/[id].ts`  
**Handler:** `handler` (after user access verification)  
**Lines:** 61-103

This endpoint is used by both automated and manual meal plans. Added logic to detect manual meal plans and enrich their `searchParams`:

```typescript
// For manual meal plans, enrich searchParams with clientGoals and dietaryPreferences
if (draft.searchParams && (draft.searchParams as any).creation_method === 'manual') {
  // Fetch client nutrition requirements
  const { data: nutritionReq } = await supabase
    .from('client_nutrition_requirements')
    .select('*')
    .eq('client_id', draft.clientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch client goals
  const { data: clientGoal } = await supabase
    .from('client_goals')
    .select('allergies, preferences, cuisine_types, eer_goal_calories, ...')
    .eq('client_id', draft.clientId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Always populate from database for manual plans
  draft.searchParams = {
    ...draft.searchParams,
    clientGoals: {
      calories: clientGoal?.eer_goal_calories || nutritionReq?.eer_calories || 0,
      protein: clientGoal?.protein_goal_min || nutritionReq?.protein_grams || 0,
      carbs: clientGoal?.carbs_goal_min || nutritionReq?.carbs_grams || 0,
      fat: clientGoal?.fat_goal_min || nutritionReq?.fat_grams || 0,
      fiber: clientGoal?.fiber_goal_grams || nutritionReq?.fiber_grams || 0
    },
    dietaryPreferences: {
      allergies: clientGoal?.allergies || [],
      cuisineTypes: clientGoal?.cuisine_types || [],
      dietaryPreferences: clientGoal?.preferences || []
    }
  };
}
```

## 🎯 Impact

### Before Fix:
```json
{
  "id": "manual-123-456",
  "status": "finalized",
  "searchParams": {
    "days": 7,
    "startDate": "2025-10-25",
    "clientGoals": {},
    "dietaryPreferences": {},
    "overrideMealProgram": { "meals": [...] }
  }
}
```

### After Fix:
```json
{
  "id": "manual-123-456",
  "status": "finalized",
  "searchParams": {
    "days": 7,
    "startDate": "2025-10-25",
    "clientGoals": {
      "calories": 2000,
      "protein": 150,
      "carbs": 200,
      "fat": 65,
      "fiber": 30
    },
    "dietaryPreferences": {
      "allergies": ["dairy", "peanuts"],
      "cuisineTypes": ["Indian", "Italian"],
      "dietaryPreferences": ["vegetarian"]
    },
    "overrideMealProgram": { "meals": [...] }
  }
}
```

## ✅ Benefits

1. **Consistent Data** - searchParams always has clientGoals and preferences
2. **Fresh Data** - Always reflects current client_goals table values
3. **Works for All States** - Both draft and finalized status
4. **Works on All Endpoints** - Both `/api/meal-plans/manual/[id]` and `/api/meal-plans/drafts/[id]`
5. **No Breaking Changes** - Still includes other searchParams fields if they exist
6. **No Impact on Automated Plans** - The change in drafts API only affects manual plans

## 📊 Test Case

### Before Finalization:
```bash
GET /api/meal-plans/manual/{draftId}
# Status: "draft"
# searchParams.clientGoals: ✅ Present
# searchParams.dietaryPreferences: ✅ Present
```

### After Finalization:
```bash
GET /api/meal-plans/manual/{draftId}
# Status: "finalized" 
# searchParams.clientGoals: ✅ Now Present (was missing before)
# searchParams.dietaryPreferences: ✅ Now Present (was missing before)
```

## 🔧 Why This Approach?

1. **Always Fresh** - Gets current client goals, not stale data from finalization time
2. **Simpler Logic** - No conditional fallbacks with `||` operator
3. **Prevents Empty Objects** - Can't return `{}` anymore
4. **Consistent with Automated Plans** - Automated meal plans always populate these
5. **Unified Experience** - Both API endpoints now return consistent data
6. **Performance** - Only fetches client goals when needed (manual plans only)

## 📅 Deployed

- **Date:** October 22, 2025
- **Status:** ✅ Fixed (Two-part fix)
- **Affects:** Manual meal plan drafts (both draft and finalized status)
- **Endpoints Fixed:**
  1. `/api/meal-plans/manual/[id]` - Fixed in `manualMealPlanService.ts`
  2. `/api/meal-plans/drafts/[id]` - Fixed in endpoint handler
  
## 🎯 Summary

This was a **two-part fix**:

1. **Part 1:** Fixed `formatDraftResponse` in `ManualMealPlanService` to always fetch fresh clientGoals/preferences instead of using `||` operator fallback.

2. **Part 2:** Fixed `/api/meal-plans/drafts/[id]` endpoint to detect manual meal plans and enrich their searchParams before returning the response.

Both fixes ensure that manual meal plan searchParams always include `clientGoals` and `dietaryPreferences`, regardless of finalization status.

## 🧪 Testing

To verify the fix, fetch a finalized manual meal plan:

```bash
curl 'https://caloriescience-api.vercel.app/api/meal-plans/drafts/{DRAFT_ID}' \
  -H "Authorization: Bearer YOUR_TOKEN" | jq '.data.searchParams'
```

Expected output should include:
```json
{
  "client_id": "...",
  "plan_date": "...",
  "duration_days": 1,
  "creation_method": "manual",
  "clientGoals": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 65,
    "fiber": 30
  },
  "dietaryPreferences": {
    "allergies": ["dairy", "peanuts"],
    "cuisineTypes": ["Indian"],
    "dietaryPreferences": ["vegetarian"]
  }
}
```

