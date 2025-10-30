# Meal Plan Drafts API - Filtering Guide

## Endpoint
`GET /api/meal-plans/drafts`

## Supported Filters

### Query Parameters

| Parameter | Type | Values | Default | Description |
|-----------|------|--------|---------|-------------|
| `status` | string | `draft`, `finalized`, `completed` | none (all) | Filter by plan status |
| `creationMethod` | string | `auto_generated`, `manual`, `ai_generated` | none (all) | Filter by creation method |
| `clientId` | UUID | Any valid UUID | none (all) | Filter by specific client |
| `page` | number | ≥ 1 | 1 | Page number |
| `pageSize` | number | 1-100 | 10 | Results per page |
| `includeNutrition` | boolean | `true`, `false` | `true` | Include nutrition calculations |
| `sortBy` | string | `created_at`, `updated_at` | `updated_at` | Sort field |
| `sortOrder` | string | `asc`, `desc` | `desc` | Sort order |

---

## Creation Method Values

### `auto_generated`
- Filter-based automated meal plans
- Uses recipe APIs (Edamam, Spoonacular, Bon Happetee)
- Generated based on search parameters and filters
- Example: Search by calories, macros, dietary preferences

### `manual`
- Manually created by nutritionist
- Nutritionist selects each recipe individually
- Full control over recipe selection
- Created via `/api/meal-plans/manual/create`

### `ai_generated`
- AI-generated meal plans using Claude
- Claude creates complete meal plans based on client goals
- Natural language input supported
- Created via `/api/meal-plans` with `action=async-generate`

---

## CURL Examples

### Filter by Creation Method

#### 1. Get Only Automated (Filter-Based) Plans
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?creationMethod=auto_generated" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. Get Only Manual Plans
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?creationMethod=manual" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. Get Only AI-Generated (Claude) Plans
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?creationMethod=ai_generated" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Filter by Status

#### 4. Get Draft Status Plans (All Creation Methods)
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?status=draft" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. Get Finalized Plans (All Creation Methods)
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?status=finalized" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 6. Get Completed Plans (All Creation Methods)
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?status=completed" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Combined Filters

#### 7. Get Finalized Automated Plans
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?status=finalized&creationMethod=auto_generated" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 8. Get Draft Manual Plans
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?status=draft&creationMethod=manual" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 9. Get Finalized AI Plans
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?status=finalized&creationMethod=ai_generated" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Filter by Client

#### 10. Get All Plans for Specific Client
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?clientId=abc-123-def-456" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 11. Get Automated Plans for Specific Client
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?clientId=abc-123&creationMethod=auto_generated" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 12. Get Manual Plans for Specific Client
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?clientId=abc-123&creationMethod=manual" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 13. Get AI Plans for Specific Client
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?clientId=abc-123&creationMethod=ai_generated" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Advanced Queries

#### 14. Get Finalized Automated Plans for Client
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?clientId=abc-123&status=finalized&creationMethod=auto_generated" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 15. Get Draft AI Plans for Client, Paginated
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?clientId=abc-123&status=draft&creationMethod=ai_generated&page=1&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 16. Get Manual Plans Without Nutrition (Fast)
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?creationMethod=manual&includeNutrition=false" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 17. Get AI Plans Sorted by Creation Date
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?creationMethod=ai_generated&sortBy=created_at&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Pagination Examples

#### 18. Get Page 2 of Automated Plans (20 per page)
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?creationMethod=auto_generated&page=2&pageSize=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 19. Get Maximum Results (100 per page)
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?pageSize=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### Complex Multi-Filter Query

