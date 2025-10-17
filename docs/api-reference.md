# API Reference

Complete API documentation for the 9to5 Scout system.

## Base URL

```
https://9to5-scout.hacolby.workers.dev
```

## Authentication

All API endpoints require authentication via Bearer token:

```bash
Authorization: Bearer your-api-token
```

## Content Types

- **Request**: `application/json`
- **Response**: `application/json`

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": "Additional error details"
}
```

## Core Endpoints

### Sites

#### List Sites

```http
GET /api/sites
```

**Response:**

```json
{
  "sites": [
    {
      "id": "site-123",
      "name": "LinkedIn Jobs",
      "base_url": "https://linkedin.com/jobs",
      "discovery_strategy": "search",
      "last_discovered_at": "2025-01-15T10:30:00Z",
      "created_at": "2025-01-01T00:00:00Z"
    }
  ]
}
```

#### Create Site

```http
POST /api/sites
```

**Request Body:**

```json
{
  "name": "Indeed Jobs",
  "base_url": "https://indeed.com",
  "discovery_strategy": "search",
  "sitemap_url": "https://indeed.com/sitemap.xml"
}
```

**Response:**

```json
{
  "id": "site-456",
  "name": "Indeed Jobs",
  "base_url": "https://indeed.com",
  "discovery_strategy": "search",
  "created_at": "2025-01-15T10:30:00Z"
}
```

#### Get Site

```http
GET /api/sites/:id
```

**Response:**

```json
{
  "id": "site-123",
  "name": "LinkedIn Jobs",
  "base_url": "https://linkedin.com/jobs",
  "discovery_strategy": "search",
  "last_discovered_at": "2025-01-15T10:30:00Z",
  "created_at": "2025-01-01T00:00:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### Jobs

#### List Jobs

```http
GET /api/jobs?site_id=:site_id&status=:status&limit=:limit&offset=:offset
```

**Query Parameters:**

- `site_id` (optional): Filter by site ID
- `status` (optional): Filter by status (`open`, `closed`, `expired`)
- `limit` (optional): Number of results (default: 50, max: 100)
- `offset` (optional): Pagination offset (default: 0)

**Response:**

```json
{
  "jobs": [
    {
      "id": "job-123",
      "site_id": "site-123",
      "url": "https://linkedin.com/jobs/view/123456",
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "salary_min": 120000,
      "salary_max": 180000,
      "status": "open",
      "posted_at": "2025-01-15T09:00:00Z",
      "first_seen_at": "2025-01-15T10:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

#### Get Job

```http
GET /api/jobs/:id
```

**Response:**

```json
{
  "id": "job-123",
  "site_id": "site-123",
  "url": "https://linkedin.com/jobs/view/123456",
  "title": "Senior Software Engineer",
  "company": "Tech Corp",
  "location": "San Francisco, CA",
  "salary_min": 120000,
  "salary_max": 180000,
  "description": "We are looking for a senior software engineer...",
  "status": "open",
  "tags": ["javascript", "react", "node.js"],
  "posted_at": "2025-01-15T09:00:00Z",
  "first_seen_at": "2025-01-15T10:00:00Z",
  "last_crawled_at": "2025-01-15T10:00:00Z",
  "last_changed_at": null
}
```

#### Start Job Monitoring

```http
POST /api/jobs/:id/monitor
```

**Response:**

```json
{
  "job_id": "job-123",
  "monitoring_enabled": true,
  "monitor_id": "monitor-456"
}
```

### Discovery

#### Start Site Discovery

```http
POST /api/discovery/:site_id
```

**Request Body:**

```json
{
  "keywords": ["software engineer", "developer"],
  "location": "San Francisco, CA",
  "max_pages": 10
}
```

**Response:**

```json
{
  "discovery_id": "discovery-789",
  "site_id": "site-123",
  "status": "started",
  "estimated_duration": "5-10 minutes"
}
```

#### Get Discovery Status

```http
GET /api/discovery/:discovery_id/status
```

**Response:**

```json
{
  "discovery_id": "discovery-789",
  "status": "completed",
  "jobs_found": 25,
  "jobs_processed": 25,
  "errors": 0,
  "started_at": "2025-01-15T10:00:00Z",
  "completed_at": "2025-01-15T10:05:00Z"
}
```

### Monitoring

#### Get Job Monitor Status

```http
GET /api/monitor/:job_id/status
```

**Response:**

```json
{
  "job_id": "job-123",
  "monitoring_enabled": true,
  "last_checked": "2025-01-15T10:30:00Z",
  "changes_detected": 2,
  "last_change": "2025-01-15T09:45:00Z"
}
```

#### Get Job Changes

```http
GET /api/monitor/:job_id/changes
```

**Response:**

```json
{
  "job_id": "job-123",
  "changes": [
    {
      "id": "change-123",
      "change_type": "salary_update",
      "old_value": "120000-150000",
      "new_value": "130000-160000",
      "significance_score": 0.8,
      "ai_summary": "Salary range increased by $10,000",
      "detected_at": "2025-01-15T09:45:00Z"
    }
  ]
}
```

### Search

#### Semantic Search

```http
GET /api/search?q=:query&limit=:limit
```

**Query Parameters:**

- `q` (required): Search query
- `limit` (optional): Number of results (default: 20, max: 50)

**Response:**

```json
{
  "query": "senior javascript developer",
  "results": [
    {
      "job_id": "job-123",
      "title": "Senior Software Engineer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "relevance_score": 0.95,
      "matched_skills": ["javascript", "react", "node.js"]
    }
  ],
  "total": 15
}
```

#### Skill Matching

```http
GET /api/search/skills?job_id=:job_id&user_skills=:skills
```

**Query Parameters:**

- `job_id` (required): Job ID to analyze
- `user_skills` (required): Comma-separated list of user skills

**Response:**

```json
{
  "job_id": "job-123",
  "required_skills": ["javascript", "react", "node.js", "aws"],
  "user_skills": ["javascript", "react", "python"],
  "matched_skills": ["javascript", "react"],
  "missing_skills": ["node.js", "aws"],
  "match_percentage": 50.0,
  "recommendations": [
    "Learn Node.js to improve your match",
    "Consider AWS certification"
  ]
}
```

## WebSocket Endpoints

### Main WebSocket

```javascript
const ws = new WebSocket("wss://9to5-scout.hacolby.workers.dev/ws");
```

**Authentication:**

```javascript
ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "auth",
      token: "your-api-token",
    })
  );
};
```

**Message Types:**

#### Job Update

```json
{
  "type": "job_update",
  "job_id": "job-123",
  "changes": {
    "title": "Updated Job Title",
    "salary_max": 200000
  }
}
```

#### New Job

```json
{
  "type": "new_job",
  "job": {
    "id": "job-456",
    "title": "New Job Title",
    "company": "New Company",
    "url": "https://example.com/job/456"
  }
}
```

#### Discovery Progress

```json
{
  "type": "discovery_progress",
  "discovery_id": "discovery-789",
  "jobs_found": 15,
  "jobs_processed": 10,
  "status": "in_progress"
}
```

### Scraper WebSocket

```javascript
const ws = new WebSocket("wss://9to5-scout.hacolby.workers.dev/ws/scrape");
```

**Authentication:**

```javascript
ws.onopen = () => {
  ws.send(
    JSON.stringify({
      type: "auth",
      token: "your-api-token",
    })
  );
};
```

**Message Types:**

#### Scrape Request

```json
{
  "action": "scrape",
  "url": "https://example.com/job/123",
  "job_id": "job-123"
}
```

#### Scraped Data

```json
{
  "action": "process_scraped_data",
  "data": {
    "url": "https://example.com/job/123",
    "html": "<html>...</html>",
    "job_id": "job-123"
  }
}
```

## AI Endpoints

### Generate Cover Letter

```http
POST /api/ai/generate/cover-letter
```

**Request Body:**

```json
{
  "job_id": "job-123",
  "user_profile": {
    "name": "John Doe",
    "experience": "5 years software development",
    "skills": ["javascript", "react", "node.js"],
    "achievements": ["Led team of 5 developers"]
  },
  "tone": "professional"
}
```

**Response:**

```json
{
  "cover_letter": "Dear Hiring Manager,\n\nI am writing to express my strong interest in the Senior Software Engineer position...",
  "confidence_score": 0.92,
  "generated_at": "2025-01-15T10:30:00Z"
}
```

### Generate Resume

```http
POST /api/ai/generate/resume
```

**Request Body:**

```json
{
  "job_id": "job-123",
  "user_profile": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1-555-0123",
    "experience": [
      {
        "title": "Senior Software Engineer",
        "company": "Previous Company",
        "duration": "2020-2024",
        "description": "Led development of web applications"
      }
    ],
    "skills": ["javascript", "react", "node.js"],
    "education": "BS Computer Science, University of California"
  }
}
```

**Response:**

```json
{
  "resume": "John Doe\nSenior Software Engineer\n\nExperience:\n...",
  "confidence_score": 0.88,
  "generated_at": "2025-01-15T10:30:00Z"
}
```

### Analyze Job

```http
POST /api/ai/analyze/job
```

**Request Body:**

```json
{
  "job_id": "job-123"
}
```

**Response:**

```json
{
  "job_id": "job-123",
  "analysis": {
    "key_skills": ["javascript", "react", "node.js", "aws"],
    "experience_level": "senior",
    "company_culture": "tech-focused, fast-paced",
    "salary_insights": "Above market average",
    "interview_tips": [
      "Prepare for system design questions",
      "Be ready to discuss React performance optimization"
    ],
    "red_flags": [],
    "green_flags": ["Clear growth opportunities", "Competitive benefits"]
  },
  "confidence_score": 0.91,
  "analyzed_at": "2025-01-15T10:30:00Z"
}
```

## Rate Limits

- **API Requests**: 100 requests per minute per IP
- **WebSocket Connections**: 10 concurrent connections per IP
- **AI Generation**: 20 requests per hour per API token
- **Search Queries**: 50 requests per minute per API token

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Too Many Requests
- `500` - Internal Server Error
- `502` - Bad Gateway
- `503` - Service Unavailable

## Pagination

List endpoints support pagination with `limit` and `offset` parameters:

```http
GET /api/jobs?limit=20&offset=40
```

**Response includes pagination metadata:**

```json
{
  "data": [...],
  "pagination": {
    "total": 150,
    "limit": 20,
    "offset": 40,
    "has_next": true,
    "has_prev": true
  }
}
```

## Webhooks

Configure webhooks for real-time notifications:

### Webhook Events

- `job.created` - New job discovered
- `job.updated` - Job details changed
- `job.closed` - Job posting closed
- `discovery.completed` - Site discovery finished
- `monitor.alert` - Job monitoring alert

### Webhook Payload

```json
{
  "event": "job.updated",
  "timestamp": "2025-01-15T10:30:00Z",
  "data": {
    "job_id": "job-123",
    "changes": {
      "title": "Updated Job Title"
    }
  }
}
```

## SDKs

### JavaScript/TypeScript

```bash
npm install @9to5-scout/sdk
```

```javascript
import { ScoutClient } from "@9to5-scout/sdk";

