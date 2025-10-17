/**
 * Browser Rendering Testing Module
 *
 * Provides comprehensive testing of the browser rendering pipeline with full traceability.
 * Tests both authenticated and non-authenticated scenarios, saves results to R2, and updates D1.
 */
import { insertJob, insertSnapshot } from "../lib/d1-utils";
import { createR2Storage } from "../lib/r2";
/**
 * Execute a comprehensive browser rendering test
 */
export async function executeBrowserTest(config, env) {
    const testId = `test-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;
    const startTime = new Date().toISOString();
    const result = {
        testId,
        testName: config.testName,
        url: config.url,
        config,
        steps: [],
        overallStatus: "running",
        startTime,
        assets: {},
        r2Keys: {},
        d1Records: {},
        errors: [],
    };
    // Define test steps
    const steps = [
        { step: 1, name: "Initialize Test", status: "pending" },
        { step: 2, name: "Validate Configuration", status: "pending" },
        {
            step: 3,
            name: "Test Browser Rendering API Connection",
            status: "pending",
        },
        { step: 4, name: "Execute Screenshot Capture", status: "pending" },
        { step: 5, name: "Execute Content Extraction", status: "pending" },
        {
            step: 6,
            name: "Execute Markdown Extraction",
            status: "pending",
        },
        { step: 7, name: "Execute JSON Extraction", status: "pending" },
        { step: 8, name: "Execute Link Extraction", status: "pending" },
        { step: 9, name: "Execute Element Scraping", status: "pending" },
        { step: 10, name: "Execute PDF Generation", status: "pending" },
        { step: 11, name: "Upload Assets to R2", status: "pending" },
        { step: 12, name: "Update D1 Database", status: "pending" },
        { step: 13, name: "Generate Test Report", status: "pending" },
    ];
    result.steps = steps;
    try {
        // Step 1: Initialize Test
        await updateStep(result, 1, "running");
        if (result.steps[0]) {
            result.steps[0].startTime = new Date().toISOString();
            result.steps[0].details = { testId, config };
        }
        await updateStep(result, 1, "success");
        // Step 2: Validate Configuration
        await updateStep(result, 2, "running");
        const validation = validateTestConfig(config);
        if (!validation.valid) {
            throw new Error(`Configuration validation failed: ${validation.errors.join(", ")}`);
        }
        await updateStep(result, 2, "success");
        // Step 3: Test Browser Rendering API Connection
        await updateStep(result, 3, "running");
        const connectionTest = await testBrowserRenderingConnection(env);
        if (!connectionTest.success) {
            throw new Error(`Browser Rendering API connection failed: ${connectionTest.error}`);
        }
        if (result.steps[2]) {
            result.steps[2].details = connectionTest;
        }
        await updateStep(result, 3, "success");
        // Steps 4-10: Execute Browser Rendering Operations
        const renderingResults = await executeRenderingOperations(config, env, result);
        // Step 11: Upload Assets to R2
        await updateStep(result, 11, "running");
        const r2Results = await uploadAssetsToR2(renderingResults, testId, env);
        result.r2Keys = r2Results.keys;
        result.assets = r2Results.assets;
        await updateStep(result, 11, "success");
        // Step 12: Update D1 Database
        await updateStep(result, 12, "running");
        const d1Results = await updateD1Database(testId, config, r2Results.keys, env);
        result.d1Records = d1Results;
        await updateStep(result, 12, "success");
        // Step 13: Generate Test Report
        await updateStep(result, 13, "running");
        result.endTime = new Date().toISOString();
        result.totalDuration =
            new Date(result.endTime).getTime() - new Date(result.startTime).getTime();
        result.overallStatus = "success";
        await updateStep(result, 13, "success");
    }
    catch (error) {
        result.overallStatus = "failed";
        result.endTime = new Date().toISOString();
        result.totalDuration =
            new Date(result.endTime).getTime() - new Date(result.startTime).getTime();
        result.errors.push(error instanceof Error ? error.message : String(error));
        // Mark current step as failed
        const currentStep = result.steps.find((s) => s.status === "running");
        if (currentStep) {
            currentStep.status = "failed";
            currentStep.endTime = new Date().toISOString();
            currentStep.error =
                error instanceof Error ? error.message : String(error);
        }
    }
    return result;
}
/**
 * Execute all browser rendering operations in parallel
 */
async function executeRenderingOperations(config, env, result) {
    const operations = [
        { name: "screenshot", step: 4, fn: () => captureScreenshot(config, env) },
        { name: "content", step: 5, fn: () => extractContent(config, env) },
        { name: "markdown", step: 6, fn: () => extractMarkdown(config, env) },
        { name: "json", step: 7, fn: () => extractJson(config, env) },
        { name: "links", step: 8, fn: () => extractLinks(config, env) },
        { name: "scraped", step: 9, fn: () => scrapeElements(config, env) },
        { name: "pdf", step: 10, fn: () => generatePdf(config, env) },
    ];
    const results = {};
    // Execute operations in parallel
    const promises = operations.map(async (op) => {
        try {
            await updateStep(result, op.step, "running");
            const operationResult = await op.fn();
            results[op.name] = operationResult;
            await updateStep(result, op.step, "success", { result: operationResult });
            return { name: op.name, success: true, result: operationResult };
        }
        catch (error) {
            await updateStep(result, op.step, "failed", {
                error: error instanceof Error ? error.message : String(error),
            });
            return {
                name: op.name,
                success: false,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    });
    await Promise.all(promises);
    return results;
}
/**
 * Capture screenshot
 */
async function captureScreenshot(config, env) {
    const requestBody = {
        url: config.url,
        screenshotOptions: {
            fullPage: true,
            type: "png",
            omitBackground: false,
        },
        viewport: {
            width: 1920,
            height: 1080,
        },
    };
    if (config.withAuth && config.username && config.password) {
        requestBody.authenticate = {
            username: config.username,
            password: config.password,
        };
    }
    if (config.customHeaders) {
        requestBody.setExtraHTTPHeaders = config.customHeaders;
    }
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        throw new Error(`Screenshot capture failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}
/**
 * Extract content
 */
