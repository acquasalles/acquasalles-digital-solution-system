#!/bin/bash

# Test commands for Lambda function

echo "=== Testing Lambda Function ==="

# Test 1: Direct invocation with AWS CLI (if you have it configured)
echo "Test 1: AWS CLI invocation"
aws lambda invoke \
  --function-name your-function-name \
  --payload file://lambda-test-payload-fixed.json \
  response.json

# Test 2: HTTP POST to API Gateway endpoint
echo "Test 2: HTTP POST to API Gateway"
curl -X POST \
  -H "Content-Type: application/json" \
  -d @lambda-test-payload-fixed.json \
  https://your-api-gateway-url/generate-pdf \
  --output response.pdf

# Test 3: Test with minimal payload
echo "Test 3: Minimal payload test"
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "reportData": {
      "cliente": "Test Client",
      "datas": []
    },
    "collectionPointsData": [],
    "clientInfo": {
      "name": "Test",
      "cnpj": "00.000.000/0001-00",
      "address": "Test Address",
      "city": "Test City",
      "state": "SP",
      "phone": "123456789",
      "email": "test@test.com",
      "contact": "Test Contact"
    },
    "reportPeriod": {
      "start": "2025-03-19T00:00:00.000Z",
      "end": "2025-03-21T23:59:59.999Z"
    }
  }' \
  https://your-api-gateway-url/generate-pdf

echo "=== Tests completed ==="