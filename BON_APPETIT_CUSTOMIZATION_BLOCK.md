# Bon Appetit Recipe Customization Block

## 🚫 Feature: Block Customizations for Bon Appetit Recipes

Bon Appetit recipes cannot be customized (no ingredient modifications) because they come with fixed ingredients and nutrition information.

## ⚙️ Implementation

**File:** `/api/meal-plans/draft.ts`  
**Lines:** 1087-1099

When a user attempts to customize a Bon Appetit recipe, the API now returns an error.

### Code Added:
```typescript
// Block customizations for Bon Appetit recipes
const recipeSource = customizations.source || recipe.source;
if (recipeSource === 'bonhappetee') {
  return res.status(400).json({
    error: 'Customization not supported',
    message: 'Recipe customizations are not available for Bon Appetit recipes. Bon Appetit recipes come with fixed ingredients and nutrition information.',
    recipe: {
      id: recipeId,
      title: recipe.title,
      source: 'bonhappetee'
    }
  });
}
```

## 📝 Error Response

When attempting to customize a Bon Appetit recipe:

```json
{
  "error": "Customization not supported",
  "message": "Recipe customizations are not available for Bon Appetit recipes. Bon Appetit recipes come with fixed ingredients and nutrition information.",
  "recipe": {
    "id": "bonhappetee_recipe_123",
    "title": "Spaghetti Carbonara",
    "source": "bonhappetee"
  }
}
```

**Status Code:** 400 Bad Request

## 🧪 Test Cases

### Test 1: Try to Customize Bon Appetit Recipe (BLOCKED)

```bash
# This will return an error
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "manual-client-123-456",
    "day": 1,
    "mealName": "dinner",
    "recipeId": "bonhappetee_recipe_carbonara",
    "autoCalculateNutrition": true,
    "customizations": {
      "recipeId": "bonhappetee_recipe_carbonara",
      "source": "bonhappetee",
      "modifications": [
        {
          "type": "omit",
          "originalIngredient": "bacon",
          "originalAmount": 100,
          "originalUnit": "g"
        }
      ],
      "customizationsApplied": true
    }
  }'
```

**Expected Response:**
```json
{
  "error": "Customization not supported",
  "message": "Recipe customizations are not available for Bon Appetit recipes. Bon Appetit recipes come with fixed ingredients and nutrition information.",
  "recipe": {
    "id": "bonhappetee_recipe_carbonara",
    "title": "Spaghetti Carbonara",
    "source": "bonhappetee"
  }
}
```

### Test 2: Customize Edamam Recipe (ALLOWED)

```bash
# This will work fine
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "manual-client-123-456",
    "day": 1,
    "mealName": "breakfast",
    "recipeId": "recipe_edamam_abc123",
    "autoCalculateNutrition": true,
    "customizations": {
      "recipeId": "recipe_edamam_abc123",
      "source": "edamam",
      "modifications": [
        {
          "type": "omit",
          "originalIngredient": "butter",
          "originalAmount": 2,
          "originalUnit": "tbsp"
        }
      ],
      "customizationsApplied": true
    }
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Customizations updated successfully",
  "autoCalculated": true
}
```

### Test 3: Customize Spoonacular Recipe (ALLOWED)

```bash
# This will also work fine
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "update-customizations",
    "draftId": "manual-client-123-456",
    "day": 1,
    "mealName": "lunch",
    "recipeId": "spoonacular_654321",
    "autoCalculateNutrition": true,
    "customizations": {
      "recipeId": "spoonacular_654321",
      "source": "spoonacular",
      "modifications": [
        {
          "type": "add",
          "newIngredient": "olive oil",
          "amount": 1,
          "unit": "tbsp"
        }
      ],
      "customizationsApplied": true
    }
  }'
```

## 📊 Summary

| Recipe Source | Customization Allowed? | Status Code | Message |
|---------------|----------------------|-------------|---------|
| **Edamam** | ✅ Yes | 200 OK | Customizations applied |
| **Spoonacular** | ✅ Yes | 200 OK | Customizations applied |
| **Bon Appetit** | ❌ No | 400 Bad Request | "Customization not supported" |

## 🎯 Benefits

1. **Clear Error Message** - Users understand why customization is blocked
2. **Prevents Invalid Operations** - No partial customizations on Bon Appetit recipes
3. **Maintains Data Integrity** - Bon Appetit recipes keep their original nutrition data
4. **Better UX** - Frontend can disable customization UI for Bon Appetit recipes

## 💡 Frontend Integration

```javascript
// Check if recipe can be customized
function canCustomizeRecipe(recipe) {
  return recipe.source !== 'bonhappetee';
}

// Show/hide customization button
if (canCustomizeRecipe(recipe)) {
  return <CustomizeButton recipe={recipe} />;
} else {
  return <Tooltip text="Bon Appetit recipes cannot be customized">
    <CustomizeButton recipe={recipe} disabled />
  </Tooltip>;
}
```

## 📅 Deployed

- **Date:** October 21, 2025
- **Status:** ✅ Active

