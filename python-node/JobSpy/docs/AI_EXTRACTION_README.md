# JobSpy AI-Enhanced Job Data Extraction

This enhanced `demo.py` script combines JobSpy's job scraping capabilities with AI-powered structured data extraction using a Cloudflare Worker API.

## Features

✅ **Self-contained operation** - No CLI arguments required
✅ **JobSpy integration** - Scrapes jobs from Indeed, LinkedIn, ZipRecruiter, and Google Jobs
✅ **AI-powered extraction** - Uses OpenAI-compatible API to extract structured job data
✅ **Structured output** - Outputs standardized JSON format with consistent schema
✅ **Comprehensive data** - Extracts company info, job details, salary, requirements, and more

## Quick Start

1. **Install dependencies:**
   ```bash
   pip install -U python-jobspy requests python-dotenv
   ```

2. **Set your API key** (edit `.env` file):
   ```properties
   WORKER_API_KEY=your-actual-api-key-here
   ```

3. **Run the script:**
   ```bash
   python demo.py
   ```

## Output Files

- **`jobs_output.csv`** - Raw JobSpy data (all original fields)
- **`structured_jobs.json`** - AI-extracted structured data with metadata

## Structured Data Schema

The AI extraction produces this standardized format:

```json
{
  "company_name": "string",
  "company_description": "string",
  "job_title": "string",
  "job_location": "string",
  "employment_type": "string",
  "department": "string",
  "salary_min": "number",
  "salary_max": "number",
  "salary_currency": "string",
  "salary_raw": "string",
  "job_description": "string (markdown)",
  "job_requirements": "string (markdown)",
  "posted_date": "string (ISO format)",
  "source_url": "string",
  "_metadata": {
    "original_id": "string",
    "site": "string",
    "extraction_timestamp": "string",
    "raw_job_url": "string"
  }
}
```

## Worker API Configuration

The script uses the Cloudflare Worker API endpoint:
- **URL:** `https://openai-api-worker.hacolby.workers.dev` (from `.env` file)
- **Endpoint:** `/v1/chat/completions/structured`
- **Model:** `@cf/meta/llama-4-scout-17b-16e-instruct` (Cloudflare AI Llama-4)
- **Authentication:** Bearer token (from `.env` file)
- **Features:** Structured JSON outputs, 131K context window, function calling

## Search Configuration

Default search parameters (can be modified in `demo.py`):

```python
DEFAULT_SEARCH = (
    '("business intelligence" OR "data analytics" OR "technical program manager" '
    'OR "program manager" OR "product operations" OR "full-stack" OR "full stack") '
    '(ai OR automation OR "workflow" OR python OR sql OR bigquery OR "cloudflare workers" OR next.js) '
    '(legal OR "legal ops" OR "e-discovery" OR compliance OR enterprise) '
    '-Intern -internship -recruiter -agency -staffing -sales -marketing -clearance -TS/SCI'
)

# Additional settings:
location = "San Francisco, CA"
results_wanted = 20
hours_old = 72
sites = ["indeed", "linkedin", "zip_recruiter", "google"]
```

## Sample Output

**Raw JobSpy Data:**
```csv
id,site,job_url,title,company,location,date_posted,job_type,min_amount,max_amount,currency,description,...
```

**Structured AI-Extracted Data:**
```json
[
  {
    "company_name": "Amazon Web Services",
    "company_description": "Leading cloud computing platform...",
    "job_title": "Principal Solutions Architect",
    "job_location": "San Francisco, CA, US",
    "employment_type": "fulltime",
    "department": "Solutions Architecture",
    "salary_min": 164500,
    "salary_max": 284300,
    "salary_currency": "USD",
    "salary_raw": "$164,500 - $284,300",
    "job_description": "**DESCRIPTION**\n\nWe're seeking a Principal Solutions Architect...",
    "job_requirements": "## Requirements\n- Deep hands-on technical expertise\n- Experience with scalable systems...",
    "posted_date": "2025-10-02",
    "source_url": "https://www.indeed.com/viewjob?jk=5ff66d246e28e14a",
    "_metadata": {
      "original_id": "in-5ff66d246e28e14a",
      "site": "indeed",
      "extraction_timestamp": "2025-10-15T09:47:30.123456",
      "raw_job_url": "https://www.indeed.com/viewjob?jk=5ff66d246e28e14a"
    }
  }
]
```

## Troubleshooting

### No API Key Set
If you see: `⚠️ Skipping AI processing - please set WORKER_API_KEY in the script`
- Edit `.env` file and set `WORKER_API_KEY=your-actual-api-key`

### API Errors
- Check your API key is valid
- Verify the worker endpoint is accessible
- Check rate limits if you see 429 errors

### JobSpy Errors
- Some sites may block requests (normal behavior)
- ZipRecruiter often returns 429 (rate limit) errors
- LinkedIn may require special handling for some searches

## Testing

Run the demo test to see expected output format:
```bash
python test_demo.py
```

This shows the data transformation without making actual API calls.

## Customization

**Modify search terms:**
Edit `DEFAULT_SEARCH` and `DEFAULT_GOOGLE` variables in `demo.py`

**Change job sites:**
Modify the `sites` list in the `main()` function

**Adjust result count:**
Change `results_wanted` parameter (default: 20 per site)

**Update schema:**
Modify `JOB_SCHEMA` to add/remove fields for extraction

**Different AI model:**
Change the `DEFAULT_MODEL` variable in `demo.py` to use different models:
- OpenAI: `gpt-4o-mini`, `gpt-4o`
- Gemini: `gemini-2.5-flash`, `gemini-2.5-pro`
- Cloudflare: `@cf/meta/llama-4-scout-17b-16e-instruct` (current), `@cf/meta/llama-3.3-70b-instruct-fp8-fast`

## Requirements

- Python 3.10+
- `python-jobspy` package
- `requests` package
- `python-dotenv` package
- Valid API key for the Cloudflare Worker endpoint
- Internet connection for web scraping and API calls
