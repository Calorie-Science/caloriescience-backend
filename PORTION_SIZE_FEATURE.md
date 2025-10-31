# Portion Size Feature for Custom Recipes

## Overview

This feature adds support for standardized portion sizes (e.g., "Small Cup", "Large Cup", "Medium Plate", "Small Bowl") to custom recipes. When a portion size is changed, the nutrition values are automatically scaled according to the portion size multiplier.

## Key Features

1. **Standard Portion Sizes**: Pre-defined portion sizes with categories (cup, plate, bowl, glass, serving)
2. **Default Portion Size**: Each custom recipe can have a default portion size
3. **Automatic Nutrition Scaling**: When changing portion size, nutrition values are automatically recalculated
4. **Flexible Multipliers**: Each portion size has a multiplier (e.g., Small Cup = 0.625x, Large Cup = 1.458x)

## Database Schema

### New Table: `portion_sizes`

```sql
CREATE TABLE portion_sizes (
  id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,           -- e.g., "Small Cup (150ml)"
  description TEXT,                      -- Additional description
  category VARCHAR(50) NOT NULL,         -- 'cup', 'plate', 'bowl', 'glass', 'serving', 'other'
  volume_ml DECIMAL(10, 2),             -- Volume in milliliters (for liquids)
  weight_g DECIMAL(10, 2),              -- Weight in grams (for solids)
  multiplier DECIMAL(10, 4) NOT NULL,   -- Nutrition multiplier (base = 1.0)
  is_default BOOLEAN DEFAULT FALSE,      -- Default for this category
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Updated Table: `cached_recipes`

```sql
ALTER TABLE cached_recipes
ADD COLUMN default_portion_size_id UUID REFERENCES portion_sizes(id);
```

### Pre-populated Portion Sizes

The migration automatically creates these portion sizes:

**Cups:**
- Small Cup (150ml) - multiplier: 0.625
- Medium Cup (240ml) - multiplier: 1.0 (default)
- Large Cup (350ml) - multiplier: 1.458

**Bowls:**
- Small Bowl (200g) - multiplier: 0.8
- Medium Bowl (250g) - multiplier: 1.0 (default)
- Large Bowl (400g) - multiplier: 1.6

**Plates:**
- Small Plate (150g) - multiplier: 0.75
- Medium Plate (200g) - multiplier: 1.0 (default)
- Large Plate (300g) - multiplier: 1.5

**Glasses:**
- Small Glass (150ml) - multiplier: 0.6
- Medium Glass (250ml) - multiplier: 1.0 (default)
- Large Glass (400ml) - multiplier: 1.6

**Servings:**
- 1 Serving - multiplier: 1.0 (default)
- Half Serving - multiplier: 0.5
- Double Serving - multiplier: 2.0

## API Endpoints

### 1. Portion Sizes Management (`/api/portion-sizes`)

#### GET `/api/portion-sizes`
Get all portion sizes (optionally filter by category)

**Query Parameters:**
- `category` (optional): Filter by category (cup, plate, bowl, glass, serving, other)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Small Cup (150ml)",
      "description": "Small serving cup, about 2/3 standard cup",
      "category": "cup",
      "volumeMl": 150,
      "weightG": null,
      "multiplier": 0.625,
      "isDefault": false,
      "createdAt": "2025-01-31T...",
      "updatedAt": "2025-01-31T..."
    }
  ]
}
```

#### POST `/api/portion-sizes`

**List All Portion Sizes:**
```json
{
  "action": "list",
  "category": "cup"  // optional
}
```

**Get Single Portion Size:**
```json
{
  "action": "get",
  "id": "portion-size-uuid"
}
```

**Get Default Portion Sizes:**
```json
{
  "action": "get-defaults"
}
```

**Create Portion Size:**
```json
{
  "action": "create",
  "name": "Extra Large Plate (500g)",
  "description": "Extra large dinner plate",
  "category": "plate",
  "weightG": 500,
  "multiplier": 2.5,
  "isDefault": false
}
```

**Update Portion Size:**
```json
{
  "action": "update",
  "id": "portion-size-uuid",
  "multiplier": 2.0
}
```

