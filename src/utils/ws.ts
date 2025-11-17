/**
 * @module src/utils/ws.ts
 * @description
 * WebSocket utilities for broadcasting, framing, and retry logic.
 */

import type { WSMessage } from "../schemas/apiSchemas";

/**
 * Broadcast message to all WebSocket connections in a room
 */
export function broadcastToRoom(
  websockets: WebSocket[],
  message: WSMessage
): void {
  const frame = JSON.stringify(message);
  for (const ws of websockets) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(frame);
      }
    } catch (error) {
      console.error("Failed to send WebSocket message:", error);
    }
  }
}

/**
 * Create a properly formatted WebSocket message
 */
export function createWSMessage(
  type: string,
  payload: unknown,
  meta?: {
    timestamp?: string;
    requestId?: string;
    userId?: string;
  }
): WSMessage {
  return {
    type,
    payload,
    meta: {
      timestamp: meta?.timestamp ?? new Date().toISOString(),
      requestId: meta?.requestId,
      userId: meta?.userId,
    },
  };
}

/**
 * WebSocket retry configuration
 */
export interface WSRetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: WSRetryConfig = {
  maxRetries: 5,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
};

/**
 * Calculate retry delay with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: WSRetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay =
    config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  return Math.min(delay, config.maxDelay);
}

/**
 * Parse WebSocket message with validation
 */
export function parseWSMessage(data: string | ArrayBuffer): WSMessage | null {
  try {
    const text =
      typeof data === "string" ? data : new TextDecoder().decode(data);
    const parsed = JSON.parse(text);
    return parsed as WSMessage;
  } catch (error) {
    console.error("Failed to parse WebSocket message:", error);
    return null;
  }
}
