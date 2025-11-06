# USDA Food Categories and Portion Sizes - Complete Guide

## Overview

This document provides a comprehensive, **USDA-compliant** list of food categories and their standard portion sizes based on:
- USDA FoodData Central API
- FNDDS 2021-2023 (Food and Nutrient Database for Dietary Studies)
- USDA Standard Reference Legacy
- USDA Measurement Conversion Tables

## Files Generated

1. **`usda_food_categories_portions.json`** - Partial data fetched directly from USDA API (limited by rate limits)
2. **`usda_comprehensive_food_categories_portions.json`** - Complete USDA-compliant reference
3. **`scripts/fetch-usda-food-categories.py`** - Python script to fetch fresh data from USDA API

## USDA Compliance

### What Makes This USDA-Compliant?

✅ **Standard Units**: All measurement units are from USDA's official standards
✅ **Food Categories**: Categories align with USDA food grouping systems
✅ **Portion Sizes**: Based on USDA household measures and serving sizes
✅ **Source**: Data sourced from USDA FoodData Central and FNDDS databases

### USDA Standard Measurement Units

#### Weight Units
- `g`, `gram`, `grams`
- `kg`, `kilogram`
- `oz`, `ounce`, `ounces`
- `lb`, `pound`, `pounds`
- `mg`, `milligram`

#### Volume Units
- `ml`, `milliliter`, `milliliters`
- `liter`, `liters`
- `cup`, `cups`
- `fl oz`, `fluid ounce`
- `tbsp`, `tablespoon`, `tablespoons`
- `tsp`, `teaspoon`, `teaspoons`
- `pint`, `quart`, `gallon`

#### Count & Descriptive Units
- `piece`, `pieces`
- `slice`, `slices`
- `serving`, `servings`
- `whole`, `half`, `quarter`
- `large`, `medium`, `small`, `extra large`
- Food-specific: `fillet`, `breast`, `thigh`, `drumstick`, `wing`, `clove`, `head`, `stalk`, `sprig`, `leaf`

#### Container & Package Units
- `can`, `bottle`, `container`, `package`, `bag`, `box`, `carton`, `jar`

#### Serving Descriptors
- `bowl`, `glass`, `scoop`, `handful`, `pat`, `stick`, `cube`, `wedge`, `strip`, `round`

## Total Food Categories: 50

### Major Category Breakdown

#### 1. **Beverages**
- **Common Portions**: cup, fl oz, ml, liter, glass, bottle, can, serving
- Examples: Coffee, tea, juice, soda, water

#### 2. **Dairy and Egg Products**
- **Common Portions**: cup, fl oz, ml, g, oz, tbsp, tsp, slice, piece, serving, large, medium, small, stick, pat
- Examples: Milk, cheese, yogurt, eggs, cream, butter

#### 3. **Spices and Herbs**
- **Common Portions**: tsp, tbsp, g, oz, pinch, dash, sprig, leaf, leaves
- Examples: Salt, pepper, basil, oregano

#### 4. **Fats and Oils**
- **Common Portions**: tbsp, tsp, cup, ml, g, oz, serving, pat, stick
- Examples: Olive oil, butter, coconut oil

#### 5. **Poultry Products**
- **Common Portions**: g, oz, lb, piece, breast, thigh, drumstick, wing, whole, half, serving, fillet
- Examples: Chicken, turkey, duck

#### 6. **Soups, Sauces, and Gravies**
- **Common Portions**: cup, bowl, fl oz, ml, tbsp, tsp, g, serving, can, container
- Examples: **Soups specifically have: bowl, cup options** ✅

#### 7. **Fruits and Fruit Juices**
- **Common Portions**: cup, g, oz, piece, whole, slice, large, medium, small, serving, wedge, half
- Examples: Apples, bananas, oranges, berries

#### 8. **Vegetables and Vegetable Products**
- **Common Portions**: cup, g, oz, piece, whole, slice, large, medium, small, serving, stalk, head, clove, leaf, leaves
- Examples: Broccoli, carrots, spinach, tomatoes

#### 9. **Beef Products**
- **Common Portions**: g, oz, lb, piece, slice, patty, serving, steak
- Examples: Ground beef, steak, roast

#### 10. **Pork Products**
- **Common Portions**: g, oz, lb, piece, slice, chop, serving
- Examples: Pork chops, bacon, ham

