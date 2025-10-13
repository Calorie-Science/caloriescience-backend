const jwt = require('jsonwebtoken');

// Load credentials from environment variables
const apiKey = process.env.JWT_API_KEY;
const secret = process.env.JWT_SECRET;

if (!apiKey || !secret) {
  console.error('Error: JWT_API_KEY and JWT_SECRET environment variables are required');
  console.error('Usage: JWT_API_KEY=your_key JWT_SECRET=your_secret node scripts/generate-jwt.js');
  process.exit(1);
}

// Current UTC timestamp
const iat = Math.floor(Date.now() / 1000);

// Optional parameters for specific API method
const methodParams = {
  // Example: recipe_id: 12345
};

// JWT payload
const payload = {
  api_key: apiKey,
  iat: iat,
  param: methodParams
};

// Generate token
const token = jwt.sign(payload, secret, { algorithm: 'HS256' });

console.log('Generated JWT Token:');
console.log(token);
