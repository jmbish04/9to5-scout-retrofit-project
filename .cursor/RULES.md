# 9to5 Scout Project Rules Documentation

This document provides comprehensive documentation of all project rules that are automatically enforced by Cursor AI. These rules ensure consistent code quality, architecture compliance, and adherence to Cloudflare Workers best practices.

## Rule System Overview

The project uses Cursor's Project Rules system with `.mdc` files in `.cursor/rules/` directory. Rules are automatically applied based on file patterns and context, ensuring consistent AI behavior across all development tasks.

## Rule Categories

### 1. Cloudflare Documentation Verification (`cloudflare-docs-verification.mdc`)

**Scope:** All code files and configuration files  
**Application:** Always applied (`alwaysApply: true`)

#### Critical Documentation Requirements:

- **MANDATORY**: Use `mcp_cloudflare-docs_search_cloudflare_documentation` before ANY implementation
- **ALWAYS**: Search Cloudflare docs before developing new features
- **ALWAYS**: Search Cloudflare docs before theorizing bug fixes
- **ALWAYS**: Verify approach against official documentation

### 2. Core Architecture Rules (`architecture.mdc`)

**Scope:** All TypeScript/JavaScript files in the project  
**Application:** Always applied (`alwaysApply: true`)

#### Key Requirements:

- **AI (Workers AI)**: Use `env.AI` for all generative tasks with proper typing
- **Database (D1)**: Use `env.DB` as single source of truth, adhere to schema
- **Browser Rendering**: Use `env.MYBROWSER` for web scraping, not simple `fetch`
- **Vectorize**: Use `VECTORIZE_INDEX` for semantic search and embeddings
- **Storage Services**: R2 for large artifacts, KV for configuration, Durable Objects for state

#### Proactive Task Chaining:

Tasks are not complete after a single action. For job scraping:

1. Scrape job data via `SiteCrawler`
2. Save to `jobs` table in D1
3. Create content snapshot in R2
4. Generate and store vector embeddings in `VECTORIZE_INDEX`
5. Initiate monitoring via `JobMonitor` Durable Object

### 3. Cloudflare Workers AI Best Practices (`cloudflare-workers-ai.mdc`)

**Scope:** All files using Workers AI  
**Application:** Always applied (`alwaysApply: true`)

#### Critical Workers AI Requirements:

- **NEVER** use deprecated imports (`cloudflare:ai` or `cloudflare:workers`)
- **ALWAYS** use `env.AI.run()` with proper `keyof AiModels` typing
- **ALWAYS** use environment variables for model selection
- **NEVER** use `any` type for AI model parameters
- **ALWAYS** run `pnpm exec wrangler types` to generate proper types

#### Model Selection Guidelines:

- **`DEFAULT_MODEL_WEB_BROWSER`**: Web scraping, content extraction, browser tasks
- **`DEFAULT_MODEL_REASONING`**: Complex reasoning, job analysis, document generation
- **`EMBEDDING_MODEL`**: Vector embeddings for semantic search

### 4. TypeScript and AI Model Typing (`typescript-ai-typing.mdc`)

**Scope:** All TypeScript files  
**Application:** Always applied (`alwaysApply: true`)

#### Critical AI Model Typing Rules:

- **NEVER** use `any` type for AI model parameters or responses
- **ALWAYS** use `keyof AiModels` type for model parameters
- **ALWAYS** use environment variables for model selection
- **ALWAYS** use proper TypeScript typing for AI responses

#### Required Patterns:

```typescript
// CORRECT - Use environment variables with proper typing
const response = await env.AI.run(env.EMBEDDING_MODEL, { text: content });
const embeddingResponse = response as { data?: number[][] };

// WRONG - Never do this
const response = await env.AI.run("@cf/baai/bge-large-en-v1.5" as any, inputs);
```

#### Environment Variables:

- `env.DEFAULT_MODEL_WEB_BROWSER` - For web scraping and browser tasks
- `env.DEFAULT_MODEL_REASONING` - For complex reasoning tasks
- `env.EMBEDDING_MODEL` - For generating vector embeddings

### 4. Package Management (`package-management.mdc`)

**Scope:** Package files and all code files  
**Application:** Always applied (`alwaysApply: true`)

#### Critical Rules:

