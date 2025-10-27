# Test Custom Recipe Nutrition Format

## Testing Steps

### Step 1: Delete All Existing Custom Recipes

Run this SQL in your Supabase SQL editor:

```sql
-- Check how many will be deleted
SELECT COUNT(*) FROM cached_recipes WHERE provider = 'manual';

-- Delete all custom recipes
DELETE FROM cached_recipes WHERE provider = 'manual';

-- Verify deletion
SELECT COUNT(*) FROM cached_recipes WHERE provider = 'manual';
-- Should return 0
```

**Or use the file:** `delete-all-custom-recipes.sql` (uncomment the DELETE line)

### Step 2: Create a New Custom Recipe

Run the test script:
```bash
./test-create-custom-recipe.sh
```

This will:
1. Create a new custom recipe with proper nutrition data
2. Fetch the recipe and display the `nutritionDetails` structure

### Step 3: Verify the Format

The `nutritionDetails` should look like this:

```json
{
  "calories": { "quantity": 182, "unit": "kcal" },
  "macros": {
    "protein": { "quantity": 32.4, "unit": "g" },
    "carbs": { "quantity": 3.5, "unit": "g" },
    "fat": { "quantity": 3.8, "unit": "g" },
    "fiber": { "quantity": 1.3, "unit": "g" },
    "sugar": { "quantity": 0.9, "unit": "g" },
    "sodium": { "quantity": 90.5, "unit": "mg" },
    "cholesterol": { "quantity": 86, "unit": "mg" },
    "saturatedFat": { "quantity": 1, "unit": "g" },
    "transFat": { "quantity": 0, "unit": "g" },
    "monounsaturatedFat": { "quantity": 1.3, "unit": "g" },
    "polyunsaturatedFat": { "quantity": 0.8, "unit": "g" }
  },
  "micros": {
    "vitamins": {
      "vitaminA": { "quantity": 336.5, "unit": "IU" },
      "vitaminC": { "quantity": 45.5, "unit": "mg" },
      "vitaminD": { "quantity": 0.1, "unit": "µg" },
      "vitaminE": { "quantity": 0.3, "unit": "mg" },
      "vitaminK": { "quantity": 51.5, "unit": "µg" },
      "vitaminB6": { "quantity": 0.6, "unit": "mg" },
      "vitaminB12": { "quantity": 0.3, "unit": "µg" },
      "niacin": { "quantity": 11, "unit": "mg" },
      "folate": { "quantity": 36.5, "unit": "µg" }
    },
    "minerals": {
      "calcium": { "quantity": 38.5, "unit": "mg" },
      "iron": { "quantity": 1.3, "unit": "mg" },
      "magnesium": { "quantity": 37.5, "unit": "mg" },
      "phosphorus": { "quantity": 220, "unit": "mg" },
      "potassium": { "quantity": 418, "unit": "mg" },
      "zinc": { "quantity": 1, "unit": "mg" },
      "selenium": { "quantity": 27.5, "unit": "mg" }
    }
  }
}
```

### Step 4: Compare with Spoonacular Format

The structure should match how Spoonacular recipes return nutrition:
- ✅ All values are objects with `{ quantity, unit }`
- ✅ Nested structure: `macros`, `micros.vitamins`, `micros.minerals`
- ✅ Per-serving values (not total)
- ✅ Proper units (IU for vitaminA, µg for vitaminD/K/B12, mg for most)

### Expected API Response

```json
{
  "success": true,
  "data": [
    {
      "id": "...",
      "title": "Healthy Protein Bowl",
      "source": "manual",
      "calories": 182,
      "protein": 32.4,
      "carbs": 3.5,
      "fat": 3.8,
      "nutritionDetails": {
        "calories": { "quantity": 182, "unit": "kcal" },
        "macros": {
          "protein": { "quantity": 32.4, "unit": "g" },
          ...
        },
        "micros": {
          "vitamins": { ... },
          "minerals": { ... }
        }
      }
    }
  ]
}
```

## What Changed

### ✅ Before vs After

**Before (❌ Incorrect):**
```json
{
  "nutritionDetails": {
    "minerals_iron": 2.6,
    "vitamins_vitaminC": 91
  }
}
```

**After (✅ Correct):**
```json
{
  "nutritionDetails": {
    "macros": {
      "protein": { "quantity": 32.4, "unit": "g" }
    },
    "micros": {
      "vitamins": {
        "vitaminC": { "quantity": 91, "unit": "mg" }
      },
      "minerals": {
        "iron": { "quantity": 2.6, "unit": "mg" }
      }
    }
  }
}
```

## Manual Test (Alternative)

If you prefer to test manually:

### 1. Delete recipes via SQL:
```sql
DELETE FROM cached_recipes WHERE provider = 'manual';
```

### 2. Create via API:
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/recipes/custom' \
  -H 'Content-Type: application/json' \
  -H 'authorization: Bearer YOUR_TOKEN' \
  -d @- << 'EOF'
{
  "recipeName": "Test Recipe",
  "servings": 1,
  "isPublic": true,
  "ingredients": [
    {
      "name": "banana",
      "quantity": 1,
      "unit": "medium",
      "nutritionData": {
        "calories": 105,
        "macros": {
          "protein": 1.3,
          "carbs": 27,
          "fat": 0.4,
          "fiber": 3.1,
          "sugar": 14,
          "sodium": 1
        },
        "micros": {
          "vitamins": {
            "vitaminC": 10,
            "vitaminB6": 0.4
          },
          "minerals": {
            "potassium": 422,
            "magnesium": 32
          }
        }
      }
    }
  ]
}
EOF
```

### 3. Fetch and verify:
```bash
curl 'https://caloriescience-api.vercel.app/api/recipes/custom?page=1&limit=1' \
  -H 'authorization: Bearer YOUR_TOKEN' | jq '.data[0].nutritionDetails'
```

## Success Criteria

✅ **Pass** if nutrition details have:
- `calories` as `{ quantity, unit }` object
- `macros` object with nested `{ quantity, unit }` values
- `micros.vitamins` object with nested `{ quantity, unit }` values
- `micros.minerals` object with nested `{ quantity, unit }` values
- Proper units (g, mg, µg, IU, kcal)

❌ **Fail** if:
- Flat structure like `"minerals_iron": 5`
- Numbers without units
- Missing nested structure

## Troubleshooting

If the format is still wrong:
1. Check if you're testing against deployed API or local
2. Verify the changes were deployed
3. Check if old recipes are cached
4. Clear the custom recipes and create fresh ones

## Files Created
- `delete-all-custom-recipes.sql` - SQL script to clean up
- `test-create-custom-recipe.sh` - Automated test script
- This document - Testing guide

