# Client Goals Macro Values Fix

## Issue
When calling the client GET API endpoint (`/api/clients/[id]`), the response includes `clientGoal` data with macro fields like `proteinGoalMin`, `proteinGoalMax`, `carbsGoalMin`, etc. from the `client_goals` table.

However, when generating meal plans (both automated and manual) and creating drafts, the macro values in the draft's `searchParams.clientGoals` were showing as 0, even though the client had proper goal values set in the `client_goals` table.

## Root Cause
In both the automated meal plan generation code (`api/meal-plans/generate.ts`) and manual meal plan service (`lib/manualMealPlanService.ts`), the code was:
1. **Only fetching** `allergies, preferences, cuisine_types` from the `client_goals` table
2. **Not fetching** the macro goal fields: `eer_goal_calories`, `protein_goal_min`, `protein_goal_max`, `carbs_goal_min`, `carbs_goal_max`, `fat_goal_min`, `fat_goal_max`, `fiber_goal_grams`
3. Using values from the `client_nutrition_requirements` table instead, which could be null or 0

This meant that the `clientGoals` object used in draft generation was constructed from `client_nutrition_requirements` rather than from the actual `client_goals` table.

## Solution

### 1. Automated Meal Plans
Updated the `getClientData` function in `api/meal-plans/generate.ts` to:

#### a) Fetch macro goal fields from client_goals table
Changed the SELECT statement from:
```typescript
.select('allergies, preferences, cuisine_types')
```

To:
```typescript
.select('allergies, preferences, cuisine_types, eer_goal_calories, protein_goal_min, protein_goal_max, carbs_goal_min, carbs_goal_max, fat_goal_min, fat_goal_max, fiber_goal_grams')
```

#### b) Use client_goals values with proper fallback chain
Updated the `clientGoals` object construction to prioritize values from `client_goals` table:

**Before:**
```typescript
const clientGoals: ClientGoals = {
  calories: overrideClientGoals?.eerGoalCalories || nutritionReq?.eer_calories || 2000,
  protein: overrideClientGoals?.proteinGoalMin || nutritionReq?.protein_grams || 150,
  carbs: overrideClientGoals?.carbsGoalMin || nutritionReq?.carbs_grams || 250,
  fat: overrideClientGoals?.fatGoalMin || nutritionReq?.fat_grams || 65,
  fiber: nutritionReq?.fiber_grams || 25
};
```

**After:**
```typescript
const clientGoals: ClientGoals = {
  calories: overrideClientGoals?.eerGoalCalories || clientGoal?.eer_goal_calories || nutritionReq?.eer_calories || 2000,
  protein: overrideClientGoals?.proteinGoalMin || clientGoal?.protein_goal_min || nutritionReq?.protein_grams || 150,
  carbs: overrideClientGoals?.carbsGoalMin || clientGoal?.carbs_goal_min || nutritionReq?.carbs_grams || 250,
  fat: overrideClientGoals?.fatGoalMin || clientGoal?.fat_goal_min || nutritionReq?.fat_grams || 65,
  fiber: clientGoal?.fiber_goal_grams || nutritionReq?.fiber_grams || 25
};
```

#### c) Updated logging
Changed the console log to reflect the new priority order:
```typescript
console.log('🔍 Client goals (priority: override → client_goals → nutritional_requirements → defaults):', {
  calories: clientGoals.calories,
  protein: clientGoals.protein,
  carbs: clientGoals.carbs,
  fat: clientGoals.fat,
  fiber: clientGoals.fiber,
  source: overrideClientGoals ? 'override' : (clientGoal ? 'client_goals' : (nutritionReq ? 'nutritional_requirements' : 'default_values'))
});
```

### 2. Manual Meal Plans
Updated the `formatDraftResponse` method in `lib/manualMealPlanService.ts` to:

#### a) Fetch macro goal fields from client_goals table
Changed the SELECT statement from:
```typescript
.select('allergies, preferences, cuisine_types')
```

To:
```typescript
.select('allergies, preferences, cuisine_types, eer_goal_calories, protein_goal_min, protein_goal_max, carbs_goal_min, carbs_goal_max, fat_goal_min, fat_goal_max, fiber_goal_grams')
```

#### b) Use client_goals values with proper fallback chain
Updated the `clientGoals` object in `enrichedSearchParams`:

**Before:**
```typescript
clientGoals: searchParams.clientGoals || {
  calories: nutritionReq?.eer_calories || 0,
  protein: nutritionReq?.protein_grams || 0,
  carbs: nutritionReq?.carbs_grams || 0,
  fat: nutritionReq?.fat_grams || 0,
  fiber: nutritionReq?.fiber_grams || 0
}
```

**After:**
```typescript
clientGoals: searchParams.clientGoals || {
  calories: clientGoal?.eer_goal_calories || nutritionReq?.eer_calories || 0,
  protein: clientGoal?.protein_goal_min || nutritionReq?.protein_grams || 0,
  carbs: clientGoal?.carbs_goal_min || nutritionReq?.carbs_grams || 0,
  fat: clientGoal?.fat_goal_min || nutritionReq?.fat_grams || 0,
  fiber: clientGoal?.fiber_goal_grams || nutritionReq?.fiber_grams || 0
}
```

## Impact
- ✅ **Both automated and manual** meal plan drafts now correctly use macro values from `client_goals` table
- ✅ Draft `searchParams.clientGoals` will show the correct macro values instead of 0
- ✅ Fallback chain ensures graceful degradation: client_goals → nutritional_requirements → defaults
- ✅ Better alignment between client goal setting and meal plan generation
- ✅ Consistency between automated and manual meal planning workflows

## Testing
To verify the fix:

### For Automated Meal Plans:
1. Set client goals via the client goals API with specific macro ranges
2. Generate an automated meal plan for that client using `/api/meal-plans/generate`
3. Check the draft's `searchParams.clientGoals` - it should now show the correct macro values from the `client_goals` table

### For Manual Meal Plans:
1. Set client goals via the client goals API with specific macro ranges
2. Create a manual meal plan draft using `/api/meal-plans/manual/create`
3. Fetch the draft using `/api/meal-plans/manual/[id]`
4. Check the draft's `searchParams.clientGoals` - it should now show the correct macro values from the `client_goals` table

## Related Files
- `/api/meal-plans/generate.ts` - Automated meal plan generation fix
- `/lib/manualMealPlanService.ts` - Manual meal plan service fix
- `/types/clientGoals.ts` - Type definitions for client goals
- `/lib/clientGoalsService.ts` - Service for managing client goals

## Date
October 21, 2025

