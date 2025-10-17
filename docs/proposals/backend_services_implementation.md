# Proposal: Backend Services Implementation for Interview Prep and Market Pulse Features

This document outlines the detailed implementation plan for the "Interview Prep" and "Market Pulse" features, focusing on Cloudflare Workers, D1 Database, Hono Router, and Workers AI. It covers database schema definitions, API endpoint specifications, Zod schemas for type safety, and the logic for a scheduled worker.

---

## 1. Interview Prep Feature Implementation

This feature will allow users to manage interview stages, track contacts, and generate AI-powered interview questions for specific job applications.

### 1.1. Database Schema (D1 Migrations)

We will create two new tables in our D1 database to store interview-related data. These will be defined in new migration files (e.g., `009_interview_prep.sql`).

**`interview_stages` Table:**

```sql
CREATE TABLE IF NOT EXISTS interview_stages (
    id TEXT PRIMARY KEY NOT NULL,
    job_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    stage_name TEXT NOT NULL, -- e.g., "Recruiter Screen", "On-site", "Technical Interview"
    date TEXT NOT NULL, -- ISO 8601 format (YYYY-MM-DDTHH:MM:SSZ)
    status TEXT NOT NULL, -- e.g., "Scheduled", "Completed", "Canceled"
    notes TEXT, -- Optional notes for the stage
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_stages_job_id ON interview_stages (job_id);
CREATE INDEX IF NOT EXISTS idx_interview_stages_user_id ON interview_stages (user_id);
```

**`interview_contacts` Table:**

```sql
CREATE TABLE IF NOT EXISTS interview_contacts (
    id TEXT PRIMARY KEY NOT NULL,
    job_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    notes TEXT, -- Optional notes about the contact
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_interview_contacts_job_id ON interview_contacts (job_id);
CREATE INDEX IF NOT EXISTS idx_interview_contacts_user_id ON interview_contacts (user_id);
```

### 1.2. API Endpoints (Hono Router)

These endpoints will be added to a new Hono router file (e.g., `src/routes/interviews.ts`) and integrated into the main `src/index.ts` application. All endpoints will require authentication.

**Authentication Middleware (Example - assuming existing `auth` middleware):**

```typescript
// src/lib/auth.ts (example middleware)
import { Context, Next } from 'hono';

export async function authMiddleware(c: Context, next: Next) {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized' }, 401);
    }
    const token = authHeader.split(' ')[1];
    // In a real scenario, validate the token against a user store or JWT service
    if (token !== c.env.WORKER_API_KEY) { // Simple token check for proposal
        return c.json({ error: 'Invalid token' }, 401);
    }
    // Attach user_id from token if available, for now, a placeholder
    c.set('user_id', 'demo-user-123'); // Placeholder user ID
    await next();
}
```

**`GET /api/jobs/{jobId}/interviews` - List Interview Stages and Contacts**

*   **Description:** Retrieves all interview stages and associated contacts for a specific job ID and the authenticated user.
*   **Route:** `app.get('/api/jobs/:jobId/interviews', authMiddleware, async (c) => { ... });`
*   **Logic:**
    1.  Extract `jobId` from path parameters and `user_id` from context.
    2.  Query `interview_stages` table for `job_id` and `user_id`.
    3.  Query `interview_contacts` table for `job_id` and `user_id`.
    4.  Return a combined JSON object containing both lists.

**`POST /api/jobs/{jobId}/interviews` - Create a New Interview Stage**

*   **Description:** Creates a new interview stage for a specific job and user.
*   **Route:** `app.post('/api/jobs/:jobId/interviews', authMiddleware, async (c) => { ... });`
*   **Logic:**
    1.  Extract `jobId` from path parameters and `user_id` from context.
    2.  Validate request body against `CreateInterviewStageSchema`.
    3.  Generate a unique `id` for the new stage.
    4.  Insert the new stage into the `interview_stages` table.
    5.  Return the created stage.

