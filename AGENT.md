# 9to5-Scout: Multi-Agent Platform & Service API - AGENT.md

## Overview
The 9to5-Scout platform is a comprehensive AI-powered job discovery and career intelligence system built on Cloudflare's serverless primitives. This worker acts as the central API gateway and orchestration layer, exposing functionality for both **human users** (via the web app and CLI) and **AI Agents** (via CrewAI, LangGraph, or custom agent systems like the user's `colby` CLI).

## Tooling Notes
- `pnpm build` and `pnpm deploy` automatically install the latest Wrangler CLI via `pnpm dlx wrangler@latest`, ensuring `wrangler types` runs before every build.

### Core Architecture
| Component | Technology | Purpose |
| :--- | :--- | :--- |
| **Serverless Compute** | Cloudflare Worker | Request routing, scheduling, and core application logic. |
| **Stateful Coordination** | Durable Objects (`SiteCrawler`, `JobMonitor`, `ScrapeSocket`) | Highly consistent, globally unique instances for long-running tasks like site-specific crawling, individual job monitoring, and persistent WebSocket connections. |
| **Orchestration** | Cloudflare Workflows (`DiscoveryWorkflow`, `JobMonitorWorkflow`, `ChangeAnalysisWorkflow`) | Durable, multi-step, asynchronous execution for complex business logic (e.g., automated discovery runs, change analysis). |
| **Data Storage** | D1 Database (SQLite), KV, R2 | Primary relational storage, caching/metadata, and object storage for content artifacts (HTML/PDF/Markdown). |
| **Intelligent Processing** | Workers AI, Vectorize | AI-powered parsing, document generation, semantic search, and change assessment. |
| **External Interaction** | Browser Rendering, Email Routing | Headless browser automation for web scraping and native handling of inbound job alert emails. |

---

## Implemented API Endpoints (For Agentic Consumption)

All endpoints, except `/api/health` and scraper/log submission routes, require a **Bearer Token** (`Authorization: Bearer <token>`).

### 1. Job Discovery, Monitoring & Tracking
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/jobs` | List jobs with filtering (`status`, `source`, `limit`). |
| `GET` | `/api/jobs/{id}` | Get full job details by ID. |
| `GET` | `/api/jobs/{id}/tracking` | Get full job lifecycle history (snapshots, status changes). |
| `GET` | `/api/jobs/{id}/snapshots/{snapshotId}/content` | Retrieve preserved job content (HTML, PDF, Markdown, JSON, Screenshot) from R2 storage. |
| `PUT` | `/api/jobs/{id}/monitoring` | Update monitoring frequency and status for a job. |
| `GET` | `/api/jobs/monitoring-queue` | List open jobs currently due for a monitoring check. |
| `GET` | `/api/monitoring/status` | Get overall monitoring health metrics and recent market stats. |
| `POST` | `/api/monitoring/daily-run` | Manually trigger the core daily job monitoring process. |
| `POST` | `/api/runs/discovery` | Trigger the discovery workflow (launches `DiscoveryWorkflow`). |
| `POST` | `/api/runs/monitor` | Trigger the monitoring workflow (launches `JobMonitorWorkflow`). |

### 2. Multi-Agent System (Agents, Tasks, Workflows)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/agents` | List all available AI agent definitions (role, goal, LLM). |
| `POST` | `/api/agents` | Create a new specialized AI agent configuration. |
| `GET` | `/api/tasks` | List all defined tasks and their required agent/context dependencies. |
| `POST` | `/api/tasks` | Create a new task configuration. |
| `GET` | `/api/workflows` | List all defined multi-agent workflows (task sequences). |
| `POST` | `/api/workflows/{id}/execute` | **Execute** a registered workflow (e.g., `resume_optimization_workflow`) with input context. |
| `GET` | `/api/agent/query?q={query}` | Perform a semantic job search based on vector matching against job content embeddings. |

### 3. Career Intelligence & Document Generation
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/api/applicant/history` | Submit raw career history (text/markdown/json) for AI parsing and profile creation. |
| `GET` | `/api/applicant/{user_id}/history` | Get the applicant's full structured profile and history. |
| `POST` | `/api/applicant/job-rating` | Generate an AI-powered job fit rating (1-100 score) between a user and a specific job ID. |
| `POST` | `/api/cover-letter` | Generate personalized cover letter content tailored to a job description. |
| `POST` | `/api/resume` | Generate ATS-optimized resume summary/bullets tailored to a job description. |

### 4. External Scraper & Logging Integration (Unauthenticated)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/scraper/queue/pending` | Claim pending scrape jobs from the distributed queue. |
| `POST` | `/api/scraper/job-details` | Submit results from external scrapers (records details/updates queue status). |
| `GET` | `/api/scraper/monitored-jobs` | List open jobs that external scrapers should check for monitoring. |
| `POST` | `/api/logs` | Submit system and client logs to the database for centralized monitoring. |

---

## Multi-Agent System (D1 Configurations)

The system uses configuration stored in the D1 database to define agent behavior and task flow.

