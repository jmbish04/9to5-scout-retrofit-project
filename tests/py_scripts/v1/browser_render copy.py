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

# Add the project root to the Python path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup logging
def setup_logging():
    """Setup centralized logging to tests/logs/browser_render.log"""
    log_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'logs')
    os.makedirs(log_dir, exist_ok=True)
    
    log_file = os.path.join(log_dir, 'browser_render.log')
    
    # Configure logging to overwrite file each time
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler(log_file, mode='w'),  # Overwrite mode
            logging.StreamHandler(sys.stdout)  # Also log to console
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
    
    def __init__(self, worker_url: str = "http://localhost:8787", api_key: str = None):
        self.worker_url = worker_url.rstrip('/')
        self.api_key = api_key or os.getenv('WORKER_API_KEY', 'test-key')
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
            
            # Send to Worker API for D1 logging
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
    
    def _test_browser_rendering(self, url: str = "https://example.com") -> TestResult:
        """Test browser rendering functionality"""
        start_time = time.time()
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'url': url,
                'options': {
                    'waitForSelector': 'body',
                    'timeout': 30000,
                    'screenshot': True,
                    'pdf': False
                }
            }
            
            response = self._make_request(
                'POST', 
                f"{self.worker_url}/api/browser-rendering/render", 
                headers=headers,
                json=payload
            )
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return TestResult(
                    test_name="Browser Rendering",
                    success=True,
                    duration=duration,
                    data=data
                )
            else:
                return TestResult(
                    test_name="Browser Rendering",
                    success=False,
                    duration=duration,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Browser Rendering",
                success=False,
                duration=duration,
                error=str(e)
            )
    
    def _test_job_scraping(self, job_url: str = "https://jobs.lever.co/example") -> TestResult:
        """Test job scraping functionality"""
        start_time = time.time()
        try:
            headers = {
                'Authorization': f'Bearer {self.api_key}',
                'Content-Type': 'application/json'
            }
            
            payload = {
                'url': job_url,
                'scrapeType': 'job_posting',
                'options': {
                    'extractText': True,
                    'extractMetadata': True,
                    'screenshot': True
                }
            }
            
            response = self._make_request(
                'POST', 
                f"{self.worker_url}/api/browser-rendering/scrape", 
                headers=headers,
                json=payload
            )
            
            duration = time.time() - start_time
            
            if response.status_code == 200:
                data = response.json()
                return TestResult(
                    test_name="Job Scraping",
                    success=True,
                    duration=duration,
                    data=data
                )
            else:
                return TestResult(
                    test_name="Job Scraping",
                    success=False,
                    duration=duration,
                    error=f"HTTP {response.status_code}: {response.text}"
                )
        except Exception as e:
            duration = time.time() - start_time
            return TestResult(
                test_name="Job Scraping",
                success=False,
                duration=duration,
                error=str(e)
            )
    
    def run_tests(self, test_url: str = None) -> None:
        """Run all browser rendering tests"""
        self.logger.info("🔧 Testing Browser Rendering...")
        self.logger.info("=" * 50)
        
        # Health check
        result = self._test_worker_health()
        self.results.append(result)
        self._print_result(result)
        
        if not result.success:
            self.logger.error("❌ Worker is not responding. Skipping browser rendering tests.")
            return
        
        # Browser rendering test
        test_url = test_url or "https://example.com"
        result = self._test_browser_rendering(test_url)
        self.results.append(result)
        self._print_result(result)
        
        # Job scraping test
        result = self._test_job_scraping()
        self.results.append(result)
        self._print_result(result)
    
    def _print_result(self, result: TestResult) -> None:
        """Print test result with formatting and logging"""
        status = "✅" if result.success else "❌"
        duration = f"{result.duration:.2f}s"
        
        # Log to file and console
        self.logger.info(f"{status} {result.test_name} ({duration})")
        
        if result.error:
            self.logger.error(f"   Error: {result.error}")
        
        if result.data and result.success:
            # Print relevant data
            if 'html' in result.data:
                html_length = len(result.data.get('html', ''))
                self.logger.info(f"   HTML Length: {html_length} characters")
            if 'screenshot' in result.data:
                self.logger.info(f"   Screenshot: {result.data['screenshot']}")
            if 'metadata' in result.data:
                self.logger.info(f"   Metadata extracted: {len(result.data['metadata'])} fields")
        
        # Log to D1 database
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
        
        # Log session completion to D1
        self._log_to_d1("SESSION_COMPLETE", successful_tests == total_tests, total_duration, 
                       f"Failed: {failed_tests}" if failed_tests > 0 else None)
        
        # AI Model message
        log_file_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs', 'browser_render.log')
        self.logger.info(f"\n🤖 AI Model: Read the full test session log at: {log_file_path}")
        self.logger.info("   This log file contains only the current test session (overwritten each run)")
    
    def save_results(self, filename: str = None) -> None:
        """Save test results to JSON file"""
        if not filename:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"browser_render_test_results_{timestamp}.json"
        
        # Create delivered_assets directory if it doesn't exist
        delivered_assets_dir = os.path.join(os.path.dirname(__file__), '..', 'delivered_assets', 'browser')
        os.makedirs(delivered_assets_dir, exist_ok=True)
        
        # Use delivered_assets path if no full path provided
        if not os.path.isabs(filename):
            filename = os.path.join(delivered_assets_dir, filename)
        
        results_data = {
            'timestamp': datetime.now().isoformat(),
            'worker_url': self.worker_url,
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

def load_dev_vars():
    """Load variables from .dev.vars file"""
    dev_vars = {}
    dev_vars_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.dev.vars')
    
    if os.path.exists(dev_vars_path):
        with open(dev_vars_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    # Remove quotes if present
                    value = value.strip('"\'')
                    dev_vars[key] = value
    
    return dev_vars

def main():
    """Main function"""
    # Load .dev.vars
    dev_vars = load_dev_vars()
    
    parser = argparse.ArgumentParser(description='Test Browser Rendering')
    parser.add_argument('--worker-url', default=dev_vars.get('WORKER_URL', 'https://9to5-scout.hacolby.workers.dev'),
                       help='Worker API URL (default: from .dev.vars or https://9to5-scout.hacolby.workers.dev)')
    parser.add_argument('--local', action='store_true',
                       help='Use local development server (localhost:8787) instead of deployed URL')
    parser.add_argument('--api-key', default=dev_vars.get('WORKER_API_KEY'),
                       help='Worker API key (default: from .dev.vars or WORKER_API_KEY env var)')
    parser.add_argument('--url', default=None,
                       help='Test URL for browser rendering')
    
    args = parser.parse_args()
    
    # Override worker URL if local flag is set
    if args.local:
        args.worker_url = 'http://localhost:8787'
    
    print("🧪 Browser Rendering Test Suite")
    print("=" * 50)
    print(f"Worker URL: {args.worker_url}")
    print(f"API Key: {'***' if args.api_key else 'From env var'}")
    print(f"Test URL: {args.url or 'Default test URLs'}")
    print()
    
    # Create tester
    tester = BrowserRenderTester(args.worker_url, args.api_key)
    
    # Run tests
    tester.run_tests(args.url)
    
    # Print summary
    tester.print_summary()
    
    # Exit with error code if any tests failed
    if any(not r.success for r in tester.results):
        sys.exit(1)

if __name__ == '__main__':
    main()
