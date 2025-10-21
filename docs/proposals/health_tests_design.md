# Health and Testing System Design Proposal

This document outlines the architecture for a modular, real-time, and persistent health check and testing system for the application.

## 1. Core Principles

*   **Modular Architecture:** Testing and health checks will be decentralized. Each major application module (domain) will contain its own dedicated `health.ts` file, making tests easier to maintain and troubleshoot alongside the code they validate.
*   **Persistent Storage:** All test suite results, whether triggered manually or automatically, will be saved to a D1 database. This creates a verifiable, historical log of application health over time.
*   **Real-Time Feedback:** On-demand test runs will provide immediate, interactive feedback to the user via a WebSocket stream, showing the progress and results of each test as it happens.

## 2. System Components

### 2.1. D1 Database Schema
A new table, `health_check_runs`, will be created to store the results.

*   `id` (TEXT, PRIMARY KEY): Unique identifier for the test run.
*   `timestamp` (TEXT): ISO 8601 timestamp of when the run was initiated.
*   `status` (TEXT): The overall status of the run ('passing', 'failing', 'in-progress').
*   `duration_ms` (INTEGER): The total time taken for the test suite to complete.
*   `results` (TEXT): A JSON blob containing the detailed results of each individual module's tests.
*   `triggered_by` (TEXT): Indicates the trigger ('cron', 'manual_api').

### 2.2. Modular Test Structure
*   A core interface, `HealthCheck`, will be defined in `src/new/core/health.ts`.
*   Each domain (e.g., `src/new/domains/sites/`) will have a `health.ts` file that implements this interface.
*   Each test within a module will check a specific piece of functionality (e.g., "Can connect to D1", "Can create and delete a site").

### 2.3. Health Check Runner
*   A central `HealthCheckRunner` service will be responsible for discovering and executing all modular health checks.
*   It will aggregate the results, calculate the overall status and duration, and save the final report to the D1 table.
*   For real-time runs, it will stream progress updates to the WebSocket Durable Object.

### 2.4. API Endpoint (`/api/health`)
*   **`GET /api/health`**: Fetches the latest completed test run from the `health_check_runs` table in D1.
*   **`POST /api/health`**: Triggers a new, on-demand health check. This endpoint will initiate the run and return a run ID that the client can use to connect to the WebSocket for live updates.

### 2.5. WebSocket for Real-Time Logging
*   A Durable Object, `HealthCheckSocket`, will manage the WebSocket connections and the state of an active test run.
*   The frontend will establish a WebSocket connection to `/ws/health/:runId`.
*   The `HealthCheckRunner` will send live log messages (e.g., "RUNNING: SiteStorageService - Create Site", "PASS: SiteStorageService - Create Site") to the Durable Object, which then broadcasts them to the connected client.

### 2.6. Scheduled Cron Trigger
*   The main worker entry point (`index.ts`) will have a `scheduled` handler.
*   On a daily cron schedule, this handler will invoke the `HealthCheckRunner` to execute the full suite of tests and save the results.

## 3. Frontend User Experience
1.  The user navigates to the "Health" page, which calls `GET /api/health` to display the results of the most recent test run.
2.  The user clicks a "Run New Health Check" button.
3.  The frontend makes a `POST /api/health` request, which kicks off the test run and returns a `runId`.
4.  The frontend opens a WebSocket connection to `/ws/health/:runId`.
5.  A spinner appears on the button, and a console window begins displaying log messages received from the WebSocket.
6.  When the `HealthCheckRunner` completes, it sends a final "completed" message and closes the connection.
7.  The frontend displays the final results and updates the "Last Run" view.
