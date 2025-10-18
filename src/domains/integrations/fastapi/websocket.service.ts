/**
 * @fileoverview FastAPI WebSocket Service
 *
 * Handles WebSocket connections for real-time communication with the FastAPI service.
 * Manages bidirectional communication for job updates and status changes.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import type { Env } from "../../config/env/env.config";

/**
 * Environment interface for WebSocket Service
 */
export interface WebSocketServiceEnv extends Env {
  DB: D1Database;
}

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: "job_update" | "status_change" | "error" | "ping" | "pong";
  data?: any;
  timestamp: string;
}

/**
 * Job update message
 */
export interface JobUpdateMessage extends WebSocketMessage {
  type: "job_update";
  data: {
    job_id: string;
    status: "pending" | "processing" | "completed" | "failed";
    progress?: number;
    message?: string;
  };
}

/**
 * Status change message
 */
export interface StatusChangeMessage extends WebSocketMessage {
  type: "status_change";
  data: {
    job_id: string;
    old_status: string;
    new_status: string;
    timestamp: string;
  };
}

/**
 * Error message
 */
export interface ErrorMessage extends WebSocketMessage {
  type: "error";
  data: {
    error: string;
    job_id?: string;
    details?: any;
  };
}

/**
 * FastAPI WebSocket Service
 *
 * Manages WebSocket connections for real-time communication
 * with the FastAPI scraper service.
 */
export class WebSocketService {
  private env: WebSocketServiceEnv;
  private connections: Map<string, WebSocket> = new Map();

  constructor(env: WebSocketServiceEnv) {
    this.env = env;
  }

  /**
   * Handles WebSocket upgrade request
   *
   * @param request - The incoming request
   * @returns Response with WebSocket upgrade or error
   */
  async handleWebSocketUpgrade(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const client = url.searchParams.get("client");

      if (client !== "python") {
        return new Response("Invalid client type. Expected 'python'", {
          status: 400,
        });
      }

      // Create WebSocket pair
      const webSocketPair = new WebSocketPair();
      const [clientSocket, serverSocket] = Object.values(webSocketPair);

      // Accept the WebSocket connection
      serverSocket.accept();

      // Generate connection ID
      const connectionId = crypto.randomUUID();
      this.connections.set(connectionId, serverSocket);

      // Set up message handlers
      serverSocket.addEventListener("message", (event) => {
        this.handleMessage(connectionId, event.data);
      });

      serverSocket.addEventListener("close", () => {
        this.handleClose(connectionId);
      });

      serverSocket.addEventListener("error", (event) => {
        this.handleError(connectionId, event);
      });

      // Send welcome message
      this.sendMessage(connectionId, {
        type: "pong",
        data: {
          message: "WebSocket connection established",
          connection_id: connectionId,
        },
        timestamp: new Date().toISOString(),
      });

      return new Response(null, {
        status: 101,
        webSocket: clientSocket,
      });
    } catch (error) {
      console.error("Error handling WebSocket upgrade:", error);
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
  }

  /**
   * Handles incoming WebSocket messages
   *
   * @param connectionId - ID of the connection
   * @param data - Message data
   */
  private async handleMessage(
    connectionId: string,
    data: string | ArrayBuffer
  ): Promise<void> {
    try {
      const message = JSON.parse(data as string) as WebSocketMessage;

      switch (message.type) {
        case "ping":
          this.sendMessage(connectionId, {
            type: "pong",
            data: { message: "pong" },
            timestamp: new Date().toISOString(),
          });
          break;

        case "job_update":
          await this.handleJobUpdate(connectionId, message as JobUpdateMessage);
          break;

        case "status_change":
          await this.handleStatusChange(
            connectionId,
            message as StatusChangeMessage
          );
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      this.sendError(connectionId, "Invalid message format", error);
    }
  }

  /**
   * Handles job update messages
   *
   * @param connectionId - ID of the connection
   * @param message - Job update message
   */
  private async handleJobUpdate(
    connectionId: string,
    message: JobUpdateMessage
  ): Promise<void> {
    try {
      const { job_id, status, progress, message: jobMessage } = message.data;

      // Update job status in database
      await this.env.DB.prepare(
        `
        UPDATE scrape_queue 
        SET status = ?, updated_at = ?, error_message = ?
        WHERE id = ?
      `
      )
        .bind(status, new Date().toISOString(), jobMessage || null, job_id)
        .run();

      // Broadcast update to all connected clients
      this.broadcastMessage({
        type: "job_update",
        data: { job_id, status, progress, message: jobMessage },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error handling job update:", error);
      this.sendError(connectionId, "Failed to update job", error);
    }
  }

  /**
   * Handles status change messages
   *
   * @param connectionId - ID of the connection
   * @param message - Status change message
   */
  private async handleStatusChange(
    connectionId: string,
    message: StatusChangeMessage
  ): Promise<void> {
    try {
      const { job_id, old_status, new_status } = message.data;

      // Log status change
      console.log(
        `Job ${job_id} status changed from ${old_status} to ${new_status}`
      );

      // Broadcast status change to all connected clients
      this.broadcastMessage({
        type: "status_change",
        data: {
          job_id,
          old_status,
          new_status,
          timestamp: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error handling status change:", error);
      this.sendError(connectionId, "Failed to handle status change", error);
    }
  }

  /**
   * Handles WebSocket connection close
   *
   * @param connectionId - ID of the connection
   */
  private handleClose(connectionId: string): void {
    console.log(`WebSocket connection ${connectionId} closed`);
    this.connections.delete(connectionId);
  }

  /**
   * Handles WebSocket errors
   *
   * @param connectionId - ID of the connection
   * @param event - Error event
   */
  private handleError(connectionId: string, event: Event): void {
    console.error(`WebSocket error for connection ${connectionId}:`, event);
    this.connections.delete(connectionId);
  }

  /**
   * Sends a message to a specific connection
   *
   * @param connectionId - ID of the connection
   * @param message - Message to send
   */
  private sendMessage(connectionId: string, message: WebSocketMessage): void {
    const connection = this.connections.get(connectionId);
    if (connection && connection.readyState === WebSocket.OPEN) {
      connection.send(JSON.stringify(message));
    }
  }

  /**
   * Sends an error message to a specific connection
   *
   * @param connectionId - ID of the connection
   * @param error - Error message
   * @param details - Error details
   */
  private sendError(connectionId: string, error: string, details?: any): void {
    this.sendMessage(connectionId, {
      type: "error",
      data: { error, details },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Broadcasts a message to all connected clients
   *
   * @param message - Message to broadcast
   */
  private broadcastMessage(message: WebSocketMessage): void {
    for (const [connectionId, connection] of this.connections) {
      if (connection.readyState === WebSocket.OPEN) {
        connection.send(JSON.stringify(message));
      } else {
        // Remove closed connections
        this.connections.delete(connectionId);
      }
    }
  }

  /**
   * Gets the number of active connections
   *
   * @returns Number of active connections
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Gets connection statistics
   *
   * @returns Connection statistics
   */
  getConnectionStats(): { total: number; active: number } {
    const total = this.connections.size;
    let active = 0;

    for (const connection of this.connections.values()) {
      if (connection.readyState === WebSocket.OPEN) {
        active++;
      }
    }

    return { total, active };
  }
}

/**
 * Factory function to create a WebSocket service instance
 *
 * @param env - Environment object containing D1 database
 * @returns WebSocketService instance
 */
export function createWebSocketService(
  env: WebSocketServiceEnv
): WebSocketService {
  return new WebSocketService(env);
}
