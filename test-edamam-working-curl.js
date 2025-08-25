const fetch = require('node-fetch');

// Edamam credentials from documentation
const APP_ID = '5bce8081';
const APP_KEY = 'c80ecbf8968d48dfe51d395f6f19279a';

// Test the EXACT working example from Edamam documentation
async function testWorkingExample() {
  console.log('🧪 Testing EXACT working example from Edamam documentation...\n');

  // This is the exact request from the working documentation
  const workingRequest = {
    "size": 7,
    "plan": {
      "accept": {
        "all": [
          {
            "health": [
              "SOY_FREE",
              "FISH_FREE",
              "MEDITERRANEAN"
            ]
          }
        ]
      },
      "fit": {
        "ENERC_KCAL": {
          "min": 1000,
          "max": 2000
        },
        "SUGAR.added": {
          "max": 20
        }
      },
      "sections": {
        "Breakfast": {
          "accept": {
            "all": [
              {
                "dish": [
                  "drinks",
                  "egg",
                  "biscuits and cookies",
                  "bread",
                  "pancake",
                  "cereals"
                ]
              },
              {
                "meal": [
                  "breakfast"
                ]
              }
            ]
          },
          "fit": {
            "ENERC_KCAL": {
              "min": 100,
              "max": 600
            }
          }
        },
        "Lunch": {
          "accept": {
            "all": [
              {
                "dish": [
                  "main course",
                  "pasta",
                  "egg",
                  "salad",
                  "soup",
                  "sandwiches",
                  "pizza",
                  "seafood"
                ]
              },
              {
                "meal": [
                  "lunch/dinner"
                ]
              }
            ]
          },
          "fit": {
            "ENERC_KCAL": {
              "min": 300,
              "max": 900
            }
          }
        },
        "Dinner": {
          "accept": {
            "all": [
              {
                "dish": [
                  "seafood",
                  "egg",
                  "salad",
                  "pizza",
                  "pasta",
                  "main course"
                ]
              },
              {
                "meal": [
                  "lunch/dinner"
                ]
              }
            ]
          },
          "fit": {
            "ENERC_KCAL": {
              "min": 200,
              "max": 900
            }
          }
        }
      }
    }
  };

  try {
    console.log('Request URL:', `https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`);
    console.log('Request body:', JSON.stringify(workingRequest, null, 2));
    
    const response = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
      },
      body: JSON.stringify(workingRequest)
    });

    console.log('\nResponse Status:', response.status);
    console.log('Response Status Text:', response.statusText);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      const error = await response.text();
      console.log('❌ ERROR:', error);
      
      // Also try with the exact credentials from the working curl
      console.log('\n🧪 Trying with exact credentials from working curl...');
      const workingCredentials = 'NWJjZTgwODE6YzgwZWNiZjg5NjhkNDhkZmU1MWQzOTVmNmYxOTI3OWE=';
      
      const response2 = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${workingCredentials}`
        },
        body: JSON.stringify(workingRequest)
      });

      console.log('Response 2 Status:', response2.status);
      if (response2.ok) {
        const data2 = await response2.json();
        console.log('✅ SUCCESS with working credentials!');
        console.log('Response:', JSON.stringify(data2, null, 2));
      } else {
        const error2 = await response2.text();
        console.log('❌ Still ERROR:', error2);
      }
    }
  } catch (error) {
    console.log('❌ EXCEPTION:', error.message);
  }
}

testWorkingExample().catch(console.error);
