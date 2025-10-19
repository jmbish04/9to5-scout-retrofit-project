# Optimized Source Code Modularization Plan

## Goals

- **Enforce Agentic Development Standards**: Adhere strictly to `@AGENTS.md`, `@.cursor/rules`, and `@STYLE_GUIDE.md`. Implement high-quality, agent-optimized docstrings at both the file and code-block levels to ensure context awareness and maintainability.
- **Cloudflare Best Practices**: Follow official Cloudflare Workers project structure, TypeScript types generation, and monorepo organization patterns
- **Agents SDK Optimization**: Leverage Cloudflare Agents SDK patterns for stateful, long-running operations
- Split large files (>500 lines) into focused, maintainable modules
- Organize code by business domain for better discoverability
- Reduce duplication and improve code reusability
- Create clear module boundaries with explicit dependencies
- Update all imports (no backward compatibility via barrel exports)
- Include docs/todo/\* services and modules

## Cloudflare Documentation Insights

Based on Cloudflare documentation research, the plan has been optimized for:

### 1. TypeScript Types Generation

- **Use `wrangler types`**: Generate types dynamically based on Worker configuration
- **Runtime Types**: Include compatibility date and flags in type generation
- **Environment Types**: Generate `Env` types based on bindings
- **CI Integration**: Run `wrangler types` before TypeScript compilation

### 2. Monorepo Structure

- **Workspace Management**: Use `pnpm workspaces` for dependency management
- **Code Sharing**: Create shared packages for common logic and types
- **Atomic Commits**: Enable changes across multiple workers in single commits
- **Consistent Tooling**: Apply same build, test, linting configurations

### 3. Agents SDK Organization

- **Durable Objects**: Agents are Durable Objects with SQLite storage
- **State Management**: Built-in state via `this.setState` and `this.sql`
- **Scheduling**: Built-in scheduling via `this.schedule`
- **WebSockets**: Real-time communication support
- **Long-running Operations**: Support for seconds, minutes, or hours

### 4. Project Structure Best Practices

- **Domain-Driven Design**: Organize by business domains
- **Clear Separation**: Control plane vs data plane separation
- **Scalable Architecture**: Support for millions of Durable Object instances
- **Geographic Distribution**: Leverage Cloudflare's global network

## Current Issues Identified

### Oversized Files

- `src/lib/steel.ts` (1009 lines) - Steel scraper integration **[DEFERRED - REFACTORING ON HOLD]**
- `src/lib/documents.ts` (922 lines) - Document management
- `src/lib/storage.ts` (811 lines) - Database operations
- `src/lib/openapi.ts` (701 lines) - OpenAPI spec generation
- `src/lib/browser-rendering.ts` (688 lines) - Browser automation
- `src/routes/scraper.ts` (985 lines) - Scraper routes
- `src/routes/steel-scraper.ts` (993 lines) - Steel scraper routes
- `src/routes/browser-testing.ts` (891 lines) - Browser test routes
- `src/routes/api.ts` (694 lines) - API router aggregation

### Poor Organization

- Mixed concerns in single files (e.g., storage.ts has job, site, applicant, and search logic)
- Scattered domain logic across lib/ and routes/
- Unclear module boundaries
- Duplicated utility functions

## Proposed Module Structure

