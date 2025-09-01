# Meal Programs System

## Overview

The Meal Programs system allows nutritionists to create customized meal structures for their clients. Each client can have multiple meal programs, but only one can be active at a time. This system provides flexibility in meal timing, naming, and calorie targets.

## Features

### ✅ **Custom Number of Meals**
- **Range**: 1-10 meals per program
- **Flexibility**: No fixed meal types required

### ✅ **Editable Meal Names**
- **Predefined Suggestions**: Common meal names like "Breakfast", "Lunch", "Dinner", "Snack"
- **Custom Names**: Users can create any meal name (e.g., "Pre-Workout", "Post-Workout", "Tea Time")
- **Examples**:
  - "Pre-Breakfast Snack"
  - "Morning Protein Boost"
  - "Afternoon Energy"
  - "Evening Recovery"

### ✅ **Meal Timing (24-Hour Format)**
- **Format**: HH:MM (e.g., "08:00", "13:30", "18:45")
- **Flexibility**: Any time between 00:00 and 23:59
- **Examples**:
  - "06:30" (6:30 AM)
  - "12:00" (12:00 PM)
  - "18:30" (6:30 PM)
  - "21:00" (9:00 PM)

### ✅ **Optional Target Calories**
- **Per Meal**: Each meal can have its own calorie target
- **Optional**: Not required for every meal
- **Validation**: Must be positive if specified

## Database Schema

### Tables

#### `meal_programs`
```sql
- id (UUID, Primary Key)
- client_id (UUID, Foreign Key to clients)
- nutritionist_id (UUID, Foreign Key to nutritionists)
- name (VARCHAR, Program name)
- description (TEXT, Optional description)
- is_active (BOOLEAN, Only one active per client)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

#### `meal_program_meals`
```sql
- id (UUID, Primary Key)
- meal_program_id (UUID, Foreign Key to meal_programs)
- meal_order (INTEGER, 1-10, unique within program)
- meal_name (VARCHAR, Custom meal name)
- meal_time (TIME, 24-hour format)
- target_calories (INTEGER, Optional)
- meal_type (VARCHAR, breakfast/lunch/dinner/snack for Edamam)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

## API Endpoints

**Note**: The meal programs functionality has been merged into the main `/api/meal-plans` endpoint to stay within Vercel's Hobby plan function limit. Use the `type` parameter for POST requests and `mode` parameter for GET requests to differentiate between meal planning and meal program management.

### 1. **Create Meal Program**
```http
POST /api/meal-plans
```

**Request Body:**
```json
{
  "type": "meal-program",
  "clientId": "uuid",
  "name": "High Protein 6-Meal Plan",
  "description": "A meal program designed for muscle building",
  "meals": [
    {
      "mealOrder": 1,
      "mealName": "Pre-Breakfast Protein",
      "mealTime": "06:30",
      "targetCalories": 200,
      "mealType": "snack"
    },
    {
      "mealOrder": 2,
      "mealName": "Breakfast",
      "mealTime": "08:00",
      "targetCalories": 500,
      "mealType": "breakfast"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "clientId": "uuid",
    "nutritionistId": "uuid",
    "name": "High Protein 6-Meal Plan",
    "description": "A meal program designed for muscle building",
    "isActive": true,
    "meals": [...]
  },
  "message": "Meal program created successfully"
}
```

### 2. **Get Meal Programs for Client**
```http
GET /api/meal-plans?clientId=uuid&mode=meal-programs
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "High Protein 6-Meal Plan",
      "isActive": true,
      "meals": [...]
    },
    {
      "id": "uuid",
      "name": "Weight Loss 4-Meal Plan",
      "isActive": false,
      "meals": [...]
    }
  ]
}
```

### 3. **Get Specific Meal Program**
```http
GET /api/meal-programs/{id}
```

### 4. **Update Meal Program**
```http
PUT /api/meal-programs/{id}
```

**Request Body:**
```json
{
  "name": "Updated Program Name",
  "description": "Updated description",
  "meals": [
    // Complete meals array (replaces existing)
  ]
}
```

### 5. **Delete Meal Program**
```http
DELETE /api/meal-programs/{id}
```

### 6. **Activate Meal Program**
```http
POST /api/meal-programs/{id}/activate
```

**Note**: This automatically deactivates other programs for the same client.

## Validation Rules

### ✅ **Meal Program**
- **Name**: Required, non-empty string
- **Description**: Optional
- **Client ID**: Must exist and belong to authenticated nutritionist
- **Meals**: Required, non-empty array, max 10 meals

