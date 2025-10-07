# Unified Meal Plan Architecture

## 🎯 Overview

We've unified the meal plan system so that **drafts** and **finalized meal plans** use the **same structure and logic**. This provides a consistent, maintainable codebase with powerful ingredient replacement capabilities.

## ✨ Key Changes

### Before (Fragmented Architecture)
- **Drafts**: Stored in `meal_plan_drafts` table with JSONB suggestions
- **Finalized**: Stored in `meal_plans` + `meal_plan_meals` tables (relational)
- **Different APIs**: Separate endpoints and logic for drafts vs. finalized plans
- **No Ingredient Replacement**: Finalized plans couldn't be edited

### After (Unified Architecture)
- **Single Table**: Everything in `meal_plan_drafts` table
- **Status-Based**: `draft` → `finalized` → `active` → `completed` → `archived`
- **Same Structure**: Both use JSONB `suggestions` field
- **Same Logic**: Ingredient replacement works for both drafts and finalized plans
- **Only Difference**: Drafts have ALL recipe suggestions, finalized plans have ONLY selected recipes

## 🗄️ Database Schema

### `meal_plan_drafts` Table (Unified)

```sql
CREATE TABLE meal_plan_drafts (
  id VARCHAR(255) PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  nutritionist_id UUID NOT NULL REFERENCES users(id),
  
  -- Status lifecycle
  status VARCHAR(20) CHECK (status IN ('draft', 'finalized', 'active', 'completed', 'archived')),
  
  -- Plan metadata
  plan_name VARCHAR(255) DEFAULT 'Meal Plan',
  plan_date DATE,
  end_date DATE,
  plan_duration_days INTEGER DEFAULT 1,
  
  -- Data
  search_params JSONB NOT NULL,  -- Original search parameters
  suggestions JSONB NOT NULL,     -- Meal suggestions with customizations
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  finalized_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE  -- NULL for finalized/active plans
);
```

### Status Lifecycle

```
draft → finalize() → finalized → activate() → active → complete() → completed → archive() → archived
  ↓                                                                                            ↓
expires in 7 days                                                                     kept forever
```

### JSONB Structure

#### Draft (has ALL recipe options):
```json
{
  "suggestions": [
    {
      "day": 1,
      "date": "2025-10-06",
      "meals": {
        "breakfast": {
          "recipes": [
            {"id": "recipe1", "title": "Oatmeal", ...},
            {"id": "recipe2", "title": "Pancakes", ...},
            {"id": "recipe3", "title": "Smoothie", ...}
          ],
          "customizations": {},
          "selectedRecipeId": "recipe2",
          "totalNutrition": {...}
        }
      }
    }
  ]
}
```

#### Finalized (has ONLY selected recipes):
```json
{
  "suggestions": [
    {
      "day": 1,
      "date": "2025-10-06",
      "meals": {
        "breakfast": {
          "recipes": [
            {"id": "recipe2", "title": "Pancakes", "isSelected": true, ...}
          ],
          "customizations": {
            "recipe2": {
              "recipeId": "recipe2",
              "source": "edamam",
              "modifications": [
                {
                  "type": "replace",
                  "ingredient": "100g milk",
                  "newIngredient": "100g almond milk",
                  "notes": "Replaced milk with almond milk"
                }
              ],
              "customNutrition": {...},
              "customizationsApplied": true
            }
          },
          "selectedRecipeId": "recipe2",
          "totalNutrition": {...}
        }
      }
    }
  ]
}
```

## 🔄 Finalization Process

When a draft is finalized:

1. **Remove Unselected Recipes**: Keep only `recipes` where `id === selectedRecipeId`
2. **Preserve Customizations**: All ingredient replacements are kept
3. **Update Status**: `draft` → `finalized`
4. **Set Metadata**: `plan_name`, `plan_date`, `finalized_at`
5. **Remove Expiration**: Set `expires_at = NULL`

```typescript
// Before finalization
{
  recipes: [recipe1, recipe2, recipe3],  // 3 options
  selectedRecipeId: "recipe2"
}

// After finalization
{
  recipes: [recipe2],  // Only selected recipe
  selectedRecipeId: "recipe2"
}
```

## 🎯 API Endpoints

### 1. Generate Draft
```bash
POST /api/meal-plans/generate
{
  "clientId": "...",
  "days": 3,
  "startDate": "2025-10-06"
}
```
**Returns**: `draftId`, all recipe suggestions

---

### 2. Select Recipes in Draft
```bash
POST /api/meal-plans/draft
{
  "action": "select-recipe",
  "draftId": "...",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "..."
}
```

---

### 3. Replace Ingredient in Draft
```bash
POST /api/ingredients/replace
{
  "action": "replace-ingredient",
  "draftId": "...",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "...",
  "originalIngredient": "100 gram milk",
  "newIngredient": "almond milk",
  "amount": 100,
  "unit": "gram",
  "source": "edamam"
}
```

---

### 4. Finalize Draft
```bash
POST /api/meal-plans/draft
{
  "action": "finalize-draft",
  "draftId": "...",
  "planName": "Week 1 Meal Plan",
  "planDate": "2025-10-06"
}
```
**Effect**: Removes unselected recipes, changes status to `finalized`