**`POST /api/jobs/{jobId}/interviews/contacts` - Add a New Contact**

*   **Description:** Adds a new contact person related to the interview process for a specific job and user.
*   **Route:** `app.post('/api/jobs/:jobId/interviews/contacts', authMiddleware, async (c) => { ... });`
*   **Logic:**
    1.  Extract `jobId` from path parameters and `user_id` from context.
    2.  Validate request body against `CreateInterviewContactSchema`.
    3.  Generate a unique `id` for the new contact.
    4.  Insert the new contact into the `interview_contacts` table.
    5.  Return the created contact.

**`POST /api/jobs/{jobId}/interviews/generate-questions` - AI-Powered Question Generation**

*   **Description:** Generates interview questions (behavioral and technical) based on the job description using Workers AI.
*   **Route:** `app.post('/api/jobs/:jobId/interviews/generate-questions', authMiddleware, async (c) => { ... });`
*   **Logic:**
    1.  Extract `jobId` from path parameters and `user_id` from context.
    2.  Fetch the job details (especially `job_title`, `company_name`, `job_description`) from the `jobs` table using `jobId`.
    3.  Construct a prompt for Workers AI:
        ```
        "Based on this job description for a [Job Title] at [Company], generate 5 behavioral and 5 technical interview questions. Format the output as a JSON object with two keys: 'behavioral_questions' and 'technical_questions', each containing an array of strings." 
        ```
    4.  Call `c.env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages: [...], response_format: { type: 'json_object', schema: ... } })`.
    5.  Return the AI-generated questions.

### 1.3. Zod Schemas

These schemas will ensure type safety for API requests and responses. They will be defined in a shared validation file (e.g., `src/lib/validation.ts` or a new `src/types/interview.ts`).

```typescript
// src/types/interview.ts (example)
import { z } from 'zod';

// Schemas for Interview Stages
export const InterviewStageSchema = z.object({
    id: z.string(),
    job_id: z.string(),
    user_id: z.string(),
    stage_name: z.string(),
    date: z.string().datetime(),
    status: z.enum(['Scheduled', 'Completed', 'Canceled', 'Pending']),
    notes: z.string().optional().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export const CreateInterviewStageSchema = z.object({
    stage_name: z.string(),
    date: z.string().datetime(),
    status: z.enum(['Scheduled', 'Completed', 'Canceled', 'Pending']).default('Scheduled'),
    notes: z.string().optional().nullable(),
});

// Schemas for Interview Contacts
export const InterviewContactSchema = z.object({
    id: z.string(),
    job_id: z.string(),
    user_id: z.string(),
    name: z.string(),
    title: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    linkedin_url: z.string().url().optional().nullable(),
    notes: z.string().optional().nullable(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export const CreateInterviewContactSchema = z.object({
    name: z.string(),
    title: z.string().optional().nullable(),
    email: z.string().email().optional().nullable(),
    phone: z.string().optional().nullable(),
    linkedin_url: z.string().url().optional().nullable(),
    notes: z.string().optional().nullable(),
});

// Schema for AI-generated questions response
export const GeneratedQuestionsSchema = z.object({
    behavioral_questions: z.array(z.string()),
    technical_questions: z.array(z.string()),
});

// Combined response for GET /api/jobs/{jobId}/interviews
export const JobInterviewsResponseSchema = z.object({
    stages: z.array(InterviewStageSchema),
    contacts: z.array(InterviewContactSchema),
});
```

---

## 2. Market Pulse Feature Implementation

This feature will provide aggregated job market statistics, including salary trends and in-demand skills, based on the jobs discovered by the platform.

### 2.1. Database Schema (D1 Migrations)

We will create a new table to store aggregated market statistics. This will be defined in a new migration file (e.g., `010_market_stats.sql`).

**`market_stats` Table:**

