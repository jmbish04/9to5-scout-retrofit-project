# Proposal: Inbox Frontend Page and Backend API Requirements

This document outlines the creation of a new frontend page, `inbox.html`, designed to function as an Outlook-like email client within the 9to5-Scout platform. It also details the necessary backend API support to enable its full functionality.

---

### 1. Frontend (`inbox.html` and `inbox_client.js`)

**`inbox.html` Structure:**

The `inbox.html` page is structured into two main panes, mimicking a traditional email client:

*   **Left Pane (Email List):** A scrollable list displaying incoming email messages. Each item in the list shows the email subject, sender, and date. It also includes a count of total emails and a status indicator for whether jobs were successfully extracted from the email content.
*   **Right Pane (Email Preview):** Displays the full content of an email when an item in the left pane is clicked. It shows the subject, sender, date, and the job extraction status, followed by the HTML body of the email.

**`inbox_client.js` Functionality:**

The `inbox_client.js` script provides the dynamic behavior for the `inbox.html` page:

*   **`fetchEmails()`:** An asynchronous function responsible for fetching email data from a backend API. It updates the `emails` array and triggers the rendering of the email list.
*   **`renderEmailList()`:** Populates the left pane with email items. It iterates through the `emails` array, creates a `div` for each email, and attaches an event listener to display the email preview upon click.
*   **`displayEmailPreview(emailId)`:** Updates the right pane with the details and content of the selected email. It also highlights the selected email in the list.

**Shared Components:**

The `inbox.html` page integrates with the shared `styles.css` for consistent styling and `nav.js` for the global navigation bar, ensuring a unified look and feel across the frontend.

---

### 2. Backend API Requirements

To fully support the `inbox.html` frontend, the Cloudflare Worker backend will require the following API endpoints and functionalities:

#### 2.1. List Emails (`GET /api/emails`)

*   **Purpose:** To retrieve a list of all processed emails, including their metadata and job extraction status.
*   **Request:** `GET /api/emails?limit={number}&offset={number}&status={string}&search={string}`
    *   `limit` (optional): Number of emails to return per page (e.g., 20).
    *   `offset` (optional): Starting point for pagination.
    *   `status` (optional): Filter by email processing status (e.g., `job_extracted`, `no_jobs_found`, `processing`, `failed`).
    *   `search` (optional): Search emails by subject, sender, or partial content.
*   **Response:** A JSON array of email objects.
    ```json
    [
      {
        "id": "email-123",
        "subject": "New Job Alerts from LinkedIn",
        "from": "linkedin@example.com",
        "date": "2025-10-15T10:00:00Z",
        "body": "<html>...full HTML content of the email...</html>",
        "jobExtracted": true,
        "status": "job_extracted",
        "extractedJobIds": ["job-abc", "job-xyz"]
      },
      {
        "id": "email-456",
        "subject": "Your Daily Digest",
        "from": "indeed@example.com",
        "date": "2025-10-15T09:30:00Z",
        "body": "<html>...full HTML content of the email...</html>",
        "jobExtracted": false,
        "status": "no_jobs_found",
        "extractedJobIds": []
      }
    ]
    ```

#### 2.2. Get Single Email (`GET /api/emails/{id}`)

*   **Purpose:** To retrieve the full details of a specific email.
*   **Request:** `GET /api/emails/{id}`
*   **Response:** A single email object (as defined above).

#### 2.3. Search/Filter Emails (Integrated into `GET /api/emails`)

*   **Purpose:** To allow users to find specific emails based on criteria.
*   **Implementation:** The `GET /api/emails` endpoint should support query parameters for `search` (full-text search on subject/from/body) and `status` (filtering by job extraction status).

#### 2.4. Email Processing Status and Job Extraction

*   The backend should store and expose the following for each email:
    *   `status`: Current processing status (e.g., `received`, `parsing`, `job_extracted`, `no_jobs_found`, `failed`).
    *   `jobExtracted`: A boolean indicating whether job links were successfully identified and processed.
    *   `extractedJobIds`: An array of IDs of jobs that were extracted from this email, linking back to the main job records.

---

### 3. Data Storage Considerations

*   **Email Content:** The full HTML content of each email (`body`) should be stored, likely in Cloudflare R2 for larger content, with a reference in D1. This allows for the full preview functionality.
*   **Email Metadata:** Subject, sender, date, and processing status should be stored in the D1 database for efficient querying and filtering.
*   **Job Linkage:** A clear relationship between emails and extracted jobs (e.g., `extractedJobIds` array in the email record, or a `source_email_id` in the job record) is crucial for traceability.

---

### 4. Next Steps

1.  **Implement Backend API:** Develop the `/api/emails` endpoint in the Cloudflare Worker to handle listing, searching, and filtering of emails, including their processing status and extracted job IDs.
2.  **Data Model:** Define or update the D1 database schema to store email metadata and content references, as well as the job extraction status.
3.  **Frontend Integration:** Connect the `inbox_client.js` script to the new backend API endpoints to dynamically load and display email data.
4.  **Error Handling:** Implement robust error handling on both the frontend and backend for API calls and data processing.
5.  **Styling Enhancements:** Further refine the CSS for a more polished Outlook-like appearance, potentially integrating Flowbite components for better UI elements.
