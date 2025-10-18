#!/usr/bin/env tsx

/**
 * Integration test for EmailProcessorAgent
 * Tests the agent via the REST API endpoint
 */

const fs = require("fs");
const path = require("path");

// Configuration
const WORKER_URL = process.env.WORKER_URL || "http://localhost:8787";
const TEST_ENDPOINT = `${WORKER_URL}/api/email/test`;

// Test email templates
const TEST_EMAILS = {
  jobAlert: {
    from: "jobs@linkedin.com",
    to: "EmailProcessorAgent+test123@example.com",
    subject: "New Software Engineer Position Available",
    body: `Hello!

We found a new job that matches your profile:

Position: Senior Software Engineer
Company: Tech Corp
Location: San Francisco, CA
Salary: $120,000 - $150,000

Apply here: https://linkedin.com/jobs/view/123456
More details: https://techcorp.com/careers/senior-engineer

Best regards,
LinkedIn Jobs Team`,
    html: `
      <html>
        <body>
          <h2>New Job Opportunity</h2>
          <p>We found a new job that matches your profile:</p>
          <ul>
            <li><strong>Position:</strong> Senior Software Engineer</li>
            <li><strong>Company:</strong> Tech Corp</li>
            <li><strong>Location:</strong> San Francisco, CA</li>
            <li><strong>Salary:</strong> $120,000 - $150,000</li>
          </ul>
          <p>
            <a href="https://linkedin.com/jobs/view/123456">Apply here</a> | 
            <a href="https://techcorp.com/careers/senior-engineer">More details</a>
          </p>
        </body>
      </html>
    `,
  },

  otpEmail: {
    from: "noreply@bank.com",
    to: "user@example.com",
    subject: "Your verification code",
    body: `Your verification code is: 123456

This code will expire in 10 minutes.

If you didn't request this code, please ignore this email.

Bank Security Team`,
    headers: {
      "X-Priority": "1",
      "X-MSMail-Priority": "High",
    },
  },

  recruiterMessage: {
    from: "sarah.johnson@techcorp.com",
    to: "candidate@example.com",
    subject: "Exciting opportunity at TechCorp",
    body: `Hi there!

I came across your profile and was impressed by your experience in software engineering. We have an exciting opportunity at TechCorp that I think would be a great fit.

Would you be interested in a brief call to discuss this opportunity?

Best regards,
Sarah Johnson
Senior Recruiter
TechCorp`,
  },

  spamEmail: {
    from: "nigerian.prince@scam.com",
    to: "victim@example.com",
    subject: "URGENT: Claim your $1,000,000 inheritance",
    body: `Dear Sir/Madam,

I am writing to inform you that you have inherited $1,000,000 from a distant relative. To claim this money, please send me your bank account details and social security number.

This is a limited time offer. Act now!

Best regards,
Prince Abacha`,
  },

  networkingEmail: {
    from: "john.doe@linkedin.com",
    to: "professional@example.com",
    subject: "Let's connect on LinkedIn",
    body: `Hi!

I'd like to connect with you on LinkedIn. I noticed we have mutual connections in the software engineering field.

Looking forward to connecting!

John Doe
Software Engineer at TechCorp`,
  },
};

/**
 * Send a test email to the EmailProcessorAgent
 */
