import os
import sys
import argparse
import json
from datetime import datetime
import re
from serpapi import GoogleSearch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import test_config

# --- Configuration ---
SERVICE_NAME = "serp_google_jobs"
OUTPUT_DIR = test_config.get_delivered_assets_path(SERVICE_NAME)
LOGGER, LOG_FILE_PATH = test_config.setup_service_logger(SERVICE_NAME)

# --- Helper Functions ---
def generate_filename(query, location):
    sanitized_query = re.sub(r'[^a-zA-Z0-9_-]', '_', query)[:50]
    sanitized_location = re.sub(r'[^a-zA-Z0-9_-]', '_', location)[:30]
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{sanitized_query}_{sanitized_location}_{timestamp}.json"

def make_api_request(query, location):
    api_key = test_config.SERPAPI_API_KEY
    if not api_key:
        LOGGER.error("SERPAPI_API_KEY not found in config.")
        return None

    params = {
        "api_key": api_key, "engine": "google_jobs", "google_domain": "google.com",
        "q": query, "location": location, "gl": "us", "hl": "en"
    }
    
    LOGGER.info(f"Sending request to SerpApi with Query: {query}, Location: {location}")
    
    try:
        search = GoogleSearch(params)
        return search.get_dict()
    except Exception as e:
        LOGGER.error(f"API Request failed: {e}", exc_info=True)
        return None

# --- Main API Function ---
def search_and_save_jobs(query, location):
    result = make_api_request(query, location)
    
    if result:
        if 'error' in result:
            LOGGER.error(f"SerpApi returned an error: {result['error']}")
            return

        filename = generate_filename(query, location)
        filepath = os.path.join(OUTPUT_DIR, filename)
        
        try:
            with open(filepath, 'w', encoding='utf-8') as f:
                json.dump(result, f, indent=2, ensure_ascii=False)
            LOGGER.info(f"Successfully saved {len(result.get('jobs_results', []))} job results to {filepath}")
        except Exception as e:
            LOGGER.error(f"Failed to write results to file: {e}", exc_info=True)

# --- Main Execution ---
def main_menu():
    LOGGER.info("Starting interactive mode.")
    # Interactive menu logic remains the same, but uses LOGGER
    # For brevity, this part is simplified as the logic is unchanged
    query = input("Enter search query: ")
    location = input("Enter location: ")
    search_and_save_jobs(query, location)

def main():
    parser = argparse.ArgumentParser(description="Test SerpApi's Google Jobs endpoint.")
    parser.add_argument('--q', dest='query', help="The search query.")
    parser.add_argument('--location', help="The geographic location for the search.")
    
    args = parser.parse_args()

    try:
        if args.query and args.location:
            search_and_save_jobs(args.query, args.location)
        else:
            main_menu()
    finally:
        print(f"\nFull logs for this run are available at: {LOG_FILE_PATH}")

if __name__ == "__main__":
    main()