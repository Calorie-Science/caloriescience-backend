# Micronutrient Tracking - Deployment Fix

## What Was Fixed

### Issue
The `update-customizations` action was passing **simplified nutrition** (only macros) to the ingredient customization service, which meant micronutrients couldn't be tracked even though the service supported them.

### Solution
Updated `handleUpdateCustomizations` in `api/meal-plans/draft.ts` to:
1. ✅ Fetch **complete recipe nutrition** from cache (includes all micronutrients)
2. ✅ Pass full `StandardizedNutrition` object to customization service
3. ✅ Log micronutrient availability at each step

## Files Changed

1. `/Users/mrinal/caloriescience-app/lib/nutritionMappingService.ts` - NEW
2. `/Users/mrinal/caloriescience-app/lib/ingredientCustomizationService.ts` - UPDATED
3. `/Users/mrinal/caloriescience-app/api/meal-plans/draft.ts` - UPDATED
4. `/Users/mrinal/caloriescience-app/api/recipes/customized.ts` - UPDATED

## Deploy Command

```bash
git add .
git commit -m "fix: Pass complete nutrition with micronutrients to ingredient customization service"
git push
```

## Test Commands After Deployment

### Step 1: Add Ingredient (Spinach - High in Vitamin K, Iron, Folate)

```bash
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1OTkwMDcxMywiZXhwIjoxNzYwNTA1NTEzfQ.iRjDibSvaVEmgEsAR7ctW0Ee7Gs5bPKlzARzg9Ou3KU" \
  -d '{
    "action": "update-customizations",
    "draftId": "draft_1759901215603_y0wlhepbn",
    "day": 1,
    "mealName": "dinner",
    "recipeId": "641110",
    "autoCalculateNutrition": true,
    "customizations": {
      "recipeId": "641110",
      "source": "spoonacular",
      "modifications": [
        {
          "type": "add",
          "newIngredient": "spinach 100g"
        }
      ],
      "customizationsApplied": true
    }
  }'
```

**Expected Result:**
- ✅ Vitamin K should INCREASE dramatically (~483µg from spinach)
- ✅ Iron should increase (~2.7mg from spinach)
- ✅ Folate should increase (~194µg from spinach)
- ✅ Calories increase by ~23 kcal

### Step 2: Verify Micronutrients Were Added

```bash
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1OTkwMDcxMywiZXhwIjoxNzYwNTA1NTEzfQ.iRjDibSvaVEmgEsAR7ctW0Ee7Gs5bPKlzARzg9Ou3KU" \
  -d '{
    "action": "get-draft",
    "draftId": "draft_1759901215603_y0wlhepbn"
  }' | jq '.data.suggestions[0].meals.dinner.customizations["641110"].customNutrition | {
    calories: .calories.quantity,
    protein: .macros.protein.quantity,
    vitaminK: .micros.vitamins.vitaminK.quantity,
    vitaminC: .micros.vitamins.vitaminC.quantity,
    iron: .micros.minerals.iron.quantity,
    calcium: .micros.minerals.calcium.quantity,
    folate: .micros.vitamins.folate.quantity
  }'
```

**Look For:**
- Vitamin K > 400µg (spinach is VERY high in vitamin K)
- Iron > 2mg (spinach has good iron)
- Folate > 150µg (spinach has good folate)

### Step 3: Remove an Ingredient (Test Delete)

```bash
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1OTkwMDcxMywiZXhwIjoxNzYwNTA1NTEzfQ.iRjDibSvaVEmgEsAR7ctW0Ee7Gs5bPKlzARzg9Ou3KU" \
  -d '{
    "action": "update-customizations",
    "draftId": "draft_1759901215603_y0wlhepbn",
    "day": 1,
    "mealName": "dinner",
    "recipeId": "641110",
    "autoCalculateNutrition": true,
    "customizations": {
      "recipeId": "641110",
      "source": "spoonacular",
      "modifications": [
        {
          "type": "omit",
          "originalIngredient": "chicken"
        }
      ],
      "customizationsApplied": true
    }
  }'
```

**Expected Result:**
- ✅ Calories should DECREASE significantly
- ✅ Protein should DECREASE (chicken is high protein)
- ✅ Vitamin B12 should DECREASE (chicken has B12)
- ✅ Iron may decrease slightly

### Step 4: Replace Ingredient (Test Swap)

```bash
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1OTkwMDcxMywiZXhwIjoxNzYwNTA1NTEzfQ.iRjDibSvaVEmgEsAR7ctW0Ee7Gs5bPKlzARzg9Ou3KU" \
  -d '{
    "action": "update-customizations",
    "draftId": "draft_1759901215603_y0wlhepbn",
    "day": 1,
    "mealName": "dinner",
    "recipeId": "641110",
    "autoCalculateNutrition": true,
    "customizations": {
      "recipeId": "641110",
      "source": "spoonacular",
      "modifications": [
        {
          "type": "replace",
          "originalIngredient": "olive oil",
          "newIngredient": "coconut oil 15g"
        }
      ],
      "customizationsApplied": true
    }
  }'
```

**Expected Result:**
- ✅ Fat profile changes (different fatty acid composition)
- ✅ Vitamin E might change (olive oil has more vitamin E)

### Step 5: Get Customized Recipe API

```bash
curl -X GET "https://caloriescience-api.vercel.app/api/recipes/customized?recipeId=641110&draftId=draft_1759901215603_y0wlhepbn&day=1&mealName=dinner" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1OTkwMDcxMywiZXhwIjoxNzYwNTA1NTEzfQ.iRjDibSvaVEmgEsAR7ctW0Ee7Gs5bPKlzARzg9Ou3KU" \
  | jq '.customizations.nutritionComparison'
```

**Expected Result:**
- ✅ Shows before/after comparison
- ✅ Includes micronutrient comparison
- ✅ `micronutrientsIncluded: true`

## What to Look For

### Success Indicators
1. `customNutrition.micros.vitamins` has multiple vitamins with non-zero values
2. `customNutrition.micros.minerals` has multiple minerals with non-zero values
3. When adding spinach: Vitamin K increases dramatically
4. When removing chicken: B12 decreases
5. Calories and macros change logically with ingredient modifications

### Debug Tips
- Check server logs for "🤖 Auto-calculating nutrition WITH MICRONUTRIENTS..."
- Look for "✅ Original recipe has micronutrients: { vitamins: X, minerals: Y }"
- Verify "✅ Micronutrients included: true" in logs

## Current Status

- ✅ Code updated locally
- ⏳ Needs deployment
- ⏳ Needs testing after deployment