### ✅ **Meal Validation**
- **Meal Order**: Required, 1-10, unique within program
- **Meal Name**: Required, non-empty string
- **Meal Time**: Required, valid 24-hour format (HH:MM)
- **Target Calories**: Optional, must be positive if specified
- **Meal Type**: Optional, one of: breakfast, lunch, dinner, snack

### ✅ **Time Format Validation**
- **Regex**: `/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/`
- **Valid Examples**: "00:00", "08:30", "12:00", "23:59"
- **Invalid Examples**: "25:00", "12:60", "8:5", "12:00 PM"

## Usage Examples

### Example 1: Basic 3-Meal Plan
```json
{
  "clientId": "uuid",
  "name": "Standard 3-Meal Plan",
  "meals": [
    {
      "mealOrder": 1,
      "mealName": "Breakfast",
      "mealTime": "08:00",
      "targetCalories": 600,
      "mealType": "breakfast"
    },
    {
      "mealOrder": 2,
      "mealName": "Lunch",
      "mealTime": "13:00",
      "targetCalories": 800,
      "mealType": "lunch"
    },
    {
      "mealOrder": 3,
      "mealName": "Dinner",
      "mealTime": "19:00",
      "targetCalories": 700,
      "mealType": "dinner"
    }
  ]
}
```

### Example 2: Advanced 6-Meal Plan
```json
{
  "clientId": "uuid",
  "name": "Athlete 6-Meal Plan",
  "description": "High-frequency eating for muscle growth",
  "meals": [
    {
      "mealOrder": 1,
      "mealName": "Pre-Workout",
      "mealTime": "06:00",
      "targetCalories": 200,
      "mealType": "snack"
    },
    {
      "mealOrder": 2,
      "mealName": "Post-Workout",
      "mealTime": "08:00",
      "targetCalories": 400,
      "mealType": "breakfast"
    },
    {
      "mealOrder": 3,
      "mealName": "Mid-Morning",
      "mealTime": "10:30",
      "targetCalories": 250,
      "mealType": "snack"
    },
    {
      "mealOrder": 4,
      "mealName": "Lunch",
      "mealTime": "13:00",
      "targetCalories": 600,
      "mealType": "lunch"
    },
    {
      "mealOrder": 5,
      "mealName": "Afternoon Fuel",
      "mealTime": "15:30",
      "targetCalories": 300,
      "mealType": "snack"
    },
    {
      "mealOrder": 6,
      "mealName": "Dinner",
      "mealTime": "18:30",
      "targetCalories": 500,
      "mealType": "dinner"
    }
  ]
}
```

## Integration with Meal Planning

The meal programs integrate with the existing meal planning system:

1. **Meal Distribution**: Uses the meal program structure instead of fixed meal types
2. **Calorie Targets**: Respects individual meal calorie targets if specified
3. **Meal Types**: Maps custom meal names to Edamam-compatible meal types
4. **Timing**: Provides context for meal planning (e.g., breakfast vs. dinner preferences)

## Error Handling

### Common Error Responses

#### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Specific validation message"
}
```

**Common Validation Errors:**
- Missing required fields
- Invalid time format
- Duplicate meal orders
- Too many meals (>10)
- Invalid meal order (not 1-10)

#### 403 Forbidden
```json
{
  "error": "Access denied. Only nutritionists can manage meal programs."
}
```

#### 404 Not Found
```json
{
  "error": "Meal program not found",
  "message": "The specified meal program does not exist"
}
```

## Testing

Run the test script to verify all functionality:

```bash
node test-meal-programs.js
```

This will test:
1. ✅ Creating meal programs
2. ✅ Fetching meal programs
3. ✅ Updating meal programs
4. ✅ Time validation
5. ✅ Meal order validation
6. ✅ Deleting meal programs

## Security Features

- **Authentication Required**: All endpoints require valid JWT token
- **Role-Based Access**: Only nutritionists can access meal programs
- **Client Ownership**: Nutritionists can only access their own clients' programs
- **Input Validation**: Comprehensive validation of all inputs
- **SQL Injection Protection**: Uses Supabase with parameterized queries

## Future Enhancements

- **Meal Templates**: Pre-built meal program templates
- **Copy Programs**: Duplicate existing programs for other clients
- **Meal History**: Track changes to meal programs over time
- **Client Preferences**: Store client-specific meal preferences
- **Integration**: Connect with meal planning and nutrition tracking
