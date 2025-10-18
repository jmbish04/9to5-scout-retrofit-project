/**
 * @fileoverview WebSocket Integration Service
 *
 * Provides WebSocket communication functionality for real-time scraping
 * and job processing. Handles WebSocket connections, message routing,
 * and connection management.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * WebSocket service environment interface
 */
export interface WebSocketServiceEnv {
  DB: D1Database;
  SCRAPE_QUEUE: Queue;
  USAGE_TRACKER: KVNamespace;
}

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  | "scrape_request"
  | "scrape_response"
  | "job_processing_request"
  | "job_processing_response"
  | "status_update"
  | "error"
  | "ping"
  | "pong";

/**
 * WebSocket message interface
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  id: string;
  timestamp: string;
  data: any;
  metadata?: {
    user_id?: string;
    session_id?: string;
    priority?: "low" | "normal" | "high" | "urgent";
  };
}

/**
 * Scrape request message data
 */
export interface ScrapeRequestData {
  urls: string[];
  options?: {
    wait_for?: number;
    timeout?: number;
    screenshot?: boolean;
    pdf?: boolean;
    extract_text?: boolean;
  };
}

/**
 * Scrape response message data
 */
export interface ScrapeResponseData {
  request_id: string;
  results: Array<{
    url: string;
    success: boolean;
    data?: any;
    error?: string;
    screenshot_url?: string;
    pdf_url?: string;
    extracted_text?: string;
  }>;
}

/**
 * Job processing request data
 */
export interface JobProcessingRequestData {
  job_urls: string[];
  options?: {
    extract_details?: boolean;
    generate_embeddings?: boolean;
    store_in_database?: boolean;
  };
}

/**
 * Job processing response data
 */
export interface JobProcessingResponseData {
  request_id: string;
  results: Array<{
    url: string;
    success: boolean;
    job_data?: any;
    error?: string;
  }>;
}

/**
 * Status update message data
 */
export interface StatusUpdateData {
  status: "idle" | "processing" | "error" | "maintenance";
  message?: string;
  progress?: number;
  current_task?: string;
}

/**
 * WebSocket connection interface
 */
export interface WebSocketConnection {
  id: string;
  socket: WebSocket;
  user_id?: string;
  session_id?: string;
  connected_at: string;
  last_activity: string;
  message_count: number;
}

/**
 * WebSocket Service Class
 *
 * Provides WebSocket communication functionality for real-time scraping
 * and job processing. Handles WebSocket connections, message routing,
 * and connection management.
 */
export class WebSocketService {
  private env: WebSocketServiceEnv;
  private connections: Map<string, WebSocketConnection> = new Map();

  constructor(env: WebSocketServiceEnv) {
    this.env = env;
  }

