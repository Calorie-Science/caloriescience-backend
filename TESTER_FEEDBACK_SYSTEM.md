# Tester Feedback System Documentation

## Overview
The Tester Feedback System allows nutritionists to provide feedback during POC testing across various aspects of the application.

## Database Schema

### Table: `tester_feedback`

```sql
CREATE TABLE tester_feedback (
    id UUID PRIMARY KEY,
    nutritionist_id UUID NOT NULL,
    feedback_type VARCHAR(50) NOT NULL,
    client_id UUID,
    meal_plan_id VARCHAR(255),
    title VARCHAR(255),
    feedback_text TEXT,
    rating INTEGER (1-5),
    pass_fail VARCHAR(10) ('pass', 'fail'),
    feedback_date DATE,
    tester_name VARCHAR(255),
    tester_email VARCHAR(255),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### Feedback Types

1. **`global`** - Overall product feedback (Profile → Feedback)
2. **`client_details`** - Client Details section feedback
3. **`nutritional_analysis_overall`** - Overall nutritional analysis feedback
4. **`nutritional_analysis_macro`** - Macro-specific feedback
5. **`nutritional_analysis_micro`** - Micro-specific feedback
6. **`meal_planning_manual`** - Manual meal planning feedback
7. **`meal_planning_automated`** - Automated meal planning feedback
8. **`meal_planning_ai`** - AI meal planning feedback
9. **`meal_plan_quality`** - Individual meal plan quality rating (requires `rating` 1-5)
10. **`meal_plan_nutrition`** - Individual meal plan nutritional analysis feedback

## API Endpoints

### 1. Submit Feedback
**POST** `/api/feedback`

**Request Body:**
```json
{
  "feedbackType": "global",
  "clientId": "uuid",           // Optional, required for client_details
  "mealPlanId": "plan-id",      // Optional, required for meal_plan_*
  "title": "Short summary",     // Optional
  "feedbackText": "Feedback text",
  "rating": 4,                  // Optional, only for meal_plan_quality (1-5)
  "passFail": "pass",           // Optional, "pass" or "fail"
  "feedbackDate": "2025-11-18"  // Optional, defaults to today
}
```

**Response:**
```json
{
  "success": true,
  "message": "Feedback submitted successfully",
  "data": {
    "id": "uuid",
    "feedbackType": "global",
    "feedbackText": "...",
    "createdAt": "2025-11-18T10:00:00Z"
  }
}
```

### 2. Get Feedback
**GET** `/api/feedback`

**Query Parameters:**
- `feedbackType` (optional) - Filter by feedback type
- `clientId` (optional) - Filter by client
- `mealPlanId` (optional) - Filter by meal plan
- `page` (optional, default: 1)
- `pageSize` (optional, default: 50, max: 100)

**Response:**
```json
{
  "success": true,
  "data": {
    "feedback": [
      {
        "id": "uuid",
        "feedbackType": "global",
        "clientId": null,
        "mealPlanId": null,
        "feedbackText": "...",
        "rating": null,
        "feedbackDate": "2025-11-18",
        "createdAt": "2025-11-18T10:00:00Z",
        "updatedAt": "2025-11-18T10:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### 3. Update Feedback
**PUT** `/api/feedback?id=<feedback-id>`

**Request Body:**
```json
{
  "feedbackText": "Updated text",
  "rating": 5,
  "feedbackDate": "2025-11-19"
}
```

### 4. Delete Feedback
**DELETE** `/api/feedback?id=<feedback-id>`

**Response:**
```json
{
  "success": true,
  "message": "Feedback deleted successfully"
}
```

### 5. Export Feedback as CSV
**GET** `/api/feedback/export`

**Query Parameters:**
- `clientId` (optional) - Filter by client
- `feedbackType` (optional) - Filter by type
- `startDate` (optional) - Filter created after (ISO format)
- `endDate` (optional) - Filter created before (ISO format)

**Response:** CSV file download

**CSV Columns:**
- Feedback ID
- Tester Name
- Tester Email
- Client Name
- Client ID
- Feedback Type
- Meal Plan ID
- Feedback Text
- Rating
- Feedback Date
- Created At
- Updated At

## Usage Examples

### 1. Submit Global Feedback
```bash
curl -X POST https://api.example.com/api/feedback \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedbackType": "global",
    "feedbackText": "The application is very user-friendly!"
  }'
```

### 2. Submit Client Details Feedback
```bash
curl -X POST https://api.example.com/api/feedback \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedbackType": "client_details",
    "clientId": "client-uuid",
    "feedbackText": "Adding a client is straightforward",
    "feedbackDate": "2025-11-18"
  }'
```

### 3. Submit Meal Plan Quality Rating
```bash
curl -X POST https://api.example.com/api/feedback \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "feedbackType": "meal_plan_quality",
    "clientId": "client-uuid",
    "mealPlanId": "plan-123",
    "rating": 5,
    "feedbackText": "Excellent recipes!"
  }'
```

### 4. Get All Feedback for a Client
```bash
curl "https://api.example.com/api/feedback?clientId=client-uuid&page=1&pageSize=50" \
  -H "Authorization: Bearer TOKEN"
```

### 5. Export All Feedback as CSV
```bash
curl "https://api.example.com/api/feedback/export" \
  -H "Authorization: Bearer TOKEN" \
  -o feedback-export.csv
```

### 6. Export Filtered Feedback
```bash
curl "https://api.example.com/api/feedback/export?feedbackType=meal_planning_ai&startDate=2025-11-01" \
  -H "Authorization: Bearer TOKEN" \
  -o ai-feedback.csv
```

## Integration Points

### 1. My Profile → Feedback
- **Type:** `global`
- **UI:** Large text area
- **Prompt:** "Please provide feedback on the overall usability of the application."
- Multiple entries allowed (timestamped)

### 2. Client Details (Replace Appointments Tab)
- **Type:** `client_details`
- **UI:** Free-text field
- **Prompt:** "Please provide feedback on 'Adding a client' and the overall Client Details section. Please specify the date of feedback."
- **Required:** `clientId`
- Multiple entries allowed

### 3. Target Nutritional Analysis
- **Types:**
  - `nutritional_analysis_overall` - Overall feedback
  - `nutritional_analysis_macro` - Macro-specific feedback
  - `nutritional_analysis_micro` - Micro-specific feedback
- **UI:** Three separate text fields
- **Prompt for Macro/Micro:** "Please specify which macro/micro values appear inaccurate and why."
- **Required:** `clientId`

### 4. Meal Planning Section
- **Types:**
  - `meal_planning_manual` - Manual meal planning feedback
  - `meal_planning_automated` - Automated meal planning feedback
  - `meal_planning_ai` - AI meal planning feedback
- **UI:** Three separate text fields
- Multiple entries allowed with timestamps

### 5. Individual Meal Plan (Post-Generation)
- **Type:** `meal_plan_quality` (with rating)
- **UI:** 1-5 star rating + optional text
- **Prompt:** "Rate the quality and relevance of recipes."
- **Required:** `mealPlanId`, `rating`

- **Type:** `meal_plan_nutrition`
- **UI:** Collapsible/expandable text field
- **Prompt:** "List the items that are not accurate in the nutritional analysis."
- **Required:** `mealPlanId`

## Export Data Structure

The CSV export provides a comprehensive view of all feedback:

| Tester Name | Client Name | Feedback Type | Meal Plan ID | Feedback Text | Rating | Date |
|-------------|-------------|---------------|--------------|---------------|--------|------|
| John Smith  | Jane Doe    | Global        | -            | Great app!    | -      | 2025-11-18 |
| John Smith  | Jane Doe    | Meal Plan Quality | ai-123  | Good recipes  | 5      | 2025-11-18 |
| John Smith  | Jane Doe    | Meal Planning AI | -         | Needs work    | -      | 2025-11-18 |

## Migration

Run the migration to create the table:

```bash
psql DATABASE_URL < database/migrations/077_create_tester_feedback_system.sql
```

Or via Supabase dashboard:
1. Go to SQL Editor
2. Paste the contents of `077_create_tester_feedback_system.sql`
3. Run the migration

## Security

- **Authentication:** Required for all endpoints
- **Authorization:** Only nutritionists can submit/view feedback
- **RLS Policies:** Nutritionists can only access their own feedback
- **Data Privacy:** Client information is linked but not exposed in exports without proper filtering

## Notes

- All timestamps are in UTC
- `feedbackDate` allows testers to backdate entries if needed
- Multiple feedback entries can exist for the same client/meal plan
- Rating is only applicable for `meal_plan_quality` type
- CSV export respects all query filters for targeted data extraction
