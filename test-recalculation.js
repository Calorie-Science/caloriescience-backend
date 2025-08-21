// Test file for recalculation API logic
// This simulates the recalculation logic without making actual API calls

// Mock client data
const mockClient = {
  id: "6170d5c8-0c4a-4f1c-af9e-af3ed44ce6d5",
  weight_kg: 60,
  height_cm: 165,
  eer_calories: 2200,
  location: "india",
  gender: "female",
  activity_level: "moderately_active",
  date_of_birth: "1997-03-15"
};

// Mock calculation functions
function mockCalculateEER(input) {
  // Simple mock calculation
  const bmr = 655 + (9.6 * input.weight_kg) + (1.8 * input.height_cm) - (4.7 * input.age);
  const pal = 1.55; // moderately_active
  const eer = bmr * pal;
  
  return {
    eer: Math.round(eer),
    bmr: Math.round(bmr),
    pal: pal,
    formula_used: "Harris-Benedict + PAL adjustments",
    guideline_country: input.country
  };
}

function mockCalculateMacros(input) {
  // Simple mock macro calculation
  const proteinMin = (input.eer * 0.15) / 4; // 15% of calories
  const proteinMax = (input.eer * 0.25) / 4; // 25% of calories
  const carbsMin = (input.eer * 0.40) / 4;  // 40% of calories
  const carbsMax = (input.eer * 0.55) / 4;  // 55% of calories
  const fatMin = (input.eer * 0.20) / 9;    // 20% of calories
  const fatMax = (input.eer * 0.30) / 9;    // 30% of calories
  
  return {
    Protein: { min: Math.round(proteinMin), max: Math.round(proteinMax), unit: 'g', note: '15-25% of total calories' },
    Carbohydrates: { min: Math.round(carbsMin), max: Math.round(carbsMax), unit: 'g', note: '40-55% of total calories' },
    'Total Fat': { min: Math.round(fatMin), max: Math.round(fatMax), unit: 'g', note: '20-30% of total calories' }
  };
}

function mockCalculateMicronutrients(input) {
  // Simple mock micronutrient calculation
  return {
    micronutrients: {
      vitamin_a: { amount: 750, unit: 'mcg' },
      vitamin_c: { amount: 90, unit: 'mg' },
      calcium: { amount: 1000, unit: 'mg' },
      iron: { amount: 8, unit: 'mg' }
    }
  };
}

function categorizeMicronutrients(micronutrients) {
  const categorized = {
    vitamins: {},
    minerals: {},
    miscellaneous: {}
  };

  const VITAMIN_KEYS = ['vitamin_a', 'vitamin_c'];
  const MINERAL_KEYS = ['calcium', 'iron'];

  Object.entries(micronutrients).forEach(([key, value]) => {
    if (VITAMIN_KEYS.includes(key)) {
      categorized.vitamins[key] = value;
    } else if (MINERAL_KEYS.includes(key)) {
      categorized.minerals[key] = value;
    } else {
      categorized.miscellaneous[key] = value;
    }
  });

  return categorized;
}

function calculateAge(dateOfBirth) {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
}

