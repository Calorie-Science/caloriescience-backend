# AI Meal Plan Standardization

## Overview

The AI meal plan generation has been updated to:
1. **Use only Claude** as the AI provider (OpenAI and Gemini removed)
2. **Return the same format** as automated and manual meal plans for consistency
3. **Updated Claude prompt** to directly return manual/automated format (no transformation needed)

## Changes Made

### 1. API Endpoint Updates (`api/meal-plans/index.ts`)

**Before:**
- Accepted `aiModel` parameter with options: `openai`, `claude`, `gemini`
- Returned simple structure with just `id`, `status`, `clientId`, `nutritionistId`, `aiModel`, `estimatedCompletionTime`

**After:**
- Only accepts Claude (hardcoded as `'claude'`)
- Returns complete draft structure matching automated/manual meal plans
- Accepts `days` and `startDate` parameters for customization

### 2. Claude Prompt Updates (`lib/claudeService.ts`)

**Before:**
- Claude returned old format with nested structure:
```json
{
  "success": true,
  "message": "...",
  "data": {
    "mealPlan": {
      "days": [...],
      "dailyNutrition": {...}
    }
  }
}
```
- Required transformation in `formatAsDraft()` method

**After:**
- Claude now directly returns manual/automated format:
```json
{
  "suggestions": [...],
  "nutrition": {
    "byDay": [...],
    "overall": {...},
    "dailyAverage": {...}
  }
}
```
- No transformation needed, just add wrapper fields
- Uses `wrapClaudeResponse()` instead of `formatAsDraft()`

### 3. Response Format Standardization

The AI meal plan now returns the **same structure** as automated/manual meal plans:

```json
{
  "success": true,
  "message": "AI meal plan generated successfully",
  "data": {
    "id": "draft-id",
    "clientId": "uuid",
    "nutritionistId": "uuid",
    "status": "completed",
    "creationMethod": "ai_generated",
    "planName": "AI Meal Plan - [Date]",
    "planDate": "2025-10-28",
    "durationDays": 7,
    "totalDays": 7,
    "totalMeals": 28,
    "selectedMeals": 28,
    "completionPercentage": 100,
    "isComplete": true,
    "searchParams": {
      "days": 7,
      "startDate": "2025-10-28",
      "clientGoals": {
        "eerGoalCalories": 2000,
        "proteinGoalMin": 150,
        "proteinGoalMax": 200,
        "carbsGoalMin": 200,
        "carbsGoalMax": 250,
        "fatGoalMin": 50,
        "fatGoalMax": 70,
        "fiberGoalGrams": 30,
        "waterGoalLiters": 2.5
      },
      "dietaryPreferences": {
        "allergies": ["dairy-free"],
        "preferences": ["vegetarian"],
        "cuisineTypes": ["indian"]
      },
      "overrideMealProgram": {
        "meals": [...]
      }
    },
    "suggestions": [
      {
        "day": 1,
        "date": "2025-10-28",
        "meals": {
          "breakfast": {
            "recipes": [{
              "id": "ai-recipe-123",
              "title": "AI Generated Recipe",
              "image": null,
              "sourceUrl": null,
              "source": "claude",
              "servings": 1,
              "fromCache": false,
              "calories": 350,
              "protein": 25,
              "carbs": 45,
              "fat": 12,
              "fiber": 8,
              "nutrition": {...},
              "ingredients": [...],
              "instructions": [...],
              "isSelected": true,
              "selectedAt": "2025-10-28T12:00:00.000Z"
            }],
            "customizations": {},
            "selectedRecipeId": "ai-recipe-123",
            "mealTime": "08:00",
            "targetCalories": 500,
            "totalNutrition": {
              "calories": 350,
              "protein": 25,
              "carbs": 45,
              "fat": 12,
              "fiber": 8
            }
          },
          "lunch": {...},
          "dinner": {...},
          "snack": {...}
        }
      }
    ],
    "nutrition": {
      "byDay": [
        {
          "day": 1,
          "date": "2025-10-28",
          "nutrition": {
            "totalCalories": 2000,
            "totalProtein": 150,
            "totalCarbs": 200,
            "totalFat": 65,
            "totalFiber": 30
          }
        }
      ],
      "overall": {
        "totalCalories": 2000,
        "totalProtein": 150,
        "totalCarbs": 200,
        "totalFat": 65,
        "totalFiber": 30
      }
    },
    "createdAt": "2025-10-28T12:00:00.000Z",
    "updatedAt": "2025-10-28T12:00:00.000Z",
    "expiresAt": null,
    "aiModel": "claude"
  }
}
```

## Key Benefits

### 1. **Consistency Across All Meal Plan Types**
- AI-generated, automated, and manual meal plans now have identical structures
- Frontend can handle all three types with the same code
- Easier to switch between different generation methods

### 2. **Rich Metadata**
- Includes `searchParams` with client goals and dietary preferences
- Tracks completion percentage and meal counts
- Provides nutrition breakdown by day and overall

### 3. **Better Integration**
- AI-generated plans can be treated like any other draft
- Can be edited, customized, and finalized using existing workflows
- Compatible with all existing meal plan management APIs

## API Usage

### Generate AI Meal Plan

**Endpoint:** `POST /api/meal-plans`

**Request Body:**
```json
{
  "type": "meal-plan",
  "action": "async-generate",
  "clientId": "client-uuid",
  "additionalText": "Focus on high-protein vegetarian meals",
  "days": 7,
  "startDate": "2025-10-28"
}
```

**Response:**
Returns the complete draft in the standardized format (see above).

