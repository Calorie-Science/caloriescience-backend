# Allergen Conflict Detection Feature

## Overview
This feature detects and reports when recipes contain allergens that conflict with a client's dietary restrictions. It works across both manual meal plan APIs and recipe search APIs.

## Implementation Date
October 21, 2025

## Features

### 1. Manual Meal Plan - Add Recipe with Allergen Checking
**Endpoint**: `POST /api/meal-plans/manual/add-recipe`

When adding a recipe to a manual meal plan, the system now:
- Fetches the client's allergen preferences from `client_goals` table
- Checks if the recipe contains any allergens that conflict with client preferences
- Returns the specific conflicting allergens in an array
- Includes a warning message in the response

#### Response Format (with allergen conflict):
```json
{
  "success": true,
  "data": {
    // ... meal plan draft data
  },
  "allergenWarning": {
    "hasConflict": true,
    "conflictingAllergens": ["dairy", "eggs"],
    "message": "⚠️ Warning: This recipe contains allergen(s) that conflict with client preferences: dairy, eggs"
  },
  "message": "Recipe added successfully (with allergen warning)"
}
```

### 2. Recipe Search with Allergen Information
**Endpoint**: `GET /api/recipe-search-client`

When searching for recipes with client context, the system now:
- Enriches each recipe with allergen conflict information
- Flags recipes that contain allergens matching client preferences
- Provides a count of recipes with allergen conflicts in metadata

#### Response Format:
```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "recipe-123",
        "title": "Creamy Pasta",
        "allergens": ["dairy", "wheat"],
        "allergenConflict": {
          "hasConflict": true,
          "conflictingAllergens": ["dairy"],
          "warning": "Recipe contains allergen(s): dairy"
        },
        // ... other recipe fields
      },
      {
        "id": "recipe-456",
        "title": "Grilled Chicken",
        "allergens": [],
        // No allergenConflict field if no conflicts
        // ... other recipe fields
      }
    ],
    // ... other data fields
  },
  "metadata": {
    "clientName": "John Doe",
    "totalResults": 20,
    "recipesWithAllergenConflicts": 5,
    "appliedFilters": { /* ... */ }
  },
  "message": "Found 20 recipes from both (5 with allergen warnings)"
}
```

## Technical Implementation

### Core Components

#### 1. Allergen Checker Utility (`lib/allergenChecker.ts`)
- **`checkAllergenConflicts()`**: Checks if a single recipe has allergen conflicts
- **`enrichRecipesWithAllergenInfo()`**: Adds allergen conflict info to an array of recipes
- **`normalizeRecipeAllergens()`**: Normalizes allergen names to standard format
- **`ValidAllergen` type**: Supported allergen types from `allergenPreferenceValidation.ts`

#### 2. Manual Meal Plan Service (`lib/manualMealPlanService.ts`)
- **`addRecipeWithAllergenCheck()`**: New method that adds a recipe and returns allergen conflict info
- **`addRecipeInternal()`**: Internal method shared by both `addRecipe()` and `addRecipeWithAllergenCheck()`

#### 3. Updated APIs
- **`api/meal-plans/manual/add-recipe.ts`**: Uses allergen checking when adding recipes
- **`api/recipe-search-client.ts`**: Enriches recipe search results with allergen info

### Allergen Detection Logic

The system checks for allergen conflicts by:

1. **Explicit Allergen Arrays**: 
   - Recipes from Bon Happetee and some other providers have explicit `allergens` arrays
   - These are the most reliable source of allergen information

2. **Health Labels Analysis**:
   - Recipes have health labels like "peanut-free", "dairy-free", etc.
   - If a recipe has an explicit allergen array, that takes precedence

3. **Normalization**:
   - All allergens are normalized to standard names (e.g., "milk" → "dairy", "tree nut" → "tree nuts")
   - Case-insensitive matching ensures consistency

### Supported Allergens

The following allergens are tracked (from `allergenPreferenceValidation.ts`):
- Peanuts
- Tree nuts
- Dairy (milk, cheese, etc.)
- Eggs
- Soy
- Wheat
- Gluten
- Fish
- Shellfish
- Sesame
- Sulfites

## Usage Examples

### Example 1: Add Recipe to Manual Meal Plan

```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "draftId": "manual-client-123-1234567890",
    "day": 1,
    "mealName": "breakfast",
    "recipe": {
      "id": "recipe-abc123",
      "provider": "bonhappetee",
      "source": "cached"
    },
    "servings": 2
  }'
```

**Response** (if recipe contains client allergens):
```json
{
  "success": true,
  "data": { /* meal plan draft */ },
  "allergenWarning": {
    "hasConflict": true,
    "conflictingAllergens": ["dairy"],
    "message": "⚠️ Warning: This recipe contains allergen(s) that conflict with client preferences: dairy"
  },
  "message": "Recipe added successfully (with allergen warning)"
}
```

