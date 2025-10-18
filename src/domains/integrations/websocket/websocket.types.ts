/**
 * @fileoverview WebSocket Integration Types
 *
 * Type definitions for WebSocket communication functionality including
 * message types, connection management, and real-time scraping.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

/**
 * WebSocket service environment configuration
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
 * Connection statistics interface
 */
export interface ConnectionStats {
  total_connections: number;
  connections_by_user: Record<string, number>;
  oldest_connection: string | null;
  newest_connection: string | null;
}

/**
 * Queue message interface for scrape operations
 */
export interface ScrapeQueueMessage {
  type: "scrape" | "job_processing";
  url: string;
  options?: any;
  request_id: string;
  connection_id: string;
  user_id?: string;
}
