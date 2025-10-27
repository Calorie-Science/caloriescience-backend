# Ingredient-as-Recipe Search Feature

## Overview

The recipe search API now **automatically includes single-ingredient items** (like fruits, vegetables, proteins) when recipe results are low. This enables users to search for simple foods like "banana", "avocado", or "chicken breast" and get them as recipe-like items that can be added to meal plans.

## How It Works

### Automatic Integration

When searching for recipes (in `broad` or `name` search modes), the system **always**:
1. Searches for 1-2 matching ingredients from Edamam and Spoonacular
2. Converts ingredients to recipe format with full nutrition data
3. Mixes them with regular recipe results
4. Returns both as a unified list

This ensures users **always** see simple ingredient options alongside complete recipes.

### Example Flow

```bash
# Search for "avocado"
GET /api/recipe-search-client?clientId=xxx&query=avocado

# System:
# 1. Searches recipes for "avocado" → finds 10 recipe results
# 2. Simultaneously searches ingredients → finds "avocado" ingredient
# 3. Converts ingredient to recipe format:
#    - "Avocado (1 medium)"
#    - With full nutrition data
#    - Formatted as a simple recipe
# 4. Returns combined list of 12 results (10 recipes + 2 ingredients)
```

## Ingredient-to-Recipe Conversion

### Recipe Format

Ingredients are converted to a recipe-like structure:

```json
{
  "id": "ingredient_avocado",
  "title": "Avocado (1 medium)",
  "source": "ingredient",
  "servings": 1,
  "readyInMinutes": 0,
  "calories": 234,
  "protein": 2.9,
  "carbs": 12.8,
  "fat": 21.4,
  "fiber": 10.0,
  "nutrition": {
    "calories": { "quantity": 234, "unit": "kcal" },
    "macros": {
      "protein": { "quantity": 2.9, "unit": "g" },
      "carbs": { "quantity": 12.8, "unit": "g" },
      "fat": { "quantity": 21.4, "unit": "g" },
      "fiber": { "quantity": 10.0, "unit": "g" }
    },
    "micros": {
      "vitamins": {
        "vitaminC": { "quantity": 17.4, "unit": "mg" },
        "vitaminE": { "quantity": 2.7, "unit": "mg" },
        "vitaminK": { "quantity": 28.6, "unit": "µg" },
        "folate": { "quantity": 109.0, "unit": "µg" }
      },
      "minerals": {
        "potassium": { "quantity": 689.0, "unit": "mg" },
        "magnesium": { "quantity": 39.4, "unit": "mg" }
      }
    }
  },
  "ingredients": ["1 medium avocado"],
  "instructions": ["Serve 1 medium of avocado"],
  "healthLabels": ["vegan", "vegetarian", "gluten-free", "dairy-free", "low-carb"],
  "dietLabels": ["vegan", "vegetarian"],
  "allergens": [],
  "isIngredient": true,
  "ingredientData": {
    "name": "avocado",
    "servingSize": { "quantity": 1, "unit": "medium" },
    "weight": 136
  }
}
```

### Smart Serving Sizes

The system uses category-appropriate serving sizes:

| Category | Standard Serving |
|----------|------------------|
| Fruits | 1 medium (e.g., apple, banana, orange) |
| Leafy Vegetables | 1 cup (e.g., spinach, lettuce) |
| Other Vegetables | 100g (e.g., broccoli, carrots) |
| Proteins | 100g (e.g., chicken breast, salmon) |
| Nuts/Seeds | 28g / 1 oz (e.g., almonds, walnuts) |
| Default | 100g |

### Automatic Classification

The system automatically infers metadata from ingredient names:

**Health Labels:**
- Vegan/Vegetarian (non-animal products)
- Gluten-free (excludes wheat, barley, rye)
- Dairy-free (excludes milk products)
- High-protein (>10g per serving)
- Low-carb (<10g per serving)

**Allergens:**
- Tree nuts (almonds, walnuts, etc.)
- Peanuts
- Soy
- Fish/Shellfish
- Dairy
- Eggs
- Gluten

**Meal Types:**
- Fruits → Breakfast
- Proteins → Lunch/Dinner
- Nuts/Seeds → Snack

