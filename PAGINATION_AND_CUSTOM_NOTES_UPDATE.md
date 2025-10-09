# Pagination and Custom Notes Update Summary

## Overview

This document summarizes two major updates to the CalorieScience API:
1. **Recipe Pagination** - Replaced shuffle functionality with predictable pagination
2. **Custom Notes in Customized Recipe API** - Added custom notes field to recipe responses

---

## 1. Recipe Pagination Feature

### What Changed

The recipe shuffling system has been enhanced with a pagination feature that provides predictable, page-based navigation through recipe suggestions.

### New API Endpoint

**Action**: `change-page` (added to `/api/meal-plans/draft`)

**Request:**
```json
{
  "action": "change-page",
  "planId": "draft_123",
  "day": 1,
  "mealName": "lunch",
  "direction": "next" | "prev" | "specific",
  "pageNumber": 3  // Required only when direction is "specific"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "day": 1,
    "mealName": "lunch",
    "displayedRecipes": [ /* 6 recipes */ ],
    "recipesCount": 6,
    "currentPage": 2,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

### Key Features

- **18 recipes per provider** fetched initially (36 total recipes)
- **6 recipes per page** (combined from both Edamam and Spoonacular)
- **6 pages total** per meal (36 recipes ÷ 6 per page)
- **Clear pagination info**: `currentPage`, `totalPages`, `hasNextPage`, `hasPrevPage`
- **Three navigation modes**:
  - `next`: Move to next page
  - `prev`: Move to previous page
  - `specific`: Jump to a specific page number
- **Persistent state**: Current page is saved in the database
- **Automatic initialization**: Pagination info is created on first draft fetch if missing

### Data Structure Changes

Added `pagination` field to meal objects:

```typescript
pagination?: {
  currentPage: number;        // Current page number (1-based)
  totalPages: number;         // Total number of pages available
  recipesPerPage: number;     // Number of recipes per page (default: 6)
}
```

### Files Modified

1. **`/api/meal-plans/draft.ts`**
   - Added `changePageSchema` validation schema
   - Added `handleChangePage` handler function
   - Updated switch case to include `change-page` action
   - Modified `handleGetDraft` to initialize pagination info

2. **`/lib/mealPlanDraftService.ts`**
   - Updated `MealPlanDraft` interface to include `pagination` field
   - Added `changePage()` method for handling page navigation
   - Implemented logic to calculate total pages and retrieve recipes for specific pages

3. **`/RECIPE_PAGINATION_API.md`** (new)
   - Comprehensive documentation for pagination API
   - Usage examples in cURL, JavaScript, and React
   - Migration guide from shuffle API

### Backward Compatibility

- Old `shuffle-recipes` action still works for backward compatibility
- Existing drafts with `displayOffset` continue to function
- New drafts automatically use pagination system

---

## 2. Custom Notes in Customized Recipe API

### What Changed

The customized recipe API (`/api/recipes/customized`) now includes the `customNotes` field in its response, allowing nutritionists to add and retrieve custom annotations for recipes.

### API Flow

#### Saving Custom Notes

**Endpoint**: `POST /api/meal-plans/draft`
**Action**: `update-notes`

```json
{
  "action": "update-notes",
  "planId": "draft_123",
  "day": 1,
  "mealName": "lunch",
  "recipeId": "622598",
  "notes": "This recipe has been customized for a client with egg allergy."
}
```

**Response:**
```json
{
  "success": true,
  "message": "Notes updated successfully",
  "data": {
    "day": 1,
    "mealName": "lunch",
    "recipeId": "622598",
    "recipeTitle": "Pittata - Pizza Frittata",
    "customNotes": "This recipe has been customized for a client with egg allergy.",
    "notesLength": 69
  }
}
```

#### Retrieving Custom Notes

**Endpoint**: `GET /api/recipes/customized`

```bash
curl -X GET 'https://caloriescience-api.vercel.app/api/recipes/customized?recipeId=622598&draftId=draft_123&day=1&mealName=lunch' \
  -H 'Authorization: Bearer YOUR_JWT_TOKEN'
