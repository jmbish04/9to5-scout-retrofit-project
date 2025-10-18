/**
 * @fileoverview WebSocket Integration Routes
 *
 * RESTful API routes for WebSocket integration including connection management,
 * message handling, and real-time scraping operations.
 *
 * @author 9to5 Scout AI Team
 * @version 1.0.0
 * @since 2024-01-01
 */

import { Hono } from "hono";
import { z } from "zod";
import type { Env } from "../../../config/env";
import {
  getValidatedQuery,
  logger,
  rateLimit,
  validateQuery,
} from "../../../core/validation/hono-validation";
import { createWebSocketService } from "./websocket.service";

const app = new Hono<{ Bindings: Env }>();

// Middleware
app.use("*", logger as any);
app.use("*", rateLimit({ requests: 100, windowMs: 60000 }) as any);

// Validation schemas
const WebSocketUpgradeQuerySchema = z.object({
  user_id: z.string().optional(),
  session_id: z.string().optional(),
});

const ConnectionStatsQuerySchema = z.object({
  user_id: z.string().optional(),
});

// Routes

/**
 * GET /websocket/upgrade - Upgrade HTTP connection to WebSocket
 */
app.get("/upgrade", validateQuery(WebSocketUpgradeQuerySchema), async (c) => {
  try {
    const { user_id, session_id } = getValidatedQuery(c) as {
      user_id?: string;
      session_id?: string;
    };

    // Create WebSocket service
    const webSocketService = createWebSocketService(c.env);

    // Handle WebSocket upgrade
    const response = await webSocketService.handleWebSocketUpgrade(c.req.raw);

    return response;
  } catch (error) {
    console.error("Error upgrading to WebSocket:", error);
    return c.json(
      {
        success: false,
        error: "Failed to upgrade to WebSocket",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /websocket/stats - Get WebSocket connection statistics
 */
app.get("/stats", validateQuery(ConnectionStatsQuerySchema), async (c) => {
  try {
    const { user_id } = getValidatedQuery(c) as { user_id?: string };

    // Create WebSocket service
    const webSocketService = createWebSocketService(c.env);

    // Get connection statistics
    const stats = webSocketService.getConnectionStats();

    // Filter by user if specified
    if (user_id) {
      const userConnections = stats.connections_by_user[user_id] || 0;
      return c.json({
        success: true,
        data: {
          ...stats,
          user_connections: userConnections,
          filtered_by_user: user_id,
        },
      });
    }

    return c.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error getting WebSocket stats:", error);
    return c.json(
      {
        success: false,
        error: "Failed to get WebSocket statistics",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /websocket/broadcast - Broadcast message to all connections
 */
app.post("/broadcast", async (c) => {
  try {
    const body = await c.req.json();
    const { message, user_id } = body as {
      message: {
        type: string;
        id: string;
        timestamp: string;
        data: any;
      };
      user_id?: string;
    };

    // Validate message structure
    if (!message || !message.type || !message.id || !message.timestamp) {
      return c.json(
        {
          success: false,
          error: "Invalid message format",
          message: "Message must include type, id, and timestamp",
        },
        400
      );
    }

    // Create WebSocket service
    const webSocketService = createWebSocketService(c.env);

    // Broadcast message
    webSocketService.broadcastMessage(message as any, user_id);

    return c.json({
      success: true,
      data: {
        message: "Broadcast sent successfully",
        target_user: user_id || "all",
      },
    });
  } catch (error) {
    console.error("Error broadcasting message:", error);
    return c.json(
      {
        success: false,
        error: "Failed to broadcast message",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * POST /websocket/close-all - Close all WebSocket connections
 */
app.post("/close-all", async (c) => {
  try {
    // Create WebSocket service
    const webSocketService = createWebSocketService(c.env);

    // Close all connections
    webSocketService.closeAllConnections();

    return c.json({
      success: true,
      data: {
        message: "All WebSocket connections closed",
      },
    });
  } catch (error) {
    console.error("Error closing WebSocket connections:", error);
    return c.json(
      {
        success: false,
        error: "Failed to close WebSocket connections",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

/**
 * GET /websocket/health - Health check endpoint
 */
app.get("/health", async (c) => {
  try {
    // Create WebSocket service
    const webSocketService = createWebSocketService(c.env);
    const stats = webSocketService.getConnectionStats();

    return c.json({
      success: true,
      data: {
        status: "healthy",
        timestamp: new Date().toISOString(),
        connections: stats.total_connections,
        services: {
          database: c.env.DB ? "available" : "not_available",
          scrape_queue: c.env.SCRAPE_QUEUE ? "available" : "not_available",
          usage_tracker: c.env.USAGE_TRACKER ? "available" : "not_available",
        },
      },
    });
  } catch (error) {
    console.error("Error checking WebSocket health:", error);
    return c.json(
      {
        success: false,
        error: "Health check failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

export { app as websocketRoutes };
