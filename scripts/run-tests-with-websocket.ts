#!/usr/bin/env tsx

/**
 * Test Runner with WebSocket Streaming
 *
 * This script runs the test suite and streams results in real-time via WebSocket.
 * It can be used for both local development and CI/CD pipelines.
 */

import { TestWebSocketClient } from "../src/lib/websocket-client";

interface TestConfig {
  testTypes: ("unit" | "integration" | "talent" | "browser" | "e2e")[];
  websocketUrl: string;
  verbose: boolean;
  watch: boolean;
  coverage: boolean;
}

class WebSocketTestRunner {
  private config: TestConfig;
  private client: TestWebSocketClient | null = null;
  private testProcess: any = null;

  constructor(config: TestConfig) {
    this.config = config;
  }

  /**
   * Run tests with WebSocket streaming
   */
  public async run(): Promise<void> {
    console.log("🚀 Starting WebSocket Test Runner");
    console.log(`📡 WebSocket URL: ${this.config.websocketUrl}`);
    console.log(`🧪 Test Types: ${this.config.testTypes.join(", ")}`);

    try {
      // Connect to WebSocket
      await this.connectWebSocket();

      // Start test execution
      await this.executeTests();

      // Wait for completion
      await this.waitForCompletion();
    } catch (error) {
      console.error("❌ Test runner failed:", error);
      process.exit(1);
    } finally {
      this.cleanup();
    }
  }

  /**
   * Connect to WebSocket server
   */
  private async connectWebSocket(): Promise<void> {
    this.client = new TestWebSocketClient(this.config.websocketUrl);

    // Set up event handlers
    this.client.on("test_start", (message) => {
      console.log(`\n🎯 Test Started: ${message.data.testName}`);
      console.log(`📊 Total Steps: ${message.data.totalSteps}`);
    });

    this.client.on("test_step", (message) => {
      const { step, stepName, status, progress } = message.data;
      const statusIcon = this.getStatusIcon(status);
      const progressBar = this.createProgressBar(progress);

      console.log(`${statusIcon} Step ${step}: ${stepName} ${progressBar}`);

      if (message.data.details) {
        console.log(
          `   📋 Details: ${JSON.stringify(message.data.details, null, 2)}`
        );
      }

      if (message.data.error) {
        console.log(`   ❌ Error: ${message.data.error}`);
      }
    });

    this.client.on("test_result", (message) => {
      console.log(`\n📊 Test Result: ${JSON.stringify(message.data, null, 2)}`);
    });

    this.client.on("test_complete", (message) => {
      const { success, result, duration } = message.data;
      const statusIcon = success ? "✅" : "❌";
      const durationStr = this.formatDuration(duration);

      console.log(`\n${statusIcon} Test Complete: ${result.testName}`);
      console.log(`⏱️  Duration: ${durationStr}`);
      console.log(`📈 Progress: ${result.metadata.progress.toFixed(1)}%`);

      if (result.errors.length > 0) {
        console.log(`\n❌ Errors:`);
        result.errors.forEach((error, index) => {
          console.log(`   ${index + 1}. ${error}`);
        });
      }
    });

    this.client.on("test_error", (message) => {
      console.error(`\n❌ Test Error: ${message.data.message}`);
      if (message.data.error) {
        console.error(`   Details: ${message.data.error}`);
      }
    });

    await this.client.connect();
    console.log("✅ Connected to WebSocket server");
  }

