# Add Comprehensive Testing for Phase 12 Refactored Code

## Priority: HIGH

## Estimated Time: 4-5 hours

## Files Affected: All refactored services and modules

## Problem

The Phase 12 modularization refactored significant portions of the codebase, but comprehensive testing may be missing for the new modular structure. Need to ensure all refactored code has proper test coverage.

## Current Implementation Issues

- Missing tests for new modular structure
- Incomplete test coverage for refactored services
- No integration tests for new domain boundaries
- Missing tests for error handling improvements
- No performance tests for optimized queries

## Required Solution

Implement comprehensive testing strategy that covers all refactored code with unit tests, integration tests, and performance tests.

## Implementation Requirements

### 1. Test Structure Organization

```
tests/
├── unit/
│   ├── domains/
│   │   ├── documents/
│   │   ├── jobs/
│   │   ├── applicants/
│   │   └── ui/
│   ├── api/
│   ├── integrations/
│   └── shared/
├── integration/
│   ├── domains/
│   ├── api/
│   └── workflows/
├── performance/
│   ├── database/
│   ├── ai-models/
│   └── browser-rendering/
└── e2e/
    ├── user-flows/
    └── api-flows/
```

### 2. Unit Tests for Document Processing

```typescript
// tests/unit/domains/documents/document-processing.service.test.ts
import { describe, it, expect, beforeEach, vi } from "vitest";
import { DocumentProcessingService } from "../../../src/domains/documents/services/document-processing.service";

describe("DocumentProcessingService", () => {
  let service: DocumentProcessingService;
  let mockEnv: any;
  let mockDb: any;

  beforeEach(() => {
    mockDb = {
      prepare: vi.fn(),
      batch: vi.fn(),
    };

    mockEnv = {
      AI: {
        run: vi.fn(),
      },
      VECTORIZE_INDEX: {
        insert: vi.fn(),
        query: vi.fn(),
      },
    };

    service = new DocumentProcessingService(mockDb, mockEnv);
  });

  describe("applyPatches", () => {
    it("should apply patches successfully", async () => {
      const patches = [
        { type: "content", content: "New content", position: 0 },
      ];

      mockDb.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockResolvedValue({ success: true }),
        }),
      });

      const result = await service.applyPatches("doc-123", patches, mockEnv);

      expect(result.success).toBe(true);
      expect(mockDb.prepare).toHaveBeenCalled();
    });

    it("should handle patch application errors", async () => {
      const patches = [
        { type: "content", content: "New content", position: 0 },
      ];

      mockDb.prepare.mockReturnValue({
        bind: vi.fn().mockReturnValue({
          run: vi.fn().mockRejectedValue(new Error("Database error")),
        }),
      });

      await expect(
        service.applyPatches("doc-123", patches, mockEnv)
      ).rejects.toThrow("Database error");
    });

    it("should validate input parameters", async () => {
      await expect(service.applyPatches("", [], mockEnv)).rejects.toThrow(
        "Document ID is required"
      );

      await expect(
        service.applyPatches("doc-123", null as any, mockEnv)
      ).rejects.toThrow("Patches must be an array");
    });
  });

  describe("generateResume", () => {
    it("should generate resume with proper structure", async () => {
      const prompt = "Generate a resume for a software engineer";
      const mockResponse = {
        response: {
          text: "## Summary\nExperienced software engineer...\n\n## Experience\n...",
        },
      };

      mockEnv.AI.run.mockResolvedValue(mockResponse);

      const result = await service.generateResume(prompt, mockEnv);

      expect(result).toHaveProperty("summary");
      expect(result).toHaveProperty("experience");
      expect(mockEnv.AI.run).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: "user",
              content: prompt,
            }),
          ]),
        })
      );
    });

    it("should handle AI model errors", async () => {
      mockEnv.AI.run.mockRejectedValue(new Error("AI model error"));

      await expect(
        service.generateResume("test prompt", mockEnv)
      ).rejects.toThrow("AI model error");
    });
  });
});
```

### 3. Integration Tests for API Routes

```typescript
// tests/integration/api/jobs.test.ts
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestWorker } from "../helpers/test-worker";

describe("Jobs API Integration", () => {
  let worker: any;
  let testDb: any;

  beforeEach(async () => {
    worker = await createTestWorker();
    testDb = worker.env.DB;

    // Setup test data
    await testDb
      .prepare(
        `
      INSERT INTO sites (id, name, base_url, discovery_strategy)
      VALUES ('site-1', 'Test Site', 'https://test.com', 'sitemap')
    `
      )
      .run();
  });

  afterEach(async () => {
    // Cleanup test data
    await testDb.prepare("DELETE FROM jobs").run();
    await testDb.prepare("DELETE FROM sites").run();
  });

  describe("GET /api/jobs", () => {
    it("should return jobs with site information", async () => {
      // Insert test job
      await testDb
        .prepare(
          `
        INSERT INTO jobs (id, site_id, url, title, company, status)
        VALUES ('job-1', 'site-1', 'https://test.com/job1', 'Test Job', 'Test Company', 'open')
      `
        )
        .run();

      const response = await worker.fetch("/api/jobs");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0]).toMatchObject({
        id: "job-1",
        title: "Test Job",
        company: "Test Company",
        site_name: "Test Site",
      });
    });

    it("should filter jobs by status", async () => {
      // Insert test jobs
      await testDb
        .prepare(
          `
        INSERT INTO jobs (id, site_id, url, title, company, status)
        VALUES 
          ('job-1', 'site-1', 'https://test.com/job1', 'Open Job', 'Company 1', 'open'),
          ('job-2', 'site-1', 'https://test.com/job2', 'Closed Job', 'Company 2', 'closed')
      `
        )
        .run();

      const response = await worker.fetch("/api/jobs?status=open");
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.jobs).toHaveLength(1);
      expect(data.jobs[0].status).toBe("open");
    });
  });

  describe("POST /api/jobs/:id/monitor", () => {
    it("should start job monitoring", async () => {
      // Insert test job
      await testDb
        .prepare(
          `
        INSERT INTO jobs (id, site_id, url, title, company, status)
        VALUES ('job-1', 'site-1', 'https://test.com/job1', 'Test Job', 'Test Company', 'open')
      `
        )
        .run();

      const response = await worker.fetch("/api/jobs/job-1/monitor", {
        method: "POST",
      });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.monitorId).toBeDefined();
    });
  });
});
```

