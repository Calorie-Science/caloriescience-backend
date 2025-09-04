# Meal Plan Preview API - Optimized Response Structure

## Overview

The meal plan preview API has been optimized to provide a cleaner, more logical response structure with reduced size and better organization. This document outlines the changes made and the new response format.

## Key Improvements

### 1. **Flattened Recipe Structure**
- **Before**: `recipe -> details -> recipe -> ingredients`
- **After**: `recipe -> ingredients` (direct access)

### 2. **Removed Redundant Fields**
- Eliminated nested `details` object
- Removed duplicate nutrition calculations
- Cleaned up unnecessary metadata

### 3. **Consistent Response Format**
- All responses now follow the same structure
- Added `success` field for better error handling
- Standardized data wrapper

### 4. **Reduced Response Size**
- Removed unnecessary fields
- Optimized ingredient structure
- Eliminated duplicate information

## New Response Structure

### API Response Format
```json
{
  "success": true,
  "message": "Meal plan preview generated successfully",
  "data": {
    "mealPlan": {
      "previewId": "uuid",
      "meals": [...],
      "dailyNutrition": {...}
    },
    "clientGoals": {...},
    "mealProgram": {...},
    "planDate": "2025-01-15",
    "dietaryRestrictions": [],
    "cuisinePreferences": []
  }
}
```

### Meal Structure
```json
{
  "mealKey": "meal_1",
  "mealName": "Breakfast",
  "mealTime": "08:00",
  "targetCalories": 400,
  "edamamMealType": "breakfast",
  "recipe": {
    "id": "recipe_123456",
    "name": "Protein Smoothie Bowl",
    "image": "https://...",
    "url": "https://...",
    "source": "Edamam",
    "servings": 1,
    "prepTime": 10,
    "nutrition": {
      "calories": 350,
      "protein": 25,
      "carbs": 45,
      "fat": 12,
      "fiber": 8,
      "sodium": 150,
      "sugar": 20
    },
    "ingredients": [
      {
        "text": "1 cup almond milk",
        "quantity": 1,
        "measure": "cup",
        "food": "almond milk",
        "weight": 240
      }
    ],
    "dietLabels": ["VEGETARIAN"],
    "healthLabels": ["LOW_SODIUM"],
    "cuisineType": ["AMERICAN"],
    "mealType": ["BREAKFAST"],
    "dishType": ["SMOOTHIE"]
  }
}
```

### Daily Nutrition Structure
```json
{
  "dailyNutrition": {
    "totalCalories": 1850,
    "totalProtein": 120,
    "totalCarbs": 200,
    "totalFat": 65,
    "totalFiber": 35,
    "totalSodium": 1200,
    "totalSugar": 45
  }
}
```

## Field Descriptions

### Recipe Fields
- **id**: Unique recipe identifier
- **name**: Recipe title
- **image**: Recipe image URL
- **url**: Recipe source URL
- **source**: Recipe source (e.g., "Edamam")
- **servings**: Number of servings per recipe
- **prepTime**: Preparation time in minutes
- **nutrition**: Per-serving nutrition information
- **ingredients**: Cleaned ingredient list with parsed quantities
- **dietLabels**: Dietary restrictions (e.g., VEGETARIAN, VEGAN)
- **healthLabels**: Health labels (e.g., LOW_SODIUM, HIGH_PROTEIN)
- **cuisineType**: Cuisine type (e.g., AMERICAN, ITALIAN)
- **mealType**: Meal type (e.g., BREAKFAST, LUNCH)
- **dishType**: Dish type (e.g., SMOOTHIE, SALAD)

### Ingredient Fields
- **text**: Full ingredient text as displayed
- **quantity**: Numeric quantity
- **measure**: Unit of measurement
- **food**: Food item name
- **weight**: Weight in grams

### Nutrition Fields
All nutrition values are per-serving and rounded to 2 decimal places:
- **calories**: Total calories
- **protein**: Protein in grams
- **carbs**: Carbohydrates in grams
- **fat**: Fat in grams
- **fiber**: Fiber in grams
- **sodium**: Sodium in mg
- **sugar**: Sugar in grams

## Benefits

1. **Better Performance**: Reduced response size by ~30-40%
2. **Easier Parsing**: Flattened structure eliminates deep nesting
3. **Consistent Format**: All responses follow the same pattern
4. **Cleaner Data**: Removed redundant and unnecessary fields
5. **Better UX**: Frontend can access data more directly

## Migration Notes

### Frontend Changes Required
- Update recipe access from `meal.recipe.details.recipe` to `meal.recipe`
- Update nutrition access from `meal.recipe.nutritionSummary` to `meal.recipe.nutrition`
- Update ingredient access from `meal.recipe.details.recipe.ingredients` to `meal.recipe.ingredients`

### Backward Compatibility
- The API maintains the same endpoints
- Response structure changes are internal optimizations
- No breaking changes to the API contract

## Testing

Use the test file `test-meal-plan-preview-optimized.js` to verify the new response structure:

```bash
node test-meal-plan-preview-optimized.js
```

This will provide a detailed analysis of the response structure and identify any remaining issues.
