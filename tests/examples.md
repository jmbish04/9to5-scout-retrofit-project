# API Usage Examples

This document provides examples for using the 9to5 Scout API, including REST endpoints, WebSocket connections, and test execution.

## Table of Contents

- [REST API Examples](#rest-api-examples)
- [WebSocket Examples](#websocket-examples)
- [Test Execution](#test-execution)
- [RPC Examples](#rpc-examples)
- [MCP Examples](#mcp-examples)

---

## REST API Examples

### Health Check

```bash
# Get health snapshot
curl -X GET https://9to5-scout.hacolby.workers.dev/api/health

# Response:
{
  "status": "healthy",
  "uptime": 3600,
  "lastTestSession": {
    "sessionUuid": "123e4567-e89b-12d3-a456-426614174000",
    "finishedAt": "2025-01-17T12:00:00Z",
    "passed": 5,
    "failed": 0,
    "totalTests": 5
  },
  "timestamp": "2025-01-17T12:00:00Z"
}
```

### Test Execution

```bash
# Run all active tests
curl -X POST https://9to5-scout.hacolby.workers.dev/api/tests/run \
  -H "Content-Type: application/json" \
  -d '{}'

# Response:
{
  "sessionUuid": "123e4567-e89b-12d3-a456-426614174000",
  "status": "running",
  "totalTests": 6,
  "startedAt": "2025-01-17T12:00:00Z"
}

# Get test definitions
curl -X GET https://9to5-scout.hacolby.workers.dev/api/tests/defs

# Response:
[
  {
    "id": "test-health-endpoint",
    "name": "Health Endpoint Check",
    "description": "Verifies that the /api/health endpoint responds correctly",
    "category": "connectivity",
    "severity": "critical",
    "isActive": true,
    "createdAt": "2025-01-17T12:00:00Z"
  }
]

# Get latest test session
curl -X GET https://9to5-scout.hacolby.workers.dev/api/tests/latest

# Get specific session results
curl -X GET https://9to5-scout.hacolby.workers.dev/api/tests/session/123e4567-e89b-12d3-a456-426614174000
```

### OpenAPI Specification

```bash
# Get OpenAPI JSON
curl -X GET https://9to5-scout.hacolby.workers.dev/openapi.json

# Get OpenAPI YAML
curl -X GET https://9to5-scout.hacolby.workers.dev/openapi.yaml
```

---

## WebSocket Examples

### Connect to WebSocket Room

```javascript
// JavaScript/TypeScript
const ws = new WebSocket('wss://9to5-scout.hacolby.workers.dev/ws?room=test-room');

ws.onopen = () => {
  console.log('Connected to WebSocket');
  
  // Send a message
  ws.send(JSON.stringify({
    type: 'broadcast',
    payload: { message: 'Hello from client' },
    meta: {
      timestamp: new Date().toISOString(),
      userId: 'user-123'
    }
  }));
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('Received:', message);
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = () => {
  console.log('WebSocket closed');
};
```

### Using the Client Library

```javascript
import { WSClient } from '/js/client.js';

const client = new WSClient('my-room');
client.connect();

client.on('message', (data) => {
  console.log('Received message:', data);
});

client.send('broadcast', { message: 'Hello' });
```

### Python WebSocket Client

```python
import asyncio
import websockets
import json

async def connect_websocket():
    uri = "wss://9to5-scout.hacolby.workers.dev/ws?room=test-room"
    async with websockets.connect(uri) as websocket:
        # Send message
        message = {
            "type": "broadcast",
            "payload": {"message": "Hello from Python"},
            "meta": {
                "timestamp": "2025-01-17T12:00:00Z"
            }
        }
        await websocket.send(json.dumps(message))
        
        # Receive message
        response = await websocket.recv()
        print(f"Received: {response}")

asyncio.run(connect_websocket())
```

---

## Test Execution

### Run Tests On-Demand

```bash
# Trigger test run
SESSION_UUID=$(curl -s -X POST https://9to5-scout.hacolby.workers.dev/api/tests/run \
  -H "Content-Type: application/json" \
  -d '{}' | jq -r '.sessionUuid')

echo "Test session started: $SESSION_UUID"

# Poll for results (wait 5 seconds)
sleep 5

# Get results
curl -X GET "https://9to5-scout.hacolby.workers.dev/api/tests/session/$SESSION_UUID"
```

### Monitor Test Progress

```bash
#!/bin/bash
SESSION_UUID="123e4567-e89b-12d3-a456-426614174000"

while true; do
  RESULT=$(curl -s "https://9to5-scout.hacolby.workers.dev/api/tests/session/$SESSION_UUID")
  STATUS=$(echo $RESULT | jq -r '.results[] | select(.finishedAt == null) | .status')
  
  if [ -z "$STATUS" ]; then
    echo "All tests completed!"
    echo $RESULT | jq '.'
    break
  fi
  
  echo "Tests still running..."
  sleep 2
done
```

### Test Specific Endpoints

```bash
# Test health endpoint
curl -X GET https://9to5-scout.hacolby.workers.dev/api/health

# Test OpenAPI generation
curl -X GET https://9to5-scout.hacolby.workers.dev/openapi.json | jq '.info'

# Test WebSocket handshake (using wscat)
wscat -c wss://9to5-scout.hacolby.workers.dev/ws?room=test
```

---

## RPC Examples

### Execute RPC Method

```bash
# Call analyze method
curl -X POST https://9to5-scout.hacolby.workers.dev/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "analyze",
    "params": {
      "text": "This is a sample job description for a software engineer position."
    },
    "id": "req-123"
  }'

# Response:
{
  "result": {
    "analysis": "This job description is for a software engineer role...",
    "model": "@cf/meta/llama-3.1-8b-instruct"
  },
  "id": "req-123"
}

# Call health method
curl -X POST https://9to5-scout.hacolby.workers.dev/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "method": "health",
    "params": {},
    "id": "req-456"
  }'
```

### JavaScript RPC Client

```javascript
async function rpcCall(method, params = {}) {
  const response = await fetch('https://9to5-scout.hacolby.workers.dev/rpc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      method,
      params,
      id: crypto.randomUUID()
    })
  });
  
  return response.json();
}

// Usage
const result = await rpcCall('analyze', { text: 'Sample text' });
console.log(result);
```

---

## MCP Examples

### List Available Tools

```bash
curl -X GET https://9to5-scout.hacolby.workers.dev/mcp/tools

# Response:
[
  {
    "name": "analyze",
    "description": "Analyze text using AI",
    "inputSchema": {
      "text": {
        "type": "string"
      }
    }
  },
  {
    "name": "health",
    "description": "Get system health status",
    "inputSchema": {}
  }
]
```

### Execute MCP Tool

```bash
curl -X POST https://9to5-scout.hacolby.workers.dev/mcp/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "analyze",
    "params": {
      "text": "Sample text to analyze"
    }
  }'

# Response:
{
  "result": {
    "analysis": "Analysis result...",
    "model": "@cf/meta/llama-3.1-8b-instruct"
  }
}
```

---

## Error Handling

### Standard Error Response

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "additional context"
  },
  "requestId": "req-123"
}
```

### Common Error Codes

- `RPC_ERROR` - RPC method execution failed
- `VALIDATION_ERROR` - Request validation failed
- `NOT_FOUND` - Resource not found
- `TIMEOUT` - Request timeout
- `INTERNAL_ERROR` - Internal server error

---

## Rate Limiting

The API implements rate limiting for certain endpoints. If you exceed the limit, you'll receive:

```json
{
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

Wait for the `retryAfter` seconds before making another request.

---

## Authentication

Currently, the API uses API key authentication via the `Authorization` header:

```bash
curl -X GET https://9to5-scout.hacolby.workers.dev/api/health \
  -H "Authorization: Bearer YOUR_API_KEY"
```

---

## WebSocket Reconnection

The client library (`/js/client.js`) includes automatic reconnection logic:

```javascript
const client = new WSClient('room-id');
client.connect(); // Automatically reconnects on failure

// Configure retry behavior
client.maxReconnectAttempts = 10;
client.reconnectDelay = 2000;
```

---

## Testing Checklist

Use these commands to verify all endpoints:

```bash
# 1. Health check
curl https://9to5-scout.hacolby.workers.dev/api/health

# 2. OpenAPI spec
curl https://9to5-scout.hacolby.workers.dev/openapi.json

# 3. Test definitions
curl https://9to5-scout.hacolby.workers.dev/api/tests/defs

# 4. Run tests
curl -X POST https://9to5-scout.hacolby.workers.dev/api/tests/run

# 5. RPC call
curl -X POST https://9to5-scout.hacolby.workers.dev/rpc \
  -H "Content-Type: application/json" \
  -d '{"method": "health", "params": {}}'

# 6. MCP tools
curl https://9to5-scout.hacolby.workers.dev/mcp/tools
```

---

## Additional Resources

- **OpenAPI Spec**: `/openapi.json` or `/openapi.yaml`
- **Health Dashboard**: `/health.html`
- **Landing Page**: `/index.html`
- **Documentation**: See project README.md

