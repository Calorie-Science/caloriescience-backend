# Recipe Search Client API Documentation

**Endpoint:** `GET /api/recipe-search-client`  
**Authentication:** Required (JWT, nutritionist role only)  
**Version:** 1.0

---

## Overview

Search recipes with automatic allergen/preference filtering based on client's active goals. Supports three search modes: broad, name-only, and ingredient-based.

**Key Features:**
- Auto-applies client allergies/preferences from `client_goals` table
- Supports nutritionist overrides with warning metadata
- Multi-provider search (Edamam + Spoonacular)
- Per-recipe allergen warnings

---

## Query Parameters

### Required

| Parameter | Type | Description |
|-----------|------|-------------|
| `clientId` | UUID | Client's unique identifier |
| `query` | string | Search term (min 2 chars) - Required for `broad` and `name` modes |
| `ingredients` | string | Comma-separated ingredients - Required for `ingredient` mode |

### Optional

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `searchType` | enum | `broad` | Search mode: `broad`, `name`, `ingredient` |
| `maxResults` | integer | `20` | Number of results (1-100) |
| `provider` | enum | `both` | Provider: `edamam`, `spoonacular`, `both` |
| `mealType` | string | - | Filter by meal type |
| `cuisineType` | string | - | Comma-separated cuisines |
| `excludeClientAllergens` | string | - | Override: Comma-separated allergens to ignore |
| `excludeClientPreferences` | string | - | Override: Comma-separated preferences to ignore |

---

## Search Types

### 1. Broad (Default)
Searches recipe names, ingredients, and descriptions.

```bash
GET /api/recipe-search-client?clientId={uuid}&query=chicken
```

### 2. Name Only
Searches recipe titles only (post-filtered).

```bash
GET /api/recipe-search-client?clientId={uuid}&query=chicken&searchType=name
```

### 3. Ingredient
Searches by specific ingredients (supports multiple).

```bash
GET /api/recipe-search-client?clientId={uuid}&searchType=ingredient&ingredients=chicken,broccoli
```

---

## Filter Compatibility (⚠️ IMPORTANT)

### Provider-Specific Filter Support

**All Allergens:** ✅ Both APIs support all 11 allergen types

**Dietary Preferences - Compatibility Matrix:**

| Preference | Edamam | Spoonacular | Safe with `provider=both`? |
|------------|--------|-------------|---------------------------|
| vegetarian | ✅ | ✅ | ✅ Yes |
| vegan | ✅ | ✅ | ✅ Yes |
| pescatarian | ✅ | ✅ | ✅ Yes |
| paleo | ✅ | ✅ | ✅ Yes |
| keto | ✅ | ✅ | ✅ Yes |
| low-carb | ✅ | ✅ | ✅ Yes |
| low-fat | ✅ | ✅ | ✅ Yes |
| low-sodium | ✅ | ✅ | ✅ Yes |
| high-protein | ✅ | ✅ | ✅ Yes |
| **whole30** | ❌ | ✅ | ⚠️ No (Spoonacular only) |
| **balanced** | ✅ | ❌ | ⚠️ No (Edamam only) |
| **high-fiber** | ✅ | ❌ | ⚠️ No (Edamam only) |
| **alcohol-free** | ✅ | ❌ | ⚠️ No (Edamam only) |
| **kosher** | ✅ | ❌ | ⚠️ No (Edamam only) |
| halal | ❌ | ❌ | ❌ Not supported |

### Filter Warnings in Response

When using `provider=both` with provider-specific filters, recipes include `filterWarnings`:

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

**Recommendation:** 
- For provider-specific filters, set `provider=edamam` or `provider=spoonacular`
- For `provider=both`, only use filters marked ✅ in both columns

---

## Response Structure

### Success (200)

```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "recipe_123",
        "title": "Creamy Pasta",
        "image": "https://...",
        "sourceUrl": "https://...",
        "source": "edamam",
        "calories": 420,
        "protein": 15,
        "carbs": 52,
        "fat": 18,
        "fiber": 5,
        "servings": 4,
        "readyInMinutes": 30,
        "allergenWarnings": {
          "containsOverriddenAllergens": true,
          "overriddenAllergensPresent": ["dairy"],
          "overriddenPreferencesViolated": []
        }
      }
    ],
    "totalResults": 1234,
    "provider": "both",
    "searchParams": { ... },
    "clientProfile": {
      "id": "uuid",
      "name": "John Doe",
      "allergies": ["dairy-free"],
      "preferences": ["alcohol-free"]
    },
    "appliedFilters": {
      "allergenFilters": [],
      "preferenceFilters": ["alcohol-free"],
      "removedAllergens": ["dairy-free"],
      "removedPreferences": []
    }
  },
  "metadata": {
    "clientName": "John Doe",
    "totalResults": 1234,
    "appliedFilters": { ... },
    "warning": {
      "message": "Some client allergens/preferences were excluded from search",
      "removedAllergens": ["dairy-free"],
      "removedPreferences": []
    }
  }
}
```

### Error Responses

**400 - Missing clientId**
```json
{
  "error": "Missing required parameter",
  "message": "clientId is required"
}
```

**400 - Invalid query**
```json
{
  "error": "Invalid query",
  "message": "query must be at least 2 characters"
}
```

