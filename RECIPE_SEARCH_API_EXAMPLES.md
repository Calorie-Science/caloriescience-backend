# Multi-Provider Recipe Search API

This API provides unified recipe search across multiple providers (Edamam and Spoonacular) with comprehensive filtering options.

## Endpoints

### GET `/api/recipe-search`

Search for recipes across multiple providers.

#### Query Parameters

| Parameter | Type | Description | Example |
|-----------|------|-------------|---------|
| `query` | string | Search query | `"chicken pasta"` |
| `diet` | string[] | Diet labels | `["keto", "paleo"]` |
| `health` | string[] | Health labels | `["gluten-free", "dairy-free"]` |
| `cuisineType` | string[] | Cuisine types | `["italian", "mexican"]` |
| `mealType` | string[] | Meal types | `["breakfast", "lunch"]` |
| `dishType` | string[] | Dish types | `["main course", "dessert"]` |
| `calories` | string | Calorie range | `"200-400"` |
| `time` | string | Cooking time range | `"0-30"` |
| `excluded` | string[] | Excluded ingredients | `["nuts", "dairy"]` |
| `maxResults` | number | Maximum results (1-100) | `20` |
| `provider` | string | Provider to use | `"edamam"`, `"spoonacular"`, or `"both"` |

#### Example Requests

```bash
# Search for gluten-free Italian breakfast recipes
GET /api/recipe-search?query=pancakes&health=gluten-free&cuisineType=italian&mealType=breakfast&provider=both

# Search for keto dinner recipes under 500 calories
GET /api/recipe-search?diet=keto&mealType=dinner&calories=0-500&maxResults=10

# Search for vegetarian lunch recipes from both providers
GET /api/recipe-search?health=vegetarian&mealType=lunch&provider=both&maxResults=15
```

#### Response Format

```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "edamam_12345",
        "title": "Gluten-Free Pancakes",
        "image": "https://...",
        "servings": 4,
        "calories": 250,
        "protein": 8,
        "carbs": 35,
        "fat": 12,
        "fiber": 3,
        "sourceUrl": "https://...",
        "source": "edamam",
        "ingredients": [...],
        "healthLabels": ["gluten-free"],
        "dietLabels": [],
        "cuisineType": ["italian"],
        "dishType": ["breakfast"],
        "mealType": ["breakfast"]
      }
    ],
    "totalResults": 150,
    "provider": "both",
    "searchParams": {...}
  },
  "message": "Found 20 recipes from both"
}
```

### POST `/api/recipe-search`

Handle additional actions.

#### Actions

##### Get Available Providers

```json
{
  "action": "get-providers"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "providers": ["edamam", "spoonacular"]
  },
  "message": "Available providers: edamam, spoonacular"
}
```

##### Get Recipe Details

```json
{
  "action": "get-recipe-details",
  "recipeId": "edamam_12345"
}
```

## Supported Filters

### Health Labels
- `gluten-free`
- `dairy-free`
- `vegetarian`
- `vegan`
- `ketogenic`
- `low-fodmap`
- `whole30`
- `paleo`

### Diet Labels
- `keto`
- `paleo`
- `mediterranean`
- `dash`
- `low-carb`
- `low-fat`

### Cuisine Types
- `italian`
- `mexican`
- `asian`
- `indian`
- `mediterranean`
- `american`
- `french`
- `chinese`
- `japanese`
- `thai`

### Meal Types
- `breakfast`
- `lunch`
- `dinner`
- `snack`

### Dish Types
- `main course`
- `dessert`
- `appetizer`
- `salad`
- `soup`
- `side dish`

## Provider-Specific Features

### Edamam
- ✅ Comprehensive nutrition data
- ✅ Detailed ingredient information
- ✅ Health and diet labels
- ✅ Recipe images
- ✅ Cooking instructions

### Spoonacular
- ✅ Large recipe database
- ✅ Detailed ingredient lists
- ✅ Cooking time information
- ✅ Price per serving
- ✅ Health scores
- ✅ Wine pairing suggestions

## Environment Variables

The Spoonacular API key is already configured by default. If you want to use your own key, add to your `.env.local`:

```bash
# Spoonacular API Key (optional - default key is already configured)
SPOONACULAR_API_KEY=your_spoonacular_api_key_here

# Edamam credentials (already configured)
EDAMAM_APP_ID=your_edamam_app_id
EDAMAM_APP_KEY=your_edamam_app_key
```

## Usage Examples

### JavaScript/TypeScript

```typescript
// Search for recipes
const response = await fetch('/api/recipe-search?query=chicken&health=gluten-free&provider=both');
const data = await response.json();

// Get available providers
const providersResponse = await fetch('/api/recipe-search', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'get-providers' })
});
const providers = await providersResponse.json();
```

### cURL

```bash
# Search for vegetarian Italian recipes
curl "https://your-domain.com/api/recipe-search?health=vegetarian&cuisineType=italian&provider=both"

# Get available providers
curl -X POST "https://your-domain.com/api/recipe-search" \
  -H "Content-Type: application/json" \
  -d '{"action": "get-providers"}'
```

## Error Handling

The API returns appropriate HTTP status codes:

- `200` - Success
- `400` - Bad request (invalid parameters)
- `401` - Unauthorized
- `403` - Forbidden (non-nutritionist user)
- `404` - Recipe not found
- `500` - Internal server error

## Rate Limits

- Edamam: Based on your API key limits
- Spoonacular: Based on your API key limits
- Combined searches may hit limits faster

## Notes

- When using `provider=both`, results are shuffled and limited to `maxResults`
- Spoonacular requires a separate API key
- Some filters may not be supported by all providers
- Recipe details endpoint requires additional API calls for full nutrition data
