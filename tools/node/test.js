require('dotenv').config();

// Test if environment variables are loaded
function testEnvVariables() {
    console.log('Testing Amadeus API Credentials:');
    console.log('----------------------------------');
    console.log('API Key:', process.env.AMADEUS_CLIENT_ID ? '✓ Found' : '✗ Missing');
    console.log('API Secret:', process.env.AMADEUS_CLIENT_SECRET ? '✓ Found' : '✗ Missing');
}

testEnvVariables();