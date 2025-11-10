/**
 * @file appsscript_fwd_emails/Code.gs
 * @description Google Apps Script for processing and forwarding job-related emails
 */

// Configuration
const CONFIG = {
  WORKER_BASE_URL: "https://9to5-scout-retrofit.hacolby.workers.dev",
  WORKER_URL:
    "https://9to5-scout-retrofit.hacolby.workers.dev/api/email/classify",
  WORKER_API_KEY: "6502241638", // Set this as a script property
  FORWARD_TO: "job-alerts-intake@hacolby.app",
  LABELS: {
    MATCHED: "job_alerts-matched",
    DIRECT_MESSAGE: "job_alerts-directmessage",
    // Note: We no longer use UNRELATED label - unrelated emails remain unread and unlabeled
  },
};

// Known job alert senders
const KNOWN_SENDERS = {
  GOOGLE: "notify-noreply@google.com",
  LINKEDIN: "jobalerts-noreply@linkedin.com",
};

/**
 * Main function to check and process emails (scheduled to run every 5 minutes)
 */
function checkAndProcessEmails() {
  try {
    // Log this execution to the worker
    logAppsScriptRun();

    const threads = searchForNewEmails();

    for (const thread of threads) {
      processEmailThread(thread);
    }

    console.log(`Processed ${threads.length} email threads`);
  } catch (error) {
    console.error("Error in checkAndProcessEmails:", error);
    // Send error notification
    sendErrorNotification(error);
  }
}

/**
 * Search for new emails matching our criteria
 * @returns {GmailApp.GmailThread[]} Array of matching email threads
 */
function searchForNewEmails() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Build search query - exclude already processed emails (labeled as job-related)
  // Note: We don't exclude UNRELATED since we don't label unrelated emails
  const query = `is:unread after:${today.getTime() / 1000} -label:${
    CONFIG.LABELS.MATCHED
  } -label:${CONFIG.LABELS.DIRECT_MESSAGE}`;

  console.log("Searching for emails with query:", query);

  try {
    const threads = GmailApp.search(query);
    return threads;
  } catch (error) {
    console.error("Error searching for emails:", error);
    return [];
  }
}

/**
 * Process a single email thread
 * @param {GmailApp.GmailThread} thread - The email thread to process
 */
function processEmailThread(thread) {
  try {
    const messages = thread.getMessages();

    for (const message of messages) {
      if (message.isUnread()) {
        const result = classifyAndForwardEmail(message);

        // ONLY process if it's job-related
        if (result === "JOBS_ALERT" || result === "JOB_RELATED_DO_NOT_TAG") {
          // Apply label based on result
          applyLabel(thread, result);

          // Mark as read only if job-related (forwarded)
          message.markRead();
        } else {
          // NOT_JOB_RELATED: Do nothing - leave unread, no label
          // This ensures important emails aren't missed
          console.log(
            `Leaving unrelated email unread: ${message.getSubject()}`
          );
        }
      }
    }
  } catch (error) {
    console.error("Error processing email thread:", error);
  }
}

/**
 * Classify and forward email
 * @param {GmailApp.GmailMessage} message - The email message
 * @returns {string} Classification result
 */
function classifyAndForwardEmail(message) {
  const from = message.getFrom();
  const subject = message.getSubject();
  const body = message.getPlainBody();

  // Check if it's from a known job alert sender
  if (
    from.includes(KNOWN_SENDERS.GOOGLE) ||
    from.includes(KNOWN_SENDERS.LINKEDIN)
  ) {
    // Forward directly
    forwardEmail(message);
    return "JOBS_ALERT";
  }

  // Send to worker for AI classification
  const classification = classifyEmailWithWorker({
    to: message.getTo(),
    from: from,
    subject: subject,
    body: body,
  });

  // Handle the classification result
  switch (classification) {
    case "JOBS_ALERT":
      forwardEmail(message);
      return "JOBS_ALERT";

    case "JOB_RELATED_DO_NOT_TAG":
      forwardEmail(message);
      return "JOB_RELATED_DO_NOT_TAG";

    case "NOT_JOB_RELATED":
      // Don't forward
      console.log(`Not forwarding email 
        from: ${from}
        subject: ${subject}
        body: ${body}
    `);
      return "NOT_JOB_RELATED";

    default:
      console.warn("Unknown classification:", classification);
      return "NOT_JOB_RELATED";
  }
}

