# Food Categories & Portion Sizes - Usage Guide

## Overview

Custom recipes can now be assigned a **food category** and a **default portion size**. This helps:
1. **Organize recipes** by food type
2. **Provide appropriate portion size recommendations** based on food category
3. **Ensure consistent nutrition calculations** across similar foods

## Database Storage

Each custom recipe stores:
- `food_category` (VARCHAR): The category of food (e.g., 'soup_thin', 'rice_cooked', 'meat_cooked')
- `default_portion_size_id` (UUID): Reference to the default portion size for this recipe

## API Endpoints

### 1. Get All Food Categories

**GET** `/api/food-categories`

Returns all available food categories organized by group, with their primary (default) portion sizes.

**Response**:
```json
{
  "success": true,
  "categories": {
    "beverages": [
      {
        "value": "beverage_water",
        "label": "Water & Unsweetened Beverages",
        "group": "Beverages",
        "primaryPortions": [
          {
            "name": "Medium Glass (Water)",
            "description": "300 mL",
            "volumeMl": 300,
            "multiplier": 1.0
          }
        ]
      }
    ],
    "soups": [...],
    "grains": [...],
    "proteins": [...],
    "dairy": [...],
    "fruits": [...],
    "fats": [...],
    "sauces": [...],
    "desserts": [...],
    "other": [...]
  },
  "allCategories": [...]
}
```

**Usage in Frontend**:
```typescript
const response = await fetch('/api/food-categories');
const { categories } = await response.json();

// Render category selector grouped by type
Object.entries(categories).forEach(([group, items]) => {
  console.log(group, items);
});
```

### 2. Get Portion Sizes for a Category

**GET** `/api/food-categories/[category]/portion-sizes`

Returns all portion sizes (primary + alternatives) for a specific food category.

**Example**: `/api/food-categories/soup_thin/portion-sizes`

**Response**:
```json
{
  "success": true,
  "category": "soup_thin",
  "portions": {
    "primary": [
      {
        "name": "Medium Bowl (Thin Soup)",
        "description": "300 mL",
        "volumeMl": 300,
        "multiplier": 1.0,
        "isDefault": true
      }
    ],
    "alternatives": [
      {
        "name": "Small Bowl (Thin Soup)",
        "description": "200 mL",
        "volumeMl": 200,
        "multiplier": 0.667,
        "isDefault": false
      },
      {
        "name": "Large Bowl (Thin Soup)",
        "description": "400 mL",
        "volumeMl": 400,
        "multiplier": 1.333,
        "isDefault": false
      }
    ]
  },
  "allPortions": [...]
}
```

### 3. Create Custom Recipe with Category

**POST** `/api/recipes/custom`

```json
{
  "recipeName": "Chicken Tikka Masala",
  "foodCategory": "curry_sauced_dish",
  "ingredients": [...],
  "servings": 4,
  "isPublic": false
}
```

The system automatically:
- Stores the food category
- Can suggest appropriate portion sizes based on category
- Returns category in recipe response

### 4. Update Recipe Category

**PATCH** `/api/recipes/custom/[id]/edit`

```json
{
  "foodCategory": "curry_sauced_dish"
}
```

## Available Food Categories

### Beverages
- `beverage_water` - Water & Unsweetened Beverages
- `beverage_juice` - Fruit & Vegetable Juices
- `beverage_milk` - Milk & Dairy Drinks
- `beverage_smoothie` - Smoothies & Shakes
- `beverage_coffee_tea` - Coffee & Tea
- `beverage_soft_drink` - Soft Drinks & Sweetened Beverages

### Soups & Stews
- `soup_thin` - Thin Soups (Broth-based)
- `soup_thick` - Thick Soups (Cream/Pureed)
- `stew` - Stews & Chunky Dishes
- `broth` - Broths & Consommé

### Grains & Starches
- `cereal_dry` - Dry Breakfast Cereal
- `cereal_cooked` - Cooked Oatmeal/Porridge
- `rice_cooked` - Cooked Rice
- `pasta_cooked` - Cooked Pasta
- `quinoa_cooked` - Cooked Quinoa/Ancient Grains
- `bread` - Bread
- `rolls_bagels` - Rolls, Bagels, Buns

### Protein Foods
- `meat_cooked` - Cooked Meat (Beef, Pork, Lamb)
- `poultry_cooked` - Cooked Poultry (Chicken, Turkey)
- `fish_seafood` - Fish & Seafood
- `eggs` - Eggs
- `tofu_soy` - Tofu & Soy Products
- `beans_legumes` - Beans & Legumes (Cooked)
- `nuts_seeds` - Nuts & Seeds

