/**
 * Jobs API routes for retrieving and managing job data.
 */

import type { Env } from "../index";
import { getJob, getJobs } from "../lib/storage";

export async function handleJobsGet(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get("status") || undefined;
    const siteId = url.searchParams.get("site_id") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const jobs = await getJobs(env, { status, site_id: siteId, limit });

    return new Response(JSON.stringify(jobs), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching jobs:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch jobs" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export async function handleJobGet(
  request: Request,
  env: Env,
  jobId: string
): Promise<Response> {
  try {
    const job = await getJob(env, jobId);

    if (!job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(job), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching job:", error);
    return new Response(JSON.stringify({ error: "Failed to fetch job" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export interface BatchJobsRequest {
  jobs: any[];
}

export async function handleJobsBatchPost(
  request: Request,
  env: Env
): Promise<Response> {
  try {
    const body = (await request.json()) as BatchJobsRequest;

    if (!body.jobs || !Array.isArray(body.jobs)) {
      return new Response(JSON.stringify({ error: "jobs array is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const results = {
      total_received: body.jobs.length,
      successful: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each job
    for (const job of body.jobs) {
      try {
        // Generate a unique ID for the job
        const jobId = crypto.randomUUID();
        const now = new Date().toISOString();

        // Map the scraped job data to our database schema
        await env.DB.prepare(
          `INSERT OR IGNORE INTO jobs (
            id, url, title, company, location, employment_type, 
            department, salary_min, salary_max, salary_currency, 
            salary_raw, compensation_raw, description_md, 
            requirements_md, posted_at, status, first_seen_at, last_crawled_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
          .bind(
            jobId,
            job.url || "",
            job.title || null,
            job.company || null,
            job.location || null,
            job.employment_type || null,
            job.department || null,
            job.salary_min || null,
            job.salary_max || null,
            job.salary_currency || null,
            job.salary_raw || null,
            job.compensation_raw || null,
            job.description_md || null,
            job.requirements_md || null,
            job.posted_at || null,
            "open",
            now,
            now
          )
          .run();

        results.successful++;
      } catch (jobError) {
        console.error(`Error storing job:`, jobError);
        results.failed++;
        results.errors.push(`Job ${job.url || "unknown"}: ${jobError}`);
      }
    }

    return new Response(JSON.stringify(results), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing batch jobs:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process batch jobs" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
