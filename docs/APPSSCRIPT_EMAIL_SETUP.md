# Apps Script Email Forwarding Setup Guide

## Overview

This system automatically processes and forwards job-related emails using Google Apps Script and a Cloudflare Worker AI agent for intelligent classification.

## Components

1. **Google Apps Script** (`appsscript_fwd_emails/Code.gs`) - Monitors Gmail and forwards emails
2. **Cloudflare Worker API** (`src/api/routes/email.classify.ts`) - Email classification endpoint
3. **Email Classification Agent** (`src/domains/agents/durable-objects/email-classification-agent.ts`) - AI-powered email analysis

## Setup Instructions

### 1. Deploy the Cloudflare Worker

First, ensure the worker is deployed with the new email classification endpoint:

```bash
pnpm run deploy
```

### 2. Configure Apps Script

1. **Open Google Apps Script**: https://script.google.com/

2. **Create a new project** and copy the contents of `appsscript_fwd_emails/Code.gs` into the editor

3. **Set up the script properties**:

   - Go to Project Settings → Script Properties
   - Add a property `WORKER_API_KEY` with your worker's API key
   - Update `CONFIG.WORKER_URL` in the code to match your worker URL

4. **Configure the manifest**:

   - The `appsscript.json` file should already have the correct OAuth scopes

5. **Authorize the script**:
   - Run the `testEmailProcessing()` function once to authorize Gmail access

### 3. Create Gmail Labels

The system requires these labels to be created in Gmail (or they will be auto-created):

- `job_alerts-matched`
- `job_alerts-directmessage`
- `job_alerts-unrelated`

### 4. Set up the Time-Driven Trigger

Configure the cron schedule using the helper function:

```javascript
// Run this in the Apps Script editor console to set up 5-minute intervals
configureCronSchedule(5);
```

You can also test the configuration with different intervals:

```javascript
// Test every 1 minute
configureCronSchedule(1);

// Test every 10 minutes
configureCronSchedule(10);
```

Common intervals: 1, 2, 3, 4, 5, 10, 15, 30, 60 minutes

## How It Works

### Email Processing Flow

1. **Every 5 minutes**, the script searches for new emails matching:

   - `is:unread after:[today]`
   - NOT labeled as: `job_alerts-matched`, `job_alerts-directmessage`, or `job_alerts-unrelated`

2. **Known Senders** are forwarded immediately:

   - `notify-noreply@google.com` (Google Job Alerts)
   - `jobalerts-noreply@linkedin.com` (LinkedIn Job Alerts)
   - Label: `job_alerts-matched`

3. **Other Emails** are sent to the Cloudflare Worker AI agent for classification:

   - The agent analyzes the email content
   - Returns one of three classifications:
     - `JOBS_ALERT` - Automated job alert email
     - `JOB_RELATED_DO_NOT_TAG` - Job-related direct message
     - `NOT_JOB_RELATED` - Unrelated email

4. **Actions based on classification**:
   - **JOBS_ALERT**: Forward to `job-alerts@hacolby.app`, apply `job_alerts-matched`
   - **JOB_RELATED_DO_NOT_TAG**: Forward to `job-alerts@hacolby.app`, apply `job_alerts-directmessage`
   - **NOT_JOB_RELATED**: Don't forward, apply `job_alerts-unrelated`

## API Endpoint

### POST /api/email/classify

Classifies an email using the AI agent.

**Headers:**

```
Authorization: Bearer <WORKER_API_KEY>
Content-Type: application/json
```

**Request Body:**

```json
{
  "to": "recipient@example.com",
  "from": "sender@example.com",
  "subject": "Email subject",
  "body": "Email body content"
}
```

**Response:**

```json
{
  "classification": "JOBS_ALERT",
  "confidence": 0.95,
  "reasoning": "Email contains job alert keywords and formatting typical of automated job alerts."
}
```

## API Endpoints

### POST /api/appscript/run

Logs an Apps Script execution to the worker.

**Headers:**

```
Authorization: Bearer <WORKER_API_KEY>
Content-Type: application/json
```

**Request Body:**

```json
{
  "timestamp": "2025-01-17T10:30:00.000Z",
  "script_name": "Email Forwarding Script",
  "execution_time": "2025-01-17T10:30:00.000Z",
  "triggered_by": "time-driven",
  "status": "running"
}
```

### GET /api/appscript/runs

Retrieves recent Apps Script execution logs.

**Query Parameters:**

- `limit` (optional): Number of runs to retrieve (default: 50)

**Response:**

```json
{
  "success": true,
  "runs": [...],
  "count": 10
}
```

## Database Tables

### appscript_runs

Logs each Apps Script execution:

- `id`: Unique identifier
- `timestamp`: Execution timestamp
- `script_name`: Name of the script
- `execution_time`: When the script ran
- `triggered_by`: How it was triggered
- `status`: Execution status
- `emails_processed`: Number of emails processed
- `errors`: Any errors encountered

### worker_request_logs

Logs all worker API requests:

- `id`: Unique identifier
- `timestamp`: Request timestamp
- `endpoint`: API endpoint called
- `method`: HTTP method
- `source`: Request source
- `request_body`: Request payload
- `response_code`: HTTP response code
- `response_body`: Response payload
- `processing_time_ms`: Time to process
- `error_message`: Any errors

## Testing

### Test the Script Locally

Run the test function in the Apps Script editor:

```javascript
testEmailProcessing();
```

### Test Worker API Connection

Test the connection to the Cloudflare Worker:

```javascript
testWorkerAPI();
```

### Test Cron Schedule Configuration

```javascript
// Get current interval
getCronInterval();

// Set new interval
configureCronSchedule(10);
```

### Test the API Endpoint

```bash
curl -X POST https://9to5-scout.hacolby.workers.dev/api/email/classify \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "from": "recruiter@company.com",
    "subject": "New opportunity at Company",
    "body": "We have an exciting position that matches your skills..."
  }'
```

## Troubleshooting

### Script Not Running

- Check the trigger is set up correctly in Apps Script → Triggers
- Review execution logs in Apps Script → Executions
- Ensure the script is authorized for Gmail access

### Emails Not Being Classified

- Verify the worker API endpoint is accessible
- Check the API key is correct in script properties
- Review worker logs for errors

### Emails Not Being Forwarded

- Ensure the forward-to address (`job-alerts@hacolby.app`) is configured
- Check Gmail forwarding settings
- Verify the script has Gmail modify permissions

## Maintenance

### Updating the Trigger

If you need to update the trigger schedule:

```javascript
// Delete old triggers
const triggers = ScriptApp.getProjectTriggers();
triggers.forEach((trigger) => ScriptApp.deleteTrigger(trigger));

// Create new trigger
createTrigger();
```

### Monitoring

- Check execution logs regularly in Apps Script
- Monitor worker logs for classification accuracy
- Review forwarded emails to ensure proper classification

## Security Notes

- The API key should be kept secure in Apps Script properties
- Never commit API keys to version control
- Use environment variables in production
- Regularly rotate API keys

## Email Configuration

The system uses these email addresses:

- **Forward To**: `job-alerts@hacolby.app`
- **Known Senders**:
  - `notify-noreply@google.com` (Google Job Alerts)
  - `jobalerts-noreply@linkedin.com` (LinkedIn Job Alerts)

## Labels

Gmail labels used for organization:

- `job_alerts-matched` - Automated job alerts
- `job_alerts-directmessage` - Job-related direct messages
- `job_alerts-unrelated` - Unrelated emails
