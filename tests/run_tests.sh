#!/bin/bash
# Run Python browser rendering tests with virtual environment

set -e  # Exit on any error

# Check if we're in the right directory
if [ ! -f "test_browser_rendering.py" ]; then
    echo "❌ Error: test_browser_rendering.py not found. Please run this script from scripts/tests/ directory"
    exit 1
fi

# Check if virtual environment exists
if [ ! -d "venv_tests" ]; then
    echo "❌ Error: Virtual environment not found. Please run ./setup_venv.sh first"
    exit 1
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv_tests/bin/activate

# Run the requested test
echo "🚀 Running browser rendering tests..."
echo ""

if [ "$1" = "--linkedin-job-id" ] && [ -n "$2" ]; then
    echo "🔗 Running LinkedIn job scraping test for job ID: $2"
    python test_browser_rendering.py --linkedin-job-id "$2"
elif [ "$1" = "--comprehensive" ]; then
    echo "🔄 Running comprehensive test..."
    python test_browser_rendering.py --comprehensive
elif [ "$1" = "--basic" ]; then
    echo "📸 Running basic tests..."
    python test_browser_rendering.py --basic
elif [ "$1" = "--r2" ]; then
    echo "📦 Running tests with R2 upload..."
    python test_browser_rendering_with_r2.py --basic
elif [ "$1" = "--r2-linkedin" ] && [ -n "$2" ]; then
    echo "🔗 Running LinkedIn job scraping with R2 upload for job ID: $2"
    python test_browser_rendering_with_r2.py --linkedin-job-id "$2"
else
    echo "Usage: $0 [--basic|--comprehensive|--linkedin-job-id JOB_ID|--r2|--r2-linkedin JOB_ID]"
    echo ""
    echo "Examples:"
    echo "  $0 --basic                    # Run basic tests"
    echo "  $0 --comprehensive           # Run comprehensive test"
    echo "  $0 --linkedin-job-id 123456  # Scrape LinkedIn job"
    echo "  $0 --r2                      # Run basic tests with R2 upload"
    echo "  $0 --r2-linkedin 123456      # Scrape LinkedIn job with R2 upload"
    exit 1
fi

echo ""
echo "✅ Test completed!"
echo "📋 Check browser_rendering_test.log for detailed logs"
