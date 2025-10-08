# CalorieScience API Documentation

This document outlines all available API endpoints for the CalorieScience backend system.

## Base URL
- Development: `http://localhost:3000`
- Production: `https://your-vercel-app.vercel.app`

## Authentication

All endpoints (except auth endpoints) require a valid JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### 1. Nutritionist Authentication

#### Register Nutritionist
- **URL:** `POST /api/auth/register`
- **Description:** Register a new nutritionist account
- **Body:**
```json
{
  "email": "nutritionist@example.com",
  "password": "securepassword123",
  "full_name": "Dr. John Smith",
  "phone": "+1234567890",
  "qualification": "MSc Clinical Nutrition",
  "experience_years": 5,
  "specialization": ["weight_loss", "diabetes", "sports_nutrition"]
}
```
- **Response:**
```json
{
  "message": "Registration successful",
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "nutritionist@example.com",
    "full_name": "Dr. John Smith",
    "role": "nutritionist",
    "is_email_verified": false
  },
  "next_step": "Please check your email to verify your account"
}
```

#### Login Nutritionist
- **URL:** `POST /api/auth/login`
- **Description:** Login with nutritionist credentials
- **Body:**
```json
{
  "email": "nutritionist@example.com",
  "password": "securepassword123"
}
```
- **Response:**
```json
{
  "message": "Login successful",
  "token": "jwt-token-here",
  "user": {
    "id": "uuid",
    "email": "nutritionist@example.com",
    "full_name": "Dr. John Smith",
    "role": "nutritionist",
    "is_email_verified": true,
    "qualification": "MSc Clinical Nutrition",
    "experience_years": 5,
    "specialization": ["weight_loss", "diabetes", "sports_nutrition"]
  }
}
```

### 2. Client Management

#### Create Client (Onboard)
- **URL:** `POST /api/clients`
- **Description:** Onboard a new client
- **Auth:** Required
- **Body:**
```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+1234567890",
  "date_of_birth": "1990-05-15",
  "gender": "female",
  "height_cm": 165.5,
  "weight_kg": 70.2,
  "activity_level": "moderately_active",
  "medical_conditions": ["hypertension"],
  "allergies": ["nuts", "shellfish"],
  "medications": ["lisinopril"],
  "dietary_preferences": ["vegetarian"],
  "health_goals": ["weight_loss", "better_energy"],
  "target_weight_kg": 65.0,
  "source": "website",
  "notes": "Wants to lose weight for wedding"
}
```
- **Response:**
```json
{
  "message": "Client created successfully",
  "client": {
    "id": "client-uuid",
    "nutritionist_id": "nutritionist-uuid",
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "status": "prospective",
    "created_at": "2024-01-15T10:00:00Z",
    // ... other client fields
  }
}
```

#### Get All Clients
- **URL:** `GET /api/clients`
- **Description:** Get all clients for the authenticated nutritionist
- **Auth:** Required
- **Query Parameters:**
  - `status` (optional): Filter by status (prospective, active, inactive, archived, all)
  - `page` (optional): Page number (default: 1)
  - `limit` (optional): Results per page (default: 20)
  - `search` (optional): Search by name or email
- **Example:** `GET /api/clients?status=active&page=1&limit=10&search=jane`
- **Response:**
```json
{
  "clients": [
    {
      "id": "client-uuid",
      "nutritionist_id": "nutritionist-uuid",
      "full_name": "Jane Doe",
      "email": "jane@example.com",
      "status": "active",
      "client_nutrition_requirements": [
        {
          "id": "requirement-uuid",
          "eer_calories": 2000,
          "created_at": "2024-01-15T10:00:00Z",
          "is_active": true
        }
      ],
      // ... other client fields
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 25,
    "pages": 3
  }
}
```

