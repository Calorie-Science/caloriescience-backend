# Copy Day API - Manual Meal Plans

## Overview

The Copy Day API allows nutritionists to duplicate an entire day's meal plan to another day in a manual meal plan draft. This is useful for:

- **Repeating meal patterns**: Copy a successful day to multiple days
- **Extending plans**: Copy day 7 to day 8, 9, 10, etc. to extend the plan
- **Template reuse**: Use a well-designed day as a template for other days

## Key Features

✅ **Complete Copy**: Copies all meals, recipes, customizations, and nutrition data  
✅ **Auto-extend**: Optionally extends the plan if target day is beyond current duration  
✅ **Deep Clone**: All recipes and customizations are fully copied (not referenced)  
✅ **Meal Structure**: Preserves meal slots, times, and target calories  

---

## API Endpoint

### Copy Day to Day

**Endpoint:** `POST /api/meal-plans/manual/copy-day`

**Authentication:** Required (Nutritionist only)

**Request Body:**
```json
{
  "draftId": "manual-uuid-123",
  "sourceDay": 1,
  "targetDay": 2,
  "extendIfNeeded": false
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `draftId` | string | Yes | ID of the manual meal plan draft |
| `sourceDay` | number | Yes | Day number to copy from (1-based) |
| `targetDay` | number | Yes | Day number to copy to (1-based) |
| `extendIfNeeded` | boolean | No | If true, extends plan duration when targetDay > current duration. Default: false |

---

## Response

**Success (200):**
```json
{
  "success": true,
  "message": "Successfully copied day 1 to day 2",
  "data": {
    "id": "manual-uuid-123",
    "clientId": "client-uuid",
    "status": "draft",
    "creationMethod": "manual",
    "planDate": "2025-10-20",
    "durationDays": 7,
    "suggestions": [
      {
        "day": 1,
        "date": "2025-10-20",
        "meals": {
          "breakfast": {
            "recipes": [...],
            "customizations": {...},
            "totalNutrition": {...}
          }
        }
      },
      {
        "day": 2,
        "date": "2025-10-21",
        "meals": {
          "breakfast": {
            "recipes": [...],  // ✅ Copied from day 1
            "customizations": {...}  // ✅ Copied from day 1
          }
        }
      }
    ],
    "nutrition": {
      "byDay": [...],
      "overall": {...}
    }
  }
}
```

**With Extension (200):**
```json
{
  "success": true,
  "message": "Successfully copied day 7 to day 10 (extended plan to 10 days)",
  "data": {
    "durationDays": 10,  // ✅ Extended from 7 to 10
    "suggestions": [
      // ... days 1-7
      {
        "day": 8,
        "date": "2025-10-27",
        "meals": { ... }  // ✅ Empty, created during extension
      },
      {
        "day": 9,
        "date": "2025-10-28",
        "meals": { ... }  // ✅ Empty, created during extension
      },
      {
        "day": 10,
        "date": "2025-10-29",
        "meals": { ... }  // ✅ Copied from day 7
      }
    ]
  }
}
```

---

## What Gets Copied

When you copy day X to day Y, the following is copied:

### ✅ Copied Items

1. **All Meal Slots**: breakfast, lunch, dinner, snacks, custom meals
2. **All Recipes**: Every recipe in each meal slot
3. **Recipe Customizations**: Serving adjustments, ingredient modifications
4. **Nutrition Data**: totalNutrition for each meal
5. **Meal Metadata**: mealTime, targetCalories, selectedRecipeId

### 📝 Deep Copy Details

```javascript
// Each item is DEEP CLONED (not referenced)
{
  recipes: JSON.parse(JSON.stringify(sourceRecipes)),
  customizations: JSON.parse(JSON.stringify(sourceCustomizations)),
  totalNutrition: JSON.parse(JSON.stringify(sourceTotalNutrition))
}
```

**This means:**
- Modifying the target day won't affect the source day
- You can customize the copied day independently
- All customizations are preserved exactly

---

## Use Cases

### 1. Repeat a Day Pattern

**Scenario:** Day 1 is perfect, copy it to days 2-7

```bash
# Copy day 1 to day 2
curl -X POST https://your-api.com/api/meal-plans/manual/copy-day \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "manual-abc-123",
    "sourceDay": 1,
    "targetDay": 2
  }'

