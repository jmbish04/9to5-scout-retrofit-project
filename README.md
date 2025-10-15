# 9to5-scout

A comprehensive AI-powered job discovery and career assistance platform built on Cloudflare Workers. This advanced system combines intelligent job scraping, multi-agent AI analysis, automated monitoring, email routing, and career document generation in a unified, enterprise-grade platform.

## Features

### 🤖 Multi-Agent AI System
- **Resume Analyzer**: ATS optimization expert with deep resume analysis
- **Job Analyzer**: Comprehensive requirement extraction and role analysis  
- **Company Researcher**: Corporate intelligence and culture analysis
- **Resume Writer**: Strategic content generation with industry best practices
- **Interview Strategist**: Interview preparation and question anticipation
- **Report Generator**: Comprehensive career dossiers and match reports
- **Career Historian**: Career narrative synthesis and progression analysis
- Configurable agent parameters (LLM models, tools, behavior settings)
- Task orchestration with sequential and hierarchical workflows
- Memory-enabled agents for contextual conversations

### 🕷️ Intelligent Job Discovery & Monitoring
- Automated job discovery from multiple sites with configurable crawling
- AI-powered job posting extraction using structured schemas
- **Real-time Job Monitoring**: Daily automated tracking with change detection
- **Comprehensive Snapshots**: Full job history with HTML, PDF, and Markdown storage
- **Change Analysis**: AI-powered change summaries and impact assessment
- **Market Analytics**: Salary trends, skill analysis, and company insights
- Semantic job search with vector embeddings and relevance scoring
- Multi-source job tracking (scraped, email alerts, manual entry)

### 📧 Advanced Email Integration & Insights
- **Email Routing**: Receive job alert emails from major platforms (LinkedIn, Indeed, Monster, Glassdoor, ZipRecruiter)
- **Intelligent Processing**: Automatic job link extraction and content parsing from emails
- **Scheduled Insights**: Configurable email reports with job market analysis and statistics
- **Professional Templates**: HTML email templates with job summaries and recommendations
- **Processing Analytics**: Email logs, extraction metrics, and delivery tracking
- **Source Attribution**: Track job discovery source (email alerts vs. web scraping vs. manual)

### 📚 Comprehensive Job History Management
- **AI-Powered Resume Parsing**: Process job history in any format (plaintext, markdown, JSON)
- **Applicant Profiles**: Structured career profiles with skills, preferences, and experience tracking
- **Job Fit Analysis**: AI-generated job rating system (1-100 score) with detailed breakdowns:
  - Skill match scoring
  - Experience alignment analysis
  - Compensation fit assessment
  - Location and culture compatibility
  - Growth potential evaluation
- **Gap Analysis**: Identify skills gaps and provide improvement suggestions
- **Career Recommendations**: AI-driven job recommendations based on background and preferences

### 🏢 Company Benefits Intelligence
- **Company Registry**: Automatic company creation/upserts normalized by domain from job scrapes.
- **Benefits Snapshots**: Rule-based extraction of compensation, time-off, healthcare, retirement, perks, and work model details from job pages and careers sites.
- **Historical Tracking**: Append-only `company_benefits_snapshots` table preserves every observation with provenance and timestamps.
- **Nightly Benefits Scan**: Cloudflare Browser Rendering crawl of stored careers URLs with robots-aware fetching, retries, and deduplication.
- **Stats Rollups**: Scheduled heuristics compute highlights, anomalies, and total compensation estimates into `benefits_stats` for fast UI reads.
- **Public APIs**: `/api/companies`, `/api/companies/:id/benefits`, `/api/benefits/compare`, `/api/stats/highlights`, `/api/stats/valuations`, plus admin-triggered `/api/companies/scrape`.

### 📄 AI-Powered Career Document Generation
- **Cover Letters**: Generate tailored, professional cover letters with personalized content
- **Resume Optimization**: Create ATS-optimized resume content highlighting relevant experience
- **Interview Preparation**: Generate interview questions and strategic talking points
- **Career Reports**: Comprehensive analysis dossiers for job applications
- **HTML Conversion Utilities**: Convert HTML or URLs to Markdown, render HTML/CSS templates into PDF resumes and cover letters, and proxy Cloudflare Browser Rendering endpoints (content, screenshot, pdf, snapshot, scrape, json, links, markdown)

