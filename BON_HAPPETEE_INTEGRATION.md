# Bon Happetee Integration

## Overview

Bon Happetee is integrated as a third recipe provider (alongside Edamam and Spoonacular) for manual meal plans. It provides Indian food database with extensive nutrition data including vitamins, minerals, and allergen information.

## Features

- **Extensive Nutrition Data**: Includes macros, 13+ vitamins, 9+ minerals, amino acids
- **Allergen Information**: Explicit allergen data from disorder endpoint
- **Health Disorder Risks**: Information about diabetes, heart disease, IBS risks
- **Multiple Serving Sizes**: Supports various measures (bowl, plate, glass, etc.)
- **Indian Cuisine Focus**: Extensive database of Indian foods

## API Endpoints

### 1. Search Foods
```
GET https://api.bonhappetee.com/search?value={query}
```
Returns array of food items with basic nutrition

### 2. Get Food Details
```
GET https://api.bonhappetee.com/food?food_item_id={uuid}
```
Returns complete nutrition data with 100+ nutrients

### 3. Get Allergen/Disorder Info
```
GET https://api.bonhappetee.com/food/disorder?food_item_id={uuid}
```
Returns allergens and health disorder risks

## Usage in Manual Meal Plans

### Add Bon Happetee Recipe

```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "draftId": "manual-uuid",
    "day": 1,
    "mealName": "lunch",
    "recipe": {
      "id": "292209f9-4d43-4c4a-bd90-c9a63bbce447",
      "provider": "bonhappetee",
      "source": "api"
    }
  }'
```

### Response Structure

The recipe will include:
- **Full nutrition**: calories, macros, vitamins, minerals
- **Allergens**: Explicit allergen list (e.g., ["milk", "nuts"])
- **Serving measures**: Multiple serving size options
- **Health labels**: Positive/negative health indicators
- **Disorder risks**: Risk factors for diabetes, heart disease, IBS

## Recipe ID Format

- **Edamam**: `recipe_abc123...` (starts with "recipe_")
- **Spoonacular**: `663235` (numeric)
- **Bon Happetee**: `292209f9-4d43-4c4a-bd90-c9a63bbce447` (UUID format)

The system auto-detects provider based on ID format.

## Environment Variables

Add to your `.env` or Vercel environment:

```
BON_HAPPETEE_API_KEY=fjRosLrdMT3lRmLIwAAgR6ouHRx9xd5zadHbK4ax
```

## Database Schema

### Migration 064: Bon Happetee Support

Adds:
1. `bonhappetee` value to `recipe_provider` enum
2. `allergens TEXT[]` column to `cached_recipes` table

Run migration:
```sql
ALTER TYPE recipe_provider ADD VALUE IF NOT EXISTS 'bonhappetee';
ALTER TABLE cached_recipes ADD COLUMN IF NOT EXISTS allergens TEXT[] DEFAULT '{}';
```

## Nutrient Mapping

Bon Happetee uses USDA nutrient tag names. Key mappings:

### Macros
- `ENERC_KCAL` → calories
- `PROCNT` → protein
- `CHOCDF` → carbs
- `FAT` → fat
- `FIBTG` → fiber
- `SUGAR` → sugar
- `NA` → sodium
- `CHOLE` → cholesterol
- `FASAT` → saturatedFat
- `FAMS` → monounsaturatedFat
- `FAPU` → polyunsaturatedFat

### Vitamins
- `VITA_RAE` → vitaminA
- `VITC` → vitaminC
- `VITD` → vitaminD
- `VITE` → vitaminE
- `VITK1` → vitaminK
- `THIA` → thiamin
- `RIBF` → riboflavin
- `NIA` → niacin
- `PANTAC` → pantothenicAcid
- `VITB6A` → vitaminB6
- `VITB12` → vitaminB12
- `FOL` → folate

### Minerals
- `CA` → calcium
- `FE` → iron
- `MG` → magnesium
- `P` → phosphorus
- `K` → potassium
- `ZN` → zinc
- `CU` → copper
- `MN` → manganese
- `SE` → selenium

## Limitations

1. **No Advanced Filters**: Bon Happetee only supports name-based search (no cuisine, diet, calorie filters)
2. **No Images**: Bon Happetee doesn't provide recipe images
3. **No Ingredients Breakdown**: Provides nutrition for the complete food, not individual ingredients
4. **No Instructions**: No cooking instructions available
5. **Manual Meal Plans Only**: Currently integrated only for manual meal plans

## Benefits

1. **Indian Food Database**: Extensive coverage of Indian cuisine
2. **Accurate Allergens**: Explicit allergen data (unlike extracting from labels)
3. **Comprehensive Nutrition**: 100+ nutrients including amino acids
4. **Health Insights**: Disorder risk information for diabetes, heart disease, IBS
5. **Multiple Measures**: Flexible serving size options (bowl, plate, cup, etc.)

## Future Enhancements

- [ ] Add Bon Happetee to recipe search client API
- [ ] Integrate with automated meal plan generation
- [ ] Use disorder risk data for meal plan optimization
- [ ] Extract allergens from Edamam/Spoonacular health labels
- [ ] Add Bon Happetee image support if API provides it