- **NEVER** use `npm` or `yarn` commands
- **ALWAYS** use `pnpm` exclusively:
  - Installing: `pnpm install`
  - Adding packages: `pnpm add <package-name>`
  - Running scripts: `pnpm run <script-name>`
  - Updating: `pnpm update`

#### Dependency Rules:

- Use official SDKs when available
- Minimize external dependencies
- NO libraries with FFI/native/C bindings
- Prefer Cloudflare-native packages

#### Browser Rendering Dependencies:

- **NEVER** use standard Playwright package
- **ALWAYS** use `@cloudflare/playwright` package
- **NEVER** use `external` field in `[build]` section
- **ALWAYS** configure browser binding in wrangler.toml

### 5. Database and API (`database-api.mdc`)

**Scope:** All code files, migrations, and routes  
**Application:** Always applied (`alwaysApply: true`)

#### Database Schema Compliance:

- ALL D1 database operations MUST conform to established table structures
- Do NOT alter schemas without documented migration plan
- Core tables: `sites`, `jobs`, `job_changes`

#### API Conventions:

- Follow RESTful patterns in `/src/routes/` directory
- Sites: `GET /api/sites`, `POST /api/sites`, `GET /api/sites/:id`
- Jobs: `GET /api/jobs`, `GET /api/jobs/:id`, `POST /api/jobs/:id/monitor`
- Discovery & Monitoring: `POST /api/discovery/:siteId`, `GET /api/monitor/:jobId/status`
- Search: `GET /api/search?q=query`

### 6. WebSocket and Durable Objects (`websocket-durable-objects.mdc`)

**Scope:** All code files  
**Application:** Always applied (`alwaysApply: true`)

#### WebSocket Rules:

- **ALWAYS** use Durable Objects WebSocket Hibernation API
- Use `this.ctx.acceptWebSocket(server)` - NOT `server.accept()`
- Define `async webSocketMessage()` and `async webSocketClose()` handlers
- **NEVER** use `addEventListener` pattern in Durable Objects

#### Agents SDK Rules:

- Prefer `agents` SDK for AI Agents
- Extend `Agent` class with proper type parameters: `Agent<Env, MyState>`
- Use `this.setState` for state management
- Use `this.sql` for direct SQLite database access

### 7. Configuration and Security (`configuration-security.mdc`)

**Scope:** Configuration files and all code  
**Application:** Always applied (`alwaysApply: true`)

#### Configuration Rules:

- **ALWAYS** provide wrangler.toml (not wrangler.toml)
- Set `compatibility_date = "2025-03-07"`
- Set `compatibility_flags = ["nodejs_compat"]`
- Enable observability: `"enabled": true`
- Only include bindings that are actually used in code

#### Security Rules:

- Implement proper request validation
- Use appropriate security headers
- Handle CORS correctly when needed
- Follow least privilege principle for bindings
- Sanitize user inputs
- Never bake secrets into code

### 8. Testing and Code Standards (`testing-code-standards.mdc`)

**Scope:** All code files and test files  
**Application:** Always applied (`alwaysApply: true`)

#### Testing Rules:

- Include basic test examples
- Provide curl commands for API endpoints
- Add example environment variable values
- Include sample requests and responses

#### Code Standards:

- Generate TypeScript by default unless JavaScript specifically requested
- Add appropriate TypeScript types and interfaces
- Keep code in single file unless otherwise specified
- Use official SDKs when available
- Minimize external dependencies
- NO libraries with FFI/native/C bindings
- Include proper error handling and logging
- Include comments explaining complex logic

### 9. Cloudflare Documentation Verification (`cloudflare-docs-verification.mdc`)

**Scope:** All code files and configuration files  
**Application:** Always applied (`alwaysApply: true`)

#### Critical Documentation Requirements:

- **MANDATORY**: Use `mcp_cloudflare-docs_search_cloudflare_documentation` before ANY implementation
- **ALWAYS**: Search Cloudflare docs before developing new features
- **ALWAYS**: Search Cloudflare docs before theorizing bug fixes
- **ALWAYS**: Verify approach against official documentation

#### Required Workflow:

1. **Search First**: Use `mcp_cloudflare-docs_search_cloudflare_documentation` tool
2. **Research Context**: Obtain latest Cloudflare Workers patterns and best practices
3. **Verify Approach**: Ensure implementation aligns with official documentation
4. **Check Updates**: Look for recent changes or new features
5. **Validate Patterns**: Confirm usage patterns are current and recommended

