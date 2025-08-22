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

## 🚀 API Endpoints

### Generate Meal Plan

**POST** `/api/meal-plans`

Generates a complete meal plan for a client based on their EER requirements.

```json
{
  "clientId": "uuid-of-client",
  "planDate": "2024-01-15",
  "planType": "daily",
  "dietaryRestrictions": ["vegetarian", "gluten-free"],
  "cuisinePreferences": ["italian", "mediterranean"],
  "mealPreferences": {
    "breakfast": ["quick", "protein-rich"],
    "lunch": ["light", "fiber-rich"]
  },
  "targetCalories": 2000
}
```

**Response:**
```json
{
  "message": "Meal plan generated successfully",
  "mealPlan": {
    "id": "meal-plan-uuid",
    "clientId": "client-uuid",
    "planName": "Daily Meal Plan",
    "planDate": "2024-01-15",
    "targetCalories": 2000,
    "targetProtein": 150,
    "targetCarbs": 200,
    "targetFat": 67,
    "meals": [
      {
        "mealType": "breakfast",
        "recipeName": "Protein Smoothie Bowl",
        "caloriesPerServing": 350,
        "proteinGrams": 25,
        "carbsGrams": 45,
        "fatGrams": 12,
        "ingredients": ["banana", "protein powder", "almond milk"]
      }
      // ... more meals
    ],
    "nutritionSummary": {
      "totalCalories": 1985,
      "totalProtein": 148,
      "totalCarbs": 198,
      "totalFat": 65
    }
  }
}
```

### Get Client Meal Plans

**GET** `/api/meal-plans?clientId=uuid-of-client`

Retrieves all meal plans for a specific client.

### Get Specific Meal Plan

**GET** `/api/meal-plans/{id}`

Retrieves a specific meal plan by ID.

### Update Meal Plan Status

**PUT** `/api/meal-plans/{id}`

Updates the status of a meal plan.

```json
{
  "status": "active"
}
```

Valid statuses: `draft`, `active`, `completed`, `archived`

### Delete Meal Plan

**DELETE** `/api/meal-plans/{id}`

Deletes a meal plan and all associated meals.

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
