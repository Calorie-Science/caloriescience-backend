# 🎯 Client Goals System

## Overview

The Client Goals system allows nutritionists to set specific nutrition targets for their clients, including EER (Estimated Energy Requirement), BMR (Basal Metabolic Rate), and macro-nutrient goals. These goals are then used to generate personalized meal plans that respect the client's meal program structure.

## 🏗️ Architecture

### Database Schema

#### `client_goals` Table
```sql
CREATE TABLE client_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    nutritionist_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Energy Goals
    eer_goal_calories INTEGER NOT NULL,
    bmr_goal_calories INTEGER NOT NULL,
    
    -- Macro Goals (grams)
    protein_goal_grams DECIMAL(6,2) NOT NULL,
    carbs_goal_grams DECIMAL(6,2) NOT NULL,
    fat_goal_grams DECIMAL(6,2) NOT NULL,
    
    -- Macro Percentages
    protein_goal_percentage DECIMAL(5,2) NOT NULL,
    carbs_goal_percentage DECIMAL(5,2) NOT NULL,
    fat_goal_percentage DECIMAL(5,2) NOT NULL,
    
    -- Additional Goals
    fiber_goal_grams DECIMAL(6,2),
    water_goal_liters DECIMAL(4,2),
    
    -- Goal Status
    is_active BOOLEAN DEFAULT true,
    goal_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
    goal_end_date DATE,
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(client_id, is_active),
    CHECK (eer_goal_calories > 0),
    CHECK (bmr_goal_calories > 0),
    CHECK (protein_goal_grams > 0),
    CHECK (carbs_goal_grams > 0),
    CHECK (fat_goal_grams > 0),
    CHECK (protein_goal_percentage + carbs_goal_percentage + fat_goal_percentage = 100),
    CHECK (goal_end_date IS NULL OR goal_end_date > goal_start_date)
);
```

#### `meal_program_meals` Table
```sql
-- Core meal program fields (no percentage fields)
CREATE TABLE meal_program_meals (
    id UUID PRIMARY KEY,
    meal_program_id UUID NOT NULL,
    meal_order INTEGER NOT NULL,
    meal_name VARCHAR(255) NOT NULL,
    meal_time TIME NOT NULL,
    target_calories INTEGER,
    meal_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);

-- Daily macro requirements come from client_goals table
-- Per-meal calorie filters use target_calories from meal_program_meals
```

## 🔄 Integration Flow

```
Client Goals → Meal Program → Meal Planning → Edamam API → Personalized Meals
     ↓              ↓              ↓            ↓            ↓
  EER, BMR,    Meal Names,    Calculate    Map to      Return
  Macros       Times, %       Distribution Edamam      Structured
  Targets      Distribution   per Meal     Meal Types  Response
```

### **Updated Flow with UI Overrides:**

1. **Client Goals** - Set EER, BMR, and daily macro targets
2. **Meal Program** - Define meal names, times, and calorie percentages
3. **Meal Planning** - UI can optionally override meal calories via `uiOverrideMeals`
4. **Edamam API** - Send per-meal calorie filters + daily macro constraints from client goals
5. **Response** - Return meals respecting both meal program structure and UI overrides

## 📡 API Endpoints

### Base URL
```
https://caloriescience-api.vercel.app/api/meal-plans
```

### 1. Create Client Goal
```http
POST /api/meal-plans
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "client-goal",
  "clientId": "uuid",
  "eerGoalCalories": 2200,
  "bmrGoalCalories": 1800,
  "proteinGoalGrams": 165,
  "carbsGoalGrams": 220,
  "fatGoalGrams": 73,
  "proteinGoalPercentage": 30,
  "carbsGoalPercentage": 40,
  "fatGoalPercentage": 30,
  "fiberGoalGrams": 25,
  "waterGoalLiters": 2.5,
  "notes": "High protein diet for muscle building"
}
```

### 2. Get Client Goals
```http
GET /api/meal-plans?clientId=uuid&mode=client-goals
Authorization: Bearer <token>
```

