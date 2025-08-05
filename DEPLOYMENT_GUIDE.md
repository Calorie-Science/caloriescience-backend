# Vercel Deployment Guide for CalorieScience API

This guide will walk you through deploying your CalorieScience API to Vercel.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **GitHub Account**: Your code should be in a GitHub repository
3. **Supabase Project**: Set up a Supabase database project

## Step 1: Prepare Your Environment Variables

You'll need to set up the following environment variables in Vercel:

### Required Environment Variables:

```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long
JWT_EXPIRES_IN=7d

# OpenAI (if using AI features)
OPENAI_API_KEY=your-openai-api-key
OPENAI_MODEL=gpt-4
OPENAI_MAX_TOKENS=2000
OPENAI_ASSISTANT_ID=asst_your_assistant_id_here

# Application URLs
APP_BASE_URL=https://your-app.vercel.app
FRONTEND_URL=https://your-frontend-domain.com
NODE_ENV=production

# Email Configuration (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=noreply@caloriescience.com

# Rate Limiting (Optional)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# File Upload (Optional)
MAX_FILE_SIZE=10485760
```

## Step 2: Set Up Supabase Database

1. **Create a Supabase Project:**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and keys

2. **Run Database Migration:**
   - Go to the SQL editor in your Supabase dashboard
   - Copy and paste the contents of `database/schema.sql`
   - Execute the SQL to create all tables and policies

3. **Configure Row Level Security:**
   - The schema already includes RLS policies
   - Ensure RLS is enabled for all tables

## Step 3: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. **Connect Repository:**
   - Log in to Vercel dashboard
   - Click "New Project"
   - Import your GitHub repository

2. **Configure Build Settings:**
   - Framework Preset: Other
   - Build Command: `npm run build` (or leave empty)
   - Output Directory: Leave empty
   - Install Command: `npm install`

3. **Add Environment Variables:**
   - In the deployment configuration, add all the environment variables listed above
   - Make sure to use your actual values

4. **Deploy:**
   - Click "Deploy"
   - Wait for the build to complete

### Option B: Deploy via Vercel CLI

1. **Install Vercel CLI:**
```bash
npm i -g vercel
```

2. **Login to Vercel:**
```bash
vercel login
```

3. **Deploy:**
```bash
vercel --prod
```

4. **Add Environment Variables:**
```bash
vercel env add JWT_SECRET
# Follow prompts to add each environment variable
```

## Step 4: Verify Deployment

1. **Test API Endpoints:**
```bash
# Test health check
curl https://your-app.vercel.app/api/auth/login

# Should return a method not allowed error (405) which confirms the endpoint exists
```

2. **Test Registration:**
```bash
curl -X POST https://your-app.vercel.app/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "full_name": "Test Nutritionist"
  }'
```

## Step 5: Configure Custom Domain (Optional)

1. **Add Domain in Vercel:**
   - Go to your project settings
   - Navigate to "Domains"
   - Add your custom domain
   - Follow DNS configuration instructions

2. **Update Environment Variables:**
   - Update `APP_BASE_URL` to use your custom domain
   - Redeploy if necessary

## Step 6: Monitor and Maintain

1. **Set Up Monitoring:**
   - Use Vercel Analytics
   - Monitor function logs in Vercel dashboard
   - Set up error tracking (Sentry, LogRocket, etc.)

2. **Database Maintenance:**
   - Monitor Supabase usage
   - Set up database backups
   - Review and optimize queries

## Common Issues and Solutions

### Issue 1: "Module not found" errors
**Solution:** Ensure all dependencies are listed in `package.json` and properly installed.

### Issue 2: Environment variables not working
**Solution:** 
- Check variable names are exactly matching
- Redeploy after adding new environment variables
- Use Vercel CLI to verify: `vercel env ls`

### Issue 3: CORS errors
**Solution:** The `vercel.json` file already includes CORS headers. If issues persist, check the frontend is making requests to the correct domain.

### Issue 4: Database connection errors
**Solution:**
- Verify Supabase credentials
- Check if your IP is whitelisted in Supabase
- Ensure RLS policies are correct

### Issue 5: JWT token issues
**Solution:**
- Ensure `JWT_SECRET` is set and is at least 32 characters
- Check token expiration settings
- Verify the token is being sent in the correct format

## Production Checklist

- [ ] All environment variables configured
- [ ] Database schema deployed to Supabase
- [ ] API endpoints tested
- [ ] Authentication working
- [ ] CORS properly configured
- [ ] Error monitoring set up
- [ ] Custom domain configured (if needed)
- [ ] SSL certificate working
- [ ] Rate limiting configured
- [ ] Database backups enabled

## Security Best Practices

1. **Environment Variables:**
   - Never commit `.env` files to Git
   - Use different values for development and production
   - Rotate JWT secrets regularly

2. **Database Security:**
   - Keep RLS policies up to date
   - Regularly review access permissions
   - Monitor unusual database activity

3. **API Security:**
   - Implement rate limiting
   - Validate all inputs
   - Log security events

## Support

- **Vercel Documentation:** [vercel.com/docs](https://vercel.com/docs)
- **Supabase Documentation:** [supabase.com/docs](https://supabase.com/docs)
- **API Documentation:** See `API_DOCUMENTATION.md`

## Next Steps

After successful deployment:

1. **Create a Frontend:** Build a React/Next.js frontend that consumes this API
2. **Set Up Analytics:** Implement user analytics and API usage tracking
3. **Add More Features:** Implement meal planning, nutrition tracking, etc.
4. **Mobile App:** Consider building a mobile app using React Native or Flutter

---

Your CalorieScience API should now be live at `https://your-app.vercel.app`! 