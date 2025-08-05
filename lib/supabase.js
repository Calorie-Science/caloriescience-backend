const { createClient } = require('@supabase/supabase-js');

// Simple config from environment variables
const config = {
  supabase: {
    url: process.env.SUPABASE_URL,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    anonKey: process.env.SUPABASE_ANON_KEY
  }
};

// Validate required environment variables
if (!config.supabase.url) {
  throw new Error('SUPABASE_URL is required in environment variables');
}

if (!config.supabase.serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is required in environment variables');
}

// Create Supabase client using service role key for admin access
const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

console.log('✅ Supabase client initialized');

module.exports = {
  supabase,
  config
}; 