```

**Response includes:**
```json
{
  "success": true,
  "data": {
    "id": "622598",
    "recipeName": "Pittata - Pizza Frittata",
    "customNotes": "This recipe has been customized for a client with egg allergy.",
    // ... other recipe fields
  },
  "hasCustomizations": true,
  "customizations": { /* ... */ }
}
```

### Files Modified

1. **`/api/recipes/customized.ts`**
   - Already included `customNotes` in response (lines 242 and 304)
   - No changes needed - feature was already implemented

2. **`/api/meal-plans/draft.ts`**
   - `handleUpdateNotes` function already exists and working
   - Saves notes to recipe in draft

3. **`/lib/mealPlanDraftService.ts`**
   - `updateRecipeNotes()` method already implemented
   - Updates recipe's `customNotes` field in database

4. **`/CUSTOMIZED_RECIPE_API.md`** (updated)
   - Added `customNotes` field to response examples
   - Added "Custom Notes" section with save/retrieve documentation
   - Updated React component example to display custom notes

### Key Features

- ✅ Notes are stored in the meal plan draft
- ✅ Maximum 2000 characters per note
- ✅ Can be cleared by passing empty string or null
- ✅ Returned automatically with customized recipe
- ✅ Displayed alongside recipe customizations

---

## Testing

### Test Recipe Pagination

```bash
# 1. Create a draft (you should have a draft ID)
# 2. Change to next page
curl -X POST 'http://localhost:3000/api/meal-plans/draft' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "change-page",
    "planId": "YOUR_DRAFT_ID",
    "day": 1,
    "mealName": "lunch",
    "direction": "next"
  }'

# 3. Get draft to verify pagination info
curl -X POST 'http://localhost:3000/api/meal-plans/draft' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "get-draft",
    "draftId": "YOUR_DRAFT_ID"
  }'
```

### Test Custom Notes

```bash
# 1. Save notes
curl -X POST 'http://localhost:3000/api/meal-plans/draft' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{
    "action": "update-notes",
    "planId": "YOUR_DRAFT_ID",
    "day": 1,
    "mealName": "lunch",
    "recipeId": "RECIPE_ID",
    "notes": "Test note for this recipe"
  }'

# 2. Get customized recipe
curl -X GET 'http://localhost:3000/api/recipes/customized?recipeId=RECIPE_ID&draftId=YOUR_DRAFT_ID&day=1&mealName=lunch' \
  -H 'Authorization: Bearer YOUR_TOKEN'
```

---

## Benefits

### Recipe Pagination
- **Better UX**: Users can see total pages and jump to specific pages
- **Predictable**: No more random shuffling, users know what to expect
- **Efficient**: All recipes are combined into one unified list
- **Persistent**: Current page is saved and restored

### Custom Notes
- **Context**: Nutritionists can add important notes about recipe modifications
- **Communication**: Notes help explain why changes were made
- **Tracking**: Keep track of client-specific considerations
- **Documentation**: Notes are included in recipe exports

---

## Migration Notes

### For Frontend Developers

1. **Update UI** to show pagination controls instead of "Shuffle" button
2. **Display** current page and total pages
3. **Add** next/prev buttons and page number selector
4. **Show** `customNotes` field in recipe detail views
5. **Add** UI for adding/editing custom notes

### For API Consumers

1. **Replace** `shuffle-recipes` calls with `change-page` calls
2. **Use** pagination info from draft response to build UI
3. **Extract** `customNotes` from customized recipe response
4. **Implement** notes management in recipe editing flows

---

## Documentation

- **Pagination API**: `/RECIPE_PAGINATION_API.md`
- **Customized Recipe API**: `/CUSTOMIZED_RECIPE_API.md` (updated)
- **This Summary**: `/PAGINATION_AND_CUSTOM_NOTES_UPDATE.md`

---

## Questions or Issues?

If you encounter any issues with these features, please check:
1. API documentation files for usage examples
2. Response structure matches expected format
3. Proper authentication token is being used
4. Draft ID and recipe ID are valid

