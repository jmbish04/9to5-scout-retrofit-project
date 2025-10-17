# AI Agent Prompt: Implement a Comprehensive End-to-End Testing & Monitoring Suite

Your mission is to implement a comprehensive, fully transparent, end-to-end (E2E) testing suite for the 9to5-Scout Cloudflare Worker. This suite will be designed to validate the entire job processing pipeline, from initial scraping to final data persistence and monitoring, providing real-time feedback via a WebSocket and a dedicated frontend.

---

### Epic 1: The End-to-End Testing Workflow

The core of this task is to create a new testing module that executes and validates a multi-step workflow. This workflow must be instrumented to provide detailed, real-time feedback.

**✅ Implement the E2E Test Pipeline (`src/lib/e2e-tester.ts`):**
This new module will contain the core logic for running a test. It should orchestrate the following 10 steps, capturing the status, duration, and logs for each:

1.  **Initialize Test:**
    -   Generate a unique `testId`.
    -   Log the initial configuration (URL, test type).
    -   **Success:** Test ID is created.

2.  **Trigger Scrape & Content Extraction:**
    -   Use the `Browser Rendering API` to fetch the content of the target URL.
    -   **Success:** The raw HTML/Markdown is successfully retrieved.
    -   **Validation:** Check if the extracted content is non-empty and contains expected keywords or selectors (e.g., "apply", "description", "h1").

3.  **Verify AI Processing (Data Structuring):**
    -   Pass the extracted content to the Workers AI model (`env.AI`).
    -   Use `guided_json` to structure the data.
    -   **Success:** The AI model returns a valid, structured JSON object that conforms to the expected schema.
    -   **Validation:** Check if key fields like `title` and `company` are populated.

4.  **Verify D1 & Vectorize Persistence:**
    -   Insert the structured job data into the `jobs` table in the D1 database.
    -   **Validation (D1):** Immediately query the database by the job's `id` or `url` to confirm the record was written correctly.
    -   Generate embeddings from the job description using the `EMBEDDING_MODEL`.
    -   Insert the embeddings into the `VECTORIZE_INDEX`.
    -   **Validation (Vectorize):** Query the vector index with the new embedding to ensure the job can be retrieved via semantic search.

5.  **Verify R2 Asset Storage:**
    -   Generate a test asset (e.g., a screenshot or the raw HTML).
    -   Upload this asset to the R2 bucket under a `test_results/{testId}/` prefix.
    -   **Success:** The R2 `put()` operation completes without errors.

6.  **Verify Durable Object State:**
    -   Before the test, query the status of a relevant Durable Object (e.g., `SiteCrawler` for the target site).
    -   After the test, query its status again.
    -   **Validation:** Confirm that state properties like `last_activity` or `crawled_count` have been updated correctly.

7.  **Verify Queue/Workflow Dispatch:**
    -   Simulate the dispatch of the structured job data to a Cloudflare Queue or the initiation of a Workflow.
    -   **Success:** The `queue.send()` or `workflow.start()` method executes without errors.

8.  **Verify Notification Dispatch:**
    -   Trigger the logic that sends an email notification.
    -   **Validation:** Confirm that the `env.EMAIL_SENDER.send()` method was invoked with the expected parameters (this may require a mock or spy function in a test environment).

9.  **Data Rollback/Cleanup:**
    -   Delete the created records from D1 (`jobs`, `snapshots`).
    -   Delete the assets from R2.
    -   Delete the entry from the Vectorize index.
    -   **Success:** All created test data is successfully removed, ensuring the test is idempotent.

10. **Final Report:**
    -   Compile the results of all previous steps into a final summary.
    -   Mark the entire test run as `completed` or `failed`.
    -   **Success:** The final report is generated and broadcasted.

---

### Epic 2: D1 Database Schema for Test Results

**✅ Create a New D1 Migration:**
Define two new tables to store the results of each test run.

-   **`test_runs`**: A master table for each test execution.
    ```sql
    CREATE TABLE test_runs (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT NOT NULL, -- 'running', 'completed', 'failed'
      start_time TEXT NOT NULL,
      end_time TEXT,
      trigger_source TEXT -- 'frontend', 'api', 'agent'
    );
    ```

