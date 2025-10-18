#!/usr/bin/env python3
"""
Test script to demonstrate the structured job extraction functionality.
This creates a small sample of job data and shows how it would be processed.
"""

import sys
import json
from datetime import datetime
from pathlib import Path

# Add the current directory to path to import demo
sys.path.insert(0, str(Path(__file__).parent))
import demo

def create_sample_job_data():
    """Create sample job data that mimics JobSpy output."""
    return {
        'id': 'test-123',
        'site': 'indeed',
        'job_url': 'https://example.com/job/123',
        'title': 'Senior Software Engineer',
        'company': 'TechCorp Inc.',
        'location': 'San Francisco, CA',
        'job_type': 'fulltime',
        'date_posted': '2025-10-15',
        'min_amount': 150000.0,
        'max_amount': 200000.0,
        'currency': 'USD',
        'company_description': 'A leading technology company focused on AI and machine learning solutions.',
        'description': '''
        **Job Title:** Senior Software Engineer

        **About the Role:**
        We are seeking a talented Senior Software Engineer to join our team. You will be responsible for designing and implementing scalable software solutions.

        **Requirements:**
        - 5+ years of experience in software development
        - Proficiency in Python, JavaScript, and modern frameworks
        - Experience with cloud platforms (AWS, GCP, Azure)
        - Strong problem-solving skills

        **Benefits:**
        - Competitive salary and equity
        - Health, dental, and vision insurance
        - Flexible work arrangements
        ''',
        'company_industry': 'Technology',
        'skills': 'Python, JavaScript, AWS, React, Node.js',
        'experience_range': '5-8 years'
    }

def mock_ai_extraction(job_row):
    """Mock AI extraction to show expected output format."""
    return {
        "company_name": job_row.get('company', ''),
        "company_description": job_row.get('company_description', ''),
        "job_title": job_row.get('title', ''),
        "job_location": job_row.get('location', ''),
        "employment_type": job_row.get('job_type', ''),
        "department": "Engineering",
        "salary_min": job_row.get('min_amount'),
        "salary_max": job_row.get('max_amount'),
        "salary_currency": job_row.get('currency', ''),
        "salary_raw": f"${job_row.get('min_amount', 0):,.0f} - ${job_row.get('max_amount', 0):,.0f}",
        "job_description": job_row.get('description', ''),
        "job_requirements": """
        ## Requirements
        - 5+ years of experience in software development
        - Proficiency in Python, JavaScript, and modern frameworks
        - Experience with cloud platforms (AWS, GCP, Azure)
        - Strong problem-solving skills
        """,
        "posted_date": job_row.get('date_posted', ''),
        "source_url": job_row.get('job_url', '')
    }

def main():
    print("=" * 60)
    print("JobSpy AI Extraction Demo")
    print("=" * 60)

    # Show the schema being used
    print("\n📋 Job Extraction Schema:")
    print(json.dumps(demo.JOB_SCHEMA, indent=2))

    # Create sample data
    sample_job = create_sample_job_data()
    print(f"\n📊 Sample Job Data (Raw from JobSpy):")
    for key, value in sample_job.items():
        if key == 'description':
            print(f"  {key}: {value[:100]}..." if len(str(value)) > 100 else f"  {key}: {value}")
        else:
            print(f"  {key}: {value}")

    # Show mock extraction
    extracted = mock_ai_extraction(sample_job)
    print(f"\n🤖 Extracted Structured Data (AI Output):")
    for key, value in extracted.items():
        if key in ['job_description', 'job_requirements']:
            print(f"  {key}: {value[:100]}..." if len(str(value)) > 100 else f"  {key}: {value}")
        else:
            print(f"  {key}: {value}")

    # Show configuration
    print(f"\n⚙️  Worker Configuration:")
    print(f"  Worker URL: {demo.WORKER_URL}")
    print(f"  API Key: {'Set' if demo.WORKER_API_KEY != 'your-api-key-here' else 'Not Set (using default placeholder)'}")
    print(f"  AI Model: {demo.DEFAULT_MODEL} (Cloudflare AI Llama-4)")

    print(f"\n✅ Demo complete! To use with real data:")
    print(f"  1. Set WORKER_API_KEY in .env file to your actual API key")
    print(f"  2. Run: python demo.py")
    print(f"  3. Check structured_jobs.json for extracted data")

if __name__ == "__main__":
    main()
