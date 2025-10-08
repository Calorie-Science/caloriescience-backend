# Meal Planning System with Edamam Integration

This document describes the comprehensive meal planning system that integrates with Edamam APIs to generate personalized meal plans based on your clients' EER (Estimated Energy Requirement) requirements.

## 🏗️ System Architecture

The meal planning system consists of several key components:

1. **Edamam Service** (`lib/edamamService.ts`) - Handles all API interactions with Edamam
2. **Meal Planning Service** (`lib/mealPlanningService.ts`) - Core business logic for meal plan generation
3. **Database Tables** - Store meal plans, meals, and feedback
4. **API Endpoints** - RESTful endpoints for meal plan management
5. **Integration** - Seamlessly works with existing EER calculations

## 🗄️ Database Schema

### New Tables Added

#### `meal_plans`
- Stores generated meal plans with nutrition targets
- Links to clients and nutritionists
- Tracks plan status and preferences

#### `meal_plan_meals`
- Individual meals within a plan
- Contains recipe data from Edamam
- Calculated nutrition per serving and total

#### `meal_plan_feedback`
- Client feedback and ratings
- Tracks satisfaction and preferences

## 🔧 Setup & Configuration

### 1. Environment Variables

Add these to your `.env.local` file:

```bash
# Edamam API Credentials
EDAMAM_APP_ID=your_edamam_app_id
EDAMAM_APP_KEY=your_edamam_app_key
```

### 2. Database Migration

Run the new migration to create meal planning tables:

```bash
# The migration file is: database/migrations/035_create_meal_planning_tables.sql
# This will be automatically applied when you deploy
```

## 🚀 API Endpoints (Updated - Drafts System)

The meal planning system now uses a **draft-based workflow** where nutritionists can generate, customize, and finalize meal plans. All meal plans are stored in the `meal_plan_drafts` table with different statuses.

### Generate Meal Plan Draft

**POST** `/api/meal-plans/generate`

Generates a new meal plan draft with recipe suggestions for customization.

```json
{
  "clientId": "uuid-of-client",
  "days": 7,
  "startDate": "2025-01-29",
  "mealProgramId": "uuid-of-meal-program",
  "goalOverrides": {
    "calories": 2000,
    "protein": 150,
    "carbs": 250,
    "fat": 67
  },
  "dietaryOverrides": {
    "allergies": ["dairy-free"],
    "dietaryPreferences": ["vegetarian"],
    "cuisineTypes": ["indian"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "draftId": "draft-uuid",
    "clientId": "client-uuid",
    "days": 7,
    "startDate": "2025-01-29",
    "suggestions": [
      {
        "day": 1,
        "date": "2025-01-29",
        "meals": {
          "breakfast": {
            "recipes": [
              {
                "id": "recipe-123",
                "title": "Protein Smoothie Bowl",
                "calories": 350,
                "protein": 25,
                "carbs": 45,
                "fat": 12,
                "image": "https://...",
                "source": "edamam"
              }
            ],
            "selectedRecipeId": null
          }
        }
      }
    ]
  }
}
```

### Get Meal Plan Drafts (Paginated)

**GET** `/api/meal-plans/drafts`

Retrieves paginated list of meal plan drafts with optional filtering.

**Query Parameters:**
- `clientId` (optional): Filter by client
- `status` (optional): Filter by status (`draft`, `finalized`, `completed`)
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Results per page (default: 10, max: 100)
- `includeNutrition` (optional): Include detailed nutrition (default: true)

**Example:** `GET /api/meal-plans/drafts?status=finalized&page=1&pageSize=20`

