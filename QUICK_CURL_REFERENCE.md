# Quick cURL Reference - Recipe Pagination

## Setup
```bash
export API_URL="https://caloriescience-api.vercel.app"
export JWT_TOKEN="your_jwt_token_here"
export DRAFT_ID="your_draft_id_here"
```

---

## Get Draft (See Current Page)
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"get-draft","draftId":"'"${DRAFT_ID}"'"}'
```

---

## Next Page
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"change-page","planId":"'"${DRAFT_ID}"'","day":1,"mealName":"lunch","direction":"next"}'
```

---

## Previous Page
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"change-page","planId":"'"${DRAFT_ID}"'","day":1,"mealName":"lunch","direction":"prev"}'
```

---

## Go to Page 3
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"change-page","planId":"'"${DRAFT_ID}"'","day":1,"mealName":"lunch","direction":"specific","pageNumber":3}'
```

---

## Different Meals

### Breakfast
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"change-page","planId":"'"${DRAFT_ID}"'","day":1,"mealName":"breakfast","direction":"next"}'
```

### Dinner
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"change-page","planId":"'"${DRAFT_ID}"'","day":1,"mealName":"dinner","direction":"next"}'
```

### Snacks
```bash
curl -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"change-page","planId":"'"${DRAFT_ID}"'","day":1,"mealName":"snacks","direction":"next"}'
```

---

## With jq (Pretty Output)

### Get Pagination Info
```bash
curl -s -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"get-draft","draftId":"'"${DRAFT_ID}"'"}' \
  | jq '.data.suggestions[0].meals.lunch.pagination'
```

### Get Recipe List
```bash
curl -s -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"get-draft","draftId":"'"${DRAFT_ID}"'"}' \
  | jq '.data.suggestions[0].meals.lunch.recipes[] | {id, title, calories}'
```

### Change Page and Show Result
```bash
curl -s -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"change-page","planId":"'"${DRAFT_ID}"'","day":1,"mealName":"lunch","direction":"next"}' \
  | jq '.data | {currentPage, totalPages, hasNextPage, hasPrevPage, recipesCount}'
```

---

## One-Liners (Copy & Paste)

**Note:** Replace `YOUR_TOKEN` and `YOUR_DRAFT_ID` with actual values.

### Next Page
```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"action":"change-page","planId":"YOUR_DRAFT_ID","day":1,"mealName":"lunch","direction":"next"}'
```

### Previous Page
```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"action":"change-page","planId":"YOUR_DRAFT_ID","day":1,"mealName":"lunch","direction":"prev"}'
```

### Go to Page 2
```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"action":"change-page","planId":"YOUR_DRAFT_ID","day":1,"mealName":"lunch","direction":"specific","pageNumber":2}'
```

### Get Draft
```bash
curl -X POST "https://caloriescience-api.vercel.app/api/meal-plans/draft" -H "Authorization: Bearer YOUR_TOKEN" -H "Content-Type: application/json" -d '{"action":"get-draft","draftId":"YOUR_DRAFT_ID"}'
```

---

## Expected Response Structure

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
        "calories": 669,
        "protein": 49,
        "carbs": 13,
        "fat": 49,
        "fiber": 1
      }
      // ... 5 more recipes (6 total)
    ],
    "recipesCount": 6,
    "currentPage": 2,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

---

## Common Errors

### Already on last page
```json
{
  "success": false,
  "error": "Invalid page",
  "message": "No more pages available. You're already on the last page (5)."
}
```

### Already on first page
```json
{
  "success": false,
  "error": "Invalid page",
  "message": "No previous pages available. You're already on the first page."
}
```

### Invalid page number
```json
{
  "success": false,
  "error": "Invalid page",
  "message": "Invalid page number 999. Valid range is 1 to 5."
}
```

---

## Testing Script

Save as `test.sh`:

```bash
#!/bin/bash
export API_URL="https://caloriescience-api.vercel.app"
export JWT_TOKEN="your_jwt_token_here"
export DRAFT_ID="your_draft_id_here"

echo "Page 1"
curl -s -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"get-draft","draftId":"'"${DRAFT_ID}"'"}' \
  | jq '.data.suggestions[0].meals.lunch.pagination'

echo -e "\n\nGoing to page 2..."
curl -s -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"change-page","planId":"'"${DRAFT_ID}"'","day":1,"mealName":"lunch","direction":"next"}' \
  | jq '.data | {currentPage, totalPages, hasNextPage, hasPrevPage}'

echo -e "\n\nVerify page 2..."
curl -s -X POST "${API_URL}/api/meal-plans/draft" \
  -H "Authorization: Bearer ${JWT_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"action":"get-draft","draftId":"'"${DRAFT_ID}"'"}' \
  | jq '.data.suggestions[0].meals.lunch.pagination'
```

Run with:
```bash
chmod +x test.sh && ./test.sh
```

