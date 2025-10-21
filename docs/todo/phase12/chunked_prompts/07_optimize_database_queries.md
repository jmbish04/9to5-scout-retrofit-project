# Optimize Database Queries for Performance

## Priority: MEDIUM

## Estimated Time: 3-4 hours

## Files Affected: Multiple database service files

## Problem

The Phase 12 modularization may have introduced performance issues with database queries. Need to audit and optimize queries for better performance, especially for frequently accessed data.

## Current Implementation Issues

- Potential N+1 query problems
- Missing database indexes
- Inefficient query patterns
- No query performance monitoring
- Lack of query optimization

## Required Solution

Audit and optimize database queries across all services to improve performance, reduce latency, and ensure scalability.

## Implementation Requirements

### 1. Query Performance Audit

```typescript
// src/shared/database/query-auditor.ts
export class QueryAuditor {
  static async auditQuery(
    query: string,
    params: any[],
    startTime: number
  ): Promise<QueryAuditResult> {
    const duration = Date.now() - startTime;

    return {
      query,
      params,
      duration,
      slow: duration > 1000, // Flag queries over 1 second
      timestamp: new Date().toISOString(),
    };
  }

  static logSlowQuery(audit: QueryAuditResult) {
    if (audit.slow) {
      console.warn("Slow query detected:", audit);
    }
  }
}
```

### 2. Database Index Optimization

```sql
-- migrations/0002_add_performance_indexes.sql
-- Add indexes for frequently queried columns

-- Jobs table indexes
CREATE INDEX idx_jobs_site_id ON jobs(site_id);
CREATE INDEX idx_jobs_status ON jobs(status);
CREATE INDEX idx_jobs_posted_at ON jobs(posted_at);
CREATE INDEX idx_jobs_company ON jobs(company);
CREATE INDEX idx_jobs_location ON jobs(location);
CREATE INDEX idx_jobs_status_posted_at ON jobs(status, posted_at);

-- Job changes table indexes
CREATE INDEX idx_job_changes_job_id ON job_changes(job_id);
CREATE INDEX idx_job_changes_detected_at ON job_changes(detected_at);
CREATE INDEX idx_job_changes_change_type ON job_changes(change_type);

-- Sites table indexes
CREATE INDEX idx_sites_discovery_strategy ON sites(discovery_strategy);
CREATE INDEX idx_sites_last_discovered_at ON sites(last_discovered_at);

-- Applicant-related indexes
CREATE INDEX idx_job_history_submissions_applicant_id ON job_history_submissions(applicant_id);
CREATE INDEX idx_job_history_submissions_job_id ON job_history_submissions(job_id);
CREATE INDEX idx_job_history_submissions_submitted_at ON job_history_submissions(submitted_at);
```

### 3. Query Optimization Patterns

```typescript
// src/shared/database/query-optimizer.ts
export class QueryOptimizer {
  // Batch queries to reduce round trips
  static async batchQueries<T>(
    queries: Array<{ query: string; params: any[] }>,
    db: D1Database
  ): Promise<T[]> {
    const results = await Promise.all(
      queries.map(async ({ query, params }) => {
        const startTime = Date.now();
        const result = await db
          .prepare(query)
          .bind(...params)
          .all();
        QueryAuditor.logSlowQuery(
          await QueryAuditor.auditQuery(query, params, startTime)
        );
        return result;
      })
    );

    return results;
  }

  // Use prepared statements for repeated queries
  static createPreparedStatement(db: D1Database, query: string) {
    return db.prepare(query);
  }

  // Implement query caching for frequently accessed data
  static async withCache<T>(
    key: string,
    queryFn: () => Promise<T>,
    ttlMs: number = 300000 // 5 minutes
  ): Promise<T> {
    // Implementation would depend on your caching strategy
    // Could use KV, Redis, or in-memory cache
    return queryFn();
  }
}
```

### 4. Optimize Common Query Patterns

