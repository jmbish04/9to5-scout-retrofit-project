import os
import sys
import argparse
import json
import time
import hashlib
from datetime import datetime

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

import test_config
from extractors import extract_json_data, extract_markdown, extract_snapshot_data

# --- Constants & Config ---
SERVICE_NAME = "render_rest_api" # Corrected service name for output path
ARTIFACTS_DIR = test_config.get_delivered_assets_path(SERVICE_NAME)
LOGGER, LOG_FILE_PATH = test_config.setup_service_logger(SERVICE_NAME)
BASE_API_URL = "https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/{endpoint}"

# --- API Client ---
def requests_retry_session(retries=3, backoff_factor=0.5, status_forcelist=(500, 502, 504)):
    session = requests.Session()
    retry = Retry(
        total=retries, read=retries, connect=retries,
        backoff_factor=backoff_factor, status_forcelist=status_forcelist
    )
    adapter = HTTPAdapter(max_retries=retry)
    session.mount('https://', adapter)
    return session

# --- Core Rendering Logic ---
def render_page(mode, url, user_agent, max_wait_ms, cookies=None):
    """Dispatcher for different rendering modes with robust error handling."""
    LOGGER.info(f"Starting render for mode '{mode}' on URL: {url}")
    
    account_id = test_config.CLOUDFLARE_ACCOUNT_ID
    api_token = test_config.BROWSER_RENDERING_TOKEN
    
    if not account_id or not api_token:
        LOGGER.error("Cloudflare credentials not found in config.")
        return {"status": "error", "reason": "AUTH_MISSING"}

    endpoint = {"json": "content", "markdown": "content", "snapshot": "content", "screenshot": "screenshot", "pdf": "pdf"}.get(mode)
    if not endpoint:
        return {"status": "error", "reason": f"Invalid mode: {mode}"}

    headers = {"Authorization": f"Bearer {api_token}", "Content-Type": "application/json"}
    payload = {
        "url": url, "gotoOptions": {"waitUntil": "networkidle0", "timeout": max_wait_ms},
        "setJavaScriptEnabled": True, "userAgent": user_agent, "cookies": cookies or [],
        "setExtraHTTPHeaders": {"Referer": "https://www.google.com/"}
    }
    if mode == 'screenshot':
        # Corrected: Removed the unsupported 'format' key.
        payload['screenshotOptions'] = {'fullPage': True}

    api_url = BASE_API_URL.format(account_id=account_id, endpoint=endpoint)
    start_time = time.time()

    try:
        session = requests_retry_session()
        response = session.post(api_url, headers=headers, json=payload, timeout=(max_wait_ms / 1000) + 20)
        latency = time.time() - start_time

        if response.status_code == 401:
            LOGGER.error("Authentication failed (401). Check API token.")
            return {"status": "error", "reason": "AUTH_REQUIRED", "latency": latency}

        # Handle binary content first
        if mode in ['pdf', 'screenshot']:
            if response.ok:
                return {"status": "success", "content": response.content, "latency": latency, "bytes": len(response.content)}
            else:
                LOGGER.error(f"API returned status {response.status_code} for binary content. Body: {response.text}")
                return {"status": "error", "reason": "API_ERROR", "details": response.text, "latency": latency}

        # For all other modes, expect JSON
        try:
            api_response = response.json()
        except json.JSONDecodeError:
            LOGGER.error(f"Failed to decode JSON. Status: {response.status_code}, Body: {response.text}")
            return {"status": "error", "reason": "INVALID_JSON", "details": response.text, "latency": latency}

        if not isinstance(api_response, dict):
            LOGGER.error(f"API returned unexpected type '{type(api_response)}' instead of dict. Content: {api_response}")
            return {"status": "error", "reason": "UNEXPECTED_RESPONSE_TYPE", "details": str(api_response), "latency": latency}

        if not api_response.get('success'):
            errors = api_response.get('errors', "Unknown API error")
            LOGGER.error(f"API returned failure: {errors}")
            return {"status": "error", "reason": "API_FAILURE", "details": errors, "latency": latency}

        result_data = api_response.get('result')
        if not isinstance(result_data, dict):
            LOGGER.error(f"API 'result' field is not a dictionary. Content: {result_data}")
            return {"status": "error", "reason": "UNEXPECTED_RESULT_FORMAT", "details": str(result_data), "latency": latency}

        html_content = result_data.get('output', '')
        
        # Process the extracted HTML
        if mode == 'json':
            data = extract_json_data(url, html_content)
            return {"status": "success", "content": data, "latency": latency, "bytes": len(json.dumps(data))}
        if mode == 'markdown':
            data = extract_markdown(url, html_content)
            return {"status": "success", "content": data, "latency": latency, "bytes": len(data.encode())}
        if mode == 'snapshot':
            data = extract_snapshot_data(url, html_content)
            return {"status": "success", "content": data, "latency": latency, "bytes": len(json.dumps(data))}

    except requests.exceptions.RequestException as e:
        latency = time.time() - start_time
        LOGGER.error(f"Request failed for {url}: {e}", exc_info=True)
        return {"status": "error", "reason": "NETWORK_ERROR", "details": str(e), "latency": latency}

