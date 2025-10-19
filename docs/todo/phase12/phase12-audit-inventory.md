# Phase 12A: Audit & Document Old Code - Comprehensive Inventory

## Overview

This document provides a comprehensive inventory of all functionality in the old `src/lib/` and `src/routes/` directories to ensure no functionality is lost during the modularization migration.

**Audit Date**: 2025-01-18  
**Auditor**: AI Agent  
**Purpose**: Create migration verification checklist for Phase 12B-12E

## Current Status

- **Total lib/ files**: 33 files
- **Total routes/ files**: 35 files (including email/ subdirectory)
- **Migration Status**: Phases 1-11 completed, Phase 12A in progress

## File Inventory

### src/lib/ Directory (33 files)

#### Core Infrastructure Files

| File                 | Lines | Status      | New Location           | Notes                                |
| -------------------- | ----- | ----------- | ---------------------- | ------------------------------------ |
| `auth.ts`            | ?     | ✅ Migrated | `src/core/auth/`       | Authentication middleware and guards |
| `d1-utils.ts`        | ?     | ✅ Migrated | `src/core/database/`   | D1 database utilities                |
| `r2-utils.ts`        | ?     | ✅ Migrated | `src/core/storage/`    | R2 storage utilities                 |
| `r2.ts`              | ?     | ✅ Migrated | `src/core/storage/`    | R2 client                            |
| `validation.ts`      | ?     | ✅ Migrated | `src/core/validation/` | Validation utilities                 |
| `schemas.ts`         | ?     | ✅ Migrated | `src/core/validation/` | Schema definitions                   |
| `hono-validation.ts` | ?     | ✅ Migrated | `src/core/validation/` | Hono validation helpers              |
| `normalize.ts`       | ?     | ✅ Migrated | `src/core/validation/` | Data normalization                   |
| `vectorize.ts`       | ?     | ✅ Migrated | `src/core/storage/`    | Vectorize client                     |

#### Domain-Specific Files

| File                   | Lines | Status                | New Location                             | Notes                          |
| ---------------------- | ----- | --------------------- | ---------------------------------------- | ------------------------------ |
| `storage.ts`           | 991   | ⚠️ Partially Migrated | `src/domains/*/services/`                | Split across multiple domains  |
| `documents.ts`         | 1139  | ⚠️ Partially Migrated | `src/domains/documents/services/`        | Large file, needs verification |
| `steel.ts`             | 1009  | ⚠️ Deferred           | `src/domains/scraping/services/steel.ts` | **REFACTORING ON HOLD**        |
| `browser-rendering.ts` | 688   | ⚠️ Partially Migrated | `src/integrations/browser/`              | Browser automation             |
| `openapi.ts`           | 701   | ⚠️ Partially Migrated | `src/api/`                               | OpenAPI spec generation        |
| `crawl.ts`             | 363   | ✅ Migrated           | `src/domains/scraping/services/`         | Web crawling logic             |
| `job-processing.ts`    | ?     | ✅ Migrated           | `src/domains/jobs/services/`             | Job processing logic           |
| `monitoring.ts`        | 365   | ✅ Migrated           | `src/domains/monitoring/services/`       | Job monitoring                 |
| `extractBenefits.ts`   | ?     | ✅ Migrated           | `src/domains/companies/services/`        | Benefits extraction            |
| `talent.ts`            | ?     | ✅ Migrated           | `src/integrations/talent-api/`           | Talent API client              |

#### Agent Files

| File               | Lines | Status      | New Location          | Notes                        |
| ------------------ | ----- | ----------- | --------------------- | ---------------------------- |
| `agents.ts`        | ?     | ✅ Migrated | `src/domains/agents/` | Agent utilities              |
| `generic_agent.ts` | ?     | ✅ Migrated | `src/domains/agents/` | Generic agent implementation |
| `rag_agent.ts`     | ?     | ✅ Migrated | `src/domains/agents/` | RAG agent implementation     |

#### AI & Processing Files

| File            | Lines | Status                | New Location           | Notes               |
| --------------- | ----- | --------------------- | ---------------------- | ------------------- |
| `ai.ts`         | ?     | ⚠️ Partially Migrated | `src/integrations/ai/` | AI processing logic |
| `embeddings.ts` | 492   | ⚠️ Partially Migrated | `src/integrations/ai/` | Embeddings and RAG  |

#### Utility Files

