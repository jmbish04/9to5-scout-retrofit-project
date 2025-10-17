/**
 * Scrape queue API routes for Python integration.
 * Handles queuing and claiming of scraping jobs.
 */

import type { Env } from "../index";

export interface ScrapeQueueJob {
  id: number;
  urls: string;
  source?: string;
  status: "pending" | "claimed" | "completed" | "failed";
  priority: number;
  payload?: string;
  available_at: string;
  last_claimed_at?: string;
  completed_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ScrapeQueueRequest {
  urls: string;
  source?: string;
  priority?: number;
  payload?: string;
}

export async function handleScrapeQueuePost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as ScrapeQueueRequest;

    if (!body.urls) {
      return new Response(JSON.stringify({ error: "URLs are required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const now = new Date().toISOString();

    // Insert job into scrape queue (id is auto-increment)
    const result = await env.DB.prepare(
      `INSERT INTO scrape_queue (urls, source, status, priority, payload, available_at, created_at, updated_at)
       VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`
    )
      .bind(
        body.urls,
        body.source || null,
        body.priority || 0,
        body.payload || null,
        now,
        now,
        now
      )
      .run();

    const job: ScrapeQueueJob = {
      id: result.meta.last_row_id,
      urls: body.urls,
      source: body.source,
      status: "pending",
      priority: body.priority || 0,
      payload: body.payload,
      available_at: now,
      created_at: now,
      updated_at: now,
    };

    return new Response(JSON.stringify({ job }), {
      status: 201,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error adding job to scrape queue:", error);
    return new Response(
      JSON.stringify({ error: "Failed to add job to queue" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleScrapeQueuePendingGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get("limit") || "10");
    const maxAge = parseInt(url.searchParams.get("max_age_hours") || "24");

    // Get pending jobs that haven't been claimed recently
    const cutoffTime = new Date(
      Date.now() - maxAge * 60 * 60 * 1000
    ).toISOString();

    const result = await env.DB.prepare(
      `SELECT * FROM scrape_queue 
       WHERE status = 'pending' 
       AND (last_claimed_at IS NULL OR last_claimed_at < ?)
       ORDER BY priority DESC, available_at ASC 
       LIMIT ?`
    )
      .bind(cutoffTime, limit)
      .all();

    const jobs = result.results as unknown as ScrapeQueueJob[];

    if (jobs.length === 0) {
      return new Response(JSON.stringify({ jobs: [] }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Atomically claim these jobs
    const jobIds = jobs.map((job) => job.id);
    const placeholders = jobIds.map(() => "?").join(",");
    const now = new Date().toISOString();

    await env.DB.prepare(
      `UPDATE scrape_queue 
       SET status = 'claimed', last_claimed_at = ?, updated_at = ? 
       WHERE id IN (${placeholders}) AND status = 'pending'`
    )
      .bind(now, now, ...jobIds)
      .run();

    // Update the jobs array with claimed status
    const claimedJobs = jobs.map((job) => ({
      ...job,
      status: "claimed" as const,
      last_claimed_at: now,
      updated_at: now,
    }));

    return new Response(JSON.stringify({ jobs: claimedJobs }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching pending jobs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to fetch pending jobs" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}

export async function handleScrapeQueuePatch(
  request: Request,
  env: Env,
  jobId: string
): Promise<Response> {
  try {
    const body = (await request.json()) as {
      status: "completed" | "failed";
      error_message?: string;
    };

    if (!body.status || !["completed", "failed"].includes(body.status)) {
      return new Response(
        JSON.stringify({
          error: "Invalid status. Must be 'completed' or 'failed'",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date().toISOString();
    const updateFields = ["status = ?", "updated_at = ?"];
    const bindValues = [body.status, now];

    if (body.status === "completed" || body.status === "failed") {
      updateFields.push("completed_at = ?");
      bindValues.push(now);
    }

    if (body.error_message) {
      updateFields.push("error_message = ?");
      bindValues.push(body.error_message);
    }

    bindValues.push(jobId);

    const result = await env.DB.prepare(
      `UPDATE scrape_queue 
       SET ${updateFields.join(", ")} 
       WHERE id = ? AND status = 'claimed'`
    )
      .bind(...bindValues)
      .run();

    if (result.meta.changes === 0) {
      return new Response(
        JSON.stringify({ error: "Job not found or not in claimed status" }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        message: `Job ${jobId} status updated to ${body.status}`,
      }),
      {
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating job status:", error);
    return new Response(
      JSON.stringify({ error: "Failed to update job status" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