// Test recalculation logic
function testRecalculation(clientId, weightKg, heightCm, eerCalories) {
  console.log('=== Testing Recalculation ===');
  console.log('Client ID:', clientId);
  console.log('Weight change:', weightKg !== undefined ? `${mockClient.weight_kg}kg → ${weightKg}kg` : 'No change');
  console.log('Height change:', heightCm !== undefined ? `${mockClient.height_cm}cm → ${heightCm}cm` : 'No change');
  console.log('EER change:', eerCalories !== undefined ? `${mockClient.eer_calories}kcal → ${eerCalories}kcal` : 'No change');
  console.log('');

  const results = {};
  const age = calculateAge(mockClient.date_of_birth);

  // If weight or height changed, recalculate EER
  if (weightKg !== undefined || heightCm !== undefined) {
    try {
      const calculationInput = {
        country: mockClient.location || 'UK',
        age: age,
        gender: mockClient.gender,
        height_cm: heightCm || mockClient.height_cm,
        weight_kg: weightKg || mockClient.weight_kg,
        activity_level: mockClient.activity_level
      };

      const eerResult = mockCalculateEER(calculationInput);
      results.eer = {
        calories: eerResult.eer,
        bmr: eerResult.bmr,
        pal: eerResult.pal,
        formula_used: eerResult.formula_used,
        guideline_country: eerResult.guideline_country
      };

      console.log('✅ EER recalculated:', results.eer);

      // If EER changed, recalculate macros
      if (eerResult.eer !== mockClient.eer_calories) {
        try {
          const macrosResult = mockCalculateMacros({
            eer: eerResult.eer,
            country: calculationInput.country,
            age: calculationInput.age,
            gender: calculationInput.gender,
            weight_kg: calculationInput.weight_kg
          });

          results.macros = {
            ranges: {
              protein: macrosResult.Protein,
              carbs: macrosResult.Carbohydrates,
              fat: macrosResult['Total Fat']
            }
          };

          console.log('✅ Macros recalculated for new EER:', eerResult.eer);
        } catch (macrosError) {
          console.log('❌ Macros calculation failed:', macrosError.message);
          results.macros_error = 'Failed to calculate macros';
        }
      }

      // If weight changed, recalculate micronutrients
      if (weightKg !== undefined && weightKg !== mockClient.weight_kg) {
        try {
          const microResult = mockCalculateMicronutrients({
            location: mockClient.location || 'UK',
            age: age,
            gender: mockClient.gender
          });

          results.micronutrients = categorizeMicronutrients(microResult.micronutrients);
          console.log('✅ Micronutrients recalculated for new weight:', weightKg);
        } catch (microError) {
          console.log('❌ Micronutrients calculation failed:', microError.message);
          results.micronutrients_error = 'Failed to calculate micronutrients';
        }
      }
    } catch (eerError) {
      console.log('❌ EER calculation failed:', eerError.message);
      results.eer_error = 'Failed to calculate EER';
    }
  }

  // If only EER calories changed manually
  if (eerCalories !== undefined && weightKg === undefined && heightCm === undefined) {
    try {
      const macrosResult = mockCalculateMacros({
        eer: eerCalories,
        country: mockClient.location || 'UK',
        age: age,
        gender: mockClient.gender,
        weight_kg: mockClient.weight_kg
      });

      results.macros = {
        ranges: {
          protein: macrosResult.Protein,
          carbs: macrosResult.Carbohydrates,
          fat: macrosResult['Total Fat']
        }
      };

      console.log('✅ Macros recalculated for manual EER change:', eerCalories);
    } catch (macrosError) {
      console.log('❌ Macros calculation failed:', macrosError.message);
      results.macros_error = 'Failed to calculate macros';
    }
  }

  // Add summary
  results.summary = {
    weight_changed: weightKg !== undefined && weightKg !== mockClient.weight_kg,
    height_changed: heightCm !== undefined && heightCm !== mockClient.height_cm,
    eer_changed: eerCalories !== undefined && eerCalories !== mockClient.eer_calories,
    original_weight: mockClient.weight_kg,
    original_height: mockClient.height_cm,
    original_eer: mockClient.eer_calories
  };

  console.log('\n📊 Summary:');
  console.log('Weight changed:', results.summary.weight_changed);
  console.log('Height changed:', results.summary.height_changed);
  console.log('EER changed:', results.summary.eer_changed);
  console.log('');

  return results;
}

// Run tests
console.log('🧪 Testing Recalculation API Logic\n');

// Test 1: Weight change only
console.log('Test 1: Weight change (60kg → 58kg)');
const result1 = testRecalculation("test-client", 58);
console.log('Result:', JSON.stringify(result1, null, 2));
console.log('\n' + '='.repeat(50) + '\n');

// Test 2: EER change only
console.log('Test 2: EER change (2200kcal → 2500kcal)');
const result2 = testRecalculation("test-client", undefined, undefined, 2500);
console.log('Result:', JSON.stringify(result2, null, 2));
console.log('\n' + '='.repeat(50) + '\n');

// Test 3: Combined changes
console.log('Test 3: Weight + Height changes (60kg→58kg, 165cm→168cm)');
const result3 = testRecalculation("test-client", 58, 168);
console.log('Result:', JSON.stringify(result3, null, 2));
console.log('\n' + '='.repeat(50) + '\n');

console.log('✅ All tests completed!');
