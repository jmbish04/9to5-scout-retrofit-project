#!/usr/bin/env python3
"""
Browser Rendering Test Suite

This script tests browser rendering functionality for job scraping and content extraction.

Usage:
    python tests/browser_render.py
    python tests/browser_render.py --url https://example.com
    python tests/browser_render.py --worker-url http://localhost:8787
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
    """Setup centralized logging to tests/logs/browser_render.log"""
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, 'browser_render.log')
    
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

class BrowserRenderTester:
    """Browser rendering test class"""
    
    def __init__(self, worker_url: str, api_key: str):
        self.worker_url = worker_url.rstrip('/')
        self.api_key = api_key
        self.results: List[TestResult] = []
        self.logger = setup_logging()
        self.session_id = f"browser_render_{int(time.time())}"
        
        self.logger.info(f"Starting Browser Render test session: {self.session_id}")
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
                'test_type': 'browser_render'
            }
            
            response = self._make_request('POST', f"{self.worker_url}/api/logs/test", 
                                        json=log_entry,
                                        headers={'Content-Type': 'application/json'})
            
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
                return TestResult("Worker Health Check", success=True, duration=duration, data=data)
            else:
                duration = time.time() - start_time
                return TestResult("Worker Health Check", success=False, duration=duration, error=f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            duration = time.time() - start_time
            return TestResult("Worker Health Check", success=False, duration=duration, error=str(e))
    
    def _test_browser_rendering(self, url: str = "https://example.com") -> TestResult:
        """Test browser rendering functionality"""
        start_time = time.time()
        try:
            headers = {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'}
            payload = {'url': url, 'options': {'waitForSelector': 'body', 'timeout': 30000, 'screenshot': True, 'pdf': False}}
            
            response = self._make_request('POST', f"{self.worker_url}/api/browser-rendering/render", headers=headers, json=payload)
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                return TestResult("Browser Rendering", success=True, duration=duration, data=response.json())
            else:
                return TestResult("Browser Rendering", success=False, duration=duration, error=f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            duration = time.time() - start_time
            return TestResult("Browser Rendering", success=False, duration=duration, error=str(e))
    
    def _test_job_scraping(self, job_url: str = "https://jobs.lever.co/example") -> TestResult:
        """Test job scraping functionality"""
        start_time = time.time()
        try:
            headers = {'Authorization': f'Bearer {self.api_key}', 'Content-Type': 'application/json'}
            payload = {'url': job_url, 'scrapeType': 'job_posting', 'options': {'extractText': True, 'extractMetadata': True, 'screenshot': True}}
            
            response = self._make_request('POST', f"{self.worker_url}/api/browser-rendering/scrape", headers=headers, json=payload)
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                return TestResult("Job Scraping", success=True, duration=duration, data=response.json())
            else:
                return TestResult("Job Scraping", success=False, duration=duration, error=f"HTTP {response.status_code}: {response.text}")
        except Exception as e:
            duration = time.time() - start_time
            return TestResult("Job Scraping", success=False, duration=duration, error=str(e))
    
    def run_tests(self, test_url: str = None) -> None:
        """Run all browser rendering tests"""
        self.logger.info("🔧 Testing Browser Rendering...")
        self.logger.info("=" * 50)
        
        result = self._test_worker_health()
        self.results.append(result)
        self._print_result(result)
        
        if not result.success:
            self.logger.error("❌ Worker is not responding. Skipping browser rendering tests.")
            return
        
        result = self._test_browser_rendering(test_url or "https://example.com")
        self.results.append(result)
        self._print_result(result)
        
        result = self._test_job_scraping()
        self.results.append(result)
        self._print_result(result)
    
    def _print_result(self, result: TestResult) -> None:
        """Print test result with formatting and logging"""
        status = "✅" if result.success else "❌"
        duration = f"{result.duration:.2f}s"
        
        self.logger.info(f"{status} {result.test_name} ({duration})")
        
        if result.error:
            self.logger.error(f"   Error: {result.error}")
        
        if result.data and result.success:
            if 'html' in result.data:
                self.logger.info(f"   HTML Length: {len(result.data.get('html', ''))} characters")
            if 'screenshot' in result.data:
                self.logger.info(f"   Screenshot: {result.data['screenshot']}")
            if 'metadata' in result.data:
                self.logger.info(f"   Metadata extracted: {len(result.data['metadata'])} fields")
        
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
        
        log_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs', 'browser_render.log')
        self.logger.info(f"\n🤖 AI Model: Read the full test session log at: {log_file_path}")
    
    def save_results(self, filename: str = None) -> None:
        """Save test results to JSON file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"browser_render_test_results_{timestamp}.json"
        
        # Use the config function to get the correct assets path
        delivered_assets_dir = test_config.get_delivered_assets_path('browser_render')
        
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
    parser = argparse.ArgumentParser(description='Test Browser Rendering')
    parser.add_argument('--worker-url', default=test_config.WORKER_URL or 'https://9to5-scout.hacolby.workers.dev',
                       help='Worker API URL')
    parser.add_argument('--local', action='store_true',
                       help='Use local development server (localhost:8787)')
    parser.add_argument('--api-key', default=test_config.WORKER_API_KEY,
                       help='Worker API key')
    parser.add_argument('--url', default=None,
                       help='Test URL for browser rendering')
    
    args = parser.parse_args()
    
    if args.local:
        args.worker_url = 'http://localhost:8787'
    
    if not args.api_key:
        print("Error: WORKER_API_KEY not found in .dev.vars or arguments.")
        sys.exit(1)

    print("🧪 Browser Rendering Test Suite")
    print("=" * 50)
    print(f"Worker URL: {args.worker_url}")
    print(f"API Key: {'***'}")
    print(f"Test URL: {args.url or 'Default test URLs'}")
    print()
    
    tester = BrowserRenderTester(args.worker_url, args.api_key)
    tester.run_tests(args.url)
    tester.print_summary()
    
    if any(not r.success for r in tester.results):
        sys.exit(1)
