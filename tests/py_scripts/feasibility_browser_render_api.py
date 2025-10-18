import os
import argparse
import requests
import json
from datetime import datetime
import re
import base64
import test_config

# --- Configuration ---
OUTPUT_DIR = test_config.get_delivered_assets_path('render_rest_api')
BASE_API_URL = "https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/{endpoint}"

# --- Helper Functions ---

def generate_filename(url, endpoint, extension):
    """Generates a safe and unique filename from a URL."""
    sanitized_url = re.sub(r'https?://', '', url)
    sanitized_url = re.sub(r'[^a-zA-Z0-9_-]', '_', sanitized_url)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return f"{sanitized_url[:50]}_{endpoint}_{timestamp}.{extension}"

def make_api_request(endpoint, account_id, api_token, payload):
    """Makes a POST request to the specified Cloudflare API endpoint."""
    if not account_id or not api_token:
        print("Error: Cloudflare Account ID or API Token is missing from config.")
        return None
        
    url = BASE_API_URL.format(account_id=account_id, endpoint=endpoint)
    headers = {
        "Authorization": f"Bearer {api_token}",
        "Content-Type": "application/json"
    }
    print(f"Sending request to: {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}")
    
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=120)
        response.raise_for_status()
        return response
    except requests.exceptions.RequestException as e:
        print(f"API Request failed: {e}")
        if e.response is not None:
            print(f"Response Status: {e.response.status_code}")
            try:
                print(f"Response Body: {e.response.json()}")
            except json.JSONDecodeError:
                print(f"Response Body: {e.response.text}")
        return None

# --- API Endpoint Functions ---

def render_content(url, account_id, api_token):
    """Fetches rendered HTML content."""
    payload = {"url": url}
    response = make_api_request("content", account_id, api_token, payload)
    if response:
        result = response.json()
        print("--- Rendered Content (HTML) ---")
        print(json.dumps(result, indent=2))
        filename = generate_filename(url, "content", "html")
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(result.get('result', ''))
        print(f"HTML content saved to {filepath}")

def render_json_extract(url, account_id, api_token):
    """Extracts JSON using a prompt."""
    prompt = input("Enter the prompt for JSON extraction (e.g., 'Extract the title and author'): ")
    schema = {"type": "object", "properties": {"title": {"type": "string"}, "author": {"type": "string"}}}
    payload = {"url": url, "prompt": prompt, "schema": schema}
    response = make_api_request("json", account_id, api_token, payload)
    if response:
        print("--- Extracted JSON ---")
        print(json.dumps(response.json(), indent=2))

def render_links(url, account_id, api_token):
    """Fetches all links from the page."""
    payload = {"url": url}
    response = make_api_request("links", account_id, api_token, payload)
    if response:
        print("--- Found Links ---")
        print(json.dumps(response.json(), indent=2))

def render_markdown(url, account_id, api_token):
    """Fetches page content as Markdown."""
    payload = {"url": url}
    response = make_api_request("markdown", account_id, api_token, payload)
    if response:
        result = response.json()
        print("--- Rendered Markdown ---")
        print(json.dumps(result, indent=2))
        filename = generate_filename(url, "markdown", "md")
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(result.get('result', ''))
        print(f"Markdown content saved to {filepath}")

def render_pdf(url, account_id, api_token):
    """Generates a PDF of the page."""
    payload = {"url": url}
    response = make_api_request("pdf", account_id, api_token, payload)
    if response and response.headers.get('Content-Type') == 'application/pdf':
        filename = generate_filename(url, "pdf", "pdf")
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, 'wb') as f:
            f.write(response.content)
        print(f"PDF saved successfully to {filepath}")
    elif response:
        print("Failed to get PDF. API response:")
        print(response.text)

def render_scrape(url, account_id, api_token):
    """Scrapes elements based on a CSS selector."""
    selector = input("Enter the CSS selector to scrape (e.g., 'h1'): ")
    payload = {"url": url, "elements": [{"selector": selector}]}
    response = make_api_request("scrape", account_id, api_token, payload)
    if response:
        print("--- Scrape Results ---")
        print(json.dumps(response.json(), indent=2))

