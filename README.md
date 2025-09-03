# 9to5-scout

A comprehensive job scraping and career assistance platform built on Cloudflare Workers. This project combines AI-powered job discovery, monitoring, and career document generation in a single, powerful platform.

## Features

### 🤖 AI-Powered Job Extraction
- Automatically extracts structured job data from any website using Cloudflare Workers AI
- Uses guided JSON schemas for consistent, reliable data extraction
- Supports dynamic content through browser rendering

### 🔍 Semantic Job Search  
- Vector embeddings with Cloudflare Vectorize for intelligent job matching
- Query jobs using natural language (e.g., "remote Python developer positions")
- Similarity scoring for relevant job recommendations

### 📄 Career Document Generation
- **Cover Letters**: Generate tailored, professional cover letters for specific job postings
- **Resumes**: Create customized resume sections highlighting relevant experience
- Uses structured AI prompts for high-quality, personalized content

### 🕸️ Intelligent Job Monitoring
- Automated discovery of new job postings across configured sites
- Continuous monitoring of job status changes (open/closed/modified)
- Change detection with AI-powered summaries

### 🔔 Real-time Notifications & Email Integration
- **Email Routing**: Receive job alert emails from major job sites (Google Jobs, LinkedIn, Indeed, etc.)
- **Email Processing**: Automatically extract and crawl job links from incoming emails
- **Insights Reports**: Send periodic email reports with new jobs, changes, and statistics
- **Source Tracking**: Track whether jobs were discovered via scraping, email alerts, or manual entry
- **Slack Integration**: Real-time notifications for new job alerts and status changes
- **Configurable Notifications**: Customizable email frequency and content preferences
- **Webhook Support**: Custom integration endpoints for external systems

## Architecture

Built on Cloudflare's edge computing platform:

- **Cloudflare Workers**: Serverless compute for API and business logic
- **Durable Objects**: Stateful coordination for crawling and monitoring
- **Workflows**: Long-running job processing orchestration  
- **D1 Database**: SQL storage for job data and configurations
- **Vectorize**: Vector database for semantic search
- **R2 Storage**: Object storage for HTML snapshots and artifacts
- **Workers AI**: Large language models for extraction and generation
- **Browser Rendering**: Headless browser for dynamic content

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Wrangler
Update `wrangler.toml` with your specific resource IDs:
```toml
[[d1_databases]]
binding = "DB"
database_name = "JOB_SCRAPER_DB"
database_id = "your-d1-database-id"

[[kv_namespaces]]  
binding = "KV"
id = "your-kv-namespace-id"

[[r2_buckets]]
binding = "R2"
bucket_name = "job-scraper"

[[vectorize]]
binding = "VECTORIZE_INDEX" 
index_name = "jobs"
```

### 3. Set Environment Variables
```bash
# In wrangler.toml [vars] section or as secrets
API_AUTH_TOKEN = "your-secure-token"
BROWSER_RENDERING_TOKEN = "your-browser-token"  
SLACK_WEBHOOK_URL = "your-slack-webhook-url"
SMTP_ENDPOINT = "your-smtp-endpoint"
SMTP_USERNAME = "your-smtp-username"
SMTP_PASSWORD = "your-smtp-password"
```

### 4. Configure Email Routing
To receive job alert emails, configure Cloudflare Email Routing:

```toml
# Add to wrangler.toml
[[email]]
name = "job-alerts"
destination_addresses = ["*@9to5scout.dev"]
```

This allows the worker to receive emails at any address ending in `@9to5scout.dev`. Configure job alert subscriptions on sites like:
- Google Jobs
- LinkedIn Job Alerts  
- Indeed Job Alerts
- Monster.com
- ZipRecruiter

Jobs extracted from emails will be marked with `source: "EMAIL"` to distinguish them from scraped jobs.

### 4. Run Database Migrations
```bash
# Local development
npx wrangler d1 migrations apply JOB_SCRAPER_DB --local

# Production  
npx wrangler d1 migrations apply JOB_SCRAPER_DB --remote
```

### 5. Deploy
```bash
npx wrangler deploy
```

## Usage

### Job Discovery & Monitoring

