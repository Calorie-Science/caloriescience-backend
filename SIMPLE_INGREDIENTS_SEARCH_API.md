# Simple Ingredients Search API

Fast, dedicated API endpoint for searching simple ingredients from the database.

## Endpoint

```
GET /api/ingredients/search
```

## Features

- ✅ **Very Fast**: Uses in-memory caching for instant results
- ✅ **Returns All Matches**: Up to 100 ingredients (default 50)
- ✅ **Includes Cooked Variants**: Returns raw + all cooked methods (steamed, sautéed, stir-fry, grilled, baked)
- ✅ **Smart Category Search**: Search "fish" → returns all fish types (salmon, tilapia, tuna, etc.)
- ✅ **Category Filtering**: Filter by vegetable, fruit, protein, etc.
- ✅ **Allergen Filtering**: Exclude ingredients with specific allergens
- ✅ **Grouped Results**: Ingredients grouped by cooking method for better UX

## Query Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `query` | string | ✅ Yes | Search term (min 2 characters) | `broccoli` |
| `category` | string | ❌ No | Filter by category | `vegetable`, `fruit`, `protein` |
| `limit` | number | ❌ No | Max results (default: 50, max: 100) | `10` |
| `allergens` | string | ❌ No | Comma-separated allergens to exclude | `dairy,soy` |

## Valid Categories

- `vegetable`
- `fruit`
- `protein`
- `grain`
- `dairy`
- `nuts`
- `legume`
- `herb`
- `spice`
- `fat`
- `condiment`

## Response Format

```json
{
  "success": true,
  "data": {
    "ingredients": [
      {
        "id": "broccoli",
        "name": "broccoli",
        "title": "Broccoli",
        "category": "vegetable",
        "servingSize": {
          "quantity": 100,
          "unit": "g",
          "display": "100 g"
        },
        // Flat nutrition for easy access
        "calories": 34,
        "protein": 2.8,
        "carbs": 7,
        "fat": 0.4,
        "fiber": 2.6,
        // Detailed nutrition (matches recipe format)
        "nutrition": {
          "calories": { "quantity": 34, "unit": "kcal" },
          "macros": {
            "protein": { "quantity": 2.8, "unit": "g" },
            "carbs": { "quantity": 7, "unit": "g" },
            "fat": { "quantity": 0.4, "unit": "g" },
            "fiber": { "quantity": 2.6, "unit": "g" },
            "sugar": { "quantity": 1.7, "unit": "g" },
            "sodium": { "quantity": 33, "unit": "mg" }
          },
          "micros": {
            "vitamins": {
              "vitaminC": { "quantity": 89.2, "unit": "mg" },
              "vitaminA": { "quantity": 623, "unit": "mcg" }
            },
            "minerals": {
              "calcium": { "quantity": 47, "unit": "mg" },
              "iron": { "quantity": 0.7, "unit": "mg" },
              "potassium": { "quantity": 316, "unit": "mg" }
            }
          }
        },
        "healthLabels": ["vegan", "vegetarian", "gluten-free", "dairy-free"],
        "dietLabels": ["vegan", "vegetarian"],
        "allergens": []
      },
      {
        "id": "steamed broccoli",
        "name": "steamed broccoli",
        "title": "Steamed Broccoli",
        "category": "vegetable",
        "servingSize": {
          "quantity": 100,
          "unit": "g",
          "display": "100 g"
        },
        // Flat nutrition
        "calories": 35,
        "protein": 2.9,
        "carbs": 7.2,
        "fat": 0.4,
        "fiber": 2.8,
        // Detailed nutrition
        "nutrition": {
          "calories": { "quantity": 35, "unit": "kcal" },
          "macros": {
            "protein": { "quantity": 2.9, "unit": "g" },
            "carbs": { "quantity": 7.2, "unit": "g" },
            "fat": { "quantity": 0.4, "unit": "g" },
            "fiber": { "quantity": 2.8, "unit": "g" },
            "sugar": { "quantity": 1.8, "unit": "g" },
            "sodium": { "quantity": 34, "unit": "mg" }
          },
          "micros": {
            "vitamins": {
              "vitaminC": { "quantity": 90, "unit": "mg" },
              "vitaminA": { "quantity": 640, "unit": "mcg" }
            },
            "minerals": {
              "calcium": { "quantity": 49, "unit": "mg" },
              "iron": { "quantity": 0.75, "unit": "mg" },
              "potassium": { "quantity": 325, "unit": "mg" }
            }
          }
        },
        "healthLabels": ["vegan", "vegetarian", "gluten-free", "dairy-free"],
        "dietLabels": ["vegan", "vegetarian"],
        "allergens": []
      }
      // ... more variants
    ],
    "totalResults": 6,
    "grouped": {
      "raw": [/* raw ingredients */],
      "steamed": [/* steamed ingredients */],
      "sauteed": [/* sautéed ingredients */],
      "stirFry": [/* stir-fry ingredients */],
      "grilled": [/* grilled ingredients */],
      "baked": [/* baked ingredients */],
      "other": [/* other cooked methods */]
    }
  },
  "metadata": {
    "query": "broccoli",
    "category": "all",
    "limit": 50,
    "allergenFilters": [],
    "totalResults": 6,
    "rawIngredients": 1,
    "cookedIngredients": 5,
    "searchTime": "5ms",
    "nutritionist": "nutritionist@example.com"
  },
  "message": "Found 6 matching ingredients (1 raw, 5 cooked)"
}
```

