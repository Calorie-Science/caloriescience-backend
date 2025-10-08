# Meal Plan Drafts API Documentation

## Overview

The Meal Plan Drafts system provides a comprehensive workflow for nutritionists to generate, customize, and finalize personalized meal plans for their clients. This system replaces the old meal plan generation with a more flexible draft-based approach.

## Key Features

- **Draft-based workflow**: Generate drafts, customize, then finalize
- **Recipe customization**: Replace, omit, or add ingredients
- **Complete micronutrient data**: Detailed vitamin and mineral breakdowns
- **Pagination support**: Efficient handling of large datasets
- **Status tracking**: Track progress from draft to finalized
- **Customization history**: Track all modifications made

## Database Schema

All meal plans are stored in the `meal_plan_drafts` table with the following key fields:

- `id`: Unique draft identifier
- `client_id`: Associated client
- `nutritionist_id`: Creating nutritionist
- `status`: Current status (`draft`, `finalized`, `completed`, `archived`)
- `suggestions`: JSONB field containing all meal suggestions
- `search_params`: Original generation parameters
- `created_at`, `updated_at`, `finalized_at`: Timestamps
- `expires_at`: Expiration for drafts (NULL for finalized plans)

## API Endpoints

### 1. Generate Meal Plan Draft

**Endpoint:** `POST /api/meal-plans/generate`

**Description:** Generate a new meal plan draft with recipe suggestions

**Authentication:** Required (Nutritionist only)

**Request Body:**
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
    "fat": 67,
    "fiber": 25
  },
  "dietaryOverrides": {
    "allergies": ["dairy-free"],
    "dietaryPreferences": ["vegetarian"],
    "cuisineTypes": ["indian"]
  }
}
```

**Response:**
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
                "fiber": 8,
                "image": "https://...",
                "source": "edamam",
                "ingredients": [
                  {
                    "name": "banana",
                    "amount": 1,
                    "unit": "medium"
                  },
                  {
                    "name": "protein powder",
                    "amount": 1,
                    "unit": "scoop"
                  }
                ]
              }
            ],
            "selectedRecipeId": null,
            "customizations": {}
          }
        }
      }
    ]
  }
}
```

### 2. Get Meal Plan Drafts (Paginated)

**Endpoint:** `GET /api/meal-plans/drafts`

**Description:** Retrieve paginated list of meal plan drafts with optional filtering

**Authentication:** Required (Nutritionist only)

**Query Parameters:**
- `clientId` (optional): Filter by specific client
- `status` (optional): Filter by status (`draft`, `finalized`, `completed`)
- `page` (optional): Page number (default: 1)
- `pageSize` (optional): Results per page (default: 10, max: 100)
- `includeNutrition` (optional): Include detailed nutrition calculations (default: true)
- `sortBy` (optional): Sort by field (`created_at`, `updated_at`)
- `sortOrder` (optional): Sort order (`asc`, `desc`)

**Example Request:**
```bash
GET /api/meal-plans/drafts?status=finalized&page=1&pageSize=20&includeNutrition=true
```

**Response:**
```json
{
  "success": true,
  "data": {
    "drafts": [
      {
        "id": "draft-uuid",
        "clientId": "client-uuid",
        "nutritionistId": "nutritionist-uuid",
        "status": "finalized",
        "searchParams": {
          "calories": 2000,
          "protein": 150,
          "carbs": 250,
          "fat": 67,
          "dietaryPreferences": {
            "allergies": ["dairy-free"],
            "cuisineTypes": ["indian"]
          }
        },
        "createdAt": "2025-01-29T10:00:00.000Z",
        "updatedAt": "2025-01-29T12:00:00.000Z",
        "expiresAt": null,
        "totalDays": 7,
        "totalMeals": 21,
        "selectedMeals": 21,
        "completionPercentage": 100,
        "isComplete": true,
        "nutrition": {
          "byDay": [
            {
              "day": 1,
              "date": "2025-01-29",
              "meals": {
                "breakfast": {
                  "recipeName": "Protein Smoothie Bowl",
                  "recipeId": "recipe-123",
                  "isSelected": true,
                  "hasCustomizations": false,
                  "customNotes": null,
                  "nutrition": {
                    "calories": 350,
                    "protein": 25,
                    "carbs": 45,
                    "fat": 12,
                    "fiber": 8
                  }
                }
              },
              "dayTotal": {
                "calories": 2000,
                "protein": 150,
                "carbs": 250,
                "fat": 67,
                "fiber": 25
              }
            }
          ],
          "overall": {
            "calories": 14000,
            "protein": 1050,
            "carbs": 1750,
            "fat": 469,
            "fiber": 175
          },
          "dailyAverage": {
            "calories": 2000,
            "protein": 150,
            "carbs": 250,
            "fat": 67,
            "fiber": 25
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
    },
    "filters": {
      "clientId": null,
      "status": "finalized"
    }
  },
  "message": "Retrieved 20 meal plan draft(s)"
}
```