#### Get Individual Client
- **URL:** `GET /api/clients/[id]`
- **Description:** Get detailed information about a specific client
- **Auth:** Required
- **Response:**
```json
{
  "client": {
    "id": "client-uuid",
    "nutritionist_id": "nutritionist-uuid",
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "date_of_birth": "1990-05-15",
    "gender": "female",
    "height_cm": 165.5,
    "weight_kg": 70.2,
    "activity_level": "moderately_active",
    "medical_conditions": ["hypertension"],
    "allergies": ["nuts", "shellfish"],
    "medications": ["lisinopril"],
    "dietary_preferences": ["vegetarian"],
    "health_goals": ["weight_loss", "better_energy"],
    "target_weight_kg": 65.0,
    "status": "active",
    "source": "website",
    "notes": "Wants to lose weight for wedding",
    "preferred_contact_method": "email",
    "created_at": "2024-01-15T10:00:00Z",
    "updated_at": "2024-01-15T10:00:00Z",
    "client_nutrition_requirements": [
      {
        "id": "requirement-uuid",
        "eer_calories": 2000,
        "protein_grams": 150.0,
        "carbs_grams": 200.0,
        "fat_grams": 67.0,
        "created_at": "2024-01-15T10:00:00Z",
        "is_active": true
      }
    ]
  }
}
```

#### Update Client
- **URL:** `PUT /api/clients/[id]`
- **Description:** Update client information
- **Auth:** Required
- **Body:** Same as create client (all fields optional)
```json
{
  "weight_kg": 68.5,
  "health_goals": ["weight_loss", "muscle_gain"],
  "notes": "Updated goals after consultation"
}
```
- **Response:**
```json
{
  "message": "Client updated successfully",
  "client": {
    // Updated client object
  }
}
```

#### Delete Client
- **URL:** `DELETE /api/clients/[id]`
- **Description:** Delete a client and all associated data
- **Auth:** Required
- **Response:**
```json
{
  "message": "Client deleted successfully"
}
```

#### Convert Client to Active
- **URL:** `PATCH /api/clients/[id]/convert-to-active`
- **Description:** Convert a prospective client to active status
- **Auth:** Required
- **Response:**
```json
{
  "message": "Client successfully converted to active status",
  "client": {
    "id": "client-uuid",
    "status": "active",
    "converted_to_active_at": "2024-01-15T12:00:00Z",
    // ... other client fields
  }
}
```

### 3. Meal Plan Management (Drafts System)

The meal plan system uses a draft-based workflow where nutritionists can generate, customize, and finalize meal plans.

#### Generate Meal Plan Draft
- **URL:** `POST /api/meal-plans/generate`
- **Description:** Generate a new meal plan draft with recipe suggestions
- **Auth:** Required
- **Body:**
```json
{
  "clientId": "uuid-of-client",
  "days": 7,
  "startDate": "2025-01-29",
  "mealProgramId": "uuid-of-meal-program",
  "goalOverrides": {
    "calories": 2000,
    "protein": 150,
    "carbs": 250,
    "fat": 67
  },
  "dietaryOverrides": {
    "allergies": ["dairy-free"],
    "dietaryPreferences": ["vegetarian"],
    "cuisineTypes": ["indian"]
  }
}
```
- **Response:**
```json
{
  "success": true,
  "data": {
    "draftId": "draft-uuid",
    "clientId": "client-uuid",
    "days": 7,
    "startDate": "2025-01-29",
    "suggestions": [
      {
        "day": 1,
        "date": "2025-01-29",
        "meals": {
          "breakfast": {
            "recipes": [
              {
                "id": "recipe-123",
                "title": "Protein Smoothie Bowl",
                "calories": 350,
                "protein": 25,
                "carbs": 45,
                "fat": 12,
                "image": "https://...",
                "source": "edamam"
              }
            ],
            "selectedRecipeId": null
          }
        }
      }
    ]
  }
}
```

#### Get Meal Plan Drafts (Paginated)
- **URL:** `GET /api/meal-plans/drafts`
- **Description:** Get paginated list of meal plan drafts
- **Auth:** Required
- **Query Parameters:**
  - `clientId` (optional): Filter by client
  - `status` (optional): Filter by status (`draft`, `finalized`, `completed`)
  - `page` (optional): Page number (default: 1)
  - `pageSize` (optional): Results per page (default: 10, max: 100)
  - `includeNutrition` (optional): Include detailed nutrition (default: true)