# --- Main Execution ---
def generate_safe_filename(url, mode, extension):
    domain = url.split('//')[-1].split('/')[0]
    url_hash = hashlib.md5(url.encode()).hexdigest()[:8]
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    return f"{domain.replace('.', '_')}_{url_hash}_{mode}_{timestamp}.{extension}"

def run_test_matrix(matrix_file, user_agent, max_wait_ms, cookies):
    LOGGER.info(f"Running test matrix from: {matrix_file}")
    try:
        with open(matrix_file, 'r') as f:
            urls_to_test = json.load(f)
        
        report = []
        for item in urls_to_test:
            url = item['url']
            LOGGER.info(f"--- Processing URL: {url} ---")
            for mode in ['json', 'markdown', 'snapshot', 'screenshot', 'pdf']:
                result = render_page(mode, url, user_agent, max_wait_ms, cookies)
                
                if result['status'] == 'success':
                    content = result['content']
                    ext = {'json': 'json', 'markdown': 'md', 'snapshot': 'json', 'screenshot': 'png', 'pdf': 'pdf'}[mode]
                    filename = generate_safe_filename(url, mode, ext)
                    output_path = os.path.join(ARTIFACTS_DIR, filename)
                    
                    write_mode = 'wb' if isinstance(content, bytes) else 'w'
                    encoding = None if isinstance(content, bytes) else 'utf-8'
                    with open(output_path, write_mode, encoding=encoding) as f:
                        if isinstance(content, dict):
                            json.dump(content, f, indent=2)
                        else:
                            f.write(content)
                    LOGGER.info(f"Saved artifact to: {output_path}")

                report_item = {'url': url, 'mode': mode, **result}
                if 'content' in report_item:
                    del report_item['content']
                report.append(report_item)
                time.sleep(2) # Be nice to the API
        
        report_path = os.path.join(ARTIFACTS_DIR, 'run_matrix_report.json')
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2)
        LOGGER.info(f"Matrix run complete. Report saved to {report_path}")

    except FileNotFoundError:
        LOGGER.error(f"Matrix file not found: {matrix_file}")
        sys.exit(1)
    except Exception as e:
        LOGGER.error(f"Failed to run matrix: {e}", exc_info=True)
        sys.exit(1)

def main():
    parser = argparse.ArgumentParser(description="Advanced job scraper using Cloudflare Browser Rendering API.")
    parser.add_argument('--mode', choices=['json', 'markdown', 'snapshot', 'screenshot', 'pdf'], help="Rendering mode for a single run.")
    parser.add_argument('--url', help="The URL to scrape for a single run.")
    parser.add_argument('--out', help="Output file path for a single run.")
    parser.add_argument('--max-wait-ms', type=int, default=25000, help="Maximum wait time for page rendering.")
    parser.add_argument('--user-agent', default="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36", help="User agent string.")
    parser.add_argument('--cookies-file', help="Path to a JSON file with cookies.")
    parser.add_argument('--run-matrix', help="Run the predefined test matrix. Default action if no other args.", nargs='?', const=True, default=False)

    args = parser.parse_args()

    try:
        cookies = None
        if args.cookies_file:
            with open(args.cookies_file, 'r') as f:
                cookies = json.load(f)

        if args.run_matrix or not (args.mode and args.url):
            matrix_path = args.run_matrix if isinstance(args.run_matrix, str) else os.path.join(os.path.dirname(__file__), 'examples', 'run_matrix.json')
            run_test_matrix(matrix_path, args.user_agent, args.max_wait_ms, cookies)
        else:
            result = render_page(args.mode, args.url, args.user_agent, args.max_wait_ms, cookies)
            if result['status'] == 'success':
                print(json.dumps({k: v for k, v in result.items() if k != 'content'}, indent=2))
            else:
                LOGGER.error(f"Scraping failed: {result}")
                sys.exit(1)

    finally:
        print(f"\nFull logs for this run are available at: {LOG_FILE_PATH}")

if __name__ == "__main__":
    main()