| File         | Lines | Status                | New Location        | Notes                     |
| ------------ | ----- | --------------------- | ------------------- | ------------------------- |
| `types.ts`   | ?     | ⚠️ Partially Migrated | `src/shared/types/` | Type definitions          |
| `env.ts`     | ?     | ✅ Migrated           | `src/config/`       | Environment configuration |
| `hash.ts`    | ?     | ✅ Migrated           | `src/shared/utils/` | Hashing utilities         |
| `routing.ts` | ?     | ✅ Migrated           | `src/shared/utils/` | Routing utilities         |
| `content.ts` | ?     | ✅ Migrated           | `src/shared/utils/` | Content utilities         |

#### Testing & Development Files

| File                       | Lines | Status     | New Location | Notes                        |
| -------------------------- | ----- | ---------- | ------------ | ---------------------------- |
| `test-streaming.ts`        | ?     | ❓ Unknown | TBD          | Test streaming functionality |
| `websocket-client.ts`      | ?     | ❓ Unknown | TBD          | WebSocket client             |
| `websocket-test-runner.ts` | ?     | ❓ Unknown | TBD          | WebSocket test runner        |
| `scheduled.ts`             | ?     | ❓ Unknown | TBD          | Scheduled tasks              |

### src/routes/ Directory (35 files)

#### API & Core Routes

| File          | Lines | Status                | New Location        | Notes           |
| ------------- | ----- | --------------------- | ------------------- | --------------- |
| `api.ts`      | 674   | ⚠️ Partially Migrated | `src/api/router.ts` | Main API router |
| `openapi.ts`  | ?     | ✅ Migrated           | `src/api/`          | OpenAPI routes  |
| `webhooks.ts` | ?     | ✅ Migrated           | `src/api/`          | Webhook routes  |

#### Domain Routes

| File                  | Lines | Status      | New Location                     | Notes                   |
| --------------------- | ----- | ----------- | -------------------------------- | ----------------------- |
| `jobs.ts`             | ?     | ✅ Migrated | `src/domains/jobs/routes/`       | Job management routes   |
| `job-processing.ts`   | ?     | ✅ Migrated | `src/domains/jobs/routes/`       | Job processing routes   |
| `job-history.ts`      | ?     | ✅ Migrated | `src/domains/jobs/routes/`       | Job history routes      |
| `sites.ts`            | ?     | ✅ Migrated | `src/domains/sites/routes/`      | Site management routes  |
| `documents.ts`        | ?     | ✅ Migrated | `src/domains/documents/routes/`  | Document routes         |
| `ai-documents.ts`     | ?     | ✅ Migrated | `src/domains/documents/routes/`  | AI document routes      |
| `company-benefits.ts` | ?     | ✅ Migrated | `src/domains/companies/routes/`  | Company benefits routes |
| `tracking.ts`         | ?     | ✅ Migrated | `src/domains/monitoring/routes/` | Tracking routes         |
| `runs.ts`             | ?     | ✅ Migrated | `src/domains/monitoring/routes/` | Run tracking routes     |
| `workflows.ts`        | ?     | ✅ Migrated | `src/domains/workflows/routes/`  | Workflow routes         |

#### Scraping Routes

| File                 | Lines | Status                | New Location                   | Notes                  |
| -------------------- | ----- | --------------------- | ------------------------------ | ---------------------- |
| `scraper.ts`         | 985   | ⚠️ Partially Migrated | `src/domains/scraping/routes/` | Main scraper routes    |
| `steel-scraper.ts`   | 993   | ⚠️ Partially Migrated | `src/domains/scraping/routes/` | Steel scraper routes   |
| `crawl.ts`           | ?     | ✅ Migrated           | `src/domains/scraping/routes/` | Crawl routes           |
| `scrape-queue.ts`    | ?     | ✅ Migrated           | `src/domains/scraping/routes/` | Scrape queue routes    |
| `scrape-fallback.ts` | ?     | ✅ Migrated           | `src/domains/scraping/routes/` | Scrape fallback routes |
| `socket.ts`          | ?     | ✅ Migrated           | `src/domains/scraping/routes/` | WebSocket routes       |

#### Integration Routes

| File                        | Lines | Status                | New Location                              | Notes                         |
| --------------------------- | ----- | --------------------- | ----------------------------------------- | ----------------------------- |
| `browser-rendering.ts`      | ?     | ✅ Migrated           | `src/integrations/browser/routes/`        | Browser rendering routes      |
| `browser-testing.ts`        | 891   | ⚠️ Partially Migrated | `src/integrations/browser/routes/`        | Browser testing routes        |
| `browser-test-websocket.ts` | ?     | ✅ Migrated           | `src/integrations/browser/routes/`        | Browser test WebSocket routes |
| `talent.ts`                 | ?     | ✅ Migrated           | `src/integrations/talent-api/routes/`     | Talent API routes             |
| `remote-scraper.ts`         | ?     | ✅ Migrated           | `src/integrations/remote-scraper/routes/` | Remote scraper routes         |
| `embeddings.ts`             | ?     | ✅ Migrated           | `src/integrations/ai/routes/`             | Embeddings routes             |
| `rag.ts`                    | ?     | ✅ Migrated           | `src/domains/agents/routes/`              | RAG routes                    |

