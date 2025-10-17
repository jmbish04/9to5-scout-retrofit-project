# 9to5 Scout AI Agent Guidelines

This document provides comprehensive guidelines and architectural context for the AI agent working on the 9to5 Scout project. Your primary goal is to build and enhance a sophisticated, AI-powered assistant for job applicants by strictly adhering to the established architecture and conventions outlined below.

## Core Mission

Automate and enhance the job application process by:
1.  **Intelligently Scraping Job Postings:** Use the Browser Rendering API to handle dynamic, JavaScript-heavy job sites, including those requiring interaction or authentication.
2.  **Generating Tailored Application Materials:** Leverage Workers AI to draft high-quality, customized resumes and cover letters tailored to each job description.
3.  **Providing Actionable Insights:** Analyze job postings to extract key skills, potential interview questions, and insights into company culture.
4.  **Maintaining Applicant Profiles:** Securely manage an applicant's career history, skills, and preferences in the D1 database.

## Established Architecture & Key Technologies

This is a Cloudflare Workers project. All development must align with the following architecture.

-   **`AI` (Workers AI):** The foundation for all generative and analytical tasks.
    -   **Model:** `@cf/meta/llama-3.1-8b-instruct` is the standard for this project.
    -   **Usage:** For all structured data extraction (job details, analysis), you **must** use the `guided_json` parameter to ensure reliable, schema-adherent output. Refer to existing implementations in `src/index.ts` and `agents/cover_letter_agent.ts`.

-   **`DB` (D1 Database):** The single source of truth for all structured data. Adhere strictly to the established schema.
    -   **Schema:** See the **Core Database Schema** section below. All database interactions must be compatible with this schema.

-   **`MYBROWSER` (Browser Rendering):** The primary tool for web scraping. It is essential for accessing fully-rendered HTML from dynamic sites. Do not rely on simple `fetch` for job content.

-   **`VECTORIZE_INDEX` (Vectorize):** Used for semantic search and similarity matching.
    -   **Usage:** Generate embeddings for job descriptions and user skills. Use vector queries to find the most relevant skills from a user's profile for a given job.

-   **Durable Objects (`SiteCrawler`, `JobMonitor`):** These are stateful coordinators.
    -   `SiteCrawler`: Manages all scraping operations for a specific target site. Handles session state, cookies, and rate-limiting.
    -   `JobMonitor`: Tracks the lifecycle of a single job posting. Manages scheduled checks to detect changes or closures.

-   **Workflows (`DiscoveryWorkflow`, `JobMonitorWorkflow`, `ChangeAnalysisWorkflow`):** Orchestrate long-running, multi-step processes.
    -   `DiscoveryWorkflow`: Manages the end-to-end process of finding new jobs on a site.
    -   `JobMonitorWorkflow`: Periodically checks a list of open jobs for changes.
    -   `ChangeAnalysisWorkflow`: Analyzes the differences between two versions of a job posting.

-   **`R2` & `KV`:** Used for storing unstructured data and configuration.
    -   **R2:** Store large artifacts like HTML snapshots, screenshots, and generated PDFs of job postings.
    -   **KV:** Use for configuration data, session tokens, or temporary state that requires fast reads.

## API Conventions

The backend exposes a RESTful API. Endpoints should be structured logically by resource. Adhere to the existing patterns in the `/src/routes/` directory.

-   **Sites:** `GET /api/sites`, `POST /api/sites`, `GET /api/sites/:id`
-   **Jobs:** `GET /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs/:id/monitor`
-   **Discovery & Monitoring:** `POST /api/discovery/:siteId`, `GET /api/monitor/:jobId/status`
-   **Search:** `GET /api/search?q=query`

## Core Database Schema

All D1 database operations **must** conform to the following table structures. Do not alter these schemas without a documented migration plan.

```sql
-- Stores information about the websites to be scraped.
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  base_url TEXT NOT NULL,
  robots_txt TEXT,
  sitemap_url TEXT,
  discovery_strategy TEXT CHECK(discovery_strategy IN ('sitemap', 'list', 'search', 'custom')),
  last_discovered_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Stores details of individual job postings.
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  site_id TEXT NOT NULL,
  url TEXT NOT NULL,
  title TEXT,
  company TEXT,
  location TEXT,
  salary_min REAL,
  salary_max REAL,
  description TEXT,
  status TEXT CHECK(status IN ('open', 'closed', 'expired')),
  tags TEXT, -- JSON array
  posted_at DATETIME,
  first_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_crawled_at DATETIME,
  last_changed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (site_id) REFERENCES sites(id)
);

-- Logs significant changes to job postings over time.
CREATE TABLE job_changes (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  change_type TEXT,
  old_value TEXT,
  new_value TEXT,
  significance_score REAL,
  ai_summary TEXT,
  detected_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (job_id) REFERENCES jobs(id)
);
```

## Agentic Behavior & Development Guidelines

-   **Proactive Task Chaining:** A task is not complete after a single action. For example, when scraping a new job, the full process includes:
    1.  Scraping the job data via `SiteCrawler`.
    2.  Saving the job to the `jobs` table in D1.
    3.  Creating a content snapshot in R2.
    4.  Generating and storing vector embeddings in `VECTORIZE_INDEX`.
    5.  Initiating monitoring via the `JobMonitor` Durable Object.
-   **Resourcefulness:** Utilize the full capabilities of the Cloudflare Developer Platform as outlined in the architecture. Use the right tool for the job (e.g., R2 for large blobs, D1 for structured data, Queues for decoupling tasks).
-   **Structured AI Interaction:** Always use `guided_json` when calling `env.AI` for data extraction or analysis to ensure predictable, machine-readable outputs.
-   **Security First:** Treat all user-provided data (resumes, career summaries) as sensitive. Ensure all data access is secure and follows the principle of least privilege.

## Primary LLM Context & Verification

For comprehensive information on building AI Agents on the Cloudflare platform, refer to the detailed documentation located at:
-   `.agents/llms/agents-llms-full.txt` (Primary)

**Mandatory Verification Protocol:**
When implementing any feature related to the Cloudflare Workers platform (including but not limited to Durable Objects, Browser Rendering, R2, D1, KV, Queues, etc.), you **must** verify your approach using your available tools.

If your confidence level in the specific implementation nuance is **less than 85%**, you are required to use the `search_cloudflare_documentation` tool to search the official Cloudflare documentation. This ensures accuracy and adherence to the latest best practices, preventing errors and rework.

## Code Style and Documentation

All code generated or modified by you **must** strictly adhere to the standards defined in the project's official style guide. This guide prioritizes clarity, comprehensive documentation, and maintainability for a collaborative AI and human development environment.

**Before writing any code, you must consult and follow the rules in this file:**
-   **`.agents/STYLE_GUIDE.md`**

Failure to adhere to the documentation and commenting standards outlined in the style guide will be considered a deviation from the core requirements.