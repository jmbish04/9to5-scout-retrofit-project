# cron_scraper.py
import os
import requests
import json
import time
from datetime import datetime

from jobspy import scrape_jobs
import pandas as pd
import numpy as np

# --- Configuration ---
WORKER_URL = os.getenv("WORKER_ENDPOINT_URI", "https://9to5-scout.hacolby.workers.dev")
API_KEY = os.getenv("WORKER_API_KEY")
POLL_INTERVAL_SECONDS = 300  # 5 minutes

def get_pending_jobs():
    """Poll the worker for pending scrape jobs."""
    print(f"[{datetime.now()}] Polling for pending jobs at {WORKER_URL}...")
    try:
        headers = {"Authorization": f"Bearer {API_KEY}"}
        response = requests.get(f"{WORKER_URL}/api/v1/scrape-queue/pending", headers=headers, params={"limit": 10})
        response.raise_for_status()
        data = response.json()
        if data and data.get('jobs'):
            print(f"Found {len(data['jobs'])} jobs to process.")
            return data['jobs']
        else:
            print("No pending jobs found.")
            return []
    except requests.RequestException as e:
        print(f"Error polling for jobs: {e}")
        return []

def post_job_results(jobs_df):
    """Post the scraped job results back to the worker."""
    if jobs_df is None or jobs_df.empty:
        print("No job results to post.")
        return

    print(f"Posting {len(jobs_df)} scraped jobs back to the worker...")
    try:
        headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
        jobs_df = jobs_df.replace({pd.NA: None, np.nan: None})
        jobs_json = jobs_df.to_dict(orient='records')

        # NOTE: Assumes the worker has a '/api/v1/jobs/batch' endpoint.
        response = requests.post(f"{WORKER_URL}/api/v1/jobs/batch", headers=headers, json={"jobs": jobs_json})
        response.raise_for_status()
        print(f"Successfully posted {len(jobs_df)} jobs. Response: {response.json()}")
    except requests.RequestException as e:
        print(f"Error posting job results: {e}")

def update_job_status(job_id: str, status: str, error_message: str = None):
    """Update the status of a job in the scrape queue on the worker."""
    print(f"Updating job {job_id} to status '{status}'...")
    try:
        headers = {"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
        payload = {"status": status}
        if error_message:
            payload["error_message"] = error_message

        # NOTE: Assumes the worker has a 'PATCH /api/v1/scrape-queue/{id}' endpoint.
        # This may need to be updated when the worker API is finalized.
        response = requests.patch(f"{WORKER_URL}/api/v1/scrape-queue/{job_id}", headers=headers, json=payload)
        response.raise_for_status()
        print(f"Successfully updated job {job_id} status.")
    except requests.RequestException as e:
        print(f"Error updating job status for {job_id}: {e}")

def run_cron_job():
    """Main function for the cron job."""
    pending_jobs = get_pending_jobs()

    for job in pending_jobs:
        job_id = job['id']
        print(f"Processing job ID: {job_id}, URLs: {job['urls']}")
        try:
            # For direct URL scraping, we need to use a different approach
            # The scrape_jobs function is designed for search-based scraping
            # For now, we'll use the URLs as search term but this may need adjustment
            # based on the actual JobSpy library capabilities
            scraped_jobs_df = scrape_jobs(
                site_name=[job['source']] if job.get('source') else ['indeed'], # Default to indeed if no source
                search_term=job['urls'], # Using URLs as search term for direct scraping
                results_wanted=1,
                linkedin_fetch_description=True # Ensure we get details
            )
            post_job_results(scraped_jobs_df)
            update_job_status(job_id, "completed")
        except Exception as e:
            print(f"Failed to scrape job {job_id}: {e}")
            update_job_status(job_id, "failed", error_message=str(e))

def main():
    if not API_KEY:
        print("Error: WORKER_API_KEY environment variable not set. Exiting.")
        return

    print("Starting cron scraper...")
    while True:
        run_cron_job()
        print(f"Sleeping for {POLL_INTERVAL_SECONDS} seconds...")
        time.sleep(POLL_INTERVAL_SECONDS)

if __name__ == "__main__":
    main()
