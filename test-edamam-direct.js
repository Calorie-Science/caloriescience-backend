const fetch = require('node-fetch');

// Edamam credentials
const APP_ID = '5bce8081';
const APP_KEY = 'c80ecbf8968d48dfe51d395f6f19279a';

// Test different request formats
async function testEdamamAPI() {
  console.log('🧪 Testing Edamam Meal Planner API directly...\n');

  // Test 1: Basic working request (from documentation)
  console.log('=== TEST 1: Basic working request ===');
  const basicRequest = {
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
    const response1 = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
      },
      body: JSON.stringify(basicRequest)
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

  console.log('\n=== TEST 2: Request with health labels ===');
  const healthRequest = {
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
    const response2 = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
      },
      body: JSON.stringify(healthRequest)
    });

    console.log('Status:', response2.status);
    if (response2.ok) {
      const data = await response2.json();
      console.log('✅ SUCCESS:', JSON.stringify(data, null, 2));
    } else {
      const error = await response2.text();
      console.log('❌ ERROR:', error);
    }
  } catch (error) {
    console.log('❌ EXCEPTION:', error.message);
  }

  console.log('\n=== TEST 3: Request with macro filters ===');
  const macroRequest = {
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
            },
            "PROCNT": {
              "min": 90,
              "max": 166
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
      body: JSON.stringify(macroRequest)
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

  console.log('\n=== TEST 4: Request with cuisine type ===');
  const cuisineRequest = {
    "size": 1,
    "plan": {
      "accept": {
        "all": [
          {
            "cuisineType": ["mediterranean"]
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
    const response4 = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
      },
      body: JSON.stringify(cuisineRequest)
    });

    console.log('Status:', response4.status);
    if (response4.ok) {
      const data = await response4.json();
      console.log('✅ SUCCESS:', JSON.stringify(data, null, 2));
    } else {
      const error = await response4.text();
      console.log('❌ ERROR:', error);
    }
  } catch (error) {
    console.log('❌ EXCEPTION:', error.message);
  }

  console.log('\n=== TEST 5: Our exact request structure ===');
  const ourRequest = {
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
                "dish": ["egg", "cereals", "bread", "pancake", "biscuits and cookies"]
              }
            ]
          },
          "fit": {
            "ENERC_KCAL": {
              "min": 398,
              "max": 740
            },
            "PROCNT": {
              "min": 90,
              "max": 166
            },
            "CHOCDF": {
              "min": 219,
              "max": 407
            },
            "FAT": {
              "min": 48,
              "max": 90
            }
          }
        }
      },
      "accept": {
        "all": [
          {
            "health": ["vegetarian", "high-protein"]
          },
          {
            "cuisineType": ["mediterranean"]
          }
        ]
      }
    }
  };

  try {
    const response5 = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
      },
      body: JSON.stringify(ourRequest)
    });

    console.log('Status:', response5.status);
    if (response5.ok) {
      const data = await response5.json();
      console.log('✅ SUCCESS:', JSON.stringify(data, null, 2));
    } else {
      const error = await response5.text();
      console.log('❌ ERROR:', error);
    }
  } catch (error) {
    console.log('❌ EXCEPTION:', error.message);
  }
}

testEdamamAPI().catch(console.error);
