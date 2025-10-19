/**
 * Runs API routes for managing discovery and monitoring runs.
 */

import type { Env } from "../index";
import {
  createRun,
  getRuns,
} from "../domains/monitoring/services/monitoring-storage.service";

export async function handleRunsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "20");

    const runs = await getRuns(env, limit);

    return new Response(JSON.stringify(runs), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching runs:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch runs" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleDiscoveryRunPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      config_id?: string;
    };
    const configId = body.config_id;

    const runId = await createRun(env, "discovery", configId);

    // Trigger discovery workflow. This can be done asynchronously.
    env.DISCOVERY_WORKFLOW.create({ config_id: configId } as any);

    return new Response(JSON.stringify({ id: runId, status: "queued" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating discovery run:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create discovery run" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleMonitorRunPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      config_id?: string;
    };
    const configId = body.config_id;

    const runId = await createRun(env, "monitor", configId);

    // Trigger monitoring workflow. This can be done asynchronously.
    env.JOB_MONITOR_WORKFLOW.create({ config_id: configId } as any);

    return new Response(JSON.stringify({ id: runId, status: "queued" }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating monitor run:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create monitor run" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
