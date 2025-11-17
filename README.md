# 9to5 Scout Worker

This repository contains the Cloudflare Worker for the 9to5 Scout project, an automated job scraping and career management platform.

## Architecture

The worker has been refactored into a clean, modular, and service-oriented architecture. The core logic is organized into two main directories: `src/core` and `src/domains`.

### `src/core`

This directory contains all the cross-cutting concerns and foundational services that are used throughout the application. This includes:

*   **Services:** Core services like logging, error handling, and health checks.
*   **Durable Objects:** Core Durable Objects like the `HealthCheckSocket`.
*   **Validation:** Zod schemas for validating all data structures.
*   **Errors:** Custom error classes for robust error handling.

### `src/domains`

This directory contains the business logic of the application, organized by domain. Each domain is self-contained and includes its own services, types, and (if applicable) Durable Objects. The primary domains are:

*   **Jobs:** Manages the storage and processing of job data.
*   **Documents:** Handles the generation and storage of AI-powered documents like resumes and cover letters.
*   **Email:** Manages the ingestion and processing of inbound emails.
*   **Scraping:** Contains all logic related to web scraping, crawling, and company intelligence including automated company career page scraping.
*   **Agents:** Contains the various AI agent implementations.

## Getting Started

1.  Install dependencies: `pnpm install`
2.  Run the development server: `pnpm dev`
3.  Run tests: `pnpm test`

## Company Career Page Scraping

The worker includes automated scraping of company career pages using the Cloudflare Browser Rendering API. This feature provides:

### API Endpoints

- `GET/POST/PUT/DELETE /api/companies` - Company management
- `POST /api/companies/{id}/scrape` - Scrape individual company careers
- `POST /api/companies/scrape-all` - Scrape all configured companies

### Key Features

- **Universal Scraping**: Works with any career page format using AI-powered extraction
- **Structured Data**: Extracts job details using JSON schema validation
- **Scheduled Workflows**: Automated periodic scraping via Cloudflare Workflows
- **Job Queue Integration**: Scraped jobs automatically enter the processing pipeline
- **Error Handling**: Comprehensive error tracking and recovery

### Usage Example

```bash
# Create a company
curl -X POST '/api/companies' \
  -H 'Content-Type: application/json' \
  -d '{"name":"Cloudflare","normalized_domain":"cloudflare.com","careers_url":"https://cloudflare.com/careers"}'

# Scrape company careers
curl -X POST '/api/companies/{company-id}/scrape'
```

See `docs/company-career-scraping.md` for detailed documentation.

## Deployment

Deployment to Cloudflare is handled via the `pnpm deploy` command, which builds the worker, runs database migrations, and deploys the new version.