const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://your-supabase-url.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'your-service-role-key';
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugDBStructure() {
  try {
    console.log('🔍 Debugging Database Structure for Preview ID: 4aa6f85b-778d-4845-8185-eb7c93cb7b18\n');

    // Get the raw data from database
    const { data: plan, error: planError } = await supabase
      .from('meal_plans')
      .select('*')
      .eq('id', '4aa6f85b-778d-4845-8185-eb7c93cb7b18')
      .single();

    if (planError || !plan) {
      console.error('❌ Error:', planError);
      return;
    }

    console.log('📊 Plan Basic Info:');
    console.log('- ID:', plan.id);
    console.log('- Status:', plan.status);
    console.log('- Plan Name:', plan.plan_name);
    console.log('- Target Calories:', plan.target_calories);

    console.log('\n📊 Generated Meals:');
    console.log('- Type:', typeof plan.generated_meals);
    console.log('- Is Array:', Array.isArray(plan.generated_meals));
    
    if (Array.isArray(plan.generated_meals)) {
      console.log('- Count:', plan.generated_meals.length);
      
      if (plan.generated_meals.length > 0) {
        const firstMeal = plan.generated_meals[0];
        console.log('\n📊 First Meal Structure:');
        console.log('- Keys:', Object.keys(firstMeal));
        console.log('- Has mealOrder:', 'mealOrder' in firstMeal);
        console.log('- Has ingredients:', 'ingredients' in firstMeal);
        console.log('- Has totalCalories:', 'totalCalories' in firstMeal);
        
        if (firstMeal.ingredients) {
          console.log('- Ingredients count:', firstMeal.ingredients.length);
          console.log('- First ingredient:', firstMeal.ingredients[0]);
        }
        
        if (firstMeal.totalCalories) {
          console.log('- Total Calories:', firstMeal.totalCalories);
          console.log('- Total Protein:', firstMeal.totalProtein);
          console.log('- Total Carbs:', firstMeal.totalCarbs);
          console.log('- Total Fat:', firstMeal.totalFat);
        }
      }
    }

    console.log('\n📊 Nutrition Summary:');
    console.log(JSON.stringify(plan.nutrition_summary, null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

debugDBStructure();