async function sendTestEmail(emailData, testName) {
  console.log(`\n🧪 Testing: ${testName}`);
  console.log(`📧 From: ${emailData.from}`);
  console.log(`📧 To: ${emailData.to}`);
  console.log(`📧 Subject: ${emailData.subject}`);

  try {
    const response = await fetch(TEST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (response.ok) {
      const result = await response.json();
      console.log("✅ Success:", result);
      return { success: true, result };
    } else {
      const errorText = await response.text();
      console.error("❌ Error:", response.status, response.statusText);
      console.error("Error details:", errorText);
      return { success: false, error: errorText };
    }
  } catch (error) {
    console.error("❌ Network error:", error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test the EmailProcessorAgent with various email types
 */
async function runEmailAgentTests() {
  console.log("🚀 Starting EmailProcessorAgent Integration Tests");
  console.log(`🌐 Worker URL: ${WORKER_URL}`);
  console.log(`📡 Test Endpoint: ${TEST_ENDPOINT}`);

  const results = {
    passed: 0,
    failed: 0,
    tests: [],
  };

  // Test each email type
  for (const [testName, emailData] of Object.entries(TEST_EMAILS)) {
    const result = await sendTestEmail(emailData, testName);

    results.tests.push({
      name: testName,
      success: result.success,
      error: result.error,
      result: result.result,
    });

    if (result.success) {
      results.passed++;
    } else {
      results.failed++;
    }

    // Add delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // Print results
  console.log("\n📊 Test Results Summary:");
  console.log(`   ✅ Passed: ${results.passed}`);
  console.log(`   ❌ Failed: ${results.failed}`);
  console.log(
    `   📈 Success Rate: ${Math.round(
      (results.passed / (results.passed + results.failed)) * 100
    )}%`
  );

  // Detailed results
  console.log("\n📋 Detailed Results:");
  results.tests.forEach((test) => {
    const status = test.success ? "✅" : "❌";
    console.log(`   ${status} ${test.name}`);
    if (!test.success && test.error) {
      console.log(`      Error: ${test.error}`);
    }
  });

  // Save results to file
  const resultsFile = path.join(__dirname, "email-agent-results.json");
  fs.writeFileSync(resultsFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to: ${resultsFile}`);

  if (results.failed > 0) {
    console.log("\n⚠️  Some tests failed. Check the output above for details.");
    console.log("\n🔧 Troubleshooting:");
    console.log("   1. Make sure the worker is running: pnpm dev");
    console.log("   2. Check worker logs for errors");
    console.log("   3. Verify database migrations are applied");
    console.log("   4. Check environment variables are set");
    process.exit(1);
  } else {
    console.log("\n🎉 All email agent tests passed!");
    console.log("\n📋 Next Steps:");
    console.log("   1. Check the email_logs table for processed emails");
    console.log("   2. Verify job links were extracted and processed");
    console.log("   3. Check OTP forwarding if configured");
    console.log("   4. Monitor agent performance and logs");
    process.exit(0);
  }
}

/**
 * Test a single email type
 */
async function testSingleEmail(emailType) {
  if (!TEST_EMAILS[emailType]) {
    console.error(`❌ Unknown email type: ${emailType}`);
    console.log("Available types:", Object.keys(TEST_EMAILS).join(", "));
    process.exit(1);
  }

  console.log(`🧪 Testing single email type: ${emailType}`);
  const result = await sendTestEmail(TEST_EMAILS[emailType], emailType);

  if (result.success) {
    console.log("✅ Test passed!");
    process.exit(0);
  } else {
    console.log("❌ Test failed!");
    process.exit(1);
  }
}

/**
 * Check if the worker is running
 */
async function checkWorkerHealth() {
  try {
    const response = await fetch(`${WORKER_URL}/api/health`);
    if (response.ok) {
      console.log("✅ Worker is running and healthy");
      return true;
    } else {
      console.log("⚠️  Worker is running but health check failed");
      return false;
    }
  } catch (error) {
    console.log("❌ Worker is not running or not accessible");
    console.log("💡 Start the worker with: pnpm dev");
    return false;
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);

  if (args.includes("--help") || args.includes("-h")) {
    console.log(`
EmailProcessorAgent Integration Test

Usage:
  node tests/email-agent-integration.test.js [options] [email-type]

Options:
  --help, -h          Show this help message
  --health-check      Only check if worker is running
  --single <type>     Test a single email type

Email Types:
  ${Object.keys(TEST_EMAILS).join(", ")}

Examples:
  node tests/email-agent-integration.test.js
  node tests/email-agent-integration.test.js --single jobAlert
  node tests/email-agent-integration.test.js --health-check
    `);
    process.exit(0);
  }

  if (args.includes("--health-check")) {
    const isHealthy = await checkWorkerHealth();
    process.exit(isHealthy ? 0 : 1);
  }

  if (args.includes("--single")) {
    const emailType = args[args.indexOf("--single") + 1];
    if (!emailType) {
      console.error("❌ Please specify an email type for --single");
      process.exit(1);
    }
    await testSingleEmail(emailType);
  } else {
    // Check worker health first
    const isHealthy = await checkWorkerHealth();
    if (!isHealthy) {
      console.log(
        "⚠️  Worker health check failed, but continuing with tests..."
      );
    }

    await runEmailAgentTests();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Test runner failed:", error);
    process.exit(1);
  });
}

module.exports = {
  sendTestEmail,
  runEmailAgentTests,
  testSingleEmail,
  checkWorkerHealth,
  TEST_EMAILS,
};
