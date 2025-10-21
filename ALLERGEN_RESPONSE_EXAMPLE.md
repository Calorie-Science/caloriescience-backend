# Allergen Conflict Detection - Sample Response Guide

## 📋 Complete Sample Response

Here's a real example of what you'll receive from the recipe search API with allergen conflict detection:

```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "recipe_abc123",
        "title": "Creamy Pasta Alfredo",
        "image": "https://example.com/image.jpg",
        "sourceUrl": "https://recipe-site.com/alfredo",
        "source": "edamam",
        "readyInMinutes": 30,
        "servings": 4,
        "calories": 520,
        "protein": 18.5,
        "carbs": 52.3,
        "fat": 25.8,
        "fiber": 3.2,
        "healthLabels": ["vegetarian"],
        
        // ⭐ THIS IS THE ALLERGEN DATA FROM THE RECIPE
        "allergens": ["dairy", "wheat"],
        
        // 🚨 THIS IS THE NEW CONFLICT DETECTION FEATURE
        "allergenConflict": {
          "hasConflict": true,
          "conflictingAllergens": ["dairy"],
          "warning": "Recipe contains allergen(s): dairy"
        }
      },
      {
        "id": "recipe_def456",
        "title": "Spaghetti Carbonara",
        "image": "https://example.com/carbonara.jpg",
        "source": "spoonacular",
        "calories": 650,
        "protein": 28.2,
        "carbs": 68.5,
        "fat": 28.9,
        
        // Multiple allergens in recipe
        "allergens": ["dairy", "eggs", "wheat"],
        
        // Conflicts with multiple client allergens
        "allergenConflict": {
          "hasConflict": true,
          "conflictingAllergens": ["dairy", "eggs"],
          "warning": "Recipe contains allergen(s): dairy, eggs"
        }
      },
      {
        "id": "recipe_ghi789",
        "title": "Vegan Pasta Primavera",
        "image": "https://example.com/primavera.jpg",
        "source": "edamam",
        "calories": 380,
        "protein": 12.5,
        "carbs": 58.2,
        "fat": 12.3,
        
        // Has allergens but they don't conflict
        "allergens": ["wheat", "soy"],
        
        // ✅ NO allergenConflict field = SAFE for client
        // (field is omitted when there's no conflict)
      },
      {
        "id": "recipe_jkl012",
        "title": "Gluten-Free Zucchini Noodles",
        "source": "bonhappetee",
        "calories": 245,
        
        // No allergens at all
        "allergens": [],
        
        // ✅ NO allergenConflict field = SAFE
      }
    ],
    "totalResults": 1250,
    "provider": "both"
  },
  
  "metadata": {
    "clientName": "John Doe",
    "totalResults": 1250,
    
    // 📊 QUICK COUNT: How many recipes have allergen warnings
    "recipesWithAllergenConflicts": 2,
    
    "appliedFilters": {
      "allergenFilters": [],
      "uxPreferences": [],
      "uxCuisineTypes": []
    }
  },
  
  // 💬 SUMMARY MESSAGE includes warning count
  "message": "Found 4 recipes from both (2 with allergen warnings)"
}
```

---

## 🎯 How to Read This Response

### Client Profile (Assumed for this example)
```json
{
  "clientId": "123",
  "allergies": ["dairy", "eggs", "peanuts"]
}
```

### Recipe Analysis

#### 🔴 Recipe 1: "Creamy Pasta Alfredo" - HAS CONFLICT
```javascript
{
  "allergens": ["dairy", "wheat"],  // ← Recipe contains these
  
  "allergenConflict": {
    "hasConflict": true,              // ← YES, there's a problem
    "conflictingAllergens": ["dairy"], // ← DAIRY conflicts with client
    "warning": "..."                   // ← Warning message
  }
}
```
**Why?** Client is allergic to "dairy" and recipe contains "dairy" ❌

---

#### 🔴 Recipe 2: "Spaghetti Carbonara" - HAS CONFLICT (Multiple)
```javascript
{
  "allergens": ["dairy", "eggs", "wheat"],  // ← Recipe contains these
  
  "allergenConflict": {
    "hasConflict": true,
    "conflictingAllergens": ["dairy", "eggs"],  // ← TWO allergens conflict
    "warning": "Recipe contains allergen(s): dairy, eggs"
  }
}
```
**Why?** Client is allergic to "dairy" and "eggs", recipe has both ❌❌

---

#### ✅ Recipe 3: "Vegan Pasta Primavera" - SAFE
```javascript
{
  "allergens": ["wheat", "soy"],  // ← Recipe has allergens...
  
  // NO allergenConflict field at all
}
```
**Why?** Recipe has "wheat" and "soy", but client is only allergic to "dairy, eggs, peanuts" - no overlap! ✅

---

#### ✅ Recipe 4: "Gluten-Free Zucchini Noodles" - SAFE
```javascript
{
  "allergens": [],  // ← No allergens in recipe
  
  // NO allergenConflict field
}
```
**Why?** Recipe has no allergens at all ✅

---

## 📊 Understanding the Metadata

