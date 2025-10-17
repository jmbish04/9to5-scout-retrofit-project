# Configuration Guide

This guide covers all configuration aspects of the 9to5 Scout system.

## Environment Variables

### Required Variables

```bash
# API Authentication
WORKER_API_KEY=your-secure-api-token

# Database Configuration
DATABASE_URL=your-d1-database-url

# AI Configuration
OPENAI_API_KEY=your-openai-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key

# WebSocket Configuration
WS_URL=wss://your-worker-domain.workers.dev/ws
```

### Optional Variables

```bash
# Email Configuration
SENDGRID_API_KEY=your-sendgrid-key
FROM_EMAIL=noreply@yourdomain.com

# Analytics
ANALYTICS_DATASET=your-analytics-dataset

# Rate Limiting
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=3600
```

## Wrangler Configuration

The `wrangler.toml` file contains all worker bindings and configuration:

```toml
name = "9to5-scout"
main = "src/index.ts"
compatibility_date = "2025-01-15"
compatibility_flags = ["nodejs_compat"]

[observability]
enabled = true
head_sampling_rate = 1

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "9to5-scout-db"
database_id = "your-database-id"

# Workers AI
[ai]
binding = "AI"

# Browser Rendering
[[browser]]
binding = "MYBROWSER"

# Vectorize
[[vectorize]]
binding = "VECTORIZE_INDEX"
index_name = "job-embeddings"
index_id = "your-vectorize-index-id"

# R2 Storage
[[r2_buckets]]
binding = "R2"
bucket_name = "9to5-scout-storage"

# Workers KV
[[kv_namespaces]]
binding = "KV"
id = "your-kv-namespace-id"
preview_id = "your-preview-kv-namespace-id"

# Durable Objects
[[durable_objects.bindings]]
name = "SCRAPE_SOCKET"
class_name = "ScrapeSocket"

[[durable_objects.bindings]]
name = "SITE_CRAWLER"
class_name = "SiteCrawler"

[[durable_objects.bindings]]
name = "JOB_MONITOR"
class_name = "JobMonitor"

# Workflows
[[workflows]]
name = "discovery-workflow"
binding = "DISCOVERY_WORKFLOW"
class_name = "DiscoveryWorkflow"

[[workflows]]
name = "job-monitor-workflow"
binding = "JOB_MONITOR_WORKFLOW"
class_name = "JobMonitorWorkflow"

# Static Assets
[assets]
directory = "./public"
binding = "ASSETS"
not_found_handling = "single-page-application"

# Environment Variables
[vars]
WORKER_API_KEY = "your-api-token"
OPENAI_API_KEY = "your-openai-key"
```

## Database Setup

### 1. Create D1 Database

```bash
npx wrangler d1 create 9to5-scout-db
```

### 2. Run Migrations

```bash
npx wrangler d1 migrations apply 9to5-scout-db --local
npx wrangler d1 migrations apply 9to5-scout-db
```

### 3. Verify Database

```bash
npx wrangler d1 execute 9to5-scout-db --command="SELECT name FROM sqlite_master WHERE type='table';"
```

## Vectorize Setup

### 1. Create Vectorize Index

```bash
npx wrangler vectorize create job-embeddings --dimensions=768 --metric=cosine
```

### 2. Verify Index

```bash
npx wrangler vectorize list
```

## R2 Storage Setup

### 1. Create R2 Bucket

```bash
npx wrangler r2 bucket create 9to5-scout-storage
```

### 2. Configure CORS (if needed)

```bash
npx wrangler r2 bucket cors put 9to5-scout-storage --file=cors.json
```

## Workers KV Setup

### 1. Create KV Namespace

```bash
npx wrangler kv:namespace create "9to5-scout-config"
npx wrangler kv:namespace create "9to5-scout-config" --preview
```

## Durable Objects Setup

Durable Objects are automatically configured through the `wrangler.toml` file. No additional setup is required.

## Workflows Setup

Workflows are automatically configured through the `wrangler.toml` file. No additional setup is required.

## Python Environment Setup

### 1. Create Virtual Environment

```bash
cd python-node
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Create a `.env` file in the `python-node` directory:

```bash
WS_URL=wss://your-worker-domain.workers.dev/ws/scrape
API_TOKEN=your-api-token
```

## Frontend Configuration

### 1. Static Assets

The frontend is served from the `public/` directory. No build process is required.

### 2. API Endpoints

Update API endpoints in `public/js/shared.js`:

```javascript
const API_BASE_URL = "https://your-worker-domain.workers.dev/api";
const WS_URL = "wss://your-worker-domain.workers.dev/ws";
```

## Security Configuration

### 1. API Authentication

Generate a secure API token:

```bash
openssl rand -hex 32
```

### 2. CORS Configuration

Configure CORS in your worker for production:

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://yourdomain.com",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};
```

### 3. Rate Limiting

Configure rate limiting in your worker:

```typescript
const rateLimiter = new Map();
const RATE_LIMIT = 100; // requests per window
const WINDOW_SIZE = 3600; // seconds
```

## Monitoring Configuration

### 1. Analytics Engine

Create an Analytics Engine dataset:

```bash
npx wrangler analytics-engine create 9to5-scout-events
```

### 2. Logging

Configure structured logging:

```typescript
console.log(
  JSON.stringify({
    level: "info",
    message: "Job processed",
    jobId: job.id,
    timestamp: new Date().toISOString(),
  })
);
```

## Testing Configuration

### 1. Local Development

```bash
npx wrangler dev --local
```

### 2. Preview Environment

```bash
npx wrangler dev
```

### 3. Production Testing

```bash
npx wrangler deploy --env production
```

## Troubleshooting

### Common Configuration Issues

1. **Missing Bindings**: Ensure all required bindings are configured in `wrangler.toml`
2. **Database Connection**: Verify D1 database ID and migration status
3. **AI Quotas**: Check Workers AI usage limits
4. **WebSocket Issues**: Verify WebSocket URL and authentication

### Debug Commands

```bash
# Check worker status
npx wrangler whoami

# View logs
npx wrangler tail

# Test database connection
npx wrangler d1 execute 9to5-scout-db --command="SELECT 1;"

# Test WebSocket connection
wscat -c wss://your-worker-domain.workers.dev/ws
```

## Environment-Specific Configuration

### Development

- Use local D1 database
- Enable detailed logging
- Disable rate limiting
- Use test API keys

### Staging

- Use preview D1 database
- Enable analytics
- Moderate rate limiting
- Use staging API keys

### Production

- Use production D1 database
- Full monitoring enabled
- Strict rate limiting
- Production API keys
- HTTPS only
