/**
 * @file appsscript_fwd_emails/CloudflareWorkerAPI.gs
 * @description Cloudflare Worker API client for Apps Script
 */

const WORKER_CONFIG = {
  BASE_URL: "https://9to5-scout-retrofit.hacolby.workers.dev",
  API_KEY: "6502241638",
  ENDPOINTS: {
    CLASSIFY: "/api/email/classify",
    LOG_RUN: "/api/appscript/run",
  },
};

/**
 * Log this Apps Script execution to the Cloudflare Worker
 * @returns {boolean} Success status
 */
function logAppsScriptRun() {
  try {
    const runData = {
      timestamp: new Date().toISOString(),
      scriptName: "Email Forwarding Script",
      executionTime: new Date(),
      triggeredBy: "time-driven",
      status: "running",
    };

    const response = callWorkerAPI(WORKER_CONFIG.ENDPOINTS.LOG_RUN, runData);

    if (response && response.success) {
      console.log("Successfully logged Apps Script run");
      return true;
    } else {
      console.error("Failed to log Apps Script run:", response);
      return false;
    }
  } catch (error) {
    console.error("Error logging Apps Script run:", error);
    return false;
  }
}

/**
 * Call Cloudflare Worker API endpoint
 * @param {string} endpoint - API endpoint path
 * @param {Object} data - Request payload
 * @returns {Object} Response data
 */
function callWorkerAPI(endpoint, data) {
  try {
    const url = WORKER_CONFIG.BASE_URL + endpoint;

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${WORKER_CONFIG.API_KEY}`,
      },
      payload: JSON.stringify(data),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(url, options);
    const responseCode = response.getResponseCode();
    const responseBody = response.getContentText();

    if (responseCode !== 200) {
      console.error(`Worker API error: ${responseCode} - ${responseBody}`);
      return null;
    }

    try {
      return JSON.parse(responseBody);
    } catch (parseError) {
      console.error("Failed to parse response:", parseError);
      return { success: false };
    }
  } catch (error) {
    console.error("Error calling Worker API:", error);
    return null;
  }
}

/**
 * Configure the cron schedule for the Apps Script trigger
 * @param {number} intervalMinutes - Interval in minutes (default: 5)
 * @returns {boolean} Success status
 */
function configureCronSchedule(intervalMinutes = 5) {
  try {
    // Validate interval
    if (![1, 2, 3, 4, 5, 10, 15, 30, 60].includes(intervalMinutes)) {
      console.error(
        "Invalid interval. Must be one of: 1, 2, 3, 4, 5, 10, 15, 30, 60"
      );
      return false;
    }

    // Delete existing triggers
    const triggers = ScriptApp.getProjectTriggers();
    triggers.forEach((trigger) => {
      if (trigger.getHandlerFunction() === "checkAndProcessEmails") {
        ScriptApp.deleteTrigger(trigger);
      }
    });

    // Create new trigger with specified interval
    ScriptApp.newTrigger("checkAndProcessEmails")
      .timeBased()
      .everyMinutes(intervalMinutes)
      .create();

    console.log(
      `Cron schedule configured successfully - running every ${intervalMinutes} minutes`
    );

    // Update script properties with the new schedule
    const properties = PropertiesService.getScriptProperties();
    properties.setProperty("CRON_INTERVAL", intervalMinutes.toString());

    return true;
  } catch (error) {
    console.error("Error configuring cron schedule:", error);
    return false;
  }
}

/**
 * Get the current cron interval from script properties
 * @returns {number} Current interval in minutes
 */
function getCronInterval() {
  const properties = PropertiesService.getScriptProperties();
  const interval = properties.getProperty("CRON_INTERVAL");
  return interval ? parseInt(interval) : 5; // Default to 5 minutes
}

/**
 * Test the worker API connection
 */
function testWorkerAPI() {
  console.log("Testing Worker API connection...");

  try {
    const response = callWorkerAPI(WORKER_CONFIG.ENDPOINTS.LOG_RUN, {
      timestamp: new Date().toISOString(),
      scriptName: "Test Connection",
      status: "testing",
    });

    if (response && response.success) {
      console.log("✓ Worker API connection successful");
    } else {
      console.log("✗ Worker API connection failed");
    }
  } catch (error) {
    console.error("Error testing Worker API:", error);
  }
}
