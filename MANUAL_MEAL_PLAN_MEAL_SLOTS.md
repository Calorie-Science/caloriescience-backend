# Manual Meal Plan - Meal Slot Management API

## Overview

Manage meal slots in manual meal plans with target calories and meal times. This allows nutritionists to define the structure of the meal plan before adding recipes.

## Meal Slot Structure

Each meal slot contains:
- `mealName`: Name of the meal (e.g., "breakfast", "Pre-Workout", "Brunch")
- `mealTime`: Time of meal in HH:MM format (e.g., "08:00", "12:30")
- `targetCalories`: Target calorie goal for this meal (optional)
- `recipes`: Array of recipes in this meal
- `totalNutrition`: Actual nutrition from all recipes

## Default Meal Slots

When creating a manual meal plan without a meal program, these default slots are created:

```json
[
  { "mealName": "breakfast", "mealTime": "08:00", "targetCalories": 500 },
  { "mealName": "lunch", "mealTime": "12:00", "targetCalories": 600 },
  { "mealName": "dinner", "mealTime": "18:00", "targetCalories": 600 },
  { "mealName": "snack", "mealTime": "15:00", "targetCalories": 200 }
]
```

## API Endpoints

### 1. Create Meal Slot

**Endpoint:** `POST /api/meal-plans/manual/meal-slot`

**Action:** `create`

**Request:**
```json
{
  "action": "create",
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "Pre-Workout",
  "mealTime": "06:00",
  "targetCalories": 300
}
```

**Response:**
Returns complete draft with updated meal structure (same as GET endpoint)

**Validation:**
- Meal name must be unique (case-insensitive)
- Meal time format: HH:MM (optional)
- Target calories must be ≥ 0 (optional)

---

### 2. Update Meal Slot

**Endpoint:** `POST /api/meal-plans/manual/meal-slot`

**Action:** `update`

**Request:**
```json
{
  "action": "update",
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "breakfast",
  "mealTime": "07:00",
  "targetCalories": 550
}
```

**Response:**
Returns complete draft with updated meal structure

**Notes:**
- Can update existing meals created via meal program or dynamically
- Partial updates: only provide fields you want to change
- Case-insensitive meal name matching

---

### 3. Delete Meal Slot

**Endpoint:** `POST /api/meal-plans/manual/meal-slot`

**Action:** `delete`

**Request:**
```json
{
  "action": "delete",
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "snack"
}
```

**Response:**
Returns complete draft without the deleted meal slot

**Notes:**
- Deletes the entire meal slot including all recipes
- Same as calling remove-recipe with `removeMealSlot: true`

---

## Complete Meal Structure Response

All manual meal plan APIs now return meal slots with metadata:

```json
{
  "data": {
    "suggestions": [
      {
        "day": 1,
        "date": "2025-10-20",
        "meals": {
          "breakfast": {
            "mealTime": "08:00",
            "targetCalories": 500,
            "recipes": [
              {
                "id": "recipe-1",
                "title": "Scrambled Eggs",
                "calories": 200,
                ...
              },
              {
                "id": "recipe-2",
                "title": "Toast",
                "calories": 150,
                ...
              }
            ],
            "totalNutrition": {
              "calories": { "quantity": 350, "unit": "kcal" },
              ...
            },
            "calorieTarget": {
              "target": 500,
              "actual": 350,
              "difference": -150,
              "percentageOfTarget": 70
            }
          }
        }
      }
    ]
  }
}
```

## Use Cases

### 1. Define Meal Structure Before Adding Recipes

```bash
# Create meal slots first
POST /api/meal-plans/manual/meal-slot
{
  "action": "create",
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "Pre-Workout",
  "mealTime": "06:00",
  "targetCalories": 300
}

# Then add recipes to the slot
POST /api/meal-plans/manual/add-recipe
{
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "Pre-Workout",
  "recipe": { ... }
}
```

### 2. Adjust Target Calories After Adding Recipes

```bash
# Add recipes first (slot created automatically)
POST /api/meal-plans/manual/add-recipe
{
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "breakfast",
  "recipe": { ... }
}

# Then set target calories
POST /api/meal-plans/manual/meal-slot
{
  "action": "update",
  "draftId": "manual-uuid",
  "day": 1,
  "mealName": "breakfast",
  "targetCalories": 600
}
```

### 3. Custom Meal Schedule

```bash
# Create custom meal schedule for an athlete
POST /api/meal-plans/manual/meal-slot (action: create)
- "Early Morning": 05:00, 250 cal
- "Pre-Workout": 07:00, 300 cal
- "Post-Workout": 09:00, 400 cal
- "Lunch": 13:00, 700 cal
- "Pre-Training": 16:00, 250 cal
- "Dinner": 20:00, 600 cal
- "Before Bed": 22:00, 200 cal
```

## Benefits

1. **Flexible Planning**: Define meals before finding recipes
2. **Target Tracking**: See how actual nutrition compares to targets
3. **Custom Schedules**: Support any meal timing (athletes, shift workers, etc.)
4. **Progressive Building**: Create structure → Add recipes → Adjust targets
5. **UI Feedback**: Show calorie targets and progress bars in UI

## Example: Complete Workflow

```bash
# 1. Create draft
POST /api/meal-plans/manual/create
{ "clientId": "uuid", "planDate": "2025-10-25", "durationDays": 1 }

# 2. Customize meal structure
POST /api/meal-plans/manual/meal-slot
{ "action": "update", "day": 1, "mealName": "breakfast", "targetCalories": 550 }

POST /api/meal-plans/manual/meal-slot
{ "action": "create", "day": 1, "mealName": "Brunch", "mealTime": "10:30", "targetCalories": 400 }

# 3. Add recipes
POST /api/meal-plans/manual/add-recipe
{ "mealName": "breakfast", "recipe": {...} }

POST /api/meal-plans/manual/add-recipe
{ "mealName": "Brunch", "recipe": {...} }

# 4. Check progress
GET /api/meal-plans/manual/{id}
# Returns actual vs target calories for each meal
```

