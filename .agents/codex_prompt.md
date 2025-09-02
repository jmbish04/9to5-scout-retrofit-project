# Job Scraper Backend Service - Codex Prompt

## Overview
Build a comprehensive job scraping backend service using Cloudflare Workers ecosystem. This service will scrape job postings from various websites, store them in a database, provide AI-powered analysis, and offer REST APIs for job discovery and monitoring.

## Architecture
- **Cloudflare Workers**: Serverless functions for API endpoints and orchestration
- **Durable Objects**: Stateful coordination for site crawling and job monitoring
- **Workflows**: Long-running processes for discovery and monitoring
- **D1 Database**: SQLite-based storage for jobs, sites, and metadata
- **Vectorize**: Vector search for job similarity and recommendations
- **Workers AI**: AI-powered job analysis and change detection
- **Browser Rendering**: Headless browser for JavaScript-heavy sites

## Core Components

### 1. Site Management
- CRUD operations for job sites (base URLs, discovery strategies)
- Robots.txt parsing and rate limiting
- Site-specific crawling configurations

### 2. Job Discovery System
- Multiple discovery strategies: sitemap, search, custom
- Batch processing with rate limiting
- Duplicate detection and deduplication
- AI-powered job data extraction

### 3. Job Monitoring
- Individual job lifecycle tracking
- Change detection using content hashing
- Smart monitoring intervals
- Automatic cleanup when jobs close

### 4. Change Analysis
- Structural diffing of job postings
- AI-powered significance assessment
- Semantic change summaries
- Notification triggers

### 5. Search and Analytics
- Vector-based job search
- Job similarity matching
- Analytics on job market trends
- Export capabilities

## API Endpoints

### Sites Management
```
GET    /api/sites           # List all sites
POST   /api/sites           # Create new site
GET    /api/sites/:id       # Get site details
PUT    /api/sites/:id       # Update site
DELETE /api/sites/:id       # Delete site
```

### Jobs Management
```
GET    /api/jobs            # List jobs with filtering
GET    /api/jobs/:id        # Get job details
PUT    /api/jobs/:id        # Update job
DELETE /api/jobs/:id        # Delete job
POST   /api/jobs/:id/monitor # Start monitoring
DELETE /api/jobs/:id/monitor # Stop monitoring
```

### Discovery & Monitoring
```
POST   /api/discovery/:siteId    # Trigger discovery
GET    /api/discovery/:siteId/status # Discovery status
POST   /api/monitor/:jobId      # Start monitoring
GET    /api/monitor/:jobId/status # Monitoring status
```

### Search & Analytics
```
GET    /api/search?q=query      # Search jobs
GET    /api/analytics/trends    # Job market trends
GET    /api/analytics/sites     # Site performance
```

### Orchestration
```
POST   /api/orchestration/trigger-all # Manual full cycle
GET    /api/health               # Health check
```

## Database Schema

### Sites Table
```sql
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  robots_txt TEXT,
  sitemap_url TEXT,
  discovery_strategy TEXT CHECK(discovery_strategy IN ('sitemap', 'list', 'search', 'custom')),
  last_discovered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### Jobs Table
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  company TEXT,
  location TEXT,
  salary_min REAL,
  salary_max REAL,
  description TEXT,
  status TEXT CHECK(status IN ('open', 'closed', 'expired')),
  tags TEXT, -- JSON array
  posted_at DATETIME,
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_crawled_at DATETIME,
  last_changed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);
```

### Job Changes Table
```sql
CREATE TABLE job_changes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  change_type TEXT,
  old_value TEXT,
  new_value TEXT,
  significance_score REAL,
  ai_summary TEXT,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
```

## Durable Objects

### SiteCrawler
- Manages crawl queues per site
- Enforces rate limits and politeness
- Coordinates discovery workflows
- Handles WebSocket connections for real-time updates

### JobMonitor
- Tracks individual job state
- Manages monitoring schedules
- Detects and processes changes
- Handles job lifecycle events

## Workflows

### DiscoveryWorkflow
1. Fetch site content (sitemap/search/custom)
2. Extract job URLs
3. Batch process URLs with rate limiting
4. Extract job data using AI
5. Store in database and vectorize
6. Trigger monitoring for new jobs

### JobMonitorWorkflow
1. Crawl job page
2. Compare with previous version
3. Detect changes
4. Trigger change analysis if significant
5. Send notifications
6. Sleep until next check
7. Repeat until job closes

### ChangeAnalysisWorkflow
1. Perform structural diff
2. Use AI for semantic analysis
3. Assess change significance
4. Generate summary
5. Store analysis results
6. Trigger notifications

## Configuration

### Environment Variables
- `API_AUTH_TOKEN`: Bearer token for API access
- `BROWSER_RENDERING_TOKEN`: For browser rendering API
- `SLACK_WEBHOOK_URL`: For notifications
- Database and storage bindings

### Cron Triggers
- Every 2 hours for automated discovery and monitoring
- Configurable intervals per site/job

## Key Features

### Rate Limiting & Politeness
- Per-domain rate limits
- Robots.txt compliance
- Exponential backoff for retries
- Minimum delays between requests

### AI Integration
- Job data extraction from HTML
- Change significance assessment
- Semantic summaries
- Vector embeddings for search

### Observability
- Comprehensive logging
- Workflow execution tracking
- Performance metrics
- Error monitoring

### Scalability
- Horizontal scaling via Durable Objects
- Batch processing for efficiency
- Smart scheduling to avoid overload
- Automatic cleanup and optimization

## Deployment

### Wrangler Configuration
- Bindings for D1, KV, R2, Vectorize, AI
- Durable Object classes
- Workflow definitions
- Cron triggers
- Environment-specific configs

### Build Process
- TypeScript compilation
- Bundle optimization
- Migration handling
- Preview/production deployments

## Testing Strategy

### Unit Tests
- Individual functions and classes
- Mock external dependencies
- Edge case handling

### Integration Tests
- API endpoint testing
- Workflow execution
- Database operations

### E2E Tests
- Full discovery cycle
- Monitoring workflows
- Change detection

## Monitoring & Maintenance

### Health Checks
- Database connectivity
- External service availability
- Workflow queue status

### Metrics
- Jobs discovered per day
- Success/failure rates
- Processing times
- Storage usage

### Alerts
- Failed discoveries
- High error rates
- Storage limits
- Performance degradation

This backend service provides a robust, scalable solution for job scraping with AI-powered analysis and real-time monitoring capabilities.</content>
<parameter name="filePath">/Volumes/Projects/workers/9to5_scraper/codex_prompt.md
