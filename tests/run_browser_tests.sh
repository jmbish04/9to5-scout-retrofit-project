#!/bin/bash

# Script to run Browser Rendering tests with proper virtual environment setup
# Usage: ./run_browser_tests.sh [additional python script arguments]

set -e  # Exit on any error

echo "🐍 Setting up Python test environment for Browser Rendering..."

# Check if we're in the tests directory
if [ ! -d "py_scripts" ]; then
    echo "❌ Error: py_scripts directory not found. Please run this script from the tests directory."
    exit 1
fi

# Change to py_scripts directory
cd py_scripts

# Check if requirements.txt exists
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found in py_scripts directory."
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

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install -U pip

# Install/update dependencies
echo "📚 Installing Python dependencies..."
pip install -r requirements.txt

# Run the Python script with all passed arguments
echo "🚀 Running Browser Rendering tests..."
python3 browser_render.py "$@"

echo "✅ Test execution completed!"