def render_screenshot(url, account_id, api_token):
    """Takes a screenshot of the page."""
    payload = {"url": url}
    # This endpoint returns a JSON response with status, not the image directly.
    # The actual image is delivered to a pre-configured R2 bucket.
    # This script will just show the API status response.
    response = make_api_request("screenshot", account_id, api_token, payload)
    if response:
        print("--- Screenshot API Response ---")
        print(json.dumps(response.json(), indent=2))
        print("\nNote: The screenshot is delivered to your configured R2 bucket, not returned directly.")

def render_snapshot(url, account_id, api_token):
    """Gets HTML content and a base64 encoded screenshot."""
    payload = {"url": url}
    response = make_api_request("snapshot", account_id, api_token, payload)
    if response:
        result = response.json().get('result', {})
        print("--- Snapshot API Response ---")
        
        # Save HTML
        html_content = result.get('content')
        if html_content:
            html_filename = generate_filename(url, "snapshot", "html")
            html_filepath = os.path.join(OUTPUT_DIR, html_filename)
            with open(html_filepath, 'w', encoding='utf-8') as f:
                f.write(html_content)
            print(f"HTML content saved to {html_filepath}")
        else:
            print("No HTML content in response.")

        # Save Screenshot
        screenshot_b64 = result.get('screenshot')
        if screenshot_b64:
            png_filename = generate_filename(url, "snapshot", "png")
            png_filepath = os.path.join(OUTPUT_DIR, png_filename)
            try:
                img_data = base64.b64decode(screenshot_b64)
                with open(png_filepath, 'wb') as f:
                    f.write(img_data)
                print(f"Screenshot saved to {png_filepath}")
            except (base64.binascii.Error, TypeError) as e:
                print(f"Error decoding or saving screenshot: {e}")
        else:
            print("No screenshot data in response.")


# --- Main Execution ---

def main_menu():
    """Displays an interactive menu for the user."""
    # Pull creds from the centralized config
    account_id = test_config.CLOUDFLARE_ACCOUNT_ID
    api_token = test_config.BROWSER_RENDERING_TOKEN

    endpoints = {
        '1': ('Content (HTML)', render_content),
        '2': ('JSON Extract', render_json_extract),
        '3': ('Links', render_links),
        '4': ('Markdown', render_markdown),
        '5': ('PDF', render_pdf),
        '6': ('Scrape', render_scrape),
        '7': ('Screenshot (API Status)', render_screenshot),
        '8': ('Snapshot (HTML + Screenshot)', render_snapshot),
    }

    while True:
        print("\n--- Cloudflare Browser Rendering API Feasibility Tester ---")
        for key, (name, _) in endpoints.items():
            print(f"{key}. {name}")
        print("0. Exit")

        choice = input("Select an endpoint to test: ")
        if choice == '0':
            break
        
        if choice in endpoints:
            name, func = endpoints[choice]
            print(f"\n--- Testing: {name} ---")
            url = input("Enter the URL to process: ")
            if not url.startswith(('http://', 'https://')):
                url = 'https://' + url
            
            func(url, account_id, api_token)
        else:
            print("Invalid choice, please try again.")

def main():
    """Main function to parse arguments and run the script."""
    parser = argparse.ArgumentParser(description="Test Cloudflare's Browser Rendering API.")
    parser.add_argument(
        'endpoint', 
        nargs='?', 
        choices=['content', 'json', 'links', 'markdown', 'pdf', 'scrape', 'screenshot', 'snapshot'],
        help="The API endpoint to call."
    )
    parser.add_argument('url', nargs='?', help="The URL to render.")
    
    args = parser.parse_args()

    # Create output directory if it doesn't exist
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    
    # Pull creds from the centralized config
    account_id = test_config.CLOUDFLARE_ACCOUNT_ID
    api_token = test_config.BROWSER_RENDERING_TOKEN

    if args.endpoint and args.url:
        endpoint_map = {
            'content': render_content,
            'json': render_json_extract,
            'links': render_links,
            'markdown': render_markdown,
            'pdf': render_pdf,
            'scrape': render_scrape,
            'screenshot': render_screenshot,
            'snapshot': render_snapshot,
        }
        func = endpoint_map.get(args.endpoint)
        if func:
            func(args.url, account_id, api_token)
        else:
            print(f"Error: Unknown endpoint '{args.endpoint}'")
    else:
        main_menu()

if __name__ == "__main__":
    main()