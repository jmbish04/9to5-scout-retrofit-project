/**
 * Generalized Steel SDK integration for multi-platform job scraping.
 * Supports LinkedIn, Indeed, Monster.com, and direct career pages with authentication persistence.
 */
// Cloudflare Playwright imports
import { chromium } from "@cloudflare/playwright";
import { createSnapshot, saveJob } from "./storage";
export var JobSite;
(function (JobSite) {
    JobSite["LINKEDIN"] = "linkedin";
    JobSite["INDEED"] = "indeed";
    JobSite["MONSTER"] = "monster";
    JobSite["CLOUDFLARE"] = "cloudflare";
    JobSite["GENERIC"] = "generic";
})(JobSite || (JobSite = {}));
export class MultiPlatformJobScraper {
    client = null;
    session = null;
    browser = null;
    page = null;
    credentials = new Map();
    siteConfigs = new Map();
    env = null;
    apiKey;
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.initializeSiteConfigs();
    }
    /**
     * Initialize Steel SDK client dynamically
     */
    async initializeSteelClient() {
        if (!this.client) {
            try {
                // Dynamic import of Steel SDK
                // const Steel = await import("steel-sdk");
                // this.client = new Steel.default({
                //   steelAPIKey: this.apiKey,
                // });
                console.log("Steel SDK import disabled - using fallback");
            }
            catch (error) {
                console.warn("Steel SDK not available, using browser-only mode:", error);
                // Create a mock client for browser-only operations
                this.client = {
                    sessions: {
                        create: async () => ({ id: "mock-session" }),
                        release: async () => { },
                        context: async () => ({}),
                    },
                };
            }
        }
    }
    /**
     * Initialize site configurations for different job platforms
     */
    initializeSiteConfigs() {
        // LinkedIn configuration
        this.siteConfigs.set(JobSite.LINKEDIN, {
            site: JobSite.LINKEDIN,
            name: "LinkedIn",
            baseUrl: "https://www.linkedin.com",
            searchUrl: "https://www.linkedin.com/jobs/search",
            jobUrlPattern: /linkedin\.com\/jobs\/view\/\d+/,
            requiresAuth: true,
            authUrl: "https://www.linkedin.com/login",
            selectors: {
                searchKeywords: 'input[aria-label*="Search jobs"]',
                searchLocation: 'input[aria-label*="Location"]',
                searchButton: 'button[aria-label*="Search jobs"]',
                jobLinks: 'a[href*="/jobs/view/"]',
                jobTitle: 'h1[data-testid="job-title"]',
                jobCompany: '[data-testid="job-company"] a',
                jobLocation: '[data-testid="job-location"]',
                jobDescription: '[data-testid="job-description"]',
                jobSalary: '[data-testid="job-salary"]',
                jobPostedDate: '[data-testid="job-posted-date"]',
                jobType: '[data-testid="job-employment-type"]',
            },
            filters: {
                experienceLevel: {
                    entry: "Entry level",
                    mid: "Mid-Senior level",
                    senior: "Senior level",
                    executive: "Executive",
                },
                jobType: {
                    "full-time": "Full-time",
                    "part-time": "Part-time",
                    contract: "Contract",
                    temporary: "Temporary",
                    internship: "Internship",
                },
            },
        });
        // Indeed configuration
        this.siteConfigs.set(JobSite.INDEED, {
            site: JobSite.INDEED,
            name: "Indeed",
            baseUrl: "https://www.indeed.com",
            searchUrl: "https://www.indeed.com/jobs",
            jobUrlPattern: /indeed\.com\/viewjob/,
            requiresAuth: false,
            selectors: {
                searchKeywords: 'input[name="q"]',
                searchLocation: 'input[name="l"]',
                searchButton: 'button[type="submit"]',
                jobLinks: "a[data-jk]",
                jobTitle: 'h1[data-testid="job-title"]',
                jobCompany: '[data-testid="job-company"]',
                jobLocation: '[data-testid="job-location"]',
                jobDescription: '[data-testid="job-description"]',
                jobSalary: '[data-testid="job-salary"]',
                jobPostedDate: '[data-testid="job-posted-date"]',
                nextPage: 'a[aria-label="Next Page"]',
            },
        });
        // Monster configuration
        this.siteConfigs.set(JobSite.MONSTER, {
            site: JobSite.MONSTER,
            name: "Monster",
            baseUrl: "https://www.monster.com",
            searchUrl: "https://www.monster.com/jobs/search",
            jobUrlPattern: /monster\.com\/jobs\/search/,
            requiresAuth: false,
            selectors: {
                searchKeywords: 'input[name="q"]',
                searchLocation: 'input[name="where"]',
                searchButton: 'button[type="submit"]',
                jobLinks: 'a[href*="/jobs/"]',
                jobTitle: 'h1[data-testid="job-title"]',
                jobCompany: '[data-testid="job-company"]',
                jobLocation: '[data-testid="job-location"]',
                jobDescription: '[data-testid="job-description"]',
                jobSalary: '[data-testid="job-salary"]',
                jobPostedDate: '[data-testid="job-posted-date"]',
            },
        });
        // Cloudflare careers configuration
        this.siteConfigs.set(JobSite.CLOUDFLARE, {
            site: JobSite.CLOUDFLARE,
            name: "Cloudflare Careers",
            baseUrl: "https://careers.cloudflare.com",
            searchUrl: "https://careers.cloudflare.com/jobs",
            jobUrlPattern: /careers\.cloudflare\.com\/jobs\/\d+/,
            requiresAuth: false,
            selectors: {
                searchKeywords: 'input[placeholder*="Search"]',
                searchButton: 'button[type="submit"]',
                jobLinks: 'a[href*="/jobs/"]',
                jobTitle: 'h1[data-testid="job-title"]',
                jobCompany: '[data-testid="job-company"]',
                jobLocation: '[data-testid="job-location"]',
                jobDescription: '[data-testid="job-description"]',
                jobType: '[data-testid="job-type"]',
            },
        });
        // Generic configuration for unknown sites
        this.siteConfigs.set(JobSite.GENERIC, {
            site: JobSite.GENERIC,
            name: "Generic",
            baseUrl: "",
            searchUrl: "",
            jobUrlPattern: /.*/,
            requiresAuth: false,
            selectors: {
                searchKeywords: 'input[type="search"], input[name*="search"], input[placeholder*="search"]',
                searchLocation: 'input[name*="location"], input[placeholder*="location"]',
                searchButton: 'button[type="submit"], input[type="submit"]',
                jobLinks: 'a[href*="job"], a[href*="career"], a[href*="position"]',
                jobTitle: 'h1, .job-title, [class*="title"]',
                jobCompany: '.company, [class*="company"], [class*="employer"]',
                jobLocation: '.location, [class*="location"]',
                jobDescription: '.description, [class*="description"], .content',
            },
        });
    }
    /**
     * Initialize browser with Cloudflare Browser Rendering binding
     */
    async initialize(site, credentials, env) {
        console.log(`🚀 Initializing ${this.siteConfigs.get(site)?.name} Job Scraper with Cloudflare Browser Rendering`);
        if (credentials) {
            this.credentials.set(site, credentials);
        }
        if (env) {
            this.env = env;
        }
        const config = this.siteConfigs.get(site);
        if (!config) {
            throw new Error(`Unsupported job site: ${site}`);
        }
        if (!this.env?.MYBROWSER) {
            throw new Error("Browser binding not available. Make sure MYBROWSER is configured in wrangler.toml");
        }
        try {
            // Initialize Steel SDK client
            await this.initializeSteelClient();
            // Launch browser using Cloudflare Browser Rendering binding
            this.browser = await chromium.launch(this.env.MYBROWSER);
            this.page = await this.browser.newPage();
            // Perform authentication if required
            if (config.requiresAuth && credentials) {
                await this.authenticate(site, credentials);
            }
            console.log(`✓ ${config.name} scraper initialized successfully`);
        }
        catch (error) {
            console.error(`Failed to initialize ${config.name} scraper:`, error);
            throw error;
        }
    }
    /**
     * Authenticate with the job site
     */
    async authenticate(site, credentials) {
        if (!this.page) {
            throw new Error("Page not initialized");
        }
        const config = this.siteConfigs.get(site);
        if (!config || !config.authUrl) {
            throw new Error(`No authentication URL configured for ${site}`);
        }
        console.log(`Authenticating with ${config.name}...`);
        await this.page.goto(config.authUrl, {
            waitUntil: "networkidle",
        });
        // Site-specific authentication logic
        switch (site) {
            case JobSite.LINKEDIN:
                await this.authenticateLinkedIn(credentials);
                break;
            case JobSite.INDEED:
                await this.authenticateIndeed(credentials);
                break;
            case JobSite.MONSTER:
                await this.authenticateMonster(credentials);
                break;
            default:
                console.warn(`No specific authentication implemented for ${site}`);
        }
    }
    /**
     * LinkedIn authentication
     */
    async authenticateLinkedIn(credentials) {
        if (!this.page)
            return;
        // Use provided credentials or fall back to environment variables
        const email = credentials.email || process.env.LINKEDIN_USERNAME;
        const password = credentials.password || process.env.LINKEDIN_PASSWORD;
        if (!email || !password) {
            throw new Error("LinkedIn credentials not provided and not found in environment variables");
        }
        await this.page.fill('input[name="session_key"]', email);
        await this.page.fill('input[name="session_password"]', password);
        await this.page.click('button[type="submit"]');
        await this.page.waitForURL(/linkedin\.com\/feed|linkedin\.com\/in/, {
            timeout: 30000,
        });
        console.log("✓ LinkedIn authentication successful");
    }
    /**
     * Indeed authentication (if required)
     */
    async authenticateIndeed(credentials) {
        // Indeed typically doesn't require authentication for job searching
        console.log("Indeed authentication not required for job searching");
    }
    /**
     * Monster authentication (if required)
     */
    async authenticateMonster(credentials) {
        // Monster typically doesn't require authentication for job searching
        console.log("Monster authentication not required for job searching");
    }
    /**
     * Search for jobs on the specified site
     */
    async searchJobs(site, searchParams) {
        if (!this.page) {
            throw new Error("Page not initialized. Call initialize() first.");
        }
        const config = this.siteConfigs.get(site);
        if (!config) {
            throw new Error(`Unsupported job site: ${site}`);
        }
        const { keywords, location = "", limit = 25 } = searchParams;
        console.log(`Searching ${config.name} for jobs: "${keywords}" in ${location || "any location"}`);
        // Navigate to search page
        await this.page.goto(config.searchUrl, {
            waitUntil: "networkidle",
        });
        // Fill search form
        await this.page.fill(config.selectors.searchKeywords, keywords);
        if (location && config.selectors.searchLocation) {
            await this.page.fill(config.selectors.searchLocation, location);
        }
        // Click search
        await this.page.click(config.selectors.searchButton);
        await this.page.waitForLoadState("networkidle");
        // Apply additional filters
        await this.applyFilters(site, searchParams);
        // Wait for results to load
        await this.page.waitForSelector(config.selectors.jobLinks, {
            timeout: 10000,
        });
        // Extract job URLs
        const jobUrls = [];
        const jobElements = await this.page.$$(config.selectors.jobLinks);
        for (let i = 0; i < Math.min(jobElements.length, limit); i++) {
            const element = jobElements[i];
            if (element) {
                const href = await element.getAttribute("href");
                if (href) {
                    const fullUrl = href.startsWith("http")
                        ? href
                        : `${config.baseUrl}${href}`;
                    if (config.jobUrlPattern.test(fullUrl)) {
                        jobUrls.push(fullUrl);
                    }
                }
            }
        }
        console.log(`Found ${jobUrls.length} job postings on ${config.name}`);
        return jobUrls;
    }
    /**
     * Apply search filters
     */
    async applyFilters(site, searchParams) {
        if (!this.page)
            return;
        const config = this.siteConfigs.get(site);
        if (!config || !config.filters)
            return;
        try {
            // Apply experience level filter
            if (searchParams.experienceLevel && config.filters.experienceLevel) {
                await this.applyExperienceFilter(site, searchParams.experienceLevel);
            }
            // Apply job type filter
            if (searchParams.jobType && config.filters.jobType) {
                await this.applyJobTypeFilter(site, searchParams.jobType);
            }
            // Apply remote filter
            if (searchParams.remote && config.filters.remote) {
                await this.applyRemoteFilter(site);
            }
        }
        catch (error) {
            console.warn(`Failed to apply filters for ${site}:`, error);
        }
    }
    /**
     * Apply experience level filter
     */
    async applyExperienceFilter(site, level) {
        if (!this.page)
            return;
        const config = this.siteConfigs.get(site);
        if (!config?.filters?.experienceLevel)
            return;
        try {
            // Site-specific experience filter implementation
            switch (site) {
                case JobSite.LINKEDIN:
                    await this.page.click('button[aria-label*="Experience level"]');
                    await this.page.waitForSelector('[data-testid="experience-level-filter"]');
                    const linkedinLevel = config.filters.experienceLevel[level.toLowerCase()] || level;
                    await this.page.click(`text=${linkedinLevel}`);
                    await this.page.click('button[aria-label="Show results"]');
                    break;
                // Add other sites as needed
            }
        }
        catch (error) {
            console.warn(`Failed to apply experience filter for ${site}:`, error);
        }
    }
    /**
     * Apply job type filter
     */
    async applyJobTypeFilter(site, type) {
        if (!this.page)
            return;
        const config = this.siteConfigs.get(site);
        if (!config?.filters?.jobType)
            return;
        try {
            // Site-specific job type filter implementation
            switch (site) {
                case JobSite.LINKEDIN:
                    await this.page.click('button[aria-label*="Job type"]');
                    await this.page.waitForSelector('[data-testid="job-type-filter"]');
                    const linkedinType = config.filters.jobType[type.toLowerCase()] || type;
                    await this.page.click(`text=${linkedinType}`);
                    await this.page.click('button[aria-label="Show results"]');
                    break;
                // Add other sites as needed
            }
        }
        catch (error) {
            console.warn(`Failed to apply job type filter for ${site}:`, error);
        }
    }
    /**
     * Apply remote work filter
     */
    async applyRemoteFilter(site) {
        if (!this.page)
            return;
        try {
            // Site-specific remote filter implementation
            switch (site) {
                case JobSite.LINKEDIN:
                    await this.page.click('button[aria-label*="Remote"]');
                    await this.page.waitForSelector('[data-testid="remote-filter"]');
                    await this.page.click("text=Remote");
                    await this.page.click('button[aria-label="Show results"]');
                    break;
                // Add other sites as needed
            }
        }
        catch (error) {
            console.warn(`Failed to apply remote filter for ${site}:`, error);
        }
    }
    /**
     * Scrape a single job posting with full data extraction
     */
    async scrapeJob(site, jobUrl, env) {
        if (!this.page) {
            throw new Error("Page not initialized. Call initialize() first.");
        }
        const config = this.siteConfigs.get(site);
        if (!config) {
            throw new Error(`Unsupported job site: ${site}`);
        }
        console.log(`Scraping ${config.name} job: ${jobUrl}`);
        try {
            // Navigate to job page
            await this.page.goto(jobUrl, {
                waitUntil: "networkidle",
                timeout: 30000,
            });
            // Wait for job content to load
            await this.page.waitForSelector(config.selectors.jobTitle, {
                timeout: 15000,
            });
            // Extract job data
            const jobData = await this.extractJobData(site);
            jobData.url = jobUrl;
            jobData.site_id = site;
            // Ensure required fields are present
            if (!jobData.url) {
                throw new Error("Job URL is required");
            }
            // Generate HTML content
            const html = await this.page.content();
            // Take screenshot
            const screenshot = await this.page.screenshot({
                fullPage: true,
                type: "png",
            });
            // Generate PDF
            const pdf = await this.page.pdf({
                format: "A4",
                printBackground: true,
                margin: { top: "1cm", right: "1cm", bottom: "1cm", left: "1cm" },
            });
            // Extract markdown content
            const markdown = await this.extractMarkdownContent(site);
            // Save job to database
            const jobId = await saveJob(env, jobData);
            // Create snapshot with all data
            const snapshotId = await createSnapshot(env, {
                job_id: jobId,
                content_hash: await this.generateContentHash(html),
                html_content: html,
                json_content: JSON.stringify(jobData),
                screenshot_data: screenshot.buffer,
                pdf_data: pdf.buffer,
                markdown_content: markdown,
                http_status: 200,
            });
            console.log(`✓ Job scraped successfully: ${jobId}`);
            return {
                job: { ...jobData, id: jobId },
                snapshot: { id: snapshotId, job_id: jobId },
                html,
                screenshot: screenshot,
                pdf: pdf,
                markdown,
            };
        }
        catch (error) {
            console.error(`Failed to scrape job ${jobUrl}:`, error);
            throw error;
        }
    }
    /**
     * Extract structured job data from job page
     */
    async extractJobData(site) {
        if (!this.page)
            throw new Error("Page not initialized");
        const config = this.siteConfigs.get(site);
        if (!config)
            throw new Error(`Unsupported job site: ${site}`);
        const jobData = {};
        try {
            // Extract title
            if (config.selectors.jobTitle) {
                const titleElement = await this.page.$(config.selectors.jobTitle);
                if (titleElement) {
                    jobData.title = (await titleElement.textContent()) || undefined;
                }
            }
            // Extract company
            if (config.selectors.jobCompany) {
                const companyElement = await this.page.$(config.selectors.jobCompany);
                if (companyElement) {
                    jobData.company = (await companyElement.textContent()) || undefined;
                }
            }
            // Extract location
            if (config.selectors.jobLocation) {
                const locationElement = await this.page.$(config.selectors.jobLocation);
                if (locationElement) {
                    jobData.location = (await locationElement.textContent()) || undefined;
                }
            }
            // Extract employment type
            if (config.selectors.jobType) {
                const typeElement = await this.page.$(config.selectors.jobType);
                if (typeElement) {
                    jobData.employment_type =
                        (await typeElement.textContent()) || undefined;
                }
            }
            // Extract salary information
            if (config.selectors.jobSalary) {
                const salaryElement = await this.page.$(config.selectors.jobSalary);
                if (salaryElement) {
                    const salaryText = (await salaryElement.textContent()) || "";
                    jobData.salary_raw = salaryText;
                    // Parse salary range if present
                    const salaryMatch = salaryText.match(/\$?([\d,]+)\s*-\s*\$?([\d,]+)/);
                    if (salaryMatch && salaryMatch[1] && salaryMatch[2]) {
                        jobData.salary_min = parseInt(salaryMatch[1].replace(/,/g, ""));
                        jobData.salary_max = parseInt(salaryMatch[2].replace(/,/g, ""));
                        jobData.salary_currency = "USD";
                    }
                }
            }
            // Extract job description
            if (config.selectors.jobDescription) {
                const descriptionElement = await this.page.$(config.selectors.jobDescription);
                if (descriptionElement) {
                    const description = (await descriptionElement.textContent()) || "";
                    jobData.description_md = this.convertToMarkdown(description);
                }
            }
            // Extract posted date
            if (config.selectors.jobPostedDate) {
                const postedElement = await this.page.$(config.selectors.jobPostedDate);
                if (postedElement) {
                    const postedText = (await postedElement.textContent()) || "";
                    jobData.posted_at = this.parsePostedDate(postedText);
                }
            }
            // Set source and status
            jobData.source = "SCRAPED";
            jobData.status = "open";
            jobData.last_seen_open_at = new Date().toISOString();
            jobData.first_seen_at = new Date().toISOString();
            jobData.last_crawled_at = new Date().toISOString();
        }
        catch (error) {
            console.error("Error extracting job data:", error);
        }
        return jobData;
    }
    /**
     * Extract markdown content from the job page
     */
    async extractMarkdownContent(site) {
        if (!this.page)
            return "";
        const config = this.siteConfigs.get(site);
        if (!config?.selectors.jobDescription)
            return "";
        try {
            const contentElement = await this.page.$(config.selectors.jobDescription);
            if (!contentElement)
                return "";
            const content = (await contentElement.textContent()) || "";
            return this.convertToMarkdown(content);
        }
        catch (error) {
            console.error("Error extracting markdown content:", error);
            return "";
        }
    }
    /**
     * Convert plain text to markdown format
     */
    convertToMarkdown(text) {
        return text
            .replace(/\n\s*\n/g, "\n\n") // Double line breaks for paragraphs
            .replace(/\*\*(.*?)\*\*/g, "**$1**") // Bold text
            .replace(/\*(.*?)\*/g, "*$1*") // Italic text
            .replace(/^\s*[-*+]\s/gm, "- ") // Convert bullet points
            .replace(/^\s*\d+\.\s/gm, (match) => `${match}`) // Numbered lists
            .trim();
    }
    /**
     * Parse posted date from various formats
     */
    parsePostedDate(postedText) {
        const now = new Date();
        if (postedText.includes("hour")) {
            const hours = parseInt(postedText.match(/(\d+)/)?.[1] || "0");
            return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
        }
        else if (postedText.includes("day")) {
            const days = parseInt(postedText.match(/(\d+)/)?.[1] || "0");
            return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
        }
        else if (postedText.includes("week")) {
            const weeks = parseInt(postedText.match(/(\d+)/)?.[1] || "0");
            return new Date(now.getTime() - weeks * 7 * 24 * 60 * 60 * 1000).toISOString();
        }
        return now.toISOString();
    }
    /**
     * Generate content hash for change detection
     */
    async generateContentHash(content) {
        const encoder = new TextEncoder();
        const data = encoder.encode(content);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }
    /**
     * Scrape multiple jobs in batch
     */
    async scrapeJobsBatch(site, jobUrls, env, batchSize = 5) {
        const results = [];
        for (let i = 0; i < jobUrls.length; i += batchSize) {
            const batch = jobUrls.slice(i, i + batchSize);
            console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobUrls.length / batchSize)}`);
            const batchPromises = batch.map((url) => this.scrapeJob(site, url, env).catch((error) => {
                console.error(`Failed to scrape job ${url}:`, error);
                return null;
            }));
            const batchResults = await Promise.all(batchPromises);
            results.push(...batchResults.filter((result) => result !== null));
            // Add delay between batches to avoid rate limiting
            if (i + batchSize < jobUrls.length) {
                await new Promise((resolve) => setTimeout(resolve, 2000));
            }
        }
        return results;
    }
    /**
     * Add a custom site configuration
     */
    addSiteConfig(config) {
        this.siteConfigs.set(config.site, config);
    }
    /**
     * Get available job sites
     */
    getAvailableSites() {
        return Array.from(this.siteConfigs.keys());
    }
    /**
     * Get site configuration
     */
    getSiteConfig(site) {
        return this.siteConfigs.get(site);
    }
    /**
     * Clean up resources
     */
    async cleanup() {
        try {
            if (this.browser) {
                await this.browser.close();
                this.browser = null;
            }
            this.page = null;
            console.log("✓ Cleanup completed");
        }
        catch (error) {
            console.error("Error during cleanup:", error);
        }
    }
}
/**
 * Factory function to create a multi-platform job scraper
 */
export function createJobScraper(apiKey, env) {
    const scraper = new MultiPlatformJobScraper(apiKey);
    if (env) {
        scraper.env = env;
    }
    return scraper;
}
/**
 * Example usage function for testing multiple sites
 */
export async function exampleMultiSiteScraping(env) {
    const scraper = createJobScraper(env.STEEL_API_KEY, env);
    try {
        // Example: LinkedIn scraping with authentication
        await scraper.initialize(JobSite.LINKEDIN, {
            site: JobSite.LINKEDIN,
            email: env.LINKEDIN_USERNAME,
            password: env.LINKEDIN_PASSWORD,
        }, env);
        const linkedinJobs = await scraper.searchJobs(JobSite.LINKEDIN, {
            keywords: "software engineer",
            location: "San Francisco",
            experienceLevel: "mid",
            jobType: "full-time",
            remote: true,
            limit: 5,
        });
        const linkedinResults = await scraper.scrapeJobsBatch(JobSite.LINKEDIN, linkedinJobs, env, 2);
        console.log(`LinkedIn: Scraped ${linkedinResults.length} jobs`);
        // Example: Indeed scraping (no auth required)
        await scraper.initialize(JobSite.INDEED, undefined, env);
        const indeedJobs = await scraper.searchJobs(JobSite.INDEED, {
            keywords: "developer",
            location: "New York",
            limit: 5,
        });
        const indeedResults = await scraper.scrapeJobsBatch(JobSite.INDEED, indeedJobs, env, 2);
        console.log(`Indeed: Scraped ${indeedResults.length} jobs`);
        // Example: Cloudflare careers scraping
        await scraper.initialize(JobSite.CLOUDFLARE, undefined, env);
        const cloudflareJobs = await scraper.searchJobs(JobSite.CLOUDFLARE, {
            keywords: "engineer",
            limit: 5,
        });
        const cloudflareResults = await scraper.scrapeJobsBatch(JobSite.CLOUDFLARE, cloudflareJobs, env, 2);
        console.log(`Cloudflare: Scraped ${cloudflareResults.length} jobs`);
    }
    catch (error) {
        console.error("Multi-site scraping failed:", error);
    }
    finally {
        await scraper.cleanup();
    }
}