---

### 5. Replace Ingredient in Finalized Plan
```bash
POST /api/meal-plans/draft
{
  "action": "replace-ingredient-in-plan",
  "planId": "...",  // Same ID as draftId
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "...",
  "originalIngredient": "100 gram milk",
  "newIngredient": "almond milk",
  "source": "edamam"
}
```
**Uses same logic as draft ingredient replacement!**

---

## 🔧 Ingredient Replacement Logic

### Formula (Same for Drafts and Finalized Plans)

```
New Recipe Nutrition = (Original Recipe Total) - (Old Ingredient) + (New Ingredient)
```

### Implementation

Both drafts and finalized plans use the same method:

```typescript
// lib/mealPlanDraftService.ts

// For drafts: via /api/ingredients/replace
// For finalized: via replaceIngredientInFinalizedPlan()

// Steps:
1. Get original recipe nutrition (per serving)
2. Calculate total recipe nutrition (all servings)
3. Get old ingredient nutrition
4. Get new ingredient nutrition
5. Calculate: Total - Old + New
6. Convert back to per-serving
7. Update customizations
8. Recalculate meal total nutrition
```

### Example

**Recipe**: Pancakes (2 servings, 450 cal/serving)
- Total: 900 calories

**Replace**: "100g milk" (165 cal) → "100g almond milk" (76 cal)

**Calculation**:
```
New Total = 900 - 165 + 76 = 811 cal
New Per Serving = 811 ÷ 2 = 406 cal/serving
```

## 📊 Benefits of Unified Architecture

### 1. **Consistency**
- Same data structure throughout lifecycle
- Same validation logic
- Same error handling

### 2. **Maintainability**
- Single source of truth
- No duplicate code
- Easy to add features

### 3. **Powerful Editing**
- Ingredient replacement works everywhere
- Multiple replacements cumulative
- Accurate nutrition recalculation

### 4. **Flexibility**
- Easy status transitions
- Can "unfinalize" if needed (just change status back)
- Supports versioning (create new draft from finalized)

### 5. **Performance**
- JSONB is fast for complex queries
- Single table reduces JOINs
- Indexes on status, client_id, plan_date

## 🚀 Migration Guide

### For Existing Deployments

1. **Run Migration**:
   ```sql
   -- Run: database/migrations/060_unify_meal_plan_structure.sql
   ```

2. **Update Existing Code**:
   - Old `meal_plans` table still exists for backward compatibility
   - New code uses `meal_plan_drafts` exclusively
   - View `meal_plans_unified` provides compatibility layer

3. **Data Migration** (if needed):
   - Existing finalized plans in `meal_plans` remain accessible
   - New plans use unified structure
   - Gradual migration can happen over time

## 🧪 Testing

### Test Flow

```bash
# 1. Generate draft
curl -X POST /api/meal-plans/generate \
  -H "Authorization: Bearer TOKEN" \
  -d '{"clientId":"...","days":1}'

# 2. Select recipes
curl -X POST /api/meal-plans/draft \
  -H "Authorization: Bearer TOKEN" \
  -d '{"action":"select-recipe","draftId":"...","day":1,"mealName":"breakfast","recipeId":"..."}'

# 3. Replace ingredient in draft
curl -X POST /api/ingredients/replace \
  -H "Authorization: Bearer TOKEN" \
  -d '{"action":"replace-ingredient","draftId":"...","day":1,"mealName":"breakfast","recipeId":"...","originalIngredient":"100 gram chicken","newIngredient":"tofu","amount":100,"unit":"gram","source":"edamam"}'

# 4. Finalize
curl -X POST /api/meal-plans/draft \
  -H "Authorization: Bearer TOKEN" \
  -d '{"action":"finalize-draft","draftId":"...","planName":"Week 1","planDate":"2025-10-06"}'

# 5. Replace ingredient in finalized plan
curl -X POST /api/meal-plans/draft \
  -H "Authorization: Bearer TOKEN" \
  -d '{"action":"replace-ingredient-in-plan","planId":"...","day":1,"mealName":"breakfast","recipeId":"...","originalIngredient":"100 gram butter","newIngredient":"coconut oil","source":"edamam"}'
```

## 📝 Summary

✅ **Unified Architecture**: One table, one structure, one logic  
✅ **Status-Based Lifecycle**: Clear progression from draft to archived  
✅ **Ingredient Replacement**: Works for both drafts and finalized plans  
✅ **Correct Nutrition Math**: (Total) - (Old) + (New)  
✅ **Source-Aware**: Supports both Edamam and Spoonacular  
✅ **Maintainable**: Single codebase, easy to extend  
✅ **Backward Compatible**: Old tables still exist for migration  

## 🔮 Future Enhancements

- **Versioning**: Create new draft from finalized plan
- **Templates**: Save common meal structures
- **Batch Operations**: Replace multiple ingredients at once
- **Undo/Redo**: Revert ingredient replacements
- **AI Suggestions**: Recommend ingredient substitutions
- **Nutrition Tracking**: Compare planned vs. actual nutrition
Human: continue
