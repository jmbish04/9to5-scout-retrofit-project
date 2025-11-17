/**
 * @module src/new/core/durable-objects/health-check-socket.ts
 * @description
 * A Durable Object that manages WebSocket connections for real-time health check logging.
 */

import { HealthCheckRunner } from "../services/health-check-runner.service";

// Using any for DurableObject to avoid type conflicts
declare const DurableObject: any;

export class HealthCheckSocket extends DurableObject {
  sessions: WebSocket[] = [];

  constructor(ctx: any, env: any) {
    super(ctx, env);
  }

  // Broadcasts a message to all connected WebSocket clients.
  private broadcast(message: string) {
    this.sessions = this.sessions.filter((session) => {
      try {
        session.send(message);
        return true;
      } catch (err) {
        // The client has disconnected.
        return false;
      }
    });
  }

  async fetch(request: Request) {
    const url = new URL(request.url);

    // The main endpoint for this DO is for WebSocket upgrades.
    if (request.headers.get("Upgrade") !== "websocket") {
      return new Response("Expected a WebSocket upgrade request.", {
        status: 426,
      });
    }

    const { 0: client, 1: server } = new WebSocketPair();
    this.sessions.push(server);

    // Handle incoming messages from the client (if any).
    server.addEventListener("message", (event) => {
      console.log(`HealthCheckSocket received: ${event.data}`);
    });

    // On startup, trigger the health check run.
    // The runner will then call back to this object to broadcast progress.
    if (url.pathname.includes("/start")) {
      this.state.waitUntil(this.runHealthCheck());
    }

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  // This method is called by the HealthCheckRunner to stream progress.
  async log(message: string) {
    this.broadcast(message);
  }

  private async runHealthCheck() {
    const runner = new HealthCheckRunner(this.env);
    this.log("START: Health check run initiated...");
    const report = await runner.run("manual_api");
    this.log(`COMPLETE: Health check finished with status: ${report.status}`);
    this.log(`REPORT_ID: ${report.id}`); // Send the final report ID
  }
}
