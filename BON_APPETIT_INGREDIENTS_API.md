# Bon Appetit Ingredients API

## Endpoint

```
GET https://api.bonhappetee.com/ingredients?food_item_id={uuid}
```

**Headers Required:**
- `Accept: application/json`
- `x-api-key: {your_api_key}`
- **Important:** API uses 301 redirect - must follow redirects

---

## Response Structure

### **Prepared Foods** (with ingredients)

```json
{
  "food_unique_id": "055ab072-1df7-4a03-a40e-092847786d1a",
  "food_name": "lauki masoor dal",
  "common_names": "doodhi masoor dal",
  "basic_unit_measure": 127.62,
  "default_measure": "t",
  "serving_size_unit": "g",
  "unit_name": "bowl",
  "unit_option_name": "katori",
  "ingredients": [
    {
      "food_unique_id": "2329cbd0-4a84-4682-a7e6-408cf1c972a4",
      "ingredient_id": 14396,
      "ingredient_name": "lentils, pink or red, raw",
      "basic_unit_measure": 30.72,
      "proportion": 0.24071462153267514,
      "category": "lentils",
      "food_group": "legumes",
      "parent_group": "legumes",
      "sub_ingredients": []
    },
    {
      "ingredient_name": "oil, rice bran",
      "proportion": 0.014104372355430184,
      "category": "vegetable oils"
    },
    {
      "ingredient_name": "spices, turmeric, ground",
      "category": "dry herbs and spices"
    }
    // ... more ingredients
  ]
}
```

### **Single Ingredients** (no breakdown)

```json
{
  "food_unique_id": "8f20f3d2-cd0e-4f1b-bd55-575a5c1597ed",
  "food_name": "goat cheese",
  "common_names": "Goat cheese",
  "basic_unit_measure": 28,
  "default_measure": "t",
  "serving_size_unit": "g",
  "unit_name": "number",
  "unit_option_name": "slice",
  "ingredients": null
}
```

---

## Field Descriptions

### Top-Level Fields
- `food_unique_id` - UUID of the food item
- `food_name` - Official food name
- `common_names` - Alternative names
- `basic_unit_measure` - Base measurement in grams
- `ingredients` - **Array** of ingredient objects or **null** for single ingredients

### Ingredient Object
- `food_unique_id` - UUID (can be used to get more details)
- `ingredient_id` - Numeric ID
- `ingredient_name` - **Full ingredient name** (use this for allergen checking)
- `basic_unit_measure` - Amount in grams
- `proportion` - Percentage of total (0-1)
- `category` - Ingredient category (e.g., "lentils", "vegetable oils")
- `food_group` - Food group (e.g., "legumes", "oils and fats")
- `parent_group` - Parent category
- `sub_ingredients` - Array of nested ingredients (can be recursive)

---

## Usage in Allergen Filtering

### Extract Ingredient Names
```typescript
const ingredientsData = await bonHappeteeService.getIngredients(foodId);

// Transform to our format
const ingredients = ingredientsData.map(ing => ({
  name: ing.ingredient_name,  // Use this for allergen checking
  food: ing.ingredient_name,
  amount: ing.basic_unit_measure,
  unit: 'g',
  category: ing.category,
  proportion: ing.proportion
}));
```

### Check for Allergens
```typescript
const dairyKeywords = ['milk', 'cheese', 'paneer', 'ghee', 'butter', 'cream', 'yogurt', 'curd', 'dahi'];

const hasDairy = ingredients.some(ing => 
  dairyKeywords.some(keyword => 
    ing.name.toLowerCase().includes(keyword)
  )
);
```

---

## Examples

### Example 1: Dal Recipe
**Food:** Doodhi Masoor Dal  
**ID:** `055ab072-1df7-4a03-a40e-092847786d1a`  
**Ingredients:** 11 items
- lentils, pink or red, raw
- oil, rice bran
- sugars, powdered
- spices, turmeric, ground
- bottle gourd
- spices, cumin seed
- ginger root, raw
- salt, table
- beverages, water, tap, drinking
- chillies, dry
- spices, bay leaf

**Allergens:** None (vegan, gluten-free)

### Example 2: Single Ingredient
**Food:** Goat Cheese  
**ID:** `8f20f3d2-cd0e-4f1b-bd55-575a5c1597ed`  
**Ingredients:** `null`

**Reason:** It's a single ingredient, not a prepared dish

**Allergens:** dairy (from explicit allergens endpoint)

---

## Implementation in MultiProviderRecipeSearchService

```typescript
async enrichBonHappeteeWithIngredientsAndAllergens(recipes) {
  for (const recipe of recipes) {
    // 1. Fetch ingredients from /ingredients endpoint
    const ingredientsData = await bonHappeteeService.getIngredients(recipe.id);
    
    // 2. Transform to our format
    const ingredients = ingredientsData.map(ing => ({
      name: ing.ingredient_name,
      food: ing.ingredient_name,
      amount: ing.basic_unit_measure,
      unit: 'g',
      category: ing.category
    }));
    
    // 3. Fetch allergens from /disorder endpoint
    const disorderData = await bonHappeteeService.getRecipeDetails(recipe.id);
    
    // 4. Add to recipe
    recipe.ingredients = ingredients;
    recipe.allergens = disorderData.allergens;
  }
}
```

---

## Benefits

### For Allergen Filtering
- ✅ Get actual ingredient breakdown for prepared foods
- ✅ Check each ingredient name against allergen keywords
- ✅ Catch hidden allergens (e.g., ghee in dal, paneer in curry)

### For Recipe Details
- ✅ Show complete ingredient list to nutritionists
- ✅ Display proportions and categories
- ✅ Support recipe customization (future)

### For Nutrition Accuracy
- ✅ Each ingredient has its own `food_unique_id` for detailed nutrition
- ✅ Proportions help understand recipe composition
- ✅ Categories help with substitutions

---

## Limitations

1. **Not All Foods Have Ingredients**
   - Single ingredients return `ingredients: null`
   - Only prepared/cooked foods have breakdown
   
2. **API Call Required**
   - Search doesn't include ingredients
   - Must call `/ingredients` endpoint separately
   - We use cache to minimize API calls

3. **Nested Sub-Ingredients**
   - Some ingredients have `sub_ingredients` array
   - Currently we only check top-level ingredients
   - Could be enhanced to check recursively

---

## Testing

### Test After Deployment
```bash
# Should fetch ingredients for Bon Appetit recipes
curl "https://caloriescience-api.vercel.app/api/recipe-search?query=dal&provider=bonhappetee&maxResults=3" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.recipes[0].ingredients'

# Should filter out dairy-containing dals
curl "https://caloriescience-api.vercel.app/api/recipe-search?query=dal&health=dairy-free&provider=bonhappetee&maxResults=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.data.recipes'
```

---

**Last Updated:** October 24, 2025  
**API Version:** Bon Appetit v1  
**Status:** ✅ Implemented, awaiting deployment test

