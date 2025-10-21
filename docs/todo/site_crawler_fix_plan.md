# Site Crawler Migration Fix - Execution Plan

## 📋 Overview

**Objective:** Restore production-ready Site Crawler implementation by replacing outdated code with modern version from git history.

**Priority:** 🔴 CRITICAL - Blocks production deployment

**Estimated Time:** 2-3 hours

**Assigned To:** Gemini

---

## 🎯 Goals

1. ✅ Restore all 9 missing critical features
2. ✅ Fix security vulnerability (HTTP method validation)
3. ✅ Enable health monitoring via `last_activity` tracking
4. ✅ Maintain modularization improvements
5. ✅ Achieve 100% feature parity with modern version

---

## 📊 Current State Assessment

### **What Gemini Did Wrong:**

- ❌ Used code from deleted `original_project_DO_NOT_WORK_HERE/` directory
- ❌ Ignored modern implementation in `src/lib/durable-objects/site-crawler.ts`
- ❌ Lost 9 critical production features
- ❌ Introduced security vulnerability (no HTTP method validation)

### **Impact:**

- **Severity:** CRITICAL
- **Production Ready:** NO
- **Security Risk:** YES (GET can trigger POST actions)
- **Monitoring:** BROKEN (no health tracking)
- **Metrics:** INCOMPLETE (missing key data)

---

## 📁 Files Involved

### **Primary Files:**

1. **Target (To Fix):**

   - `src/domains/scraping/durable-objects/site-crawler.do.ts` (113 lines)
   - **Status:** Broken - missing 9 features

2. **Source (Modern Version):**

   - Git: `d732f36:src/lib/durable-objects/site-crawler.ts` (127 lines)
   - **Status:** Production-ready

3. **Reference Documentation:**
   - `docs/todo/site_crawler_migration_audit.md` (audit report)
   - `docs/todo/gemini_fix_site_crawler_prompt.md` (implementation guide)
   - `docs/todo/site_crawler_fix_plan.md` (this file)

### **Related Files:**

4. **Tracking:**

   - `docs/todo/great_migration_tracking.csv` (lines 31-34 need update)

5. **Dependencies:**
   - `src/domains/scraping/lib/crawl.ts` (crawl functions)
   - `src/domains/config/env/env.config.ts` (Env type)

---

## 🔧 Implementation Steps

### **Phase 1: Preparation** (15 minutes)

#### **Step 1.1: Review Documentation**

- [ ] Read `docs/todo/site_crawler_migration_audit.md`
- [ ] Review side-by-side code comparison
- [ ] Understand all 9 missing features
- [ ] Review modern version from git

**Command:**

```bash
git show d732f36:src/lib/durable-objects/site-crawler.ts
```

#### **Step 1.2: Backup Current Implementation**

- [ ] Create backup of current broken version
- [ ] Document current state for rollback if needed

**Command:**

```bash
cp src/domains/scraping/durable-objects/site-crawler.do.ts \
   src/domains/scraping/durable-objects/site-crawler.do.ts.backup
```

---

### **Phase 2: Code Restoration** (60 minutes)

#### **Step 2.1: Update File Header and Imports** (5 min)

- [ ] Update module documentation
- [ ] Import `Env` type from correct location
- [ ] Remove dependency injection imports (not needed in modern version)
- [ ] Keep interface definitions for type safety

**Before:**

```typescript
import { SiteStorageService } from "../../sites/services/site-storage.service";
import { ScrapeQueueService } from "../services/scrape-queue.service";
```

**After:**

```typescript
import type { Env } from "../../config/env/env.config";
// No service imports - use dynamic imports for crawl functions
```

---

#### **Step 2.2: Update Constructor** (5 min)

- [ ] Remove service dependency injection
- [ ] Simplify to only accept `state` and `env`
- [ ] Update interface for env bindings

**Before:**

```typescript
constructor(state: DurableObjectState, env: CrawlerEnv) {
  this.state = state;
  this.env = env;
  this.siteService = new SiteStorageService(env);
  this.scrapeQueue = new ScrapeQueueService(env);
}
```

