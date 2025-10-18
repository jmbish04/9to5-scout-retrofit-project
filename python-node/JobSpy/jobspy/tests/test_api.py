#!/usr/bin/env python3
"""
Example showing how to test the worker API endpoint with actual job data.
This script demonstrates the API call structure without processing all jobs.
"""

import json
import requests
import sys
from pathlib import Path
import pandas as pd

# Add the current directory to path to import demo
sys.path.insert(0, str(Path(__file__).parent))
import demo

def test_worker_api_call():
    """Test the worker API with a sample job from the CSV."""

    # Read a sample job from the CSV
    try:
        df = pd.read_csv('jobs_output.csv')
        if len(df) == 0:
            print("❌ No jobs found in jobs_output.csv. Run demo.py first.")
            return False

        sample_job = df.iloc[0].to_dict()
        print("📊 Testing with sample job:")
        print(f"  Title: {sample_job.get('title', 'N/A')}")
        print(f"  Company: {sample_job.get('company', 'N/A')}")
        print(f"  Location: {sample_job.get('location', 'N/A')}")

    except FileNotFoundError:
        print("❌ jobs_output.csv not found. Run demo.py first.")
        return False
    except Exception as e:
        print(f"❌ Error reading jobs_output.csv: {e}")
        return False

    # Test API connectivity (without API key)
    try:
        print(f"\n🔗 Testing worker endpoint connectivity...")
        print(f"  URL: {demo.WORKER_URL}")

        # Test the health endpoint
        response = requests.get(f"{demo.WORKER_URL}/health", timeout=10)
        if response.status_code == 200:
            print(f"  ✅ Worker is accessible")
            health_data = response.json()
            print(f"  Service: {health_data.get('service', 'Unknown')}")
            print(f"  Status: {health_data.get('status', 'Unknown')}")
        else:
            print(f"  ⚠️  Worker health check returned: {response.status_code}")

    except requests.exceptions.RequestException as e:
        print(f"  ❌ Cannot reach worker endpoint: {e}")
        return False

    # Show what the API call would look like
    print(f"\n📝 Example API Request Structure:")

    job_text = f"""
Job Title: {sample_job.get('title', 'N/A')}
Company: {sample_job.get('company', 'N/A')}
Location: {sample_job.get('location', 'N/A')}
Job Type: {sample_job.get('job_type', 'N/A')}
Date Posted: {sample_job.get('date_posted', 'N/A')}
Salary: {sample_job.get('min_amount', 'N/A')} - {sample_job.get('max_amount', 'N/A')} {sample_job.get('currency', 'N/A')}
Company Description: {sample_job.get('company_description', 'N/A')}
Job Description: {str(sample_job.get('description', 'N/A'))[:200]}...
"""

    headers = {
        "Authorization": f"Bearer YOUR_API_KEY_HERE",
        "Content-Type": "application/json"
    }

    payload = {
        "model": demo.DEFAULT_MODEL,
        "messages": [
            {
                "role": "system",
                "content": "You are a job data extraction specialist. Extract structured job information from the provided job posting data. Be thorough and accurate."
            },
            {
                "role": "user",
                "content": f"Extract structured job data from this job posting:\n\n{job_text}"
            }
        ],
        "response_format": {
            "type": "json_schema",
            "schema": demo.JOB_SCHEMA
        },
        "temperature": 0.1,
        "max_tokens": 2048
    }

    print(f"  Endpoint: {demo.WORKER_URL}/v1/chat/completions/structured")
    print(f"  Method: POST")
    print(f"  Headers: {json.dumps(headers, indent=4)}")
    print(f"  Model: {demo.DEFAULT_MODEL} (Cloudflare AI Llama-4)")
    print(f"  Payload structure: {{")
    print(f"    'model': '{payload['model']}',")
    print(f"    'messages': [system_prompt, user_prompt],")
    print(f"    'response_format': {{")
    print(f"      'type': 'json_schema',")
    print(f"      'schema': {{...{len(demo.JOB_SCHEMA['properties'])} fields...}}")
    print(f"    }},")
    print(f"    'temperature': {payload['temperature']},")
    print(f"    'max_tokens': {payload['max_tokens']}")
    print(f"  }}")

    print(f"\n📋 Expected Response Format:")
    print(f"  {{")
    print(f"    'id': 'chatcmpl-xxx',")
    print(f"    'object': 'chat.completion',")
    print(f"    'created': 1234567890,")
    print(f"    'model': '{demo.DEFAULT_MODEL}',",)
    print(f"    'choices': [{{")
    print(f"      'index': 0,")
    print(f"      'message': {{")
    print(f"        'role': 'assistant',")
    print(f"        'content': '{{...structured JSON...}}'")
    print(f"      }},")
    print(f"      'finish_reason': 'stop'")
    print(f"    }}],")
    print(f"    'usage': {{...}}")
    print(f"  }}")

    return True

def show_api_setup_instructions():
    """Show instructions for setting up the API key."""
    print(f"\n⚙️  To enable AI extraction:")
    print(f"  1. Get an API key for the worker endpoint")
    print(f"  2. Edit .env file and set:")
    print(f"     WORKER_API_KEY=your-actual-api-key")
    print(f"  3. Run: python demo.py")
    print(f"  4. Check structured_jobs.json for results")
    print(f"  5. Model used: {demo.DEFAULT_MODEL} (Cloudflare AI Llama-4)")

def main():
    print("=" * 60)
    print("JobSpy Worker API Test")
    print("=" * 60)

    success = test_worker_api_call()

    if success:
        show_api_setup_instructions()
        print(f"\n✅ API test completed successfully!")
        print(f"\nTo process all {pd.read_csv('jobs_output.csv').shape[0] if Path('jobs_output.csv').exists() else 'N/A'} jobs:")
        print(f"  1. Set up your API key as shown above")
        print(f"  2. Run: python demo.py")
    else:
        print(f"\n❌ API test failed. Check the errors above.")

if __name__ == "__main__":
    main()
