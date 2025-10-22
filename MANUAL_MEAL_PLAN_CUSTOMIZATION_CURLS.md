# Manual Meal Plan Recipe Customization - Test Commands

## ✅ Summary

**Recipe customization for manual meal plans already exists!** It uses the same endpoint as automated meal plans:  
`POST /api/meal-plans/draft` with `action: "update-customizations"`

## 🔑 Features

- ✅ **Omit ingredients** - Remove unwanted ingredients
- ✅ **Add ingredients** - Add new ingredients
- ✅ **Replace ingredients** - Swap one ingredient for another
- ✅ **Auto-calculate nutrition** - Automatically recalculates macros AND micros after modifications
- ✅ **Works for both manual and automated meal plans** - Same API endpoint

---

## 📝 Complete Test Flow

### Step 1: Create Manual Meal Plan

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/manual/create" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "a376c7f1-d053-4ead-809d-00f46ca7d2c8",
    "planDate": "2025-10-25",
    "durationDays": 3
  }'
```

**Response:**
```json
{
  "success": true,
  "data": {
    "draftId": "manual-a376c7f1-d053-4ead-809d-00f46ca7d2c8-1761067687415",
    "status": "draft",
    "creationMethod": "manual",
    "planDate": "2025-10-25T00:00:00.000Z",
    "durationDays": 3,
    "expiresAt": "2025-10-28T17:28:07.842Z"
  }
}
```

---

### Step 2: Search for a Recipe

```bash
curl "https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=a376c7f1-d053-4ead-809d-00f46ca7d2c8&query=pasta&maxResults=1" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "data": {
    "recipes": [
      {
        "id": "recipe_fcaa203fe7b27adc0bb223251111f632",
        "title": "Garlic and Tomato Pasta",
        "source": "edamam",
        "calories": 266
      }
    ]
  }
}
```

---

### Step 3: Add Recipe to Meal Plan

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "manual-a376c7f1-d053-4ead-809d-00f46ca7d2c8-1761067687415",
    "day": 1,
    "mealName": "breakfast",
    "recipe": {
      "id": "recipe_fcaa203fe7b27adc0bb223251111f632",
      "provider": "edamam",
      "source": "api"
    },
    "servings": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Recipe added successfully"
}
```

---

### Step 4: Customize the Recipe ⭐

**This is the KEY step - customization works for manual meal plans!**

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "manual-a376c7f1-d053-4ead-809d-00f46ca7d2c8-1761067687415",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "recipe_fcaa203fe7b27adc0bb223251111f632",
    "autoCalculateNutrition": true,
    "customizations": {
      "recipeId": "recipe_fcaa203fe7b27adc0bb223251111f632",
      "source": "edamam",
      "modifications": [
        {
          "type": "omit",
          "originalIngredient": "garlic",
          "originalAmount": 2,
          "originalUnit": "cloves",
          "notes": "Client doesn'\''t like garlic"
        },
        {
          "type": "add",
          "newIngredient": "fresh basil",
          "amount": 10,
          "unit": "g",
          "notes": "Add fresh herb flavor"
        }
      ],
      "customizationsApplied": true
    }
  }'
