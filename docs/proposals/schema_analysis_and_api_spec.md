# D1 Schema Analysis and API Specification

This document provides a detailed breakdown of the 9to5-Scout D1 database schema, maps tables to the existing TypeScript codebase, and proposes a specification for new API routes to expose applicant-related functionality.

## ✅ Cloudflare Platform Verification

After reviewing Cloudflare documentation, the proposed implementation approach is well-aligned with Cloudflare best practices:

- **D1 Database Design**: The schema follows D1 best practices with proper foreign key constraints, migration management, and SQLite compatibility
- **Workers Architecture**: The proposed Hono-based API design leverages Cloudflare Workers effectively with proper bindings and routing
- **Durable Objects Integration**: The existing GenericAgent implementation correctly uses Durable Objects for stateful AI agent management
- **Migration Strategy**: Current migration approach using `wrangler d1 migrations` is the recommended Cloudflare pattern

---

### 1. D1 Schema Explainer

The database schema is designed to automate the process of job scraping, analysis, and applicant tracking. It can be broken down into four logical groups:

#### a. Job Scraping & Monitoring

This is the core of the application, responsible for discovering, tracking, and storing job posting data.

- **`sites`**: A list of company career sites to be scraped. Stores the base URL, discovery strategy (e.g., sitemap, crawl), and last discovery timestamp.
- **`search_configs`**: Stores saved search configurations, defining parameters like keywords, locations, and domains to include or exclude, which can be used to initiate targeted job scraping runs.
- **`jobs`**: The central table holding all discovered job postings. It stores every detail about a job, including title, company, description, salary, and status (`open`, `closed`). It has flags for enabling daily monitoring.
- **`snapshots`**: Creates a historical record of a job posting at a specific point in time. It stores the raw HTML/JSON content in R2 and a content hash to detect changes.
- **`changes`**: Logs detected differences between two snapshots of the same job, providing a summary of what changed (e.g., salary update, description modified).
- **`runs`**: A log of scraper and discovery process executions, tracking their status and statistics.
- **`job_tracking_history`**: A detailed log of daily checks on jobs, noting status changes or content modifications.
- **`job_market_stats`**: An aggregate table for daily statistics about the job market, such as new jobs found, top companies, and trending keywords.

#### b. Applicant & Career Management

This group manages the user's personal career information and their interaction with the discovered jobs.

- **`applicant_profiles`**: Stores the central profile for a user, including their name, contact info, target roles, and a summary of their skills and preferences.
- **`job_history`**: A detailed, structured log of an applicant's previous work experience.
- **`job_history_submissions`**: A temporary holding table for raw, unstructured job history text pasted by the user. An AI agent processes this data to populate the structured `job_history` table.
- **`job_ratings`**: Allows an applicant to rate discovered jobs based on various criteria (skill match, salary fit, etc.), creating a personalized job ranking.

#### c. Agent & Workflow Configuration

This group defines the configuration for the AI agents that power the system's intelligent features.

- **`agent_configs`**: Defines the properties of different AI agents (e.g., a "Resume Analyzer" or "Job Rater"), including their role, goal, LLM model, and system prompt.
- **`task_configs`**: Defines specific tasks that an agent can perform, such as "extract skills from resume" or "summarize job description." Each task is linked to an agent.
- **`workflow_configs`**: Defines a sequence of tasks to be executed in order to achieve a larger goal, creating a processing pipeline.

#### d. System & Notifications

This group handles system-level operations, metadata, and user notifications.

- **`email_configs`**: Configures email notification settings for users, such as frequency and content preferences.
- **`email_logs`**: Logs incoming emails that might contain job postings, tracking their processing status.
- **`scrape_queue`**: Queue management for job scraping operations, supporting both local and remote scraping sources.
- **`d1_migrations`**, **`sqlite_sequence`**, **`_cf_METADATA`**: Internal tables used by Cloudflare D1 and Wrangler to manage database migrations and metadata. They should not be directly manipulated by the application logic.

---

### 2. Mapping to TypeScript Modules

Here is how the database tables map to your existing TypeScript modules for CRUD (Create, Read, Update, Delete) operations.

#### a. Job Scraping & Monitoring

