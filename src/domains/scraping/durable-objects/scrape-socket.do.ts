/**
 * @module src/domains/scraping/durable-objects/scrape-socket.do.ts
 * @description
 * Durable Object for managing WebSocket connections for real-time scraping communication.
 * Refactored to use the ScrapeQueueService.
 */

import { ScrapeQueueService } from "../services/scrape-queue.service";
import { hasActivePythonClient, isPythonClient } from "../../../core/auth"; // Corrected path

type DurableObjectState = any;

interface ClientInfo {
  type: string;
  lastPing: number;
}

interface PendingCommand {
  issuedBy: WebSocket;
  issuedAt: number;
}

export class ScrapeSocket {
  private state: DurableObjectState;
  private env: any;
  private clients: Map<WebSocket, ClientInfo> = new Map();
  private pendingCommands: Map<string, PendingCommand> = new Map();
  private scrapeQueueService: ScrapeQueueService;

  constructor(state: DurableObjectState, env: any) {
    this.state = state;
    this.env = env;
    this.scrapeQueueService = new ScrapeQueueService(env);
  }

  // ... (sendToClients, broadcastStatus, acknowledgePing, normaliseCommand, dispatchCommand, handlePythonMessage methods remain the same)

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

  // ... (handleObserverMessage, registerClient, and fetch methods remain the same, but I'll paste the full correct class here)
}