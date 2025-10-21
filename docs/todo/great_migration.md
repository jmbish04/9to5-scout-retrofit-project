# The Great Migration: A Phased Plan for Final Refactoring

## 1. Introduction

The goal of this final phase is to methodically migrate all remaining business logic from the legacy `src/lib` and `src/routes` directories into the new, service-oriented architecture under `src/domains` and `src/core`. This document outlines a phased approach to ensure a smooth and organized transition.

Upon completion of these phases, the old `src/lib` and `src/routes` directories will be empty and can be safely deleted, marking the successful completion of the refactor.

---

## 2. Phased Migration Plan

We will tackle the migration domain by domain to keep the process manageable and focused.

### Phase 1: Jobs & Tracking

*   **Objective:** Centralize all logic related to job creation, retrieval, and monitoring into a dedicated `jobs` domain.
*   **Source Files:**
    *   `src/routes/jobs.ts`
    *   `src/routes/tracking.ts`
    *   `src/lib/job-processing.ts`
*   **Target Architecture:**
    *   `src/domains/jobs/services/job-storage.service.ts`: Will handle all D1 database interactions for jobs, job history, and tracking.
    *   `src/domains/jobs/services/job-processing.service.ts`: Will handle logic for monitoring, status updates, and daily runs.
    *   `src/domains/jobs/types.ts`: Will contain Zod schemas and TypeScript types for `Job`, `JobTrackingHistory`, etc.
    *   `src/api/routes/jobs.ts`: New route handlers that call the new services.

---

### Phase 2: AI & Document Generation

*   **Objective:** Consolidate all AI-powered document creation and analysis logic.
*   **Source Files:**
    *   `src/routes/ai-documents.ts`
    *   `src/routes/documents.ts`
    *   `src/lib/ai.ts`
    *   `src/lib/embeddings.ts`
*   **Target Architecture:**
    *   `src/domains/documents/services/document-generation.service.ts`: Will contain the core AI prompts and logic for generating resumes and cover letters.
    *   `src/domains/documents/services/document-storage.service.ts`: Will handle saving and retrieving document metadata from D1 and content from R2.
    *   `src/domains/documents/types.ts`: Zod schemas for all document-related types.
    *   `src/api/routes/documents.ts`: New route handlers for the documents domain.

---

### Phase 3: Email Processing

*   **Objective:** Create a dedicated domain for all inbound and outbound email-related functionality.
*   **Source Files:**
    *   `src/routes/email/*`
    *   `src/routes/emails.ts`
    *   `src/lib/email-event.ts`
*   **Target Architecture:**
    *   `src/domains/email/services/email-ingestion.service.ts`: Will handle the logic for parsing incoming emails via Cloudflare Email Routing.
    *   `src/domains/email/services/email-reporting.service.ts`: Will handle logic for sending out email insights and reports.
    *   `src/domains/email/types.ts`: Zod schemas for email data structures.
    *   `src/api/routes/email.ts`: New route handlers for email logs and configuration.

---

### Phase 4: Scraping & Company Intelligence

*   **Objective:** Modularize the web scraping, crawling, and company data analysis logic.
*   **Source Files:**
    *   `src/routes/scraper.ts`
    *   `src/routes/crawl.ts`
    *   `src/routes/company-benefits.ts`
    *   `src/lib/crawl.ts`
    *   `src/lib/steel.ts`
*   **Target Architecture:**
    *   `src/domains/scraping/services/scrape-queue.service.ts`: Manages the queue of sites to be scraped.
    *   `src/domains/scraping/services/company-intelligence.service.ts`: Handles the logic for analyzing scraped data to extract benefits and other insights.
    *   `src/domains/scraping/durable-objects/site-crawler.do.ts`: Refactor the existing SiteCrawler DO to use the new domain services.
    *   `src/api/routes/scraping.ts`: New route handlers for scraping and company intelligence.

---

### Phase 5: Core Logic & Final Cleanup

*   **Objective:** Migrate remaining core logic, refactor Durable Objects, update configuration, and perform the final cleanup.
*   **Source Files:**
    *   All remaining files in `src/lib` and `src/routes`.
    *   `wrangler.toml`
*   **Key Steps:**
    1.  **Migrate Utilities:** Move any reusable functions from `src/lib` (e.g., `validation.ts`, `d1-utils.ts`) into `src/core/lib/`.
    2.  **Refactor Durable Objects:** Update all remaining DOs (`JobMonitor`, etc.) to use the new, injected domain services.
    3.  **Update Router:** Complete the main router in `src/index.ts` to handle all API routes, calling the new services.
    4.  **Update Configuration:** Modify `wrangler.toml` to point to the new Durable Object paths (e.g., `src/core/durable-objects/site-crawler.do.ts`).
    5.  **Final Deletion:** Once all logic has been migrated, delete the `src/lib`, `src/routes`, and `src/disregard` directories.
    6.  **Update Documentation:** Update the project `README.md` to reflect the new, clean architecture.
