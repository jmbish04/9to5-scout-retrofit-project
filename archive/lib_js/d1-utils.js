/**
 * D1 Database utilities with validation and error handling
 */
import { z } from "zod";
import { JobDataSchema, JobTrackingHistorySchema, SnapshotDataSchema, } from "./validation";
export class D1ValidationError extends Error {
    cause;
    code = "D1_VALIDATION_ERROR";
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = "D1ValidationError";
    }
}
export class D1ConstraintError extends Error {
    cause;
    code = "D1_CONSTRAINT_ERROR";
    constructor(message, cause) {
        super(message);
        this.cause = cause;
        this.name = "D1ConstraintError";
    }
}
/**
 * Safely insert job data into D1 with validation
 */
export async function insertJob(db, jobData) {
    try {
        // Validate the job data
        const validatedJob = JobDataSchema.parse(jobData);
        // Check if job already exists
        const existingJob = await db
            .prepare("SELECT id FROM jobs WHERE url = ?")
            .bind(validatedJob.url)
            .first();
        if (existingJob) {
            return {
                success: false,
                error: "Job with this URL already exists",
                jobId: existingJob.id,
            };
        }
        // Insert the job
        const result = await db
            .prepare(`
        INSERT INTO jobs (
          id, site_id, url, canonical_url, title, company, location,
          employment_type, department, salary_min, salary_max, salary_currency,
          salary_raw, compensation_raw, description_md, requirements_md,
          posted_at, closed_at, status, last_seen_open_at, first_seen_at,
          last_crawled_at, daily_monitoring_enabled, monitoring_frequency_hours,
          last_status_check_at, closure_detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(validatedJob.id, validatedJob.site_id, validatedJob.url, validatedJob.canonical_url, validatedJob.title, validatedJob.company, validatedJob.location, validatedJob.employment_type, validatedJob.department, validatedJob.salary_min, validatedJob.salary_max, validatedJob.salary_currency, validatedJob.salary_raw, validatedJob.compensation_raw, validatedJob.description_md, validatedJob.requirements_md, validatedJob.posted_at, validatedJob.closed_at, validatedJob.status, validatedJob.last_seen_open_at, validatedJob.first_seen_at, validatedJob.last_crawled_at, validatedJob.daily_monitoring_enabled ? 1 : 0, validatedJob.monitoring_frequency_hours, validatedJob.last_status_check_at, validatedJob.closure_detected_at)
            .run();
        if (!result.success) {
            throw new Error(`Failed to insert job: ${result.error}`);
        }
        return {
            success: true,
            jobId: validatedJob.id,
        };
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new D1ValidationError("Job data validation failed", error.issues);
        }
        if (error instanceof Error &&
            error.message.includes("UNIQUE constraint failed")) {
            throw new D1ConstraintError("Job URL already exists", error);
        }
        throw new D1ValidationError("Failed to insert job", error);
    }
}
/**
 * Safely update job data in D1 with validation
 */
export async function updateJob(db, jobId, updates) {
    try {
        // Validate the update data
        const validatedUpdates = JobDataSchema.partial().parse(updates);
        // Build dynamic update query
        const updateFields = [];
        const values = [];
        Object.entries(validatedUpdates).forEach(([key, value]) => {
            if (value !== undefined && key !== "id") {
                updateFields.push(`${key} = ?`);
                values.push(value);
            }
        });
        if (updateFields.length === 0) {
            return { success: true };
        }
        // Add job ID for WHERE clause
        values.push(jobId);
        const result = await db
            .prepare(`UPDATE jobs SET ${updateFields.join(", ")} WHERE id = ?`)
            .bind(...values)
            .run();
        if (!result.success) {
            throw new Error(`Failed to update job: ${result.error}`);
        }
        return { success: true };
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new D1ValidationError("Job update data validation failed", error.issues);
        }
        throw new D1ValidationError("Failed to update job", error);
    }
}
/**
 * Safely insert snapshot data into D1 with validation
 */
export async function insertSnapshot(db, snapshotData) {
    try {
        // Validate the snapshot data
        const validatedSnapshot = SnapshotDataSchema.parse(snapshotData);
        // Verify job exists
        const job = await db
            .prepare("SELECT id FROM jobs WHERE id = ?")
            .bind(validatedSnapshot.job_id)
            .first();
        if (!job) {
            throw new D1ConstraintError("Referenced job does not exist");
        }
        // Insert the snapshot
        const result = await db
            .prepare(`
        INSERT INTO snapshots (
          id, job_id, run_id, content_hash, html_r2_key, json_r2_key,
          screenshot_r2_key, pdf_r2_key, markdown_r2_key, fetched_at,
          http_status, etag
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(validatedSnapshot.id, validatedSnapshot.job_id, validatedSnapshot.run_id, validatedSnapshot.content_hash, validatedSnapshot.html_r2_key, validatedSnapshot.json_r2_key, validatedSnapshot.screenshot_r2_key, validatedSnapshot.pdf_r2_key, validatedSnapshot.markdown_r2_key, validatedSnapshot.fetched_at, validatedSnapshot.http_status, validatedSnapshot.etag)
            .run();
        if (!result.success) {
            throw new Error(`Failed to insert snapshot: ${result.error}`);
        }
        return {
            success: true,
            snapshotId: validatedSnapshot.id,
        };
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new D1ValidationError("Snapshot data validation failed", error.issues);
        }
        if (error instanceof D1ConstraintError) {
            throw error;
        }
        throw new D1ValidationError("Failed to insert snapshot", error);
    }
}
/**
 * Safely insert job tracking history into D1 with validation
 */
export async function insertJobTrackingHistory(db, trackingData) {
    try {
        // Validate the tracking data
        const validatedTracking = JobTrackingHistorySchema.parse(trackingData);
        // Verify job and snapshot exist
        const job = await db
            .prepare("SELECT id FROM jobs WHERE id = ?")
            .bind(validatedTracking.job_id)
            .first();
        if (!job) {
            throw new D1ConstraintError("Referenced job does not exist");
        }
        const snapshot = await db
            .prepare("SELECT id FROM snapshots WHERE id = ?")
            .bind(validatedTracking.snapshot_id)
            .first();
        if (!snapshot) {
            throw new D1ConstraintError("Referenced snapshot does not exist");
        }
        // Insert the tracking history
        const result = await db
            .prepare(`
        INSERT INTO job_tracking_history (
          id, job_id, snapshot_id, tracking_date, status, content_hash,
          title_changed, requirements_changed, salary_changed, description_changed,
          error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .bind(validatedTracking.id, validatedTracking.job_id, validatedTracking.snapshot_id, validatedTracking.tracking_date, validatedTracking.status, validatedTracking.content_hash, validatedTracking.title_changed ? 1 : 0, validatedTracking.requirements_changed ? 1 : 0, validatedTracking.salary_changed ? 1 : 0, validatedTracking.description_changed ? 1 : 0, validatedTracking.error_message, validatedTracking.created_at)
            .run();
        if (!result.success) {
            throw new Error(`Failed to insert tracking history: ${result.error}`);
        }
        return {
            success: true,
            trackingId: validatedTracking.id,
        };
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new D1ValidationError("Tracking data validation failed", error.issues);
        }
        if (error instanceof D1ConstraintError) {
            throw error;
        }
        throw new D1ValidationError("Failed to insert tracking history", error);
    }
}
/**
 * Get job by ID with validation
 */
export async function getJobById(db, jobId) {
    try {
        const result = await db
            .prepare("SELECT * FROM jobs WHERE id = ?")
            .bind(jobId)
            .first();
        if (!result) {
            return null;
        }
        // Convert boolean fields back from integer
        const job = {
            ...result,
            daily_monitoring_enabled: Boolean(result.daily_monitoring_enabled),
        };
        // Validate the result
        return JobDataSchema.parse(job);
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new D1ValidationError("Job data validation failed", error.issues);
        }
        throw new D1ValidationError("Failed to get job", error);
    }
}
/**
 * Get jobs by site with pagination and validation
 */
export async function getJobsBySite(db, siteId, limit = 50, offset = 0) {
    try {
        // Get total count
        const countResult = await db
            .prepare("SELECT COUNT(*) as total FROM jobs WHERE site_id = ?")
            .bind(siteId)
            .first();
        const total = countResult?.total || 0;
        // Get jobs with pagination
        const jobsResult = await db
            .prepare(`
        SELECT * FROM jobs 
        WHERE site_id = ? 
        ORDER BY last_crawled_at DESC 
        LIMIT ? OFFSET ?
      `)
            .bind(siteId, limit, offset)
            .all();
        const jobs = (jobsResult.results || []).map((job) => ({
            ...job,
            daily_monitoring_enabled: Boolean(job.daily_monitoring_enabled),
        }));
        // Validate each job
        const validatedJobs = jobs.map((job) => JobDataSchema.parse(job));
        return {
            jobs: validatedJobs,
            total,
        };
    }
    catch (error) {
        if (error instanceof z.ZodError) {
            throw new D1ValidationError("Job data validation failed", error.issues);
        }
        throw new D1ValidationError("Failed to get jobs by site", error);
    }
}
/**
 * Handle D1 errors and return appropriate HTTP responses
 */
export function handleD1Error(error) {
    if (error instanceof D1ValidationError) {
        return {
            status: 400,
            message: error.message,
            code: error.code,
        };
    }
    if (error instanceof D1ConstraintError) {
        return {
            status: 409,
            message: error.message,
            code: error.code,
        };
    }
    if (error instanceof Error) {
        // Check for specific D1 error patterns
        if (error.message.includes("UNIQUE constraint failed")) {
            return {
                status: 409,
                message: "Resource already exists",
                code: "D1_CONSTRAINT_ERROR",
            };
        }
        if (error.message.includes("FOREIGN KEY constraint failed")) {
            return {
                status: 400,
                message: "Referenced resource does not exist",
                code: "D1_CONSTRAINT_ERROR",
            };
        }
        if (error.message.includes("NOT NULL constraint failed")) {
            return {
                status: 400,
                message: "Required field is missing",
                code: "D1_CONSTRAINT_ERROR",
            };
        }
    }
    return {
        status: 500,
        message: "Internal database error",
        code: "D1_ERROR",
    };
}
