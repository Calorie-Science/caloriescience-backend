# Manual Recipe Creation - cURL Commands

## Authentication Token
```bash
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc2MTExMzE1MCwiZXhwIjoxNzYxNzE3OTUwfQ.WeO8ICey7SHMh0mD0KE8MkkWev76FdkgF0RSpn3hYd8"
```

## API Base URL
```bash
API_URL="https://caloriescience-api.vercel.app"
```

---

## ⚠️ IMPORTANT: Nutrition Data Format

**The system now requires nutrition data in the following structure:**

```json
"nutritionData": {
  "calories": 105.02,
  "macros": {
    "protein": 1.29,
    "carbs": 26.9,
    "fat": 0.39,
    "fiber": 3.07,
    "sugar": 14.4,
    "sodium": 1.18,
    "cholesterol": 0,
    "saturatedFat": 0.13
  },
  "micros": {
    "vitamins": {
      "vitaminA": 75.52,
      "vitaminC": 10.27,
      "vitaminK": 0.59,
      // ... other vitamins
    },
    "minerals": {
      "calcium": 5.9,
      "iron": 0.31,
      "potassium": 422.44,
      // ... other minerals
    }
  }
}
```

**Required Fields:**
- `calories` (number)
- `macros` (object) - must include protein, carbs, fat, fiber, sugar, sodium
- `micros` (object) - must include vitamins and minerals objects

The `/api/ingredients/nutrition` endpoint returns data in this exact format, so you can use it directly!

**📖 For detailed information, see:** `MICRONUTRIENTS_IN_MANUAL_RECIPES.md`

---

## 1. Search for Ingredients (Autocomplete)

### Basic Ingredient Search
```bash
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=banana" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Search with Specific Source
```bash
# Search using Edamam
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=chicken&source=edamam" \
  -H "Authorization: Bearer ${TOKEN}"

# Search using Spoonacular
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=avocado&source=spoonacular" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Common Ingredient Searches
```bash
# Fruits
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=apple" \
  -H "Authorization: Bearer ${TOKEN}"

# Vegetables
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=spinach" \
  -H "Authorization: Bearer ${TOKEN}"

# Proteins
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=salmon" \
  -H "Authorization: Bearer ${TOKEN}"

# Grains
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=quinoa" \
  -H "Authorization: Bearer ${TOKEN}"

# Dairy
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=greek%20yogurt" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 2. Get Ingredient Nutrition

### Get Nutrition with Amount and Unit
```bash
# Banana - 1 medium
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=banana&amount=1&unit=medium" \
  -H "Authorization: Bearer ${TOKEN}"

# Greek Yogurt - 1 cup
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=greek%20yogurt&amount=1&unit=cup" \
  -H "Authorization: Bearer ${TOKEN}"

# Honey - 1 tablespoon
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=honey&amount=1&unit=tablespoon" \
  -H "Authorization: Bearer ${TOKEN}"

# Almonds - 0.25 cup
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=almonds&amount=0.25&unit=cup" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Common Ingredient Nutrition Queries
```bash
# Chicken breast - 4 oz
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=chicken%20breast&amount=4&unit=oz" \
  -H "Authorization: Bearer ${TOKEN}"

# Brown rice - 1 cup cooked
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=brown%20rice&amount=1&unit=cup" \
  -H "Authorization: Bearer ${TOKEN}"

# Olive oil - 1 tablespoon
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=olive%20oil&amount=1&unit=tablespoon" \
  -H "Authorization: Bearer ${TOKEN}"

# Eggs - 2 large
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=eggs&amount=2&unit=large" \
  -H "Authorization: Bearer ${TOKEN}"

# Avocado - 0.5 medium
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=avocado&amount=0.5&unit=medium" \
  -H "Authorization: Bearer ${TOKEN}"

# Broccoli - 1 cup
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=broccoli&amount=1&unit=cup" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Nutrition with Different Sources
```bash
# Auto (tries Spoonacular first, then Edamam)
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=salmon&amount=4&unit=oz&source=auto" \
  -H "Authorization: Bearer ${TOKEN}"

# Spoonacular only
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=salmon&amount=4&unit=oz&source=spoonacular" \
  -H "Authorization: Bearer ${TOKEN}"