### 📈 Enterprise-Grade Job Tracking & Analytics
- **Daily Monitoring Workflows**: Automated daily job status checking with comprehensive reporting
- **Full Content Preservation**: Complete job snapshots stored in R2 with multiple formats (HTML, PDF, Markdown)
- **Visual Change Tracking**: Screenshot comparisons and manual review capabilities
- **Market Intelligence**: Real-time salary trends, skill demand analysis, and company insights
- **Performance Metrics**: Processing statistics, success rates, and system health monitoring
- **Historical Timeline**: Complete job lifecycle tracking from discovery to closure

### 🔔 Notifications & Integrations
- **Slack Integration**: Real-time notifications for job discoveries, changes, and alerts
- **SMTP Email System**: Professional outbound email capabilities for insights and reports
- **Webhook Support**: Custom integration endpoints for external systems and workflows
- **Configurable Alerts**: Customizable notification frequency and content preferences

## Architecture

Built on Cloudflare's edge computing platform with enterprise-grade scalability:

- **Cloudflare Workers**: Serverless compute for API endpoints and business logic
- **Durable Objects**: Stateful coordination for crawling and monitoring processes
- **Workflows**: Long-running job processing orchestration and task management  
- **D1 Database**: SQL storage for jobs, applicants, configurations, and analytics
- **Vectorize**: Vector database for semantic search and job matching
- **R2 Storage**: Object storage for HTML snapshots, PDFs, and content artifacts
- **Workers AI**: Large language models for extraction, analysis, and generation
- **Browser Rendering**: Headless browser for dynamic content and screenshot capture
- **Email Routing**: Native email processing for job alert integration

## Setup

### 1. Install Dependencies
```bash
# Install pnpm globally if not available
npm install -g pnpm

# Install project dependencies
pnpm install
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

# Durable Objects for stateful processing
[[durable_objects.bindings]]
name = "SITE_CRAWLER"
class_name = "SiteCrawler"

[[durable_objects.bindings]]
name = "JOB_MONITOR" 
class_name = "JobMonitor"

# Workflows for long-running processes
[[workflows]]
binding = "DISCOVERY_WORKFLOW"
name = "DiscoveryWorkflow"

[[workflows]]
binding = "JOB_MONITOR_WORKFLOW"
name = "JobMonitorWorkflow"

[[workflows]]
binding = "CHANGE_ANALYSIS_WORKFLOW"
name = "ChangeAnalysisWorkflow"
```

### 3. Set Environment Variables
Configure these variables in `wrangler.toml` [vars] section or as secrets:
```bash
# Authentication
API_AUTH_TOKEN = "your-secure-api-token"
BROWSER_RENDERING_TOKEN = "your-browser-rendering-token"

# Notifications
SLACK_WEBHOOK_URL = "your-slack-webhook-url"

# Email System (SMTP Configuration)
SMTP_ENDPOINT = "your-smtp-server-endpoint"
SMTP_USERNAME = "your-smtp-username" 
SMTP_PASSWORD = "your-smtp-password"

# Email Routing Configuration
EMAIL_ROUTING_DOMAIN = "9to5scout.dev"
```

### 4. Configure Email Routing
To receive job alert emails, configure Cloudflare Email Routing:

```toml
# Add to wrangler.toml email routing section
[[email]]
name = "job-alerts"
destination_addresses = ["*@9to5scout.dev"]
```

**Supported Email Addresses for Job Alerts:**
- `alerts@9to5scout.dev` - LinkedIn and general job alerts
- `jobs@9to5scout.dev` - Indeed and Monster job notifications
- `notifications@9to5scout.dev` - Glassdoor and ZipRecruiter alerts
- `insights@9to5scout.dev` - System-generated insights and reports

Configure job alert subscriptions on major platforms:
- **LinkedIn Job Alerts** → Set email to `alerts@9to5scout.dev`
- **Indeed Job Alerts** → Use `jobs@9to5scout.dev`  
- **Monster.com Alerts** → Use `jobs@9to5scout.dev`
- **Glassdoor Job Alerts** → Use `notifications@9to5scout.dev`
- **ZipRecruiter Alerts** → Use `notifications@9to5scout.dev`

