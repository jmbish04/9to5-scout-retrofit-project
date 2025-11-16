# Company Career Page Scraping

This document describes the company career page scraping functionality that uses the Cloudflare Browser Rendering API to automatically discover and scrape job postings from company career pages.

## Overview

The company scraping system provides:

1. **Company Management API** - CRUD operations for company records
2. **Career Page Scraping** - Automated scraping using Browser Rendering API
3. **Job Discovery** - Extract job links from career pages
4. **Structured Job Extraction** - Use AI to extract structured job data
5. **Scheduled Workflows** - Automated periodic scraping
6. **Universal Approach** - Works for any career page format

## API Endpoints

### Company Management

#### Create Company
```http
POST /api/companies
Content-Type: application/json

{
  "name": "Cloudflare",
  "normalized_domain": "cloudflare.com",
  "website_url": "https://www.cloudflare.com",
  "careers_url": "https://www.cloudflare.com/careers/",
  "description": "Leading edge network infrastructure company"
}
```

#### List Companies
```http
GET /api/companies?limit=25&offset=0&query=search_term
```

#### Get Company
```http
GET /api/companies/{company_id}
```

#### Update Company
```http
PUT /api/companies/{company_id}
Content-Type: application/json

{
  "careers_url": "https://new-careers-url.com",
  "description": "Updated description"
}
```

#### Delete Company
```http
DELETE /api/companies/{company_id}
```

### Scraping Operations

#### Scrape Single Company
```http
POST /api/companies/{company_id}/scrape
```

Response:
```json
{
  "company_id": "uuid",
  "careers_url": "https://company.com/careers",
  "scraped_at": "2025-01-17T10:00:00Z",
  "job_links_found": 25,
  "jobs_scraped": 20,
  "jobs_queued": 20,
  "errors": []
}
```

#### Scrape All Companies
```http
POST /api/companies/scrape-all
```

Response:
```json
{
  "total_companies": 10,
  "scraped_companies": 8,
  "total_jobs_queued": 150,
  "results": [...]
}
```

#### Get Scraping Status
```http
GET /api/companies/{company_id}/scraping-status
```

## Scraping Process

### Step 1: Link Discovery
Uses the `/links` Browser Rendering API endpoint to extract all links from the career page:

```javascript
const response = await env.MYBROWSER.fetch('https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/browser-rendering/links', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    url: careersUrl,
    visibleLinksOnly: true,
    excludeExternalLinks: true
  })
});
```

### Step 2: Job Link Filtering
Filters links to identify job-related URLs using pattern matching:

```javascript
const jobPatterns = [
  /\/jobs?\//,
  /\/careers?\/.*job/i,
  /\/positions?\//,
  /\/job-details?/,
  // etc.
];
```

### Step 3: Job Data Extraction
Uses the `/json` Browser Rendering API with AI to extract structured job data:

```javascript
const response = await env.MYBROWSER.fetch('https://api.cloudflare.com/client/v4/accounts/ACCOUNT_ID/browser-rendering/json', {
  method: 'POST',
  body: JSON.stringify({
    url: jobUrl,
    prompt: "Extract the job posting details...",
    response_format: {
      type: "json_schema",
      schema: jobSchema
    }
  })
});
```

### Step 4: Job Queue Integration
Extracted jobs are automatically queued for processing in the normal job processing pipeline:

```javascript
await scrapeQueueService.enqueue({
  job_url: jobData.application_url,
  source: 'company-careers',
  company: jobData.company,
  title: jobData.title,
  // ... other job fields
});
```

## Scheduled Workflows

### CompanyCareersScrapingWorkflow

The system includes a scheduled workflow for automated scraping:

```typescript
// Run daily at 2 AM
const workflow = await env.COMPANY_CAREERS_SCRAPING_WORKFLOW.create({
  params: {
    schedule: '0 2 * * *', // Cron schedule
    maxCompanies: 50
  }
});
```

### Manual Workflow Execution

```bash
# Scrape specific companies
curl -X POST '/workflows/company-careers-scraping-workflow' \
  -d '{"companyIds": ["company-uuid-1", "company-uuid-2"]}'

# Scrape all companies
curl -X POST '/workflows/company-careers-scraping-workflow' \
  -d '{"maxCompanies": 100}'
```

## Database Schema

The system uses the existing `companies` table:

```sql
CREATE TABLE companies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  normalized_domain TEXT NOT NULL UNIQUE,
  website_url TEXT,
  careers_url TEXT,
  description TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

## Configuration

### Environment Variables

```toml
# Browser Rendering API
MYBROWSER = { binding = "MYBROWSER" }

# AI Models
DEFAULT_MODEL_WEB_BROWSER = "@cf/meta/llama-3.1-8b-instruct"
EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5"

# API Keys (if needed)
CF_API_TOKEN = "your-cloudflare-api-token"
```

### Workflow Configuration

```toml
[[workflows]]
name = "company-careers-scraping-workflow"
binding = "COMPANY_CAREERS_SCRAPING_WORKFLOW"
class_name = "CompanyCareersScrapingWorkflow"
```

## Testing

### Automated Tests

```bash
# Run company scraping tests
node scripts/test-company-scraping.js
```

### Manual Testing

```bash
# Create test company
curl -X POST '/api/companies' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Test Corp","normalized_domain":"test.com","careers_url":"https://test.com/careers"}'

# Scrape company
curl -X POST '/api/companies/{company-id}/scrape'
```

## Error Handling

The system includes comprehensive error handling:

- **API Failures**: Retries with fallback models
- **Invalid URLs**: Skips and logs errors
- **Rate Limiting**: Built-in delays between requests
- **Partial Failures**: Continues processing other companies/jobs
- **Status Tracking**: Detailed error reporting in responses

## Monitoring

### Scraping Metrics

Each scraping operation returns detailed metrics:

```json
{
  "job_links_found": 25,
  "jobs_scraped": 20,
  "jobs_queued": 20,
  "errors": ["Failed to scrape job-xyz: timeout"]
}
```

### Workflow Status

```bash
# Check workflow status
curl '/workflows/company-careers-scraping-workflow/status/{instance-id}'
```

## Security Considerations

- **Rate Limiting**: Respectful scraping with delays
- **User Agent**: Identifies as bot (Browser Rendering requirement)
- **Domain Filtering**: Only scrapes configured company domains
- **Error Logging**: Comprehensive error tracking without sensitive data

## Future Enhancements

- **RSS Feed Support**: Extend pattern matching for RSS feeds
- **Job Board Integration**: Generic patterns for popular job boards
- **Change Detection**: Track career page changes over time
- **Company Intelligence**: Extract additional company data
- **Resume Matching**: Integrate with candidate profiles
