/**
 * @file appsscript_fwd_emails/GmailAddon.gs
 * @description Gmail Add-on for email processing dashboard
 */

/**
 * Creates the initial card shown when the add-on is opened
 * @param {Object} e - The event object
 * @returns {Card} The initial card
 */
function onGmailCompose(e) {
  return createDashboardCard();
}

/**
 * Creates a card when an email is opened
 * @param {Object} e - The event object
 * @returns {Card} The card to display
 */
function onGmailMessage(e) {
  return createDashboardCard();
}

/**
 * Creates the main dashboard card
 * @returns {Card} The dashboard card
 */
function createDashboardCard() {
  const card = CardService.newCardBuilder();

  // Header section
  const header = CardService.newCardHeader()
    .setTitle("📧 Job Email Processor")
    .setSubtitle("Email Classification Dashboard");

  card.setHeader(header);

  // Fetch dashboard stats from worker
  let stats;
  try {
    const statsResponse = fetchDashboardStats();
    stats = statsResponse.stats;
  } catch (error) {
    // Show error card if API fails
    card.addSection(
      CardService.newCardSection()
        .addWidget(
          CardService.newTextParagraph().setText(
            "❌ Unable to fetch dashboard stats. Please check the worker connection."
          )
        )
    );
    return card.build();
  }

  // Stats section
  const statsSection = CardService.newCardSection()
    .setHeader("📊 Processing Statistics")
    .addWidget(
      CardService.newDecoratedText()
        .setText(`Total Processed: ${stats.totalProcessed}`)
        .setTopLabel("All Time")
    )
    .addWidget(
      CardService.newDivider()
    )
    .addWidget(
      CardService.newDecoratedText()
        .setText(`Job Alerts: ${stats.jobsAlert}`)
        .setTopLabel("✅ Classified")
        .setBottomLabel("Automated job board notifications")
    )
    .addWidget(
      CardService.newDecoratedText()
        .setText(`Job Related: ${stats.jobRelated}`)
        .setTopLabel("📬 Direct Messages")
        .setBottomLabel("Recruiter and hiring manager emails")
    )
    .addWidget(
      CardService.newDecoratedText()
        .setText(`Not Job Related: ${stats.notJobRelated}`)
        .setTopLabel("🚫 Excluded")
        .setBottomLabel("Left unread and unlabeled")
    );

  card.addSection(statsSection);

  // Last 24 hours section
  const last24Section = CardService.newCardSection()
    .setHeader("⏰ Last 24 Hours")
    .addWidget(
      CardService.newDecoratedText()
        .setText(`${stats.last24Hours.total} emails processed`)
        .setTopLabel("Total")
    )
    .addWidget(
      CardService.newKeyValue()
        .setContent(`Job Alerts: ${stats.last24Hours.jobsAlert}`)
        .setIconUrl("https://www.gstatic.com/images/icons/material/system/1x/check_circle_black_24dp.png")
    )
    .addWidget(
      CardService.newKeyValue()
        .setContent(`Job Related: ${stats.last24Hours.jobRelated}`)
        .setIconUrl("https://www.gstatic.com/images/icons/material/system/1x/email_black_24dp.png")
    )
    .addWidget(
      CardService.newKeyValue()
        .setContent(`Not Related: ${stats.last24Hours.notJobRelated}`)
        .setIconUrl("https://www.gstatic.com/images/icons/material/system/1x/block_black_24dp.png")
    );

  card.addSection(last24Section);

  // Recent runs section
  if (stats.recentRuns && stats.recentRuns.length > 0) {
    const runsSection = CardService.newCardSection()
      .setHeader("🔄 Recent Processing Runs");

    const runsList = stats.recentRuns.slice(0, 5).map((run) => {
      const statusIcon = run.status === "completed" ? "✅" : run.status === "running" ? "⏳" : "❌";
      return CardService.newDecoratedText()
        .setText(`${statusIcon} ${formatDate(run.timestamp)}`)
        .setTopLabel(run.script_name || "Email Processor")
        .setBottomLabel(`Status: ${run.status}`);
    });

    runsSection.addWidgets(runsList);
    card.addSection(runsSection);
  }

  // Recent classifications section
  if (stats.recentClassifications && stats.recentClassifications.length > 0) {
    const classificationsSection = CardService.newCardSection()
      .setHeader("📋 Recent Classifications");

    const classificationsList = stats.recentClassifications.slice(0, 5).map((classification) => {
      const icon = classification.classification === "JOBS_ALERT" ? "✅" :
                   classification.classification === "JOB_RELATED_DO_NOT_TAG" ? "📬" : "🚫";
      return CardService.newDecoratedText()
        .setText(`${icon} ${classification.subject}`)
        .setTopLabel(classification.from)
        .setBottomLabel(`${classification.classification} - ${formatDate(classification.timestamp)}`);
    });

    classificationsSection.addWidgets(classificationsList);
    card.addSection(classificationsSection);
  }

  // Action buttons
  const actionsSection = CardService.newCardSection()
    .setHeader("⚙️ Actions")
    .addWidget(
      CardService.newTextButton()
        .setText("🔄 Refresh Stats")
        .setOnClickAction(
          CardService.newAction()
            .setFunctionName("refreshDashboard")
        )
    )
    .addWidget(
      CardService.newTextButton()
        .setText("📊 View Full Dashboard")
        .setOpenLink(
          CardService.newOpenLink()
            .setUrl(getWorkerDashboardUrl())
        )
    );

  card.addSection(actionsSection);

  return card.build();
}

/**
 * Fetches dashboard stats from the worker API
 * @returns {Object} Dashboard stats response
 */
function fetchDashboardStats() {
  const config = getConfig();
  const apiKey = getWorkerApiKey();

  const options = {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    muteHttpExceptions: true,
  };

  const dashboardUrl = `${config.WORKER_BASE_URL}/api/email/dashboard`;
  const response = UrlFetchApp.fetch(dashboardUrl, options);
  const responseCode = response.getResponseCode();

  if (responseCode !== 200) {
    throw new Error(`Worker API error: ${responseCode}`);
  }

  return JSON.parse(response.getContentText());
}

/**
 * Refreshes the dashboard
 * @param {Object} e - The event object
 * @returns {ActionResponse} Action response with navigation
 */
function refreshDashboard(e) {
  return CardService.newActionResponseBuilder()
    .setNavigation(
      CardService.newNavigation()
        .popCard()
        .pushCard(createDashboardCard())
    )
    .build();
}

/**
 * Gets the worker dashboard URL
 * @returns {string} Dashboard URL
 */
function getWorkerDashboardUrl() {
  const config = getConfig();
  return `${config.WORKER_BASE_URL}/api/email/dashboard`;
}

/**
 * Formats a date string for display
 * @param {string} dateString - ISO date string
 * @returns {string} Formatted date
 */
function formatDate(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

/**
 * Gets configuration object
 * @returns {Object} Configuration
 */
function getConfig() {
  // Use the same config from Code.gs if it's available
  if (typeof CONFIG !== 'undefined') {
    return {
      WORKER_BASE_URL: CONFIG.WORKER_BASE_URL || "https://9to5-scout-retrofit.hacolby.workers.dev",
    };
  }
  return {
    WORKER_BASE_URL: "https://9to5-scout-retrofit.hacolby.workers.dev",
  };
}

