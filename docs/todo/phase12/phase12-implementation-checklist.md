# Phase 12 Implementation Checklist

## Progress Tracking

**Overall Progress**: 0/30+ files migrated  
**Current Phase**: Phase 12B - High-Priority Migrations  
**Started**: 2025-01-17  
**Target Completion**: 2025-02-07

---

## Phase 12B: High-Priority Migrations (Week 1)

### Priority 1: Critical Lib Files (Days 1-2)

#### ✅ **COMPLETED**

- [ ] `src/lib/documents.ts` (922 lines) → `src/domains/documents/services/`

  - [ ] Split into `document-storage.service.ts`
  - [ ] Split into `document-generation.service.ts`
  - [ ] Split into `document-processing.service.ts`
  - [ ] Split into `document-search.service.ts`
  - [ ] Update all imports throughout codebase
  - [ ] Test build and functionality

- [ ] `src/lib/storage.ts` (811 lines) → Split across domain services

  - [ ] Split into `src/domains/jobs/services/job-storage.service.ts`
  - [ ] Split into `src/domains/sites/services/site-storage.service.ts`
  - [ ] Split into `src/domains/applicants/services/applicant-storage.service.ts`
  - [ ] Split into `src/domains/companies/services/company-storage.service.ts`
  - [ ] Update all imports throughout codebase
  - [ ] Test build and functionality

- [ ] `src/lib/browser-rendering.ts` (688 lines) → `src/integrations/browser/`

  - [ ] Split into `browser-rendering.service.ts`
  - [ ] Split into `browser-testing.service.ts`
  - [ ] Update all imports throughout codebase
  - [ ] Test build and functionality

- [ ] `src/lib/openapi.ts` (701 lines) → `src/api/`
  - [ ] Split into `openapi-generator.ts`
  - [ ] Split into `openapi-routes.ts`
  - [ ] Split into `openapi-schemas.ts`
  - [ ] Update all imports throughout codebase
  - [ ] Test build and functionality

### Priority 2: Critical Route Files (Days 3-4)

#### ✅ **COMPLETED**

- [ ] `src/routes/api.ts` (694 lines) → `src/api/router.ts`

  - [ ] Create domain route aggregation logic
  - [ ] Update main worker to use new router
  - [ ] Test all API endpoints

- [ ] `src/routes/webhooks.ts` → `src/api/routes/webhooks.routes.ts`

  - [ ] Update all imports throughout codebase
  - [ ] Test webhook functionality

- [ ] `src/routes/files.ts` → `src/domains/ui/routes/files.routes.ts`
  - [ ] Update all imports throughout codebase
  - [ ] Test file management functionality

### Priority 3: Medium-Priority Lib Files (Days 5-7)

#### ✅ **COMPLETED**

- [ ] `src/lib/ai.ts` → `src/integrations/ai/ai.service.ts`
- [ ] `src/lib/agents.ts` → `src/domains/agents/services/agent-manager.service.ts`
- [ ] `src/lib/monitoring.ts` → `src/domains/monitoring/services/monitoring.service.ts`
- [ ] `src/lib/embeddings.ts` → `src/integrations/ai/embeddings.service.ts`
- [ ] `src/lib/talent.ts` → `src/integrations/talent/talent.service.ts`
- [ ] `src/lib/crawl.ts` → `src/domains/scraping/services/crawl.service.ts`
- [ ] `src/lib/job-processing.ts` → `src/domains/jobs/services/job-processing.service.ts`

---

## Phase 12C: Complete Remaining Migrations (Week 2)

### Priority 4: Remaining Lib Files (Days 1-3)

#### Core Infrastructure Files

- [ ] `src/lib/auth.ts` → `src/core/auth/middleware.ts`
- [ ] `src/lib/validation.ts` → `src/core/validation/validation.service.ts`
- [ ] `src/lib/schemas.ts` → `src/core/validation/schemas.ts`
- [ ] `src/lib/types.ts` → Split across domain type files
- [ ] `src/lib/d1-utils.ts` → `src/core/database/d1-client.ts`
- [ ] `src/lib/r2.ts` → `src/core/storage/r2-client.ts`
- [ ] `src/lib/r2-utils.ts` → `src/core/storage/r2-client.ts`
- [ ] `src/lib/vectorize.ts` → `src/core/storage/vectorize-client.ts`