### Defined Agents (via `agent_configs` table)
| Agent ID | Role | LLM | Purpose |
| :--- | :--- | :--- | :--- |
| `resume_analyzer` | Resume & ATS Optimization Expert | `openai/gpt-4o-mini` | Analyzes resumes for ATS compatibility and identifies gaps. |
| `job_analyzer` | Deep Job Description Analyst | `openai/gpt-4o-mini` | Extracts all explicit and implicit job requirements. |
| `company_researcher` | Corporate Intelligence Specialist | `openai/gpt-4o-mini` | Gathers contextual company intelligence for tailoring. |
| `resume_writer` | Strategic Resume & Cover Letter Crafter | `openai/gpt-4o-mini` | Generates final, tailored resume and cover letter content. |
| `interview_strategist` | Personalized Interview Coach | `openai/gpt-4o-mini` | Develops full interview strategies and talking points. |
| `report_generator` | Job Application Dossier Architect | `openai/gpt-4o-mini` | Synthesizes all analysis into a final, cohesive report. |
| `career_historian` | Career Historian | `openai/gpt-4o-mini` | Synthesizes raw career data into structured achievements. |

### Defined Tasks (via `task_configs` table)
| Task ID | Agent | Context Dependencies | Purpose |
| :--- | :--- | :--- | :--- |
| `analyze_job_task` | `job_analyzer` | None | Analyze URL to extract job requirements and role details. |
| `extract_achievements_task` | `career_historian`| None | Synthesize career history into relevant achievements. |
| `optimize_resume_task` | `resume_analyzer` | `analyze_job_task`, `extract_achievements_task` | Identify optimization points for the resume based on job needs. |
| `research_company_task` | `company_researcher` | None | Gather company intelligence. |
| `generate_resume_task` | `resume_writer` | `optimize_resume_task`, `research_company_task` | Create the final tailored resume draft. |
| `generate_report_task` | `report_generator` | All prior tasks | Compile a final comprehensive job application report. |

---

## 2. Project Task Status Evaluation

The development project, **Job Scraper Backend Service**, is highly complete, focusing on implementing core infrastructure features using Cloudflare's platform capabilities.

| Milestone/Task ID | Title | Status in `project_tasks.json` | Implementation Status (Codebase Check) | Completion Notes |
| :--- | :--- | :--- | :--- | :--- |
| **`setup`** | **Project Setup and Configuration** | **In-Progress** | **Complete** | Monorepo structure, `wrangler.toml` bindings, `tsconfig.json`, and type generation are fully configured and functional for core services. |
| **`database`** | **Database Schema and Migrations** | **Pending** | **Complete** | All core schema changes (migrations 001-008) are implemented, covering jobs, monitoring, agents, workflows, job history, and logs/queues. |
| **`durable-objects`** | **Durable Objects Implementation** | **Pending** | **Complete** | `SiteCrawler`, `JobMonitor`, and `ScrapeSocket` are fully implemented in `src/index.ts` and configured in `wrangler.toml`. |
| **`workflows`** | **Workflow Implementation** | **Pending** | **Mostly Complete** | All three workflows (`DiscoveryWorkflow`, `JobMonitorWorkflow`, `ChangeAnalysisWorkflow`) are implemented in `src/index.ts` and successfully bound in `wrangler.toml`. |
| **`api-routes`** | **API Routes Implementation** | **Pending** | **Mostly Complete** | All new domain APIs (`/api/agent`, `/api/applicant`, `/api/email`, `/api/tasks`, `/api/workflows`) are implemented. **CRUD routes for `/api/sites` are still missing.** |
| **`discovery`** | **Discovery System** | **Pending** | **Mostly Complete** | Core logic for URL parsing, AI extraction, and duplicate detection (via Vectorize) is implemented in `src/lib/crawl.ts` and `src/lib/ai.ts`. |
| **`monitoring`** | **Monitoring System** | **Pending** | **Complete** | Change detection, smart scheduling (DO Alarms), and notification integration are fully implemented in `src/lib/monitoring.ts` and `src/routes/tracking.ts`. |
| **`change-analysis`** | **Change Analysis System** | **Pending** | **Complete** | The `ChangeAnalysisWorkflow` class implements AI-powered semantic change detection and reporting. |
| **`search-analytics`** | **Search and Analytics** | **Pending** | **Mostly Complete** | Vector search (`/api/agent/query`) and market stats (`/api/monitoring/status`) are implemented. **Data export (CSV/JSON) is still pending.** |
| **`email-routing`** | **Email Routing and Notifications** | **Pending** | **Complete** | The `email` handler, link extraction, digest generation, and log tracking are implemented in `src/index.ts` and `src/routes/email.ts`. |
| **`testing`** | **Testing Implementation** | **Pending** | **Pending** | No test files (`.test.ts`) or dedicated testing framework (`Vitest` or `jest`) found. This milestone is entirely pending implementation. |
| **`documentation`**| **Documentation and Finalization** | **Pending** | **Mostly Complete** | The project includes comprehensive documentation files (`README.md`, `DEPLOYMENT.md`, `openapi.json`, HTML pages) covering all major features. |