```
src/
├── core/                          # Core infrastructure (NEW)
│   ├── auth/
│   │   ├── middleware.ts
│   │   └── guards.ts
│   ├── database/
│   │   ├── d1-client.ts
│   │   ├── query-builder.ts
│   │   └── migrations/
│   ├── storage/
│   │   ├── r2-client.ts
│   │   ├── kv-client.ts
│   │   └── vectorize-client.ts
│   └── validation/
│       ├── schemas.ts
│       ├── hono-validators.ts
│       └── normalize.ts
│
├── domains/                       # Business domains (NEW)
│   ├── jobs/
│   │   ├── models/
│   │   │   ├── job.types.ts
│   │   │   └── job.schema.ts
│   │   ├── services/
│   │   │   ├── job-storage.service.ts
│   │   │   ├── job-processing.service.ts
│   │   │   ├── job-extraction.service.ts
│   │   │   └── job-monitoring.service.ts
│   │   ├── routes/
│   │   │   ├── jobs.routes.ts
│   │   │   ├── job-processing.routes.ts
│   │   │   └── job-history.routes.ts
│   │   └── index.ts
│   │
│   ├── sites/
│   │   ├── models/
│   │   │   ├── site.types.ts
│   │   │   └── site.schema.ts
│   │   ├── services/
│   │   │   ├── site-storage.service.ts
│   │   │   └── site-discovery.service.ts
│   │   ├── routes/
│   │   │   └── sites.routes.ts
│   │   └── index.ts
│   │
│   ├── scraping/
│   │   ├── models/
│   │   │   ├── scrape.types.ts
│   │   │   └── run.types.ts
│   │   ├── services/
│   │   │   ├── crawl.service.ts
│   │   │   ├── steel-scraper.service.ts
│   │   │   ├── snapshot.service.ts
│   │   │   └── scrape-queue.service.ts
│   │   ├── routes/
│   │   │   ├── scraper.routes.ts
│   │   │   ├── steel-scraper.routes.ts
│   │   │   └── crawl.routes.ts
│   │   ├── durable-objects/
│   │   │   ├── site-crawler.ts
│   │   │   └── scrape-socket.ts
│   │   └── index.ts
│   │
│   ├── documents/
│   │   ├── models/
│   │   │   ├── document.types.ts
│   │   │   └── resume.types.ts
│   │   ├── services/
│   │   │   ├── document-storage.service.ts
│   │   │   ├── resume-generation.service.ts
│   │   │   ├── cover-letter-generation.service.ts
│   │   │   └── document-search.service.ts
│   │   ├── routes/
│   │   │   ├── documents.routes.ts
│   │   │   └── ai-documents.routes.ts
│   │   └── index.ts
│   │
│   ├── applicants/
│   │   ├── models/
│   │   │   ├── applicant.types.ts
│   │   │   └── profile.types.ts
│   │   ├── services/
│   │   │   ├── profile-storage.service.ts
│   │   │   └── applicant-matching.service.ts
│   │   └── index.ts
│   │
│   ├── companies/
│   │   ├── models/
│   │   │   ├── company.types.ts
│   │   │   └── benefits.types.ts
│   │   ├── services/
│   │   │   ├── company-storage.service.ts
│   │   │   ├── benefits-extraction.service.ts
│   │   │   └── company-scraping.service.ts
│   │   ├── routes/
│   │   │   └── company-benefits.routes.ts
│   │   └── index.ts
│   │
│   ├── monitoring/
│   │   ├── models/
│   │   │   ├── monitoring.types.ts
│   │   │   └── change.types.ts
│   │   ├── services/
│   │   │   ├── job-monitor.service.ts
│   │   │   ├── change-detection.service.ts
│   │   │   └── daily-monitoring.service.ts
│   │   ├── routes/
│   │   │   └── tracking.routes.ts
│   │   ├── durable-objects/
│   │   │   └── job-monitor.ts
│   │   └── index.ts
│   │
│   ├── workflows/
│   │   ├── discovery-workflow.ts
│   │   ├── job-monitor-workflow.ts
│   │   ├── change-analysis-workflow.ts
│   │   ├── routes/
│   │   │   └── workflows.routes.ts
│   │   └── index.ts
│   │
│   ├── agents/
│   │   ├── email-processor-agent.ts
│   │   ├── job-monitor-agent.ts
│   │   ├── resume-optimization-agent.ts
│   │   ├── company-intelligence-agent.ts
│   │   ├── interview-preparation-agent.ts
│   │   ├── market-analyst-agent.ts        # NEW: From docs/todo/stats.md
│   │   ├── interview-coach-agent.ts       # NEW: From docs/todo/interview_prep.md
│   │   ├── generic-agent.ts
│   │   ├── rag-agent.ts
│   │   ├── routes/
│   │   │   ├── agents.routes.ts
│   │   │   └── agent.routes.ts
│   │   └── index.ts
│   │
│   └── stats/                             # NEW: Market Pulse & Analytics
│       ├── models/
│       │   ├── market-stats.types.ts
│       │   ├── benefit-trends.types.ts
│       │   └── analytics.types.ts
│       ├── services/
│       │   ├── market-analytics.service.ts
│       │   ├── benefit-trends.service.ts
│       │   ├── statistics-calculator.service.ts
│       │   └── insights-generator.service.ts
│       ├── routes/
│       │   ├── market-pulse.routes.ts
│       │   └── analytics.routes.ts
│       └── index.ts
│
├── integrations/                  # External service integrations (NEW)
│   ├── ai/
│   │   ├── workers-ai.client.ts
│   │   ├── extraction.service.ts
│   │   └── embeddings.service.ts
│   ├── browser/
│   │   ├── browser-rendering.client.ts
│   │   ├── browser-testing.service.ts
│   │   ├── render-api.service.ts          # NEW: Cloudflare Browser Rendering API service
│   │   └── routes/
│   │       ├── browser-rendering.routes.ts
│   │       ├── browser-testing.routes.ts
│   │       └── render-api.routes.ts
│   ├── talent-api/
│   │   ├── talent.client.ts
│   │   └── talent.routes.ts
│   ├── email/
│   │   ├── AGENTS.md
│   │   ├── models/
│   │   │   └── email.types.ts
│   │   ├── services/
│   │   │   ├── template-loader.service.ts
│   │   │   ├── email-templates.service.ts
│   │   │   ├── email-utils.service.ts
│   │   │   ├── email-insights.service.ts
│   │   │   └── email-search.service.ts
│   │   ├── routes/
│   │   │   ├── management.routes.ts
│   │   │   └── test-email.routes.ts
│   │   └── index.ts
│   ├── remote-scraper/
│   │   ├── remote-scraper.client.ts
│   │   └── remote-scraper.routes.ts
│   └── python-fastapi/            # NEW: Local Python FastAPI Integration
│       ├── models/
│       │   ├── python-client.types.ts
│       │   ├── scrape-queue.types.ts
│       │   └── job-status.types.ts
│       ├── services/
│       │   ├── python-websocket.service.ts
│       │   ├── scrape-queue-manager.service.ts
│       │   ├── python-client-manager.service.ts
│       │   └── job-status-sync.service.ts
│       ├── routes/
│       │   ├── python-client.routes.ts
│       │   ├── scrape-queue.routes.ts
│       │   └── status-checker.routes.ts
│       └── index.ts
│
├── services/                      # NEW: Additional services from docs/todo/
│   ├── scraping/                  # From docs/todo/services/services_module.md
│   │   ├── models/
│   │   │   └── scraping.types.ts
│   │   ├── services/
│   │   │   ├── scraping-orchestrator.service.ts
│   │   │   └── scraping-coordinator.service.ts
│   │   └── index.ts
│   └── interview/                 # NEW: Interview coaching services
│       ├── models/
│       │   ├── interview.types.ts
│       │   └── coaching.types.ts
│       ├── services/
│       │   ├── interview-coaching.service.ts
│       │   ├── question-generator.service.ts
│       │   ├── feedback-analyzer.service.ts
│       │   └── realtime-session.service.ts
│       ├── routes/
│       │   ├── interview-coaching.routes.ts
│       │   └── mock-interview.routes.ts
│       └── index.ts
│
├── shared/                        # Shared utilities (NEW)
│   ├── utils/
│   │   ├── hash.ts
│   │   ├── routing.ts
│   │   └── content.ts
│   ├── types/
│   │   └── common.types.ts
│   └── constants/
│       └── app.constants.ts
│
├── api/                           # API layer (NEW)
│   ├── router.ts                  # Main API router
│   ├── openapi.ts                 # OpenAPI spec generator
│   └── webhooks.routes.ts
│
├── ui/                            # UI routes (NEW)
│   ├── pages.routes.ts
│   └── files.routes.ts
│
├── config/                        # Configuration (NEW)
│   ├── env.ts
│   └── configs.routes.ts
│
└── index.ts                       # Main worker entry point
```

