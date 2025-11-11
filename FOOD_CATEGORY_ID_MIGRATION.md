# Food Category ID Migration

## Overview

This migration normalizes food categories by creating a `food_categories` table and using foreign key references (`food_category_id`) instead of string values (`food_category`).

## Database Changes

### New Table: `food_categories`

```sql
CREATE TABLE food_categories (
  id UUID PRIMARY KEY,
  code VARCHAR(100) UNIQUE NOT NULL,  -- e.g., 'beverage_water', 'soup_thin'
  name VARCHAR(255) NOT NULL,         -- Human-readable name
  description TEXT,
  category_group VARCHAR(100),        -- e.g., 'Beverages', 'Soups & Stews'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### Updated Tables

1. **`cached_recipes`**
   - Added `food_category_id UUID` (foreign key to `food_categories.id`)
   - Kept `food_category VARCHAR` for backward compatibility

2. **`portion_sizes`**
   - Added `food_category_id UUID` (foreign key to `food_categories.id`)
   - Kept `food_category VARCHAR` for backward compatibility

## API Changes

### 1. GET /api/food-categories

**Before:**
```json
{
  "categories": {
    "beverages": [
      {
        "value": "beverage_water",
        "label": "Water & Unsweetened Beverages",
        "group": "Beverages",
        "primaryPortions": [...]
      }
    ]
  }
}
```

**After:**
```json
{
  "categories": {
    "beverages": [
      {
        "id": "uuid-here",
        "code": "beverage_water",
        "name": "Water & Unsweetened Beverages",
        "group": "Beverages",
        "primaryPortions": [
          {
            "id": "portion-uuid",
            "name": "Medium Glass",
            "description": "300 mL",
            ...
          }
        ]
      }
    ]
  }
}
```

### 2. GET /api/food-categories/{category}/portion-sizes

**{category} can be:**
- Food category **code** (e.g., `soup_thin`)
- Food category **ID** (UUID, e.g., `797494de-7f93-4e2c-af6d-9e6f9c77c122`)

**Examples:**
```bash
# By code
GET /api/food-categories/soup_thin/portion-sizes

# By ID
GET /api/food-categories/797494de-7f93-4e2c-af6d-9e6f9c77c122/portion-sizes
```

**Before:**
```json
{
  "category": "soup_thin",
  "portions": {
    "primary": [...],
    "alternatives": [...]
  }
}
```

**After:**
```json
{
  "category": {
    "id": "797494de-7f93-4e2c-af6d-9e6f9c77c122",
    "code": "soup_thin",
    "name": "Thin Soups (Broth-based)",
    "group": "Soups & Stews"
  },
  "portions": {
    "primary": [
      {
        "id": "portion-uuid",
        "name": "Medium Bowl",
        ...
      }
    ],
    "alternatives": [...]
  }
}
```

### 3. POST /api/recipes/custom (Create Recipe)

**Before:**
```json
{
  "recipeName": "My Recipe",
  "ingredients": [...],
  "servings": 4,
  "foodCategory": "soup_thin"
}
```

**After (Preferred):**
```json
{
  "recipeName": "My Recipe",
  "ingredients": [...],
  "servings": 4,
  "foodCategoryId": "uuid-here"
}
```

**Still Supported (Backward Compatible):**
```json
{
  "recipeName": "My Recipe",
  "ingredients": [...],
  "servings": 4,
  "foodCategory": "soup_thin"
}
```

### 4. PUT /api/recipes/custom (Update Recipe)

Same as create - supports both `foodCategoryId` (preferred) and `foodCategory` (deprecated).

### 5. GET /api/recipes/custom/{id} (Recipe Details)

**Response includes:**
```json
{
  "id": "recipe-uuid",
  "title": "My Recipe",
  "foodCategoryId": "category-uuid",
  "foodCategory": {
    "id": "category-uuid",
    "code": "soup_thin",
    "name": "Thin Soups (Broth-based)",
    "category_group": "Soups & Stews"
  },
  ...
}
```

## Migration Steps

1. **Run the migration:**
   ```bash
   psql -d your_database -f database/migrations/082_normalize_food_categories.sql
   ```

2. **Deploy the updated code** with the new API changes

3. **Update frontend/clients** to use `foodCategoryId` instead of `foodCategory`

## Backward Compatibility

- Old `food_category` VARCHAR column is kept in both tables
- APIs accept both `foodCategory` (string) and `foodCategoryId` (UUID)
- When `foodCategoryId` is provided, it takes precedence over `foodCategory`
- APIs that previously returned just the category code now return the full category object

## Benefits

1. **Data Integrity:** Foreign key constraints ensure valid category references
2. **Flexibility:** Category names and descriptions can be updated without changing code
3. **Rich Metadata:** Category objects include ID, code, name, description, and group
4. **Better UX:** Frontend can display human-readable category names
5. **Easier Querying:** Join with `food_categories` table for filtering and grouping

## Frontend Integration Example

```typescript
// Fetch categories with IDs
const response = await fetch('/api/food-categories');
const { categories } = await response.json();

// When creating a recipe, use the ID
await fetch('/api/recipes/custom', {
  method: 'POST',
  body: JSON.stringify({
    recipeName: 'My Recipe',
    ingredients: [...],
    servings: 4,
    foodCategoryId: categories.soups[0].id  // Use ID instead of code
  })
});

// The response will include the full category object
const recipe = await response.json();
console.log(recipe.foodCategory.name); // "Thin Soups (Broth-based)"
```

## Testing

After deployment, test these scenarios:

1. Create recipe with `foodCategoryId` - should work
2. Create recipe with `foodCategory` (legacy) - should work
3. Get food categories - should return IDs and full category objects
4. Get portion sizes by category code - should work
5. Get portion sizes by category ID - should work
6. Get recipe details - should include `foodCategoryId` and full `foodCategory` object
