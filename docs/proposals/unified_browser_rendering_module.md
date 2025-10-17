# Proposal: A Unified Browser Rendering Module for Enhanced Scraping

This document proposes the creation of a new, unified TypeScript module, `src/lib/rendering.ts`, to serve as a centralized interface for all interactions with the Cloudflare Browser Rendering **REST API**.

This module will **augment** our existing scraping capabilities, providing a simpler, more robust method for stateless tasks, including those requiring authentication. It will coexist with the current Playwright-based `MYBROWSER` binding, which will be retained for complex, stateful scraping scenarios required by the `steel` scraper.

---

### 1. Core Objective: A Dual-Approach to Scraping (with Current Status and Discrepancy)

The primary goal is to introduce a powerful, declarative scraping method via the REST API while retaining our existing Playwright setup for tasks that demand it.

*   **New `rendering.ts` Module (REST API):** This module will handle the majority of scraping tasks that are stateless. It's ideal for capturing screenshots, PDFs, Markdown, or structured data from pages that can be accessed directly with or without a simple session cookie.
    *   **Current Status:** The core crawling logic in `src/lib/crawl.ts` *already utilizes* the Cloudflare Browser Rendering API as its primary mechanism for fetching HTML content and generating screenshots/PDFs.
*   **Existing `MYBROWSER` Binding (Playwright):** This will be preserved specifically for scrapers like `steel` that may require complex, multi-step interactions (e.g., complex login flows, filling out forms, clicking through multiple pages) that are better suited to Playwright's imperative model.
    *   **Current Status:** The `src/lib/steel.ts` module (the Steel Scraper) *still directly imports `@cloudflare/playwright` and uses `chromium.launch(this.env.MYBROWSER as any)`*, indicating it has *not* been refactored to use the Cloudflare Browser Rendering API.

This dual approach allows us to use the simplest tool for the job, significantly reducing complexity for most scraping tasks while retaining the power of Playwright where it's needed.

**Architectural Discrepancy:** There is a conflict between this proposal's intent to *retain* the Playwright `MYBROWSER` binding for `steel-scraper` and the `browser_rendering_api_analysis.md` document's proposal to *deprecate* the `MYBROWSER` binding and refactor `steel-scraper` to use the Cloudflare Browser Rendering API. This discrepancy needs to be resolved to establish a clear architectural direction.

---

### 2. Handling Authentication (e.g., LinkedIn) via REST API

The key to scraping sites that require a login is to perform the authentication flow once (manually or via a separate process) to obtain a session cookie. This cookie can then be injected into the Browser Rendering API calls to access the site in a logged-in state.

**The Strategy:**

1.  **Obtain Session Cookies:** The session cookie(s) for a site like LinkedIn must be obtained and stored securely as a secret in the Worker's environment (e.g., via `wrangler secret put LINKEDIN_COOKIE`).
2.  **Inject Cookies via API:** The Browser Rendering API's endpoints accept a `cookies` parameter. Our new module will read the secret and inject it into the API call.

**Example: `getAuthenticatedMarkdown` function**

```typescript
// In the proposed src/lib/rendering.ts

import Cloudflare from "cloudflare";

// ... (client initialization)

async function getAuthenticatedMarkdown(
  env: Env,
  url: string,
  cookie: { name: string; value: string; domain: string; }[]
): Promise<string> {
  const client = new Cloudflare({ apiToken: env.BROWSER_RENDERING_API_TOKEN });
  const response = await client.browserRendering.markdown.create({
    account_id: env.CLOUDFLARE_ACCOUNT_ID,
    url: url,
    cookies: cookie, // Inject the authentication cookie here
  });
  return response.result;
}

// Usage from another module:
// const cookie = [{
//   name: "li_at",
//   value: env.LINKEDIN_COOKIE,
//   domain: ".linkedin.com"
// }];
// const markdown = await rendering.getAuthenticatedMarkdown(env, "https://linkedin.com/jobs/...", cookie);
```

---

### 3. Proposed `src/lib/rendering.ts` Module Specification

This module will export a service object containing methods for each of the Browser Rendering API's capabilities.

