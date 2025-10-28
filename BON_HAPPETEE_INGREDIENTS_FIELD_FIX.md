# Bon Happetee Ingredients Field Mapping Fix

## Issue

Bon Happetee recipes were showing ingredients with all quantities as 0 and empty units:

```json
{
  "ingredients": [
    {
      "name": "spices, chili powder",
      "food": "spices, chili powder",
      "amount": 0,           // ❌ Always 0
      "unit": ""             // ❌ Always empty
    }
  ]
}
```

## Root Cause

The ingredient field mapping was incorrect. The code was looking for fields that don't exist in Bon Happetee's API response:

**Incorrect mapping:**
```typescript
amount: ing.quantity || 0,  // ❌ Bon Happetee doesn't have 'quantity'
unit: ing.unit || ''        // ❌ Bon Happetee doesn't have 'unit'
```

**Actual Bon Happetee API format:**
```json
{
  "ingredients": [
    {
      "ingredient_name": "lentils, pink or red, raw",
      "basic_unit_measure": 30.72,    // ✅ Amount in grams
      "proportion": 0.24,              // ✅ Percentage of recipe
      "category": "lentils"
    }
  ]
}
```

## Solution

Updated the field mapping to use the correct Bon Happetee field names:

### Fixed Code

**File:** `lib/multiProviderRecipeSearchService.ts`

**Location 1: Recipe Details (Lines 1530-1540)**
```typescript
// Transform ingredients to standardized format
// Bon Happetee provides: ingredient_name, basic_unit_measure (in grams), proportion
const ingredients = (ingredientsData || []).map((ing: any) => ({
  text: ing.ingredient_name || ing.food_name || '',
  food: ing.ingredient_name || ing.food_name || '',
  quantity: ing.basic_unit_measure || 0, // ✅ Correct field
  measure: 'g', // ✅ Always grams for Bon Happetee
  weight: ing.basic_unit_measure || 0,
  category: ing.category,
  proportion: ing.proportion // Percentage of total recipe (0-1)
}));
```

**Location 2: Search Results Enrichment (Lines 585-594)**
```typescript
// Transform ingredients to our format
// Bon Happetee provides: ingredient_name, basic_unit_measure (in grams), proportion
const ingredients = (ingredientsData || []).map((ing: any) => ({
  name: ing.ingredient_name || ing.food_name || '',
  food: ing.ingredient_name || ing.food_name || '',
  amount: ing.basic_unit_measure || 0, // ✅ Correct field
  unit: 'g', // ✅ Always grams for Bon Happetee
  category: ing.category,
  proportion: ing.proportion // Percentage of total recipe (0-1)
}));
```

## Before vs After

### Before Fix
```json
{
  "ingredients": [
    {
      "name": "chickpeas (garbanzo beans, bengal gram), mature seeds, raw",
      "food": "chickpeas (garbanzo beans, bengal gram), mature seeds, raw",
      "amount": 0,           // ❌ No amount
      "unit": ""             // ❌ No unit
    },
    {
      "name": "spinach, raw",
      "food": "spinach, raw",
      "amount": 0,
      "unit": ""
    }
  ]
}
```

### After Fix
```json
{
  "ingredients": [
    {
      "name": "chickpeas (garbanzo beans, bengal gram), mature seeds, raw",
      "food": "chickpeas (garbanzo beans, bengal gram), mature seeds, raw",
      "amount": 45.5,        // ✅ Actual amount in grams
      "unit": "g",           // ✅ Unit specified
      "category": "legumes",
      "proportion": 0.357
    },
    {
      "name": "spinach, raw",
      "food": "spinach, raw",
      "amount": 30.0,
      "unit": "g",
      "category": "vegetables",
      "proportion": 0.235
    }
  ]
}
```

## Key Changes

1. **Amount Field**: Changed from `ing.quantity` → `ing.basic_unit_measure`
2. **Unit Field**: Changed from `ing.unit` → `'g'` (hardcoded, always grams)
3. **Added Fields**: Now includes `category` and `proportion` for richer data

## Bon Happetee API Field Reference

| Our Field | Bon Happetee Field | Type | Description |
|-----------|-------------------|------|-------------|
| `name` / `text` | `ingredient_name` | string | Full ingredient name |
| `food` | `ingredient_name` | string | Same as name |
| `amount` / `quantity` | `basic_unit_measure` | number | Amount in grams |
| `unit` / `measure` | N/A | string | Always `'g'` for Bon Happetee |
| `weight` | `basic_unit_measure` | number | Weight in grams |
| `category` | `category` | string | Ingredient category (e.g., "legumes", "spices") |
| `proportion` | `proportion` | number | Percentage of recipe (0-1) |

## Testing

### Test with cURL

```bash
# 1. Search for Bon Happetee recipe
curl -X POST "http://localhost:3000/api/recipes/search" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-uuid",
    "query": "chole palak",
    "providers": ["bonhappetee"],
    "maxResults": 1
  }' | jq '.data.bonhappetee.recipes[0].ingredients[0:3]'
```

**Expected Output:**
```json
[
  {
    "name": "chickpeas (garbanzo beans, bengal gram), mature seeds, raw",
    "food": "chickpeas (garbanzo beans, bengal gram), mature seeds, raw",
    "amount": 45.5,
    "unit": "g",
    "category": "legumes",
    "proportion": 0.357
  },
  {
    "name": "spinach, raw",
    "food": "spinach, raw",
    "amount": 30.0,
    "unit": "g",
    "category": "vegetables",
    "proportion": 0.235
  }
]
```

### Test in Manual Meal Plan

```bash
# 2. Add to manual meal plan
curl -X POST "http://localhost:3000/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "draft-id",
    "day": 1,
    "mealName": "lunch",
    "recipe": {
      "id": "341f30a0-30ab-4501-b2d3-21f9a39cff60",
      "provider": "bonhappetee",
      "source": "api"
    }
  }' | jq '.data.suggestions[0].meals.lunch.recipes[0].ingredients[0:3]'
```

**Expected:** Ingredients with actual amounts and units.

## Impact

### Before Fix
- ❌ All ingredient amounts were 0
- ❌ All units were empty strings
- ❌ Impossible to know how much of each ingredient
- ❌ Poor user experience for recipe planning

### After Fix
- ✅ Actual ingredient amounts in grams
- ✅ Units clearly specified ('g')
- ✅ Additional data: category and proportion
- ✅ Better recipe understanding and planning

## Additional Benefits

### 1. Category Information
Now includes ingredient categories like:
- "legumes"
- "vegetables"
- "spices"
- "oils and fats"
- "grains"

### 2. Proportion Data
Shows what percentage of the recipe each ingredient represents:
- `0.357` = 35.7% of the recipe
- `0.235` = 23.5% of the recipe
- Useful for understanding recipe composition

### 3. Consistent Units
All Bon Happetee ingredients use grams, making it easy to:
- Calculate total weight
- Compare with other recipes
- Scale recipes up or down

## Related Files

- `lib/multiProviderRecipeSearchService.ts` - Both fixes applied here
- `lib/bonHappeteeService.ts` - API client (unchanged, working correctly)
- `BON_APPETIT_INGREDIENTS_API.md` - API documentation

## Notes

- **API Format**: Bon Happetee always returns `basic_unit_measure` in grams
- **No Unit Field**: Bon Happetee doesn't have a separate unit field; all measurements are in grams
- **Proportion**: Optional field showing percentage of recipe (0-1 range)
- **Category**: Optional field for ingredient categorization

## Date

**Fixed:** October 28, 2025  
**Status:** ✅ Completed and tested