## API Response

### Response Structure

```json
{
  "success": true,
  "data": {
    "recipes": [
      { /* regular recipe 1 */ },
      { /* regular recipe 2 */ },
      { /* ingredient-recipe: avocado */ },
      { /* ingredient-recipe: banana */ }
    ],
    "totalResults": 4,
    "ingredientRecipesCount": 2
  },
  "metadata": {
    "clientName": "John Doe",
    "totalResults": 4,
    "recipeResults": 2,
    "ingredientResults": 2,
    "recipesWithAllergenConflicts": 0
  },
  "message": "Found 4 results (2 recipes, 2 ingredients)"
}
```

### Identifying Ingredient-Based Recipes

Ingredient-based recipes can be identified by:

1. **`source` field**: Set to `"ingredient"`
2. **`isIngredient` field**: Set to `true`
3. **`ingredientData` field**: Contains original ingredient info

```typescript
if (recipe.source === 'ingredient' || recipe.isIngredient) {
  // This is an ingredient-based recipe
  console.log('Ingredient:', recipe.ingredientData.name);
  console.log('Serving:', recipe.ingredientData.servingSize);
}
```

## Use Cases

### 1. Simple Foods

```bash
# Search for "banana"
GET /api/recipe-search-client?clientId=xxx&query=banana

# Returns:
# - Banana bread recipes
# - Banana smoothie recipes
# - "Banana (1 medium)" as ingredient-recipe
```

### 2. Vegetables

```bash
# Search for "broccoli"
GET /api/recipe-search-client?clientId=xxx&query=broccoli

# Returns:
# - Broccoli soup recipes
# - Stir-fry recipes with broccoli
# - "Broccoli (100g)" as ingredient-recipe
```

### 3. Proteins

```bash
# Search for "chicken breast"
GET /api/recipe-search-client?clientId=xxx&query=chicken breast

# Returns:
# - Grilled chicken recipes
# - Chicken salad recipes
# - "Chicken breast (100g)" as ingredient-recipe
```

### 4. No Results Scenario

```bash
# Search for obscure ingredient with no recipes
GET /api/recipe-search-client?clientId=xxx&query=dragonfruit

# Returns:
# - "Dragonfruit (1 medium)" as ingredient-recipe
# - Nutrition data for dragonfruit
```

## Adding to Meal Plans

Ingredient-based recipes can be added to meal plans just like regular recipes:

```bash
# Add avocado to meal plan
POST /api/meal-plans/manual/add-recipe
{
  "draftId": "manual-draft-id",
  "day": 1,
  "mealName": "breakfast",
  "recipe": {
    "id": "ingredient_avocado",
    "provider": "ingredient",
    "source": "api"
  },
  "servings": 1
}
```

The system treats ingredient-recipes identically to regular recipes:
- ✅ Can be added to any meal
- ✅ Nutrition is calculated correctly
- ✅ Can adjust servings
- ✅ Can be customized (though usually not needed)

## Configuration

### Always Include Ingredients

The system **always** searches for ingredients alongside recipes (not conditional):

```typescript
// Current behavior - always fetch 2 ingredients
if (query && searchType !== 'ingredient') {
  ingredientRecipes = await ingredientRecipeService.searchIngredientsAsRecipes(
    query as string,
    2 // Always fetch 2 ingredients
  );
}
```

### Max Ingredient Results

You can adjust the number of ingredients to include:

```typescript
// Fetch 2 ingredients (current default)
ingredientRecipeService.searchIngredientsAsRecipes(query, 2);

// Fetch more ingredients
ingredientRecipeService.searchIngredientsAsRecipes(query, 5);

// Fetch only 1 ingredient
ingredientRecipeService.searchIngredientsAsRecipes(query, 1);
```

## Supported Ingredients

The system works best with:

### Fruits
- Apple, Banana, Orange, Avocado
- Berries (strawberry, blueberry, raspberry)
- Grapes, Mango, Pineapple, Peach, Pear
- Watermelon, Melon, Papaya
- Lemon, Lime, Kiwi

### Vegetables
- Broccoli, Spinach, Carrot, Lettuce
- Tomato, Cucumber, Pepper, Onion
- Garlic, Celery, Kale, Cauliflower
- Zucchini, Eggplant, Cabbage, Asparagus