```json
"metadata": {
  "recipesWithAllergenConflicts": 2  // ← Out of 4 recipes, 2 have warnings
}
```

This tells you at a glance: **"2 recipes are NOT safe for this client"**

---

## 💻 Code Examples

### Example 1: Show Warning Badge
```javascript
function RecipeCard({ recipe }) {
  return (
    <div className="recipe-card">
      <h3>{recipe.title}</h3>
      
      {/* Show warning if there's a conflict */}
      {recipe.allergenConflict && (
        <div className="allergen-warning">
          ⚠️ Contains: {recipe.allergenConflict.conflictingAllergens.join(', ')}
        </div>
      )}
      
      {/* Show calories, etc */}
      <p>Calories: {recipe.calories}</p>
    </div>
  );
}
```

**Output for Recipe 1:**
```
Creamy Pasta Alfredo
⚠️ Contains: dairy
Calories: 520
```

---

### Example 2: Filter Safe Recipes
```javascript
const response = await fetch('/api/recipe-search-client?...');
const data = await response.json();

// Get only SAFE recipes (no allergen conflicts)
const safeRecipes = data.data.recipes.filter(recipe => 
  !recipe.allergenConflict
);

console.log(`Found ${safeRecipes.length} safe recipes out of ${data.data.recipes.length}`);
// Output: "Found 2 safe recipes out of 4"
```

---

### Example 3: Group by Allergen
```javascript
// Find which allergens are causing the most issues
const allergenCounts = {};

data.data.recipes.forEach(recipe => {
  if (recipe.allergenConflict) {
    recipe.allergenConflict.conflictingAllergens.forEach(allergen => {
      allergenCounts[allergen] = (allergenCounts[allergen] || 0) + 1;
    });
  }
});

console.log(allergenCounts);
// Output: { "dairy": 2, "eggs": 1 }
```

---

### Example 4: Display Summary
```javascript
const { recipesWithAllergenConflicts, totalResults } = data.metadata;
const safeCount = data.data.recipes.length - recipesWithAllergenConflicts;

console.log(`
  Total recipes found: ${totalResults}
  Safe recipes: ${safeCount}
  Recipes with warnings: ${recipesWithAllergenConflicts}
`);

// Output:
// Total recipes found: 1250
// Safe recipes: 2
// Recipes with warnings: 2
```

---

## 🎨 UI Implementation Examples

### Simple Warning Badge
```jsx
{recipe.allergenConflict && (
  <span className="badge badge-warning">
    ⚠️ {recipe.allergenConflict.conflictingAllergens.join(', ')}
  </span>
)}
```

### Detailed Warning Panel
```jsx
{recipe.allergenConflict && (
  <div className="alert alert-danger">
    <strong>⚠️ Allergen Warning</strong>
    <p>This recipe contains allergens you've marked:</p>
    <ul>
      {recipe.allergenConflict.conflictingAllergens.map(allergen => (
        <li key={allergen}>{allergen}</li>
      ))}
    </ul>
  </div>
)}
```

### Traffic Light System
```jsx
function getAllergenStatus(recipe) {
  if (!recipe.allergenConflict) {
    return { color: 'green', label: 'Safe', icon: '✅' };
  }
  return { color: 'red', label: 'Warning', icon: '⚠️' };
}

const status = getAllergenStatus(recipe);
return (
  <div className={`recipe-status-${status.color}`}>
    {status.icon} {status.label}
  </div>
);
```

---

## 🔍 Quick Reference Table

| Situation | `allergenConflict` field | `hasConflict` value | What it means |
|-----------|-------------------------|---------------------|---------------|
| Recipe has allergen client is allergic to | **Present** | `true` | ⚠️ **WARNING** - Not safe |
| Recipe has allergens but client isn't allergic | **Missing** | N/A | ✅ **SAFE** |
| Recipe has no allergens | **Missing** | N/A | ✅ **SAFE** |
| No recipe allergen data available | **Missing** | N/A | ⚠️ **Unknown** - Proceed with caution |

---

## 📝 Key Takeaways

1. **Check if `allergenConflict` exists** - if it's missing, the recipe is safe
2. **`conflictingAllergens` array** - tells you EXACTLY which allergens are the problem
3. **`recipesWithAllergenConflicts` in metadata** - gives you a quick count
4. **Recipe can have allergens without conflicts** - if client isn't allergic to them
5. **Both formats work** - client can set allergies as "dairy" or "dairy-free"

---

## 🧪 Testing with Different Client Allergens

### Client with only "dairy" allergy:
- Pasta Alfredo: ❌ Conflict (has dairy)
- Carbonara: ❌ Conflict (has dairy + eggs, but only dairy conflicts)
- Vegan Primavera: ✅ Safe
- Zucchini Noodles: ✅ Safe

### Client with "eggs" allergy only:
- Pasta Alfredo: ✅ Safe (no eggs)
- Carbonara: ❌ Conflict (has eggs)
- Vegan Primavera: ✅ Safe
- Zucchini Noodles: ✅ Safe

### Client with NO allergies:
- All recipes: ✅ Safe (no `allergenConflict` fields appear)