# Edamam only
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=salmon&amount=4&unit=oz&source=edamam" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 3. Create Custom Recipe

### Simple Recipe Example
```bash
curl -X POST "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Simple Protein Smoothie",
    "description": "Quick and easy protein smoothie",
    "ingredients": [
      {
        "name": "banana",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": {
          "calories": 105,
          "protein": 1.3,
          "carbs": 27,
          "fat": 0.4,
          "fiber": 3.1
        }
      },
      {
        "name": "protein powder",
        "quantity": 30,
        "unit": "g",
        "nutritionData": {
          "calories": 120,
          "protein": 24,
          "carbs": 3,
          "fat": 1.5,
          "fiber": 0
        }
      },
      {
        "name": "almond milk",
        "quantity": 1,
        "unit": "cup",
        "nutritionData": {
          "calories": 40,
          "protein": 1,
          "carbs": 2,
          "fat": 2.5,
          "fiber": 0
        }
      }
    ],
    "servings": 1,
    "instructions": [
      "Add all ingredients to blender",
      "Blend until smooth",
      "Serve immediately"
    ],
    "customNotes": "Great for post-workout",
    "healthLabels": ["high-protein", "dairy-free"],
    "allergens": ["tree-nuts"],
    "dietLabels": ["vegetarian"],
    "cuisineTypes": ["american"],
    "mealTypes": ["breakfast"],
    "dishTypes": ["smoothie"],
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 0,
    "totalTimeMinutes": 5,
    "isPublic": true
  }'
```

### Complete Recipe Example (Greek Yogurt Breakfast Bowl)
```bash
curl -X POST "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Greek Yogurt Breakfast Bowl",
    "description": "A delicious and nutritious breakfast bowl with Greek yogurt, fresh fruit, and crunchy almonds. Perfect for a high-protein start to your day.",
    "ingredients": [
      {
        "name": "banana",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": {
          "calories": 105,
          "protein": 1.3,
          "carbs": 27,
          "fat": 0.4,
          "fiber": 3.1
        }
      },
      {
        "name": "Greek yogurt",
        "quantity": 1,
        "unit": "cup",
        "nutritionData": {
          "calories": 100,
          "protein": 17,
          "carbs": 6,
          "fat": 0.7,
          "fiber": 0
        }
      },
      {
        "name": "honey",
        "quantity": 1,
        "unit": "tablespoon",
        "nutritionData": {
          "calories": 64,
          "protein": 0.1,
          "carbs": 17.3,
          "fat": 0,
          "fiber": 0
        }
      },
      {
        "name": "almonds",
        "quantity": 0.25,
        "unit": "cup",
        "nutritionData": {
          "calories": 132,
          "protein": 4.9,
          "carbs": 5,
          "fat": 11.4,
          "fiber": 2.7
        }
      }
    ],
    "servings": 2,
    "instructions": [
      "Slice the banana into thin rounds",
      "Divide Greek yogurt evenly into two bowls",
      "Top each bowl with sliced banana",
      "Drizzle honey over the yogurt and fruit",
      "Sprinkle chopped almonds on top",
      "Serve immediately and enjoy!"
    ],
    "customNotes": "This recipe can be customized with different fruits based on season. Berries work great! Can be prepared the night before for meal prep.",
    "healthLabels": ["high-protein", "gluten-free", "vegetarian"],
    "allergens": ["dairy", "tree-nuts"],
    "dietLabels": ["vegetarian", "gluten-free"],
    "cuisineTypes": ["american"],
    "mealTypes": ["breakfast"],
    "dishTypes": ["bowl"],
    "prepTimeMinutes": 5,
    "cookTimeMinutes": 0,
    "totalTimeMinutes": 5,
    "isPublic": true
  }'
```