**Notes:**
- `aiModel` parameter is no longer needed (always uses Claude)
- `days` defaults to 7 if not provided
- `startDate` defaults to today if not provided
- Response is immediate (Claude generates synchronously)

## Database Changes

### Migration 075: Restrict to Claude Only

```sql
-- Drop the existing check constraint
ALTER TABLE async_meal_plans 
DROP CONSTRAINT IF EXISTS async_meal_plans_ai_model_check;

-- Add new check constraint that only allows 'claude'
ALTER TABLE async_meal_plans 
ADD CONSTRAINT async_meal_plans_ai_model_check 
CHECK (ai_model = 'claude');

-- Update any existing records to use 'claude'
UPDATE async_meal_plans 
SET ai_model = 'claude' 
WHERE ai_model IN ('openai', 'gemini', 'chatgpt');
```

## Implementation Details

### Updated Method: `wrapClaudeResponse` (Replaced `formatAsDraft`)

**Before:**
- Claude returned old format that required complex transformation
- `formatAsDraft()` method did heavy lifting to convert structure

**After:**
- Claude now directly returns correct format (suggestions and nutrition)
- `wrapClaudeResponse()` simply adds top-level wrapper fields
- No transformation needed - just wraps the response

**What `wrapClaudeResponse` Does:**
1. Validates Claude response has `suggestions` and `nutrition`
2. Calculates `totalMeals`, `selectedMeals`, `completionPercentage` from suggestions
3. Builds `searchParams` object with client goals and preferences
4. Adds top-level fields: `id`, `clientId`, `status`, `creationMethod`, `planName`, etc.
5. Returns wrapped response with no modification to suggestions/nutrition

### Updated Validation

Both `ClaudeService` and `AsyncMealPlanService` now validate the new format:
- Checks for `suggestions` array (not `data.mealPlan.days`)
- Checks for `nutrition.byDay`, `nutrition.overall`, `nutrition.dailyAverage`
- Validates meal structure: each meal has `recipes` array and `totalNutrition`

### Default Meal Times

The system uses default meal times when not specified by the meal program:
- Breakfast: 08:00
- Lunch: 12:00
- Dinner: 18:00
- Snack: 15:00

## Migration Steps

### For Existing Code Using AI Meal Plans

**Old Code:**
```typescript
const result = await asyncMealPlanService.startGeneration(
  clientId,
  nutritionistId,
  clientGoals,
  additionalText,
  'claude'
);

// Old response structure
const mealPlanId = result.data?.id;
const status = result.data?.status;
```

**New Code:**
```typescript
const result = await asyncMealPlanService.startGeneration(
  clientId,
  nutritionistId,
  clientGoals,
  additionalText,
  'claude',
  7,        // days
  '2025-10-28'  // startDate
);

// New response structure (same as automated/manual)
const draft = result.data;
const suggestions = draft.suggestions;
const nutrition = draft.nutrition;
const completionPercentage = draft.completionPercentage;
```

## Frontend Integration

The frontend can now:
1. **Display AI meal plans** using the same components as automated/manual plans
2. **Edit and customize** AI-generated recipes using existing customization flows
3. **Track progress** with completion percentage and meal counts
4. **View nutrition** with the same nutrition visualization components

## Testing

### Test Curl

```bash
curl -X POST http://localhost:3000/api/meal-plans \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "type": "meal-plan",
    "action": "async-generate",
    "clientId": "client-uuid",
    "additionalText": "Focus on high-protein vegetarian meals",
    "days": 7,
    "startDate": "2025-10-28"
  }'
```

### Expected Response

Should return a complete draft with:
- ✅ All standard draft fields
- ✅ Suggestions array with meals organized by type
- ✅ Nutrition breakdown by day and overall
- ✅ Completion stats (should be 100% for AI-generated plans)
- ✅ searchParams with client goals and preferences

## Future Improvements

1. **Support for Multi-Day Plans**: Currently generates 1 day, can be extended to N days
2. **Recipe Caching**: AI-generated recipes could be cached for reuse
3. **Customization Support**: Enable ingredient modifications on AI recipes
4. **Alternative Suggestions**: Generate multiple recipe options per meal

---

## Summary of Recent Changes (Oct 29, 2025)

### What Changed

**Claude Prompt Rewrite:**
- Updated `prepareInputMessage()` in `claudeService.ts`
- Changed from old nested format to direct manual/automated format
- Claude now returns `suggestions` and `nutrition` at top level
- Matches exact structure of manual and automated meal plans

**Simplified Processing:**
- Replaced `formatAsDraft()` with `wrapClaudeResponse()`
- No transformation needed - just add wrapper fields
- Reduced complexity and potential for bugs
- Faster processing with less overhead

**Updated Validation:**
- Changed `isValidMealPlanResponse()` in both services
- Validates new structure: `suggestions`, `nutrition.byDay`, etc.
- Better error messages and logging

### Why These Changes Matter

1. **Direct Format Match**: Claude now returns the exact same format as manual/automated meal plans
2. **No Transformation**: Eliminates the need for complex data transformation
3. **Consistency**: All three meal plan types (AI, manual, automated) are now 100% consistent
4. **Maintainability**: Simpler code = easier to maintain and debug
5. **Performance**: Less processing = faster response times

### Testing Recommendations

After deploying these changes:

1. Test AI meal plan generation with various client goals
2. Verify the response structure matches manual/automated plans
3. Check that all fields are populated correctly
4. Test with different meal programs (custom and default)
5. Verify nutrition calculations are accurate
6. Test with allergens and dietary preferences

