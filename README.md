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
*   **Scraping:** Contains all logic related to web scraping, crawling, and company intelligence.
*   **Agents:** Contains the various AI agent implementations.

## Getting Started

1.  Install dependencies: `pnpm install`
2.  Run the development server: `pnpm dev`
3.  Run tests: `pnpm test`

## Deployment

Deployment to Cloudflare is handled via the `pnpm deploy` command, which builds the worker, runs database migrations, and deploys the new version.