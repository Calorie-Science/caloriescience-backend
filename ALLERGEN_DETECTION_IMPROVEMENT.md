# Allergen Detection Improvement - Health Labels Check

## 🐛 Issue Reported

When searching for recipes with `allergies=dairy-free`, recipes containing paneer (a dairy product) were appearing in results WITHOUT being flagged as containing allergens. When opening those recipes, there was no "Dairy-Free" tag, but the search results didn't warn about the allergen conflict.

### Example:
```bash
# Search with dairy-free allergy
curl "https://caloriescience-api.vercel.app/api/recipe-search-client?clientId=...&query=paneer&allergies=dairy-free"

# Result: Recipes with paneer returned but NOT flagged with allergenConflict
```

## 🔍 Root Cause

The allergen checker was only looking at explicit `allergens` arrays in recipes. Many recipes (especially from Edamam) don't populate the `allergens` field but DO have `healthLabels` like:
- "Peanut-Free"
- "Tree-Nut-Free"  
- "Egg-Free"
- etc.

If a recipe with paneer doesn't have "Dairy-Free" in healthLabels, it means it CONTAINS dairy, but we weren't checking for the ABSENCE of the label.

## ✅ Solution

Updated `/lib/allergenChecker.ts` to check `healthLabels` in addition to explicit `allergens`:

### Improved Logic:

1. **Check explicit allergens first** (most reliable)
   - If recipe has `["dairy"]` in allergens array, flag it

2. **Check healthLabels intelligently**
   - Count how many "-free" labels the recipe has
   - If recipe has **at least 2 "-free" labels**, it's been properly labeled
   - Check if the specific "-free" label client needs is MISSING
   - If missing, flag as conflict

### Why "at least 2 -free labels"?

This threshold avoids false positives on recipes with incomplete labeling:
- Recipe with 0 labels → Unknown labeling quality, don't assume
- Recipe with 1 label → Might be incomplete
- Recipe with 2+ labels → **Properly labeled, can trust the absence of a label**

## 📊 Response Structure

The search result now properly includes `allergenConflict`:

```json
{
  "data": {
    "recipes": [
      {
        "id": "recipe_paneer_tikka",
        "title": "Paneer Tikka",
        "healthLabels": ["Vegetarian", "Peanut-Free", "Tree-Nut-Free", "Egg-Free", "Fish-Free"],
        "allergens": [],
        "allergenConflict": {
          "hasConflict": true,
          "conflictingAllergens": ["dairy"],
          "warning": "Recipe contains allergen(s): dairy"
        }
      }
    ]
  },
  "metadata": {
    "recipesWithAllergenConflicts": 1
  }
}
```

## 🎯 Detection Methods

| Scenario | Detection Method | Example |
|----------|------------------|---------|
| Explicit allergen in array | ✅ Direct match | `allergens: ["dairy"]` |
| Missing "-free" label (properly labeled recipe) | ✅ Absence detection | Has 5+ "-free" labels but NOT "Dairy-Free" |
| Recipe with < 2 labels | ⚠️ Not checked | Incomplete labeling, avoid false positives |
| No health labels at all | ⚠️ Not checked | Unknown quality |

## 🧪 Test Cases

### Case 1: Paneer Recipe with Health Labels (NOW DETECTED)

**Recipe:**
```json
{
  "title": "Paneer Tikka",
  "allergens": [],
  "healthLabels": [
    "Vegetarian",
    "Peanut-Free",
    "Tree-Nut-Free",
    "Egg-Free",
    "Soy-Free",
    "Fish-Free",
    "Shellfish-Free"
  ]
}
```

**Client Allergies:** `["dairy"]`

**Result:** ✅ **FLAGGED** - Has 7 "-free" labels but missing "Dairy-Free"

---

### Case 2: Explicit Allergen (ALREADY DETECTED)

**Recipe:**
```json
{
  "title": "Mac and Cheese",
  "allergens": ["dairy", "wheat"],
  "healthLabels": []
}
```

**Client Allergies:** `["dairy"]`

**Result:** ✅ **FLAGGED** - Explicit allergen match

---

### Case 3: Incomplete Labeling (NOT FLAGGED - SAFE)

**Recipe:**
```json
{
  "title": "Mystery Curry",
  "allergens": [],
  "healthLabels": ["Vegetarian"]  // Only 1 label
}
```

**Client Allergies:** `["dairy"]`

**Result:** ⚠️ **NOT FLAGGED** - Insufficient labeling quality (< 2 "-free" labels)

---

### Case 4: Truly Dairy-Free (NOT FLAGGED - CORRECT)

**Recipe:**
```json
{
  "title": "Vegan Buddha Bowl",
  "allergens": [],
  "healthLabels": [
    "Vegan",
    "Vegetarian",
    "Dairy-Free",
    "Egg-Free",
    "Peanut-Free",
    "Tree-Nut-Free"
  ]
}
```

**Client Allergies:** `["dairy"]`

**Result:** ✅ **NOT FLAGGED** - Has "Dairy-Free" label

## 📝 Code Changes

**File:** `/lib/allergenChecker.ts`  
**Lines:** 136-160

```typescript
// Check health labels if recipe is properly labeled
if (recipeHealthLabels && recipeHealthLabels.length > 0) {
  const healthLabelsLower = recipeHealthLabels.map(label => label.toLowerCase());
  
  // Count "-free" labels (indicates labeling quality)
  const freeLabelsCount = healthLabelsLower.filter(label => 
    label.endsWith('-free')
  ).length;
  
  // Only check if properly labeled (has at least 2 "-free" labels)
  if (freeLabelsCount >= 2) {
    for (const clientAllergen of Array.from(normalizedClientAllergens)) {
      const expectedFreeLabel = getFreeLabelForAllergen(clientAllergen);
      
      // If missing the "-free" label, it contains the allergen
      if (expectedFreeLabel && 
          !healthLabelsLower.includes(expectedFreeLabel.toLowerCase())) {
        conflictingAllergens.add(clientAllergen);
      }
    }
  }
}
```

## ✨ Benefits

1. **Better Detection** - Catches allergens even when `allergens` array is empty
2. **Fewer False Positives** - Only checks well-labeled recipes (2+ "-free" labels)
3. **Safer Search** - Users with allergies see warnings for potentially unsafe recipes
4. **Works with Existing Data** - No database changes needed, uses existing healthLabels
5. **Provider Agnostic** - Works with Edamam, Spoonacular, and Bon Appetit labels

## 🚀 Impact

- **Before:** Paneer recipes with no explicit allergens → No warning
- **After:** Paneer recipes missing "Dairy-Free" label → **Warning shown**

## 📅 Deployed

- **Date:** October 21, 2025
- **Status:** ✅ Ready for deployment
- **Affects:** Recipe search API, manual meal plan allergen checks