#### Utility Files

- [ ] `src/lib/extractBenefits.ts` → `src/domains/companies/services/benefits-extraction.service.ts`
- [ ] `src/lib/scheduled.ts` → `src/domains/monitoring/services/scheduled.service.ts`
- [ ] `src/lib/routing.ts` → `src/shared/utils/routing.ts`
- [ ] `src/lib/content.ts` → `src/shared/utils/content.ts`
- [ ] `src/lib/hash.ts` → `src/shared/utils/hash.ts`
- [ ] `src/lib/normalize.ts` → `src/core/validation/normalize.ts`
- [ ] `src/lib/hono-validation.ts` → `src/core/validation/hono-validation.ts`
- [ ] `src/lib/env.ts` → `src/config/env/env.config.ts`

#### Agent Files

- [ ] `src/lib/generic_agent.ts` → `src/domains/agents/generic-agent.ts`
- [ ] `src/lib/rag_agent.ts` → `src/domains/agents/rag-agent.ts`

#### Test Files

- [ ] `src/lib/test-streaming.ts` → `src/test-support/streaming.ts`
- [ ] `src/lib/websocket-client.ts` → `src/integrations/websocket/websocket-client.ts`
- [ ] `src/lib/websocket-test-runner.ts` → `src/test-support/websocket-test-runner.ts`

### Priority 5: Remaining Route Files (Days 4-5)

#### Integration Routes

- [ ] `src/routes/browser-test-websocket.ts` → `src/integrations/browser/routes/browser-test-websocket.routes.ts`
- [ ] `src/routes/remote-scraper.ts` → `src/integrations/remote-scraper/routes/remote-scraper.routes.ts`
- [ ] `src/routes/embeddings.ts` → `src/integrations/ai/routes/embeddings.routes.ts`
- [ ] `src/routes/talent.ts` → `src/integrations/talent/routes/talent.routes.ts`

#### Scraping Routes

- [ ] `src/routes/socket.ts` → `src/domains/scraping/routes/socket.routes.ts`
- [ ] `src/routes/scrape-fallback.ts` → `src/domains/scraping/routes/scrape-fallback.routes.ts`
- [ ] `src/routes/scrape-queue.ts` → `src/domains/scraping/routes/scrape-queue.routes.ts`
- [ ] `src/routes/crawl.ts` → `src/domains/scraping/routes/crawl.routes.ts`

#### Monitoring Routes

- [ ] `src/routes/runs.ts` → `src/domains/monitoring/routes/runs.routes.ts`

#### Workflow Routes

- [ ] `src/routes/workflows.ts` → `src/domains/workflows/routes/workflows.routes.ts`

#### Duplicate Routes (Remove after verification)

- [ ] `src/routes/agent.ts` → Remove (has equivalent in `domains/agents/routes/`)
- [ ] `src/routes/agents.ts` → Remove (has equivalent in `domains/agents/routes/`)
- [ ] `src/routes/company-benefits.ts` → Remove (has equivalent in `domains/companies/routes/`)
- [ ] `src/routes/documents.ts` → Remove (has equivalent in `domains/documents/routes/`)
- [ ] `src/routes/job-history.ts` → Remove (has equivalent in `domains/jobs/routes/`)
- [ ] `src/routes/job-processing.ts` → Remove (has equivalent in `domains/jobs/routes/`)
- [ ] `src/routes/jobs.ts` → Remove (has equivalent in `domains/jobs/routes/`)
- [ ] `src/routes/sites.ts` → Remove (has equivalent in `domains/sites/routes/`)

---

## Phase 12D: Import Cleanup & Testing (Week 2-3)

### Priority 6: Import Updates (Days 6-7)

#### ✅ **COMPLETED**

- [ ] Search and replace all `../lib/` imports to use new domain paths
- [ ] Search and replace all `../routes/` imports to use new domain paths
- [ ] Update `src/index.ts` - Update all imports
- [ ] Update `src/routes/legacy-api.routes.ts` - Update all imports
- [ ] Update all domain index files - Update imports
- [ ] Update all type imports to use new domain type files
- [ ] Ensure all types are properly exported from domain modules
- [ ] Verify no broken imports remain

