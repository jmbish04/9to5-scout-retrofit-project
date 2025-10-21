/**
 * @module src/domains/scraping/durable-objects/site-crawler.do.ts
 * @description
 * Durable Object for managing the crawling of a single job site.
 * It handles discovery of job URLs, crawling them in batches, and tracking progress.
 * This implementation is based on the modern, production-ready version from git history (d732f36).
 */

import type { Env } from "../../../config/env/env.config";

// These interfaces are defined here to match the expected structure for this DO.
// They are not imported to keep the DO self-contained.
interface DurableObjectState {
    storage: {
        get<T>(key: string): Promise<T | undefined>;
        put<T>(key: string, value: T): Promise<void>;
    };
}

interface CrawlerEnv extends Env {
    // Add any specific bindings needed by the crawler here
}

export class SiteCrawler {
    private state: DurableObjectState;
    private env: CrawlerEnv;

    constructor(state: DurableObjectState, env: CrawlerEnv) {
        this.state = state;
        this.env = env;
    }

    async fetch(req: Request): Promise<Response> {
        const url = new URL(req.url);
        const path = url.pathname;

        try {
            if (path === '/start-discovery' && req.method === 'POST') {
                return await this.startDiscovery(req);
            }

            if (path === '/status' && req.method === 'GET') {
                return await this.getStatus();
            }

            if (path === '/crawl-urls' && req.method === 'POST') {
                return await this.crawlUrls(req);
            }

            return new Response('Not Found', { status: 404 });
        } catch (error) {
            console.error('SiteCrawler error:', error);
            return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            });
        }
    }

    private async startDiscovery(req: Request): Promise<Response> {
        const { site_id, base_url, search_terms } = await req.json() as {
            site_id: string;
            base_url: string;
            search_terms?: string[];
        };

        await this.state.storage.put('current_site_id', site_id);
        await this.state.storage.put('base_url', base_url);
        await this.state.storage.put('last_activity', new Date().toISOString());
        await this.state.storage.put('status', 'discovering');

        // Use dynamic import for tree-shaking and modularity
        const { discoverJobUrls } = await import('../lib/crawl');
        const urls = await discoverJobUrls(base_url, search_terms || []);

        await this.state.storage.put('discovered_urls', urls);
        await this.state.storage.put('total_discovered', urls.length);
        await this.state.storage.put('crawled_count', 0);

        return new Response(JSON.stringify({
            site_id,
            discovered_count: urls.length,
            status: 'discovery_complete',
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async crawlUrls(req: Request): Promise<Response> {
        const { batch_size = 5 } = await req.json() as { batch_size?: number };

        const urls = (await this.state.storage.get('discovered_urls') as string[]) || [];
        const crawledCount = (await this.state.storage.get('crawled_count') as number) || 0;
        const siteId = (await this.state.storage.get('current_site_id') as string);

        if (crawledCount >= urls.length) {
            await this.state.storage.put('status', 'completed');
            return new Response(JSON.stringify({ status: 'completed', message: 'All URLs crawled' }), {
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const batchUrls = urls.slice(crawledCount, crawledCount + batch_size);

        // Use dynamic import for tree-shaking and modularity
        const { crawlJobs } = await import('../lib/crawl');
        const jobs = await crawlJobs(this.env, batchUrls, siteId);

        const newCrawledCount = crawledCount + batchUrls.length;
        await this.state.storage.put('crawled_count', newCrawledCount);
        await this.state.storage.put('last_activity', new Date().toISOString());

        const isComplete = newCrawledCount >= urls.length;
        if (isComplete) {
            await this.state.storage.put('status', 'completed');
        }

        return new Response(JSON.stringify({
            crawled_in_batch: jobs.length,
            total_crawled: newCrawledCount,
            total_discovered: urls.length,
            status: isComplete ? 'completed' : 'crawling',
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    private async getStatus(): Promise<Response> {
        const status = await this.state.storage.get('status') || 'idle';
        const totalDiscovered = await this.state.storage.get('total_discovered') || 0;
        const crawledCount = await this.state.storage.get('crawled_count') || 0;
        const lastActivity = await this.state.storage.get('last_activity');
        const siteId = await this.state.storage.get('current_site_id');

        return new Response(JSON.stringify({
            site_id: siteId,
            status,
            total_discovered: totalDiscovered,
            crawled_count: crawledCount,
            last_activity: lastActivity,
        }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }
}