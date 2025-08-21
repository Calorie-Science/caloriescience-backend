# Case-Insensitive Macro and Micronutrient Support

## Overview

The PUT endpoint (`/api/clients/[id]`) now supports both camelCase and lowercase keys for macros and micronutrients, providing flexibility for developers and nutritionists to use their preferred naming conventions.

## Supported Key Formats

### **Macros - Multiple Naming Conventions**

| **Standard Key** | **Accepted Variations** | **Example** |
|------------------|-------------------------|-------------|
| `Protein` | `protein`, `Protein` | `{"protein": {"min": 70, "max": 100}}` |
| `Carbohydrates` | `carbs`, `carbohydrates`, `Carbohydrates` | `{"carbs": {"min": 200, "max": 300}}` |
| `Total Fat` | `fat`, `Total Fat`, `total_fat` | `{"fat": {"min": 50, "max": 70}}` |
| `Fiber` | `fiber`, `Fiber` | `{"fiber": {"min": 25, "max": 35}}` |
| `Saturated Fat` | `saturated_fat`, `saturatedfat`, `Saturated Fat` | `{"saturated_fat": {"min": 15, "max": 20}}` |
| `Monounsaturated Fat` | `monounsaturated_fat`, `monounsaturatedfat` | `{"monounsaturated_fat": {"min": 20, "max": 30}}` |
| `Polyunsaturated Fat` | `polyunsaturated_fat`, `polyunsaturatedfat` | `{"polyunsaturated_fat": {"min": 10, "max": 15}}` |
| `Omega-3 Fatty Acids` | `omega3`, `omega-3`, `omega_3` | `{"omega3": {"min": 1, "max": 2}}` |
| `Cholesterol` | `cholesterol`, `Cholesterol` | `{"cholesterol": {"min": 200, "max": 300}}` |

### **Micronutrients - Multiple Naming Conventions**

| **Standard Key** | **Accepted Variations** | **Example** |
|------------------|-------------------------|-------------|
| `vitaminA` | `vitaminA`, `vitamina`, `vitamin_a` | `{"vitaminA": {"amount": 900}}` |
| `thiamin` | `thiamin`, `Thiamin`, `vitaminB1` | `{"thiamin": {"amount": 1.2}}` |
| `riboflavin` | `riboflavin`, `Riboflavin`, `vitaminB2` | `{"riboflavin": {"amount": 1.3}}` |
| `niacinEquivalent` | `niacinEquivalent`, `niacinequivalent`, `niacin` | `{"niacin": {"amount": 16}}` |
| `vitaminB6` | `vitaminB6`, `vitaminb6`, `vitamin_b6` | `{"vitaminB6": {"amount": 1.3}}` |
| `biotin` | `biotin`, `Biotin` | `{"biotin": {"amount": 30}}` |
| `vitaminB12` | `vitaminB12`, `vitaminb12`, `vitamin_b12` | `{"vitaminB12": {"amount": 2.4}}` |
| `folate` | `folate`, `Folate` | `{"folate": {"amount": 400}}` |
| `vitaminC` | `vitaminC`, `vitaminc`, `vitamin_c` | `{"vitaminC": {"amount": 90}}` |
| `vitaminD` | `vitaminD`, `vitamind`, `vitamin_d` | `{"vitaminD": {"amount": 15}}` |
| `iron` | `iron`, `Iron` | `{"iron": {"amount": 18}}` |
| `calcium` | `calcium`, `Calcium` | `{"calcium": {"amount": 1000}}` |
| `magnesium` | `magnesium`, `Magnesium` | `{"magnesium": {"amount": 400}}` |
| `potassium` | `potassium`, `Potassium` | `{"potassium": {"amount": 3500}}` |
| `zinc` | `zinc`, `Zinc` | `{"zinc": {"amount": 11}}` |
| `copper` | `copper`, `Copper` | `{"copper": {"amount": 0.9}}` |
| `iodine` | `iodine`, `Iodine` | `{"iodine": {"amount": 150}}` |
| `selenium` | `selenium`, `Selenium` | `{"selenium": {"amount": 55}}` |
| `phosphorus` | `phosphorus`, `Phosphorus` | `{"phosphorus": {"amount": 700}}` |
| `chloride` | `chloride`, `Chloride` | `{"chloride": {"amount": 2300}}` |
| `sodium` | `sodium`, `Sodium` | `{"sodium": {"amount": 2.3}}` |

## How It Works

### **1. Key Normalization**
The system uses a comprehensive key mapping system that:
- Maps camelCase keys to normalized database fields
- Accepts lowercase variations
- Handles common abbreviations (e.g., `carbs` for `Carbohydrates`)
- Supports underscore and hyphen variations