Jobs extracted from emails will be marked with `source: "EMAIL"` to distinguish them from scraped jobs.

### 5. Run Database Migrations
```bash
# Local development
pnpm wrangler d1 migrations apply JOB_SCRAPER_DB --local

# Production  
pnpm wrangler d1 migrations apply JOB_SCRAPER_DB --remote
```

### 6. Deploy
```bash
pnpm deploy
# or
pnpm wrangler deploy
```

## Usage

### Multi-Agent Configuration & Management

#### 1. List and Configure AI Agents
```bash
# List all available agents
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/agents"

# Get specific agent configuration
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/agents/resume-analyzer"

# Create new agent
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/agents \
     -d '{
       "id": "custom-agent",
       "name": "Custom Job Analyzer",
       "role": "Senior Job Requirements Analyst",
       "goal": "Extract and analyze job requirements with precision",
       "backstory": "Expert in parsing job descriptions and identifying key requirements",
       "llm": "@cf/meta/llama-3.1-8b-instruct",
       "tools": ["web_search", "content_analysis"],
       "max_iter": 25,
       "verbose": false
     }'

# Update agent configuration
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X PUT https://your-worker.workers.dev/api/agents/resume-analyzer \
     -d '{
       "max_iter": 30,
       "verbose": true,
       "enabled": true
     }'
```

#### 2. Task Configuration and Workflows
```bash
# List all tasks
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/tasks"

# Create new task
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/tasks \
     -d '{
       "id": "analyze-job-fit",
       "description": "Analyze job posting for candidate fit and requirements",
       "agent_id": "job-analyzer",
       "expected_output": "Detailed job analysis with requirements breakdown",
       "tools": ["content_analysis", "skills_extraction"]
     }'

# Execute multi-agent workflow
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/workflows/comprehensive-analysis/execute \
     -d '{
       "context": {
         "job_url": "https://company.com/jobs/123",
         "applicant_id": "user-456"
       }
     }'
```

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

#### 3. Advanced Job Monitoring & Tracking
```bash
# Start comprehensive monitoring for all active jobs  
curl -H "Authorization: Bearer <token>" \
     -X POST https://your-worker.workers.dev/api/runs/monitor

# Trigger daily monitoring workflow manually
curl -H "Authorization: Bearer <token>" \
     -X POST https://your-worker.workers.dev/api/monitoring/daily-run

# Get monitoring status and market analytics
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/monitoring/status"

# Get jobs that need monitoring attention
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs/monitoring-queue?limit=20"

# Configure job-specific monitoring settings
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X PUT https://your-worker.workers.dev/api/jobs/job-123/monitoring \
     -d '{
       "daily_monitoring_enabled": true,
       "monitoring_frequency_hours": 12
     }'
```

#### 4. Job Tracking History & Content Access
```bash
# Get complete job tracking timeline with all snapshots
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs/job-123/tracking"

# Download job content in different formats
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs/job-123/snapshots/snap-456/content?type=pdf" \
     -o job_posting.pdf

curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs/job-123/snapshots/snap-456/content?type=html" \
     -o job_posting.html

curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs/job-123/snapshots/snap-456/content?type=markdown"
```

#### 5. AI-Powered Job Search
```bash
# Semantic search for relevant jobs
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/agent/query?q=senior%20python%20developer%20remote"

# Advanced search with natural language
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/agent/query?q=machine%20learning%20engineer%20with%20tensorflow%20experience%20in%20fintech"
```

### Job History Management & Applicant Profiles

