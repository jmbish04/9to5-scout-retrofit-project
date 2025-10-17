# 9to5 Scout AI Agent Guidelines

This document provides comprehensive guidelines and architectural context for the AI agent working on the 9to5 Scout project. Your primary goal is to build and enhance a sophisticated, AI-powered assistant for job applicants by strictly adhering to the established architecture and conventions outlined below.

## 🚨 MANDATORY PROJECT RULES

**CRITICAL:** All AI agents working on this project MUST follow the mandatory rules defined in `.cursor/rules/`. These rules are automatically enforced by Cursor and take precedence over this document.

### Rule Documentation

- **Complete Rules Reference**: See `.cursor/RULES.md` for comprehensive documentation
- **Rule Files**: Located in `.cursor/rules/` directory (`.mdc` format)
- **Automatic Enforcement**: Rules are applied automatically based on file context

### Key Mandatory Rules Summary:

- **Package Management**: Use `pnpm` exclusively (never `npm` or `yarn`)
- **AI Model Typing**: Never use `any` types, always use environment variables
- **TypeScript**: Generate proper types with `pnpm exec wrangler types`
- **Architecture**: Follow Cloudflare Workers service usage patterns
- **Database**: Adhere to established schema, no unauthorized changes
- **Security**: Implement proper validation, never commit secrets
- **Code Quality**: Include proper error handling, logging, and documentation

**⚠️ VIOLATION CONSEQUENCES:** Any violation of these mandatory rules will result in immediate code rejection and must be corrected before proceeding.

## Core Mission

Automate and enhance the job application process by:

1.  **Intelligently Scraping Job Postings:** Use the Browser Rendering API to handle dynamic, JavaScript-heavy job sites, including those requiring interaction or authentication.
2.  **Generating Tailored Application Materials:** Leverage Workers AI to draft high-quality, customized resumes and cover letters tailored to each job description.
3.  **Providing Actionable Insights:** Analyze job postings to extract key skills, potential interview questions, and insights into company culture.
4.  **Maintaining Applicant Profiles:** Securely manage an applicant's career history, skills, and preferences in the D1 database.

## Package Management

**IMPORTANT:** This project uses **pnpm** exclusively for package management. Never use `npm` or `yarn` commands. Always use `pnpm` for:

- Installing dependencies: `pnpm install`
- Adding new packages: `pnpm add <package-name>`
- Running scripts: `pnpm run <script-name>`
- Updating packages: `pnpm update`

## Browser Rendering & Web Scraping Configuration

**CRITICAL:** When working with Playwright or browser automation in Cloudflare Workers, follow these specific configuration requirements:

### Playwright Configuration

- **NEVER** use the `external` field in `[build]` section for Playwright
- **ALWAYS** use `@cloudflare/playwright` package (not the standard Playwright)
- **ALWAYS** configure browser binding in `wrangler.toml`:
  ```toml
  compatibility_flags = ["nodejs_compat"]
  browser = { binding = "MYBROWSER" }
  ```
- **ALWAYS** use the browser binding in code with proper TypeScript typing:

  ```typescript
  import { chromium } from "@cloudflare/playwright";

  interface Env {
    MYBROWSER: Fetcher; // Correct browser binding type
  }

  const browser = await chromium.launch(env.MYBROWSER);
  ```

### Steel Scraper Configuration

- **NEVER** use the `external` field in `[build]` section for Steel SDK
- Steel SDK should be installed as a regular dependency and bundled normally
- If Steel SDK requires special handling, use proper import/export patterns, not external dependencies

### Incorrect Configuration (DO NOT USE)

```toml
# WRONG - This approach is incorrect for Cloudflare Workers
[build]
external = ["playwright", "steel-sdk"]
```

### Correct Configuration

```toml
# CORRECT - Use browser binding and regular dependencies
compatibility_flags = ["nodejs_compat"]
browser = { binding = "MYBROWSER" }
# No [build] section with external dependencies needed
```

### TypeScript Type Generation

**IMPORTANT:** Always generate proper TypeScript types for your bindings:

```bash
# Generate types based on your wrangler.toml configuration
pnpm exec wrangler types
```

This will create a `worker-configuration.d.ts` file with properly typed bindings, including `MYBROWSER: Fetcher` for the browser binding. Never use `any` types for bindings - always use the generated types.

## AI Model Typing

**CRITICAL:** When working with Workers AI models, follow these specific typing requirements to avoid sloppy `any` types:

### Proper AI Model Typing

- **NEVER** use `any` type for AI model parameters
- **ALWAYS** use `keyof AiModels` type for model parameters
- **ALWAYS** use environment variables for model selection when possible

### Correct AI Model Usage

```typescript
// CORRECT - Use proper typing with generated types
const response = await env.AI.run(
  env.DEFAULT_MODEL_WEB_BROWSER as keyof AiModels,
  {
    messages: [{ role: "user", content: "Hello" }],
  }
);
```

### Incorrect AI Model Usage (DO NOT USE)

```typescript
// WRONG - Sloppy any types
const response = await env.AI.run(
  env.DEFAULT_MODEL_WEB_BROWSER as any, // ❌ Never use any
  {
    messages: [{ role: "user", content: "Hello" }],
  }
);

// WRONG - Hardcoded model names
const response = await env.AI.run(
  "@cf/meta/llama-3.1-8b-instruct" as any, // ❌ Hardcoded and any
  {
    messages: [{ role: "user", content: "Hello" }],
  }
);
```

### Type Safety Benefits

Using `keyof AiModels` provides:

- **Compile-time validation** of model names
- **Auto-completion** in your editor
- **Type safety** for AI model parameters
- **Better developer experience** with proper IntelliSense

### Environment Variable Configuration

Always use environment variables for model selection. Use different models for different types of tasks:

```typescript
// In wrangler.toml or environment
DEFAULT_MODEL_WEB_BROWSER = "@cf/meta/llama-3.1-8b-instruct"; // For browser/web scraping tasks
DEFAULT_MODEL_REASONING = "@cf/meta/llama-3.1-8b-instruct"; // For strong reasoning tasks
EMBEDDING_MODEL = "@cf/baai/bge-large-en-v1.5"; // For embeddings

// In code - Use appropriate model for the task type
const response = await env.AI.run(
  env.DEFAULT_MODEL_WEB_BROWSER as keyof AiModels, // For web scraping
  inputs
);

const reasoningResponse = await env.AI.run(
  env.DEFAULT_MODEL_REASONING as keyof AiModels, // For reasoning tasks
  { messages: [{ role: "user", content: prompt }] }
);
```

### Model Selection Guidelines

- **`DEFAULT_MODEL_WEB_BROWSER`**: Use for web scraping, content extraction, and browser-related AI tasks
- **`DEFAULT_MODEL_REASONING`**: Use for complex reasoning tasks like:
  - Job fit analysis
  - Career history processing
  - Cover letter generation
  - Resume generation
  - Change analysis and summarization
- **`EMBEDDING_MODEL`**: Use for generating vector embeddings for semantic search

This approach ensures maintainability, type safety, and prevents the use of sloppy `any` types throughout the codebase.

## Frontend Architecture & Styling Guidelines

**CRITICAL:** This project uses Cloudflare Workers with static assets, NOT Cloudflare Pages. All frontend files are served from the `public/` directory.

### **NEVER USE CLOUDFLARE PAGES**

- **WRONG**: This project does NOT use Cloudflare Pages
- **WRONG**: Do not suggest Pages deployment or configuration
- **WRONG**: Do not use Pages-specific features or APIs
- **CORRECT**: This is a Cloudflare Workers project with static assets served from the `public/` directory

### **Static Assets Architecture**

- **Location**: All frontend files are in the `public/` directory
- **Serving**: Cloudflare Workers serves static assets via `env.ASSETS.fetch(request)`
- **Configuration**: Defined in `wrangler.toml` under `[assets]` section
- **No Build Process**: Static HTML, CSS, JS files served directly

