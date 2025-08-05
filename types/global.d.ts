declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Supabase
      SUPABASE_URL: string;
      SUPABASE_SERVICE_ROLE_KEY: string;
      SUPABASE_ANON_KEY: string;
      
      // OpenAI
      OPENAI_API_KEY: string;
      OPENAI_MODEL?: string;
      OPENAI_MAX_TOKENS?: string;
      
      // JWT
      JWT_SECRET?: string;
      JWT_EXPIRES_IN?: string;
      
      // Email
      SMTP_HOST?: string;
      SMTP_PORT?: string;
      SMTP_SECURE?: string;
      SMTP_USER?: string;
      SMTP_PASSWORD?: string;
      EMAIL_FROM?: string;
      
      // App
      APP_BASE_URL?: string;
      FRONTEND_URL?: string;
      NODE_ENV?: 'development' | 'production' | 'test';
      
      // Rate limiting
      RATE_LIMIT_WINDOW_MS?: string;
      RATE_LIMIT_MAX_REQUESTS?: string;
      
      // File upload
      MAX_FILE_SIZE?: string;
    }
  }
}

export {}; 