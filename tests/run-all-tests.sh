#!/bin/bash

# Comprehensive Test Runner for 9to5-scout
# Runs all tests in the correct order and provides detailed reporting

set -e

echo "🚀 9to5-scout Test Suite Runner"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Function to run a test and track results
run_test() {
    local test_name="$1"
    local test_command="$2"
    
    echo -e "${BLUE}🧪 Running: $test_name${NC}"
    echo "Command: $test_command"
    echo "----------------------------------------"
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if eval "$test_command"; then
        echo -e "${GREEN}✅ $test_name PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}❌ $test_name FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
    
    echo ""
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
echo "🔍 Checking Prerequisites..."
echo "============================"

if ! command_exists pnpm; then
    echo -e "${RED}❌ pnpm is not installed${NC}"
    exit 1
fi

if ! command_exists python3; then
    echo -e "${RED}❌ python3 is not installed${NC}"
    exit 1
fi

if ! command_exists node; then
    echo -e "${RED}❌ node is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites found${NC}"
echo ""

# Start test execution
echo "🏃 Starting Test Execution..."
echo "============================="
echo ""

# 1. TypeScript compilation test
run_test "TypeScript Compilation" "pnpm typecheck"

# 2. Build test
run_test "Project Build" "pnpm build"

# 3. Schema export and check
run_test "Schema Export (Local)" "pnpm schema:export"
run_test "Schema Export (Remote)" "pnpm schema:export:remote"
run_test "Schema Comparison" "pnpm schema:check"

# 4. Email processing tests
run_test "Email Processing Tests" "node tests/email-processing.test.js"
run_test "Email Agent Tests" "node tests/email-agent.test.js"
run_test "Email Agent Integration Tests" "node tests/email-agent-integration.test.js"

# 5. Browser rendering tests
if [ -f "tests/browser-rendering-api.test.js" ]; then
    run_test "Browser Rendering Tests" "node tests/browser-rendering-api.test.js"
fi

# 6. Python tests (if JobSpy directory exists)
if [ -d "python-node/JobSpy" ]; then
    echo -e "${YELLOW}🐍 Python Tests${NC}"
    echo "==============="
    
    # Check if pytest is available
    if command_exists pytest; then
        run_test "Python Unit Tests" "cd python-node/JobSpy && python -m pytest tests/ -v"
        run_test "Python Test Coverage" "cd python-node/JobSpy && python -m pytest tests/ --cov=jobspy --cov-report=term"
    else
        echo -e "${YELLOW}⚠️  pytest not found, skipping Python tests${NC}"
        echo "   Install with: pip install pytest pytest-cov"
    fi
else
    echo -e "${YELLOW}⚠️  Python JobSpy directory not found, skipping Python tests${NC}"
fi

# 7. Vitest tests
run_test "Vitest Unit Tests" "pnpm test"

# Final results
echo "📊 Test Results Summary"
echo "======================="
echo -e "Total Tests: ${BLUE}$TOTAL_TESTS${NC}"
echo -e "Passed: ${GREEN}$PASSED_TESTS${NC}"
echo -e "Failed: ${RED}$FAILED_TESTS${NC}"

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}💥 $FAILED_TESTS test(s) failed${NC}"
    exit 1
fi
