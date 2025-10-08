// Local testing script for Lambda function
const fs = require('fs');
const path = require('path');

// Import your Lambda handler
const { handler } = require('./lambda-debug-handler');

async function testLambda() {
  try {
    // Load the test payload
    const payloadPath = path.join(__dirname, 'lambda-test-payload.json');
    const payload = JSON.parse(fs.readFileSync(payloadPath, 'utf8'));
    
    console.log('Testing Lambda function locally...');
    console.log('Payload loaded successfully');
    
    // Test 1: Direct invocation (payload in event)
    console.log('\n=== Test 1: Direct Invocation ===');
    const directEvent = payload;
    const directResult = await handler(directEvent, {});
    console.log('Direct invocation result:', {
      statusCode: directResult.statusCode,
      headers: directResult.headers,
      bodyLength: directResult.body ? directResult.body.length : 0,
      isBase64Encoded: directResult.isBase64Encoded
    });
    
    // Test 2: API Gateway simulation (payload in body)
    console.log('\n=== Test 2: API Gateway Simulation ===');
    const apiGatewayEvent = {
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json'
      },
      httpMethod: 'POST',
      path: '/generate-pdf'
    };
    const apiGatewayResult = await handler(apiGatewayEvent, {});
    console.log('API Gateway simulation result:', {
      statusCode: apiGatewayResult.statusCode,
      headers: apiGatewayResult.headers,
      bodyLength: apiGatewayResult.body ? apiGatewayResult.body.length : 0,
      isBase64Encoded: apiGatewayResult.isBase64Encoded
    });
    
    // Test 3: Invalid payload
    console.log('\n=== Test 3: Invalid Payload ===');
    const invalidEvent = {
      body: 'invalid json'
    };
    const invalidResult = await handler(invalidEvent, {});
    console.log('Invalid payload result:', {
      statusCode: invalidResult.statusCode,
      body: invalidResult.body
    });
    
    // Test 4: Missing payload
    console.log('\n=== Test 4: Missing Payload ===');
    const emptyEvent = {};
    const emptyResult = await handler(emptyEvent, {});
    console.log('Empty event result:', {
      statusCode: emptyResult.statusCode,
      body: emptyResult.body
    });
    
  } catch (error) {
    console.error('Test execution error:', error);
  }
}

// Run the test
testLambda();