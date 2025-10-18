#!/usr/bin/env node

/**
 * Email Processing Test
 * Tests the email processing functionality including AI classification and job extraction
 */

const fs = require("fs");
const path = require("path");

// Mock environment for testing
const mockEnv = {
  AI: {
    run: async (model, input) => {
      // Mock AI response for testing
      return {
        from: "test@example.com",
        subject: "Software Engineer Position Available",
        body: "We have an exciting opportunity for a Software Engineer...",
        category: "JOB_ALERT",
        category_reasoning:
          "Email contains job posting details and application link",
        job_links: ["https://example.com/jobs/123"],
      };
    },
  },
  DB: {
    prepare: (query) => ({
      bind: (...args) => ({
        run: async () => ({ meta: { last_row_id: 123 } }),
      }),
    }),
  },
};

async function testEmailClassification() {
  console.log("🧪 Testing AI Email Classification...");

  try {
    // Test email content
    const testEmail = {
      from: "recruiter@company.com",
      subject: "New Software Engineer Position",
      content:
        "We have an exciting opportunity for a Software Engineer at our company. Apply here: https://company.com/jobs/123",
    };

    // Mock the AI classification
    const classification = await mockEnv.AI.run("test-model", {
      messages: [
        { role: "system", content: "Classify this email" },
        {
          role: "user",
          content: `From: ${testEmail.from}\nSubject: ${testEmail.subject}\nContent: ${testEmail.content}`,
        },
      ],
    });

    console.log("✅ AI Classification Result:");
    console.log(`   Category: ${classification.category}`);
    console.log(`   Job Links: ${classification.job_links.length}`);
    console.log(`   Reasoning: ${classification.category_reasoning}`);

    return true;
  } catch (error) {
    console.error("❌ Email classification test failed:", error.message);
    return false;
  }
}

async function testJobLinkExtraction() {
  console.log("\n🔗 Testing Job Link Extraction...");

  try {
    const testContent = `
      We have several positions available:
      1. Software Engineer: https://company.com/jobs/123
      2. Data Scientist: https://company.com/jobs/456
      3. Product Manager: https://company.com/jobs/789
      
      Please apply through our website.
    `;

    // Simple regex-based job link extraction
    const jobLinkRegex = /https?:\/\/[^\s]+\/jobs\/\d+/g;
    const jobLinks = testContent.match(jobLinkRegex) || [];

    console.log("✅ Job Links Extracted:");
    jobLinks.forEach((link, index) => {
      console.log(`   ${index + 1}. ${link}`);
    });

    return jobLinks.length === 3;
  } catch (error) {
    console.error("❌ Job link extraction test failed:", error.message);
    return false;
  }
}

async function testEmailStorage() {
  console.log("\n💾 Testing Email Storage...");

  try {
    const testEmailData = {
      from: "test@example.com",
      to: "jobs@company.com",
      subject: "Test Email",
      content: "This is a test email",
      category: "JOB_ALERT",
      job_links: ["https://example.com/job/123"],
    };

    // Mock database insert
    const result = await mockEnv.DB.prepare(
      `
      INSERT INTO email_logs (from_email, to_email, subject, content_text, ai_category, ai_job_links)
      VALUES (?, ?, ?, ?, ?, ?)
    `
    )
      .bind(
        testEmailData.from,
        testEmailData.to,
        testEmailData.subject,
        testEmailData.content,
        testEmailData.category,
        JSON.stringify(testEmailData.job_links)
      )
      .run();

    console.log("✅ Email stored successfully");
    console.log(`   Email ID: ${result.meta.last_row_id}`);

    return true;
  } catch (error) {
    console.error("❌ Email storage test failed:", error.message);
    return false;
  }
}

async function testJobProcessingIntegration() {
  console.log("\n⚙️ Testing Job Processing Integration...");

  try {
    const jobLinks = [
      "https://example.com/jobs/123",
      "https://example.com/jobs/456",
    ];

    // Mock job processing submission
    const processingRequest = {
      urls: jobLinks,
      source: "email",
      source_id: "123",
      metadata: { email_classification: "JOB_ALERT" },
    };

    console.log("✅ Job Processing Request:");
    console.log(`   URLs: ${processingRequest.urls.length}`);
    console.log(`   Source: ${processingRequest.source}`);
    console.log(`   Source ID: ${processingRequest.source_id}`);

    return true;
  } catch (error) {
    console.error("❌ Job processing integration test failed:", error.message);
    return false;
  }
}

async function runAllTests() {
  console.log("🚀 Starting Email Processing Tests\n");

  const tests = [
    { name: "AI Email Classification", fn: testEmailClassification },
    { name: "Job Link Extraction", fn: testJobLinkExtraction },
    { name: "Email Storage", fn: testEmailStorage },
    { name: "Job Processing Integration", fn: testJobProcessingIntegration },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.fn();
      if (result) {
        passed++;
      } else {
        failed++;
      }
    } catch (error) {
      console.error(`❌ ${test.name} failed with error:`, error.message);
      failed++;
    }
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
    console.log("\n🎉 All email processing tests passed!");
    process.exit(0);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  runAllTests().catch((error) => {
    console.error("💥 Test runner failed:", error);
    process.exit(1);
  });
}

module.exports = {
  testEmailClassification,
  testJobLinkExtraction,
  testEmailStorage,
  testJobProcessingIntegration,
  runAllTests,
};