**Delete Portion Size:**
```json
{
  "action": "delete",
  "id": "portion-size-uuid"
}
```

### 2. Custom Recipe Portion Size (`/api/recipes/custom/[id]/portion-size`)

#### Get Recipe with Specific Portion Size
Get a recipe with nutrition scaled to a specific portion size.

```json
POST /api/recipes/custom/{recipeId}/portion-size
{
  "action": "get-with-portion-size",
  "portionSizeId": "uuid",
  "nutritionistId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recipe-uuid",
    "title": "Chicken Salad",
    "calories": 375,      // Scaled to large cup (1.5x base)
    "protein": 45,        // Scaled
    "carbs": 30,          // Scaled
    "fat": 15,            // Scaled
    "portionSize": {
      "id": "uuid",
      "name": "Large Cup (350ml)",
      "multiplier": 1.458
    },
    "nutritionServings": 1.458
    // ... other recipe fields
  }
}
```

#### Update Default Portion Size
Set or update the default portion size for a recipe.

```json
POST /api/recipes/custom/{recipeId}/portion-size
{
  "action": "update-default-portion-size",
  "portionSizeId": "uuid",  // or null to remove
  "nutritionistId": "uuid"
}
```

### 3. Create Recipe with Portion Size

When creating a custom recipe, you can now specify a default portion size:

```json
POST /api/recipes/custom
{
  "action": "create",
  "recipeName": "Green Smoothie",
  "ingredients": [...],
  "servings": 2,
  "portionSizeId": "uuid",  // NEW: Default portion size
  "nutritionistId": "uuid",
  "isPublic": false
}
```

## TypeScript Types

```typescript
// New types in types/customRecipe.ts

export interface PortionSize {
  id: string;
  name: string;
  description?: string;
  category: 'cup' | 'plate' | 'bowl' | 'glass' | 'serving' | 'other';
  volumeMl?: number;
  weightG?: number;
  multiplier: number;
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CustomRecipeOutput {
  // ... existing fields
  portionSize?: PortionSize;           // Current portion size
  defaultPortionSizeId?: string;       // Reference to default
  nutritionServings?: number;          // Multiplier applied
}
```

## Usage Examples

### Example 1: Create Recipe with Default Portion Size

```bash
curl -X POST https://your-domain.com/api/recipes/custom \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "recipeName": "Fruit Smoothie",
    "ingredients": [
      {
        "name": "Banana",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": {...}
      }
    ],
    "servings": 2,
    "portionSizeId": "medium-cup-uuid",
    "nutritionistId": "your-nutritionist-id",
    "isPublic": false
  }'
```

### Example 2: Get Recipe with Large Cup Portion

```bash
curl -X POST https://your-domain.com/api/recipes/custom/recipe-uuid/portion-size \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-with-portion-size",
    "portionSizeId": "large-cup-uuid",
    "nutritionistId": "your-nutritionist-id"
  }'
```

**Result:**
- Base recipe (medium cup): 250 calories
- Large cup (1.458x multiplier): 364.5 calories

### Example 3: List Available Portion Sizes

```bash
# Get all cup sizes
curl "https://your-domain.com/api/portion-sizes?category=cup"

# Get all portion sizes
curl "https://your-domain.com/api/portion-sizes"
```

### Example 4: Create Custom Portion Size

```bash
curl -X POST https://your-domain.com/api/portion-sizes \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "name": "Kid Size (120ml)",
    "description": "Small portion for children",
    "category": "cup",
    "volumeMl": 120,
    "multiplier": 0.5,
    "isDefault": false
  }'
```

## Migration Instructions

1. **Run the migration:**
```bash
# Apply migration 077
psql your_database < database/migrations/077_create_portion_sizes_table.sql
```

2. **Verify the migration:**
```sql
-- Check portion_sizes table exists
SELECT * FROM portion_sizes LIMIT 5;

-- Check cached_recipes has new column
SELECT default_portion_size_id FROM cached_recipes LIMIT 1;
```

3. **Test the API:**
```bash
# Get all portion sizes
curl "http://localhost:3000/api/portion-sizes"

# Should return 15 pre-populated portion sizes
```

