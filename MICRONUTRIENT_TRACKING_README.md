# Micronutrient Tracking in Ingredient Customization

## Overview

The ingredient customization system now includes **comprehensive micronutrient tracking** when ingredients are added, replaced, or deleted from recipes. Previously, only macronutrients (calories, protein, carbs, fat, fiber) were updated during ingredient modifications. Now, the system tracks all vitamins and minerals as well.

## Problem Solved

### Before
When a user modified ingredients in a recipe:
- ✅ Macros updated (calories, protein, carbs, fat, fiber)
- ❌ Micros ignored (vitamins A, C, D, E, K, B vitamins, calcium, iron, etc.)

**Example Impact:**
- Replace chicken with tofu → Iron, B12, calcium changes were lost
- Add spinach → Vitamin K, iron, folate additions were ignored
- Remove dairy → Calcium, vitamin D reductions were not tracked

### After
All nutrition data is now tracked:
- ✅ Macros updated (11 nutrients including saturated fat, sodium, cholesterol)
- ✅ Vitamins tracked (13 vitamins including A, C, D, E, K, B-complex)
- ✅ Minerals tracked (12 minerals including calcium, iron, magnesium, zinc)

## Architecture

### 1. Nutrition Mapping Service (`lib/nutritionMappingService.ts`)

A centralized service that handles nutrition data standardization across providers:

```typescript
export interface StandardizedNutrition {
  calories: { quantity: number; unit: string };
  macros: {
    protein, carbs, fat, fiber, sugar, sodium, cholesterol,
    saturatedFat, transFat, monounsaturatedFat, polyunsaturatedFat
  };
  micros: {
    vitamins: {
      vitaminA, vitaminC, vitaminD, vitaminE, vitaminK,
      thiamin, riboflavin, niacin, vitaminB6, folate,
      vitaminB12, biotin, pantothenicAcid
    };
    minerals: {
      calcium, iron, magnesium, phosphorus, potassium,
      zinc, copper, manganese, selenium, iodine,
      chromium, molybdenum
    }
  };
}
```

**Key Features:**
- Maps Edamam format (e.g., `VITA_RAE`, `VITC`, `CA`) to standardized keys
- Maps Spoonacular format (e.g., `Vitamin A`, `Vitamin C`, `Calcium`) to standardized keys
- Provides unified format for all nutrition calculations

### 2. Provider-Specific Mappings

#### Edamam Format
```typescript
{
  'ENERC_KCAL': { key: 'calories', category: 'calories' },
  'PROCNT': { key: 'protein', category: 'macros' },
  'VITA_RAE': { key: 'vitaminA', category: 'vitamins' },
  'CA': { key: 'calcium', category: 'minerals' },
  // ... 40+ nutrient mappings
}
```

#### Spoonacular Format
```typescript
{
  'Calories': { key: 'calories', category: 'calories' },
  'Protein': { key: 'protein', category: 'macros' },
  'Vitamin A': { key: 'vitaminA', category: 'vitamins' },
  'Calcium': { key: 'calcium', category: 'minerals' },
  // ... 40+ nutrient mappings
}
```

### 3. Nutrition Calculation Methods

The mapping service provides complete nutrition arithmetic:

```typescript
// Add two nutrition objects (including all micros)
NutritionMappingService.addNutrition(base, toAdd)

// Subtract nutrition (including all micros)
NutritionMappingService.subtractNutrition(base, toSubtract)

// Multiply by factor (including all micros)
NutritionMappingService.multiplyNutrition(nutrition, factor)

// Transform from provider-specific format
NutritionMappingService.transformEdamamNutrition(edamamData)
NutritionMappingService.transformSpoonacularNutrition(spoonacularData)
```

## Updated Services

### Ingredient Customization Service

**Location:** `lib/ingredientCustomizationService.ts`

**Changes:**
1. Now uses `StandardizedNutrition` format instead of simple objects
2. All modification types (replace, omit, add, reduce) track micronutrients
3. Includes `micronutrientsIncluded` flag in results

**Example Flow for "Replace Chicken with Tofu":**

```typescript
// 1. Fetch nutrition for both ingredients
const chickenNutrition = await edamamService.getIngredientNutrition("chicken breast 100g");
const tofuNutrition = await edamamService.getIngredientNutrition("tofu 100g");

// 2. Transform to standardized format (includes all micros)
const chickenStandardized = NutritionMappingService.transformEdamamNutrition(chickenNutrition);
const tofuStandardized = NutritionMappingService.transformEdamamNutrition(tofuNutrition);

// 3. Calculate difference (all micros automatically included)
let adjustedNutrition = baseRecipeNutrition;
adjustedNutrition = NutritionMappingService.subtractNutrition(adjustedNutrition, chickenStandardized);
adjustedNutrition = NutritionMappingService.addNutrition(adjustedNutrition, tofuStandardized);

// Result includes:
// - Macros: protein change (chicken 31g → tofu 8g)
// - Micros: B12 decrease, calcium increase, iron change, etc.
```

