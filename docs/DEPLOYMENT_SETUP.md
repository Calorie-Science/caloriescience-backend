# Two-Environment Deployment Setup Guide

## Overview

Your project now has two environments:
- **Production**: `main` branch → Production database
- **Development/Preview**: `development` branch → Development database

---

## Git Branch Structure

### Main Branch (Production)
```bash
git checkout main
# Make changes
git add .
git commit -m "Production change"
git push origin main
```
→ Deploys to: `https://caloriescience-api.vercel.app` (Production)

### Development Branch (Preview)
```bash
git checkout development
# Make changes
git add .
git commit -m "Development feature"
git push origin development
```
→ Deploys to: `https://caloriescience-app-git-development-mrinals-projects-b39127c8.vercel.app` (Preview)

---

## Vercel Configuration

### Step 1: Configure Git Settings

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: **caloriescience-app**
3. Go to **Settings** → **Git**

**Production Branch:**
- Set Production Branch: `main`

**Preview Branches:**
- ✅ Enable "Automatic Deployments" for all branches
- This means any push to `development` will create a preview deployment

---

### Step 2: Configure Environment Variables

Go to **Settings** → **Environment Variables**

#### For PRODUCTION Environment (main branch):

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `SUPABASE_URL` | `https://pmlkebsiywwuofhyjahk.supabase.co` | ✅ Production |
| `SUPABASE_ANON_KEY` | `[Get from new Supabase project]` | ✅ Production |
| `SUPABASE_SERVICE_ROLE_KEY` | `[Get from new Supabase project]` | ✅ Production |
| `NODE_ENV` | `production` | ✅ Production |
| `OPENAI_API_KEY` | `[Your OpenAI key]` | ✅ Production |
| `ANTHROPIC_API_KEY` | `[Your Anthropic key]` | ✅ Production |
| `JWT_SECRET` | `[Your JWT secret]` | ✅ Production |

**Where to get Supabase credentials:**
1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/pmlkebsiywwuofhyjahk
2. Navigate to: **Settings** → **API**
3. Copy:
   - Project URL (SUPABASE_URL)
   - anon public key (SUPABASE_ANON_KEY)
   - service_role key (SUPABASE_SERVICE_ROLE_KEY) - **Keep secret!**

#### For PREVIEW Environment (development branch):

| Variable Name | Value | Environment |
|--------------|-------|-------------|
| `SUPABASE_URL` | `https://snsllprnsjokiwptobzk.supabase.co` | ✅ Preview |
| `SUPABASE_ANON_KEY` | `[Get from old/dev Supabase project]` | ✅ Preview |
| `SUPABASE_SERVICE_ROLE_KEY` | `[Get from old/dev Supabase project]` | ✅ Preview |
| `NODE_ENV` | `development` | ✅ Preview |
| `OPENAI_API_KEY` | `[Your OpenAI key]` | ✅ Preview |
| `ANTHROPIC_API_KEY` | `[Your Anthropic key]` | ✅ Preview |
| `JWT_SECRET` | `[Your JWT secret]` | ✅ Preview |

**Important Notes:**
- Use your OLD Supabase project (`snsllprnsjokiwptobzk`) as the development database
- Or create a new Supabase project specifically for development
- Preview environment uses the same API keys but points to development database

---

## How to Add Environment Variables in Vercel

1. Go to **Settings** → **Environment Variables**
2. Click **Add New**
3. Enter:
   - **Name**: e.g., `SUPABASE_URL`
   - **Value**: Your value
   - **Environments**: Check the boxes:
     - ✅ Production (for production vars)
     - ✅ Preview (for development vars)
     - ⬜ Development (leave unchecked - for local dev only)
4. Click **Save**

**Example Screenshot Flow:**
```
Add Environment Variable
┌─────────────────────────────────────┐
│ Name: SUPABASE_URL                  │
│ Value: https://pmlk...supabase.co   │
│ Environments:                       │
│   ✅ Production                     │
│   ⬜ Preview                        │
│   ⬜ Development                    │
└─────────────────────────────────────┘
         [Save Button]
```

---

## Development Workflow

### Working on a New Feature

```bash
# 1. Start from main
git checkout main
git pull origin main

# 2. Switch to development branch
git checkout development
git pull origin development

# 3. Create feature branch (optional but recommended)
git checkout -b feature/new-meal-planner

# 4. Make changes and test locally
npm run dev

# 5. Commit and push to development for testing
git add .
git commit -m "Add new meal planner feature"
git push origin feature/new-meal-planner
# Or push to development directly:
# git push origin development

# 6. Vercel automatically deploys to preview URL
# Test at: https://caloriescience-app-git-development-...vercel.app

# 7. Once tested, merge to main for production
git checkout main
git merge development
git push origin main

# 8. Production automatically deploys
# Live at: https://caloriescience-api.vercel.app
```