### 3. Create Meal Program
```http
POST /api/meal-plans
Content-Type: application/json
Authorization: Bearer <token>

{
  "type": "meal-program",
  "clientId": "uuid",
  "name": "High Protein 6-Meal Plan",
  "description": "A meal program designed for muscle building",
  "meals": [
    {
      "mealOrder": 1,
      "mealName": "Pre-Breakfast Protein",
      "mealTime": "06:30",
      "targetCalories": 200,
      "mealType": "snack"
    }
    // ... more meals
  ]
}
```

### 4. Generate Meal Plan from Program
```http
POST /api/meal-plans
Content-Type: application/json
Authorization: Bearer <token>

{
    "type": "meal-plan",
    "action": "preview",
    "clientId": "uuid",
    "planDate": "2025-01-26",
    "dietaryRestrictions": ["vegetarian", "gluten-free"],
    "cuisinePreferences": ["mediterranean"],
    "uiOverrideMeals": [
        {
            "mealOrder": 1,
            "targetCalories": 250
        },
        {
            "mealOrder": 2,
            "targetCalories": 550
        }
    ]
}
```

## 🧮 Calculation Logic

### Macro Distribution per Meal

#### Option 1: Meal-Specific Macro Percentages
If a meal has specific macro percentages defined:
```typescript
mealProtein = (dailyProtein * meal.proteinPercentage) / 100
mealCarbs = (dailyCarbs * meal.carbsPercentage) / 100
mealFat = (dailyFat * meal.fatPercentage) / 100
```

#### Option 2: Proportional Distribution
If no meal-specific macro percentages:
```typescript
mealProtein = (dailyProtein * meal.caloriePercentage) / 100
mealCarbs = (dailyCarbs * meal.caloriePercentage) / 100
mealFat = (dailyFat * meal.caloriePercentage) / 100
```

### Edamam Meal Type Mapping

| Custom Meal Name | Edamam Meal Type | Edamam Section |
|------------------|------------------|----------------|
| "Breakfast" | `breakfast` | Breakfast |
| "Lunch" | `lunch/dinner` | Lunch |
| "Dinner" | `lunch/dinner` | Lunch |
| "Snack" | `snack` | Snack |
| "Brunch" | `brunch` | Brunch |
| "Tea Time" | `teatime` | Teatime |

## 🔧 Usage Examples

### Complete Workflow

1. **Set Client Goals**
   ```bash
   curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
   --header 'Content-Type: application/json' \
   --header 'Authorization: Bearer <token>' \
   --data '{
     "type": "client-goal",
     "clientId": "uuid",
     "eerGoalCalories": 2200,
     "bmrGoalCalories": 1800,
     "proteinGoalGrams": 165,
     "carbsGoalGrams": 220,
     "fatGoalGrams": 73,
     "proteinGoalPercentage": 30,
     "carbsGoalPercentage": 40,
     "fatGoalPercentage": 30
   }'
   ```

2. **Create Meal Program**
   ```bash
   curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
   --header 'Content-Type: application/json' \
   --header 'Authorization: Bearer <token>' \
   --data '{
     "type": "meal-program",
     "clientId": "uuid",
     "name": "6-Meal Plan",
     "meals": [
       {
         "mealOrder": 1,
         "mealName": "Breakfast",
         "mealTime": "08:00",
         "caloriePercentage": 25,
         "mealType": "breakfast"
       }
     ]
   }'
   ```

3. **Generate Meal Plan**
   ```bash
   curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
   --header 'Content-Type: application/json' \
   --header 'Authorization: Bearer <token>' \
   --data '{
     "type": "meal-plan",
     "action": "preview",
     "clientId": "uuid",
     "planDate": "2025-01-26",
     "dietaryRestrictions": ["vegetarian"]
   }'
   ```

## 🧪 Testing

Run the test script to verify all functionality:
```bash
node test-client-goals.js
```

## ⚠️ Important Notes

1. **Percentage Validation**: Macro percentages must add up to exactly 100%
2. **Meal Program Priority**: If a client has an active meal program, meal planning will automatically use it
3. **Edamam Integration**: Custom meal names are mapped to Edamam's supported meal types
4. **Macro Distribution**: Meals can have specific macro percentages or use proportional distribution
5. **Goal Uniqueness**: Only one active goal per client at a time

## 🔮 Future Enhancements

- Goal history tracking
- Goal comparison and progress analysis
- Automated goal recommendations based on client data
- Goal templates for common nutrition plans
- Integration with fitness tracking apps