```

**Response (partial):**
```json
{
  "customizedNutrition": {
    "calories": {
      "quantity": 265.09,
      "unit": "kcal"
    },
    "macros": {
      "protein": { "quantity": 7.89, "unit": "g" },
      "carbs": { "quantity": 44.51, "unit": "g" },
      "fat": { "quantity": 6.04, "unit": "g" },
      "fiber": { "quantity": 2.51, "unit": "g" }
    },
    "micros": {
      "vitamins": {
        "vitaminK": { "quantity": 14.58, "unit": "µg" },
        "vitaminA": { "quantity": 22.45, "unit": "µg" }
      },
      "minerals": {
        "iron": { "quantity": 1.09, "unit": "mg" },
        "calcium": { "quantity": 23.75, "unit": "mg" }
      }
    },
    "_calculationDebug": [
      {
        "step": "OMIT_SUCCESS",
        "ingredientText": "2 cloves garlic",
        "source": "edamam",
        "ingredientNutritionTotal": 8.94,
        "nutritionBefore": 265.92,
        "nutritionAfter": 264.8
      },
      {
        "step": "ADD_SUCCESS",
        "ingredientText": "10 g fresh basil",
        "source": "edamam",
        "ingredientNutritionTotal": 2.3,
        "nutritionBefore": 264.8,
        "nutritionAfter": 265.09
      }
    ]
  },
  "nutritionComparison": {
    "macros": {
      "original": {
        "caloriesPerServing": "265.92",
        "proteinPerServingG": "7.9",
        "carbsPerServingG": "44.73",
        "fatPerServingG": "6.03"
      },
      "customized": {
        "caloriesPerServing": "265.09",
        "proteinPerServingG": "7.89",
        "carbsPerServingG": "44.51",
        "fatPerServingG": "6.04"
      }
    }
  },
  "message": "Customizations updated successfully",
  "autoCalculated": true
}
```

---

## 📊 What Happened?

1. **Omitted garlic (2 cloves)**
   - Removed 8.94 calories
   - Nutrition: 265.92 → 264.8 kcal

2. **Added fresh basil (10g)**
   - Added 2.3 calories
   - Nutrition: 264.8 → 265.09 kcal

3. **Micronutrients updated**
   - Vitamin K increased: 9.4 → 14.58 µg (basil is high in Vitamin K)
   - Iron increased: 1.06 → 1.09 mg
   - Vitamin A increased: 19.15 → 22.45 µg

---

## 🎯 Modification Types

### 1. **OMIT** - Remove an ingredient

```json
{
  "type": "omit",
  "originalIngredient": "butter",
  "originalAmount": 2,
  "originalUnit": "tbsp",
  "notes": "Lower saturated fat"
}
```

### 2. **ADD** - Add a new ingredient

```json
{
  "type": "add",
  "newIngredient": "olive oil",
  "amount": 1,
  "unit": "tbsp",
  "notes": "Healthier fat alternative"
}
```

### 3. **REPLACE** - Swap ingredients

```json
{
  "type": "replace",
  "originalIngredient": "white rice",
  "originalAmount": 1,
  "originalUnit": "cup",
  "newIngredient": "brown rice",
  "amount": 1,
  "unit": "cup",
  "notes": "More fiber"
}
```

---

## 🔄 Complete Working Example (One Command)

```bash
# Set variables
export TOKEN="YOUR_TOKEN"
export CLIENT_ID="a376c7f1-d053-4ead-809d-00f46ca7d2c8"

# 1. Create draft
DRAFT_RESPONSE=$(curl -s -X POST "https://caloriescience-api.vercel.app/api/meal-plans/manual/create" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"clientId\": \"$CLIENT_ID\", \"planDate\": \"2025-10-25\", \"durationDays\": 3}")

DRAFT_ID=$(echo "$DRAFT_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['draftId'])")
echo "✅ Draft ID: $DRAFT_ID"

# 2. Add recipe
curl -s -X POST "https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"draftId\": \"$DRAFT_ID\", \"day\": 1, \"mealName\": \"breakfast\", \"recipe\": {\"id\": \"recipe_fcaa203fe7b27adc0bb223251111f632\", \"provider\": \"edamam\", \"source\": \"api\"}, \"servings\": 1}"

echo "✅ Recipe added"

# 3. Customize recipe
curl -s -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"action\": \"update-customizations\",
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"breakfast\",
    \"recipeId\": \"recipe_fcaa203fe7b27adc0bb223251111f632\",
    \"autoCalculateNutrition\": true,
    \"customizations\": {
      \"recipeId\": \"recipe_fcaa203fe7b27adc0bb223251111f632\",
      \"source\": \"edamam\",
      \"modifications\": [
        {
          \"type\": \"omit\",
          \"originalIngredient\": \"garlic\",
          \"originalAmount\": 2,
          \"originalUnit\": \"cloves\",
          \"notes\": \"Client doesn't like garlic\"
        },
        {
          \"type\": \"add\",
          \"newIngredient\": \"fresh basil\",
          \"amount\": 10,
          \"unit\": \"g\",
          \"notes\": \"Add fresh herb flavor\"
        }
      ],
      \"customizationsApplied\": true
    }
  }" | python3 -m json.tool

echo "✅ Customization complete!"
```

---

## 🎓 Key Points

1. **Same API for both manual and automated meal plans**
   - Use `POST /api/meal-plans/draft` with `action: "update-customizations"`

2. **Automatic nutrition recalculation**
   - Set `autoCalculateNutrition: true` (default)
   - Calculates macros AND micronutrients

3. **Multiple modifications**
   - Can apply multiple omit/add/replace operations in one request

4. **Detailed debug information**
   - Response includes `_calculationDebug` showing each step
   - `nutritionComparison` shows before/after values

5. **Works with cached or API recipes**
   - Supports both Edamam and Spoonacular sources

---

## ✅ Status

**Feature:** ✅ **ALREADY IMPLEMENTED AND WORKING**

No new API endpoint needed - manual meal plans use the existing `/api/meal-plans/draft` endpoint!

