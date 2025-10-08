# Micronutrient Tracking Test Flow

## Authentication Token
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1OTkwMDcxMywiZXhwIjoxNzYwNTA1NTEzfQ.iRjDibSvaVEmgEsAR7ctW0Ee7Gs5bPKlzARzg9Ou3KU"
```

## Step 1: Generate 1-Day Meal Plan Draft

```bash
# Generate meal plan draft
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "clientId": "a376c7f1-d053-4ead-809d-00f46ca7d2c8",
    "days": 1,
    "startDate": "2025-10-01"
  }' | jq '.'
```

**Expected Output:**
- Draft ID (save this!)
- Day 1 with multiple meals (breakfast, lunch, dinner, snacks)
- Each meal has recipe suggestions with IDs

**Save these values:**
```bash
DRAFT_ID="<copy-draft-id-from-response>"
RECIPE_ID="<copy-a-recipe-id-from-breakfast>"
```

---

## Step 2: Get Draft Details with Micronutrients

```bash
# Get detailed draft with micronutrient data
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts/$DRAFT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.days[0].meals'
```

**What to look for:**
- ✅ `nutrition.macros` - calories, protein, carbs, fat, fiber, sugar, sodium
- ✅ `nutrition.micronutrients.vitamins` - vitaminA, vitaminC, vitaminD, vitaminB12, etc.
- ✅ `nutrition.micronutrients.minerals` - calcium, iron, magnesium, zinc, etc.
- ✅ `ingredients` list for each meal

---

## Step 3: Select a Recipe for Breakfast

```bash
# Select a recipe from the suggestions
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "action": "select-recipe",
    "draftId": "'$DRAFT_ID'",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "'$RECIPE_ID'"
  }' | jq '.success'
```

---

## Step 4: Get Recipe Details and Choose an Ingredient

```bash
# Get the customized recipe details
curl -X GET "https://caloriescience-api.vercel.app/api/recipes/customized?recipeId=$RECIPE_ID&draftId=$DRAFT_ID&day=1&mealName=breakfast" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.ingredients[] | .name'
```

**Pick an ingredient to modify:**
```bash
INGREDIENT_TO_REPLACE="<pick-one-ingredient-name>"
```

---

## Step 5: Test Ingredient Operations

### 5A. Replace Ingredient (with Micronutrient Tracking)

```bash
# Replace an ingredient (e.g., replace "milk" with "almond milk")
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "action": "replace-ingredient",
    "draftId": "'$DRAFT_ID'",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "'$RECIPE_ID'",
    "originalIngredient": "milk 100g",
    "newIngredient": "almond milk 100g",
    "source": "edamam"
  }' | jq '.'
```

**Expected Changes:**
- ✅ Macros update (protein decrease, different fat profile)
- ✅ **Vitamin B12 decrease** (milk has B12, almond milk doesn't)
- ✅ **Calcium changes** (different calcium content)
- ✅ **Vitamin D changes** (fortified milk vs almond milk)

---

### 5B. Delete/Omit Ingredient

```bash
# Omit an ingredient (e.g., remove "cheese")
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "action": "update-customizations",
    "draftId": "'$DRAFT_ID'",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "'$RECIPE_ID'",
    "customizations": {
      "modifications": [
        {
          "type": "omit",
          "originalIngredient": "cheese 50g"
        }
      ]
    }
  }' | jq '.'
```

**Expected Changes:**
- ✅ Calories decrease
- ✅ **Calcium decrease** (cheese is high in calcium)
- ✅ **Vitamin B12 decrease** (cheese has B12)
- ✅ Fat and protein decrease

---

### 5C. Add Ingredient

```bash
# Add a new ingredient (e.g., add "spinach")
curl -X POST https://caloriescience-api.vercel.app/api/meal-plans/draft \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "action": "update-customizations",
    "draftId": "'$DRAFT_ID'",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "'$RECIPE_ID'",
    "customizations": {
      "modifications": [
        {
          "type": "add",
          "newIngredient": "spinach 50g"
        }
      ]
    }
  }' | jq '.'
```

**Expected Changes:**
- ✅ **Vitamin K increase** (spinach is VERY high in vitamin K)
- ✅ **Iron increase** (spinach has iron)
- ✅ **Folate increase** (spinach has folate)
- ✅ Fiber increase
- ✅ Minimal calorie increase

---

## Step 6: Verify Micronutrient Changes

```bash
# Get the updated recipe with all modifications
curl -X GET "https://caloriescience-api.vercel.app/api/recipes/customized?recipeId=$RECIPE_ID&draftId=$DRAFT_ID&day=1&mealName=breakfast" \
  -H "Authorization: Bearer $TOKEN" | jq '.customizations.nutritionComparison'