#### 20. Ultimate Query Example
```bash
curl -X GET "https://caloriescience-api.vercel.app/api/meal-plans/drafts?clientId=abc-123-def-456&status=finalized&creationMethod=ai_generated&page=1&pageSize=25&includeNutrition=true&sortBy=updated_at&sortOrder=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**What this does:**
- Gets finalized AI-generated plans for specific client
- Returns 25 results per page (page 1)
- Includes full nutrition calculations
- Sorted by most recently updated first

---

## Response Format

```json
{
  "success": true,
  "data": {
    "drafts": [
      {
        "id": "manual-xxx-xxx",
        "clientId": "client-uuid",
        "nutritionistId": "nutritionist-uuid",
        "status": "finalized",
        "searchParams": {
          "calories": 2000,
          "protein": 150,
          "dietaryPreferences": {...}
        },
        "totalDays": 7,
        "totalMeals": 21,
        "selectedMeals": 21,
        "completionPercentage": 100,
        "isComplete": true,
        "nutrition": {
          "byDay": [...],
          "overall": {...},
          "dailyAverage": {...}
        },
        "createdAt": "2025-01-29T10:00:00Z",
        "updatedAt": "2025-01-29T12:00:00Z",
        "expiresAt": null
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 10,
      "totalCount": 45,
      "totalPages": 5,
      "hasNextPage": true,
      "hasPreviousPage": false
    },
    "filters": {
      "clientId": "abc-123" or null,
      "status": "finalized" or null,
      "creationMethod": "ai_generated" or null
    }
  },
  "message": "Retrieved 10 meal plan draft(s)"
}
```

---

## Quick Reference Table

| Use Case | Query String |
|----------|--------------|
| All automated plans | `?creationMethod=auto_generated` |
| All manual plans | `?creationMethod=manual` |
| All AI plans | `?creationMethod=ai_generated` |
| Finalized automated | `?status=finalized&creationMethod=auto_generated` |
| Draft manual | `?status=draft&creationMethod=manual` |
| Client's AI plans | `?clientId=XXX&creationMethod=ai_generated` |
| All plans (no filter) | (no creationMethod parameter) |

---

## Database Migration

**File**: `database/migrations/076_add_ai_generated_creation_method.sql`

```sql
-- Drop the existing check constraint
ALTER TABLE meal_plan_drafts 
DROP CONSTRAINT IF EXISTS meal_plan_drafts_creation_method_check;

-- Add updated check constraint with three values
ALTER TABLE meal_plan_drafts 
ADD CONSTRAINT meal_plan_drafts_creation_method_check 
CHECK (creation_method IN ('auto_generated', 'manual', 'ai_generated'));
```

---

## Implementation Details

### How AI Plans Are Saved

When Claude generates a meal plan:

1. **Saved to two tables**:
   - `async_meal_plans` - Stores raw AI generation data
   - `meal_plan_drafts` - Makes it queryable with other meal plans

2. **Draft ID Format**: `ai-{async_meal_plan_id}`
   - Example: `ai-123e4567-e89b-12d3-a456-426614174000`

3. **Automatic Fields Set**:
   ```javascript
   {
     creation_method: 'ai_generated',  // ✅ Enables filtering
     status: 'completed',               // AI plans complete immediately
     expires_at: null,                  // AI plans don't expire
     finalized_at: NOW()                // Marked as finalized
   }
   ```

4. **Service**: `lib/asyncMealPlanService.ts` (lines 254-300)

---

## Notes

- **Authentication Required**: All requests require Bearer token (nutritionist role)
- **Default Behavior**: No filter returns all creation methods
- **Case Sensitive**: Filter values are case-sensitive (`ai_generated` not `AI_Generated`)
- **Combination**: All filters can be combined together
- **Performance**: Using `includeNutrition=false` significantly speeds up response for large result sets
- **AI Plans**: Automatically saved to `meal_plan_drafts` when generated by Claude
- **Status**: AI plans default to `completed` status (not `draft`)

---

**Last Updated**: October 29, 2025  
**API Version**: v1  
**Status**: ✅ Active  
**Migration**: Run `076_add_ai_generated_creation_method.sql` before using `creationMethod` filter

