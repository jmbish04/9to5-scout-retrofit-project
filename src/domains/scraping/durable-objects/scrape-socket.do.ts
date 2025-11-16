/**
 * @module src/domains/scraping/durable-objects/scrape-socket.do.ts
 * @description
 * Durable Object for managing WebSocket connections for real-time scraping communication.
 * Refactored to use the ScrapeQueueService.
 */

import { isPythonClient } from "../../../core/auth"; // Corrected path
import { ScrapeQueueService } from "../services/scrape-queue.service";

type DurableObjectState = any;

interface ClientInfo {
  type: string;
  lastPing: number;
}

interface PendingCommand {
  issuedBy: WebSocket;
  issuedAt: number;
}

// Using any for DurableObject to avoid type conflicts
declare const DurableObject: any;

export class ScrapeSocket extends DurableObject {
  private ctx: any;
  private env: any;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private scrapeQueueService: ScrapeQueueService;

  constructor(ctx: any, env: any) {
    super(ctx, env);
    this.ctx = ctx;
    this.env = env;
    this.scrapeQueueService = new ScrapeQueueService(env);
  }

  /**
   * Send a message to selected clients based on a filter function.
   */
  private sendToClients(
    filterFn: (info: ClientInfo) => boolean,
    payload: string,
    excludeSocket?: WebSocket
  ): void {
    for (const [socket, info] of Array.from(this.clients.entries())) {
      if (socket === excludeSocket) continue;
      if (filterFn(info)) {
        try {
          socket.send(payload);
        } catch (error) {
          console.error("Failed to send message to client:", error);
          // Remove dead connections
          this.clients.delete(socket);
        }
      }
    }
  }

  private async handleJobProcessingMessage(
    socket: WebSocket,
    data: any
  ): Promise<void> {
    try {
      const { urls, source, source_id, metadata } = data;

      if (!urls || !Array.isArray(urls) || urls.length === 0) {
        socket.send(
          JSON.stringify({
            type: "job-processing-error",
            error:
              "Invalid request: urls array is required and must not be empty",
            commandId: data.commandId,
          })
        );
        return;
      }

      // Delegate to the ScrapeQueueService
      const result = await this.scrapeQueueService.submitUrlsForScraping({
        urls,
        source: source || "websocket",
        source_id,
        metadata,
      });

      // Send result back to the client
      socket.send(
        JSON.stringify({
          type: "job-processing-result",
          commandId: data.commandId,
          result,
        })
      );

      // Broadcast to other observers
      const broadcastPayload = JSON.stringify({
        type: "job-processing-completed",
        commandId: data.commandId,
        result,
      });
      this.sendToClients(
        (info) => !isPythonClient(info),
        broadcastPayload,
        socket
      );
    } catch (error) {
      console.error("Job processing error:", error);
      socket.send(
        JSON.stringify({
          type: "job-processing-error",
          error: error instanceof Error ? error.message : "Unknown error",
          commandId: data.commandId,
        })
      );
    }
  }

  /**
   * Handle HTTP requests and WebSocket upgrades.
   */
  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader === "websocket") {
      const [client, server] = Object.values(new WebSocketPair()) as [WebSocket, WebSocket];
      this.ctx.acceptWebSocket(server);

      server.addEventListener("message", (event) => {
        this.handleWebSocketMessage(server, event.data);
      });

      server.addEventListener("close", () => {
        this.clients.delete(server);
      });

      return new Response(null, {
        status: 101,
        webSocket: client,
      });
    }

    return new Response("Expected WebSocket", { status: 400 });
  }

  /**
   * Handle incoming WebSocket messages.
   */
  private async handleWebSocketMessage(socket: WebSocket, data: string): Promise<void> {
    try {
      const message = JSON.parse(data);
      const { type, ...payload } = message;

      switch (type) {
        case "register":
          this.registerClient(socket, payload);
          break;
        case "job-processing":
          await this.handleJobProcessingMessage(socket, payload);
          break;
        case "ping":
          this.handlePing(socket);
          break;
        default:
          socket.send(JSON.stringify({
            type: "error",
            error: `Unknown message type: ${type}`
          }));
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
      socket.send(JSON.stringify({
        type: "error",
        error: "Invalid message format"
      }));
    }
  }

  /**
   * Register a client with the socket.
   */
  private registerClient(socket: WebSocket, data: any): void {
    const clientInfo: ClientInfo = {
      type: data.clientType || "observer",
      lastPing: Date.now(),
    };
    this.clients.set(socket, clientInfo);

    socket.send(JSON.stringify({
      type: "registered",
      clientType: clientInfo.type
    }));
  }

  /**
   * Handle ping messages to keep connections alive.
   */
  private handlePing(socket: WebSocket): void {
    const clientInfo = this.clients.get(socket);
    if (clientInfo) {
      clientInfo.lastPing = Date.now();
      socket.send(JSON.stringify({ type: "pong" }));
    }
  }
}