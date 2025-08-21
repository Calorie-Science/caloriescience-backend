# Recalculation API Endpoint

## Overview

The recalculation API endpoint (`/api/clients/recalculate`) allows nutritionists to preview updated EER, macros, and micronutrients based on changes to client parameters (weight, height, or EER calories) without actually updating the client data. This enables nutritionists to review the calculated values before committing them.

## Endpoint Details

- **URL**: `POST /api/clients/recalculate`
- **Authentication**: Required (Bearer token)
- **Purpose**: Calculate new values based on parameter changes
- **Data Modification**: None (read-only calculations)

## Request Body

```json
{
  "clientId": "uuid-required",
  "weightKg": 65,        // optional - new weight in kg
  "heightCm": 170,       // optional - new height in cm
  "eerCalories": 2500    // optional - new EER calories
}
```

### Parameters

- **`clientId`** (required): UUID of the client to recalculate for
- **`weightKg`** (optional): New weight in kilograms
- **`heightCm`** (optional): New height in centimeters  
- **`eerCalories`** (optional): New EER calories value

## Response Structure

```json
{
  "message": "Recalculation completed successfully",
  "client_id": "uuid",
  "recalculated_values": {
    "eer": {
      "calories": 2500,
      "bmr": 1800,
      "pal": 1.55,
      "formula_used": "Harris-Benedict + PAL adjustments",
      "guideline_country": "UK"
    },
    "macros": {
      "ranges": {
        "protein": {
          "min": 75,
          "max": 125,
          "unit": "g",
          "note": "15-25% of total calories"
        },
        "carbs": {
          "min": 250,
          "max": 350,
          "unit": "g", 
          "note": "40-55% of total calories"
        },
        "fat": {
          "min": 55,
          "max": 83,
          "unit": "g",
          "note": "20-30% of total calories"
        }
        // ... other macros
      },
      "guideline_country": "UK",
      "guideline_notes": "UK SACN guidelines"
    },
    "micronutrients": {
      "vitamins": {
        "vitamin_a": { "amount": 750, "unit": "mcg" },
        "vitamin_c": { "amount": 90, "unit": "mg" }
      },
      "minerals": {
        "calcium": { "amount": 1000, "unit": "mg" },
        "iron": { "amount": 8, "unit": "mg" }
      },
      "miscellaneous": {}
    },
    "micronutrient_guideline": {
      "guideline_used": "UK",
      "source": "UK SACN",
      "notes": "UK dietary reference values",
      "age_group": "19-50 years"
    },
    "summary": {
      "weight_changed": true,
      "height_changed": false,
      "eer_changed": true,
      "original_weight": 60,
      "original_height": 165,
      "original_eer": 2200
    }
  }
}
```

## Calculation Logic

### 1. Weight/Height Changes
When `weightKg` or `heightCm` is provided:
- **EER**: Recalculated using the new weight/height values
- **Macros**: Recalculated if EER changes (since macros are percentage-based)
- **Micronutrients**: Recalculated if weight changes (weight-dependent calculations)

### 2. EER Calories Changes
When only `eerCalories` is provided (no weight/height change):
- **EER**: Not recalculated (assumes manual override)
- **Macros**: Recalculated based on new EER value
- **Micronutrients**: Not recalculated (weight unchanged)

### 3. Combined Changes
When multiple parameters change:
- Calculations follow the cascade: Weight/Height → EER → Macros → Micronutrients
- Each calculation uses the most up-to-date values

## Use Cases

### Scenario 1: Weight Loss Progress
```json
{
  "clientId": "uuid",
  "weightKg": 58  // Client lost 2kg
}
```
**Result**: New EER, macros, and micronutrients calculated for 58kg weight

### Scenario 2: Manual EER Adjustment
```json
{
  "clientId": "uuid", 
  "eerCalories": 2800  // Nutritionist wants to increase calories
}
```
**Result**: New macros calculated for 2800 calories (EER and micronutrients unchanged)

### Scenario 3: Height Correction
```json
{
  "clientId": "uuid",
  "heightCm": 168  // Corrected height measurement
}
```
**Result**: New EER and macros calculated (height affects BMR calculation)

## Error Handling

The API gracefully handles calculation errors:

```json
{
  "message": "Recalculation completed successfully",
  "client_id": "uuid",
  "recalculated_values": {
    "eer": { /* EER data */ },
    "macros_error": "Failed to calculate macros",
    "micronutrients_error": "Failed to calculate micronutrients"
  }
}
```

## Workflow

1. **Nutritionist calls recalculation API** with new parameters
2. **API returns calculated values** without modifying client data
3. **Nutritionist reviews** the calculated values
4. **Nutritionist modifies** values if needed
5. **Nutritionist calls PUT endpoint** with final values to update client

## Example cURL Commands

### Recalculate for weight change:
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/clients/recalculate' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {token}' \
  -d '{
    "clientId": "6170d5c8-0c4a-4f1c-af9e-af3ed44ce6d5",
    "weightKg": 58
  }'
```

### Recalculate for EER change:
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/clients/recalculate' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer {token}' \
  -d '{
    "clientId": "6170d5c8-0c4a-4f1c-af9e-af3ed44ce6d5",
    "eerCalories": 2800
  }'
```

## Benefits

1. **Preview Changes**: See calculated values before committing
2. **No Data Loss**: Original client data remains unchanged
3. **Flexible Workflow**: Support for various parameter combinations
4. **Error Resilience**: Partial failures don't break entire calculation
5. **Audit Trail**: Summary shows what changed and original values

## Technical Notes

- **Age Calculation**: Automatically calculated from `date_of_birth`
- **Guideline Selection**: Uses client's location for country-specific guidelines
- **Fallback Logic**: Falls back to USA guidelines if country-specific ones unavailable
- **Precision**: Maintains calculation precision (rounded to 1 decimal for macros)
- **Performance**: Single API call handles multiple calculation types
