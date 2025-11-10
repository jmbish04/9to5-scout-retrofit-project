/**
 * @module src/routes/socket.ts
 * @description
 * WebSocket connection handler.
 */
import type { Env } from "../../../config/env";

export function handleScrapeSocket(request: Request, env: Env): Response {
  const upgradeHeader = request.headers.get("Upgrade");
  if (!upgradeHeader || upgradeHeader !== "websocket") {
    return new Response("Expected Upgrade: websocket", { status: 426 });
  }

  const webSocketPair = new WebSocketPair();
  const [client, server] = Object.values(webSocketPair);

  server.accept();
  server.addEventListener("message", (event) => {
    console.log(event.data);
    server.send(event.data);
  });

  return new Response(null, {
    status: 101,
    webSocket: client,
  });
}
