# Nutrition Servings Field Rename

## Overview
Renamed `customizations.servings` to `customizations.nutritionServings` for clarity. This field represents the **portion size multiplier** for nutrition calculations, separate from the recipe's total servings (which ingredients are based on).

## Field Clarification

| Field | Purpose | Example |
|-------|---------|---------|
| `recipe.servings` | Total servings the recipe makes<br>**(Ingredients are for ALL these servings)** | Recipe makes **5 servings**<br>Ingredients: "2 cups rice" (for all 5) |
| `customizations.nutritionServings` | Portion size user wants to eat<br>**(Nutrition multiplier)** | User sets **2 servings**<br>Nutrition: 200 cal × 2 = 400 cal |

## Math Formula

**For ingredient changes with nutritionServings:**

```
nutritionImpact = ingredientDelta × (nutritionServings / recipeServings)
```

**Example:**
- Recipe: 5 servings, 2 cups rice → User sets nutritionServings = 2 → User changes rice to 3 cups
- Calculation:
  - Ingredient delta: (3 - 2) = +1 cup (for all 5 servings)
  - Per serving: 1 / 5 = 0.2 cups
  - For user's 2 portions: 0.2 × 2 = **0.4 cups** ✅

## Changes Made

### 1. API Schemas Updated
- ✅ `selectRecipeSchema` - Added `nutritionServings` (default: 1)
- ✅ `updateCustomizationsSchema` - Added `nutritionServings` (default: 1)
- ✅ `replaceIngredientSchema` - Added `nutritionServings` (default: 1)
- ✅ Kept `servings` as optional for **backward compatibility**

**Files:**
- `api/meal-plans/draft.ts` (Lines 44-45, 118-119)
- `api/ingredients/replace.ts` (Line 24-25)

### 2. Interface Updated
- ✅ `MealCustomization` interface - Added `nutritionServings?: number`
- ✅ Made `servings` optional (deprecated)

**File:**
- `lib/mealPlanDraftService.ts` (Lines 85-86)

### 3. Calculation Logic Updated
All places that read `customizations.servings` now:
- ✅ Read `nutritionServings` first
- ✅ Fallback to `servings` for backward compatibility
- ✅ Default to `1` if neither provided

**Files:**
- `lib/mealPlanDraftService.ts` (Lines 786, 1079)
- `api/meal-plans/draft.ts` (Line 1446)
- `api/recipes/customized.ts` (Line 792)
- `api/ingredients/replace.ts` (Line 76)

### 4. API Responses Updated
All endpoints now return `nutritionServings` in customizations:

**Endpoints:**
- ✅ `POST /api/meal-plans/draft` (action: update-customizations)
  - Returns: `customizations.nutritionServings`
- ✅ `GET /api/meal-plans/drafts/[id]`
  - Returns: `nutritionServings` in meal details
- ✅ `POST /api/ingredients/replace`
  - Stores: `customizations.nutritionServings`

## Backward Compatibility

✅ **Both fields accepted:**
- API accepts both `servings` and `nutritionServings`
- If `nutritionServings` provided, uses that
- If only `servings` provided, normalizes to `nutritionServings`
- Response always includes `nutritionServings`

**Migration:**
- Existing drafts with `servings` will continue to work
- Next time customizations updated, automatically normalized to `nutritionServings`

## How It Works

### Example Flow:

1. **Recipe added to meal plan:**
   ```json
   {
     "recipe": {
       "servings": 5,  // Recipe makes 5 servings
       "ingredients": [
         { "text": "2 cups rice" }  // For all 5 servings
       ],
       "nutrition": {
         "calories": 200  // Per 1 serving
       }
     }
   }
   ```

2. **User updates nutritionServings:**
   ```json
   POST /api/meal-plans/draft
   {
     "action": "update-customizations",
     "customizations": {
       "nutritionServings": 2  // Want 2 portions
     }
   }
   ```

3. **Nutrition automatically multiplied:**
   - Base: 200 cal/serving
   - Final: 200 × 2 = **400 cal** ✅

4. **User changes ingredient:**
   ```json
   {
     "modifications": [
       {
         "type": "replace",
         "originalIngredient": "rice",
         "originalAmount": 2,
         "newIngredient": "rice",
         "newAmount": 3
       }
     ]
   }
   ```

5. **Nutrition calculation:**
   - Ingredient change: +1 cup rice (for all 5 servings)
   - Per serving: +20 cal (1 cup / 5 servings)
   - For 2 portions: +40 cal (20 × 2)
   - **Final: 400 + 40 = 440 cal** ✅

## API Usage

### Update nutritionServings:
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "update-customizations",
    "draftId": "YOUR_DRAFT_ID",
    "day": 1,
    "mealName": "lunch",
    "recipeId": "chicken-biryani",
    "customizations": {
      "recipeId": "chicken-biryani",
      "source": "edamam",
      "modifications": [],
      "nutritionServings": 2  // ✅ Use this field!
    }
  }'
```

### Response includes nutritionServings:
```json
{
  "success": true,
  "data": {
    "customizations": {
      "nutritionServings": 2,  // ✅ Always present
      "appliedServings": 5,     // Recipe servings (for ingredients)
      "modifications": []
    }
  }
}
```

## Testing

Test the complete flow:

1. **Create draft with recipe (5 servings)**
2. **Set nutritionServings = 2**
3. **Verify nutrition multiplied:**
   - Base: 200 cal/serving
   - Expected: 400 cal total ✅

4. **Change ingredient (rice 2→3 cups)**
5. **Verify nutrition calculated correctly:**
   - Change: +1 cup for all 5 servings
   - Per serving: +20 cal
   - For 2 portions: +40 cal
   - Final: 440 cal ✅

## Files Changed

| File | Changes |
|------|---------|
| `api/meal-plans/draft.ts` | Schema + normalization + response |
| `api/meal-plans/drafts/[id].ts` | Response includes nutritionServings |
| `api/ingredients/replace.ts` | Schema + normalization + storage |
| `api/recipes/customized.ts` | Uses nutritionServings |
| `lib/mealPlanDraftService.ts` | Interface + calculations |

## Summary

✅ **Renamed field:** `servings` → `nutritionServings`  
✅ **Backward compatible:** Still accepts `servings`, normalizes to `nutritionServings`  
✅ **All responses updated:** Show `nutritionServings` field  
✅ **Math correct:** Ingredient changes scale by `nutritionServings/recipeServings` ratio  
✅ **Clear distinction:** Recipe servings (ingredients) vs Nutrition servings (multiplier)  

---

**Date:** January 29, 2025  
**Status:** ✅ Complete