**400 - Invalid ingredients**
```json
{
  "error": "Invalid ingredients",
  "message": "ingredients parameter is required for ingredient search"
}
```

**403 - Not authorized**
```json
{
  "error": "Access denied",
  "message": "Only nutritionists can search recipes for clients"
}
```

**500 - Client not found**
```json
{
  "error": "Internal server error",
  "message": "Client not found or no active goals"
}
```

---

## How It Works

### 1. Data Source
- Reads client info from `clients` table
- Reads allergies/preferences from **`client_goals`** table (where `is_active = true`)
- If no active goals, returns error

### 2. Allergen Mapping
Maps common allergens to API filter formats:

| Client Allergen | API Filter |
|----------------|------------|
| `dairy-free` | `dairy-free` |
| `peanuts` | `peanut-free` |
| `tree nuts` | `tree-nut-free` |
| `eggs` | `egg-free` |
| `gluten` | `gluten-free` |
| `shellfish` | `shellfish-free` |
| `soy` | `soy-free` |
| `fish` | `fish-free` |

### 3. Override Logic
- Nutritionist can exclude specific allergens/preferences
- Excluded filters are NOT applied to API search
- Results include warning metadata for overridden items

### 4. Per-Recipe Warnings
Each recipe includes `allergenWarnings` object:
- `containsOverriddenAllergens`: Boolean flag
- `overriddenAllergensPresent`: Array of allergens that may be present
- `overriddenPreferencesViolated`: Array of preferences that may be violated

---

## cURL Examples

### Basic Search
```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipe-search-client?\
clientId=a376c7f1-d053-4ead-809d-00f46ca7d2c8&\
query=chicken&\
maxResults=10' \
-H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### Name Search
```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipe-search-client?\
clientId=a376c7f1-d053-4ead-809d-00f46ca7d2c8&\
query=chicken&\
searchType=name' \
-H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### Ingredient Search (Multiple)
```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipe-search-client?\
clientId=a376c7f1-d053-4ead-809d-00f46ca7d2c8&\
searchType=ingredient&\
ingredients=chicken,broccoli,rice' \
-H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### With Meal Type Filter
```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipe-search-client?\
clientId=a376c7f1-d053-4ead-809d-00f46ca7d2c8&\
query=eggs&\
mealType=breakfast' \
-H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### With Cuisine Filter
```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipe-search-client?\
clientId=a376c7f1-d053-4ead-809d-00f46ca7d2c8&\
query=curry&\
cuisineType=indian,thai' \
-H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### Override Allergens (Nutritionist Override)
```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipe-search-client?\
clientId=a376c7f1-d053-4ead-809d-00f46ca7d2c8&\
query=pasta&\
excludeClientAllergens=dairy-free' \
-H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### Override Preferences
```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipe-search-client?\
clientId=a376c7f1-d053-4ead-809d-00f46ca7d2c8&\
query=burger&\
excludeClientPreferences=vegetarian' \
-H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

### Complex Search
```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipe-search-client?\
clientId=a376c7f1-d053-4ead-809d-00f46ca7d2c8&\
searchType=ingredient&\
ingredients=chicken,vegetables&\
mealType=dinner&\
cuisineType=asian&\
maxResults=20&\
provider=both' \
-H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

---

## Implementation Details

### Database Query
```typescript
const { data: client } = await supabase
  .from('clients')
  .select(`
    id, 
    first_name, 
    last_name,
    client_goals!inner(
      allergies,
      preferences,
      is_active
    )
  `)
  .eq('id', clientId)
  .eq('client_goals.is_active', true)
  .single();
```

### Provider Integration
- Searches **Edamam** and **Spoonacular** in parallel
- Combines and deduplicates results
- Each recipe tagged with source provider
- Applies health/diet filters to both APIs

### Post-Processing
1. **Name Search**: Filters results where `recipe.title.includes(query)`
2. **Allergen Warnings**: Adds warning metadata to each recipe
3. **Provider Attribution**: Marks each recipe with source

---

## Performance

- **Typical Response Time**: 800ms - 2s (parallel API calls)
- **Cache**: Leverages provider-side caching
- **Rate Limits**: Respects Edamam/Spoonacular rate limits
- **Timeout**: 30 seconds

---

## Security

- **Authentication**: JWT token required
- **Authorization**: Nutritionist role only
- **Client Access**: Nutritionist can only search for their own clients
- **Audit**: All searches logged with user ID, client ID, and overrides

---

## Notes

1. **Active Goals Required**: Client must have `is_active = true` goal or API returns error
2. **Allergen Mapping**: Unknown allergens are logged but don't fail the search
3. **Override Warning**: Frontend should show prominent warnings when overrides are active
4. **Multiple Allergies**: All allergen filters are combined (AND logic)
5. **Search Scope**: Broad search returns recipes where query matches title, ingredients, OR description

---

## Related Endpoints

- `GET /api/clients/{id}` - Get client details and goals
- `GET /api/recipe-search` - Regular recipe search (no client context)
- `GET /api/recipes/{id}/details` - Get full recipe details

---

**Last Updated:** October 14, 2025  
**Maintained By:** CalorieScience Backend Team