### 3. Get Specific Meal Plan Draft with Micronutrients

**Endpoint:** `GET /api/meal-plans/drafts/[id]`

**Description:** Retrieve detailed meal plan draft with complete micronutrient data

**Authentication:** Required (Nutritionist only)

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "draft-uuid",
    "clientId": "client-uuid",
    "nutritionistId": "nutritionist-uuid",
    "status": "finalized",
    "searchParams": {
      "calories": 2000,
      "protein": 150,
      "carbs": 250,
      "fat": 67,
      "dietaryPreferences": {
        "allergies": ["dairy-free"],
        "cuisineTypes": ["indian"]
      }
    },
    "createdAt": "2025-01-29T10:00:00.000Z",
    "updatedAt": "2025-01-29T12:00:00.000Z",
    "expiresAt": null,
    "days": [
      {
        "day": 1,
        "date": "2025-01-29",
        "meals": {
          "breakfast": {
            "recipeName": "Protein Smoothie Bowl",
            "recipeId": "recipe-123",
            "recipeImage": "https://...",
            "recipeSource": "edamam",
            "servings": 1,
            "isSelected": true,
            "hasCustomizations": false,
            "customNotes": null,
            "modifications": [],
            "ingredients": [
              {
                "name": "banana",
                "amount": 1,
                "unit": "medium"
              },
              {
                "name": "protein powder",
                "amount": 1,
                "unit": "scoop"
              }
            ],
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
          "macros": {
            "calories": 2000,
            "protein": 150,
            "carbs": 250,
            "fat": 67,
            "fiber": 25,
            "sugar": 45.2,
            "sodium": 1200,
            "saturatedFat": 12.5,
            "cholesterol": 25
          },
          "micronutrients": {
            "vitamins": {
              "vitaminA": { "quantity": 1250, "unit": "mcg" },
              "vitaminC": { "quantity": 180.5, "unit": "mg" },
              "vitaminD": { "quantity": 8.5, "unit": "mcg" },
              "vitaminE": { "quantity": 12.8, "unit": "mg" },
              "vitaminK": { "quantity": 85.2, "unit": "mcg" },
              "vitaminB6": { "quantity": 2.1, "unit": "mg" },
              "vitaminB12": { "quantity": 4.5, "unit": "mcg" },
              "folate": { "quantity": 320, "unit": "mcg" },
              "thiamin": { "quantity": 1.2, "unit": "mg" },
              "riboflavin": { "quantity": 1.8, "unit": "mg" },
              "niacin": { "quantity": 18.5, "unit": "mg" }
            },
            "minerals": {
              "calcium": { "quantity": 850, "unit": "mg" },
              "iron": { "quantity": 12.5, "unit": "mg" },
              "magnesium": { "quantity": 420, "unit": "mg" },
              "phosphorus": { "quantity": 1200, "unit": "mg" },
              "potassium": { "quantity": 3200, "unit": "mg" },
              "zinc": { "quantity": 8.5, "unit": "mg" },
              "copper": { "quantity": 1.2, "unit": "mg" },
              "manganese": { "quantity": 3.5, "unit": "mg" },
              "selenium": { "quantity": 45.2, "unit": "mcg" }
            }
          }
        }
      }
    ],
    "nutritionSummary": {
      "overall": {
        "macros": {
          "calories": 14000,
          "protein": 1050,
          "carbs": 1750,
          "fat": 469,
          "fiber": 175,
          "sugar": 316.4,
          "sodium": 8400,
          "saturatedFat": 87.5,
          "cholesterol": 175
        },
        "micronutrients": {
          "vitamins": {
            "vitaminA": { "quantity": 8750, "unit": "mcg" },
            "vitaminC": { "quantity": 1263.5, "unit": "mg" },
            "vitaminD": { "quantity": 59.5, "unit": "mcg" },
            "vitaminE": { "quantity": 89.6, "unit": "mg" },
            "vitaminK": { "quantity": 596.4, "unit": "mcg" },
            "vitaminB6": { "quantity": 14.7, "unit": "mg" },
            "vitaminB12": { "quantity": 31.5, "unit": "mcg" },
            "folate": { "quantity": 2240, "unit": "mcg" },
            "thiamin": { "quantity": 8.4, "unit": "mg" },
            "riboflavin": { "quantity": 12.6, "unit": "mg" },
            "niacin": { "quantity": 129.5, "unit": "mg" }
          },
          "minerals": {
            "calcium": { "quantity": 5950, "unit": "mg" },
            "iron": { "quantity": 87.5, "unit": "mg" },
            "magnesium": { "quantity": 2940, "unit": "mg" },
            "phosphorus": { "quantity": 8400, "unit": "mg" },
            "potassium": { "quantity": 22400, "unit": "mg" },
            "zinc": { "quantity": 59.5, "unit": "mg" },
            "copper": { "quantity": 8.4, "unit": "mg" },
            "manganese": { "quantity": 24.5, "unit": "mg" },
            "selenium": { "quantity": 316.4, "unit": "mcg" }
          }
        }
      },
      "dailyAverages": {
        "macros": {
          "calories": 2000,
          "protein": 150,
          "carbs": 250,
          "fat": 67,
          "fiber": 25,
          "sugar": 45.2,
          "sodium": 1200,
          "saturatedFat": 12.5,
          "cholesterol": 25
        },
        "micronutrients": {
          "vitamins": {
            "vitaminA": { "quantity": 1250, "unit": "mcg" },
            "vitaminC": { "quantity": 180.5, "unit": "mg" },
            "vitaminD": { "quantity": 8.5, "unit": "mcg" },
            "vitaminE": { "quantity": 12.8, "unit": "mg" },
            "vitaminK": { "quantity": 85.2, "unit": "mcg" },
            "vitaminB6": { "quantity": 2.1, "unit": "mg" },
            "vitaminB12": { "quantity": 4.5, "unit": "mcg" },
            "folate": { "quantity": 320, "unit": "mcg" },
            "thiamin": { "quantity": 1.2, "unit": "mg" },
            "riboflavin": { "quantity": 1.8, "unit": "mg" },
            "niacin": { "quantity": 18.5, "unit": "mg" }
          },
          "minerals": {
            "calcium": { "quantity": 850, "unit": "mg" },
            "iron": { "quantity": 12.5, "unit": "mg" },
            "magnesium": { "quantity": 420, "unit": "mg" },
            "phosphorus": { "quantity": 1200, "unit": "mg" },
            "potassium": { "quantity": 3200, "unit": "mg" },
            "zinc": { "quantity": 8.5, "unit": "mg" },
            "copper": { "quantity": 1.2, "unit": "mg" },
            "manganese": { "quantity": 3.5, "unit": "mg" },
            "selenium": { "quantity": 45.2, "unit": "mcg" }
          }
        }
      }
    }
  },
  "message": "Meal plan draft retrieved with detailed nutrition"
}
```

### 4. Manage Meal Plan Draft

**Endpoint:** `POST /api/meal-plans/draft`

**Description:** Perform various actions on meal plan drafts

**Authentication:** Required (Nutritionist only)

#### Select Recipe
```json
{
  "action": "select-recipe",
  "draftId": "draft-uuid",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "recipe-123"
}
```

#### Finalize Draft
```json
{
  "action": "finalize-draft",
  "draftId": "draft-uuid",
  "planName": "Week 1 Meal Plan"
}
```

#### Replace Ingredient
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

#### Update Customizations
```json
{
  "action": "update-customizations",
  "draftId": "draft-uuid",
  "day": 1,
  "mealName": "breakfast",
  "recipeId": "recipe-123",
  "customizations": {
    "modifications": [
      {
        "type": "replace",
        "originalIngredient": "milk",
        "newIngredient": "almond milk",
        "amount": 100,
        "unit": "gram"
      }
    ],
    "customNutrition": {
      "calories": 350,
      "protein": 25,
      "carbs": 45,
      "fat": 12,
      "fiber": 8
    }
  }
}
```

### 5. Get Customized Recipe

**Endpoint:** `GET /api/recipes/customized`

**Description:** Get recipe with all customizations applied

**Authentication:** Required (Nutritionist only)

**Query Parameters:**
- `recipeId`: Recipe ID
- `draftId`: Meal plan draft ID
- `day`: Day number
- `mealName`: Meal name (breakfast, lunch, dinner, snacks)

**Example Request:**
```bash
GET /api/recipes/customized?recipeId=123&draftId=456&day=1&mealName=breakfast
```

**Response:**
```json
{
  "success": true,
  "data": {
    "recipe": {
      "id": "123",
      "title": "Protein Smoothie Bowl",
      "ingredients": [
        { "name": "banana", "amount": 1, "unit": "medium" },
        { "name": "protein powder", "amount": 1, "unit": "scoop" },
        { "name": "almond milk", "amount": 100, "unit": "gram" }
      ],
      "calories": 350,
      "protein": 25,
      "carbs": 45,
      "fat": 12,
      "fiber": 8
    },
    "hasCustomizations": true,
    "customizations": {
      "modifications": [
        {
          "type": "replace",
          "originalIngredient": "milk",
          "newIngredient": "almond milk",
          "amount": 100,
          "unit": "gram",
          "notes": "Dairy-free substitution"
        }
      ],
      "customizedNutrition": {
        "calories": 350,
        "protein": 25,
        "carbs": 45,
        "fat": 12,
        "fiber": 8
      }
    }
  }
}
```

## Meal Plan Statuses

- **`draft`**: Initial state with recipe suggestions, can be customized
- **`finalized`**: Customized and finalized, ready for client use
- **`completed`**: Client has completed the meal plan
- **`archived`**: Historical meal plan for reference

## Error Responses

### Common Error Codes

**400 Bad Request:**
```json
{
  "error": "Validation error",
  "details": [
    {
      "field": "clientId",
      "message": "Client ID is required"
    }
  ]
}
```

**401 Unauthorized:**
```json
{
  "error": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "error": "Access denied",
  "message": "You do not have access to this meal plan draft"
}
```

**404 Not Found:**
```json
{
  "error": "Draft not found",
  "message": "The specified meal plan draft does not exist"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "Failed to process request"
}
```

## Workflow Example

1. **Generate Draft**: `POST /api/meal-plans/generate`
2. **Select Recipes**: `POST /api/meal-plans/draft` (action: select-recipe)
3. **Customize Ingredients**: `POST /api/meal-plans/draft` (action: replace-ingredient)
4. **Finalize**: `POST /api/meal-plans/draft` (action: finalize-draft)
5. **Retrieve Finalized Plan**: `GET /api/meal-plans/drafts/[id]`

## Performance Considerations

- **Pagination**: Use pagination for large datasets (max 100 items per page)
- **Nutrition Calculation**: Can be disabled with `includeNutrition=false` for faster responses
- **Caching**: Recipe data is cached for improved performance
- **Concurrent Requests**: All endpoints support concurrent requests

## Security

- **Authentication**: All endpoints require valid JWT token
- **Authorization**: Only nutritionists can access meal plan drafts
- **Data Isolation**: Users can only access their own drafts
- **Input Validation**: All inputs are validated using Joi schemas
