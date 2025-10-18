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
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any

try:
    from jobspy import scrape_jobs
    from jobspy.cloudflare_ai.cloudflare_direct import CloudflareAIDirect
except ImportError as e:
    print(f"ERROR: Could not import jobspy or CloudflareAIDirect: {e}. Make sure you installed python-jobspy (pip install -U python-jobspy) and are running from the project root.")
    raise

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("⚠️  python-dotenv not installed. Install with: pip install python-dotenv")
    print("Falling back to environment variables or hardcoded values.")

DEFAULT_SEARCH = (
    '("business intelligence" OR "data analytics" OR "technical program manager" '
    'OR "program manager" OR "product operations" OR "full-stack" OR "full stack") '
    '(ai OR automation OR "workflow" OR python OR sql OR bigquery OR "cloudflare workers" OR next.js) '
    '(legal OR "legal ops" OR "e-discovery" OR compliance OR enterprise) '
    '-Intern -internship -recruiter -agency -staffing -sales -marketing -clearance -TS/SCI'
)

DEFAULT_GOOGLE = "business intelligence program manager full stack jobs near San Francisco, CA since last 7 days remote"

# Initialize CloudflareAIDirect
ai_client = CloudflareAIDirect()

# Job extraction schema
JOB_SCHEMA = {
    "type": "object",
    "required": [],
    "properties": {
        "company_name": {
            "type": "string",
            "description": "Name of the company or organization"
        },
        "company_description": {
            "type": "string",
            "description": "Brief summary of company purpose or mission"
        },
        "job_title": {
            "type": "string",
            "description": "Job title or position name"
        },
        "job_location": {
            "type": "string",
            "description": "Job location (city, state, remote, etc.)"
        },
        "employment_type": {
            "type": "string",
            "description": "Employment type (full-time, part-time, contract, etc.)"
        },
        "department": {
            "type": "string",
            "description": "Department or team name"
        },
        "salary_min": {
            "type": "number",
            "description": "Minimum salary mentioned"
        },
        "salary_max": {
            "type": "number",
            "description": "Maximum salary mentioned"
        },
        "salary_currency": {
            "type": "string",
            "description": "Currency code (USD, EUR, etc.)"
        },
        "salary_raw": {
            "type": "string",
            "description": "Raw salary text as displayed on page"
        },
        "job_description": {
            "type": "string",
            "description": "Full job description text in markdown format"
        },
        "job_requirements": {
            "type": "string",
            "description": "List or text of job requirements in markdown format"
        },
        "posted_date": {
            "type": "string",
            "description": "Date the job was posted, in ISO format if available"
        },
        "source_url": {
            "type": "string",
            "description": "URL of the source job posting"
        }
    }
}


def extract_job_data_with_ai(job_row: Dict) -> Optional[Dict]:
    """Extract structured job data using AI worker."""
    # Prepare the job text for AI analysis
    job_text = f"""
Job Title: {job_row.get('title', 'N/A')}
Company: {job_row.get('company', 'N/A')}
Location: {job_row.get('location', 'N/A')}
Job Type: {job_row.get('job_type', 'N/A')}
Date Posted: {job_row.get('date_posted', 'N/A')}
Salary: {job_row.get('min_amount', 'N/A')} - {job_row.get('max_amount', 'N/A')} {job_row.get('currency', 'N/A')}
Company Description: {job_row.get('company_description', 'N/A')}
Job Description: {job_row.get('description', 'N/A')}
Source URL: {job_row.get('job_url', 'N/A')}
Company Industry: {job_row.get('company_industry', 'N/A')}
Experience Range: {job_row.get('experience_range', 'N/A')}
Skills: {job_row.get('skills', 'N/A')}
"""

    ai_client.set_system_instruction("You are a job data extraction specialist. Extract structured job information from the provided job posting data. Be thorough and accurate.")
    extracted_data = ai_client.structured_response(
        user_message=f"Extract structured job data from this job posting:\n\n{job_text}",
        schema=JOB_SCHEMA,
    )
    return extracted_data


