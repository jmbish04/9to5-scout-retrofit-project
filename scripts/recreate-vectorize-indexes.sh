#!/bin/bash

# Script to recreate Vectorize indexes for the 9to5-scout embeddings and RAG system
# This script will create all necessary indexes and metadata indexes

set -e  # Exit on any error

echo "🚀 Recreating Vectorize indexes for 9to5-scout embeddings and RAG system..."

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo "❌ Error: wrangler CLI is not installed. Please install it first:"
    echo "   npm install -g wrangler"
    exit 1
fi

# Check if user is logged in to Cloudflare
if ! wrangler whoami &> /dev/null; then
    echo "❌ Error: Not logged in to Cloudflare. Please run 'wrangler login' first."
    exit 1
fi

echo "✅ Wrangler CLI found and user is logged in"

# Function to create a Vectorize index
create_index() {
    local index_name=$1
    local dimensions=$2
    local metric=$3
    
    echo "📊 Creating Vectorize index: $index_name"
    
    # Check if index already exists
    if wrangler vectorize list | grep -q "$index_name"; then
        echo "⚠️  Index $index_name already exists. Skipping creation."
        return 0
    fi
    
    # Create the index
    wrangler vectorize create "$index_name" --dimensions="$dimensions" --metric="$metric"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully created index: $index_name"
    else
        echo "❌ Failed to create index: $index_name"
        exit 1
    fi
}

# Function to create a metadata index
create_metadata_index() {
    local index_name=$1
    local property_name=$2
    local property_type=$3
    
    echo "🏷️  Creating metadata index: $index_name.$property_name"
    
    # Create the metadata index
    wrangler vectorize create-metadata-index "$index_name" --property-name="$property_name" --type="$property_type"
    
    if [ $? -eq 0 ]; then
        echo "✅ Successfully created metadata index: $index_name.$property_name"
    else
        echo "❌ Failed to create metadata index: $index_name.$property_name"
        exit 1
    fi
}

# Create main Vectorize indexes
echo ""
echo "📋 Creating main Vectorize indexes..."

create_index "job-openings" "768" "cosine"
create_index "resumes" "768" "cosine"
create_index "cover-letters" "768" "cosine"
create_index "general-content" "768" "cosine"

# Create metadata indexes for job-openings
echo ""
echo "🏷️  Creating metadata indexes for job-openings..."
create_metadata_index "job-openings" "content_type" "string"
create_metadata_index "job-openings" "uuid" "string"
create_metadata_index "job-openings" "company" "string"

# Create metadata indexes for resumes
echo ""
echo "🏷️  Creating metadata indexes for resumes..."
create_metadata_index "resumes" "content_type" "string"
create_metadata_index "resumes" "uuid" "string"
create_metadata_index "resumes" "user_id" "string"

# Create metadata indexes for cover-letters
echo ""
echo "🏷️  Creating metadata indexes for cover-letters..."
create_metadata_index "cover-letters" "content_type" "string"
create_metadata_index "cover-letters" "uuid" "string"
create_metadata_index "cover-letters" "user_id" "string"

# Create metadata indexes for general-content
echo ""
echo "🏷️  Creating metadata indexes for general-content..."
create_metadata_index "general-content" "content_type" "string"
create_metadata_index "general-content" "uuid" "string"
create_metadata_index "general-content" "category" "string"

echo ""
echo "🎉 All Vectorize indexes and metadata indexes have been created successfully!"
echo ""
echo "📊 Summary of created indexes:"
echo "   • job-openings (768 dimensions, cosine metric)"
echo "   • resumes (768 dimensions, cosine metric)"
echo "   • cover-letters (768 dimensions, cosine metric)"
echo "   • general-content (768 dimensions, cosine metric)"
echo ""
echo "🏷️  Summary of metadata indexes:"
echo "   • job-openings: content_type, uuid, company"
echo "   • resumes: content_type, uuid, user_id"
echo "   • cover-letters: content_type, uuid, user_id"
echo "   • general-content: content_type, uuid, category"
echo ""
echo "✅ You can now use these indexes with your embeddings and RAG system!"
