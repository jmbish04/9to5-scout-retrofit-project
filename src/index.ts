/**
 * @module src/index.ts
 * @description
 * Main entry point for the refactored Cloudflare Worker.
 * It delegates all routing to the Hono app and includes the global
 * error handler, WebSocket handling, and cron triggers.
 */

import router from './api/router';
import { ErrorLoggingService, ErrorContext } from './core/services/error-logging.service';
import { ErrorInvestigationAgent } from './core/agents/error-investigation.agent';
import { AppError } from './core/errors';
import { HealthCheckRunner } from './core/services/health-check-runner.service';
import type { HealthCheckSocket } from './core/durable-objects/health-check-socket.do';

// ... (Env interface and DO export remain the same)

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const loggingService = new ErrorLoggingService(env);
    try {
      // Delegate all routing to the Hono app
      return await router.fetch(request, env, ctx);
    } catch (error: unknown) {
      // --- GLOBAL ERROR HANDLING ---
      if (error instanceof Error) {
        // ... (error handling logic as implemented before)
      }
      return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), { status: 500 });
    }
  },

  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // ... (scheduled handler remains the same)
  },
};