```typescript
// src/lib/rendering.ts

import Cloudflare from "cloudflare";
import { Ai } from '@cloudflare/ai';

// Define the structure for authentication cookies
interface AuthCookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  secure?: boolean;
  httpOnly?: boolean;
}

// Define options for AI-powered extraction
interface AiExtractionOptions {
  provider: 'cloudflare' | 'openai' | 'anthropic' | 'google';
  prompt: string;
  schema: any; // Zod-like JSON schema
}

class RenderingService {
  private client: Cloudflare;

  constructor(apiToken: string) {
    this.client = new Cloudflare({ apiToken });
  }

  // --- Core Rendering Methods ---

  async getScreenshot(accountId: string, url: string, fullPage: boolean = true, authCookie?: AuthCookie[]): Promise<Blob> {
    const response = await this.client.browserRendering.screenshot.create({
      account_id: accountId,
      url: url,
      cookies: authCookie,
      screenshotOptions: { fullPage },
    });
    return response as Blob;
  }

  async getPdf(accountId: string, url: string, authCookie?: AuthCookie[]): Promise<Blob> {
    const response = await this.client.browserRendering.pdf.create({
      account_id: accountId,
      url: url,
      cookies: authCookie,
    });
    return response.blob();
  }

  async getMarkdown(accountId: string, url: string, authCookie?: AuthCookie[]): Promise<string> {
    const response = await this.client.browserRendering.markdown.create({
      account_id: accountId,
      url: url,
      cookies: authCookie,
    });
    return response.result;
  }

  async scrape(accountId: string, url: string, selectors: { selector: string }[], authCookie?: AuthCookie[]): Promise<any> {
    const response = await this.client.browserRendering.scrape.create({
      account_id: accountId,
      url: url,
      elements: selectors,
      cookies: authCookie,
    });
    return response.result;
  }

  // --- AI-Powered Extraction ---

  async getStructuredJson(
    env: Env,
    url: string,
    options: AiExtractionOptions,
    authCookie?: AuthCookie[]
  ): Promise<any> {
    const markdown = await this.getMarkdown(env.CLOUDFLARE_ACCOUNT_ID, url, authCookie);
    const systemPrompt = `You are an expert data extractor. Extract information from the following markdown content according to the provided JSON schema.`;
    const userPrompt = `Content:\n${markdown}\n\nPrompt: ${options.prompt}`;
    const ai = new Ai(env.AI);

    switch (options.provider) {
      case 'cloudflare':
        const cfResponse = await ai.run('@cf/meta/llama-3.1-8b-instruct', {
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userPrompt }],
          response_format: { type: 'json_object', schema: options.schema },
        });
        return cfResponse.response;
      // TODO: Implement other providers
      default:
        throw new Error(`${options.provider} provider not yet implemented.`);
    }
  }
}

// This service can be instantiated in the worker's main entry point.
```

### 4. Configuration and Secrets

To support this new module while retaining the existing setup, the following configurations are required.

**`wrangler.toml`:**
*   **ADD** a new secret for the Browser Rendering API token.
*   **KEEP** the existing `browser` binding for Playwright.

```toml
# wrangler.toml

# ... other configurations

# KEEP THIS for the steel scraper and other complex Playwright tasks
browser = { binding = "MYBROWSER" }

# ADD secrets for the new Rendering REST API module
# These will be set via `wrangler secret put`
# - BROWSER_RENDERING_API_TOKEN
# - LINKEDIN_COOKIE
# - OPENAI_API_KEY
# - etc.
```

**Current Ambiguity of `MYBROWSER` Binding:**

It has been observed that the `MYBROWSER` binding in `wrangler.toml` is currently being used for *both* the Cloudflare Browser Rendering API (in `src/lib/crawl.ts`) and the local Playwright Durable Object (in `src/lib/steel.ts`). This dual usage creates an architectural ambiguity that needs to be resolved. A clear decision is required on whether `MYBROWSER` should exclusively point to the Cloudflare Browser Rendering API, or if a separate binding (e.g., `MYPLAYWRIGHTBROWSER`) is needed if a Playwright Durable Object is to be retained for specific, complex scenarios.

### 5. Next Steps

To move forward with a clear and consistent scraping architecture, the following next steps are recommended, integrating the action plan from `browser_rendering_api_analysis.md`:

1.  **Resolve `MYBROWSER` Binding Ambiguity (High Priority):**
    *   Make a definitive decision on the intended purpose of the `MYBROWSER` binding. If it is to be exclusively for the Cloudflare Browser Rendering API, ensure all code (including `src/lib/steel.ts`) is refactored accordingly, and Playwright-specific imports are removed.
    *   If a Playwright Durable Object is still required for complex, stateful scenarios, create a *distinct* binding (e.g., `MYPLAYWRIGHTBROWSER`) in `wrangler.toml` and update `src/lib/steel.ts` to use this new, dedicated binding.

2.  **Refactor `src/lib/steel.ts`:**
    *   Migrate the Playwright-based scraping logic within the `MultiPlatformJobScraper` class in `src/lib/steel.ts` to exclusively use the `BrowserRenderingClient` functions from `src/lib/browser-rendering.ts`. This will align the Steel Scraper with the Cloudflare Browser Rendering API as the primary scraping mechanism.
    *   Remove all direct imports of `@cloudflare/playwright` and related Playwright-specific code from `src/lib/steel.ts`.

3.  **Create `src/lib/rendering.ts`:**
    *   Implement the `RenderingService` class as specified in Section 3 of this document, centralizing interactions with the Cloudflare Browser Rendering API.

4.  **Add New Secrets:**
    *   Use `wrangler secret put` to add `BROWSER_RENDERING_API_TOKEN` and any necessary authentication cookies (e.g., `LINKEDIN_COOKIE`).

5.  **Document Python Scraper Interaction:**
    *   Add explicit inline comments or a dedicated section in `src/lib/crawl.ts` (or a new `docs` file) detailing the conditions under which the Python scraper fallback is triggered, the structure of the payload sent to `/api/v1/scrape-fallback`, and the expected response.

6.  **Comprehensive E2E Testing:**
    *   Develop comprehensive end-to-end tests that cover both the primary Cloudflare Browser Rendering API scraping path and the Python scraper fallback mechanism.
    *   Include tests for various job sites, successful scraping scenarios, and simulated failures of the Cloudflare API to ensure the fallback correctly engages and processes data.

7.  **Utilize the New Service:**
    *   For new scraping tasks or when refactoring simpler existing ones, import and use the `RenderingService` from `src/lib/rendering.ts`.

```