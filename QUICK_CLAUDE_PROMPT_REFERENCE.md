# Quick Reference: Claude Prompt Format

## What Changed (Oct 29, 2025)

Claude now returns **manual/automated meal plan format directly** - no transformation needed!

---

## Expected Response Format from Claude

```json
{
  "suggestions": [
    {
      "day": 1,
      "date": "2025-10-29",
      "meals": {
        "breakfast": {
          "mealTime": "08:00",
          "targetCalories": 500,
          "recipes": [
            {
              "id": "recipe-1-breakfast-0",
              "title": "Scrambled Eggs with Toast",
              "image": null,
              "sourceUrl": null,
              "source": "claude",
              "servings": 1,
              "fromCache": false,
              "calories": 450,
              "protein": 25,
              "carbs": 35,
              "fat": 20,
              "fiber": 5,
              "nutrition": {
                "calories": 450,
                "protein": 25,
                "carbs": 35,
                "fat": 20,
                "fiber": 5
              },
              "ingredients": [
                {
                  "text": "2 large eggs",
                  "quantity": 2,
                  "measure": "whole",
                  "food": "eggs",
                  "weight": 100
                },
                {
                  "text": "2 slices whole wheat bread",
                  "quantity": 2,
                  "measure": "slice",
                  "food": "whole wheat bread",
                  "weight": 60
                }
              ],
              "instructions": [
                "Step 1: Crack eggs into a bowl and whisk",
                "Step 2: Heat pan over medium heat",
                "Step 3: Cook eggs until fluffy",
                "Step 4: Toast bread until golden",
                "Step 5: Serve eggs on toast"
              ],
              "isSelected": true,
              "selectedAt": "2025-10-29T12:00:00.000Z"
            }
          ],
          "customizations": {},
          "selectedRecipeId": "recipe-1-breakfast-0",
          "totalNutrition": {
            "calories": 450,
            "protein": 25,
            "carbs": 35,
            "fat": 20,
            "fiber": 5
          }
        },
        "lunch": { /* ... same structure ... */ },
        "dinner": { /* ... same structure ... */ },
        "snack": { /* ... same structure ... */ }
      }
    }
  ],
  "nutrition": {
    "byDay": [
      {
        "day": 1,
        "date": "2025-10-29",
        "meals": {
          "breakfast": {
            "mealTime": "08:00",
            "targetCalories": 500,
            "calories": { "value": 450, "unit": "kcal" },
            "macros": {
              "protein": { "value": 25, "unit": "g" },
              "carbs": { "value": 35, "unit": "g" },
              "fat": { "value": 20, "unit": "g" },
              "fiber": { "value": 5, "unit": "g" }
            },
            "micros": {}
          }
        },
        "dayTotal": {
          "calories": { "value": 2000, "unit": "kcal" },
          "macros": {
            "protein": { "value": 150, "unit": "g" },
            "carbs": { "value": 200, "unit": "g" },
            "fat": { "value": 65, "unit": "g" },
            "fiber": { "value": 30, "unit": "g" }
          },
          "micros": {}
        }
      }
    ],
    "overall": {
      "calories": { "value": 2000, "unit": "kcal" },
      "macros": {
        "protein": { "value": 150, "unit": "g" },
        "carbs": { "value": 200, "unit": "g" },
        "fat": { "value": 65, "unit": "g" },
        "fiber": { "value": 30, "unit": "g" }
      },
      "micros": {}
    },
    "dailyAverage": {
      "calories": { "value": 2000, "unit": "kcal" },
      "macros": {
        "protein": { "value": 150, "unit": "g" },
        "carbs": { "value": 200, "unit": "g" },
        "fat": { "value": 65, "unit": "g" },
        "fiber": { "value": 30, "unit": "g" }
      },
      "micros": {}
    }
  }
}
```

---

## Key Rules in Prompt

1. Return **ONLY JSON** (no markdown, no text)
2. Start with: `{"suggestions":`
3. Meals must be **objects** keyed by name (not arrays)
4. Each meal has: `recipes`, `customizations`, `totalNutrition`, `mealTime`, `targetCalories`
5. Each recipe has: `id`, `title`, `nutrition`, `ingredients`, `instructions`
6. Recipe IDs: `"recipe-{day}-{mealName}-{index}"`
7. Nutrition must have: `byDay`, `overall`, `dailyAverage`
8. Exclude allergens completely

---

## Validation Checklist

✅ `suggestions` array exists  
✅ `nutrition` object exists  
✅ `nutrition.byDay` array exists  
✅ `nutrition.overall` object exists  
✅ `nutrition.dailyAverage` object exists  
✅ Each day has `meals` object (not array)  
✅ Each meal has `recipes` array  
✅ Each meal has `totalNutrition` object  
✅ Recipe IDs follow format  

---

## Common Mistakes to Avoid

❌ **Wrong**: `"meals": [...]` (array)  
✅ **Right**: `"meals": { "breakfast": {...} }` (object)

❌ **Wrong**: `"data": { "mealPlan": {...} }`  
✅ **Right**: `"suggestions": [...]` (at top level)

❌ **Wrong**: `"days": [...]`  
✅ **Right**: `"suggestions": [...]`

❌ **Wrong**: Meals in array format  
✅ **Right**: Meals as object with meal names as keys

---

## Testing Command

```bash
./test-ai-meal-plan-standardized.sh
```

---

## Files to Check

- `lib/claudeService.ts` - Prompt definition
- `lib/asyncMealPlanService.ts` - Response wrapper
- `AI_MEAL_PLAN_STANDARDIZATION.md` - Full documentation
- `CLAUDE_PROMPT_UPDATE_OCT29.md` - Detailed update notes

---

**Quick Tip**: If Claude returns wrong format, check the prompt rules in `prepareInputMessage()` method!

