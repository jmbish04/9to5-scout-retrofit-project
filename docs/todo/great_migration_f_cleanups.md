# Great Migration Phase 5: Final Cleanup Checklist

## **Context:**

The Great Migration is 80% complete with 60+ functions successfully migrated across Phases 1-4. Phase 5 (Core Logic & Final Cleanup) is in progress, with working implementations built in `src/new/` that need to replace placeholder functions in the main `src/` directory.

**CRITICAL:** Use the current `src/lib/` and `src/routes/` files as source, NOT the old `@original_project_DO_NOT_WORK_HERE/` directory which contains outdated code.

---

## **🔴 Critical Placeholder Replacements (High Priority)**

### **1. Site Storage Service - Complete Replacement**

- [ ] **Source:** `src/new/domains/sites/site-storage.service.ts` (COMPLETE IMPLEMENTATION)
- [ ] **Target:** `src/domains/sites/services/site-storage.service.ts` (HAS 5 PLACEHOLDERS)

**Specific Replacements Needed:**

- [ ] **Lines 138-144:** Replace `getSiteStatistics()` placeholder with working implementation (lines 204-216 in source)
- [ ] **Lines 156-162:** Replace `searchSites()` placeholder with working implementation (lines 176-184 in source)
- [ ] **Lines 174-177:** Replace `getSitesForDiscovery()` placeholder with working implementation (lines 189-199 in source)
- [ ] **Lines 179-186:** Replace `performSiteHealthCheck()` placeholder with working implementation (lines 221-237 in source)
- [ ] **Lines 194-196:** Replace `updateSiteLastDiscovered()` empty function with working implementation

**Additional Fixes:**

- [ ] **Lines 19-28:** Add missing `SiteSchema` Zod validation (lines 19-28 in source)
- [ ] **Lines 75-119:** Replace broken `createSite()` with working version that includes duplicate prevention
- [ ] **Lines 124-158:** Replace broken `updateSite()` with working version that fixes undefined `fields` variable

---

### **2. OpenAPI Generator - Tag Mapping Refactor**

- [ ] **Source:** `src/new/api/openapi-generator.ts` (REFACTORED IMPLEMENTATION)
- [ ] **Target:** `src/api/openapi-generator.ts` (HAS LONG IF-CHAIN)

**Specific Replacement:**

- [ ] **Lines 122-136:** Replace long if-chain in `getDefaultTags()` with scalable Map-based approach (lines 57-64 in source)
- [ ] **Lines 18-34:** Add `TAG_MAPPING` Map constant (lines 19-34 in source)

---

### **3. Shared Constants - File Type Extraction**

- [ ] **Source:** `src/new/shared/constants.ts` (NEW FILE)
- [ ] **Target:** `src/api/openapi-routes.ts` (HAS DUPLICATED ENUMS)

**Specific Replacement:**

- [ ] **Lines 69-79:** Replace duplicated file type enum with import from `src/shared/constants.ts`
- [ ] **Create:** `src/shared/constants.ts` with `ALLOWED_FILE_TYPES` constant

---

## **🟡 Incomplete Implementation Fixes (Medium Priority)**

### **4. Document Processing - Reindexing Logic**

- [ ] **Source:** `src/lib/documents.ts` (CURRENT IMPLEMENTATION)
- [ ] **Target:** `src/domains/documents/services/document-processing.service.ts` (HAS PLACEHOLDER COMMENT)

**Specific Fix:**

- [ ] **Line 117:** Replace comment "Replace the placeholder with actual reindexing logic" with working `reindexDocument()` implementation from `src/lib/documents.ts`

---

### **5. Job Processing - Monitoring Logic**

- [ ] **Source:** `src/lib/job-processing.ts` (CURRENT IMPLEMENTATION)
- [ ] **Target:** `src/domains/jobs/services/job-processing.service.ts` (HAS PLACEHOLDER COMMENT)

**Specific Fix:**

- [ ] **Line 32:** Replace comment "For now, we'll return a placeholder result" with actual monitoring logic from `src/lib/job-processing.ts`

---

### **6. Monitoring Service - Scheduler Logic**

- [ ] **Source:** `src/lib/monitoring.ts` (CURRENT IMPLEMENTATION)
- [ ] **Target:** `src/domains/monitoring/services/monitoring.service.ts` (HAS PLACEHOLDER)

**Specific Fix:**

- [ ] **Lines 416-418:** Replace hardcoded tomorrow date with actual scheduler logic from `src/lib/monitoring.ts`

---

## **🟢 Minor Cleanup Tasks (Low Priority)**

### **7. Email Reporting Service - Complete Implementation**

- [ ] **Source:** `src/routes/email.ts` (CURRENT IMPLEMENTATION)
- [ ] **Target:** `src/domains/email/services/email-reporting.service.ts` (COMPLETE PLACEHOLDER)

**Specific Fix:**

- [ ] **Lines 1-3:** Replace placeholder comment with actual email reporting functions from `src/routes/email.ts`

---

### **8. Interview Services - TODO Cleanup**

- [ ] **Source:** `src/lib/interview.ts` (CURRENT IMPLEMENTATION)
- [ ] **Target:** `src/domains/interview/services/interview.service.ts` (HAS TODO COMMENTS)

**Specific Fix:**

- [ ] Replace TODO comments with working implementations from `src/lib/interview.ts`

---

## **📋 Migration Instructions:**

1. **Start with Critical Placeholders** (Site Storage, OpenAPI, Constants)
2. **Use current `src/lib/` and `src/routes/` as source** - NOT `@original_project_DO_NOT_WORK_HERE/`
3. **Copy working implementations** from `src/new/` to replace placeholders in `src/`
4. **Update imports** throughout the codebase to reference correct files
5. **Test each replacement** before moving to the next
6. **Delete `src/new/` directory** once all replacements are complete

---

## **🎯 Success Criteria:**

- [ ] All placeholder functions replaced with working implementations
- [ ] No references to `@original_project_DO_NOT_WORK_HERE/` directory
- [ ] All imports updated to point to correct files
- [ ] `src/new/` directory removed
- [ ] All tests passing
- [ ] Legacy `src/lib/` and `src/routes/` directories can be safely deleted

---

## **📊 Progress Tracking:**

### **Completed:**

- Phase 1: Jobs & Tracking (34 functions migrated)
- Phase 2: AI & Document Generation (8 functions migrated)
- Phase 3: Email Processing (6 functions migrated)
- Phase 4: Scraping & Company Intelligence (8 functions migrated)

### **In Progress:**

- Phase 5: Core Logic & Final Cleanup (4 functions migrated, 8+ remaining)

### **Total Progress:**

- **Functions Migrated:** 60+
- **Completion:** ~80%
- **Remaining:** Phase 5 cleanup tasks above

---

**This completes Phase 5 of the Great Migration and eliminates all placeholder functionality.**

**Last Updated:** October 21, 2025