const client = new ScoutClient({
  apiKey: "your-api-key",
  baseUrl: "https://9to5-scout.hacolby.workers.dev",
});

const jobs = await client.jobs.list({ status: "open" });
```

### Python

```bash
pip install 9to5-scout-sdk
```

```python
from scout_sdk import ScoutClient

client = ScoutClient(
    api_key='your-api-key',
    base_url='https://9to5-scout.hacolby.workers.dev'
)

jobs = client.jobs.list(status='open')
```

## Examples

### Complete Job Search Workflow

```javascript
// 1. Search for jobs
const jobs = await fetch("/api/search?q=software engineer", {
  headers: { Authorization: "Bearer your-token" },
}).then((r) => r.json());

// 2. Get detailed job information
const job = await fetch(`/api/jobs/${jobs.results[0].job_id}`, {
  headers: { Authorization: "Bearer your-token" },
}).then((r) => r.json());

// 3. Analyze job requirements
const analysis = await fetch("/api/ai/analyze/job", {
  method: "POST",
  headers: {
    Authorization: "Bearer your-token",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ job_id: job.id }),
}).then((r) => r.json());

// 4. Generate cover letter
const coverLetter = await fetch("/api/ai/generate/cover-letter", {
  method: "POST",
  headers: {
    Authorization: "Bearer your-token",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    job_id: job.id,
    user_profile: {
      name: "John Doe",
      experience: "5 years software development",
      skills: ["javascript", "react", "node.js"],
    },
  }),
}).then((r) => r.json());

// 5. Start monitoring job for changes
await fetch(`/api/jobs/${job.id}/monitor`, {
  method: "POST",
  headers: { Authorization: "Bearer your-token" },
});
```