**Response:**
```json
{
  "success": true,
  "data": {
    "drafts": [
      {
        "id": "draft-uuid",
        "clientId": "client-uuid",
        "status": "finalized",
        "totalDays": 7,
        "totalMeals": 21,
        "selectedMeals": 21,
        "completionPercentage": 100,
        "nutrition": {
          "byDay": [...],
          "overall": {
            "calories": 14000,
            "protein": 1050,
            "carbs": 1750,
            "fat": 469
          },
          "dailyAverage": {
            "calories": 2000,
            "protein": 150,
            "carbs": 250,
            "fat": 67
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalCount": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

### Get Specific Meal Plan Draft with Micronutrients

**GET** `/api/meal-plans/drafts/[id]`

Retrieves detailed meal plan draft with complete micronutrient data.

**Response includes:**
- Complete macro and micronutrient breakdown per meal
- Day-wise and overall nutrition totals
- Customization tracking
- Ingredient modifications
- Recipe details with images and sources

### Manage Meal Plan Draft

**POST** `/api/meal-plans/draft`

Perform various actions on meal plan drafts.

**Select Recipe:**
```json
{
  "action": "select-recipe",
  "draftId": "draft-uuid",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "recipe-123"
}
```

**Finalize Draft:**
```json
{
  "action": "finalize-draft",
  "draftId": "draft-uuid",
  "planName": "Week 1 Meal Plan"
}
```

**Replace Ingredient:**
```json
{
  "action": "replace-ingredient",
  "draftId": "draft-uuid",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "recipe-123",
  "originalIngredient": "100 gram milk",
  "newIngredient": "almond milk",
  "amount": 100,
  "unit": "gram",
  "source": "edamam"
}
```

### Get Customized Recipe

**GET** `/api/recipes/customized`

Get recipe with all customizations applied.

**Query Parameters:**
- `recipeId`: Recipe ID
- `draftId`: Meal plan draft ID
- `day`: Day number
- `mealName`: Meal name (breakfast, lunch, dinner, snacks)

**Example:** `GET /api/recipes/customized?recipeId=123&draftId=456&day=1&mealName=breakfast`

**Response:**
```json
{
  "success": true,
  "data": {
    "recipe": {
      "id": "123",
      "title": "Protein Smoothie Bowl",
      "ingredients": [
        { "name": "banana", "amount": 1, "unit": "medium" },
        { "name": "protein powder", "amount": 1, "unit": "scoop" }
      ],
      "calories": 350,
      "protein": 25,
      "carbs": 45,
      "fat": 12
    },
    "hasCustomizations": true,
    "customizations": {
      "modifications": [
        {
          "type": "replace",
          "originalIngredient": "milk",
          "newIngredient": "almond milk",
          "notes": "Dairy-free substitution"
        }
      ]
    }
  }
}
```

## 📊 Meal Plan Statuses

- **`draft`**: Initial state with recipe suggestions, can be customized
- **`finalized`**: Customized and finalized, ready for client use
- **`completed`**: Client has completed the meal plan
- **`archived`**: Historical meal plan for reference

### Search Recipes

**GET** `/api/recipes/search`

Search for recipes using various criteria.

**Query Parameters:**
- `query` - Search term (e.g., "chicken pasta")
- `diet` - Dietary restrictions (e.g., `["vegetarian", "gluten-free"]`)
- `health` - Health labels (e.g., `["low-sodium", "high-protein"]`)
- `cuisineType` - Cuisine preferences (e.g., `["italian", "indian"]`)
- `mealType` - Meal type (e.g., `["breakfast", "lunch"]`)
- `calories` - Calorie range (e.g., `"300-500"`)
- `time` - Cooking time (e.g., `"0-30"`)
- `imageSize` - Image size preference (`THUMBNAIL`, `SMALL`, `REGULAR`, `LARGE`)

## 🧮 How It Works

### 1. EER Integration
- Automatically retrieves client's calculated EER requirements
- Uses stored protein, carbs, fat, and fiber targets
- Respects dietary preferences and restrictions

### 2. Meal Distribution
The system distributes nutrition targets across meals:
- **Breakfast**: 25% of daily targets
- **Lunch**: 35% of daily targets  
- **Dinner**: 35% of daily targets
- **Snack**: 5% of daily targets

### 3. Recipe Selection
- Searches Edamam API for suitable recipes
- Filters by nutrition targets (±20% tolerance)
- Considers dietary restrictions and preferences
- Optimizes serving sizes to meet targets

### 4. Nutrition Calculation
- Calculates total nutrition for the entire plan
- Provides percentage breakdown of macros
- Ensures targets are met within reasonable ranges

## 🎯 Features

### Smart Recipe Matching
- **Nutrition-based filtering** - Recipes must meet macro targets
- **Dietary compliance** - Respects vegetarian, vegan, gluten-free, etc.
- **Cuisine preferences** - Can focus on specific cuisines
- **Cooking time** - Considers preparation time preferences

### Flexible Preferences
- **Client-level preferences** - Stored in client profile
- **Request-level overrides** - Can be modified per meal plan
- **Automatic merging** - Combines stored and request preferences

### Comprehensive Data
- **Full recipe information** - Ingredients, instructions, images
- **Nutrition breakdown** - Per serving and total calculations
- **Edamam integration** - Direct links to source recipes
- **Feedback system** - Track client satisfaction

## 🔍 Recipe Search Capabilities

### Dietary Filters
- Vegetarian, Vegan, Gluten-free, Dairy-free
- Low-carb, High-protein, Low-sodium
- Keto-friendly, Mediterranean, DASH diet

### Cuisine Types
- American, Italian, Indian, Chinese, Japanese
- Mediterranean, Mexican, Thai, French
- And many more...

### Meal Types
- Breakfast, Lunch, Dinner, Snack
- Brunch, Teatime

### Advanced Features
- **CO2 emissions** - Environmental impact ratings
- **Cooking time** - Quick meals vs. elaborate dishes
- **Image sizes** - Various resolution options
- **Random selection** - Discover new recipes

## 📊 Example Usage

### Generate a Daily Meal Plan

```javascript
const response = await fetch('/api/meal-plans', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    clientId: 'client-uuid',
    planDate: '2024-01-15',
    planType: 'daily',
    dietaryRestrictions: ['vegetarian'],
    cuisinePreferences: ['mediterranean', 'italian']
  })
});

