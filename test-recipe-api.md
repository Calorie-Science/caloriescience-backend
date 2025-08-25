# Test Edamam Recipe API v2

Let's test the Recipe API directly to see if it's working.

## 🧪 Test Recipe API with Recipe ID

From your meal planner response, we got this recipe:
```
"assigned": "http://www.edamam.com/ontologies/edamam.owl#recipe_2b217a1e490efad7f1389c14aa88e882"
```

The recipe ID is: `2b217a1e490efad7f1389c14aa88e882`

## 🔍 Test Recipe API Directly

```bash
curl --location 'https://api.edamam.com/api/recipes/v2/2b217a1e490efad7f1389c14aa88e882?app_id=5bce8081&app_key=c80ecbf8968d48dfe51d395f6f19279a&type=public' \
--header 'accept: application/json' \
--header 'Edamam-Account-User: nutritionist1'
```

## 📊 Expected Response

If successful, you should get a response like:

```json
{
  "recipe": {
    "label": "Recipe Name",
    "url": "https://...",
    "image": "https://...",
    "calories": 450,
    "totalNutrients": {
      "PROCNT": { "quantity": 25, "unit": "g" },
      "CHOCDF": { "quantity": 45, "unit": "g" },
      "FAT": { "quantity": 15, "unit": "g" }
    },
    "ingredientLines": ["ingredient 1", "ingredient 2"]
  }
}
```

## 🚨 If It Fails

If you get an error, please share:
1. **HTTP Status Code**
2. **Error Message**
3. **Response Body**

## 🔧 Alternative Test

Try with a different recipe ID from your response:

```bash
# Lunch recipe
curl --location 'https://api.edamam.com/api/recipes/v2/3453e592db1eb830d3c2e87ee3d3c730?app_id=5bce8081&app_key=c80ecbf8968d48dfe51d395f6f19279a&type=public' \
--header 'accept: application/json' \
--header 'Edamam-Account-User: nutritionist1'

# Dinner recipe  
curl --location 'https://api.edamam.com/api/recipes/v2/fa573ce0f36bf41c10002bddb06bb900?app_id=5bce8081&app_key=c80ecbf8968d48dfe51d395f6f19279a&type=public' \
--header 'accept: application/json' \
--header 'Edamam-Account-User: nutritionist1'
```

## 📝 What This Will Tell Us

1. **If Recipe API works**: The issue is in our meal enrichment logic
2. **If Recipe API fails**: The issue is with the Recipe API endpoint or authentication
3. **Error details**: What specific error we're getting

Try these tests and let me know what response you get!
