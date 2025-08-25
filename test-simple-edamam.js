const fetch = require('node-fetch');

// Edamam credentials
const APP_ID = '5bce8081';
const APP_KEY = 'c80ecbf8968d48dfe51d395f6f19279a';

// Test a simple meal plan request similar to what our API sends
async function testSimpleMealPlan() {
  console.log('🧪 Testing simple meal plan request...\n');

  const simpleRequest = {
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
              "min": 398,
              "max": 740
            }
          }
        },
        "Lunch": {
          "accept": {
            "all": [
              {
                "meal": ["lunch/dinner"]
              },
              {
                "dish": ["main course", "pasta", "salad"]
              }
            ]
          },
          "fit": {
            "ENERC_KCAL": {
              "min": 557,
              "max": 1035
            }
          }
        },
        "Dinner": {
          "accept": {
            "all": [
              {
                "meal": ["lunch/dinner"]
              },
              {
                "dish": ["main course", "pasta", "salad"]
              }
            ]
          },
          "fit": {
            "ENERC_KCAL": {
              "min": 557,
              "max": 1035
            }
          }
        },
        "Snack": {
          "accept": {
            "all": [
              {
                "meal": ["snack"]
              },
              {
                "dish": ["biscuits and cookies", "sweets"]
              }
            ]
          },
          "fit": {
            "ENERC_KCAL": {
              "min": 80,
              "max": 148
            }
          }
        }
      }
    }
  };

  try {
    console.log('Request:', JSON.stringify(simpleRequest, null, 2));
    
    const response = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Edamam-Account-User': 'test',
        'Content-Type': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
      },
      body: JSON.stringify(simpleRequest)
    });

    console.log('\nResponse Status:', response.status);
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ SUCCESS!');
      console.log('Response:', JSON.stringify(data, null, 2));
      
      // Test if we can extract recipe URIs
      if (data.selection && data.selection.length > 0) {
        console.log('\n🔍 Recipe URIs found:');
        const firstDay = data.selection[0];
        Object.entries(firstDay.sections).forEach(([mealType, section]) => {
          if (section.assigned) {
            console.log(`${mealType}: ${section.assigned}`);
          } else {
            console.log(`${mealType}: No recipe assigned`);
          }
        });
      }
    } else {
      const error = await response.text();
      console.log('❌ ERROR:', error);
    }
  } catch (error) {
    console.log('❌ EXCEPTION:', error.message);
  }
}

testSimpleMealPlan().catch(console.error);
