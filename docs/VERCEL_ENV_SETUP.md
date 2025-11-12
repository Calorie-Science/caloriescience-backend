# Vercel Environment Variables Setup - Quick Guide

## Step-by-Step: Configure Vercel Dashboard

### 1. Go to Vercel Dashboard

Visit: https://vercel.com/dashboard

1. Select your project: **caloriescience-app** (or **caloriescience-backend**)
2. Click **Settings** tab
3. Click **Environment Variables** in the left sidebar

---

## 2. Set Production Branch

1. In **Settings**, click **Git** in the left sidebar
2. Under "Production Branch", set: `main`
3. Save changes

---

## 3. Add Environment Variables

For each variable below, click **Add New** button and fill in:

### ✅ SUPABASE_URL

**For Production:**
- Name: `SUPABASE_URL`
- Value: `https://pmlkebsiywwuofhyjahk.supabase.co`
- Environments: ✅ Production only
- Click **Save**

**For Preview (Development):**
- Name: `SUPABASE_URL`
- Value: `https://snsllprnsjokiwptobzk.supabase.co`
- Environments: ✅ Preview only
- Click **Save**

---

### ✅ SUPABASE_ANON_KEY

**Get this from Supabase:**

**For Production:**
1. Go to: https://supabase.com/dashboard/project/pmlkebsiywwuofhyjahk
2. Click **Settings** (gear icon) → **API**
3. Copy "Project API keys" → "anon public"
4. In Vercel:
   - Name: `SUPABASE_ANON_KEY`
   - Value: [paste the anon key - starts with `eyJ...`]
   - Environments: ✅ Production only
   - Click **Save**

**For Preview (Development):**
1. Go to: https://supabase.com/dashboard/project/snsllprnsjokiwptobzk
2. Click **Settings** → **API**
3. Copy "anon public" key
4. In Vercel:
   - Name: `SUPABASE_ANON_KEY`
   - Value: [paste the dev anon key]
   - Environments: ✅ Preview only
   - Click **Save**

---

### ✅ SUPABASE_SERVICE_ROLE_KEY

**⚠️ KEEP THIS SECRET! Never expose in frontend code!**

**For Production:**
1. Go to: https://supabase.com/dashboard/project/pmlkebsiywwuofhyjahk
2. Click **Settings** → **API**
3. Copy "Project API keys" → "service_role" (click "Reveal" first)
4. In Vercel:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: [paste the service_role key]
   - Environments: ✅ Production only
   - Click **Save**

**For Preview (Development):**
1. Go to: https://supabase.com/dashboard/project/snsllprnsjokiwptobzk
2. Copy "service_role" key
3. In Vercel:
   - Name: `SUPABASE_SERVICE_ROLE_KEY`
   - Value: [paste the dev service_role key]
   - Environments: ✅ Preview only
   - Click **Save**

---

### ✅ NODE_ENV

**For Production:**
- Name: `NODE_ENV`
- Value: `production`
- Environments: ✅ Production only
- Click **Save**

**For Preview:**
- Name: `NODE_ENV`
- Value: `development`
- Environments: ✅ Preview only
- Click **Save**

---

### ✅ Other API Keys (if you use them)

**OPENAI_API_KEY**
- Name: `OPENAI_API_KEY`
- Value: `[your OpenAI API key]`
- Environments: ✅ Production, ✅ Preview
- Click **Save**

**ANTHROPIC_API_KEY**
- Name: `ANTHROPIC_API_KEY`
- Value: `[your Anthropic API key]`
- Environments: ✅ Production, ✅ Preview
- Click **Save**

**JWT_SECRET**
- Name: `JWT_SECRET`
- Value: `[your JWT secret]`
- Environments: ✅ Production, ✅ Preview
- Click **Save**

---

## 4. Verify Configuration

After adding all variables, your environment variables page should show:

**Production Environment:**
```
SUPABASE_URL                   → https://pmlkebsiywwuofhyjahk.supabase.co
SUPABASE_ANON_KEY              → eyJ... (new prod database)
SUPABASE_SERVICE_ROLE_KEY      → eyJ... (new prod database)
NODE_ENV                       → production
OPENAI_API_KEY                 → sk-...
ANTHROPIC_API_KEY              → sk-ant-...
JWT_SECRET                     → your-secret
```

**Preview Environment:**
```
SUPABASE_URL                   → https://snsllprnsjokiwptobzk.supabase.co
SUPABASE_ANON_KEY              → eyJ... (dev database)
SUPABASE_SERVICE_ROLE_KEY      → eyJ... (dev database)
NODE_ENV                       → development
OPENAI_API_KEY                 → sk-...
ANTHROPIC_API_KEY              → sk-ant-...
JWT_SECRET                     → your-secret
```

---

## 5. Trigger Deployments

### Deploy Production:
```bash
git checkout main
git commit --allow-empty -m "Trigger production deployment"
git push origin main
```

### Deploy Preview:
```bash
git checkout development
git commit --allow-empty -m "Trigger preview deployment"
git push origin development
```

---

## 6. Test Your Deployments

**Production:**
```bash
curl https://caloriescience-api.vercel.app/api/health

# Or test a database query
curl https://caloriescience-api.vercel.app/api/eer-formulas
```

**Preview:**
```bash
# Get the preview URL from Vercel Dashboard → Deployments
# It will look like: https://caloriescience-app-git-development-...vercel.app

curl https://caloriescience-app-git-development-mrinals-projects-b39127c8.vercel.app/api/health
```

---

## Visual Guide

```
Vercel Dashboard
└── Your Project (caloriescience-app)
    └── Settings
        ├── Git
        │   └── Production Branch: main ✅
        │
        └── Environment Variables
            ├── SUPABASE_URL
            │   ├── Production: pmlkebsiywwuofhyjahk
            │   └── Preview: snsllprnsjokiwptobzk
            │
            ├── SUPABASE_ANON_KEY
            │   ├── Production: [new prod key]
            │   └── Preview: [dev key]
            │
            └── SUPABASE_SERVICE_ROLE_KEY
                ├── Production: [new prod key]
                └── Preview: [dev key]
```

---

## Troubleshooting

### "Environment variable not found" error
- Wait 1-2 minutes after adding variables
- Redeploy the project
- Check variable name matches exactly (case-sensitive)

### Database connection fails
- Verify SUPABASE_URL format (no trailing slash)
- Check SUPABASE_SERVICE_ROLE_KEY was copied correctly
- Ensure Supabase project is active (not paused)

### Preview using production database
- Check environment variables are assigned to correct environment
- Look for "Production" vs "Preview" label next to each variable
- Edit variable and update environment checkboxes

---

## Summary Checklist

- [ ] Set Production Branch to `main` in Git settings
- [ ] Add `SUPABASE_URL` for Production
- [ ] Add `SUPABASE_URL` for Preview
- [ ] Add `SUPABASE_ANON_KEY` for Production
- [ ] Add `SUPABASE_ANON_KEY` for Preview
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` for Production
- [ ] Add `SUPABASE_SERVICE_ROLE_KEY` for Preview
- [ ] Add `NODE_ENV=production` for Production
- [ ] Add `NODE_ENV=development` for Preview
- [ ] Add other API keys (OPENAI, ANTHROPIC, JWT_SECRET, etc.)
- [ ] Trigger production deployment
- [ ] Trigger preview deployment
- [ ] Test production URL
- [ ] Test preview URL

You're done! 🎉
