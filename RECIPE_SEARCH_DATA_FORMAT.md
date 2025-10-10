# Recipe Search Data Format: Per-Serving vs Total Servings

## Summary

Different recipe APIs return data in different formats. Here's what Edamam and Spoonacular return:

| API | Nutrition | Ingredients |
|-----|-----------|-------------|
| **Edamam** | ❌ TOTAL (all servings) | ✅ For entire recipe (total) |
| **Spoonacular** | ✅ PER-SERVING | ✅ For entire recipe (total) |

## Edamam Recipe Search API

### Nutrition: TOTAL (requires division)
Edamam returns **TOTAL nutrition for all servings**, so we must divide by `yield` (servings):

```json
{
  "recipe": {
    "label": "Chicken Curry",
    "yield": 4,
    "calories": 2000,           // TOTAL for all 4 servings
    "totalNutrients": {
      "PROCNT": { 
        "quantity": 80,         // TOTAL protein for all 4 servings
        "unit": "g" 
      },
      "CHOCDF": { 
        "quantity": 200,        // TOTAL carbs for all 4 servings
        "unit": "g" 
      }
    }
  }
}
```

**Our Conversion** (in `multiProviderRecipeSearchService.ts`, lines 539-545):
```typescript
const servings = recipe.yield || 1;
const caloriesPerServing = Math.round(recipe.calories / servings);  // ✅ Divides by servings
const proteinPerServing = Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / servings * 10) / 10;
```

**Result**: ✅ We correctly return **per-serving** nutrition in search results.

### Ingredients: For Entire Recipe (Total)
Edamam ingredients are for the **entire recipe**, not per serving:

```json
{
  "ingredients": [
    {
      "text": "500g chicken breast",   // For entire recipe (4 servings)
      "quantity": 500,
      "measure": "gram",
      "food": "chicken breast"
    },
    {
      "text": "2 cups rice",            // For entire recipe (4 servings)
      "quantity": 2,
      "measure": "cup",
      "food": "rice"
    }
  ]
}
```

**Our Handling**: ✅ We store ingredients as-is (for entire recipe), which is correct.

## Spoonacular Recipe Search API

### Nutrition: PER-SERVING (already correct)
Spoonacular returns **PER-SERVING nutrition**, no division needed:

```json
{
  "id": 635446,
  "title": "Blueberry Pancakes",
  "servings": 2,
  "nutrition": {
    "nutrients": [
      {
        "name": "Calories",
        "amount": 500,          // Already PER SERVING ✅
        "unit": "kcal"
      },
      {
        "name": "Protein",
        "amount": 20,           // Already PER SERVING ✅
        "unit": "g"
      }
    ]
  }
}
```

**Our Conversion** (in `multiProviderRecipeSearchService.ts`, lines 656-695):
```typescript
private extractNutritionFromSpoonacular(recipe: SpoonacularRecipe) {
  // Just use nutrient.amount directly - it's already per-serving ✅
  nutrition.calories = Math.round(nutrient.amount);
  nutrition.protein = Math.round(nutrient.amount);
}
```

**Result**: ✅ We correctly return **per-serving** nutrition (no division needed).

### Ingredients: For Entire Recipe (Total)
Spoonacular ingredients are also for the **entire recipe**:

```json
{
  "extendedIngredients": [
    {
      "id": 1123,
      "name": "eggs",
      "amount": 6,              // For entire recipe (2 servings = 3 eggs per serving)
      "unit": "large",
      "original": "6 large eggs"
    },
    {
      "name": "flour",
      "amount": 2,              // For entire recipe (2 servings = 1 cup per serving)
      "unit": "cups",
      "original": "2 cups flour"
    }
  ]
}
```

**Our Handling**: ✅ We store ingredients as-is (for entire recipe), which is correct.

## How Our Code Handles This

### In Recipe Search Results (`multiProviderRecipeSearchService.ts`)

#### Edamam:
```typescript
// Convert to summary (lines 529-561)
private convertEdamamToSummary(recipe: EdamamRecipe): UnifiedRecipeSummary {
  const servings = recipe.yield || 1;
  
  // ✅ DIVIDE by servings to get per-serving nutrition
  const caloriesPerServing = Math.round(recipe.calories / servings);
  const proteinPerServing = Math.round((recipe.totalNutrients?.PROCNT?.quantity || 0) / servings * 10) / 10;
  
  return {
    id: recipeId,
    title: recipe.label,
    servings: servings,
    calories: caloriesPerServing,     // ✅ Per-serving
    protein: proteinPerServing,       // ✅ Per-serving
    ingredients: recipe.ingredients   // ✅ Total (entire recipe)
  };
}
```

