#!/usr/bin/env node

/**
 * Test script to verify country normalization is working correctly
 */

const { normalizeCountry, getEERGuidelineFromLocation } = require('./lib/locationMapping');

console.log('🧪 Testing Country Normalization...\n');

// Test cases for country normalization
const testCases = [
  // Mixed case inputs
  { input: 'INDIA', expected: 'india' },
  { input: 'USA', expected: 'usa' },
  { input: 'UK', expected: 'uk' },
  { input: 'India', expected: 'india' },
  { input: 'usa', expected: 'usa' },
  { input: '  UK  ', expected: 'uk' },
  { input: 'United States', expected: 'united states' },
  
  // Location mapping tests
  { input: 'New York, USA', expected: 'usa', isLocation: true },
  { input: 'London, UK', expected: 'uk', isLocation: true },
  { input: 'Mumbai, INDIA', expected: 'india', isLocation: true },
  { input: 'Paris, France', expected: 'eu', isLocation: true },
  { input: 'Sydney, Australia', expected: 'au/nz', isLocation: true },
];

let passedTests = 0;
let totalTests = testCases.length;

testCases.forEach((testCase, index) => {
  const { input, expected, isLocation } = testCase;
  
  let result;
  let testName;
  
  if (isLocation) {
    result = getEERGuidelineFromLocation(input);
    testName = `getEERGuidelineFromLocation("${input}")`;
  } else {
    result = normalizeCountry(input);
    testName = `normalizeCountry("${input}")`;
  }
  
  const passed = result === expected;
  const status = passed ? '✅' : '❌';
  
  console.log(`${status} Test ${index + 1}: ${testName}`);
  console.log(`   Expected: "${expected}"`);
  console.log(`   Got:      "${result}"`);
  console.log('');
  
  if (passed) {
    passedTests++;
  }
});

console.log(`📊 Test Results: ${passedTests}/${totalTests} tests passed`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Country normalization is working correctly.');
  process.exit(0);
} else {
  console.log('❌ Some tests failed. Please check the implementation.');
  process.exit(1);
}
