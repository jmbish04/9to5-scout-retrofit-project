/**
 * @module src/domains/jobs/durable-objects/job-monitor.do.ts
 * @description
 * Durable Object for monitoring a single job posting for changes.
 * This DO is refactored to use the new JobStorageService and JobProcessingService.
 */

import type { Env } from "../../../config/env/env.config";
import { JobProcessingService } from "../services/job-processing.service";
import { JobStorageService } from "../services/job-storage.service";

// Interfaces to keep the DO self-contained
interface DurableObjectState {
    storage: {
        get<T>(key: string): Promise<T | undefined>;
        put<T>(key: string, value: T): Promise<void>;
        setAlarm(timestamp: number | Date): Promise<void>;
    };
}

interface JobMonitorEnv extends Env {}

export class JobMonitor {
    private state: DurableObjectState;
    private env: JobMonitorEnv;
    private storageService: JobStorageService;
    private processingService: JobProcessingService;

    constructor(state: DurableObjectState, env: JobMonitorEnv) {
        this.state = state;
        this.env = env;
        this.storageService = new JobStorageService(env);
        this.processingService = new JobProcessingService(env);
    }

    async fetch(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const path = url.pathname;

        try {
            if (path === "/monitor-job" && req.method === "POST") {
                return await this.monitorJob(req);
            }

            if (path === "/check-job" && req.method === "POST") {
                return await this.checkJob();
            }

            if (path === "/status" && req.method === "GET") {
                return await this.getStatus();
            }

            return new Response("Not Found", { status: 404 });
        } catch (error) {
            console.error("JobMonitor error:", error);
            return new Response(JSON.stringify({ error: "Internal Server Error" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
    }

    private async monitorJob(req: Request): Promise<Response> {
        const {
            job_id,
            url,
            check_interval_hours = 24,
        } = await req.json() as {
            job_id: string;
            url: string;
            check_interval_hours?: number;
        };

        await this.state.storage.put("job_id", job_id);
        await this.state.storage.put("job_url", url);
        await this.state.storage.put("check_interval_hours", check_interval_hours);
        await this.state.storage.put("last_check", new Date().toISOString());
        await this.state.storage.put("status", "monitoring");

        const nextCheck = new Date(Date.now() + check_interval_hours * 60 * 60 * 1000);
        await this.state.storage.setAlarm(nextCheck);

        // Delegate to service to update DB
        await this.storageService.updateJobMonitoringStatus(job_id, "monitoring", nextCheck);

        return new Response(
            JSON.stringify({
                job_id,
                status: "monitoring_started",
                next_check: nextCheck.toISOString(),
            }),
            {
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    private async checkJob(): Promise<Response> {
        const jobUrl = await this.state.storage.get("job_url") as string;
        const jobId = await this.state.storage.get("job_id") as string;

        if (!jobUrl || !jobId) {
            return new Response(
                JSON.stringify({ error: "No job configured for monitoring" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" },
                }
            );
        }

        // Delegate to the processing service
        const result = await this.processingService.performJobStatusCheck(jobId, jobUrl);

        await this.state.storage.put("last_check", result.last_check);
        await this.state.storage.put("status", result.status);

        return new Response(JSON.stringify(result), {
            headers: { "Content-Type": "application/json" },
        });
    }

    private async getStatus(): Promise<Response> {
        const jobId = await this.state.storage.get("job_id");
        const status = await this.state.storage.get("status") || "idle";
        const lastCheck = await this.state.storage.get("last_check");
        const checkInterval = await this.state.storage.get("check_interval_hours") || 24;

        return new Response(
            JSON.stringify({
                job_id: jobId,
                status,
                last_check: lastCheck,
                check_interval_hours: checkInterval,
            }),
            {
                headers: { "Content-Type": "application/json" },
            }
        );
    }

    async alarm(): Promise<void> {
        try {
            const status = await this.state.storage.get("status");
            if (status !== "monitoring" && status !== "job_active") {
                return;
            }

            await this.checkJob();

            const finalStatus = await this.state.storage.get("status");
            if (finalStatus === "monitoring" || finalStatus === "job_active") {
                const checkInterval = (await this.state.storage.get("check_interval_hours") as number) || 24;
                const nextCheck = new Date(Date.now() + checkInterval * 60 * 60 * 1000);
                await this.state.storage.setAlarm(nextCheck);
            }
        } catch (error) {
            console.error("JobMonitor alarm error:", error);
        }
    }
}