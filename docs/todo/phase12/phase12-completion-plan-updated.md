# Phase 12 Completion Plan - Updated (2025-01-17)

## Executive Summary

**Current Status**: ~60-70% Complete  
**Remaining Work**: 30+ files still in `src/lib/` and `src/routes/` need migration  
**Priority**: Complete high-priority migrations first, then systematic cleanup  
**Timeline**: 2-3 weeks for full completion

## Audit Findings Summary

### ✅ **COMPLETED**

- Domain structure created (all major domains exist)
- Core infrastructure (`src/core/`, `src/shared/`, `src/integrations/`)
- Legacy compatibility layer working
- Build successful (no broken imports)

### ❌ **REMAINING WORK**

- **30+ files in `src/lib/`** need migration to appropriate domains
- **20+ files in `src/routes/`** need migration to appropriate domains
- **Missing consolidation phase** (legacy-original file merging)
- **Import cleanup** throughout codebase

## Updated Migration Plan

### **PHASE 12B: Complete High-Priority Migrations** (Week 1)

#### **Priority 1: Critical Lib Files** (Days 1-2)

**Target**: Move the largest, most complex files first

1. **`src/lib/documents.ts` (922 lines)**

   - **Move to**: `src/domains/documents/services/`
   - **Split into**:
     - `document-storage.service.ts`
     - `document-generation.service.ts`
     - `document-processing.service.ts`
     - `document-search.service.ts`
   - **Update imports**: Search and replace all references

2. **`src/lib/storage.ts` (811 lines)**

   - **Move to**: Split across multiple domain services
   - **Split into**:
     - `src/domains/jobs/services/job-storage.service.ts`
     - `src/domains/sites/services/site-storage.service.ts`
     - `src/domains/applicants/services/applicant-storage.service.ts`
     - `src/domains/companies/services/company-storage.service.ts`
   - **Update imports**: Search and replace all references

3. **`src/lib/browser-rendering.ts` (688 lines)**

   - **Move to**: `src/integrations/browser/`
   - **Split into**:
     - `browser-rendering.service.ts`
     - `browser-testing.service.ts`
   - **Update imports**: Search and replace all references

4. **`src/lib/openapi.ts` (701 lines)**
   - **Move to**: `src/api/`
   - **Split into**:
     - `openapi-generator.ts`
     - `openapi-routes.ts`
     - `openapi-schemas.ts`
   - **Update imports**: Search and replace all references

#### **Priority 2: Critical Route Files** (Days 3-4)

1. **`src/routes/api.ts` (694 lines)**

   - **Move to**: `src/api/router.ts`
   - **Create**: Domain route aggregation logic
   - **Update**: Main worker to use new router

2. **`src/routes/webhooks.ts`**

   - **Move to**: `src/api/routes/webhooks.routes.ts`
   - **Update imports**: Search and replace all references

3. **`src/routes/files.ts`**
   - **Move to**: `src/domains/ui/routes/files.routes.ts`
   - **Update imports**: Search and replace all references

#### **Priority 3: Medium-Priority Lib Files** (Days 5-7)

1. **`src/lib/ai.ts`** → `src/integrations/ai/ai.service.ts`
2. **`src/lib/agents.ts`** → `src/domains/agents/services/agent-manager.service.ts`
3. **`src/lib/monitoring.ts`** → `src/domains/monitoring/services/monitoring.service.ts`
4. **`src/lib/embeddings.ts`** → `src/integrations/ai/embeddings.service.ts`
5. **`src/lib/talent.ts`** → `src/integrations/talent/talent.service.ts`
6. **`src/lib/crawl.ts`** → `src/domains/scraping/services/crawl.service.ts`
7. **`src/lib/job-processing.ts`** → `src/domains/jobs/services/job-processing.service.ts`

### **PHASE 12C: Complete Remaining Migrations** (Week 2)

#### **Priority 4: Remaining Lib Files** (Days 1-3)

**Core Infrastructure Files**:

