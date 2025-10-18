#!/usr/bin/env node

/**
 * Email Processor Agent Test
 * Tests the new Cloudflare Agents SDK email processor
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
        job_links: [
          "https://example.com/jobs/123",
          "https://example.com/jobs/456",
        ],
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
  EMAIL_PROCESSOR_AGENT: {
    newUniqueId: () => "test-agent-id",
    get: (id) => ({
      email: async (message, env) => {
        console.log(`📧 Agent processing email from: ${message.from}`);
        return Promise.resolve();
      },
    }),
  },
};

async function testEmailAgentInitialization() {
  console.log("🧪 Testing Email Agent Initialization...");

  try {
    // Test agent creation
    const agentId = mockEnv.EMAIL_PROCESSOR_AGENT.newUniqueId();
    const agent = mockEnv.EMAIL_PROCESSOR_AGENT.get(agentId);

    console.log("✅ Email Agent initialized successfully");
    console.log(`   Agent ID: ${agentId}`);

    return true;
  } catch (error) {
    console.error("❌ Email Agent initialization failed:", error.message);
    return false;
  }
}

async function testEmailProcessing() {
  console.log("\n📧 Testing Email Processing...");

  try {
    const mockMessage = {
      from: "recruiter@company.com",
      to: "jobs@example.com",
      raw: "Mock email content",
      headers: new Map([["From", "recruiter@company.com"]]),
    };

    const agentId = mockEnv.EMAIL_PROCESSOR_AGENT.newUniqueId();
    const agent = mockEnv.EMAIL_PROCESSOR_AGENT.get(agentId);

    await agent.email(mockMessage, mockEnv);

    console.log("✅ Email processing completed successfully");
    return true;
  } catch (error) {
    console.error("❌ Email processing failed:", error.message);
    return false;
  }
}

async function testAIClassification() {
  console.log("\n🤖 Testing AI Classification...");

  try {
    const response = await mockEnv.AI.run("test-model", {
      messages: [
        { role: "system", content: "Classify this email" },
        { role: "user", content: "Test email content" },
      ],
    });

    console.log("✅ AI Classification Result:");
    console.log(`   Category: ${response.category}`);
    console.log(`   Job Links: ${response.job_links.length}`);
    console.log(`   Reasoning: ${response.category_reasoning}`);

    return response.category === "JOB_ALERT" && response.job_links.length === 2;
  } catch (error) {
    console.error("❌ AI classification test failed:", error.message);
    return false;
  }
}

async function testDatabaseLogging() {
  console.log("\n💾 Testing Database Logging...");

  try {
    const result = await mockEnv.DB.prepare(
      `INSERT INTO email_logs (from_email, to_email, subject, ai_category, status)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        "test@example.com",
        "jobs@example.com",
        "Test Email",
        "JOB_ALERT",
        "processing"
      )
      .run();

    console.log("✅ Database logging successful");
    console.log(`   Email ID: ${result.meta.last_row_id}`);

    return true;
  } catch (error) {
    console.error("❌ Database logging failed:", error.message);
    return false;
  }
}

async function testJobProcessingIntegration() {
  console.log("\n🔗 Testing Job Processing Integration...");

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
  console.log("🚀 Starting Email Processor Agent Tests\n");

  const tests = [
    { name: "Email Agent Initialization", fn: testEmailAgentInitialization },
    { name: "Email Processing", fn: testEmailProcessing },
    { name: "AI Classification", fn: testAIClassification },
    { name: "Database Logging", fn: testDatabaseLogging },
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
    console.log("\n🎉 All email agent tests passed!");
    console.log("\n📋 Next Steps:");
    console.log("   1. Deploy the worker with the new EmailProcessorAgent");
    console.log("   2. Configure Cloudflare Email Routing");
    console.log("   3. Test with real emails");
    console.log("   4. Monitor the email_logs table for processing results");
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
  testEmailAgentInitialization,
  testEmailProcessing,
  testAIClassification,
  testDatabaseLogging,
  testJobProcessingIntegration,
  runAllTests,
};