### Dairy Products
- `milk_dairy` - Milk (All Types)
- `yogurt` - Yogurt
- `cheese_hard` - Hard Cheese (Cheddar, Swiss)
- `cheese_soft` - Soft Cheese (Ricotta, Cottage)
- `ice_cream` - Ice Cream

### Fruits & Vegetables
- `fruit_whole` - Fresh Fruit (Whole)
- `fruit_berries` - Berries
- `fruit_chopped` - Cut/Chopped Fruit
- `fruit_dried` - Dried Fruit
- `vegetable_raw_leafy` - Raw Leafy Greens
- `vegetable_cooked` - Cooked Vegetables
- `potato` - Potatoes

### Fats & Oils
- `oil_liquid` - Liquid Cooking Oils
- `butter_spread` - Butter/Margarine Spreads

### Sauces & Mixed Dishes
- `sauce_pasta` - Pasta Sauce
- `curry_sauced_dish` - Curry & Sauced Dishes
- `pudding` - Pudding
- `mousse` - Mousse

### Other
- `mixed_dish` - Mixed Dish
- `other` - Other

## Frontend Implementation Example

### Step 1: Fetch Categories on Load

```typescript
'use client';

import { useState, useEffect } from 'react';

export function CreateRecipeForm() {
  const [categories, setCategories] = useState<any>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [portions, setPortions] = useState<any>(null);

  useEffect(() => {
    // Load categories when component mounts
    fetch('/api/food-categories')
      .then(res => res.json())
      .then(data => setCategories(data.categories));
  }, []);

  // When category changes, load its portions
  useEffect(() => {
    if (selectedCategory) {
      fetch(`/api/food-categories/${selectedCategory}/portion-sizes`)
        .then(res => res.json())
        .then(data => setPortions(data.portions));
    }
  }, [selectedCategory]);

  return (
    <form>
      {/* Category Selector */}
      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
      >
        <option value="">Select a food category...</option>
        {categories && Object.entries(categories).map(([group, items]: any) => (
          <optgroup key={group} label={group}>
            {items.map((cat: any) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>

      {/* Primary Portion (Auto-shown based on category) */}
      {portions?.primary && (
        <div>
          <h4>Recommended Portion:</h4>
          {portions.primary.map((p: any) => (
            <div key={p.name}>
              {p.name} - {p.description}
              {p.weightG && ` (${p.weightG}g)`}
              {p.volumeMl && ` (${p.volumeMl}mL)`}
            </div>
          ))}
        </div>
      )}

      {/* Alternative Portions (Optional) */}
      {portions?.alternatives && portions.alternatives.length > 0 && (
        <details>
          <summary>More portion size options</summary>
          {portions.alternatives.map((p: any) => (
            <div key={p.name}>
              {p.name} - {p.description}
            </div>
          ))}
        </details>
      )}

      {/* Rest of form... */}
    </form>
  );
}
```

### Step 2: Submit with Category

```typescript
const createRecipe = async (formData: any) => {
  const response = await fetch('/api/recipes/custom', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipeName: formData.name,
      foodCategory: selectedCategory, // Include category
      ingredients: formData.ingredients,
      servings: formData.servings,
      isPublic: false
    })
  });

  const result = await response.json();
  console.log('Created recipe:', result);
};
```

## Database Queries

### Get recipes by category

```typescript
const { data } = await supabase
  .from('cached_recipes')
  .select('*')
  .eq('food_category', 'curry_sauced_dish')
  .eq('provider', 'manual');
```

### Get all custom recipes with their categories

```typescript
const { data } = await supabase
  .from('cached_recipes')
  .select('id, recipe_name, food_category, servings')
  .eq('provider', 'manual')
  .not('food_category', 'is', null);
```

## Benefits

1. **Better Organization**: Recipes grouped by food type
2. **Smart Defaults**: Appropriate portion sizes based on food category
3. **Consistency**: Similar foods use similar portion sizes
4. **User-Friendly**: Categories match how people think about food
5. **Flexible**: Category is optional - can be null if not specified

## Migration

Run these migrations to add the feature:

```bash
# 1. Add food_category column to cached_recipes
psql -d your_db -f database/migrations/080_add_food_categories.sql

# 2. Seed category-specific portion sizes
psql -d your_db -f database/migrations/081_seed_category_portion_sizes.sql
```

## Notes

- **Category is optional**: If not specified, recipe will have `food_category: null`
- **Primary portions only**: Frontend should show primary (default) portions by default
- **Alternatives available**: Users can expand to see more portion options if needed
- **No automatic detection**: Nutritionists manually select the appropriate category
- **Portion multiplier**: Each portion has a multiplier (e.g., 0.5, 1.0, 1.5) for nutrition scaling
