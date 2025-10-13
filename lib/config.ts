export const config = {
  // Supabase Configuration
  supabase: {
    url: process.env.SUPABASE_URL!,
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    anonKey: process.env.SUPABASE_ANON_KEY!
  },

  // OpenAI Configuration  
  openai: {
    apiKey: process.env.OPENAI_API_KEY!,
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '1000')
  },

  // Gemini Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY!,
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp',
    maxTokens: parseInt(process.env.GEMINI_MAX_TOKENS || '8000')
  },

  // Edamam API Configuration
  edamam: {
    appId: process.env.EDAMAM_APP_ID!,
    appKey: process.env.EDAMAM_APP_KEY!,
    recipeApiUrl: 'https://api.edamam.com/api/recipes/v2',
    mealPlannerApiUrl: 'https://api.edamam.com/api/meal-planner/v1',
    nutritionApiUrl: 'https://api.edamam.com/api/food-database/v2'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // Email Configuration (for verification and notifications)
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD
    },
    from: process.env.EMAIL_FROM || 'noreply@caloriescience.com'
  },

  // Application Configuration
  app: {
    name: 'CalorieScience',
    baseUrl: process.env.APP_BASE_URL || 'http://localhost:3000',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development'
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100')
  },

  // File Upload
  upload: {
    maxSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  }
};

// Validate required environment variables
export function validateConfig() {
  const required = [
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY', 
    'SUPABASE_ANON_KEY',
    'OPENAI_API_KEY',
    'GEMINI_API_KEY',
    'JWT_SECRET',
    'EDAMAM_APP_ID',
    'EDAMAM_APP_KEY'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
} 