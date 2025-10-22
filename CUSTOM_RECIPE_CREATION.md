# Custom Recipe Creation Feature

## Overview

The Custom Recipe Creation feature allows nutritionists to create their own recipes with ingredients sourced from Edamam and Spoonacular APIs. The system automatically calculates nutrition values, supports custom instructions, notes, images, and tags, and provides public/private visibility control.

## Architecture

### Database Structure

Custom recipes are stored in the existing `cached_recipes` table with `provider='manual'`. New fields added:
- `created_by_nutritionist_id` - Links recipe to creating nutritionist
- `is_public` - Controls visibility (true = all nutritionists, false = creator only)
- `custom_notes` - Private notes for the recipe creator
- `recipe_description` - Detailed description of the recipe

### Key Components

1. **CustomRecipeService** (`lib/customRecipeService.ts`)
   - Manages CRUD operations for custom recipes
   - Calculates nutrition from ingredients automatically
   - Validates ownership and access permissions

2. **API Endpoint** (`api/recipes/custom.ts`)
   - POST: Create new custom recipe
   - GET: List custom recipes with filters
   - PUT: Update existing recipe
   - DELETE: Delete recipe (owner only)

3. **Recipe Search Integration** (`lib/multiProviderRecipeSearchService.ts`)
   - Custom recipes included in unified search results
   - Supports filtering by health labels, cuisine, calories, etc.
   - Respects access permissions (private vs public)

4. **Recipe Details** (`api/recipes/[id]/details.ts`)
   - Extended to support custom recipe details
   - Enforces access control for private recipes

## API Usage

### 1. Create Custom Recipe

**Endpoint:** `POST /api/recipes/custom`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "recipeName": "High-Protein Smoothie Bowl",
  "description": "A nutrient-dense breakfast option packed with protein and antioxidants",
  "ingredients": [
    {
      "name": "banana",
      "quantity": 1,
      "unit": "medium",
      "nutritionData": {
        "calories": 105,
        "protein": 1.3,
        "carbs": 27,
        "fat": 0.4,
        "fiber": 3.1
      }
    },
    {
      "name": "protein powder",
      "quantity": 30,
      "unit": "g",
      "nutritionData": {
        "calories": 120,
        "protein": 24,
        "carbs": 3,
        "fat": 1.5,
        "fiber": 0
      }
    },
    {
      "name": "spinach",
      "quantity": 1,
      "unit": "cup",
      "nutritionData": {
        "calories": 7,
        "protein": 0.9,
        "carbs": 1.1,
        "fat": 0.1,
        "fiber": 0.7
      }
    },
    {
      "name": "almond milk",
      "quantity": 250,
      "unit": "ml",
      "nutritionData": {
        "calories": 40,
        "protein": 1,
        "carbs": 2,
        "fat": 2.5,
        "fiber": 0
      }
    }
  ],
  "servings": 2,
  "instructions": [
    "Add all ingredients to a high-speed blender",
    "Blend until smooth and creamy",
    "Pour into bowls",
    "Top with your favorite toppings like granola, berries, or nuts"
  ],
  "customNotes": "Great for post-workout recovery. Can substitute almond milk with any plant-based milk.",
  "imageUrl": "https://example.com/smoothie-bowl.jpg",
  "healthLabels": ["high-protein", "gluten-free", "vegetarian"],
  "allergens": ["tree-nuts"],
  "dietLabels": ["vegetarian"],
  "cuisineTypes": ["american"],
  "mealTypes": ["breakfast"],
  "dishTypes": ["smoothie"],
  "prepTimeMinutes": 5,
  "cookTimeMinutes": 0,
  "totalTimeMinutes": 5,
  "isPublic": true
}
```

**Response:**
```json
{
  "success": true,
  "message": "Custom recipe created successfully",
  "data": {
    "id": "uuid-here",
    "provider": "manual",
    "recipeName": "High-Protein Smoothie Bowl",
    "caloriesPerServing": 136,
    "proteinPerServingG": 13.6,
    "carbsPerServingG": 16.55,
    "fatPerServingG": 2.25,
    "fiberPerServingG": 1.9,
    "servings": 2,
    "isPublic": true,
    "createdAt": "2025-10-22T10:30:00Z"
  }
}
```

### 2. List Custom Recipes

**Endpoint:** `GET /api/recipes/custom`

**Authentication:** Required

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 20, max: 100) - Results per page
- `search` (optional) - Search by recipe name
- `healthLabels` (optional) - Filter by health labels (comma-separated)
- `cuisineTypes` (optional) - Filter by cuisine types
- `mealTypes` (optional) - Filter by meal types
- `dishTypes` (optional) - Filter by dish types
- `caloriesMin` (optional) - Minimum calories per serving
- `caloriesMax` (optional) - Maximum calories per serving
- `includePublic` (optional, default: true) - Include public recipes from other nutritionists

**Example Request:**
```bash
GET /api/recipes/custom?search=smoothie&healthLabels=high-protein&caloriesMax=300&page=1&limit=10
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "recipeName": "High-Protein Smoothie Bowl",
      "caloriesPerServing": 136,
      "servings": 2,
      "isPublic": true,
      "createdByNutritionistId": "nutritionist-uuid"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "totalCount": 1,
    "totalPages": 1
  }
}
```

### 3. Update Custom Recipe

**Endpoint:** `PUT /api/recipes/custom`

**Authentication:** Required (must be recipe owner)

**Request Body:**
```json
{
  "id": "recipe-uuid",
  "recipeName": "Updated Recipe Name",
  "description": "Updated description",
  "isPublic": false,
  "customNotes": "Updated notes"
}
```

**Notes:**
- Only include fields you want to update
- If ingredients are updated, nutrition will be recalculated
- Ownership is validated before update

### 4. Delete Custom Recipe

**Endpoint:** `DELETE /api/recipes/custom?id=<recipe-id>`

**Authentication:** Required (must be recipe owner)

**Response:**
```json
{
  "success": true,
  "message": "Custom recipe deleted successfully"
}
```

### 5. Search Recipes (Including Custom)

**Endpoint:** `GET /api/recipe-search`

**Query Parameters:**
- `provider` - Set to `'both'` (default), `'manual'` (custom only), `'edamam'`, or `'spoonacular'`
- `includeCustom` - Set to `'true'` (default) or `'false'`
- All standard search parameters (health, cuisineType, etc.)

**Example:**
```bash
# Search only custom recipes
GET /api/recipe-search?provider=manual&query=smoothie