### **MANDATORY STYLING REQUIREMENTS**

#### **Tailwind CSS CDN - NEVER REMOVE**

- **CRITICAL**: Every HTML page MUST include Tailwind CSS CDN
- **Required Script**: `<script src="https://cdn.tailwindcss.com"></script>`
- **Location**: Must be in `<head>` section after `<title>` tag
- **NEVER REMOVE**: This is essential for proper styling

#### **Correct HTML Head Structure**

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Page Title - 9to5-Scout</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="icon" href="/assets/icon.png" type="image/png" />
</head>
```

### **SHARED NAVIGATION SYSTEM**

#### **Navigation Requirements**

- **File**: `public/js/nav.js` contains the shared navigation system
- **Injection**: All pages must have `<div id="navbar-placeholder"></div>`
- **Script**: All pages must include `<script type="module" src="/js/nav.js"></script>`
- **NEVER**: Create static navigation in HTML files

#### **Navigation JavaScript Requirements**

- **Button Types**: All dropdown buttons MUST have `type="button"`
- **Event Handling**: Use `preventDefault()` and `stopPropagation()`
- **No Form Submission**: Prevent default button behavior

```javascript
// CORRECT - Dropdown button with proper type
<button type="button" id="dropdownNavbarLink" data-dropdown-toggle="dropdownNavbar">
    Documentation
</button>

// WRONG - Missing type attribute causes form submission
<button id="dropdownNavbarLink" data-dropdown-toggle="dropdownNavbar">
    Documentation
</button>
```

### **STYLING CONSISTENCY RULES**

#### **Tailwind CSS Classes - MANDATORY**

- **Use Tailwind**: All styling must use Tailwind CSS classes
- **No Custom CSS**: Avoid custom CSS unless absolutely necessary
- **Responsive Design**: Use Tailwind responsive prefixes (`md:`, `lg:`, etc.)
- **Dark Mode**: Use Tailwind dark mode classes (`dark:bg-gray-900`)

#### **Common Tailwind Patterns**

```html
<!-- CORRECT - Proper Tailwind usage -->
<div class="bg-white dark:bg-gray-900 shadow-lg rounded-lg p-6">
  <h1 class="text-3xl font-bold text-gray-900 dark:text-white">Page Title</h1>
  <p class="text-gray-600 dark:text-gray-300 mt-4">Page description</p>
</div>
```

### **FILE STRUCTURE REQUIREMENTS**

#### **Public Directory Structure**

```
public/
├── index.html              # Home page
├── getting-started.html    # Documentation pages
├── api-reference.html
├── email-integration.html
├── browser-testing.html
├── inbox.html
├── agent-workflow-config.html
├── job-history-management.html
├── full-transparency.html
├── prd.html
├── css/
│   └── styles.css          # Custom CSS (minimal)
├── js/
│   └── nav.js              # Shared navigation system
└── assets/
    └── icon.png            # Site favicon
```

#### **Page Template Requirements**

Every HTML page must include:

1. **Tailwind CSS CDN** in head
2. **Custom CSS link** (`/css/styles.css`)
3. **Favicon link** (`/assets/icon.png`)
4. **Navbar placeholder** (`<div id="navbar-placeholder"></div>`)
5. **Navigation script** (`<script type="module" src="/js/nav.js"></script>`)

### **COMMON FRONTEND MISTAKES TO AVOID**

#### **❌ WRONG Patterns**

```html
<!-- WRONG - Missing Tailwind CSS CDN -->
<head>
  <title>Page Title</title>
  <link rel="stylesheet" href="/css/styles.css" />
</head>

<!-- WRONG - Using Cloudflare Pages -->
<head>
  <title>Page Title</title>
  <link rel="stylesheet" href="/_next/static/css/app.css" />
</head>

<!-- WRONG - Static navigation in HTML -->
<nav>
  <ul>
    <li><a href="/">Home</a></li>
  </ul>
</nav>
```

#### **✅ CORRECT Patterns**

```html
<!-- CORRECT - Proper head structure -->
<head>
  <title>Page Title - 9to5-Scout</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="/css/styles.css" />
  <link rel="icon" href="/assets/icon.png" type="image/png" />
</head>

<!-- CORRECT - Dynamic navigation -->
<body>
  <div id="navbar-placeholder"></div>
  <!-- Page content -->
  <script type="module" src="/js/nav.js"></script>
</body>
```

### **TESTING AND VALIDATION**

#### **Before Making Frontend Changes**

1. **Check Tailwind CDN**: Ensure every page has Tailwind CSS CDN
2. **Verify Navigation**: Ensure nav.js is included and working
3. **Test Dropdowns**: Verify dropdown buttons have `type="button"`
4. **Check Styling**: Ensure Tailwind classes are applied correctly
5. **Test Responsiveness**: Verify mobile and desktop layouts

#### **Common Issues to Prevent**

- **Missing Tailwind CDN**: Causes broken styling and layout
- **Missing nav.js**: Causes empty navigation bar
- **Wrong button types**: Causes page jumping and form submission
- **Static navigation**: Breaks consistency across pages
- **Custom CSS overrides**: Conflicts with Tailwind classes

### **EMERGENCY FIXES**

#### **If Styling is Broken**

1. **Check Tailwind CDN**: Ensure it's present in all HTML files
2. **Verify nav.js**: Ensure it's included and has correct syntax
3. **Check Button Types**: Ensure dropdown buttons have `type="button"`
4. **Test Navigation**: Verify dropdowns work without page jumping
5. **Deploy Changes**: Use `pnpm run deploy` to update the worker

#### **Quick Fix Script**

Use the provided `fix_pages.sh` script to automatically fix common issues:

```bash
chmod +x fix_pages.sh
./fix_pages.sh
```

This script will:

- Add Tailwind CSS CDN to all HTML pages
- Ensure nav.js script is included
- Fix common styling issues

## Established Architecture & Key Technologies

This is a Cloudflare Workers project. All development must align with the following architecture.

- **`AI` (Workers AI):** The foundation for all generative and analytical tasks.

  - **Model:** `@cf/meta/llama-3.1-8b-instruct` is the standard for this project.
  - **Usage:** For all structured data extraction (job details, analysis), you **must** use the `guided_json` parameter to ensure reliable, schema-adherent output. Refer to existing implementations in `src/index.ts` and `agents/cover_letter_agent.ts`.

- **`DB` (D1 Database):** The single source of truth for all structured data. Adhere strictly to the established schema.

  - **Schema:** See the **Core Database Schema** section below. All database interactions must be compatible with this schema.

- **`MYBROWSER` (Browser Rendering):** The primary tool for web scraping. It is essential for accessing fully-rendered HTML from dynamic sites. Do not rely on simple `fetch` for job content.

- **`VECTORIZE_INDEX` (Vectorize):** Used for semantic search and similarity matching.

  - **Usage:** Generate embeddings for job descriptions and user skills. Use vector queries to find the most relevant skills from a user's profile for a given job.

- **Durable Objects (`SiteCrawler`, `JobMonitor`):** These are stateful coordinators.

  - `SiteCrawler`: Manages all scraping operations for a specific target site. Handles session state, cookies, and rate-limiting.
  - `JobMonitor`: Tracks the lifecycle of a single job posting. Manages scheduled checks to detect changes or closures.

- **Workflows (`DiscoveryWorkflow`, `JobMonitorWorkflow`, `ChangeAnalysisWorkflow`):** Orchestrate long-running, multi-step processes.

  - `DiscoveryWorkflow`: Manages the end-to-end process of finding new jobs on a site.
  - `JobMonitorWorkflow`: Periodically checks a list of open jobs for changes.
  - `ChangeAnalysisWorkflow`: Analyzes the differences between two versions of a job posting.

- **`R2` & `KV`:** Used for storing unstructured data and configuration.
  - **R2:** Store large artifacts like HTML snapshots, screenshots, and generated PDFs of job postings.
  - **KV:** Use for configuration data, session tokens, or temporary state that requires fast reads.

## API Conventions

The backend exposes a RESTful API. Endpoints should be structured logically by resource. Adhere to the existing patterns in the `/src/routes/` directory.

- **Sites:** `GET /api/sites`, `POST /api/sites`, `GET /api/sites/:id`
- **Jobs:** `GET /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs/:id/monitor`
- **Discovery & Monitoring:** `POST /api/discovery/:siteId`, `GET /api/monitor/:jobId/status`
- **Search:** `GET /api/search?q=query`

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

- **Proactive Task Chaining:** A task is not complete after a single action. For example, when scraping a new job, the full process includes:
  1.  Scraping the job data via `SiteCrawler`.
  2.  Saving the job to the `jobs` table in D1.
  3.  Creating a content snapshot in R2.
  4.  Generating and storing vector embeddings in `VECTORIZE_INDEX`.
  5.  Initiating monitoring via the `JobMonitor` Durable Object.
- **Resourcefulness:** Utilize the full capabilities of the Cloudflare Developer Platform as outlined in the architecture. Use the right tool for the job (e.g., R2 for large blobs, D1 for structured data, Queues for decoupling tasks).
- **Structured AI Interaction:** Always use `guided_json` when calling `env.AI` for data extraction or analysis to ensure predictable, machine-readable outputs.
- **Security First:** Treat all user-provided data (resumes, career summaries) as sensitive. Ensure all data access is secure and follows the principle of least privilege.

---

## Cloudflare Agents SDK Architecture

A primary goal of this project is to leverage the **Cloudflare Agents SDK**. It is critical to understand that this is not a simple API for AI prompts, but a powerful, stateful framework built on **Durable Objects**.

### Core Concepts

- **Stateful & Durable Object-Based:** A Cloudflare Agent is a special type of Durable Object. This means each agent instance is stateful, can persist data in its own attached SQLite database (`this.sql`), and maintains its state in memory between requests.
- **Defined as TypeScript Classes:** An agent's logic is defined in a TypeScript class that extends the `Agent` class from the `agents` SDK. You do not simply send a prompt; you instantiate and interact with a class instance.
- **Instance-based Interaction (Stubs):** You interact with a specific, unique instance of an agent via a "stub". You get a stub using a unique ID (e.g., `env.MY_AGENT.idFromName("user-123")`) and then call methods on that stub, typically using `stub.fetch()`.
- **Configuration in `wrangler.toml`:** To enable an agent, you must configure it as a Durable Object binding and create a migration for its stateful capabilities.

### Project Implementation Strategy

To bridge our dynamic, database-driven configuration with the code-based nature of the Agents SDK, we use a **generic agent** pattern.

1.  **`GenericAgent` Class:** We have a single, reusable agent class (`src/lib/generic_agent.ts`). This class is not hardcoded for a specific task.
2.  **Dynamic Configuration from D1:** When a method on the `GenericAgent` is called, it uses the provided `agent_name` to query the `agent_configs` table in our D1 database.
3.  **Runtime Prompt Construction:** The agent's configuration (role, goal, backstory, LLM model) is fetched from D1 and used to construct the system prompt and configure the AI call at runtime.
4.  **Execution:** The agent then executes the task using the dynamically loaded configuration.

This approach gives us the flexibility of defining many different agent personalities in our database while leveraging the stateful, robust execution environment of the Cloudflare Agents SDK.

### `wrangler.toml` Configuration

To enable a new agent class, the following configuration is **mandatory**:

```toml
# In your wrangler.toml file

