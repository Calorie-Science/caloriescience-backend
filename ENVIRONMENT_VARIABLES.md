# Environment Variables

## Required Environment Variables

### AI Model Configuration
```env
# Required for OpenAI Assistant meal plan generation
OPENAI_API_KEY=sk-your-openai-api-key-here

# Optional: Custom Assistant ID (defaults to asst_WgJCEyh92kZqUBcwcYspU3oC)
OPENAI_ASSISTANT_ID=asst_your-custom-assistant-id

# Required for Claude meal plan generation
ANTHROPIC_API_KEY=sk-ant-your-anthropic-api-key-here
```

### Supabase Configuration
```env
# Required for database operations
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
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

3. **Get Anthropic API Key**:
   - Go to https://console.anthropic.com/
   - Create a new API key
   - Add it to `ANTHROPIC_API_KEY`

4. **Get Supabase credentials**:
   - Go to your Supabase project settings
   - Copy the URL and keys to the respective variables

5. **Optional: Custom Assistant**:
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
