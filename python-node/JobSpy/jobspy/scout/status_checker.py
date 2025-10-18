#!/usr/bin/env python3
"""
status_checker.py

A command-line tool to query the 9to5-Scout worker API for status updates
on job processing, monitoring, and queues.

Usage:
    python -m jobspy.scout.status_checker <command>

Commands:
    monitoring-status   - Get the overall status of the job monitoring system.
    list-jobs           - List recently processed jobs.
    pending-scrapes     - List URLs in the queue pending scraping.
    unrecorded-scrapes  - List items that have been scraped but not yet recorded as jobs.
    health              - Check the health of the worker API.

Requires:
    pip install requests python-dotenv
"""

import os
import sys
import json
import argparse
import time
import logging
from pathlib import Path
from typing import Optional, Dict, Any

# --- Logging Setup ---
# Note: Assumes the script is run from the project root or that the logs directory exists relative to the project root.
log_file = Path(__file__).parent.parent.parent / "logs" / "scout.log"
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
# --- End Logging Setup ---

try:
    import requests
    from dotenv import load_dotenv
except ImportError:
    logging.error("Error: 'requests' and 'python-dotenv' are required. Please install them with 'pip install requests python-dotenv'")
    sys.exit(1)

# Load environment variables from .env file
# This allows us to use the same .env file as the demo scripts
load_dotenv()

