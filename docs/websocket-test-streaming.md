# WebSocket Test Streaming System

This document describes the WebSocket-based test streaming system that provides real-time test results to the frontend.

## Overview

The WebSocket test streaming system allows the frontend to receive live updates during test execution, providing a transparent and interactive testing experience. This system is designed to work with the existing test suite while adding real-time communication capabilities.

## Architecture

### Components

1. **TestStreamingService** (`src/lib/test-streaming.ts`)
   - Core service for managing WebSocket connections
   - Handles test execution with real-time updates
   - Manages test state and progress tracking

2. **WebSocketTestRunner** (`src/lib/websocket-test-runner.ts`)
   - Integrates with Vitest for test execution
   - Coordinates multiple test types (unit, integration, talent, browser, e2e)
   - Provides structured test reporting

3. **TestWebSocketClient** (`src/lib/websocket-client.ts`)
   - Frontend client for receiving test results
   - Handles WebSocket connection management
   - Provides utility functions for result display

4. **WebSocket Routes** (`src/index.ts`)
   - `/api/test-streaming/ws` - WebSocket endpoint for test streaming

## WebSocket API

### Connection

```typescript
const ws = new WebSocket("ws://localhost:8787/api/test-streaming/ws");
```

### Message Types

#### 1. Test Start

```typescript
{
  type: "test_start",
  testId: "test-123",
  timestamp: "2024-01-01T00:00:00.000Z",
  data: {
    testName: "Talent API Test",
    totalSteps: 7,
    steps: [...]
  }
}
```

#### 2. Test Step Update

```typescript
{
  type: "test_step",
  testId: "test-123",
  timestamp: "2024-01-01T00:00:00.000Z",
  data: {
    step: 1,
    stepName: "Initialize Test",
    status: "running" | "success" | "failed",
    details: {...},
    error: "Error message",
    progress: 14.3,
    completedSteps: 1,
    totalSteps: 7
  }
}
```

#### 3. Test Result

```typescript
{
  type: "test_result",
  testId: "test-123",
  timestamp: "2024-01-01T00:00:00.000Z",
  data: {
    // Test-specific result data
  }
}
```

#### 4. Test Complete

```typescript
{
  type: "test_complete",
  testId: "test-123",
  timestamp: "2024-01-01T00:00:00.000Z",
  data: {
    success: true,
    result: {
      testId: "test-123",
      testName: "Talent API Test",
      status: "success",
      startTime: "2024-01-01T00:00:00.000Z",
      endTime: "2024-01-01T00:01:00.000Z",
      duration: 60000,
      steps: [...],
      results: {...},
      errors: [],
      metadata: {
        totalSteps: 7,
        completedSteps: 7,
        progress: 100
      }
    },
    duration: 60000,
    errors: []
  }
}
```

#### 5. Test Error

```typescript
{
  type: "test_error",
  testId: "test-123",
  timestamp: "2024-01-01T00:00:00.000Z",
  data: {
    message: "Test execution failed",
    error: "Detailed error message"
  }
}
```

### Client Messages

#### Start Test

```typescript
{
  type: "start_talent_test",
  data: {
    query: "software engineer",
    pageSize: 10,
    location: "San Francisco, CA"
  }
}
```

#### Start Browser Test

```typescript
{
  type: "start_browser_test",
  data: {
    url: "https://example.com",
    testName: "Browser Rendering Test",
    withAuth: false
  }
}
```

#### Start E2E Test

```typescript
{
  type: "start_e2e_test",
  data: {
    testTypes: ["unit", "integration", "talent", "browser"],
    parallel: true
  }
}
```

## Usage

### Frontend Integration

```typescript
import { TestWebSocketClient, TestResultUtils } from "./lib/websocket-client";

const client = new TestWebSocketClient(
  "ws://localhost:8787/api/test-streaming/ws"
);

// Connect to WebSocket
await client.connect();

// Set up event handlers
client.on("test_start", (message) => {
  console.log(`Test started: ${message.data.testName}`);
});

client.on("test_step", (message) => {
  const { step, stepName, status, progress } = message.data;
  console.log(`Step ${step}: ${stepName} - ${status} (${progress}%)`);
});

client.on("test_complete", (message) => {
  const { success, result } = message.data;
  console.log(`Test ${success ? "passed" : "failed"}: ${result.testName}`);
});

// Start a test
client.startTest("talent", {
  query: "software engineer",
  pageSize: 10,
});
```

### Command Line Usage

```bash
# Run all tests with WebSocket streaming
pnpm test:websocket

# Run specific test types
pnpm test:websocket:unit
pnpm test:websocket:integration
pnpm test:websocket:talent
pnpm test:websocket:browser
pnpm test:websocket:e2e

# Run with custom WebSocket URL
tsx scripts/run-tests-with-websocket.ts --websocket-url ws://localhost:3000/api/test-streaming/ws

# Run with coverage
tsx scripts/run-tests-with-websocket.ts --coverage

# Run in watch mode
tsx scripts/run-tests-with-websocket.ts --watch
```

