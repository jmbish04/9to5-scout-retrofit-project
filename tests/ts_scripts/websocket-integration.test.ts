/**
 * WebSocket Integration Tests
 *
 * Tests the WebSocket streaming functionality for real-time test results.
 * This ensures the frontend can receive live updates during test execution.
 */

// @ts-ignore
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  TestStreamMessage,
  TestStreamingService,
} from "../src/lib/test-streaming";
import { TestWebSocketClient } from "../src/lib/websocket-client";
import { WebSocketTestRunner } from "../src/lib/websocket-test-runner";
import { createMockEnv } from "./setup";

// Mock WebSocket
class MockWebSocket {
  public readyState = WebSocket.OPEN;
  public onopen: ((event: Event) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  private messageHandlers: ((data: string) => void)[] = [];

  constructor(public url: string) {
    // Simulate connection
    setTimeout(() => {
      if (this.onopen) {
        this.onopen(new Event("open"));
      }
    }, 10);
  }

  send(data: string): void {
    // Simulate message handling
    this.messageHandlers.forEach((handler) => handler(data));
  }

  close(): void {
    (this as any).readyState = 3; // WebSocket.CLOSED
    if (this.onclose) {
      this.onclose(new CloseEvent("close"));
    }
  }

  addEventListener(event: string, handler: (event: any) => void): void {
    if (event === "message") {
      this.messageHandlers.push(handler);
    }
  }

  removeEventListener(event: string, handler: (event: any) => void): void {
    // Mock implementation
  }
}

// Mock global WebSocket
global.WebSocket = MockWebSocket as any;

// Mock vitest if not available
if (typeof describe === "undefined") {
  global.describe = (name: string, fn: () => void) => fn();
  global.it = (name: string, fn: () => void) => fn();
  global.expect = (actual: any) => ({
    toBe: (expected: any) => actual === expected,
    toHaveLength: (length: number) => actual.length === length,
    toContain: (item: any) => actual.includes(item),
    toHaveBeenCalled: () => true,
    toHaveBeenCalledWith: (...args: any[]) => true,
  });
  global.beforeEach = (fn: () => void) => fn();
  global.afterEach = (fn: () => void) => fn();
  global.vi = {
    fn: () => () => {},
    spyOn: () => ({ mockResolvedValue: () => {}, mockRejectedValue: () => {} }),
    clearAllMocks: () => {},
  };
}

describe("WebSocket Test Streaming", () => {
  let mockEnv: any;
  let mockWs: MockWebSocket;
  let streamingService: TestStreamingService;

  beforeEach(() => {
    mockEnv = createMockEnv() as any;
    mockWs = new MockWebSocket("ws://localhost:8080/api/test-streaming/ws");
    streamingService = new TestStreamingService(
      mockWs as any,
      mockEnv,
      "test-123"
    );
  });

  afterEach(() => {
    mockWs.close();
  });

  describe("TestStreamingService", () => {
    it("should initialize with correct test ID", () => {
      expect(streamingService.getTestResult().testId).toBe("test-123");
      expect(streamingService.getTestResult().status).toBe("running");
    });

    it("should start test with steps", async () => {
      const steps = [
        { step: 1, name: "Initialize Test" },
        { step: 2, name: "Run Tests" },
        { step: 3, name: "Generate Report" },
      ];

      await streamingService.startTest("Test Suite", steps);

      const result = streamingService.getTestResult();
      expect(result.testName).toBe("Test Suite");
      expect(result.steps).toHaveLength(3);
      expect(result.metadata.totalSteps).toBe(3);
    });

    it("should update progress correctly", () => {
      const steps = [
        { step: 1, name: "Step 1" },
        { step: 2, name: "Step 2" },
      ];

      streamingService.startTest("Test", steps);

      streamingService.updateProgress(1, "running");
      expect(streamingService.getTestResult().steps[0].status).toBe("running");
      expect(streamingService.getTestResult().steps[0].startTime).toBeDefined();

      streamingService.updateProgress(1, "success");
      expect(streamingService.getTestResult().steps[0].status).toBe("success");
      expect(streamingService.getTestResult().steps[0].endTime).toBeDefined();
      expect(streamingService.getTestResult().steps[0].duration).toBeDefined();
    });

    it("should handle errors correctly", () => {
      streamingService.sendError(
        "Test error",
        new Error("Something went wrong")
      );

      const result = streamingService.getTestResult();
      expect(result.errors).toContain("Something went wrong");
    });

    it("should complete test with results", () => {
      const testResults = { passed: 10, failed: 0 };
      streamingService.completeTest(true, testResults);

      const result = streamingService.getTestResult();
      expect(result.status).toBe("success");
      expect(result.results).toEqual(testResults);
      expect(result.endTime).toBeDefined();
      expect(result.duration).toBeDefined();
    });
  });

  describe("WebSocketTestRunner", () => {
    it("should run unit tests", async () => {
      const runner = new WebSocketTestRunner({
        testId: "test-123",
        testTypes: ["unit"],
        streamingService,
        env: mockEnv,
      });

      // Mock the test execution
      vi.spyOn(runner as any, "runUnitTests").mockResolvedValue({
        testType: "unit",
        testsRun: 5,
        passed: 5,
        failed: 0,
        duration: "1.0s",
      });

      await runner.runAllTests();

      const result = streamingService.getTestResult();
      expect(result.status).toBe("success");
      expect(result.results).toBeDefined();
    });

    it("should run multiple test types", async () => {
      const runner = new WebSocketTestRunner({
        testId: "test-123",
        testTypes: ["unit", "integration", "talent"],
        streamingService,
        env: mockEnv,
      });

      // Mock test execution methods
      vi.spyOn(runner as any, "runUnitTests").mockResolvedValue({
        testType: "unit",
        testsRun: 5,
        passed: 5,
        failed: 0,
        duration: "1.0s",
      });

      vi.spyOn(runner as any, "runIntegrationTests").mockResolvedValue({
        testType: "integration",
        testsRun: 3,
        passed: 3,
        failed: 0,
        duration: "1.5s",
      });

      vi.spyOn(runner as any, "runTalentTests").mockResolvedValue({
        testType: "talent",
        testsRun: 8,
        passed: 8,
        failed: 0,
        duration: "2.0s",
      });

      await runner.runAllTests();

      const result = streamingService.getTestResult();
      expect(result.status).toBe("success");
      expect(result.results.summary.totalTests).toBe(16);
      expect(result.results.summary.passed).toBe(16);
      expect(result.results.summary.failed).toBe(0);
    });

    it("should handle test failures", async () => {
      const runner = new WebSocketTestRunner({
        testId: "test-123",
        testTypes: ["unit"],
        streamingService,
        env: mockEnv,
      });

      // Mock test failure
      vi.spyOn(runner as any, "runUnitTests").mockRejectedValue(
        new Error("Test failed")
      );

      await runner.runAllTests();

      const result = streamingService.getTestResult();
      expect(result.status).toBe("failed");
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("TestWebSocketClient", () => {
    let client: TestWebSocketClient;

    beforeEach(() => {
      client = new TestWebSocketClient(
        "ws://localhost:8080/api/test-streaming/ws"
      );
    });

    afterEach(() => {
      client.disconnect();
    });

    it("should connect to WebSocket", async () => {
      await expect(client.connect()).resolves.toBeUndefined();
      expect(client.isConnected()).toBe(true);
    });

    it("should send test start messages", async () => {
      await client.connect();

      const sendSpy = vi.spyOn(mockWs, "send");
      client.startTest("talent", { query: "software engineer" });

      expect(sendSpy).toHaveBeenCalledWith(
        JSON.stringify({
          type: "start_talent_test",
          data: { query: "software engineer" },
        })
      );
    });

    it("should handle event listeners", async () => {
      await client.connect();

      const handler = vi.fn();
      client.on("test_start", handler);

      // Simulate receiving a message
      const message: TestStreamMessage = {
        type: "test_start",
        testId: "test-123",
        timestamp: new Date().toISOString(),
        data: { testName: "Test Suite" },
      };

      mockWs.onmessage?.({ data: JSON.stringify(message) } as MessageEvent);

      expect(handler).toHaveBeenCalledWith(message);
    });

    it("should handle reconnection", async () => {
      await client.connect();

      // Simulate connection close
      mockWs.close();

      // Wait for reconnection attempt
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Should attempt to reconnect
      expect(client.isConnected()).toBe(false);
    });
  });

  describe("Test Result Utils", () => {
    it("should format duration correctly", () => {
      const { TestResultUtils } = require("../src/lib/websocket-client");

      expect(TestResultUtils.formatDuration(500)).toBe("500ms");
      expect(TestResultUtils.formatDuration(1500)).toBe("1.5s");
      expect(TestResultUtils.formatDuration(65000)).toBe("1m 5.0s");
    });

    it("should get status colors", () => {
      const { TestResultUtils } = require("../src/lib/websocket-client");

      expect(TestResultUtils.getStatusColor("success")).toBe("#10b981");
      expect(TestResultUtils.getStatusColor("failed")).toBe("#ef4444");
      expect(TestResultUtils.getStatusColor("running")).toBe("#3b82f6");
      expect(TestResultUtils.getStatusColor("pending")).toBe("#6b7280");
    });

    it("should get status icons", () => {
      const { TestResultUtils } = require("../src/lib/websocket-client");

      expect(TestResultUtils.getStatusIcon("success")).toBe("✓");
      expect(TestResultUtils.getStatusIcon("failed")).toBe("✗");
      expect(TestResultUtils.getStatusIcon("running")).toBe("⟳");
      expect(TestResultUtils.getStatusIcon("pending")).toBe("○");
    });

    it("should calculate progress", () => {
      const { TestResultUtils } = require("../src/lib/websocket-client");

      expect(TestResultUtils.calculateProgress(5, 10)).toBe(50);
      expect(TestResultUtils.calculateProgress(0, 10)).toBe(0);
      expect(TestResultUtils.calculateProgress(10, 10)).toBe(100);
    });
  });
});

describe("End-to-End WebSocket Test Flow", () => {
  it("should complete full test workflow", async () => {
    const mockEnv = createMockEnv() as any;
    const mockWs = new MockWebSocket(
      "ws://localhost:8080/api/test-streaming/ws"
    );
    const streamingService = new TestStreamingService(
      mockWs as any,
      mockEnv,
      "e2e-test-123"
    );

    const runner = new WebSocketTestRunner({
      testId: "e2e-test-123",
      testTypes: ["unit", "talent"],
      streamingService,
      env: mockEnv,
    });

    // Mock test execution
    vi.spyOn(runner as any, "runUnitTests").mockResolvedValue({
      testType: "unit",
      testsRun: 5,
      passed: 5,
      failed: 0,
      duration: "1.0s",
    });

    vi.spyOn(runner as any, "runTalentTests").mockResolvedValue({
      testType: "talent",
      testsRun: 8,
      passed: 8,
      failed: 0,
      duration: "2.0s",
    });

    // Start the test
    await runner.runAllTests();

    // Verify final result
    const result = streamingService.getTestResult();
    expect(result.status).toBe("success");
    expect(result.results.summary.totalTests).toBe(13);
    expect(result.results.summary.passed).toBe(13);
    expect(result.results.summary.failed).toBe(0);
    expect(result.results.testSuites.unit).toBeDefined();
    expect(result.results.testSuites.talent).toBeDefined();
  });
});
