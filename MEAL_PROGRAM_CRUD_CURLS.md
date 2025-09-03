# Complete Meal Program CRUD Operations - Curl Commands

## Authentication
Replace `YOUR_TOKEN` with your actual JWT token and `CLIENT_ID` with the actual client ID.

## 1. CREATE - Create New Meal Program

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE' \
--data '{
    "type": "meal-program",
    "clientId": "b543f1f8-87f9-4d84-835e-78385546321a",
    "name": "High Protein Meal Program",
    "description": "A meal program focused on high protein intake for muscle building",
    "meals": [
        {
            "mealOrder": 1,
            "mealName": "Pre-Breakfast Protein",
            "mealTime": "06:30:00",
            "targetCalories": 200,
            "mealType": "breakfast"
        },
        {
            "mealOrder": 2,
            "mealName": "Breakfast",
            "mealTime": "08:00:00",
            "targetCalories": 500,
            "mealType": "breakfast"
        },
        {
            "mealOrder": 3,
            "mealName": "Mid-Morning Snack",
            "mealTime": "10:30:00",
            "targetCalories": 250,
            "mealType": "snack"
        },
        {
            "mealOrder": 4,
            "mealName": "Lunch",
            "mealTime": "13:00:00",
            "targetCalories": 600,
            "mealType": "lunch"
        },
        {
            "mealOrder": 5,
            "mealName": "Afternoon Protein",
            "mealTime": "16:00:00",
            "targetCalories": 300,
            "mealType": "snack"
        },
        {
            "mealOrder": 6,
            "mealName": "Dinner",
            "mealTime": "19:00:00",
            "targetCalories": 350,
            "mealType": "dinner"
        }
    ]
}'
```

## 2. READ - Get All Meal Programs

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans?clientId=b543f1f8-87f9-4d84-835e-78385546321a&mode=meal-programs' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE'
```

## 3. UPDATE - Update Existing Meal Program

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE' \
--data '{
    "type": "meal-program",
    "action": "update",
    "clientId": "b543f1f8-87f9-4d84-835e-78385546321a",
    "mealProgramId": "YOUR_MEAL_PROGRAM_ID",
    "name": "Updated High Protein Meal Program",
    "description": "Updated description for high protein meal program",
    "meals": [
        {
            "mealOrder": 1,
            "mealName": "Updated Pre-Breakfast Protein",
            "mealTime": "06:30:00",
            "targetCalories": 250,
            "mealType": "breakfast"
        },
        {
            "mealOrder": 2,
            "mealName": "Updated Breakfast",
            "mealTime": "08:00:00",
            "targetCalories": 550,
            "mealType": "breakfast"
        },
        {
            "mealOrder": 3,
            "mealName": "Updated Mid-Morning Snack",
            "mealTime": "10:30:00",
            "targetCalories": 300,
            "mealType": "snack"
        },
        {
            "mealOrder": 4,
            "mealName": "Updated Lunch",
            "mealTime": "13:00:00",
            "targetCalories": 650,
            "mealType": "lunch"
        },
        {
            "mealOrder": 5,
            "mealName": "Updated Afternoon Protein",
            "mealTime": "16:00:00",
            "targetCalories": 350,
            "mealType": "snack"
        },
        {
            "mealOrder": 6,
            "mealName": "Updated Dinner",
            "mealTime": "19:00:00",
            "targetCalories": 400,
            "mealType": "dinner"
        },
        {
            "mealOrder": 7,
            "mealName": "New Evening Snack",
            "mealTime": "21:00:00",
            "targetCalories": 150,
            "mealType": "snack"
        }
    ]
}'
```

## 4. DELETE - Delete Meal Program

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE' \
--data '{
    "type": "meal-program",
    "action": "delete",
    "clientId": "b543f1f8-87f9-4d84-835e-78385546321a",
    "mealProgramId": "YOUR_MEAL_PROGRAM_ID"
}'
```

## 5. ACTIVATE - Activate Meal Program

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE' \
--data '{
    "type": "meal-program",
    "action": "activate",
    "clientId": "b543f1f8-87f9-4d84-835e-78385546321a",
    "mealProgramId": "YOUR_MEAL_PROGRAM_ID"
}'
```

## 6. PREVIEW - Generate Meal Plan from Program

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE' \
--data '{
    "action": "preview",
    "clientId": "b543f1f8-87f9-4d84-835e-78385546321a",
    "planDate": "2025-09-20",
    "dietaryRestrictions": [
        "vegetarian",
        "gluten-free"
    ],
    "cuisinePreferences": [
        "Italian",
        "Mediterranean"
    ]
}'
```