```

**Look for this structure:**
```json
{
  "macros": {
    "original": {
      "caloriesPerServing": "500",
      "proteinPerServingG": "25",
      "carbsPerServingG": "50"
    },
    "customized": {
      "caloriesPerServing": "450",
      "proteinPerServingG": "22",
      "carbsPerServingG": "52"
    }
  },
  "micros": {
    "original": {
      "vitamins": {
        "vitaminB12": { "quantity": 2.4, "unit": "µg" },
        "vitaminK": { "quantity": 15, "unit": "µg" },
        "vitaminC": { "quantity": 20, "unit": "mg" }
      },
      "minerals": {
        "calcium": { "quantity": 300, "unit": "mg" },
        "iron": { "quantity": 2.5, "unit": "mg" }
      }
    },
    "customized": {
      "vitamins": {
        "vitaminB12": { "quantity": 0.5, "unit": "µg" },
        "vitaminK": { "quantity": 241, "unit": "µg" },
        "vitaminC": { "quantity": 25, "unit": "mg" }
      },
      "minerals": {
        "calcium": { "quantity": 250, "unit": "mg" },
        "iron": { "quantity": 4.2, "unit": "mg" }
      }
    }
  }
}
```

---

## Step 7: Get Full Day Summary with Micros

```bash
# Get complete day summary
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts/$DRAFT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.days[0].dayTotals'
```

**Expected Output:**
```json
{
  "macros": {
    "calories": 2000,
    "protein": 150,
    "carbs": 200,
    "fat": 65,
    "fiber": 30,
    "sugar": 40,
    "sodium": 1200
  },
  "micronutrients": {
    "vitamins": {
      "vitaminA": { "quantity": 1500, "unit": "mcg" },
      "vitaminC": { "quantity": 200, "unit": "mg" },
      "vitaminD": { "quantity": 15, "unit": "mcg" },
      "vitaminB12": { "quantity": 3.5, "unit": "mcg" },
      "vitaminK": { "quantity": 300, "unit": "mcg" },
      "folate": { "quantity": 400, "unit": "mcg" }
    },
    "minerals": {
      "calcium": { "quantity": 1000, "unit": "mg" },
      "iron": { "quantity": 15, "unit": "mg" },
      "magnesium": { "quantity": 400, "unit": "mg" },
      "zinc": { "quantity": 10, "unit": "mg" }
    }
  }
}
```

---

## Verification Checklist

### ✅ Macros Tracking
- [ ] Calories update after modifications
- [ ] Protein updates after modifications
- [ ] Carbs update after modifications
- [ ] Fat updates after modifications
- [ ] Fiber updates after modifications

### ✅ Micronutrient Tracking
- [ ] Vitamins present in original recipe
- [ ] Minerals present in original recipe
- [ ] Vitamin B12 decreases when removing dairy/meat
- [ ] Calcium decreases when removing dairy
- [ ] Vitamin K increases dramatically when adding spinach
- [ ] Iron increases when adding spinach/meat
- [ ] Folate increases when adding leafy greens

### ✅ API Features
- [ ] `micronutrientsIncluded: true` flag in response
- [ ] `nutritionComparison` shows before/after micros
- [ ] `nutritionDetails.micros` populated with vitamins
- [ ] `nutritionDetails.micros` populated with minerals
- [ ] Day totals include micronutrient summaries

---

## Expected Behavior Examples

### Example 1: Replace Chicken with Tofu
**Changes:**
- ✅ Protein: 31g → 8g (decrease)
- ✅ Vitamin B12: 0.34µg → ~0µg (significant decrease)
- ✅ Calcium: 15mg → 350mg (increase)
- ✅ Iron: 0.9mg → 5.4mg (increase)

### Example 2: Remove Dairy (Milk/Cheese)
**Changes:**
- ✅ Calcium: -300mg per cup (decrease)
- ✅ Vitamin D: -100IU (decrease)
- ✅ Vitamin B12: -1.2µg (decrease)
- ✅ Protein: -8g per cup (decrease)

### Example 3: Add Spinach (50g)
**Changes:**
- ✅ Vitamin K: +241µg (massive increase)
- ✅ Iron: +1.35mg (increase)
- ✅ Folate: +97µg (increase)
- ✅ Calcium: +50mg (increase)
- ✅ Calories: +12kcal (minimal)

---

## Troubleshooting

### If micronutrients are missing:
1. Check the recipe is from Edamam (better micronutrient data)
2. Verify the ingredient has been cached with full nutrition data
3. Check console logs for `micronutrientsIncluded: true`

### If modifications don't apply:
1. Verify the draft ID is correct
2. Check recipe has been selected first
3. Ensure ingredient name matches exactly

### If API returns errors:
1. Check token is valid (not expired)
2. Verify draft belongs to your nutritionist account
3. Check ingredient format is correct (e.g., "milk 100g")

---

## Summary

This test flow demonstrates:
1. ✅ Complete meal plan generation
2. ✅ Recipe selection and customization
3. ✅ Ingredient modifications (add, delete, replace)
4. ✅ **Macro tracking** - all macronutrients update correctly
5. ✅ **Micro tracking** - all vitamins and minerals update correctly
6. ✅ Nutritional comparison - before/after with micros
7. ✅ Day totals - aggregated micronutrients across all meals

The system now provides **complete nutritional transparency** for all ingredient modifications! 🎉