/**
 * Classify email using Cloudflare Worker AI agent
 * @param {Object} emailData - Email data to classify
 * @returns {string} Classification result
 */
function classifyEmailWithWorker(emailData) {
  try {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getWorkerApiKey()}`,
      },
      payload: JSON.stringify(emailData),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(CONFIG.WORKER_URL, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode !== 200) {
      console.error("Worker API error:", responseCode, responseBody);
      // Default to NOT_JOB_RELATED if worker fails
      return "NOT_JOB_RELATED";
    }

    const result = JSON.parse(responseBody);
    return result.classification || "NOT_JOB_RELATED";
  } catch (error) {
    console.error("Error calling worker API:", error);
    return "NOT_JOB_RELATED";
  }
}

/**
 * Forward an email to the job-alerts address
 * @param {GmailApp.GmailMessage} message - The email to forward
 */
function forwardEmail(message) {
  try {
    message.forward(CONFIG.FORWARD_TO);
    console.log(
      `Forwarded email from ${message.getFrom()} to ${CONFIG.FORWARD_TO}`
    );
  } catch (error) {
    console.error("Error forwarding email:", error);
  }
}

/**
 * Apply label to thread based on classification
 * ONLY applies labels to job-related emails
 * @param {GmailApp.GmailThread} thread - The email thread
 * @param {string} classification - The classification result
 */
function applyLabel(thread, classification) {
  try {
    // Only label job-related emails - NOT_JOB_RELATED gets no label
    if (classification === "NOT_JOB_RELATED") {
      return; // Don't label unrelated emails
    }

    let labelName = null;

    switch (classification) {
      case "JOBS_ALERT":
        labelName = CONFIG.LABELS.MATCHED;
        break;
      case "JOB_RELATED_DO_NOT_TAG":
        labelName = CONFIG.LABELS.DIRECT_MESSAGE;
        break;
      default:
        return; // Unknown classification - don't label
    }

    if (labelName) {
      let label = GmailApp.getUserLabelByName(labelName);

      // Create label if it doesn't exist
      if (!label) {
        label = GmailApp.createLabel(labelName);
      }

      thread.addLabel(label);
      console.log(`Applied label ${labelName} to thread`);
    }
  } catch (error) {
    console.error("Error applying label:", error);
  }
}

/**
 * Get the worker API key from script properties
 * @returns {string} API key
 */
function getWorkerApiKey() {
  const properties = PropertiesService.getScriptProperties();
  return properties.getProperty("WORKER_API_KEY") || CONFIG.WORKER_API_KEY;
}

/**
 * Send error notification
 * @param {Error} error - The error that occurred
 */
function sendErrorNotification(error) {
  try {
    const subject = "Email Processing Error - Apps Script";
    const body = `An error occurred in the email processing script:\n\n${error.toString()}\n\n${JSON.stringify(
      error,
      null,
      2
    )}`;

    MailApp.sendEmail({
      to: "justin@126colby.com",
      subject: subject,
      body: body,
    });
  } catch (mailError) {
    console.error("Failed to send error notification:", mailError);
  }
}

/**
 * Test function to check a single email
 */
function testEmailProcessing() {
  const threads = searchForNewEmails();
  console.log(`Found ${threads.length} threads to process`);

  if (threads.length > 0) {
    processEmailThread(threads[0]);
    console.log("Test completed");
  } else {
    console.log("No emails found matching criteria");
  }
}