#### Agent Routes

| File        | Lines | Status      | New Location                 | Notes                   |
| ----------- | ----- | ----------- | ---------------------------- | ----------------------- |
| `agents.ts` | ?     | ✅ Migrated | `src/domains/agents/routes/` | Agent management routes |
| `agent.ts`  | ?     | ✅ Migrated | `src/domains/agents/routes/` | Individual agent routes |

#### UI & Utility Routes

| File         | Lines | Status      | New Location         | Notes                |
| ------------ | ----- | ----------- | -------------------- | -------------------- |
| `pages.ts`   | ?     | ✅ Migrated | `src/ui/routes/`     | Page routes          |
| `files.ts`   | ?     | ✅ Migrated | `src/ui/routes/`     | File serving routes  |
| `configs.ts` | ?     | ✅ Migrated | `src/config/routes/` | Configuration routes |

#### Email Routes

| File                  | Lines | Status      | New Location                     | Notes                   |
| --------------------- | ----- | ----------- | -------------------------------- | ----------------------- |
| `email/index.ts`      | ?     | ✅ Migrated | `src/integrations/email/routes/` | Email main routes       |
| `email/management.ts` | ?     | ✅ Migrated | `src/integrations/email/routes/` | Email management routes |
| `email/test-email.ts` | ?     | ✅ Migrated | `src/integrations/email/routes/` | Email test routes       |
| `emails.ts`           | ?     | ✅ Migrated | `src/integrations/email/routes/` | Email routes            |

#### Testing & Development Routes

| File            | Lines | Status     | New Location | Notes                  |
| --------------- | ----- | ---------- | ------------ | ---------------------- |
| `sites.test.ts` | ?     | ❓ Unknown | TBD          | Site testing routes    |
| `logs.ts`       | ?     | ❓ Unknown | TBD          | Logging routes         |
| `tasks.ts`      | ?     | ❓ Unknown | TBD          | Task management routes |

## Migration Status Legend

- ✅ **Migrated**: Fully migrated to new structure
- ⚠️ **Partially Migrated**: Some functionality migrated, needs verification
- ❓ **Unknown**: Status unclear, needs investigation
- ❌ **Not Migrated**: Not yet migrated
- 🚫 **Deferred**: Intentionally deferred (e.g., steel.ts refactoring)

## Next Steps

1. **Detailed Function Inventory**: For each file, document all exported functions, classes, types, and constants
2. **Migration Verification**: Verify each function exists in the new modular structure
3. **Missing Functionality Check**: Identify any functionality not yet migrated
4. **Import Path Updates**: Ensure all imports use new modular structure
5. **Testing Verification**: Verify all functionality works in new structure

## Risk Assessment

### High Risk Files (Require Careful Verification)

- `src/lib/storage.ts` (811 lines) - Core database operations
- `src/lib/documents.ts` (922 lines) - Document management
- `src/lib/steel.ts` (1009 lines) - Steel scraper (deferred)
- `src/lib/browser-rendering.ts` (688 lines) - Browser automation
- `src/lib/openapi.ts` (701 lines) - OpenAPI generation
- `src/routes/scraper.ts` (985 lines) - Scraper routes
- `src/routes/steel-scraper.ts` (993 lines) - Steel scraper routes
- `src/routes/browser-testing.ts` (891 lines) - Browser testing routes
- `src/routes/api.ts` (694 lines) - Main API router

### Medium Risk Files

- Files marked as "Partially Migrated"
- Files with unknown status
- Large files (>300 lines)

### Low Risk Files

- Files marked as "Migrated"
- Small utility files
- Simple route files

## Verification Checklist Template

For each file being audited:

- [ ] **File Size**: Document line count
- [ ] **Exported Items**: List all exports (functions, classes, types, constants)
- [ ] **Dependencies**: Document all imports and dependencies
- [ ] **Migration Status**: Verify migration status
- [ ] **New Location**: Document where functionality was moved
- [ ] **Function Verification**: Verify each function exists in new location
- [ ] **Import Updates**: Check if imports need updating
- [ ] **Testing**: Verify functionality works in new structure
- [ ] **Documentation**: Add migration notes and docstrings

## Notes

- This audit is critical for ensuring no functionality is lost during migration
- All high-risk files require careful verification
- The steel.ts file is intentionally deferred and should not be refactored
- Focus on functionality preservation over code organization during verification
