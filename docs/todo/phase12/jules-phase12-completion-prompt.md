# Jules Phase 12 Modularization Completion Prompt

## 🎯 **MISSION: Complete Phase 12 Modularization Retrofit**

**Jules, you need to complete the Phase 12 modularization that was reported as "complete" but is actually only ~60-70% done. This is a critical cleanup task that will achieve the intended clean architecture.**

---

## 📋 **CONTEXT & CURRENT STATUS**

### **What's Been Done**

- ✅ Domain structure created (all major domains exist)
- ✅ Core infrastructure (`src/core/`, `src/shared/`, `src/integrations/`)
- ✅ Legacy compatibility layer working
- ✅ Build successful (no broken imports)

### **What's NOT Done (Critical)**

- ❌ **30+ files still in `src/lib/`** need migration to appropriate domains
- ❌ **20+ files still in `src/routes/`** need migration to appropriate domains
- ❌ **Missing consolidation phase** (legacy-original file merging)
- ❌ **Import cleanup** throughout codebase

### **Build Status**

- ✅ **Currently building successfully** (but with technical debt)
- ⚠️ **Technical debt**: Mix of old and new patterns creates maintenance burden

---

## 📚 **REFERENCE DOCUMENTS**

**Read these documents first to understand the full scope:**

1. **`docs/todo/phase12/phase12-completion-plan-updated.md`** - Main 3-week plan
2. **`docs/todo/phase12/phase12-implementation-checklist.md`** - Detailed checklist
3. **`docs/todo/phase12/phase12-quick-start-guide.md`** - Immediate action steps
4. **`docs/todo/updated-modularization-plan.md`** - Original comprehensive plan
5. **`docs/todo/phase12/phase12-comprehensive-route-modularization-plan.md`** - Route-specific plan

---

## 🚀 **IMMEDIATE ACTION PLAN**

### **Phase 12B: High-Priority Migrations (Week 1)**

#### **Priority 1: Critical Lib Files (Start Here)**

**Target the largest, most complex files first for maximum impact:**

1. **`src/lib/documents.ts` (922 lines)**

   - **Move to**: `src/domains/documents/services/`
   - **Split into**:
     - `document-storage.service.ts`
     - `document-generation.service.ts`
     - `document-processing.service.ts`
     - `document-search.service.ts`
   - **Update imports**: Search and replace all references throughout codebase

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

#### **Priority 2: Critical Route Files**

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

---

## 🔧 **MIGRATION PROCESS (Follow for Each File)**

### **Step-by-Step Process:**

1. **Create Target Directory**

   ```bash
   mkdir -p src/domains/{domain}/services
   # or
   mkdir -p src/integrations/{service}/
   ```

2. **Move and Split File**

   ```bash
   # Move the file
   mv src/lib/filename.ts src/domains/domain/services/filename.service.ts

   # Split large files into focused modules
   # Each service should have a single responsibility
   ```

3. **Update Imports in Moved File**

   ```bash
   # Update relative imports in the moved file
   # Change ../lib/ imports to ../../lib/ or appropriate paths
   ```

4. **Search and Replace All References**

   ```bash
   # Find all files that import the moved file
   grep -r "from.*lib/filename" src/

   # Update each reference to use the new path
   # Use your IDE's find/replace functionality
   ```

5. **Test Build**

   ```bash
   pnpm run build
   # Fix any TypeScript errors
   ```

6. **Test Functionality**
   ```bash
   # Test the specific functionality that was moved
   # Ensure no behavior changes
   ```

---

## ✅ **VERIFICATION CHECKLIST (After Each Migration)**

- [ ] File moved to correct domain location
- [ ] File split into focused modules (if large)
- [ ] All imports in moved file updated
- [ ] All references throughout codebase updated
- [ ] Build successful (`pnpm run build`)
- [ ] No TypeScript errors
- [ ] Functionality tested and working
- [ ] Legacy compatibility maintained

---

## 📊 **COMPLETE FILE INVENTORY**

### **Files Still in `src/lib/` (Need Migration)**

**High Priority (Large, Complex):**

- `src/lib/documents.ts` (922 lines) → `domains/documents/services/`
- `src/lib/storage.ts` (811 lines) → Split across domain services
- `src/lib/steel.ts` (1009 lines) → `domains/scraping/services/` (deferred per plan)
- `src/lib/browser-rendering.ts` (688 lines) → `integrations/browser/`
- `src/lib/openapi.ts` (701 lines) → `api/`

