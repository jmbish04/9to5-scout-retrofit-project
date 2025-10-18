#!/usr/bin/env tsx

/**
 * Simple test script for EmailProcessorAgent
 * Based on Cloudflare Agents SDK example
 */

const WORKER_URL = process.env.WORKER_URL || "http://localhost:8787";
const TEST_ENDPOINT = `${WORKER_URL}/api/email/test`;

interface TestEmailData {
  from: string;
  to: string;
  subject: string;
  body?: string;
  html?: string;
  headers?: Record<string, string>;
}

async function testEmailAgent(emailData: TestEmailData, testName: string) {
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
      return true;
    } else {
      console.error("❌ Error:", response.status, response.statusText);
      const errorText = await response.text();
      console.error("Error details:", errorText);
      return false;
    }
  } catch (error) {
    console.error("❌ Network error:", error);
    console.log("💡 Make sure the server is running with: pnpm dev");
    return false;
  }
}

async function runTests() {
  console.log("🚀 Starting EmailProcessorAgent Tests");
  console.log(`🌐 Worker URL: ${WORKER_URL}`);
  console.log(`📡 Test Endpoint: ${TEST_ENDPOINT}`);

  const tests = [
    {
      name: "Job Alert Email",
      data: {
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
    },
    {
      name: "OTP Email",
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
      name: "Recruiter Message",
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
    {
      name: "Spam Email",
      data: {
        from: "nigerian.prince@scam.com",
        to: "victim@example.com",
        subject: "URGENT: Claim your $1,000,000 inheritance",
        body: `Dear Sir/Madam,

I am writing to inform you that you have inherited $1,000,000 from a distant relative. To claim this money, please send me your bank account details and social security number.

This is a limited time offer. Act now!

Best regards,
Prince Abacha`,
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    const success = await testEmailAgent(test.data, test.name);
    if (success) {
      passed++;
    } else {
      failed++;
    }

    // Add delay between tests
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n📊 Test Results:");
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(
    `   📈 Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`
  );

  if (failed > 0) {
    console.log("\n⚠️  Some tests failed. Check the output above for details.");
    process.exit(1);
  } else {
    console.log("\n🎉 All tests passed!");
    console.log("\n📋 Next Steps:");
    console.log("   1. Check the email_logs table for processed emails");
    console.log("   2. Verify job links were extracted and processed");
    console.log("   3. Check OTP forwarding if configured");
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests().catch((error) => {
    console.error("💥 Test runner failed:", error);
    process.exit(1);
  });
}

export { runTests, testEmailAgent };
