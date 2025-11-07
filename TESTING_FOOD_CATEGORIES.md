# Testing Food Categories Implementation

## Changes Made

### 1. Database
- ✅ Added `food_category` column to `cached_recipes`
- ✅ Added `food_category` column to `portion_sizes`
- ✅ Seeded 107 category-specific portion sizes across 36 food categories

### 2. Backend Services
- ✅ `PortionSizeService.mapToPortionSize()` - Now returns `foodCategory` field
- ✅ `CustomRecipeService` - All methods now use `mapToOutputAsync()` to include:
  - `foodCategory` - The recipe's food category
  - `portionSize` - Full portion size object (if `default_portion_size_id` is set)
  - `defaultPortionSizeId` - Reference to default portion

### 3. Updated Methods
- ✅ `createCustomRecipe()` - Returns recipe with foodCategory & portionSize
- ✅ `updateCustomRecipe()` - Returns recipe with foodCategory & portionSize
- ✅ `updateBasicDetails()` - Returns recipe with foodCategory & portionSize
- ✅ `getCustomRecipe()` - Returns recipe with foodCategory & portionSize
- ✅ `listCustomRecipes()` - Returns all recipes with foodCategory & portionSize

## Test Commands

### 1. Test Portion Sizes API
```bash
curl -s 'https://caloriescience-api.vercel.app/api/portion-sizes' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  | python3 -m json.tool | head -50
```

**Expected**: Each portion should have `foodCategory` field

### 2. Test Create Recipe with Category & Portion
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/recipes/custom' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "recipeName": "Test Curry",
    "foodCategory": "curry_sauced_dish",
    "portionSizeId": "7585404f-c541-4da2-b5d6-bad7640debc8",
    "ingredients": [{"name": "Test", "quantity": 100, "unit": "g"}],
    "servings": 4,
    "isPublic": false
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "id": "...",
    "title": "Test Curry",
    "foodCategory": "curry_sauced_dish",
    "defaultPortionSizeId": "7585404f-c541-4da2-b5d6-bad7640debc8",
    "portionSize": {
      "id": "7585404f-c541-4da2-b5d6-bad7640debc8",
      "name": "Medium Bowl (Curry)",
      "foodCategory": "curry_sauced_dish",
      "weightG": 350,
      "multiplier": 1.0,
      "isDefault": true
    }
  }
}
```

### 3. Test Get Single Recipe
```bash
curl -s 'https://caloriescience-api.vercel.app/api/recipes/custom?id=RECIPE_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  | python3 -m json.tool | grep -A 10 "foodCategory\|portionSize"
```

**Expected**: Returns `foodCategory` and full `portionSize` object

### 4. Test List Recipes
```bash
curl -s 'https://caloriescience-api.vercel.app/api/recipes/custom' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  | python3 -m json.tool | grep -B 2 -A 2 "foodCategory"
```

**Expected**: All recipes include `foodCategory` field

### 5. Test Get Recipe in Meal Plan
```bash
curl -s 'https://caloriescience-api.vercel.app/api/meal-plans/drafts/DRAFT_ID' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  | python3 -m json.tool
```

**Expected**: Recipes in meal plan include `foodCategory` and `portionSize`

## Available Food Categories (36)

```
beans_legumes, beverage_coffee_tea, beverage_juice, beverage_smoothie,
beverage_water, bread, butter_spread, cereal_cooked, cereal_dry,
cheese_hard, cheese_soft, curry_sauced_dish, eggs, fish_seafood,
fruit_berries, fruit_chopped, fruit_whole, ice_cream, meat_cooked,
milk_dairy, mixed_dish, nuts_seeds, oil_liquid, pasta_cooked, potato,
poultry_cooked, pudding, quinoa_cooked, rice_cooked, sauce_pasta,
soup_thick, soup_thin, stew, vegetable_cooked, vegetable_raw_leafy,
yogurt
```

## Portion Sizes Per Category

Each category has 2-4 portion sizes:
- Small (0.6-0.8x multiplier)
- Medium (1.0x multiplier) - **DEFAULT**
- Large (1.2-1.5x multiplier)
- Sometimes Extra options (e.g., "Palm-size" for meat)

## Frontend Integration

### Step 1: Fetch Portions on Load
```javascript
const { data: portions } = await fetch('/api/portion-sizes').then(r => r.json());
```

### Step 2: Group by Food Category
```javascript
const grouped = portions.reduce((acc, p) => {
  const cat = p.foodCategory || 'other';
  if (!acc[cat]) acc[cat] = [];
  acc[cat].push(p);
  return acc;
}, {});
```

### Step 3: Show Category Dropdown
```javascript
<select onChange={(e) => setCategory(e.target.value)}>
  <option value="">Select category...</option>
  <option value="curry_sauced_dish">Curry & Sauced Dishes</option>
  <option value="rice_cooked">Cooked Rice</option>
  <option value="soup_thin">Thin Soups</option>
  {/* ... */}
</select>
```

### Step 4: Show Portions for Selected Category
```javascript
{category && grouped[category]?.map(portion => (
  <option key={portion.id} value={portion.id}>
    {portion.name} - {portion.description}
    {portion.isDefault && ' (Recommended)'}
  </option>
))}
```

### Step 5: Create Recipe
```javascript
await fetch('/api/recipes/custom', {
  method: 'POST',
  body: JSON.stringify({
    recipeName: "My Recipe",
    foodCategory: selectedCategory,
    portionSizeId: selectedPortionId,
    // ... other fields
  })
});
```

## What Gets Returned

Every custom recipe now includes:
```typescript
{
  id: string;
  title: string;
  foodCategory?: string;  // NEW: e.g., "curry_sauced_dish"
  defaultPortionSizeId?: string;  // Reference to portion
  portionSize?: {  // NEW: Full portion object
    id: string;
    name: string;
    foodCategory?: string;
    category: 'cup' | 'bowl' | 'plate' | ...;
    weightG?: number;
    volumeMl?: number;
    multiplier: number;
    isDefault: boolean;
  };
  // ... all other recipe fields
}
```

## Notes

- `foodCategory` is **optional** - recipes without it will have `foodCategory: undefined`
- `portionSize` is only included if `defaultPortionSizeId` is set
- Meal plans automatically include this data when they fetch recipes
- All existing recipes work fine (they just won't have foodCategory set)