## TypeScript Configuration Optimization

### 1. Dynamic Types Generation

```json
{
  "scripts": {
    "generate-types": "wrangler types",
    "type-check": "generate-types && tsc",
    "dev": "generate-types && wrangler dev",
    "build": "generate-types && wrangler deploy"
  }
}
```

### 2. tsconfig.json Optimization

```json
{
  "compilerOptions": {
    "types": ["./worker-configuration.d.ts", "node"],
    "lib": ["esnext"],
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true
  }
}
```

### 3. CI/CD Integration

```yaml
- run: pnpm run generate-types
- run: pnpm run build
- run: pnpm test
```

## Agents SDK Optimization

### 1. Agent Class Structure

```typescript
import { Agent, AgentNamespace } from "agents";

export class MyAgent extends Agent {
  // Built-in state management
  async onRequest(request: Request) {
    // Handle HTTP requests
  }

  async onConnect(connection: Connection) {
    // Handle WebSocket connections
  }

  async onMessage(connection: Connection, message: WSMessage) {
    // Handle real-time messages
  }

  // Built-in scheduling
  async scheduleTask() {
    await this.schedule("*/5 * * * *", "checkStatus", {});
  }

  // Built-in SQLite storage
  async queryData() {
    const result = await this.sql`SELECT * FROM data`;
    return result;
  }
}
```

### 2. Wrangler Configuration

```jsonc
{
  "durable_objects": {
    "bindings": [
      {
        "name": "MyAgent",
        "class_name": "MyAgent"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_sqlite_classes": ["MyAgent"]
    }
  ]
}
```

## Detailed Migration Steps

### Phase 1: Core Infrastructure (Week 1) ✅ IN PROGRESS

1. Create `src/core/` structure
2. Split `src/lib/auth.ts` into `core/auth/`
3. Split `src/lib/d1-utils.ts` into `core/database/`
4. Move `src/lib/r2-utils.ts`, `r2.ts` to `core/storage/`
5. Move `src/lib/validation.ts`, `schemas.ts`, `hono-validation.ts`, `normalize.ts` to `core/validation/`
6. Move `src/lib/vectorize.ts` to `core/storage/vectorize-client.ts`

### Phase 2: Jobs Domain (Week 1-2)

1. Create `src/domains/jobs/` structure
2. Extract job-related types from `src/lib/types.ts` to `domains/jobs/models/`
3. Split `src/lib/storage.ts`:
   - Job operations → `domains/jobs/services/job-storage.service.ts`
   - Search operations → `domains/jobs/services/job-search.service.ts`
4. Move `src/lib/job-processing.ts` → `domains/jobs/services/job-processing.service.ts`
5. Move `src/lib/ai.ts` job extraction → `domains/jobs/services/job-extraction.service.ts`
6. Move `src/routes/jobs.ts` → `domains/jobs/routes/jobs.routes.ts`
7. Move `src/routes/job-processing.ts` → `domains/jobs/routes/job-processing.routes.ts`
8. Move `src/routes/job-history.ts` → `domains/jobs/routes/job-history.routes.ts`
9. Move `src/jobs/pipeline.ts` → `domains/jobs/services/job-ingestion.service.ts`

### Phase 3: Sites Domain (Week 2)

1. Create `src/domains/sites/` structure
2. Extract site types from `src/lib/types.ts` to `domains/sites/models/`
3. Extract site operations from `src/lib/storage.ts` → `domains/sites/services/site-storage.service.ts`
4. Move `src/routes/sites.ts` → `domains/sites/routes/sites.routes.ts`

### Phase 4: Scraping Domain (Week 2-3)

1. Create `src/domains/scraping/` structure
2. Split `src/lib/crawl.ts` (363 lines):
   - Core crawling logic → `domains/scraping/services/crawl.service.ts`
   - Sitemap parsing → `domains/scraping/services/sitemap-parser.service.ts`