**Medium Priority:**

- `src/lib/ai.ts` → `integrations/ai/ai.service.ts`
- `src/lib/agents.ts` → `domains/agents/services/agent-manager.service.ts`
- `src/lib/monitoring.ts` → `domains/monitoring/services/monitoring.service.ts`
- `src/lib/embeddings.ts` → `integrations/ai/embeddings.service.ts`
- `src/lib/talent.ts` → `integrations/talent/talent.service.ts`
- `src/lib/crawl.ts` → `domains/scraping/services/crawl.service.ts`
- `src/lib/job-processing.ts` → `domains/jobs/services/job-processing.service.ts`

**Low Priority (Utilities):**

- `src/lib/auth.ts` → `core/auth/middleware.ts`
- `src/lib/validation.ts` → `core/validation/validation.service.ts`
- `src/lib/schemas.ts` → `core/validation/schemas.ts`
- `src/lib/types.ts` → Split across domain type files
- `src/lib/d1-utils.ts` → `core/database/d1-client.ts`
- `src/lib/r2.ts`, `r2-utils.ts` → `core/storage/r2-client.ts`
- `src/lib/vectorize.ts` → `core/storage/vectorize-client.ts`
- `src/lib/extractBenefits.ts` → `domains/companies/services/benefits-extraction.service.ts`
- `src/lib/scheduled.ts` → `domains/monitoring/services/scheduled.service.ts`
- `src/lib/routing.ts` → `shared/utils/routing.ts`
- `src/lib/content.ts` → `shared/utils/content.ts`
- `src/lib/hash.ts` → `shared/utils/hash.ts`
- `src/lib/normalize.ts` → `core/validation/normalize.ts`
- `src/lib/hono-validation.ts` → `core/validation/hono-validation.ts`
- `src/lib/env.ts` → `config/env/env.config.ts`
- `src/lib/generic_agent.ts` → `domains/agents/generic-agent.ts`
- `src/lib/rag_agent.ts` → `domains/agents/rag-agent.ts`
- `src/lib/test-streaming.ts` → `test-support/streaming.ts`
- `src/lib/websocket-client.ts` → `integrations/websocket/websocket-client.ts`
- `src/lib/websocket-test-runner.ts` → `test-support/websocket-test-runner.ts`

### **Files Still in `src/routes/` (Need Migration)**

**High Priority:**

- `src/routes/api.ts` (694 lines) → `api/router.ts`
- `src/routes/webhooks.ts` → `api/routes/webhooks.routes.ts`
- `src/routes/files.ts` → `domains/ui/routes/files.routes.ts`

**Medium Priority:**

- `src/routes/browser-test-websocket.ts` → `integrations/browser/routes/`
- `src/routes/remote-scraper.ts` → `integrations/remote-scraper/routes/`
- `src/routes/embeddings.ts` → `integrations/ai/routes/`
- `src/routes/talent.ts` → `integrations/talent/routes/`
- `src/routes/socket.ts` → `domains/scraping/routes/`
- `src/routes/scrape-fallback.ts` → `domains/scraping/routes/`
- `src/routes/scrape-queue.ts` → `domains/scraping/routes/`
- `src/routes/crawl.ts` → `domains/scraping/routes/`
- `src/routes/runs.ts` → `domains/monitoring/routes/`
- `src/routes/workflows.ts` → `domains/workflows/routes/`

**Low Priority (Duplicates - Remove after verification):**

- `src/routes/agent.ts` → Remove (has equivalent in `domains/agents/routes/`)
- `src/routes/agents.ts` → Remove (has equivalent in `domains/agents/routes/`)
- `src/routes/company-benefits.ts` → Remove (has equivalent in `domains/companies/routes/`)
- `src/routes/documents.ts` → Remove (has equivalent in `domains/documents/routes/`)
- `src/routes/job-history.ts` → Remove (has equivalent in `domains/jobs/routes/`)
- `src/routes/job-processing.ts` → Remove (has equivalent in `domains/jobs/routes/`)
- `src/routes/jobs.ts` → Remove (has equivalent in `domains/jobs/routes/`)
- `src/routes/sites.ts` → Remove (has equivalent in `domains/sites/routes/`)

