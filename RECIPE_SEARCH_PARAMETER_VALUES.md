# Recipe Search API - Parameter Values Reference

Quick reference for all possible parameter values.

---

## `searchType` (Search Mode)

| Value | Description | Requires |
|-------|-------------|----------|
| `broad` | Search everywhere (default) | `query` |
| `name` | Search recipe names only | `query` |
| `ingredient` | Search by ingredients | `ingredients` |

**Example:**
```
searchType=name
searchType=ingredient
```

---

## `provider` (Recipe Source)

| Value | Description |
|-------|-------------|
| `both` | Search Edamam + Spoonacular (default) |
| `edamam` | Search Edamam only |
| `spoonacular` | Search Spoonacular only |

**Example:**
```
provider=both
provider=edamam
```

---

## `mealType` (Meal Category)

| Value | Description |
|-------|-------------|
| `breakfast` | Morning meals |
| `brunch` | Late morning meals |
| `lunch` | Midday meals |
| `dinner` | Evening meals |
| `snack` | Snacks/appetizers |
| `teatime` | Tea time snacks |

**Example:**
```
mealType=breakfast
mealType=dinner
```

---

## `cuisineType` (Cuisine Styles)

**Comma-separated list. Supported cuisines:**

### Popular Cuisines
- `american`
- `asian`
- `british`
- `caribbean`
- `chinese`
- `french`
- `greek`
- `indian`
- `italian`
- `japanese`
- `korean`
- `mediterranean`
- `mexican`
- `middle eastern`
- `spanish`
- `thai`
- `vietnamese`

### Other Cuisines
- `african`
- `cajun`
- `eastern european`
- `european`
- `german`
- `irish`
- `jewish`
- `latin american`
- `nordic`
- `southern`

**Example:**
```
cuisineType=indian
cuisineType=indian,asian,thai
```

---

## `allergies` (Client Allergies - Auto-filtered)

**From `client_goals.allergies` array.**

**⚙️ Backend Mapping:**
1. Client allergen (e.g., `"peanuts"`) → Edamam health label (`"peanut-free"`)
2. Edamam health label → Spoonacular intolerance (`"Peanut"`)
3. Both APIs filter recipes accordingly

**Supported values (✅ = Both APIs support):**

### Nuts
- `peanuts` / `peanut`
- `tree nuts` / `nuts`
- `almonds` / `almond`
- `cashews` / `cashew`
- `walnuts` / `walnut`
- `pecans` / `pecan`

### Dairy
- `dairy`
- `milk`
- `lactose`
- `cheese`
- `butter`
- `cream`
- `yogurt`

### Eggs
- `eggs` / `egg`

### Grains
- `wheat`
- `gluten`

### Soy
- `soy` / `soya`
- `soybeans`

### Seafood
- `fish`
- `shellfish`
- `shrimp`
- `crab`
- `lobster`
- `oysters` / `oyster`
- `clams` / `clam`
- `mussels` / `mussel`

### Seeds
- `sesame`

### Other
- `sulfites` / `sulfite`

**Note:** These are read from database, not query parameters.

---

### API-Specific Mappings

**Edamam Health Labels (what we send):**
| Client Value | Edamam Filter |
|--------------|---------------|
| `peanuts` | `peanut-free` |
| `tree nuts` | `tree-nut-free` |
| `dairy` | `dairy-free` |
| `eggs` | `egg-free` |
| `soy` | `soy-free` |
| `wheat` | `wheat-free` |
| `gluten` | `gluten-free` |
| `fish` | `fish-free` |
| `shellfish` | `shellfish-free` |
| `sesame` | `sesame-free` |
| `sulfites` | `sulfite-free` |

