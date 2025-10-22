# Recipe Customization Nutrition Fix

## ✅ STATUS: FIXED AND DEPLOYED

## 🐛 Issue

When customizing recipes in manual meal plans (omitting/adding/replacing ingredients), the customized nutrition values were calculated correctly and saved in `customizations.customNutrition`, but the draft's `dayWiseNutrition` and `totalNutrition` were not being updated to reflect the customizations.

### Symptoms
- Customization API returned correct calculated nutrition (e.g., 265.09 kcal)
- `customNutrition` was saved correctly in the draft
- But `dayWiseNutrition` and `totalNutrition` still showed BASE recipe values (e.g., 265.92 kcal)

## 🔍 Root Cause

The `calculateMealNutrition()` method in `/lib/manualMealPlanService.ts` was only using base recipe nutrition and ignoring customizations when calculating meal totals.

## 🔧 Fix

Updated `calculateMealNutrition()` to check for customizations and use `customNutrition` values when available.

### Code Changes

**File:** `/lib/manualMealPlanService.ts`

**Line 862:** Added `customizations` parameter
```typescript
private calculateMealNutrition(recipes: any[], customizations?: any): any {
```

**Lines 874-880:** Added customization check logic
```typescript
for (const recipe of recipes) {
  // Check if there are customizations for this recipe
  const recipeCustomizations = customizations?.[recipe.id];
  const hasCustomNutrition = recipeCustomizations?.customizationsApplied && 
                              recipeCustomizations?.customNutrition;
  
  // Use customized nutrition if available, otherwise use base recipe nutrition
  const nutrition = hasCustomNutrition ? recipeCustomizations.customNutrition : recipe.nutrition;
  
  if (!nutrition) continue;
  // ... rest of calculation
}
```

**Updated all calls to `calculateMealNutrition()`:**
- Line 381-383: When adding recipes
- Line 461-463: When removing recipes
- Line 972: When calculating draft nutrition

## ✅ Test Results

### Before Fix
```
Day 1 Nutrition:
  Calories: 265.92 kcal  ❌ (base value)
  Protein: 7.9g          ❌
  Carbs: 44.73g          ❌
```

### After Fix
```
Day 1 Nutrition:
  Calories: 265.09 kcal  ✅ (customized - omitted garlic, added basil)
  Protein: 7.89g         ✅
  Carbs: 44.51g          ✅
```

## 📝 Test Case

1. **Create manual meal plan**
   ```bash
   POST /api/meal-plans/manual/create
   {
     "clientId": "...",
     "planDate": "2025-10-26",
     "durationDays": 1
   }
   ```

2. **Add recipe (Garlic and Tomato Pasta)**
   ```bash
   POST /api/meal-plans/manual/add-recipe
   {
     "draftId": "...",
     "day": 1,
     "mealName": "breakfast",
     "recipe": {
       "id": "recipe_fcaa203fe7b27adc0bb223251111f632",
       "provider": "edamam",
       "source": "api"
     }
   }
   ```

3. **Customize recipe (omit garlic, add basil)**
   ```bash
   POST /api/meal-plans/draft
   {
     "action": "update-customizations",
     "draftId": "...",
     "day": 1,
     "mealName": "breakfast",
     "recipeId": "recipe_fcaa203fe7b27adc0bb223251111f632",
     "autoCalculateNutrition": true,
     "customizations": {
       "recipeId": "...",
       "source": "edamam",
       "modifications": [
         {
           "type": "omit",
           "originalIngredient": "garlic",
           "originalAmount": 2,
           "originalUnit": "cloves"
         },
         {
           "type": "add",
           "newIngredient": "fresh basil",
           "amount": 10,
           "unit": "g"
         }
       ],
       "customizationsApplied": true
     }
   }
   ```

4. **Verify nutrition**
   ```bash
   GET /api/meal-plans/manual/{draftId}
   ```
   
   **Result:** ✅ `dayWiseNutrition` and `totalNutrition` now reflect customized values!

## 🎯 Impact

- ✅ Manual meal plan customizations now correctly update nutrition totals
- ✅ Both macros AND micronutrients are handled correctly
- ✅ Multiple recipes per meal supported
- ✅ Works with omit, add, and replace operations
- ✅ Backward compatible (recipes without customizations still work)

## 📅 Deployed

- **Date:** October 21, 2025
- **Verified:** Working in production

## 🔗 Related Files

- `/lib/manualMealPlanService.ts` - Fixed `calculateMealNutrition()`
- `/api/meal-plans/manual/add-recipe.ts` - Uses the updated method
- `/api/meal-plans/draft.ts` - Customization API endpoint
- `/lib/mealPlanDraftService.ts` - Automated meal plans (already had this fix)