#### 1. Submit Job History for AI Processing
```bash
# Submit job history in any format (plaintext, markdown, JSON)
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/applicant/history \
     -d '{
       "user_id": "user-123",
       "raw_content": "Senior Software Engineer at TechCorp (2020-2023)\n- Led development of microservices architecture\n- Managed team of 5 developers\n- Increased system performance by 40%\n\nSoftware Developer at StartupXYZ (2018-2020)\n- Full-stack development with React and Node.js\n- Built CI/CD pipelines\n- Contributed to 200% user growth",
       "content_type": "text/plain"
     }'

# Submit structured JSON resume data
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/applicant/history \
     -d '{
       "user_id": "user-123",
       "raw_content": "{\"experience\": [{\"company\": \"TechCorp\", \"title\": \"Senior Software Engineer\", \"duration\": \"2020-2023\", \"achievements\": [\"Led microservices development\", \"Managed 5-person team\"]}]}",
       "content_type": "application/json"
     }'

# Submit markdown-formatted resume
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/applicant/history \
     -d '{
       "user_id": "user-123",
       "raw_content": "## Senior Software Engineer - TechCorp\n**Duration:** 2020-2023\n\n### Key Achievements\n- Led development of microservices architecture\n- Managed team of 5 developers\n- Increased system performance by 40%",
       "content_type": "text/markdown"
     }'
```

#### 2. Get Applicant Profile and Structured Job History
```bash
# Retrieve complete applicant profile with processed job history
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/applicant/user-123/history"
```

#### 3. AI-Powered Job Fit Rating & Analysis
```bash
# Generate comprehensive job fit analysis
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/applicant/job-rating \
     -d '{
       "user_id": "user-123",
       "job_id": "job-456"
     }'

# View all job ratings for an applicant
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/applicant/user-123/job-ratings"
```

The job rating system provides detailed analysis including:
- **Overall Score**: 1-100 comprehensive fit rating
- **Skill Match**: Technical and soft skills alignment
- **Experience Match**: Role level and background compatibility  
- **Compensation Fit**: Salary expectations and market alignment
- **Location Fit**: Geographic and remote work preferences
- **Company Culture**: Cultural fit assessment
- **Growth Potential**: Career advancement opportunities
- **Recommendations**: AI-generated improvement suggestions and next steps

### Advanced Email Integration & Insights

#### 1. Configure Email Notification Settings
```bash
# Configure email insights and reporting
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

# Get current email configurations
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/email/configs"
```

#### 2. Email Insights and Reports
```bash
# Send job insights email manually
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/email/insights/send \
     -d '{"config_id": "default"}'

# View email processing logs and analytics
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/email/logs?limit=20"
```

#### 3. Email Alert Processing
The system automatically processes emails sent to configured addresses:
- **alerts@9to5scout.dev** - LinkedIn and general job alerts
- **jobs@9to5scout.dev** - Indeed and Monster notifications
- **notifications@9to5scout.dev** - Glassdoor and ZipRecruiter alerts

Email processing includes:
- Automatic job link extraction
- Content parsing and job data extraction
- Source attribution (`source: "EMAIL"`)
- Processing status tracking and error handling

### AI-Powered Career Document Generation

#### Generate Optimized Cover Letter
```bash
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/cover-letter \
     -d '{
       "job_title": "Senior Software Engineer",
       "company_name": "TechCorp Inc",
       "hiring_manager_name": "Jane Smith",
       "job_description_text": "We are seeking a senior software engineer with expertise in microservices architecture and team leadership. The ideal candidate will have 5+ years of experience with Python, React, and cloud platforms.",
       "candidate_career_summary": "Experienced full-stack developer with 7 years building scalable systems. Led development of microservices platform serving 10M+ users. Expert in Python, React, AWS, and team leadership with proven track record of delivering high-impact projects."
     }'
```

#### Generate ATS-Optimized Resume Content  
```bash
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/resume \
     -d '{
       "job_title": "Senior Software Engineer", 
       "company_name": "TechCorp Inc",
       "job_description_text": "We are seeking a senior software engineer with expertise in microservices architecture and team leadership. The ideal candidate will have 5+ years of experience with Python, React, and cloud platforms.",
       "candidate_career_summary": "Experienced full-stack developer with 7 years building scalable systems. Led development of microservices platform serving 10M+ users. Expert in Python, React, AWS, and team leadership with proven track record of delivering high-impact projects."
     }'
```

### Manual Job Crawling & Data Management

#### Manual Job Processing
```bash
# Crawl a specific job URL
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/crawl \
     -d '{"url": "https://company.com/jobs/123", "site_id": "company-site"}'
```

### View Results & Analytics