### Priority 7: Testing & Validation (Days 8-10)

#### ✅ **COMPLETED**

- [ ] Run `pnpm run build` after each major migration
- [ ] Fix any TypeScript compilation errors
- [ ] Verify all imports are correct
- [ ] Test all legacy endpoints to ensure they work
- [ ] Verify backward compatibility
- [ ] Test integration with existing clients
- [ ] Test all moved functionality
- [ ] Verify no functionality is lost
- [ ] Test error handling

---

## Phase 12E: Final Consolidation (Week 3)

### Priority 8: Legacy File Consolidation (Days 11-14)

#### ✅ **COMPLETED**

- [ ] Create final route files by merging all legacy functions
- [ ] Remove placeholder responses
- [ ] Implement full functionality in final routes
- [ ] Update `legacy-*.routes.ts` to call final route functions instead of placeholders
- [ ] Maintain backward compatibility
- [ ] Keep deprecation warnings
- [ ] Delete `legacy-*-original.ts` files (if any exist)
- [ ] Keep only `legacy-*.routes.ts` for compatibility
- [ ] Clean up imports and dependencies
- [ ] Achieve clean, final domain structure
- [ ] Maintain legacy compatibility layer
- [ ] Complete modularization with zero functionality loss

### Priority 9: Final Cleanup (Days 15-17)

#### ✅ **COMPLETED**

- [ ] Remove empty directories
- [ ] Remove unused files
- [ ] Update all documentation to reflect new structure
- [ ] Create migration guide for future reference
- [ ] Document any breaking changes
- [ ] Run full test suite
- [ ] Test all API endpoints
- [ ] Verify all Durable Objects work
- [ ] Test all workflows and agents

---

## Daily Progress Log

### Day 1 (2025-01-17)

- [ ] Started Phase 12B
- [ ] Migrated: [List files]
- [ ] Issues encountered: [List issues]
- [ ] Next steps: [List next steps]

### Day 2 (2025-01-18)

- [ ] Migrated: [List files]
- [ ] Issues encountered: [List issues]
- [ ] Next steps: [List next steps]

### Day 3 (2025-01-19)

- [ ] Migrated: [List files]
- [ ] Issues encountered: [List issues]
- [ ] Next steps: [List next steps]

### Day 4 (2025-01-20)

- [ ] Migrated: [List files]
- [ ] Issues encountered: [List issues]
- [ ] Next steps: [List next steps]

### Day 5 (2025-01-21)

- [ ] Migrated: [List files]
- [ ] Issues encountered: [List issues]
- [ ] Next steps: [List next steps]

---

## Success Metrics

### Phase 12B Completion Criteria

- [ ] All high-priority lib files migrated (4 files)
- [ ] All high-priority route files migrated (3 files)
- [ ] Build successful with no errors
- [ ] All imports updated

### Phase 12C Completion Criteria

- [ ] All remaining lib files migrated (15+ files)
- [ ] All remaining route files migrated (15+ files)
- [ ] No files in `src/lib/` or `src/routes/` (except legacy compatibility)
- [ ] All imports updated throughout codebase

### Phase 12D Completion Criteria

- [ ] All imports cleaned up
- [ ] All tests passing
- [ ] All functionality verified

### Phase 12E Completion Criteria

- [ ] Final consolidation complete
- [ ] Clean, modular architecture achieved
- [ ] Zero functionality loss
- [ ] Comprehensive testing completed

---

## Notes

- **Build Status**: ✅ Currently building successfully
- **Legacy Compatibility**: ✅ Working (allows gradual migration)
- **Risk Level**: 🟡 Medium (requires careful testing)
- **Estimated Effort**: 2-3 weeks full-time work

---

## Quick Reference

### File Migration Commands

```bash
# Move file
mv src/lib/filename.ts src/domains/domain/services/filename.service.ts

# Search and replace imports
find src -name "*.ts" -exec sed -i 's|../lib/filename|../domains/domain/services/filename.service|g' {} \;

# Test build
pnpm run build

# Test functionality
pnpm test
```

### Verification Checklist

- [ ] File moved to correct location
- [ ] All imports updated
- [ ] Build successful
- [ ] Functionality tested
- [ ] No broken references
- [ ] Legacy compatibility maintained
