# Smart Ingredient Search Feature

## Overview

The Simple Ingredients Search API now includes **smart category-based search** that intelligently expands generic terms to return all relevant ingredients.

## How It Works

When you search for a generic term like "fish" or "vegetables", the API:
1. Detects the category keyword
2. Expands the search to include all items in that category
3. Returns all matching ingredients with their cooked variants

## Smart Search Keywords

### Fish & Seafood
**Search**: `fish` or `seafood`

**Returns**: All fish and seafood types
- ✅ Salmon (raw, steamed, grilled, baked, sautéed, stir-fry)
- ✅ Tilapia (raw, grilled, baked, sautéed)
- ✅ Tuna (raw, grilled, baked, sautéed)
- ✅ Cod (raw, steamed, grilled, baked, sautéed)
- ✅ Shrimp/Prawns (raw, grilled, sautéed, baked, stir-fry)
- ✅ Crab (raw, steamed, grilled)
- ✅ Scallops (grilled, sautéed, baked)
- And more...

**Example**:
```bash
curl "https://api.com/api/ingredients/search?query=fish"
# Returns: 30+ fish items with all cooked variants
```

### Vegetables
**Search**: `vegetable`, `vegetables`, `veggie`, or `veggies`

**Returns**: All vegetables
- ✅ Broccoli (raw, steamed, sautéed, stir-fry, grilled, baked)
- ✅ Spinach (raw, steamed, sautéed, stir-fry, grilled, baked)
- ✅ Carrots (raw, steamed, sautéed, stir-fry, grilled, baked)
- ✅ Mushrooms - all types (raw, steamed, sautéed, stir-fry, grilled, baked)
- ✅ Tomatoes (raw, steamed, sautéed, stir-fry, grilled, baked)
- ✅ Peppers (raw, steamed, sautéed, stir-fry, grilled, baked)
- And 50+ more vegetables...

**Example**:
```bash
curl "https://api.com/api/ingredients/search?query=vegetables&limit=50"
# Returns: Up to 50 vegetables with all variants
```

### Fruits
**Search**: `fruit` or `fruits`

**Returns**: All fruits
- Banana, Apple, Orange, Avocado, Strawberry, Blueberry, Mango, etc.

### Proteins/Meats
**Search**: `protein`, `proteins`, `meat`, or `meats`

**Returns**: All protein sources
- All fish & seafood
- All poultry (chicken breast, chicken thigh, turkey, duck)
- All meats (beef, pork, lamb)
- Plant proteins (tofu, tempeh, seitan)
- Eggs (boiled, scrambled, fried, poached)
- Paneer (grilled, baked, sautéed)

### Dairy
**Search**: `dairy` or `milk`

**Returns**: All dairy products
- Milk, Butter, Yogurt, Cheese, Soy Milk, etc.

### Nuts & Seeds
**Search**: `nut` or `nuts`

**Returns**: All nuts and seeds
- Almonds, Walnuts, Cashews, Peanuts, Sunflower Seeds, Sesame Seeds, etc.

### Legumes/Beans
**Search**: `legume`, `legumes`, `bean`, or `beans`

**Returns**: All legumes
- Chickpeas (Chana), Lentils, Black Beans, Kidney Beans, etc.

### Grains
**Search**: `grain`, `grains`, or `rice`

**Returns**: All grains
- Brown Rice, White Rice, Quinoa, Oats, Barley, etc.

## Detection Logic

### Fish Detection
The API automatically identifies fish types by name:
```typescript
Detected Fish Types:
- salmon, tuna, tilapia, cod, bass, trout, halibut
- mackerel, sardine, anchovy, catfish, flounder, haddock
- mahi, snapper, swordfish, pollock

Detected Seafood Types:
- shrimp, prawn, crab, lobster, scallop, oyster
- mussel, clam, squid, octopus, crayfish
```

So even if "tilapia" doesn't have the word "fish" in its name, searching for "fish" will still return all tilapia variants.

## Benefits

