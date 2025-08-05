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