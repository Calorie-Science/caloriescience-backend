# 🔧 Fix Grok Database Constraint Error

## ❌ Current Error:
```
new row for relation "async_meal_plans" violates check constraint "async_meal_plans_ai_model_check"
```

The database currently only allows `ai_model = 'claude'`, but we need to support multiple AI models including `'grok'`.

---

## ✅ Solution: Apply Migration 079

I've created migration file: `database/migrations/079_add_multi_ai_model_support.sql`

This migration updates the constraint to allow: `'claude'`, `'grok'`, `'gemini'`, `'openai'`

---

## 🚀 Option 1: Automatic (Recommended)

The migration will run automatically on the next deployment:

1. **Commit and push** the new migration file to your repository
2. **Vercel will auto-deploy**
3. **Migration runs automatically** on first API call

```bash
git add database/migrations/079_add_multi_ai_model_support.sql
git commit -m "Add support for multiple AI models (Grok, Gemini, OpenAI)"
git push
```

---

## 🚀 Option 2: Manual via API

Run the migration immediately without waiting for deployment:

```bash
curl -X POST "https://caloriescience-api.vercel.app/api/admin/migrate" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"action": "run"}'
```

---

## 🚀 Option 3: Direct SQL in Supabase

If you need to apply the fix immediately:

1. Go to: https://supabase.com/dashboard/project/YOUR_PROJECT/sql
2. Run this SQL:

```sql
-- Drop the existing check constraint
ALTER TABLE async_meal_plans
DROP CONSTRAINT IF EXISTS async_meal_plans_ai_model_check;

-- Add new check constraint that allows multiple AI models
ALTER TABLE async_meal_plans
ADD CONSTRAINT async_meal_plans_ai_model_check
CHECK (ai_model IN ('claude', 'grok', 'gemini', 'openai'));

-- Add comment to document the supported AI models
COMMENT ON COLUMN async_meal_plans.ai_model IS 'AI model used for meal plan generation. Supported values: claude, grok, gemini, openai';
```

3. Click **Run**

---

## ✅ Verification

After applying the migration, test with curl:

```bash
curl 'https://caloriescience-api.vercel.app/api/meal-plans' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  --data-raw '{"type":"meal-plan","action":"async-generate","clientId":"a376c7f1-d053-4ead-809d-00f46ca7d2c8","additionalText":"two day meal plan, just breakfast item","aiProvider":"grok"}'
```

You should now get a successful response with a Grok-generated meal plan! 🎉

---

## 📋 What the Migration Does

1. **Removes** the old constraint that only allowed `'claude'`
2. **Adds** new constraint allowing: `'claude'`, `'grok'`, `'gemini'`, `'openai'`
3. **Documents** the supported AI models in a column comment

---

## 🐛 Troubleshooting

**If migration fails to run automatically:**
- Check Vercel deployment logs
- Try Option 3 (Direct SQL) as a workaround
- Contact support if issue persists

**If you get "permission denied":**
- Make sure you're using a token with admin privileges
- Or use Option 3 (Direct SQL in Supabase) which you have full access to