#### When to Use Cloudflare Docs MCP:

- Before new feature development
- When debugging or fixing issues
- When confidence level < 85% on any Cloudflare Workers implementation
- When exploring new Cloudflare services
- When making architectural decisions
- When using any Cloudflare API or service

### 10. Email Processing (`email-processing.mdc`)

**Scope:** Email-related files only  
**Application:** Auto-attached when working with email files (`alwaysApply: false`)

#### Email AI Extraction Rules:

- Use Llama 4 for structured responses with `response_format` and `json_schema`
- Use Zod schemas for validation and type safety
- Implement proper fallback mechanisms for AI failures
- Use environment variables for model selection

#### Email Processing Workflow:

1. Parse raw email content
2. Extract structured data using AI with JSON schema
3. Validate using Zod schemas
4. Generate embeddings for semantic search
5. Process job links and OTP detection
6. Store in database with proper error handling

#### OTP Detection Rules:

- Use enhanced regex patterns for OTP detection
- Implement proper service name extraction
- Handle multiple OTP formats and patterns
- Provide meaningful fallback when detection fails

#### Job Link Extraction Rules:

- Extract job-related URLs from email content
- Validate URLs before processing
- Handle multiple job links per email
- Implement proper error handling for failed links

## Rule Application

### Automatic Application

Most rules are automatically applied based on file patterns:

- **Always Apply**: Core architecture, typing, package management, database, WebSocket, configuration, and testing rules
- **Auto Attached**: Email processing rules apply when working with email-related files

### Manual Application

Rules can be manually invoked using `@ruleName` in chat conversations.

### Rule Precedence

Rules are applied in this order:

1. **Team Rules** (if any)
2. **Project Rules** (these files)
3. **User Rules** (global preferences)

### 11. Frontend Styling and Navigation (`frontend-styling.mdc`)

**Scope:** All HTML, CSS, and JavaScript files in `public/` directory  
**Application:** Auto-attached when working with frontend files (`alwaysApply: false`)

#### Critical Frontend Architecture:

- **NEVER USE CLOUDFLARE PAGES**: This project uses Cloudflare Workers with static assets
- **Static Assets**: All frontend files served from `public/` directory via `env.ASSETS.fetch(request)`
- **No Build Process**: Static HTML, CSS, JS files served directly

#### Mandatory Styling Requirements:

- **Tailwind CSS CDN**: Every HTML page MUST include `<script src="https://cdn.tailwindcss.com"></script>`
- **NEVER REMOVE**: Tailwind CSS CDN is essential for proper styling
- **Location**: Must be in `<head>` section after `<title>` tag
- **Custom CSS**: Use `/css/styles.css` for minimal custom styling

#### Shared Navigation System:

- **File**: `public/js/nav.js` contains the shared navigation system
- **Injection**: All pages must have `<div id="navbar-placeholder"></div>`
- **Script**: All pages must include `<script type="module" src="/js/nav.js"></script>`
- **NEVER**: Create static navigation in HTML files

#### Navigation JavaScript Requirements:

- **Button Types**: All dropdown buttons MUST have `type="button"`
- **Event Handling**: Use `preventDefault()` and `stopPropagation()`
- **No Form Submission**: Prevent default button behavior

#### Common Frontend Mistakes to Avoid:

- **Missing Tailwind CDN**: Causes broken styling and layout
- **Missing nav.js**: Causes empty navigation bar
- **Wrong button types**: Causes page jumping and form submission
- **Static navigation**: Breaks consistency across pages
- **Custom CSS overrides**: Conflicts with Tailwind classes

#### Emergency Fixes:

- Use `fix_pages.sh` script to automatically fix common issues
- Check Tailwind CDN presence in all HTML files
- Verify nav.js inclusion and correct syntax
- Test dropdown functionality without page jumping

## Enforcement

These rules are **MANDATORY** and will be automatically checked on every task. Violations will be flagged and must be corrected before proceeding.

## Maintenance

- Rules are version-controlled and team-shareable
- Individual rule files can be updated independently
- New rules can be added by creating new `.mdc` files in `.cursor/rules/`
- Rules are automatically detected and applied by Cursor

## Related Documentation

- **AGENTS.md**: High-level project guidelines and architecture
- **Individual Rule Files**: Detailed implementation patterns and examples
- **Cloudflare Documentation**: Official platform documentation for verification