# Copy day 1 to day 3
curl -X POST https://your-api.com/api/meal-plans/manual/copy-day \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "manual-abc-123",
    "sourceDay": 1,
    "targetDay": 3
  }'

# ... repeat for days 4-7
```

---

### 2. Extend Plan with Pattern

**Scenario:** 7-day plan exists, extend to 14 days by repeating the pattern

```bash
# Copy day 1 to day 8 (extends plan to 8 days)
curl -X POST https://your-api.com/api/meal-plans/manual/copy-day \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "manual-abc-123",
    "sourceDay": 1,
    "targetDay": 8,
    "extendIfNeeded": true
  }'

# Copy day 2 to day 9 (extends plan to 9 days)
curl -X POST https://your-api.com/api/meal-plans/manual/copy-day \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "manual-abc-123",
    "sourceDay": 2,
    "targetDay": 9,
    "extendIfNeeded": true
  }'

# ... continue for days 10-14
```

---

### 3. Copy Specific Day to Multiple Days

**Scenario:** Day 3 (high protein day) should be copied to days 5 and 7

```bash
# Copy day 3 to day 5
curl -X POST https://your-api.com/api/meal-plans/manual/copy-day \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "manual-abc-123",
    "sourceDay": 3,
    "targetDay": 5
  }'

# Copy day 3 to day 7
curl -X POST https://your-api.com/api/meal-plans/manual/copy-day \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "draftId": "manual-abc-123",
    "sourceDay": 3,
    "targetDay": 7
  }'
```

---

## Extension Behavior

### Without `extendIfNeeded` (Default)

```bash
# 7-day plan, trying to copy to day 10
curl -X POST .../copy-day \
  -d '{
    "draftId": "manual-abc-123",
    "sourceDay": 1,
    "targetDay": 10,
    "extendIfNeeded": false
  }'

# ❌ Error 400:
{
  "success": false,
  "message": "Target day 10 is beyond plan duration (7 days). Set extendIfNeeded=true to extend the plan."
}
```

### With `extendIfNeeded: true`

```bash
# 7-day plan, copy to day 10 with extension
curl -X POST .../copy-day \
  -d '{
    "draftId": "manual-abc-123",
    "sourceDay": 1,
    "targetDay": 10,
    "extendIfNeeded": true
  }'