### Lunch Recipe Example (Quinoa Buddha Bowl)
```bash
curl -X POST "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Quinoa Buddha Bowl",
    "description": "Nutrient-packed vegetarian bowl with quinoa, roasted vegetables, and tahini dressing",
    "ingredients": [
      {
        "name": "quinoa",
        "quantity": 1,
        "unit": "cup",
        "nutritionData": {
          "calories": 222,
          "protein": 8.1,
          "carbs": 39.4,
          "fat": 3.6,
          "fiber": 5.2
        }
      },
      {
        "name": "chickpeas",
        "quantity": 0.5,
        "unit": "cup",
        "nutritionData": {
          "calories": 134,
          "protein": 7.3,
          "carbs": 22.5,
          "fat": 2.1,
          "fiber": 6.2
        }
      },
      {
        "name": "sweet potato",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": {
          "calories": 103,
          "protein": 2.3,
          "carbs": 23.6,
          "fat": 0.2,
          "fiber": 3.8
        }
      },
      {
        "name": "spinach",
        "quantity": 2,
        "unit": "cups",
        "nutritionData": {
          "calories": 14,
          "protein": 1.8,
          "carbs": 2.2,
          "fat": 0.2,
          "fiber": 1.4
        }
      },
      {
        "name": "tahini",
        "quantity": 2,
        "unit": "tablespoons",
        "nutritionData": {
          "calories": 178,
          "protein": 5.1,
          "carbs": 6.4,
          "fat": 16,
          "fiber": 2.8
        }
      }
    ],
    "servings": 2,
    "instructions": [
      "Cook quinoa according to package directions",
      "Roast cubed sweet potato at 400°F for 25 minutes",
      "Drain and rinse chickpeas",
      "Arrange quinoa, sweet potato, chickpeas, and fresh spinach in bowls",
      "Drizzle with tahini dressing",
      "Season with salt, pepper, and lemon juice to taste"
    ],
    "customNotes": "Can add other vegetables like roasted broccoli or bell peppers. Make tahini dressing by mixing tahini with lemon juice and water.",
    "healthLabels": ["high-fiber", "vegetarian", "vegan"],
    "allergens": ["sesame"],
    "dietLabels": ["vegetarian", "vegan"],
    "cuisineTypes": ["middle-eastern"],
    "mealTypes": ["lunch", "dinner"],
    "dishTypes": ["bowl"],
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 30,
    "totalTimeMinutes": 45,
    "isPublic": true
  }'
```

### Dinner Recipe Example (Grilled Salmon with Vegetables)
```bash
curl -X POST "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Grilled Salmon with Roasted Vegetables",
    "description": "Heart-healthy salmon fillet with colorful roasted vegetables",
    "ingredients": [
      {
        "name": "salmon fillet",
        "quantity": 6,
        "unit": "oz",
        "nutritionData": {
          "calories": 280,
          "protein": 34,
          "carbs": 0,
          "fat": 15,
          "fiber": 0
        }
      },
      {
        "name": "broccoli",
        "quantity": 1,
        "unit": "cup",
        "nutritionData": {
          "calories": 31,
          "protein": 2.5,
          "carbs": 6,
          "fat": 0.3,
          "fiber": 2.4
        }
      },
      {
        "name": "bell pepper",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": {
          "calories": 25,
          "protein": 1,
          "carbs": 6,
          "fat": 0.2,
          "fiber": 2
        }
      },
      {
        "name": "olive oil",
        "quantity": 1,
        "unit": "tablespoon",
        "nutritionData": {
          "calories": 119,
          "protein": 0,
          "carbs": 0,
          "fat": 13.5,
          "fiber": 0
        }
      }
    ],
    "servings": 1,
    "instructions": [
      "Preheat oven to 425°F",
      "Chop broccoli and bell pepper into bite-sized pieces",
      "Toss vegetables with olive oil, salt, and pepper",
      "Roast vegetables for 20-25 minutes",
      "Season salmon with salt, pepper, and lemon",
      "Grill or bake salmon for 12-15 minutes until cooked through",
      "Serve salmon over roasted vegetables"
    ],
    "customNotes": "Can substitute with other fish like cod or halibut. Add asparagus or zucchini for variety.",
    "healthLabels": ["high-protein", "low-carb", "gluten-free"],
    "allergens": ["fish"],
    "dietLabels": ["pescatarian", "gluten-free"],
    "cuisineTypes": ["american"],
    "mealTypes": ["dinner"],
    "dishTypes": ["main course"],
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 25,
    "totalTimeMinutes": 35,
    "isPublic": true
  }'
```

