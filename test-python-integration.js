/**
 * Test script for Python integration endpoints
 * Run with: node test-python-integration.js
 */

const WORKER_URL =
  process.env.WORKER_URL || "https://9to5-scout.hacolby.workers.dev";
const API_KEY = process.env.WORKER_API_KEY || "your-api-key-here";

async function testScrapeQueue() {
  console.log("Testing scrape queue endpoints...");

  try {
    // Test adding a job to the queue
    const addJobResponse = await fetch(`${WORKER_URL}/api/v1/scrape-queue`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        urls: "https://example.com/job/123",
        source: "indeed",
        priority: 1,
      }),
    });

    if (!addJobResponse.ok) {
      throw new Error(
        `Failed to add job: ${
          addJobResponse.status
        } ${await addJobResponse.text()}`
      );
    }

    const addJobResult = await addJobResponse.json();
    console.log("✅ Successfully added job to queue:", addJobResult);

    // Test getting pending jobs
    const pendingJobsResponse = await fetch(
      `${WORKER_URL}/api/v1/scrape-queue/pending?limit=5`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    if (!pendingJobsResponse.ok) {
      throw new Error(
        `Failed to get pending jobs: ${
          pendingJobsResponse.status
        } ${await pendingJobsResponse.text()}`
      );
    }

    const pendingJobsResult = await pendingJobsResponse.json();
    console.log("✅ Successfully retrieved pending jobs:", pendingJobsResult);

    // Test updating job status
    if (pendingJobsResult.jobs && pendingJobsResult.jobs.length > 0) {
      const jobId = pendingJobsResult.jobs[0].id;
      const updateStatusResponse = await fetch(
        `${WORKER_URL}/api/v1/scrape-queue/${jobId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: "completed",
          }),
        }
      );

      if (!updateStatusResponse.ok) {
        throw new Error(
          `Failed to update job status: ${
            updateStatusResponse.status
          } ${await updateStatusResponse.text()}`
        );
      }

      const updateStatusResult = await updateStatusResponse.json();
      console.log("✅ Successfully updated job status:", updateStatusResult);
    }
  } catch (error) {
    console.error("❌ Error testing scrape queue:", error);
  }
}

async function testJobsBatch() {
  console.log("\nTesting jobs batch endpoint...");

  try {
    const batchResponse = await fetch(`${WORKER_URL}/api/v1/jobs/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobs: [
          {
            url: "https://example.com/job/456",
            title: "Test Job",
            company: "Test Company",
            location: "Test Location",
            description_md: "Test job description",
          },
        ],
      }),
    });

    if (!batchResponse.ok) {
      throw new Error(
        `Failed to post batch jobs: ${
          batchResponse.status
        } ${await batchResponse.text()}`
      );
    }

    const batchResult = await batchResponse.json();
    console.log("✅ Successfully posted batch jobs:", batchResult);
  } catch (error) {
    console.error("❌ Error testing jobs batch:", error);
  }
}

async function testRemoteScrape() {
  console.log("\nTesting remote scrape endpoint...");

  try {
    const remoteScrapeResponse = await fetch(
      `${WORKER_URL}/api/v1/remote-scrape`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          site_name: ["indeed"],
          search_term: "software engineer",
          location: "San Francisco",
          results_wanted: 2,
        }),
      }
    );

    if (!remoteScrapeResponse.ok) {
      throw new Error(
        `Failed to execute remote scrape: ${
          remoteScrapeResponse.status
        } ${await remoteScrapeResponse.text()}`
      );
    }

    const remoteScrapeResult = await remoteScrapeResponse.json();
    console.log("✅ Successfully executed remote scrape:", remoteScrapeResult);
  } catch (error) {
    console.error("❌ Error testing remote scrape:", error);
  }
}

async function testScrapeFallback() {
  console.log("\nTesting scrape fallback endpoint...");

  try {
    const fallbackResponse = await fetch(
      `${WORKER_URL}/api/v1/scrape-fallback`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: "https://example.com/job/fallback-test",
          source: "indeed",
          priority: 2,
          reason: "browser_rendering_failed_403",
        }),
      }
    );

    if (!fallbackResponse.ok) {
      throw new Error(
        `Failed to queue fallback job: ${
          fallbackResponse.status
        } ${await fallbackResponse.text()}`
      );
    }

    const fallbackResult = await fallbackResponse.json();
    console.log("✅ Successfully queued fallback job:", fallbackResult);
  } catch (error) {
    console.error("❌ Error testing scrape fallback:", error);
  }
}

async function main() {
  console.log("🧪 Testing Python Integration Endpoints");
  console.log("=====================================");

  if (!API_KEY || API_KEY === "your-api-key-here") {
    console.error("❌ Please set WORKER_API_KEY environment variable");
    process.exit(1);
  }

  await testScrapeQueue();
  await testJobsBatch();
  await testRemoteScrape();
  await testScrapeFallback();

  console.log("\n✅ All tests completed!");
}

main().catch(console.error);
