# The Great Migration: Finalizing the Refactor

This document outlines the final phase of the refactoring project. The `src/new` directory contains the stable, modular, and robust foundation of the application. The purpose of this final phase is to migrate the remaining business logic from the old `src` directory into this new structure, and then decommission the old code entirely.

The end result will be a clean, maintainable, and observable codebase, with the contents of `src/new` becoming the new `src`.

---

## 1. Files/Logic to Keep and Migrate

The following files from the old `src` directory contain essential business logic. This logic will be extracted and moved into new, domain-specific services within the `src/new` structure. **We are migrating the logic, not the files themselves.**

*   **`src/routes/jobs.ts` & `src/routes/tracking.ts`**: Contains logic for fetching, exporting, and tracking jobs. This will be moved into a new `JobStorageService` and `JobProcessingService` in `src/new/domains/jobs/`.
*   **`src/routes/company-benefits.ts`**: Contains logic for scraping and comparing company benefits. This will be moved into a new `CompanyIntelligenceService` in `src/new/domains/companies/`.
*   **`src/routes/ai-documents.ts`**: Contains the core AI prompts and logic for generating cover letters and resumes. This will be moved into a new `DocumentGenerationService` in `src/new/domains/documents/`.
*   **`src/lib/durable-objects/site-crawler.ts` & `job-monitor.ts`**: The core logic of these Durable Objects will be preserved, but they will be refactored to use the new, modular domain services instead of the old monolithic `storage.ts`. They will be moved to `src/new/core/durable-objects/`.
*   **`src/lib/workflows/*.ts`**: The logic within the workflow files will be adapted to the new service-oriented architecture.
*   **`src/lib/email-event.ts` & `src/routes/email-ingest.ts`**: The logic for processing incoming emails will be migrated into a new `EmailService` in a `src/new/domains/email/` directory.
*   **`src/routes/api.ts`**: The main router file contains the list of all API endpoints. This will be used as a reference to build the new router in `src/new/index.ts`, ensuring all existing endpoints are preserved.

---

## 2. Files to Discard and Replace

The following files from the old `src` directory are now considered obsolete. Their functionality has been completely replaced by the new, superior services and patterns we have built in `src/new`. **These files will be deleted.**

*   **`src/lib/storage.ts`**: **REPLACED.** This monolithic storage file is the primary source of the original problems. Its logic has been broken apart and correctly implemented in the new, domain-specific storage services (`SiteStorageService`, `ApplicantStorageService`, etc.).
*   **`src/domains/**/services/*.ts` (from the old structure)**: **REPLACED.** All the partially refactored, broken services from the previous attempt are now superseded by the robust services in `src/new/domains/`. This includes:
    *   `src/domains/documents/services/document-generation.service.ts` (Replaced by `DocumentParsingService` and the future `DocumentGenerationService`).
    *   `src/domains/documents/services/document-processing.service.ts` (Replaced by the new `DocumentProcessingService` with correct reindexing).
    *   `src/domains/applicants/services/applicant-storage.service.ts` (Replaced by the new, type-safe `ApplicantStorageService`).
*   **`src/api/openapi-generator.ts`**: **REPLACED.** The old generator with the brittle `if-chain` has been replaced by the new, scalable version in `src/new/api/`.
*   **`src/api/openapi-routes.ts`**: **REPLACED.** The route definitions are being moved to the main router, and the duplicated constants have been extracted to `src/new/shared/constants.ts`.
*   **`src/routes/sites.ts`**: **REPLACED.** All logic is now contained within the new `SiteStorageService` and its corresponding `health.ts` file. The route handler will be a simple call to this service in the new router.
*   **`src/index.ts` (old version)**: **REPLACED.** The new `src/new/index.ts` is the new entry point, containing the global error handler, WebSocket router, and cron trigger.

This plan ensures that we achieve our goal: a clean, modular, and maintainable codebase, free of the legacy issues that prompted this refactor.