3. **DEFERRED**: Split `src/lib/steel.ts` (1009 lines) - **REFACTORING ON HOLD**
   - **IMMEDIATE ACTION**: Move `src/lib/steel.ts` → `domains/scraping/services/steel.ts` (no refactoring)
   - **FUTURE**: Steel client → `domains/scraping/services/steel-client.service.ts`
   - **FUTURE**: Job scraping → `domains/scraping/services/steel-scraper.service.ts`
4. Split `src/routes/scraper.ts` (985 lines):
   - Scraper endpoints → `domains/scraping/routes/scraper.routes.ts`
   - Queue management → `domains/scraping/routes/scrape-queue.routes.ts`
5. Split `src/routes/steel-scraper.ts` (993 lines):
   - Main routes → `domains/scraping/routes/steel-scraper.routes.ts`
   - Helper functions → `domains/scraping/services/steel-helpers.service.ts`
6. Move `src/routes/crawl.ts` → `domains/scraping/routes/crawl.routes.ts`
7. Move `src/routes/scrape-queue.ts`, `scrape-fallback.ts` → `domains/scraping/routes/`
8. Move `src/lib/durable-objects/site-crawler.ts` → `domains/scraping/durable-objects/`
9. Move `src/lib/durable-objects/scrape-socket.ts` → `domains/scraping/durable-objects/`
10. Move `src/routes/socket.ts` → `domains/scraping/routes/socket.routes.ts`
11. Extract snapshot logic from `storage.ts` → `domains/scraping/services/snapshot.service.ts`

### Phase 5: Documents Domain (Week 3)

1. Create `src/domains/documents/` structure
2. Split `src/lib/documents.ts` (922 lines):
   - Document storage → `domains/documents/services/document-storage.service.ts`
   - Resume generation → `domains/documents/services/resume-generation.service.ts`
   - Cover letter generation → `domains/documents/services/cover-letter-generation.service.ts`
   - Document search → `domains/documents/services/document-search.service.ts`
   - ATS evaluation → `domains/documents/services/ats-evaluation.service.ts`
3. Move `src/routes/documents.ts` → `domains/documents/routes/documents.routes.ts`
4. Move `src/routes/ai-documents.ts` → `domains/documents/routes/ai-documents.routes.ts`

### Phase 6: Monitoring & Workflows (Week 3-4)

1. Create `src/domains/monitoring/` structure
2. Split `src/lib/monitoring.ts` (365 lines):
   - Job monitoring → `domains/monitoring/services/job-monitor.service.ts`
   - Change detection → `domains/monitoring/services/change-detection.service.ts`
3. Move `src/lib/durable-objects/job-monitor.ts` → `domains/monitoring/durable-objects/`
4. Move `src/routes/tracking.ts` → `domains/monitoring/routes/tracking.routes.ts`
5. Move `src/routes/runs.ts` → `domains/monitoring/routes/runs.routes.ts`
6. Create `src/domains/workflows/` and move `src/lib/workflows/*`
7. Move `src/routes/workflows.ts` → `domains/workflows/routes/workflows.routes.ts`

### Phase 7: Companies & Applicants (Week 4)

1. Create `src/domains/companies/` structure
2. Extract company types from `src/lib/types.ts`
3. Move `src/lib/extractBenefits.ts` → `domains/companies/services/benefits-extraction.service.ts`
4. Move `src/routes/company-benefits.ts` → `domains/companies/routes/company-benefits.routes.ts`
5. Move `src/companies/scrape.ts` → `domains/companies/services/company-scraping.service.ts`
6. Create `src/domains/applicants/` structure
7. Extract applicant operations from `src/lib/storage.ts` → `domains/applicants/services/`

### Phase 8: Agents (Week 4-5)

1. Create `src/domains/agents/` structure
2. Move all agent files from `src/lib/agents/` → `domains/agents/`
3. Move `src/lib/generic_agent.ts`, `rag_agent.ts` → `domains/agents/`
4. Move `src/routes/agents.ts`, `agent.ts` → `domains/agents/routes/`
5. **NEW**: Implement `InterviewCoachAgent` from `docs/todo/interview_prep.md`
6. **NEW**: Implement `MarketAnalystAgent` from `docs/todo/stats.md`

### Phase 9: Stats & Analytics Domain (Week 5) - NEW

1. Create `src/domains/stats/` structure
2. Implement Market Pulse backend from `docs/todo/stats.md`:
   - Create `market-stats.types.ts` and `benefit-trends.types.ts`
   - Implement `market-analytics.service.ts`
   - Implement `benefit-trends.service.ts`
   - Implement `statistics-calculator.service.ts`
   - Implement `insights-generator.service.ts`
3. Create database migrations for new stats tables
4. Implement scheduled worker for daily stats aggregation
5. Create API routes for Market Pulse dashboard

### Phase 10: Interview Services (Week 5) - NEW

1. Create `src/services/interview/` structure
2. Implement interview coaching services from `docs/todo/interview_prep.md`:
   - Create `interview.types.ts` and `coaching.types.ts`
   - Implement `interview-coaching.service.ts`
   - Implement `question-generator.service.ts`
   - Implement `feedback-analyzer.service.ts`
   - Implement `realtime-session.service.ts`
3. Create API routes for interview coaching
4. Integrate with `InterviewCoachAgent`

### Phase 11: Integrations (Week 6)

1. Create `src/integrations/` structure
2. Split `src/lib/browser-rendering.ts` (688 lines):
   - Client → `integrations/browser/browser-rendering.client.ts`
   - Service → `integrations/browser/browser-testing.service.ts`
