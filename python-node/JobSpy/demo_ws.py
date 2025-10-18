#!/usr/bin/env python3
"""
demo.py
A self-contained JobSpy runner script with AI-powered job analysis.
Simply run: python demo.py

This script will automatically search for business intelligence, data analytics,
technical program manager, and full-stack developer roles in San Francisco, CA
using Indeed, LinkedIn, ZipRecruiter, and Google Jobs.

Results will be saved to jobs_output.csv and processed through Cloudflare AI
for structured job data extraction using the direct API.

Requires: Python 3.10+
Install: pip install -U python-jobspy requests
Environment: Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN for AI features
"""

import sys
import json
import re
import os
import logging
# --- Logging Setup ---
log_file = Path(__file__).parent / "jobspy" / "logs" / "demo_ws.log"
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
    from jobspy import scrape_jobs
    import websocket
    import pandas as pd
    import numpy as np
    import subprocess
    import sys
except Exception as e:
    logging.error("ERROR: Could not import jobspy. Make sure you installed python-jobspy (pip install -U python-jobspy).")
    raise

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    logging.warning("⚠️  python-dotenv not installed. Install with: pip install python-dotenv")
    logging.warning("Falling back to environment variables or hardcoded values.")

DEFAULT_SEARCH = (
    '("business intelligence" OR "data analytics" OR "technical program manager" '
    'OR "program manager" OR "product operations" OR "full-stack" OR "full stack") '
    '(ai OR automation OR "workflow" OR python OR sql OR bigquery OR "cloudflare workers" OR next.js) '
    '(legal OR "legal ops" OR "e-discovery" OR compliance OR enterprise) '
    '-Intern -internship -recruiter -agency -staffing -sales -marketing -clearance -TS/SCI'
)

DEFAULT_GOOGLE = "business intelligence program manager full stack jobs near San Francisco, CA since last 7 days remote"



def send_jobs_to_worker(jobs_df):
    """Connects to the scout worker via WebSocket and sends job data."""
    ws_url = os.environ.get("SCOUT_WORKER_WEBSOCKET_URL")
    api_key = os.environ.get("WORKER_API_KEY")

    if not ws_url:
        logging.error("❌ SCOUT_WORKER_WEBSOCKET_URL not set. Skipping sending data to worker.")
        return

    logging.info(f"\nConnecting to worker at {ws_url}...")

    # Replace NaN with None for JSON compatibility
    jobs_df = jobs_df.replace({pd.NA: None, np.nan: None})

    headers = []
    if api_key:
        headers.append(f"Authorization: Bearer {api_key}")

    try:
        ws = websocket.create_connection(ws_url, header=headers)
        logging.info("✅ Connected to worker.")
    except Exception as e:
        logging.error(f"❌ WebSocket connection failed: {e}")
        return

    logging.info(f"\nSending {len(jobs_df)} jobs to the worker for processing...")
    for idx, (_, job_row) in enumerate(jobs_df.iterrows()):
        logging.info(f"  Sending job {idx + 1}/{len(jobs_df)}: {job_row.get('title', 'Unknown Title')}")
        payload = {
            "action": "process_scraped_data",
            "data": {
                "url": job_row.get('job_url'),
                "html": job_row.get('description'),
                "source": job_row.get('site'),
                "metadata": {
                    "title": job_row.get('title'),
                    "company": job_row.get('company'),
                    "location": job_row.get('location'),
                }
            }
        }
        try:
            ws.send(json.dumps(payload))
        except Exception as e:
            logging.error(f"  ❌ Failed to send job {job_row.get('id')}: {e}")
            # Attempt to reconnect if sending fails
            try:
                ws.close()
                ws = websocket.create_connection(ws_url, header=headers)
                logging.info("  ℹ️  Reconnected to worker. Retrying...")
                ws.send(json.dumps(payload))
            except Exception as recon_e:
                logging.error(f"  ❌ Reconnection failed: {recon_e}. Aborting.")
                break

    logging.info("\n✅ Finished sending jobs.")
    ws.close()


def run_scrape(sites, search_term, google_search_term, location, results_wanted,
               hours_old, proxies, verbose, linkedin_fetch_description, country_indeed, out_path):
    logging.info(f"Running JobSpy scrape: sites={sites}, results_per_site={results_wanted}, hours_old={hours_old}")
    if proxies:
        logging.info(f"Using proxies: {proxies[:3]}{'...' if len(proxies)>3 else ''}")

    jobs = scrape_jobs(
        site_name=sites,
        search_term=search_term,
        google_search_term=google_search_term,
        location=location,
        results_wanted=results_wanted,
        hours_old=hours_old,
        proxies=proxies or None,
        verbose=verbose,
        linkedin_fetch_description=linkedin_fetch_description,
        country_indeed=country_indeed
    )

    # jobs should be a pandas DataFrame-like object per JobSpy readme
    try:
        count = len(jobs)
    except Exception:
        # Fallback if jobspy returns something else
        count = jobs.shape[0] if hasattr(jobs, "shape") else None

    logging.info(f"Found {count} jobs (across sites specified).")

    # Save CSV
    try:
        jobs.to_csv(out_path, quoting=2, escapechar="\\", index=False)  # quoting=csv.QUOTE_NONNUMERIC is 2
        logging.info(f"Wrote output to: {out_path}")
    except Exception as exc:
        logging.error("Failed to write CSV. Attempting to pretty print top rows...")
        try:
            logging.info(jobs.head())
        except Exception:
            logging.error("Unable to display results; raw object repr:")
            logging.error(repr(jobs))
        logging.error("Exception when saving:", exc)

    return jobs


def main():
    if sys.version_info < (3, 10):
        logging.error("Python 3.10+ is required. Exiting.")
        sys.exit(1)

    # Default configuration - no CLI args needed
    sites = ["indeed", "linkedin", "zip_recruiter", "google"]
    search_term = DEFAULT_SEARCH
    google_search_term = DEFAULT_GOOGLE
    location = "San Francisco, CA"
    results_wanted = 20
    hours_old = 72
    proxies = None
    verbose = 2
    linkedin_fetch_description = True
    country_indeed = "USA"
    out_file = "jobs_output.csv"

    out_path = Path(out_file).expanduser().resolve()

    # Run the job scraping
    jobs_df = run_scrape(
        sites=sites,
        search_term=search_term,
        google_search_term=google_search_term,
        location=location,
        results_wanted=results_wanted,
        hours_old=hours_old,
        proxies=proxies,
        verbose=verbose,
        linkedin_fetch_description=linkedin_fetch_description,
        country_indeed=country_indeed,
        out_path=str(out_path)
    )

    # Send jobs to the worker for processing
    if jobs_df is not None and not jobs_df.empty:
        send_jobs_to_worker(jobs_df)
        logging.info(f"\nRaw job data saved to: {out_path}")

        # Launch the status checker in watch mode
        logging.info("\n🚀 Launching status checker to monitor 'monitoring-status'. Press Ctrl+C to exit.")
        command = [sys.executable, "-m", "jobspy.scout.status_checker", "watch", "monitoring-status"]
        try:
            subprocess.run(command, check=True)
        except KeyboardInterrupt:
            logging.info("\n👋 Status checker stopped by user.")
        except (subprocess.CalledProcessError, FileNotFoundError) as e:
            logging.error(f"\n❌ Failed to launch status checker: {e}")
    else:
        logging.warning("\n❌ No jobs found to process")


if __name__ == "__main__":
    main()