# Cloudflare Browser Rendering API Scraper Test Suite

This directory contains a Python-based test suite for scraping job postings using the Cloudflare Browser Rendering API. It provides a CLI for single URL scrapes and an automated test matrix runner.

## Features

- **Multiple Rendering Modes**: Scrape pages as structured `json`, readable `markdown`, a technical `snapshot`, a `screenshot`, or a `pdf`.
- **Advanced Extraction**: Prioritizes JSON-LD (`JobPosting` schema) and falls back to meta tags and heuristics for reliable data extraction.
- **Robust Client**: Includes automatic retries with exponential backoff and jitter for handling transient network issues.
- **Automated Testing**: A `--run-matrix` flag executes a predefined set of URLs across all modes to test scraper resilience.
- **Centralized Configuration**: All API keys and settings are managed in a central `test_config.py` module.

## Setup

### 1. Dependencies

Install the required Python packages:

```bash
pip install -r requirements.txt
```

### 2. Configuration

This script uses the project's central `.dev.vars` file. Ensure the following variables are set:

- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID.
- `BROWSER_RENDERING_TOKEN`: An API token with "Browser Rendering Write" permissions.

The script will automatically locate the `.dev.vars` file at the project root.

## Usage

The main script is `test_feasibility_browser_render_api.py`.

### Single Scrape

You can perform a scrape on a single URL with a specific mode.

**Syntax:**
```bash
python tests/py_scripts/test_feasibility_browser_render_api.py --mode <MODE> --url <URL> [OPTIONS]
```

**Modes:**
- `json`: Extracts a structured JSON object with job details.
- `markdown`: Converts the main job posting content to Markdown.
- `snapshot`: Gathers technical metadata like meta tags, links, and scripts.
- `screenshot`: Saves a full-page PNG of the URL.
- `pdf`: Saves a full-page PDF of the URL.

**Examples:**

**1. Extract JSON and print to console:**
```bash
python tests/py_scripts/test_feasibility_browser_render_api.py \
  --mode json \
  --url "https://boards.greenhouse.io/cloudflare/jobs/7310236"
```

**2. Save a PDF to the artifacts directory:**
The output path is automatically generated in `tests/delivered_assets/browser_render_jobs/`.
```bash
python tests/py_scripts/test_feasibility_browser_render_api.py \
  --mode pdf \
  --url "https://www.mongodb.com/careers/positions/6212358"
```

**3. Save a screenshot to a specific file:**
```bash
python tests/py_scripts/test_feasibility_browser_render_api.py \
  --mode screenshot \
  --url "https://jobs.lever.co/asana/7a936c8b-2d59-4349-8d7f-335a3a3a3b6d" \
  --out "/tmp/asana_job.png"
```

### Automated Test Matrix

To run a series of predefined tests against multiple URLs and modes, use the `--run-matrix` flag. This is ideal for regression testing.

The test matrix is defined in `examples/run_matrix.json`.

**Command:**
```bash
python tests/py_scripts/test_feasibility_browser_render_api.py --run-matrix ./tests/py_scripts/examples/run_matrix.json
```

This will:
1. Iterate through each URL in the JSON file.
2. Run all 5 rendering modes against each URL.
3. Save all generated artifacts (`.json`, `.md`, `.png`, `.pdf`) to the `tests/delivered_assets/browser_render_jobs/` directory.
4. Create a final `run_matrix_report.json` in the same directory summarizing the success or failure of each attempt.

## File Structure

- `test_feasibility_browser_render_api.py`: The main CLI and API client.
- `extractors.py`: Contains the logic for parsing HTML and extracting data.
- `test_config.py`: Centralized configuration loader.
- `requirements.txt`: Python dependencies.
- `examples/`: Contains seed data and the test matrix definition.
- `tests/delivered_assets/browser_render_jobs/`: The default output directory for all generated artifacts and logs.
