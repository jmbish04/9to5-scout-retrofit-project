#!/usr/bin/env python3
"""
SerpAPI Talent Integration Test Suite

This script tests the Cloudflare Worker's integration with SerpAPI for job searches,
verifying that the new API proxy is working correctly after the migration from the
deprecated Google Jobs API.

Usage:
    python tests/py_scripts/google_talent_api.py
    python tests/py_scripts/google_talent_api.py --local
"""

import json
import os
import sys
import time
import argparse
import requests
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from datetime import datetime

# Add the project root to the Python path for module resolution
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

# Import the centralized configuration
import test_config

# Setup logging
def setup_logging():
    """Setup centralized logging to tests/logs/google_talent_api.log"""
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, 'google_talent_api.log')
    
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, mode='w'),
            logging.StreamHandler(sys.stdout)
        ]
    )
    
    return logging.getLogger(__name__)

@dataclass
class TestResult:
    """Test result container"""
    test_name: str
    success: bool
    duration: float
    error: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class TalentAPITester:
    """Comprehensive Talent API testing class for SerpAPI via Worker"""
    
    def __init__(self, worker_url: str, api_key: str):
        self.worker_url = worker_url.rstrip('/')
        self.api_key = api_key
        self.results: List[TestResult] = []
        self.logger = setup_logging()
        self.session_id = f"serpapi_talent_api_{int(time.time())}"
        
        self.logger.info(f"Starting SerpAPI Talent API test session: {self.session_id}")
        self.logger.info(f"Worker URL: {self.worker_url}")
        
    def _log_to_d1(self, test_name: str, success: bool, duration: float, error: str = None, data: Dict = None):
        """Log test result to D1 database via Worker API"""
        try:
            log_entry = {
                'session_id': self.session_id,
                'test_name': test_name,
                'success': success,
                'duration': duration,
                'error': error,
                'data': json.dumps(data) if data else None,
                'timestamp': datetime.now().isoformat(),
                'test_type': 'google_talent_api'
            }
            
            # Send to Worker API for D1 logging
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            response = self._make_request('POST', f"{self.worker_url}/api/logs/test", 
                                        json=log_entry,
                                        headers=headers)
            
            if response.status_code == 200:
                self.logger.info(f"Logged test result to D1: {test_name}")
            else:
                self.logger.warning(f"Failed to log to D1: {response.status_code}")
                
        except Exception as e:
            self.logger.warning(f"Error logging to D1: {e}")
    
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
    
    def _test_worker_serpapi_search(self, query: str = "software engineer") -> TestResult:
        """Test job search through Worker's SerpAPI integration."""
        start_time = time.time()
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            # The 'provider' parameter is no longer used after migration
            params = {
                'q': query,
                'location': 'Austin, TX',
                'n': 5
            }
            
            response = self._make_request(
                'GET', 
                f"{self.worker_url}/api/talent", 
                headers=headers,
                params=params
            )
            
            duration = time.time() - start_time
            data = response.json()

            if response.status_code == 200 and data.get('jobs_results'):
                return TestResult(
                    test_name="Worker SerpAPI Search",
                    success=True,
                    duration=duration,
                    data=data
                )
            else:
                error_message = data.get('error', response.text)
                return TestResult(
                    test_name="Worker SerpAPI Search",
                    success=False,
                    duration=duration,
                    error=f"HTTP {response.status_code}: {error_message}"
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Worker SerpAPI Search",
                success=False,
                duration=duration,
                error=str(e)
            )
    
    def _test_worker_serpapi_suggestions(self, query: str = "product manager") -> TestResult:
        """Test job suggestions, which is now the same as a standard search."""
        # This test is kept for logical separation, though it calls the same endpoint.
        return self._test_worker_serpapi_search(query)

    def run_tests(self) -> None:
        """Run all Worker API tests for SerpAPI integration."""
        self.logger.info("🔧 Testing Cloudflare Worker's SerpAPI Integration...")
        self.logger.info("=" * 50)
        
        # Health check
        result = self._test_worker_health()
        self.results.append(result)
        self._print_result(result)
        
        if not result.success:
            self.logger.error("⚠️  Worker is not responding. Skipping API tests.")
            self.logger.error("   To test the Worker API, start the development server with: pnpm run dev")
            return
        
        # Talent search
        result = self._test_worker_serpapi_search()
        self.results.append(result)
        self._print_result(result)
        
        # Talent suggestions (now a search)
        suggestions_result = self._test_worker_serpapi_suggestions()
        suggestions_result.test_name = "Worker SerpAPI Suggestions" # Rename for clarity
        self.results.append(suggestions_result)
        self._print_result(suggestions_result)
    
    def _print_result(self, result: TestResult) -> None:
        """Print test result with formatting and logging"""
        status = "✅" if result.success else "❌"
        duration = f"{result.duration:.2f}s"
        
        self.logger.info(f"{status} {result.test_name} ({duration})")
        
        if result.error:
            self.logger.error(f"   Error: {result.error}")
        
        if result.data and result.success:
            if 'jobs_results' in result.data:
                jobs_count = len(result.data.get('jobs_results', []))
                self.logger.info(f"   Found {jobs_count} jobs via SerpAPI")
            elif 'status' in result.data:
                self.logger.info(f"   Status: {result.data['status']}")
        
        self._log_to_d1(result.test_name, result.success, result.duration, result.error, result.data)
    
    def print_summary(self) -> None:
        """Print test summary"""
        self.logger.info("\n📊 Test Summary")
        self.logger.info("=" * 50)
        
        total_tests = len(self.results)
        successful_tests = sum(1 for r in self.results if r.success)
        failed_tests = total_tests - successful_tests
        
        self.logger.info(f"Total Tests: {total_tests}")
        self.logger.info(f"✅ Passed: {successful_tests}")
        self.logger.info(f"❌ Failed: {failed_tests}")
        
        if total_tests > 0:
            self.logger.info(f"Success Rate: {(successful_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            self.logger.info("\n❌ Failed Tests:")
            for result in self.results:
                if not result.success:
                    self.logger.info(f"   - {result.test_name}: {result.error}")
        
        total_duration = sum(r.duration for r in self.results)
        self.logger.info(f"\n⏱️  Total Duration: {total_duration:.2f}s")
        
        self._log_to_d1("SESSION_COMPLETE", successful_tests == total_tests, total_duration, 
                       f"Failed: {failed_tests}" if failed_tests > 0 else None)
        
        log_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs', 'google_talent_api.log')
        self.logger.info(f"\n🤖 AI Model: Read the full test session log at: {log_file_path}")
    
    def save_results(self, filename: str = None) -> None:
        """Save test results to JSON file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"serpapi_talent_api_test_results_{timestamp}.json"
        
        # Use the config function to get the correct assets path
        delivered_assets_dir = test_config.get_delivered_assets_path('talent_api')
        filepath = os.path.join(delivered_assets_dir, filename)
        
        results_data = {
            'timestamp': datetime.now().isoformat(),
            'worker_url': self.worker_url,
            'results': [{'test_name': r.test_name, 'success': r.success, 'duration': r.duration, 'error': r.error, 'data_keys': list(r.data.keys()) if r.data else None} for r in self.results]
        }
        
        with open(filepath, 'w') as f:
            json.dump(results_data, f, indent=2)
        
        print(f"\n💾 Results saved to: {filepath}")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Test SerpAPI Talent Integration via Cloudflare Worker')
    parser.add_argument('--worker-url', default=test_config.WORKER_URL,
                       help='Worker API URL (loaded from .dev.vars)')
    parser.add_argument('--local', action='store_true',
                       help='Override worker URL to http://localhost:8787')
    parser.add_argument('--api-key', default=test_config.WORKER_API_KEY,
                       help='Worker API key (loaded from .dev.vars)')
    parser.add_argument('--save-results', action='store_true',
                       help='Save results to a JSON file in delivered_assets')
    
    args = parser.parse_args()
    
    worker_url = 'http://localhost:8787' if args.local else args.worker_url
    
    if not worker_url:
        print("Error: Worker URL is not defined. Provide --worker-url or set WORKER_URL in .dev.vars.")
        sys.exit(1)
        
    if not args.api_key:
        print("Error: Worker API Key is not defined. Provide --api-key or set WORKER_API_KEY in .dev.vars.")
        sys.exit(1)

    print("🧪 SerpAPI Talent Integration Test Suite")
    print("=" * 50)
    print(f"Worker URL: {worker_url}")
    print(f"API Key: {'***'}")
    print()
    
    tester = TalentAPITester(worker_url, args.api_key)
    tester.run_tests()
    tester.print_summary()
    
    if args.save_results:
        tester.save_results()
    
    if any(not r.success for r in tester.results):
        sys.exit(1)

if __name__ == '__main__':
    main()
