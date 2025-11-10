# Email Processing Improvements

## Overview

Streamlined email processing system to be more conservative and user-friendly. The system now only processes and labels emails that are definitively job-related, leaving all other emails untouched to prevent missing important messages.

## Key Changes

### 1. **Conservative Email Processing**

- **Before**: All emails were marked as read and labeled (even unrelated emails got an "unrelated" label)
- **After**: Only job-related emails are processed, labeled, and marked as read
- **Unrelated emails**: Remain completely untouched (unread, unlabeled)

### 2. **Stricter AI Classification**

The `EmailClassificationAgent` now uses a more conservative prompt that:
- Only classifies emails as job-related with STRONG evidence
- Requires CLEAR and EXPLICIT job-related indicators
- Defaults to `NOT_JOB_RELATED` when uncertain
- Provides more context (2000 chars vs 1000) for better classification

### 3. **AppsScript Updates**

**`Code.gs` Changes:**
- Only marks emails as read if they're job-related (`JOBS_ALERT` or `JOB_RELATED_DO_NOT_TAG`)
- Does NOT apply any labels to unrelated emails
- Updated search query to exclude `UNRELATED` label check (since we don't label them)
- Improved logging for unrelated emails

**Label Behavior:**
- `JOBS_ALERT` → Label: `job_alerts-matched` + Mark as read
- `JOB_RELATED_DO_NOT_TAG` → Label: `job_alerts-directmessage` + Mark as read  
- `NOT_JOB_RELATED` → No label, remains unread

### 4. **Gmail Add-on Dashboard**

**New File**: `GmailAddon.gs`

A Gmail add-on that displays a status dashboard right in your Gmail UI:

- **Processing Statistics**: Total processed, job alerts, job-related, and not job-related counts
- **Last 24 Hours**: Recent activity breakdown
- **Recent Runs**: Latest AppsScript execution status
- **Recent Classifications**: Last 20 classified emails with details
- **Actions**: Refresh stats and open full dashboard

**Manifest Updates**: `appsscript.json`
- Added Gmail add-on configuration
- Added `gmail.addons.execute` OAuth scope
- Configured contextual triggers for email views
- Configured compose trigger

### 5. **Dashboard API Endpoint**

**New File**: `src/api/routes/email.dashboard.ts`

REST API endpoint that provides dashboard statistics:

- **Endpoint**: `GET /api/email/dashboard`
- **Authentication**: Bearer token (same `WORKER_API_KEY`)
- **Returns**:
  - Total processed emails
  - Breakdown by classification type
  - Last 24 hours statistics
  - Recent AppsScript runs
  - Recent email classifications

**Mounted in**: `src/api/routes/email.ts`

## Files Modified

1. **`appsscript_fwd_emails/Code.gs`**
   - Updated `processEmailThread()` to only mark job-related emails as read
   - Updated `applyLabel()` to skip unrelated emails
   - Updated `searchForNewEmails()` query
   - Updated `CONFIG` to include `WORKER_BASE_URL`

2. **`src/domains/agents/durable-objects/email-classification-agent.ts`**
   - Made classification prompt much more strict and conservative
   - Increased context window to 2000 characters
   - Added explicit instructions to default to `NOT_JOB_RELATED` when uncertain

3. **`src/api/routes/email.ts`**
   - Added dashboard route import and mounting

## Files Created

1. **`appsscript_fwd_emails/GmailAddon.gs`**
   - Complete Gmail add-on implementation with CardService
   - Dashboard UI with statistics and recent activity
   - Refresh and navigation actions

2. **`src/api/routes/email.dashboard.ts`**
   - Dashboard API endpoint
   - Aggregates data from `worker_request_logs` and `appscript_runs`
   - Provides formatted statistics

3. **`docs/EMAIL_PROCESSING_IMPROVEMENTS.md`**
   - This documentation file

## Benefits

1. **No Missing Emails**: Unrelated emails remain unread, ensuring you won't miss important messages
2. **Cleaner Inbox**: Only job-related emails are labeled, reducing label clutter
3. **Better Accuracy**: Stricter AI classification reduces false positives
4. **Real-time Visibility**: Gmail add-on provides instant insight into processing status
5. **Better Control**: Dashboard allows monitoring and understanding of email processing patterns

## Deployment Steps

1. **Deploy Worker Updates**:
   ```bash
   pnpm run deploy
   ```

2. **Push AppsScript Changes**:
   ```bash
   pnpm run appscript:push
   ```

3. **Enable Gmail Add-on**:
   - Open Apps Script project
   - Go to Deploy → Test deployments
   - Create a new test deployment
   - Enable the Gmail add-on for your account

4. **Test**:
   - Open Gmail
   - Look for the "Job Email Processor" add-on in the right sidebar
   - Click to view dashboard

## Configuration

### Worker API Key

Ensure `WORKER_API_KEY` is set in:
- Worker environment variables
- AppsScript script properties (for dashboard API access)

### Worker Base URL

Update in:
- `appsscript_fwd_emails/Code.gs` → `CONFIG.WORKER_BASE_URL`
- `appsscript_fwd_emails/CloudflareWorkerAPI.gs` → `WORKER_CONFIG.BASE_URL`
- `appsscript_fwd_emails/GmailAddon.gs` → `getConfig().WORKER_BASE_URL`

## Testing

1. **Test Email Classification**:
   - Send test emails with different content
   - Verify unrelated emails remain unread
   - Verify job-related emails are labeled correctly

2. **Test Dashboard**:
   - Open Gmail add-on
   - Verify statistics are displayed
   - Test refresh functionality

3. **Test API**:
   ```bash
   curl -H "Authorization: Bearer YOUR_API_KEY" \
     https://9to5-scout-retrofit.hacolby.workers.dev/api/email/dashboard
   ```

## Notes

- The system is now more conservative by design
- Unrelated emails will be re-checked on each run (since they're not labeled)
- This is intentional to catch emails that might have been misclassified
- The search query is optimized to skip already-processed job-related emails

