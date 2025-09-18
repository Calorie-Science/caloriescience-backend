# Async Meal Plan Generation with AI Models

This implementation provides a simple async meal plan generation system using OpenAI Assistant or Claude that avoids Vercel timeout issues by using a preview ID approach.

## Architecture

1. **OpenAI Assistant Service** (`lib/openaiAssistantService.ts`) - Handles communication with OpenAI Assistant
2. **Claude Service** (`lib/claudeService.ts`) - Handles communication with Claude API
3. **Async Meal Plan Service** (`lib/asyncMealPlanService.ts`) - Manages async generation lifecycle for both AI models
4. **Database Table** (`async_meal_plans`) - Tracks generation status and results
5. **Integrated API** - Uses existing meal plan endpoints with preview ID support

## Usage

### 1. Start Async Generation

**Endpoint:** `POST /api/meal-plans`

```json
{
  "type": "meal-plan",
  "action": "async-generate",
  "clientId": "client-uuid",
  "additionalText": "please try to give local dishes and keep in mind health conidtions of user",
  "aiModel": "openai"
}
```

**For Claude (immediate response):**
```json
{
  "type": "meal-plan",
  "action": "async-generate",
  "clientId": "client-uuid",
  "additionalText": "please try to give local dishes and keep in mind health conidtions of user",
  "aiModel": "claude"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Async meal plan generation started",
  "data": {
    "mealPlan": {
      "id": "async-preview-1705489200000-abc123def",
      "status": "preview",
      "clientId": "client-uuid",
      "nutritionistId": "nutritionist-uuid",
      "estimatedCompletionTime": "2-3 minutes"
    }
  }
}
```

### 2. Check Generation Status (via Consolidated View)

**Endpoint:** `GET /api/meal-plans?id={previewId}&view=consolidated`

**Response (Pending):**
```json
{
  "success": true,
  "data": {
    "mealPlan": {
      "id": "async-preview-1705489200000-abc123def",
      "status": "preview",
      "clientId": "client-uuid",
      "nutritionistId": "nutritionist-uuid",
      "estimatedCompletionTime": "2-3 minutes"
    },
    "days": [],
    "overallStats": null
  }
}
```

**Response (Completed):**
```json
{
  "success": true,
  "data": {
    "mealPlan": {
      "id": "async-preview-1705489200000-abc123def",
      "status": "preview",
      "clientId": "client-uuid",
      "nutritionistId": "nutritionist-uuid",
      "completedAt": "2025-01-17T10:02:30Z"
    },
    "days": [
      {
        "dayNumber": 1,
        "date": "2025-01-17",
        "meals": [...],
        "dailyNutrition": {...}
      }
    ],
    "overallStats": {...},
    "generatedMealPlan": {
      "dailyMeals": [...],
      "recipes": [...],
      "nutritionalInfo": {...},
      "shoppingList": [...],
      "preparationInstructions": [...]
    }
  }
}
```

**Response (Failed):**
```json
{
  "success": false,
  "error": "Async meal plan generation failed: timeout"
}
```

## Frontend Implementation

```javascript
// Start async generation
const startAsyncGeneration = async (clientId, additionalText) => {
  const response = await fetch('/api/meal-plans', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'meal-plan',
      action: 'async-generate',
      clientId,
      additionalText
    })
  });
  
  const result = await response.json();
  if (result.success) {
    return result.data.mealPlan.id; // This is the preview ID
  }
  throw new Error(result.error);
};

// Poll for completion using consolidated view
const pollForCompletion = async (previewId) => {
  const pollInterval = 5000; // 5 seconds
  const maxAttempts = 36; // 3 minutes max
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(`/api/meal-plans?id=${previewId}&view=consolidated`);
    const result = await response.json();
    
    if (result.success && result.data.generatedMealPlan) {
      // Generation completed
      return result.data;
    } else if (!result.success && result.error.includes('failed')) {
      throw new Error(result.error);
    }
    
    // Still pending, wait before next poll
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  throw new Error('Generation timeout');
};

// Usage
const generateMealPlan = async () => {
  try {
    const previewId = await startAsyncGeneration(clientId, additionalText);
    console.log('Generation started with preview ID:', previewId);
    
    const mealPlanData = await pollForCompletion(previewId);
    console.log('Generated meal plan:', mealPlanData);
    
    // Use the meal plan data
    displayMealPlan(mealPlanData);
  } catch (error) {
    console.error('Generation failed:', error);
  }
};
```

## Environment Variables Required

```env
# Required for OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional (defaults to asst_WgJCEyh92kZqUBcwcYspU3oC)
OPENAI_ASSISTANT_ID=asst_your-custom-assistant-id

# Required for Claude
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
```

## AI Model Differences

### OpenAI Assistant (`aiModel: "openai"`)
- **Response Time**: 2-3 minutes (async)
- **Status**: Returns `pending` initially, requires polling
- **Use Case**: Complex meal plans with detailed instructions
- **Cost**: Lower cost per request

### Claude (`aiModel: "claude"`)
- **Response Time**: Immediate (synchronous)
- **Status**: Returns `completed` immediately
- **Use Case**: Quick meal plan generation
- **Cost**: Higher cost per request but faster response

## Database Migration

Run the migration to create the async_meal_plans table:

```sql
-- See database/migrations/054_create_async_meal_plans.sql
```

## Key Features

1. **Timeout Handling**: Uses OpenAI Assistant's async API to avoid Vercel timeout limits
2. **Status Tracking**: Database tracks generation status and results
3. **Error Handling**: Comprehensive error handling and status reporting
4. **Polling Support**: Frontend can poll for completion status
5. **Client Goals Integration**: Automatically uses client's active goals
6. **Flexible Input**: Supports additional text for custom requirements

## Assistant Configuration

The system uses OpenAI Assistant with ID `asst_WgJCEyh92kZqUBcwcYspU3oC`. The assistant should be configured to:

1. Accept client goals and additional text as input
2. Return structured JSON with meal plan data
3. Include detailed recipes, nutritional info, and instructions
4. Handle various dietary restrictions and preferences
