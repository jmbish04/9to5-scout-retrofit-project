# 🔴 URGENT: Fix Site Crawler Migration - Used Wrong Source Code

## **Problem Statement**

You migrated the `SiteCrawler` Durable Object from an **outdated, deleted source** (`original_project_DO_NOT_WORK_HERE/`) instead of the modern, production-ready implementation that existed in `src/lib/durable-objects/site-crawler.ts`.

**Result:** Critical features are missing from `src/domains/scraping/durable-objects/site-crawler.do.ts`.

See **detailed audit**: `docs/todo/site_crawler_migration_audit.md`

---

## **Task: Restore Missing Features from Modern Source**

You must **replace** the current incomplete implementation with the full-featured version, while **maintaining** the modularization improvements (injected services, domain separation).

---

## **🎯 Required Implementation**

### **Source Code to Use:**

Use the **modern version** from git commit `d732f36`:

```bash
git show d732f36:src/lib/durable-objects/site-crawler.ts
```

**Do NOT use** any code from `original_project_DO_NOT_WORK_HERE/` (it's deleted and was outdated).

---

## **📋 Critical Features to Restore**

### **Feature 1: Complete State Management in `startDiscovery`**

**Current (BROKEN):**
```typescript
private async startDiscovery(req: Request): Promise<Response> {
  const { site_id } = (await req.json()) as { site_id: string };
  const site = await this.siteService.getSiteById(site_id);
  if (!site) {
    return new Response(JSON.stringify({ error: 'Site not found' }), { status: 404 });
  }

  await this.state.storage.put('status', 'discovering');
  const urls = await discoverJobUrls(site.base_url, []); 

  await this.state.storage.put('discovered_urls', urls);
  await this.state.storage.put('total_discovered', urls.length);
  await this.state.storage.put('crawled_count', 0);
  await this.state.storage.put('status', 'discovery_complete');

  return new Response(JSON.stringify({ site_id, discovered_count: urls.length, status: 'discovery_complete' }));
}
```

**Required (FIX):**
```typescript
private async startDiscovery(req: Request): Promise<Response> {
  const { site_id, base_url, search_terms } = await req.json() as {
    site_id: string;
    base_url: string;
    search_terms?: string[];
  };

  // CRITICAL: Store ALL essential state
  await this.state.storage.put('current_site_id', site_id);
  await this.state.storage.put('base_url', base_url);
  await this.state.storage.put('last_activity', new Date().toISOString());
  await this.state.storage.put('status', 'discovering');

  // Use dynamic import for tree-shaking optimization
  const { discoverJobUrls } = await import('../lib/crawl');
  const urls = await discoverJobUrls(base_url, search_terms || []);

  await this.state.storage.put('discovered_urls', urls);
  await this.state.storage.put('total_discovered', urls.length);
  await this.state.storage.put('crawled_count', 0);

  // CRITICAL: Proper HTTP response with Content-Type header
  return new Response(JSON.stringify({
    site_id,
    discovered_count: urls.length,
    status: 'discovery_complete',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**Changes Required:**
1. ✅ Accept `base_url` parameter (don't fetch from DB - it's passed in)
2. ✅ Accept `search_terms` parameter for customizable discovery
3. ✅ Store `current_site_id` in state
4. ✅ Store `base_url` in state
5. ✅ Store `last_activity` timestamp
6. ✅ Add Content-Type header to response
7. ✅ Use dynamic import for crawl functions

---

### **Feature 2: Activity Tracking in `crawlUrls`**

**Current (BROKEN):**
```typescript
private async crawlUrls(req: Request): Promise<Response> {
  const { batch_size = 5 } = (await req.json()) as { batch_size?: number };
  const urls = await this.state.storage.get<string[]>('discovered_urls') || [];
  const crawledCount = await this.state.storage.get<number>('crawled_count') || 0;
  const siteId = await this.state.storage.get<string>('current_site_id');

  if (!siteId) {
    return new Response(JSON.stringify({ error: 'Site ID not configured in crawler' }), { status: 500 });
  }

  if (crawledCount >= urls.length) {
    await this.state.storage.put('status', 'completed');
    return new Response(JSON.stringify({ status: 'completed' }));
  }

  const batchUrls = urls.slice(crawledCount, crawledCount + batch_size);
  
  const jobs = await crawlJobs(this.env, batchUrls, siteId); 
  
  const newCrawledCount = crawledCount + batchUrls.length;
  await this.state.storage.put('crawled_count', newCrawledCount);
  
  const isComplete = newCrawledCount >= urls.length;
  await this.state.storage.put('status', isComplete ? 'completed' : 'crawling');

  return new Response(JSON.stringify({
    crawled_in_batch: jobs.length,
    total_crawled: newCrawledCount,
    status: isComplete ? 'completed' : 'crawling',
  }));
}
```

**Required (FIX):**
```typescript
private async crawlUrls(req: Request): Promise<Response> {
  const { batch_size = 5 } = await req.json() as { batch_size?: number };

  const urls = await this.state.storage.get('discovered_urls') as string[] || [];
  const crawledCount = await this.state.storage.get('crawled_count') as number || 0;
  const siteId = await this.state.storage.get('current_site_id') as string;

  if (crawledCount >= urls.length) {
    await this.state.storage.put('status', 'completed');
    return new Response(JSON.stringify({ 
      status: 'completed', 
      message: 'All URLs crawled' 
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const batchUrls = urls.slice(crawledCount, crawledCount + batch_size);

  // Use dynamic import
  const { crawlJobs } = await import('../lib/crawl');
  const jobs = await crawlJobs(this.env, batchUrls, siteId);

  const newCrawledCount = crawledCount + batchUrls.length;
  await this.state.storage.put('crawled_count', newCrawledCount);
  
  // CRITICAL: Track activity for health monitoring
  await this.state.storage.put('last_activity', new Date().toISOString());

  const isComplete = newCrawledCount >= urls.length;
  if (isComplete) {
    await this.state.storage.put('status', 'completed');
  }

  // CRITICAL: Include total_discovered for progress tracking
  return new Response(JSON.stringify({
    crawled_in_batch: jobs.length,
    total_crawled: newCrawledCount,
    total_discovered: urls.length,
    status: isComplete ? 'completed' : 'crawling',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**Changes Required:**
1. ✅ Store `last_activity` on every crawl operation
2. ✅ Include `total_discovered` in response
3. ✅ Add completion message when done
4. ✅ Add Content-Type header
5. ✅ Use dynamic import for crawl functions
6. ✅ Use proper TypeScript casting (no generics on storage.get)

---

### **Feature 3: Complete Status Response**

**Current (BROKEN):**
```typescript
private async getStatus(): Promise<Response> {
  const [status, total_discovered, crawled_count] = await Promise.all([
    this.state.storage.get('status'),
    this.state.storage.get('total_discovered'),
    this.state.storage.get('crawled_count'),
  ]);
  return new Response(JSON.stringify({ 
    status: status || 'idle', 
    total_discovered, 
    crawled_count 
  }));
}
```

**Required (FIX):**
```typescript
private async getStatus(): Promise<Response> {
  const status = await this.state.storage.get('status') || 'idle';
  const totalDiscovered = await this.state.storage.get('total_discovered') || 0;
  const crawledCount = await this.state.storage.get('crawled_count') || 0;
  const lastActivity = await this.state.storage.get('last_activity');
  const siteId = await this.state.storage.get('current_site_id');

  return new Response(JSON.stringify({
    site_id: siteId,
    status,
    total_discovered: totalDiscovered,
    crawled_count: crawledCount,
    last_activity: lastActivity,
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
```

**Changes Required:**
1. ✅ Include `site_id` to identify which site this crawler is tracking
2. ✅ Include `last_activity` for health monitoring
3. ✅ Add Content-Type header
4. ✅ Provide default values for all metrics (0 for numbers, null for optional)

---

### **Feature 4: HTTP Method Validation in `fetch`**

**Current (BROKEN):**
```typescript
async fetch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  try {
    switch (url.pathname) {
      case '/start-discovery':
        return await this.startDiscovery(req);
      case '/crawl-urls':
        return await this.crawlUrls(req);
      case '/status':
        return await this.getStatus();
      default:
        return new Response('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('SiteCrawler DO Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
  }
}
```

**Required (FIX):**
```typescript
async fetch(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const path = url.pathname;

  try {
    if (path === '/start-discovery' && req.method === 'POST') {
      return await this.startDiscovery(req);
    }

    if (path === '/status' && req.method === 'GET') {
      return await this.getStatus();
    }

    if (path === '/crawl-urls' && req.method === 'POST') {
      return await this.crawlUrls(req);
    }

    return new Response('Not Found', { status: 404 });
  } catch (error) {
    console.error('SiteCrawler error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

**Changes Required:**
1. ✅ Validate HTTP methods (GET vs POST)
2. ✅ Use `if` statements instead of `switch` for method validation
3. ✅ Add Content-Type header to error responses
4. ✅ Use consistent error message casing

---

## **🔧 Implementation Instructions**

### **Step 1: Update Imports**

```typescript
/**
 * @module src/domains/scraping/durable-objects/site-crawler.do.ts
 * @description
 * Production-ready Durable Object for crawling websites.
 * Restored from modern implementation (git commit d732f36).
 */

import type { Env } from '../../config/env/env.config';

interface CrawlerEnv {
  DB: D1Database;
  R2: R2Bucket;
  AI: Ai;
  VECTORIZE_INDEX: VectorizeIndex;
  // ... other bindings as needed
}
```

### **Step 2: Update Constructor**

```typescript
export class SiteCrawler {
  private state: DurableObjectState;
  private env: CrawlerEnv;

  constructor(state: DurableObjectState, env: CrawlerEnv) {
    this.state = state;
    this.env = env;
  }
  
  // ... rest of implementation
}
```

**Note:** Remove dependency injection of services (`SiteStorageService`, `ScrapeQueueService`) from constructor. The modern version uses direct env access and dynamic imports for better tree-shaking and performance.

### **Step 3: Replace All Methods**

Replace the current implementations of:
- `fetch()` - with HTTP method validation
- `startDiscovery()` - with complete state management
- `crawlUrls()` - with activity tracking
- `getStatus()` - with complete metrics

Use the **exact implementations** provided in the "Required (FIX)" sections above.

### **Step 4: Remove Unnecessary Dependencies**

```typescript
// REMOVE these imports (not used in modern version):
import { SiteStorageService } from '../../sites/services/site-storage.service';
import { ScrapeQueueService } from '../services/scrape-queue.service';

// The modern version uses dynamic imports instead:
const { discoverJobUrls } = await import('../lib/crawl');
const { crawlJobs } = await import('../lib/crawl');
```

---

## **✅ Verification Checklist**

After implementation, verify:

### **Code Quality:**
- [ ] All methods match modern version exactly
- [ ] HTTP method validation in place (GET/POST)
- [ ] All responses include `Content-Type: application/json` header
- [ ] Dynamic imports used for crawl functions
- [ ] No TypeScript errors (`pnpm exec wrangler types`)

### **State Management:**
- [ ] `current_site_id` stored in `startDiscovery`
- [ ] `base_url` stored in `startDiscovery`
- [ ] `last_activity` stored in `startDiscovery` and `crawlUrls`
- [ ] All state properly retrieved in `getStatus`

### **API Contract:**
- [ ] `startDiscovery` accepts `{ site_id, base_url, search_terms? }`
- [ ] `crawlUrls` accepts `{ batch_size? }`
- [ ] `getStatus` returns `{ site_id, status, total_discovered, crawled_count, last_activity }`
- [ ] `crawlUrls` response includes `total_discovered`

### **Production Features:**
- [ ] Health monitoring via `last_activity` timestamp
- [ ] Search term customization supported
- [ ] Progress tracking with complete metrics
- [ ] Proper HTTP status codes and headers

---

## **📊 Success Criteria**

**You will have successfully restored the Site Crawler when:**

1. ✅ All 9 missing features are implemented
2. ✅ No regressions in modularization architecture
3. ✅ All TypeScript errors resolved
4. ✅ HTTP method validation prevents security issues
5. ✅ Health monitoring fully functional
6. ✅ Zero differences from modern git version (except modularization improvements)

---

## **⚠️ Critical Reminders**

**DO:**
- ✅ Use the modern version from `git show d732f36:src/lib/durable-objects/site-crawler.ts`
- ✅ Maintain production-ready features (activity tracking, complete metrics)
- ✅ Add all Content-Type headers
- ✅ Validate HTTP methods

**DO NOT:**
- ❌ Use any code from `original_project_DO_NOT_WORK_HERE/` (it's deleted and outdated)
- ❌ Remove any features from the modern version
- ❌ Skip HTTP method validation
- ❌ Omit `last_activity` tracking

---

## **📝 Update Tracking CSV**

After completing this fix, update `docs/todo/great_migration_tracking.csv` lines 31-34:

**Change FROM:**
```csv
"Phase 5: Core Logic & Final Cleanup",original_project_DO_NOT_WORK_HERE/src/lib/durable-objects/site-crawler.ts,17,43,"fetch",src/domains/scraping/durable-objects/site-crawler.do.ts,32,48
```

**Change TO:**
```csv
"Phase 5: Core Logic & Final Cleanup",src/lib/durable-objects/site-crawler.ts (git:d732f36),15,38,"fetch",src/domains/scraping/durable-objects/site-crawler.do.ts,32,48
"Phase 5: Core Logic & Final Cleanup",src/lib/durable-objects/site-crawler.ts (git:d732f36),40,70,"startDiscovery",src/domains/scraping/durable-objects/site-crawler.do.ts,51,69
"Phase 5: Core Logic & Final Cleanup",src/lib/durable-objects/site-crawler.ts (git:d732f36),72,111,"crawlUrls",src/domains/scraping/durable-objects/site-crawler.do.ts,71,102
"Phase 5: Core Logic & Final Cleanup",src/lib/durable-objects/site-crawler.ts (git:d732f36),113,127,"getStatus",src/domains/scraping/durable-objects/site-crawler.do.ts,104,111
```

---

## **🚀 Ready to Fix**

This is a **critical regression** that impacts production functionality. The modern version has been battle-tested and includes essential features for monitoring and debugging.

**Restore the production-ready implementation now.** No shortcuts. No compromises.