### 4. Performance Tests

```typescript
// tests/performance/database/query-performance.test.ts
import { describe, it, expect } from "vitest";
import { QueryAuditor } from "../../../src/shared/database/query-auditor";

describe("Database Query Performance", () => {
  it("should complete job queries within acceptable time", async () => {
    const startTime = Date.now();

    // Simulate job query
    const query = "SELECT * FROM jobs WHERE status = ? LIMIT 100";
    const params = ["open"];

    // Mock database response
    const mockResult = { results: Array(100).fill({}) };

    const duration = Date.now() - startTime;
    const audit = await QueryAuditor.auditQuery(query, params, startTime);

    expect(duration).toBeLessThan(1000); // Should complete within 1 second
    expect(audit.slow).toBe(false);
  });

  it("should handle large result sets efficiently", async () => {
    const startTime = Date.now();

    // Simulate large query
    const query = "SELECT * FROM jobs ORDER BY posted_at DESC LIMIT 1000";
    const params: any[] = [];

    const duration = Date.now() - startTime;
    const audit = await QueryAuditor.auditQuery(query, params, startTime);

    expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
  });
});
```

### 5. Error Handling Tests

```typescript
// tests/unit/shared/errors/document-processing-errors.test.ts
import { describe, it, expect } from "vitest";
import {
  DocumentProcessingError,
  AIModelError,
  ValidationError,
  PatchApplicationError,
} from "../../../src/shared/errors/document-processing-errors";

describe("Document Processing Errors", () => {
  it("should create DocumentProcessingError with proper properties", () => {
    const error = new DocumentProcessingError("Test error", "TEST_ERROR", {
      id: "123",
    });

    expect(error.message).toBe("Test error");
    expect(error.code).toBe("TEST_ERROR");
    expect(error.context).toEqual({ id: "123" });
    expect(error.name).toBe("DocumentProcessingError");
  });

  it("should create AIModelError with proper inheritance", () => {
    const error = new AIModelError("AI model failed", { model: "test-model" });

    expect(error.message).toBe("AI model failed");
    expect(error.code).toBe("AI_MODEL_ERROR");
    expect(error.context).toEqual({ model: "test-model" });
    expect(error).toBeInstanceOf(DocumentProcessingError);
  });

  it("should create ValidationError with proper inheritance", () => {
    const error = new ValidationError("Invalid input", { field: "documentId" });

    expect(error.message).toBe("Invalid input");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.context).toEqual({ field: "documentId" });
    expect(error).toBeInstanceOf(DocumentProcessingError);
  });
});
```

### 6. Test Utilities and Helpers

```typescript
// tests/helpers/test-worker.ts
import { createWorker } from "cloudflare:workers";

export async function createTestWorker() {
  const worker = await createWorker({
    // Mock environment for testing
    env: {
      DB: createMockDatabase(),
      AI: createMockAI(),
      VECTORIZE_INDEX: createMockVectorize(),
      // ... other mocks
    },
  });

  return worker;
}

function createMockDatabase() {
  return {
    prepare: vi.fn(),
    batch: vi.fn(),
    exec: vi.fn(),
  };
}

function createMockAI() {
  return {
    run: vi.fn(),
  };
}

function createMockVectorize() {
  return {
    insert: vi.fn(),
    query: vi.fn(),
    deleteByIds: vi.fn(),
  };
}
```

## Testing Requirements

- Unit tests for all service classes
- Integration tests for API endpoints
- Performance tests for database queries
- Error handling tests
- Mock implementations for external dependencies
- Test data setup and cleanup

## Success Criteria

- [ ] All refactored code has unit tests
- [ ] Integration tests cover API endpoints
- [ ] Performance tests validate optimizations
- [ ] Error handling is thoroughly tested
- [ ] Test coverage is above 80%
- [ ] Tests run in CI/CD pipeline
- [ ] Tests are maintainable and readable

## Files to Create

- `tests/unit/domains/documents/document-processing.service.test.ts`
- `tests/unit/domains/jobs/job-query.service.test.ts`
- `tests/unit/api/openapi-generator.test.ts`
- `tests/integration/api/jobs.test.ts`
- `tests/integration/api/sites.test.ts`
- `tests/performance/database/query-performance.test.ts`
- `tests/helpers/test-worker.ts`
- `tests/helpers/mock-factories.ts`

## Dependencies

- Vitest for testing framework
- Cloudflare Workers testing utilities
- Mock implementations for external services

## Migration Strategy

1. Set up test infrastructure
2. Create unit tests for core services
3. Add integration tests for API endpoints
4. Implement performance tests
5. Add error handling tests
6. Integrate with CI/CD pipeline
7. Monitor test coverage and quality