async function extractContent(config, env) {
    const requestBody = {
        url: config.url,
        rejectResourceTypes: ["image", "stylesheet"],
    };
    if (config.withAuth && config.username && config.password) {
        requestBody.authenticate = {
            username: config.username,
            password: config.password,
        };
    }
    if (config.customHeaders) {
        requestBody.setExtraHTTPHeaders = config.customHeaders;
    }
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/content`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        throw new Error(`Content extraction failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}
/**
 * Extract markdown
 */
async function extractMarkdown(config, env) {
    const requestBody = { url: config.url };
    if (config.withAuth && config.username && config.password) {
        requestBody.authenticate = {
            username: config.username,
            password: config.password,
        };
    }
    if (config.customHeaders) {
        requestBody.setExtraHTTPHeaders = config.customHeaders;
    }
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/markdown`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        throw new Error(`Markdown extraction failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}
/**
 * Extract JSON with AI
 */
async function extractJson(config, env) {
    const schema = {
        type: "object",
        properties: {
            title: { type: "string" },
            description: { type: "string" },
            headings: { type: "array", items: { type: "string" } },
            links: { type: "array", items: { type: "string" } },
            metadata: { type: "object" },
        },
    };
    const requestBody = {
        url: config.url,
        prompt: "Extract key information from this webpage including title, description, headings, and links",
        response_format: {
            type: "json_schema",
            schema: schema,
        },
    };
    if (config.withAuth && config.username && config.password) {
        requestBody.authenticate = {
            username: config.username,
            password: config.password,
        };
    }
    if (config.customHeaders) {
        requestBody.setExtraHTTPHeaders = config.customHeaders;
    }
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/json`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        throw new Error(`JSON extraction failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}
/**
 * Extract links
 */