### Customized Recipe API

**Location:** `api/recipes/customized.ts`

**Changes:**
1. Detects standardized nutrition format vs. legacy format
2. Applies micronutrient data to `nutritionDetails.micros`
3. Returns comprehensive nutrition comparison including micros

**Response Format:**

```json
{
  "success": true,
  "data": {
    "recipeName": "Tofu Stir Fry",
    "nutritionDetails": {
      "calories": { "quantity": 350, "unit": "kcal" },
      "macros": {
        "protein": { "quantity": 25, "unit": "g" },
        "carbs": { "quantity": 40, "unit": "g" },
        "fat": { "quantity": 12, "unit": "g" }
      },
      "micros": {
        "vitamins": {
          "vitaminA": { "quantity": 2500, "unit": "IU" },
          "vitaminC": { "quantity": 45, "unit": "mg" },
          "vitaminB12": { "quantity": 0.5, "unit": "µg" }
        },
        "minerals": {
          "calcium": { "quantity": 300, "unit": "mg" },
          "iron": { "quantity": 8, "unit": "mg" },
          "zinc": { "quantity": 3, "unit": "mg" }
        }
      }
    }
  },
  "customizations": {
    "micronutrientsIncluded": true,
    "nutritionComparison": {
      "macros": {
        "original": { "calories": 400, "protein": "35g" },
        "customized": { "calories": 350, "protein": "25g" }
      },
      "micros": {
        "original": {
          "vitamins": { "vitaminB12": { "quantity": 2.4, "unit": "µg" } },
          "minerals": { "calcium": { "quantity": 50, "unit": "mg" } }
        },
        "customized": {
          "vitamins": { "vitaminB12": { "quantity": 0.5, "unit": "µg" } },
          "minerals": { "calcium": { "quantity": 300, "unit": "mg" } }
        }
      }
    }
  }
}
```

## Data Sources

### Edamam Nutrition Data API

When you call `edamamService.getIngredientNutrition()`, it returns:
- Full `totalNutrients` object with 40+ nutrients
- Each nutrient includes: label, quantity, unit
- Codes like `VITA_RAE`, `VITC`, `CA`, `FE`, etc.

**Example Response:**
```json
{
  "calories": 165,
  "totalNutrients": {
    "ENERC_KCAL": { "label": "Energy", "quantity": 165, "unit": "kcal" },
    "PROCNT": { "label": "Protein", "quantity": 31, "unit": "g" },
    "VITA_RAE": { "label": "Vitamin A", "quantity": 16, "unit": "µg" },
    "VITC": { "label": "Vitamin C", "quantity": 0, "unit": "mg" },
    "CA": { "label": "Calcium", "quantity": 15, "unit": "mg" },
    "FE": { "label": "Iron", "quantity": 0.9, "unit": "mg" },
    "VITB12": { "label": "Vitamin B12", "quantity": 0.34, "unit": "µg" }
  }
}
```

### Spoonacular API

Similar structure but different naming:
- `Vitamin A`, `Vitamin C`, `Calcium`, `Iron`
- Array format: `[{ name: "Vitamin A", amount: 100, unit: "IU" }]`

## Tracked Nutrients

### Macronutrients (11)
- Calories (kcal)
- Protein (g)
- Carbohydrates (g)
- Fat (g)
- Fiber (g)
- Sugar (g)
- Sodium (mg)
- Cholesterol (mg)
- Saturated Fat (g)
- Trans Fat (g)
- Monounsaturated Fat (g)
- Polyunsaturated Fat (g)

### Vitamins (13)
- Vitamin A (IU or µg)
- Vitamin C (mg)
- Vitamin D (IU or µg)
- Vitamin E (mg)
- Vitamin K (µg)
- Thiamin / B1 (mg)
- Riboflavin / B2 (mg)
- Niacin / B3 (mg)
- Vitamin B6 (mg)
- Folate / B9 (µg)
- Vitamin B12 (µg)
- Biotin (µg)
- Pantothenic Acid (mg)

### Minerals (12)
- Calcium (mg)
- Iron (mg)
- Magnesium (mg)
- Phosphorus (mg)
- Potassium (mg)
- Zinc (mg)
- Copper (mg)
- Manganese (mg)
- Selenium (µg)
- Iodine (µg)
- Chromium (µg)
- Molybdenum (µg)

## Use Cases

### 1. Replace Ingredient
```typescript
// Replace "chicken breast 100g" with "tofu 100g"
{
  type: 'replace',
  originalIngredient: 'chicken breast 100g',
  newIngredient: 'tofu 100g'
}

// Result: All macros + micros recalculated
// - Protein: 31g → 8g (decrease)
// - B12: 0.34µg → 0µg (significant decrease)
// - Calcium: 15mg → 350mg (significant increase)
// - Iron: 0.9mg → 5.4mg (increase)
```

### 2. Add Ingredient
```typescript
// Add "spinach 50g"
{
  type: 'add',
  newIngredient: 'spinach 50g'
}

// Result: Nutrition increased by spinach values
// - Vitamin K: +241µg (very high increase)
// - Iron: +1.35mg
// - Folate: +97µg
// - Calcium: +50mg
```

