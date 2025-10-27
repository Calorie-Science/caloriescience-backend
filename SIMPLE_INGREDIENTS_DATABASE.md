# Simple Ingredients Database

## Overview

The Simple Ingredients feature provides a database-backed library of common foods (fruits, vegetables, proteins, grains, etc.) that can be added directly to meal plans as simple "recipes". This replaces the need to search for basic foods in recipe APIs.

## Database Structure

### Table: `simple_ingredients`

Stores pre-defined common ingredients with complete nutrition data.

**Location:** `database/migrations/067_create_simple_ingredients_table.sql`

### Schema

```sql
CREATE TABLE simple_ingredients (
  id UUID PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  category VARCHAR(100) NOT NULL,
  
  -- Serving Size
  serving_quantity DECIMAL(10, 2) NOT NULL,
  serving_unit VARCHAR(50) NOT NULL,
  
  -- Macronutrients
  calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
  saturated_fat_g, trans_fat_g, cholesterol_mg, sodium_mg,
  
  -- Vitamins (14 total)
  vitamin_a_mcg, vitamin_d_mcg, vitamin_e_mg, vitamin_k_mcg,
  vitamin_c_mg, thiamin_mg, riboflavin_mg, niacin_mg,
  vitamin_b6_mg, vitamin_b12_mcg, folate_mcg,
  biotin_mcg, pantothenic_acid_mg, choline_mg,
  
  -- Minerals (14 total)
  calcium_mg, phosphorus_mg, magnesium_mg,
  sodium_mg, potassium_mg, chloride_mg,
  iron_mg, zinc_mg, copper_mg,
  selenium_mcg, iodine_mcg, manganese_mg,
  molybdenum_mcg, chromium_mcg,
  
  -- Labels
  health_labels TEXT[],
  diet_labels TEXT[],
  allergens TEXT[],
  
  -- Other
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE
);
```

## Features

### ✅ **Database-Backed**
- Easy to add new ingredients via SQL INSERT
- No code changes needed to add ingredients
- Can be managed via admin interface

### ✅ **Full Nutrition**
- Complete macros (protein, carbs, fat, fiber, sugar)
- Extended macros (saturated fat, trans fat, cholesterol)
- 14 vitamins (A, D, E, K, C, B-complex, etc.)
- 14 minerals (calcium, iron, potassium, zinc, etc.)

### ✅ **Allergen Filtering**
- Auto-filters based on client restrictions
- Respects health labels (dairy-free, gluten-free, vegan, vegetarian)
- Direct allergen matching (dairy, eggs, nuts, soy, fish, shellfish)

### ✅ **Performance**
- In-memory caching (5-minute TTL)
- Instant results (no API calls)
- Falls back to hardcoded if database unavailable

### ✅ **Spoonacular Compatible**
- Marked as `source: 'spoonacular'`
- Can modify portion size and unit
- Uses existing ingredient modification system

## Usage

### 1. Add Ingredients via SQL

```sql
INSERT INTO simple_ingredients (
  name, category, serving_quantity, serving_unit,
  calories, protein_g, carbs_g, fat_g, fiber_g,
  health_labels, allergens, image_url
) VALUES (
  'dragon fruit', 'fruit', 1, 'medium',
  60, 1.2, 13, 0.4, 3,
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'],
  ARRAY[]::TEXT[],
  'https://spoonacular.com/cdn/ingredients_100x100/dragon-fruit.jpg'
);
```

### 2. Appears in Recipe Search

```bash
# Search for "banana"
GET /api/recipe-search-client?clientId=xxx&query=banana

# Returns:
# - Banana recipes
# + "Banana (1 medium)" as simple ingredient
```

### 3. Add to Meal Plan

```bash
POST /api/meal-plans/manual/add-recipe
{
  "draftId": "draft-id",
  "day": 1,
  "mealName": "breakfast",
  "recipe": {
    "id": "ingredient_banana",
    "provider": "spoonacular",  # Marked as spoonacular for compatibility
    "source": "api"
  },
  "servings": 1
}
```

### 4. Modify Portion Size

```bash
# Get ingredient details
GET /api/recipes/customized?recipeId=ingredient_banana&draftId=xxx&day=1&mealName=breakfast

# Returns ingredient with modification options
# Can change: "1 medium" → "2 medium" or "150g"
```

## Categories

### Supported Categories

- `fruit` - Fruits (banana, apple, mango, guava, etc.)
- `vegetable` - Vegetables (spinach, broccoli, okra, etc.)
- `protein` - Proteins (chicken, fish, eggs, paneer, tofu)
- `grain` - Grains (rice, quinoa, oats, roti, naan)
- `dairy` - Dairy products (milk, yogurt, cheese, butter, ghee)
- `legume` - Legumes (lentils, chickpeas, dal, rajma)
- `nuts` - Nuts & seeds (almonds, walnuts, cashews)
- `fat` - Oils (olive oil, coconut oil)
- `sweetener` - Sweeteners (honey, sugar, jaggery)

## Initial Dataset

### Migration 068 Populates:

**Total: ~30 starter ingredients** (can add more anytime)