```sql
CREATE TABLE IF NOT EXISTS market_stats (
    id TEXT PRIMARY KEY NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD format, represents the date of aggregation
    role TEXT NOT NULL, -- e.g., "AI Engineer", "Software Developer"
    location TEXT NOT NULL, -- e.g., "San Francisco, CA", "Remote"
    avg_salary_min INTEGER,
    avg_salary_max INTEGER,
    top_skills TEXT, -- JSON array of strings, e.g., '["Python", "TensorFlow"]',
    job_count INTEGER NOT NULL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
    UNIQUE (date, role, location) -- Ensure unique stats per day, role, location
);

CREATE INDEX IF NOT EXISTS idx_market_stats_date_role_location ON market_stats (date, role, location);
CREATE INDEX IF NOT EXISTS idx_market_stats_role_location ON market_stats (role, location);
```

### 2.2. Scheduled Worker

A new scheduled worker will be responsible for periodically aggregating data from the `jobs` table and updating the `market_stats` table. This will be configured in `wrangler.toml` and implemented in a new worker file (e.g., `src/workers/market-aggregator.ts`).

**`wrangler.toml` Configuration:**

```toml
# wrangler.toml

# ... existing configurations ...

[[r2_buckets]]
binding = "R2_MARKET_STATS_CACHE"
bucket_name = "market-stats-cache" # Optional: for caching large market data responses

[[triggers]]
crons = [ "0 0 * * *" ] # Run daily at midnight UTC
```

**Worker Logic (`src/workers/market-aggregator.ts`):**