  /**
   * Handle WebSocket connection upgrade
   * @param request HTTP request
   * @returns WebSocket response
   */
  async handleWebSocketUpgrade(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const userId = url.searchParams.get("user_id");
      const sessionId = url.searchParams.get("session_id");

      // Create WebSocket pair
      const webSocketPair = new WebSocketPair();
      const [client, server] = Object.values(webSocketPair);

      // Accept WebSocket connection
      server.accept();

      // Create connection object
      const connectionId = crypto.randomUUID();
      const connection: WebSocketConnection = {
        id: connectionId,
        socket: server,
        user_id: userId || undefined,
        session_id: sessionId || undefined,
        connected_at: new Date().toISOString(),
        last_activity: new Date().toISOString(),
        message_count: 0,
      };

      // Store connection
      this.connections.set(connectionId, connection);

      // Set up message handler
      server.addEventListener("message", (event) => {
        this.handleMessage(connectionId, event.data);
      });

      // Set up close handler
      server.addEventListener("close", () => {
        this.handleConnectionClose(connectionId);
      });

      // Set up error handler
      server.addEventListener("error", (error) => {
        this.handleConnectionError(connectionId, error);
      });

      // Send welcome message
      this.sendMessage(connectionId, {
        type: "status_update",
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          status: "idle",
          message: "Connected successfully",
        },
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    } catch (error) {
      console.error("Error handling WebSocket upgrade:", error);
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
  }

  /**
   * Handle incoming WebSocket message
   * @param connectionId Connection ID
   * @param data Message data
   */
  private async handleMessage(
    connectionId: string,
    data: string | ArrayBuffer
  ): Promise<void> {
    try {
      const connection = this.connections.get(connectionId);
      if (!connection) {
        console.error("Connection not found:", connectionId);
        return;
      }

      // Update last activity
      connection.last_activity = new Date().toISOString();
      connection.message_count += 1;

      // Parse message
      const message: WebSocketMessage = JSON.parse(data.toString());

      // Handle different message types
      switch (message.type) {
        case "ping":
          this.handlePing(connectionId, message);
          break;
        case "scrape_request":
          await this.handleScrapeRequest(connectionId, message);
          break;
        case "job_processing_request":
          await this.handleJobProcessingRequest(connectionId, message);
          break;
        default:
          this.sendError(connectionId, `Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error("Error handling WebSocket message:", error);
      this.sendError(connectionId, "Failed to process message");
    }
  }

  /**
   * Handle ping message
   * @param connectionId Connection ID
   * @param message Ping message
   */
  private handlePing(connectionId: string, message: WebSocketMessage): void {
    this.sendMessage(connectionId, {
      type: "pong",
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data: { original_id: message.id },
    });
  }

  /**
   * Handle scrape request
   * @param connectionId Connection ID
   * @param message Scrape request message
   */
  private async handleScrapeRequest(
    connectionId: string,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const data = message.data as ScrapeRequestData;
      const requestId = crypto.randomUUID();

      // Send acknowledgment
      this.sendMessage(connectionId, {
        type: "status_update",
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          status: "processing",
          message: `Processing ${data.urls.length} URLs`,
          current_task: "scrape_request",
        },
      });

      // Queue scrape jobs
      for (const url of data.urls) {
        await this.env.SCRAPE_QUEUE.send({
          type: "scrape",
          url,
          options: data.options,
          request_id: requestId,
          connection_id: connectionId,
          user_id: this.connections.get(connectionId)?.user_id,
        });
      }

      // Send response
      this.sendMessage(connectionId, {
        type: "scrape_response",
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          request_id: requestId,
          results: data.urls.map((url) => ({
            url,
            success: true,
            status: "queued",
          })),
        },
      });
    } catch (error) {
      console.error("Error handling scrape request:", error);
      this.sendError(connectionId, "Failed to process scrape request");
    }
  }

  /**
   * Handle job processing request
   * @param connectionId Connection ID
   * @param message Job processing request message
   */
  private async handleJobProcessingRequest(
    connectionId: string,
    message: WebSocketMessage
  ): Promise<void> {
    try {
      const data = message.data as JobProcessingRequestData;
      const requestId = crypto.randomUUID();

      // Send acknowledgment
      this.sendMessage(connectionId, {
        type: "status_update",
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          status: "processing",
          message: `Processing ${data.job_urls.length} job URLs`,
          current_task: "job_processing",
        },
      });

      // Queue job processing
      for (const url of data.job_urls) {
        await this.env.SCRAPE_QUEUE.send({
          type: "job_processing",
          url,
          options: data.options,
          request_id: requestId,
          connection_id: connectionId,
          user_id: this.connections.get(connectionId)?.user_id,
        });
      }

      // Send response
      this.sendMessage(connectionId, {
        type: "job_processing_response",
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        data: {
          request_id: requestId,
          results: data.job_urls.map((url) => ({
            url,
            success: true,
            status: "queued",
          })),
        },
      });
    } catch (error) {
      console.error("Error handling job processing request:", error);
      this.sendError(connectionId, "Failed to process job processing request");
    }
  }

  /**
   * Send message to specific connection
   * @param connectionId Connection ID
   * @param message Message to send
   */
  private sendMessage(connectionId: string, message: WebSocketMessage): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.error("Connection not found for sending message:", connectionId);
      return;
    }

    try {
      connection.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error("Error sending message:", error);
      this.connections.delete(connectionId);
    }
  }

  /**
   * Send error message to connection
   * @param connectionId Connection ID
   * @param errorMessage Error message
   */
  private sendError(connectionId: string, errorMessage: string): void {
    this.sendMessage(connectionId, {
      type: "error",
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      data: {
        message: errorMessage,
      },
    });
  }

  /**
   * Handle connection close
   * @param connectionId Connection ID
   */
  private handleConnectionClose(connectionId: string): void {
    console.log("WebSocket connection closed:", connectionId);
    this.connections.delete(connectionId);
  }

  /**
   * Handle connection error
   * @param connectionId Connection ID
   * @param error Error object
   */
  private handleConnectionError(connectionId: string, error: any): void {
    console.error("WebSocket connection error:", connectionId, error);
    this.connections.delete(connectionId);
  }

  /**
   * Broadcast message to all connections
   * @param message Message to broadcast
   * @param userId Optional user ID filter
   */
  broadcastMessage(message: WebSocketMessage, userId?: string): void {
    for (const [connectionId, connection] of this.connections) {
      if (!userId || connection.user_id === userId) {
        this.sendMessage(connectionId, message);
      }
    }
  }

  /**
   * Get connection statistics
   * @returns Connection statistics
   */
  getConnectionStats(): {
    total_connections: number;
    connections_by_user: Record<string, number>;
    oldest_connection: string | null;
    newest_connection: string | null;
  } {
    const connections = Array.from(this.connections.values());
    const connectionsByUser: Record<string, number> = {};

    for (const connection of connections) {
      if (connection.user_id) {
        connectionsByUser[connection.user_id] =
          (connectionsByUser[connection.user_id] || 0) + 1;
      }
    }

    const sortedConnections = connections.sort(
      (a, b) =>
        new Date(a.connected_at).getTime() - new Date(b.connected_at).getTime()
    );

    return {
      total_connections: connections.length,
      connections_by_user: connectionsByUser,
      oldest_connection: sortedConnections[0]?.connected_at || null,
      newest_connection:
        sortedConnections[sortedConnections.length - 1]?.connected_at || null,
    };
  }

  /**
   * Close all connections
   */
  closeAllConnections(): void {
    for (const [connectionId, connection] of this.connections) {
      try {
        connection.socket.close();
      } catch (error) {
        console.error("Error closing connection:", connectionId, error);
      }
    }
    this.connections.clear();
  }
}

/**
 * Factory function to create WebSocketService
 * @param env WebSocket service environment configuration
 * @returns New WebSocketService instance
 */
export function createWebSocketService(
  env: WebSocketServiceEnv
): WebSocketService {
  return new WebSocketService(env);
}