---

## URL Structure

### Production URLs:
- **Main URL**: `https://caloriescience-api.vercel.app`
- **Vercel Auto URL**: `https://caloriescience-app.vercel.app`
- **Per-Deployment**: `https://caloriescience-[hash]-mrinals-projects-b39127c8.vercel.app`

### Preview URLs (development branch):
- **Branch URL**: `https://caloriescience-app-git-development-mrinals-projects-b39127c8.vercel.app`
- **Per-Deployment**: `https://caloriescience-app-[hash]-mrinals-projects-b39127c8.vercel.app`

---

## Testing Your Setup

### Test Development Environment:
```bash
# 1. Make a small change on development branch
git checkout development
echo "# Development test" >> README.md
git add README.md
git commit -m "Test development deployment"
git push origin development

# 2. Go to Vercel Dashboard → Deployments
# 3. You should see a new deployment for "development" branch
# 4. Click it to get the preview URL
# 5. Test an API endpoint:
curl https://caloriescience-app-git-development-....vercel.app/api/health
```

### Test Production Environment:
```bash
# 1. Merge development to main
git checkout main
git merge development
git push origin main

# 2. Vercel automatically deploys to production
# 3. Test production URL:
curl https://caloriescience-api.vercel.app/api/health
```

---

## Environment Variables Checklist

Before deploying, ensure these are set:

**Production:**
- [ ] SUPABASE_URL (new prod database)
- [ ] SUPABASE_ANON_KEY (new prod database)
- [ ] SUPABASE_SERVICE_ROLE_KEY (new prod database)
- [ ] NODE_ENV=production
- [ ] OPENAI_API_KEY
- [ ] ANTHROPIC_API_KEY
- [ ] JWT_SECRET
- [ ] Any other API keys

**Preview/Development:**
- [ ] SUPABASE_URL (dev database)
- [ ] SUPABASE_ANON_KEY (dev database)
- [ ] SUPABASE_SERVICE_ROLE_KEY (dev database)
- [ ] NODE_ENV=development
- [ ] OPENAI_API_KEY
- [ ] ANTHROPIC_API_KEY
- [ ] JWT_SECRET
- [ ] Any other API keys

---

## Troubleshooting

### Preview deployment using wrong environment variables
- Check Vercel Dashboard → Settings → Environment Variables
- Ensure variables are assigned to correct environments (Production vs Preview)
- Redeploy the preview branch

### Changes not deploying
- Check Vercel Dashboard → Deployments
- Look for failed builds (red X)
- Click on deployment to see build logs

### Database connection errors
- Verify SUPABASE_URL is correct
- Check SUPABASE_SERVICE_ROLE_KEY is correct
- Ensure IP/network is not blocked in Supabase settings

### Want to test locally with development database:
```bash
# Create .env.local file
cp .env.example .env.local

# Edit .env.local with development credentials
SUPABASE_URL=https://snsllprnsjokiwptobzk.supabase.co
SUPABASE_ANON_KEY=your-dev-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-dev-service-key

# Run locally
npm run dev
```

---

## Quick Commands Reference

```bash
# Switch to development
git checkout development

# Switch to production
git checkout main

# Create new feature branch
git checkout -b feature/name

# Push to development (triggers preview)
git push origin development

# Push to production
git checkout main
git merge development
git push origin main

# View current branch
git branch

# View all branches
git branch -a

# Pull latest changes
git pull origin main          # For main
git pull origin development   # For development
```

---

## Security Best Practices

1. **Never commit secrets** to git (.env files should be in .gitignore)
2. **Use different API keys** for production vs development if possible
3. **Rotate keys periodically** especially service_role keys
4. **Limit database access** by IP in Supabase settings if possible
5. **Use read-only keys** for preview/development environments when possible

---

## Next Steps

1. ✅ Create development branch (Done!)
2. ⏳ Configure Vercel environment variables (Follow guide above)
3. ⏳ Test preview deployment
4. ⏳ Test production deployment
5. ⏳ Document any project-specific API keys needed

---

## Support

- **Vercel Docs**: https://vercel.com/docs/concepts/deployments/environments
- **Supabase Docs**: https://supabase.com/docs
- **Git Branching**: https://git-scm.com/book/en/v2/Git-Branching-Basic-Branching-and-Merging