## 7. GET CLIENT GOALS

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans?clientId=b543f1f8-87f9-4d84-835e-78385546321a&mode=client-goals' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE'
```

## 8. CREATE/UPDATE CLIENT GOALS (New Range-Based Structure)

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE' \
--data '{
    "type": "client-goal",
    "clientId": "b543f1f8-87f9-4d84-835e-78385546321a",
    "eerGoalCalories": 2200,
    "bmrGoalCalories": 1800,
    "proteinGoalMin": 140,
    "proteinGoalMax": 180,
    "carbsGoalMin": 200,
    "carbsGoalMax": 250,
    "fatGoalMin": 60,
    "fatGoalMax": 80,
    "fiberGoalGrams": 25,
    "waterGoalLiters": 2.5,
    "goalStartDate": "2025-01-20",
    "goalEndDate": "2025-12-31",
    "notes": "High protein diet with flexible macro ranges for muscle building"
}'
```

## 9. UPDATE EXISTING CLIENT GOALS

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE' \
--data '{
    "type": "client-goal",
    "action": "update",
    "clientId": "b543f1f8-87f9-4d84-835e-78385546321a",
    "goalId": "YOUR_GOAL_ID",
    "eerGoalCalories": 2400,
    "bmrGoalCalories": 1900,
    "proteinGoalMin": 160,
    "proteinGoalMax": 200,
    "carbsGoalMin": 220,
    "carbsGoalMax": 280,
    "fatGoalMin": 70,
    "fatGoalMax": 90,
    "fiberGoalGrams": 30,
    "waterGoalLiters": 3.0,
    "goalStartDate": "2025-01-20",
    "goalEndDate": "2025-12-31",
    "notes": "Updated high protein diet with expanded macro ranges"
}'
```

## Notes:

1. **Replace `YOUR_MEAL_PROGRAM_ID`** with the actual meal program ID returned from the create operation
2. **Replace `YOUR_GOAL_ID`** with the actual client goal ID returned from the create operation
3. **Time Format**: Use 24-hour format (HH:MM:SS) for meal times
4. **Meal Types**: Valid options are `breakfast`, `lunch`, `dinner`, `snack`
5. **Meal Order**: Must be unique integers from 1 to 10
6. **Target Calories**: Optional, but must be positive if provided
7. **Macro Ranges**: Min values must be less than max values, all values must be positive
8. **Authorization**: Only nutritionists can perform these operations

## Client Goals Changes:

- **Removed**: `proteinGoalPercentage`, `carbsGoalPercentage`, `fatGoalPercentage`
- **Removed**: `proteinGoalGrams`, `carbsGoalGrams`, `fatGoalGrams` (single values)
- **Added**: `proteinGoalMin`, `proteinGoalMax`, `carbsGoalMin`, `carbsGoalMax`, `fatGoalMin`, `fatGoalMax`
- **Benefits**: More flexible macro targeting with ranges instead of rigid percentages

## Example Response Structure:

### Create/Update Meal Program Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "name": "High Protein Meal Program",
    "description": "A meal program focused on high protein intake",
    "client_id": "client-uuid",
    "nutritionist_id": "nutritionist-uuid",
    "is_active": true,
    "created_at": "2025-01-20T10:00:00Z",
    "updated_at": "2025-01-20T10:00:00Z",
    "meals": [...]
  },
  "message": "Meal program created successfully"
}
```

### Create/Update Client Goals Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "clientId": "client-uuid",
    "nutritionistId": "nutritionist-uuid",
    "eerGoalCalories": 2200,
    "bmrGoalCalories": 1800,
    "proteinGoalMin": 140,
    "proteinGoalMax": 180,
    "carbsGoalMin": 200,
    "carbsGoalMax": 250,
    "fatGoalMin": 60,
    "fatGoalMax": 80,
    "fiberGoalGrams": 25,
    "waterGoalLiters": 2.5,
    "isActive": true,
    "goalStartDate": "2025-01-20",
    "goalEndDate": "2025-12-31",
    "notes": "High protein diet with flexible macro ranges",
    "createdAt": "2025-01-20T10:00:00Z",
    "updatedAt": "2025-01-20T10:00:00Z"
  },
  "message": "Client goal created successfully"
}
```

### Delete Response:
```json
{
  "success": true,
  "message": "Meal program deleted successfully"
}
```

### Activate Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "is_active": true
  },
  "message": "Meal program activated successfully"
}
```
