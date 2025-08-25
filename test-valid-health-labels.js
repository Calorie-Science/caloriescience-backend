const fetch = require('node-fetch');

// Edamam credentials
const APP_ID = '5bce8081';
const APP_KEY = 'c80ecbf8968d48dfe51d395f6f19279a';

// Test individual health labels to see which ones actually work
async function testValidHealthLabels() {
  console.log('🧪 Testing individual health labels to find which ones work...\n');

  // Test these health labels one by one
  const healthLabelsToTest = [
    'vegetarian',
    'vegan', 
    'gluten-free',
    'dairy-free',
    'egg-free',
    'fish-free',
    'shellfish-free',
    'peanut-free',
    'tree-nut-free',
    'soy-free',
    'wheat-free',
    'celery-free',
    'mustard-free',
    'sesame-free',
    'lupine-free',
    'mollusk-free',
    'sulfite-free',
    'fodmap-free',
    'alcohol-free',
    'pork-free',
    'red-meat-free',
    'crustacean-free',
    'balanced',
    'high-fiber',
    'high-protein',
    'low-carb',
    'low-fat',
    'low-sodium',
    'sugar-conscious',
    'low-sugar'
  ];

  for (const label of healthLabelsToTest) {
    console.log(`\n--- Testing: ${label} ---`);
    
    const testRequest = {
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

    // Add the health label to test
    testRequest.plan.accept = {
      all: [
        {
          health: [label]
        }
      ]
    };

    try {
      const response = await fetch(`https://api.edamam.com/api/meal-planner/v1/${APP_ID}/select?type=public`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'Edamam-Account-User': 'test',
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`${APP_ID}:${APP_KEY}`).toString('base64')}`
        },
        body: JSON.stringify(testRequest)
      });

      console.log('Status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ SUCCESS - Got recipes:', data.selection?.[0]?.sections ? 'Yes' : 'No');
        if (data.selection?.[0]?.sections) {
          const firstDay = data.selection[0];
          Object.entries(firstDay.sections).forEach(([mealType, section]) => {
            if (section.assigned) {
              console.log(`  ${mealType}: Recipe assigned`);
            } else {
              console.log(`  ${mealType}: No recipe`);
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
}

testValidHealthLabels().catch(console.error);
