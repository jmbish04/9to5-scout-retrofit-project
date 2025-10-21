# Restore Site Storage Functionality - Critical Regression Fix

## Priority: CRITICAL

## Estimated Time: 3-4 hours

## Files Affected: `src/domains/sites/services/site-storage.service.ts`

## Problem

Jules removed critical functionality during Phase 12 modularization, causing a **critical regression** in the site storage service. The following essential features were lost:

- **Zod schema validation** (`SiteSchema`) - data integrity compromised
- **Duplicate prevention logic** - sites can now be duplicated
- **Core functions replaced with placeholders**:
  - `searchSites()` → non-functional placeholder
  - `getSitesForDiscovery()` → non-functional placeholder
  - `getSiteStatistics()` → non-functional placeholder
  - `performSiteHealthCheck()` → non-functional placeholder

This regression breaks core site management functionality and must be restored immediately.

## Current Implementation Issues

```typescript
// Current broken implementation - NEEDS RESTORATION
export class SiteStorageService {
  // Missing Zod validation
  // Missing duplicate prevention
  // Placeholder functions that don't work

  async searchSites(query: string): Promise<Site[]> {
    // PLACEHOLDER - NOT IMPLEMENTED
    return [];
  }

  async getSitesForDiscovery(): Promise<Site[]> {
    // PLACEHOLDER - NOT IMPLEMENTED
    return [];
  }

  async getSiteStatistics(): Promise<SiteStatistics> {
    // PLACEHOLDER - NOT IMPLEMENTED
    return { totalSites: 0, activeSites: 0, lastDiscovered: null };
  }

  async performSiteHealthCheck(siteId: string): Promise<HealthCheckResult> {
    // PLACEHOLDER - NOT IMPLEMENTED
    return { status: "unknown", lastChecked: new Date() };
  }
}
```

## Required Solution

Restore all lost functionality with proper implementations that maintain data integrity, prevent duplicates, and provide full site management capabilities.

## Implementation Requirements

### 1. Restore Zod Schema Validation

```typescript
// src/shared/schemas/site.schema.ts
import { z } from "zod";

export const SiteSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().min(1).max(200),
  base_url: z.string().url(),
  robots_txt: z.string().optional(),
  sitemap_url: z.string().url().optional(),
  discovery_strategy: z.enum(["sitemap", "list", "search", "custom"]),
  last_discovered_at: z.string().datetime().optional(),
  created_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
  updated_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
});

export type Site = z.infer<typeof SiteSchema>;
```

### 2. Restore Duplicate Prevention Logic