**After:**

```typescript
constructor(state: DurableObjectState, env: CrawlerEnv) {
  this.state = state;
  this.env = env;
}
```

---

#### **Step 2.3: Restore `fetch()` Method** (10 min)

- [ ] Replace `switch` statement with `if` statements
- [ ] Add HTTP method validation (GET vs POST)
- [ ] Add Content-Type header to error responses
- [ ] Update error message casing

**Key Changes:**

1. ✅ Validate `req.method` for each endpoint
2. ✅ Use `if (path === '...' && req.method === '...')` pattern
3. ✅ Add `headers: { 'Content-Type': 'application/json' }` to errors

**Lines to replace:** 32-48

---

#### **Step 2.4: Restore `startDiscovery()` Method** (15 min)

- [ ] Accept `base_url` and `search_terms` parameters
- [ ] Remove database lookup (data passed in request)
- [ ] Store `current_site_id` in state
- [ ] Store `base_url` in state
- [ ] Store `last_activity` timestamp
- [ ] Use dynamic import for `discoverJobUrls`
- [ ] Add Content-Type header to response

**Key Changes:**

1. ✅ Request payload: `{ site_id, base_url, search_terms? }`
2. ✅ Store 4 state values (not just 3)
3. ✅ `await import('../lib/crawl')` for tree-shaking
4. ✅ Proper HTTP response with headers

**Lines to replace:** 51-69

---

#### **Step 2.5: Restore `crawlUrls()` Method** (15 min)

- [ ] Update `last_activity` on every operation
- [ ] Include `total_discovered` in response
- [ ] Add completion message when done
- [ ] Use dynamic import for `crawlJobs`
- [ ] Add Content-Type header to response
- [ ] Remove TypeScript generics on `storage.get()` calls

**Key Changes:**

1. ✅ `await this.state.storage.put('last_activity', new Date().toISOString())`
2. ✅ Response includes `total_discovered: urls.length`
3. ✅ `await import('../lib/crawl')` for `crawlJobs`
4. ✅ Proper TypeScript casting without generics

**Lines to replace:** 71-102

---

#### **Step 2.6: Restore `getStatus()` Method** (10 min)

- [ ] Include `site_id` in response
- [ ] Include `last_activity` in response
- [ ] Add Content-Type header
- [ ] Provide default values for all metrics

**Key Changes:**

1. ✅ Retrieve `lastActivity` and `siteId` from state
2. ✅ Response: `{ site_id, status, total_discovered, crawled_count, last_activity }`
3. ✅ Defaults: `|| 'idle'`, `|| 0`, etc.

**Lines to replace:** 104-111

---

### **Phase 3: Verification** (30 minutes)

#### **Step 3.1: TypeScript Validation** (5 min)

- [ ] Run `pnpm exec wrangler types`
- [ ] Fix any type errors
- [ ] Ensure no `any` types introduced

**Command:**

```bash
pnpm exec wrangler types
```

#### **Step 3.2: Code Quality Check** (10 min)

- [ ] Run linter
- [ ] Run prettier
- [ ] Check for console.log statements
- [ ] Verify all imports resolve

**Commands:**

```bash
pnpm run lint
pnpm run format
```

#### **Step 3.3: Feature Verification** (15 min)

- [ ] **State Management:** All 4 state values stored in `startDiscovery`
- [ ] **Activity Tracking:** `last_activity` updated in both methods
- [ ] **HTTP Methods:** GET/POST validation on all endpoints
- [ ] **Headers:** Content-Type on all responses
- [ ] **Metrics:** Complete data in all responses
- [ ] **Search Terms:** Optional parameter accepted
- [ ] **Dynamic Imports:** Used for crawl functions
- [ ] **Error Handling:** Proper status codes and messages

**Verification Checklist:**

