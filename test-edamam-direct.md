# Direct Edamam Meal Planner API Test

Let's test the Edamam API directly with hardcoded values to see if it's working.

## 🔑 Your Credentials

```bash
APP_ID="5bce8081"
APP_KEY="c80ecbf8968d48dfe51d395f6f19279a"
USER_ID="nutritionist1"

# Create base64 credentials
CREDENTIALS=$(echo -n "${APP_ID}:${APP_KEY}" | base64)
echo "Base64 credentials: $CREDENTIALS"
```

## 🧪 Test 1: Simple Meal Plan Request

```bash
curl --location 'https://api.edamam.com/api/meal-planner/v1/5bce8081/select?type=public' \
--header 'accept: application/json' \
--header 'Content-Type: application/json' \
--header 'Edamam-Account-User: nutritionist1' \
--header 'Authorization: Basic NWJjZTgwODE6YzgwZWNiZjg5NjhkNDhkZmU1MWQzOTVmNmYxOTI3OWE=' \
--data '{
  "size": 1,
  "plan": {
    "sections": {
      "Breakfast": {
        "accept": {
          "all": [
            {
              "dish": ["egg", "cereals", "bread"]
            },
            {
              "meal": ["breakfast"]
            }
          ]
        },
        "fit": {
          "ENERC_KCAL": {
            "min": 400,
            "max": 600
          }
        }
      },
      "Lunch": {
        "accept": {
          "all": [
            {
              "dish": ["main course", "pasta", "salad"]
            },
            {
              "meal": ["lunch/dinner"]
            }
          ]
        },
        "fit": {
          "ENERC_KCAL": {
            "min": 600,
            "max": 800
          }
        }
      },
      "Dinner": {
        "accept": {
          "all": [
            {
              "dish": ["main course", "pasta", "salad"]
            },
            {
              "meal": ["lunch/dinner"]
            }
          ]
        },
        "fit": {
          "ENERC_KCAL": {
            "min": 600,
            "max": 800
          }
        }
      }
    }
  }
}'
```

## 🥩 Test 2: With Dietary Restrictions

```bash
curl --location 'https://api.edamam.com/api/meal-planner/v1/5bce8081/select?type=public' \
--header 'accept: application/json' \
--header 'Content-Type: application/json' \
--header 'Edamam-Account-User: nutritionist1' \
--header 'Authorization: Basic NWJjZTgwODE6YzgwZWNiZjg5NjhkNDhkZmU1MWQzOTVmNmYxOTI3OWE=' \
--data '{
  "size": 1,
  "plan": {
    "accept": {
      "all": [
        {
          "health": ["vegetarian", "high-protein"]
        }
      ]
    },
    "sections": {
      "Breakfast": {
        "accept": {
          "all": [
            {
              "dish": ["egg", "cereals", "bread"]
            },
            {
              "meal": ["breakfast"]
            }
          ]
        },
        "fit": {
          "ENERC_KCAL": {
            "min": 400,
            "max": 600
          }
        }
      },
      "Lunch": {
        "accept": {
          "all": [
            {
              "dish": ["main course", "pasta", "salad"]
            },
            {
              "meal": ["lunch/dinner"]
            }
          ]
        },
        "fit": {
          "ENERC_KCAL": {
            "min": 600,
            "max": 800
          }
        }
      },
      "Dinner": {
        "accept": {
          "all": [
            {
              "dish": ["main course", "pasta", "salad"]
            },
            {
              "meal": ["lunch/dinner"]
            }
          ]
        },
        "fit": {
          "ENERC_KCAL": {
            "min": 600,
            "max": 800
          }
        }
      }
    }
  }
}'
```

## 🔍 What to Look For

1. **Response Status**: Should be 200 OK
2. **Response Body**: Should contain `selection` array with recipe URIs
3. **Error Messages**: If it fails, what error do you get?

## 📝 Expected Success Response

```json
{
  "selection": [
    {
      "sections": {
        "Breakfast": {
          "assigned": "http://www.edamam.com/ontologies/edamam.owl#recipe_abc123",
          "_links": {
            "self": {
              "href": "https://api.edamam.com/api/recipes/v2/abc123",
              "title": "Recipe details"
            }
          }
        }
      }
    }
  ],
  "status": "OK"
}
```

## 🚨 If It Fails

If you get an error, please share:
1. **HTTP Status Code**
2. **Error Message**
3. **Response Body**

This will help us understand what's wrong with the Edamam API integration.

Try these curl commands first and let me know what response you get!
