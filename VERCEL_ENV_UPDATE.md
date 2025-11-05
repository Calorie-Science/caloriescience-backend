# 🚨 URGENT: Vercel Environment Variable Update Required

## ⚠️ Breaking Change: API Key Variable Renamed

The Anthropic (Claude) API key environment variable has been renamed to force Vercel to pick up the new value.

### Old Variable Name (REMOVE THIS):
```
ANTHROPIC_API_KEY
```

### New Variable Name (ADD THIS):
```
CLAUDE_API_KEY_V2
```

---

## 📋 Steps to Update in Vercel

### 1. Navigate to Environment Variables
1. Go to your Vercel project dashboard: https://vercel.com/dashboard
2. Select your project: `caloriescience-app`
3. Go to **Settings** → **Environment Variables**

### 2. Remove Old Variable
- Find `ANTHROPIC_API_KEY`
- Click the **⋮** menu on the right
- Select **Delete**
- Confirm deletion

### 3. Add New Variable
- Click **Add New** button
- **Key:** `CLAUDE_API_KEY_V2`
- **Value:** Your Anthropic API key (starts with `sk-ant-`)
- **Environment:** Select all (Production, Preview, Development)
- Click **Save**

### 4. (Optional) Add Grok Support
If you want to use Grok for meal plan generation:
- Click **Add New** button
- **Key:** `GROK_API_KEY`
- **Value:** Your Grok API key (from https://x.ai/)
- **Environment:** Select all
- Click **Save**

### 5. Redeploy
After adding the new variable:
1. Go to **Deployments** tab
2. Click **⋯** on the latest deployment
3. Select **Redeploy**
4. Wait for deployment to complete

---

## ✅ Verification

After redeployment, test with curl:

```bash
curl 'https://caloriescience-api.vercel.app/api/meal-plans' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  --data-raw '{"type":"meal-plan","action":"async-generate","clientId":"YOUR_CLIENT_ID","aiProvider":"claude"}'
```

If successful, you should see a meal plan response without API key errors.

---

## 🔑 All Required Environment Variables

### Claude (Required)
```
CLAUDE_API_KEY_V2=sk-ant-your-key-here
```

### Grok (Optional - for Grok meal plans)
```
GROK_API_KEY=xai-your-key-here
```

### Gemini (Optional - already configured)
```
GEMINI_API_KEY=AIza-your-key-here
```

### OpenAI (Already configured)
```
OPENAI_API_KEY=sk-your-key-here
```

---

## 🐛 Troubleshooting

**If you still see "CLAUDE_API_KEY_V2 environment variable is required" error:**

1. Double-check the variable name is exactly: `CLAUDE_API_KEY_V2` (case-sensitive)
2. Ensure you selected **all environments** (Production, Preview, Development)
3. Try a **hard redeploy**:
   - Go to Settings → General
   - Scroll to "Redeploy with Cache Cleared"
   - Click **Redeploy**

**If API key is invalid:**
1. Verify your Anthropic API key is active at https://console.anthropic.com/
2. Make sure you copied the full key (starts with `sk-ant-`)
3. Generate a new API key if needed

---

## 📝 Why This Change?

Vercel sometimes caches environment variables, and updating the value doesn't always trigger a refresh. By renaming the variable, we force Vercel to treat it as a completely new environment variable, ensuring the new API key is picked up immediately.
