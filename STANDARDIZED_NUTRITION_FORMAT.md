# Standardized Nutrition Format

## Overview
All nutrition data in the API now returns a **consistent, complete structure** regardless of whether values are 0 or missing from the database. This ensures predictable API responses and easier frontend integration.

## Standard Format Structure

### Complete Nutrition Object
```json
{
  "calories": { "quantity": 0, "unit": "kcal" },
  "macros": {
    "protein": { "quantity": 0, "unit": "g" },
    "carbs": { "quantity": 0, "unit": "g" },
    "fat": { "quantity": 0, "unit": "g" },
    "fiber": { "quantity": 0, "unit": "g" },
    "sugar": { "quantity": 0, "unit": "g" },
    "sodium": { "quantity": 0, "unit": "mg" },
    "cholesterol": { "quantity": 0, "unit": "mg" },
    "saturatedFat": { "quantity": 0, "unit": "g" },
    "transFat": { "quantity": 0, "unit": "g" },
    "monounsaturatedFat": { "quantity": 0, "unit": "g" },
    "polyunsaturatedFat": { "quantity": 0, "unit": "g" }
  },
  "micros": {
    "vitamins": {
      "vitaminA": { "quantity": 0, "unit": "IU" },
      "vitaminC": { "quantity": 0, "unit": "mg" },
      "vitaminD": { "quantity": 0, "unit": "µg" },
      "vitaminE": { "quantity": 0, "unit": "mg" },
      "vitaminK": { "quantity": 0, "unit": "µg" },
      "thiamin": { "quantity": 0, "unit": "mg" },
      "riboflavin": { "quantity": 0, "unit": "mg" },
      "niacin": { "quantity": 0, "unit": "mg" },
      "vitaminB6": { "quantity": 0, "unit": "mg" },
      "folate": { "quantity": 0, "unit": "µg" },
      "vitaminB12": { "quantity": 0, "unit": "µg" },
      "biotin": { "quantity": 0, "unit": "µg" },
      "pantothenicAcid": { "quantity": 0, "unit": "mg" }
    },
    "minerals": {
      "calcium": { "quantity": 0, "unit": "mg" },
      "iron": { "quantity": 0, "unit": "mg" },
      "magnesium": { "quantity": 0, "unit": "mg" },
      "phosphorus": { "quantity": 0, "unit": "mg" },
      "potassium": { "quantity": 0, "unit": "mg" },
      "zinc": { "quantity": 0, "unit": "mg" },
      "copper": { "quantity": 0, "unit": "mg" },
      "manganese": { "quantity": 0, "unit": "mg" },
      "selenium": { "quantity": 0, "unit": "µg" },
      "iodine": { "quantity": 0, "unit": "µg" },
      "chromium": { "quantity": 0, "unit": "µg" },
      "molybdenum": { "quantity": 0, "unit": "µg" }
    }
  }
}
```

## Updated APIs

### 1. `/api/meal-plans/drafts` (List Endpoint) ✅
**Returns:** Extended macros (basic + sugar, sodium, cholesterol, saturated fat, etc.) in summary format

**Response Structure:**
```json
{
  "nutrition": {
    "byDay": [
      {
        "day": 1,
        "date": "2025-01-15",
        "meals": {
          "breakfast": {
            "nutrition": {
              "calories": 500,
              "protein": 25.0,
              "carbs": 60.0,
              "fat": 15.0,
              "fiber": 8.0,
              "sugar": 10.0,
              "sodium": 400.0,
              "cholesterol": 100.0,
              "saturatedFat": 5.0,
              "transFat": 0.0,
              "monounsaturatedFat": 4.0,
              "polyunsaturatedFat": 3.0
            }
          }
        },
        "dayTotal": {
          "calories": 2000,
          "protein": 120.0,
          // ... all extended macros ...
        }
      }
    ],
    "overallTotal": {
      "calories": 14000,
      // ... all extended macros ...
    },
    "dailyAverage": {
      "calories": 2000,
      // ... all extended macros ...
    }
  }
}
```

**Note:** This is a summary endpoint and does NOT include micronutrients (vitamins/minerals) to keep response size reasonable. Use detail endpoint for full micronutrient data.

### 2. `/api/meal-plans/draft` (Detail Endpoint) ✅
**Returns:** Full nutrition including extended macros AND micronutrients

**Response includes:**
- Complete macros (11 fields)
- Complete vitamins (13 fields)
- Complete minerals (12 fields)

### 3. `/api/meal-plans/drafts/[id]` (Single Draft Detail) ✅
**Returns:** Full nutrition including extended macros AND micronutrients

## Using NutritionMappingService

### Method 1: Get Complete Template
Use this to create a nutrition object with all fields initialized to 0:

```typescript
import { NutritionMappingService } from '@/lib/nutritionMappingService';

// Get complete template with all fields = 0
const nutrition = NutritionMappingService.getCompleteNutritionTemplate();
```

### Method 2: Ensure Complete Nutrition
Use this to fill in missing fields in existing nutrition data:

```typescript
import { NutritionMappingService } from '@/lib/nutritionMappingService';

// Partial nutrition from database
const partialNutrition = {
  calories: { quantity: 500, unit: 'kcal' },
  macros: {
    protein: { quantity: 25, unit: 'g' },
    carbs: { quantity: 60, unit: 'g' }
    // Missing: fat, fiber, sugar, sodium, etc.
  }
  // Missing: micros entirely
};

// Get complete nutrition with all missing fields filled with 0
const completeNutrition = NutritionMappingService.ensureCompleteNutrition(partialNutrition);

// Result includes ALL macros and micros, with provided values + 0s for missing ones
```

