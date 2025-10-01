# Meal Plan Generation API

## Overview
This API generates personalized n-day meal plans for clients based on their nutritional goals, meal programs, dietary preferences, and allergens.

## Endpoint
`POST /api/meal-plans/generate`

## Authentication
Requires nutritionist authentication via JWT token.

## Request Body
```json
{
  "clientId": "string (required)",
  "days": "number (optional, default: 7, max: 30)",
  "mealProgramId": "string (optional)",
  "startDate": "string (optional, DD-MMM-YYYY format, e.g., '15-Jul-2025')",
  "goalOverrides": {
    "calories": "number (optional, 500-5000)",
    "protein": "number (optional, 0-500)",
    "carbs": "number (optional, 0-1000)",
    "fat": "number (optional, 0-300)",
    "fiber": "number (optional, 0-100)"
  },
  "dietaryOverrides": {
    "allergies": "string[] (optional)",
    "dietaryPreferences": "string[] (optional)",
    "cuisineTypes": "string[] (optional)"
  }
}
```

## Features

### 🎯 **Smart Recipe Selection**
- **3 recipes from Edamam** + **3 recipes from Spoonacular** per meal
- **Randomized selection** for variety
- **Calorie and macro targeting** based on meal program or client goals

### 🍽️ **Meal Program Integration**
- Uses client's meal program if `mealProgramId` provided
- Falls back to even distribution (25% breakfast, 35% lunch, 30% dinner, 10% snacks)
- Respects meal-specific calorie and protein targets

### 🥗 **Dietary Preferences & Allergens**
- Filters recipes based on client's allergies
- Applies dietary preferences (vegetarian, vegan, keto, etc.)
- Passes health labels to Edamam/Spoonacular APIs
- **Override support**: Can override client's dietary preferences and allergens via `dietaryOverrides`

### 🎯 **Goal Overrides**
- **Override client goals**: Can override calories, protein, carbs, fat, and fiber via `goalOverrides`
- **Flexible targeting**: Allows temporary goal adjustments for specific meal plans
- **Validation**: Ensures override values are within reasonable ranges

### 📅 **Custom Start Date**
- **Flexible scheduling**: Specify start date in DD-MMM-YYYY format (e.g., "15-Jul-2025")
- **Date-wise response**: Meal plans are generated with proper date progression
- **Default behavior**: If no start date provided, uses current date

### 📦 **Cache-First Strategy**
- Checks recipe cache before API calls
- Stores new recipes automatically
- Reduces API costs and improves performance

### 📊 **Comprehensive Data**
- Daily nutritional totals
- Per-meal calorie and macro breakdowns
- Recipe details with nutrition info
- Cache status tracking

## Response Format

```json
{
  "success": true,
  "data": {
    "clientId": "uuid",
    "nutritionistId": "uuid",
    "days": 7,
    "startDate": "2025-07-15",
    "mealProgram": "uuid or null",
    "generatedAt": "2025-01-29T12:00:00.000Z",
    "inputFilters": {
      "clientGoals": {
        "calories": 2000,
        "protein": 150,
        "carbs": 250,
        "fat": 65,
        "fiber": 25
      },
      "dietaryPreferences": {
        "allergies": ["dairy-free"],
        "dietaryPreferences": ["vegetarian"],
        "cuisineTypes": ["indian"]
      },
      "goalOverrides": null,
      "dietaryOverrides": null,
      "mealProgram": {
        "id": "uuid",
        "name": "Program Name",
        "breakfastCalories": 500,
        "lunchCalories": 700,
        "dinnerCalories": 600,
        "snacksCalories": 200
      }
    },
    "mealPlan": [
      {
        "day": 1,
        "date": "2025-07-15",
        "meals": {
          "breakfast": [
            {
              "id": "recipe_id",
              "title": "Recipe Title",
              "image": "image_url",
              "sourceUrl": "source_url",
              "source": "edamam",
              "servings": 1,
              "fromCache": false
            }
          ],
          "lunch": [...],
          "dinner": [...],
          "snacks": [...]
        },
        "searchParams": {
          "breakfast": {
            "edamam": {},
            "spoonacular": {}
          }
        }
      }
    ]
  },
  "message": "Generated 7-day meal plan suggestions successfully"
}
```