# Search all sources including custom
GET /api/recipe-search?provider=both&includeCustom=true&health=high-protein

# Search without custom recipes
GET /api/recipe-search?provider=both&includeCustom=false
```

## Workflow

### Creating a Recipe

1. **Search Ingredients**
   - Use `/api/ingredients/autocomplete` to search ingredients
   - Get suggestions from both Edamam and Spoonacular

2. **Get Ingredient Nutrition**
   - Use `/api/ingredients/nutrition` for each ingredient
   - Specify quantity and unit
   - Store returned nutrition data

3. **Create Recipe**
   - Compile all ingredients with nutrition data
   - Add instructions, notes, tags
   - Set visibility (public/private)
   - POST to `/api/recipes/custom`

4. **Automatic Calculations**
   - Backend sums nutrition from all ingredients
   - Divides by servings for per-serving values
   - Stores both total and per-serving nutrition

### Using Custom Recipes

Custom recipes integrate seamlessly into the existing meal planning workflow:
- Appear in recipe search results
- Can be added to meal plans
- Support ingredient customization like external recipes
- Track usage statistics

## Data Model

### Ingredient Structure
```typescript
{
  name: string;           // Ingredient name
  quantity: number;       // Amount (e.g., 2, 1.5)
  unit: string;          // Unit (e.g., "cup", "g", "ml")
  nutritionData: {
    calories: number;
    protein: number;      // grams
    carbs: number;        // grams
    fat: number;          // grams
    fiber: number;        // grams
    sugar: number;        // grams
    sodium: number;       // milligrams
    // Extended nutrition fields...
  }
}
```

### Recipe Output
```typescript
{
  id: string;
  provider: 'manual';
  recipeName: string;
  recipeDescription: string;
  servings: number;
  
  // Nutrition (per serving)
  caloriesPerServing: number;
  proteinPerServingG: number;
  carbsPerServingG: number;
  fatPerServingG: number;
  fiberPerServingG: number;
  
  // Total nutrition
  totalCalories: number;
  totalProteinG: number;
  totalCarbsG: number;
  totalFatG: number;
  totalFiberG: number;
  
  // Recipe details
  ingredients: Array<Ingredient>;
  ingredientLines: string[];
  cookingInstructions: string[];
  
  // Metadata
  cuisineTypes: string[];
  mealTypes: string[];
  dishTypes: string[];
  healthLabels: string[];
  dietLabels: string[];
  allergens: string[];
  
  // Time
  prepTimeMinutes: number;
  cookTimeMinutes: number;
  totalTimeMinutes: number;
  
  // Visibility
  isPublic: boolean;
  createdByNutritionistId: string;
  customNotes: string;
  
  // Timestamps
  createdAt: string;
  updatedAt: string;
}
```

## Access Control

### Private Recipes
- Visible only to the creating nutritionist
- Cannot be seen in search by other nutritionists
- Cannot be accessed via recipe details by others

### Public Recipes
- Visible to all nutritionists in the system
- Appear in search results for all users
- Accessible via recipe details to all nutritionists
- Creator retains exclusive edit/delete permissions

## Nutrition Calculation

The system automatically calculates nutrition by:

1. **Summing ingredient nutrition:**
   ```
   totalNutrition = Σ(ingredient.nutritionData × ingredient.quantity)
   ```

2. **Calculating per-serving values:**
   ```
   perServingNutrition = totalNutrition / servings
   ```

3. **Rounding for display:**
   - All values rounded to 2 decimal places
   - Ensures accuracy for meal planning

## Integration Points

### With Existing Systems

1. **Meal Planning**
   - Custom recipes appear in recipe search
   - Can be added to meal plans
   - Support all meal planning features

2. **Recipe Caching**
   - Stored in same table as external recipes
   - Leverage existing cache infrastructure
   - Same standardization and response format

3. **Ingredient Search**
   - Reuse existing ingredient autocomplete
   - Leverage multi-provider nutrition lookup
   - Consistent ingredient data structure

## Error Handling

### Validation Errors (400)
- Missing required fields
- Invalid servings (< 1)
- Empty ingredients array
- Invalid ingredient format

### Authorization Errors (403)
- Attempting to update/delete recipe owned by another user
- Accessing private recipe not owned by user

### Not Found Errors (404)
- Recipe ID does not exist
- Recipe deleted after being fetched

## Example CURL Commands

### Create Recipe
```bash
curl -X POST https://api.example.com/api/recipes/custom \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Quinoa Buddha Bowl",
    "description": "Nutrient-packed vegetarian bowl",
    "ingredients": [
      {
        "name": "quinoa",
        "quantity": 1,
        "unit": "cup",
        "nutritionData": {
          "calories": 222,
          "protein": 8.1,
          "carbs": 39.4,
          "fat": 3.6,
          "fiber": 5.2
        }
      }
    ],
    "servings": 2,
    "isPublic": true
  }'
