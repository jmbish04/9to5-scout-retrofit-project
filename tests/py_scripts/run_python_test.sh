#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Get the name of the script to run from the first argument.
SCRIPT_NAME=$1

if [ -z "$SCRIPT_NAME" ]; then
  echo "Error: No script name provided."
  echo "Usage: ./run_python_test.sh <script_name.py>"
  exit 1
fi

# Navigate to the project root directory from the script's location.
# This ensures that paths are always relative to the project root.
cd "$(dirname "$0")/../.."

VENV_PATH="tests/venv_tests"
REQUIREMENTS_PATH="tests/py_scripts/requirements.txt"
SCRIPT_PATH="tests/py_scripts/$SCRIPT_NAME"

# Check if the virtual environment exists, create it if it doesn't.
if [ ! -d "$VENV_PATH" ]; then
  echo "Virtual environment not found. Creating one at $VENV_PATH..."
  python3 -m venv "$VENV_PATH"
fi

# Activate the virtual environment.
echo "--- Activating Python virtual environment ---"
source "$VENV_PATH/bin/activate"

# Upgrade pip and install dependencies.
echo "--- Installing dependencies from $REQUIREMENTS_PATH ---"
pip install --upgrade pip
pip install -r "$REQUIREMENTS_PATH"

# Run the specified Python script, passing along all other arguments.
echo "--- Running Python script: $SCRIPT_PATH ---"
python "$SCRIPT_PATH" "${@:2}"

# Deactivate the virtual environment upon completion.
deactivate

echo "--- Script finished successfully ---"