```typescript
// src/workers/market-aggregator.ts
import { Env } from '../types'; // Assuming Env type includes DB and AI bindings

interface Job {
    id: string;
    title: string;
    company: string;
    location: string;
    salary_min: number | null;
    salary_max: number | null;
    description: string; // Assuming job description is available
    // ... other job fields
}

export default {
    async scheduled(event: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
        console.log('Running market data aggregation...');
        const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        try {
            // 1. Query active jobs from the 'jobs' table
            const { results: activeJobs } = await env.DB.prepare(
                'SELECT id, title, company, location, salary_min, salary_max, description FROM jobs WHERE status = ?'
            ).bind('active').all<Job>();

            if (!activeJobs || activeJobs.length === 0) {
                console.log('No active jobs found for aggregation.');
                return;
            }

            // 2. Group jobs by role (simplified from title) and location
            const aggregatedData: { [key: string]: { jobs: Job[], totalSalaryMin: number, totalSalaryMax: number, skillCounts: { [skill: string]: number } } } = {};

            for (const job of activeJobs) {
                // Simple role extraction - can be enhanced with AI/NLP
                const role = job.title.includes('AI Engineer') ? 'AI Engineer' : job.title.includes('Software Engineer') ? 'Software Engineer' : 'Other';
                const location = job.location || 'Remote';
                const key = `${role}-${location}`;

                if (!aggregatedData[key]) {
                    aggregatedData[key] = { jobs: [], totalSalaryMin: 0, totalSalaryMax: 0, skillCounts: {} };
                }
                aggregatedData[key].jobs.push(job);
                aggregatedData[key].totalSalaryMin += job.salary_min || 0;
                aggregatedData[key].totalSalaryMax += job.salary_max || 0;

                // Basic skill extraction from description (can be enhanced with AI)
                const skills = extractSkillsFromDescription(job.description); // Helper function needed
                for (const skill of skills) {
                    aggregatedData[key].skillCounts[skill] = (aggregatedData[key].skillCounts[skill] || 0) + 1;
                }
            }

            // 3. Calculate averages and top skills, then insert/update market_stats
            for (const key in aggregatedData) {
                const { jobs, totalSalaryMin, totalSalaryMax, skillCounts } = aggregatedData[key];
                const [role, location] = key.split('-');
                const jobCount = jobs.length;

                const avgSalaryMin = jobCount > 0 ? Math.round(totalSalaryMin / jobCount) : null;
                const avgSalaryMax = jobCount > 0 ? Math.round(totalSalaryMax / jobCount) : null;

                // Get top N skills
                const sortedSkills = Object.entries(skillCounts).sort(([, countA], [, countB]) => countB - countA);
                const topSkills = sortedSkills.slice(0, 5).map(([skill]) => skill); // Top 5 skills

                const marketStatId = `${today}-${role.replace(/\s/g, '-')}-${location.replace(/\s/g, '-')}`;

                await env.DB.prepare(
                    `INSERT INTO market_stats (id, date, role, location, avg_salary_min, avg_salary_max, top_skills, job_count, created_at, updated_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                     ON CONFLICT(date, role, location) DO UPDATE SET
                        avg_salary_min = EXCLUDED.avg_salary_min,
                        avg_salary_max = EXCLUDED.avg_salary_max,
                        top_skills = EXCLUDED.top_skills,
                        job_count = EXCLUDED.job_count,
                        updated_at = CURRENT_TIMESTAMP`
                ).bind(
                    marketStatId,
                    today,
                    role,
                    location,
                    avgSalaryMin,
                    avgSalaryMax,
                    JSON.stringify(topSkills),
                    jobCount
                ).run();
                console.log(`Aggregated market stats for ${role} in ${location}: ${jobCount} jobs.`);
            }

            console.log('Market data aggregation completed successfully.');

        } catch (error) {
            console.error('Error during market data aggregation:', error);
        }
    },
};

// Helper function for basic skill extraction (can be replaced by AI/NLP)
function extractSkillsFromDescription(description: string): string[] {
    const commonSkills = ['Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'AWS', 'GCP', 'Azure', 'Kubernetes', 'Docker', 'SQL', 'NoSQL', 'Machine Learning', 'AI', 'Data Science', 'Microservices', 'API', 'Git'];
    const foundSkills: Set<string> = new Set();
    const lowerDescription = description.toLowerCase();

    for (const skill of commonSkills) {
        if (lowerDescription.includes(skill.toLowerCase())) {
            foundSkills.add(skill);
        }
    }
    return Array.from(foundSkills);
}
```

### 2.3. API Endpoints (Hono Router)

These endpoints will be added to a new Hono router file (e.g., `src/routes/market.ts`) and integrated into the main `src/index.ts` application. They will also require authentication.

**`GET /api/market/trends` - Get Salary Trends**

*   **Description:** Returns a time-series of market statistics (e.g., average salaries) for a given role and location over a period.
*   **Route:** `app.get('/api/market/trends', authMiddleware, async (c) => { ... });`
*   **Logic:**
    1.  Extract `role` and `location` from query parameters.
    2.  Query `market_stats` table, filtering by `role` and `location`, and ordering by `date`.
    3.  Return the time-series data.

**`GET /api/market/skills` - Get In-Demand Skills**

*   **Description:** Returns the latest list of top skills for a given role and location.
*   **Route:** `app.get('/api/market/skills', authMiddleware, async (c) => { ... });`
*   **Logic:**
    1.  Extract `role` and `location` from query parameters.
    2.  Query `market_stats` table for the latest entry (by `date`) matching `role` and `location`.
    3.  Parse and return the `top_skills` JSON array.

### 2.4. Zod Schemas

These schemas will ensure type safety for API requests and responses. They will be defined in a shared validation file (e.g., `src/types/market.ts`).

```typescript
// src/types/market.ts (example)
import { z } from 'zod';

export const MarketStatSchema = z.object({
    id: z.string(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
    role: z.string(),
    location: z.string(),
    avg_salary_min: z.number().int().nullable(),
    avg_salary_max: z.number().int().nullable(),
    top_skills: z.string().transform(val => JSON.parse(val) as string[]), // Stored as JSON string
    job_count: z.number().int(),
    created_at: z.string().datetime(),
    updated_at: z.string().datetime(),
});

export const MarketTrendsResponseSchema = z.array(MarketStatSchema);

export const MarketSkillsResponseSchema = z.array(z.string()); // Array of skill strings
```

---

## 3. Shared Considerations

### 3.1. `wrangler.toml` Updates

Ensure the following are present in `wrangler.toml`:

*   **D1 Binding:** `DB` binding for your D1 database.
*   **Workers AI Binding:** `AI` binding for Workers AI.
*   **R2 Binding (Optional for Market Pulse Cache):** `R2_MARKET_STATS_CACHE` if you choose to cache market data.
*   **Cron Trigger:** For the `market-aggregator` worker.

```toml
# wrangler.toml

# ... existing configurations ...

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "JOB_SCRAPER_DB"
database_id = "your-d1-database-id"

# Workers AI binding
[ai]
binding = "AI"

# Optional R2 binding for market stats cache
[[r2_buckets]]
binding = "R2_MARKET_STATS_CACHE"
bucket_name = "market-stats-cache"

# Cron trigger for market data aggregation worker
# This assumes your main worker handles scheduled events, or you define a separate worker.
# If a separate worker, it needs its own entry in wrangler.toml
# For this proposal, we assume the main worker handles it.
# If a separate worker, it would look like:
# [[workers]]
# name = "market-aggregator-worker"
# main = "src/workers/market-aggregator.ts"
# compatibility_date = "2024-01-01"
# bindings = [
#   { name = "DB", d1_database_id = "your-d1-database-id" },
#   { name = "R2_MARKET_STATS_CACHE", r2_bucket_id = "your-r2-bucket-id" }
# ]
# [[workers.triggers]]
# crons = [ "0 0 * * *" ]

# If the main worker handles it, add cron to the main worker's triggers
# For the main worker (e.g., src/index.ts):
# [[triggers]]
# crons = [ "0 0 * * *" ]
```

### 3.2. Hono Router Integration

Create new router files (`src/routes/interviews.ts`, `src/routes/market.ts`) and import them into `src/index.ts`.

```typescript
// src/index.ts (example)
import { Hono } from 'hono';
import { Env } from './types';
import { authMiddleware } from './lib/auth';

// Import new routers
import { interviewRouter } from './routes/interviews';
import { marketRouter } from './routes/market';

const app = new Hono<Env>();

// ... existing routes ...

// Register new routers
app.route('/api/jobs', interviewRouter); // Interview routes nested under /api/jobs
app.route('/api/market', marketRouter);

// Handle scheduled events for market aggregation if in main worker
app.get('/__scheduled', async (c) => {
    // Call the market aggregation logic here
    // await marketAggregator.scheduled(c.event, c.env, c.executionCtx);
    return c.text('Scheduled event handled');
});

export default app;
```

### 3.3. Error Handling

Implement robust error handling using Hono's built-in error handling or custom middleware to return consistent error responses (e.g., 400 Bad Request, 401 Unauthorized, 404 Not Found, 500 Internal Server Error).

---

## 4. Next Steps

1.  **Create D1 Migration Files:** Generate and apply the SQL migration files for `interview_stages`, `interview_contacts`, and `market_stats`.
2.  **Implement Hono Routers:** Develop `src/routes/interviews.ts` and `src/routes/market.ts` with the specified API endpoints and Zod validation.
3.  **Implement Market Aggregation Worker:** Create `src/workers/market-aggregator.ts` (or integrate into main worker) with the aggregation logic.
4.  **Update `wrangler.toml`:** Add necessary bindings and cron triggers.
5.  **Integrate Zod Schemas:** Ensure all API endpoints use the defined Zod schemas for request validation and response typing.
6.  **Testing:** Develop comprehensive unit and integration tests for all new endpoints and the scheduled worker.
7.  **Frontend Integration:** Connect the frontend components (from `prd.html` and other pages) to these new backend APIs.