def process_jobs_with_ai(jobs_df, output_file: str = "structured_jobs.json"):
    """Process all jobs through AI extraction and save results."""
    extracted_jobs = []

    print(f"\nProcessing {len(jobs_df)} jobs through AI extraction...")

    for idx, (_, job_row) in enumerate(jobs_df.iterrows()):
        print(f"Processing job {idx + 1}/{len(jobs_df)}: {job_row.get('title', 'Unknown Title')}")

        extracted_data = extract_job_data_with_ai(job_row.to_dict())

        if extracted_data:
            # Add metadata
            extracted_data['_metadata'] = {
                'original_id': job_row.get('id'),
                'site': job_row.get('site'),
                'extraction_timestamp': datetime.now().isoformat(),
                'raw_job_url': job_row.get('job_url')
            }
            extracted_jobs.append(extracted_data)
            print(f"  ✓ Successfully extracted data")
        else:
            print(f"  ✗ Failed to extract data")

    # Save results
    if extracted_jobs:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(extracted_jobs, f, indent=2, ensure_ascii=False)

        print(f"\n✓ Saved {len(extracted_jobs)} structured job records to {output_file}")

        # Print a sample of extracted data
        if extracted_jobs:
            print("\nSample extracted job data:")
            sample = extracted_jobs[0]
            for key, value in sample.items():
                if key != '_metadata':
                    print(f"  {key}: {value}")
    else:
        print("\n✗ No jobs were successfully processed")

    return extracted_jobs


def run_scrape(sites, search_term, google_search_term, location, results_wanted,
               hours_old, proxies, verbose, linkedin_fetch_description, country_indeed, out_path):
    print(f"Running JobSpy scrape: sites={sites}, results_per_site={results_wanted}, hours_old={hours_old}")
    if proxies:
        print(f"Using proxies: {proxies[:3]}{'...' if len(proxies)>3 else ''}")

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

    print(f"Found {count} jobs (across sites specified).")

    # Save CSV
    try:
        jobs.to_csv(out_path, quoting=2, escapechar="\\", index=False)  # quoting=csv.QUOTE_NONNUMERIC is 2
        print(f"Wrote output to: {out_path}")
    except Exception as exc:
        print("Failed to write CSV. Attempting to pretty print top rows...")
        try:
            print(jobs.head())
        except Exception:
            print("Unable to display results; raw object repr:")
            print(repr(jobs))
        print("Exception when saving:", exc)

    return jobs


def main():
    if sys.version_info < (3, 10):
        print("Python 3.10+ is required. Exiting.")
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
    linkedin_fetch_description = False
    country_indeed = "USA"
    out_file = "jobspy/deliverables/jobs_output.csv"

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

    # Process jobs with AI if we have an API token
    if jobs_df is not None and len(jobs_df) > 0:
        if ai_client.api_token != "your-api-token-here":
            print("\n" + "="*50)
            print("Starting AI-powered job data extraction...")
            print("="*50)

            extracted_jobs = process_jobs_with_ai(
                jobs_df=jobs_df,
                output_file="jobspy/deliverables/structured_jobs.json"
            )

            if extracted_jobs:
                print(f"\n🎉 Successfully processed {len(extracted_jobs)} jobs!")
                print("Results saved to:")
                print(f"  - Raw data: {out_path}")
                print(f"  - Structured data: jobspy/deliverables/structured_jobs.json")
            else:
                print("\n❌ No jobs were successfully processed by AI")
        else:
            print("\n⚠️  Skipping AI processing - please set CLOUDFLARE_API_TOKEN in your environment or in the CloudflareAIDirect constructor.")
            print("Raw job data saved to:", out_path)
    else:
        print("\n❌ No jobs found to process")


if __name__ == "__main__":
    main()