- **`src/lib/crawl.ts` & `src/lib/steel.ts`**: **Create** records in `sites` and `jobs`. **Create** `snapshots` during the scraping process.
- **`src/routes/steel-scraper.ts` & `src/routes/sites.ts`**: Provide the API endpoints to trigger the scraping logic in the library modules.
- **`src/routes/configs.ts`**: This existing module is the appropriate place to manage **CRUD** operations for the `search_configs` table.
- **`src/routes/jobs.ts`**: **Read** and **Update** records in the `jobs` table (e.g., listing jobs, enabling monitoring).
- **`src/lib/ai.ts`**: **Creates** records in the `changes` table by comparing snapshots and generating a semantic summary.
- **`src/routes/tracking.ts`**: **Creates** records in `job_tracking_history` and **Creates/Updates** `job_market_stats`.

#### b. Applicant & Career Management

- **`src/lib/talent.ts`**: This module should contain the core business logic to **Create, Read, Update, and Delete** records across `applicant_profiles`, `job_history`, and `job_ratings`.
- **`src/lib/ai.ts`**: **Reads** from `job_history_submissions`, processes the content, and provides the structured data needed to **Create** records in `job_history`.
- _(New Modules Proposed Below)_: Dedicated route files will be needed to expose this functionality.

#### c. Agent & Workflow Configuration

- **`src/routes/agent.ts`**, **`src/routes/agents.ts`**, **`src/routes/tasks.ts`**, **`src/routes/workflows.ts`**: These modules directly map to the configuration tables and are responsible for the full **CRUD** lifecycle of `agent_configs`, `task_configs`, and `workflow_configs`.

#### d. System & Notifications

- **`src/lib/email.ts`**: **Reads** `email_configs` to determine who to send emails to and **Creates** `email_logs` for tracking.
- **`src/routes/email.ts`**: Provides the API for managing `email_configs` and processing incoming emails.
- **`src/routes/scrape-queue.ts`**: Manages the **CRUD** operations for the `scrape_queue` table, handling job scraping queue management.
- **`src/lib/d1-utils.ts`**: Provides generic helper functions for interacting with the database but does not contain table-specific business logic.

---

### 3. Specification for New API Routes

To properly expose the applicant and career management functionality, you should create new, dedicated Hono route modules. This follows the "well-lit" API design pattern, making the API easy to discover and use.

#### a. New File: `src/routes/applicants.ts`

This module will manage the core applicant profile and their associated job history.

```typescript
// src/routes/applicants.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { talentService } from "../lib/talent"; // Assuming talent.ts exports a service object

export const applicants = new Hono();

// --- Schemas ---
const ApplicantProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  target_roles: z.string().optional(),
  // ... other fields
});

const JobHistoryEntrySchema = z.object({
  id: z.string(),
  job_title: z.string(),
  company_name: z.string(),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
  is_current: z.boolean().optional(),
  // ... other fields
});

// --- Routes ---

// GET /api/v1/applicants/:id - Get a single applicant's profile
applicants.get("/:id", async (c) => {
  const { id } = c.req.param();
  const profile = await talentService.getApplicantProfile(c.env.DB, id);
  return c.json(profile);
});

// PATCH /api/v1/applicants/:id - Update an applicant's profile
applicants.patch(
  "/:id",
  zValidator("json", ApplicantProfileSchema.partial()),
  async (c) => {
    const { id } = c.req.param();
    const updatedData = c.req.valid("json");
    const result = await talentService.updateApplicantProfile(
      c.env.DB,
      id,
      updatedData
    );
    return c.json(result);
  }
);

// POST /api/v1/applicants/:id/job-history/submissions - Submit raw text for processing
applicants.post(
  "/:id/job-history/submissions",
  zValidator("json", z.object({ raw_content: z.string() })),
  async (c) => {
    const { id } = c.req.param();
    const { raw_content } = c.req.valid("json");
    const submission = await talentService.submitJobHistory(
      c.env.DB,
      id,
      raw_content
    );
    // Optionally trigger the AI processing task asynchronously
    return c.json(submission, 202); // Accepted
  }
);

// GET /api/v1/applicants/:id/job-history - Get structured job history
applicants.get("/:id/job-history", async (c) => {
  const { id } = c.req.param();
  const history = await talentService.getJobHistory(c.env.DB, id);
  return c.json(history);
});
```

#### b. New File: `src/routes/ratings.ts`

This module will be dedicated to managing how an applicant rates different jobs.