### Private Recipe Example
```bash
curl -X POST "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "My Secret Energy Balls",
    "description": "Personal recipe for quick energy snacks",
    "ingredients": [
      {
        "name": "dates",
        "quantity": 1,
        "unit": "cup",
        "nutritionData": {
          "calories": 415,
          "protein": 3.6,
          "carbs": 110,
          "fat": 0.6,
          "fiber": 11.8
        }
      },
      {
        "name": "almond butter",
        "quantity": 0.5,
        "unit": "cup",
        "nutritionData": {
          "calories": 614,
          "protein": 21,
          "carbs": 23,
          "fat": 56,
          "fiber": 12
        }
      },
      {
        "name": "chia seeds",
        "quantity": 2,
        "unit": "tablespoons",
        "nutritionData": {
          "calories": 97,
          "protein": 3.3,
          "carbs": 8.4,
          "fat": 6.1,
          "fiber": 6.9
        }
      }
    ],
    "servings": 12,
    "instructions": [
      "Add all ingredients to food processor",
      "Process until mixture sticks together",
      "Roll into 12 balls",
      "Refrigerate for 1 hour before serving"
    ],
    "customNotes": "Keep in fridge for up to 1 week. Great for pre-workout energy.",
    "healthLabels": ["high-fiber", "vegan"],
    "allergens": ["tree-nuts"],
    "dietLabels": ["vegan"],
    "cuisineTypes": ["american"],
    "mealTypes": ["snack"],
    "dishTypes": ["snack"],
    "prepTimeMinutes": 10,
    "cookTimeMinutes": 0,
    "totalTimeMinutes": 10,
    "isPublic": false
  }'
```

---

## 4. List Custom Recipes

### List All Your Custom Recipes
```bash
curl -X GET "${API_URL}/api/recipes/custom?page=1&limit=20" \
  -H "Authorization: Bearer ${TOKEN}"
```

### List with Pagination
```bash
# First page, 10 items
curl -X GET "${API_URL}/api/recipes/custom?page=1&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Second page, 10 items
curl -X GET "${API_URL}/api/recipes/custom?page=2&limit=10" \
  -H "Authorization: Bearer ${TOKEN}"

# Get 50 items per page
curl -X GET "${API_URL}/api/recipes/custom?page=1&limit=50" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Search Custom Recipes by Name
```bash
curl -X GET "${API_URL}/api/recipes/custom?search=smoothie" \
  -H "Authorization: Bearer ${TOKEN}"

curl -X GET "${API_URL}/api/recipes/custom?search=breakfast" \
  -H "Authorization: Bearer ${TOKEN}"

curl -X GET "${API_URL}/api/recipes/custom?search=bowl" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Filter by Health Labels
```bash
# High protein recipes
curl -X GET "${API_URL}/api/recipes/custom?healthLabels=high-protein" \
  -H "Authorization: Bearer ${TOKEN}"

# Gluten-free recipes
curl -X GET "${API_URL}/api/recipes/custom?healthLabels=gluten-free" \
  -H "Authorization: Bearer ${TOKEN}"

# Vegan recipes
curl -X GET "${API_URL}/api/recipes/custom?healthLabels=vegan" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Filter by Meal Type
```bash
# Breakfast recipes
curl -X GET "${API_URL}/api/recipes/custom?mealTypes=breakfast" \
  -H "Authorization: Bearer ${TOKEN}"

# Lunch recipes
curl -X GET "${API_URL}/api/recipes/custom?mealTypes=lunch" \
  -H "Authorization: Bearer ${TOKEN}"

# Dinner recipes
curl -X GET "${API_URL}/api/recipes/custom?mealTypes=dinner" \
  -H "Authorization: Bearer ${TOKEN}"

# Snack recipes
curl -X GET "${API_URL}/api/recipes/custom?mealTypes=snack" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Filter by Cuisine Type
```bash
curl -X GET "${API_URL}/api/recipes/custom?cuisineTypes=american" \
  -H "Authorization: Bearer ${TOKEN}"

curl -X GET "${API_URL}/api/recipes/custom?cuisineTypes=italian" \
  -H "Authorization: Bearer ${TOKEN}"

curl -X GET "${API_URL}/api/recipes/custom?cuisineTypes=asian" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Filter by Calories
```bash
# Low calorie (under 300)
curl -X GET "${API_URL}/api/recipes/custom?caloriesMax=300" \
  -H "Authorization: Bearer ${TOKEN}"