async function extractLinks(config, env) {
    const requestBody = { url: config.url };
    if (config.withAuth && config.username && config.password) {
        requestBody.authenticate = {
            username: config.username,
            password: config.password,
        };
    }
    if (config.customHeaders) {
        requestBody.setExtraHTTPHeaders = config.customHeaders;
    }
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/links`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        throw new Error(`Link extraction failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}
/**
 * Scrape elements
 */
async function scrapeElements(config, env) {
    const selectors = [
        { selector: "h1, h2, h3" },
        { selector: "a[href]" },
        { selector: "img[src]" },
        { selector: "meta[name='description']" },
    ];
    const requestBody = {
        url: config.url,
        elements: selectors,
    };
    if (config.withAuth && config.username && config.password) {
        requestBody.authenticate = {
            username: config.username,
            password: config.password,
        };
    }
    if (config.customHeaders) {
        requestBody.setExtraHTTPHeaders = config.customHeaders;
    }
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/scrape`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        throw new Error(`Element scraping failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}
/**
 * Generate PDF
 */
async function generatePdf(config, env) {
    const requestBody = {
        url: config.url,
        pdfOptions: {
            format: "a4",
            printBackground: true,
        },
    };
    if (config.withAuth && config.username && config.password) {
        requestBody.authenticate = {
            username: config.username,
            password: config.password,
        };
    }
    if (config.customHeaders) {
        requestBody.setExtraHTTPHeaders = config.customHeaders;
    }
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/pdf`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
        throw new Error(`PDF generation failed: ${response.status} ${response.statusText}`);
    }
    return await response.json();
}
/**
 * Upload assets to R2
 */
async function uploadAssetsToR2(renderingResults, testId, env) {
    const r2Storage = createR2Storage(env);
    const keys = {};
    const assets = {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const basePath = `test_results/${testId}`;
    for (const [operation, result] of Object.entries(renderingResults)) {
        if (result && result.success && result.result) {
            try {
                let data;
                let contentType;
                let extension;
                if (operation === "screenshot" || operation === "pdf") {
                    // Binary data
                    data = Buffer.from(result.result, "base64").buffer;
                    contentType =
                        operation === "screenshot" ? "image/png" : "application/pdf";
                    extension = operation === "screenshot" ? "png" : "pdf";
                }
                else {
                    // Text data
                    const textData = typeof result.result === "string"
                        ? result.result
                        : JSON.stringify(result.result, null, 2);
                    data = new TextEncoder().encode(textData).buffer;
                    contentType =
                        operation === "json" ||
                            operation === "links" ||
                            operation === "scraped"
                            ? "application/json"
                            : operation === "markdown"
                                ? "text/markdown"
                                : "text/html";
                    extension =
                        operation === "json" ||
                            operation === "links" ||
                            operation === "scraped"
                            ? "json"
                            : operation === "markdown"
                                ? "md"
                                : "html";
                }
                const filename = `${basePath}/${operation}-${timestamp}.${extension}`;
                const uploadResult = await r2Storage.uploadFile(data, {
                    type: "misc",
                    originalName: filename,
                    contentType,
                    timestamp,
                });
                keys[operation] = uploadResult.key;
                assets[operation] = uploadResult.url;
            }
            catch (error) {
                console.error(`Failed to upload ${operation} to R2:`, error);
            }
        }
    }
    return { keys, assets };
}
/**
 * Update D1 database with test results
 */
async function updateD1Database(testId, config, r2Keys, env) {
    try {
        // Insert job record
        const jobData = {
            id: testId,
            title: `Browser Test: ${config.testName}`,
            company: "Test Company",
            location: "Test Location",
            url: config.url,
            description_md: `Browser rendering test for ${config.url}`,
            salary_min: undefined,
            salary_max: undefined,
            salary_currency: undefined,
            employment_type: "test",
            posted_at: new Date().toISOString(),
            first_seen_at: new Date().toISOString(),
            last_crawled_at: new Date().toISOString(),
            status: "active",
            source: "MANUAL",
            site_id: "test-site",
        };
        const jobResult = await insertJob(env.DB, jobData);
        if (!jobResult.success) {
            throw new Error(`Failed to insert job: ${jobResult.error}`);
        }
        // Insert snapshot record
        const snapshotData = {
            id: `snapshot-${testId}`,
            job_id: jobResult.jobId,
            html_r2_key: r2Keys.content || "",
            screenshot_r2_key: r2Keys.screenshot || "",
            pdf_r2_key: r2Keys.pdf || "",
            markdown_r2_key: r2Keys.markdown || "",
            json_r2_key: r2Keys.json || "",
            fetched_at: new Date().toISOString(),
        };
        const snapshotResult = await insertSnapshot(env.DB, snapshotData);
        if (!snapshotResult.success) {
            throw new Error(`Failed to insert snapshot: ${snapshotResult.error}`);
        }
        return { jobId: jobResult.jobId, snapshotId: snapshotResult.snapshotId };
    }
    catch (error) {
        console.error("Failed to update D1 database:", error);
        return {};
    }
}
/**
 * Test browser rendering API connection
 */
async function testBrowserRenderingConnection(env) {
    try {
        const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${env.BROWSER_RENDERING_TOKEN}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: "https://example.com",
                screenshotOptions: { fullPage: true, type: "png" },
            }),
        });
        return { success: response.ok };
    }
    catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : String(error),
        };
    }
}
/**
 * Validate test configuration
 */
function validateTestConfig(config) {
    const errors = [];
    if (!config.url) {
        errors.push("URL is required");
    }
    if (!config.testName) {
        errors.push("Test name is required");
    }
    if (config.withAuth) {
        if (!config.username) {
            errors.push("Username is required when authentication is enabled");
        }
        if (!config.password) {
            errors.push("Password is required when authentication is enabled");
        }
    }
    return { valid: errors.length === 0, errors };
}
/**
 * Update test step status
 */
async function updateStep(result, stepNumber, status, details) {
    const step = result.steps.find((s) => s.step === stepNumber);
    if (step) {
        step.status = status;
        if (status === "running") {
            step.startTime = new Date().toISOString();
        }
        else {
            step.endTime = new Date().toISOString();
            if (step.startTime) {
                step.duration =
                    new Date(step.endTime).getTime() - new Date(step.startTime).getTime();
            }
        }
        if (details) {
            step.details = details;
        }
    }
}
/**
 * Handle browser test API requests
 */
export async function handleBrowserTest(request, env) {
    try {
        const url = new URL(request.url);
        if (request.method === "POST") {
            const config = await request.json();
            const result = await executeBrowserTest(config, env);
            return new Response(JSON.stringify({
                success: true,
                result,
            }), {
                headers: { "Content-Type": "application/json" },
            });
        }
        if (request.method === "GET") {
            // Return test configuration options
            return new Response(JSON.stringify({
                success: true,
                testTypes: [
                    {
                        name: "Basic Test",
                        description: "Test without authentication",
                        config: {
                            url: "https://example.com",
                            testName: "Basic Browser Test",
                            withAuth: false,
                        },
                    },
                    {
                        name: "Authenticated Test",
                        description: "Test with authentication",
                        config: {
                            url: "https://example.com",
                            testName: "Authenticated Browser Test",
                            withAuth: true,
                            username: "test@example.com",
                            password: "password",
                        },
                    },
                    {
                        name: "LinkedIn Test",
                        description: "Test LinkedIn job scraping",
                        config: {
                            url: "https://linkedin.com/jobs/view/1234567890",
                            testName: "LinkedIn Job Test",
                            withAuth: true,
                            username: "your-email@example.com",
                            password: "your-password",
                            customHeaders: {
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                            },
                        },
                    },
                ],
            }), {
                headers: { "Content-Type": "application/json" },
            });
        }
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
            status: 405,
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Browser test error:", error);
        return new Response(JSON.stringify({
            success: false,
            error: error instanceof Error ? error.message : String(error),
        }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