```typescript
// src/routes/ratings.ts
import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { talentService } from "../lib/talent";

export const ratings = new Hono();

// --- Schemas ---
const JobRatingSchema = z.object({
  applicant_id: z.string(),
  job_id: z.string(),
  overall_score: z.number().min(1).max(10),
  skill_match_score: z.number().min(1).max(10).optional(),
  // ... other rating fields
  rating_summary: z.string().optional(),
});

// --- Routes ---

// GET /api/v1/ratings?applicant_id=:id - Get all ratings for an applicant
ratings.get(
  "/",
  zValidator("query", z.object({ applicant_id: z.string() })),
  async (c) => {
    const { applicant_id } = c.req.valid("query");
    const applicantRatings = await talentService.getRatingsForApplicant(
      c.env.DB,
      applicant_id
    );
    return c.json(applicantRatings);
  }
);

// POST /api/v1/ratings - Create or update a job rating
ratings.post("/", zValidator("json", JobRatingSchema), async (c) => {
  const ratingData = c.req.valid("json");
  const result = await talentService.rateJob(c.env.DB, ratingData);
  // This could trigger an AI agent to generate the summary and recommendations
  return c.json(result, 201);
});
```

---

## 4. Project Tasks & Implementation Roadmap

Based on the schema analysis and Cloudflare platform verification, the following tasks are required to complete the implementation:

### ✅ Completed Tasks

- [x] **D1 Schema Design**: Complete database schema with proper foreign key constraints
- [x] **Migration Management**: All migrations properly configured and applied
- [x] **Cloudflare Agents SDK Integration**: GenericAgent Durable Object implementation
- [x] **TypeScript Error Resolution**: All linting errors fixed across the codebase
- [x] **Agent Configuration Sync**: YAML configurations synced to D1 database

### 🔄 In Progress Tasks

- [ ] **API Route Implementation**: Complete the proposed applicant and rating API routes
- [ ] **Talent Service Module**: Implement the core business logic for applicant management

### 📋 Pending Tasks

#### High Priority

1. **Create `src/routes/applicants.ts`**
   - Implement CRUD operations for applicant profiles
   - Add job history management endpoints
   - Integrate with AI processing for job history submissions
   - Add proper error handling and validation

2. **Create `src/routes/ratings.ts`**
   - Implement job rating system
   - Add rating aggregation and analytics
   - Integrate with AI agents for automated rating suggestions

3. **Enhance `src/lib/talent.ts`**
   - Implement `talentService` with all required methods
   - Add data validation and sanitization
   - Implement caching strategies for performance

#### Medium Priority

4. **API Documentation**
   - Generate OpenAPI specification for new routes
   - Create interactive API documentation
   - Add request/response examples

5. **Testing Implementation**
   - Unit tests for new API routes
   - Integration tests for database operations
   - End-to-end tests for complete workflows

6. **Performance Optimization**
   - Implement database query optimization
   - Add caching layers where appropriate
   - Monitor and optimize API response times

#### Low Priority

7. **Advanced Features**
   - Real-time notifications for job matches
   - Advanced analytics and reporting
   - Bulk operations for data management

8. **Monitoring & Observability**
   - Add comprehensive logging
   - Implement metrics collection
   - Set up alerting for critical operations

### 🛠️ Technical Implementation Notes

#### Database Considerations

- **Foreign Key Constraints**: Ensure all foreign key relationships are properly maintained
- **Indexing Strategy**: Review and optimize database indexes for query performance
- **Data Migration**: Plan for any necessary data migration when adding new features

#### Cloudflare Platform Integration

- **Durable Objects**: Leverage existing GenericAgent for AI-powered features
- **R2 Storage**: Utilize R2 for file storage and content management
- **Workers AI**: Integrate with Cloudflare's AI models for enhanced functionality

#### Security & Validation

- **Input Validation**: Implement comprehensive input validation using Zod schemas
- **Authentication**: Add proper authentication and authorization mechanisms
- **Rate Limiting**: Implement rate limiting for API endpoints

### 📊 Success Metrics

- API response times < 200ms for 95% of requests
- Database query performance optimized with proper indexing
- 100% test coverage for critical business logic
- Zero TypeScript errors in production build
- Complete API documentation with examples

### 🚀 Deployment Strategy

1. **Development Environment**: Test all new features locally with `wrangler dev`
2. **Staging Deployment**: Deploy to staging environment for integration testing
3. **Production Deployment**: Gradual rollout with monitoring and rollback capability
4. **Post-Deployment**: Monitor performance and user feedback