-   **`test_run_steps`**: A detail table to log the outcome of each step in the pipeline.
    ```sql
    CREATE TABLE test_run_steps (
      id TEXT PRIMARY KEY,
      test_run_id TEXT NOT NULL REFERENCES test_runs(id),
      step_name TEXT NOT NULL,
      status TEXT NOT NULL, -- 'success', 'failed'
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_ms INTEGER,
      logs TEXT, -- Store detailed logs or error messages as JSON
      UNIQUE(test_run_id, step_name)
    );
    ```

---

### Epic 3: Worker API Endpoints (REST & WebSocket)

**✅ Create New Hono Routes:**

1.  **REST API (`src/routes/testing.ts`):**
    -   `POST /api/v1/testing/run`:
        -   Accepts a payload: `{ "url": "...", "testName": "...", "testType": "..." }`.
        -   Initiates a new E2E test run by calling the `e2e-tester.ts` module.
        -   Immediately returns a `testId` and the WebSocket URL for real-time monitoring: `{ "testId": "...", "websocketUrl": "/api/v1/testing/ws/..." }`.
    -   `GET /api/v1/testing/results`: Lists all past test runs from the `test_runs` table.
    -   `GET /api/v1/testing/results/:id`: Retrieves the full results for a specific `testId`, including all its steps from `test_run_steps`.
    -   `GET /api/v1/testing/results/last-failed`: A dedicated endpoint that returns the full results of the most recent test run with a `failed` status.

2.  **WebSocket API (`src/routes/testing-ws.ts`):**
    -   `GET /api/v1/testing/ws/:testId`:
        -   Establishes a WebSocket connection for a specific `testId`.
        -   As the E2E test runs, the `e2e-tester.ts` module will publish status updates for each step to this WebSocket handler.
        -   **Message Format:** Send JSON messages with the following structure:
            ```json
            {
              "step": "Verify D1 Persistence",
              "status": "success", // or 'running', 'failed'
              "message": "Record successfully written to 'jobs' table.",
              "duration_ms": 150,
              "isComplete": false // true only on the final report
            }
            ```

---

### Epic 4: Frontend UI

**✅ Create a New Static HTML File (`public/e2e-testing.html`):**
This file will be the user-facing dashboard for running and monitoring tests.

-   **UI Components:**
    -   An input form to enter a URL and select a test type.
    -   A "Run Test" button to trigger the `POST /api/v1/testing/run` endpoint.
    -   A visual representation of the 8-step workflow, with each step displayed as a distinct block.
-   **Real-time Functionality:**
    -   Upon clicking "Run Test", the frontend will use the returned `websocketUrl` to establish a WebSocket connection.
    -   As messages are received, dynamically update the UI:
        -   Change the color of each step's block (e.g., grey for pending, blue for running, green for success, red for failure).
        -   Display the status message and duration for each step.
-   **Interactivity:**
    -   Make each step block clickable.
    -   On click, open a modal window that displays the detailed `logs` for that step.
    -   The modal must include a "Copy Logs" button to easily copy the log content to the clipboard.

---

### Epic 5: Tooling for AI Agent

**✅ Update `package.json` and Create a Helper Script:**

1.  **`package.json` script:**
    -   Add a new script to enable an AI agent to easily retrieve the last failed test run.
        ```json
        "scripts": {
          ...
          "test:e2e:get-last-failed": "node ./scripts/get-last-failed-test.js"
        }
        ```

2.  **Helper Script (`scripts/get-last-failed-test.js`):**
    -   Create this new Node.js script.
    -   It should make an authenticated `fetch` request to the `GET /api/v1/testing/results/last-failed` endpoint on the worker.
    -   It must print the full JSON response to `stdout`. This allows an AI agent to execute `pnpm run test:e2e:get-last-failed` and consume the structured output directly for analysis.

---

### Implementation Notes for the Agent:

-   Create new files for the new routes and logic; do not bloat `index.ts`.
-   Use Hono for all routing.
-   Ensure all new D1 queries are properly typed.
-   Strictly avoid `any` types.
-   The frontend should be a single, self-contained HTML file with vanilla JavaScript and CSS for simplicity.
-   All API endpoints, except the frontend and WebSocket, must be protected by the existing API key authentication.
