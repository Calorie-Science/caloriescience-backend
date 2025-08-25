# Test Macro Filtering with Edamam API

Now that we've added macro-nutrient filtering (protein, carbs, fat) to the meal planning service, you can test it with this curl command:

## 🥩 Test with Macro Filtering

```bash
curl --location 'https://caloriescience-api.vercel.app/api/meal-plans' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc1NTY4MjE2MiwiZXhwIjoxNzU2Mjg2OTYyfQ.nv1cD-JFf3mH8oChwMRR4S_Fff4cpzdJdJ2EVGn8kII' \
--data '{
  "action": "preview",
  "clientId": "b543f1f8-87f9-4d84-835e-78385546321a",
  "planDate": "2025-08-25",
  "dietaryRestrictions": ["vegetarian", "high-protein"],
  "cuisinePreferences": ["mediterranean"]
}'
```

## 🔍 What This Will Do

1. **Calorie Filtering**: Each meal will be filtered by calorie targets (±30% tolerance)
2. **Protein Filtering**: Each meal will be filtered by protein targets (±20% tolerance using `PROCNT`)
3. **Carbs Filtering**: Each meal will be filtered by carbs targets (±20% tolerance using `CHOCDF`)
4. **Fat Filtering**: Each meal will be filtered by fat targets (±20% tolerance using `FAT`)
5. **Dietary Restrictions**: Will apply `vegetarian` and `high-protein` health labels
6. **Cuisine Preferences**: Will filter by `mediterranean` cuisine type

## 📊 Expected Edamam API Request

The system will now send a request to Edamam that looks like this:

```json
{
  "size": 1,
  "plan": {
    "fit": {
      "ENERC_KCAL": {
        "min": 1800,
        "max": 2200
      }
    },
    "sections": {
      "Breakfast": {
        "accept": {
          "all": [
            { "meal": ["breakfast"] },
            { "dish": ["egg", "cereals", "bread", "pancake", "biscuits and cookies"] }
          ]
        },
        "fit": {
          "ENERC_KCAL": { "min": 450, "max": 650 },
          "PROCNT": { "min": 18, "max": 27 },
          "CHOCDF": { "min": 45, "max": 68 },
          "FAT": { "min": 13, "max": 20 }
        }
      },
      "Lunch": {
        "accept": {
          "all": [
            { "meal": ["lunch/dinner"] },
            { "dish": ["main course", "pasta", "salad", "soup", "sandwiches", "pizza"] }
          ]
        },
        "fit": {
          "ENERC_KCAL": { "min": 630, "max": 910 },
          "PROCNT": { "min": 25, "max": 38 },
          "CHOCDF": { "min": 63, "max": 95 },
          "FAT": { "min": 18, "max": 28 }
        }
      }
    },
    "accept": {
      "all": [
        { "health": ["vegetarian", "high-protein"] },
        { "cuisineType": ["mediterranean"] }
      ]
    }
  }
}
```

## 🎯 Benefits of Macro Filtering

- **More Precise Nutrition**: Meals will better match your macro targets
- **Better Meal Balance**: Each meal will have appropriate protein/carb/fat ratios
- **Improved Results**: Edamam will return recipes that actually meet your nutritional requirements
- **Professional Quality**: More suitable for nutritionists and dietitians

## 🔧 Tolerance Levels

- **Calories**: ±30% per meal (allows for meal-to-meal variation)
- **Protein**: ±20% per meal (PROCNT field)
- **Carbs**: ±20% per meal (CHOCDF field)  
- **Fat**: ±20% per meal (FAT field)

## 📝 Notes

- The macro filtering will only work if the client has protein, carbs, and fat requirements in the database
- If any macro value is 0 or null, that nutrient won't be filtered
- The system will still fall back to placeholder meals if Edamam API fails
- All existing functionality (dietary restrictions, cuisine preferences) remains intact

Try this curl command and check the logs to see if the macro filtering is working correctly!
