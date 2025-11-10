# Apps Script Email Forwarding

Automated email processing and forwarding system for job-related emails.

## Files

- **Code.gs** - Main email processing logic
- **CloudflareWorkerAPI.gs** - Cloudflare Worker API client
- **appsscript.json** - Apps Script manifest

## Setup

1. **Deploy to Apps Script**:

   - Copy all files to a new Apps Script project
   - Configure in Apps Script editor

2. **Configure**:

   - Update `CONFIG.WORKER_URL` in both files
   - Set `WORKER_API_KEY` in script properties

3. **Authorize**:

   - Run `testEmailProcessing()` once
   - Grant Gmail permissions

4. **Set up trigger**:
   - Run `configureCronSchedule(5)` for 5-minute intervals

## Functions

### Main Functions

- `checkAndProcessEmails()` - Main entry point (called by trigger)
- `processEmailThread(thread)` - Process a single email thread
- `classifyAndForwardEmail(message)` - Classify and forward an email

### Configuration Functions

- `configureCronSchedule(intervalMinutes)` - Set up the trigger schedule
- `getCronInterval()` - Get current interval
- `createTrigger()` - Legacy trigger creation

### Testing Functions

- `testEmailProcessing()` - Test email processing logic
- `testWorkerAPI()` - Test Worker API connection

### Helper Functions

- `searchForNewEmails()` - Search Gmail for new emails
- `classifyEmailWithWorker(emailData)` - Send to Worker for AI classification
- `forwardEmail(message)` - Forward email to job-alerts address
- `applyLabel(thread, classification)` - Apply Gmail label based on classification
- `logAppsScriptRun()` - Log execution to Worker
- `callWorkerAPI(endpoint, data)` - Generic Worker API caller

## Configuration

Edit `CONFIG` object in both files:

```javascript
const CONFIG = {
  WORKER_URL: "https://9to5-scout-retrofit.hacolby.workers.dev",
  API_KEY: "6502241638",
  FORWARD_TO: "job-alerts@hacolby.app",
  LABELS: {
    MATCHED: "job_alerts-matched",
    DIRECT_MESSAGE: "job_alerts-directmessage",
    UNRELATED: "job_alerts-unrelated",
  },
};
```

## Cron Schedule

Valid intervals: 1, 2, 3, 4, 5, 10, 15, 30, 60 minutes

Example:

```javascript
configureCronSchedule(5); // Every 5 minutes
```

## Monitoring

View logs in Apps Script editor:

- Script Executions
- Triggered executions
- Error logs

Query Worker for logs:

```bash
curl https://9to5-scout-retrofit.hacolby.workers.dev/api/appscript/runs?limit=10
```