```

### List Recipes
```bash
curl -X GET "https://api.example.com/api/recipes/custom?page=1&limit=10&search=bowl" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Search Including Custom
```bash
curl -X GET "https://api.example.com/api/recipe-search?provider=both&includeCustom=true&health=vegetarian" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Update Recipe
```bash
curl -X PUT https://api.example.com/api/recipes/custom \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "recipe-uuid",
    "isPublic": false,
    "customNotes": "Updated private notes"
  }'
```

### Delete Recipe
```bash
curl -X DELETE "https://api.example.com/api/recipes/custom?id=recipe-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Best Practices

### For Nutritionists

1. **Ingredient Accuracy**
   - Use ingredient autocomplete to find standardized ingredients
   - Specify accurate quantities and units
   - Verify nutrition data looks reasonable

2. **Recipe Organization**
   - Use descriptive recipe names
   - Add relevant health labels and tags
   - Write clear instructions
   - Mark appropriate meal/dish types

3. **Privacy Management**
   - Set recipes to private during development
   - Make public only when finalized
   - Use custom notes for personal reminders

### For Frontend Developers

1. **Ingredient Selection**
   - Implement autocomplete UI
   - Show nutrition preview as ingredients are added
   - Calculate and display running total

2. **Form Validation**
   - Validate all required fields client-side
   - Ensure at least one ingredient
   - Confirm servings >= 1

3. **User Experience**
   - Show nutrition updates in real-time
   - Provide clear feedback on save/update
   - Distinguish custom vs external recipes in UI

## Migration

Run the migration to add custom recipe fields:

```bash
# Apply migration
psql -d your_database -f database/migrations/065_add_custom_recipe_fields.sql
```

The migration adds:
- New columns to `cached_recipes`
- Indexes for efficient queries
- Comments for documentation

## Testing

### Test Coverage

1. **Unit Tests**
   - CustomRecipeService methods
   - Nutrition calculation logic
   - Access control validation

2. **Integration Tests**
   - Create, read, update, delete operations
   - Search integration with custom recipes
   - Permission enforcement

3. **E2E Tests**
   - Complete recipe creation workflow
   - Public/private recipe visibility
   - Recipe search and filtering

### Test Data

Use the included test scripts to verify functionality:
- Create recipes with various ingredient counts
- Test public/private access controls
- Verify nutrition calculations
- Test search filtering and pagination

## Troubleshooting

### Common Issues

**Issue:** Nutrition values seem incorrect
- **Solution:** Verify ingredient quantities and units match nutrition data source

**Issue:** Recipe not appearing in search
- **Solution:** Check recipe is active (`cache_status='active'`) and access permissions

**Issue:** Cannot update recipe
- **Solution:** Ensure authenticated user is the recipe creator

**Issue:** Ingredient nutrition missing
- **Solution:** Use `/api/ingredients/nutrition` to fetch before creating recipe

## Support

For issues or questions:
- Check API logs for detailed error messages
- Verify authentication token is valid
- Ensure all required fields are provided
- Review this documentation for API contracts

