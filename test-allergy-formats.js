// Test different allergy format conversions

const allergies = [
  'celery-free',
  'dairy-free', 
  'gluten-free',
  'egg-free',
  'peanut-free'
];

console.log('=== Testing Allergy Format Conversions ===\n');

allergies.forEach(allergy => {
  // mealProgramMappingService conversion 
  const edamamFormat = allergy.toUpperCase().replace(/-/g, '_');
  
  // mealPlanningService conversion (old)
  const oldFormat = allergy;
  
  console.log(`Input: "${allergy}"`);
  console.log(`  → Edamam format: "${edamamFormat}"`);
  console.log(`  → Old format: "${oldFormat}"`);
  console.log('');
});

console.log('=== Checking against supported list ===\n');

const EDAMAM_SUPPORTED_HEALTH_LABELS = [
  'ALCOHOL_COCKTAIL',
  'ALCOHOL_FREE', 
  'CELERY_FREE',
  'CRUSTACEAN_FREE',
  'DAIRY_FREE',
  'DASH',
  'EGG_FREE',
  'FISH_FREE',
  'FODMAP_FREE',
  'GLUTEN_FREE',
  'IMMUNO_SUPPORTIVE',
  'KETO_FRIENDLY',
  'KIDNEY_FRIENDLY',
  'KOSHER',
  'LOW_POTASSIUM',
  'LOW_SUGAR',
  'LUPINE_FREE',
  'MEDITERRANEAN',
  'MOLLUSK_FREE',
  'MUSTARD_FREE',
  'NO_OIL_ADDED',
  'PALEO',
  'PEANUT_FREE',
  'PECATARIAN',
  'PORK_FREE',
  'RED_MEAT_FREE',
  'SESAME_FREE',
  'SHELLFISH_FREE',
  'SOY_FREE',
  'SUGAR_CONSCIOUS',
  'SULFITE_FREE',
  'TREE_NUT_FREE',
  'VEGAN',
  'VEGETARIAN',
  'WHEAT_FREE'
];

allergies.forEach(allergy => {
  const converted = allergy.toUpperCase().replace(/-/g, '_');
  const isSupported = EDAMAM_SUPPORTED_HEALTH_LABELS.includes(converted);
  console.log(`${allergy} → ${converted}: ${isSupported ? '✅ SUPPORTED' : '❌ NOT SUPPORTED'}`);
});