### Programmatic Usage

```typescript
import { WebSocketTestRunner } from "./lib/websocket-test-runner";
import { TestStreamingService } from "./lib/test-streaming";

const streamingService = new TestStreamingService(ws, env, "test-123");
const runner = new WebSocketTestRunner({
  testId: "test-123",
  testTypes: ["unit", "integration", "talent"],
  streamingService,
  env,
});

await runner.runAllTests();
```

## Test Types

### 1. Unit Tests

- **Purpose**: Test individual functions and components
- **Duration**: ~1-2 seconds
- **Steps**: Initialize, Run Tests, Generate Report
- **Coverage**: Function-level testing

### 2. Integration Tests

- **Purpose**: Test component interactions
- **Duration**: ~2-3 seconds
- **Steps**: Initialize, Run Tests, Validate Results, Generate Report
- **Coverage**: API integration, database operations

### 3. Talent API Tests

- **Purpose**: Test Google Jobs API integration
- **Duration**: ~3-5 seconds
- **Steps**: Initialize, Validate Config, Test Auth, Execute Search, Test Auto-complete, Validate Results, Generate Report
- **Coverage**: API calls, authentication, data transformation

### 4. Browser Tests

- **Purpose**: Test browser rendering and scraping
- **Duration**: ~5-10 seconds
- **Steps**: Initialize, Validate Config, Test Connection, Capture Screenshot, Extract Content, Generate PDF, Upload to R2, Update Database, Generate Report
- **Coverage**: Browser rendering, R2 storage, database operations

### 5. End-to-End Tests

- **Purpose**: Test complete workflows
- **Duration**: ~10-30 seconds
- **Steps**: Initialize, Run Unit Tests, Run Integration Tests, Run Talent API Tests, Run Browser Tests, Validate All Results, Generate Comprehensive Report
- **Coverage**: Full system integration

## Error Handling

The system provides comprehensive error handling:

1. **Connection Errors**: Automatic reconnection with exponential backoff
2. **Test Failures**: Detailed error messages and stack traces
3. **Timeout Handling**: Configurable timeouts for long-running tests
4. **Resource Cleanup**: Automatic cleanup of WebSocket connections and test processes

## Performance Considerations

- **WebSocket Connection**: Single persistent connection per test session
- **Message Batching**: Efficient message serialization and transmission
- **Memory Management**: Automatic cleanup of completed test results
- **Concurrent Tests**: Support for parallel test execution

## Security

- **Authentication**: WebSocket connections require valid API key
- **Rate Limiting**: Built-in rate limiting for test execution
- **Input Validation**: Comprehensive validation of test configurations
- **Error Sanitization**: Sensitive information is filtered from error messages

## Monitoring and Debugging

### Logging

- All test events are logged with timestamps
- Error details include stack traces and context
- Performance metrics are tracked and reported

### Debugging

- WebSocket message inspection
- Test state visualization
- Step-by-step execution tracking
- Error reproduction and analysis

## Future Enhancements

1. **Test Caching**: Cache test results for faster re-execution
2. **Parallel Execution**: Run multiple test types simultaneously
3. **Test Dependencies**: Support for test dependencies and ordering
4. **Custom Test Types**: Plugin system for custom test types
5. **Real-time Collaboration**: Multiple users viewing test results
6. **Test Analytics**: Historical test performance and trends
7. **CI/CD Integration**: Seamless integration with CI/CD pipelines

## Troubleshooting

### Common Issues

1. **WebSocket Connection Failed**
   - Check if the server is running
   - Verify the WebSocket URL is correct
   - Check firewall and network settings

2. **Test Execution Hangs**
   - Check for infinite loops in test code
   - Verify timeout configurations
   - Check resource availability

3. **Memory Issues**
   - Monitor memory usage during test execution
   - Check for memory leaks in test code
   - Adjust test batch sizes

### Debug Commands

```bash
# Enable verbose logging
tsx scripts/run-tests-with-websocket.ts --verbose

# Run with debug output
DEBUG=* tsx scripts/run-tests-with-websocket.ts

# Check WebSocket connection
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Key: test" -H "Sec-WebSocket-Version: 13" http://localhost:8787/api/test-streaming/ws
```

## Contributing

When contributing to the WebSocket test streaming system:

1. Follow the existing code style and patterns
2. Add comprehensive tests for new features
3. Update documentation for API changes
4. Consider performance implications
5. Test with various test types and configurations
6. Ensure proper error handling and cleanup