3. **NEW**: Implement Cloudflare Browser Rendering API service from `docs/todo/services/render_api.md`:
   - Create `render-api.service.ts` with all 8 endpoints (Content, Json, Links, Markdown, PDF, Scrape, Screenshot, Snapshot)
   - Create `render-api.routes.ts` for API endpoints
4. Split `src/routes/browser-testing.ts` (891 lines):
   - Main routes → `integrations/browser/routes/browser-testing.routes.ts`
   - Helpers → `integrations/browser/browser-helpers.ts`
5. Move `src/routes/browser-rendering.ts` → `integrations/browser/routes/browser-rendering.routes.ts`
6. Move `src/routes/browser-test-websocket.ts` → `integrations/browser/routes/browser-test-websocket.routes.ts`
7. Move `src/lib/talent.ts` → `integrations/talent-api/talent.client.ts`
8. Move `src/routes/talent.ts` → `integrations/talent-api/talent.routes.ts`
9. Move `src/routes/remote-scraper.ts` → `integrations/remote-scraper/`
10. Move `src/lib/email/` → `integrations/email/` (already well-structured)
11. Split `src/lib/embeddings.ts` (492 lines):
    - Core embedding logic → `integrations/ai/embeddings.service.ts`
    - RAG functionality → `domains/agents/rag-support.service.ts`
12. Move `src/routes/embeddings.ts` → `integrations/ai/embeddings.routes.ts`
13. Move `src/routes/rag.ts` → `domains/agents/routes/rag.routes.ts`
14. **NEW**: Implement Python FastAPI Integration:
    - Create `python-fastapi/models/` with types for Python client communication
    - Create `python-websocket.service.ts` for WebSocket management
    - Create `scrape-queue-manager.service.ts` for D1 table job staging
    - Create `python-client-manager.service.ts` for client connection tracking
    - Create `job-status-sync.service.ts` for status synchronization
    - Create API routes for Python client communication
    - Implement D1 table schema for scrape queue management

### Phase 12: Additional Services (Week 6) - NEW

1. Create `src/services/scraping/` structure from `docs/todo/services/services_module.md`
2. Implement scraping orchestrator and coordinator services
3. Create scraping service types and models

### Phase 13: Shared & API Layer (Week 6-7)

1. Create `src/shared/` structure
2. Move utility files:
   - `src/lib/hash.ts` → `shared/utils/hash.ts`
   - `src/lib/routing.ts` → `shared/utils/routing.ts`
   - `src/lib/content.ts` → `shared/utils/content.ts`
3. Split `src/lib/types.ts` → Move remaining types to `shared/types/common.types.ts`
4. Create `src/api/` structure
5. Split `src/routes/api.ts` (694 lines):
   - Main router → `api/router.ts`
   - Route aggregation logic → Individual domain index files
6. Split `src/lib/openapi.ts` (701 lines):
   - Core spec generator → `api/openapi-generator.ts`
   - Route definitions → `api/openapi-routes.ts`
   - Schema definitions → `api/openapi-schemas.ts`
7. Move `src/routes/openapi.ts` → `api/openapi.routes.ts`
8. Move `src/routes/webhooks.ts` → `api/webhooks.routes.ts`

### Phase 14: UI & Config (Week 7)

1. Create `src/ui/` structure
2. Move `src/routes/pages.ts` → `ui/pages.routes.ts`
3. Move `src/routes/files.ts` → `ui/files.routes.ts`
4. Create `src/config/` structure
5. Move `src/lib/env.ts` → `config/env.ts`
6. Move `src/routes/configs.ts` → `config/configs.routes.ts`

### Phase 15: Career Coach and Talent Agent (Week 7-8) - NEW

1. Create `src/domains/career-coach/` structure
2. Implement Cloudflare Agents SDK Career Coach agent:
   - Create `career-coach.agent.ts` with profile management tools
   - Create `talent-manager.agent.ts` for advanced career guidance
   - Implement soft delete (isActive = false) and staging (isConfirmed = 0) patterns
3. Create D1 database schema for comprehensive applicant profiles:
   - `applicant_profiles` - Main profile information (name, email, phone, LinkedIn, GitHub)
   - `job_history` - Employment history with detailed records
   - `skills` - Skills and competencies with proficiency levels
   - `career_goals` - Career objectives and aspirations
   - `industry_interests` - Industry preferences and focus areas
   - `salary_goals` - Compensation expectations and ranges
   - `profile_changes` - Staged changes awaiting confirmation (isConfirmed = 0)
   - `profile_approvals` - Human-in-the-loop approval workflow
4. Implement Career Coach API endpoints:
   - **Direct CRUD**: Manual profile updates with validation
   - **AI Chat**: WebSocket streaming for real-time agent interaction
   - **Document Upload**: Resume/cover letter analysis and staging
   - **LinkedIn Consultation**: Profile optimization advice and recommendations
   - **Approval System**: Human review and approval of staged changes
5. Create comprehensive profile management services:
   - Profile validation and normalization
   - Change tracking and audit logging
   - AI-powered profile optimization suggestions
   - Integration with existing job matching system

### Phase 12: Meticulous Cleanup & Verification (Week 8-9) - REVISED

**CRITICAL**: This phase ensures no functionality is lost during migration by systematically verifying all old code has been replicated in the new modular structure.

#### Phase 12A: Audit & Document Old Code (Week 8, Days 1-2)

