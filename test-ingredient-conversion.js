const { formatIngredient } = require('./lib/nutritionDisplayUtils');

// Test ingredient from the API response
const testIngredient = {
  "text": "4g unsalted butter",
  "quantity": 4,
  "measure": "gram",
  "food": "unsalted butter",  
  "weight": 3.68
};

console.log('Original ingredient:', testIngredient);
console.log('\n--- Testing Imperial Conversion ---');

const converted = formatIngredient(testIngredient, 'imperial');
console.log('Converted ingredient:', converted);
console.log('Keys:', Object.keys(converted));

if (converted.textDisplay) {
  console.log('✅ textDisplay:', converted.textDisplay);
} else {
  console.log('❌ No textDisplay property');
}

if (converted.weightDisplay) {
  console.log('✅ weightDisplay:', converted.weightDisplay);
} else {
  console.log('❌ No weightDisplay property');
}

if (converted.quantityDisplay) {
  console.log('✅ quantityDisplay:', converted.quantityDisplay);
} else {
  console.log('❌ No quantityDisplay property');
}
