/**
 * Remote scraper API routes for Python integration.
 * Handles communication with the Python FastAPI scraper service.
 */
export async function handleRemoteScrapePost(request, env) {
    try {
        const body = (await request.json());
        if (!body.site_name || !body.search_term) {
            return new Response(JSON.stringify({ error: "site_name and search_term are required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Get Python scraper URL and API key from environment
        const pythonScraperUrl = env.PYTHON_SCRAPER_URL;
        const pythonScraperApiKey = env.PYTHON_SCRAPER_API_KEY;
        if (!pythonScraperUrl || !pythonScraperApiKey) {
            return new Response(JSON.stringify({ error: "Python scraper not configured" }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });
        }
        // Forward request to Python scraper
        const pythonResponse = await fetch(`${pythonScraperUrl}/scrape`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-API-KEY": pythonScraperApiKey,
            },
            body: JSON.stringify(body),
        });
        if (!pythonResponse.ok) {
            const errorText = await pythonResponse.text();
            console.error(`Python scraper error: ${pythonResponse.status} - ${errorText}`);
            return new Response(JSON.stringify({
                error: "Python scraper request failed",
                details: errorText,
            }), {
                status: pythonResponse.status,
                headers: { "Content-Type": "application/json" },
            });
        }
        const pythonResult = (await pythonResponse.json());
        // If we got jobs back, store them in the database
        if (pythonResult.jobs && pythonResult.jobs.length > 0) {
            try {
                await storeScrapedJobs(env, pythonResult.jobs);
            }
            catch (storeError) {
                console.error("Error storing scraped jobs:", storeError);
                // Don't fail the request, just log the error
            }
        }
        return new Response(JSON.stringify(pythonResult), {
            headers: { "Content-Type": "application/json" },
        });
    }
    catch (error) {
        console.error("Error in remote scrape:", error);
        return new Response(JSON.stringify({ error: "Failed to execute remote scrape" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
async function storeScrapedJobs(env, jobs) {
    // Store scraped jobs in the jobs table
    for (const job of jobs) {
        try {
            // Generate a unique ID for the job
            const jobId = crypto.randomUUID();
            const now = new Date().toISOString();
            // Map the scraped job data to our database schema
            await env.DB.prepare(`INSERT OR IGNORE INTO jobs (
          id, url, title, company, location, employment_type, 
          department, salary_min, salary_max, salary_currency, 
          salary_raw, compensation_raw, description_md, 
          requirements_md, posted_at, status, first_seen_at, last_crawled_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
                .bind(jobId, job.url || "", job.title || null, job.company || null, job.location || null, job.employment_type || null, job.department || null, job.salary_min || null, job.salary_max || null, job.salary_currency || null, job.salary_raw || null, job.compensation_raw || null, job.description_md || null, job.requirements_md || null, job.posted_at || null, "open", now, now)
                .run();
        }
        catch (jobError) {
            console.error(`Error storing individual job:`, jobError);
            // Continue with other jobs even if one fails
        }
    }
}
