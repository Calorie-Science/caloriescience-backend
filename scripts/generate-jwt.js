const jwt = require('jsonwebtoken');

// Your credentials
const apiKey = '5ed25cfee6006ea5eab3ee37f1d4db9f3a5874a72bbbac0ed8a19d8aa322aaea';
const secret = '96e5bbdf91fc36f8c6d500433f66d7f991cf69c34b4139d15840f2d8da511a00';

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
