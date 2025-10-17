# Browser Testing Module

A comprehensive testing module for the Cloudflare Browser Rendering API with full traceability, real-time monitoring, and step-by-step validation.

## Overview

The Browser Testing Module provides:

- **Step-by-step traceability** - Track each operation from start to finish
- **Real-time monitoring** - WebSocket support for live test progress
- **Comprehensive testing** - Both authenticated and non-authenticated scenarios
- **Asset management** - Automatic R2 upload and D1 database updates
- **Error handling** - Detailed error reporting and debugging information
- **Frontend interface** - User-friendly web interface for test execution

## Architecture

### Core Components

1. **`browser-testing.ts`** - Main testing logic and REST API endpoints
2. **`browser-test-websocket.ts`** - WebSocket handler for real-time monitoring
3. **`browser-testing.html`** - Frontend interface for test execution

### Test Pipeline

```
1. Initialize Test
2. Validate Configuration
3. Test Browser Rendering API Connection
4. Execute Screenshot Capture
5. Execute Content Extraction
6. Execute Markdown Extraction
7. Execute JSON Extraction
8. Execute Link Extraction
9. Execute Element Scraping
10. Execute PDF Generation
11. Upload Assets to R2
12. Update D1 Database
13. Generate Test Report
```

## API Endpoints

### REST API

#### `POST /api/browser-test/`

Execute a browser rendering test.

**Request Body:**

```json
{
  "url": "https://example.com",
  "testName": "My Test",
  "withAuth": false,
  "username": "user@example.com",
  "password": "password",
  "customHeaders": {
    "User-Agent": "Custom Agent"
  }
}
```

**Response:**

```json
{
  "success": true,
  "result": {
    "testId": "test-1234567890-abc123",
    "testName": "My Test",
    "url": "https://example.com",
    "overallStatus": "success",
    "startTime": "2024-01-01T00:00:00Z",
    "endTime": "2024-01-01T00:01:00Z",
    "totalDuration": 60000,
    "steps": [...],
    "assets": {...},
    "r2Keys": {...},
    "d1Records": {...},
    "errors": []
  }
}
```

#### `GET /api/browser-test/`

Get available test configuration templates.

**Response:**

```json
{
  "success": true,
  "testTypes": [
    {
      "name": "Basic Test",
      "description": "Test without authentication",
      "config": {...}
    },
    {
      "name": "Authenticated Test",
      "description": "Test with authentication",
      "config": {...}
    },
    {
      "name": "LinkedIn Test",
      "description": "Test LinkedIn job scraping",
      "config": {...}
    }
  ]
}
```

### WebSocket API

#### `WS /api/browser-test/ws`

Real-time test monitoring via WebSocket.

**Message Types:**

1. **Start Test:**

```json
{
  "type": "start_test",
  "data": {
    "url": "https://example.com",
    "testName": "My Test",
    "withAuth": false
  }
}
```

2. **Test Update:**

```json
{
  "type": "test_update",
  "data": {
    "testId": "test-1234567890-abc123",
    "step": 4,
    "stepName": "Execute Screenshot Capture",
    "status": "running",
    "progress": "4/13",
    "message": "Step 4: Execute Screenshot Capture - running"
  }
}
```

3. **Test Complete:**

```json
{
  "type": "test_complete",
  "data": {
    "testId": "test-1234567890-abc123",
    "result": {...}
  }
}
```

4. **Test Error:**

```json
{
  "type": "test_error",
  "data": {
    "message": "Test execution failed",
    "error": "Connection timeout",
    "testId": "test-1234567890-abc123"
  }
}
```

## Test Configuration

### Basic Test

```json
{
  "url": "https://example.com",
  "testName": "Basic Browser Test",
  "withAuth": false
}
```

### Authenticated Test

```json
{
  "url": "https://example.com",
  "testName": "Authenticated Browser Test",
  "withAuth": true,
  "username": "user@example.com",
  "password": "password"
}
```

### LinkedIn Job Test

```json
{
  "url": "https://linkedin.com/jobs/view/1234567890",
  "testName": "LinkedIn Job Test",
  "withAuth": true,
  "username": "your-email@example.com",
  "password": "your-password",
  "customHeaders": {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
  }
}
```

## Test Steps

### 1. Initialize Test

- Generate unique test ID
- Set up test configuration
- Initialize result tracking

### 2. Validate Configuration

- Check required fields
- Validate URL format
- Verify authentication credentials (if required)

### 3. Test Browser Rendering API Connection

- Test API connectivity
- Verify authentication tokens
- Check account permissions

### 4-10. Execute Browser Rendering Operations

- **Screenshot Capture** - Full page and viewport screenshots
- **Content Extraction** - HTML content with resource filtering
- **Markdown Extraction** - Convert HTML to markdown
- **JSON Extraction** - AI-powered structured data extraction
- **Link Extraction** - Extract all links from the page
- **Element Scraping** - Scrape specific elements using selectors
- **PDF Generation** - Generate PDF from the page

### 11. Upload Assets to R2

- Upload all generated assets to R2 bucket
- Generate public URLs
- Store metadata

### 12. Update D1 Database

- Insert job record
- Insert snapshot record
- Link assets to database records

### 13. Generate Test Report

- Compile final results
- Calculate durations
- Generate summary

## Asset Management

### Generated Assets