### Method 3: Transform Provider Data
Use these for converting Edamam or Spoonacular responses:

```typescript
// Edamam format → standardized format
const standardized = NutritionMappingService.transformEdamamNutrition(edamamData, servings);

// Spoonacular format → standardized format
const standardized = NutritionMappingService.transformSpoonacularNutrition(spoonacularData);
```

## Key Benefits

### 1. Consistent API Responses
- Frontend can always expect same fields
- No need for null checks or fallbacks
- Easier to map to UI components

### 2. Type Safety
All nutrition objects conform to `StandardizedNutrition` interface:
```typescript
import { StandardizedNutrition } from '@/lib/nutritionMappingService';

function processNutrition(nutrition: StandardizedNutrition) {
  // TypeScript guarantees all fields exist
  console.log(nutrition.macros.protein.quantity);
  console.log(nutrition.micros.vitamins.vitaminC.quantity);
}
```

### 3. Zero Values vs Missing Values
- `0` = Data explicitly shows 0 (e.g., sugar-free food)
- Still returned in standard format for consistency
- Frontend can decide whether to display 0s or hide them

## Migration Guide for Other Endpoints

If you need to update another endpoint to use standardized nutrition:

1. **Import the service:**
```typescript
import { NutritionMappingService, StandardizedNutrition } from '@/lib/nutritionMappingService';
```

2. **For provider responses, use transform methods:**
```typescript
const nutrition = NutritionMappingService.transformEdamamNutrition(edamamData, servings);
```

3. **For cached/database data, use ensure method:**
```typescript
const nutrition = NutritionMappingService.ensureCompleteNutrition(cachedNutrition);
```

4. **For new nutrition objects, use template:**
```typescript
const nutrition = NutritionMappingService.getCompleteNutritionTemplate();
// Then populate with actual values
```

## API Response Size Considerations

### List Endpoints (e.g., `/api/meal-plans/drafts`)
- ✅ Include: Extended macros (11 fields)
- ❌ Exclude: Micronutrients (25 fields) - too verbose for lists
- Keeps response size reasonable while providing useful summary

### Detail Endpoints (e.g., `/api/meal-plans/draft`, `/api/meal-plans/drafts/[id]`)
- ✅ Include: Extended macros (11 fields)
- ✅ Include: Micronutrients (25 fields)
- Provides complete nutrition data when user needs it

## Frontend Integration Example

```typescript
// TypeScript interface matches backend
interface Nutrition {
  calories: { quantity: number; unit: string };
  macros: {
    protein: { quantity: number; unit: string };
    carbs: { quantity: number; unit: string };
    fat: { quantity: number; unit: string };
    fiber: { quantity: number; unit: string };
    sugar: { quantity: number; unit: string };
    sodium: { quantity: number; unit: string };
    cholesterol: { quantity: number; unit: string };
    saturatedFat: { quantity: number; unit: string };
    transFat: { quantity: number; unit: string };
    monounsaturatedFat: { quantity: number; unit: string };
    polyunsaturatedFat: { quantity: number; unit: string };
  };
  micros?: {
    vitamins: Record<string, { quantity: number; unit: string }>;
    minerals: Record<string, { quantity: number; unit: string }>;
  };
}

// Use safely without null checks
function renderNutrition(nutrition: Nutrition) {
  return (
    <div>
      <p>Calories: {nutrition.calories.quantity} {nutrition.calories.unit}</p>
      <p>Protein: {nutrition.macros.protein.quantity}g</p>
      <p>Carbs: {nutrition.macros.carbs.quantity}g</p>
      <p>Fat: {nutrition.macros.fat.quantity}g</p>
      <p>Fiber: {nutrition.macros.fiber.quantity}g</p>
      <p>Sugar: {nutrition.macros.sugar.quantity}g</p>
      <p>Sodium: {nutrition.macros.sodium.quantity}mg</p>
      
      {/* Optional: Show micronutrients if available */}
      {nutrition.micros && (
        <>
          <h3>Vitamins</h3>
          {Object.entries(nutrition.micros.vitamins).map(([key, value]) => (
            <p key={key}>{key}: {value.quantity} {value.unit}</p>
          ))}
        </>
      )}
    </div>
  );
}
```

## Related Files

- **Service:** `/lib/nutritionMappingService.ts`
- **Updated APIs:**
  - `/api/meal-plans/drafts.ts` (extended macros)
  - `/api/meal-plans/draft.ts` (full nutrition with micros)
  - `/api/meal-plans/drafts/[id].ts` (full nutrition with micros)

## Testing

Test that all endpoints return consistent structures:

```bash
# List endpoint (extended macros only)
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Detail endpoint (full nutrition)
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-draft",
    "draftId": "YOUR_DRAFT_ID"
  }'
```

## Summary

✅ **What Changed:**
1. `/api/meal-plans/drafts` now returns **all extended macros** (11 fields) even if 0
2. `NutritionMappingService.getCompleteNutritionTemplate()` is now **public**
3. New `NutritionMappingService.ensureCompleteNutrition()` method for filling missing fields
4. All nutrition objects follow consistent structure

✅ **Benefits:**
- Predictable API responses
- Type-safe nutrition handling
- Easier frontend integration
- Clear separation between list (summary) and detail (complete) endpoints