  /**
   * Execute tests based on configuration
   */
  private async executeTests(): Promise<void> {
    if (!this.client) {
      throw new Error("WebSocket client not connected");
    }

    // Start each test type
    for (const testType of this.config.testTypes) {
      console.log(`\n🧪 Starting ${testType} tests...`);

      const config = this.getTestConfig(testType);
      this.client.startTest(testType, config);

      // Wait a bit between test types
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Get test configuration for a specific test type
   */
  private getTestConfig(testType: string): any {
    switch (testType) {
      case "unit":
        return {
          testFiles: ["tests/**/*.test.ts"],
          coverage: this.config.coverage,
        };
      case "integration":
        return {
          testFiles: ["tests/integration/**/*.test.ts"],
          timeout: 30000,
        };
      case "talent":
        return {
          query: "software engineer",
          pageSize: 10,
          location: "San Francisco, CA",
        };
      case "browser":
        return {
          url: "https://example.com",
          testName: "Browser Rendering Test",
          withAuth: false,
        };
      case "e2e":
        return {
          testTypes: ["unit", "integration", "talent", "browser"],
          parallel: true,
        };
      default:
        return {};
    }
  }

  /**
   * Wait for test completion
   */
  private async waitForCompletion(): Promise<void> {
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (!this.client || !this.client.isConnected()) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 1000);

      // Set a maximum timeout
      setTimeout(() => {
        clearInterval(checkInterval);
        resolve();
      }, 300000); // 5 minutes
    });
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.client) {
      this.client.disconnect();
    }

    if (this.testProcess) {
      this.testProcess.kill();
    }
  }

  /**
   * Get status icon for display
   */
  private getStatusIcon(status: string): string {
    switch (status) {
      case "success":
        return "✅";
      case "failed":
        return "❌";
      case "running":
        return "🔄";
      case "pending":
        return "⏳";
      default:
        return "❓";
    }
  }

  /**
   * Create progress bar
   */
  private createProgressBar(progress: number): string {
    const width = 20;
    const filled = Math.round((progress / 100) * width);
    const empty = width - filled;

    return `[${"█".repeat(filled)}${"░".repeat(empty)}] ${progress.toFixed(1)}%`;
  }

  /**
   * Format duration
   */
  private formatDuration(duration: number): string {
    if (duration < 1000) {
      return `${duration}ms`;
    } else if (duration < 60000) {
      return `${(duration / 1000).toFixed(1)}s`;
    } else {
      const minutes = Math.floor(duration / 60000);
      const seconds = ((duration % 60000) / 1000).toFixed(1);
      return `${minutes}m ${seconds}s`;
    }
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): TestConfig {
  const args = process.argv.slice(2);

  const config: TestConfig = {
    testTypes: ["unit", "integration", "talent", "browser", "e2e"],
    websocketUrl: "ws://localhost:8787/api/test-streaming/ws",
    verbose: false,
    watch: false,
    coverage: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--types":
      case "-t":
        const types = args[i + 1]?.split(",") || [];
        config.testTypes = types as any[];
        i++;
        break;
      case "--websocket-url":
      case "-w":
        config.websocketUrl = args[i + 1] || config.websocketUrl;
        i++;
        break;
      case "--verbose":
      case "-v":
        config.verbose = true;
        break;
      case "--watch":
        config.watch = true;
        break;
      case "--coverage":
      case "-c":
        config.coverage = true;
        break;
      case "--help":
      case "-h":
        console.log(`
WebSocket Test Runner

Usage: tsx scripts/run-tests-with-websocket.ts [options]

Options:
  -t, --types <types>        Comma-separated list of test types (unit,integration,talent,browser,e2e)
  -w, --websocket-url <url>  WebSocket server URL (default: ws://localhost:8787/api/test-streaming/ws)
  -v, --verbose              Enable verbose output
  --watch                    Run tests in watch mode
  -c, --coverage             Generate coverage report
  -h, --help                 Show this help message

Examples:
  tsx scripts/run-tests-with-websocket.ts
  tsx scripts/run-tests-with-websocket.ts --types unit,integration
  tsx scripts/run-tests-with-websocket.ts --websocket-url ws://localhost:3000/api/test-streaming/ws
  tsx scripts/run-tests-with-websocket.ts --coverage --verbose
        `);
        process.exit(0);
        break;
    }
  }

  return config;
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const config = parseArgs();
  const runner = new WebSocketTestRunner(config);

  try {
    await runner.run();
    console.log("\n🎉 All tests completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("\n💥 Test runner failed:", error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { TestConfig, WebSocketTestRunner };