#### Spoonacular:
```typescript
// Convert to summary (lines 597-615)
private convertSpoonacularToSummary(recipe: SpoonacularRecipe): UnifiedRecipeSummary {
  const nutrition = this.extractNutritionFromSpoonacular(recipe);  // Already per-serving
  
  return {
    id: recipe.id.toString(),
    title: recipe.title,
    servings: recipe.servings,
    calories: nutrition.calories,     // ✅ Already per-serving
    protein: nutrition.protein,       // ✅ Already per-serving
    ingredients: recipe.extendedIngredients  // ✅ Total (entire recipe)
  };
}
```

### In Nutrition Transformation (`nutritionMappingService.ts`)

After our recent fix:

```typescript
static transformEdamamNutrition(edamamData: any, servings?: number): StandardizedNutrition {
  let recipeServings = servings || edamamData.yield || 1;
  
  // ✅ DIVIDE by servings to get per-serving nutrition
  const totalValue = totalNutrients[edamamKey].quantity;
  const perServingValue = Math.round((totalValue / recipeServings) * 100) / 100;
  
  nutrition.calories = { quantity: perServingValue, unit: 'kcal' };
}

static transformSpoonacularNutrition(spoonacularData: any): StandardizedNutrition {
  // ✅ NO DIVISION - Spoonacular is already per-serving
  const nutrient = spoonacularData.nutrients.find(n => n.name === 'Calories');
  nutrition.calories = { quantity: nutrient.amount, unit: 'kcal' };
}
```

## What Gets Stored in Database

When we cache recipes:

```typescript
{
  servings: 4,
  
  // Per-serving nutrition
  caloriesPerServing: 500,      // ✅ Per serving
  proteinPerServingG: 20,       // ✅ Per serving
  
  // Total nutrition (for entire recipe)
  totalCalories: 2000,          // servings × caloriesPerServing
  totalProteinG: 80,            // servings × proteinPerServingG
  
  // Ingredients (for entire recipe)
  ingredients: [
    {
      name: "chicken",
      amount: 500,              // ✅ For entire recipe (all 4 servings)
      unit: "g"
    }
  ]
}
```

## Summary Table

| Data Type | Edamam API | Our Code | Spoonacular API | Our Code |
|-----------|------------|----------|-----------------|----------|
| **Nutrition** | TOTAL | ✅ Divide by servings | PER-SERVING | ✅ Use as-is |
| **Ingredients** | TOTAL | ✅ Store as-is | TOTAL | ✅ Store as-is |
| **Stored Nutrition** | - | ✅ Per-serving | - | ✅ Per-serving |
| **Stored Ingredients** | - | ✅ Total | - | ✅ Total |

## Why This Matters

1. **Search Results**: Users see **per-serving** nutrition for all recipes (consistent)
2. **Recipe Details**: Shows **total ingredients** (what you need to buy)
3. **Customizations**: When user modifies ingredients, we work with **total amounts**, then recalculate **per-serving** nutrition
4. **Meal Plans**: Daily totals aggregate **per-serving** values

## Testing

### Verify Edamam Search:
```bash
# Search for recipes
curl '.../api/recipes/search?query=chicken&...'

# Check response:
# - `calories` should be reasonable per-serving value (e.g., 500, not 2000)
# - `servings` should be present (e.g., 4)
# - Math: If you multiply `calories × servings`, you get total recipe calories
```

### Verify Spoonacular Search:
```bash
# Search for recipes
curl '.../api/recipes/search?query=pasta&...'

# Check response:
# - `calories` should be per-serving (e.g., 350)
# - `servings` should be present (e.g., 6)
# - Ingredients show total amounts (e.g., "500g pasta" for all 6 servings)
```

## Files Involved

- **`lib/multiProviderRecipeSearchService.ts`**: Handles search result conversion
- **`lib/nutritionMappingService.ts`**: Transforms nutrition to standardized format
- **`lib/mealPlanDraftService.ts`**: Caches recipes with correct per-serving nutrition
- **`api/recipes/customized.ts`**: Applies customizations and recalculates nutrition

