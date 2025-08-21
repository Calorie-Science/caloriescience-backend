# Auto-Recalculation in PUT Endpoint

## Overview

The PUT endpoint (`/api/clients/[id]`) now automatically recalculates and saves EER, macros, and micronutrients when a client's weight or height changes. This ensures that nutritional recommendations stay accurate and up-to-date with the client's current measurements.

## How It Works

### 1. **Automatic Detection**
When a PUT request includes changes to `weight_kg` or `height_cm`, the system automatically:
- Detects the parameter changes
- Triggers recalculation of EER, macros, and micronutrients
- Saves the new calculated values to the database

### 2. **Calculation Cascade**
The recalculation follows this logical flow:
```
Weight/Height Change → EER Recalculation → Macros Recalculation → Micronutrients Recalculation
```

### 3. **Data Preservation**
- **Client Data**: Only the specified fields are updated
- **Nutrition Requirements**: Auto-calculated values replace existing ones
- **Micronutrients**: Auto-calculated values replace existing ones
- **Calculation Method**: Set to `'auto_calculated'` for tracking

## Implementation Details

### **Auto-Calculation Triggers**
- `weight_kg` changes → EER + Macros + Micronutrients recalculated
- `height_cm` changes → EER + Macros recalculated (height doesn't affect micronutrients)
- Combined changes → Full cascade recalculation

### **Calculation Sources**
- **EER**: Uses database formulas based on country, age, gender, activity level
- **Macros**: Calculated from new EER using country-specific guidelines
- **Micronutrients**: Calculated using country-specific guidelines (weight-dependent)

### **Database Updates**
1. **Client Table**: BMI, BMR, weight, height updated
2. **Nutrition Requirements**: EER, macros, calculation method updated
3. **Micronutrient Requirements**: New recommendations saved with auto-calculation metadata

## Example Scenarios

### **Scenario 1: Weight Loss Progress**
```bash
PUT /api/clients/{id}
{
  "weightKg": 58  // Client lost 2kg from 60kg
}
```

**Result:**
- EER recalculated for 58kg weight
- Macros recalculated for new EER
- Micronutrients recalculated for new weight
- All values automatically saved to database

### **Scenario 2: Height Correction**
```bash
PUT /api/clients/{id}
{
  "heightCm": 168  // Corrected height measurement
}
```

**Result:**
- EER recalculated for 168cm height
- Macros recalculated for new EER
- Micronutrients unchanged (height doesn't affect them)

### **Scenario 3: Combined Changes**
```bash
PUT /api/clients/{id}
{
  "weightKg": 58,
  "heightCm": 168
}
```

**Result:**
- Full cascade recalculation
- EER, macros, and micronutrients all updated
- Comprehensive nutritional profile refresh

## API Response

After auto-recalculation, the PUT endpoint returns the updated client data including:

```json
{
  "message": "Client updated successfully",
  "client": {
    "weightKg": 58,
    "heightCm": 165,
    "bmi": 21.3,
    "bmiCategory": "normal",
    "eerCalories": 2150,
    "macrosRanges": {
      "protein": { "min": 65, "max": 85, "unit": "g" },
      "carbs": { "min": 215, "max": 295, "unit": "g" },
      "fat": { "min": 48, "max": 72, "unit": "g" }
    },
    "micronutrients": {
      "vitamins": { /* auto-calculated */ },
      "minerals": { /* auto-calculated */ },
      "miscellaneous": {}
    }
  }
}
```

## Calculation Method Tracking

### **Before Auto-Calculation**
- `calculation_method`: `'nutritionist_approved'` or `'ai_macros_assistant'`
- `is_edited_by_nutritionist`: `true`

### **After Auto-Calculation**
- `calculation_method`: `'auto_calculated'`
- `is_edited_by_nutritionist`: `false`
- `nutritionist_notes`: `'Auto-calculated due to weight change'`

## Benefits

1. **Automatic Accuracy**: Nutritional recommendations stay current with measurements
2. **No Manual Work**: Nutritionists don't need to manually recalculate
3. **Consistent Calculations**: Uses the same formulas as client creation
4. **Audit Trail**: Clear tracking of what was auto-calculated vs. manually set
5. **Data Integrity**: Ensures macros and micronutrients align with current EER

## Workflow Integration

### **Traditional Workflow (Before)**
1. Update client weight/height
2. Manually recalculate EER
3. Manually recalculate macros
4. Manually recalculate micronutrients
5. Save all values

### **New Auto-Workflow**
1. Update client weight/height
2. System automatically recalculates everything
3. Review auto-calculated values
4. Optionally modify if needed
5. Save with single API call

## Error Handling

The system gracefully handles calculation failures:

- **EER Calculation Fails**: Client update continues, nutrition data unchanged
- **Macros Calculation Fails**: EER updated, macros remain unchanged
- **Micronutrients Calculation Fails**: EER and macros updated, micronutrients unchanged

All errors are logged for debugging while allowing the client update to complete.

## Testing

### **Test Weight Change**
```bash
curl -X PUT 'https://caloriescience-api.vercel.app/api/clients/{id}' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "weightKg": 58
  }'
```

### **Test Height Change**
```bash
curl -X PUT 'https://caloriescience-api.vercel.app/api/clients/{id}' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "heightCm": 168
  }'
```

### **Verify Auto-Calculation**
Check the response for:
- Updated BMI and BMR
- New EER calories
- Recalculated macro ranges
- Categorized micronutrients
- `calculation_method: 'auto_calculated'`

## Future Enhancements

1. **Selective Recalculation**: Allow nutritionists to choose which calculations to auto-update
2. **Calculation History**: Track all auto-calculations for audit purposes
3. **Notification System**: Alert nutritionists when auto-calculations occur
4. **Batch Updates**: Support multiple client updates with auto-recalculation
5. **Custom Formulas**: Allow nutritionists to override default calculation formulas
