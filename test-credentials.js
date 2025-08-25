require('dotenv').config({ path: '.env.local' });

console.log('🧪 Testing Edamam Credentials Loading...\n');

console.log('Environment Variables:');
console.log('EDAMAM_APP_ID:', process.env.EDAMAM_APP_ID);
console.log('EDAMAM_APP_KEY:', process.env.EDAMAM_APP_KEY);

// Test if they match what you provided
const expectedAppId = '5bce8081';
const expectedAppKey = 'c80ecbf8968d48dfe51d395f6f19279a';

console.log('\nVerification:');
console.log('App ID matches:', process.env.EDAMAM_APP_ID === expectedAppId ? '✅ YES' : '❌ NO');
console.log('App Key matches:', process.env.EDAMAM_APP_KEY === expectedAppKey ? '✅ YES' : '❌ NO');

// Test Basic Auth encoding
if (process.env.EDAMAM_APP_ID && process.env.EDAMAM_APP_KEY) {
  const credentials = `${process.env.EDAMAM_APP_ID}:${process.env.EDAMAM_APP_KEY}`;
  const base64Credentials = Buffer.from(credentials).toString('base64');
  
  console.log('\nBasic Auth Header:');
  console.log('Raw:', credentials);
  console.log('Base64:', base64Credentials);
  console.log('Full Header:', `Basic ${base64Credentials}`);
} else {
  console.log('\n❌ Credentials not loaded from environment!');
}