#### Job Data Retrieval
```bash
# List all jobs with filtering options
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs"

# Filter jobs by status and source
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs?status=open&source=EMAIL&limit=10"

# Get specific job with complete details
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/jobs/job-id-123"

# Get job configurations and search settings
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/configs"

# Check processing runs and system status
curl -H "Authorization: Bearer <token>" \
     "https://your-worker.workers.dev/api/runs"
```

#### System Health & Notifications
```bash
# Health check endpoint (no authentication required)
curl "https://your-worker.workers.dev/api/health"

# Test webhook notifications
curl -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -X POST https://your-worker.workers.dev/api/webhooks/test \
     -d '{
       "message": "🎉 9to5-scout notification system test",
       "type": "test"
     }'
```

## API Reference

### Authentication
All API endpoints (except `/api/health`) require Bearer token authentication:
```
Authorization: Bearer your-api-token
```

### Core Job Discovery & Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check (no auth required) |
| GET | `/api/jobs` | List jobs with filtering (status, source, limit) |  
| GET | `/api/jobs/{id}` | Get single job with complete details |
| GET | `/api/jobs/{id}/tracking` | Get complete job tracking timeline |
| GET | `/api/jobs/{id}/snapshots/{snapshotId}/content` | Download job snapshots (HTML, PDF, Markdown) |
| PUT | `/api/jobs/{id}/monitoring` | Configure job monitoring settings |
| GET | `/api/jobs/monitoring-queue` | List jobs needing monitoring |
| GET | `/api/configs` | List search configurations |
| POST | `/api/configs` | Create search configuration |
| GET | `/api/runs` | List processing runs |
| POST | `/api/runs/discovery` | Start discovery run |
| POST | `/api/runs/monitor` | Start monitoring run |

### Job Monitoring & Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/monitoring/daily-run` | Manually trigger daily monitoring |
| GET | `/api/monitoring/status` | Get monitoring status & market analytics |
| GET | `/api/agent/query?q={query}` | Semantic job search using AI |
| POST | `/api/crawl` | Manual job crawling |

### Company Benefits & Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/companies` | List companies with optional search, including latest benefits stats |
| GET | `/api/companies/{id}/benefits` | Retrieve recent benefits snapshots and stats for a company |
| GET | `/api/benefits/compare?company_ids=a,b` | Compare normalized benefits data and stats across companies |
| GET | `/api/stats/highlights` | View top anomalies and standout perks across companies |
| GET | `/api/stats/valuations` | List total compensation heuristics for ranking |
| POST | `/api/companies/scrape` | Admin-only trigger to enqueue benefits scraping (supports DRY_RUN) |

### AI-Powered Career Tools

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/cover-letter` | Generate personalized cover letters |
| POST | `/api/resume` | Generate optimized resume content |

### Multi-Agent System Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/agents` | List all AI agent configurations |
| POST | `/api/agents` | Create new agent configuration |
| GET | `/api/agents/{id}` | Get agent configuration by ID |
| PUT | `/api/agents/{id}` | Update agent configuration |
| DELETE | `/api/agents/{id}` | Delete agent configuration |
| GET | `/api/tasks` | List all task configurations |
| POST | `/api/tasks` | Create new task configuration |
| GET | `/api/tasks/{id}` | Get task configuration by ID |
| PUT | `/api/tasks/{id}` | Update task configuration |
| DELETE | `/api/tasks/{id}` | Delete task configuration |
| GET | `/api/workflows` | List all workflow configurations |
| POST | `/api/workflows` | Create new workflow configuration |
| GET | `/api/workflows/{id}` | Get workflow configuration by ID |
| PUT | `/api/workflows/{id}` | Update workflow configuration |
| DELETE | `/api/workflows/{id}` | Delete workflow configuration |
| POST | `/api/workflows/{id}/execute` | Execute multi-agent workflows |

### Email Integration & Insights

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/email/logs` | View email processing history |
| GET | `/api/email/configs` | Get email notification settings |
| PUT | `/api/email/configs` | Update email preferences |
| POST | `/api/email/insights/send` | Send job insights manually |

### Job History & Applicant Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/applicant/history` | Submit job history for AI processing |
| GET | `/api/applicant/{user_id}/history` | Get applicant profile & job history |
| POST | `/api/applicant/job-rating` | Generate AI-powered job fit rating |
| GET | `/api/applicant/{user_id}/job-ratings` | View all job ratings for applicant |

