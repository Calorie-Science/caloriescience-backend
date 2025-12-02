#!/bin/bash

# Test script for body measurements and formulas API
# Run this after the staging deployment completes

BASE_URL="https://caloriescience-app-env-staging-mrinals-projects-b39127c8.vercel.app"
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImZjZjg4ZTQ0LWRiOTctNDk0ZC05YTQ5LThjYzkxZTcxNjczNCIsImVtYWlsIjoibXJpbmFsQGNhbG9yaWVzY2llbmNlLmFpIiwicm9sZSI6Im51dHJpdGlvbmlzdCIsImlhdCI6MTc2NDU2NDg1NywiZXhwIjoxNzY1MTY5NjU3fQ.o9iw55iq8c7LJnprMaBCREionHDUZ9UbhkiV9wmjSQU"

echo "=========================================="
echo "Test 1: Get all formulas (no age/gender required)"
echo "=========================================="
curl -s "$BASE_URL/api/calculations/formulas" \
  -H "authorization: Bearer $TOKEN" | python3 -m json.tool | head -50

echo ""
echo "=========================================="
echo "Test 2: Get formulas filtered by country (USA)"
echo "=========================================="
curl -s "$BASE_URL/api/calculations/formulas?country=usa" \
  -H "authorization: Bearer $TOKEN" | python3 -m json.tool | head -50

echo ""
echo "=========================================="
echo "Test 3: Create client with body measurements"
echo "=========================================="
curl -s -X POST "$BASE_URL/api/clients" \
  -H "authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "TestBody",
    "lastName": "Measurements",
    "email": "test.body.measurements2@example.com",
    "dateOfBirth": "1995-03-20",
    "gender": "female",
    "location": "USA",
    "heightCm": 165,
    "weightKg": 60,
    "waistCircumferenceCm": 75.5,
    "hipCircumferenceCm": 90.2,
    "bodyFatPercentage": 22.5,
    "activityLevel": "lightly_active",
    "formulaId": 1,
    "status": "active"
  }' | python3 -m json.tool | grep -A5 -B5 "waist\|hip\|bodyFat"

echo ""
echo "=========================================="
echo "Test 4: Get client details (should return body measurements in camelCase)"
echo "=========================================="
# Extract client ID from previous response and use it here
# You'll need to manually replace CLIENT_ID after creating the client
# curl -s "$BASE_URL/api/clients/CLIENT_ID" \
#   -H "authorization: Bearer $TOKEN" | python3 -m json.tool | grep -A2 -B2 "waist\|hip\|bodyFat"

echo ""
echo "Done! Check the responses above."
echo "If you see camelCase fields (waistCircumferenceCm, hipCircumferenceCm, bodyFatPercentage),"
echo "then everything is working correctly!"