**Goal**: Create comprehensive inventory of all functionality in old `lib/` and `routes/` directories

1. **Create Migration Audit Spreadsheet**:

   - List every file in `src/lib/` and `src/routes/`
   - Document each function, class, and exported item
   - Note file size and complexity
   - Track migration status (migrated/partially migrated/not migrated)

2. **Function-Level Inventory**:

   - For each file, list all exported functions, classes, types, and constants
   - Document function signatures and purposes
   - Note dependencies and imports
   - Identify any unique functionality not found elsewhere

3. **Create Verification Checklist**:
   - For each function/class, verify it exists in new modular structure
   - Document the new location if migrated
   - Flag any missing functionality

#### Phase 12B: Code Verification & Migration (Week 8, Days 3-5)

**Goal**: Ensure every piece of functionality is accounted for in the new structure

1. **Systematic File Review**:

   - Process each file in `src/lib/` and `src/routes/` one by one
   - For each code block (function, class, etc.):
     - **If replicated in new structure**: Add docstring and comment out
     - **If not replicated**: Migrate to appropriate domain, then comment out
     - **If deprecated**: Mark as deprecated and comment out

2. **Code Block Documentation Pattern**:

   ```typescript
   /**
    * MIGRATED: This function has been moved to src/domains/jobs/services/job-storage.service.ts
    * New location: JobStorageService.getJobById()
    * Migration date: 2025-01-18
    * Status: VERIFIED - Functionality preserved
    */
   // export async function getJobById(id: string, env: Env): Promise<Job | null> {
   //   // Original implementation commented out
   // }
   ```

3. **Migration Verification Process**:
   - Test each migrated function to ensure it works identically
   - Verify all imports are updated
   - Ensure no breaking changes in API contracts
   - Document any behavioral differences

#### Phase 12C: Gradual File Cleanup (Week 8, Days 6-7)

**Goal**: Systematically remove old files after verification

1. **File-by-File Cleanup**:

   - Start with smallest, simplest files
   - Verify all functionality is preserved
   - Remove file only after 100% verification
   - Update all import references

2. **Import Update Process**:

   - Search codebase for any remaining references to old paths
   - Update all imports to use new modular structure
   - Verify no broken imports remain

3. **Testing After Each File Removal**:
   - Run tests after each file removal
   - Verify no functionality is broken
   - Rollback if any issues are found

#### Phase 12D: Final Verification & Documentation (Week 9, Days 1-2)

**Goal**: Ensure complete migration with no functionality loss

1. **Comprehensive Testing**:

   - Run full test suite
   - Test all API endpoints
   - Verify all Durable Objects work
   - Test all workflows and agents

2. **Documentation Update**:

   - Update all documentation to reflect new structure
   - Create migration guide for future reference
   - Document any breaking changes

3. **Final Cleanup**:
   - Remove empty directories
   - Clean up any remaining old imports
   - Update README and project documentation

#### Phase 12E: Legacy Code Preservation (Week 9, Days 3-5)

**Goal**: Preserve old code for reference while maintaining clean codebase

1. **Create Legacy Archive**:

   - Move all commented-out old files to `legacy/` directory
   - Organize by original directory structure
   - Add comprehensive README explaining what was migrated where

2. **Legacy Documentation**:

   - Create migration map showing old → new paths
   - Document any functionality that was consolidated or refactored
   - Note any behavioral changes or improvements

3. **Cleanup Verification**:
   - Ensure no old `lib/` or `routes/` directories remain
   - Verify all imports use new modular structure
   - Confirm no dead code or unused files

#### Phase 12F: Final Route Consolidation (Week 9, Days 6-7)

**Goal**: Consolidate all legacy route files into final, clean domain route files

1. **Create Final Route Files**:

   - Merge all `legacy-*-original.ts` functions into final `{domain}.routes.ts` files
   - Remove placeholder responses
   - Implement full functionality in final routes

2. **Update Legacy Route Handlers**:

   - Update `legacy-*.routes.ts` to call final route functions instead of placeholders
   - Maintain backward compatibility
   - Keep deprecation warnings

3. **Remove Original Legacy Files**:

   - Delete `legacy-*-original.ts` files
   - Keep only `legacy-*.routes.ts` for compatibility
   - Clean up imports and dependencies

4. **Final Architecture**:
   - Achieve clean, final domain structure
   - Maintain legacy compatibility layer
   - Complete modularization with zero functionality loss

### Detailed File-by-File Cleanup Plan

#### `src/lib/` Directory Cleanup

**Files to Process** (in order of complexity):

1. **Simple Utility Files** (process first):

   - `src/lib/hash.ts` → `src/shared/utils/hash.ts` ✅
   - `src/lib/routing.ts` → `src/shared/utils/routing.ts` ✅
   - `src/lib/content.ts` → `src/shared/utils/content.ts` ✅

2. **Medium Complexity Files**:

   - `src/lib/env.ts` → `src/domains/config/env/env.config.ts` ✅
   - `src/lib/types.ts` → Split across multiple domain type files ✅
   - `src/lib/validation.ts` → `src/core/validation/hono-validation.ts` ✅
   - `src/lib/schemas.ts` → `src/core/validation/schemas.ts` ✅

