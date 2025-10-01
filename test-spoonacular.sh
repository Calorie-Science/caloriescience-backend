#!/bin/bash

# Test Spoonacular API with different parameters
API_KEY="41788d9689d442ecb2e386bcf93d4bf7"

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