#### 1. Configure Job Sites
```bash
# Add a job site for crawling
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/configs \
     -d '{
       "name": "Tech Jobs", 
       "keywords": ["software engineer", "developer", "python"],
       "locations": ["San Francisco", "Remote"],
       "include_domains": ["company.com", "startup.io"]
     }'
```

#### 2. Start Job Discovery
```bash
# Discover new jobs across all configured sites
curl -H "Authorization: Bearer <token>" \
     -X POST https://your-worker.workers.dev/api/runs/discovery

# Or target a specific configuration
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/runs/discovery \
     -d '{"config_id": "your-config-id"}'
```

#### 3. Monitor Job Changes
```bash
# Start monitoring all active jobs  
curl -H "Authorization: Bearer <token>" \
     -X POST https://your-worker.workers.dev/api/runs/monitor
```

#### 4. Query Jobs with AI
```bash
# Semantic search for relevant jobs
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/agent/query?q=senior%20python%20developer%20remote"
```

### Career Document Generation

#### Generate Cover Letter
```bash
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/cover-letter \
     -d '{
       "job_title": "Senior Software Engineer",
       "company_name": "TechCorp Inc",
       "hiring_manager_name": "Jane Smith",
       "job_description_text": "We are seeking a senior software engineer...",
       "candidate_career_summary": "Experienced full-stack developer with 5 years..."
     }'
```

#### Generate Resume Content  
```bash
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/resume \
     -d '{
       "job_title": "Senior Software Engineer", 
       "company_name": "TechCorp Inc",
       "job_description_text": "We are seeking a senior software engineer...",
       "candidate_career_summary": "Experienced full-stack developer with 5 years..."
     }'
```

### Email Integration
The worker supports email routing for automated job alert processing:

```bash
# Configure email settings
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X PUT https://your-worker.workers.dev/api/email/configs \
     -d '{
       "id": "default",
       "enabled": true,
       "frequency_hours": 24,
       "recipient_email": "user@example.com",
       "include_new_jobs": true,
       "include_job_changes": true,
       "include_statistics": true
     }'

# Send email insights manually
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/email/insights/send \
     -d '{"config_id": "default"}'

# View email processing logs
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/email/logs?limit=20"

# Get email configurations
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/email/configs"
```

### Manual Job Crawling
```bash
# Crawl a specific job URL
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/crawl \
     -d '{"url": "https://company.com/jobs/123", "site_id": "company-site"}'
```

### View Results
```bash
# List all jobs
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs"

# Filter by status  
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs?status=open&limit=10"

# Get specific job
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs/job-id-123"

# Check processing runs
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/runs"
```

## API Reference

### Authentication
All API endpoints (except `/api/health`) require Bearer token authentication:
```
Authorization: Bearer your-api-token
```

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |
| GET | `/api/jobs` | List jobs with filtering |  
| GET | `/api/jobs/{id}` | Get single job |
| GET | `/api/configs` | List search configurations |
| POST | `/api/configs` | Create search configuration |
| GET | `/api/runs` | List processing runs |
| POST | `/api/runs/discovery` | Start discovery run |
| POST | `/api/runs/monitor` | Start monitoring run |
| GET | `/api/agent/query?q={query}` | Semantic job search |
| POST | `/api/crawl` | Manual job crawling |
| POST | `/api/cover-letter` | Generate cover letter |
| POST | `/api/resume` | Generate resume content |
| POST | `/api/webhooks/test` | Test notifications |

## Development

### Type Generation
```bash
npm run generate-types  # Generate Cloudflare Workers types
```

### Type Checking
```bash  
npm run typecheck      # Check TypeScript without building
```

### Local Development
```bash
npm run dev            # Start local development server
```

## Database Schema

The platform uses several interconnected tables:

- **sites**: Job site configurations
- **search_configs**: Search criteria and filters  
- **jobs**: Job postings with full metadata
- **snapshots**: Historical job data for change detection
- **changes**: Change analysis with AI summaries
- **runs**: Processing run tracking

## Contributing

1. Follow TypeScript best practices
2. Use structured schemas for AI interactions
3. Add proper error handling and logging
4. Update documentation for new features
5. Test with local D1 database before deployment

## License

This project is built using Cloudflare's developer platform and follows their terms of service.
