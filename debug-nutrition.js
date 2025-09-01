// Debug script to test nutrition calculation logic
const sampleMeals = [
  {
    mealName: "Pre-Breakfast Protein",
    recipe: {
      details: {
        recipe: {
          calories: 350.34,
          yield: 1,
          totalNutrients: {
            PROCNT: { quantity: 29.83, unit: "g" },
            CHOCDF: { quantity: 36.43, unit: "g" },
            FAT: { quantity: 12.26, unit: "g" },
            FIBTG: { quantity: 14.01, unit: "g" },
            NA: { quantity: 170.67, unit: "mg" },
            SUGAR: { quantity: 0, unit: "g" },
            CHOLE: { quantity: 0, unit: "mg" },
            CA: { quantity: 666.37, unit: "mg" },
            FE: { quantity: 3.40, unit: "mg" }
          }
        }
      }
    }
  },
  {
    mealName: "Breakfast",
    recipe: {
      details: {
        recipe: {
          calories: 400.0,
          yield: 1,
          totalNutrients: {
            PROCNT: { quantity: 25.0, unit: "g" },
            CHOCDF: { quantity: 45.0, unit: "g" },
            FAT: { quantity: 15.0, unit: "g" },
            FIBTG: { quantity: 8.0, unit: "g" },
            NA: { quantity: 200.0, unit: "mg" },
            SUGAR: { quantity: 5.0, unit: "g" },
            CHOLE: { quantity: 50.0, unit: "mg" },
            CA: { quantity: 300.0, unit: "mg" },
            FE: { quantity: 2.0, unit: "mg" }
          }
        }
      }
    }
  }
];

console.log('🧪 Testing nutrition calculation logic...');

const dailyNutrition = {
  totalCalories: 0,
  totalProtein: 0,
  totalCarbs: 0,
  totalFat: 0,
  totalFiber: 0,
  totalSodium: 0,
  totalSugar: 0,
  totalCholesterol: 0,
  totalCalcium: 0,
  totalIron: 0
};

// Calculate totals from actual recipe nutrition
sampleMeals.forEach(meal => {
  console.log(`\n🎯 Processing meal: ${meal.mealName}`);
  
  if (meal.recipe?.details?.recipe) {
    const recipe = meal.recipe.details.recipe;
    console.log(`✅ Recipe found for ${meal.mealName}`);
    
    // Get per-serving values (divide by yield)
    const servings = recipe.yield || 1;
    console.log(`📊 Servings: ${servings}`);
    
    const perServingCalories = (recipe.calories || 0) / servings;
    const perServingProtein = (recipe.totalNutrients?.PROCNT?.quantity || 0) / servings;
    const perServingCarbs = (recipe.totalNutrients?.CHOCDF?.quantity || 0) / servings;
    const perServingFat = (recipe.totalNutrients?.FAT?.quantity || 0) / servings;
    const perServingFiber = (recipe.totalNutrients?.FIBTG?.quantity || 0) / servings;
    const perServingSodium = (recipe.totalNutrients?.NA?.quantity || 0) / servings;
    const perServingSugar = (recipe.totalNutrients?.SUGAR?.quantity || 0) / servings;
    const perServingCholesterol = (recipe.totalNutrients?.CHOLE?.quantity || 0) / servings;
    const perServingCalcium = (recipe.totalNutrients?.CA?.quantity || 0) / servings;
    const perServingIron = (recipe.totalNutrients?.FE?.quantity || 0) / servings;

    console.log(`📊 Per-serving values:`);
    console.log(`  - Calories: ${perServingCalories}`);
    console.log(`  - Protein: ${perServingProtein}g`);
    console.log(`  - Carbs: ${perServingCarbs}g`);
    console.log(`  - Fat: ${perServingFat}g`);
    console.log(`  - Fiber: ${perServingFiber}g`);

    dailyNutrition.totalCalories += perServingCalories;
    dailyNutrition.totalProtein += perServingProtein;
    dailyNutrition.totalCarbs += perServingCarbs;
    dailyNutrition.totalFat += perServingFat;
    dailyNutrition.totalFiber += perServingFiber;
    dailyNutrition.totalSodium += perServingSodium;
    dailyNutrition.totalSugar += perServingSugar;
    dailyNutrition.totalCholesterol += perServingCholesterol;
    dailyNutrition.totalCalcium += perServingCalcium;
    dailyNutrition.totalIron += perServingIron;
    
    console.log(`✅ Added nutrition from ${meal.mealName}: Calories=${perServingCalories}, Protein=${perServingProtein}, Carbs=${perServingCarbs}, Fat=${perServingFat}`);
  } else {
    console.log(`❌ No recipe details found for ${meal.mealName}`);
  }
});

console.log('\n🎯 Final daily nutrition totals:');
console.log(`  - Total Calories: ${dailyNutrition.totalCalories}`);
console.log(`  - Total Protein: ${dailyNutrition.totalProtein}g`);
console.log(`  - Total Carbs: ${dailyNutrition.totalCarbs}g`);
console.log(`  - Total Fat: ${dailyNutrition.totalFat}g`);
console.log(`  - Total Fiber: ${dailyNutrition.totalFiber}g`);

// Round to 2 decimal places
const roundedNutrition = {
  totalCalories: Math.round(dailyNutrition.totalCalories * 100) / 100,
  totalProtein: Math.round(dailyNutrition.totalProtein * 100) / 100,
  totalCarbs: Math.round(dailyNutrition.totalCarbs * 100) / 100,
  totalFat: Math.round(dailyNutrition.totalFat * 100) / 100,
  totalFiber: Math.round(dailyNutrition.totalFiber * 100) / 100
};

console.log('\n🎯 Rounded daily nutrition totals:');
console.log(JSON.stringify(roundedNutrition, null, 2));
