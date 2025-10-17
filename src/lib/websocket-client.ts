/**
 * WebSocket Client for Test Results
 *
 * Frontend client for receiving real-time test results via WebSocket.
 * This provides a clean interface for the frontend to connect and receive updates.
 */

export interface TestResult {
  testId: string;
  testName: string;
  status: "running" | "success" | "failed";
  startTime: string;
  endTime?: string;
  duration?: number;
  steps: TestStep[];
  results?: any;
  errors: string[];
  metadata: {
    totalSteps: number;
    completedSteps: number;
    progress: number;
  };
}

export interface TestStep {
  step: number;
  name: string;
  status: "pending" | "running" | "success" | "failed";
  startTime?: string;
  endTime?: string;
  duration?: number;
  details?: any;
  error?: string;
}

export interface TestStreamMessage {
  type:
    | "test_start"
    | "test_progress"
    | "test_step"
    | "test_result"
    | "test_error"
    | "test_complete";
  testId: string;
  timestamp: string;
  data: any;
}

export type TestEventHandler = (event: TestStreamMessage) => void;

export class TestWebSocketClient {
  private ws: WebSocket | null = null;
  private eventHandlers: Map<string, TestEventHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private url: string) {}

  /**
   * Connect to the test streaming WebSocket
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.addEventListener("open", () => {
          console.log("Connected to test streaming WebSocket");
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.addEventListener("message", (event: MessageEvent) => {
          try {
            const message: TestStreamMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        });

        this.ws.addEventListener("close", (event: CloseEvent) => {
          console.log("WebSocket connection closed:", event.code, event.reason);
          this.handleReconnect();
        });

        this.ws.addEventListener("error", (error: Event) => {
          console.error("WebSocket error:", error);
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the WebSocket
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send a message to start a test
   */
  public startTest(testType: string, config: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: `start_${testType}_test`,
          data: config,
        })
      );
    } else {
      console.error("WebSocket is not connected");
    }
  }

  /**
   * Add an event handler for specific message types
   */
  public on(eventType: string, handler: TestEventHandler): void {
    if (!this.eventHandlers.has(eventType)) {
      this.eventHandlers.set(eventType, []);
    }
    this.eventHandlers.get(eventType)!.push(handler);
  }

  /**
   * Remove an event handler
   */
  public off(eventType: string, handler: TestEventHandler): void {
    const handlers = this.eventHandlers.get(eventType);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: TestStreamMessage): void {
    // Emit to specific event type handlers
    const handlers = this.eventHandlers.get(message.type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }

    // Emit to all handlers
    const allHandlers = this.eventHandlers.get("*");
    if (allHandlers) {
      allHandlers.forEach((handler) => handler(message));
    }
  }

  /**
   * Handle reconnection logic
   */
  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(
        `Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`
      );

      setTimeout(() => {
        this.connect().catch((error) => {
          console.error("Reconnection failed:", error);
        });
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error("Max reconnection attempts reached");
    }
  }

  /**
   * Check if WebSocket is connected
   */
  public isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

/**
 * React hook for test WebSocket client
 */
export function useTestWebSocket(url: string) {
  const client = new TestWebSocketClient(url);

  return {
    connect: () => client.connect(),
    disconnect: () => client.disconnect(),
    startTest: (testType: string, config: any) =>
      client.startTest(testType, config),
    on: (eventType: string, handler: TestEventHandler) =>
      client.on(eventType, handler),
    off: (eventType: string, handler: TestEventHandler) =>
      client.off(eventType, handler),
    isConnected: () => client.isConnected(),
  };
}

/**
 * Utility functions for test result display
 */
export class TestResultUtils {
  /**
   * Format test duration
   */
  static formatDuration(duration: number): string {
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

  /**
   * Get status color for UI
   */
  static getStatusColor(status: string): string {
    switch (status) {
      case "success":
        return "#10b981"; // green
      case "failed":
        return "#ef4444"; // red
      case "running":
        return "#3b82f6"; // blue
      case "pending":
        return "#6b7280"; // gray
      default:
        return "#6b7280";
    }
  }

  /**
   * Get status icon for UI
   */
  static getStatusIcon(status: string): string {
    switch (status) {
      case "success":
        return "✓";
      case "failed":
        return "✗";
      case "running":
        return "⟳";
      case "pending":
        return "○";
      default:
        return "?";
    }
  }

  /**
   * Calculate progress percentage
   */
  static calculateProgress(completedSteps: number, totalSteps: number): number {
    if (totalSteps === 0) return 0;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  /**
   * Format test results for display
   */
  static formatTestResults(result: TestResult): {
    summary: string;
    details: string[];
    errors: string[];
  } {
    const summary = `${result.testName} - ${result.status.toUpperCase()}`;
    const details = [
      `Duration: ${result.duration ? this.formatDuration(result.duration) : "N/A"}`,
      `Steps: ${result.metadata.completedSteps}/${result.metadata.totalSteps}`,
      `Progress: ${result.metadata.progress.toFixed(1)}%`,
    ];

    return {
      summary,
      details,
      errors: result.errors,
    };
  }
}
