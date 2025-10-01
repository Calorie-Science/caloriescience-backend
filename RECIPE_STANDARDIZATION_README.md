# Recipe Response Standardization Service

This service standardizes recipe responses from different providers (Edamam, Spoonacular) to ensure uniform structure in meal suggestions and other API responses.

## Problem Solved

Previously, meal suggestions from different providers had inconsistent structures:

### Edamam Response Issues:
- Rich health labels array with detailed dietary restrictions
- Complex ingredient objects with detailed nutrition data
- Empty cooking instructions array
- Missing micronutrient data (all zeros)

### Spoonacular Response Issues:
- Empty health labels array, uses `diet_labels` instead
- Different ingredient structure with `id`, `meta`, `aisle`, `measures` fields
- Detailed step-by-step instructions array
- Complete micronutrient data

## Solution

The `RecipeResponseStandardizationService` provides:

1. **Unified Response Structure**: All recipes follow the same `StandardizedRecipeResponse` interface
2. **Consistent Field Naming**: Standardized field names across all providers
3. **Normalized Data Types**: All numeric values as strings, arrays properly formatted
4. **Standardized Health/Diet Labels**: Consistent format for dietary information
5. **Unified Ingredient Format**: Standardized ingredient structure
6. **Complete Nutrition Data**: Ensures all nutrition fields are present

## Usage

### 1. Standardize Individual Recipe

```typescript
import { RecipeResponseStandardizationService } from './lib/recipeResponseStandardizationService';

const standardizationService = new RecipeResponseStandardizationService();

// Standardize a single recipe
const standardizedRecipe = standardizationService.standardizeRecipeResponse(recipe);
```

### 2. Standardize Multiple Recipes

```typescript
// Standardize multiple recipes
const standardizedRecipes = standardizationService.standardizeRecipeResponses(recipes);
```

### 3. Standardize Database Responses

```typescript
// For raw database responses with different field names
const standardizedRecipe = standardizationService.standardizeDatabaseRecipeResponse(dbRecipe);
const standardizedRecipes = standardizationService.standardizeDatabaseRecipeResponses(dbRecipes);
```

### 4. Using the API Endpoint

```bash
# POST to standardize recipe responses
curl -X POST /api/recipe-standardize \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "recipes": [
      {
        "id": "166a0662-495b-493f-a4f8-2f3b0810a60f",
        "provider": "edamam",
        "external_recipe_id": "a5ec59e96c5ad961c492adfee471892c",
        "recipe_name": "Gluten-Free Crepes",
        "health_labels": ["Vegetarian", "Gluten-Free"],
        "diet_labels": ["High-Fiber"],
        "cuisine_types": ["eastern europe"],
        "meal_types": ["pancake"],
        "dish_types": ["pancake"],
        "servings": 2,
        "calories_per_serving": "2070.46",
        "protein_per_serving_g": "37.53",
        "carbs_per_serving_g": "124.29",
        "fat_per_serving_g": "164.68",
        "fiber_per_serving_g": "13.06",
        "ingredients": [...],
        "nutrition_details": {...}
      }
    ]
  }'
```

## Standardized Response Structure

```typescript
interface StandardizedRecipeResponse {
  // Core identification
  id: string;
  provider: 'edamam' | 'spoonacular';
  external_recipe_id: string;
  external_recipe_uri: string;
  
  // Basic recipe info
  recipe_name: string;
  recipe_source: string;
  recipe_url: string;
  recipe_image_url: string;
  
  // Categorization (standardized arrays)
  cuisine_types: string[];
  meal_types: string[];
  dish_types: string[];
  
  // Health and dietary info (standardized)
  health_labels: string[];
  diet_labels: string[];
  
  // Serving and timing info
  servings: number;
  prep_time_minutes: number | null;
  cook_time_minutes: number | null;
  total_time_minutes: number | null;
  
  // Nutrition (per serving) - all as strings
  calories_per_serving: string;
  protein_per_serving_g: string;
  carbs_per_serving_g: string;
  fat_per_serving_g: string;
  fiber_per_serving_g: string;
  sugar_per_serving_g: string | null;
  sodium_per_serving_mg: string | null;
  
  // Total nutrition (for entire recipe)
  total_calories: string | null;
  total_protein_g: string | null;
  total_carbs_g: string | null;
  total_fat_g: string | null;
  total_fiber_g: string | null;
  total_sugar_g: string | null;
  total_sodium_mg: string | null;
  total_weight_g: string | null;
  
  // Recipe content
  ingredients: StandardizedIngredient[];
  ingredient_lines: string[];
  cooking_instructions: string[];
  
  // Detailed nutrition
  nutrition_details: StandardizedNutritionDetails;
  
  // Metadata
  original_api_response: any;
  cache_status: string;
  api_fetch_count: number;
  last_api_fetch_at: string;
  last_accessed_at: string;
  has_complete_nutrition: boolean;
  has_detailed_ingredients: boolean;
  has_cooking_instructions: boolean;
  data_quality_score: number;
  created_at: string;
  updated_at: string;
}
```

## Key Standardizations

### 1. Field Naming Consistency
- All fields use snake_case naming convention
- Consistent field names across all providers
- Handles both camelCase and snake_case input formats

### 2. Data Type Normalization
- All numeric values converted to strings for consistency
- Arrays are always arrays (never null/undefined)
- Boolean values properly typed

### 3. Health and Diet Labels
- Spoonacular diet labels converted to Edamam format
- "gluten free" → "Gluten-Free"
- "ketogenic" → "Keto-Friendly"
- Consistent capitalization and formatting

### 4. Ingredient Structure
- Unified ingredient interface with all possible fields
- Handles different provider-specific fields gracefully
- Consistent naming and data types

### 5. Nutrition Data
- Complete nutrition structure with macros and micros
- Handles missing micronutrient data (fills with zeros)
- Consistent units and formatting

## Integration Points

The standardization service is integrated into:

1. **RecipeCacheService**: Automatically standardizes cached recipe responses
2. **API Endpoints**: New `/api/recipe-standardize` endpoint for manual standardization
3. **Database Responses**: Handles raw database responses with field name variations

## Benefits

1. **Consistent API Responses**: All recipe responses follow the same structure
2. **Easier Frontend Development**: No need to handle different response formats
3. **Better Data Quality**: Ensures all required fields are present
4. **Future-Proof**: Easy to add new providers or fields
5. **Backward Compatible**: Handles existing data formats gracefully

## Error Handling

The service includes comprehensive error handling:

- Validates required fields before processing
- Handles missing or malformed data gracefully
- Provides detailed error messages for debugging
- Continues processing other recipes if one fails

## Performance Considerations

- Lightweight processing with minimal overhead
- Efficient field mapping and transformation
- Handles large batches of recipes efficiently
- Caches standardization rules for better performance
