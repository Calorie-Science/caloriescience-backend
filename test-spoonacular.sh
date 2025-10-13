#!/bin/bash

# Test Spoonacular API with different parameters
# Make sure to set SPOONACULAR_API_KEY environment variable before running
API_KEY="${SPOONACULAR_API_KEY}"

if [ -z "$API_KEY" ]; then
  echo "Error: SPOONACULAR_API_KEY environment variable is not set"
  echo "Usage: SPOONACULAR_API_KEY=your_key_here ./test-spoonacular.sh"
  exit 1
fi

echo "=== Testing Spoonacular API ==="
echo ""

echo "1. Basic search (breakfast):"
curl -X GET "https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&query=breakfast&number=3&sort=random"
echo ""
echo ""

echo "2. Search with meal type (main course):"
curl -X GET "https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&query=lunch&type=main%20course&number=3&sort=random"
echo ""
echo ""

echo "3. Search with calorie range:"
curl -X GET "https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&query=dinner&minCalories=400&maxCalories=600&number=3&sort=random"
echo ""
echo ""

echo "4. Search with diet filter:"
curl -X GET "https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&query=vegetarian&diet=vegetarian&number=3&sort=random"
echo ""
echo ""

echo "5. Search with intolerances:"
curl -X GET "https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&query=gluten%20free&intolerances=gluten&number=3&sort=random"
echo ""
echo ""

echo "6. Combined search (like our API):"
curl -X GET "https://api.spoonacular.com/recipes/complexSearch?apiKey=${API_KEY}&query=breakfast%20morning%20eggs%20toast%20cereal&type=breakfast&minCalories=400&maxCalories=600&number=3&sort=random"
echo ""
echo ""

echo "=== Test completed ==="
