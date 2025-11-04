# How to Check Your Max Token Limit

## Option 1: Check Anthropic's Documentation
Visit: https://docs.anthropic.com/en/docs/models-overview

## Option 2: Test with API Call
The API will return an error if max_tokens exceeds the model's limit:
- Error message: "max_tokens: value too large"

## Option 3: Monitor Your Logs
After your next meal plan generation, check Vercel logs for:
📊 Token usage: { input: X, output: Y, total: Z }

If output tokens = max_tokens exactly, your response was truncated!
