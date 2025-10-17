/**
 * WebSocket handler for real-time browser testing monitoring
 */

import type { Env } from "../index";
import {
  type BrowserTestConfig,
  type BrowserTestResult,
} from "./browser-testing";

interface WebSocketMessage {
  type: "start_test" | "test_update" | "test_complete" | "test_error";
  data: any;
}

export class BrowserTestWebSocket {
  private ws: WebSocket;
  private env: Env;
  private testId?: string;

  constructor(ws: WebSocket, env: Env) {
    this.ws = ws;
    this.env = env;
    this.setupMessageHandlers();
  }

  private setupMessageHandlers() {
    this.ws.addEventListener("message", async (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        await this.handleMessage(message);
      } catch (error) {
        this.sendError("Invalid message format", error);
      }
    });

    this.ws.addEventListener("close", () => {
      console.log("Browser test WebSocket closed");
    });

    this.ws.addEventListener("error", (error) => {
      console.error("Browser test WebSocket error:", error);
    });
  }

  private async handleMessage(message: WebSocketMessage) {
    switch (message.type) {
      case "start_test":
        await this.startTest(message.data);
        break;
      default:
        this.sendError("Unknown message type", null);
    }
  }

  private async startTest(config: BrowserTestConfig) {
    try {
      this.testId = `ws-test-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      this.sendMessage("test_update", {
        testId: this.testId,
        message: "Starting browser test...",
        status: "running",
      });

      // Execute test with real-time updates
      const result = await this.executeTestWithUpdates(config);

      this.sendMessage("test_complete", {
        testId: this.testId,
        result,
      });
    } catch (error) {
      this.sendError("Test execution failed", error);
    }
  }

  private async executeTestWithUpdates(
    config: BrowserTestConfig
  ): Promise<BrowserTestResult> {
    const testId = this.testId!;
    const startTime = new Date().toISOString();

    const result: BrowserTestResult = {
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
      { step: 1, name: "Initialize Test", status: "pending" as const },
      { step: 2, name: "Validate Configuration", status: "pending" as const },
      {
        step: 3,
        name: "Test Browser Rendering API Connection",
        status: "pending" as const,
      },
      {
        step: 4,
        name: "Execute Screenshot Capture",
        status: "pending" as const,
      },
      {
        step: 5,
        name: "Execute Content Extraction",
        status: "pending" as const,
      },
      {
        step: 6,
        name: "Execute Markdown Extraction",
        status: "pending" as const,
      },
      { step: 7, name: "Execute JSON Extraction", status: "pending" as const },
      { step: 8, name: "Execute Link Extraction", status: "pending" as const },
      { step: 9, name: "Execute Element Scraping", status: "pending" as const },
      { step: 10, name: "Execute PDF Generation", status: "pending" as const },
      { step: 11, name: "Upload Assets to R2", status: "pending" as const },
      { step: 12, name: "Update D1 Database", status: "pending" as const },
      { step: 13, name: "Generate Test Report", status: "pending" as const },
    ];

    result.steps = steps;

    try {
      // Step 1: Initialize Test
      await this.updateStepWithWebSocket(result, 1, "running");
      if (result.steps[0]) {
        result.steps[0].startTime = new Date().toISOString();
        result.steps[0].details = { testId, config };
      }
      await this.updateStepWithWebSocket(result, 1, "success");

      // Step 2: Validate Configuration
      await this.updateStepWithWebSocket(result, 2, "running");
      const validation = this.validateTestConfig(config);
      if (!validation.valid) {
        throw new Error(
          `Configuration validation failed: ${validation.errors.join(", ")}`
        );
      }
      await this.updateStepWithWebSocket(result, 2, "success");

      // Step 3: Test Browser Rendering API Connection
      await this.updateStepWithWebSocket(result, 3, "running");
      const connectionTest = await this.testBrowserRenderingConnection();
      if (!connectionTest.success) {
        throw new Error(
          `Browser Rendering API connection failed: ${connectionTest.error}`
        );
      }
      if (result.steps[2]) {
        result.steps[2].details = connectionTest;
      }
      await this.updateStepWithWebSocket(result, 3, "success");

      // Steps 4-10: Execute Browser Rendering Operations
      const renderingResults = await this.executeRenderingOperationsWithUpdates(
        config,
        result
      );

      // Step 11: Upload Assets to R2
      await this.updateStepWithWebSocket(result, 11, "running");
      const r2Results = await this.uploadAssetsToR2(renderingResults, testId);
      result.r2Keys = r2Results.keys;
      result.assets = r2Results.assets;
      await this.updateStepWithWebSocket(result, 11, "success");

      // Step 12: Update D1 Database
      await this.updateStepWithWebSocket(result, 12, "running");
      const d1Results = await this.updateD1Database(
        testId,
        config,
        r2Results.keys
      );
      result.d1Records = d1Results;
      await this.updateStepWithWebSocket(result, 12, "success");

      // Step 13: Generate Test Report
      await this.updateStepWithWebSocket(result, 13, "running");
      result.endTime = new Date().toISOString();
      result.totalDuration =
        new Date(result.endTime).getTime() -
        new Date(result.startTime).getTime();
      result.overallStatus = "success";
      await this.updateStepWithWebSocket(result, 13, "success");
    } catch (error) {
      result.overallStatus = "failed";
      result.endTime = new Date().toISOString();
      result.totalDuration =
        new Date(result.endTime).getTime() -
        new Date(result.startTime).getTime();
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );

      // Mark current step as failed
      const currentStep = result.steps.find((s) => s.status === "running");
      if (currentStep) {
        currentStep.status = "failed";
        currentStep.endTime = new Date().toISOString();
        currentStep.error =
          error instanceof Error ? error.message : String(error);
      }

      this.sendMessage("test_update", {
        testId,
        message: `Test failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        status: "failed",
        result,
      });
    }

    return result;
  }

  private async executeRenderingOperationsWithUpdates(
    config: BrowserTestConfig,
    result: BrowserTestResult
  ): Promise<Record<string, any>> {
    const operations = [
      { name: "screenshot", step: 4, fn: () => this.captureScreenshot(config) },
      { name: "content", step: 5, fn: () => this.extractContent(config) },
      { name: "markdown", step: 6, fn: () => this.extractMarkdown(config) },
      { name: "json", step: 7, fn: () => this.extractJson(config) },
      { name: "links", step: 8, fn: () => this.extractLinks(config) },
      { name: "scraped", step: 9, fn: () => this.scrapeElements(config) },
      { name: "pdf", step: 10, fn: () => this.generatePdf(config) },
    ];

    const results: Record<string, any> = {};

    // Execute operations in parallel
    const promises = operations.map(async (op) => {
      try {
        await this.updateStepWithWebSocket(result, op.step, "running");
        const operationResult = await op.fn();
        results[op.name] = operationResult;
        await this.updateStepWithWebSocket(result, op.step, "success", {
          result: operationResult,
        });
        return { name: op.name, success: true, result: operationResult };
      } catch (error) {
        await this.updateStepWithWebSocket(result, op.step, "failed", {
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

  private async updateStepWithWebSocket(
    result: BrowserTestResult,
    stepNumber: number,
    status: "running" | "success" | "failed",
    details?: any
  ): Promise<void> {
    const step = result.steps.find((s) => s.step === stepNumber);
    if (step) {
      step.status = status;

      if (status === "running") {
        step.startTime = new Date().toISOString();
      } else {
        step.endTime = new Date().toISOString();
        if (step.startTime) {
          step.duration =
            new Date(step.endTime).getTime() -
            new Date(step.startTime).getTime();
        }
      }

      if (details) {
        step.details = details;
      }

      // Send real-time update
      this.sendMessage("test_update", {
        testId: result.testId,
        step: stepNumber,
        stepName: step.name,
        status,
        details,
        progress: `${stepNumber}/${result.steps.length}`,
        message: `Step ${stepNumber}: ${step.name} - ${status}`,
      });
    }
  }

  private sendMessage(type: string, data: any) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    }
  }

  private sendError(message: string, error: any) {
    this.sendMessage("test_error", {
      message,
      error: error instanceof Error ? error.message : String(error),
      testId: this.testId,
    });
  }

  // Browser rendering operation methods (simplified versions)
  private async captureScreenshot(config: BrowserTestConfig): Promise<any> {
    const requestBody = {
      url: config.url,
      screenshotOptions: { fullPage: true, type: "png" },
      viewport: { width: 1920, height: 1080 },
    };

    if (config.withAuth && config.username && config.password) {
      (requestBody as any).authenticate = {
        username: config.username,
        password: config.password,
      };
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.BROWSER_RENDERING_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Screenshot capture failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  private async extractContent(config: BrowserTestConfig): Promise<any> {
    const requestBody = {
      url: config.url,
      rejectResourceTypes: ["image", "stylesheet"],
    };

    if (config.withAuth && config.username && config.password) {
      (requestBody as any).authenticate = {
        username: config.username,
        password: config.password,
      };
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/content`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.BROWSER_RENDERING_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Content extraction failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  private async extractMarkdown(config: BrowserTestConfig): Promise<any> {
    const requestBody = { url: config.url };

    if (config.withAuth && config.username && config.password) {
      (requestBody as any).authenticate = {
        username: config.username,
        password: config.password,
      };
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/markdown`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.BROWSER_RENDERING_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Markdown extraction failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  private async extractJson(config: BrowserTestConfig): Promise<any> {
    const schema = {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        headings: { type: "array", items: { type: "string" } },
        links: { type: "array", items: { type: "string" } },
      },
    };

    const requestBody = {
      url: config.url,
      prompt: "Extract key information from this webpage",
      response_format: { type: "json_schema", schema },
    };

    if (config.withAuth && config.username && config.password) {
      (requestBody as any).authenticate = {
        username: config.username,
        password: config.password,
      };
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/json`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.BROWSER_RENDERING_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `JSON extraction failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  private async extractLinks(config: BrowserTestConfig): Promise<any> {
    const requestBody = { url: config.url };

    if (config.withAuth && config.username && config.password) {
      (requestBody as any).authenticate = {
        username: config.username,
        password: config.password,
      };
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/links`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.BROWSER_RENDERING_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Link extraction failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  private async scrapeElements(config: BrowserTestConfig): Promise<any> {
    const selectors = [
      { selector: "h1, h2, h3" },
      { selector: "a[href]" },
      { selector: "img[src]" },
    ];

    const requestBody = { url: config.url, elements: selectors };

    if (config.withAuth && config.username && config.password) {
      (requestBody as any).authenticate = {
        username: config.username,
        password: config.password,
      };
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/scrape`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.BROWSER_RENDERING_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `Element scraping failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  private async generatePdf(config: BrowserTestConfig): Promise<any> {
    const requestBody = {
      url: config.url,
      pdfOptions: { format: "a4", printBackground: true },
    };

    if (config.withAuth && config.username && config.password) {
      (requestBody as any).authenticate = {
        username: config.username,
        password: config.password,
      };
    }

    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/pdf`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.env.BROWSER_RENDERING_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!response.ok) {
      throw new Error(
        `PDF generation failed: ${response.status} ${response.statusText}`
      );
    }

    return await response.json();
  }

  private async uploadAssetsToR2(
    renderingResults: Record<string, any>,
    testId: string
  ): Promise<{ keys: Record<string, string>; assets: Record<string, string> }> {
    // Simplified R2 upload - in real implementation, use the R2Storage class
    const keys: Record<string, string> = {};
    const assets: Record<string, string> = {};

    // This would be implemented with actual R2 upload logic
    for (const [operation, result] of Object.entries(renderingResults)) {
      if (result && result.success && result.result) {
        const filename = `test_results/${testId}/${operation}-${Date.now()}.${
          operation === "screenshot"
            ? "png"
            : operation === "pdf"
              ? "pdf"
              : "json"
        }`;
        keys[operation] = filename;
        assets[operation] = `https://your-r2-bucket.com/${filename}`;
      }
    }

    return { keys, assets };
  }

  private async updateD1Database(
    testId: string,
    config: BrowserTestConfig,
    r2Keys: Record<string, string>
  ): Promise<{ jobId?: string; snapshotId?: string }> {
    // Simplified D1 update - in real implementation, use the D1 utility functions
    return {
      jobId: `job-${testId}`,
      snapshotId: `snapshot-${testId}`,
    };
  }

  private async testBrowserRenderingConnection(): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${this.env.CLOUDFLARE_ACCOUNT_ID}/browser-rendering/screenshot`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.env.BROWSER_RENDERING_TOKEN}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            url: "https://example.com",
            screenshotOptions: { fullPage: true, type: "png" },
          }),
        }
      );

      return { success: response.ok };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private validateTestConfig(config: BrowserTestConfig): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

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
}

export async function handleBrowserTestWebSocket(
  request: Request,
  env: Env
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === "/api/browser-test/ws") {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected websocket", { status: 400 });
    }

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    if (server) {
      server.accept();
      new BrowserTestWebSocket(server, env);
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  return new Response("Not found", { status: 404 });
}