### Example 2: Search Recipes with Allergen Info

```bash
curl 'https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=client-123&query=pasta&maxResults=10' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

**Response** (simplified):
```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "recipe-1",
        "title": "Creamy Alfredo Pasta",
        "allergens": ["dairy", "wheat"],
        "allergenConflict": {
          "hasConflict": true,
          "conflictingAllergens": ["dairy"],
          "warning": "Recipe contains allergen(s): dairy"
        }
      }
    ]
  },
  "metadata": {
    "recipesWithAllergenConflicts": 3
  },
  "message": "Found 10 recipes from both (3 with allergen warnings)"
}
```

## Frontend Integration

### Display Allergen Warnings

```typescript
// Example: Display allergen warning in UI
if (response.allergenWarning) {
  showWarning({
    icon: '⚠️',
    title: 'Allergen Conflict Detected',
    message: response.allergenWarning.message,
    allergens: response.allergenWarning.conflictingAllergens
  });
}
```

### Filter/Flag Recipes in Search Results

```typescript
// Example: Filter out or flag recipes with allergen conflicts
const recipes = response.data.recipes;

// Option 1: Filter out conflicting recipes
const safeRecipes = recipes.filter(r => !r.allergenConflict);

// Option 2: Show all but flag conflicts
recipes.forEach(recipe => {
  if (recipe.allergenConflict) {
    // Display with warning icon/badge
    recipe.displayClass = 'allergen-warning';
    recipe.warningBadge = `⚠️ Contains: ${recipe.allergenConflict.conflictingAllergens.join(', ')}`;
  }
});
```

## Database Schema

### Client Goals Table
```sql
-- Stores client allergen preferences
CREATE TABLE client_goals (
  id UUID PRIMARY KEY,
  client_id UUID REFERENCES clients(id),
  allergies TEXT[], -- Array of allergens client is allergic to
  preferences TEXT[], -- Dietary preferences
  cuisine_types TEXT[], -- Preferred cuisines
  -- ... other fields
);
```

### Cached Recipes Table
```sql
-- Stores recipe allergen information
ALTER TABLE cached_recipes 
ADD COLUMN allergens TEXT[] DEFAULT '{}';

COMMENT ON COLUMN cached_recipes.allergens IS 
  'List of allergens in the recipe (from Bon Happetee or extracted from health labels)';
```

## Error Handling

The allergen checking system is designed to be non-blocking:
- If allergen data is missing or incomplete, recipes are still added/returned
- Conflicts are only reported when there's high confidence (explicit allergen arrays)
- Missing client allergen preferences result in no conflict warnings

## Logging

The system logs allergen conflicts for monitoring:

```javascript
console.warn('⚠️ Allergen conflict detected:', {
  recipeId: 'recipe-123',
  recipeName: 'Creamy Pasta',
  conflictingAllergens: ['dairy'],
  clientAllergens: ['dairy', 'peanuts']
});
```

## Future Enhancements

1. **Severity Levels**: Distinguish between severe allergies and mild intolerances
2. **Auto-Filtering**: Option to automatically exclude recipes with client allergens
3. **Allergen Substitutions**: Suggest ingredient substitutions to avoid allergens
4. **Cross-Contamination Warnings**: Flag recipes that may have cross-contamination risks
5. **Custom Allergen Tracking**: Allow clients to add custom allergens beyond the standard list

## Related Files

- `/lib/allergenChecker.ts` - Core allergen conflict detection logic
- `/lib/allergenPreferenceValidation.ts` - Valid allergens and normalization
- `/api/meal-plans/manual/add-recipe.ts` - Manual meal plan with allergen checking
- `/api/recipe-search-client.ts` - Recipe search with allergen info
- `/lib/manualMealPlanService.ts` - Service layer implementation
- `/database/migrations/064_add_allergens_to_cached_recipes.sql` - Database schema

## Testing

### Test Case 1: Recipe with Client Allergen
1. Create client with dairy allergy in `client_goals`
2. Add recipe containing dairy to manual meal plan
3. Verify allergen warning is returned with "dairy" in conflictingAllergens array

### Test Case 2: Recipe Without Conflicts
1. Create client with peanut allergy
2. Add recipe without peanuts
3. Verify no allergenWarning in response

### Test Case 3: Recipe Search with Conflicts
1. Search recipes for client with multiple allergens
2. Verify each recipe includes allergenConflict field when applicable
3. Verify metadata shows correct count of recipes with conflicts

## Changelog

### Version 1.0 (October 21, 2025)
- Initial implementation of allergen conflict detection
- Added allergen checking to manual meal plan add-recipe API
- Added allergen info to recipe search client API
- Created allergen checker utility library
- Updated manual meal plan service with allergen checking support

