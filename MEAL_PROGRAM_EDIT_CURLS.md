# Meal Program and Meal Plan CRUD API Commands (Consolidated)

This document provides comprehensive curl commands for all CRUD operations on meal programs and meal plans using the consolidated POST API.

## Authentication

All requests require a valid JWT token in the Authorization header:
```bash
Authorization: Bearer YOUR_JWT_TOKEN
```

## 1. Meal Program CRUD Operations

### 1.1 Create New Meal Program
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "type": "meal-program",
    "clientId": "CLIENT_ID",
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

### 1.2 Get All Meal Programs for a Client
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans?clientId=CLIENT_ID&mode=meal-programs' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

### 1.3 Get Specific Meal Program Details
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans?clientId=CLIENT_ID&mode=meal-programs' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

### 1.4 Create New Meal Program
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "type": "meal-program",
    "clientId": "CLIENT_ID",
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

### 1.5 Update Meal Program
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "type": "meal-program",
    "action": "update",
    "clientId": "CLIENT_ID",
    "mealProgramId": "MEAL_PROGRAM_ID",
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
        }
    ]
}'
```

### 1.6 Delete Meal Program
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "type": "meal-program",
    "action": "delete",
    "clientId": "CLIENT_ID",
    "mealProgramId": "MEAL_PROGRAM_ID"
}'
```

### 1.7 Activate Meal Program
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "type": "meal-program",
    "action": "activate",
    "clientId": "CLIENT_ID",
    "mealProgramId": "MEAL_PROGRAM_ID"
}'
```

## 2. Meal Plan Management

### 2.1 Get All Meal Plans for a Client
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans?clientId=CLIENT_ID' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

### 2.2 Update Meal Plan
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "type": "meal-plan",
    "action": "update",
    "clientId": "CLIENT_ID",
    "mealPlanId": "MEAL_PLAN_ID",
    "planName": "Updated Meal Plan",
    "planDate": "2025-09-20",
    "dietaryRestrictions": ["vegetarian", "gluten-free"],
    "cuisinePreferences": ["Mediterranean", "Italian"]
}'
```

### 2.3 Preview Meal Plan (Generate from Program)
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "action": "preview",
    "clientId": "CLIENT_ID",
    "planDate": "2025-09-15",
    "dietaryRestrictions": ["vegetarian", "gluten-free"],
    "cuisinePreferences": []
}'
```

## 3. Client Goals Management

### 3.1 Get Client Goals
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans?clientId=CLIENT_ID&mode=client-goals' \
--header 'Authorization: Bearer YOUR_TOKEN'
```

### 3.2 Create/Update Client Goals
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer YOUR_TOKEN' \
--data '{
    "type": "client-goal",
    "clientId": "CLIENT_ID",
    "eerGoalCalories": 2200,
    "bmrGoalCalories": 1800,
    "proteinGoalGrams": 165,
    "carbsGoalGrams": 220,
    "fatGoalGrams": 73,
    "proteinGoalPercentage": 30,
    "carbsGoalPercentage": 40,
    "fatGoalPercentage": 30,
    "fiberGoalGrams": 25,
    "waterGoalLiters": 2.5,
    "notes": "High protein diet for muscle building"
}'
```

## 4. Example with Real Data

### 4.1 Get Meal Programs for Specific Client
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans?clientId=b543f1f8-87f9-4d84-835e-78385546321a&mode=meal-programs' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE'
```

### 4.2 Update Meal Program (Replace MEAL_PROGRAM_ID with actual ID)
```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NjQ1NDQ0NSwiZXhwIjoxNzU3MDU5MjQ1fQ.HRq66KWqeuXizzupfUjr0QQhZj4Eyjlhi045t9r80tE' \
--data '{
    "type": "meal-program",
    "action": "update",
    "clientId": "b543f1f8-87f9-4d84-835e-78385546321a",
    "mealProgramId": "MEAL_PROGRAM_ID",
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
        }
    ]
}'
```

## 5. Validation Rules

### 5.1 Meal Program Validation
- **Name**: Required, string
- **Meals**: Required, array with 1-10 meals
- **Meal Order**: Unique numbers 1-10
- **Meal Time**: HH:MM:SS format (24-hour)
- **Meal Type**: breakfast, lunch, dinner, or snack
- **Target Calories**: Optional, positive number

### 5.2 Meal Plan Validation
- **Plan Date**: YYYY-MM-DD format, not in the past
- **Dietary Restrictions**: Array of valid health labels
- **Cuisine Preferences**: Array of valid cuisine types

### 5.3 Client Goals Validation
- **EER Goal Calories**: Positive number
- **Macro Goals**: Positive numbers for protein, carbs, fat
- **Percentages**: Must sum to 100% (protein + carbs + fat)

## 6. Error Handling

All endpoints return consistent error responses:
```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

Common error types:
- `Unauthorized`: Invalid or missing token
- `Access denied`: User doesn't have permission
- `Missing required fields`: Required data not provided
- `Invalid format`: Data format validation failed
- `Not found`: Resource doesn't exist
- `Internal server error`: Server-side error
