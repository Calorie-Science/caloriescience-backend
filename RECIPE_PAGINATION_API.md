# Recipe Pagination API

## Overview

The Recipe Pagination API allows you to browse through recipe suggestions in a meal plan draft using pagination instead of shuffling. This provides a more predictable and user-friendly way to navigate through available recipe options.

## Key Changes from Shuffle API

- **Old Behavior (Shuffle)**: Randomly showed the next batch of 3 recipes from each provider
- **New Behavior (Pagination)**: Shows 6 recipes per page with clear page numbers and navigation

## Endpoint

```
POST /api/meal-plans/draft
```

### Action: `change-page`

Change the current page of recipe suggestions for a specific meal.

## Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `action` | string | Yes | Must be `"change-page"` |
| `planId` | string | Yes | The meal plan draft ID |
| `day` | number | Yes | The day number in the meal plan (1-based) |
| `mealName` | string | Yes | The meal name (e.g., "breakfast", "lunch", "dinner", "snacks") |
| `direction` | string | Yes | Navigation direction: `"next"`, `"prev"`, or `"specific"` |
| `pageNumber` | number | Conditional | Required when `direction` is `"specific"`. The target page number (1-based) |

## Response Format

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Changed to next for lunch on day 1",
  "data": {
    "day": 1,
    "mealName": "lunch",
    "displayedRecipes": [
      {
        "id": "622598",
        "title": "Pittata - Pizza Frittata",
        "image": "https://...",
        "source": "spoonacular",
        "servings": 2,
        "calories": 669,
        "protein": 49,
        "carbs": 13,
        "fat": 49,
        "fiber": 1
      }
      // ... 5 more recipes (6 total per page)
    ],
    "recipesCount": 6,
    "currentPage": 2,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

### Error Responses

#### 400 Bad Request - Invalid Page

```json
{
  "success": false,
  "error": "Invalid page",
  "message": "No more pages available. You're already on the last page (5)."
}
```

#### 404 Not Found

```json
{
  "error": "Meal plan not found",
  "message": "The specified meal plan does not exist"
}
```

## Usage Examples

### 1. Go to Next Page

```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "change-page",
    "planId": "draft_1759771713995_ksn6dvy0q",
    "day": 1,
    "mealName": "lunch",
    "direction": "next"
  }'
```

### 2. Go to Previous Page

```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "change-page",
    "planId": "draft_1759771713995_ksn6dvy0q",
    "day": 1,
    "mealName": "lunch",
    "direction": "prev"
  }'
```

### 3. Go to Specific Page

```bash
curl -X POST 'https://caloriescience-api.vercel.app/api/meal-plans/draft' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "change-page",
    "planId": "draft_1759771713995_ksn6dvy0q",
    "day": 1,
    "mealName": "lunch",
    "direction": "specific",
    "pageNumber": 3
  }'
```

### JavaScript/Fetch Example

```javascript
const changePage = async (planId, day, mealName, direction, pageNumber = null) => {
  const body = {
    action: 'change-page',
    planId,
    day,
    mealName,
    direction
  };
  
  // Add pageNumber if direction is 'specific'
  if (direction === 'specific' && pageNumber) {
    body.pageNumber = pageNumber;
  }

  const response = await fetch(
    'https://caloriescience-api.vercel.app/api/meal-plans/draft',
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${YOUR_JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }
  );

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return data.data;
};

// Usage examples
await changePage('draft_123', 1, 'lunch', 'next'); // Go to next page
await changePage('draft_123', 1, 'lunch', 'prev'); // Go to previous page
await changePage('draft_123', 1, 'lunch', 'specific', 3); // Go to page 3
```

### React Component Example

```tsx
import { useState } from 'react';

const RecipePagination = ({ planId, day, mealName, initialPage = 1, totalPages }) => {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  const changePage = async (direction: 'next' | 'prev' | 'specific', pageNum?: number) => {
    setLoading(true);
    try {
      const body: any = {
        action: 'change-page',
        planId,
        day,
        mealName,
        direction
      };
      
      if (direction === 'specific' && pageNum) {
        body.pageNumber = pageNum;
      }

      const response = await fetch('/api/meal-plans/draft', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const result = await response.json();
      
      if (result.success) {
        setRecipes(result.data.displayedRecipes);
        setCurrentPage(result.data.currentPage);
      }
    } catch (error) {
      console.error('Error changing page:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="recipe-pagination">
      <div className="recipes-grid">
        {recipes.map(recipe => (
          <RecipeCard key={recipe.id} recipe={recipe} />
        ))}
      </div>
      
      <div className="pagination-controls">
        <button 
          onClick={() => changePage('prev')}
          disabled={currentPage === 1 || loading}
        >
          ← Previous
        </button>
        
        <div className="page-numbers">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => changePage('specific', pageNum)}
              className={pageNum === currentPage ? 'active' : ''}
              disabled={loading}
            >
              {pageNum}
            </button>
          ))}
        </div>
        
        <button 
          onClick={() => changePage('next')}
          disabled={currentPage === totalPages || loading}
        >
          Next →
        </button>
      </div>
      
      <div className="page-info">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
};
```

## Pagination Info in Draft Response

When you fetch a draft using the `get-draft` action, each meal now includes pagination information:

```json
{
  "success": true,
  "data": {
    "id": "draft_123",
    "suggestions": [
      {
        "day": 1,
        "meals": {
          "lunch": {
            "recipes": [ /* 6 recipes for current page */ ],
            "pagination": {
              "currentPage": 1,
              "totalPages": 5,
              "recipesPerPage": 6
            },
            "allRecipes": {
              "edamam": [ /* all edamam recipes */ ],
              "spoonacular": [ /* all spoonacular recipes */ ]
            }
          }
        }
      }
    ]
  }
}
```

## How It Works

1. **Initial State**: When a draft is created, 18 recipes are fetched from each provider (36 total) and stored in `allRecipes` (separated by provider)
2. **Pagination Setup**: The first 6 recipes (from both providers combined) are shown on page 1
3. **Page Navigation**: 
   - `next`: Moves to the next page (if available)
   - `prev`: Moves to the previous page (if available)
   - `specific`: Jumps to a specific page number
4. **Persistence**: The current page is saved in the database, so when you reload the draft, you'll see the same page

## Key Features

- ✅ **Predictable Navigation**: Users can see how many pages are available and jump to specific pages
- ✅ **Combined Provider Results**: Shows recipes from both Edamam and Spoonacular in one unified list
- ✅ **Persistent State**: Current page is saved in the database
- ✅ **6 Recipes Per Page**: Optimal number for UI display
- ✅ **Easy Navigation**: Support for next, previous, and direct page selection
- ✅ **Backward Compatible**: Old drafts with `displayOffset` will still work with shuffle API

## Migration from Shuffle API

The old `shuffle-recipes` action is still available for backward compatibility, but new implementations should use `change-page`:

| Old (Shuffle) | New (Pagination) |
|---------------|------------------|
| `action: "shuffle-recipes"` | `action: "change-page"` |
| No page concept | Clear page numbers (1, 2, 3...) |
| 3 recipes from each provider | 6 recipes total per page |
| `hasMore` flag | `hasNextPage`/`hasPrevPage` + `totalPages` |
| Random next batch | Predictable pagination |

## Notes

- **18 recipes per provider**: Fetches 18 from Edamam + 18 from Spoonacular = **36 total recipes** per meal
- **6 pages available**: With 6 recipes per page, you get 6 pages total (36 ÷ 6 = 6)
- Recipes per page is fixed at 6 but can be changed in the service if needed
- Total pages are calculated automatically based on available recipes
- The API prevents navigating beyond available pages
- Pagination info is automatically initialized on first draft fetch if missing
- Both Edamam and Spoonacular recipes are combined into a single paginated list

