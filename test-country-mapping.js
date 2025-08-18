// Test script to demonstrate country to micronutrient guideline mapping
const { getCountryGuidelineSource, getCountryGuidelineType } = require('./lib/countryMicronutrientMapping');
const { getGuidelineFromLocation } = require('./lib/clientMicronutrientHelpers');

console.log('Testing Country to Micronutrient Guideline Mapping\n');
console.log('='.repeat(50));

// Test some specific countries
const testCountries = [
  'Argentina',
  'United States',
  'Germany',
  'India',
  'UK',
  'Singapore',
  'Brazil',
  'Australia',
  'Saudi Arabia',
  'Unknown Country'
];

console.log('\nDirect Country Mapping:');
console.log('-'.repeat(50));
testCountries.forEach(country => {
  const source = getCountryGuidelineSource(country);
  const type = getCountryGuidelineType(country);
  console.log(`${country.padEnd(20)} -> ${source.padEnd(10)} (${type})`);
});

// Test location extraction
const testLocations = [
  'Buenos Aires, Argentina',
  'New York, USA',
  'London, UK',
  'Mumbai, India',
  'Berlin, Germany',
  'Tokyo, Japan',
  'Dubai, UAE',
  'Argentina',
  null,
  ''
];

console.log('\n\nLocation to Guideline Mapping:');
console.log('-'.repeat(50));
testLocations.forEach(location => {
  const guideline = getGuidelineFromLocation(location);
  console.log(`${(location || 'null').padEnd(30)} -> ${guideline.country.padEnd(10)} (${guideline.extractedCountry || 'default'})`);
});

console.log('\n\nCountries by Guideline Source:');
console.log('-'.repeat(50));
const sources = ['US', 'EU', 'UK', 'India', 'WHO'];
sources.forEach(source => {
  const countries = require('./lib/countryMicronutrientMapping')
    .COUNTRY_MICRONUTRIENT_MAPPINGS
    .filter(m => m.guidelineSource === source)
    .map(m => m.country)
    .slice(0, 5); // Show first 5 countries for brevity
  console.log(`${source}: ${countries.join(', ')}${countries.length > 5 ? '...' : ''}`);
});
