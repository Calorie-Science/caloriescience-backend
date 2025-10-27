# Manual Recipe Ingredient Customization

## Overview

Custom/manual recipes created by nutritionists support **full ingredient customization** just like Edamam and Spoonacular recipes. This includes:

- ✅ **Omit ingredients** - Remove ingredients from the recipe
- ✅ **Add ingredients** - Add new ingredients to the recipe  
- ✅ **Replace ingredients** - Swap ingredients with alternatives
- ✅ **Cross-provider ingredient swapping** - Replace ingredients using **both Edamam and Spoonacular** APIs
- ✅ **Automatic nutrition recalculation** - Including micronutrients (vitamins & minerals)

## Key Feature: Cross-Provider Ingredient Swapping

When customizing a manual recipe, ingredient replacements can come from **any source**:

```
Manual Recipe Ingredient → Can be replaced with:
  ├── Edamam ingredient
  ├── Spoonacular ingredient  
  └── Another manual ingredient
```

The system **automatically tries both providers** (Spoonacular first, then Edamam) to find the best match for replacement ingredients.

## How It Works

### 1. Add Manual Recipe to Meal Plan

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "draft_xxx",
    "day": 1,
    "mealName": "breakfast",
    "recipe": {
      "id": "2a037e55-4fbc-4747-8597-8c4763f1f51d",
      "provider": "manual",
      "source": "manual"
    },
    "servings": 1
  }'
```

### 2. Customize Ingredients

#### A. Omit an Ingredient

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "draft_xxx",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "2a037e55-4fbc-4747-8597-8c4763f1f51d",
    "customizations": {
      "source": "manual",
      "servings": 1,
      "modifications": [
        {
          "type": "omit",
          "originalIngredient": "avocado",
          "notes": "Client allergic to avocado"
        }
      ]
    }
  }'
```

**Result:**
- Avocado removed from ingredient list
- Nutrition automatically recalculated (minus avocado's nutrition)
- All macros and micros updated

#### B. Add an Ingredient (Cross-Provider)

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "draft_xxx",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "2a037e55-4fbc-4747-8597-8c4763f1f51d",
    "customizations": {
      "source": "manual",
      "servings": 1,
      "modifications": [
        {
          "type": "add",
          "newIngredient": "chia seeds",
          "amount": 1,
          "unit": "tablespoon",
          "notes": "Added for omega-3s"
        }
      ]
    }
  }'
```

**What Happens:**
1. System searches for "chia seeds" nutrition data
2. **Tries Spoonacular first** → Gets complete macros + micros
3. **Falls back to Edamam** if Spoonacular fails
4. Adds chia seeds nutrition to recipe totals
5. Returns updated recipe with new nutrition values

#### C. Replace an Ingredient (Cross-Provider)

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "draft_xxx",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "2a037e55-4fbc-4747-8597-8c4763f1f51d",
    "customizations": {
      "source": "manual",
      "servings": 1,
      "modifications": [
        {
          "type": "replace",
          "originalIngredient": "eggs",
          "newIngredient": "tofu",
          "amount": 100,
          "unit": "g",
          "notes": "Vegan alternative"
        }
      ]
    }
  }'
```

**What Happens:**
1. System removes "eggs" and its nutrition
2. Searches for "tofu" (100g) nutrition
3. **Automatically tries both Spoonacular and Edamam**
4. Adds tofu nutrition to recipe
5. Returns updated recipe with substitution applied

## Complete Workflow Example

Let's customize our "Spinach & Avocado Scramble" recipe:

### Original Recipe Ingredients:
- 2 large eggs
- 2 cups spinach
- 0.5 medium avocado

### Customization: Make it Vegan & Add Protein

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "draft_xxx",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "2a037e55-4fbc-4747-8597-8c4763f1f51d",
    "customizations": {
      "source": "manual",
      "servings": 1,
      "modifications": [
        {
          "type": "replace",
          "originalIngredient": "eggs",
          "newIngredient": "firm tofu",
          "amount": 150,
          "unit": "g",
          "notes": "Vegan egg substitute"
        },
        {
          "type": "add",
          "newIngredient": "nutritional yeast",
          "amount": 2,
          "unit": "tablespoons",
          "notes": "Added for B vitamins and cheesy flavor"
        },
        {
          "type": "add",
          "newIngredient": "chia seeds",
          "amount": 1,
          "unit": "tablespoon",
          "notes": "Boost omega-3s"
        }
      ]
    }
  }'
```

### Result:

**Original Nutrition:**
- Calories: 317.6
- Protein: 16.33g
- Fat: 24.51g
- Vitamin A: 6,312 IU
- Iron: 3.93mg

**Customized Nutrition (Auto-calculated):**
- Calories: ~320 (tofu has similar calories to eggs)
- Protein: ~18g (tofu + nutritional yeast)
- Fat: ~26g (added chia seeds)
- Vitamin A: ~5,800 IU (no eggs, but kept spinach)
- Iron: ~5mg (tofu has more iron than eggs!)
- B12: Added from nutritional yeast

## Advanced Features

### 1. Source Parameter Options

When customizing, you can specify where to look for replacement ingredients:

```json
{
  "source": "auto"        // Try Spoonacular first, then Edamam (RECOMMENDED)
  "source": "spoonacular" // Only use Spoonacular
  "source": "edamam"      // Only use Edamam
  "source": "manual"      // For the recipe itself (not replacement lookup)
}
```

**Best Practice:** Use `"source": "auto"` or omit it (defaults to auto). This ensures the system finds the best nutrition data available.

### 2. Intelligent Fallback System

The system uses an intelligent fallback when looking up replacement ingredients:

```
User requests replacement: "quinoa"
  ↓
