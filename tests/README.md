# Tests Directory Structure

This directory contains all test-related files organized by type and technology.

## 📁 Directory Structure

```
tests/
├── py_scripts/               # Python test scripts and environment
│   ├── google_talent_api.py  # Google Talent API integration tests
│   ├── browser_render.py     # Browser rendering tests
│   ├── requirements.txt      # Python dependencies
│   ├── venv_tests/          # Python virtual environment (gitignored)
│   └── logs/                # Test execution logs (gitignored)
├── ts_scripts/              # TypeScript test files
│   ├── *.test.ts           # Vitest test files
│   └── setup.ts            # Test setup configuration
├── delivered_assets/        # Test outputs and results (gitignored)
│   ├── talentapi/          # Talent API test results
│   └── browser/            # Browser test results
├── run_talent_tests.sh     # Bash script for Talent API tests
├── run_browser_tests.sh    # Bash script for Browser tests
└── setup_python_tests.sh   # Python environment setup script
```

## 🚀 Running Tests

### Python Tests (with virtual environment)

```bash
# Talent API tests
pnpm run test:talent                    # Full test suite (deployed)
pnpm run test:talent:local              # Full test suite (local)
pnpm run test:talent:direct             # Direct Google API only
pnpm run test:talent:worker             # Worker API only

# Browser rendering tests
pnpm run test:browser                   # Browser tests (deployed)
pnpm run test:browser:local             # Browser tests (local)

# Setup
pnpm run test:talent:setup              # Setup Python environment
```

### TypeScript Tests

```bash
# Run all TypeScript tests
pnpm test

# Run specific test suites
pnpm test:unit
pnpm test:integration
pnpm test:e2e
```

## 📊 Test Results

All test results are automatically saved to the `delivered_assets/` directory:
- **Talent API results**: `delivered_assets/talentapi/talent_api_test_results_*.json`
- **Browser results**: `delivered_assets/browser/browser_render_test_results_*.json`

## 🔒 Security

The following directories are excluded from Git:
- `delivered_assets/` - Contains test results and sensitive data
- `python/logs/` - Contains test execution logs
- `python/venv_tests/` - Python virtual environment

## 🛠️ Development

### Adding New Python Tests

1. Add your test script to `python/`
2. Update `requirements.txt` if new dependencies are needed
3. Create a corresponding bash script in the root `tests/` directory
4. Add package.json scripts as needed

### Adding New TypeScript Tests

1. Add your test file to `typescript/`
2. Follow the existing naming convention: `*.test.ts`
3. Update `vitest.config.ts` if needed

## 📝 Logging

- **Python logs**: Saved to `python/logs/` (overwritten each run)
- **Test results**: Saved to `delivered_assets/` (timestamped)
- **Console output**: Real-time during test execution