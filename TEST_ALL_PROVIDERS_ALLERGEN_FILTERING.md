# Test All Providers - Ingredient-Level Allergen Filtering

## After Deployment - Run These Tests

---

## ✅ **What Was Implemented**

### Spoonacular Enhancement
- Now fetches **ingredients from details API** for each search result
- Tries **cache first** (fast), then API (accurate)
- Enables **ingredient-level allergen filtering** for Spoonacular recipes

### All Providers Now Support
- ✅ **Edamam**: Ingredients included in search results
- ✅ **Spoonacular**: Ingredients fetched from cache/details API
- ✅ **Manual**: Complete ingredient data from database
- ✅ **Bon Appetit**: Explicit allergen data

---

## 🧪 **Test Commands**

### **TEST 1: Edamam - Dairy Filter**

```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc2MTExMzE1MCwiZXhwIjoxNzYxNzE3OTUwfQ.WeO8ICey7SHMh0mD0KE8MkkWev76FdkgF0RSpn3hYd8"

curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=paneer&health=dairy-free&provider=edamam&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  provider: .data.provider,
  filtering: {
    applied: .metadata.ingredientLevelFiltering,
    originalCount: .metadata.originalCount,
    filteredCount: .metadata.filteredCount,
    removed: (.metadata.originalCount - .metadata.filteredCount)
  },
  recipes: [.data.recipes[] | {
    title,
    dairyIngredients: [.ingredients[]? | select(.name | ascii_downcase | test("paneer|cheese|milk|cream|yogurt|butter|ghee|curd|khoa|mawa")) | .name]
  }]
}'
```

**Expected:**
- ✅ All recipes should have 0 dairy ingredients
- ✅ `filtering.removed` should show how many were filtered out
- ✅ Recipes like "Vegan Spinach Paneer" should pass (no real paneer)

---

### **TEST 2: Spoonacular - Gluten Filter**

```bash
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=pasta&health=gluten-free&provider=spoonacular&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  provider: .data.provider,
  filtering: {
    applied: .metadata.ingredientLevelFiltering,
    originalCount: .metadata.originalCount,
    filteredCount: .metadata.filteredCount
  },
  recipes: [.data.recipes[] | {
    title,
    totalIngredients: (.ingredients | length),
    glutenIngredients: [.ingredients[]? | select(.name | ascii_downcase | test("wheat|flour|bread|pasta|noodle|barley|rye|malt")) | .name]
  }]
}'
```

**Expected:**
- ✅ All recipes should have **ingredients populated** (fetched from cache/API)
- ✅ No gluten-containing ingredients in any recipe
- ✅ Filtering stats should show removed count

---

### **TEST 3: Manual Recipes - Egg Filter**

```bash
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=breakfast&health=egg-free&provider=manual&maxResults=5" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  provider: .data.provider,
  filtering: {
    applied: .metadata.ingredientLevelFiltering,
    filteredCount: .metadata.filteredCount
  },
  recipes: [.data.recipes[] | {
    title,
    allergens,
    eggIngredients: [.ingredients[]? | select(.name | ascii_downcase | test("egg")) | .name],
    totalIngredients: (.ingredients | length)
  }]
}'
```

**Expected:**
- ✅ No recipes with "eggs" in allergens array
- ✅ No ingredients containing "egg"
- ✅ Complete ingredient data for all recipes

---

### **TEST 4: Multiple Allergen Filters**

```bash
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=curry&health=dairy-free&health=tree-nut-free&provider=edamam&maxResults=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  filtering: .metadata,
  recipes: [.data.recipes[] | {
    title,
    allergenIngredients: [.ingredients[]? | select(.name | ascii_downcase | test("paneer|cheese|milk|cream|yogurt|almond|cashew|walnut|pecan")) | .name]
  }]
}'
```

**Expected:**
- ✅ No dairy OR tree nut ingredients in any recipe
- ✅ Both filters applied correctly
- ✅ Original count > filtered count

---

### **TEST 5: Cross-Provider Search (All Sources)**

```bash
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=salad&health=dairy-free&provider=all&maxResults=15" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  provider: .data.provider,
  totalRecipes: (.data.recipes | length),
  bySource: {
    edamam: [.data.recipes[] | select(.source == "edamam")] | length,
    spoonacular: [.data.recipes[] | select(.source == "spoonacular")] | length,
    manual: [.data.recipes[] | select(.source == "manual")] | length
  },
  sampleFromEach: {
    edamam: (.data.recipes[] | select(.source == "edamam") | {title, ingredientsCount: (.ingredients | length)}) // select first,
    spoonacular: (.data.recipes[] | select(.source == "spoonacular") | {title, ingredientsCount: (.ingredients | length)}) // select first,
    manual: (.data.recipes[] | select(.source == "manual") | {title, ingredientsCount: (.ingredients | length)}) // select first
  }
}'
```

**Expected:**
- ✅ Results from all providers
- ✅ All have ingredients populated
- ✅ No dairy in any recipe from any source

---

### **TEST 6: Draft Usage Metadata**