```typescript
// src/domains/sites/services/site-storage.service.ts
export class SiteStorageService {
  constructor(private db: D1Database) {}

  async saveSite(siteData: Partial<Site>): Promise<Site> {
    // Validate input data
    const validatedData = SiteSchema.parse(siteData);

    // Check for existing site with same base_url
    const existingSite = await this.getSiteByUrl(validatedData.base_url);
    if (existingSite) {
      throw new Error(`Site with URL ${validatedData.base_url} already exists`);
    }

    // Generate ID if not provided
    const siteId = validatedData.id || crypto.randomUUID();

    // Insert new site
    const result = await this.db
      .prepare(
        `
        INSERT INTO sites (
          id, name, base_url, robots_txt, sitemap_url, 
          discovery_strategy, last_discovered_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .bind(
        siteId,
        validatedData.name,
        validatedData.base_url,
        validatedData.robots_txt || null,
        validatedData.sitemap_url || null,
        validatedData.discovery_strategy,
        validatedData.last_discovered_at || null,
        validatedData.created_at,
        validatedData.updated_at
      )
      .run();

    if (!result.success) {
      throw new Error("Failed to save site");
    }

    return { ...validatedData, id: siteId };
  }

  async getSiteByUrl(baseUrl: string): Promise<Site | null> {
    const result = await this.db
      .prepare("SELECT * FROM sites WHERE base_url = ?")
      .bind(baseUrl)
      .first();

    return result ? SiteSchema.parse(result) : null;
  }
}
```

### 3. Restore Search Sites Functionality

```typescript
async searchSites(query: string): Promise<Site[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const searchTerm = `%${query.trim()}%`;

  const results = await this.db
    .prepare(`
      SELECT * FROM sites
      WHERE name LIKE ? OR base_url LIKE ?
      ORDER BY name ASC
      LIMIT 50
    `)
    .bind(searchTerm, searchTerm)
    .all();

  return results.results.map(site => SiteSchema.parse(site));
}
```

### 4. Restore Sites for Discovery Functionality

```typescript
async getSitesForDiscovery(): Promise<Site[]> {
  const results = await this.db
    .prepare(`
      SELECT * FROM sites
      WHERE discovery_strategy IS NOT NULL
      ORDER BY last_discovered_at ASC NULLS FIRST, created_at ASC
      LIMIT 100
    `)
    .all();

  return results.results.map(site => SiteSchema.parse(site));
}
```

### 5. Restore Site Statistics Functionality

```typescript
async getSiteStatistics(): Promise<SiteStatistics> {
  const [totalResult, activeResult, lastDiscoveredResult] = await Promise.all([
    this.db.prepare('SELECT COUNT(*) as count FROM sites').first(),
    this.db.prepare(`
      SELECT COUNT(*) as count FROM sites
      WHERE last_discovered_at IS NOT NULL
    `).first(),
    this.db.prepare(`
      SELECT MAX(last_discovered_at) as last_discovered
      FROM sites
      WHERE last_discovered_at IS NOT NULL
    `).first()
  ]);

  return {
    totalSites: totalResult?.count || 0,
    activeSites: activeResult?.count || 0,
    lastDiscovered: lastDiscoveredResult?.last_discovered || null
  };
}
```

### 6. Restore Site Health Check Functionality

```typescript
async performSiteHealthCheck(siteId: string): Promise<HealthCheckResult> {
  const site = await this.getSiteById(siteId);
  if (!site) {
    throw new Error(`Site with ID ${siteId} not found`);
  }

  try {
    const startTime = Date.now();

    // Test basic connectivity
    const response = await fetch(site.base_url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    const responseTime = Date.now() - startTime;

    // Update last checked timestamp
    await this.updateSiteLastChecked(siteId, new Date());

    return {
      status: response.ok ? 'healthy' : 'unhealthy',
      responseTime,
      lastChecked: new Date(),
      httpStatus: response.status,
      error: response.ok ? null : `HTTP ${response.status}`
    };

  } catch (error) {
    return {
      status: 'unhealthy',
      responseTime: null,
      lastChecked: new Date(),
      httpStatus: null,
      error: error.message
    };
  }
}

private async updateSiteLastChecked(siteId: string, timestamp: Date): Promise<void> {
  await this.db
    .prepare('UPDATE sites SET last_discovered_at = ? WHERE id = ?')
    .bind(timestamp.toISOString(), siteId)
    .run();
}
```

### 7. Add Supporting Types and Interfaces

```typescript
// src/shared/types/site.types.ts
export interface SiteStatistics {
  totalSites: number;
  activeSites: number;
  lastDiscovered: string | null;
}

export interface HealthCheckResult {
  status: "healthy" | "unhealthy" | "unknown";
  responseTime?: number | null;
  lastChecked: Date;
  httpStatus?: number | null;
  error?: string | null;
}
```

### 8. Add Comprehensive Error Handling

```typescript
export class SiteStorageError extends Error {
  constructor(
    message: string,
    public code: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = "SiteStorageError";
  }
}

export class SiteValidationError extends SiteStorageError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, "VALIDATION_ERROR", context);
  }
}

export class SiteDuplicateError extends SiteStorageError {
  constructor(message: string, context?: Record<string, any>) {
    super(message, "DUPLICATE_ERROR", context);
  }
}
```

## Testing Requirements

- Test Zod schema validation with valid and invalid data
- Test duplicate prevention with existing URLs
- Test search functionality with various queries
- Test discovery site retrieval
- Test statistics calculation accuracy
- Test health check functionality
- Test error handling for all scenarios
- Test database transaction rollback on errors

## Success Criteria

- [ ] Zod schema validation is restored and working
- [ ] Duplicate prevention prevents site duplication
- [ ] Search sites returns accurate results
- [ ] Sites for discovery returns proper list
- [ ] Site statistics are calculated correctly
- [ ] Health checks work for valid and invalid sites
- [ ] All error handling is comprehensive
- [ ] Database operations are atomic and safe
- [ ] Performance is acceptable for all operations
- [ ] Comprehensive test coverage exists

## Files to Modify

- `src/domains/sites/services/site-storage.service.ts` (restore functionality)
- `src/shared/schemas/site.schema.ts` (new file)
- `src/shared/types/site.types.ts` (new file)
- `src/shared/errors/site-storage-errors.ts` (new file)
- Add tests in `tests/domains/sites/`

## Dependencies

- Zod for schema validation
- D1 database for data persistence
- No external dependencies required
- Should maintain existing functionality

## Migration Strategy

1. Create Zod schema and type definitions
2. Restore core functionality methods
3. Add comprehensive error handling
4. Add duplicate prevention logic
5. Implement health check functionality
6. Add comprehensive tests
7. Verify all functionality works correctly
8. Update any dependent code

## Critical Notes

- This is a **CRITICAL REGRESSION** that must be fixed immediately
- The site storage service is fundamental to the application
- All placeholder functions must be replaced with real implementations
- Data integrity must be maintained at all times
- Performance must be acceptable for production use
