# Micronutrients Support in Manual Recipe Creation

## Overview

The ingredient nutrition API now returns **complete nutrition data** including:
- **Calories**
- **Macros** (protein, carbs, fat, fiber, sugar, sodium, cholesterol, saturatedFat, etc.)
- **Vitamins** (A, C, D, E, K, B-vitamins, etc.)
- **Minerals** (calcium, iron, magnesium, potassium, zinc, etc.)

## Updated API Response Format

### Ingredient Nutrition API Response

**Endpoint:** `GET /api/ingredients/nutrition`

**Example Response:**
```json
{
  "success": true,
  "ingredient": "1 medium banana",
  "source": "spoonacular",
  "nutrition": {
    "calories": 105.02,
    "macros": {
      "protein": 1.29,
      "carbs": 26.9,
      "fat": 0.39,
      "fiber": 3.07,
      "sugar": 14.4,
      "sodium": 1.18,
      "cholesterol": 0,
      "saturatedFat": 0.13,
      "transFat": 0,
      "monounsaturatedFat": 0,
      "polyunsaturatedFat": 0
    },
    "micros": {
      "vitamins": {
        "vitaminA": 75.52,
        "vitaminC": 10.27,
        "vitaminD": 0,
        "vitaminE": 0.12,
        "vitaminK": 0.59,
        "thiamin": 0,
        "riboflavin": 0,
        "niacin": 0,
        "vitaminB6": 0.43,
        "folate": 23.6,
        "vitaminB12": 0,
        "biotin": 0,
        "pantothenicAcid": 0
      },
      "minerals": {
        "calcium": 5.9,
        "iron": 0.31,
        "magnesium": 31.86,
        "phosphorus": 25.96,
        "potassium": 422.44,
        "zinc": 0.18,
        "copper": 0.09,
        "manganese": 0.32,
        "selenium": 1.18,
        "iodine": 0,
        "chromium": 0,
        "molybdenum": 0
      }
    }
  }
}
```

## How to Use in Manual Recipe Creation

### Step 1: Get Complete Nutrition Data

```bash
curl -X GET "https://caloriescience-api.vercel.app/api/ingredients/nutrition?ingredient=banana&amount=1&unit=medium" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Step 2: Include in Recipe Payload

You can now include the complete nutrition data (with micronutrients) when creating a custom recipe:

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/recipes/custom" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Nutrient-Rich Smoothie",
    "description": "Complete nutrition tracking",
    "ingredients": [
      {
        "name": "banana",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": {
          "calories": 105.02,
          "macros": {
            "protein": 1.29,
            "carbs": 26.9,
            "fat": 0.39,
            "fiber": 3.07,
            "sugar": 14.4,
            "sodium": 1.18,
            "cholesterol": 0,
            "saturatedFat": 0.13
          },
          "micros": {
            "vitamins": {
              "vitaminA": 75.52,
              "vitaminC": 10.27,
              "vitaminE": 0.12,
              "vitaminK": 0.59,
              "vitaminB6": 0.43,
              "folate": 23.6
            },
            "minerals": {
              "calcium": 5.9,
              "iron": 0.31,
              "magnesium": 31.86,
              "phosphorus": 25.96,
              "potassium": 422.44,
              "zinc": 0.18,
              "copper": 0.09,
              "manganese": 0.32,
              "selenium": 1.18
            }
          }
        }
      }
    ],
    "servings": 1,
    "isPublic": true
  }'
```

## Required Format

The system now **only accepts** the structured format with `macros` and `micros`:

### Nutrition Data Structure (Required)
```json
"nutritionData": {
  "calories": 105.02,
  "macros": {
    "protein": 1.29,
    "carbs": 26.9,
    "fat": 0.39,
    "fiber": 3.07,
    "sugar": 14.4,
    "sodium": 1.18,
    "cholesterol": 0,
    "saturatedFat": 0.13,
    "transFat": 0,
    "monounsaturatedFat": 0,
    "polyunsaturatedFat": 0
  },
  "micros": {
    "vitamins": {
      "vitaminA": 75.52,
      "vitaminC": 10.27,
      // ... other vitamins
    },
    "minerals": {
      "calcium": 5.9,
      "iron": 0.31,
      // ... other minerals
    }
  },
  "weight": 118  // Optional: weight in grams
}
```

**Required Fields:**
- `calories` (number)
- `macros` (object with protein, carbs, fat, fiber, sugar, sodium)
- `micros` (object with vitamins and minerals objects)

The `customRecipeService` will automatically aggregate all macros and micronutrients from all ingredients.

