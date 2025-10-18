# 9to5-scout Test Suite

This directory contains all tests for the 9to5-scout project, including TypeScript, Python, and integration tests.

## 📁 Directory Structure

```
tests/
├── README.md                           # This file
├── run-all-tests.sh                   # Comprehensive test runner
├── email-processing.test.js           # Email processing tests
├── browser-rendering-api.test.js      # Browser rendering API tests
├── schemas.test.ts                    # Database schema tests
├── embeddings-rag.test.ts             # Embeddings and RAG tests
├── setup.ts                           # Test setup utilities
├── py_scripts/                        # Python test scripts
│   ├── browser_render.py              # Browser rendering tests
│   ├── google_talent_api.py           # Google Talent API tests
│   ├── test_talent_api_integration.py # Talent API integration tests
│   └── requirements.txt               # Python dependencies
├── ts_scripts/                        # TypeScript test scripts
│   ├── e2e-talent-integration.test.ts # End-to-end talent integration
│   ├── talent-api.test.ts             # Talent API tests
│   └── websocket-integration.test.ts  # WebSocket integration tests
├── delivered_assets/                  # Test artifacts and results
│   ├── browser/                       # Browser test outputs
│   └── talentapi/                     # Talent API test results
└── logs/                             # Test execution logs
    ├── browser_render.log            # Browser rendering test logs
    └── google_talent_api.log         # Google Talent API test logs
```

## 🚀 Running Tests

### Quick Commands

```bash
# Run all tests (comprehensive)
pnpm test:comprehensive

# Run specific test suites
pnpm test                    # Vitest unit tests
pnpm test:python            # Python tests
pnpm test:browser-rendering # Browser rendering tests
pnpm test:email             # Email processing tests

# Run individual test files
node tests/email-processing.test.js
node tests/browser-rendering-api.test.js
```

### Test Categories

#### 1. **TypeScript/JavaScript Tests**
- **Unit Tests**: `pnpm test` (Vitest)
- **Email Processing**: `node tests/email-processing.test.js`
- **Browser Rendering**: `node tests/browser-rendering-api.test.js`
- **Schema Tests**: `pnpm test schemas.test.ts`

#### 2. **Python Tests**
- **Unit Tests**: `pnpm test:python:unit`
- **Integration Tests**: `pnpm test:python:integration`
- **Coverage**: `pnpm test:python:coverage`
- **All Python**: `pnpm test:python`

#### 3. **Database Tests**
- **Schema Export**: `pnpm schema:export:both`
- **Schema Check**: `pnpm schema:check`
- **Migration Tests**: `pnpm migrate:local`

#### 4. **Integration Tests**
- **End-to-End**: `node tests/ts_scripts/e2e-talent-integration.test.ts`
- **WebSocket**: `node tests/ts_scripts/websocket-integration.test.ts`
- **Talent API**: `node tests/ts_scripts/talent-api.test.ts`

## 🧪 Test Descriptions

### Email Processing Tests (`email-processing.test.js`)
Tests the AI-powered email classification and job link extraction:
- ✅ AI email classification
- ✅ Job link extraction from email content
- ✅ Email storage in database
- ✅ Job processing integration

### Browser Rendering Tests (`browser-rendering-api.test.js`)
Tests the Cloudflare Browser Rendering API integration:
- ✅ API connectivity
- ✅ Screenshot generation
- ✅ PDF generation
- ✅ Content extraction

### Python Tests (`py_scripts/`)
Tests the Python JobSpy integration:
- ✅ Browser rendering with Playwright
- ✅ Google Talent API integration
- ✅ R2 storage integration
- ✅ Job scraping functionality

### Schema Tests (`schemas.test.ts`)
Tests database schema integrity:
- ✅ Table structure validation
- ✅ Migration compatibility
- ✅ Data type consistency

## 🔧 Test Configuration

### Environment Variables
Tests use the following environment variables:
```bash
# Cloudflare
CLOUDFLARE_ACCOUNT_ID=your_account_id
CLOUDFLARE_API_TOKEN=your_api_token
BROWSER_RENDERING_TOKEN=your_browser_token

# Database
DB_NAME=your_database_name

# Python/JobSpy
LOCAL_SCRAPER_URL=http://localhost:8002
LOCAL_SCRAPER_API_KEY=your_api_key
```

### Test Data
- Test data is stored in `delivered_assets/`
- Screenshots and PDFs are saved for visual verification
- JSON results are saved for API response validation

## 📊 Test Reports

### Coverage Reports
- **TypeScript**: Generated in `coverage/` directory
- **Python**: Generated in `python-node/JobSpy/htmlcov/`

### Schema Reports
- **Local Schema**: `schemas/local-schema.sql`
- **Remote Schema**: `schemas/remote-schema.sql`
- **Comparison Report**: `schemas/schema-comparison-report.json`

### Test Results
- **Browser Tests**: `delivered_assets/browser/`
- **Talent API Tests**: `delivered_assets/talentapi/`

## 🐛 Debugging Tests

### Common Issues

1. **Python Tests Failing**
   ```bash
   # Install Python dependencies
   pnpm python:install
   pnpm python:test:setup
   ```

2. **Database Connection Issues**
   ```bash
   # Check local database
   pnpm migrate:local
   pnpm schema:export
   ```

3. **Browser Rendering API Issues**
   ```bash
   # Check API token and account ID
   pnpm test:browser-rendering
   ```

### Verbose Output
```bash
# Run with verbose output
pnpm test --reporter=verbose
node tests/email-processing.test.js --verbose
```

## 📝 Adding New Tests

### TypeScript Tests
1. Create test file in `tests/` directory
2. Use Vitest framework
3. Add to `package.json` scripts if needed

### Python Tests
1. Create test file in `tests/py_scripts/`
2. Use pytest framework
3. Add dependencies to `requirements.txt`

### Integration Tests
1. Create test file in `tests/ts_scripts/`
2. Test real API integrations
3. Save results in `delivered_assets/`

## 🎯 Best Practices

1. **Test Isolation**: Each test should be independent
2. **Mock External APIs**: Use mocks for external services
3. **Clean Up**: Remove test artifacts after completion
4. **Documentation**: Document test purpose and setup
5. **Error Handling**: Test both success and failure cases

## 📞 Support

For test-related issues:
1. Check the test logs in `logs/` directory
2. Review the test output for specific error messages
3. Ensure all dependencies are installed
4. Verify environment variables are set correctly