### 3. Remove Ingredient
```typescript
// Remove "milk 1 cup"
{
  type: 'omit',
  originalIngredient: 'milk 1 cup'
}

// Result: Nutrition decreased by milk values
// - Calcium: -300mg (significant loss)
// - Vitamin D: -100IU (significant loss)
// - B12: -1.2µg
// - Protein: -8g
```

### 4. Reduce Ingredient
```typescript
// Reduce "olive oil 2 tbsp" by 50%
{
  type: 'reduce',
  originalIngredient: 'olive oil 2 tbsp',
  reductionPercent: 50
}

// Result: Half the nutrition removed
// - Fat: -14g
// - Calories: -120kcal
// - Vitamin E: -2.9mg
```

## Benefits

### For Nutritionists
1. **Complete Nutrition Tracking:** See all micronutrient changes when modifying recipes
2. **Better Client Care:** Identify potential deficiencies (e.g., B12 loss when removing meat)
3. **Informed Decisions:** Know the full nutritional impact of substitutions

### For Clients
1. **Dietary Goals:** Track specific nutrient targets (e.g., calcium for bone health)
2. **Health Conditions:** Monitor nutrients critical for conditions (e.g., iron for anemia)
3. **Complete Picture:** Understand full nutritional value of customized recipes

### For the System
1. **Accuracy:** Precise nutrition calculations using API data
2. **Consistency:** Standardized format across all providers
3. **Scalability:** Easy to add new nutrients or providers

## Logging

The system includes comprehensive logging:

```
🔬 Starting Edamam ingredient modifications with micronutrient tracking
📝 Processing modification: replace - chicken breast 100g
  🔄 Replace: chicken breast 100g → tofu 100g
     Old: 165 kcal, Vitamin C: 0mg
     New: 76 kcal, Vitamin C: 0.1mg
📊 Adjusting for 2 servings
✅ Edamam modifications complete
   Final: 350 kcal
   Micros tracked: true
🔬 Applying custom nutrition with micronutrient data
  ✅ Custom nutrition includes micronutrients
  📊 Updated 8 vitamins
  📊 Updated 7 minerals
✅ Applied custom nutrition
📊 Including micronutrient comparison in response
```

## Backward Compatibility

The system maintains backward compatibility:

1. **Simplified Format Support:** Old format (just macros) still works
2. **Optional Micros:** APIs don't break if micros aren't available
3. **Gradual Migration:** Existing customizations continue to work

## Future Enhancements

1. **Spoonacular Ingredient API:** Implement native Spoonacular ingredient nutrition
2. **Custom Ingredient Database:** Allow manual nutrient entry for custom ingredients
3. **Nutrient Recommendations:** Compare against DRI/RDA values
4. **Visual Comparisons:** Charts showing micronutrient changes
5. **Deficiency Warnings:** Alert when modifications cause significant nutrient losses

## Testing

To test the implementation:

1. **Test Replace:** Replace high-B12 ingredient (meat) with low-B12 (vegetable)
2. **Test Add:** Add high-iron ingredient (spinach) and verify iron increase
3. **Test Remove:** Remove dairy and verify calcium/vitamin D decrease
4. **Test Provider Mapping:** Verify Edamam and Spoonacular data both work
5. **Test Edge Cases:** Empty ingredients, missing data, API failures

## Code Examples

### Using the Mapping Service Directly

```typescript
import { NutritionMappingService } from './lib/nutritionMappingService';

// Transform Edamam data
const edamamData = await edamamService.getIngredientNutrition('chicken 100g');
const standardized = NutritionMappingService.transformEdamamNutrition(edamamData);

// Perform calculations
const doubled = NutritionMappingService.multiplyNutrition(standardized, 2);
const combined = NutritionMappingService.addNutrition(nutrition1, nutrition2);

// Convert to simplified format (backward compat)
const simple = NutritionMappingService.toSimplifiedFormat(standardized);
```

### Using Ingredient Customization Service

```typescript
import { IngredientCustomizationService } from './lib/ingredientCustomizationService';

const service = new IngredientCustomizationService();

const result = await service.applyModifications(
  recipeId,
  'edamam',
  originalNutrition,
  [
    { type: 'replace', originalIngredient: 'chicken', newIngredient: 'tofu' }
  ],
  2 // servings
);

console.log('Micronutrients included:', result.micronutrientsIncluded);
console.log('Vitamin B12 before:', result.originalNutrition.micros.vitamins.vitaminB12);
console.log('Vitamin B12 after:', result.modifiedNutrition.micros.vitamins.vitaminB12);
```

## Summary

The micronutrient tracking system provides **complete nutritional transparency** when customizing recipes. Every ingredient modification now updates not just calories and macros, but all vitamins and minerals tracked by the nutrition APIs. This enables nutritionists to make more informed decisions and clients to better understand the full nutritional impact of their meal customizations.