- **Example:** `GET /api/meal-plans/drafts?status=finalized&page=1&pageSize=20`
- **Response:**
```json
{
  "success": true,
  "data": {
    "drafts": [
      {
        "id": "draft-uuid",
        "clientId": "client-uuid",
        "status": "finalized",
        "totalDays": 7,
        "totalMeals": 21,
        "selectedMeals": 21,
        "completionPercentage": 100,
        "nutrition": {
          "byDay": [...],
          "overall": {
            "calories": 14000,
            "protein": 1050,
            "carbs": 1750,
            "fat": 469
          },
          "dailyAverage": {
            "calories": 2000,
            "protein": 150,
            "carbs": 250,
            "fat": 67
          }
        }
      }
    ],
    "pagination": {
      "page": 1,
      "pageSize": 20,
      "totalCount": 45,
      "totalPages": 3,
      "hasNextPage": true,
      "hasPreviousPage": false
    }
  }
}
```

#### Get Specific Meal Plan Draft with Micronutrients
- **URL:** `GET /api/meal-plans/drafts/[id]`
- **Description:** Get detailed meal plan draft with complete micronutrient data
- **Auth:** Required
- **Response:**
```json
{
  "success": true,
  "data": {
    "id": "draft-uuid",
    "clientId": "client-uuid",
    "status": "finalized",
    "days": [
      {
        "day": 1,
        "date": "2025-01-29",
        "meals": {
          "breakfast": {
            "recipeName": "Protein Smoothie Bowl",
            "recipeId": "recipe-123",
            "isSelected": true,
            "hasCustomizations": false,
            "ingredients": [...],
            "nutrition": {
              "macros": {
                "calories": 350,
                "protein": 25,
                "carbs": 45,
                "fat": 12,
                "fiber": 8,
                "sugar": 15.2,
                "sodium": 120,
                "saturatedFat": 2.1,
                "cholesterol": 5
              },
              "micronutrients": {
                "vitamins": {
                  "vitaminA": { "quantity": 450, "unit": "mcg" },
                  "vitaminC": { "quantity": 12.5, "unit": "mg" },
                  "vitaminD": { "quantity": 2.1, "unit": "mcg" },
                  "vitaminE": { "quantity": 0.8, "unit": "mg" },
                  "vitaminK": { "quantity": 15.2, "unit": "mcg" },
                  "vitaminB6": { "quantity": 0.3, "unit": "mg" },
                  "vitaminB12": { "quantity": 1.2, "unit": "mcg" },
                  "folate": { "quantity": 45, "unit": "mcg" },
                  "thiamin": { "quantity": 0.1, "unit": "mg" },
                  "riboflavin": { "quantity": 0.2, "unit": "mg" },
                  "niacin": { "quantity": 1.8, "unit": "mg" }
                },
                "minerals": {
                  "calcium": { "quantity": 120, "unit": "mg" },
                  "iron": { "quantity": 1.2, "unit": "mg" },
                  "magnesium": { "quantity": 45, "unit": "mg" },
                  "phosphorus": { "quantity": 180, "unit": "mg" },
                  "potassium": { "quantity": 420, "unit": "mg" },
                  "zinc": { "quantity": 1.8, "unit": "mg" },
                  "copper": { "quantity": 0.1, "unit": "mg" },
                  "manganese": { "quantity": 0.3, "unit": "mg" },
                  "selenium": { "quantity": 8.5, "unit": "mcg" }
                }
              }
            }
          }
        },
        "dayTotals": {
          "macros": {...},
          "micronutrients": {...}
        }
      }
    ],
    "nutritionSummary": {
      "overall": {...},
      "dailyAverages": {...}
    }
  }
}
```

#### Manage Meal Plan Draft
- **URL:** `POST /api/meal-plans/draft`
- **Description:** Perform various actions on meal plan drafts
- **Auth:** Required
- **Body:** Varies by action