```typescript
// ✅ State Management
await this.state.storage.put('current_site_id', site_id);
await this.state.storage.put('base_url', base_url);
await this.state.storage.put('last_activity', new Date().toISOString());
await this.state.storage.put('status', 'discovering');

// ✅ HTTP Method Validation
if (path === '/start-discovery' && req.method === 'POST') { ... }
if (path === '/status' && req.method === 'GET') { ... }
if (path === '/crawl-urls' && req.method === 'POST') { ... }

// ✅ Content-Type Headers
return new Response(JSON.stringify({...}), {
  headers: { 'Content-Type': 'application/json' },
});

// ✅ Dynamic Imports
const { discoverJobUrls } = await import('../lib/crawl');
const { crawlJobs } = await import('../lib/crawl');

// ✅ Complete Metrics
return new Response(JSON.stringify({
  site_id: siteId,
  status,
  total_discovered: totalDiscovered,
  crawled_count: crawledCount,
  last_activity: lastActivity,
}), { headers: { 'Content-Type': 'application/json' } });
```

---

### **Phase 4: Documentation Update** (15 minutes)

#### **Step 4.1: Update Migration Tracking CSV**

- [ ] Update lines 31-34 in `great_migration_tracking.csv`
- [ ] Reference correct source (git:d732f36)
- [ ] Update line numbers to reflect actual implementation

**From:**

```csv
"Phase 5: Core Logic & Final Cleanup",original_project_DO_NOT_WORK_HERE/src/lib/durable-objects/site-crawler.ts,17,43,"fetch",src/domains/scraping/durable-objects/site-crawler.do.ts,32,48
```

**To:**

```csv
"Phase 5: Core Logic & Final Cleanup",src/lib/durable-objects/site-crawler.ts (git:d732f36),15,38,"fetch",src/domains/scraping/durable-objects/site-crawler.do.ts,32,48
"Phase 5: Core Logic & Final Cleanup",src/lib/durable-objects/site-crawler.ts (git:d732f36),40,70,"startDiscovery",src/domains/scraping/durable-objects/site-crawler.do.ts,51,69
"Phase 5: Core Logic & Final Cleanup",src/lib/durable-objects/site-crawler.ts (git:d732f36),72,111,"crawlUrls",src/domains/scraping/durable-objects/site-crawler.do.ts,71,102
"Phase 5: Core Logic & Final Cleanup",src/lib/durable-objects/site-crawler.ts (git:d732f36),113,127,"getStatus",src/domains/scraping/durable-objects/site-crawler.do.ts,104,111
```

#### **Step 4.2: Create Completion Summary**

- [ ] Document all restored features
- [ ] List verification results
- [ ] Note any deviations from plan
- [ ] Update audit status to RESOLVED

---

### **Phase 5: Testing** (30 minutes)

#### **Step 5.1: Unit Testing** (15 min)

- [ ] Test `startDiscovery` with various payloads
- [ ] Test `crawlUrls` with different batch sizes
- [ ] Test `getStatus` returns complete data
- [ ] Test HTTP method validation (reject GET on POST endpoints)

**Test Cases:**

```bash
# Test startDiscovery (should accept POST, reject GET)
curl -X POST http://localhost:8787/durable-object/site-crawler/test-id/start-discovery \
  -H "Content-Type: application/json" \
  -d '{"site_id":"123","base_url":"https://example.com","search_terms":["developer"]}'

curl -X GET http://localhost:8787/durable-object/site-crawler/test-id/start-discovery
# Should return 404

# Test status (should accept GET, reject POST)
curl -X GET http://localhost:8787/durable-object/site-crawler/test-id/status

# Test crawlUrls (should accept POST, reject GET)
curl -X POST http://localhost:8787/durable-object/site-crawler/test-id/crawl-urls \
  -H "Content-Type: application/json" \
  -d '{"batch_size":5}'
```

#### **Step 5.2: Integration Testing** (15 min)

- [ ] Test full discovery workflow
- [ ] Verify state persistence across requests
- [ ] Check `last_activity` updates correctly
- [ ] Validate all metrics are tracked

---

## 📊 Success Criteria

### **Code Quality:**

- [ ] ✅ Zero TypeScript errors
- [ ] ✅ Zero linter warnings
- [ ] ✅ Code properly formatted
- [ ] ✅ All imports resolve

