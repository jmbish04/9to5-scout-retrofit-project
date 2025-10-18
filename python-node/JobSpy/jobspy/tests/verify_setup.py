#!/usr/bin/env python3
"""
Final verification script for JobSpy AI-enhanced demo.
Tests all components: environment loading, schema validation, and API configuration.
"""

import os
import json
import sys
from pathlib import Path

def test_environment():
    """Test environment variable loading."""
    print("🔧 Testing Environment Configuration...")

    # Test direct environment variables
    worker_url = os.getenv("WORKER_ENDPOINT_URI")
    worker_key = os.getenv("WORKER_API_KEY")

    print(f"  WORKER_ENDPOINT_URI: {'✅ Set' if worker_url else '❌ Not Set'}")
    print(f"  WORKER_API_KEY: {'✅ Set' if worker_key else '❌ Not Set'}")

    if worker_url:
        print(f"    URL: {worker_url}")
    if worker_key:
        print(f"    Key: {worker_key[:10]}..." if len(worker_key) > 10 else worker_key)

    return worker_url is not None and worker_key is not None

def test_demo_import():
    """Test demo module import and configuration."""
    print("\n📦 Testing Demo Module Import...")

    try:
        import demo
        print("  ✅ Demo module imported successfully")

        print(f"\n  📊 Configuration Values:")
        print(f"    Worker URL: {demo.WORKER_URL}")
        print(f"    API Key: {'Set' if demo.WORKER_API_KEY != 'your-api-key-here' else 'Not Set'}")
        print(f"    Model: {demo.DEFAULT_MODEL}")
        print(f"    Schema Fields: {len(demo.JOB_SCHEMA['properties'])} fields")

        # Test schema structure
        required_fields = [
            'company_name', 'job_title', 'job_location', 'employment_type',
            'salary_min', 'salary_max', 'salary_currency', 'job_description',
            'job_requirements', 'posted_date', 'source_url'
        ]

        schema_fields = demo.JOB_SCHEMA['properties'].keys()
        missing_fields = [f for f in required_fields if f not in schema_fields]

        if not missing_fields:
            print("  ✅ All required schema fields present")
        else:
            print(f"  ⚠️  Missing schema fields: {missing_fields}")

        return True

    except Exception as e:
        print(f"  ❌ Error importing demo: {e}")
        return False

def test_jobspy_import():
    """Test JobSpy import."""
    print("\n🕷️  Testing JobSpy Import...")

    try:
        from jobspy import scrape_jobs
        print("  ✅ JobSpy imported successfully")
        return True
    except Exception as e:
        print(f"  ❌ Error importing JobSpy: {e}")
        return False

def test_api_connectivity():
    """Test API endpoint connectivity."""
    print("\n🌐 Testing API Connectivity...")

    try:
        import requests
        import demo

        # Test health endpoint
        response = requests.get(f"{demo.WORKER_URL}/health", timeout=10)
        if response.status_code == 200:
            health_data = response.json()
            print(f"  ✅ API endpoint accessible")
            print(f"    Service: {health_data.get('service', 'Unknown')}")
            print(f"    Status: {health_data.get('status', 'Unknown')}")
            return True
        else:
            print(f"  ⚠️  API returned status: {response.status_code}")
            return False

    except Exception as e:
        print(f"  ❌ Error testing API: {e}")
        return False

def main():
    """Run all verification tests."""
    print("=" * 60)
    print("JobSpy AI-Enhanced Demo - Final Verification")
    print("=" * 60)

    tests = [
        ("Environment Variables", test_environment),
        ("Demo Module", test_demo_import),
        ("JobSpy Library", test_jobspy_import),
        ("API Connectivity", test_api_connectivity)
    ]

    results = []
    for test_name, test_func in tests:
        result = test_func()
        results.append((test_name, result))

    print("\n" + "=" * 60)
    print("📋 Test Results Summary")
    print("=" * 60)

    all_passed = True
    for test_name, passed in results:
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"  {test_name}: {status}")
        if not passed:
            all_passed = False

    print("\n" + "=" * 60)
    if all_passed:
        print("🎉 ALL TESTS PASSED! Ready to run JobSpy AI demo.")
        print("\n🚀 Next Steps:")
        print("  1. Run: python demo.py")
        print("  2. Wait for job scraping to complete")
        print("  3. AI will process jobs using Cloudflare Llama-4")
        print("  4. Check results in structured_jobs.json")
    else:
        print("⚠️  Some tests failed. Please resolve issues before running demo.")
    print("=" * 60)

if __name__ == "__main__":
    main()