- `src/lib/auth.ts` → `src/core/auth/middleware.ts`
- `src/lib/validation.ts` → `src/core/validation/validation.service.ts`
- `src/lib/schemas.ts` → `src/core/validation/schemas.ts`
- `src/lib/types.ts` → Split across domain type files
- `src/lib/d1-utils.ts` → `src/core/database/d1-client.ts`
- `src/lib/r2.ts`, `r2-utils.ts` → `src/core/storage/r2-client.ts`
- `src/lib/vectorize.ts` → `src/core/storage/vectorize-client.ts`

**Utility Files**:

- `src/lib/extractBenefits.ts` → `src/domains/companies/services/benefits-extraction.service.ts`
- `src/lib/scheduled.ts` → `src/domains/monitoring/services/scheduled.service.ts`
- `src/lib/routing.ts` → `src/shared/utils/routing.ts`
- `src/lib/content.ts` → `src/shared/utils/content.ts`
- `src/lib/hash.ts` → `src/shared/utils/hash.ts`
- `src/lib/normalize.ts` → `src/core/validation/normalize.ts`
- `src/lib/hono-validation.ts` → `src/core/validation/hono-validation.ts`
- `src/lib/env.ts` → `src/config/env/env.config.ts`

**Agent Files**:

- `src/lib/generic_agent.ts` → `src/domains/agents/generic-agent.ts`
- `src/lib/rag_agent.ts` → `src/domains/agents/rag-agent.ts`

**Test Files**:

- `src/lib/test-streaming.ts` → `src/test-support/streaming.ts`
- `src/lib/websocket-client.ts` → `src/integrations/websocket/websocket-client.ts`
- `src/lib/websocket-test-runner.ts` → `src/test-support/websocket-test-runner.ts`

#### **Priority 5: Remaining Route Files** (Days 4-5)

**Integration Routes**:

- `src/routes/browser-test-websocket.ts` → `src/integrations/browser/routes/browser-test-websocket.routes.ts`
- `src/routes/remote-scraper.ts` → `src/integrations/remote-scraper/routes/remote-scraper.routes.ts`
- `src/routes/embeddings.ts` → `src/integrations/ai/routes/embeddings.routes.ts`
- `src/routes/talent.ts` → `src/integrations/talent/routes/talent.routes.ts`

**Scraping Routes**:

- `src/routes/socket.ts` → `src/domains/scraping/routes/socket.routes.ts`
- `src/routes/scrape-fallback.ts` → `src/domains/scraping/routes/scrape-fallback.routes.ts`
- `src/routes/scrape-queue.ts` → `src/domains/scraping/routes/scrape-queue.routes.ts`
- `src/routes/crawl.ts` → `src/domains/scraping/routes/crawl.routes.ts`

**Monitoring Routes**:

- `src/routes/runs.ts` → `src/domains/monitoring/routes/runs.routes.ts`

**Workflow Routes**:

- `src/routes/workflows.ts` → `src/domains/workflows/routes/workflows.routes.ts`

**Duplicate Routes** (Remove after verification):

- `src/routes/agent.ts` → Remove (has equivalent in `domains/agents/routes/`)
- `src/routes/agents.ts` → Remove (has equivalent in `domains/agents/routes/`)
- `src/routes/company-benefits.ts` → Remove (has equivalent in `domains/companies/routes/`)
- `src/routes/documents.ts` → Remove (has equivalent in `domains/documents/routes/`)
- `src/routes/job-history.ts` → Remove (has equivalent in `domains/jobs/routes/`)
- `src/routes/job-processing.ts` → Remove (has equivalent in `domains/jobs/routes/`)
- `src/routes/jobs.ts` → Remove (has equivalent in `domains/jobs/routes/`)
- `src/routes/sites.ts` → Remove (has equivalent in `domains/sites/routes/`)

### **PHASE 12D: Import Cleanup & Testing** (Week 2-3)

#### **Priority 6: Import Updates** (Days 6-7)

1. **Search and Replace All Imports**:

   - Update all `../lib/` imports to use new domain paths
   - Update all `../routes/` imports to use new domain paths
   - Verify no broken imports remain

2. **Update Main Files**:

   - `src/index.ts` - Update all imports
   - `src/routes/legacy-api.routes.ts` - Update all imports
   - All domain index files - Update imports

3. **Type Imports**:
   - Update all type imports to use new domain type files
   - Ensure all types are properly exported from domain modules