### **Feature Completeness:**

- [ ] ✅ All 9 missing features restored
- [ ] ✅ HTTP method validation working
- [ ] ✅ Health monitoring functional
- [ ] ✅ Complete metrics in responses
- [ ] ✅ Search term customization supported

### **Production Readiness:**

- [ ] ✅ Security vulnerability fixed
- [ ] ✅ Monitoring enabled
- [ ] ✅ Proper HTTP compliance
- [ ] ✅ Error handling comprehensive

### **Documentation:**

- [ ] ✅ Migration tracking CSV updated
- [ ] ✅ Completion summary created
- [ ] ✅ Audit status marked RESOLVED

---

## 🚨 Risk Management

### **Potential Risks:**

1. **Risk:** Breaking changes in crawl function signatures

   - **Mitigation:** Verify imports match expected interface
   - **Fallback:** Check crawl.ts implementation

2. **Risk:** Missing environment bindings

   - **Mitigation:** Verify `CrawlerEnv` interface matches actual bindings
   - **Fallback:** Update wrangler.toml if needed

3. **Risk:** TypeScript errors from dynamic imports
   - **Mitigation:** Ensure crawl functions are properly exported
   - **Fallback:** Add explicit type annotations

### **Rollback Plan:**

If implementation fails:

1. Restore from backup: `site-crawler.do.ts.backup`
2. Document issues encountered
3. Request additional guidance
4. Create new issue in tracking system

---

## 📝 Completion Checklist

### **Implementation:**

- [ ] Phase 1: Preparation completed
- [ ] Phase 2: Code restoration completed
- [ ] Phase 3: Verification passed
- [ ] Phase 4: Documentation updated
- [ ] Phase 5: Testing passed

### **Quality Gates:**

- [ ] All 9 features restored
- [ ] TypeScript errors: 0
- [ ] Linter warnings: 0
- [ ] Security vulnerabilities: 0
- [ ] Test coverage: >80%

### **Sign-off:**

- [ ] Code review passed
- [ ] Documentation reviewed
- [ ] Ready for deployment
- [ ] Stakeholders notified

---

## 📚 Reference Materials

### **Primary Documents:**

1. `docs/todo/site_crawler_migration_audit.md` - Detailed analysis
2. `docs/todo/gemini_fix_site_crawler_prompt.md` - Implementation guide
3. `docs/todo/site_crawler_fix_plan.md` - This execution plan

### **Code References:**

1. Modern version: `git show d732f36:src/lib/durable-objects/site-crawler.ts`
2. Current broken: `src/domains/scraping/durable-objects/site-crawler.do.ts`
3. Crawl functions: `src/domains/scraping/lib/crawl.ts`

### **Related Documentation:**

1. Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
2. WebSocket Hibernation API: https://developers.cloudflare.com/durable-objects/api/websockets/
3. Project Architecture: `AGENTS.md`

---

## 🎯 Next Actions

### **Immediate (Today):**

1. Review this plan with Gemini
2. Execute Phase 1 (Preparation)
3. Begin Phase 2 (Code Restoration)

### **Short-term (This Week):**

1. Complete all 5 phases
2. Pass all verification checks
3. Update documentation
4. Deploy to staging

### **Long-term (This Sprint):**

1. Monitor production performance
2. Collect metrics on health monitoring
3. Validate search term feature usage
4. Plan additional Durable Object improvements

---

## 📞 Support Contacts

**Questions or Issues?**

- Review audit: `docs/todo/site_crawler_migration_audit.md`
- Check implementation guide: `docs/todo/gemini_fix_site_crawler_prompt.md`
- Reference modern code: `git show d732f36:src/lib/durable-objects/site-crawler.ts`

**Escalation:**

- Create issue in tracking system
- Document blocker in plan
- Request additional guidance

---

**Plan Created:** 2025-01-21  
**Last Updated:** 2025-01-21  
**Status:** READY FOR EXECUTION  
**Priority:** 🔴 CRITICAL