3. **Complex Files** (process last):
   - `src/lib/storage.ts` (811 lines) → Split across multiple domain services
   - `src/lib/documents.ts` (922 lines) → `src/domains/documents/services/`
   - `src/lib/steel.ts` (1009 lines) → `src/domains/scraping/services/steel.ts` (DEFERRED)
   - `src/lib/browser-rendering.ts` (688 lines) → `src/domains/integrations/browser/`
   - `src/lib/openapi.ts` (701 lines) → `src/api/openapi.ts`

#### `src/routes/` Directory Cleanup

**Files to Process** (in order of complexity):

1. **Simple Route Files**:

   - `src/routes/pages.ts` → `src/domains/ui/routes/pages.routes.ts` ✅
   - `src/routes/files.ts` → `src/domains/ui/routes/files.routes.ts` ✅
   - `src/routes/configs.ts` → `src/domains/config/routes/configs.routes.ts` ✅

2. **Medium Complexity Route Files**:

   - `src/routes/jobs.ts` → `src/domains/jobs/routes/jobs.routes.ts` ✅
   - `src/routes/sites.ts` → `src/domains/sites/routes/sites.routes.ts` ✅
   - `src/routes/documents.ts` → `src/domains/documents/routes/documents.routes.ts` ✅
   - `src/routes/company-benefits.ts` → `src/domains/companies/routes/company-benefits.routes.ts` ✅

3. **Complex Route Files**:
   - `src/routes/api.ts` (694 lines) → `src/api/router.ts` + domain route aggregation
   - `src/routes/scraper.ts` (985 lines) → `src/domains/scraping/routes/scraper.routes.ts`
   - `src/routes/steel-scraper.ts` (993 lines) → `src/domains/scraping/routes/steel-scraper.routes.ts`
   - `src/routes/browser-testing.ts` (891 lines) → `src/domains/integrations/browser/routes/`

#### Verification Checklist Template

For each file being cleaned up:

- [ ] **Function Inventory**: All functions/classes documented
- [ ] **Migration Verification**: Each function verified in new location
- [ ] **Import Updates**: All references updated to new paths
- [ ] **Testing**: Functionality verified through testing
- [ ] **Documentation**: Migration documented with docstrings
- [ ] **Code Commenting**: Old code commented out with migration notes
- [ ] **File Removal**: File safely removed after verification

#### Risk Mitigation

1. **Backup Strategy**: Create git branch before each file cleanup
2. **Rollback Plan**: Keep commented code until full verification
3. **Testing Strategy**: Run tests after each file removal
4. **Documentation**: Maintain detailed migration log
5. **Gradual Process**: Don't rush - verify each step thoroughly

## New Services from docs/todo/\*

### 1. Cloudflare Browser Rendering API Service

- **Source**: `docs/todo/services/render_api.md`
- **Location**: `src/integrations/browser/render-api.service.ts`
- **Features**: All 8 Cloudflare Browser Rendering endpoints (Content, Json, Links, Markdown, PDF, Scrape, Screenshot, Snapshot)
- **Authentication**: API Token with "Browser Rendering Write" permission

### 2. Python FastAPI Integration Service

- **Source**: Local Ubuntu machine with Python FastAPI + Playwright
- **Location**: `src/integrations/python-fastapi/`
- **Features**:
  - **WebSocket API**: Real-time communication with Python scraper
  - **Cron-based Job Queue**: D1 table staging for Python script polling
  - **Status Monitoring**: Health checks and job status tracking
  - **Authentication**: API token-based authentication
  - **Job Management**: Queue pending jobs, update status, handle results
  - **Error Handling**: Robust error handling and retry mechanisms
  - **Client Management**: Track and manage Python client connections

#### Python FastAPI Integration Details

**WebSocket Communication:**

- Real-time bidirectional communication with Python clients
- Heartbeat/ping-pong mechanism for connection health
- Message types: `scrape`, `process_scraped_data`, `ping`, `pong`
- Client identification and connection tracking
- Automatic reconnection handling

**Cron-based Job Queue:**

- D1 table `scrape_queue` for staging jobs
- Python script polls `/api/v1/scrape-queue/pending` every 5 minutes
- Job status tracking: `pending`, `processing`, `completed`, `failed`
- Batch job processing and result posting
- Error handling and retry mechanisms

**API Endpoints:**

- `GET /api/v1/scrape-queue/pending` - Get pending jobs for Python
- `PATCH /api/v1/scrape-queue/{id}` - Update job status
- `POST /api/v1/jobs/batch` - Submit scraped job results
- `GET /api/health` - Health check endpoint
- `GET /api/monitoring/status` - Overall system status
- `GET /api/jobs` - List recent jobs
- `GET /api/scraper/queue/pending` - Pending scrape jobs
- `GET /api/scraper/queue/unrecorded` - Unrecorded scrapes

**Database Schema (D1 Migrations):**

