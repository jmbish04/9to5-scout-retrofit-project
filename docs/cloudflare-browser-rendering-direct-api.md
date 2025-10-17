# Cloudflare Browser Rendering REST API - Direct Usage

This document provides comprehensive documentation for using the Cloudflare Browser Rendering REST API directly, without going through a worker proxy.

## Overview

The Cloudflare Browser Rendering REST API provides a comprehensive set of endpoints for web scraping and content extraction using Cloudflare's managed browser infrastructure. It supports both authenticated and non-authenticated scraping, with direct access to all browser rendering capabilities.

## Base URL

```
https://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering
```

## Authentication

All requests require authentication using a Cloudflare API token with Browser Rendering - Edit permissions:

```bash
Authorization: Bearer your-cloudflare-api-token
```

## Prerequisites

1. **Cloudflare Account**: Sign up for a [Cloudflare account](https://dash.cloudflare.com/sign-up/workers-and-pages)
2. **API Token**: Create a [Cloudflare API Token](https://dash.cloudflare.com/profile/api-tokens) with `Browser Rendering - Edit` permissions
3. **Account ID**: Get your Cloudflare Account ID from the dashboard
4. **TypeScript SDK**: Install the Cloudflare TypeScript SDK: `npm install cloudflare`

## Installation

```bash
npm install cloudflare
```

## Configuration

### Using .dev.vars (Recommended for Cloudflare Workers projects)

Create or update your `.dev.vars` file in the project root:

```bash
# Cloudflare API key for browser rendering api
BROWSER_RENDERING_TOKEN="your-cloudflare-api-token"

# Cloudflare Account ID for browser rendering api
CLOUDFLARE_ACCOUNT_ID="your-cloudflare-account-id"
```

### Using Environment Variables

Alternatively, set environment variables:

```bash
export CLOUDFLARE_API_TOKEN="your-cloudflare-api-token"
export CLOUDFLARE_ACCOUNT_ID="your-cloudflare-account-id"
```

## Basic Setup

The example script automatically loads configuration from `.dev.vars`:

```typescript
import Cloudflare from "cloudflare";

// Configuration is automatically loaded from .dev.vars
const client = new Cloudflare({
  apiToken: CLOUDFLARE_API_TOKEN,
});

const accountId = CLOUDFLARE_ACCOUNT_ID;
```

## Available Endpoints

### 1. Screenshot

Capture screenshots of web pages.

**Endpoint**: `POST /screenshot`

**Parameters**:

- `url` (string): The URL to capture
- `screenshotOptions` (object): Screenshot configuration
  - `fullPage` (boolean): Capture full page
  - `type` (string): Image format (png, jpeg)
  - `quality` (number): Image quality (0-100)
  - `omitBackground` (boolean): Remove background
- `viewport` (object): Browser viewport settings
  - `width` (number): Viewport width
  - `height` (number): Viewport height
- `authenticate` (object): Authentication credentials
  - `username` (string): Username
  - `password` (string): Password

**Example**:

```typescript
const screenshot = await client.browserRendering.screenshot.create({
  account_id: accountId,
  url: "https://example.com",
  screenshotOptions: {
    fullPage: true,
    type: "png",
  },
  viewport: {
    width: 1920,
    height: 1080,
  },
});
```

### 2. Content

Extract HTML content from web pages.

**Endpoint**: `POST /content`

**Parameters**:

- `url` (string): The URL to extract content from
- `rejectResourceTypes` (array): Resource types to block
- `rejectRequestPattern` (array): Request patterns to block
- `allowResourceTypes` (array): Resource types to allow
- `allowRequestPattern` (array): Request patterns to allow
- `setExtraHTTPHeaders` (object): Custom HTTP headers
- `cookies` (array): Cookies to set
- `authenticate` (object): Authentication credentials

**Example**:

```typescript
const content = await client.browserRendering.content.create({
  account_id: accountId,
  url: "https://example.com",
  rejectResourceTypes: ["image", "stylesheet"],
  setExtraHTTPHeaders: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  },
});
```

### 3. Scrape

Extract specific elements from web pages.

**Endpoint**: `POST /scrape`

**Parameters**:

- `url` (string): The URL to scrape
- `elements` (array): Elements to extract
  - `selector` (string): CSS selector
- `authenticate` (object): Authentication credentials

**Example**:

```typescript
const scrapes = await client.browserRendering.scrape.create({
  account_id: accountId,
  url: "https://example.com",
  elements: [{ selector: "h1" }, { selector: "a[href]" }],
});
```

### 4. Markdown

Convert web page content to Markdown.

**Endpoint**: `POST /markdown`

**Parameters**:

- `url` (string): The URL to convert
- `authenticate` (object): Authentication credentials

**Example**:

```typescript
const markdown = await client.browserRendering.markdown.create({
  account_id: accountId,
  url: "https://example.com",
});
```

### 5. JSON (AI-powered)

Extract structured data using AI.

**Endpoint**: `POST /json`

**Parameters**:

- `url` (string): The URL to extract data from
- `prompt` (string): AI prompt for extraction
- `response_format` (object): Response format specification
  - `type` (string): Format type (json_schema)
  - `schema` (object): JSON schema definition
- `custom_ai` (array): Custom AI models
  - `model` (string): Model identifier
  - `authorization` (string): API key for the model
- `authenticate` (object): Authentication credentials

**Example**:

```typescript
const json = await client.browserRendering.json.create({
  account_id: accountId,
  url: "https://example.com",
  prompt: "Extract the main heading and contact information",
  response_format: {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        heading: { type: "string" },
        contactEmail: { type: "string" },
      },
    },
  },
});
```

### 6. Links

Extract all links from a web page.

**Endpoint**: `POST /links`

**Parameters**:

- `url` (string): The URL to extract links from
- `authenticate` (object): Authentication credentials

**Example**:

```typescript
const links = await client.browserRendering.links.create({
  account_id: accountId,
  url: "https://example.com",
});
```

### 7. PDF

Generate PDF from web pages.

**Endpoint**: `POST /pdf`

**Parameters**:

- `url` (string): The URL to convert to PDF
- `pdfOptions` (object): PDF generation options
  - `format` (string): Page format (A4, Letter, etc.)
  - `printBackground` (boolean): Include background
  - `margin` (object): Page margins
- `authenticate` (object): Authentication credentials

**Example**:

```typescript
const pdf = await client.browserRendering.pdf.create({
  account_id: accountId,
  url: "https://example.com",
  pdfOptions: {
    format: "A4",
    printBackground: true,
  },
});
```

### 8. Snapshot

Take accessibility snapshots of web pages.

**Endpoint**: `POST /snapshot`

**Parameters**:

- `url` (string): The URL to snapshot
- `authenticate` (object): Authentication credentials

**Example**:

```typescript
const snapshot = await client.browserRendering.snapshot.create({
  account_id: accountId,
  url: "https://example.com",
});
```

## Response Format

All endpoints return responses in the following format:

```typescript
{
  success: boolean;
  result: any; // The actual data/content
  errors: any[]; // Any errors that occurred
  messages: any[]; // Any messages
}
```

## Error Handling

```typescript
try {
  const result = await client.browserRendering.screenshot.create({
    account_id: accountId,
    url: "https://example.com",
  });

  if (result.success) {
    console.log("Screenshot captured:", result.result);
  } else {
    console.error("Screenshot failed:", result.errors);
  }
} catch (error) {
  console.error("Request failed:", error);
}
```

## Advanced Usage

### Custom Headers and Cookies

```typescript
const content = await client.browserRendering.content.create({
  account_id: accountId,
  url: "https://example.com",
  setExtraHTTPHeaders: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  },
  cookies: [
    {
      name: "session_id",
      value: "abc123",
      domain: "example.com",
      path: "/",
    },
  ],
});
```

### Authentication

```typescript
const content = await client.browserRendering.content.create({
  account_id: accountId,
  url: "https://protected-site.com",
  authenticate: {
    username: "your-username",
    password: "your-password",
  },
});
```

### Custom AI Models

```typescript
const json = await client.browserRendering.json.create({
  account_id: accountId,
  url: "https://example.com",
  prompt: "Extract key information",
  custom_ai: [
    {
      model: "anthropic/claude-3-sonnet-20240229",
      authorization: "Bearer your-anthropic-api-key",
    },
  ],
  response_format: {
    type: "json_schema",
    schema: {
      type: "object",
      properties: {
        content: { type: "string" },
      },
    },
  },
});
```

### Resource Filtering

```typescript
const content = await client.browserRendering.content.create({
  account_id: accountId,
  url: "https://example.com",
  rejectResourceTypes: ["image", "stylesheet", "font"],
  rejectRequestPattern: ["/^.*\\.(css|js)$/"],
  allowResourceTypes: ["document"],
});
```

## Parallel Processing

```typescript
const [htmlResult, screenshotResult, markdownResult] = await Promise.allSettled(
  [
    client.browserRendering.content.create({
      account_id: accountId,
      url: "https://example.com",
    }),
    client.browserRendering.screenshot.create({
      account_id: accountId,
      url: "https://example.com",
    }),
    client.browserRendering.markdown.create({
      account_id: accountId,
      url: "https://example.com",
    }),
  ]
);

// Check results
if (htmlResult.status === "fulfilled") {
  console.log("HTML extracted:", htmlResult.value.result);
}
if (screenshotResult.status === "fulfilled") {
  console.log("Screenshot captured");
}
if (markdownResult.status === "fulfilled") {
  console.log("Markdown generated:", markdownResult.value.result);
}
```

## Rate Limits

The Browser Rendering API has rate limits based on your Cloudflare plan:

- **Free Plan**: 1,000 requests per month
- **Paid Plans**: Higher limits based on your subscription

Monitor your usage in the Cloudflare dashboard or check the `X-Browser-Ms-Used` header in responses.

## Monitoring

Check the `X-Browser-Ms-Used` header in API responses to monitor browser time usage:

```typescript
const response = await client.browserRendering.screenshot.create({
  account_id: accountId,
  url: "https://example.com",
});

// The response will include browser time used in the headers
console.log("Browser time used:", response.headers?.["x-browser-ms-used"]);
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**: Ensure your API token has the correct permissions
2. **Rate Limit Exceeded**: Check your usage in the Cloudflare dashboard
3. **Invalid URL**: Ensure the URL is properly formatted and accessible
4. **Timeout Errors**: Some pages may take longer to load; consider adjusting timeouts

### Debug Mode

Enable debug logging to troubleshoot issues:

```typescript
const client = new Cloudflare({
  apiToken: process.env.CLOUDFLARE_API_TOKEN,
  debug: true, // Enable debug logging
});
```

## LinkedIn Job Scraping

The example includes specialized functionality for scraping LinkedIn job postings with authentication:

### Prerequisites

Add your LinkedIn credentials to `.dev.vars`:

```bash
LINKEDIN_USERNAME="your-linkedin-email@example.com"
LINKEDIN_PASSWORD="your-linkedin-password"
```

### Usage

#### Test LinkedIn Job Scraping

```bash
# Test with a specific LinkedIn job ID
pnpm test:linkedin-job 1234567890

# Or test with default job ID
pnpm test:linkedin-job
```

#### Programmatic Usage

```typescript
import { scrapeLinkedInJob } from "./docs/browser-rendering-example.js";

// Scrape a specific LinkedIn job
const result = await scrapeLinkedInJob("1234567890");
console.log("Job data:", result.data);
```

### LinkedIn Job Data Structure

The LinkedIn scraper extracts comprehensive job information:

```typescript
{
  title: string;           // Job title
  company: string;         // Company name
  location: string;        // Job location
  employmentType: string;  // Full-time, part-time, etc.
  salaryRange: string;     // Salary information
  description: string;     // Job description
  requiredSkills: string[]; // Required skills
  preferredSkills: string[]; // Preferred skills
  benefits: string[];      // Benefits and perks
  applicationDeadline: string; // Application deadline
  remoteWork: string;      // Remote work options
  experienceLevel: string; // Experience level required
  industry: string;        // Industry/sector
  jobUrl: string;         // Job posting URL
  postedDate: string;     // When job was posted
}
```

### LinkedIn-Specific Features

- **Authentication**: Uses LinkedIn credentials from `.dev.vars`
- **Custom Headers**: Includes realistic browser headers to avoid detection
- **LinkedIn Selectors**: Uses LinkedIn-specific CSS selectors for accurate data extraction
- **Comprehensive Data**: Extracts detailed job information including skills, benefits, and requirements
- **Error Handling**: Graceful handling of authentication failures and missing data

## Examples

See the complete example file at `docs/browser-rendering-example.js` for comprehensive usage examples.

## Support

- [Cloudflare Browser Rendering Documentation](https://developers.cloudflare.com/browser-rendering/)
- [Cloudflare API Documentation](https://developers.cloudflare.com/api/)
- [Cloudflare Community](https://community.cloudflare.com/)
