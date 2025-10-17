# Cloudflare Browser Rendering API Python Test Script

This Python script mirrors the functionality of the JavaScript `browser-rendering-example.js` script and tests the Cloudflare Browser Rendering REST API.

## Features

- **Screenshot Capture**: Full-page and viewport screenshots
- **Content Extraction**: HTML content with resource filtering
- **Markdown Extraction**: Convert web pages to markdown
- **JSON Extraction**: AI-powered structured data extraction
- **Link Extraction**: Extract all links from web pages
- **Element Scraping**: Scrape specific CSS selectors
- **PDF Generation**: Convert web pages to PDF
- **LinkedIn Job Scraping**: Authenticated scraping of LinkedIn job postings
- **Asset Management**: Save files locally and prepare for R2 upload

## Prerequisites

1. **Python 3.7+**
2. **Cloudflare Account** with Browser Rendering API access
3. **API Token** with Browser Rendering permissions
4. **Account ID** from Cloudflare dashboard

## Installation

### Quick Setup

```bash
# Run the setup script (creates venv and installs dependencies)
./setup_venv.sh
```

### Manual Setup

```bash
# Create virtual environment
python3 -m venv venv_tests

# Activate virtual environment
source venv_tests/bin/activate

# Upgrade pip
pip install -U pip

# Install dependencies
pip install -r requirements.txt
```

## Configuration

The script loads configuration from `.dev.vars` file in the project root:

```bash
# .dev.vars
BROWSER_RENDERING_TOKEN="your-api-token"
CLOUDFLARE_ACCOUNT_ID="your-account-id"
LINKEDIN_USERNAME="your-linkedin-email"
LINKEDIN_PASSWORD="your-linkedin-password"
```

## Usage

### Quick Test Runner

```bash
# Run basic tests
./run_tests.sh --basic

# Run comprehensive test
./run_tests.sh --comprehensive

# Scrape LinkedIn job (FULL GAMBIT)
./run_tests.sh --linkedin-job-id 4274231706

# Run with R2 upload
./run_tests.sh --r2

# LinkedIn scraping with R2 upload
./run_tests.sh --r2-linkedin 4274231706
```

### Manual Execution

```bash
# Activate virtual environment first
source venv_tests/bin/activate

# Run all basic tests
python test_browser_rendering.py --basic

# Run comprehensive test
python test_browser_rendering.py --comprehensive

# Scrape a specific LinkedIn job (FULL GAMBIT)
python test_browser_rendering.py --linkedin-job-id 4274231706

# Run with R2 upload
python test_browser_rendering_with_r2.py --basic
```

## Output

All generated assets are saved to:

- **Local**: `scripts/assets/browser-render/`
- **R2 Bucket**: `tests/assets/browser-render/` (when R2 integration is added)

### File Types Generated

#### Basic Tests

- **Screenshots**: `.png` files
- **HTML Content**: `.html` files
- **Markdown**: `.md` files
- **JSON Data**: `.json` files
- **PDFs**: `.pdf` files

#### LinkedIn Job Scraping (FULL GAMBIT)

- **Content**: `.html` - Full HTML content
- **Screenshots**:
  - `screenshot-viewport.png` - Viewport screenshot
  - `screenshot-fullpage.png` - Full page screenshot
- **Markdown**: `.md` - Converted to markdown
- **JSON Data**: `.json` - AI-extracted structured data
- **Links**: `.json` - All extracted links
- **Scraped Elements**: `.json` - Specific element data
- **PDF**: `.pdf` - Full page PDF document

#### Logging

- **Console**: Real-time progress and results
- **Log File**: `browser_rendering_test.log` - Detailed logs (overwritten each run)
- **AI Agent Reference**: Console output includes log file path for AI review

## Test Comparison

This Python script provides the same functionality as the JavaScript version:

| Feature         | JavaScript | Python |
| --------------- | ---------- | ------ |
| Screenshot      | ✅         | ✅     |
| Content         | ✅         | ✅     |
| Markdown        | ✅         | ✅     |
| JSON Extraction | ✅         | ✅     |
| Links           | ✅         | ✅     |
| Scraping        | ✅         | ✅     |
| PDF             | ✅         | ✅     |
| LinkedIn Auth   | ✅         | ✅     |
| Local Storage   | ✅         | ✅     |
| R2 Upload       | ✅         | ✅     |

## Troubleshooting

### Common Issues

1. **API Token Invalid**: Verify your `BROWSER_RENDERING_TOKEN` is correct
2. **Account ID Wrong**: Check your `CLOUDFLARE_ACCOUNT_ID` in the dashboard
3. **LinkedIn Auth Failed**: Ensure `LINKEDIN_USERNAME` and `LINKEDIN_PASSWORD` are correct
4. **Network Errors**: Check your internet connection and Cloudflare API status

### Debug Mode

Enable debug logging by modifying the script:

```python
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(levelname)s - %(message)s')
```

## R2 Integration via Worker Endpoint

The script supports R2 bucket upload through the worker endpoint. To enable R2 upload:

1. Install requests: `pip install requests`
2. Add worker configuration to `.dev.vars`:
   ```
   WORKER_URL=https://your-worker.your-subdomain.workers.dev
   WORKER_API_KEY=your-worker-api-key
   ```
3. Use the enhanced test script: `python3 test_browser_rendering_with_r2.py`

The worker endpoint provides secure R2 upload with authentication and proper error handling.

## File Structure

```
scripts/tests/
├── test_browser_rendering.py    # Main test script
├── requirements.txt             # Python dependencies
└── README.md                   # This file

scripts/assets/browser-render/   # Generated assets (gitignored)
├── screenshot-*.png
├── content-*.html
├── markdown-*.md
├── json-*.json
├── pdf-*.pdf
└── linkedin-job-*-*
```