## Smart Category Search

The API intelligently expands searches for generic terms:

| Search Term | Returns |
|-------------|---------|
| `fish` | All fish types: salmon, tilapia, tuna, cod + all cooked variants |
| `seafood` | All seafood: shrimp, crab, scallops, etc. + cooked variants |
| `vegetable` or `vegetables` | All vegetables + cooked variants |
| `fruit` or `fruits` | All fruits |
| `meat` or `protein` | All protein sources |
| `dairy` | All dairy products |
| `nuts` | All nuts and seeds |

## Usage Examples

### 1. Basic Search
Search for all broccoli variants:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/ingredients/search?query=broccoli"
```

**Response**: Returns all broccoli variants (raw, steamed, sautéed, stir-fry, grilled, baked)

### 2. Smart Search - Fish
Search for all fish:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/ingredients/search?query=fish"
```

**Response**: Returns all fish types:
- Salmon (raw, grilled, baked, steamed, sautéed, stir-fry)
- Tilapia (raw, grilled, baked, sautéed)
- Tuna (raw, grilled, baked, sautéed)
- Cod (raw, steamed, grilled, baked, sautéed)
- And more...

### 3. Smart Search - Vegetables
Search for all vegetables:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/ingredients/search?query=vegetables&limit=50"
```

**Response**: Returns up to 50 vegetables with all cooking variants

### 4. Search with Category Filter
Search for proteins containing "chicken":

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/ingredients/search?query=chicken&category=protein"
```

**Response**: Returns chicken breast, chicken thigh + all cooked variants

### 5. Search with Allergen Filter
Search for vegetables excluding dairy:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/ingredients/search?query=broccoli&allergens=dairy"
```

**Response**: Returns all broccoli variants (none contain dairy)

### 6. Search with Limit
Get top 10 mushroom variants:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/ingredients/search?query=mushroom&limit=10"
```

**Response**: Returns up to 10 mushroom variants