# Between 300-500 calories
curl -X GET "${API_URL}/api/recipes/custom?caloriesMin=300&caloriesMax=500" \
  -H "Authorization: Bearer ${TOKEN}"

# High calorie (over 500)
curl -X GET "${API_URL}/api/recipes/custom?caloriesMin=500" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Only Your Recipes (Exclude Public)
```bash
curl -X GET "${API_URL}/api/recipes/custom?includePublic=false" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Combined Filters
```bash
# High-protein breakfast recipes under 400 calories
curl -X GET "${API_URL}/api/recipes/custom?healthLabels=high-protein&mealTypes=breakfast&caloriesMax=400" \
  -H "Authorization: Bearer ${TOKEN}"

# Vegan lunch recipes
curl -X GET "${API_URL}/api/recipes/custom?healthLabels=vegan&mealTypes=lunch" \
  -H "Authorization: Bearer ${TOKEN}"

# Search gluten-free smoothies
curl -X GET "${API_URL}/api/recipes/custom?search=smoothie&healthLabels=gluten-free" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 5. Get Recipe Details

### Get Specific Recipe by ID
```bash
# Replace RECIPE_ID with actual ID
curl -X GET "${API_URL}/api/recipes/RECIPE_ID/details" \
  -H "Authorization: Bearer ${TOKEN}"

# Example with actual ID
curl -X GET "${API_URL}/api/recipes/5501a545-8199-4f6e-b086-ef6ee1adc42c/details" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 6. Update Custom Recipe

### Update Recipe Name
```bash
curl -X PUT "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "RECIPE_ID",
    "recipeName": "Updated Recipe Name"
  }'
```

### Update Description
```bash
curl -X PUT "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "RECIPE_ID",
    "description": "Updated description with more details"
  }'
```

### Update Visibility (Make Private)
```bash
curl -X PUT "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "RECIPE_ID",
    "isPublic": false
  }'
```

### Update Visibility (Make Public)
```bash
curl -X PUT "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "RECIPE_ID",
    "isPublic": true
  }'
```

### Update Custom Notes
```bash
curl -X PUT "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "RECIPE_ID",
    "customNotes": "Updated notes: Best when served fresh. Can meal prep for 3 days."
  }'
```

### Update Multiple Fields
```bash
curl -X PUT "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "RECIPE_ID",
    "recipeName": "Updated Recipe Name",
    "description": "New improved description",
    "isPublic": true,
    "customNotes": "Updated cooking tips"
  }'
```

### Update Ingredients (Recalculates Nutrition)
```bash
curl -X PUT "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "RECIPE_ID",
    "ingredients": [
      {
        "name": "banana",
        "quantity": 2,
        "unit": "medium",
        "nutritionData": {
          "calories": 210,
          "protein": 2.6,
          "carbs": 54,
          "fat": 0.8,
          "fiber": 6.2
        }
      }
    ]
  }'
```

---

## 7. Delete Custom Recipe

### Delete by ID
```bash
# Replace RECIPE_ID with actual ID
curl -X DELETE "${API_URL}/api/recipes/custom?id=RECIPE_ID" \
  -H "Authorization: Bearer ${TOKEN}"

# Example
curl -X DELETE "${API_URL}/api/recipes/custom?id=5501a545-8199-4f6e-b086-ef6ee1adc42c" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 8. Search Recipes (Including Custom)

### Search All Sources Including Custom Recipes
```bash
# Search everything
curl -X GET "${API_URL}/api/recipe-search?query=protein&provider=both&includeCustom=true" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Search Only Custom Recipes
```bash
curl -X GET "${API_URL}/api/recipe-search?query=smoothie&provider=manual" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Search with Health Labels
```bash
# High-protein recipes from all sources
curl -X GET "${API_URL}/api/recipe-search?health=high-protein&provider=both&includeCustom=true" \
  -H "Authorization: Bearer ${TOKEN}"

# Vegan recipes including custom
curl -X GET "${API_URL}/api/recipe-search?health=vegan&provider=both&includeCustom=true" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Search External Only (Exclude Custom)
```bash
curl -X GET "${API_URL}/api/recipe-search?query=chicken&provider=both&includeCustom=false" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## 9. Complete Workflow Example

