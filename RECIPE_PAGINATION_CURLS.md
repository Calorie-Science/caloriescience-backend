# Recipe Pagination API - cURL Examples

## Setup

First, set your environment variables:

```bash
# Replace with your actual values
export API_URL="https://caloriescience-api.vercel.app"
# OR for local testing:
# export API_URL="http://localhost:3000"

export JWT_TOKEN="your_jwt_token_here"
export DRAFT_ID="your_draft_id_here"
```

---

## 1. Create a Draft First (if you don't have one)

```bash
curl -X POST "${API_URL}/api/meal-plans/generate" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "your_client_id",
    "days": 1,
    "targetCalories": 2000,
    "proteinMin": 100,
    "proteinMax": 150,
    "carbsMin": 200,
    "carbsMax": 250,
    "fatMin": 50,
    "fatMax": 70,
    "mealTypes": ["breakfast", "lunch", "dinner", "snacks"],
    "allergies": [],
    "cuisineTypes": []
  }'
```

**Save the `draftId` from the response for use in pagination calls.**

---

## 2. Get Draft (View Current Pagination State)

```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-draft",
    "draftId": "'"${DRAFT_ID}"'"
  }'
```

**Look for:**
- `suggestions[0].meals.lunch.pagination.currentPage`
- `suggestions[0].meals.lunch.pagination.totalPages`
- `suggestions[0].meals.lunch.recipes` (should show 6 recipes)

---

## 3. Navigate to Next Page

```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "next"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Changed to next for lunch on day 1",
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

---

## 4. Navigate to Previous Page

```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "prev"
  }'
```

---

## 5. Jump to Specific Page

```bash
# Go to page 3
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "specific",
    "pageNumber": 3
  }'
```

---

## 6. Test Different Meals

### Breakfast
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "breakfast",
    "direction": "next"
  }'
```

### Dinner
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "dinner",
    "direction": "next"
  }'
```

### Snacks
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "snacks",
    "direction": "next"
  }'
```

---

## 7. Test Multi-Day Plans

If your draft has multiple days:

### Day 2, Lunch
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 2,
    "mealName": "lunch",
    "direction": "next"
  }'
```

---

## 8. Error Cases

### Try to go beyond last page
```bash
# First go to the last page
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "specific",
    "pageNumber": 5
  }'

# Then try to go next (should fail)
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "next"
  }'
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Invalid page",
  "message": "No more pages available. You're already on the last page (5)."
}
```

### Try to go before first page
```bash
# Go to page 1
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "specific",
    "pageNumber": 1
  }'

# Then try to go prev (should fail)
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "prev"
  }'
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Invalid page",
  "message": "No previous pages available. You're already on the first page."
}
```

### Invalid page number
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "specific",
    "pageNumber": 999
  }'
```

**Expected Error:**
```json
{
  "success": false,
  "error": "Invalid page",
  "message": "Invalid page number 999. Valid range is 1 to 5."
}
```

---

## 9. Complete Workflow Example

```bash
#!/bin/bash

# Set environment variables
export API_URL="https://caloriescience-api.vercel.app"
export JWT_TOKEN="your_jwt_token_here"
export DRAFT_ID="your_draft_id_here"

echo "=== 1. Get initial draft state ==="
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-draft",
    "draftId": "'"${DRAFT_ID}"'"
  }' | jq '.data.suggestions[0].meals.lunch.pagination'

echo -e "\n=== 2. Navigate to page 2 ==="
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "next"
  }' | jq '.data | {currentPage, totalPages, hasNextPage, hasPrevPage, recipesCount}'

echo -e "\n=== 3. Navigate to page 3 ==="
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "next"
  }' | jq '.data | {currentPage, totalPages, hasNextPage, hasPrevPage}'

echo -e "\n=== 4. Go back to page 2 ==="
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "prev"
  }' | jq '.data | {currentPage, totalPages, hasNextPage, hasPrevPage}'

echo -e "\n=== 5. Jump to last page ==="
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "specific",
    "pageNumber": 5
  }' | jq '.data | {currentPage, totalPages, hasNextPage, hasPrevPage}'

echo -e "\n=== 6. Verify state persisted in draft ==="
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-draft",
    "draftId": "'"${DRAFT_ID}"'"
  }' | jq '.data.suggestions[0].meals.lunch.pagination'
```

**Save this as `test-pagination.sh`, make it executable, and run:**
```bash
chmod +x test-pagination.sh
./test-pagination.sh
```

---

## 10. Integration with Recipe Selection

After navigating to a page, select a recipe:

```bash
# 1. Navigate to page 2
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "change-page",
    "planId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "direction": "next"
  }'

# 2. Get the draft to see recipes on page 2
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-draft",
    "draftId": "'"${DRAFT_ID}"'"
  }' | jq '.data.suggestions[0].meals.lunch.recipes[] | {id, title, calories}'

# 3. Select a recipe from page 2
export RECIPE_ID="recipe_id_from_page_2"

curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "select-recipe",
    "draftId": "'"${DRAFT_ID}"'",
    "day": 1,
    "mealName": "lunch",
    "recipeId": "'"${RECIPE_ID}"'"
  }'
```

---

## 11. Testing with jq (JSON processor)

If you have `jq` installed, you can extract specific fields:

### Get only pagination info
```bash
curl -s -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-draft",
    "draftId": "'"${DRAFT_ID}"'"
  }' | jq '.data.suggestions[0].meals | to_entries[] | {
    meal: .key,
    currentPage: .value.pagination.currentPage,
    totalPages: .value.pagination.totalPages,
    recipesShown: (.value.recipes | length)
  }'
```

### Get recipe titles on current page
```bash
curl -s -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-draft",
    "draftId": "'"${DRAFT_ID}"'"
  }' | jq '.data.suggestions[0].meals.lunch.recipes[] | {
    id: .id,
    title: .title,
    source: .source,
    calories: .calories
  }'
```

### Check pagination status for all meals
```bash
curl -s -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "get-draft",
    "draftId": "'"${DRAFT_ID}"'"
  }' | jq '.data.suggestions[] | {
    day: .day,
    meals: .meals | to_entries[] | {
      name: .key,
      page: .value.pagination.currentPage,
      total: .value.pagination.totalPages,
      recipes: (.value.recipes | length)
    }
  }'
```

---

## Notes

- **Pagination is per meal**: Each meal (breakfast, lunch, dinner, snacks) has its own pagination state
- **6 recipes per page**: Default, but customizable in the service
- **State persists**: Current page is saved in the database
- **Backward compatible**: Old `shuffle-recipes` action still works
- **Combined providers**: Recipes from Edamam and Spoonacular are shown together

---

## Troubleshooting

### If you get "No recipes available for pagination"
This means the draft was created before pagination was added. Create a new draft.

### If pagination info is missing
The first time you call `get-draft`, it will automatically initialize pagination. Verify by checking the response.

### If you can't navigate
- Check that you're not already on the first/last page
- Verify the draft ID is correct
- Ensure the meal name matches exactly ("lunch" not "Lunch")