const { mealPlan } = await response.json();
console.log(`Generated plan with ${mealPlan.meals.length} meals`);
```

### Search for Quick Breakfast Recipes

```javascript
const response = await fetch('/api/recipes/search?mealType=breakfast&time=0-15&diet=vegetarian&imageSize=REGULAR', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

const { results } = await response.json();
console.log(`Found ${results.hits.length} quick vegetarian breakfast recipes`);
```

## 🚨 Error Handling

The system includes comprehensive error handling:

- **Validation errors** - Invalid dates, missing fields
- **API errors** - Edamam API failures, rate limits
- **Database errors** - Connection issues, constraint violations
- **Authorization errors** - Invalid tokens, insufficient permissions

## 🔒 Security Features

- **Authentication required** - All endpoints require valid JWT tokens
- **Client ownership** - Nutritionists can only access their own clients' data
- **Input validation** - Comprehensive validation of all inputs
- **SQL injection protection** - Uses parameterized queries

## 📈 Performance Considerations

- **Efficient queries** - Optimized database indexes
- **API caching** - Edamam responses can be cached
- **Batch operations** - Bulk meal plan operations
- **Async processing** - Non-blocking meal plan generation

## 🧪 Testing

### Test Meal Plan Generation

```bash
# Test with a sample client
curl -X POST http://localhost:3000/api/meal-plans \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "test-client-uuid",
    "planDate": "2024-01-15",
    "planType": "daily"
  }'
```

### Test Recipe Search

```bash
# Search for vegetarian lunch recipes
curl "http://localhost:3000/api/recipes/search?mealType=lunch&diet=vegetarian&imageSize=REGULAR" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 🔮 Future Enhancements

### Planned Features
- **Weekly meal plans** - Generate 7-day plans
- **Shopping lists** - Automatic ingredient aggregation
- **Recipe substitutions** - Alternative ingredient suggestions
- **Nutritional analysis** - Detailed micronutrient breakdown
- **Client feedback** - Rating and review system
- **Meal plan templates** - Reusable plan structures

### Integration Opportunities
- **Calendar integration** - Sync with client calendars
- **Shopping apps** - Export to grocery apps
- **Fitness trackers** - Sync with activity data
- **Social sharing** - Share meal plans with clients

## 📚 Additional Resources

- [Edamam Recipe API Documentation](https://developer.edamam.com/edamam-docs-recipe-api)
- [Edamam Meal Planner API](https://developer.edamam.com/edamam-docs-meal-planner-api)
- [Nutrition Guidelines](https://www.who.int/health-topics/nutrition)
- [Dietary Reference Intakes](https://www.nationalacademies.org/our-work/set-dietary-reference-intakes-consumers)

## 🆘 Support

For technical support or questions about the meal planning system:

1. Check the API documentation above
2. Review error logs for specific issues
3. Verify Edamam API credentials are correct
4. Ensure database migrations have been applied
5. Check that client EER requirements exist in the database

---

**Note**: This system requires valid Edamam API credentials and an active internet connection to function properly. All recipe data is sourced from Edamam's extensive database of web recipes.