### Create a Recipe from Scratch (Step by Step)
```bash
# Step 1: Search for first ingredient
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=oats" \
  -H "Authorization: Bearer ${TOKEN}"

# Step 2: Get nutrition for oats
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=oats&amount=0.5&unit=cup" \
  -H "Authorization: Bearer ${TOKEN}"

# Step 3: Search for second ingredient
curl -X GET "${API_URL}/api/ingredients/autocomplete?q=blueberries" \
  -H "Authorization: Bearer ${TOKEN}"

# Step 4: Get nutrition for blueberries
curl -X GET "${API_URL}/api/ingredients/nutrition?ingredient=blueberries&amount=0.5&unit=cup" \
  -H "Authorization: Bearer ${TOKEN}"

# Step 5: Create the recipe with collected data
curl -X POST "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Overnight Oats with Blueberries",
    "description": "Easy overnight oats recipe",
    "ingredients": [
      {
        "name": "oats",
        "quantity": 0.5,
        "unit": "cup",
        "nutritionData": {
          "calories": 150,
          "protein": 5,
          "carbs": 27,
          "fat": 3,
          "fiber": 4
        }
      },
      {
        "name": "blueberries",
        "quantity": 0.5,
        "unit": "cup",
        "nutritionData": {
          "calories": 42,
          "protein": 0.5,
          "carbs": 10.7,
          "fat": 0.2,
          "fiber": 1.8
        }
      }
    ],
    "servings": 1,
    "instructions": [
      "Mix oats with milk in a jar",
      "Add blueberries on top",
      "Refrigerate overnight",
      "Enjoy cold in the morning"
    ],
    "isPublic": true
  }'
```

---

## 10. Useful Shortcuts

### Quick Recipe Creation (Minimal Fields)
```bash
curl -X POST "${API_URL}/api/recipes/custom" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "recipeName": "Quick Snack",
    "ingredients": [
      {
        "name": "apple",
        "quantity": 1,
        "unit": "medium",
        "nutritionData": {
          "calories": 95,
          "protein": 0.5,
          "carbs": 25,
          "fat": 0.3,
          "fiber": 4.4
        }
      }
    ],
    "servings": 1,
    "isPublic": false
  }'
```

### Get Latest Custom Recipes
```bash
curl -X GET "${API_URL}/api/recipes/custom?page=1&limit=5" \
  -H "Authorization: Bearer ${TOKEN}"
```

### Search Your Recipes
```bash
curl -X GET "${API_URL}/api/recipes/custom?search=YOUR_SEARCH_TERM" \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Common Measurement Units

### Volume
- `teaspoon`, `tsp`
- `tablespoon`, `tbsp`
- `cup`
- `ml`, `milliliter`
- `l`, `liter`
- `fl oz`, `fluid ounce`

### Weight
- `g`, `gram`
- `kg`, `kilogram`
- `oz`, `ounce`
- `lb`, `pound`

### Count
- `piece`, `pieces`
- `small`, `medium`, `large`
- `whole`
- `slice`, `slices`

---

## Response Format Reference

### Successful Recipe Creation
```json
{
  "success": true,
  "message": "Custom recipe created successfully",
  "data": {
    "id": "uuid",
    "recipeName": "...",
    "caloriesPerServing": 200.5,
    "proteinPerServingG": 11.65,
    "servings": 2,
    "isPublic": true
  }
}
```

### Error Response
```json
{
  "error": "Validation error",
  "message": "recipeName is required"
}
```

---

## Tips

1. **Always get nutrition data first** before creating a recipe
2. **Use autocomplete** to find the correct ingredient names
3. **Test with `isPublic: false`** when experimenting
4. **Save recipe IDs** if you plan to update or delete later
5. **Use filters** to organize and find your recipes easily

---

## Need Help?

- Check the main documentation: `CUSTOM_RECIPE_CREATION.md`
- Run the automated test script: `./test-custom-recipes.sh`
- Full workflow script: `./test-manual-recipe-creation.sh`

