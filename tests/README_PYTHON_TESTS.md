# Python Talent API Integration Tests

This directory contains Python-based integration tests for the Talent API functionality, including both Worker API proxy tests and direct Google Jobs API tests.

## Overview

The test suite provides comprehensive testing of:

- **Worker API Proxy**: Tests the Cloudflare Worker endpoints that proxy Google Jobs API calls
- **Direct Google API**: Tests direct calls to Google Jobs API using service account credentials
- **Error Handling**: Verifies proper error handling and response formatting
- **Performance**: Measures response times and API performance

## Files

- `test_talent_api_integration.py` - Main test script
- `requirements.txt` - Python dependencies
- `setup_python_tests.sh` - Setup script for Python environment
- `README_PYTHON_TESTS.md` - This documentation

## Setup

### 1. Install Python Dependencies

```bash
# Run the setup script
./tests/setup_python_tests.sh

# Or manually
cd tests
python3 -m venv venv_tests
source venv_tests/bin/activate
pip install -r requirements.txt
```

### 2. Ensure Service Account Credentials

Make sure the service account JSON file exists:

```bash
# Check if service account file exists
ls scripts/setup/talent-api-sa-key.json

# If not, export from .dev.vars
pnpm run setup:export-sa
```

### 3. Start the Worker (for proxy tests)

```bash
# Start the development server
pnpm run dev

# Or build and start
pnpm run build
pnpm run start
```

## Usage

### Basic Usage

```bash
# Run all tests (Worker + Direct API)
python tests/test_talent_api_integration.py

# Run with custom Worker URL
python tests/test_talent_api_integration.py --worker-url http://localhost:8787

# Run with API key
python tests/test_talent_api_integration.py --api-key your-api-key
```

### Test Options

```bash
# Only test Worker API (skip direct Google API)
python tests/test_talent_api_integration.py --worker-only

# Only test direct Google API (skip Worker API)
python tests/test_talent_api_integration.py --direct-only

# Save results to JSON file
python tests/test_talent_api_integration.py --save-results

# Combine options
python tests/test_talent_api_integration.py --worker-only --save-results
```

### Environment Variables

```bash
# Set Worker API key
export WORKER_API_KEY=your-api-key

# Set custom Worker URL
export WORKER_URL=http://localhost:8787
```

## Test Coverage

### Worker API Tests

1. **Health Check** (`/api/health`)
   - Verifies Worker is running
   - Checks response format
   - Measures response time

2. **Job Search** (`/api/talent/search`)
   - Tests job search functionality
   - Validates response structure
   - Checks for job data

3. **Job Suggestions** (`/api/talent/suggestions`)
   - Tests auto-complete functionality
   - Validates suggestion format
   - Checks response quality

### Direct Google API Tests

1. **Direct Job Search**
   - Tests Google Jobs API directly
   - Uses service account authentication
   - Validates API response format

2. **Direct Suggestions**
   - Tests Google completion API
   - Verifies authentication works
   - Checks suggestion quality

## Output Example

```
🧪 Talent API Integration Test Suite
==================================================
Worker URL: http://localhost:8787
API Key: ***
Service Account: Available

🔧 Testing Cloudflare Worker API...
==================================================
✅ Worker Health Check (0.15s)
✅ Worker Talent Search (1.23s)
   Found 10 jobs
✅ Worker Talent Suggestions (0.45s)
   Found 5 suggestions

🌐 Testing Direct Google Jobs API...
==================================================
✅ Direct Google Search (2.34s)
   Found 10 jobs
✅ Direct Google Suggestions (0.67s)
   Found 5 suggestions

📊 Test Summary
==================================================
Total Tests: 5
✅ Passed: 5
❌ Failed: 0
Success Rate: 100.0%

⏱️  Total Duration: 4.84s
```

## Troubleshooting

### Common Issues

1. **Worker Not Running**

   ```
   ❌ Worker Health Check (0.01s)
      Error: Request failed: Connection refused
   ```

   **Solution**: Start the Worker with `pnpm run dev`

2. **Service Account Not Found**

   ```
   ❌ Direct Google Search (0.00s)
      Error: Service account credentials not available
   ```

   **Solution**: Run `pnpm run setup:export-sa` to create service account file

3. **Authentication Errors**

   ```
   ❌ Direct Google Search (1.23s)
      Error: HTTP 401: Unauthorized
   ```

   **Solution**: Check service account permissions and credentials

4. **API Rate Limits**
   ```
   ❌ Worker Talent Search (2.45s)
      Error: HTTP 429: Too Many Requests
   ```
   **Solution**: Wait and retry, or check API quotas

### Debug Mode

For detailed debugging, modify the script to print more information:

```python
# Add this to see full responses
if result.data:
    print(f"   Response: {json.dumps(result.data, indent=2)}")
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Talent API Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: "3.9"

      - name: Install dependencies
        run: |
          cd tests
          python -m pip install -r requirements.txt

      - name: Start Worker
        run: |
          pnpm install
          pnpm run build
          pnpm run start &
          sleep 10

      - name: Run Tests
        run: |
          cd tests
          python test_talent_api_integration.py --save-results

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: tests/talent_api_test_results_*.json
```

## Performance Monitoring

The test suite measures and reports:

- Individual test duration
- Total execution time
- API response times
- Success/failure rates

Use `--save-results` to save detailed results for analysis.

## Security Notes

- Service account credentials are loaded from the local file system
- Never commit service account JSON files to version control
- Use environment variables for API keys in production
- Monitor API usage to avoid quota limits

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Add proper error handling
3. Include performance measurements
4. Update this documentation
5. Test both Worker and direct API paths