class ScoutStatusChecker:
    """A client to check the status of the 9to5-Scout worker."""

    def __init__(self, base_url: Optional[str] = None, api_key: Optional[str] = None):
        """
        Initializes the status checker.

        Args:
            base_url: The base URL of the worker API. Defaults to env var SCOUT_WORKER_BASE_URL.
            api_key: The API key for authentication. Defaults to env var SCOUT_WORKER_API_KEY.
        """
        self.base_url = base_url or os.environ.get("SCOUT_WORKER_BASE_URL", "https://9to5-scout.hacolby.workers.dev")
        self.api_key = api_key or os.environ.get("SCOUT_WORKER_API_KEY")
        self.headers = {
            "Content-Type": "application/json",
        }
        if self.api_key:
            self.headers["Authorization"] = f"Bearer {self.api_key}"

    def _make_request(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Helper function to make a GET request to a given endpoint.

        Args:
            endpoint: The API endpoint to call.
            params: A dictionary of query parameters.

        Returns:
            The JSON response as a dictionary.
        """
        url = f"{self.base_url}{endpoint}"
        try:
            response = requests.get(url, headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as http_err:
            logging.error(f"HTTP error occurred: {http_err}")
            logging.error(f"Response content: {response.text}")
        except requests.exceptions.RequestException as req_err:
            logging.error(f"Request error occurred: {req_err}")
        except json.JSONDecodeError:
            logging.error("Failed to decode JSON from response.")
            logging.error(f"Response content: {response.text}")
        return {}

    def get_health(self) -> Dict[str, Any]:
        """Checks the /api/health endpoint."""
        logging.info("Checking API health...")
        return self._make_request("/api/health")

    def get_monitoring_status(self) -> Dict[str, Any]:
        """Gets the overall monitoring status from /api/monitoring/status."""
        logging.info("Fetching monitoring status...")
        return self._make_request("/api/monitoring/status")

    def list_jobs(self, limit: int = 10) -> Dict[str, Any]:
        """Lists the most recent jobs from /api/jobs."""
        logging.info(f"Fetching last {limit} jobs...")
        return self._make_request("/api/jobs", params={"limit": limit})

    def get_pending_scrapes(self, limit: int = 10) -> Dict[str, Any]:
        """Gets pending scrape jobs from /api/scraper/queue/pending."""
        logging.info(f"Fetching {limit} pending scrape jobs...")
        return self._make_request("/api/scraper/queue/pending", params={"limit": limit})

    def get_unrecorded_scrapes(self, limit: int = 10) -> Dict[str, Any]:
        """Gets unrecorded scrape jobs from /api/scraper/queue/unrecorded."""
        logging.info(f"Fetching {limit} unrecorded scrape jobs...")
        return self._make_request("/api/scraper/queue/unrecorded", params={"limit": limit})


def main():
    """Main function to run the command-line interface."""
    parser = argparse.ArgumentParser(description="9to5-Scout Worker Status Checker")
    subparsers = parser.add_subparsers(dest="command", required=True, help="Available commands")

    subparsers.add_parser("health", help="Check the health of the worker API.")
    subparsers.add_parser("monitoring-status", help="Get the overall status of the job monitoring system.")
    
    jobs_parser = subparsers.add_parser("list-jobs", help="List recently processed jobs.")
    jobs_parser.add_argument("--limit", type=int, default=10, help="Number of jobs to list.")

    pending_parser = subparsers.add_parser("pending-scrapes", help="List URLs in the queue pending scraping.")
    pending_parser.add_argument("--limit", type=int, default=10, help="Number of items to list.")

    unrecorded_parser = subparsers.add_parser("unrecorded-scrapes", help="List items scraped but not yet recorded.")
    unrecorded_parser.add_argument("--limit", type=int, default=10, help="Number of items to list.")

    watch_parser = subparsers.add_parser("watch", help="Continuously monitor an endpoint.")
    watch_parser.add_argument("endpoint", choices=["monitoring-status", "pending-scrapes", "unrecorded-scrapes"], help="The endpoint to watch.")
    watch_parser.add_argument("--interval", type=int, default=10, help="Refresh interval in seconds.")

    args = parser.parse_args()

    checker = ScoutStatusChecker()
    
    if args.command == "watch":
        run_watch_loop(checker, args.endpoint, args.interval)
    else:
        result = None
        if args.command == "health":
            result = checker.get_health()
        elif args.command == "monitoring-status":
            result = checker.get_monitoring_status()
        elif args.command == "list-jobs":
            result = checker.list_jobs(limit=args.limit)
        elif args.command == "pending-scrapes":
            result = checker.get_pending_scrapes(limit=args.limit)
        elif args.command == "unrecorded-scrapes":
            result = checker.get_unrecorded_scrapes(limit=args.limit)

        if result:
            logging.info("\n--- Results ---")
            logging.info(json.dumps(result, indent=2))
            logging.info("---------------")
        else:
            logging.warning("\nNo results returned or an error occurred.")

def run_watch_loop(checker: ScoutStatusChecker, endpoint: str, interval: int):
    """Continuously polls an endpoint and displays the results."""
    logging.info(f"👀 Watching endpoint '{endpoint}' every {interval} seconds. Press Ctrl+C to exit.")
    
    # Map endpoint argument to the corresponding checker method
    endpoint_map = {
        "monitoring-status": checker.get_monitoring_status,
        "pending-scrapes": checker.get_pending_scrapes,
        "unrecorded-scrapes": checker.get_unrecorded_scrapes,
    }
    
    if endpoint not in endpoint_map:
        logging.error(f"Error: Unknown endpoint '{endpoint}' for watching.")
        return

    try:
        while True:
            result = endpoint_map[endpoint]()
            
            # Clear the screen
            os.system('cls' if os.name == 'nt' else 'clear')
            
            logging.info(f"--- Watching '{endpoint}' (refreshing every {interval}s) ---")
            logging.info(f"Last updated: {time.strftime('%Y-%m-%d %H:%M:%S')}")
            logging.info("----------------------------------------------------")
            if result:
                logging.info(json.dumps(result, indent=2))
            else:
                logging.warning("No data returned from the endpoint.")
            
            time.sleep(interval)
            
    except KeyboardInterrupt:
        logging.info("\n👋 Watch mode stopped by user.")
    except Exception as e:
        logging.error(f"\nAn error occurred during watch mode: {e}")


if __name__ == "__main__":
    main()
