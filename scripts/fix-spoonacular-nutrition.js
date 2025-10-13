/**
 * Fix Spoonacular recipes with zeroed-out nutrition by re-extracting from original_api_response
 * Run this script once to fix existing recipes in the database
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixSpoonacularNutrition() {
  console.log('🔍 Finding Spoonacular recipes with zeroed-out nutrition...\n');

  // Find all Spoonacular recipes where nutrition_details is empty or zeroed out
  const { data: recipes, error } = await supabase
    .from('cached_recipes')
    .select('*')
    .eq('provider', 'spoonacular')
    .eq('has_complete_nutrition', false);

  if (error) {
    console.error('❌ Error fetching recipes:', error);
    process.exit(1);
  }

  console.log(`Found ${recipes.length} recipes to fix\n`);

  let fixed = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipe of recipes) {
    try {
      console.log(`Processing: ${recipe.recipe_name} (${recipe.external_recipe_id})`);

      // Check if original_api_response has nutrition data
      if (!recipe.original_api_response?.nutrition) {
        console.log('  ⚠️  No nutrition in original_api_response - SKIP\n');
        skipped++;
        continue;
      }

      const apiNutrition = recipe.original_api_response.nutrition;

      // Check if nutrition is already in standardized format (macros/micros)
      let nutritionDetails;
      if (apiNutrition.macros && apiNutrition.calories) {
        console.log('  ✅ Nutrition already in standardized format');
        nutritionDetails = apiNutrition;
      } 
      // Check if it has nutrients array (raw Spoonacular format - need to transform)
      else if (apiNutrition.nutrients) {
        console.log('  🔄 Transforming from raw Spoonacular format');
        nutritionDetails = transformSpoonacularNutrition(apiNutrition);
      } 
      else {
        console.log('  ⚠️  Unknown nutrition format - SKIP\n');
        skipped++;
        continue;
      }

      // Validate we got actual nutrition data
      const hasValidNutrition = nutritionDetails?.calories?.quantity > 0 || 
        nutritionDetails?.macros?.protein?.quantity > 0 ||
        nutritionDetails?.macros?.carbs?.quantity > 0;

      if (!hasValidNutrition) {
        console.log('  ⚠️  Nutrition extraction resulted in zeros - SKIP\n');
        skipped++;
        continue;
      }

      // Update the database
      const { error: updateError } = await supabase
        .from('cached_recipes')
        .update({
          nutrition_details: nutritionDetails,
          has_complete_nutrition: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', recipe.id);

      if (updateError) {
        console.error('  ❌ Update failed:', updateError.message);
        failed++;
      } else {
        console.log(`  ✅ Fixed! Calories: ${nutritionDetails.calories.quantity} kcal\n`);
        fixed++;
      }

    } catch (err) {
      console.error(`  ❌ Error processing recipe:`, err.message);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Fixed: ${fixed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Skipped: ${skipped}`);
  console.log(`📊 Total: ${recipes.length}`);
}

/**
 * Transform Spoonacular nutrients array to standardized format
 */
function transformSpoonacularNutrition(spoonacularData) {
  const nutrition = {
    calories: { quantity: 0, unit: 'kcal' },
    macros: {},
    micros: {
      vitamins: {},
      minerals: {}
    }
  };

  if (!spoonacularData?.nutrients) {
    return nutrition;
  }

  const nutrientMap = {
    'Calories': { key: 'calories', category: 'calories' },
    'Protein': { key: 'protein', category: 'macros' },
    'Carbohydrates': { key: 'carbs', category: 'macros' },
    'Fat': { key: 'fat', category: 'macros' },
    'Fiber': { key: 'fiber', category: 'macros' },
    'Sugar': { key: 'sugar', category: 'macros' },
    'Sodium': { key: 'sodium', category: 'macros' },
    'Cholesterol': { key: 'cholesterol', category: 'macros' },
    'Saturated Fat': { key: 'saturatedFat', category: 'macros' },
    'Vitamin A': { key: 'vitaminA', category: 'vitamins' },
    'Vitamin C': { key: 'vitaminC', category: 'vitamins' },
    'Vitamin D': { key: 'vitaminD', category: 'vitamins' },
    'Vitamin E': { key: 'vitaminE', category: 'vitamins' },
    'Vitamin K': { key: 'vitaminK', category: 'vitamins' },
    'Vitamin B6': { key: 'vitaminB6', category: 'vitamins' },
    'Vitamin B12': { key: 'vitaminB12', category: 'vitamins' },
    'Folate': { key: 'folate', category: 'vitamins' },
    'Calcium': { key: 'calcium', category: 'minerals' },
    'Iron': { key: 'iron', category: 'minerals' },
    'Magnesium': { key: 'magnesium', category: 'minerals' },
    'Phosphorus': { key: 'phosphorus', category: 'minerals' },
    'Potassium': { key: 'potassium', category: 'minerals' },
    'Zinc': { key: 'zinc', category: 'minerals' },
    'Copper': { key: 'copper', category: 'minerals' },
    'Manganese': { key: 'manganese', category: 'minerals' },
    'Selenium': { key: 'selenium', category: 'minerals' }
  };

  for (const nutrient of spoonacularData.nutrients) {
    const mapping = nutrientMap[nutrient.name];
    if (mapping) {
      const value = Math.round(nutrient.amount * 100) / 100;
      const unit = nutrient.unit || 'g';

      if (mapping.category === 'calories') {
        nutrition.calories = { quantity: value, unit: unit };
      } else if (mapping.category === 'macros') {
        nutrition.macros[mapping.key] = { quantity: value, unit: unit };
      } else if (mapping.category === 'vitamins') {
        nutrition.micros.vitamins[mapping.key] = { quantity: value, unit: unit };
      } else if (mapping.category === 'minerals') {
        nutrition.micros.minerals[mapping.key] = { quantity: value, unit: unit };
      }
    }
  }

  return nutrition;
}

// Run the fix
fixSpoonacularNutrition()
  .then(() => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Fatal error:', err);
    process.exit(1);
  });