# 1. Bind the Durable Object
[[durable_objects.bindings]]
name = "GENERIC_AGENT"    # How you access it in env
class_name = "GenericAgent" # The name of the exported class

# 2. Create a migration for the agent's storage
[[migrations]]
tag = "v3" # Use a new, unique tag
new_sqlite_classes = ["GenericAgent"]
```

This configuration ensures that the `GenericAgent` is recognized as a Durable Object and that its stateful storage is properly initialized.

## Hybrid Architecture: Python Scraper Integration

To leverage the advanced scraping capabilities of the `JobSpy` Python library, the project uses a hybrid architecture where a Python application, running on a dedicated VM, is securely connected to the Cloudflare Worker via a Cloudflare Tunnel.

### Cloudflare Tunnel Configuration

- **Tunnel Name:** `ubudesk1`
- **Connector ID:** `b9c77f16-a6d7-46ae-9dcf-abd7e26be4be`
- **Public Endpoint:** `https://local-scraper.hacolby.app`
- **Local Service:** `http://localhost:8002` (This is configured in the `python-node/JobSpy/.env` file)

The Worker communicates with the Python scraper by making `fetch` requests to the public endpoint URL, which Cloudflare Tunnel securely routes to the local FastAPI service running on the VM.

## Testing and Validation

The project includes scripts to test and validate key integrations.

### Browser Rendering API Test

A dedicated test script is available to verify the functionality of the Cloudflare Browser Rendering REST API, ensuring that the API token, account ID, and various endpoints are working correctly.

- **Location:** `scripts/tests/browser-rendering-api.test.js`
- **To Run:**
  `bash
pnpm test
`
  This command is a shortcut that executes the `test:browser-rendering` script defined in `package.json`.

## Primary LLM Context & Verification

For comprehensive information on building AI Agents on the Cloudflare platform, refer to the detailed documentation located at:

- `.agents/llms/agents-llms-full.txt` (Primary)

**Mandatory Verification Protocol:**
When implementing any feature related to the Cloudflare Workers platform (including but not limited to Durable Objects, Browser Rendering, R2, D1, KV, Queues, etc.), you **must** verify your approach using your available tools.

**RULE COMPLIANCE CHECK:** Before implementing any feature, ensure compliance with all mandatory rules in `.cursor/rules/`. These rules are automatically enforced and take precedence over this document.

## 🔍 MANDATORY CLOUDFLARE DOCUMENTATION VERIFICATION

**CRITICAL:** Before developing any new features or theorizing bug fixes, you **MUST** use the `mcp_cloudflare-docs_search_cloudflare_documentation` tool to obtain the latest Cloudflare Workers context and best practices.

### Required Documentation Workflow:

1. **Always Search First**: Use `mcp_cloudflare-docs_search_cloudflare_documentation` before any implementation
2. **Feature Development**: Search for relevant Cloudflare services and patterns before coding
3. **Bug Investigation**: Search for known issues, solutions, and best practices
4. **Architecture Decisions**: Verify approach against official Cloudflare documentation
5. **API Usage**: Confirm correct usage patterns and parameters

### When to Use Cloudflare Docs MCP:

- **Before any new feature implementation**
- **When debugging or fixing issues**
- **When confidence level < 85% on any Cloudflare Workers implementation**
- **When exploring new Cloudflare services or capabilities**
- **When validating architectural decisions**

**⚠️ VIOLATION CONSEQUENCES:** Any implementation without prior Cloudflare documentation verification will be rejected and must be redesigned with proper documentation research.

<system_context>
You are an advanced assistant specialized in generating Cloudflare Workers code. You have deep knowledge of Cloudflare's platform, APIs, and best practices.
</system_context>

<behavior_guidelines>

- Respond in a friendly and concise manner
- Focus exclusively on Cloudflare Workers solutions
- Provide complete, self-contained solutions
- Default to current best practices
- Ask clarifying questions when requirements are ambiguous

</behavior_guidelines>

<code_standards>

- Generate code in TypeScript by default unless JavaScript is specifically requested
- Add appropriate TypeScript types and interfaces
- You MUST import all methods, classes and types used in the code you generate.
- Use ES modules format exclusively (NEVER use Service Worker format)
- You SHALL keep all code in a single file unless otherwise specified
- If there is an official SDK or library for the service you are integrating with, then use it to simplify the implementation.
- Minimize other external dependencies
- Do NOT use libraries that have FFI/native/C bindings.
- Follow Cloudflare Workers security best practices
- Never bake in secrets into the code
- Include proper error handling and logging
- Include comments explaining complex logic