```bash
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=chicken&provider=edamam&maxResults=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  recipesWithUsage: [.data.recipes[] | select(.usageMetadata) | {
    title,
    usedInDrafts: .usageMetadata.usedInDrafts,
    selectedInPlans: .usageMetadata.selectedInPlans
  }] | length,
  sampleUsage: .data.recipes[0].usageMetadata
}'
```

**Expected:**
- ✅ `usageMetadata` field present on all recipes
- ✅ Shows draft IDs where recipe is used
- ✅ Shows plan IDs where recipe is selected

---

### **TEST 7: Verify Complete Health Labels**

```bash
# Test Edamam health labels
echo "=== Edamam Health Labels ==="
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=soup&provider=edamam&maxResults=1" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data.recipes[0] | {
  title,
  healthLabelsCount: (.healthLabels | length),
  healthLabels
}'

# Test Spoonacular health labels
echo "=== Spoonacular Health Labels ==="
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=pasta&provider=spoonacular&maxResults=1" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data.recipes[0] | {
  title,
  healthLabelsCount: (.healthLabels | length),
  healthLabels,
  dishType
}'

# Test Manual health labels
echo "=== Manual Recipe Health Labels ==="
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?provider=manual&maxResults=1" \
  -H "Authorization: Bearer ${TOKEN}" | jq '.data.recipes[0] | {
  title,
  healthLabels,
  allergens,
  ingredientsCount: (.ingredients | length)
}'
```

**Expected:**
- ✅ Edamam: 10-20 health labels
- ✅ Spoonacular: Health labels extracted from boolean flags
- ✅ Manual: Health labels from database

---

### **TEST 8: Specific Allergen Keywords**

Test that specific Indian ingredients are caught:

```bash
# Test for ghee (Indian clarified butter - dairy)
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=dal&health=dairy-free&provider=edamam&maxResults=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  recipesWithGhee: [.data.recipes[] | select(.ingredients[]? | .name | ascii_downcase | contains("ghee")) | .title]
}'

# Test for curd/dahi (Indian yogurt - dairy)
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=raita&health=dairy-free&provider=edamam&maxResults=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  recipesWithCurd: [.data.recipes[] | select(.ingredients[]? | .name | ascii_downcase | test("curd|dahi|yogurt")) | .title]
}'

# Test for kaju (Indian cashew - tree nut)
curl -s "https://caloriescience-api.vercel.app/api/recipe-search?query=korma&health=tree-nut-free&provider=edamam&maxResults=10" \
  -H "Authorization: Bearer ${TOKEN}" | jq '{
  totalRecipes: (.data.recipes | length),
  recipesWithKaju: [.data.recipes[] | select(.ingredients[]? | .name | ascii_downcase | test("kaju|cashew|almond|nut")) | .title]
}'
```

**Expected:**
- ✅ **0 recipes** with ghee when filtering dairy
- ✅ **0 recipes** with curd/dahi when filtering dairy
- ✅ **0 recipes** with kaju/cashew when filtering tree nuts

---

## 📊 **Success Criteria**

| Test | Pass Criteria |
|------|--------------|
| Dairy Filter | No recipes with dairy ingredients (paneer, milk, cheese, ghee, curd, etc.) |
| Gluten Filter | No recipes with gluten ingredients (wheat, flour, bread, pasta, etc.) |
| Tree Nut Filter | No recipes with nuts (almond, cashew, walnut, kaju, etc.) |
| Multiple Filters | Correctly filters ALL specified allergens |
| Spoonacular Ingredients | All recipes have ingredients populated |
| Draft Usage | usageMetadata shows which drafts use each recipe |
| Health Labels | All providers return health labels in search results |
| Indian Ingredients | Catches ghee, paneer, curd, dahi, kaju, etc. |

---

## 🚀 **Quick Test Script**

```bash
# Set your token
export AUTH_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc2MTExMzE1MCwiZXhwIjoxNzYxNzE3OTUwfQ.WeO8ICey7SHMh0mD0KE8MkkWev76FdkgF0RSpn3hYd8"

# Run comprehensive test
./TEST_INGREDIENT_FILTERING.sh
```

---

## 🔍 **What to Look For**

### ✅ **Success Indicators**
- `metadata.ingredientLevelFiltering: true`
- `metadata.originalCount > metadata.filteredCount` (some recipes filtered)
- `ingredients` array populated for all recipes
- `usageMetadata` present on all recipes
- `healthLabels` array present and populated
- No allergen ingredients in filtered results

### ❌ **Failure Indicators**
- Recipes with allergen ingredients pass through
- `ingredients` array is empty for Spoonacular
- No filtering stats in metadata
- Health labels are null or empty

---

## 🎯 **Expected Behavior**

### Before Filtering
```
Search: "paneer curry"
Results: 20 recipes (many contain actual paneer/dairy)
```

### After Filtering (with health=dairy-free)
```
Step 1: API filters out obvious dairy recipes → 12 remaining
Step 2: Ingredient check filters "paneer", "ghee", "cream" → 5 remaining
Final: 5 truly dairy-free recipes
```

---

**Created:** October 24, 2025  
**Status:** Ready for testing after deployment

