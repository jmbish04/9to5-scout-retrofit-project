/**
 * WebSocket Client for Test Results
 *
 * Frontend client for receiving real-time test results via WebSocket.
 * This provides a clean interface for the frontend to connect and receive updates.
 */
export class TestWebSocketClient {
    url;
    ws = null;
    eventHandlers = new Map();
    reconnectAttempts = 0;
    maxReconnectAttempts = 5;
    reconnectDelay = 1000;
    constructor(url) {
        this.url = url;
    }
    /**
     * Connect to the test streaming WebSocket
     */
    connect() {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                this.ws.addEventListener("open", () => {
                    console.log("Connected to test streaming WebSocket");
                    this.reconnectAttempts = 0;
                    resolve();
                });
                this.ws.addEventListener("message", (event) => {
                    try {
                        const message = JSON.parse(event.data);
                        this.handleMessage(message);
                    }
                    catch (error) {
                        console.error("Failed to parse WebSocket message:", error);
                    }
                });
                this.ws.addEventListener("close", (event) => {
                    console.log("WebSocket connection closed:", event.code, event.reason);
                    this.handleReconnect();
                });
                this.ws.addEventListener("error", (error) => {
                    console.error("WebSocket error:", error);
                    reject(error);
                });
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Disconnect from the WebSocket
     */
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
    /**
     * Send a message to start a test
     */
    startTest(testType, config) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: `start_${testType}_test`,
                data: config,
            }));
        }
        else {
            console.error("WebSocket is not connected");
        }
    }
    /**
     * Add an event handler for specific message types
     */
    on(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType).push(handler);
    }
    /**
     * Remove an event handler
     */
    off(eventType, handler) {
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
    handleMessage(message) {
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
    handleReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                this.connect().catch((error) => {
                    console.error("Reconnection failed:", error);
                });
            }, this.reconnectDelay * this.reconnectAttempts);
        }
        else {
            console.error("Max reconnection attempts reached");
        }
    }
    /**
     * Check if WebSocket is connected
     */
    isConnected() {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}
/**
 * React hook for test WebSocket client
 */
export function useTestWebSocket(url) {
    const client = new TestWebSocketClient(url);
    return {
        connect: () => client.connect(),
        disconnect: () => client.disconnect(),
        startTest: (testType, config) => client.startTest(testType, config),
        on: (eventType, handler) => client.on(eventType, handler),
        off: (eventType, handler) => client.off(eventType, handler),
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
    static formatDuration(duration) {
        if (duration < 1000) {
            return `${duration}ms`;
        }
        else if (duration < 60000) {
            return `${(duration / 1000).toFixed(1)}s`;
        }
        else {
            const minutes = Math.floor(duration / 60000);
            const seconds = ((duration % 60000) / 1000).toFixed(1);
            return `${minutes}m ${seconds}s`;
        }
    }
    /**
     * Get status color for UI
     */
    static getStatusColor(status) {
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
    static getStatusIcon(status) {
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
    static calculateProgress(completedSteps, totalSteps) {
        if (totalSteps === 0)
            return 0;
        return Math.round((completedSteps / totalSteps) * 100);
    }
    /**
     * Format test results for display
     */
    static formatTestResults(result) {
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