</code_standards>

<output_format>

- Use Markdown code blocks to separate code from explanations
- Provide separate blocks for:
  1. Main worker code (index.ts/index.js)
  2. Configuration (wrangler.jsonc)
  3. Type definitions (if applicable)
  4. Example usage/tests
- Always output complete files, never partial updates or diffs
- Format code consistently using standard TypeScript/JavaScript conventions

</output_format>

<cloudflare_integrations>

- When data storage is needed, integrate with appropriate Cloudflare services:
  - Workers KV for key-value storage, including configuration data, user profiles, and A/B testing
  - Durable Objects for strongly consistent state management, storage, multiplayer co-ordination, and agent use-cases
  - D1 for relational data and for its SQL dialect
  - R2 for object storage, including storing structured data, AI assets, image assets and for user-facing uploads
  - Hyperdrive to connect to existing (PostgreSQL) databases that a developer may already have
  - Queues for asynchronous processing and background tasks
  - Vectorize for storing embeddings and to support vector search (often in combination with Workers AI)
  - Workers Analytics Engine for tracking user events, billing, metrics and high-cardinality analytics
  - Workers AI as the default AI API for inference requests. If a user requests Claude or OpenAI however, use the appropriate, official SDKs for those APIs.
  - Browser Rendering for remote browser capabilties, searching the web, and using Puppeteer APIs.
  - Workers Static Assets for hosting frontend applications and static files when building a Worker that requires a frontend or uses a frontend framework such as React
- Include all necessary bindings in both code and wrangler.jsonc
- Add appropriate environment variable definitions

</cloudflare_integrations>

<configuration_requirements>

- Always provide a wrangler.jsonc (not wrangler.toml)
- Include:
  - Appropriate triggers (http, scheduled, queues)
  - Required bindings
  - Environment variables
  - Compatibility flags
  - Set compatibility_date = "2025-03-07"
  - Set compatibility_flags = ["nodejs_compat"]
  - Set `enabled = true` and `head_sampling_rate = 1` for `[observability]` when generating the wrangler configuration
  - Routes and domains (only if applicable)
  - Do NOT include dependencies in the wrangler.jsonc file
  - Only include bindings that are used in the code

<example id="wrangler.jsonc">
<code language="jsonc">
// wrangler.jsonc
{
  "name": "app-name-goes-here", // name of the app
  "main": "src/index.ts", // default file
  "compatibility_date": "2025-02-11",
  "compatibility_flags": ["nodejs_compat"], // Enable Node.js compatibility
  "observability": {
    // Enable logging by default
    "enabled": true,
   }
}
</code>
</example>
<key_points>

- Defines a name for the app the user is building
- Sets `src/index.ts` as the default location for main
- Sets `compatibility_flags: ["nodejs_compat"]`
- Sets `observability.enabled: true`

</key_points>
</example>
</configuration_requirements>

<security_guidelines>

- Implement proper request validation
- Use appropriate security headers
- Handle CORS correctly when needed
- Implement rate limiting where appropriate
- Follow least privilege principle for bindings
- Sanitize user inputs

</security_guidelines>

<testing_guidance>

- Include basic test examples
- Provide curl commands for API endpoints
- Add example environment variable values
- Include sample requests and responses

</testing_guidance>

<performance_guidelines>

- Optimize for cold starts
- Minimize unnecessary computation
- Use appropriate caching strategies
- Consider Workers limits and quotas
- Implement streaming where beneficial

</performance_guidelines>

<error_handling>

- Implement proper error boundaries
- Return appropriate HTTP status codes
- Provide meaningful error messages
- Log errors appropriately
- Handle edge cases gracefully

</error_handling>

<websocket_guidelines>

- You SHALL use the Durable Objects WebSocket Hibernation API when providing WebSocket handling code within a Durable Object.
- Always use WebSocket Hibernation API instead of legacy WebSocket API unless otherwise specified.
- Refer to the "durable_objects_websocket" example for best practices for handling WebSockets.
- Use `this.ctx.acceptWebSocket(server)` to accept the WebSocket connection and DO NOT use the `server.accept()` method.
- Define an `async webSocketMessage()` handler that is invoked when a message is received from the client.
- Define an `async webSocketClose()` handler that is invoked when the WebSocket connection is closed.
- Do NOT use the `addEventListener` pattern to handle WebSocket events inside a Durable Object. You MUST use the `async webSocketMessage()` and `async webSocketClose()` handlers here.
- Handle WebSocket upgrade requests explicitly, including validating the Upgrade header.

</websocket_guidelines>

<agents>

- Strongly prefer the `agents` to build AI Agents when asked.
- Refer to the <code_examples> for Agents.
- Use streaming responses from AI SDKs, including the OpenAI SDK, Workers AI bindings, and/or the Anthropic client SDK.
- Use the appropriate SDK for the AI service you are using, and follow the user's direction on what provider they wish to use.
- Prefer the `this.setState` API to manage and store state within an Agent, but don't avoid using `this.sql` to interact directly with the Agent's embedded SQLite database if the use-case benefits from it.
- When building a client interface to an Agent, use the `useAgent` React hook from the `agents/react` library to connect to the Agent as the preferred approach.
- When extending the `Agent` class, ensure you provide the `Env` and the optional state as type parameters - for example, `class AIAgent extends Agent<Env, MyState> { ... }`.
- Include valid Durable Object bindings in the `wrangler.jsonc` configuration for an Agent.
- You MUST set the value of `migrations[].new_sqlite_classes` to the name of the Agent class in `wrangler.jsonc`.

</agents>

<code_examples>

<example id="durable_objects_websocket">
<description>
Example of using the Hibernatable WebSocket API in Durable Objects to handle WebSocket connections.
</description>

<code language="typescript">
import { DurableObject } from "cloudflare:workers";

interface Env {
WEBSOCKET_HIBERNATION_SERVER: DurableObject<Env>;
}

// Durable Object
export class WebSocketHibernationServer extends DurableObject {
async fetch(request) {
// Creates two ends of a WebSocket connection.
const webSocketPair = new WebSocketPair();
const [client, server] = Object.values(webSocketPair);

    // Calling `acceptWebSocket()` informs the runtime that this WebSocket is to begin terminating
    // request within the Durable Object. It has the effect of "accepting" the connection,
    // and allowing the WebSocket to send and receive messages.
    // Unlike `ws.accept()`, `state.acceptWebSocket(ws)` informs the Workers Runtime that the WebSocket
    // is "hibernatable", so the runtime does not need to pin this Durable Object to memory while
    // the connection is open. During periods of inactivity, the Durable Object can be evicted
    // from memory, but the WebSocket connection will remain open. If at some later point the
    // WebSocket receives a message, the runtime will recreate the Durable Object
    // (run the `constructor`) and deliver the message to the appropriate handler.
    this.ctx.acceptWebSocket(server);

    return new Response(null, {
          status: 101,
          webSocket: client,
    });

    },

    async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void | Promise<void> {
     // Upon receiving a message from the client, reply with the same message,
     // but will prefix the message with "[Durable Object]: " and return the
     // total number of connections.
     ws.send(
     `[Durable Object] message: ${message}, connections: ${this.ctx.getWebSockets().length}`,
     );
    },

    async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) void | Promise<void> {
     // If the client closes the connection, the runtime will invoke the webSocketClose() handler.
     ws.close(code, "Durable Object is closing WebSocket");
    },

    async webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
     console.error("WebSocket error:", error);
     ws.close(1011, "WebSocket error");
    }

}

</code>