### 7. Search All of a Category
Get all proteins:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  "https://your-api.com/api/ingredients/search?query=protein&limit=100"
```

**Response**: Returns up to 100 protein items (raw + cooked variants)

## Grouped Results

The `grouped` field organizes ingredients by cooking method for easier frontend display:

```json
{
  "grouped": {
    "raw": [
      { "name": "broccoli", "calories": 34 }
    ],
    "steamed": [
      { "name": "steamed broccoli", "calories": 35 }
    ],
    "sauteed": [
      { "name": "sauteed broccoli", "calories": 73 }
    ],
    "stirFry": [
      { "name": "stir-fry broccoli", "calories": 63 }
    ],
    "grilled": [
      { "name": "grilled broccoli", "calories": 37 }
    ],
    "baked": [
      { "name": "baked broccoli", "calories": 62 }
    ],
    "other": [
      { "name": "boiled egg", "calories": 78 },
      { "name": "scrambled egg", "calories": 102 }
    ]
  }
}
```

## Performance

- **In-Memory Caching**: All ingredients are cached in memory for instant access
- **Response Time**: Typically 2-10ms
- **Max Results**: Up to 100 ingredients per request
- **Database**: PostgreSQL with indexed name column

## Error Responses

### 400 Bad Request
```json
{
  "error": "Query too short",
  "message": "Query must be at least 2 characters long"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}
```

## Comparison with Recipe Search API

| Feature | Recipe Search API | Simple Ingredients Search API |
|---------|------------------|-------------------------------|
| **Purpose** | Find recipes + ingredients | Find ingredients only |
| **Results** | Recipes + 7 ingredients | All matching ingredients (up to 100) |
| **Format** | Recipe format | Raw ingredient data |
| **Speed** | ~100-500ms | ~2-10ms ⚡ |
| **Sources** | Edamam, Spoonacular, Custom, DB | Database only |
| **Caching** | Partial | Full in-memory |
| **Response Structure** | `success`, `data`, `metadata`, `message` | `success`, `data`, `metadata`, `message` ✅ |

### Response Structure Consistency

Both APIs follow the same structure:

```typescript
{
  success: boolean;
  data: {
    // Main results array
    [recipes|ingredients]: Array<any>;
    totalResults: number;
    // Additional data
    ...
  };
  metadata: {
    // Search parameters
    query: string;
    totalResults: number;
    // Counts and statistics
    ...
  };
  message: string;
}
```

## Use Cases

### 1. Ingredient Autocomplete
Fast autocomplete for meal planning:
```typescript
const searchIngredients = async (query: string) => {
  const response = await fetch(
    `/api/ingredients/search?query=${query}&limit=10`
  );
  return response.json();
};
```

### 2. Browse All Cooked Variants
Show all cooking methods for an ingredient:
```typescript
const getBroccoliVariants = async () => {
  const response = await fetch(
    `/api/ingredients/search?query=broccoli`
  );
  const { data } = await response.json();
  return data.grouped; // Access by cooking method
};
```

### 3. Filter by Dietary Restrictions
Find suitable ingredients for client:
```typescript
const getDairyFreeProteins = async () => {
  const response = await fetch(
    `/api/ingredients/search?query=chicken&category=protein&allergens=dairy`
  );
  return response.json();
};
```

## Frontend Integration Example

```typescript
import { useState, useEffect } from 'react';

function IngredientSearchComponent() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const searchIngredients = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(
          `/api/ingredients/search?query=${query}&limit=20`,
          {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        const data = await response.json();
        setResults(data.data.ingredients);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(searchIngredients, 300);
    return () => clearTimeout(debounce);
  }, [query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search ingredients..."
      />
      {loading && <div>Searching...</div>}
      <ul>
        {results.map((ingredient) => (
          <li key={ingredient.id}>
            {ingredient.displayName} - {ingredient.nutrition.calories} cal
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## Notes

- ✅ Authentication required (JWT token)
- ✅ Case-insensitive search
- ✅ Partial matching supported
- ✅ Returns all cooked variants for comprehensive choice
- ✅ Fast in-memory caching for instant results
- ✅ Grouped by cooking method for better UX

---

**Last Updated**: October 28, 2025  
**Endpoint**: `/api/ingredients/search`  
**Version**: 1.0

