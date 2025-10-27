#!/bin/bash

# Test creating a new custom recipe with the standardized nutrition format
echo "🧪 Creating a new custom recipe with proper nutrition structure..."

API_URL="https://caloriescience-api.vercel.app/api/recipes/custom"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6Ijg5ZjEyM2VhLWQwZWYtNDEyNy04Y2ZiLWQyZjI4NjAxYTBhNiIsImVtYWlsIjoibGFrc2htaUBjYWxvcmllc2NpZW5jZS5haSIsInJvbGUiOiJudXRyaXRpb25pc3QiLCJpYXQiOjE3NjEwNjE5NzcsImV4cCI6MTc2MTY2Njc3N30.OjtHlR9gbctJ54EW0MOdXpjIf8Si4Ki0lt12JxUiomU"

# Create a simple test recipe
curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "authorization: Bearer $TOKEN" \
  -d '{
    "recipeName": "Healthy Protein Bowl",
    "description": "A nutritious bowl packed with protein and vitamins",
    "servings": 2,
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 5,
    "totalTimeMinutes": 15,
    "isPublic": true,
    "cuisineTypes": ["american"],
    "mealTypes": ["lunch"],
    "dishTypes": ["bowl"],
    "healthLabels": ["high-protein", "gluten-free"],
    "dietLabels": ["high-protein"],
    "instructions": [
      "Cook chicken breast",
      "Prepare vegetables",
      "Combine in a bowl",
      "Serve warm"
    ],
    "ingredients": [
      {
        "name": "chicken breast",
        "quantity": 200,
        "unit": "gram",
        "nutritionData": {
          "calories": 330,
          "macros": {
            "protein": 62,
            "carbs": 0,
            "fat": 7.2,
            "fiber": 0,
            "sugar": 0,
            "sodium": 148,
            "cholesterol": 172,
            "saturatedFat": 2,
            "transFat": 0,
            "monounsaturatedFat": 2.5,
            "polyunsaturatedFat": 1.5
          },
          "micros": {
            "vitamins": {
              "vitaminA": 50,
              "vitaminC": 2,
              "vitaminD": 0.2,
              "vitaminE": 0.5,
              "vitaminK": 1,
              "vitaminB6": 1.2,
              "vitaminB12": 0.6,
              "niacin": 22,
              "folate": 10
            },
            "minerals": {
              "calcium": 30,
              "iron": 1.8,
              "magnesium": 54,
              "phosphorus": 440,
              "potassium": 520,
              "zinc": 2,
              "selenium": 55
            }
          },
          "weight": 200
        }
      },
      {
        "name": "broccoli",
        "quantity": 100,
        "unit": "gram",
        "nutritionData": {
          "calories": 34,
          "macros": {
            "protein": 2.8,
            "carbs": 7,
            "fat": 0.4,
            "fiber": 2.6,
            "sugar": 1.7,
            "sodium": 33
          },
          "micros": {
            "vitamins": {
              "vitaminA": 623,
              "vitaminC": 89,
              "vitaminK": 102,
              "folate": 63
            },
            "minerals": {
              "calcium": 47,
              "iron": 0.7,
              "magnesium": 21,
              "potassium": 316
            }
          },
          "weight": 100
        }
      }
    ]
  }' | jq '.'

echo ""
echo "✅ Recipe created! Now fetching the list to verify format..."
echo ""

sleep 2

# Fetch the recipes to see the format
curl -s "https://caloriescience-api.vercel.app/api/recipes/custom?page=1&limit=1" \
  -H "authorization: Bearer $TOKEN" | jq '.data[0].nutritionDetails'

echo ""
echo "📊 Nutrition details structure shown above"