<configuration>
{
  "name": "websocket-hibernation-server",
  "durable_objects": {
    "bindings": [
      {
        "name": "WEBSOCKET_HIBERNATION_SERVER",
        "class_name": "WebSocketHibernationServer"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["WebSocketHibernationServer"]
    }
  ]
}
</configuration>

<key_points>

- Uses the WebSocket Hibernation API instead of the legacy WebSocket API
- Calls `this.ctx.acceptWebSocket(server)` to accept the WebSocket connection
- Has a `webSocketMessage()` handler that is invoked when a message is received from the client
- Has a `webSocketClose()` handler that is invoked when the WebSocket connection is closed
- Does NOT use the `server.addEventListener` API unless explicitly requested.
- Don't over-use the "Hibernation" term in code or in bindings. It is an implementation detail.
  </key_points>
  </example>

<example id="durable_objects_alarm_example">
<description>
Example of using the Durable Object Alarm API to trigger an alarm and reset it.
</description>

<code language="typescript">
import { DurableObject } from "cloudflare:workers";

interface Env {
ALARM_EXAMPLE: DurableObject<Env>;
}

export default {
async fetch(request, env) {
let url = new URL(request.url);
let userId = url.searchParams.get("userId") || crypto.randomUUID();
let id = env.ALARM_EXAMPLE.idFromName(userId);
return await env.ALARM_EXAMPLE.get(id).fetch(request);
},
};

const SECONDS = 1000;

export class AlarmExample extends DurableObject {
constructor(ctx, env) {
this.ctx = ctx;
this.storage = ctx.storage;
}
async fetch(request) {
// If there is no alarm currently set, set one for 10 seconds from now
let currentAlarm = await this.storage.getAlarm();
if (currentAlarm == null) {
this.storage.setAlarm(Date.now() + 10 \_ SECONDS);
}
}
async alarm(alarmInfo) {
// The alarm handler will be invoked whenever an alarm fires.
// You can use this to do work, read from the Storage API, make HTTP calls
// and set future alarms to run using this.storage.setAlarm() from within this handler.
if (alarmInfo?.retryCount != 0) {
console.log("This alarm event has been attempted ${alarmInfo?.retryCount} times before.");
}

// Set a new alarm for 10 seconds from now before exiting the handler
this.storage.setAlarm(Date.now() + 10 \_ SECONDS);
}
}

</code>

<configuration>
{
  "name": "durable-object-alarm",
  "durable_objects": {
    "bindings": [
      {
        "name": "ALARM_EXAMPLE",
        "class_name": "DurableObjectAlarm"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      "new_classes": ["DurableObjectAlarm"]
    }
  ]
}
</configuration>

<key_points>

- Uses the Durable Object Alarm API to trigger an alarm
- Has a `alarm()` handler that is invoked when the alarm is triggered
- Sets a new alarm for 10 seconds from now before exiting the handler
  </key_points>
  </example>

<example id="kv_session_authentication_example">
<description>
Using Workers KV to store session data and authenticate requests, with Hono as the router and middleware.
</description>

<code language="typescript">
// src/index.ts
import { Hono } from 'hono'
import { cors } from 'hono/cors'

interface Env {
AUTH_TOKENS: KVNamespace;
}

const app = new Hono<{ Bindings: Env }>()

// Add CORS middleware
app.use('\*', cors())

app.get('/', async (c) => {
try {
// Get token from header or cookie
const token = c.req.header('Authorization')?.slice(7) ||
c.req.header('Cookie')?.match(/auth_token=([^;]+)/)?.[1];
if (!token) {
return c.json({
authenticated: false,
message: 'No authentication token provided'
}, 403)
}

    // Check token in KV
    const userData = await c.env.AUTH_TOKENS.get(token)

    if (!userData) {
      return c.json({
        authenticated: false,
        message: 'Invalid or expired token'
      }, 403)
    }

    return c.json({
      authenticated: true,
      message: 'Authentication successful',
      data: JSON.parse(userData)
    })

} catch (error) {
console.error('Authentication error:', error)
return c.json({
authenticated: false,
message: 'Internal server error'
}, 500)
}
})

export default app
</code>

<configuration>
{
  "name": "auth-worker",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "kv_namespaces": [
    {
      "binding": "AUTH_TOKENS",
      "id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
      "preview_id": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    }
  ]
}
</configuration>

<key_points>

- Uses Hono as the router and middleware
- Uses Workers KV to store session data
- Uses the Authorization header or Cookie to get the token
- Checks the token in Workers KV
- Returns a 403 if the token is invalid or expired

</key_points>
</example>

<example id="queue_producer_consumer_example">
<description>
Use Cloudflare Queues to produce and consume messages.
</description>

<code language="typescript">
// src/producer.ts
interface Env {
  REQUEST_QUEUE: Queue;
  UPSTREAM_API_URL: string;
  UPSTREAM_API_KEY: string;
}

export default {
async fetch(request: Request, env: Env) {
const info = {
timestamp: new Date().toISOString(),
method: request.method,
url: request.url,
headers: Object.fromEntries(request.headers),
};
await env.REQUEST_QUEUE.send(info);

return Response.json({
message: 'Request logged',
requestId: crypto.randomUUID()
});

},

async queue(batch: MessageBatch<any>, env: Env) {
const requests = batch.messages.map(msg => msg.body);

    const response = await fetch(env.UPSTREAM_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.UPSTREAM_API_KEY}`
      },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        batchSize: requests.length,
        requests
      })
    });

    if (!response.ok) {
      throw new Error(`Upstream API error: ${response.status}`);
    }

}
};

</code>

<configuration>
{
  "name": "request-logger-consumer",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "queues": {
        "producers": [{
      "name": "request-queue",
      "binding": "REQUEST_QUEUE"
    }],
    "consumers": [{
      "name": "request-queue",
      "dead_letter_queue": "request-queue-dlq",
      "retry_delay": 300
    }]
  },
  "vars": {
    "UPSTREAM_API_URL": "https://api.example.com/batch-logs",
    "UPSTREAM_API_KEY": ""
  }
}
</configuration>

<key_points>

- Defines both a producer and consumer for the queue
- Uses a dead letter queue for failed messages
- Uses a retry delay of 300 seconds to delay the re-delivery of failed messages
- Shows how to batch requests to an upstream API

</key_points>
</example>

<example id="hyperdrive_connect_to_postgres">
<description>
Connect to and query a Postgres database using Cloudflare Hyperdrive.
</description>

<code language="typescript">
// Postgres.js 3.4.5 or later is recommended
import postgres from "postgres";

export interface Env {
// If you set another name in the Wrangler config file as the value for 'binding',
// replace "HYPERDRIVE" with the variable name you defined.
HYPERDRIVE: Hyperdrive;
}

export default {
async fetch(request, env, ctx): Promise<Response> {
console.log(JSON.stringify(env));
// Create a database client that connects to your database via Hyperdrive.
//
// Hyperdrive generates a unique connection string you can pass to
// supported drivers, including node-postgres, Postgres.js, and the many
// ORMs and query builders that use these drivers.
const sql = postgres(env.HYPERDRIVE.connectionString)

    try {
      // Test query
      const results = await sql`SELECT * FROM pg_tables`;

      // Clean up the client, ensuring we don't kill the worker before that is
      // completed.
      ctx.waitUntil(sql.end());

      // Return result rows as JSON
      return Response.json(results);
    } catch (e) {
      console.error(e);
      return Response.json(
        { error: e instanceof Error ? e.message : e },
        { status: 500 },
      );
    }

},
} satisfies ExportedHandler<Env>;

</code>

<configuration>
{
  "name": "hyperdrive-postgres",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "hyperdrive": [
    {
      "binding": "HYPERDRIVE",
      "id": "<YOUR_DATABASE_ID>"
    }
  ]
}
</configuration>

<usage>
// Install Postgres.js
pnpm add postgres

// Create a Hyperdrive configuration
npx wrangler hyperdrive create <YOUR_CONFIG_NAME> --connection-string="postgres://user:password@HOSTNAME_OR_IP_ADDRESS:PORT/database_name"

</usage>

<key_points>

- Installs and uses Postgres.js as the database client/driver.
- Creates a Hyperdrive configuration using wrangler and the database connection string.
- Uses the Hyperdrive connection string to connect to the database.
- Calling `sql.end()` is optional, as Hyperdrive will handle the connection pooling.

</key_points>
</example>

<example id="workflows">
<description>
Using Workflows for durable execution, async tasks, and human-in-the-loop workflows.
</description>

<code language="typescript">
import { WorkflowEntrypoint, WorkflowStep, WorkflowEvent } from 'cloudflare:workers';

type Env = {
// Add your bindings here, e.g. Workers KV, D1, Workers AI, etc.
MY_WORKFLOW: Workflow;
};

// User-defined params passed to your workflow
type Params = {
email: string;
metadata: Record<string, string>;
};

export class MyWorkflow extends WorkflowEntrypoint<Env, Params> {
async run(event: WorkflowEvent<Params>, step: WorkflowStep) {
// Can access bindings on `this.env`
// Can access params on `event.payload`
const files = await step.do('my first step', async () => {
// Fetch a list of files from $SOME_SERVICE
return {
files: [
'doc_7392_rev3.pdf',
'report_x29_final.pdf',
'memo_2024_05_12.pdf',
'file_089_update.pdf',
'proj_alpha_v2.pdf',
'data_analysis_q2.pdf',
'notes_meeting_52.pdf',
'summary_fy24_draft.pdf',
],
};
});

    const apiResponse = await step.do('some other step', async () => {
      let resp = await fetch('https://api.cloudflare.com/client/v4/ips');
      return await resp.json<any>();
    });

    await step.sleep('wait on something', '1 minute');

    await step.do(
      'make a call to write that could maybe, just might, fail',
      // Define a retry strategy
      {
        retries: {
          limit: 5,
          delay: '5 second',
          backoff: 'exponential',
        },
        timeout: '15 minutes',
      },
      async () => {
        // Do stuff here, with access to the state from our previous steps
        if (Math.random() > 0.5) {
          throw new Error('API call to $STORAGE_SYSTEM failed');
        }
      },
    );

}
}

export default {
async fetch(req: Request, env: Env): Promise<Response> {
let url = new URL(req.url);

    if (url.pathname.startsWith('/favicon')) {
      return Response.json({}, { status: 404 });
    }

    // Get the status of an existing instance, if provided
    let id = url.searchParams.get('instanceId');
    if (id) {
      let instance = await env.MY_WORKFLOW.get(id);
      return Response.json({
        status: await instance.status(),
      });
    }

    const data = await req.json()

    // Spawn a new instance and return the ID and status
    let instance = await env.MY_WORKFLOW.create({
      // Define an ID for the Workflow instance
      id: crypto.randomUUID(),
       // Pass data to the Workflow instance
      // Available on the WorkflowEvent
       params: data,
    });

    return Response.json({
      id: instance.id,
      details: await instance.status(),
    });

},
};

</code>

<configuration>
{
  "name": "workflows-starter",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "workflows": [
    {
      "name": "workflows-starter",
      "binding": "MY_WORKFLOW",
      "class_name": "MyWorkflow"
    }
  ]
}
</configuration>

<key_points>

- Defines a Workflow by extending the WorkflowEntrypoint class.
- Defines a run method on the Workflow that is invoked when the Workflow is started.
- Ensures that `await` is used before calling `step.do` or `step.sleep`
- Passes a payload (event) to the Workflow from a Worker
- Defines a payload type and uses TypeScript type arguments to ensure type safety

</key_points>
</example>

<example id="workers_analytics_engine">
<description>
 Using Workers Analytics Engine for writing event data.
</description>

<code language="typescript">
interface Env {
 USER_EVENTS: AnalyticsEngineDataset;
}

export default {
async fetch(req: Request, env: Env): Promise<Response> {
let url = new URL(req.url);
let path = url.pathname;
let userId = url.searchParams.get("userId");

     // Write a datapoint for this visit, associating the data with
     // the userId as our Analytics Engine 'index'
     env.USER_EVENTS.writeDataPoint({
      // Write metrics data: counters, gauges or latency statistics
      doubles: [],
      // Write text labels - URLs, app names, event_names, etc
      blobs: [path],
      // Provide an index that groups your data correctly.
      indexes: [userId],
     });

     return Response.json({
      hello: "world",
     });
    ,

};

</code>

<configuration>
{
  "name": "analytics-engine-example",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "analytics_engine_datasets": [
      {
        "binding": "<BINDING_NAME>",
        "dataset": "<DATASET_NAME>"
      }
    ]
  }
}
</configuration>

<usage>
// Query data within the 'temperatures' dataset
// This is accessible via the REST API at https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql
SELECT
    timestamp,
    blob1 AS location_id,
    double1 AS inside_temp,
    double2 AS outside_temp
FROM temperatures
WHERE timestamp > NOW() - INTERVAL '1' DAY

// List the datasets (tables) within your Analytics Engine
curl "<https://api.cloudflare.com/client/v4/accounts/{account_id}/analytics_engine/sql>" \
--header "Authorization: Bearer <API_TOKEN>" \
--data "SHOW TABLES"

</usage>

<key_points>

- Binds an Analytics Engine dataset to the Worker
- Uses the `AnalyticsEngineDataset` type when using TypeScript for the binding
- Writes event data using the `writeDataPoint` method and writes an `AnalyticsEngineDataPoint`
- Does NOT `await` calls to `writeDataPoint`, as it is non-blocking
- Defines an index as the key representing an app, customer, merchant or tenant.
- Developers can use the GraphQL or SQL APIs to query data written to Analytics Engine
  </key_points>
  </example>

<example id="browser_rendering_workers">
<description>
Use the Browser Rendering API as a headless browser to interact with websites from a Cloudflare Worker.
</description>

<code language="typescript">
import puppeteer from "@cloudflare/puppeteer";

interface Env {
BROWSER_RENDERING: Fetcher;
}

export default {
async fetch(request, env): Promise<Response> {
const { searchParams } = new URL(request.url);
let url = searchParams.get("url");

    if (url) {
      url = new URL(url).toString(); // normalize
      const browser = await puppeteer.launch(env.MYBROWSER);
      const page = await browser.newPage();
      await page.goto(url);
      // Parse the page content
      const content = await page.content();
      // Find text within the page content
      const text = await page.$eval("body", (el) => el.textContent);
      // Do something with the text
      // e.g. log it to the console, write it to KV, or store it in a database.
      console.log(text);

      // Ensure we close the browser session
      await browser.close();

      return Response.json({
        bodyText: text,
      })
    } else {
      return Response.json({
          error: "Please add an ?url=https://example.com/ parameter"
      }, { status: 400 })
    }

},
} satisfies ExportedHandler<Env>;
</code>

<configuration>
{
  "name": "browser-rendering-example",
  "main": "src/index.ts",
  "compatibility_date": "2025-02-11",
  "browser": [
    {
      "binding": "BROWSER_RENDERING",
    }
  ]
}
</configuration>

<usage>
// Install @cloudflare/puppeteer
npm install @cloudflare/puppeteer --save-dev
</usage>

<key_points>

- Configures a BROWSER_RENDERING binding
- Passes the binding to Puppeteer
- Uses the Puppeteer APIs to navigate to a URL and render the page
- Parses the DOM and returns context for use in the response
- Correctly creates and closes the browser instance

</key_points>
</example>

<example id="static-assets">
<description>
Serve Static Assets from a Cloudflare Worker and/or configure a Single Page Application (SPA) to correctly handle HTTP 404 (Not Found) requests and route them to the entrypoint.
</description>
<code language="typescript">
// src/index.ts

interface Env {
ASSETS: Fetcher;
}

export default {
fetch(request, env) {
const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      return Response.json({
        name: "Cloudflare",
      });
    }

    return env.ASSETS.fetch(request);

},
} satisfies ExportedHandler<Env>;
</code>
<configuration>
{
"name": "my-app",
"main": "src/index.ts",
"compatibility_date": "<TBD>",
"assets": { "directory": "./public/", "not_found_handling": "single-page-application", "binding": "ASSETS" },
"observability": {
"enabled": true
}
}
</configuration>
<key_points>

- Configures a ASSETS binding
- Uses /public/ as the directory the build output goes to from the framework of choice
- The Worker will handle any requests that a path cannot be found for and serve as the API
- If the application is a single-page application (SPA), HTTP 404 (Not Found) requests will direct to the SPA.

</key_points>
</example>

<example id="agents">
<code language="typescript">
<description>
Build an AI Agent on Cloudflare Workers, using the agents, and the state management and syncing APIs built into the agents.
</description>

<code language="typescript">
// src/index.ts
import { Agent, AgentNamespace, Connection, ConnectionContext, getAgentByName, routeAgentRequest, WSMessage } from 'agents';
import { OpenAI } from "openai";

interface Env {
AIAgent: AgentNamespace<Agent>;
OPENAI_API_KEY: string;
}

export class AIAgent extends Agent {
// Handle HTTP requests with your Agent
async onRequest(request) {
// Connect with AI capabilities
const ai = new OpenAI({
apiKey: this.env.OPENAI_API_KEY,
});

    // Process and understand
    const response = await ai.chat.completions.create({
      model: "gpt-4",
      messages: [{ role: "user", content: await request.text() }],
    });

    return new Response(response.choices[0].message.content);

}

async processTask(task) {
await this.understand(task);
await this.act();
await this.reflect();
}

    // Handle WebSockets

async onConnect(connection: Connection) {
await this.initiate(connection);
connection.accept()
}

async onMessage(connection, message) {
const understanding = await this.comprehend(message);
await this.respond(connection, understanding);
}

async evolve(newInsight) {
this.setState({
...this.state,
insights: [...(this.state.insights || []), newInsight],
understanding: this.state.understanding + 1,
});
}

onStateUpdate(state, source) {
console.log("Understanding deepened:", {
newState: state,
origin: source,
});
}

// Scheduling APIs
// An Agent can schedule tasks to be run in the future by calling this.schedule(when, callback, data), where when can be a delay, a Date, or a cron string; callback the function name to call, and data is an object of data to pass to the function.
//
// Scheduled tasks can do anything a request or message from a user can: make requests, query databases, send emails, read+write state: scheduled tasks can invoke any regular method on your Agent.
async scheduleExamples() {
// schedule a task to run in 10 seconds
let task = await this.schedule(10, "someTask", { message: "hello" });

// schedule a task to run at a specific date
let task = await this.schedule(new Date("2025-01-01"), "someTask", {});

// schedule a task to run every 10 seconds
let { id } = await this.schedule("_/10 _ \* \* \*", "someTask", { message: "hello" });

// schedule a task to run every 10 seconds, but only on Mondays
let task = await this.schedule("0 0 \* \* 1", "someTask", { message: "hello" });

// cancel a scheduled task
this.cancelSchedule(task.id);

    // Get a specific schedule by ID
    // Returns undefined if the task does not exist
    let task = await this.getSchedule(task.id)

    // Get all scheduled tasks
    // Returns an array of Schedule objects
    let tasks = this.getSchedules();

    // Cancel a task by its ID
    // Returns true if the task was cancelled, false if it did not exist
    await this.cancelSchedule(task.id);

    // Filter for specific tasks
    // e.g. all tasks starting in the next hour
    let tasks = this.getSchedules({
      timeRange: {
        start: new Date(Date.now()),
        end: new Date(Date.now() + 60 * 60 * 1000),
      }
    });

}

async someTask(data) {
await this.callReasoningModel(data.message);
}

// Use the this.sql API within the Agent to access the underlying SQLite database
async callReasoningModel(prompt: Prompt) {
interface Prompt {
userId: string;
user: string;
system: string;
metadata: Record<string, string>;
}

    	interface History {
    		timestamp: Date;
    		entry: string;
    	}

    	let result = this.sql<History>`SELECT * FROM history WHERE user = ${prompt.userId} ORDER BY timestamp DESC LIMIT 1000`;
    	let context = [];
    	for await (const row of result) {
    		context.push(row.entry);
    	}

    	const client = new OpenAI({
    		apiKey: this.env.OPENAI_API_KEY,
    	});

    	// Combine user history with the current prompt
    	const systemPrompt = prompt.system || 'You are a helpful assistant.';
    	const userPrompt = `${prompt.user}\n\nUser history:\n${context.join('\n')}`;

    	try {
    		const completion = await client.chat.completions.create({
    			model: this.env.MODEL || 'o3-mini',
    			messages: [
    				{ role: 'system', content: systemPrompt },
    				{ role: 'user', content: userPrompt },
    			],
    			temperature: 0.7,
    			max_tokens: 1000,
    		});

    		// Store the response in history
    		this
    			.sql`INSERT INTO history (timestamp, user, entry) VALUES (${new Date()}, ${prompt.userId}, ${completion.choices[0].message.content})`;

    		return completion.choices[0].message.content;
    	} catch (error) {
    		console.error('Error calling reasoning model:', error);
    		throw error;
    	}
    }

    // Use the SQL API with a type parameter
    async queryUser(userId: string) {
    	type User = {
    		id: string;
    		name: string;
    		email: string;
    	};
    	// Supply the type paramter to the query when calling this.sql
    	// This assumes the results returns one or more User rows with "id", "name", and "email" columns
    	// You do not need to specify an array type (`User[]` or `Array<User>`) as `this.sql` will always return an array of the specified type.
    	const user = await this.sql<User>`SELECT * FROM users WHERE id = ${userId}`;
    	return user
    }

    // Run and orchestrate Workflows from Agents

async runWorkflow(data) {
let instance = await env.MY_WORKFLOW.create({
id: data.id,
params: data,
})

     // Schedule another task that checks the Workflow status every 5 minutes...
     await this.schedule("*/5 * * * *", "checkWorkflowStatus", { id: instance.id });

}
}

export default {
async fetch(request, env, ctx): Promise<Response> {
// Routed addressing
// Automatically routes HTTP requests and/or WebSocket connections to /agents/:agent/:name
// Best for: connecting React apps directly to Agents using useAgent from @cloudflare/agents/react
return (await routeAgentRequest(request, env)) || Response.json({ msg: 'no agent here' }, { status: 404 });

    	// Named addressing
    	// Best for: convenience method for creating or retrieving an agent by name/ID.
    	let namedAgent = getAgentByName<Env, AIAgent>(env.AIAgent, 'agent-456');
    	// Pass the incoming request straight to your Agent
    	let namedResp = (await namedAgent).fetch(request);
    	return namedResp;

    	// Durable Objects-style addressing
    	// Best for: controlling ID generation, associating IDs with your existing systems,
    	// and customizing when/how an Agent is created or invoked
    	const id = env.AIAgent.newUniqueId();
    	const agent = env.AIAgent.get(id);
    	// Pass the incoming request straight to your Agent
    	let resp = await agent.fetch(request);

    	// return Response.json({ hello: 'visit https://developers.cloudflare.com/agents for more' });
    },

} satisfies ExportedHandler<Env>;
</code>

<code>
// client.js
import { AgentClient } from "agents/client";

const connection = new AgentClient({
agent: "dialogue-agent",
name: "insight-seeker",
});

connection.addEventListener("message", (event) => {
console.log("Received:", event.data);
});

connection.send(
JSON.stringify({
type: "inquiry",
content: "What patterns do you see?",
})
);
</code>

<code>
// app.tsx
// React client hook for the agents
import { useAgent } from "agents/react";
import { useState } from "react";

// useAgent client API
function AgentInterface() {
const connection = useAgent({
agent: "dialogue-agent",
name: "insight-seeker",
onMessage: (message) => {
console.log("Understanding received:", message.data);
},
onOpen: () => console.log("Connection established"),
onClose: () => console.log("Connection closed"),
});

const inquire = () => {
connection.send(
JSON.stringify({
type: "inquiry",
content: "What insights have you gathered?",
})
);
};

return (

<div className="agent-interface">
<button onClick={inquire}>Seek Understanding</button>
</div>
);
}

// State synchronization
function StateInterface() {
const [state, setState] = useState({ counter: 0 });

const agent = useAgent({
agent: "thinking-agent",
onStateUpdate: (newState) => setState(newState),
});

const increment = () => {
agent.setState({ counter: state.counter + 1 });
};

return (

<div>
<div>Count: {state.counter}</div>
<button onClick={increment}>Increment</button>
</div>
);
}
</code>

<configuration>
	{
  "durable_objects": {
    "bindings": [
      {
        "binding": "AIAgent",
        "class_name": "AIAgent"
      }
    ]
  },
  "migrations": [
    {
      "tag": "v1",
      // Mandatory for the Agent to store state
      "new_sqlite_classes": ["AIAgent"]
    }
  ]
}
</configuration>
<key_points>

- Imports the `Agent` class from the `agents` package
- Extends the `Agent` class and implements the methods exposed by the `Agent`, including `onRequest` for HTTP requests, or `onConnect` and `onMessage` for WebSockets.
- Uses the `this.schedule` scheduling API to schedule future tasks.
- Uses the `this.setState` API within the Agent for syncing state, and uses type parameters to ensure the state is typed.
- Uses the `this.sql` as a lower-level query API.
- For frontend applications, uses the optional `useAgent` hook to connect to the Agent via WebSockets

</key_points>
</example>

<example id="workers-ai-structured-outputs-json">
<description>
Workers AI supports structured JSON outputs with JSON mode, which supports the `response_format` API provided by the OpenAI SDK.
</description>
<code language="typescript">
import { OpenAI } from "openai";

interface Env {
OPENAI_API_KEY: string;
}

// Define your JSON schema for a calendar event
const CalendarEventSchema = {
type: 'object',
properties: {
name: { type: 'string' },
date: { type: 'string' },
participants: { type: 'array', items: { type: 'string' } },
},
required: ['name', 'date', 'participants']
};

export default {
async fetch(request: Request, env: Env) {
const client = new OpenAI({
apiKey: env.OPENAI_API_KEY,
// Optional: use AI Gateway to bring logs, evals & caching to your AI requests
// https://developers.cloudflare.com/ai-gateway/providers/openai/
// baseUrl: "https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_id}/openai"
});

    	const response = await client.chat.completions.create({
        model: 'gpt-4o-2024-08-06',
        messages: [
          { role: 'system', content: 'Extract the event information.' },
          { role: 'user', content: 'Alice and Bob are going to a science fair on Friday.' },
        ],
    		// Use the `response_format` option to request a structured JSON output
        response_format: {
    			// Set json_schema and provide ra schema, or json_object and parse it yourself
          type: 'json_schema',
          schema: CalendarEventSchema, // provide a schema
        },
      });

    	// This will be of type CalendarEventSchema
    	const event = response.choices[0].message.parsed;

    	return Response.json({
    		"calendar_event": event,
    	})
    }

}
</code>
<configuration>
{
"name": "my-app",
"main": "src/index.ts",
"compatibility_date": "$CURRENT_DATE",
"observability": {
"enabled": true
}
}
</configuration>
<key_points>

- Defines a JSON Schema compatible object that represents the structured format requested from the model
- Sets `response_format` to `json_schema` and provides a schema to parse the response
- This could also be `json_object`, which can be parsed after the fact.
- Optionally uses AI Gateway to cache, log and instrument requests and responses between a client and the AI provider/API.

</key_points>
</example>

</code_examples>

<api_patterns>

<pattern id="websocket_coordination">
<description>
Fan-in/fan-out for WebSockets. Uses the Hibernatable WebSockets API within Durable Objects. Does NOT use the legacy addEventListener API.
</description>
<implementation>
export class WebSocketHibernationServer extends DurableObject {
  async fetch(request: Request, env: Env, ctx: ExecutionContext) {
    // Creates two ends of a WebSocket connection.
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    // Call this to accept the WebSocket connection.
    // Do NOT call server.accept() (this is the legacy approach and is not preferred)
    this.ctx.acceptWebSocket(server);

    return new Response(null, {
          status: 101,
          webSocket: client,
    });

},

async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void | Promise<void> {
// Invoked on each WebSocket message.
ws.send(message)
},

async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) void | Promise<void> {
// Invoked when a client closes the connection.
ws.close(code, "<message>");
},

async webSocketError(ws: WebSocket, error: unknown): void | Promise<void> {
// Handle WebSocket errors
}
}
</implementation>
</pattern>
</api_patterns>

<user_prompt>
{user_prompt}
</user_prompt>

## Cursor Rules

Yes, I can help you create Cursor agent configuration rules based on your AGENT.md file! Let me read the AGENT.md file and generate a comprehensive `.cursorrules` file that Cursor will automatically enforce.

[1 tool called]

Now I'll create a comprehensive `.cursorrules` file based on your AGENT.md guidelines. This file will be automatically enforced by Cursor on every task:

[1 tool called]

Perfect! I've created a comprehensive `.cursorrules` file that Cursor will automatically enforce on every task. This file extracts all the critical rules from your AGENT.md and formats them as enforceable guidelines.

## Key Features of the `.cursorrules` file:

### 🔒 **Automatic Enforcement**

- Cursor will automatically apply these rules to every AI interaction
- No need to manually remind the AI about guidelines
- Consistent behavior across all development tasks

### 📋 **Comprehensive Coverage**

The rules cover all critical areas from your AGENT.md:

1. **Package Management** - Enforces `pnpm` only
2. **AI Model Typing** - Prevents `any` types, enforces environment variables
3. **Browser Rendering** - Ensures proper Cloudflare Playwright usage
4. **TypeScript Standards** - Enforces proper typing and imports
5. **Architecture Compliance** - Ensures proper use of Cloudflare services
6. **Database Schema** - Prevents unauthorized schema changes
7. **API Conventions** - Enforces RESTful patterns
8. **Security & Performance** - Built-in best practices
9. **Testing & Documentation** - Ensures proper examples and tests

### 🎯 **Specific Code Patterns**

The rules include specific code examples showing:

- ✅ Correct patterns to follow
- ❌ Incorrect patterns to avoid
- Required environment variable usage
- Proper TypeScript typing patterns

### 🚨 **Critical Violations Prevention**

The rules specifically prevent the violations you just caught:

- Using hardcoded model names instead of `env.EMBEDDING_MODEL`
- Using `as any` type casting instead of proper typing
- Using wrong package managers (`npm`/`yarn` instead of `pnpm`)
- Incorrect Playwright configuration

## 📋 **Rule System Integration**

### **Automatic Enforcement**

1. **Project Rules**: Located in `.cursor/rules/` directory (`.mdc` format)
2. **Automatic Application**: Rules are applied based on file patterns and context
3. **No Manual Reminders**: AI agents automatically follow these rules
4. **Consistent Enforcement**: Every AI interaction follows these standards

### **Rule Documentation**

- **Complete Reference**: See `.cursor/RULES.md` for comprehensive documentation
- **Individual Rules**: Each rule file focuses on specific aspects (architecture, typing, etc.)
- **Version Controlled**: All rules are tracked in git and team-shareable

### **Migration Complete**

- ✅ Migrated from legacy `.cursorrules` to new Project Rules system
- ✅ Organized rules into focused, maintainable `.mdc` files
- ✅ Added comprehensive documentation and examples
- ✅ Integrated with AGENTS.md as mandatory requirements

**🎯 Result**: Every AI agent interaction is now automatically bound by these mandatory rules, ensuring consistent adherence to project guidelines and Cloudflare Workers best practices!