## Example Usage

### Basic Request
```json
{
  "clientId": "a376c7f1-d053-4ead-809d-00f46ca7d2c8",
  "days": 5
}
```

### Advanced Request with Overrides
```json
{
  "clientId": "a376c7f1-d053-4ead-809d-00f46ca7d2c8",
  "days": 7,
  "startDate": "15-Jul-2025",
  "goalOverrides": {
    "calories": 2500,
    "protein": 180,
    "carbs": 300,
    "fat": 80,
    "fiber": 30
  },
  "dietaryOverrides": {
    "allergies": ["gluten-free", "dairy-free"],
    "dietaryPreferences": ["vegetarian"],
    "cuisineTypes": ["indian", "mediterranean"]
  }
}
```

## Response Format (Legacy)

```json
{
  "success": true,
  "data": {
    "mealPlanId": "uuid",
    "clientId": "string",
    "nutritionistId": "string",
    "days": 7,
    "mealProgram": "uuid or null",
    "generatedAt": "2024-01-01T00:00:00.000Z",
    "mealPlan": [
      {
        "day": 1,
        "date": "2024-01-01",
        "meals": {
          "breakfast": [
            {
              "id": "recipe123",
              "title": "Healthy Oatmeal",
              "image": "https://...",
              "sourceUrl": "https://...",
              "source": "edamam",
              "calories": 350,
              "protein": 12,
              "carbs": 45,
              "fat": 8,
              "fiber": 6,
              "servings": 1,
              "readyInMinutes": 10,
              "fromCache": true,
              "cacheId": "uuid"
            }
            // ... 5 more breakfast suggestions
          ],
          "lunch": [...], // 6 lunch suggestions
          "dinner": [...], // 6 dinner suggestions
          "snacks": [...]  // 6 snack suggestions
        },
        "dailyTotals": {
          "calories": 1850,
          "protein": 120,
          "carbs": 180,
          "fat": 65,
          "fiber": 25
        }
      }
      // ... more days
    ]
  },
  "message": "Generated 7-day meal plan successfully"
}
```

## Usage Examples

### Basic 7-Day Meal Plan
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/generate' \
  --header 'authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "clientId": "client-uuid-here"
  }'
```

### Custom Meal Program
```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/generate' \
  --header 'authorization: Bearer YOUR_JWT_TOKEN' \
  --header 'Content-Type: application/json' \
  --data '{
    "clientId": "client-uuid-here",
    "days": 14,
    "mealProgramId": "meal-program-uuid-here"
  }'
```

## Error Responses

### Client Not Found
```json
{
  "error": "Client not found",
  "message": "The specified client does not exist or you do not have access to it"
}
```

### Invalid Parameters
```json
{
  "error": "Invalid days parameter",
  "message": "days must be between 1 and 30"
}
```

## Data Sources

### Client Data Retrieved:
- **Nutrition Requirements**: Calories, protein, carbs, fat, fiber targets
- **Meal Program**: Meal-specific calorie/protein distribution
- **Dietary Preferences**: Allergies, dietary restrictions
- **Client Profile**: Basic client information

### Recipe Sources:
- **Edamam API**: 3 recipes per meal type
- **Spoonacular API**: 3 recipes per meal type
- **Recipe Cache**: Previously fetched recipes for performance

## Performance Features

### ⚡ **Optimization**
- Cache-first recipe retrieval
- Async cache storage
- Parallel API calls where possible
- Efficient database queries

### 💰 **Cost Management**
- Reduces API calls through caching
- Smart recipe selection to minimize API usage
- Batch processing for multiple days

### 🎯 **Quality Assurance**
- Data quality scoring for recipes
- Nutritional completeness validation
- Error handling and fallbacks

## Integration Notes

### Database Tables Used:
- `clients` - Client basic information
- `client_nutrition_requirements` - Nutritional targets
- `meal_programs` - Meal distribution preferences
- `client_goals` - Dietary preferences and allergens
- `meal_plans` - Generated meal plan storage
- `cached_recipes` - Recipe cache for performance

### External APIs:
- **Edamam Recipe API** - Recipe search and details
- **Spoonacular API** - Recipe search and details

This API provides a comprehensive solution for generating personalized meal plans with optimal performance and cost efficiency.
