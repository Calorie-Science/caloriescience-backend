# Food Categories & Portion Sizes API Reference

## Overview

All APIs now return **portion size IDs** and **food category IDs** with full metadata.

## Endpoints

### 1. List All Food Categories

**Endpoint:** `GET /api/food-categories`

**Description:** Returns all food categories grouped by type, with their primary portion sizes.

**Authentication:** Required (Bearer token)

**Response:**
```json
{
  "success": true,
  "categories": {
    "beverages": [
      {
        "id": "6af9e08c-251b-4940-a726-dd33a01a5f4f",
        "code": "beverage_water",
        "name": "Water & Unsweetened Beverages",
        "group": "Beverages",
        "primaryPortions": [
          {
            "id": "bbdebde7-d218-487a-8566-da2101993754",
            "name": "Medium Glass (Water)",
            "description": "300 mL",
            "volumeMl": 300,
            "multiplier": 1,
            "isDefault": true
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

**Example:**
```bash
curl 'https://caloriescience-api.vercel.app/api/food-categories' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

### 2. Get Portion Sizes for a Food Category

**Endpoint:** `GET /api/food-categories/{category}/portion-sizes`

**Description:** Returns all portion sizes (primary + alternatives) for a specific food category.

**Authentication:** Required (Bearer token)

**Path Parameter:** `{category}` can be:
- Food category **code** (e.g., `soup_thin`, `beverage_water`)
- Food category **ID** (UUID)

**Response:**
```json
{
  "success": true,
  "category": {
    "id": "797494de-7f93-4e2c-af6d-9e6f9c77c122",
    "code": "soup_thin",
    "name": "Thin Soups (Broth-based)",
    "group": "Soups & Stews"
  },
  "portions": {
    "primary": [
      {
        "id": "b0b2d43b-8cc5-4d59-bb33-781231ff8198",
        "name": "Medium Bowl (Thin Soup)",
        "description": "300 mL",
        "volumeMl": 300,
        "multiplier": 1,
        "isDefault": true
      }
    ],
    "alternatives": [
      {
        "id": "uuid-here",
        "name": "Small Bowl (Thin Soup)",
        "description": "200 mL",
        "volumeMl": 200,
        "multiplier": 0.667,
        "isDefault": false
      },
      {
        "id": "uuid-here",
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

**Examples:**
```bash
# By category code
curl 'https://caloriescience-api.vercel.app/api/food-categories/soup_thin/portion-sizes' \
  -H 'Authorization: Bearer YOUR_TOKEN'

# By category ID
curl 'https://caloriescience-api.vercel.app/api/food-categories/797494de-7f93-4e2c-af6d-9e6f9c77c122/portion-sizes' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

### 3. Create Recipe with Food Category

**Endpoint:** `POST /api/recipes/custom`

**Description:** Create a custom recipe with a food category.

**Authentication:** Required (Bearer token, nutritionist role)

**Request Body:**
```json
{
  "recipeName": "My Chicken Soup",
  "ingredients": [
    {
      "name": "Chicken Broth",
      "quantity": 4,
      "unit": "cups",
      "nutritionData": {...}
    }
  ],
  "servings": 4,
  "foodCategoryId": "797494de-7f93-4e2c-af6d-9e6f9c77c122",
  "description": "A delicious chicken soup",
  "isPublic": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom recipe created successfully",
  "data": {
    "id": "recipe-uuid",
    "title": "My Chicken Soup",
    "foodCategoryId": "797494de-7f93-4e2c-af6d-9e6f9c77c122",
    "foodCategory": {
      "id": "797494de-7f93-4e2c-af6d-9e6f9c77c122",
      "code": "soup_thin",
      "name": "Thin Soups (Broth-based)",
      "category_group": "Soups & Stews"
    },
    ...
  }
}
```

**Example:**
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/recipes/custom' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "recipeName": "Test Soup",
    "ingredients": [...],
    "servings": 4,
    "foodCategoryId": "797494de-7f93-4e2c-af6d-9e6f9c77c122",
    "isPublic": false
  }'
```

---

### 4. Get Recipe Details

**Endpoint:** `GET /api/recipes/{id}/details?provider=manual`

**Description:** Get detailed recipe information including food category.

**Authentication:** Required (Bearer token, nutritionist role)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "recipe-uuid",
    "recipeName": "My Chicken Soup",
    "foodCategoryId": "797494de-7f93-4e2c-af6d-9e6f9c77c122",
    "foodCategory": {
      "id": "797494de-7f93-4e2c-af6d-9e6f9c77c122",
      "code": "soup_thin",
      "name": "Thin Soups (Broth-based)",
      "category_group": "Soups & Stews"
    },
    ...
  }
}
```

**Example:**
```bash
curl 'https://caloriescience-api.vercel.app/api/recipes/recipe-uuid/details?provider=manual' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

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

### Desserts
- `pudding` - Pudding
- `mousse` - Mousse

### Sauces & Mixed Dishes
- `sauce_pasta` - Pasta Sauce
- `curry_sauced_dish` - Curry & Sauced Dishes

### Other
- `mixed_dish` - Mixed Dish
- `other` - Other

---

## Key Features

1. **All portion sizes include IDs** - Every portion size now has a unique UUID
2. **Food categories have full metadata** - ID, code, name, and category group
3. **Flexible lookups** - Query by either code or ID
4. **Backward compatible** - Old `foodCategory` string field still supported
5. **Normalized data** - Single source of truth for food categories

---

## Migration Notes

- Use `foodCategoryId` (UUID) when creating/updating recipes
- Legacy `foodCategory` (string code) still works but is deprecated
- All responses include both `foodCategoryId` and full `foodCategory` object
- Portion size IDs are now included in all responses