---

## 🎯 **SUCCESS CRITERIA**

### **Phase 12B Completion (Week 1)**

- [ ] All high-priority lib files migrated (4 files)
- [ ] All high-priority route files migrated (3 files)
- [ ] Build successful with no errors
- [ ] All imports updated

### **Phase 12C Completion (Week 2)**

- [ ] All remaining lib files migrated (15+ files)
- [ ] All remaining route files migrated (15+ files)
- [ ] No files in `src/lib/` or `src/routes/` (except legacy compatibility)
- [ ] All imports updated throughout codebase

### **Phase 12E Completion (Week 3)**

- [ ] Final consolidation complete
- [ ] Clean, modular architecture achieved
- [ ] Zero functionality loss
- [ ] Comprehensive testing completed

---

## ⚠️ **CRITICAL REQUIREMENTS**

### **Must Do:**

1. **Test after each migration** - Don't break the build
2. **Update all imports** - Search and replace throughout codebase
3. **Maintain legacy compatibility** - Don't break existing integrations
4. **Split large files** - Create focused, maintainable modules
5. **Follow domain boundaries** - Put code in the right domain

### **Must Not Do:**

1. **Don't skip testing** - Each migration must be verified
2. **Don't leave broken imports** - Fix all references
3. **Don't break functionality** - Maintain all existing behavior
4. **Don't rush** - Quality over speed

---

## 🚨 **COMMON ISSUES & SOLUTIONS**

### **Issue: Import Path Errors**

```bash
# Problem: Cannot find module '../lib/filename'
# Solution: Update import path to new location
# Old: import { something } from '../lib/filename'
# New: import { something } from '../domains/domain/services/filename.service'
```

### **Issue: TypeScript Compilation Errors**

```bash
# Problem: Type errors after moving files
# Solution: Update type imports and exports
# Ensure all types are properly exported from domain modules
```

### **Issue: Circular Dependencies**

```bash
# Problem: Circular import dependencies
# Solution: Restructure imports or extract shared code
# Move common types to shared/types/
```

### **Issue: Legacy Compatibility Broken**

```bash
# Problem: Legacy routes not working
# Solution: Update legacy route handlers to use new services
# Ensure backward compatibility is maintained
```

---

## 📅 **RECOMMENDED TIMELINE**

### **Week 1: High-Priority Migrations**

- **Days 1-2**: Critical lib files (documents, storage, browser-rendering, openapi)
- **Days 3-4**: Critical route files (api, webhooks, files)
- **Days 5-7**: Medium-priority lib files (ai, agents, monitoring, etc.)

### **Week 2: Complete Remaining Migrations**

- **Days 1-3**: Remaining lib files (15+ files)
- **Days 4-5**: Remaining route files (15+ files)

### **Week 3: Cleanup & Consolidation**

- **Days 1-7**: Import cleanup, legacy consolidation, final testing

---

## 🎯 **GETTING STARTED**

### **Immediate First Steps (Next 30 minutes):**

1. **Read the reference documents** to understand the full scope
2. **Start with `src/lib/documents.ts`** (largest impact file)
3. **Create target directory**: `mkdir -p src/domains/documents/services`
4. **Begin migration process** following the step-by-step guide
5. **Test build** after each change

### **Daily Workflow:**

1. **Morning**: Select 2-3 files to migrate
2. **Migration Process**: Move, split, update imports, test
3. **Afternoon**: Test functionality and fix issues
4. **Evening**: Commit changes and document progress

---

## 📞 **SUPPORT & RESOURCES**

- **Reference Documents**: All plan documents are in `docs/todo/phase12/`
- **Build Command**: `pnpm run build`
- **Test Command**: `pnpm test`
- **Current Status**: ~60-70% complete, 30+ files remaining

---

## 🎯 **FINAL GOAL**

**Achieve a clean, modular architecture with:**

- All code organized by domain with clear boundaries
- Smaller, focused files that are easy to understand and modify
- Easy to add new features within existing domains
- Isolated services that are easier to test
- Services that can be imported and reused across routes
- New developers can understand the structure quickly

**Remember**: The modularization is NOT complete despite previous reports. This is critical work that will eliminate technical debt and achieve the intended clean architecture.

**Start now with `src/lib/documents.ts` - the largest impact file.**