**Spoonacular Intolerances (what we send):**
| Edamam Label | Spoonacular Filter |
|--------------|-------------------|
| `peanut-free` | `Peanut` |
| `tree-nut-free` | `Tree Nut` |
| `dairy-free` | `Dairy` |
| `egg-free` | `Egg` |
| `soy-free` | `Soy` |
| `wheat-free` | `Wheat` |
| `gluten-free` | `Gluten` |
| `fish-free` | `Seafood` |
| `shellfish-free` | `Shellfish` |
| `sesame-free` | `Sesame` |
| `sulfite-free` | `Sulfite` |

✅ **All 11 allergen types are supported by both APIs!**

---

## `preferences` (Dietary Preferences - Auto-applied)

**From `client_goals.preferences` array. Common values:**

### Diet Types
- `vegetarian`
- `vegan`
- `pescatarian`
- `flexitarian`

### Lifestyle Diets
- `paleo`
- `ketogenic` / `keto`
- `whole30`
- `balanced`

### Nutritional Focus
- `high-protein`
- `high-fiber`
- `low-carb` / `low carb`
- `low-fat` / `low fat`
- `low-sodium`
- `low-sugar`

### Other
- `alcohol-free`
- `kosher`
- `halal`

**Note:** These are read from database, not query parameters.

---

### API Support Matrix

| Preference | Edamam | Spoonacular | Notes |
|------------|--------|-------------|-------|
| `vegetarian` | ✅ | ✅ | Both support |
| `vegan` | ✅ | ✅ | Both support |
| `pescatarian` | ✅ | ✅ | Both support |
| `paleo` | ✅ | ✅ | Both support |
| `ketogenic`/`keto` | ✅ | ✅ | Both support |
| `whole30` | ❌ | ✅ | Spoonacular only |
| `balanced` | ✅ | ❌ | Edamam only |
| `high-protein` | ✅ | ✅ | Both support |
| `high-fiber` | ✅ | ❌ | Edamam only |
| `low-carb` | ✅ | ✅ | Both support |
| `low-fat` | ✅ | ✅ | Both support |
| `low-sodium` | ✅ | ✅ | Both support |
| `alcohol-free` | ✅ | ❌ | Edamam only |
| `kosher` | ✅ | ❌ | Edamam only |
| `halal` | ❌ | ❌ | Not supported |

⚠️ **IMPORTANT - Filter Compatibility Warning:**

When using `provider=both` (default), if you apply a filter that one API doesn't support:
- **Recipes from the supporting API** → Filter IS applied ✅
- **Recipes from the non-supporting API** → Filter IS NOT applied ❌