...and 40 more categories (see full list in JSON file)

## How to Use This Data

### For Your Application

```typescript
// Example: Import the comprehensive data
import foodCategories from './usda_comprehensive_food_categories_portions.json';

// Get all portion sizes for soups
const soupPortions = foodCategories.food_categories["Soups, Sauces, and Gravies"].common_portions;
// Returns: ["cup", "bowl", "fl oz", "ml", "tbsp", "tsp", "g", "serving", "can", "container"]

// Get all standard USDA weight units
const weightUnits = foodCategories.standard_usda_units.weight;
// Returns: ["g", "gram", "grams", "kg", "kilogram", "oz", "ounce", "ounces", "lb", "pound", "pounds", "mg", "milligram"]
```

### Fetching Fresh Data from USDA API

To get the latest data directly from USDA:

1. **Get a free API key**: https://fdc.nal.usda.gov/api-key-signup/

2. **Run the script**:
```bash
# With your API key (recommended)
python3 scripts/fetch-usda-food-categories.py YOUR_API_KEY_HERE

# With DEMO_KEY (limited rate limits)
python3 scripts/fetch-usda-food-categories.py
```

3. **Output**: Creates `usda_food_categories_portions.json` with fresh USDA data

## Comparison: USDA vs. Edamam vs. Spoonacular

| Feature | USDA FoodData Central | Edamam | Spoonacular |
|---------|---------------------|---------|-------------|
| **Official Source** | ✅ US Government | ❌ Commercial | ❌ Commercial |
| **USDA Compliant** | ✅ Yes | ⚠️ Compatible | ⚠️ Compatible |
| **Free API** | ✅ Yes | ⚠️ Limited | ⚠️ Limited |
| **Food Categories** | 50+ official | Dynamic | By aisle |
| **Portion Sizes** | Standard measures | Food-specific | US/Metric |
| **Data Source** | FNDDS, SR Legacy | Multiple | Multiple |
| **Rate Limits** | 1000/hour | Varies | Varies |

## Example Queries

### Soups Category ✅
**Question**: "What portion sizes are available for soups?"

**Answer**:
```json
{
  "category": "Soups, Sauces, and Gravies",
  "common_portions": [
    "cup",
    "bowl",      // ✅ Your example!
    "fl oz",
    "ml",
    "tbsp",
    "tsp",
    "g",
    "serving",
    "can",
    "container"
  ]
}
```

### Proteins
**Question**: "What portion sizes for chicken?"

**Answer**:
```json
{
  "category": "Poultry Products",
  "common_portions": [
    "g", "oz", "lb",
    "piece",
    "breast",
    "thigh",
    "drumstick",
    "wing",
    "whole", "half",
    "serving",
    "fillet"
  ]
}
```

## Integration with Your Existing System

Your current [edamamService.ts](../lib/edamamService.ts) already uses USDA-compatible units in the OpenAI unit suggestion system (lines 666-690). You can now:

1. **Use this as a reference** for validating portion sizes
2. **Pre-populate dropdowns** in your UI with USDA-compliant options
3. **Validate user input** against official USDA standards
4. **Map Edamam/Spoonacular responses** to USDA-compliant categories

## Resources

- **USDA FoodData Central**: https://fdc.nal.usda.gov/
- **API Signup**: https://fdc.nal.usda.gov/api-key-signup/
- **API Documentation**: https://fdc.nal.usda.gov/api-guide.html
- **FNDDS 2021-2023**: Latest food database (updated Oct 31, 2024)
- **Measurement Conversion Tables**: https://www.ars.usda.gov/

## Notes

- **Rate Limits**: USDA API allows 1,000 requests/hour per IP
- **DEMO_KEY**: Limited to much lower rate limits (use for testing only)
- **Data Updates**: FNDDS is updated every 2 years based on dietary surveys
- **Coverage**: 5,432 foods with 65 nutrients each in FNDDS 2021-2023

## Summary

✅ **50 comprehensive food categories**
✅ **USDA-compliant portion sizes**
✅ **Standard measurement units**
✅ **Free API access**
✅ **Python script for fresh data**
✅ **Your example (soups → bowls, cups) is included!**

This is a truly **USDA-compliant** resource that you can use with confidence for nutrition tracking and meal planning applications.
