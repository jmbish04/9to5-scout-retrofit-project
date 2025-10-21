#!/bin/bash

# This script finalizes the refactoring by reorganizing the src directory.
# It moves obsolete files to a 'disregard' folder for temporary backup
# and promotes the new, refactored code from 'src/new' to 'src'.
# Version 2: Added resilience to handle missing source files.

set -e # Exit immediately if a command exits with a non-zero status.

echo "Starting the Great Migration (v2)..."

# 1. Create the directory structure for disregarded files
echo "Creating disregard directory structure..."
mkdir -p src/disregard/lib
mkdir -p src/disregard/domains/documents/services
mkdir -p src/disregard/domains/applicants/services
mkdir -p src/disregard/api
mkdir -p src/disregard/routes

# 2. Move obsolete files to the disregard directory, ignoring errors if they don't exist
echo "Moving obsolete files to src/disregard (ignoring if not found)..."
mv src/lib/storage.ts src/disregard/lib/ || true
mv src/domains/documents/services/document-generation.service.ts src/disregard/domains/documents/services/ || true
mv src/domains/documents/services/document-processing.service.ts src/disregard/domains/documents/services/ || true
mv src/domains/applicants/services/applicant-storage.service.ts src/disregard/domains/applicants/services/ || true
mv src/api/openapi-generator.ts src/disregard/api/ || true
mv src/api/openapi-routes.ts src/disregard/api/ || true
mv src/routes/sites.ts src/disregard/routes/ || true
mv src/index.ts src/disregard/ || true

echo "Obsolete files moved."

# 3. Move the new, refactored code from src/new into src
echo "Promoting new code from src/new to src..."
# Use cp and rm instead of mv to handle potential directory merging issues safely
cp -R src/new/* src/
rm -rf src/new

echo "New code promoted."

echo "The Great Migration is complete! The 'src' directory is now using the new modular structure."