**Example:**
```
query=breakfast&preferences=whole30&provider=both
```
- ✅ Spoonacular recipes: Filtered for Whole30
- ❌ Edamam recipes: NOT filtered (Edamam doesn't support Whole30)

**Solution:**
Each recipe includes `filterWarnings` object:
```json
{
  "title": "Scrambled Eggs",
  "source": "edamam",
  "filterWarnings": {
    "unsupportedFilters": ["whole30"],
    "message": "This edamam recipe may not respect: whole30"
  }
}
```

**Best Practice:**
- For provider-specific filters, use `provider=edamam` or `provider=spoonacular`
- For multi-provider search, only use filters supported by BOTH APIs

---

## `excludeClientAllergens` (Override Allergens)

**Comma-separated list of allergens to IGNORE from client profile.**

**Format:** Use exact values from client's `allergies` array.

**Example:**
```
excludeClientAllergens=dairy
excludeClientAllergens=dairy,eggs
excludeClientAllergens=peanuts,tree nuts
```

**Use Case:** Nutritionist wants to show recipes with specific allergens.

⚠️ **Warning:** This removes safety filters! Use carefully.

---

## `excludeClientPreferences` (Override Preferences)

**Comma-separated list of preferences to IGNORE from client profile.**

**Format:** Use exact values from client's `preferences` array.

**Example:**
```
excludeClientPreferences=vegetarian
excludeClientPreferences=vegan,alcohol-free
excludeClientPreferences=balanced
```

**Use Case:** Exploring dietary flexibility with client.

---

## `ingredients` (For Ingredient Search)

**Comma-separated list of ingredients to search for.**

**Example:**
```
ingredients=chicken
ingredients=chicken,broccoli
ingredients=chicken,vegetables,garlic,rice
```

**Notes:**
- Use when `searchType=ingredient`
- Can specify 1 to many ingredients
- Results may contain any or all ingredients

---

## `maxResults` (Result Count)

**Number of recipes to return.**

| Value | Description |
|-------|-------------|
| `1` - `100` | Number of results |
| Default: `20` | If not specified |

**Example:**
```
maxResults=5
maxResults=50
```

---

## Complete Example Queries

### 1. Simple Name Search
```
clientId=abc-123
&query=chicken curry
&searchType=name
&maxResults=10
```

### 2. Ingredient Search with Filters
```
clientId=abc-123
&searchType=ingredient
&ingredients=chicken,vegetables,garlic
&mealType=dinner
&cuisineType=asian,indian
&maxResults=20
```

### 3. With Allergen Override
```
clientId=abc-123
&query=pasta
&excludeClientAllergens=dairy
&mealType=dinner
&maxResults=10
```

### 4. Complex Multi-Filter Search
```
clientId=abc-123
&searchType=ingredient
&ingredients=salmon,asparagus
&mealType=dinner
&cuisineType=mediterranean
&provider=both
&excludeClientPreferences=pescatarian
&maxResults=15
```

### 5. Broad Search with Cuisine
```
clientId=abc-123
&query=curry
&searchType=broad
&cuisineType=indian,thai
&mealType=lunch
&provider=edamam
&maxResults=25
```

---

## Quick Reference Table

| Parameter | Type | Required | Default | Example Values |
|-----------|------|----------|---------|----------------|
| `clientId` | UUID | ✅ Yes | - | `a376c7f1-d053-4ead-809d-00f46ca7d2c8` |
| `query` | string | Conditional* | - | `chicken`, `pasta carbonara` |
| `searchType` | enum | No | `broad` | `broad`, `name`, `ingredient` |
| `ingredients` | string (CSV) | Conditional** | - | `chicken,broccoli,garlic` |
| `maxResults` | integer | No | `20` | `5`, `10`, `50` |
| `provider` | enum | No | `both` | `both`, `edamam`, `spoonacular` |
| `mealType` | string | No | - | `breakfast`, `lunch`, `dinner` |
| `cuisineType` | string (CSV) | No | - | `indian`, `asian,italian` |
| `excludeClientAllergens` | string (CSV) | No | - | `dairy`, `peanuts,eggs` |
| `excludeClientPreferences` | string (CSV) | No | - | `vegetarian`, `vegan,keto` |

\* Required for `broad` and `name` search types  
\*\* Required for `ingredient` search type

---

## Validation Rules

### Required Combinations

✅ **Valid:**
- `searchType=broad` + `query`
- `searchType=name` + `query`
- `searchType=ingredient` + `ingredients`

❌ **Invalid:**
- `searchType=ingredient` without `ingredients`
- `searchType=name` without `query`
- `searchType=broad` without `query`

### Query String Encoding

**Use URL encoding for special characters:**
- Space → `%20` or `+`
- Comma → `,` (no encoding needed)
- Ampersand → `%26`

**Example:**
```
✅ Good: cuisineType=middle%20eastern
❌ Bad:  cuisineType=middle eastern

✅ Good: ingredients=chicken,broccoli
✅ Good: ingredients=chicken%2Cbroccoli
```

---

## Response Indicators

### When Overrides Are Active

Response includes:
```json
{
  "metadata": {
    "warning": {
      "message": "Some client allergens/preferences were excluded from search",
      "removedAllergens": ["dairy"],
      "removedPreferences": []
    }
  }
}
```

Each recipe includes:
```json
{
  "allergenWarnings": {
    "containsOverriddenAllergens": true,
    "overriddenAllergensPresent": ["dairy"],
    "overriddenPreferencesViolated": []
  }
}
```

---

**Last Updated:** October 14, 2025  
**Version:** 1.0