```sql
-- Scrape queue for Python FastAPI integration
CREATE TABLE scrape_queue (
  id TEXT PRIMARY KEY,
  urls TEXT NOT NULL, -- JSON array of URLs to scrape
  source TEXT, -- JobSpy source (indeed, linkedin, etc.)
  status TEXT CHECK(status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  processed_at DATETIME,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3
);

-- Python client connections tracking
CREATE TABLE python_clients (
  id TEXT PRIMARY KEY,
  client_type TEXT DEFAULT 'python',
  last_ping DATETIME DEFAULT CURRENT_TIMESTAMP,
  connection_status TEXT CHECK(connection_status IN ('connected', 'disconnected')) DEFAULT 'connected',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Environment Variables:**

- `SCOUT_WORKER_BASE_URL` - Worker API base URL
- `SCOUT_WORKER_API_KEY` - API authentication token
- `WS_URL` - WebSocket connection URL
- `API_TOKEN` - WebSocket authentication token

### 3. Interview Coaching Services

- **Source**: `docs/todo/interview_prep.md`
- **Location**: `src/services/interview/` and `src/domains/agents/interview-coach-agent.ts`
- **Features**:
  - Mock interview generation
  - Real-time voice-based practice
  - Question generation based on job description and resume
  - Feedback analysis
  - Integration with Realtime Agents for audio pipeline

### 4. Market Analytics & Stats

- **Source**: `docs/todo/stats.md`
- **Location**: `src/domains/stats/` and `src/domains/agents/market-analyst-agent.ts`
- **Features**:
  - Market Pulse dashboards
  - Job market trend analysis
  - Benefit trends tracking
  - AI-powered insights generation
  - Scheduled daily aggregation

### 5. Scraping Services Module

- **Source**: `docs/todo/services/services_module.md`
- **Location**: `src/services/scraping/`
- **Features**: Scraping orchestrator and coordinator services

## Benefits

1. **Maintainability**: Files are smaller and focused on single responsibilities
2. **Discoverability**: Clear domain structure makes it easy to find code
3. **Scalability**: Easy to add new features within existing domains
4. **Testing**: Isolated services are easier to test
5. **Reusability**: Services can be imported and reused across routes
6. **Onboarding**: New developers can understand the structure quickly
7. **Enhanced Features**: Includes all planned services from docs/todo/\*
8. **Cloudflare Best Practices**: Follows official Cloudflare Workers patterns
9. **Type Safety**: Dynamic TypeScript types generation with `wrangler types`
10. **Agent Optimization**: Leverages Cloudflare Agents SDK for stateful operations

## Breaking Changes

- All import paths will change
- No backward compatibility layer
- Requires comprehensive codebase update
- May require temporary type errors during migration

## Rollback Strategy

- Perform migration in phases with git commits after each phase
- Keep old files until new structure is verified
- Run tests after each phase
- Can rollback to any phase if issues arise

## Agent Implementation Guidelines

All refactoring work must adhere to the following standards to ensure code quality, consistency, and optimal context for our agentic development workflow.

- **Standards Compliance**: Strictly adhere to the guidelines outlined in the following documents: `@AGENTS.md`, `@.cursor/rules`, and `@STYLE_GUIDE.md`.
- **High-Quality Docstrings**: Implement comprehensive docstrings at both the file-level and the function/code-block level for all new and refactored modules.
- **Agent-Optimized Documentation**: Docstrings must be optimized for agentic developers. They should clearly explain the module's purpose, the function's behavior, its parameters, return values, and any potential side effects. The goal is to provide maximum context awareness to improve long-term maintainability by both human and AI developers.

## Success Criteria

- Agentic Code Quality: All refactored and new modules fully comply with the standards in @AGENTS.md, @.cursor/rules, and @STYLE_GUIDE.md, and feature comprehensive, agent-optimized docstrings at both the file and code-block levels.
- No files over 500 lines (except `steel.ts` which is deferred)
- Clear domain boundaries
- All tests passing
- No circular dependencies
- TypeScript compilation successful
- Documentation updated
- All docs/todo/\* services implemented
- Cloudflare best practices followed
- Dynamic types generation working
- Agents SDK properly integrated

## Deferred Items

- **Steel.ts Refactoring**: The 1009-line `steel.ts` file will be moved to `domains/scraping/services/steel.ts` but refactoring is deferred until further notice

### To-dos

- [x] Phase 1: Create core infrastructure (auth, database, storage, validation) - COMPLETED
- [x] Phase 2: Migrate jobs domain (models, services, routes) - COMPLETED
- [x] Phase 3: Migrate sites domain - COMPLETED
- [x] Phase 4: Migrate scraping domain (crawl, steel, durable objects) - COMPLETED
- [x] Phase 5: Migrate documents domain (split 922-line file) - COMPLETED
- [x] Phase 6: Migrate monitoring and workflows domains - COMPLETED
- [x] Phase 7: Migrate companies and applicants domains - COMPLETED
- [x] Phase 8: Migrate agents domain - COMPLETED
- [x] Phase 9: Migrate integrations (browser, AI, email, talent API) - COMPLETED
- [x] Phase 10: Create shared utilities and API layer - COMPLETED
- [x] Phase 11: Create UI and config modules - COMPLETED
- [ ] Phase 12A: Audit & Document Old Code - PENDING
- [ ] Phase 12B: Code Verification & Migration - PENDING
- [ ] Phase 12C: Gradual File Cleanup - PENDING
- [ ] Phase 12D: Final Verification & Documentation - PENDING
- [ ] Phase 12E: Legacy Code Preservation - PENDING
- [x] Phase 13: NEW - Implement stats & analytics domain (Market Pulse) - COMPLETED
- [x] Phase 14: NEW - Implement interview services - COMPLETED
- [x] Phase 15: NEW - Implement additional services from docs/todo/\* - COMPLETED
- [x] Phase 16: NEW - Implement Career Coach and Talent Agent - COMPLETED
- [x] Phase 17: NEW - Implement Python FastAPI Integration - COMPLETED
- [x] Phase 18: NEW - Implement Cloudflare Browser Rendering API service - COMPLETED
