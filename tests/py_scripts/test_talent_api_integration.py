#!/usr/bin/env python3
"""
Talent API Integration Test Suite

This script tests both the Cloudflare Worker API proxy and direct Google Jobs API calls
to verify the Talent API integration is working correctly.

Usage:
    python tests/test_talent_api_integration.py
    python tests/test_talent_api_integration.py --worker-url http://localhost:8787
    python tests/test_talent_api_integration.py --direct-only
    python tests/test_talent_api_integration.py --worker-only
"""

import json
import os
import sys
import time
import argparse
import requests
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

@dataclass
class TestResult:
    """Test result container"""
    test_name: str
    success: bool
    duration: float
    error: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class TalentAPITester:
    """Comprehensive Talent API testing class"""
    
    def __init__(self, worker_url: str = "http://localhost:8787", api_key: str = None):
        self.worker_url = worker_url.rstrip('/')
        self.api_key = api_key or os.getenv('WORKER_API_KEY', 'test-key')
        self.results: List[TestResult] = []
        
        # Load service account credentials
        self.service_account_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 
            'scripts', 'setup', 'talent-api-sa-key.json'
        )
        self.service_account = self._load_service_account()
        
    def _load_service_account(self) -> Optional[Dict[str, Any]]:
        """Load service account credentials from JSON file"""
        try:
            if os.path.exists(self.service_account_path):
                with open(self.service_account_path, 'r') as f:
                    return json.load(f)
            else:
                print(f"⚠️  Service account file not found: {self.service_account_path}")
                print("   Direct API tests will be skipped")
                return None
        except Exception as e:
            print(f"❌ Error loading service account: {e}")
            return None
    
    def _make_request(self, method: str, url: str, **kwargs) -> requests.Response:
        """Make HTTP request with error handling"""
        try:
            response = requests.request(method, url, timeout=30, **kwargs)
            return response
        except requests.exceptions.RequestException as e:
            raise Exception(f"Request failed: {e}")
    
    def _test_worker_health(self) -> TestResult:
        """Test if the Worker is running and healthy"""
        start_time = time.time()
        try:
            response = self._make_request('GET', f"{self.worker_url}/api/health")
            
            if response.status_code == 200:
                data = response.json()
                duration = time.time() - start_time
                return TestResult(
                    test_name="Worker Health Check",
                    success=True,
                    duration=duration,
                    data=data
                )
            else:
                duration = time.time() - start_time
                return TestResult(
                    test_name="Worker Health Check",
                    success=False,
                    duration=duration,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Worker Health Check",
                success=False,
                duration=duration,
                error=str(e)
            )
    
    def _test_worker_talent_search(self, query: str = "software engineer") -> TestResult:
        """Test job search through Worker API (Serper API)"""
        start_time = time.time()
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            params = {
                'q': query,
                'location': 'San Francisco, CA',
                'n': 10,
                'provider': 'serper'
            }
            
            response = self._make_request(
                'GET', 
                f"{self.worker_url}/api/talent", 
                headers=headers,
                params=params
            )
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return TestResult(
                    test_name="Worker Talent Search",
                    success=True,
                    duration=duration,
                    data=data
                )
            else:
                return TestResult(
                    test_name="Worker Talent Search",
                    success=False,
                    duration=duration,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Worker Talent Search",
                success=False,
                duration=duration,
                error=str(e)
            )
    
    def _test_worker_talent_suggestions(self, query: str = "software") -> TestResult:
        """Test job suggestions through Worker API (Serper API)"""
        start_time = time.time()
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            params = {
                'q': f"{query} engineer",
                'n': 5,
                'provider': 'serper'
            }
            
            response = self._make_request(
                'GET', 
                f"{self.worker_url}/api/talent", 
                headers=headers,
                params=params
            )
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return TestResult(
                    test_name="Worker Talent Suggestions",
                    success=True,
                    duration=duration,
                    data=data
                )
            else:
                return TestResult(
                    test_name="Worker Talent Suggestions",
                    success=False,
                    duration=duration,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Worker Talent Suggestions",
                success=False,
                duration=duration,
                error=str(e)
            )
    
    def _get_google_access_token(self) -> str:
        """Get Google access token using service account credentials"""
        if not self.service_account:
            raise Exception("Service account credentials not available")
        
        import jwt
        import base64
        
        # Create JWT payload
        now = int(time.time())
        payload = {
            'iss': self.service_account['client_email'],
            'scope': 'https://www.googleapis.com/auth/jobs',
            'aud': self.service_account['token_uri'],
            'iat': now,
            'exp': now + 3600
        }
        
        # Create JWT token
        private_key = self.service_account['private_key']
        token = jwt.encode(payload, private_key, algorithm='RS256')
        
        # Exchange JWT for access token
        response = self._make_request('POST', self.service_account['token_uri'], data={
            'grant_type': 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion': token
        })
        
        if response.status_code == 200:
            data = response.json()
            return data['access_token']
        else:
            raise Exception(f"Failed to get access token: {response.status_code} {response.text}")
    
    def _test_direct_google_search(self, query: str = "software engineer") -> TestResult:
        """Test direct Google Jobs API search"""
        start_time = time.time()
        try:
            if not self.service_account:
                return TestResult(
                    test_name="Direct Google Search",
                    success=False,
                    duration=0,
                    error="Service account credentials not available"
                )
            
            # Get access token
            access_token = self._get_google_access_token()
            
            # Prepare search request
            search_request = {
                'jobQuery': {
                    'query': query,
                    'locationFilters': [{
                        'address': 'San Francisco, CA'
                        # Remove radius field - not supported in this API version
                    }]
                },
                'jobView': 'JOB_VIEW_FULL',
                'pageSize': 10
            }
            
            # Make API call
            headers = {
                'Authorization': f'Bearer {access_token}',
                'Content-Type': 'application/json'
            }
            
            url = f"https://jobs.googleapis.com/v3p1beta1/projects/{self.service_account['project_id']}/jobs:search"
            response = self._make_request('POST', url, headers=headers, json=search_request)
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return TestResult(
                    test_name="Direct Google Search",
                    success=True,
                    duration=duration,
                    data=data
                )
            else:
                return TestResult(
                    test_name="Direct Google Search",
                    success=False,
                    duration=duration,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Direct Google Search",
                success=False,
                duration=duration,
                error=str(e)
            )
    
    def _test_direct_google_suggestions(self, query: str = "software") -> TestResult:
        """Test direct Google Jobs API suggestions (simplified to basic search)"""
        start_time = time.time()
        try:
            if not self.service_account:
                return TestResult(
                    test_name="Direct Google Suggestions",
                    success=False,
                    duration=0,
                    error="Service account credentials not available"
                )
            
            # For now, just test a basic search with a different query
            # The completion API might not be available in this version
            return self._test_direct_google_search(f"{query} engineer")
            
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Direct Google Suggestions",
                success=False,
                duration=duration,
                error=str(e)
            )
    
    def run_worker_tests(self) -> None:
        """Run all Worker API tests"""
        print("🔧 Testing Cloudflare Worker API...")
        print("=" * 50)
        
        # Health check
        result = self._test_worker_health()
        self.results.append(result)
        self._print_result(result)
        
        if not result.success:
            print("❌ Worker is not responding. Skipping Worker API tests.")
            return
        
        # Talent search
        result = self._test_worker_talent_search()
        self.results.append(result)
        self._print_result(result)
        
        # Talent suggestions
        result = self._test_worker_talent_suggestions()
        self.results.append(result)
        self._print_result(result)
    
    def run_direct_tests(self) -> None:
        """Run all direct Google API tests"""
        print("\n🌐 Testing Direct Google Jobs API...")
        print("=" * 50)
        
        if not self.service_account:
            print("❌ Service account credentials not available. Skipping direct API tests.")
            return
        
        # Direct search
        result = self._test_direct_google_search()
        self.results.append(result)
        self._print_result(result)
        
        # Direct suggestions
        result = self._test_direct_google_suggestions()
        self.results.append(result)
        self._print_result(result)
    
    def _print_result(self, result: TestResult) -> None:
        """Print test result with formatting"""
        status = "✅" if result.success else "❌"
        duration = f"{result.duration:.2f}s"
        
        print(f"{status} {result.test_name} ({duration})")
        
        if result.error:
            print(f"   Error: {result.error}")
        
        if result.data and result.success:
            # Print relevant data
            if 'results' in result.data:
                jobs_count = len(result.data.get('results', []))
                provider = result.data.get('provider', 'unknown')
                print(f"   Found {jobs_count} jobs via {provider}")
            elif 'matchingJobs' in result.data:
                jobs_count = len(result.data.get('matchingJobs', []))
                print(f"   Found {jobs_count} jobs")
            elif 'completionResults' in result.data:
                suggestions_count = len(result.data.get('completionResults', []))
                print(f"   Found {suggestions_count} suggestions")
            elif 'status' in result.data:
                print(f"   Status: {result.data['status']}")
    
    def print_summary(self) -> None:
        """Print test summary"""
        print("\n📊 Test Summary")
        print("=" * 50)
        
        total_tests = len(self.results)
        successful_tests = sum(1 for r in self.results if r.success)
        failed_tests = total_tests - successful_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"✅ Passed: {successful_tests}")
        print(f"❌ Failed: {failed_tests}")
        print(f"Success Rate: {(successful_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Failed Tests:")
            for result in self.results:
                if not result.success:
                    print(f"   - {result.test_name}: {result.error}")
        
        print(f"\n⏱️  Total Duration: {sum(r.duration for r in self.results):.2f}s")
    
    def save_results(self, filename: str = None) -> None:
        """Save test results to JSON file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"talent_api_test_results_{timestamp}.json"
        
        results_data = {
            'timestamp': datetime.now().isoformat(),
            'worker_url': self.worker_url,
            'service_account_available': self.service_account is not None,
            'results': [
                {
                    'test_name': r.test_name,
                    'success': r.success,
                    'duration': r.duration,
                    'error': r.error,
                    'data_keys': list(r.data.keys()) if r.data else None
                }
                for r in self.results
            ]
        }
        
        with open(filename, 'w') as f:
            json.dump(results_data, f, indent=2)
        
        print(f"\n💾 Results saved to: {filename}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Test Talent API Integration')
    parser.add_argument('--worker-url', default='http://localhost:8787',
                       help='Worker API URL (default: http://localhost:8787)')
    parser.add_argument('--api-key', default=None,
                       help='Worker API key (default: from WORKER_API_KEY env var)')
    parser.add_argument('--worker-only', action='store_true',
                       help='Only test Worker API')
    parser.add_argument('--direct-only', action='store_true',
                       help='Only test direct Google API')
    parser.add_argument('--save-results', action='store_true',
                       help='Save results to JSON file')
    
    args = parser.parse_args()
    
    print("🧪 Talent API Integration Test Suite")
    print("=" * 50)
    print(f"Worker URL: {args.worker_url}")
    print(f"API Key: {'***' if args.api_key else 'From env var'}")
    print(f"Service Account: {'Available' if os.path.exists(os.path.join(os.path.dirname(os.path.dirname(__file__)), 'scripts', 'setup', 'talent-api-sa-key.json')) else 'Not found'}")
    print()
    
    # Create tester
    tester = TalentAPITester(args.worker_url, args.api_key)
    
    # Run tests based on arguments
    if not args.direct_only:
        tester.run_worker_tests()
    
    if not args.worker_only:
        tester.run_direct_tests()
    
    # Print summary
    tester.print_summary()
    
    # Save results if requested
    if args.save_results:
        tester.save_results()
    
    # Exit with error code if any tests failed
    if any(not r.success for r in tester.results):
        sys.exit(1)

if __name__ == '__main__':
    main()