## Complete Example with Multiple Ingredients

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/recipes/custom" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "High-Vitamin Green Smoothie",
    "description": "Packed with vitamins A, C, K and minerals",
    "ingredients": [
      {
        "name": "spinach",
        "quantity": 2,
        "unit": "cups",
        "nutritionData": {
          "calories": 14,
          "macros": {
            "protein": 1.72,
            "carbs": 2.18,
            "fat": 0.23,
            "fiber": 1.34,
            "sugar": 0.26,
            "sodium": 47.34
          },
          "micros": {
            "vitamins": {
              "vitaminA": 5626,
              "vitaminC": 16.88,
              "vitaminE": 1.22,
              "vitaminK": 289.8,
              "folate": 116.6
            },
            "minerals": {
              "calcium": 59.4,
              "iron": 1.62,
              "magnesium": 47.34,
              "potassium": 335.4,
              "zinc": 0.32
            }
          }
        }
      },
      {
        "name": "banana",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": {
          "calories": 105.02,
          "macros": {
            "protein": 1.29,
            "carbs": 26.9,
            "fat": 0.39,
            "fiber": 3.07,
            "sugar": 14.4,
            "sodium": 1.18
          },
          "micros": {
            "vitamins": {
              "vitaminA": 75.52,
              "vitaminC": 10.27,
              "vitaminB6": 0.43,
              "folate": 23.6
            },
            "minerals": {
              "calcium": 5.9,
              "iron": 0.31,
              "magnesium": 31.86,
              "potassium": 422.44
            }
          }
        }
      },
      {
        "name": "almond milk",
        "quantity": 1,
        "unit": "cup",
        "nutritionData": {
          "calories": 39.36,
          "macros": {
            "protein": 1.55,
            "carbs": 1.52,
            "fat": 2.88,
            "fiber": 0.49,
            "sugar": 0,
            "sodium": 185.92
          },
          "micros": {
            "vitamins": {
              "vitaminA": 499.2,
              "vitaminC": 0,
              "vitaminE": 7.36,
              "vitaminD": 2.4
            },
            "minerals": {
              "calcium": 516,
              "iron": 0.7,
              "magnesium": 16.8,
              "potassium": 176,
              "zinc": 0.29
            }
          }
        }
      }
    ],
    "servings": 1,
    "instructions": [
      "Add spinach and almond milk to blender",
      "Add banana",
      "Blend until smooth",
      "Serve immediately"
    ],
    "healthLabels": ["high-vitamin", "high-potassium", "dairy-free"],
    "mealTypes": ["breakfast"],
    "isPublic": true
  }'
```

### Expected Result

The backend will automatically aggregate all micronutrients:

- **Total Vitamin A:** 5626 + 75.52 + 499.2 = 6200.72 IU
- **Total Vitamin C:** 16.88 + 10.27 = 27.15 mg
- **Total Potassium:** 335.4 + 422.44 + 176 = 933.84 mg
- **Total Calcium:** 59.4 + 5.9 + 516 = 581.3 mg
- **And so on...**

The `nutritionDetails` field in the database will store all aggregated micronutrients.

## UI Implementation Notes

### Frontend Should:

1. **Fetch Complete Nutrition Data**
   ```javascript
   const response = await fetch(
     `/api/ingredients/nutrition?ingredient=${ing}&amount=${amt}&unit=${unit}`
   );
   const { nutrition } = await response.json();
   // nutrition now has: calories, macros{}, micros{ vitamins{}, minerals{} }
   ```

2. **Display Micronutrients to User** (Optional but recommended)
   - Show key vitamins (A, C, D, E, K)
   - Show key minerals (calcium, iron, magnesium, potassium)
   - Allow nutritionists to see complete nutrition profile

3. **Include Full Data in Recipe Payload**
   ```javascript
   const ingredient = {
     name: ingredientName,
     quantity: amount,
     unit: unit,
     nutritionData: {
       calories: nutrition.calories,
       macros: nutrition.macros,      // Include full macros
       micros: nutrition.micros        // Include full micros
     }
   };
   ```

4. **Show Aggregated Nutrition** (After recipe creation)
   - Display total vitamins and minerals for the recipe
   - Show % Daily Value (if implementing RDA tracking)
   - Highlight nutrient-rich recipes

## Benefits

✅ **Complete Nutrient Tracking** - Track all vitamins and minerals  
✅ **RDA Compliance** - Can calculate % of Recommended Daily Allowance  
✅ **Better Meal Planning** - Ensure clients get balanced micronutrients  
✅ **Health Goal Support** - Target specific vitamin/mineral needs  
✅ **Scientific Accuracy** - Full nutritional profile for each recipe  

## Example: Checking Recipe Nutrition

After creating a recipe, check the `nutritionDetails` field to see aggregated micronutrients:

```bash
curl -X GET "https://caloriescience-api.vercel.app/api/recipes/RECIPE_ID/details" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

The response will include `nutritionDetails` with aggregated values like:
```json
{
  "nutritionDetails": {
    "vitamins_vitaminA": 6200.72,
    "vitamins_vitaminC": 27.15,
    "vitamins_vitaminK": 289.8,
    "minerals_calcium": 581.3,
    "minerals_iron": 2.63,
    "minerals_potassium": 933.84,
    ...
  }
}
```

## Migration Notes

- **Breaking Change:** The system now requires the structured format with `macros` and `micros`
- All UI implementations must use the new format when creating recipes
- The `/api/ingredients/nutrition` endpoint returns data in the required format
- Simply use the response from the nutrition API directly in your recipe payload

---

**Last Updated:** October 23, 2025  
**API Version:** v2 (with micronutrients support)