```typescript
// src/domains/jobs/services/job-query.service.ts
export class JobQueryService {
  // Optimize job listing with proper joins
  async getJobsWithSiteInfo(filters: JobFilters): Promise<JobWithSite[]> {
    const query = `
      SELECT 
        j.*,
        s.name as site_name,
        s.base_url as site_url
      FROM jobs j
      INNER JOIN sites s ON j.site_id = s.id
      WHERE 1=1
      ${filters.status ? "AND j.status = ?" : ""}
      ${filters.company ? "AND j.company LIKE ?" : ""}
      ${filters.location ? "AND j.location LIKE ?" : ""}
      ORDER BY j.posted_at DESC
      LIMIT ? OFFSET ?
    `;

    const params = [
      ...(filters.status ? [filters.status] : []),
      ...(filters.company ? [`%${filters.company}%`] : []),
      ...(filters.location ? [`%${filters.location}%`] : []),
      filters.limit || 50,
      filters.offset || 0,
    ];

    const startTime = Date.now();
    const result = await this.db
      .prepare(query)
      .bind(...params)
      .all();
    QueryAuditor.logSlowQuery(
      await QueryAuditor.auditQuery(query, params, startTime)
    );

    return result.results as JobWithSite[];
  }

  // Optimize job changes query with proper indexing
  async getJobChanges(
    jobId: string,
    limit: number = 100
  ): Promise<JobChange[]> {
    const query = `
      SELECT *
      FROM job_changes
      WHERE job_id = ?
      ORDER BY detected_at DESC
      LIMIT ?
    `;

    const startTime = Date.now();
    const result = await this.db.prepare(query).bind(jobId, limit).all();
    QueryAuditor.logSlowQuery(
      await QueryAuditor.auditQuery(query, [jobId, limit], startTime)
    );

    return result.results as JobChange[];
  }
}
```

### 5. Implement Query Monitoring

```typescript
// src/shared/monitoring/query-monitor.ts
export class QueryMonitor {
  private static slowQueries: QueryAuditResult[] = [];

  static recordQuery(audit: QueryAuditResult) {
    if (audit.slow) {
      this.slowQueries.push(audit);

      // Keep only last 100 slow queries
      if (this.slowQueries.length > 100) {
        this.slowQueries = this.slowQueries.slice(-100);
      }
    }
  }

  static getSlowQueries(): QueryAuditResult[] {
    return [...this.slowQueries];
  }

  static getQueryStats(): QueryStats {
    const totalQueries = this.slowQueries.length;
    const avgDuration =
      this.slowQueries.reduce((sum, q) => sum + q.duration, 0) / totalQueries;

    return {
      totalSlowQueries: totalQueries,
      averageDuration: avgDuration,
      slowestQuery: this.slowQueries.reduce(
        (max, q) => (q.duration > max.duration ? q : max),
        { duration: 0 } as QueryAuditResult
      ),
    };
  }
}
```

### 6. Add Query Performance Endpoints

```typescript
// src/api/routes/monitoring.ts
export class MonitoringRoutes {
  @Get("/api/monitoring/query-performance")
  async getQueryPerformance(): Promise<Response> {
    const stats = QueryMonitor.getQueryStats();
    const slowQueries = QueryMonitor.getSlowQueries();

    return Response.json({
      stats,
      slowQueries: slowQueries.slice(-10), // Last 10 slow queries
    });
  }

  @Get("/api/monitoring/database-health")
  async getDatabaseHealth(): Promise<Response> {
    // Check database connectivity and performance
    const startTime = Date.now();
    const result = await this.db.prepare("SELECT 1").first();
    const responseTime = Date.now() - startTime;

    return Response.json({
      status: "healthy",
      responseTime,
      timestamp: new Date().toISOString(),
    });
  }
}
```

## Testing Requirements

- Test query performance with large datasets
- Test index effectiveness
- Test query monitoring
- Test caching mechanisms
- Test error handling for slow queries

## Success Criteria

- [ ] All slow queries are identified and optimized
- [ ] Database indexes are properly configured
- [ ] Query performance is monitored
- [ ] Common query patterns are optimized
- [ ] No N+1 query problems
- [ ] Performance improvements are measurable
- [ ] Comprehensive test coverage

## Files to Modify

- All database service files
- `src/shared/database/query-auditor.ts` (new file)
- `src/shared/database/query-optimizer.ts` (new file)
- `src/shared/monitoring/query-monitor.ts` (new file)
- `migrations/0002_add_performance_indexes.sql` (new file)

## Dependencies

- D1 database
- No external dependencies required
- Should maintain existing functionality

## Migration Strategy

1. Add database indexes
2. Implement query auditing
3. Optimize common query patterns
4. Add query monitoring
5. Test performance improvements
6. Deploy and monitor
