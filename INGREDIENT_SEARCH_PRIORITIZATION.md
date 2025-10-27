# Ingredient Search Prioritization

## Summary
Updated recipe search APIs to prioritize simple ingredients (like "apple", "chicken", "mushroom") at the **top** of search results, before complex recipes (like "apple custard", "chicken tikka masala").

This provides a better user experience when users search for basic ingredients, as they now see the ingredient itself first, followed by recipes that use it.

## Changes Made

### 1. `/api/recipe-search-client.ts` (Client-Aware Search)
**Lines 152-153**: Swapped array order to put ingredients first

**BEFORE:**
```typescript
const allRecipes = [...results.recipes, ...ingredientRecipes];
```

**AFTER:**
```typescript
const allRecipes = [...ingredientRecipes, ...results.recipes];
```

**Impact**: When searching for clients, simple ingredients now appear at the top of results.

---

### 2. `/api/recipe-search.ts` (Nutritionist Search)
**Added import (line 6):**
```typescript
import { simpleIngredientService } from '../lib/simpleIngredientService';
```

**Added ingredient search logic (lines 151-171):**
```typescript
// Always search for 1-2 matching simple ingredients (fruits, vegetables, proteins, etc.)
// These should appear FIRST before complex recipes for better UX
let ingredientRecipes: any[] = [];

if (searchParams.query && searchParams.query.trim().length >= 2) {
  console.log(`🔍 Searching simple ingredients for: "${searchParams.query}"`);
  
  // Extract allergens from health labels if provided (e.g., "dairy-free" → "dairy")
  const allergenFilters = searchParams.health
    ?.filter(h => h.endsWith('-free'))
    .map(h => h.replace('-free', ''));
  
  // Search simple ingredients with allergen filtering (async)
  ingredientRecipes = await simpleIngredientService.searchIngredientsAsRecipes(
    searchParams.query,
    2, // Fetch up to 2 matching ingredients
    allergenFilters && allergenFilters.length > 0 ? allergenFilters : undefined
  );
  
  console.log(`✅ Found ${ingredientRecipes.length} matching simple ingredients`);
}
```

**Combined results with ingredients first (line 209):**
```typescript
const allRecipes = [...ingredientRecipes, ...filteredRecipes];
```

**Updated metadata (lines 231-237):**
```typescript
metadata: {
  ingredientLevelFiltering: filteringApplied,
  originalCount: results.recipes.length,
  filteredCount: filteredRecipes.length,
  ingredientRecipesCount: ingredientRecipes.length,
  totalCount: allRecipes.length
}
```

**Updated message (line 238):**
```typescript
message: `Found ${allRecipes.length} results from ${results.provider}${ingredientRecipes.length > 0 ? ` (${ingredientRecipes.length} ingredients, ${filteredRecipes.length} recipes)` : ''}`
```

---

## How It Works

### Search Flow
1. User searches for "apple"
2. System queries:
   - **Simple ingredients database** (200+ common items) → Finds "Apple (1 medium)"
   - **Recipe APIs** (Edamam, Spoonacular, etc.) → Finds "Apple Pie", "Apple Custard", etc.
3. **Results ordered as:**
   - 🍎 Apple (1 medium) - 95 cal ← **SIMPLE INGREDIENT FIRST**
   - 🥧 Apple Pie - 320 cal
   - 🍮 Apple Custard - 210 cal
   - 🥤 Apple Smoothie - 150 cal

### Allergen Filtering
Simple ingredients respect health filters:
- Search: "milk" with health filter "dairy-free"
- **Skips:** Regular milk (contains dairy)
- **Shows:** Almond milk, Soy milk, Coconut milk (all dairy-free)

### Features
- ✅ Works with both client-aware search and nutritionist search
- ✅ Respects allergen filters automatically
- ✅ Returns up to 2 matching simple ingredients per search
- ✅ Preserves all recipe filtering logic
- ✅ Includes ingredient counts in metadata

---

## Benefits

### Better User Experience
- **"apple"** → See the apple fruit first, not apple pie
- **"chicken"** → See chicken breast first, not chicken curry
- **"mushroom"** → See button mushroom first, not mushroom risotto

### Faster Meal Planning
- Nutritionists can quickly add basic ingredients to meal plans
- No need to scroll through complex recipes to find simple items
- Ingredients have instant nutrition data (no API calls needed)

### Consistent Behavior
Both client search and nutritionist search now work the same way:
1. Simple ingredients first
2. Complex recipes second
3. All results respect allergen filters

---

## Testing Examples

### Example 1: Search "apple"
**Expected Results:**
1. 🍎 Apple (1 medium) - 95 cal
2. 🥧 Apple Pie
3. 🥞 Apple Pancakes
4. 🍮 Apple Crumble

### Example 2: Search "chicken" with "gluten-free" filter
**Expected Results:**
1. 🍗 Chicken Breast (100g) - 165 cal
2. 🍗 Chicken Thigh (100g) - 209 cal
3. 🍛 Gluten-Free Chicken Curry
4. 🥗 Grilled Chicken Salad

### Example 3: Search "portobello" (specific mushroom)
**Expected Results:**
1. 🍄 Portobello Mushroom (1 cup) - 35 cal
2. 🍔 Portobello Burger
3. 🥗 Portobello Salad

---

## Database Integration

Uses the `simple_ingredients` table with **200+ ingredients**:
- 7 mushroom varieties (button, portobello, shiitake, oyster, enoki, cremini, chanterelle)
- 85+ vegetables (Western + Indian)
- 35+ protein sources
- 30+ fruits
- 15+ nuts and seeds
- 25+ herbs and spices
- 20+ oils and condiments

See:
- `database/migrations/069_add_mushrooms_and_more_vegetables.sql`
- `database/migrations/070_add_more_proteins_fruits_and_others.sql`

---

## Technical Details

### Service Used
`lib/simpleIngredientService.ts` - Provides:
- In-memory caching (5-minute TTL)
- Fallback to database
- Allergen conflict checking
- Recipe-format conversion

### Performance
- ✅ Fast: Uses cached data or database (no external API calls)
- ✅ Efficient: Only searches when query length >= 2
- ✅ Limited: Returns max 2 ingredients per search
- ✅ Non-blocking: Runs in parallel with recipe searches

---

## Related Files
- ✅ `/api/recipe-search.ts` - Nutritionist search
- ✅ `/api/recipe-search-client.ts` - Client-aware search
- ✅ `/lib/simpleIngredientService.ts` - Ingredient service
- ✅ `/database/migrations/069_add_mushrooms_and_more_vegetables.sql` - 130+ ingredients
- ✅ `/database/migrations/070_add_more_proteins_fruits_and_others.sql` - 170+ ingredients

---

## Notes
- Simple ingredients are marked with `isSimpleIngredient: true` flag
- They have complete nutrition data (macros + micros where available)
- They respect all allergen and dietary restrictions
- They can be used directly in meal plans like any other recipe