## Service Layer

### PortionSizeService

```typescript
const portionSizeService = new PortionSizeService();

// Get all portion sizes
const allSizes = await portionSizeService.getAllPortionSizes();

// Get by category
const cups = await portionSizeService.getPortionSizesByCategory('cup');

// Get defaults
const defaults = await portionSizeService.getDefaultPortionSizes();

// Calculate nutrition for portion
const scaled = portionSizeService.calculateNutritionForPortion(
  { calories: 250, protein: 20, carbs: 30, fat: 10 },
  1.5  // multiplier
);
// Result: { calories: 375, protein: 30, carbs: 45, fat: 15 }
```

### CustomRecipeService

```typescript
const customRecipeService = new CustomRecipeService();

// Get recipe with specific portion size
const recipe = await customRecipeService.getRecipeWithPortionSize(
  'recipe-id',
  'portion-size-id',
  'nutritionist-id'
);

// Update default portion size
const updated = await customRecipeService.updateDefaultPortionSize(
  'recipe-id',
  'portion-size-id',
  'nutritionist-id'
);
```

## Frontend Integration Guide

### 1. Display Portion Size Options

```typescript
// Fetch available portion sizes
const response = await fetch('/api/portion-sizes?category=cup');
const { data: portionSizes } = await response.json();

// Display in dropdown
<select onChange={(e) => handlePortionChange(e.target.value)}>
  {portionSizes.map(ps => (
    <option key={ps.id} value={ps.id}>
      {ps.name} ({ps.multiplier}x)
    </option>
  ))}
</select>
```

### 2. Change Portion Size for Recipe

```typescript
async function changePortionSize(recipeId: string, portionSizeId: string) {
  const response = await fetch(`/api/recipes/custom/${recipeId}/portion-size`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'get-with-portion-size',
      portionSizeId,
      nutritionistId: currentUserId
    })
  });

  const { data: recipe } = await response.json();
  // recipe.calories, recipe.protein, etc. are now scaled
  return recipe;
}
```

### 3. Set Default Portion Size

```typescript
async function setDefaultPortionSize(recipeId: string, portionSizeId: string) {
  const response = await fetch(`/api/recipes/custom/${recipeId}/portion-size`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'update-default-portion-size',
      portionSizeId,
      nutritionistId: currentUserId
    })
  });

  return await response.json();
}
```

## Best Practices

1. **Always specify a default portion size** when creating recipes for better user experience
2. **Use standard portion sizes** when possible instead of creating custom ones
3. **Display the multiplier** to users so they understand how nutrition is scaled
4. **Cache portion sizes** on the frontend to avoid repeated API calls
5. **Show both base and scaled nutrition** when displaying recipes with non-default portions

## Troubleshooting

### Issue: Nutrition values not scaling

**Solution:** Ensure the portion size has a valid multiplier > 0

### Issue: Cannot delete portion size

**Solution:** Check if any recipes are using it. Remove the association first:
```typescript
await updateDefaultPortionSize(recipeId, null, nutritionistId);
```

### Issue: Portion sizes not showing up

**Solution:** Run the migration again or manually insert default portion sizes.

## Future Enhancements

1. **User-specific portion sizes**: Allow nutritionists to create custom portion sizes
2. **Metric/Imperial units**: Add support for oz, cups (US), etc.
3. **Smart recommendations**: Suggest appropriate portion sizes based on recipe type
4. **Portion history**: Track which portion sizes are most commonly used
5. **Bulk operations**: Update portion sizes for multiple recipes at once

## Related Files

- Types: [types/customRecipe.ts](types/customRecipe.ts)
- Service: [lib/portionSizeService.ts](lib/portionSizeService.ts)
- Recipe Service: [lib/customRecipeService.ts](lib/customRecipeService.ts)
- API: [api/portion-sizes.ts](api/portion-sizes.ts)
- Recipe Portion API: [api/recipes/custom/[id]/portion-size.ts](api/recipes/custom/[id]/portion-size.ts)
- Migration: [database/migrations/077_create_portion_sizes_table.sql](database/migrations/077_create_portion_sizes_table.sql)