### **2. Fallback Strategy**
When a key is not found, the system tries multiple variations:
1. **Exact match** (original key)
2. **Normalized key** (mapped version)
3. **Lowercase version**
4. **Space-removed version**
5. **Underscore version**
6. **Hyphen version**

### **3. Smart Detection**
The system automatically detects which naming convention is being used and applies the appropriate mapping.

## Example Usage

### **Example 1: Mixed Case Styles**
```json
{
  "macrosData": {
    "protein": {"min": 70, "max": 100, "unit": "g"},
    "Carbs": {"min": 200, "max": 300, "unit": "g"},
    "total_fat": {"min": 50, "max": 70, "unit": "g"},
    "Fiber": {"min": 25, "max": 35, "unit": "g"}
  }
}
```

**Result**: All macros are correctly processed regardless of case style.

### **Example 2: Micronutrients with Different Cases**
```json
{
  "micronutrientsData": {
    "micronutrients": {
      "vitaminA": {"amount": 900, "unit": "mcg"},
      "vitaminb6": {"amount": 1.3, "unit": "mg"},
      "Iron": {"amount": 18, "unit": "mg"},
      "calcium": {"amount": 1000, "unit": "mg"}
    }
  }
}
```

**Result**: All micronutrients are correctly processed regardless of case style.

### **Example 3: Abbreviated Keys**
```json
{
  "macrosData": {
    "protein": {"min": 70, "max": 100},
    "carbs": {"min": 200, "max": 300},
    "fat": {"min": 50, "max": 70},
    "omega3": {"min": 1, "max": 2}
  }
}
```

**Result**: Abbreviated keys are automatically expanded to full names.

## Benefits

1. **Developer Flexibility**: Use any naming convention that feels natural
2. **API Consistency**: Maintains backward compatibility
3. **Error Reduction**: Fewer "key not found" errors
4. **User Experience**: Nutritionists can use their preferred terminology
5. **Integration Friendly**: Works with various frontend frameworks and tools

## Implementation Details

### **Macro Key Mapping**
```typescript
const normalizeMacroKey = (key: string): string => {
  const keyMap: { [key: string]: string } = {
    'Protein': 'protein',
    'Carbohydrates': 'carbs',
    'Total Fat': 'fat',
    'Fiber': 'fiber',
    // ... more mappings
  };
  
  return keyMap[key] || key.toLowerCase();
};
```

### **Micronutrient Key Detection**
```typescript
const getMicroValue = (micros: any, key: string) => {
  // Try exact match first
  if (micros[key] !== undefined) return micros[key];
  
  // Try lowercase
  if (micros[key.toLowerCase()] !== undefined) return micros[key.toLowerCase()];
  
  // Try common variations
  const variations = [
    key,
    key.toLowerCase(),
    key.replace(/\s+/g, ''),
    key.replace(/\s+/g, '_'),
    key.replace(/\s+/g, '-')
  ];
  
  for (const variation of variations) {
    if (micros[variation] !== undefined) return micros[variation];
  }
  
  return undefined;
};
```

## Testing Examples

### **Test 1: Lowercase Macros**
```bash
curl -X PUT 'https://caloriescience-api.vercel.app/api/clients/{id}' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "macrosData": {
      "protein": {"min": 70, "max": 100, "unit": "g"},
      "carbs": {"min": 200, "max": 300, "unit": "g"},
      "fat": {"min": 50, "max": 70, "unit": "g"}
    }
  }'
```

### **Test 2: Mixed Case Micronutrients**
```bash
curl -X PUT 'https://caloriescience-api.vercel.app/api/clients/{id}' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "micronutrientsData": {
      "micronutrients": {
        "vitaminA": {"amount": 900, "unit": "mcg"},
        "Iron": {"amount": 18, "unit": "mg"},
        "calcium": {"amount": 1000, "unit": "mg"}
      }
    }
  }'
```

### **Test 3: Abbreviated Keys**
```bash
curl -X PUT 'https://caloriescience-api.vercel.app/api/clients/{id}' \
  -H 'Authorization: Bearer {token}' \
  -H 'Content-Type: application/json' \
  -d '{
    "macrosData": {
      "protein": {"min": 70, "max": 100},
      "carbs": {"min": 200, "max": 300},
      "omega3": {"min": 1, "max": 2}
    }
  }'
```

## Best Practices

1. **Consistency**: Choose one naming convention and stick to it
2. **Documentation**: Document your preferred key format for your team
3. **Testing**: Test with different case variations to ensure compatibility
4. **Error Handling**: The system gracefully handles missing or malformed keys

## Future Enhancements

1. **Custom Key Mapping**: Allow nutritionists to define custom key mappings
2. **Key Validation**: Provide warnings for deprecated or non-standard keys
3. **Auto-Suggestions**: Suggest correct key names for common typos
4. **Bulk Operations**: Support for bulk key normalization across multiple clients
