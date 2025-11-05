# Environment Variables

## Required Environment Variables

### AI Model Configuration
```env
# Required for OpenAI Assistant meal plan generation
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Custom Assistant ID (defaults to asst_WgJCEyh92kZqUBcwcYspU3oC)
OPENAI_ASSISTANT_ID=asst_your-custom-assistant-id

# Required for Claude meal plan generation
CLAUDE_API_KEY_V2=sk-ant-your-anthropic-api-key-here

# Optional: Grok meal plan generation
GROK_API_KEY=xai-your-grok-api-key-here

# Optional: Gemini meal plan generation
GEMINI_API_KEY=AIza-your-gemini-api-key-here
```

### Supabase Configuration
```env
# Required for database operations
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
```

### Recipe Provider APIs
```env
# Required: Edamam Recipe & Nutrition APIs
EDAMAM_RECIPE_APP_ID=your-recipe-app-id
EDAMAM_RECIPE_APP_KEY=your-recipe-app-key
EDAMAM_NUTRITION_APP_ID=your-nutrition-app-id
EDAMAM_NUTRITION_APP_KEY=your-nutrition-app-key

# Required: Spoonacular API
SPOONACULAR_API_KEY=your-spoonacular-api-key

# Optional: Bon Happetee API (for Indian food database)
BON_HAPPETEE_API_KEY=your-bonhappetee-api-key
```

## Optional Environment Variables

### JWT Configuration
```env
JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=7d
```

### Email Configuration
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### App Configuration
```env
APP_BASE_URL=https://your-app.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
NODE_ENV=production
```

### Rate Limiting
```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### File Upload
```env
MAX_FILE_SIZE=10485760
```

## Setup Instructions

1. **Copy the required variables** to your `.env.local` file
2. **Get OpenAI API Key**:
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Add it to `OPENAI_API_KEY`

3. **Get Anthropic API Key (Claude)**:
   - Go to https://console.anthropic.com/
   - Create a new API key
   - Add it to `CLAUDE_API_KEY_V2`

4. **Get Grok API Key** (Optional):
   - Go to https://x.ai/
   - Create a new API key
   - Add it to `GROK_API_KEY`

5. **Get Gemini API Key** (Optional):
   - Go to https://ai.google.dev/
   - Create a new API key
   - Add it to `GEMINI_API_KEY`

5. **Get Supabase credentials**:
   - Go to your Supabase project settings
   - Copy the URL and keys to the respective variables

6. **Optional: Custom Assistant**:
   - Create a custom OpenAI Assistant if needed
   - Set the `OPENAI_ASSISTANT_ID` to your custom assistant ID

## Vercel Deployment

Add these environment variables to your Vercel project:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all required variables
4. Redeploy your project

## Security Notes

- Never commit `.env.local` to version control
- Use Vercel's environment variables for production
- Keep your OpenAI API key secure and rotate it regularly
- Use service role key only on the server side