**Select Recipe:**
```json
{
  "action": "select-recipe",
  "draftId": "draft-uuid",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "recipe-123"
}
```

**Finalize Draft:**
```json
{
  "action": "finalize-draft",
  "draftId": "draft-uuid",
  "planName": "Week 1 Meal Plan"
}
```

**Replace Ingredient:**
```json
{
  "action": "replace-ingredient",
  "draftId": "draft-uuid",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "recipe-123",
  "originalIngredient": "100 gram milk",
  "newIngredient": "almond milk",
  "amount": 100,
  "unit": "gram",
  "source": "edamam"
}
```

#### Get Customized Recipe
- **URL:** `GET /api/recipes/customized`
- **Description:** Get recipe with all customizations applied
- **Auth:** Required
- **Query Parameters:**
  - `recipeId`: Recipe ID
  - `draftId`: Meal plan draft ID
  - `day`: Day number
  - `mealName`: Meal name (breakfast, lunch, dinner, snacks)
- **Example:** `GET /api/recipes/customized?recipeId=123&draftId=456&day=1&mealName=breakfast`
- **Response:**
```json
{
  "success": true,
  "data": {
    "recipe": {
      "id": "123",
      "title": "Protein Smoothie Bowl",
      "ingredients": [
        { "name": "banana", "amount": 1, "unit": "medium" },
        { "name": "protein powder", "amount": 1, "unit": "scoop" }
      ],
      "calories": 350,
      "protein": 25,
      "carbs": 45,
      "fat": 12
    },
    "hasCustomizations": true,
    "customizations": {
      "modifications": [
        {
          "type": "replace",
          "originalIngredient": "milk",
          "newIngredient": "almond milk",
          "notes": "Dairy-free substitution"
        }
      ]
    }
  }
}
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "error": "Error type",
  "message": "Human readable error message",
  "details": [] // Only for validation errors
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid/missing token)
- `404` - Not Found
- `405` - Method Not Allowed
- `409` - Conflict (e.g., email already exists)
- `500` - Internal Server Error

## Data Types

### Enums

#### Gender
- `male`
- `female`
- `other`

#### Activity Level
- `sedentary`
- `lightly_active`
- `moderately_active`
- `very_active`
- `extra_active`

#### Client Status
- `prospective` - New lead/prospect
- `active` - Paying/active client
- `inactive` - Temporarily inactive
- `archived` - Historical client

## Field Validation

### Required Fields
- **Nutritionist Registration:** email, password, full_name
- **Client Creation:** full_name

### Field Limits
- `email`: Valid email format
- `password`: Minimum 8 characters
- `full_name`: 2-255 characters
- `phone`: Optional string
- `weight_kg`: 20-500 kg
- `height_cm`: 50-300 cm
- `experience_years`: 0-50 years
- `notes`: Maximum 2000 characters

## Examples

### Complete Client Onboarding Flow

1. **Register Nutritionist:**
```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.smith@example.com",
    "password": "securepass123",
    "full_name": "Dr. Smith",
    "qualification": "MSc Nutrition"
  }'
```

2. **Login:**
```bash
curl -X POST https://your-app.vercel.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "dr.smith@example.com",
    "password": "securepass123"
  }'
```

3. **Create Client:**
```bash
curl -X POST https://your-app.vercel.app/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "full_name": "Jane Doe",
    "email": "jane@example.com",
    "date_of_birth": "1990-05-15",
    "gender": "female",
    "height_cm": 165,
    "weight_kg": 70,
    "activity_level": "moderately_active"
  }'
```

4. **Convert to Active:**
```bash
curl -X PATCH https://your-app.vercel.app/api/clients/CLIENT_ID/convert-to-active \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

5. **Update Client:**
```bash
curl -X PUT https://your-app.vercel.app/api/clients/CLIENT_ID \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "weight_kg": 68,
    "notes": "Lost 2kg this month!"
  }'
``` 