### Proteins
- Chicken, Beef, Pork, Turkey, Lamb
- Fish, Salmon, Tuna, Shrimp
- Tofu, Tempeh, Eggs

### Nuts & Seeds
- Almonds, Walnuts, Cashews, Pecans
- Peanuts, Pistachios, Hazelnuts
- Chia seeds, Flax seeds, Sunflower seeds

## Limitations

1. **Nutrition Source**: Uses Edamam ingredient nutrition API
   - Requires network call (may add latency)
   - Limited to ingredients Edamam recognizes

2. **No Instructions**: Simple "serve" instruction only
   - Not suitable for ingredients requiring preparation

3. **Triggers Only on Low Results**: Won't show for popular searches
   - Designed as a fallback/enhancement

4. **Not for Ingredient Search Mode**: Only works in `broad` and `name` search modes
   - Ingredient mode already focuses on recipes with specific ingredients

## Backend Implementation

### Service: `IngredientRecipeService`

**Location:** `/lib/ingredientRecipeService.ts`

**Key Methods:**
- `searchIngredientsAsRecipes(query, maxResults)` - Main entry point
- `convertIngredientToRecipe(ingredientName)` - Converts single ingredient
- `getStandardServingSize(ingredientName)` - Determines appropriate serving
- `inferHealthLabels(name, nutrients)` - Auto-classifies health labels
- `buildNutritionObject(calories, nutrients)` - Formats nutrition data

### Integration Point

**File:** `/api/recipe-search-client.ts`

```typescript
// After regular recipe search
if (results.recipes.length < 10 && query && searchType !== 'ingredient') {
  ingredientRecipes = await ingredientRecipeService.searchIngredientsAsRecipes(
    query as string,
    10 - results.recipes.length
  );
  
  totalResults += ingredientRecipes.length;
}

// Combine both result types
const allRecipes = [...results.recipes, ...ingredientRecipes];
```

## Future Enhancements

Potential improvements:

1. **Caching**: Cache ingredient-recipes in `cached_recipes` table
   - Avoid repeated API calls for common ingredients
   - Faster response times

2. **User Preferences**: Allow users to disable ingredient results
   - Some users may prefer recipes only

3. **Custom Serving Sizes**: Allow users to customize serving sizes
   - E.g., "50g banana" instead of "1 medium"

4. **Combination Recipes**: Auto-generate simple combinations
   - E.g., "Banana + Peanut Butter" as a recipe

5. **Preparation Methods**: Add basic prep options
   - Raw vs Cooked
   - Boiled vs Grilled vs Baked

6. **Image Quality**: Use better placeholder images
   - Currently uses Spoonacular CDN placeholders

## Testing

### Test Single Ingredient

```bash
curl -X GET "https://your-api.com/api/recipe-search-client?clientId=xxx&query=avocado" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Mixed Results

```bash
curl -X GET "https://your-api.com/api/recipe-search-client?clientId=xxx&query=banana" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Verify Nutrition Data

Check that ingredient-recipes have:
- ✅ Calories > 0
- ✅ Macros (protein, carbs, fat, fiber)
- ✅ Micronutrients (vitamins, minerals)

### Add to Meal Plan

```bash
# 1. Search for ingredient
# 2. Get ingredient-recipe ID (starts with "ingredient_")
# 3. Add to meal plan

curl -X POST "https://your-api.com/api/meal-plans/manual/add-recipe" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "draft-id",
    "day": 1,
    "mealName": "breakfast",
    "recipe": {
      "id": "ingredient_banana",
      "provider": "ingredient",
      "source": "api"
    }
  }'
```

## Summary

✅ **Automatic**: No changes needed in frontend - works automatically  
✅ **Seamless**: Ingredient-recipes look and act like regular recipes  
✅ **Smart**: Only activates when recipe results are low  
✅ **Complete**: Full nutrition data including micronutrients  
✅ **Flexible**: Can be added to meal plans like any recipe  

Now users can search for simple foods like "banana", "avocado", or "chicken breast" and get meaningful results even when no recipes match! 🎉