# ✅ Success 200:
{
  "success": true,
  "message": "Successfully copied day 1 to day 10 (extended plan to 10 days)",
  "data": {
    "durationDays": 10  // ✅ Extended from 7 to 10
  }
}
```

**What happens during extension:**
1. Plan duration updates from 7 → 10 days
2. Days 8 and 9 are created with empty meal slots
3. Day 10 gets the copied content from day 1
4. Meal slot structure (names, times, target calories) is preserved from day 1

---

## Validation Rules

| Rule | Error |
|------|-------|
| Source day must exist | `Source day must be between 1 and {duration}` |
| Source and target cannot be same | `Source day and target day must be different` |
| Draft must exist | `Draft not found` (404) |
| User must be nutritionist | `Only nutritionists can copy days...` (403) |
| Draft must be manual | `This endpoint only works with manual meal plans` |
| Target beyond duration | `Target day {n} is beyond plan duration...` (400) |

---

## Error Responses

**404 - Draft Not Found:**
```json
{
  "success": false,
  "message": "Draft not found"
}
```

**400 - Target Day Beyond Duration:**
```json
{
  "success": false,
  "message": "Target day 10 is beyond plan duration (7 days). Set extendIfNeeded=true to extend the plan."
}
```

**403 - Access Denied:**
```json
{
  "success": false,
  "message": "Access denied"
}
```

**400 - Same Day:**
```json
{
  "success": false,
  "message": "Source day and target day must be different"
}
```

**400 - Not Manual Plan:**
```json
{
  "success": false,
  "message": "This endpoint only works with manual meal plans"
}
```

---

## Integration Example

### Frontend Usage

```typescript
async function copyDayInMealPlan(
  draftId: string,
  sourceDay: number,
  targetDay: number,
  extendIfNeeded: boolean = false
) {
  const response = await fetch('/api/meal-plans/manual/copy-day', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`
    },
    body: JSON.stringify({
      draftId,
      sourceDay,
      targetDay,
      extendIfNeeded
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message);
  }

  return response.json();
}

// Usage: Copy day 1 to all days 2-7
async function repeatDayToWeek(draftId: string, sourceDay: number) {
  for (let targetDay = 2; targetDay <= 7; targetDay++) {
    await copyDayInMealPlan(draftId, sourceDay, targetDay);
    console.log(`✅ Copied day ${sourceDay} to day ${targetDay}`);
  }
}

// Usage: Extend plan by repeating pattern
async function extendPlanByWeek(draftId: string) {
  for (let day = 1; day <= 7; day++) {
    await copyDayInMealPlan(
      draftId,
      day,           // Source: day 1-7
      day + 7,       // Target: day 8-14
      true           // Extend if needed
    );
  }
  console.log('✅ Extended plan to 14 days');
}
```

---

## Complete Workflow Example

### Scenario: Create 14-day plan by repeating 7-day pattern

```bash
TOKEN="your-jwt-token"
API="https://your-api.com"

# 1. Create 7-day manual meal plan
DRAFT_ID=$(curl -X POST $API/api/meal-plans/manual/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "client-123",
    "planDate": "2025-10-20",
    "durationDays": 7
  }' | jq -r '.data.draftId')

echo "Created draft: $DRAFT_ID"

# 2. Add recipes to day 1 (breakfast, lunch, dinner)
# ... (use add-recipe endpoint)

# 3. Copy day 1 to days 2-7
for day in {2..7}; do
  curl -X POST $API/api/meal-plans/manual/copy-day \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"draftId\": \"$DRAFT_ID\",
      \"sourceDay\": 1,
      \"targetDay\": $day
    }"
  echo "✅ Copied to day $day"
done

# 4. Extend to 14 days by repeating pattern
for day in {1..7}; do
  target_day=$((day + 7))
  curl -X POST $API/api/meal-plans/manual/copy-day \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"draftId\": \"$DRAFT_ID\",
      \"sourceDay\": $day,
      \"targetDay\": $target_day,
      \"extendIfNeeded\": true
    }"
  echo "✅ Copied day $day to day $target_day"
done

echo "✅ Created 14-day meal plan!"
```

---

## Comparison with Other Meal Plan Operations

| Operation | Endpoint | Effect |
|-----------|----------|--------|
| **Copy Day** | `POST /copy-day` | Copies entire day to another day |
| Add Recipe | `POST /add-recipe` | Adds single recipe to meal |
| Remove Recipe | `DELETE /remove-recipe` | Removes recipe from meal |
| Create Meal Slot | `POST /meal-slot` | Creates new meal slot |
| Finalize | `POST /finalize` | Converts draft to active plan |

---

## Related Documentation

- [Manual Meal Plan API](./MANUAL_MEAL_PLAN_API.md)
- [Meal Slot Management](./MANUAL_MEAL_PLAN_MEAL_SLOTS.md)
- [Add/Remove Recipe API](./MANUAL_MEAL_PLAN_API.md#2-add-recipe-to-draft)

---

## Notes

1. **Performance**: Copying is instant as it's a deep clone operation
2. **Independence**: Copied days are independent; modifying one doesn't affect the other
3. **Nutrition**: Nutrition is recalculated after copying
4. **Extension**: Extension creates empty days; only the target day gets the copied content
5. **Meal Slots**: Target day's meal structure is completely replaced with source day's structure

