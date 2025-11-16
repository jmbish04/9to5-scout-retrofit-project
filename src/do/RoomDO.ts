/**
 * @module src/do/RoomDO.ts
 * @description
 * Durable Object for WebSocket rooms using hibernatable WebSocket API.
 * Handles WebSocket connections, message broadcasting, and room management.
 */

import { DurableObject } from "cloudflare:workers";
import { broadcastToRoom, createWSMessage, parseWSMessage } from "../utils/ws";

export interface RoomDOEnv {
  DB: D1Database;
  AI: Ai;
}

export class RoomDO extends DurableObject<RoomDOEnv> {
  private connections: Set<WebSocket> = new Set();

  constructor(ctx: DurableObjectState, env: RoomDOEnv) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    // Check if this is a WebSocket upgrade request
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    // Create WebSocket pair
    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];

    // Accept WebSocket using hibernatable API
    this.ctx.acceptWebSocket(server);

    // Store connection
    this.connections.add(server);

    // Send welcome message
    const welcomeMessage = createWSMessage("connected", {
      room: this.ctx.id.toString(),
      timestamp: new Date().toISOString(),
    });

    server.send(JSON.stringify(welcomeMessage));

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(
    ws: WebSocket,
    message: string | ArrayBuffer
  ): Promise<void> {
    const parsed = parseWSMessage(message);
    if (!parsed) {
      ws.send(
        JSON.stringify(
          createWSMessage("error", {
            error: "Invalid message format",
          })
        )
      );
      return;
    }

    // Handle different message types
    switch (parsed.type) {
      case "broadcast":
        // Broadcast to all connections in room
        const connections = Array.from(this.connections);
        broadcastToRoom(connections, parsed);
        break;

      case "ping":
        ws.send(JSON.stringify(createWSMessage("pong", {})));
        break;

      default:
        // Echo back or handle custom logic
        ws.send(JSON.stringify(createWSMessage("echo", parsed.payload)));
    }
  }

  async webSocketClose(
    ws: WebSocket,
    code: number,
    reason: string,
    wasClean: boolean
  ): Promise<void> {
    // Remove connection from set
    this.connections.delete(ws);

    // Broadcast disconnect if needed
    const disconnectMessage = createWSMessage("disconnected", {
      code,
      reason,
      wasClean,
    });

    const connections = Array.from(this.connections);
    broadcastToRoom(connections, disconnectMessage);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("WebSocket error in RoomDO:", error);

    // Remove connection
    this.connections.delete(ws);

    // Send error to client if possible
    try {
      ws.close(1011, "Internal server error");
    } catch (e) {
      // Connection may already be closed
    }
  }
}
