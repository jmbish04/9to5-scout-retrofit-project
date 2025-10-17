# AI Agent Code Style Guide

This document outlines the code style and documentation standards for all AI agent development within this project. The primary goal is to ensure maximum clarity, maintainability, and ease of understanding for both human developers and other AI agents. Verbosity and comprehensive documentation are prioritized over brevity.

## 1. File-Level Docstrings

Every single source code file **must** begin with a multi-line docstring that provides a comprehensive overview of the file's purpose and contents.

### Requirements:

- **Purpose**: A clear and concise statement explaining why this file exists and its role in the overall architecture.
- **Key Components**: A list and brief description of the primary classes, functions, objects, or workflows defined within the file.
- **Dependencies**: Mention any critical dependencies or interactions with other parts of the system (e.g., "This module relies on the `SiteCrawler` Durable Object for data acquisition.").
- **Author/Maintainer**: (Optional but recommended) Note the original author or current maintainer.

### Example (`src/lib/email.ts`):

```typescript
/**
 * @file This file contains all utility functions and logic related to email processing for the 9to5-Scout platform. It is responsible for parsing incoming job alert emails, extracting job information, generating analytical insights from job data, and sending out formatted email reports.
 *
 * Key Components:
 * - `extractJobUrls`: Uses regex patterns to find job URLs in raw email content.
 * - `extractJobInfo`: Leverages Workers AI with a guided JSON schema to intelligently parse structured job details from email bodies.
 * - `parseEmailFromRequest`: Handles the parsing of multipart MIME email data from Cloudflare Email Routing requests.
 * - `generateEmailInsights`: Aggregates data from the D1 database to create statistics for periodic email reports.
 * - `sendInsightsEmail`: Constructs and sends HTML-formatted insight emails using the `EMAIL_SENDER` binding.
 * - `formatInsightsEmail`: A templating function to generate the final HTML for the insights email.
 *
 * This module is a core part of the automated job discovery pipeline, triggered by the scheduled cron handler in `src/index.ts`.
 */
```

## 2. Function and Method Docstrings

Every function, method, and class constructor **must** have a detailed docstring immediately preceding its definition.

### Requirements:

- **Comprehensive Description**: A thorough explanation of what the function does, its logic, and its purpose. Do not be brief. Explain the "why" behind the code.
- **Parameters (`@param`)**: Each parameter must be documented with its name, type, and a detailed description of its purpose and expected format.
- **Return Value (`@returns`)**: The return value must be documented with its type and a clear description of what it represents. For complex objects, describe the structure.
- **Side Effects**: Explicitly mention any side effects, such as database writes, API calls, or modifications to state.
- **Throws (`@throws`)**: Document any errors that the function is expected to throw.
- **Example Usage (`@example`)**: Provide a clear, runnable example of how to use the function.

### Example:

```typescript
/**
 * Generates a comprehensive set of analytical insights about the job market based on a user's specific configuration.
 *
 * This function queries the D1 database to aggregate data within a specific time window (defined by `config.frequency_hours`).
 * It collects newly discovered jobs, significant changes to existing jobs (e.g., title or description updates), and calculates
 * high-level statistics, including a breakdown of job roles. This data is compiled into a structured `EmailInsights` object,
 * which serves as the data source for sending periodic email reports.
 *
 * @param env - The Cloudflare Worker environment bindings, providing access to the D1 database (`env.DB`).
 * @param config - The `EmailConfig` object for the specific user, containing settings like frequency and content preferences.
 * @returns A `Promise` that resolves to an `EmailInsights` object containing aggregated job data.
 * @throws Will throw an error if the database connection fails or a query is malformed.
 * @example
 * const insights = await generateEmailInsights(env, {
 *   id: 'user123',
 *   frequency_hours: 24,
 *   include_new_jobs: true,
 *   include_job_changes: true,
 *   include_statistics: true,
 *   recipient_email: 'user@example.com',
 *   enabled: true
 * });
 */
export async function generateEmailInsights(env: any, config: EmailConfig): Promise<EmailInsights> {
  // ... implementation
}
```

## 3. In-Code Comments

In-code comments should be used liberally to explain complex logic, business rules, or non-obvious implementation details. The goal is to leave no room for ambiguity.

### Guidelines:

- **Verbose Explanations**: Comments should be full sentences that explain the *why* behind a block of code, not just the *what*.
- **Logical Blocks**: Precede complex blocks of code (e.g., loops, conditional branches, data transformations) with a comment explaining the purpose of the upcoming block.
- **Clarify Assumptions**: If the code makes any assumptions, document them explicitly.
- **TODOs and FIXMEs**: Use `// TODO:` for planned features and `// FIXME:` for known issues that need to be addressed, including a brief explanation.

### Example:

```typescript
// The primary goal here is to create a robust "from" address for the email.
// We construct it using a static part ('digest@') and a domain from the environment variables.
// This approach is used because the `send_email` binding in wrangler.toml does not specify a 'from' address;
// it must be provided at runtime. If `env.EMAIL_ROUTING_DOMAIN` is not set, the operation will fail,
// which is a deliberate design choice to ensure configuration is explicit.
const fromAddress = `digest@${env.EMAIL_ROUTING_DOMAIN}`;

// We are creating a new CloudflareEmailMessage instance.
// Note that the third argument is the raw email content, which requires us to manually construct
// the headers (like Subject and Content-Type) directly into the string. This is required
// by the Cloudflare Email API for maximum flexibility.
const message = new CloudflareEmailMessage(
  fromAddress,               // From
  config.recipient_email,    // To
  `Subject: ${subject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${htmlContent}` // Raw content
);

// This is the final step where the email is dispatched.
// The `env.EMAIL_SENDER.send()` method is asynchronous and leverages the binding
// configured in the wrangler.toml file. A failure at this stage will be caught
// by the surrounding try/catch block and logged.
await env.EMAIL_SENDER.send(message);
```