#### **Priority 7: Testing & Validation** (Days 8-10)

1. **Build Verification**:

   - Run `pnpm run build` after each major migration
   - Fix any TypeScript compilation errors
   - Verify all imports are correct

2. **API Testing**:

   - Test all legacy endpoints to ensure they work
   - Verify backward compatibility
   - Test integration with existing clients

3. **Functionality Testing**:
   - Test all moved functionality
   - Verify no functionality is lost
   - Test error handling

### **PHASE 12E: Final Consolidation** (Week 3)

#### **Priority 8: Legacy File Consolidation** (Days 11-14)

1. **Create Final Route Files**:

   - Merge all legacy functions into final `{domain}.routes.ts` files
   - Remove placeholder responses
   - Implement full functionality in final routes

2. **Update Legacy Route Handlers**:

   - Update `legacy-*.routes.ts` to call final route functions instead of placeholders
   - Maintain backward compatibility
   - Keep deprecation warnings

3. **Remove Original Legacy Files**:

   - Delete `legacy-*-original.ts` files (if any exist)
   - Keep only `legacy-*.routes.ts` for compatibility
   - Clean up imports and dependencies

4. **Final Architecture**:
   - Achieve clean, final domain structure
   - Maintain legacy compatibility layer
   - Complete modularization with zero functionality loss

#### **Priority 9: Final Cleanup** (Days 15-17)

1. **Remove Empty Directories**:

   - Clean up any empty directories
   - Remove unused files

2. **Documentation Update**:

   - Update all documentation to reflect new structure
   - Create migration guide for future reference
   - Document any breaking changes

3. **Final Verification**:
   - Run full test suite
   - Test all API endpoints
   - Verify all Durable Objects work
   - Test all workflows and agents

## Implementation Strategy

### **Daily Workflow**

1. **Morning**: Select 2-3 files to migrate
2. **Migration Process**:
   - Move file to appropriate domain location
   - Split large files into focused modules
   - Update all imports in the moved file
   - Search and replace all references throughout codebase
   - Test build to ensure no errors
3. **Afternoon**: Test functionality and fix any issues
4. **Evening**: Commit changes and document progress

### **Risk Mitigation**

1. **Backup Strategy**: Create git branch before each major migration
2. **Rollback Plan**: Keep commented code until full verification
3. **Testing Strategy**: Run tests after each file removal
4. **Documentation**: Maintain detailed migration log
5. **Gradual Process**: Don't rush - verify each step thoroughly

### **Success Criteria**

#### **Phase 12B Completion**:

- ✅ All high-priority lib files migrated
- ✅ All high-priority route files migrated
- ✅ Build successful with no errors
- ✅ All imports updated

#### **Phase 12C Completion**:

- ✅ All remaining lib files migrated
- ✅ All remaining route files migrated
- ✅ No files in `src/lib/` or `src/routes/` (except legacy compatibility)
- ✅ All imports updated throughout codebase

#### **Phase 12D Completion**:

- ✅ All imports cleaned up
- ✅ All tests passing
- ✅ All functionality verified

#### **Phase 12E Completion**:

- ✅ Final consolidation complete
- ✅ Clean, modular architecture achieved
- ✅ Zero functionality loss
- ✅ Comprehensive testing completed

## Timeline Summary

- **Week 1**: Complete high-priority migrations (documents, storage, browser-rendering, openapi, api, webhooks, files)
- **Week 2**: Complete remaining migrations and import cleanup
- **Week 3**: Final consolidation and cleanup

## Expected Outcomes

1. **Clean Architecture**: All code organized by domain with clear boundaries
2. **Maintainability**: Smaller, focused files that are easy to understand and modify
3. **Scalability**: Easy to add new features within existing domains
4. **Testing**: Isolated services that are easier to test
5. **Reusability**: Services can be imported and reused across routes
6. **Onboarding**: New developers can understand the structure quickly

## Conclusion

This updated plan provides a clear, systematic approach to completing the modularization. The key is to prioritize the largest, most complex files first, then work through the remaining files systematically. With proper testing and verification at each step, this plan will achieve the intended clean architecture while maintaining zero functionality loss.
