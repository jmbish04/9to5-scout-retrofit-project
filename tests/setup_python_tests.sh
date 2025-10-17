#!/bin/bash

# Setup script for Python Talent API integration tests

echo "🐍 Setting up Python test environment..."

# Check if Python 3 is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check if pip is available
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv_tests" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv_tests
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv_tests/bin/activate

# Install dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

echo "✅ Python test environment setup complete!"
echo ""
echo "To run the tests:"
echo "  source venv_tests/bin/activate"
echo "  python test_talent_api_integration.py"
echo ""
echo "Or run directly:"
echo "  python test_talent_api_integration.py"