- Fruits: banana, apple, orange, avocado, guava, papaya, pomegranate, strawberry, blueberry, etc.
- Vegetables: broccoli, spinach, carrot, tomato, kale, okra, bhindi
- Proteins: chicken breast, salmon, egg, tofu, paneer
- Legumes: lentil, chickpea, dal, moong dal, rajma, chana
- Grains: rice, brown rice, quinoa, oats, roti, chapati, naan, basmati rice
- Dairy: milk, yogurt, greek yogurt, cheese, butter, ghee, curd, almond milk, soy milk
- Nuts: almond, walnut, cashew, peanut butter

## Health Labels

### Auto-Applied Labels

**Vegan:** Plant-based only (no animal products)
**Vegetarian:** No meat/fish (allows dairy/eggs)
**Gluten-Free:** No wheat, barley, rye
**Dairy-Free:** No milk, cheese, yogurt, butter, ghee, paneer
**High-Protein:** >10g protein per serving
**High-Fiber:** >5g fiber per serving
**Low-Carb:** <10g carbs per serving
**Keto:** High fat, low carb

## Allergens

### Tracked Allergens

- `dairy` - Milk, cheese, yogurt, butter, ghee, paneer, curd
- `eggs` - Eggs
- `tree-nuts` - Almonds, walnuts, cashews, pistachios
- `peanuts` - Peanuts, peanut butter
- `soy` - Soy milk, tofu
- `fish` - Salmon, tuna, cod, fish
- `shellfish` - Shrimp, prawns
- `gluten` - Wheat products

## Administration

### Add New Ingredient

```sql
INSERT INTO simple_ingredients (
  name, category, serving_quantity, serving_unit,
  calories, protein_g, carbs_g, fat_g, fiber_g, sugar_g,
  vitamin_c_mg, vitamin_a_mcg, calcium_mg, iron_mg, potassium_mg,
  health_labels, diet_labels, allergens
) VALUES (
  'kiwi', 'fruit', 1, 'medium',
  42, 0.8, 10, 0.4, 2.1, 6,
  64, 60, NULL, NULL, 215,
  ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free'],
  ARRAY['vegan', 'vegetarian'],
  ARRAY[]::TEXT[]
);
```

### Update Ingredient

```sql
UPDATE simple_ingredients
SET 
  calories = 110,
  protein_g = 1.5,
  health_labels = ARRAY['vegan', 'vegetarian', 'gluten-free', 'dairy-free', 'high-protein']
WHERE name = 'banana';
```

### Deactivate Ingredient

```sql
UPDATE simple_ingredients
SET is_active = FALSE
WHERE name = 'ingredient_to_remove';
```

## Migration Instructions

### 1. Create Table

```bash
psql $DATABASE_URL -f database/migrations/067_create_simple_ingredients_table.sql
```

### 2. Populate Initial Data

```bash
psql $DATABASE_URL -f database/migrations/068_populate_simple_ingredients.sql
```

### 3. Verify

```sql
SELECT COUNT(*) FROM simple_ingredients WHERE is_active = TRUE;
-- Should return ~30 ingredients

SELECT name, category, health_labels, allergens 
FROM simple_ingredients 
WHERE 'dairy' = ANY(allergens);
-- Should return paneer, milk, cheese, yogurt, butter, ghee, curd
```

## Performance

### Caching Strategy

- **First Request:** Fetches from database (~50-100ms)
- **Subsequent Requests:** Serves from memory cache (<1ms)
- **Cache TTL:** 5 minutes
- **Fallback:** Uses hardcoded ingredients if database unavailable

### Scaling

- Current: ~70 hardcoded ingredients
- Database: Can handle 1000s of ingredients
- Add new ones anytime without deployment

## Future Enhancements

### Planned Features

1. **Admin API** - CRUD endpoints for managing ingredients
2. **Bulk Import** - CSV upload for batch ingredient addition
3. **Nutrition Auto-Fetch** - Optional API integration for auto-populating nutrition
4. **User Contributions** - Let nutritionists suggest new ingredients
5. **Localization** - Multi-language support for ingredient names
6. **Seasonal Tags** - Mark seasonal availability
7. **Cost Data** - Add pricing information

## Benefits

### Over Hardcoded Approach

✅ **Scalability** - Add unlimited ingredients without code changes
✅ **Maintainability** - Update via SQL, no deployments needed
✅ **Flexibility** - Easy to add region-specific foods
✅ **Accuracy** - Correct labels stored directly, no computation errors
✅ **Performance** - Cached in memory, instant results
✅ **Reliability** - Fallback to hardcoded if database down

## Migration Notes

- **Backward Compatible:** Falls back to hardcoded ingredients if table doesn't exist
- **Zero Downtime:** Can deploy code before running migration
- **Gradual Migration:** Can add ingredients incrementally
- **Rollback Safe:** Dropping table reverts to hardcoded behavior

---

**Status:** ✅ Ready for deployment
**Files Created:**
- `database/migrations/067_create_simple_ingredients_table.sql`
- `database/migrations/068_populate_simple_ingredients.sql`
- `lib/simpleIngredientService.ts` (updated for database support)

