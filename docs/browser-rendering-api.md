# Browser Rendering API Documentation

This document provides comprehensive documentation for the Browser Rendering API, which leverages Cloudflare's Browser Rendering REST API to provide web scraping, screenshot capture, PDF generation, and content extraction capabilities.

## Overview

The Browser Rendering API provides a comprehensive set of endpoints for web scraping and content extraction using Cloudflare's managed browser infrastructure. It supports both authenticated and non-authenticated scraping, with automatic R2 storage and D1 database integration.

## Base URL

All API endpoints are prefixed with `/api/browser-rendering/`

## Authentication

All endpoints require authentication using the `Authorization` header:

```
Authorization: Bearer YOUR_WORKER_API_KEY
```

## Environment Variables

The following environment variables must be configured:

- `BROWSER_RENDERING_TOKEN`: Cloudflare API token with Browser Rendering permissions
- `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare account ID
- `R2`: R2 bucket for storing content
- `BUCKET_BASE_URL`: Base URL for R2 bucket access
- `DB`: D1 database for metadata storage

## Endpoints

### 1. Screenshot Capture

**POST** `/api/browser-rendering/screenshot`

Captures a screenshot of a webpage.

#### Request Body

```json
{
  "options": {
    "url": "https://example.com",
    "screenshotOptions": {
      "fullPage": true,
      "omitBackground": false,
      "quality": 90,
      "type": "png"
    },
    "viewport": {
      "width": 1920,
      "height": 1080
    },
    "gotoOptions": {
      "waitUntil": "networkidle2",
      "timeout": 30000
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "screenshot": "base64_encoded_image_data",
  "format": "png",
  "size": 245760,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 2. Content Extraction

**POST** `/api/browser-rendering/content`

Extracts fully rendered HTML content from a webpage.

#### Request Body

```json
{
  "options": {
    "url": "https://example.com",
    "rejectResourceTypes": ["image", "stylesheet"],
    "rejectRequestPattern": ["/^.*\\.(css|js)$/"]
  }
}
```

#### Response

```json
{
  "success": true,
  "content": "<html>...</html>",
  "length": 15420,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 3. PDF Generation

**POST** `/api/browser-rendering/pdf`

Generates a PDF document from a webpage.

#### Request Body

```json
{
  "options": {
    "url": "https://example.com",
    "viewport": {
      "width": 1200,
      "height": 800
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "pdf": "base64_encoded_pdf_data",
  "size": 1024000,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 4. Element Scraping

**POST** `/api/browser-rendering/scrape`

Scrapes specific elements from a webpage using CSS selectors.

#### Request Body

```json
{
  "options": {
    "url": "https://example.com"
  },
  "elements": [
    {
      "selector": "h1.title",
      "text": true,
      "html": true
    },
    {
      "selector": "a[href]",
      "attribute": "href"
    }
  ]
}
```

#### Response

```json
{
  "success": true,
  "results": [
    {
      "selector": "h1.title",
      "results": [
        {
          "text": "Page Title",
          "html": "<h1 class=\"title\">Page Title</h1>",
          "attributes": {},
          "height": 40,
          "width": 200,
          "top": 100,
          "left": 50
        }
      ]
    }
  ],
  "elementCount": 1,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 5. Markdown Extraction

**POST** `/api/browser-rendering/markdown`

Extracts content from a webpage and converts it to Markdown format.

#### Request Body

```json
{
  "options": {
    "url": "https://example.com",
    "rejectRequestPattern": ["/^.*\\.(css|js)$/"]
  }
}
```

#### Response

```json
{
  "success": true,
  "markdown": "# Page Title\n\nThis is the page content...",
  "length": 1250,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 6. AI-Powered JSON Extraction

**POST** `/api/browser-rendering/json`

Extracts structured data from a webpage using AI with a custom schema.

#### Request Body

```json
{
  "options": {
    "url": "https://example.com"
  },
  "prompt": "Extract job posting information including title, company, location, and salary",
  "responseFormat": {
    "type": "json_schema",
    "schema": {
      "type": "object",
      "properties": {
        "title": { "type": "string" },
        "company": { "type": "string" },
        "location": { "type": "string" },
        "salary": { "type": "string" }
      },
      "required": ["title", "company"]
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "data": {
    "title": "Senior Software Engineer",
    "company": "Tech Corp",
    "location": "San Francisco, CA",
    "salary": "$120,000 - $150,000"
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 7. Link Extraction

**POST** `/api/browser-rendering/links`

Extracts all links from a webpage.

#### Request Body

```json
{
  "options": {
    "url": "https://example.com",
    "visibleLinksOnly": true
  }
}
```

#### Response

```json
{
  "success": true,
  "links": [
    "https://example.com/about",
    "https://example.com/contact",
    "https://external-site.com"
  ],
  "count": 3,
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 8. Snapshot Capture

**POST** `/api/browser-rendering/snapshot`

Captures both a screenshot and HTML content in a single request.

#### Request Body

```json
{
  "options": {
    "url": "https://example.com",
    "screenshotOptions": {
      "fullPage": true
    }
  }
}
```

#### Response

```json
{
  "success": true,
  "snapshot": {
    "screenshot": "base64_encoded_screenshot",
    "content": "<html>...</html>",
    "contentLength": 15420
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 9. Comprehensive Scraping

**POST** `/api/browser-rendering/comprehensive`

Performs comprehensive web scraping with all content types, storing results in R2 and D1.

#### Request Body

```json
{
  "url": "https://example.com",
  "includeHtml": true,
  "includeScreenshot": true,
  "includePdf": false,
  "includeMarkdown": true,
  "includeJson": true,
  "includeLinks": true,
  "includeSnapshot": false,
  "includeScraped": true,
  "scrapeElements": [
    {
      "selector": "h1",
      "text": true
    }
  ],
  "jsonPrompt": "Extract key information from this page",
  "jsonSchema": {
    "type": "object",
    "properties": {
      "title": { "type": "string" },
      "description": { "type": "string" }
    }
  },
  "authentication": {
    "username": "user@example.com",
    "password": "password123"
  },
  "viewport": {
    "width": 1920,
    "height": 1080
  },
  "screenshotOptions": {
    "fullPage": true,
    "type": "png"
  },
  "gotoOptions": {
    "waitUntil": "networkidle2",
    "timeout": 30000
  },
  "jobId": "optional-job-id",
  "siteId": "optional-site-id"
}
```

#### Response

```json
{
  "success": true,
  "result": {
    "id": "uuid",
    "url": "https://example.com",
    "timestamp": "2024-01-01T00:00:00.000Z",
    "html": {
      "r2Key": "scraped-content/example.com/2024-01-01/content-uuid.html",
      "r2Url": "https://bucket.r2.dev/scraped-content/example.com/2024-01-01/content-uuid.html",
      "size": 15420
    },
    "screenshot": {
      "r2Key": "scraped-content/example.com/2024-01-01/screenshot-uuid.png",
      "r2Url": "https://bucket.r2.dev/scraped-content/example.com/2024-01-01/screenshot-uuid.png",
      "size": 245760
    },
    "markdown": {
      "r2Key": "scraped-content/example.com/2024-01-01/markdown-uuid.md",
      "r2Url": "https://bucket.r2.dev/scraped-content/example.com/2024-01-01/markdown-uuid.md",
      "size": 1250
    },
    "json": {
      "r2Key": "scraped-content/example.com/2024-01-01/data-uuid.json",
      "r2Url": "https://bucket.r2.dev/scraped-content/example.com/2024-01-01/data-uuid.json",
      "size": 500,
      "data": {
        "title": "Page Title",
        "description": "Page description"
      }
    },
    "links": {
      "r2Key": "scraped-content/example.com/2024-01-01/links-uuid.json",
      "r2Url": "https://bucket.r2.dev/scraped-content/example.com/2024-01-01/links-uuid.json",
      "size": 200,
      "links": ["https://example.com/about", "https://example.com/contact"]
    },
    "scraped": {
      "r2Key": "scraped-content/example.com/2024-01-01/scraped-uuid.json",
      "r2Url": "https://bucket.r2.dev/scraped-content/example.com/2024-01-01/scraped-uuid.json",
      "size": 300,
      "results": [
        {
          "selector": "h1",
          "results": [
            {
              "text": "Page Title",
              "html": "<h1>Page Title</h1>",
              "attributes": {},
              "height": 40,
              "width": 200,
              "top": 100,
              "left": 50
            }
          ]
        }
      ]
    },
    "httpStatus": 200
  },
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 10. Service Status

**GET** `/api/browser-rendering/status`

Returns the current status and capabilities of the browser rendering service.

#### Response

```json
{
  "status": "active",
  "service": "Browser Rendering API",
  "capabilities": [
    "Screenshot capture",
    "HTML content extraction",
    "PDF generation",
    "Element scraping",
    "Markdown extraction",
    "AI-powered JSON extraction",
    "Link extraction",
    "Snapshot capture",
    "Comprehensive scraping",
    "Authentication support",
    "R2 storage integration",
    "D1 database integration"
  ],
  "endpoints": [
    "POST /screenshot",
    "POST /content",
    "POST /pdf",
    "POST /scrape",
    "POST /markdown",
    "POST /json",
    "POST /links",
    "POST /snapshot",
    "POST /comprehensive",
    "GET /status"
  ],
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

## Authentication Support

The API supports authentication for sites that require login credentials:

```json
{
  "authentication": {
    "username": "user@example.com",
    "password": "password123",
    "apiKey": "api-key-here",
    "cookies": "session=abc123; auth=def456",
    "headers": {
      "Authorization": "Bearer token",
      "X-Custom-Header": "value"
    }
  }
}
```

## Error Handling

All endpoints return consistent error responses:

```json
{
  "error": "Error description",
  "details": "Detailed error message",
  "code": "ERROR_CODE"
}
```

Common error codes:

- `400`: Bad Request - Invalid request parameters
- `401`: Unauthorized - Missing or invalid API key
- `404`: Not Found - Endpoint not found
- `500`: Internal Server Error - Server-side error

## Rate Limiting

The API implements rate limiting:

- 50 requests per minute for browser rendering operations
- Rate limit headers are included in responses

## Storage Integration

### R2 Storage

All content is automatically stored in R2 with organized file paths:

- `scraped-content/{site}/{timestamp}/{type}-{uuid}.{ext}`
- Automatic content type detection
- Public URLs generated for easy access

### D1 Database

Metadata is stored in the D1 database:

- Snapshot records with R2 keys
- Job associations (when jobId provided)
- Content hashes for deduplication

## Examples

### Basic Screenshot

```bash
curl -X POST "https://your-worker.workers.dev/api/browser-rendering/screenshot" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "options": {
      "url": "https://example.com",
      "screenshotOptions": {
        "fullPage": true
      }
    }
  }'
```

### Comprehensive Scraping

```bash
curl -X POST "https://your-worker.workers.dev/api/browser-rendering/comprehensive" \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://job-site.com/job/123",
    "includeHtml": true,
    "includeScreenshot": true,
    "includeMarkdown": true,
    "includeJson": true,
    "jsonPrompt": "Extract job posting details",
    "jsonSchema": {
      "type": "object",
      "properties": {
        "title": {"type": "string"},
        "company": {"type": "string"},
        "location": {"type": "string"},
        "salary": {"type": "string"}
      }
    }
  }'
```

## Best Practices

1. **Use appropriate timeouts**: Set reasonable timeouts for page loading
2. **Filter resources**: Use `rejectResourceTypes` to avoid loading unnecessary content
3. **Handle authentication**: Use the authentication options for sites requiring login
4. **Monitor rate limits**: Respect the 50 requests per minute limit
5. **Use comprehensive scraping**: For job scraping, use the comprehensive endpoint for complete data capture
6. **Store results**: Always provide jobId and siteId for proper database integration

## Integration with Steel Scraper

This Browser Rendering API is designed to complement the existing Steel scraper:

- **Steel Scraper**: Specialized job site scraping with authentication persistence
- **Browser Rendering**: General-purpose web scraping with AI-powered extraction

Both can be used together for comprehensive job market analysis and data collection.
