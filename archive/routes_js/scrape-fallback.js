/**
 * Scrape fallback routes for when browser rendering fails.
 * Queues jobs for Python processing as a fallback mechanism.
 */
import { handleScrapeQueuePost } from "./scrape-queue";
export async function handleScrapeFallbackPost(request, env) {
    try {
        const body = (await request.json());
        if (!body.url) {
            return new Response(JSON.stringify({ error: "URL is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Queue the job for Python processing
        const queueRequest = new Request("http://localhost/api/v1/scrape-queue", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                urls: body.url,
                source: body.source,
                priority: body.priority || 0,
                payload: JSON.stringify({
                    reason: body.reason || "browser_rendering_failed",
                    fallback_requested_at: new Date().toISOString(),
                }),
            }),
        });
        const queueResponse = await handleScrapeQueuePost(queueRequest, env);
        if (!queueResponse.ok) {
            return new Response(JSON.stringify({ error: "Failed to queue job for Python processing" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
        const queueResult = (await queueResponse.json());
        return new Response(JSON.stringify({
            message: "Job queued for Python processing",
            job_id: queueResult.job.id,
            reason: body.reason || "browser_rendering_failed",
        }), {
            status: 202, // Accepted for processing
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error queuing fallback job:", error);
        return new Response(JSON.stringify({ error: "Failed to queue fallback job" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
