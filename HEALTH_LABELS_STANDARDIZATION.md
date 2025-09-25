# 🏷️ Health Labels Standardization System

## Overview

This document describes the new standardized health labels mapping system that replaces hardcoded label mappings throughout the application. This system allows us to easily integrate multiple food database providers while maintaining consistent internal label representations.

## 🎯 Problem Solved

**Before**: Hardcoded mappings in multiple files
- `mealDataTransformService.ts` - Hardcoded Edamam mappings
- `clientGoalsMealPlanningIntegration.ts` - Static label arrays
- `types/clientGoals.ts` - Fixed type definitions

**After**: Database-driven standardized system
- ✅ Centralized label management
- ✅ Easy addition of new food providers
- ✅ Consistent label validation
- ✅ Provider-specific mapping support

## 🗄️ Database Schema

### Core Tables

#### `health_labels_categories`
Categories of health labels (allergies, preferences, cuisines, nutrition focus)
```sql
- id (UUID, PK)
- name (VARCHAR) - 'allergy', 'dietary_preference', 'cuisine_type', 'nutrition_focus'
- description (TEXT)
- priority (INTEGER) - For ordering
- is_active (BOOLEAN)
```

#### `health_labels_standard`
Our standardized health labels
```sql
- id (UUID, PK)
- category_id (UUID, FK)
- label_key (VARCHAR) - Our internal key (e.g., 'dairy-free')
- display_name (VARCHAR) - Human readable (e.g., 'Dairy Free')
- description (TEXT)
- severity_level (VARCHAR) - 'critical', 'high', 'medium', 'preference'
- is_active (BOOLEAN)
```

#### `food_database_providers`
Supported food database APIs
```sql
- id (UUID, PK)
- provider_name (VARCHAR) - 'edamam', 'spoonacular', 'usda'
- display_name (VARCHAR)
- api_base_url (VARCHAR)
- is_active (BOOLEAN)
- priority (INTEGER) - For fallback ordering
```

#### `health_labels_provider_mapping`
Mapping between our labels and provider-specific labels
```sql
- id (UUID, PK)
- standard_label_id (UUID, FK)
- provider_id (UUID, FK)
- provider_label_key (VARCHAR) - Provider's label format
- provider_label_value (VARCHAR) - Optional different value
- is_supported (BOOLEAN) - Some providers don't support all labels
- mapping_notes (TEXT)
```

## 🔧 Services

### `HealthLabelsService`
Core service for managing health labels and mappings.

**Key Methods:**
- `getStandardLabels()` - Get all standardized labels
- `getMappingsForProvider(provider)` - Get provider-specific mappings
- `convertLabelsForProvider(labels, provider)` - Convert to provider format
- `validateLabelsForProvider(labels, provider)` - Validate support

### `HealthLabelsTransformService`
High-level service for transforming labels with caching.

**Key Methods:**
- `convertHealthLabelsForProvider(labels, provider)` - Main conversion method
- `convertDietaryRestrictionsToEdamam(restrictions)` - Backward compatibility
- `validateLabelsForProvider(labels, provider)` - Validation
- `mergeAllergiesAndPreferencesForProvider()` - Combine label types

### `ClientGoalsMealPlanningIntegrationV2`
Enhanced integration service replacing the old hardcoded version.

**Key Methods:**
- `convertClientGoalsToMealPlanningConstraints()` - Convert goals to constraints
- `validateClientGoalsForProvider()` - Validate against provider
- `getMultiProviderMealPlanningConstraints()` - Multi-provider support

## 🚀 Usage Examples

### Basic Label Conversion
```typescript
import { healthLabelsTransformService } from './lib/healthLabelsTransformService';

// Convert our standard labels to Edamam format
const result = await healthLabelsTransformService.convertHealthLabelsForProvider(
  ['dairy-free', 'vegan', 'indian'], 
  'edamam'
);

console.log(result);
// {
//   provider: 'edamam',
//   healthLabels: ['dairy-free', 'vegan'],
//   cuisineTypes: ['Indian']
// }
```

### Client Goals Integration
```typescript
import { convertClientGoalsToMealPlanningConstraints } from './lib/clientGoalsMealPlanningIntegrationV2';

const constraints = await convertClientGoalsToMealPlanningConstraints({
  allergies: ['dairy-free', 'gluten-free'],
  preferences: ['vegan'],
  cuisineTypes: ['indian', 'italian']
}, 'edamam');

// Use constraints.healthLabels and constraints.cuisineTypes for API calls
```