### 1. **Better User Experience**
Users don't need to know specific ingredient names:
- Search "fish" instead of remembering "salmon", "tilapia", "tuna", etc.
- Search "vegetables" to browse all available veggies

### 2. **Comprehensive Results**
Get ALL variants in one search:
- Raw + Steamed + Sautéed + Stir-fry + Grilled + Baked
- Covers all 240+ cooked ingredient variants added in migrations 072, 073, 074

### 3. **Smart Sorting**
Results are sorted intelligently:
- Exact name matches first
- Then related items by type
- Then other category matches

### 4. **Works with Filters**
Combine smart search with other filters:
```bash
# All fish, excluding shellfish allergens
curl "https://api.com/api/ingredients/search?query=fish&allergens=shellfish"

# All vegetables, limit to 20
curl "https://api.com/api/ingredients/search?query=vegetables&limit=20"

# All proteins, in protein category only
curl "https://api.com/api/ingredients/search?query=protein&category=protein"
```

## Implementation Details

### Expansion Map
```typescript
{
  'fish': ['protein'],
  'seafood': ['protein'],
  'vegetable': ['vegetable'],
  'vegetables': ['vegetable'],
  'fruit': ['fruit'],
  'protein': ['protein'],
  'meat': ['protein'],
  'dairy': ['dairy'],
  'nuts': ['nuts'],
  'legume': ['legume'],
  'bean': ['legume'],
  'grain': ['grain']
}
```

### Fish Type Detection
```typescript
isFishOrSeafood(name) {
  return name includes any of:
    salmon, tuna, tilapia, cod, shrimp, crab, etc.
}
```

## Examples

### Example 1: Search "fish"
```bash
GET /api/ingredients/search?query=fish
```

**Returns**:
```json
{
  "data": {
    "ingredients": [
      {"name": "salmon", "title": "Salmon", ...},
      {"name": "grilled salmon", "title": "Grilled Salmon", ...},
      {"name": "baked salmon", "title": "Baked Salmon", ...},
      {"name": "tilapia", "title": "Tilapia", ...},
      {"name": "grilled tilapia", "title": "Grilled Tilapia", ...},
      // ... 30+ more fish variants
    ],
    "totalResults": 35
  },
  "metadata": {
    "query": "fish",
    "totalResults": 35,
    "rawIngredients": 7,
    "cookedIngredients": 28
  },
  "message": "Found 35 matching ingredients (7 raw, 28 cooked)"
}
```

### Example 2: Search "vegetables"
```bash
GET /api/ingredients/search?query=vegetables&limit=30
```

**Returns**: 30 vegetables (mix of raw and cooked)

### Example 3: Search specific item
```bash
GET /api/ingredients/search?query=broccoli
```

**Returns**: Only broccoli variants (6 items: raw, steamed, sautéed, stir-fry, grilled, baked)

## Regular vs Smart Search

| Query Type | Example | Behavior |
|------------|---------|----------|
| **Specific** | `broccoli` | Returns only broccoli variants |
| **Smart** | `fish` | Returns ALL fish types + variants |
| **Smart** | `vegetables` | Returns ALL vegetables + variants |
| **Specific** | `salmon` | Returns only salmon variants |
| **Smart** | `protein` | Returns ALL protein sources |

## API Endpoint

```
GET /api/ingredients/search
```

**Parameters**:
- `query`: Search term (required)
- `limit`: Max results (default: 50, max: 100)
- `category`: Filter by category
- `allergens`: Comma-separated allergens to exclude

## Notes

- ✅ Works with in-memory cache for instant results (~2-10ms)
- ✅ Returns nutrition in same format as recipe API
- ✅ Includes flat fields (calories, protein, carbs, fat) + detailed nutrition object
- ✅ Groups results by cooking method
- ✅ Respects allergen filters

---

**Last Updated**: October 28, 2025  
**Feature**: Smart Category-Based Ingredient Search  
**Migrations**: 072, 073, 074 (240+ cooked variants)

