#!/usr/bin/env node

/**
 * Demo script for EmailProcessorAgent
 * Shows how to test the agent with various email types
 */

const WORKER_URL = process.env.WORKER_URL || "http://localhost:8787";
const TEST_ENDPOINT = `${WORKER_URL}/api/email/test`;

// Demo email data
const demoEmails = [
  {
    name: "LinkedIn Job Alert",
    data: {
      from: "jobs@linkedin.com",
      to: "EmailProcessorAgent+demo@example.com",
      subject: "New Software Engineer Position at TechCorp",
      body: `Hello!

We found a new job that matches your profile:

Position: Senior Software Engineer
Company: TechCorp
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
              <li><strong>Company:</strong> TechCorp</li>
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
  },
  {
    name: "Bank OTP Code",
    data: {
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
  },
  {
    name: "Recruiter Outreach",
    data: {
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
  },
];

async function sendDemoEmail(emailData, emailName) {
  console.log(`\n📧 Sending: ${emailName}`);
  console.log(`   From: ${emailData.from}`);
  console.log(`   To: ${emailData.to}`);
  console.log(`   Subject: ${emailData.subject}`);

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
      console.log("   ✅ Success!");
      console.log(`   Agent ID: ${result.agentId}`);
      console.log(`   Body Length: ${result.emailData.bodyLength} chars`);
      if (result.emailData.htmlLength) {
        console.log(`   HTML Length: ${result.emailData.htmlLength} chars`);
      }
      return true;
    } else {
      const errorText = await response.text();
      console.log("   ❌ Error:", response.status, response.statusText);
      console.log("   Details:", errorText);
      return false;
    }
  } catch (error) {
    console.log("   ❌ Network error:", error.message);
    return false;
  }
}

async function runDemo() {
  console.log("🚀 EmailProcessorAgent Demo");
  console.log(`🌐 Worker URL: ${WORKER_URL}`);
  console.log(`📡 Test Endpoint: ${TEST_ENDPOINT}`);
  console.log(
    "\nThis demo will send various email types to the EmailProcessorAgent"
  );
  console.log("and show how it processes them with AI classification.\n");

  let successCount = 0;
  let totalCount = demoEmails.length;

  for (const email of demoEmails) {
    const success = await sendDemoEmail(email.data, email.name);
    if (success) {
      successCount++;
    }

    // Add delay between emails
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  console.log("\n📊 Demo Results:");
  console.log(`   ✅ Successful: ${successCount}/${totalCount}`);
  console.log(
    `   📈 Success Rate: ${Math.round((successCount / totalCount) * 100)}%`
  );

  if (successCount === totalCount) {
    console.log("\n🎉 Demo completed successfully!");
    console.log("\n📋 What happened:");
    console.log("   1. Emails were sent to the EmailProcessorAgent");
    console.log("   2. Agent parsed and classified each email with AI");
    console.log("   3. Job links were extracted (for job alerts)");
    console.log("   4. OTP codes were detected (for OTP emails)");
    console.log("   5. All data was logged to the email_logs table");
    console.log("\n🔍 Check the database:");
    console.log("   - email_logs table for processed emails");
    console.log("   - email_job_links table for extracted job URLs");
    console.log("   - AI classification results and reasoning");
  } else {
    console.log("\n⚠️  Some emails failed to process.");
    console.log("💡 Make sure the worker is running: pnpm dev");
  }
}

// Check if worker is accessible
async function checkWorker() {
  try {
    const response = await fetch(`${WORKER_URL}/api/health`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log("🔍 Checking worker status...");

  const isWorkerRunning = await checkWorker();
  if (!isWorkerRunning) {
    console.log("❌ Worker is not running or not accessible");
    console.log("💡 Start the worker with: pnpm dev");
    console.log("   Then run this demo again");
    process.exit(1);
  }

  console.log("✅ Worker is running and accessible");
  await runDemo();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error("💥 Demo failed:", error);
    process.exit(1);
  });
}

module.exports = { sendDemoEmail, runDemo, demoEmails };