### Validation
```typescript
const validation = await healthLabelsTransformService.validateLabelsForProvider(
  ['dairy-free', 'some-unsupported-label'], 
  'edamam'
);

console.log(validation);
// {
//   valid: false,
//   unsupportedLabels: ['some-unsupported-label']
// }
```

### Multi-Provider Support
```typescript
const multiProviderResults = await healthLabelsTransformService.convertForMultipleProviders(
  ['dairy-free', 'vegan'],
  ['edamam', 'spoonacular', 'usda']
);

// Results for each provider in separate objects
```

## 📊 API Endpoints

### `GET /api/health-labels`
Get health labels information

**Query Parameters:**
- `action=list` - Get all labels grouped by category
- `action=category&category=allergy` - Get labels for specific category
- `action=providers` - Get all food database providers
- `action=mappings&provider=edamam` - Get mappings for provider
- `action=supported&provider=edamam` - Get supported labels for provider

### `POST /api/health-labels`
Perform health labels actions

**Actions:**
- `convert` - Convert standard labels to provider format
- `validate` - Validate labels against provider
- `clear-cache` - Clear transformation cache
- `cache-stats` - Get cache statistics

## 🔄 Migration Guide

### For Existing Code

1. **Replace hardcoded mappings:**
   ```typescript
   // OLD
   const edamamHealthLabels = ['dairy-free', 'vegan'];
   
   // NEW
   const result = await healthLabelsTransformService.convertHealthLabelsForProvider(
     ['dairy-free', 'vegan'], 'edamam'
   );
   const edamamHealthLabels = result.healthLabels;
   ```

2. **Update meal planning integration:**
   ```typescript
   // OLD
   import { mergeAllergiesAndPreferencesForEdamam } from './clientGoalsMealPlanningIntegration';
   
   // NEW
   import { mergeAllergiesAndPreferencesForProvider } from './clientGoalsMealPlanningIntegrationV2';
   ```

3. **Update validation logic:**
   ```typescript
   // OLD
   const isValidLabel = EDAMAM_SUPPORTED_HEALTH_LABELS.includes(label);
   
   // NEW
   const validation = await healthLabelsTransformService.validateLabelsForProvider([label], 'edamam');
   const isValidLabel = validation.valid;
   ```

## 🆕 Adding New Food Database Providers

### 1. Add Provider to Database
```sql
INSERT INTO food_database_providers (provider_name, display_name, api_base_url, priority)
VALUES ('spoonacular', 'Spoonacular Food API', 'https://api.spoonacular.com', 2);
```

### 2. Create Label Mappings
```sql
INSERT INTO health_labels_provider_mapping (standard_label_id, provider_id, provider_label_key, is_supported)
SELECT 
    hls.id,
    (SELECT id FROM food_database_providers WHERE provider_name = 'spoonacular'),
    'glutenFree',  -- Spoonacular's format for gluten-free
    true
FROM health_labels_standard hls 
WHERE hls.label_key = 'gluten-free';
```

### 3. Test Integration
```typescript
const result = await healthLabelsTransformService.convertHealthLabelsForProvider(
  ['gluten-free', 'vegan'], 
  'spoonacular'
);
// Should return Spoonacular-formatted labels
```

## 🎨 Benefits

### ✅ **Scalability**
- Easy addition of new food database providers
- Centralized label management
- No code changes needed for new mappings

### ✅ **Consistency**
- Single source of truth for health labels
- Consistent validation across the application
- Standardized error handling

### ✅ **Performance**
- Cached transformations
- Efficient database queries
- Batch operations support

### ✅ **Maintainability**
- Clear separation of concerns
- Database-driven configuration
- Easy testing and debugging

### ✅ **Flexibility**
- Support for provider-specific label formats
- Severity-based categorization
- Extensible for future requirements

## 🧪 Testing

Run the migrations:
```bash
# The migrations will be run automatically via the health endpoint
curl https://your-app.vercel.app/api/health?migrate=true
```

Test the API:
```bash
# Get all health labels
curl "https://your-app.vercel.app/api/health-labels?action=list" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Convert labels
curl -X POST "https://your-app.vercel.app/api/health-labels" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "convert",
    "standardLabels": ["dairy-free", "vegan"],
    "provider": "edamam"
  }'
```

## 📝 Notes

- The system maintains backward compatibility with existing code
- Caching is implemented for performance (5-minute TTL)
- All database operations include proper error handling
- The system supports both health labels and cuisine types
- Provider mappings can be marked as unsupported for labels that cause issues

This standardized system provides a robust foundation for supporting multiple food database providers while maintaining clean, maintainable code! 🚀
