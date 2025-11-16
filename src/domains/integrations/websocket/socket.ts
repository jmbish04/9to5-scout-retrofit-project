/**
 * @module src/domains/integrations/websocket/socket.ts
 * @description
 * WebSocket Durable Object for handling real-time connections.
 */
import type { Env } from "../../../config/env";

// Using any for DurableObject to avoid type conflicts
declare const DurableObject: any;
declare const DurableObjectState: any;
declare const WebSocketPair: any;

export class ScrapeSocketDO extends DurableObject {
  constructor(ctx: any, env: Env) {
    super(ctx, env);
  }

  async fetch(request: Request): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    const webSocketPair = new WebSocketPair();
    const client = webSocketPair[0];
    const server = webSocketPair[1];

    this.ctx.acceptWebSocket(server);
    server.addEventListener("message", (event) => {
      console.log(event.data);
      server.send(event.data);
    });

    return new Response(null, {
      status: 101,
      webSocket: client,
    } as any);
  }
}
