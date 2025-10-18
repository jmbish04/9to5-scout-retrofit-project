#!/bin/bash
# Setup script for Python test environment

set -e  # Exit on any error

echo "🚀 Setting up Python test environment..."

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    echo "❌ Error: requirements.txt not found. Please run this script from scripts/tests/ directory"
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv_tests" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv_tests
else
    echo "📦 Virtual environment already exists"
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv_tests/bin/activate

# Upgrade pip
echo "⬆️ Upgrading pip..."
pip install -U pip

# Install requirements
echo "📥 Installing requirements..."
pip install -r requirements.txt

echo "✅ Setup complete!"
echo ""
echo "To activate the virtual environment manually, run:"
echo "  source venv_tests/bin/activate"
echo ""
echo "To run tests:"
echo "  python test_browser_rendering.py --basic"
echo "  python test_browser_rendering_with_r2.py --basic"
echo "  python test_r2_upload.py"
