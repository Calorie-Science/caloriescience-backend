# Meal Slot Management - Test Guide

## Setup

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjA0NDI0OTYsImV4cCI6MTc2MTA0NzI5Nn0.YTkvCBlY2HIFvt-902EnIZqSPX60sla0Ox7RUoAxUfE"
CLIENT_ID="256e827e-040d-4c19-8540-c9299a7a3ab8"
```

## Test Workflow

### 1. Create Manual Meal Plan with Default Slots

```bash
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/create' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"clientId\": \"$CLIENT_ID\",
    \"planDate\": \"2025-10-26\",
    \"durationDays\": 1
  }" | jq '{
  draftId: .data.draftId,
  defaultMeals: .data.suggestions[0].meals | to_entries | map({
    meal: .key,
    mealTime: .value.mealTime,
    targetCalories: .value.targetCalories
  })
}'

# Save draft ID
DRAFT_ID="manual-uuid-from-response"
```

**Expected:** 4 default meals with target calories (breakfast: 500, lunch: 600, dinner: 600, snack: 200)

### 2. Create Custom Meal Slot

```bash
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/meal-slot' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"action\": \"create\",
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"Pre-Workout\",
    \"mealTime\": \"06:00\",
    \"targetCalories\": 300
  }" | jq '.data.suggestions[0].meals["Pre-Workout"] | {
  mealTime,
  targetCalories,
  recipes: (.recipes | length)
}'
```

**Expected:** New "Pre-Workout" slot created with 300 cal target

### 3. Update Existing Meal Slot

```bash
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/meal-slot' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"action\": \"update\",
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"breakfast\",
    \"mealTime\": \"07:30\",
    \"targetCalories\": 550
  }" | jq '.data.suggestions[0].meals.breakfast | {
  mealTime,
  targetCalories
}'
```

**Expected:** Breakfast updated to 07:30, 550 cal target

### 4. Add Recipe and See Target Comparison

```bash
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/add-recipe' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"breakfast\",
    \"recipe\": {
      \"id\": \"663235\",
      \"provider\": \"spoonacular\",
      \"source\": \"api\"
    }
  }" | jq '.data.nutrition.dayWise[0].meals.breakfast | {
  mealTime,
  targetCalories,
  actualCalories: .calories.quantity,
  calorieComparison
}'
```

**Expected:**
```json
{
  "mealTime": "07:30",
  "targetCalories": 550,
  "actualCalories": 752.67,
  "calorieComparison": {
    "target": 550,
    "actual": 752.67,
    "difference": 202.67,
    "percentageOfTarget": 137
  }
}
```

### 5. Delete Meal Slot

```bash
curl -s -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/manual/meal-slot' \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer $TOKEN" \
  -d "{
    \"action\": \"delete\",
    \"draftId\": \"$DRAFT_ID\",
    \"day\": 1,
    \"mealName\": \"snack\"
  }" | jq '.data.suggestions[0].meals | keys'
```

**Expected:** Snack removed from meal list

### 6. Get Complete Draft with All Targets

```bash
curl -s "https://caloriescience-api.vercel.app/api/meal-plans/manual/$DRAFT_ID" \
  -H "Authorization: Bearer $TOKEN" | jq '{
  meals: .data.suggestions[0].meals | to_entries | map({
    meal: .key,
    mealTime: .value.mealTime,
    targetCalories: .value.targetCalories,
    actualCalories: .value.totalNutrition.calories.quantity,
    recipeCount: (.value.recipes | length)
  }),
  dayNutrition: .data.nutrition.dayWise[0] | {
    mealComparisons: .meals | to_entries | map({
      meal: .key,
      target: .value.targetCalories,
      actual: .value.calories.quantity,
      comparison: .value.calorieComparison
    }),
    dayTotal: .dayTotal.calories.quantity
  }
}'
```

## UI Display Examples

### Meal Card with Progress Bar

```
┌─────────────────────────────────┐
│ BREAKFAST (07:30)               │
│ Target: 550 cal | Actual: 753  │
│ ████████████████░░░ 137%        │
│ +203 cal over target            │
│                                 │
│ 🍳 Steak Sandwich (753 cal)    │
└─────────────────────────────────┘
```

### Day Summary

```
Day 1 Total: 1780 / 1900 cal (94%)
├─ Breakfast (07:30): 753 / 550 (137%) ⚠️
├─ Lunch (12:00): 296 / 600 (49%) ⬇️
├─ Dinner (18:00): 616 / 600 (103%) ✓
└─ Snack (15:00): 115 / 200 (58%) ⬇️
```

## Benefits

- ✅ Flexible meal structure
- ✅ Target calorie tracking
- ✅ Progress indicators for UI
- ✅ Support custom meal schedules
- ✅ Case-insensitive meal matching
- ✅ All APIs return complete data (no extra calls needed)