1. Try Spoonacular API
   ├─ Success → Use Spoonacular data (includes all micros)
   └─ Fail → Continue to step 2
  ↓
2. Try Edamam API  
   ├─ Success → Use Edamam data (includes all micros)
   └─ Fail → Continue to step 3
  ↓
3. Manual fallback (estimation only)
   └─ Use basic macro estimates (no micros)
```

### 3. Micronutrient Tracking

All customizations automatically track micronutrients:

**Vitamins:**
- Vitamin A, C, D, E, K
- B-complex (B6, B12, folate, thiamin, riboflavin, niacin)
- Biotin, Pantothenic Acid

**Minerals:**
- Calcium, Iron, Magnesium, Phosphorus
- Potassium, Zinc, Copper, Manganese
- Selenium, Iodine, Chromium, Molybdenum

**Example Response:**
```json
{
  "customizedNutrition": {
    "calories": 320.5,
    "macros": {
      "protein": 18.2,
      "carbs": 12.3,
      "fat": 25.8
    },
    "micros": {
      "vitamins": {
        "vitaminA": 5800,
        "vitaminC": 27,
        "vitaminK": 290,
        "vitaminB12": 2.5,
        "folate": 245
      },
      "minerals": {
        "iron": 5.2,
        "calcium": 180,
        "potassium": 950,
        "magnesium": 95
      }
    }
  }
}
```

## Use Cases

### 1. Dietary Restrictions
```
Original: Scrambled eggs with cheese
Customize: Replace eggs with tofu, omit cheese
Result: Vegan breakfast with similar nutrition
```

### 2. Allergen Substitutions
```
Original: Smoothie with almond milk
Customize: Replace almond milk with oat milk
Result: Nut-free smoothie
```

### 3. Nutrient Boosting
```
Original: Basic salad
Customize: Add chia seeds, hemp hearts, avocado
Result: High-omega-3, high-fiber power salad
```

### 4. Budget-Friendly Swaps
```
Original: Salmon with quinoa
Customize: Replace salmon with mackerel, quinoa with brown rice
Result: More affordable with similar nutrition
```

## Comparison: Manual vs External Recipes

| Feature | Manual Recipes | Edamam/Spoonacular |
|---------|---------------|-------------------|
| Ingredient Omit | ✅ Full support | ✅ Full support |
| Ingredient Add | ✅ Full support | ✅ Full support |
| Ingredient Replace | ✅ Full support | ✅ Full support |
| Cross-Provider Swaps | ✅ **Yes (Edamam + Spoonacular)** | ✅ Yes |
| Micronutrient Tracking | ✅ Complete | ✅ Complete |
| Nutrition Auto-Calc | ✅ Automatic | ✅ Automatic |
| Original Recipe Preserved | ✅ Yes | ✅ Yes |

## API Endpoints Summary

### Customize Manual Recipe
```
POST /api/meal-plans/draft
Action: update-customizations
```

### Replace Ingredient (Simpler API)
```
POST /api/ingredients/replace
```

### Get Customized Recipe View
```
GET /api/recipes/customized?recipeId={id}&draftId={id}&day={day}&mealName={meal}
```

## Important Notes

1. **Original Recipe Unchanged**: Customizations only affect the meal plan draft, not the original manual recipe
2. **Per-Draft Customizations**: Each draft can have different customizations for the same recipe
3. **Automatic Recalculation**: Nutrition is recalculated automatically with every modification
4. **Cross-Provider Support**: Works seamlessly regardless of where ingredients come from
5. **Micronutrient Preservation**: All vitamins and minerals are tracked through customizations

## Best Practices

### For Nutritionists

1. **Use Cross-Provider Swaps**: Don't limit yourself to one provider - let the system find the best data
2. **Add Notes**: Document why you made substitutions (allergies, preferences, etc.)
3. **Verify Substitutions**: Check that replacement ingredients have similar nutrition profiles
4. **Test Flavors**: Consider how substitutions affect taste and cooking methods

### For Developers

1. **Always Use Auto Source**: Set `source: "auto"` to leverage both APIs
2. **Handle Partial Data**: Some ingredients may only have basic macros
3. **Show Nutrition Changes**: Display before/after nutrition comparison to users
4. **Cache Results**: Store customization results to avoid repeated API calls

## Troubleshooting

### Ingredient Not Found
```json
{
  "error": "Ingredient not found in either Spoonacular or Edamam"
}
```
**Solution**: Try a more common ingredient name or specify exact amounts/units

### Nutrition Calculation Failed
```json
{
  "warning": "Using manual estimation (micronutrients unavailable)"
}
```
**Solution**: Check ingredient spelling or try alternative ingredient names

### Invalid Source
```json
{
  "error": "Source must be one of: edamam, spoonacular, manual, auto"
}
```
**Solution**: Use "auto" for best results

---

## Summary

Manual recipes support **complete ingredient customization** with:

✅ Cross-provider ingredient swapping (Edamam + Spoonacular)  
✅ Full micronutrient tracking (vitamins & minerals)  
✅ Automatic nutrition recalculation  
✅ Same features as external recipes  
✅ Intelligent fallback system  

Your custom recipes are just as flexible and powerful as recipes from external providers!

---

**Last Updated:** October 23, 2025  
**Feature Version:** v2.0