### System & Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/webhooks/test` | Test notifications |

## Development

### Available Scripts
```bash
# Generate Cloudflare Workers types from wrangler.toml
pnpm generate-types

# Type checking with automatic type generation
pnpm typecheck  

# Build the worker (includes type generation)
pnpm build

# Deploy to Cloudflare Workers
pnpm deploy
```

**Note**: Local development server requires Cloudflare authentication for Browser Rendering and AI bindings. Use `pnpm build` and `pnpm typecheck` for local validation.

### Type Generation
```bash
pnpm generate-types  # Generate Cloudflare Workers types
```

### Type Checking
```bash
pnpm typecheck      # Check TypeScript without building
```

### Cron Schedule
| Time (UTC) | Description |
|------------|-------------|
| Every 15 minutes | Background maintenance + socket health |
| 06:00 | Daily job monitoring + email insights |
| 08:00 | Nightly company benefits crawl via Browser Rendering |
| 09:00 | Benefits stats rollup for anomalies and valuations |

## Database Schema

The platform uses a comprehensive relational database schema with the following key tables:

### Core Job Management
- **sites**: Job site configurations and crawling settings
- **search_configs**: Search criteria, keywords, and filtering rules  
- **jobs**: Job postings with complete metadata and tracking information
- **snapshots**: Historical job data snapshots for change detection
- **changes**: Change analysis with AI-generated summaries and impact assessment
- **runs**: Processing run tracking and performance metrics

### Job Monitoring & Analytics
- **job_tracking_history**: Daily monitoring results and content preservation
- **job_market_stats**: Aggregated market analytics and trend data
- **r2_storage_metadata**: R2 object storage keys for HTML, PDF, and Markdown content

### Multi-Agent System
- **agent_configs**: AI agent configurations, prompts, and behavior settings
- **task_configs**: Task definitions and execution parameters
- **workflow_configs**: Multi-agent workflow orchestration
- **agent_executions**: Execution history and results tracking

### Applicant & Job History Management
- **applicant_profiles**: User profiles with preferences and career information
- **job_history_entries**: Structured job history data parsed from submissions
- **job_history_submissions**: Raw job history submissions and processing status
- **job_ratings**: AI-generated job fit scores and detailed analysis

### Email & Communication
- **email_configs**: Email notification settings and preferences
- **email_logs**: Email processing history and analytics
- **notification_history**: System notification tracking

### Company Benefits Intelligence
- **companies**: Normalized company records keyed by registrable domain with website/careers URLs.
- **company_benefits_snapshots**: Append-only benefits observations with raw snapshot text, structured JSON, source URL, and timestamps.
- **benefits_stats**: Periodic rollups containing highlights, total-comp heuristics, and coverage confidence for each company.

### Benefits Valuation Assumptions
- **Daily Rate**: Base salary normalized to 260 working days per year; defaults to $120k/year if range unknown.
- **401(k) Match**: Adds up to 6% of base salary depending on detected employer match percentage.
- **Healthcare Value**: $9k baseline when medical coverage present, otherwise $6k conservative estimate.
- **Paid Time Off**: PTO days and parental leave weeks converted to value using the daily rate; work-from-anywhere weeks add flexibility value.
- **Equity & Bonus**: Bonus target percent contributes base * percent; equity presence adds 10% of base as a conservative estimate.
- All assumptions, component breakdown, and detection coverage are persisted in `benefits_stats.total_comp_heuristics` for transparency.

### Key Database Features
- **Vector Embeddings**: Job descriptions stored in Vectorize for semantic search
- **Content Versioning**: Complete job change history with content snapshots
- **Multi-format Storage**: R2 integration for HTML, PDF, Markdown, and screenshot storage
- **Analytics Aggregation**: Real-time market analytics and trend analysis
- **Audit Trails**: Complete tracking of all system operations and changes

## Contributing

1. Follow TypeScript best practices
2. Use structured schemas for AI interactions
3. Add proper error handling and logging
4. Update documentation for new features
5. Test with local D1 database before deployment

## License

This project is built using Cloudflare's developer platform and follows their terms of service.
