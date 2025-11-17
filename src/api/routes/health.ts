/**
 * @module src/new/api/routes/health.ts
 * @description
 * Route handlers for the /api/health endpoint, now with WebSocket integration.
 */

interface HealthEnv {
  DB: any; // D1Database type from Cloudflare Workers
  HEALTH_CHECK_SOCKET: any; // DurableObjectNamespace type from Cloudflare Workers
}

/**
 * Handles GET /api/health
 * Fetches the latest health check report from the D1 database.
 */
export async function handleHealthGet(env: HealthEnv): Promise<Response> {
  try {
    const latest = await env.DB.prepare(
      `SELECT * FROM test_results
       ORDER BY created_at DESC
       LIMIT 1`
    ).first();

    if (!latest) {
      return new Response(
        JSON.stringify({
          status: "unknown",
          message: "No health check data available",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        status: latest.status === "pass" ? "healthy" : "unhealthy",
        lastCheck: latest.finished_at,
        message: `Last health check: ${latest.status}`,
        details: latest,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Health check error:", error);
    return new Response(
      JSON.stringify({
        status: "error",
        message: "Failed to retrieve health status",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

/**
 * Handles POST /api/health
 * Triggers a new, asynchronous health check run via a Durable Object.
 */
export async function handleHealthPost(env: HealthEnv): Promise<Response> {
  try {
    // Create a unique ID for this specific run.
    const runId = crypto.randomUUID();
    const doId = env.HEALTH_CHECK_SOCKET.idFromName(runId);
    const stub = env.HEALTH_CHECK_SOCKET.get(doId);

    // Start the health check run within the Durable Object.
    // We don't await this; it runs in the background. The client will
    // connect to the WebSocket to get the results.
    stub.fetch(`https://dummy-host/start`);

    // Return the runId to the client so it can connect to the WebSocket.
    return new Response(
      JSON.stringify({
        message: "Health check initiated.",
        runId: runId,
        websocketUrl: `/ws/health/${runId}`, // Inform client where to connect
      }),
      {
        status: 202, // Accepted
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Failed to initiate health check:", error);
    return new Response(
      JSON.stringify({ error: "Failed to initiate health check" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