| Type       | Description          | Format | R2 Path                                            |
| ---------- | -------------------- | ------ | -------------------------------------------------- |
| Screenshot | Full page screenshot | PNG    | `test_results/{testId}/screenshot-{timestamp}.png` |
| Content    | HTML content         | HTML   | `test_results/{testId}/content-{timestamp}.html`   |
| Markdown   | Converted markdown   | MD     | `test_results/{testId}/markdown-{timestamp}.md`    |
| JSON       | AI-extracted data    | JSON   | `test_results/{testId}/json-{timestamp}.json`      |
| Links      | Extracted links      | JSON   | `test_results/{testId}/links-{timestamp}.json`     |
| Scraped    | Element data         | JSON   | `test_results/{testId}/scraped-{timestamp}.json`   |
| PDF        | Generated PDF        | PDF    | `test_results/{testId}/pdf-{timestamp}.pdf`        |

### R2 Storage Structure

```
test_results/
├── {testId}/
│   ├── screenshot-{timestamp}.png
│   ├── content-{timestamp}.html
│   ├── markdown-{timestamp}.md
│   ├── json-{timestamp}.json
│   ├── links-{timestamp}.json
│   ├── scraped-{timestamp}.json
│   └── pdf-{timestamp}.pdf
```

## Database Integration

### D1 Tables Updated

1. **Jobs Table**

   - Test job record with metadata
   - Links to generated assets
   - Test configuration stored in `raw_data`

2. **Snapshots Table**
   - Snapshot record for each test
   - Asset URLs and content references
   - Test results and metadata

## Frontend Interface

### Features

- **Test Configuration** - Easy setup of test parameters
- **Real-time Monitoring** - Live progress updates via WebSocket
- **Step-by-step Tracking** - Visual progress through each test step
- **Asset Management** - View and download generated assets
- **Error Handling** - Detailed error reporting and debugging
- **Test Templates** - Pre-configured test types

### Usage

1. Open `/browser-testing.html` in your browser
2. Configure test parameters
3. Select test mode (REST API or WebSocket)
4. Click "Start Test" to begin
5. Monitor progress in real-time
6. View results and download assets

## Error Handling

### Error Types

1. **Configuration Errors** - Invalid test parameters
2. **API Errors** - Browser Rendering API failures
3. **Network Errors** - Connection timeouts
4. **Storage Errors** - R2 upload failures
5. **Database Errors** - D1 update failures

### Error Reporting

- **Step-level errors** - Specific step failure details
- **Overall test status** - Success/failure summary
- **Error details** - Technical error information
- **Debug information** - Additional context for troubleshooting

## Monitoring and Debugging

### Test Traceability

Each test provides complete traceability:

- **Test ID** - Unique identifier for tracking
- **Step-by-step progress** - Individual step status and timing
- **Asset generation** - What was created and where
- **Database updates** - D1 record creation and linking
- **Error details** - Specific failure points and reasons

### Logging

- **Console logging** - Real-time progress updates
- **Step timing** - Duration of each test step
- **Asset tracking** - R2 upload status and URLs
- **Database operations** - D1 insert/update results

## Best Practices

### Test Configuration

1. **Use appropriate test types** - Basic for simple tests, authenticated for protected content
2. **Set realistic timeouts** - Allow sufficient time for complex operations
3. **Configure custom headers** - Use appropriate User-Agent and other headers
4. **Test with various URLs** - Ensure compatibility across different sites

### Monitoring

1. **Use WebSocket mode** - For real-time monitoring and debugging
2. **Check step details** - Review individual step results for issues
3. **Monitor asset generation** - Verify all expected assets are created
4. **Review error details** - Use error information for troubleshooting

### Troubleshooting

1. **Check API connectivity** - Verify Browser Rendering API access
2. **Review authentication** - Ensure credentials are correct
3. **Monitor rate limits** - Check for API rate limiting
4. **Verify storage access** - Ensure R2 and D1 permissions are correct

## Integration Examples

### JavaScript/Node.js

```javascript
// Start a test
const response = await fetch("/api/browser-test/", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: "https://example.com",
    testName: "My Test",
    withAuth: false,
  }),
});

const result = await response.json();
console.log("Test result:", result.result);
```

### WebSocket Client

```javascript
const ws = new WebSocket("wss://your-worker.workers.dev/api/browser-test/ws");

ws.onmessage = function (event) {
  const message = JSON.parse(event.data);
  console.log("Test update:", message.data);
};

// Start a test
ws.send(
  JSON.stringify({
    type: "start_test",
    data: {
      url: "https://example.com",
      testName: "WebSocket Test",
      withAuth: false,
    },
  })
);
```

### Python

```python
import requests
import json

# Start a test
response = requests.post('https://your-worker.workers.dev/api/browser-test/',
                        json={
                            'url': 'https://example.com',
                            'testName': 'Python Test',
                            'withAuth': False
                        })

result = response.json()
print('Test result:', result['result'])
```

## Security Considerations

1. **Authentication** - Secure storage of API tokens and credentials
2. **Input validation** - Validate all test parameters
3. **Rate limiting** - Implement appropriate rate limiting
4. **Error handling** - Avoid exposing sensitive information in errors
5. **Asset access** - Secure R2 bucket access and URL generation

## Performance Considerations

1. **Parallel operations** - Browser rendering operations run in parallel
2. **Asset optimization** - Efficient R2 upload and storage
3. **Database batching** - Optimized D1 operations
4. **Memory management** - Proper cleanup of large assets
5. **Timeout handling** - Appropriate timeouts for long-running operations

## Future Enhancements

1. **Test scheduling** - Automated test execution
2. **Performance metrics** - Detailed performance analysis
3. **Test comparison** - Compare results across different runs
4. **Custom selectors** - User-defined element selectors
5. **Test templates** - Save and reuse test configurations
6. **Batch testing** - Test multiple URLs simultaneously
7. **Integration testing** - Test with external services
8. **Performance monitoring** - Real-time performance metrics
