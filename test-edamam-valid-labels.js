const fetch = require('node-fetch');

// Edamam credentials
const APP_ID = '5bce8081';
const APP_KEY = 'c80ecbf8968d48dfe51d395f6f19279a';

// Test with valid health labels from documentation
async function testValidLabels() {
  console.log('🧪 Testing Edamam with valid labels from documentation...\n');

  // Test 1: Basic working request with valid health labels
  console.log('=== TEST 1: Valid health labels ===');
  const validHealthRequest = {
    "size": 1,
    "plan": {
      "accept": {
        "all": [
          {
            "health": ["vegetarian", "high-fiber"]
          }
        ]
      },
      "sections": {
        "Breakfast": {
          "accept": {
            "all": [
              {
                "meal": ["breakfast"]
              },
              {
                "dish": ["egg", "cereals", "bread"]
              }
            ]
          },
          "fit": {
            "ENERC_KCAL": {
              "min": 100,
              "max": 600
            }
          }
        }
      }
    }
  };

  try {
    const response1 = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
      },
      body: JSON.stringify(validHealthRequest)
    });

    console.log('Status:', response1.status);
    if (response1.ok) {
      const data = await response1.json();
      console.log('✅ SUCCESS:', JSON.stringify(data, null, 2));
    } else {
      const error = await response1.text();
      console.log('❌ ERROR:', error);
    }
  } catch (error) {
    console.log('❌ EXCEPTION:', error.message);
  }

  // Test 2: Test different health label combinations
  console.log('\n=== TEST 2: Different health label combinations ===');
  const healthLabelsToTest = [
    ["vegetarian"],
    ["high-fiber"],
    ["low-sodium"],
    ["gluten-free"],
    ["dairy-free"],
    ["vegan"]
  ];

  for (const labels of healthLabelsToTest) {
    console.log(`\n--- Testing: ${labels.join(', ')} ---`);
    
    const testRequest = {
      "size": 1,
      "plan": {
        "accept": {
          "all": [
            {
              "health": labels
            }
          ]
        },
        "sections": {
          "Breakfast": {
            "accept": {
              "all": [
                {
                  "meal": ["breakfast"]
                },
                {
                  "dish": ["egg", "cereals", "bread"]
                }
              ]
            },
            "fit": {
              "ENERC_KCAL": {
                "min": 100,
                "max": 600
              }
            }
          }
        }
      }
    };

    try {
      const response = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
        },
        body: JSON.stringify(testRequest)
      });

      console.log('Status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS - Got recipes:', data.selection?.[0]?.sections ? 'Yes' : 'No');
      } else {
        const error = await response.text();
        console.log('❌ ERROR:', error);
      }
    } catch (error) {
      console.log('❌ EXCEPTION:', error.message);
    }
  }

  // Test 3: Test without any accept filters (just sections)
  console.log('\n=== TEST 3: No accept filters, just sections ===');
  const noAcceptRequest = {
    "size": 1,
    "plan": {
      "sections": {
        "Breakfast": {
          "accept": {
            "all": [
              {
                "meal": ["breakfast"]
              },
              {
                "dish": ["egg", "cereals", "bread"]
              }
            ]
          },
          "fit": {
            "ENERC_KCAL": {
              "min": 100,
              "max": 600
            }
          }
        }
      }
    }
  };

  try {
    const response3 = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
      },
      body: JSON.stringify(noAcceptRequest)
    });

    console.log('Status:', response3.status);
    if (response3.ok) {
      const data = await response3.json();
      console.log('✅ SUCCESS:', JSON.stringify(data, null, 2));
    } else {
      const error = await response3.text();
      console.log('❌ ERROR:', error);
    }
  } catch (error) {
    console.log('❌ EXCEPTION:', error.message);
  }
}

testValidLabels().catch(console.error);
